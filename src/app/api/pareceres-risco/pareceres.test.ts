// Parecer de risco (T19): RF-09, RF-11, CA-04.3, C-10, C-11, C-30, C-36 e T-05, pela API e pelo serviço. Banco, Better
// Auth e tokens reais (Testcontainers); o relógio é fixo (RNF-15). Os handlers são chamados como o Next chama, pelo
// ajudante de test/requisicao.ts. A matriz inteira destas rotas fica no teste que percorre todas as rotas
// (test/matriz-rotas.test.ts); aqui ficam os comportamentos de cada uma. Dados só fictícios.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { AGORA_TESTE, criarDepsDeTeste } from '../../../../test/deps';
import { chamarRota, type OpRequisicao } from '../../../../test/requisicao';
import { SENTINELAS, contemSentinela } from '../../../../test/sentinelas';
import { criarPessoa } from '../../../../test/sessao';
import { user } from '../../../db/schema';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo, type RelogioFixo } from '../../../lib/relogio';
import type { Ator, AtorAgente, AtorPessoa, AtorSistema } from '../../../modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenServico } from '../../../modules/acesso/tokens-servico';
import { criarDemandaSchema, type Status, type Tipo } from '../../../modules/demandas/schemas';
import { criarDemanda } from '../../../modules/demandas/servico';
import { criarEspecificacaoSchema } from '../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../modules/especificacoes/servico';
import { MENSAGEM_LIMITE } from '../../../modules/limites';
import { listarPareceresRisco, obterParecerRisco } from '../../../modules/pareceres-risco/consultas';
import { criarParecerRiscoSchema } from '../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../modules/pareceres-risco/servico';
import { idVersao } from '../../../modules/versoes';
import * as rotaDaVersao from './[rskId]/route';
import { GET as GET_VERSAO } from './[rskId]/route';
import * as rotaDaLista from '../demandas/[id]/pareceres-risco/route';
import { GET as GET_LISTA, POST } from '../demandas/[id]/pareceres-risco/route';

let b: BancoDeTeste;
let deps: Deps;
let cookieCto: string;
let cookieAdm: string;
let ctoAtor: AtorPessoa;
let admAtor: AtorPessoa;
let tokenRisco: string;
let tokenConsolidacao: string;
let tokenInsumo: string;
const linhasDeLog: string[] = [];

const agenteRisco: AtorAgente = { tipo: 'agente', agente: 'risco', prefixoToken: 'Rk9yX8wV' };
const sistema: AtorSistema = { tipo: 'sistema' };

type Credencial = Pick<OpRequisicao, 'cookie' | 'bearer'>;
const RE_RSK = /^RSK-DEM-\d{8}-\d{4}-v\d+$/;
const VALIDO = { riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'alto' };
const COMPLETO = {
  resumo: 'Resumo fictício do risco',
  riscoTecnicoNivel: 'alto',
  riscoTecnicoComentario: 'Integração fictícia sem documentação',
  riscoOperacionalNivel: 'medio',
  riscoOperacionalComentario: 'Janela de implantação curta',
  riscoJuridicoNivel: 'baixo',
  riscoJuridicoComentario: 'Sem dado pessoal novo',
  recomendacoesMitigacao: ['Ambiente de homologação', 'Plano de volta'],
  preCondicoes: ['Acesso ao ERP fictício'],
  envolverJuridicoOuAdministradoraQuando: 'Quando houver contrato novo',
};

const cto = (): Credencial => ({ cookie: cookieCto });
const criar = (demandaId: string, corpo: unknown, cred: Credencial = cto(), extra: OpRequisicao = {}) =>
  chamarRota(POST, { metodo: 'POST', caminho: `/api/demandas/${encodeURIComponent(demandaId)}/pareceres-risco`, params: { id: demandaId }, corpo, ...cred, ...extra });
const listar = (demandaId: string, cred: Credencial = cto()) =>
  chamarRota(GET_LISTA, { caminho: `/api/demandas/${encodeURIComponent(demandaId)}/pareceres-risco`, params: { id: demandaId }, ...cred });
const obter = (rskId: string, cred: Credencial = cto()) =>
  chamarRota(GET_VERSAO, { caminho: `/api/pareceres-risco/${encodeURIComponent(rskId)}`, params: { rskId }, ...cred });

const rsk = (extra: Record<string, unknown> = {}) => criarParecerRiscoSchema.parse({ ...VALIDO, ...extra });

async function novaDemanda(tipo: Tipo = 'bug', status?: Status): Promise<string> {
  const d = await criarDemanda(deps, ctoAtor, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo, solicitanteNome: 'Pessoa Ficticia' }));
  if (status) await b.poolMigrator.query('update demanda set status = $2 where id = $1', [d.id, status]);
  return d.id;
}

async function criarOk(demandaId: string, corpo: Record<string, unknown> = {}, cred: Credencial = cto()): Promise<{ id: string } & Record<string, unknown>> {
  const r = await criar(demandaId, { ...VALIDO, ...corpo }, cred);
  expect(r.status).toBe(201);
  return (await r.json()) as { id: string } & Record<string, unknown>;
}

const contarRsk = async (demandaId: string) =>
  Number((await b.poolMigrator.query<{ n: string }>('select count(*)::text as n from parecer_risco where demanda_id = $1', [demandaId])).rows[0]!.n);
const statusDa = async (demandaId: string) => (await b.poolMigrator.query<{ status: string }>('select status from demanda where id = $1', [demandaId])).rows[0]!.status;
const eventosDa = async (demandaId: string) =>
  (
    await b.poolMigrator.query<{ acao: string; ator_tipo: string; ator_id: string; ator_token_prefixo: string | null; entidade: string; entidade_id: string; antes: unknown; depois: unknown }>(
      'select acao, ator_tipo, ator_id, ator_token_prefixo, entidade, entidade_id, antes, depois from evento where demanda_id = $1 order by id',
      [demandaId],
    )
  ).rows;
const linhaRsk = async (rskId: string) => (await b.poolMigrator.query<Record<string, unknown>>('select * from parecer_risco where id = $1', [rskId])).rows[0];

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
  admAtor = { tipo: 'pessoa', usuarioId: pessoaAdm.usuarioId, nome: 'Pessoa Ficticia', papel: 'administradora' };
  tokenRisco = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'risco', deps.relogio))).token;
  tokenConsolidacao = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'consolidacao', deps.relogio))).token;
  tokenInsumo = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'insumo_tecnico', deps.relogio))).token;
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('POST /api/demandas/:id/pareceres-risco', () => {
  it('CA-09.1: primeiro RSK é RSK-<dem>-v1; o seguinte, -v2', async () => {
    const id = await novaDemanda();
    const r = await criar(id, VALIDO);
    expect(r.status).toBe(201);
    expect(r.headers.get('cache-control')).toBe('no-store');
    const v1 = (await r.json()) as Record<string, unknown>;
    expect(v1).toMatchObject({ id: `RSK-${id}-v1`, demandaId: id, versao: 1, rascunhoAgente: false, autor: { tipo: 'pessoa', nome: expect.any(String) }, ...VALIDO });
    expect(v1.id).toMatch(RE_RSK);
    expect(Object.keys(v1)).not.toContain('autorId');
    expect(Object.keys(v1)).not.toContain('execucaoAgenteId');
    expect((await criarOk(id, {}, { cookie: cookieAdm })).id).toBe(`RSK-${id}-v2`);
  });

  it('grava todos os campos (T-05) e devolve a vista, com as listas', async () => {
    const id = await novaDemanda();
    const v = await criarOk(id, COMPLETO);
    expect(v).toMatchObject(COMPLETO);
    const linha = await linhaRsk(v.id);
    expect(linha).toMatchObject({
      resumo: COMPLETO.resumo,
      risco_tecnico_nivel: 'alto',
      risco_operacional_nivel: 'medio',
      risco_juridico_nivel: 'baixo',
      recomendacoes_mitigacao: COMPLETO.recomendacoesMitigacao,
      pre_condicoes: COMPLETO.preCondicoes,
      envolver_juridico_ou_administradora_quando: COMPLETO.envolverJuridicoOuAdministradoraQuando,
      autor_tipo: 'pessoa',
      autor_id: ctoAtor.usuarioId,
      rascunho_agente: false,
      execucao_agente_id: null,
    });
  });

  it('só com os três níveis: textos nulos e listas vazias; texto só de espaços também vira nulo', async () => {
    const id = await novaDemanda();
    const v = await criarOk(id, { resumo: '   ', riscoTecnicoComentario: '  ' });
    expect(v).toMatchObject({
      resumo: null,
      riscoTecnicoComentario: null,
      riscoOperacionalComentario: null,
      riscoJuridicoComentario: null,
      recomendacoesMitigacao: [],
      preCondicoes: [],
      envolverJuridicoOuAdministradoraQuando: null,
    });
    expect(await linhaRsk(v.id)).toMatchObject({ resumo: null, risco_tecnico_comentario: null });
  });

  it('o RSK não exige ESP: demanda sem especificação aceita o parecer', async () => {
    const id = await novaDemanda();
    expect((await criarOk(id)).id).toBe(`RSK-${id}-v1`);
  });

  it('CA-09.2: riscoTecnicoNivel "critico" → 400 com o campo, e nada gravado', async () => {
    const id = await novaDemanda();
    const r = await criar(id, { ...VALIDO, riscoTecnicoNivel: 'critico' });
    expect(r.status).toBe(400);
    const corpo = (await r.json()) as { erro: string; mensagem: string; campos: Array<{ campo: string }> };
    expect(corpo).toMatchObject({ erro: 'entrada_invalida', mensagem: 'Corrija os campos abaixo para continuar.' });
    expect(corpo.campos.map((c) => c.campo)).toEqual(['riscoTecnicoNivel']);
    expect(JSON.stringify(corpo)).not.toContain('critico');
    expect(await contarRsk(id)).toBe(0);
  });

  it('CA-09.3: preCondicoes como texto corrido → 400 com o campo, sem o valor recebido', async () => {
    const id = await novaDemanda();
    const r = await criar(id, { ...VALIDO, preCondicoes: SENTINELAS.texto });
    expect(r.status).toBe(400);
    const texto = await r.text();
    expect(contemSentinela(texto)).toBe(false);
    expect((JSON.parse(texto) as { campos: Array<{ campo: string }> }).campos.map((c) => c.campo)).toEqual(['preCondicoes']);
    expect(await contarRsk(id)).toBe(0);
  });

  it('sem os três níveis → 400 com os três campos, e nada gravado', async () => {
    const id = await novaDemanda();
    const r = await criar(id, { resumo: 'Sem níveis' });
    expect(r.status).toBe(400);
    expect(((await r.json()) as { campos: Array<{ campo: string }> }).campos.map((c) => c.campo).sort()).toEqual([
      'riscoJuridicoNivel',
      'riscoOperacionalNivel',
      'riscoTecnicoNivel',
    ]);
    expect(await contarRsk(id)).toBe(0);
  });

  it('CA-04.3: duas criações simultâneas pela rota → v1 e v2, as duas 201', async () => {
    const id = await novaDemanda();
    const [r1, r2] = await Promise.all([criar(id, VALIDO), criar(id, VALIDO, { bearer: tokenRisco })]);
    expect([r1.status, r2.status]).toEqual([201, 201]);
    const ids = [((await r1.json()) as { id: string }).id, ((await r2.json()) as { id: string }).id].sort();
    expect(ids).toEqual([`RSK-${id}-v1`, `RSK-${id}-v2`]);
  });

  it('C-11: token do agente risco com rascunhoAgente:false → rascunho_agente true', async () => {
    const id = await novaDemanda();
    const v = await criarOk(id, { rascunhoAgente: false, autorTipo: 'pessoa', autorId: 'outra-pessoa', responsavel: 'x' }, { bearer: tokenRisco });
    expect(v).toMatchObject({ rascunhoAgente: true, autor: { tipo: 'agente', agente: 'risco' } });
    expect(await linhaRsk(v.id)).toMatchObject({ autor_tipo: 'agente', autor_id: 'risco', rascunho_agente: true });
  });

  it('C-11: id e versão vindos do corpo são descartados', async () => {
    const id = await novaDemanda();
    const v = await criarOk(id, { id: `RSK-${id}-v9`, versao: 9, demandaId: 'DEM-20261022-9999' });
    expect(v).toMatchObject({ id: `RSK-${id}-v1`, versao: 1, demandaId: id });
  });

  it('C-10: token do agente consolidacao em POST de RSK → 403 (matriz)', async () => {
    const id = await novaDemanda();
    for (const bearer of [tokenConsolidacao, tokenInsumo]) {
      const r = await criar(id, VALIDO, { bearer });
      expect(r.status).toBe(403);
      expect(await r.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    }
    expect(await contarRsk(id)).toBe(0);
  });

  it('C-36: com 60 artefatos do ator na hora (ESP e RSK somados), o RSK seguinte → 429, e nada gravado', async () => {
    const id = await novaDemanda();
    const outra = await criarPessoa(deps, { papel: 'administradora' });
    const agora = deps.relogio.agora();
    for (let v = 1; v <= 30; v++) {
      await b.poolMigrator.query(
        `insert into especificacao_tecnica (id, demanda_id, versao, descricao_objetiva, escopo_inclui, autor_tipo, autor_id, rascunho_agente, criada_em)
         values ($1, $2, $3, 'x', '["x"]'::jsonb, 'pessoa', $4, false, $5)`,
        [`ESP-${id}-v${v}`, id, v, outra.usuarioId, agora],
      );
      await b.poolMigrator.query(
        `insert into parecer_risco (id, demanda_id, versao, risco_tecnico_nivel, risco_operacional_nivel, risco_juridico_nivel, autor_tipo, autor_id, rascunho_agente, criada_em)
         values ($1, $2, $3, 'baixo', 'baixo', 'baixo', 'pessoa', $4, false, $5)`,
        [`RSK-${id}-v${v}`, id, v, outra.usuarioId, agora],
      );
    }
    const r = await criar(id, VALIDO, { cookie: outra.cookie });
    expect(r.status).toBe(429);
    expect(await r.json()).toEqual({ erro: 'limite_excedido', mensagem: MENSAGEM_LIMITE.artefato });
    expect(await contarRsk(id)).toBe(30);
    // Outro ator não é afetado; a versão seguinte é a 31.
    expect((await criarOk(id, {}, { cookie: cookieAdm })).versao).toBe(31);
  });

  it('sem gatilho de status: a demanda em_analise continua em_analise, e o histórico só ganha o parecer', async () => {
    const id = await novaDemanda('bug', 'em_analise');
    await criarOk(id, COMPLETO);
    expect(await statusDa(id)).toBe('em_analise');
    expect((await eventosDa(id)).map((e) => e.acao)).toEqual(['demanda_criada', 'parecer_risco_criado']);
  });

  it('demanda que não existe → 404', async () => {
    const r = await criar('DEM-20261022-9999', VALIDO);
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it('C-15: com cookie e Origin de outro site → 403 e nada gravado', async () => {
    const id = await novaDemanda();
    const r = await criar(id, VALIDO, cto(), { cabecalhos: { origin: 'https://outro.test' } });
    expect(r.status).toBe(403);
    expect(await contarRsk(id)).toBe(0);
  });

  it('CA-01.3: sem sessão nem token → 401', async () => {
    const id = await novaDemanda();
    expect((await criar(id, VALIDO, {})).status).toBe(401);
    expect(await contarRsk(id)).toBe(0);
  });
});

describe('criarParecerRisco (serviço)', () => {
  it('RF-21 e C-30: evento parecer_risco_criado com a pessoa e só versão e rascunho, sem texto livre', async () => {
    const id = await novaDemanda();
    await criarParecerRisco(
      deps,
      admAtor,
      id,
      rsk({
        resumo: SENTINELAS.texto,
        riscoTecnicoComentario: SENTINELAS.nome,
        riscoJuridicoComentario: SENTINELAS.email,
        recomendacoesMitigacao: [SENTINELAS.telefone],
        preCondicoes: [SENTINELAS.texto],
        envolverJuridicoOuAdministradoraQuando: SENTINELAS.nome,
      }),
    );
    const eventos = await eventosDa(id);
    const ev = eventos.find((e) => e.acao === 'parecer_risco_criado')!;
    expect(ev).toMatchObject({
      ator_tipo: 'pessoa',
      ator_id: admAtor.usuarioId,
      entidade: 'parecer_risco',
      entidade_id: `RSK-${id}-v1`,
      antes: null,
      depois: { versao: 1, rascunhoAgente: false },
    });
    expect(contemSentinela(JSON.stringify(eventos))).toBe(false);
  });

  it('o evento do agente leva o prefixo do token, para auditoria', async () => {
    const id = await novaDemanda();
    await criarParecerRisco(deps, agenteRisco, id, rsk());
    const ev = (await eventosDa(id)).find((e) => e.acao === 'parecer_risco_criado')!;
    expect(ev).toMatchObject({ ator_tipo: 'agente', ator_id: 'risco', ator_token_prefixo: 'Rk9yX8wV', depois: { versao: 1, rascunhoAgente: true } });
  });

  it('extras.execucaoAgenteId fica gravado na versão', async () => {
    const id = await novaDemanda();
    const execucao = '00000000-0000-4000-8000-000000000019';
    const v = await criarParecerRisco(deps, agenteRisco, id, rsk(), undefined, { execucaoAgenteId: execucao });
    expect((await linhaRsk(v.id))!.execucao_agente_id).toBe(execucao);
    expect(Object.keys(v)).not.toContain('execucaoAgenteId');
  });

  it('C-10: ator sistema e agentes fora da matriz → sem_permissao, e nada gravado', async () => {
    const id = await novaDemanda();
    const outros: AtorAgente[] = (['orquestrador', 'insumo_tecnico', 'consolidacao'] as const).map((agente) => ({ tipo: 'agente', agente, prefixoToken: null }));
    for (const ator of [sistema, ...outros]) {
      await expect(criarParecerRisco(deps, ator, id, rsk())).rejects.toMatchObject({ codigo: 'sem_permissao' });
    }
    expect(await contarRsk(id)).toBe(0);
  });

  it('G3.8: com a transação de quem chama, o rollback desfaz a versão e o evento', async () => {
    const id = await novaDemanda();
    await expect(
      comTransacao(b.poolApp, async (t) => {
        await criarParecerRisco(deps, admAtor, id, rsk(), t);
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    expect(await contarRsk(id)).toBe(0);
    expect((await eventosDa(id)).map((e) => e.acao)).toEqual(['demanda_criada']);
  });

  it('com a transação de quem chama, a vista devolvida já enxerga a versão gravada', async () => {
    const id = await novaDemanda();
    const v = await comTransacao(b.poolApp, (t) => criarParecerRisco(deps, admAtor, id, rsk(), t));
    expect(v.id).toBe(`RSK-${id}-v1`);
    expect(v.criadaEm).toEqual(deps.relogio.agora());
  });

  it('RF-11: a versão anterior continua igual depois de uma nova versão', async () => {
    const id = await novaDemanda();
    await criarParecerRisco(deps, admAtor, id, rsk({ resumo: 'Original', preCondicoes: ['Item original'] }));
    const antes = await obterParecerRisco(b.db, `RSK-${id}-v1`);
    await criarParecerRisco(deps, agenteRisco, id, rsk({ resumo: 'Mudou', preCondicoes: ['Item novo'], riscoTecnicoNivel: 'alto' }));
    const depois = await obterParecerRisco(b.db, `RSK-${id}-v1`);
    expect({ ...depois, versaoMaisNova: antes.versaoMaisNova }).toEqual(antes);
    expect(depois.versaoMaisNova).toBe(`RSK-${id}-v2`);
  });
});

describe('GET /api/demandas/:id/pareceres-risco', () => {
  it('lista da mais nova para a mais antiga; agente lê (matriz)', async () => {
    const id = await novaDemanda();
    await criarOk(id);
    await criarOk(id, {}, { bearer: tokenRisco });
    for (const cred of [cto(), { bearer: tokenConsolidacao }]) {
      const r = await listar(id, cred);
      expect(r.status).toBe(200);
      const { itens } = (await r.json()) as { itens: Array<{ id: string; rascunhoAgente: boolean; autor: unknown }> };
      expect(itens.map((i) => [i.id, i.rascunhoAgente, i.autor])).toEqual([
        [`RSK-${id}-v2`, true, { tipo: 'agente', agente: 'risco' }],
        [`RSK-${id}-v1`, false, { tipo: 'pessoa', nome: expect.any(String) }],
      ]);
    }
  });

  it('demanda sem parecer → lista vazia; demanda que não existe → 404, e não lista vazia', async () => {
    const id = await novaDemanda();
    expect(await listarPareceresRisco(b.db, id)).toEqual([]);
    const r = await listar('DEM-20261022-9999');
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it('CA-01.3: sem sessão nem token → 401', async () => {
    expect((await listar('DEM-20261022-0001', {})).status).toBe(401);
  });
});

describe('GET /api/pareceres-risco/:rskId', () => {
  it('200 com a versão, o id do RSK mais novo e o da ESP mais nova da demanda', async () => {
    const id = await novaDemanda();
    await criarOk(id, { resumo: 'Primeiro' });
    const semEsp = (await (await obter(`RSK-${id}-v1`)).json()) as Record<string, unknown>;
    expect(semEsp).toMatchObject({ id: `RSK-${id}-v1`, resumo: 'Primeiro', versaoMaisNova: `RSK-${id}-v1`, especificacaoMaisNova: null });
    await criarOk(id, { resumo: 'Segundo' });
    const esp = criarEspecificacaoSchema.parse({
      descricaoObjetiva: 'x',
      escopoInclui: ['a'],
      sistemaAlvo: 'meu-sistema',
      repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
      criteriosAceitePreliminares: ['c'],
      definicaoDePronto: ['p'],
    });
    await criarEspecificacao(deps, admAtor, id, esp);
    await criarEspecificacao(deps, admAtor, id, esp);
    const r = await obter(`RSK-${id}-v1`);
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ id: `RSK-${id}-v1`, resumo: 'Primeiro', versaoMaisNova: `RSK-${id}-v2`, especificacaoMaisNova: `ESP-${id}-v2` });
    expect((await obter(`RSK-${id}-v2`, { bearer: tokenInsumo })).status).toBe(200);
  });

  it('versão que não existe → 404', async () => {
    const r = await obter('RSK-DEM-20261022-9999-v1');
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it('id fora do formato → 404 sem nenhuma consulta ao banco, com ou sem credencial', async () => {
    const consultas = vi.spyOn(b.poolApp, 'query');
    const conexoes = vi.spyOn(b.poolApp, 'connect');
    try {
      for (const rskId of ['RSK-DEM-2026-1-v1', 'ESP-DEM-20261022-0001-v1', "RSK-DEM-20261022-0001-v1' or 1=1", 'RSK-DEM-20261022-0001-v12345', 'x']) {
        for (const cred of [cto(), {}]) {
          const r = await obter(rskId, cred);
          expect(r.status, rskId).toBe(404);
          expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
        }
      }
      for (const demandaId of ['DEM-2026-1', 'RSK-DEM-20261022-0001-v1']) {
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

  it('CA-11.1: /api/pareceres-risco/:rskId só exporta GET', async () => {
    // O Next responde 405 a método não exportado. Nem a rota da lista exporta método que altere versão gravada.
    expect(Object.keys(rotaDaVersao).filter((k) => /^[A-Z]+$/.test(k))).toEqual(['GET']);
    expect(Object.keys(rotaDaLista).filter((k) => /^[A-Z]+$/.test(k)).sort()).toEqual(['GET', 'POST']);
    for (const rotaRsk of [rotaDaLista, rotaDaVersao] as Array<Record<string, unknown>>) {
      for (const m of ['PATCH', 'PUT', 'DELETE']) expect(rotaRsk[m], m).toBeUndefined();
    }
    const id = await novaDemanda();
    const v = await criarOk(id, { resumo: 'Original' });
    expect(await (await obter(v.id)).json()).toMatchObject({ resumo: 'Original' });
  });

  it('CA-01.3: sem sessão nem token → 401', async () => {
    expect((await obter('RSK-DEM-20261022-0001-v1', {})).status).toBe(401);
  });
});

describe('log das rotas do RSK (C-21)', () => {
  it('uma linha por requisição, com o padrão da rota; sem id, sentinela nem token', async () => {
    const id = await novaDemanda();
    linhasDeLog.length = 0;
    const v = await criarOk(id, { resumo: SENTINELAS.texto, preCondicoes: [SENTINELAS.email], riscoJuridicoComentario: SENTINELAS.nome });
    await listar(id);
    await obter(v.id);
    await criar(id, { ...VALIDO, rascunhoAgente: false }, { bearer: tokenRisco });
    const linhas = linhasDeLog.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.evento === 'requisicao');
    expect(linhas.map((l) => `${String(l.metodo)} ${String(l.rota)} ${String(l.status)}`)).toEqual([
      'POST /api/demandas/[id]/pareceres-risco 201',
      'GET /api/demandas/[id]/pareceres-risco 200',
      'GET /api/pareceres-risco/[rskId] 200',
      'POST /api/demandas/[id]/pareceres-risco 201',
    ]);
    const tudo = linhasDeLog.join('\n');
    expect(tudo).not.toMatch(/DEM-\d{8}-\d{4}/);
    expect(tudo).not.toContain(tokenRisco);
    expect(contemSentinela(tudo)).toBe(false);
  });
});

// Acrescentados na 06-T19-testes (qa-automacao): concorrência além de duas criações, fronteira e janela do limite com
// ESP, RSK e DEC somados, limite do agente pelo nome, número de versão por demanda e com dez versões ou mais, ESP mais
// nova de outra demanda, recusas que não consomem versão, autoria no sentido contrário e a v1 lida pela rota.
//
// Independência de ordem. O limite (C-36) conta tudo o que foi criado depois de "agora menos uma hora", inclusive o que
// tem data mais nova que o relógio de quem pergunta. Por isso:
//   - cada teste fixa o próprio dia (`usarDia(n)`, um n por teste, escrito no teste e não num contador), sempre antes do
//     relógio do arquivo: o que este bloco grava fica no passado dos testes acima e não pesa no limite deles;
//   - quem enche o limite tem pessoa só sua (B na fronteira, C na janela; D só aparece na concorrência), e o teste que enche o
//     limite do agente risco fica no dia mais antigo, onde as versões dele não estão no futuro de nenhum outro teste;
//   - as pessoas fictícias são gravadas direto na tabela de contas.
// As rotas usam o relógio fixo do arquivo, com poucas versões por credencial.
describe('bordas (06-T19-testes)', () => {
  const pessoa = (letra: string, papel: AtorPessoa['papel']): AtorPessoa => ({ tipo: 'pessoa', usuarioId: `u-rsk-qa-${letra}`, nome: `Pessoa Ficticia ${letra.toUpperCase()}`, papel });
  const pessoaA = pessoa('a', 'cto');
  const pessoaB = pessoa('b', 'administradora');
  const pessoaC = pessoa('c', 'cto');
  const pessoaD = pessoa('d', 'administradora');
  let relogio: RelogioFixo;
  let svc: { db: BancoDeTeste['db']; pool: BancoDeTeste['poolApp']; relogio: RelogioFixo };

  beforeAll(async () => {
    await b.db.insert(user).values(
      [pessoaA, pessoaB, pessoaC, pessoaD].map((p) => ({ id: p.usuarioId, name: p.nome, email: `${p.usuarioId}@exemplo.test`, papel: p.papel })),
    );
  });

  // n dias antes do relógio do arquivo (AGORA_TESTE).
  function usarDia(n: number): void {
    relogio = relogioFixo(AGORA_TESTE);
    relogio.avancar(-n * 86_400_000);
    svc = { db: b.db, pool: b.poolApp, relogio };
  }

  const novaDemandaQa = async (): Promise<string> =>
    (await criarDemanda(svc, pessoaA, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' }))).id;

  // Versões gravadas direto pelo migrator, sem evento, com a autoria e a data dadas (só para montar o cenário).
  const inserirRsk = (demandaId: string, de: number, ate: number, autorTipo: 'pessoa' | 'agente', autorId: string, quando: Date) =>
    b.poolMigrator.query(
      `insert into parecer_risco (id, demanda_id, versao, risco_tecnico_nivel, risco_operacional_nivel, risco_juridico_nivel, autor_tipo, autor_id, rascunho_agente, criada_em)
       select 'RSK-' || $1::text || '-v' || v, $1::text, v, 'baixo', 'baixo', 'baixo', $2::text, $3::text, $2::text = 'agente', $4::timestamptz
       from generate_series($5::int, $6::int) as v`,
      [demandaId, autorTipo, autorId, quando, de, ate],
    );
  const inserirEsp = (demandaId: string, de: number, ate: number, autorId: string, quando: Date) =>
    b.poolMigrator.query(
      `insert into especificacao_tecnica (id, demanda_id, versao, descricao_objetiva, escopo_inclui, autor_tipo, autor_id, rascunho_agente, criada_em)
       select 'ESP-' || $1::text || '-v' || v, $1::text, v, 'x', '["x"]'::jsonb, 'pessoa', $2::text, false, $3::timestamptz
       from generate_series($4::int, $5::int) as v`,
      [demandaId, autorId, quando, de, ate],
    );
  const inserirDec = (demandaId: string, autorId: string, quando: Date) =>
    b.poolMigrator.query(
      `insert into pacote_decisao (id, demanda_id, versao, especificacao_id, especificacao_versao, parecer_risco_id, parecer_risco_versao, demanda_tipo, demanda_titulo, demanda_descricao, resumo_executivo, opcao_a, opcao_b, nivel_aprovacao_requerido, autor_tipo, autor_id, rascunho_agente, criada_em)
       values ('DEC-' || $1::text || '-v1', $1::text, 1, 'ESP-' || $1::text || '-v1', 1, 'RSK-' || $1::text || '-v1', 1, 'bug', 'Pedidos duplicados', 'Contexto: ficticio', 'Resumo ficticio', '{"descricao":"Opcao A ficticia"}', '{"descricao":"Opcao B ficticia"}', 'cto', 'pessoa', $2::text, false, $3::timestamptz)`,
      [demandaId, autorId, quando],
    );
  const criadosPeloServico = async (demandaId: string) => (await eventosDa(demandaId)).filter((e) => e.acao === 'parecer_risco_criado');

  it('CA-04.3: cinco criações simultâneas, de duas pessoas e do agente risco → v1 a v5, sem erro e sem número repetido', async () => {
    usarDia(1);
    const id = await novaDemandaQa();
    const atores: Ator[] = [pessoaA, pessoaD, agenteRisco, pessoaA, agenteRisco];
    const resultados = await Promise.allSettled(atores.map((a, i) => criarParecerRisco(svc, a, id, rsk({ resumo: `Concorrente ${i}` }))));
    expect(resultados.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled', 'fulfilled', 'fulfilled', 'fulfilled']);
    const versoes = resultados.map((r) => (r as PromiseFulfilledResult<{ versao: number }>).value.versao).sort((a, x) => a - x);
    expect(versoes).toEqual([1, 2, 3, 4, 5]);
    const linhas = (await b.poolMigrator.query<{ id: string; resumo: string }>('select id, resumo from parecer_risco where demanda_id = $1 order by versao', [id])).rows;
    expect(linhas.map((l) => l.id)).toEqual([1, 2, 3, 4, 5].map((v) => idVersao('RSK', id, v)));
    // Cada versão guarda o texto de uma chamada só: nenhuma sobrescreveu outra.
    expect(new Set(linhas.map((l) => l.resumo)).size).toBe(5);
    expect(await criadosPeloServico(id)).toHaveLength(5);
  });

  it('C-36 na fronteira, com ESP, RSK e DEC somados: com 59 do ator na hora, o 60º é gravado e o 61º → limite_excedido, sem versão nem evento', async () => {
    usarDia(2);
    const id = await novaDemandaQa();
    const agora = relogio.agora();
    await inserirEsp(id, 1, 30, pessoaB.usuarioId, agora);
    await inserirRsk(id, 1, 28, 'pessoa', pessoaB.usuarioId, agora);
    await inserirDec(id, pessoaB.usuarioId, agora);
    expect((await criarParecerRisco(svc, pessoaB, id, rsk())).versao).toBe(29);
    await expect(criarParecerRisco(svc, pessoaB, id, rsk())).rejects.toMatchObject({ codigo: 'limite_excedido', mensagem: MENSAGEM_LIMITE.artefato });
    expect(await contarRsk(id)).toBe(29);
    expect(await criadosPeloServico(id)).toHaveLength(1);
    // A recusa não consumiu número: a versão seguinte, de outro ator, é a 30.
    expect((await criarParecerRisco(svc, pessoaA, id, rsk())).versao).toBe(30);
  });

  it('C-36: a janela é de uma hora pelo relógio injetado; com uma hora menos 1 ms conta, com uma hora exata não conta', async () => {
    usarDia(3);
    const id = await novaDemandaQa();
    await inserirRsk(id, 1, 60, 'pessoa', pessoaC.usuarioId, new Date(relogio.agora().getTime() - 3_599_999));
    await expect(criarParecerRisco(svc, pessoaC, id, rsk())).rejects.toMatchObject({ codigo: 'limite_excedido' });
    expect(await contarRsk(id)).toBe(60);
    relogio.avancar(1);
    expect((await criarParecerRisco(svc, pessoaC, id, rsk())).versao).toBe(61);
  });

  it('C-36: o limite do agente conta pelo nome do agente, e não pelo token; uma pessoa não é afetada', async () => {
    // O dia mais antigo do bloco: as 60 versões do agente ficam no passado de todos os outros testes.
    usarDia(100);
    const id = await novaDemandaQa();
    await inserirRsk(id, 1, 60, 'agente', 'risco', relogio.agora());
    const outroToken: AtorAgente = { tipo: 'agente', agente: 'risco', prefixoToken: 'Qa7wE2rT' };
    for (const ator of [agenteRisco, outroToken]) {
      await expect(criarParecerRisco(svc, ator, id, rsk())).rejects.toMatchObject({ codigo: 'limite_excedido' });
    }
    expect(await criadosPeloServico(id)).toHaveLength(0);
    expect((await criarParecerRisco(svc, pessoaA, id, rsk())).versao).toBe(61);
  });

  it('a versão do RSK é por demanda e não segue a da ESP: com ESP v1 e v2, o primeiro RSK é v1; em outra demanda, também v1', async () => {
    usarDia(4);
    const a = await novaDemandaQa();
    const outra = await novaDemandaQa();
    const esp = criarEspecificacaoSchema.parse({
      descricaoObjetiva: 'x',
      escopoInclui: ['a'],
      sistemaAlvo: 'meu-sistema',
      repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
      criteriosAceitePreliminares: ['c'],
      definicaoDePronto: ['p'],
    });
    await criarEspecificacao(svc, pessoaA, a, esp);
    await criarEspecificacao(svc, pessoaA, a, esp);
    expect((await criarParecerRisco(svc, pessoaA, a, rsk())).id).toBe(idVersao('RSK', a, 1));
    expect((await criarParecerRisco(svc, pessoaA, a, rsk())).id).toBe(idVersao('RSK', a, 2));
    expect((await criarParecerRisco(svc, pessoaA, outra, rsk())).id).toBe(idVersao('RSK', outra, 1));
    expect((await obterParecerRisco(b.db, idVersao('RSK', a, 1))).especificacaoMaisNova).toBe(idVersao('ESP', a, 2));
  });

  it('com dez versões ou mais, a lista segue o número (v11, v10, …, v1) e versaoMaisNova e especificacaoMaisNova também', async () => {
    usarDia(5);
    const id = await novaDemandaQa();
    // ESP v1 a v10 de duas horas antes: fora da janela do limite deste teste.
    await inserirEsp(id, 1, 10, pessoaA.usuarioId, new Date(relogio.agora().getTime() - 7_200_000));
    for (let i = 1; i <= 11; i++) await criarParecerRisco(svc, i % 2 ? pessoaA : agenteRisco, id, rsk({ resumo: `Versão ${i}` }));
    const lista = await listarPareceresRisco(b.db, id);
    expect(lista.map((r) => r.versao)).toEqual([11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(lista.map((r) => r.resumo)).toEqual(Array.from({ length: 11 }, (_, i) => `Versão ${11 - i}`));
    const v2 = await obterParecerRisco(b.db, idVersao('RSK', id, 2));
    expect(v2).toMatchObject({ versao: 2, resumo: 'Versão 2', versaoMaisNova: idVersao('RSK', id, 11), especificacaoMaisNova: idVersao('ESP', id, 10) });
  });

  it('especificacaoMaisNova só olha a demanda do parecer: a ESP de outra demanda não entra', async () => {
    usarDia(6);
    const id = await novaDemandaQa();
    const outra = await novaDemandaQa();
    await inserirEsp(outra, 1, 3, pessoaA.usuarioId, new Date(relogio.agora().getTime() - 7_200_000));
    const v = await criarParecerRisco(svc, pessoaA, id, rsk());
    expect(v).toMatchObject({ especificacaoMaisNova: null });
    expect((await obterParecerRisco(b.db, v.id)).especificacaoMaisNova).toBeNull();
    await inserirEsp(id, 1, 1, pessoaA.usuarioId, new Date(relogio.agora().getTime() - 7_200_000));
    expect((await obterParecerRisco(b.db, v.id)).especificacaoMaisNova).toBe(idVersao('ESP', id, 1));
  });

  it('CA-09.2 e CA-09.3 pela rota nos campos que faltavam: cada recusa traz só o seu campo, e nenhuma consome versão nem grava evento', async () => {
    usarDia(7);
    const id = await novaDemandaQa();
    const casos: Array<[string, unknown]> = [
      ['riscoTecnicoNivel', 'ALTO'],
      ['riscoOperacionalNivel', 'critico'],
      ['riscoOperacionalNivel', 'médio'],
      ['riscoJuridicoNivel', 'critico'],
      ['riscoJuridicoNivel', 3],
      ['recomendacoesMitigacao', 'mitigar tudo antes'],
      ['preCondicoes', { item: 'antes de tudo' }],
    ];
    for (const [campo, valor] of casos) {
      const r = await criar(id, { ...VALIDO, [campo]: valor });
      expect(r.status, `${campo} ${JSON.stringify(valor)}`).toBe(400);
      const texto = await r.text();
      expect((JSON.parse(texto) as { campos: Array<{ campo: string }> }).campos.map((c) => c.campo), campo).toEqual([campo]);
      if (typeof valor === 'string') expect(texto, campo).not.toContain(valor);
    }
    expect(await contarRsk(id)).toBe(0);
    expect((await criarOk(id)).id).toBe(`RSK-${id}-v1`);
    expect((await eventosDa(id)).map((e) => e.acao)).toEqual(['demanda_criada', 'parecer_risco_criado']);
  });

  it('C-11 pela rota, no sentido contrário: pessoa que manda rascunhoAgente:true e autoria de agente → grava a pessoa, sem rascunho', async () => {
    usarDia(8);
    const id = await novaDemandaQa();
    const v = await criarOk(id, {
      rascunhoAgente: true,
      autorTipo: 'agente',
      autorId: 'risco',
      responsavel: 'risco',
      execucaoAgenteId: '00000000-0000-4000-8000-000000000119',
    });
    expect(v).toMatchObject({ rascunhoAgente: false, autor: { tipo: 'pessoa', nome: expect.any(String) } });
    expect(await linhaRsk(v.id)).toMatchObject({ autor_tipo: 'pessoa', autor_id: ctoAtor.usuarioId, rascunho_agente: false, execucao_agente_id: null });
    const ev = (await eventosDa(id)).find((e) => e.acao === 'parecer_risco_criado')!;
    expect(ev).toMatchObject({ ator_tipo: 'pessoa', ator_id: ctoAtor.usuarioId, depois: { versao: 1, rascunhoAgente: false } });
  });

  it('CA-11.1 pela rota: a v1 lida é a mesma antes e depois da v2, com a data do relógio injetado', async () => {
    usarDia(9);
    const id = await novaDemandaQa();
    const v1 = await criarOk(id, COMPLETO);
    const antes = (await (await obter(v1.id)).json()) as Record<string, unknown>;
    expect(antes).toMatchObject({ ...COMPLETO, versaoMaisNova: v1.id, criadaEm: deps.relogio.agora().toISOString() });
    await criarOk(id, { ...COMPLETO, resumo: 'Mudou', riscoTecnicoNivel: 'baixo', preCondicoes: ['Outra pré-condição'] }, { bearer: tokenRisco });
    const depois = (await (await obter(v1.id)).json()) as Record<string, unknown>;
    expect({ ...depois, versaoMaisNova: antes.versaoMaisNova }).toEqual(antes);
    expect(depois.versaoMaisNova).toBe(`RSK-${id}-v2`);
  });
});
