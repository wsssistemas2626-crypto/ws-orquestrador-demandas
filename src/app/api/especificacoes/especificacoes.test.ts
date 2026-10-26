// Rotas da ESP (T18): RF-08, RF-11, RF-15, CA-04.3, C-11 e C-36 pela API, sobre o serviço de especificacoes. Banco,
// Better Auth e tokens reais (Testcontainers); o relógio é fixo (RNF-15). Os handlers são chamados como o Next chama,
// pelo ajudante de test/requisicao.ts. A matriz inteira destas rotas fica no teste que percorre todas as rotas
// (test/matriz-rotas.test.ts); aqui ficam os comportamentos de cada uma.
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
import type { AtorPessoa } from '../../../modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenServico } from '../../../modules/acesso/tokens-servico';
import { criarDemandaSchema, type Status, type Tipo } from '../../../modules/demandas/schemas';
import { criarDemanda } from '../../../modules/demandas/servico';
import { MENSAGEM_LIMITE } from '../../../modules/limites';
import * as rotaDaVersao from './[espId]/route';
import { GET as GET_VERSAO } from './[espId]/route';
import { GET as GET_LISTA, POST } from '../demandas/[id]/especificacoes/route';

let b: BancoDeTeste;
let deps: Deps;
let cookieCto: string;
let cookieAdm: string;
let usuarioAdm: string;
let ctoAtor: AtorPessoa;
let tokenInsumo: string;
let tokenRisco: string;
const linhasDeLog: string[] = [];

type Credencial = Pick<OpRequisicao, 'cookie' | 'bearer'>;
const RE_ESP = /^ESP-DEM-\d{8}-\d{4}-v\d+$/;
const CONSTRUCAO = {
  sistemaAlvo: 'meu-sistema',
  repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
  criteriosAceitePreliminares: ['Critério fictício'],
  definicaoDePronto: ['pnpm test verde'],
};
const VALIDA = { descricaoObjetiva: 'Corrigir pedidos duplicados', escopoInclui: ['Importação de pedidos'], ...CONSTRUCAO };

const cto = (): Credencial => ({ cookie: cookieCto });
const criar = (demandaId: string, corpo: unknown, cred: Credencial = cto(), extra: OpRequisicao = {}) =>
  chamarRota(POST, { metodo: 'POST', caminho: `/api/demandas/${encodeURIComponent(demandaId)}/especificacoes`, params: { id: demandaId }, corpo, ...cred, ...extra });
const listar = (demandaId: string, cred: Credencial = cto()) =>
  chamarRota(GET_LISTA, { caminho: `/api/demandas/${encodeURIComponent(demandaId)}/especificacoes`, params: { id: demandaId }, ...cred });
const obter = (espId: string, cred: Credencial = cto()) =>
  chamarRota(GET_VERSAO, { caminho: `/api/especificacoes/${encodeURIComponent(espId)}`, params: { espId }, ...cred });

async function novaDemanda(tipo: Tipo = 'bug', status?: Status): Promise<string> {
  const d = await criarDemanda(deps, ctoAtor, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo, solicitanteNome: 'Pessoa Ficticia' }));
  if (status) await b.poolMigrator.query('update demanda set status = $2 where id = $1', [d.id, status]);
  return d.id;
}

async function criarOk(demandaId: string, corpo: Record<string, unknown> = {}, cred: Credencial = cto()): Promise<{ id: string } & Record<string, unknown>> {
  const r = await criar(demandaId, { ...VALIDA, ...corpo }, cred);
  expect(r.status).toBe(201);
  return (await r.json()) as { id: string } & Record<string, unknown>;
}

const contarEsp = async (demandaId: string) =>
  Number((await b.poolMigrator.query<{ n: string }>('select count(*)::text as n from especificacao_tecnica where demanda_id = $1', [demandaId])).rows[0]!.n);
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
  const pessoaAdm = await criarPessoa(deps, { papel: 'administradora' });
  cookieAdm = pessoaAdm.cookie;
  usuarioAdm = pessoaAdm.usuarioId;
  tokenInsumo = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'insumo_tecnico', deps.relogio))).token;
  tokenRisco = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'risco', deps.relogio))).token;
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('POST /api/demandas/:id/especificacoes', () => {
  it('CA-08.1: primeira ESP é ESP-<dem>-v1; a seguinte, -v2', async () => {
    const id = await novaDemanda();
    const r = await criar(id, VALIDA);
    expect(r.status).toBe(201);
    expect(r.headers.get('cache-control')).toBe('no-store');
    const v1 = (await r.json()) as Record<string, unknown>;
    expect(v1).toMatchObject({ id: `ESP-${id}-v1`, demandaId: id, versao: 1, rascunhoAgente: false, autor: { tipo: 'pessoa', nome: expect.any(String) }, ...VALIDA });
    expect(v1.id).toMatch(RE_ESP);
    expect(Object.keys(v1)).not.toContain('autorId');
    expect((await criarOk(id)).id).toBe(`ESP-${id}-v2`);
  });

  it('CA-04.3: duas criações simultâneas pela rota → v1 e v2, as duas 201', async () => {
    const id = await novaDemanda();
    const [r1, r2] = await Promise.all([criar(id, VALIDA), criar(id, VALIDA, { cookie: cookieAdm })]);
    expect([r1.status, r2.status]).toEqual([201, 201]);
    const ids = [((await r1.json()) as { id: string }).id, ((await r2.json()) as { id: string }).id].sort();
    expect(ids).toEqual([`ESP-${id}-v1`, `ESP-${id}-v2`]);
  });

  it('CA-08.2: novo_projeto sem repositorioDestino → 400 com o campo, e nada gravado', async () => {
    const id = await novaDemanda('novo_projeto');
    const r = await criar(id, { ...VALIDA, repositorioDestino: undefined });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({
      erro: 'entrada_invalida',
      mensagem: 'Corrija os campos abaixo para continuar.',
      campos: [{ campo: 'repositorioDestino', mensagem: 'Informe o repositório destino.' }],
    });
    expect(await contarEsp(id)).toBe(0);
  });

  it('CA-08.3: repositório em outra conta → 400 com o campo repositorioDestino', async () => {
    const id = await novaDemanda('melhoria');
    const r = await criar(id, { ...VALIDA, repositorioDestino: 'outra-conta/meu-sistema' });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { campos: Array<{ campo: string }> }).campos.map((c) => c.campo)).toEqual(['repositorioDestino']);
    expect(await contarEsp(id)).toBe(0);
  });

  it('CA-08.4: estudo sem os quatro campos → 201', async () => {
    const id = await novaDemanda('estudo');
    const r = await criar(id, { descricaoObjetiva: 'Estudo fictício', escopoInclui: ['Levantamento'] });
    expect(r.status).toBe(201);
    expect(await r.json()).toMatchObject({ sistemaAlvo: null, repositorioDestino: null, criteriosAceitePreliminares: null, definicaoDePronto: null });
  });

  it('CA-08.5: escopoInclui como texto corrido → 400 com o campo, sem o valor recebido', async () => {
    const id = await novaDemanda();
    const r = await criar(id, { ...VALIDA, escopoInclui: SENTINELAS.texto });
    expect(r.status).toBe(400);
    const texto = await r.text();
    expect(contemSentinela(texto)).toBe(false);
    expect((JSON.parse(texto) as { campos: Array<{ campo: string }> }).campos.map((c) => c.campo)).toEqual(['escopoInclui']);
  });

  it('CA-15.1: ESP com dúvida leva a demanda em_analise a aguardando_informacao, com evento de ator sistema', async () => {
    const id = await novaDemanda('bug', 'em_analise');
    await criarOk(id, { duvidasEmAberto: ['Qual ERP o cliente usa?'] });
    expect(await statusDa(id)).toBe('aguardando_informacao');
    const ev = await b.poolMigrator.query<{ acao: string; ator_tipo: string; antes: unknown; depois: unknown }>(
      `select acao, ator_tipo, antes, depois from evento where demanda_id = $1 order by id`,
      [id],
    );
    expect(ev.rows.map((e) => e.acao)).toEqual(['demanda_criada', 'especificacao_criada', 'status_alterado']);
    expect(ev.rows[2]).toEqual({ acao: 'status_alterado', ator_tipo: 'sistema', antes: { status: 'em_analise' }, depois: { status: 'aguardando_informacao' } });
  });

  it('CA-15.2: nenhuma mensagem ao solicitante: nenhum job de aviso e nenhum e-mail', async () => {
    const id = await novaDemanda('bug', 'em_analise');
    await criarOk(id, { duvidasEmAberto: ['Dúvida fictícia'] });
    expect((await b.poolMigrator.query<{ n: string }>(`select count(*)::text as n from pgboss.job`)).rows[0]!.n).toBe('0');
    expect((await b.poolMigrator.query<{ n: string }>(`select count(*)::text as n from aviso_email`)).rows[0]!.n).toBe('0');
  });

  it('C-11 pela rota: token do insumo_tecnico com rascunhoAgente:false → rascunho_agente true, autor agente', async () => {
    const id = await novaDemanda();
    const v = await criarOk(id, { rascunhoAgente: false, autorTipo: 'pessoa', autorId: 'outra-pessoa', responsavel: 'x' }, { bearer: tokenInsumo });
    expect(v).toMatchObject({ rascunhoAgente: true, autor: { tipo: 'agente', agente: 'insumo_tecnico' } });
    const linha = await b.poolMigrator.query('select autor_tipo, autor_id, rascunho_agente from especificacao_tecnica where id = $1', [v.id]);
    expect(linha.rows[0]).toEqual({ autor_tipo: 'agente', autor_id: 'insumo_tecnico', rascunho_agente: true });
  });

  it('C-11: id e versão vindos do corpo são descartados', async () => {
    const id = await novaDemanda();
    const v = await criarOk(id, { id: `ESP-${id}-v9`, versao: 9 });
    expect(v).toMatchObject({ id: `ESP-${id}-v1`, versao: 1 });
  });

  it('C-10: token do agente risco → 403 e nada gravado', async () => {
    const id = await novaDemanda();
    const r = await criar(id, VALIDA, { bearer: tokenRisco });
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    expect(await contarEsp(id)).toBe(0);
  });

  it('C-36: o 61º artefato do mesmo ator na hora → 429', async () => {
    const id = await novaDemanda();
    const agora = deps.relogio.agora();
    for (let v = 1; v <= 60; v++) {
      await b.poolMigrator.query(
        `insert into especificacao_tecnica (id, demanda_id, versao, descricao_objetiva, escopo_inclui, autor_tipo, autor_id, rascunho_agente, criada_em)
         values ($1, $2, $3, 'x', '["x"]'::jsonb, 'pessoa', $4, false, $5)`,
        [`ESP-${id}-v${v}`, id, v, usuarioAdm, agora],
      );
    }
    const r = await criar(id, VALIDA, { cookie: cookieAdm });
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ erro: 'limite_excedido', mensagem: MENSAGEM_LIMITE.artefato });
    expect(await contarEsp(id)).toBe(60);
  });

  it('demanda que não existe → 404', async () => {
    const r = await criar('DEM-20261022-9999', VALIDA);
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it('C-15: com cookie e Origin de outro site → 403 e nada gravado', async () => {
    const id = await novaDemanda();
    const r = await criar(id, VALIDA, cto(), { cabecalhos: { origin: 'https://outro.test' } });
    expect(r.status).toBe(403);
    expect(await contarEsp(id)).toBe(0);
  });

  it('CA-01.3: sem sessão nem token → 401', async () => {
    const id = await novaDemanda();
    expect((await criar(id, VALIDA, {})).status).toBe(401);
    expect(await contarEsp(id)).toBe(0);
  });
});

describe('GET /api/demandas/:id/especificacoes', () => {
  it('lista da mais nova para a mais antiga; agente lê (matriz)', async () => {
    const id = await novaDemanda();
    await criarOk(id);
    await criarOk(id, {}, { bearer: tokenInsumo });
    for (const cred of [cto(), { bearer: tokenRisco }]) {
      const r = await listar(id, cred);
      expect(r.status).toBe(200);
      const { itens } = (await r.json()) as { itens: Array<{ id: string; rascunhoAgente: boolean }> };
      expect(itens.map((i) => [i.id, i.rascunhoAgente])).toEqual([
        [`ESP-${id}-v2`, true],
        [`ESP-${id}-v1`, false],
      ]);
    }
  });

  it('demanda que não existe → 404, e não lista vazia', async () => {
    const r = await listar('DEM-20261022-9999');
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it('CA-01.3: sem sessão nem token → 401', async () => {
    expect((await listar('DEM-20261022-0001', {})).status).toBe(401);
  });
});

describe('GET /api/especificacoes/:espId', () => {
  it('200 com a versão e o id da mais nova', async () => {
    const id = await novaDemanda();
    await criarOk(id, { descricaoObjetiva: 'Primeira' });
    await criarOk(id, { descricaoObjetiva: 'Segunda' });
    const r = await obter(`ESP-${id}-v1`);
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ id: `ESP-${id}-v1`, descricaoObjetiva: 'Primeira', versaoMaisNova: `ESP-${id}-v2` });
    expect((await obter(`ESP-${id}-v1`, { bearer: tokenRisco })).status).toBe(200);
  });

  it('versão que não existe → 404', async () => {
    const r = await obter('ESP-DEM-20261022-9999-v1');
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it('id fora do formato → 404 sem nenhuma consulta ao banco, com ou sem credencial', async () => {
    const consultas = vi.spyOn(b.poolApp, 'query');
    const conexoes = vi.spyOn(b.poolApp, 'connect');
    try {
      for (const espId of ['ESP-DEM-2026-1-v1', 'RSK-DEM-20261022-0001-v1', "ESP-DEM-20261022-0001-v1' or 1=1", 'ESP-DEM-20261022-0001-v12345', 'x']) {
        for (const cred of [cto(), {}]) {
          const r = await obter(espId, cred);
          expect(r.status, espId).toBe(404);
          expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
        }
      }
      for (const demandaId of ['DEM-2026-1', 'ESP-DEM-20261022-0001-v1']) {
        expect((await criar(demandaId, VALIDA)).status, demandaId).toBe(404);
        expect((await listar(demandaId)).status, demandaId).toBe(404);
      }
      expect(consultas).not.toHaveBeenCalled();
      expect(conexoes).not.toHaveBeenCalled();
    } finally {
      consultas.mockRestore();
      conexoes.mockRestore();
    }
  });

  it('CA-11.1: PATCH, PUT e DELETE em /api/especificacoes/:espId → 405 e o conteúdo não muda', async () => {
    // O arquivo da rota só exporta GET: o Next responde 405 a qualquer outro método. Nem a rota da lista exporta método
    // que altere versão gravada.
    const exportados = Object.keys(rotaDaVersao).filter((k) => /^[A-Z]+$/.test(k));
    expect(exportados).toEqual(['GET']);
    for (const m of ['PATCH', 'PUT', 'DELETE', 'POST']) expect((rotaDaVersao as Record<string, unknown>)[m], m).toBeUndefined();
    const id = await novaDemanda();
    const v = await criarOk(id, { descricaoObjetiva: 'Original' });
    expect(await (await obter(v.id)).json()).toMatchObject({ descricaoObjetiva: 'Original' });
  });

  it('CA-01.3: sem sessão nem token → 401', async () => {
    expect((await obter('ESP-DEM-20261022-0001-v1', {})).status).toBe(401);
  });
});

describe('log das rotas da ESP (C-21)', () => {
  it('uma linha por requisição, com o padrão da rota; sem id, sentinela nem token', async () => {
    const id = await novaDemanda();
    linhasDeLog.length = 0;
    const v = await criarOk(id, { descricaoObjetiva: SENTINELAS.texto, escopoInclui: [SENTINELAS.email], situacaoAtual: SENTINELAS.nome });
    await listar(id);
    await obter(v.id);
    await criar(id, { ...VALIDA, rascunhoAgente: false }, { bearer: tokenInsumo });
    const linhas = linhasDeLog.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.evento === 'requisicao');
    expect(linhas.map((l) => `${String(l.metodo)} ${String(l.rota)} ${String(l.status)}`)).toEqual([
      'POST /api/demandas/[id]/especificacoes 201',
      'GET /api/demandas/[id]/especificacoes 200',
      'GET /api/especificacoes/[espId] 200',
      'POST /api/demandas/[id]/especificacoes 201',
    ]);
    const tudo = linhasDeLog.join('\n');
    expect(tudo).not.toMatch(/DEM-\d{8}-\d{4}/);
    expect(tudo).not.toContain(tokenInsumo);
    expect(contemSentinela(tudo)).toBe(false);
  });
});
