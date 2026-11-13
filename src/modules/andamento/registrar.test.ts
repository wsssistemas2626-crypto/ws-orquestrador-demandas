// src/modules/andamento/registrar.test.ts — T07 do DEC-DEM-20261111-0017-v1: o serviço registrarAndamento (RF-03 a
// RF-06; AN-01, AN-03, AN-04, AN-11; CA-03, CA-04, CA-05, CA-06, CA-12 no fluxo). Postgres real, papel do app, relógio
// fixo, DEC pelo caminho real (gerado por pessoa). Um DEC por caso; o ator do /construir com o prefixo `ficticio`. O
// estado que nenhum caminho do app grava (status, eventos forjados, linhas antigas) entra pelo migrator. Dados fictícios.
import type pg from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  andamentosDa,
  apagarAndamentos,
  corpo,
  erroDe,
  esperadoDaTabela,
  eventosDo,
  inserirAndamento,
  porStatus,
  retratoDa,
  STATUS_DA_DEMANDA,
} from '../../../test/andamento';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { atorDeIntegracao } from '../../../test/integracoes';
import { CONFIRMADO, inserirEventoDoPedido, preparadorDePedidos } from '../../../test/pedidos-construcao';
import { FASES_ANDAMENTO, STATUS_CONSTRUCAO, type StatusConstrucao } from '../../db/schema/andamento';
import type { Deps } from '../../lib/deps';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { relogioFixo } from '../../lib/relogio';
import { AGENTES, type Ator } from '../acesso/ator';
import { MENSAGENS_ACESSO } from '../acesso/mensagens';
import { alterarDemandaSchema, type Tipo } from '../demandas/schemas';
import { alterarDemanda } from '../demandas/servico';
import { LIMITE_ANDAMENTO } from '../limites';
import { gerarPedido } from '../pedido-construcao/gerar';
import { registrarAndamento } from './registrar';
import { decidirPorStatus } from './regras';
import { MENSAGENS_ANDAMENTO } from './schemas';

const relogio = relogioFixo('2026-11-12T12:00:00Z');
const construir = atorDeIntegracao('construir');
const DOIS_MIN = 120_000;

let b: BancoDeTeste;
let deps: Deps;
const preparador = preparadorDePedidos({
  deps: () => deps,
  rotulo: 'registrar-andamento',
  entregar: () => Promise.reject(new Error('este teste não entrega pedido')),
});

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
});
afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});

const registrar = (decId: string, c = corpo()) => registrarAndamento(deps, construir, decId, c);
const statusDa = async (demandaId: string) =>
  (await b.poolMigrator.query<{ status: string; atualizada_em: Date }>(`select status, atualizada_em from demanda where id = $1`, [demandaId])).rows[0]!;
const ultimosEventos = async (demandaId: string, n: number) =>
  (
    await b.poolMigrator.query(
      `select acao, ator_tipo, ator_id, ator_token_prefixo, entidade, entidade_id, antes, depois from evento where demanda_id = $1 order by id desc limit $2`,
      [demandaId, n],
    )
  ).rows.reverse();
const MARCO = (fase: string, tarefasProntas: number, tarefasTotal: number, statusConstrucao: string) => ({ fase, tarefasProntas, tarefasTotal, statusConstrucao });

describe('AN-01: só o /construir, antes de abrir transação', () => {
  const pessoa = (papel: 'cto' | 'administradora'): Ator => ({ tipo: 'pessoa', usuarioId: `u-${papel}-andamento`, nome: 'Pessoa Ficticia', papel });
  const proibidos: Array<[string, Ator]> = [
    ['awave', atorDeIntegracao('awave')],
    ['pessoa cto', pessoa('cto')],
    ['pessoa administradora', pessoa('administradora')],
    ['sistema', { tipo: 'sistema' }],
    ...AGENTES.map((agente): [string, Ator] => [`agente ${agente}`, { tipo: 'agente', agente, prefixoToken: 'ficticio' }]),
  ];
  it.each(proibidos)('%s: sem_permissao, e o pool nem é tocado', async (_n, ator) => {
    const connect = vi.fn(() => {
      throw new Error('não deveria conectar');
    });
    const pool = { connect } as unknown as pg.Pool;
    const e = await erroDe(registrarAndamento({ pool, relogio }, ator, 'DEC-DEM-20261112-0001-v1', corpo()));
    expect(e).toBeInstanceOf(ErroDominio);
    expect(e).toMatchObject({ codigo: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    expect(connect).not.toHaveBeenCalled();
  });
});

describe('AN-03 e CA-03.1 a CA-03.4: o mesmo 404 para todo DEC sem pedido gerado por pessoa na própria demanda', () => {
  it('inexistente, sem pedido_gerado, gerado por agente, por sistema e por pessoa noutra demanda: o mesmo erro, nada muda', async () => {
    const semGerar = await preparador.prepararDec({ gerar: false });
    const outra = await preparador.prepararDec({ gerar: false });
    const porAgente = await preparador.prepararDec({ gerar: false });
    await inserirEventoDoPedido(b, deps, { acao: 'pedido_gerado', decId: porAgente.decId, demandaId: porAgente.demandaId, atorTipo: 'agente', atorId: 'orquestrador' });
    const porSistema = await preparador.prepararDec({ gerar: false });
    await inserirEventoDoPedido(b, deps, { acao: 'pedido_gerado', decId: porSistema.decId, demandaId: porSistema.demandaId, atorTipo: 'sistema', atorId: 'sistema', prefixo: null });
    const noutraDemanda = await preparador.prepararDec({ gerar: false });
    await inserirEventoDoPedido(b, deps, {
      acao: 'pedido_gerado',
      decId: noutraDemanda.decId,
      demandaId: outra.demandaId,
      atorTipo: 'pessoa',
      atorId: preparador.geradora.usuarioId,
      prefixo: null,
      depois: CONFIRMADO,
    });

    const demandas = [semGerar, outra, porAgente, porSistema, noutraDemanda].map((c) => c.demandaId);
    const antes = await Promise.all(demandas.map((d) => retratoDa(b, d)));
    const erros = [];
    for (const decId of ['DEC-DEM-20991231-9999-v1', semGerar.decId, porAgente.decId, porSistema.decId, noutraDemanda.decId])
      erros.push(await erroDe(registrar(decId)));
    for (const e of erros) {
      expect(e).toBeInstanceOf(ErroDominio);
      expect(e).toMatchObject({ codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO, extras: {} });
    }
    // Nem o texto nem o código distinguem os casos (o mesmo 404 do DEC inexistente).
    const formas = erros.map((e) => {
      const x = e as ErroDominio;
      return JSON.stringify([x.name, x.message, x.codigo, x.mensagem, x.extras]);
    });
    expect(new Set(formas).size).toBe(1);
    expect(await Promise.all(demandas.map((d) => retratoDa(b, d)))).toEqual(antes);
  });
});

describe('CA-04 e CA-06: gravação, idempotência e evento só no marco', () => {
  it('CA-04.1, CA-04.5, CA-06.1, CA-06.4: o primeiro envio grava a linha, cria um andamento_registrado e não toca atualizada_em', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    await porStatus(b, demandaId, 'pronta_para_decisao');
    const antes = await statusDa(demandaId);
    relogio.avancar(60_000);
    const T = relogio.agora();
    expect(await registrar(decId)).toBeUndefined();
    expect(await andamentosDa(b, demandaId)).toEqual([
      { dec_id: decId, fase: 'construindo', tarefas_prontas: 9, tarefas_total: 17, status_construcao: 'em_construcao', ator_token_prefixo: 'ficticio', gravado_em: T },
    ]);
    expect(await statusDa(demandaId)).toEqual(antes);
    expect(await eventosDo(b, decId, 'andamento_registrado')).toEqual([
      {
        ator_tipo: 'integracao',
        ator_id: 'construir',
        ator_token_prefixo: 'ficticio',
        demanda_id: demandaId,
        entidade: 'pacote_decisao',
        antes: null,
        depois: MARCO('construindo', 9, 17, 'em_construcao'),
      },
    ]);
  });

  it('CA-04.2 e CA-05.9: o mesmo corpo de novo não grava nada; com a demanda em entregue, também não, e sem 409', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    await registrar(decId);
    const antes = await retratoDa(b, demandaId);
    relogio.avancar(DOIS_MIN);
    expect(await registrar(decId)).toBeUndefined();
    expect(await retratoDa(b, demandaId)).toEqual(antes);
    await porStatus(b, demandaId, 'entregue');
    const final = await retratoDa(b, demandaId);
    expect(await registrar(decId)).toBeUndefined();
    expect(await retratoDa(b, demandaId)).toEqual(final);
  });

  it('CA-04.3, CA-04.4 e CA-06.3: só os números mudam: linha nova com a hora do envio, nenhum evento; o total pode crescer e prontas voltar', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    await registrar(decId);
    relogio.avancar(2 * DOIS_MIN);
    const T4 = relogio.agora();
    await registrar(decId, corpo({ tarefasProntas: 10 }));
    await registrar(decId, corpo({ tarefasProntas: 3, tarefasTotal: 19 }));
    const linhas = await andamentosDa(b, demandaId);
    expect(linhas.map((l) => [l.tarefas_prontas, l.tarefas_total])).toEqual([
      [9, 17],
      [10, 17],
      [3, 19],
    ]);
    expect(linhas[1]!.gravado_em).toEqual(T4);
    expect(await eventosDo(b, decId, 'andamento_registrado')).toHaveLength(1);
  });

  it('CA-06.2: mudança de fase cria andamento_registrado com o antes do anterior', async () => {
    const { decId } = await preparador.prepararDec();
    await registrar(decId);
    await registrar(decId, corpo({ fase: 'testando', tarefasProntas: 17 }));
    const evs = await eventosDo(b, decId, 'andamento_registrado');
    expect(evs).toHaveLength(2);
    expect(evs[1]!.antes).toEqual(MARCO('construindo', 9, 17, 'em_construcao'));
    expect(evs[1]!.depois).toEqual(MARCO('testando', 17, 17, 'em_construcao'));
  });
});

describe('CA-05: as transições do /construir', () => {
  it('CA-05.1: aprovada (pela pessoa) + em_construcao → em_construcao, status_alterado do construir e depois andamento_registrado', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    await alterarDemanda(deps, preparador.geradora, demandaId, alterarDemandaSchema.parse({ status: 'aprovada' }));
    expect((await statusDa(demandaId)).status).toBe('aprovada');
    relogio.avancar(60_000);
    await registrar(decId);
    expect(await statusDa(demandaId)).toEqual({ status: 'em_construcao', atualizada_em: relogio.agora() });
    expect(await ultimosEventos(demandaId, 2)).toEqual([
      {
        acao: 'status_alterado',
        ator_tipo: 'integracao',
        ator_id: 'construir',
        ator_token_prefixo: 'ficticio',
        entidade: 'demanda',
        entidade_id: demandaId,
        antes: { status: 'aprovada' },
        depois: { status: 'em_construcao' },
      },
      {
        acao: 'andamento_registrado',
        ator_tipo: 'integracao',
        ator_id: 'construir',
        ator_token_prefixo: 'ficticio',
        entidade: 'pacote_decisao',
        entidade_id: decId,
        antes: null,
        depois: MARCO('construindo', 9, 17, 'em_construcao'),
      },
    ]);
  });

  it('CA-05.2 e CA-05.3: em em_construcao, construido não muda o status; cancelado leva a devolvida pelo construir', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    await porStatus(b, demandaId, 'em_construcao');
    await registrar(decId, corpo({ fase: 'documentando', tarefasProntas: 17, status: 'construido' }));
    // A criação do DEC já gravou um status_alterado do sistema; aqui só contam os do /construir.
    const doConstruir = async () => (await eventosDo(b, demandaId, 'status_alterado')).filter((e) => e.ator_tipo === 'integracao');
    expect((await statusDa(demandaId)).status).toBe('em_construcao');
    expect(await doConstruir()).toEqual([]);
    await registrar(decId, corpo({ fase: 'documentando', tarefasProntas: 17, status: 'cancelado' }));
    expect((await statusDa(demandaId)).status).toBe('devolvida');
    const st = await doConstruir();
    expect(st).toHaveLength(1);
    expect(st[0]).toMatchObject({ ator_tipo: 'integracao', ator_id: 'construir', ator_token_prefixo: 'ficticio', antes: { status: 'em_construcao' }, depois: { status: 'devolvida' } });
  });

  // 9 status × 3 situações × 2 tipos = 54 casos. Uma demanda por (tipo, situação); o status muda pelo migrator entre os
  // casos, e as linhas de andamento dela são apagadas antes, para cada caso começar sem andamento.
  describe('CA-05.4 a CA-05.7 e AN-04: a tabela inteira com banco', () => {
    const demandas = new Map<string, { demandaId: string; decId: string }>();
    beforeAll(async () => {
      for (const tipo of ['melhoria', 'estudo'] as const)
        for (const sc of STATUS_CONSTRUCAO) {
          const c = await preparador.prepararDec();
          await porStatus(b, c.demandaId, 'pronta_para_decisao', tipo);
          demandas.set(`${tipo}:${sc}`, c);
        }
    });
    const casos: Array<[Tipo, string, StatusConstrucao]> = [];
    for (const tipo of ['melhoria', 'estudo'] as const) for (const status of STATUS_DA_DEMANDA) for (const sc of STATUS_CONSTRUCAO) casos.push([tipo, status, sc]);
    it.each(casos)('%s em %s + %s', async (tipo, status, sc) => {
      const { demandaId, decId } = demandas.get(`${tipo}:${sc}`)!;
      await apagarAndamentos(b, demandaId);
      await porStatus(b, demandaId, status as never, tipo);
      const esperado = esperadoDaTabela(status as never, tipo, sc);
      const d = decidirPorStatus({ status: status as never, tipo }, sc);
      expect(d.tipo === 'recusa' ? 'recusa' : d.para).toBe(esperado);
      const antes = await retratoDa(b, demandaId);
      const e = await erroDe(registrar(decId, corpo({ status: sc })));
      if (esperado === 'recusa') {
        expect(e).toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_ANDAMENTO.statusFinal });
        expect(await retratoDa(b, demandaId)).toEqual(antes);
        return;
      }
      expect(e).toBeUndefined();
      const depois = await retratoDa(b, demandaId);
      expect(depois.andamentos).toHaveLength(1);
      expect(depois.demanda.status).toBe(esperado ?? status);
      expect(['entregue', 'encerrada']).not.toContain(esperado);
      if (esperado === null) expect(depois.demanda.atualizada_em).toEqual(antes.demanda.atualizada_em);
    });
  });

  it('CA-05.8: com o v2 aprovado, o envio do v1 é 409 decSubstituido e nada muda', async () => {
    const c = await preparador.prepararDec();
    await registrar(c.decId);
    const v2 = await preparador.novoDec(c.autora, c.demandaId);
    await preparador.aprovar(v2);
    const antes = await retratoDa(b, c.demandaId);
    const e = await erroDe(registrar(c.decId, corpo({ fase: 'testando' })));
    expect(e).toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_ANDAMENTO.decSubstituido });
    expect(await retratoDa(b, c.demandaId)).toEqual(antes);
  });

  it('AN-04: o mesmo corpo pelo v2 vigente, com pedido gerado, grava e cria andamento_registrado (só o DEC mudou)', async () => {
    const c = await preparador.prepararDec();
    await registrar(c.decId);
    const v2 = await preparador.novoDec(c.autora, c.demandaId);
    await preparador.aprovar(v2);
    await gerarPedido(deps, preparador.geradora, v2, CONFIRMADO);
    await registrar(v2);
    expect((await andamentosDa(b, c.demandaId)).map((l) => l.dec_id)).toEqual([c.decId, v2]);
    const evs = await eventosDo(b, v2, 'andamento_registrado');
    expect(evs).toHaveLength(1);
    expect(evs[0]).toMatchObject({ antes: MARCO('construindo', 9, 17, 'em_construcao'), depois: MARCO('construindo', 9, 17, 'em_construcao') });
  });
});

describe('CA-12 no fluxo: o limite vem depois do mesmo estado', () => {
  it('com 60 linhas do DEC no último minuto: estado novo → limite_excedido sem gravar; o mesmo estado da última → nada, sem 429', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    const quando = new Date(relogio.agora().getTime() - 30_000);
    for (let i = 0; i < LIMITE_ANDAMENTO.porDec.maximo; i++) await inserirAndamento(b, { demandaId, decId, gravadoEm: quando });
    const antes = await retratoDa(b, demandaId);
    const e = await erroDe(registrar(decId));
    expect(e).toMatchObject({ codigo: 'limite_excedido', mensagem: LIMITE_ANDAMENTO.porDec.mensagem });
    expect(await retratoDa(b, demandaId)).toEqual(antes);
    expect(await registrar(decId, corpo({ tarefasProntas: 0, tarefasTotal: 1 }))).toBeUndefined();
    expect(await retratoDa(b, demandaId)).toEqual(antes);
  });
});

describe('CA-06.6: um ciclo de 20 tarefas pelo serviço', () => {
  it('seis fases, prontas de 0 a 20 e construido no fim, um envio a cada 2 min: 27 linhas e 7 andamento_registrado', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    const seq: Array<Parameters<typeof corpo>[0]> = [];
    const s = (fase: (typeof FASES_ANDAMENTO)[number], p: number, status: StatusConstrucao = 'em_construcao') => seq.push({ fase, tarefasProntas: p, tarefasTotal: 20, status });
    s('entendendo_o_pedido', 0);
    s('planejando', 0);
    for (let p = 0; p <= 20; p++) s('construindo', p);
    s('testando', 20);
    s('revisando_e_entregando', 20);
    s('documentando', 20);
    s('documentando', 20, 'construido');
    for (const c of seq) {
      relogio.avancar(DOIS_MIN);
      await registrar(decId, corpo(c));
    }
    expect(await andamentosDa(b, demandaId)).toHaveLength(27);
    const evs = await eventosDo(b, decId, 'andamento_registrado');
    expect(evs.length).toBeLessThanOrEqual(7);
    expect(evs.map((e) => (e.depois as { fase: string }).fase)).toEqual([
      'entendendo_o_pedido',
      'planejando',
      'construindo',
      'testando',
      'revisando_e_entregando',
      'documentando',
      'documentando',
    ]);
  });
});

describe('AN-11: a forma de todo andamento_registrado gravado', () => {
  it('depois (e antes, quando há) só com as quatro chaves, valores da lista ou inteiros; demanda_id sempre preenchida', async () => {
    const { decId } = await preparador.prepararDec();
    await registrar(decId);
    await registrar(decId, corpo({ fase: 'testando', tarefasProntas: 17 }));
    const todos = (
      await b.poolMigrator.query<{ ator_tipo: string; ator_id: string; ator_token_prefixo: string; demanda_id: string | null; antes: unknown; depois: unknown }>(
        `select ator_tipo, ator_id, ator_token_prefixo, demanda_id, antes, depois from evento where acao = 'andamento_registrado'`,
      )
    ).rows;
    expect(todos.length).toBeGreaterThanOrEqual(2);
    const marcoValido = (m: unknown) => {
      expect(Object.keys(m as object).sort()).toEqual(['fase', 'statusConstrucao', 'tarefasProntas', 'tarefasTotal']);
      const x = m as Record<string, unknown>;
      expect(FASES_ANDAMENTO).toContain(x.fase);
      expect(STATUS_CONSTRUCAO).toContain(x.statusConstrucao);
      expect(Number.isInteger(x.tarefasProntas) && Number.isInteger(x.tarefasTotal)).toBe(true);
    };
    for (const ev of todos) {
      expect(ev.demanda_id).not.toBeNull();
      expect([ev.ator_tipo, ev.ator_id, ev.ator_token_prefixo]).toEqual(['integracao', 'construir', 'ficticio']);
      marcoValido(ev.depois);
      if (ev.antes !== null) marcoValido(ev.antes);
    }
  });
});
