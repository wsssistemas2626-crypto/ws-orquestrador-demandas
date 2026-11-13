// scripts/seed-andamento-qa.test.ts — 06-T10-testes do DEC-DEM-20261111-0017-v1 (qa-automacao), ao lado do
// seed-andamento.test.ts do engenheiro, sem mudar nada nele. O que ele não cobre:
//   (1) as leituras de pessoa sobre o banco semeado: o detalhe (obterDemanda) e a leitura por página da fila
//       (andamentosDasDemandas) dão o mesmo último andamento para as oito, e só as cinco com andamento entram no mapa
//       (base dos e2e da T12 e da T13);
//   (2) o seed é recusado num banco já semeado sem gravar andamento nem evento (rodar duas vezes não duplica o andamento);
//   (3) V-02 sobre o banco semeado, pela rota real e com token real do /construir (prefixo diferente do `ficticio`): a
//       `andamentoParaEnviar` vai de aprovada a em_construcao com um andamento_registrado, e o segundo envio igual não
//       grava nada; a `andamentoSemPedido`, a `emConstrucaoSemAndamento` (A3) e um DEC inexistente dão o mesmo 404, byte a
//       byte, sem gravar;
//   (4) Minor 1 da 06-T10-revisao (o seed repete o bloco do serviço): o serviço real lê o que o seed gravou como o mesmo
//       estado — reenviar o último passo de cada uma das cinco não grava linha nem evento — e continua a cadeia de
//       `antes` a partir do marco semeado;
//   (5) o Awave não lê nenhuma das oito (autoria de pessoa): 404, como a de outro autor.
// Cada describe tem o banco dele (Testcontainers) e relógio fixo; os que gravam são um `it` só por banco, então nada
// depende de ordem. O token só nasce em tempo de teste e nunca vai a mensagem de expect (G3.3). Só dado fictício.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as rotaDemanda from '../src/app/api/demandas/[id]/route';
import { comTransacao } from '../src/db/transacao';
import { definirDepsParaTeste, type Deps } from '../src/lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../src/lib/erros';
import { substituirDestinoDoLog } from '../src/lib/log';
import { relogioFixo } from '../src/lib/relogio';
import { criarTokenDeIntegracao } from '../src/modules/acesso/tokens-servico';
import { andamentosDasDemandas } from '../src/modules/andamento/consultas';
import { lerAndamento } from '../src/modules/andamento/regras';
import { obterDemanda } from '../src/modules/demandas/consultas';
import { novoBanco, type BancoDeTeste } from '../test/banco';
import { andamentosDa, eventosDo, retratoDa } from '../test/andamento';
import { criarDepsDeTeste } from '../test/deps';
import { tokenDeIntegracao } from '../test/integracoes';
import { chamadasDoConstruir } from '../test/pedidos-construcao';
import { chamarRota } from '../test/requisicao';
import { seedFicticio, TITULOS_DO_E2E } from './seed-ficticio';

const AGORA = '2026-11-12T15:00:00Z';
const EM = new Date(AGORA);
const MINUTO = 60_000;
const INEXISTENTE = 'DEC-DEM-20991231-9999-v1';
const NAO_ENCONTRADO = { erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO };

const CHAVES = [
  'andamentoConstruindo',
  'andamentoRevisando',
  'andamentoConcluido',
  'andamentoCancelado',
  'andamentoSemPlano',
  'andamentoParaEnviar',
  'andamentoSemPedido',
  'emConstrucaoSemAndamento',
] as const;
type Chave = (typeof CHAVES)[number];

type Passo = { fase: string; tarefasProntas: number; tarefasTotal: number; status: string };
// O último passo semeado de cada uma, como o /construir o mandaria (corpo de quatro chaves); null = sem andamento.
const ULTIMO: Readonly<Record<Chave, Passo | null>> = {
  andamentoConstruindo: { fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, status: 'em_construcao' },
  andamentoRevisando: { fase: 'revisando_e_entregando', tarefasProntas: 17, tarefasTotal: 17, status: 'em_construcao' },
  andamentoConcluido: { fase: 'documentando', tarefasProntas: 12, tarefasTotal: 12, status: 'construido' },
  andamentoCancelado: { fase: 'construindo', tarefasProntas: 3, tarefasTotal: 8, status: 'cancelado' },
  andamentoSemPlano: { fase: 'entendendo_o_pedido', tarefasProntas: 0, tarefasTotal: 0, status: 'em_construcao' },
  andamentoParaEnviar: null,
  andamentoSemPedido: null,
  emConstrucaoSemAndamento: null,
};
const COM_ANDAMENTO = CHAVES.filter((c) => ULTIMO[c] !== null);
const marcoDe = (p: Passo) => ({ fase: p.fase, tarefasProntas: p.tarefasProntas, tarefasTotal: p.tarefasTotal, statusConstrucao: p.status });

type Linha = Record<string, unknown>;
const linhas = async (b: BancoDeTeste, sql: string, valores: unknown[] = []): Promise<Linha[]> => (await b.poolMigrator.query(sql, valores)).rows;
const contar = async (b: BancoDeTeste, sql: string, valores: unknown[] = []): Promise<number> => Number((await linhas(b, sql, valores))[0]!.n);

async function idEDec(b: BancoDeTeste, chave: Chave): Promise<{ demandaId: string; decId: string }> {
  const r = await linhas(b, 'select d.id as demanda_id, p.id as dec_id from demanda d join pacote_decisao p on p.demanda_id = d.id where d.titulo = $1', [
    TITULOS_DO_E2E[chave],
  ]);
  expect(r, chave).toHaveLength(1);
  return { demandaId: r[0]!.demanda_id as string, decId: r[0]!.dec_id as string };
}

// A resposta inteira, para comparar byte a byte: status, cabeçalhos (sem a data) e corpo.
async function foto(r: Response) {
  const cabecalhos = [...r.headers].filter(([k]) => k !== 'date');
  return { status: r.status, cabecalhos, corpo: await r.text() };
}

async function semear(relogio = relogioFixo(AGORA)): Promise<{ b: BancoDeTeste; deps: Deps }> {
  const b = await novoBanco();
  const deps = await criarDepsDeTeste(b, { relogio });
  expect(await seedFicticio(deps, { SEED_FICTICIO: '1' })).toBe('semeado');
  return { b, deps };
}

describe('leituras de pessoa sobre o banco semeado e o seed repetido (sem gravar)', () => {
  let b: BancoDeTeste;
  let deps: Deps;

  beforeAll(async () => {
    substituirDestinoDoLog({ write: () => undefined });
    ({ b, deps } = await semear());
  });
  afterAll(async () => {
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });

  it('o detalhe (obterDemanda) e a leitura por página da fila (andamentosDasDemandas) dão o mesmo último andamento; só as cinco com andamento entram no mapa', async () => {
    const ids = new Map<Chave, { demandaId: string; decId: string }>();
    for (const c of CHAVES) ids.set(c, await idEDec(b, c));
    const pagina = await andamentosDasDemandas(b.db, CHAVES.map((c) => ids.get(c)!.demandaId));
    expect([...pagina.keys()].sort()).toEqual(COM_ANDAMENTO.map((c) => ids.get(c)!.demandaId).sort());
    for (const c of CHAVES) {
      const { demandaId, decId } = ids.get(c)!;
      const u = ULTIMO[c];
      const esperado = u ? { decId, ...marcoDe(u), atualizadoEm: EM } : null;
      expect((await obterDemanda(b.db, demandaId)).andamento, c).toEqual(esperado);
      expect(lerAndamento(pagina.get(demandaId) ?? null), c).toEqual(esperado);
    }
  });

  it('seed num banco já semeado: recusado, sem gravar andamento, evento nem demanda', async () => {
    const antes = {
      andamentos: await contar(b, 'select count(*)::int as n from andamento_construcao'),
      eventos: await contar(b, 'select count(*)::int as n from evento'),
      demandas: await contar(b, 'select count(*)::int as n from demanda'),
    };
    expect(antes.andamentos).toBe(7);
    expect(await seedFicticio(deps, { SEED_FICTICIO: '1' })).toBe('recusado');
    expect({
      andamentos: await contar(b, 'select count(*)::int as n from andamento_construcao'),
      eventos: await contar(b, 'select count(*)::int as n from evento'),
      demandas: await contar(b, 'select count(*)::int as n from demanda'),
    }).toEqual(antes);
  });
});

describe('V-02 sobre o banco semeado: a rota do andamento com o token real do /construir', () => {
  let b: BancoDeTeste;
  let deps: Deps;
  let token = '';
  let prefixo = '';
  const relogio = relogioFixo(AGORA);
  const construir = chamadasDoConstruir(() => token);

  beforeAll(async () => {
    substituirDestinoDoLog({ write: () => undefined });
    ({ b, deps } = await semear(relogio));
    definirDepsParaTeste(deps);
    const t = await comTransacao(deps.pool, (x) => criarTokenDeIntegracao(x, 'construir', deps.relogio));
    token = t.token;
    prefixo = t.prefixo;
  });
  afterAll(async () => {
    definirDepsParaTeste(null);
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });

  it('para enviar: 204, aprovada → em_construcao pelo construir, um andamento_registrado; o mesmo envio de novo não grava; sem pedido, em construção sem pedido e inexistente: o mesmo 404, sem gravar', async () => {
    expect(prefixo).not.toBe('ficticio');
    relogio.definir(AGORA);
    relogio.avancar(2 * MINUTO);
    const depois = relogio.agora();
    const corpo = { fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, status: 'em_construcao' };

    const { demandaId, decId } = await idEDec(b, 'andamentoParaEnviar');
    expect((await retratoDa(b, demandaId)).demanda.status).toBe('aprovada');
    const r = await construir.andamento(decId, corpo);
    expect(r.status).toBe(204);
    expect(await r.text()).toBe('');
    expect(await andamentosDa(b, demandaId)).toEqual([
      { dec_id: decId, fase: 'construindo', tarefas_prontas: 9, tarefas_total: 17, status_construcao: 'em_construcao', ator_token_prefixo: prefixo, gravado_em: depois },
    ]);
    const doConstruir = { ator_tipo: 'integracao', ator_id: 'construir', ator_token_prefixo: prefixo, demanda_id: demandaId };
    expect(await eventosDo(b, decId, 'andamento_registrado')).toEqual([{ ...doConstruir, entidade: 'pacote_decisao', antes: null, depois: marcoDe(corpo) }]);
    expect(await eventosDo(b, demandaId, 'status_alterado')).toEqual(
      expect.arrayContaining([{ ...doConstruir, entidade: 'demanda', antes: { status: 'aprovada' }, depois: { status: 'em_construcao' } }]),
    );
    const retrato = await retratoDa(b, demandaId);
    expect(retrato.demanda.status).toBe('em_construcao');
    expect((await obterDemanda(b.db, demandaId)).andamento).toEqual({ decId, ...marcoDe(corpo), atualizadoEm: depois });

    // V-02, passo 3: a segunda execução com o mesmo estado não grava linha nem evento, nem muda a demanda.
    relogio.avancar(2 * MINUTO);
    const deNovo = await construir.andamento(decId, corpo);
    expect(deNovo.status).toBe(204);
    expect(await retratoDa(b, demandaId)).toEqual(retrato);

    // V-02, passo 1 (fora_do_orquestrador) e A3: o mesmo 404 do DEC inexistente, byte a byte, sem gravar nada.
    const inexistente = await foto(await construir.andamento(INEXISTENTE, corpo));
    expect(inexistente.status).toBe(404);
    expect(JSON.parse(inexistente.corpo)).toEqual(NAO_ENCONTRADO);
    for (const chave of ['andamentoSemPedido', 'emConstrucaoSemAndamento'] as const) {
      const alvo = await idEDec(b, chave);
      const antes = await retratoDa(b, alvo.demandaId);
      expect(await foto(await construir.andamento(alvo.decId, corpo)), chave).toEqual(inexistente);
      expect(await retratoDa(b, alvo.demandaId), chave).toEqual(antes);
    }
    expect(await contar(b, 'select count(*)::int as n from andamento_construcao where ator_token_prefixo <> $1', ['ficticio'])).toBe(1);
  });
});

describe('Minor 1 da revisão: o serviço real continua o andamento semeado (banco semeado, token real)', () => {
  let b: BancoDeTeste;
  let deps: Deps;
  let token = '';
  let prefixo = '';
  const relogio = relogioFixo(AGORA);
  const construir = chamadasDoConstruir(() => token);

  beforeAll(async () => {
    substituirDestinoDoLog({ write: () => undefined });
    ({ b, deps } = await semear(relogio));
    definirDepsParaTeste(deps);
    const t = await comTransacao(deps.pool, (x) => criarTokenDeIntegracao(x, 'construir', deps.relogio));
    token = t.token;
    prefixo = t.prefixo;
  });
  afterAll(async () => {
    definirDepsParaTeste(null);
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });

  it('reenviar o último passo de cada uma das cinco não grava nada; só prontas grava sem evento (A2); a fase nova grava o evento com o antes do seed', async () => {
    relogio.definir(AGORA);
    relogio.avancar(2 * MINUTO);
    const depois = relogio.agora();

    // O mesmo estado que o seed gravou é o mesmo estado para o serviço (mesmoEstado): 204 e nada muda, nem status.
    for (const chave of COM_ANDAMENTO) {
      const { demandaId, decId } = await idEDec(b, chave);
      const antes = await retratoDa(b, demandaId);
      const r = await construir.andamento(decId, ULTIMO[chave]!);
      expect(r.status, chave).toBe(204);
      expect(await retratoDa(b, demandaId), chave).toEqual(antes);
    }

    // A2: só tarefasProntas muda → a linha nova, sem evento, sem mudar o status.
    const a = await idEDec(b, 'andamentoConstruindo');
    const eventosA = await eventosDo(b, a.decId, 'andamento_registrado');
    expect((await construir.andamento(a.decId, { ...ULTIMO.andamentoConstruindo!, tarefasProntas: 10 })).status).toBe(204);
    expect((await andamentosDa(b, a.demandaId)).at(-1)).toMatchObject({ tarefas_prontas: 10, tarefas_total: 17, ator_token_prefixo: prefixo, gravado_em: depois });
    expect(await eventosDo(b, a.decId, 'andamento_registrado')).toEqual(eventosA);
    expect((await retratoDa(b, a.demandaId)).demanda.status).toBe('em_construcao');

    // A fase e a situação mudam: o evento do serviço leva no `antes` o marco que o seed gravou; construido não muda status (A1).
    const r = await idEDec(b, 'andamentoRevisando');
    const fim = { fase: 'documentando', tarefasProntas: 17, tarefasTotal: 17, status: 'construido' };
    expect((await construir.andamento(r.decId, fim)).status).toBe(204);
    expect((await eventosDo(b, r.decId, 'andamento_registrado')).at(-1)).toEqual({
      ator_tipo: 'integracao',
      ator_id: 'construir',
      ator_token_prefixo: prefixo,
      demanda_id: r.demandaId,
      entidade: 'pacote_decisao',
      antes: marcoDe(ULTIMO.andamentoRevisando!),
      depois: marcoDe(fim),
    });
    expect(await eventosDo(b, r.decId, 'andamento_registrado')).toHaveLength(2);
    expect((await retratoDa(b, r.demandaId)).demanda.status).toBe('em_construcao');

    // A cancelada (devolvida pelo construir no seed): reenviar o cancelado é o mesmo estado, e o status fica devolvida.
    const c = await idEDec(b, 'andamentoCancelado');
    expect((await retratoDa(b, c.demandaId)).demanda.status).toBe('devolvida');
  });
});

describe('o Awave sobre o banco semeado não lê nenhuma das oito (autoria de pessoa)', () => {
  let b: BancoDeTeste;
  let deps: Deps;
  let token = '';

  beforeAll(async () => {
    substituirDestinoDoLog({ write: () => undefined });
    ({ b, deps } = await semear());
    definirDepsParaTeste(deps);
    token = await tokenDeIntegracao(deps, 'awave');
  });
  afterAll(async () => {
    definirDepsParaTeste(null);
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });

  it('GET /api/demandas/:id com o token do awave: 404 igual ao de um id inexistente, para as oito', async () => {
    const ler = (id: string) => chamarRota(rotaDemanda.GET, { caminho: `/api/demandas/${id}`, params: { id }, bearer: token, semOrigin: true });
    const inexistente = await foto(await ler('DEM-20991231-9999'));
    expect(inexistente.status).toBe(404);
    for (const chave of CHAVES) {
      const { demandaId } = await idEDec(b, chave);
      expect(await foto(await ler(demandaId)), chave).toEqual(inexistente);
    }
  });
});
