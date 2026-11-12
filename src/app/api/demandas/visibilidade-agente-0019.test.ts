// DEC-DEM-20261112-0019-v1, 03-correcao, M-1 (P3 e P4 da 02-triagem): até uma pessoa confirmar a demanda do Awave,
// nenhum agente a lê nem escreve nela. Pelo token de agente, a demanda que aguarda confirmação responde o mesmo 404 da
// demanda inexistente (corpo e cabeçalhos), some da listagem (itens e total) e recusa ESP, RSK e DEC com esse 404, antes
// do status final e do limite, sem gravar nada. As seis leituras de ESP, RSK e DEC também. Depois da confirmação, tudo
// como na 0.3.0. Pessoa vê e age antes e depois. Rotas, tokens e Postgres reais; tokens só gerados em tempo de teste e
// nunca em mensagem de expect. Cada describe tem banco e relógio próprios. Dados fictícios.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as rotaDecDaDemanda from './[id]/pacotes-decisao/route';
import * as rotaEspDaDemanda from './[id]/especificacoes/route';
import * as rotaRskDaDemanda from './[id]/pareceres-risco/route';
import * as rotaDemanda from './[id]/route';
import * as rotaDemandas from './route';
import * as rotaDec from '../pacotes-decisao/[decId]/route';
import * as rotaEsp from '../especificacoes/[espId]/route';
import * as rotaRsk from '../pareceres-risco/[rskId]/route';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo, type RelogioFixo } from '../../../lib/relogio';
import type { Agente, AtorPessoa } from '../../../modules/acesso/ator';
import { criarTokenServico } from '../../../modules/acesso/tokens-servico';
import { confirmarDemanda } from '../../../modules/demandas/confirmar';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { CORPO_DO_AWAVE, tokenDeIntegracao } from '../../../../test/integracoes';
import { DEC_DO_PEDIDO, ESP_DO_PEDIDO, RSK_DO_PEDIDO } from '../../../../test/pedidos-construcao';
import { chamarRota } from '../../../../test/requisicao';
import { criarPessoa } from '../../../../test/sessao';

const MINUTO = 60_000;
const INEXISTENTE = 'DEM-20261112-9999';
const ESP_INEXISTENTE = `ESP-${INEXISTENTE}-v1`;
const RSK_INEXISTENTE = `RSK-${INEXISTENTE}-v1`;
const DEC_INEXISTENTE = `DEC-${INEXISTENTE}-v1`;

type Ambiente = {
  b: BancoDeTeste;
  deps: Deps;
  relogio: RelogioFixo;
  awave: string;
  tokens: Record<Agente, string>;
  pessoa: AtorPessoa;
  cookie: string;
};

function ambiente(inicio = '2026-11-12T12:00:00Z'): Ambiente {
  const a = {} as Ambiente;
  beforeAll(async () => {
    substituirDestinoDoLog({ write: () => undefined });
    a.b = await novoBanco();
    a.relogio = relogioFixo(inicio);
    a.deps = await criarDepsDeTeste(a.b, { relogio: a.relogio });
    definirDepsParaTeste(a.deps);
    a.awave = await tokenDeIntegracao(a.deps, 'awave');
    a.tokens = {} as Record<Agente, string>;
    for (const agente of ['orquestrador', 'insumo_tecnico', 'risco', 'consolidacao'] as const)
      a.tokens[agente] = (await comTransacao(a.deps.pool, (t) => criarTokenServico(t, agente, a.relogio))).token;
    const p = await criarPessoa(a.deps, { papel: 'cto' });
    a.cookie = p.cookie;
    a.pessoa = { tipo: 'pessoa', usuarioId: p.usuarioId, nome: 'Pessoa Ficticia', papel: 'cto' };
  });
  afterAll(async () => {
    definirDepsParaTeste(null);
    substituirDestinoDoLog(null);
    await a.deps.fila.parar();
    await a.b.fechar();
  });
  return a;
}

type Credencial = { bearer: string } | { cookie: string };

const criarDoAwave = async (a: Ambiente): Promise<string> => {
  const r = await chamarRota(rotaDemandas.POST, { metodo: 'POST', caminho: '/api/demandas', bearer: a.awave, corpo: CORPO_DO_AWAVE, semOrigin: true });
  expect(r.status).toBe(201);
  return ((await r.json()) as { id: string }).id;
};

const ler = (rota: typeof rotaDemanda.GET, caminho: string, params: Record<string, string>, c: Credencial) =>
  chamarRota(rota, { caminho, params, ...c, semOrigin: 'bearer' in c });
const lerDemanda = (id: string, c: Credencial) => ler(rotaDemanda.GET, `/api/demandas/${id}`, { id }, c);
const listar = (query: string, c: Credencial) => chamarRota(rotaDemandas.GET, { caminho: `/api/demandas?${query}`, ...c, semOrigin: 'bearer' in c });
const postar = (rota: typeof rotaEspDaDemanda.POST, sufixo: string, id: string, corpo: unknown, c: Credencial) =>
  chamarRota(rota, { metodo: 'POST', caminho: `/api/demandas/${id}/${sufixo}`, params: { id }, corpo, ...c, semOrigin: 'bearer' in c });
const postarEsp = (id: string, c: Credencial) => postar(rotaEspDaDemanda.POST, 'especificacoes', id, ESP_DO_PEDIDO, c);
const postarRsk = (id: string, c: Credencial) => postar(rotaRskDaDemanda.POST, 'pareceres-risco', id, RSK_DO_PEDIDO, c);
const postarDec = (id: string, c: Credencial) => postar(rotaDecDaDemanda.POST, 'pacotes-decisao', id, DEC_DO_PEDIDO, c);

// A resposta inteira, para comparar byte a byte: status, cabeçalhos (sem a data) e corpo.
async function foto(r: Response) {
  const cabecalhos = [...r.headers].filter(([k]) => k !== 'date');
  return { status: r.status, cabecalhos, corpo: await r.text() };
}

const contar = async (b: BancoDeTeste, consulta: string, params: unknown[] = []) => Number((await b.poolMigrator.query(consulta, params)).rows[0].n);

// O que uma recusa ao agente não pode mudar: as versões e os eventos da demanda, as execuções e os artefatos do agente
// (a contagem do limite por ator, C-36).
async function gravadoNa(b: BancoDeTeste, id: string) {
  return {
    esp: await contar(b, 'select count(*) as n from especificacao_tecnica where demanda_id = $1', [id]),
    rsk: await contar(b, 'select count(*) as n from parecer_risco where demanda_id = $1', [id]),
    dec: await contar(b, 'select count(*) as n from pacote_decisao where demanda_id = $1', [id]),
    eventos: await contar(b, 'select count(*) as n from evento where demanda_id = $1', [id]),
    execucoes: await contar(b, 'select count(*) as n from execucao_agente where demanda_id = $1', [id]),
    deAgente: await contar(
      b,
      `select (select count(*) from especificacao_tecnica where autor_tipo = 'agente')
            + (select count(*) from parecer_risco where autor_tipo = 'agente')
            + (select count(*) from pacote_decisao where autor_tipo = 'agente') as n`,
    ),
    jobs: await contar(b, `select count(*) as n from pgboss.job where name = 'agente.executar'`),
  };
}

describe('M-1: o agente não lê a demanda do Awave que aguarda confirmação', () => {
  const a = ambiente();

  it('GET por id: o mesmo 404 do id inexistente (status, cabeçalhos e corpo), para os quatro agentes', async () => {
    const id = await criarDoAwave(a);
    for (const agente of ['orquestrador', 'insumo_tecnico', 'risco', 'consolidacao'] as const) {
      const bearer = { bearer: a.tokens[agente] };
      const inexistente = await foto(await lerDemanda(INEXISTENTE, bearer));
      expect(inexistente.status).toBe(404);
      expect(await foto(await lerDemanda(id, bearer)), agente).toEqual(inexistente);
    }
  });

  it('as seis leituras de ESP, RSK e DEC, com artefatos gravados por pessoa: o mesmo 404 do inexistente; depois da confirmação, 200', async () => {
    const id = await criarDoAwave(a);
    const pessoa = { cookie: a.cookie };
    const esp = await postarEsp(id, pessoa);
    expect(esp.status).toBe(201);
    const rsk = await postarRsk(id, pessoa);
    expect(rsk.status).toBe(201);
    const dec = await postarDec(id, pessoa);
    expect(dec.status).toBe(201);
    const espId = ((await esp.json()) as { id: string }).id;
    const rskId = ((await rsk.json()) as { id: string }).id;
    const decId = ((await dec.json()) as { id: string }).id;

    const leituras = (d: string, e: string, r: string, p: string) => [
      () => ler(rotaEspDaDemanda.GET, `/api/demandas/${d}/especificacoes`, { id: d }, { bearer: a.tokens.risco }),
      () => ler(rotaRskDaDemanda.GET, `/api/demandas/${d}/pareceres-risco`, { id: d }, { bearer: a.tokens.risco }),
      () => ler(rotaDecDaDemanda.GET, `/api/demandas/${d}/pacotes-decisao`, { id: d }, { bearer: a.tokens.risco }),
      () => ler(rotaEsp.GET, `/api/especificacoes/${e}`, { espId: e }, { bearer: a.tokens.risco }),
      () => ler(rotaRsk.GET, `/api/pareceres-risco/${r}`, { rskId: r }, { bearer: a.tokens.risco }),
      () => ler(rotaDec.GET, `/api/pacotes-decisao/${p}`, { decId: p }, { bearer: a.tokens.risco }),
    ];
    const escondidas = leituras(id, espId, rskId, decId);
    const inexistentes = leituras(INEXISTENTE, ESP_INEXISTENTE, RSK_INEXISTENTE, DEC_INEXISTENTE);
    for (let i = 0; i < escondidas.length; i++) {
      const esperado = await foto(await inexistentes[i]!());
      expect(esperado.status, `leitura ${i}`).toBe(404);
      expect(await foto(await escondidas[i]!()), `leitura ${i}`).toEqual(esperado);
    }

    await confirmarDemanda(a.deps, a.pessoa, id);
    for (let i = 0; i < escondidas.length; i++) expect((await escondidas[i]!()).status, `leitura ${i} depois`).toBe(200);
  });

  it('o sistema de leitura da pessoa não muda: com 2FA, ela lê a demanda e os artefatos antes da confirmação', async () => {
    const id = await criarDoAwave(a);
    const r = await lerDemanda(id, { cookie: a.cookie });
    expect(r.status).toBe(200);
    expect((await r.json()) as Record<string, unknown>).toMatchObject({ id, solicitanteNome: 'Awave' });
    expect((await ler(rotaEspDaDemanda.GET, `/api/demandas/${id}/especificacoes`, { id }, { cookie: a.cookie })).status).toBe(200);
  });
});

describe('M-1: a listagem do agente não traz a demanda que aguarda confirmação (itens e total)', () => {
  const a = ambiente();
  const ids: { antiga: string; escondida: string; nova: string } = { antiga: '', escondida: '', nova: '' };

  beforeAll(async () => {
    // Da mais antiga para a mais nova: confirmada, não confirmada, confirmada. A listagem vem da mais nova para a mais
    // antiga, então a escondida fica no meio.
    ids.antiga = await criarDoAwave(a);
    a.relogio.avancar(MINUTO);
    ids.escondida = await criarDoAwave(a);
    a.relogio.avancar(MINUTO);
    ids.nova = await criarDoAwave(a);
    await confirmarDemanda(a.deps, a.pessoa, ids.antiga);
    await confirmarDemanda(a.deps, a.pessoa, ids.nova);
  });

  const pagina = async (query: string, c: Credencial) => {
    const r = await listar(query, c);
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { itens: Array<{ id: string }>; total: number };
    return { ids: corpo.itens.map((i) => i.id), total: corpo.total };
  };

  it('com e sem filtro de origem, para agente: a escondida não está nos itens e o total não a conta', async () => {
    for (const query of ['origem=awave', '']) {
      const p = await pagina(query, { bearer: a.tokens.risco });
      expect(p.ids, query).toEqual([ids.nova, ids.antiga]);
      expect(p.total, query).toBe(2);
    }
  });

  it('limit e offset na borda: a página não tem buraco nem a escondida', async () => {
    expect(await pagina('origem=awave&limit=1&offset=0', { bearer: a.tokens.risco })).toEqual({ ids: [ids.nova], total: 2 });
    expect(await pagina('origem=awave&limit=1&offset=1', { bearer: a.tokens.risco })).toEqual({ ids: [ids.antiga], total: 2 });
    expect(await pagina('origem=awave&limit=1&offset=2', { bearer: a.tokens.risco })).toEqual({ ids: [], total: 2 });
  });

  it('a pessoa continua vendo as três, e o agente passa a ver a escondida depois da confirmação', async () => {
    expect(await pagina('origem=awave', { cookie: a.cookie })).toEqual({ ids: [ids.nova, ids.escondida, ids.antiga], total: 3 });
    await confirmarDemanda(a.deps, a.pessoa, ids.escondida);
    expect(await pagina('origem=awave', { bearer: a.tokens.risco })).toEqual({ ids: [ids.nova, ids.escondida, ids.antiga], total: 3 });
  });
});

describe('M-1: o agente não grava ESP, RSK nem DEC na demanda que aguarda confirmação', () => {
  const a = ambiente();

  it('POST de ESP, RSK e DEC pelo agente dono da ação: o mesmo 404 do inexistente, e nada gravado (versões, eventos, execuções, jobs, limite)', async () => {
    const id = await criarDoAwave(a);
    // ESP e RSK de pessoa: sem eles, o DEC daria 400 e não 201 na 0.3.0.
    expect((await postarEsp(id, { cookie: a.cookie })).status).toBe(201);
    expect((await postarRsk(id, { cookie: a.cookie })).status).toBe(201);
    const antes = await gravadoNa(a.b, id);
    const casos = [
      [postarEsp, a.tokens.insumo_tecnico],
      [postarRsk, a.tokens.risco],
      [postarDec, a.tokens.consolidacao],
    ] as const;
    for (const [postarComo, token] of casos) {
      const inexistente = await foto(await postarComo(INEXISTENTE, { bearer: token }));
      expect(inexistente.status).toBe(404);
      expect(await foto(await postarComo(id, { bearer: token }))).toEqual(inexistente);
    }
    expect(await gravadoNa(a.b, id)).toEqual(antes);
  });

  it('demanda que aguarda confirmação e já está em status final: 404 (e não o 409 do status final), sem oráculo', async () => {
    const id = await criarDoAwave(a);
    expect((await chamarRota(rotaDemanda.PATCH, { metodo: 'PATCH', caminho: `/api/demandas/${id}`, params: { id }, cookie: a.cookie, corpo: { status: 'encerrada' } })).status).toBe(
      200,
    );
    const antes = await gravadoNa(a.b, id);
    const inexistente = await foto(await postarEsp(INEXISTENTE, { bearer: a.tokens.insumo_tecnico }));
    expect(await foto(await postarEsp(id, { bearer: a.tokens.insumo_tecnico }))).toEqual(inexistente);
    expect(await foto(await postarRsk(id, { bearer: a.tokens.risco }))).toEqual(await foto(await postarRsk(INEXISTENTE, { bearer: a.tokens.risco })));
    expect(await gravadoNa(a.b, id)).toEqual(antes);
  });

  it('a recusa vem antes do limite: com a trava do limite do agente presa por outra conexão, o 404 sai na hora, sem esperar', async () => {
    const id = await criarDoAwave(a);
    const segura = await a.b.poolMigrator.connect();
    try {
      await segura.query('select pg_advisory_lock(hashtextextended($1, 0))', ['limite:artefato:agente:insumo_tecnico']);
      const inicio = Date.now();
      const r = await postarEsp(id, { bearer: a.tokens.insumo_tecnico });
      expect(r.status).toBe(404);
      expect(Date.now() - inicio).toBeLessThan(5_000);
    } finally {
      await segura.query('select pg_advisory_unlock(hashtextextended($1, 0))', ['limite:artefato:agente:insumo_tecnico']);
      segura.release();
    }
  });

  it('controle positivo: depois da confirmação por pessoa, o agente lê com a vista mínima e grava ESP, RSK e DEC como na 0.3.0', async () => {
    const id = await criarDoAwave(a);
    await confirmarDemanda(a.deps, a.pessoa, id);
    const r = await lerDemanda(id, { bearer: a.tokens.risco });
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as Record<string, unknown>;
    expect(corpo).toMatchObject({ id, responsavel: { tipo: 'integracao', integracao: 'awave' } });
    expect(corpo).not.toHaveProperty('solicitanteNome');
    expect((await postarEsp(id, { bearer: a.tokens.insumo_tecnico })).status).toBe(201);
    expect((await postarRsk(id, { bearer: a.tokens.risco })).status).toBe(201);
    expect((await postarDec(id, { bearer: a.tokens.consolidacao })).status).toBe(201);
  });

  it('a pessoa grava antes da confirmação, como hoje', async () => {
    const id = await criarDoAwave(a);
    expect((await postarEsp(id, { cookie: a.cookie })).status).toBe(201);
    expect((await postarRsk(id, { cookie: a.cookie })).status).toBe(201);
    expect((await postarDec(id, { cookie: a.cookie })).status).toBe(201);
  });
});
