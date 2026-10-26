// Pacote de decisão (T20) pela API: RF-10, RF-11 (CA-11.1), RF-12 (CA-12.1), RF-23 (CA-23.1, CA-23.2), C-10, C-11, C-15,
// C-17, C-21 e C-36. Banco, Better Auth e tokens reais (Testcontainers); o relógio é fixo (RNF-15). Os handlers são
// chamados como o Next chama, pelo ajudante de test/requisicao.ts. A matriz inteira destas rotas fica no teste que
// percorre todas as rotas (test/matriz-rotas.test.ts). Dados só fictícios.
//
// A ESP e o RSK de cada cenário são gravados pelo serviço com os atores dos agentes insumo_tecnico e risco: o limite por
// hora (C-36) conta cada um à parte, e o das pessoas fica para os DEC. Só o teste de CA-23.1 grava decisão neste arquivo
// (pelo migrator; a decisão de verdade chega na T21): é o que permite conferir a lista de aprovados por inteiro.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { chamarRota, type OpRequisicao } from '../../../../test/requisicao';
import { SENTINELAS, contemSentinela } from '../../../../test/sentinelas';
import { criarPessoa } from '../../../../test/sessao';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import type { AtorAgente, AtorPessoa } from '../../../modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenServico } from '../../../modules/acesso/tokens-servico';
import { criarDemandaSchema } from '../../../modules/demandas/schemas';
import { criarDemanda } from '../../../modules/demandas/servico';
import { criarEspecificacaoSchema } from '../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../modules/especificacoes/servico';
import { MENSAGEM_LIMITE } from '../../../modules/limites';
import { criarParecerRiscoSchema } from '../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../modules/pareceres-risco/servico';
import * as rotaDaVersao from './[decId]/route';
import { GET as GET_VERSAO } from './[decId]/route';
import * as rotaDoFiltro from './route';
import { GET as GET_FILTRO } from './route';
import * as rotaDaLista from '../demandas/[id]/pacotes-decisao/route';
import { GET as GET_LISTA, POST } from '../demandas/[id]/pacotes-decisao/route';

let b: BancoDeTeste;
let deps: Deps;
let cookieCto: string;
let cookieAdm: string;
let ctoAtor: AtorPessoa;
let tokenConsolidacao: string;
let tokenRisco: string;
let tokenInsumo: string;
const linhasDeLog: string[] = [];

const insumo: AtorAgente = { tipo: 'agente', agente: 'insumo_tecnico', prefixoToken: null };
const risco: AtorAgente = { tipo: 'agente', agente: 'risco', prefixoToken: null };

type Credencial = Pick<OpRequisicao, 'cookie' | 'bearer'>;
const RE_DEC = /^DEC-DEM-\d{8}-\d{4}-v\d+$/;
const VALIDO = {
  resumoExecutivo: 'Corrigir a importação de pedidos duplicados',
  opcaoA: { descricao: 'Corrigir no importador', vantagens: 'Rápido' },
  opcaoB: { descricao: 'Refazer a integração', desvantagens: 'Demora' },
  recomendacao: 'Opção A',
  nivelAprovacaoRequerido: 'cto',
};

const cto = (): Credencial => ({ cookie: cookieCto });
const criar = (demandaId: string, corpo: unknown, cred: Credencial = cto(), extra: OpRequisicao = {}) =>
  chamarRota(POST, { metodo: 'POST', caminho: `/api/demandas/${encodeURIComponent(demandaId)}/pacotes-decisao`, params: { id: demandaId }, corpo, ...cred, ...extra });
const listar = (demandaId: string, cred: Credencial = cto()) =>
  chamarRota(GET_LISTA, { caminho: `/api/demandas/${encodeURIComponent(demandaId)}/pacotes-decisao`, params: { id: demandaId }, ...cred });
const obter = (decId: string, cred: Credencial = cto()) =>
  chamarRota(GET_VERSAO, { caminho: `/api/pacotes-decisao/${encodeURIComponent(decId)}`, params: { decId }, ...cred });
const filtrar = (query: string, cred: Credencial = cto()) => chamarRota(GET_FILTRO, { caminho: `/api/pacotes-decisao${query}`, ...cred });

async function novaDemanda(): Promise<string> {
  return (await criarDemanda(deps, ctoAtor, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' }))).id;
}

async function demandaPronta(): Promise<string> {
  const id = await novaDemanda();
  await criarEspecificacao(
    deps,
    insumo,
    id,
    criarEspecificacaoSchema.parse({
      descricaoObjetiva: 'x',
      escopoInclui: ['a'],
      sistemaAlvo: 'meu-sistema',
      repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
      criteriosAceitePreliminares: ['c'],
      definicaoDePronto: ['p'],
    }),
  );
  await criarParecerRisco(deps, risco, id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
  return id;
}

async function criarOk(demandaId: string, corpo: Record<string, unknown> = {}, cred: Credencial = cto()): Promise<{ id: string } & Record<string, unknown>> {
  const r = await criar(demandaId, { ...VALIDO, ...corpo }, cred);
  expect(r.status).toBe(201);
  return (await r.json()) as { id: string } & Record<string, unknown>;
}

const contarDec = async (demandaId: string) =>
  Number((await b.poolMigrator.query<{ n: string }>('select count(*)::text as n from pacote_decisao where demanda_id = $1', [demandaId])).rows[0]!.n);
const statusDa = async (demandaId: string) => (await b.poolMigrator.query<{ status: string }>('select status from demanda where id = $1', [demandaId])).rows[0]!.status;

beforeAll(async () => {
  substituirDestinoDoLog({
    write: (l) => {
      linhasDeLog.push(l);
    },
  });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  const pessoaCto = await criarPessoa(deps, { papel: 'cto' });
  cookieCto = pessoaCto.cookie;
  ctoAtor = { tipo: 'pessoa', usuarioId: pessoaCto.usuarioId, nome: 'Pessoa Ficticia', papel: 'cto' };
  cookieAdm = (await criarPessoa(deps, { papel: 'administradora' })).cookie;
  tokenConsolidacao = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'consolidacao', deps.relogio))).token;
  tokenRisco = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'risco', deps.relogio))).token;
  tokenInsumo = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'insumo_tecnico', deps.relogio))).token;
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('POST /api/demandas/:id/pacotes-decisao', () => {
  it('201 com o DEC-<dem>-v1 pendente, citando a ESP e o RSK; o seguinte é -v2', async () => {
    const id = await demandaPronta();
    const r = await criar(id, VALIDO);
    expect(r.status).toBe(201);
    expect(r.headers.get('cache-control')).toBe('no-store');
    const v1 = (await r.json()) as Record<string, unknown>;
    expect(v1).toMatchObject({
      id: `DEC-${id}-v1`,
      demandaId: id,
      versao: 1,
      especificacaoId: `ESP-${id}-v1`,
      parecerRiscoId: `RSK-${id}-v1`,
      statusDecisao: 'pendente',
      desatualizado: false,
      aprovadores: [],
      decisao: null,
      rascunhoAgente: false,
      autor: { tipo: 'pessoa', nome: expect.any(String) },
      resumoExecutivo: VALIDO.resumoExecutivo,
      opcaoA: VALIDO.opcaoA,
      opcaoB: VALIDO.opcaoB,
      nivelAprovacaoRequerido: 'cto',
      rascunhosCitados: [`ESP-${id}-v1`, `RSK-${id}-v1`],
    });
    expect(v1.id).toMatch(RE_DEC);
    expect(Object.keys(v1)).not.toContain('autorId');
    expect(Object.keys(v1)).not.toContain('execucaoAgenteId');
    expect((await criarOk(id, {}, { cookie: cookieAdm })).id).toBe(`DEC-${id}-v2`);
  });

  it('CA-10.4 pela rota: depois do DEC, a demanda está em pronta_para_decisao', async () => {
    const id = await demandaPronta();
    await criarOk(id);
    expect(await statusDa(id)).toBe('pronta_para_decisao');
  });

  it('CA-10.1 pela rota: sem ESP e sem RSK → 400 com faltando, e nada gravado', async () => {
    const id = await novaDemanda();
    const r = await criar(id, VALIDO);
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ erro: 'entrada_invalida', mensagem: 'Faltam itens para o pacote.', faltando: ['especificacao', 'parecer_risco'] });
    expect(await contarDec(id)).toBe(0);
    expect(await statusDa(id)).toBe('nova');
  });

  it('corpo sem resumo, sem opções e com nível fora da lista → 400 com os campos, sem o valor recebido', async () => {
    const id = await demandaPronta();
    const r = await criar(id, { nivelAprovacaoRequerido: SENTINELAS.texto, opcaoA: { vantagens: SENTINELAS.email } });
    expect(r.status).toBe(400);
    const texto = await r.text();
    expect(contemSentinela(texto)).toBe(false);
    const corpo = JSON.parse(texto) as { erro: string; campos: Array<{ campo: string }> };
    expect(corpo.erro).toBe('entrada_invalida');
    expect(corpo.campos.map((c) => c.campo).sort()).toEqual(['nivelAprovacaoRequerido', 'opcaoA.descricao', 'opcaoB', 'resumoExecutivo']);
    expect(await contarDec(id)).toBe(0);
  });

  it('opção como texto corrido → 400 com o campo', async () => {
    const id = await demandaPronta();
    const r = await criar(id, { ...VALIDO, opcaoB: 'Refazer tudo' });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { campos: Array<{ campo: string }> }).campos.map((c) => c.campo)).toEqual(['opcaoB']);
  });

  it('C-11: token do agente consolidacao com rascunhoAgente:false → rascunho_agente true, autor agente', async () => {
    const id = await demandaPronta();
    const v = await criarOk(id, { rascunhoAgente: false, autorTipo: 'pessoa', autorId: 'outra-pessoa', responsavel: 'x' }, { bearer: tokenConsolidacao });
    expect(v).toMatchObject({ rascunhoAgente: true, autor: { tipo: 'agente', agente: 'consolidacao' } });
    const linha = (await b.poolMigrator.query<Record<string, unknown>>('select autor_tipo, autor_id, rascunho_agente from pacote_decisao where id = $1', [v.id])).rows[0];
    expect(linha).toEqual({ autor_tipo: 'agente', autor_id: 'consolidacao', rascunho_agente: true });
  });

  it('C-11: id, versão, ESP, RSK, status e decisão vindos do corpo são descartados', async () => {
    const id = await demandaPronta();
    const v = await criarOk(id, {
      id: `DEC-${id}-v9`,
      versao: 9,
      especificacaoId: `ESP-${id}-v9`,
      parecerRiscoId: `RSK-${id}-v9`,
      statusDecisao: 'aprovada',
      decisao: { opcaoEscolhida: 'A' },
      demandaTitulo: 'Outro título',
    });
    expect(v).toMatchObject({ id: `DEC-${id}-v1`, versao: 1, especificacaoId: `ESP-${id}-v1`, parecerRiscoId: `RSK-${id}-v1`, statusDecisao: 'pendente', decisao: null, demandaTitulo: 'Pedidos duplicados' });
  });

  it('C-10: tokens dos agentes risco e insumo_tecnico em POST de DEC → 403 (matriz)', async () => {
    const id = await demandaPronta();
    for (const bearer of [tokenRisco, tokenInsumo]) {
      const r = await criar(id, VALIDO, { bearer });
      expect(r.status).toBe(403);
      expect(await r.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    }
    expect(await contarDec(id)).toBe(0);
  });

  it('C-36: com 60 artefatos do ator na hora, o DEC seguinte → 429, e nada gravado', async () => {
    const id = await demandaPronta();
    const outra = await criarPessoa(deps, { papel: 'administradora' });
    const agora = deps.relogio.agora();
    await b.poolMigrator.query(
      `insert into pacote_decisao (id, demanda_id, versao, especificacao_id, especificacao_versao, parecer_risco_id, parecer_risco_versao, demanda_tipo, demanda_titulo, demanda_descricao, resumo_executivo, opcao_a, opcao_b, nivel_aprovacao_requerido, autor_tipo, autor_id, rascunho_agente, criada_em)
       select 'DEC-' || $1::text || '-v' || v, $1::text, v, 'ESP-' || $1::text || '-v1', 1, 'RSK-' || $1::text || '-v1', 1, 'bug', 'Pedidos duplicados', '', 'x', '{"descricao":"A"}', '{"descricao":"B"}', 'cto', 'pessoa', $2::text, false, $3::timestamptz
       from generate_series(1, 60) as v`,
      [id, outra.usuarioId, agora],
    );
    const r = await criar(id, VALIDO, { cookie: outra.cookie });
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ erro: 'limite_excedido', mensagem: MENSAGEM_LIMITE.artefato });
    expect(await contarDec(id)).toBe(60);
    expect((await criarOk(id, {}, { cookie: cookieAdm })).versao).toBe(61);
  });

  it('demanda que não existe → 404', async () => {
    const r = await criar('DEM-20261022-9999', VALIDO);
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it('C-15: com cookie e Origin de outro site → 403 e nada gravado', async () => {
    const id = await demandaPronta();
    const r = await criar(id, VALIDO, cto(), { cabecalhos: { origin: 'https://outro.test' } });
    expect(r.status).toBe(403);
    expect(await contarDec(id)).toBe(0);
  });

  it('CA-01.3: sem sessão nem token → 401', async () => {
    const id = await demandaPronta();
    expect((await criar(id, VALIDO, {})).status).toBe(401);
    expect(await contarDec(id)).toBe(0);
  });
});

describe('GET /api/demandas/:id/pacotes-decisao', () => {
  it('lista da mais nova para a mais antiga, com statusDecisao e desatualizado; agente lê (matriz)', async () => {
    const id = await demandaPronta();
    await criarOk(id);
    await criarOk(id, {}, { bearer: tokenConsolidacao });
    for (const cred of [cto(), { bearer: tokenRisco }]) {
      const r = await listar(id, cred);
      expect(r.status).toBe(200);
      const { itens } = (await r.json()) as { itens: Array<{ id: string; rascunhoAgente: boolean; statusDecisao: string; desatualizado: boolean }> };
      expect(itens.map((i) => [i.id, i.rascunhoAgente, i.statusDecisao, i.desatualizado])).toEqual([
        [`DEC-${id}-v2`, true, 'pendente', false],
        [`DEC-${id}-v1`, false, 'pendente', false],
      ]);
    }
  });

  it('demanda sem DEC → lista vazia; demanda que não existe → 404', async () => {
    const id = await novaDemanda();
    expect(await (await listar(id)).json()).toEqual({ itens: [] });
    const r = await listar('DEM-20261022-9999');
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it('CA-01.3: sem sessão nem token → 401', async () => {
    expect((await listar('DEM-20261022-0001', {})).status).toBe(401);
  });
});

describe('GET /api/pacotes-decisao/:decId', () => {
  it('CA-12.1: DEC v1 que cita ESP v1; criada a ESP v2 → desatualizado: true', async () => {
    const id = await demandaPronta();
    const v = await criarOk(id);
    expect(await (await obter(v.id)).json()).toMatchObject({ id: v.id, desatualizado: false });
    await criarEspecificacao(
      deps,
      insumo,
      id,
      criarEspecificacaoSchema.parse({
        descricaoObjetiva: 'y',
        escopoInclui: ['b'],
        sistemaAlvo: 'meu-sistema',
        repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
        criteriosAceitePreliminares: ['c'],
        definicaoDePronto: ['p'],
      }),
    );
    const r = await obter(v.id, { bearer: tokenInsumo });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ id: v.id, especificacaoId: `ESP-${id}-v1`, desatualizado: true, statusDecisao: 'pendente' });
  });

  it('versão que não existe → 404', async () => {
    const r = await obter('DEC-DEM-20261022-9999-v1');
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it('id fora do formato → 404 sem nenhuma consulta ao banco, com ou sem credencial', async () => {
    const consultas = vi.spyOn(b.poolApp, 'query');
    const conexoes = vi.spyOn(b.poolApp, 'connect');
    try {
      for (const decId of ['DEC-DEM-2026-1-v1', 'RSK-DEM-20261022-0001-v1', "DEC-DEM-20261022-0001-v1' or 1=1", 'DEC-DEM-20261022-0001-v12345', 'x']) {
        for (const cred of [cto(), {}]) {
          const r = await obter(decId, cred);
          expect(r.status, decId).toBe(404);
          expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
        }
      }
      for (const demandaId of ['DEM-2026-1', 'DEC-DEM-20261022-0001-v1']) {
        expect((await criar(demandaId, VALIDO)).status, demandaId).toBe(404);
        expect((await listar(demandaId)).status, demandaId).toBe(404);
      }
      expect(consultas).not.toHaveBeenCalled();
      expect(conexoes).not.toHaveBeenCalled();
    } finally {
      consultas.mockRestore();
      conexoes.mockRestore();
    }
  });

  it('CA-11.1: as rotas do DEC só exportam leitura e criação; nenhuma altera versão gravada', async () => {
    const metodos = (m: Record<string, unknown>) => Object.keys(m).filter((k) => /^[A-Z]+$/.test(k)).sort();
    expect(metodos(rotaDaVersao)).toEqual(['GET']);
    expect(metodos(rotaDoFiltro)).toEqual(['GET']);
    expect(metodos(rotaDaLista)).toEqual(['GET', 'POST']);
    for (const r of [rotaDaLista, rotaDaVersao, rotaDoFiltro] as Array<Record<string, unknown>>) {
      for (const m of ['PATCH', 'PUT', 'DELETE']) expect(r[m], m).toBeUndefined();
    }
  });

  it('CA-01.3: sem sessão nem token → 401', async () => {
    expect((await obter('DEC-DEM-20261022-0001-v1', {})).status).toBe(401);
  });
});

describe('GET /api/pacotes-decisao?statusDecisao', () => {
  it('CA-23.1: 2 aprovados e 1 pendente, statusDecisao=aprovada → só os 2, cada um com desatualizado', async () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) ids.push((await criarOk(await demandaPronta())).id);
    const [aprovado1, aprovado2, pendente] = ids as [string, string, string];
    const agora = deps.relogio.agora();
    for (const decId of [aprovado1, aprovado2]) {
      await b.poolMigrator.query(
        `insert into aprovacao (pacote_decisao_id, papel_aprovacao, nome_aprovador, registrada_por, opcao, registrada_em) values ($1, 'cto', 'Pessoa Ficticia', $2, 'A', $3)`,
        [decId, ctoAtor.usuarioId, agora],
      );
      await b.poolMigrator.query(`insert into decisao (pacote_decisao_id, status_decisao, opcao_escolhida, decidida_por, decidida_em) values ($1, 'aprovada', 'A', $2, $3)`, [
        decId,
        ctoAtor.usuarioId,
        agora,
      ]);
    }
    const r = await filtrar('?statusDecisao=aprovada');
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { itens: Array<{ id: string; statusDecisao: string; desatualizado: unknown }>; total: number; limit: number; offset: number };
    expect(corpo).toMatchObject({ total: 2, limit: 20, offset: 0 });
    expect(corpo.itens.map((i) => i.id).sort()).toEqual([aprovado1, aprovado2].sort());
    for (const i of corpo.itens) {
      expect(i.statusDecisao).toBe('aprovada');
      expect(i.desatualizado).toBe(false);
    }
    const pendentes = (await (await filtrar('?statusDecisao=pendente&limit=100', { bearer: tokenConsolidacao })).json()) as { itens: Array<{ id: string; statusDecisao: string }> };
    expect(pendentes.itens.map((i) => i.id)).toContain(pendente);
    expect(pendentes.itens.every((i) => i.statusDecisao === 'pendente')).toBe(true);
  });

  it('CA-23.2: statusDecisao=talvez → 400 com o campo, sem o valor recebido', async () => {
    const r = await filtrar(`?statusDecisao=${encodeURIComponent(SENTINELAS.texto)}`);
    expect(r.status).toBe(400);
    const texto = await r.text();
    expect(contemSentinela(texto)).toBe(false);
    expect((JSON.parse(texto) as { campos: Array<{ campo: string }> }).campos.map((c) => c.campo)).toEqual(['statusDecisao']);
    expect((await filtrar('?statusDecisao=talvez')).status).toBe(400);
  });

  it('limit acima de 100 e chave repetida → 400', async () => {
    expect((await filtrar('?limit=500')).status).toBe(400);
    expect((await filtrar('?statusDecisao=aprovada&statusDecisao=pendente')).status).toBe(400);
  });

  it('CA-01.3: sem sessão nem token → 401', async () => {
    expect((await filtrar('?statusDecisao=aprovada', {})).status).toBe(401);
  });
});

describe('log das rotas do DEC (C-21)', () => {
  it('uma linha por requisição, com o padrão da rota; sem id, query, sentinela nem token', async () => {
    const id = await demandaPronta();
    linhasDeLog.length = 0;
    const v = await criarOk(id, { resumoExecutivo: SENTINELAS.texto, opcaoA: { descricao: SENTINELAS.nome }, recomendacao: SENTINELAS.email });
    await listar(id);
    await obter(v.id);
    await filtrar('?statusDecisao=pendente');
    await criar(id, { ...VALIDO, rascunhoAgente: false }, { bearer: tokenConsolidacao });
    const linhas = linhasDeLog.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.evento === 'requisicao');
    expect(linhas.map((l) => `${String(l.metodo)} ${String(l.rota)} ${String(l.status)}`)).toEqual([
      'POST /api/demandas/[id]/pacotes-decisao 201',
      'GET /api/demandas/[id]/pacotes-decisao 200',
      'GET /api/pacotes-decisao/[decId] 200',
      'GET /api/pacotes-decisao 200',
      'POST /api/demandas/[id]/pacotes-decisao 201',
    ]);
    const tudo = linhasDeLog.join('\n');
    expect(tudo).not.toMatch(/DEM-\d{8}-\d{4}/);
    expect(tudo).not.toContain('statusDecisao');
    expect(tudo).not.toContain(tokenConsolidacao);
    expect(contemSentinela(tudo)).toBe(false);
  });
});
