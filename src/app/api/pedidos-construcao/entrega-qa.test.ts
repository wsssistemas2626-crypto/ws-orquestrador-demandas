// 06-T11-testes (qa-automacao): o que entrega.test.ts não cobre nas duas rotas do /construir, pela rota real, com Bearer
// do token `construir` e sem `Origin`, como o buscar-pedidos.mjs chama:
//   - pendências da 06-T10-testes pela rota GET /pendentes: o v2 devolvido com pedido_gerado de pessoa fica fora (e a
//     entrega dele é recusada), o recebido sobre a entidade `demanda` não tira o DEC, o recebido sobre o DEC tira;
//   - a ordem da lista é a do primeiro pedido_gerado, não a do id (RF-12);
//   - conferências da geração que a entrega refaz e que o arquivo do engenheiro não exercita pela rota: estudo (422) e
//     dado pessoal C-28 (422 sem o valor), com pedido_gerado de pessoa já gravado;
//   - C-17: decId fora da regex dá 404 com o corpo do inexistente, antes de autenticar e sem gravar;
//   - C-15 não afrouxa na entrega sem corpo: com cookie e sem Origin, 403; com cookie, Origin e sem JSON, 415; cookie de
//     sessão junto com o Bearer, 400 (RF-01);
//   - corpo mandado mesmo assim na entrega é ignorado: os bytes são os do DEC do caminho;
//   - CA-01.5: token construir revogado → 401 nas duas rotas, sem derrubar o outro token construir;
//   - RF-09: nada depende do Host nem do esquema (http://orquestrador_app, a rede interna do Easypanel).
// Postgres real (Testcontainers), relógio fixo próprio, cada caso com DEC e autora próprios; as contagens de evento são
// relativas e as listas são filtradas pelos DEC do caso, então nada depende de ordem. Tokens só gerados em tempo de teste,
// nunca em mensagem de expect. Dados só fictícios.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { AGORA_TESTE, criarDepsDeTeste } from '../../../../test/deps';
import { chamarRota, URL_BASE } from '../../../../test/requisicao';
import { novoIp } from '../../../../test/sessao';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo, type RelogioFixo } from '../../../lib/relogio';
import type { AtorPessoa } from '../../../modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenDeIntegracao, revogarTokenServico } from '../../../modules/acesso/tokens-servico';
import { criarDemandaSchema } from '../../../modules/demandas/schemas';
import { criarDemanda } from '../../../modules/demandas/servico';
import { criarEspecificacaoSchema } from '../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../modules/especificacoes/servico';
import { criarPacoteDecisao } from '../../../modules/pacotes-decisao/criar';
import { registrarDecisao } from '../../../modules/pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../../../modules/pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../modules/pareceres-risco/servico';
import { MENSAGENS_PEDIDO, gerarPedido } from '../../../modules/pedido-construcao/gerar';
import * as rotaEntrega from './[decId]/entrega/route';
import * as rotaPendentes from './pendentes/route';

const CONFIRMADO = { confirmaSemDadoPessoal: true } as const;
const NAO_ENCONTRADO = { erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO };
const TOKEN_INVALIDO = { erro: 'nao_autenticado', mensagem: MENSAGENS_ACESSO.token_invalido };
const ESP = {
  descricaoObjetiva: 'Corrigir pedidos duplicados',
  escopoInclui: ['Importação de pedidos'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['Pedido importado uma vez só'],
  definicaoDePronto: ['pnpm test verde'],
};
const RSK = { riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };

let b: BancoDeTeste;
let deps: Deps;
let relogio: RelogioFixo;
let tokenConstruir: string;
let autoras = 0;

const geradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-geradora-entrega-qa', nome: 'Pessoa Ficticia Geradora', papel: 'cto' };
const novaAutora = (): AtorPessoa => ({ tipo: 'pessoa', usuarioId: `u-autora-entrega-qa-${++autoras}`, nome: 'Pessoa Ficticia Autora', papel: 'cto' });

const listar = (bearer = tokenConstruir, extra: Record<string, string> = {}) =>
  chamarRota(rotaPendentes.GET, {
    caminho: '/api/pedidos-construcao/pendentes',
    bearer,
    semOrigin: true,
    cabecalhos: { accept: 'application/json', ...extra },
  });
// `bearer: null` manda a requisição sem credencial.
const entregar = (decId: string, op: { bearer?: string | null; corpo?: unknown; cabecalhos?: Record<string, string>; semOrigin?: boolean } = {}) =>
  chamarRota(rotaEntrega.POST, {
    metodo: 'POST',
    caminho: `/api/pedidos-construcao/${encodeURIComponent(decId)}/entrega`,
    params: { decId },
    bearer: op.bearer === null ? undefined : (op.bearer ?? tokenConstruir),
    semOrigin: op.semOrigin ?? true,
    corpo: op.corpo,
    cabecalhos: { accept: 'application/json', ...op.cabecalhos },
  });

const pendentesEntre = async (ids: string[]): Promise<string[]> => {
  const r = await listar();
  expect(r.status).toBe(200);
  return ((await r.json()) as { itens: Array<{ decId: string }> }).itens.map((i) => i.decId).filter((id) => ids.includes(id));
};
const totalDeEventos = async () => Number((await b.poolMigrator.query<{ n: string }>(`select count(*)::text as n from evento`)).rows[0]!.n);

const novoDec = async (autora: AtorPessoa, demandaId: string) =>
  (
    await criarPacoteDecisao(
      deps,
      autora,
      demandaId,
      criarPacoteDecisaoSchema.parse({
        resumoExecutivo: 'Corrigir a importação de pedidos',
        opcaoA: { descricao: 'Corrigir no importador' },
        opcaoB: { descricao: 'Refazer a integração' },
        nivelAprovacaoRequerido: 'cto',
      }),
    )
  ).id;

type Cenario = { autora: AtorPessoa; demandaId: string; decId: string; json: string | null };

// DEC aprovado; por padrão com o pedido gerado por pessoa pelo caminho real (gerarPedido).
async function prepararDec(op: { demanda?: Record<string, unknown>; gerar?: boolean } = {}): Promise<Cenario> {
  const autora = novaAutora();
  const d = await criarDemanda(
    deps,
    autora,
    criarDemandaSchema.parse({
      titulo: 'Pedidos duplicados (fictício)',
      tipo: 'bug',
      solicitanteNome: 'Carlos Exemplar',
      contexto: 'Importação diária do ERP',
      descricaoProblema: 'Pedidos aparecem duas vezes',
      ...op.demanda,
    }),
  );
  await criarEspecificacao(deps, autora, d.id, criarEspecificacaoSchema.parse(ESP));
  await criarParecerRisco(deps, autora, d.id, criarParecerRiscoSchema.parse(RSK));
  const decId = await novoDec(autora, d.id);
  await registrarDecisao(deps, geradora, decId, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }));
  const json = op.gerar === false ? null : (await gerarPedido(deps, geradora, decId, CONFIRMADO)).json;
  return { autora, demandaId: d.id, decId, json };
}

// Pelo migrator: o evento fica com o ator e a entidade que o caso quer, inclusive os que o app não gravaria por si.
async function inserirEvento(e: {
  acao: 'pedido_gerado' | 'pedido_recebido';
  decId: string;
  demandaId: string;
  atorTipo: 'pessoa' | 'integracao';
  atorId: string;
  entidade?: 'pacote_decisao' | 'demanda';
  depois?: unknown;
}): Promise<void> {
  await b.poolMigrator.query(
    `insert into evento (ocorrido_em, ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, entidade_id, acao, depois)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)`,
    [
      relogio.agora().toISOString(),
      e.atorTipo,
      e.atorId,
      e.atorTipo === 'integracao' ? 'ficticio' : null,
      e.demandaId,
      e.entidade ?? 'pacote_decisao',
      e.decId,
      e.acao,
      e.depois === undefined ? null : JSON.stringify(e.depois),
    ],
  );
}

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  relogio = relogioFixo(AGORA_TESTE);
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  tokenConstruir = (await comTransacao(deps.pool, (t) => criarTokenDeIntegracao(t, 'construir', deps.relogio))).token;
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('GET /pendentes pela rota: as bordas da 06-T10-testes', () => {
  it('v2 devolvido com pedido_gerado de pessoa fica fora da lista e a entrega dele dá 409 naoAprovado, sem evento; o v1 aprovado segue e entrega', async () => {
    const { autora, demandaId, decId: v1, json } = await prepararDec();
    const v2 = await novoDec(autora, demandaId);
    await registrarDecisao(deps, geradora, v2, registrarDecisaoSchema.parse({ statusDecisao: 'devolvida' }));
    await inserirEvento({ acao: 'pedido_gerado', decId: v2, demandaId, atorTipo: 'pessoa', atorId: geradora.usuarioId, depois: CONFIRMADO });

    expect(await pendentesEntre([v1, v2])).toEqual([v1]);

    const antes = await totalDeEventos();
    const r = await entregar(v2);
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ erro: 'conflito', mensagem: MENSAGENS_PEDIDO.naoAprovado });
    expect(await totalDeEventos()).toBe(antes);

    const r1 = await entregar(v1);
    expect(r1.status).toBe(200);
    expect(await r1.text()).toBe(json);
  });

  it('pedido_recebido sobre a entidade demanda não tira o DEC da lista; sobre o DEC, tira (CA-12.5)', async () => {
    const naDemanda = await prepararDec();
    const noDec = await prepararDec();
    const hash = 'a1'.padStart(64, '0');
    for (const c of [naDemanda, noDec]) expect((await entregar(c.decId)).status).toBe(200);
    await inserirEvento({
      acao: 'pedido_recebido',
      decId: naDemanda.decId,
      demandaId: naDemanda.demandaId,
      atorTipo: 'integracao',
      atorId: 'construir',
      entidade: 'demanda',
      depois: { sha256: hash },
    });
    await inserirEvento({ acao: 'pedido_recebido', decId: noDec.decId, demandaId: noDec.demandaId, atorTipo: 'integracao', atorId: 'construir', depois: { sha256: hash } });
    expect(await pendentesEntre([naDemanda.decId, noDec.decId])).toEqual([naDemanda.decId]);
  });

  it('RF-12: a ordem é a do primeiro pedido_gerado, não a do id', async () => {
    const primeiroId = await prepararDec({ gerar: false });
    const segundoId = await prepararDec({ gerar: false });
    expect(primeiroId.decId < segundoId.decId).toBe(true);
    await gerarPedido(deps, geradora, segundoId.decId, CONFIRMADO);
    relogio.avancar(60_000);
    await gerarPedido(deps, geradora, primeiroId.decId, CONFIRMADO);
    expect(await pendentesEntre([primeiroId.decId, segundoId.decId])).toEqual([segundoId.decId, primeiroId.decId]);
  });
});

describe('POST /entrega: conferências da geração refeitas pela rota', () => {
  it('demanda do tipo estudo, com pedido_gerado de pessoa gravado → 422 estudo, sem evento', async () => {
    const { demandaId, decId } = await prepararDec({ demanda: { tipo: 'estudo' }, gerar: false });
    await inserirEvento({ acao: 'pedido_gerado', decId, demandaId, atorTipo: 'pessoa', atorId: geradora.usuarioId, depois: CONFIRMADO });
    const antes = await totalDeEventos();
    const r = await entregar(decId);
    expect(r.status).toBe(422);
    expect(await r.json()).toEqual({ erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.estudo });
    expect(await totalDeEventos()).toBe(antes);
  });

  it('C-28: e-mail no título copiado no DEC, com pedido_gerado de pessoa gravado → 422 com o caminho e o tipo, sem o valor, sem evento', async () => {
    const { demandaId, decId } = await prepararDec({ demanda: { titulo: 'Escrever para contato.ficticio@exemplo.test' }, gerar: false });
    await inserirEvento({ acao: 'pedido_gerado', decId, demandaId, atorTipo: 'pessoa', atorId: geradora.usuarioId, depois: CONFIRMADO });
    const antes = await totalDeEventos();
    const r = await entregar(decId);
    expect(r.status).toBe(422);
    const texto = await r.text();
    const corpo = JSON.parse(texto) as { erro: string; mensagem: string; erros: string[] };
    expect(corpo.erro).toBe('nao_processavel');
    expect(corpo.mensagem).toBe(MENSAGENS_PEDIDO.naoPassou);
    expect(corpo.erros).toContain('demanda.titulo: e-mail');
    expect(texto).not.toMatch(/exemplo\.test|contato|ficticio@/i);
    expect(await totalDeEventos()).toBe(antes);
  });
});

describe('POST /entrega: entrada e C-15', () => {
  it('C-17: decId fora da regex → 404 com o corpo, byte a byte, do DEC inexistente, antes de autenticar e sem gravar', async () => {
    const { decId } = await prepararDec();
    const inexistente = await entregar('DEC-DEM-20261022-9999-v1');
    expect(inexistente.status).toBe(404);
    const corpoInexistente = await inexistente.text();
    expect(JSON.parse(corpoInexistente)).toEqual(NAO_ENCONTRADO);
    const antes = await totalDeEventos();
    for (const estranho of [
      `${decId}' or '1'='1`,
      decId.toLowerCase(),
      decId.replace(/^DEC/, 'ESP'),
      decId.replace(/^DEC-/, ''),
      `${decId}/../x`,
      `${decId.slice(0, -2)}%`,
      '',
    ]) {
      // Sem credencial: o 404 vem antes do 401, então a regex é a primeira barreira.
      for (const bearer of [tokenConstruir, null]) {
        const r = await entregar(estranho, { bearer });
        expect(r.status, estranho).toBe(404);
        expect(await r.text(), estranho).toBe(corpoInexistente);
      }
    }
    expect(await totalDeEventos()).toBe(antes);
  });

  it('CA-09.4 na entrega sem corpo: cookie e sem Origin → 403; cookie, Origin certa e sem JSON → 415; nenhum evento', async () => {
    const { decId } = await prepararDec();
    const antes = await totalDeEventos();
    const semOrigin = await entregar(decId, { cabecalhos: { cookie: 'qualquer=1' } });
    expect(semOrigin.status).toBe(403);
    expect(await semOrigin.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    const semJson = await entregar(decId, { cabecalhos: { cookie: 'qualquer=1' }, semOrigin: false });
    expect(semJson.status).toBe(415);
    expect(await totalDeEventos()).toBe(antes);
  });

  it('RF-01: cookie de sessão junto com o Bearer → 400 ambíguo nas duas rotas, sem gravar', async () => {
    const { decId } = await prepararDec();
    const antes = await totalDeEventos();
    const cookie = 'wsod.session_token=ficticio';
    const ambiguo = { erro: 'entrada_invalida', mensagem: MENSAGENS_ACESSO.ambiguo };
    const lista = await listar(tokenConstruir, { cookie });
    expect(lista.status).toBe(400);
    expect(await lista.json()).toMatchObject(ambiguo);
    // Na entrega, o C-15 vem antes: com Origin certa e JSON, chega ao resolverAtor, que recusa a ambiguidade.
    const entrega = await entregar(decId, { cabecalhos: { cookie, 'content-type': 'application/json' }, semOrigin: false });
    expect(entrega.status).toBe(400);
    expect(await entrega.json()).toMatchObject(ambiguo);
    expect(await totalDeEventos()).toBe(antes);
  });

  it('corpo mandado mesmo assim é ignorado: JSON com outro decId ou texto puro → 200 com os bytes do DEC do caminho', async () => {
    const outro = await prepararDec();
    const { decId, json } = await prepararDec();
    const comJson = await entregar(decId, { corpo: { decId: outro.decId, pedido: outro.decId, sha256: '0'.repeat(64) } });
    expect(comJson.status).toBe(200);
    expect(await comJson.text()).toBe(json);
    const comTexto = await entregar(decId, { corpo: 'texto qualquer', cabecalhos: { 'content-type': 'text/plain' } });
    expect(comTexto.status).toBe(200);
    expect(await comTexto.text()).toBe(json);
  });
});

describe('credencial e rede (CA-01.5, RF-09)', () => {
  it('CA-01.5: token construir revogado → 401 com a mensagem de token inválido nas duas rotas, sem gravar; o outro token construir segue valendo', async () => {
    const { decId, json } = await prepararDec();
    const revogado = await comTransacao(deps.pool, (t) => criarTokenDeIntegracao(t, 'construir', deps.relogio));
    expect((await listar(revogado.token)).status).toBe(200);
    await comTransacao(deps.pool, (t) => revogarTokenServico(t, revogado.prefixo, deps.relogio));
    const antes = await totalDeEventos();
    for (const r of [await listar(revogado.token), await entregar(decId, { bearer: revogado.token })]) {
      expect(r.status).toBe(401);
      expect(await r.json()).toEqual(TOKEN_INVALIDO);
    }
    expect(await totalDeEventos()).toBe(antes);
    const ok = await entregar(decId);
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe(json);
  });

  it('RF-09: pela rede interna (http://orquestrador_app), as duas rotas respondem como pelo domínio', async () => {
    const { decId, json } = await prepararDec();
    expect(URL_BASE.startsWith('http://orquestrador_app')).toBe(false);
    const interno = (caminho: string, metodo: string) =>
      new Request(`http://orquestrador_app${caminho}`, {
        method: metodo,
        headers: { ...novoIp(), host: 'orquestrador_app', accept: 'application/json', authorization: `Bearer ${tokenConstruir}` },
      });
    const lista = await rotaPendentes.GET(interno('/api/pedidos-construcao/pendentes', 'GET'), { params: Promise.resolve({}) });
    expect(lista.status).toBe(200);
    expect(((await lista.json()) as { itens: Array<{ decId: string }> }).itens).toContainEqual({ decId });
    const entrega = await rotaEntrega.POST(interno(`/api/pedidos-construcao/${decId}/entrega`, 'POST'), { params: Promise.resolve({ decId }) });
    expect(entrega.status).toBe(200);
    expect(entrega.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(await entrega.text()).toBe(json);
  });
});
