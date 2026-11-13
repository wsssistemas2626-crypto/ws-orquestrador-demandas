// 06-T20-testes (qa-automacao) do DEC-DEM-20261111-0016-v1: o que o integracoes.spec.ts (T20) não confere pelo build de
// produção (e2e/servidor.ts: `next build` e `next start`, com o proxy.ts e a CSP de verdade). A matriz e as respostas já
// têm Vitest nas rotas (T03, T05, T06, T11, T12); aqui elas passam pelo servidor de verdade, com Bearer e sem `Origin`:
//   - CP-2 e CP-8: cada integração recebe 403 fora da própria lista, o Awave lê a demanda de uma pessoa como inexistente
//     (IN-08, CA-07.2), token desconhecido recebe 401 (CA-01.3), e nenhuma dessas recusas grava nada;
//   - RF-12 a RF-14 no pedido que o /construir já recebeu: fora de pendentes, só `decId` nos itens, a entrega repete os
//     mesmos bytes, o recebimento repetido é 204 sem corpo e sem segundo `pedido_recebido`, e sha256 fora do formato é 400;
//   - CA-09.2 pelo build: com o `Host` da rede interna do Easypanel (`orquestrador_app`), Bearer e sem `Origin`, as
//     respostas são as mesmas do endereço de sempre (leitura do Awave, pendentes e entrega), sem nada gravado.
//
// Ordem e relógio: nenhum teste depende do outro nem do integracoes.spec.ts. O primeiro só lê o DEC da `pedidoParaBuscar`
// (que o CP-7 recebe) e compara antes e depois dentro do próprio teste; o segundo e o terceiro usam o DEC da
// `pedidoRecebido`, que o seed (T15) já deixa entregue e recebido, e não mudam nada nele (mesmo hash: nenhum evento novo);
// o terceiro lê a demanda `awaveAguardando`, de autoria do Awave no seed. Nenhuma demanda nem versão é criada (C-36, D2).
// Tokens só os do e2e local (D-10); contra a homologação, os três pulam com o motivo escrito. Nenhum token vai a rótulo de
// `expect` (G3.3); o token desconhecido é montado aqui, fora do banco. O trace fica desligado neste arquivo: o
// `retain-on-failure` do playwright.config.ts gravaria o cabeçalho `authorization` dos contextos de API num teste que
// falha (M1 da 06-T20-tech-lead, IN-04).
import { createHash } from 'node:crypto';
import { request as novoContexto, type Page } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { MENSAGEM_NAO_ENCONTRADO } from '../src/lib/erros';
import { MENSAGENS_ACESSO } from '../src/modules/acesso/mensagens';
import { api, demandaDoSeed, entrarComo, expect, test } from './apoio';
import { HOMOLOGACAO, MOTIVO_SEM_TOKENS, tokensDoE2e, type TokensDoE2e } from './integracoes';

const tokens = tokensDoE2e();

test.use({ trace: 'off' });

function exigirTokens(): TokensDoE2e {
  test.skip(HOMOLOGACAO, MOTIVO_SEM_TOKENS);
  if (tokens === null) throw new Error('e2e: o e2e/servidor.ts não deixou os tokens das integrações (E2E_ARQUIVO_TOKENS)');
  return tokens;
}

// Como os clientes chamam: Bearer, `accept: application/json` e nenhum `Origin` nem cookie.
const contextoDe = (baseURL: string | undefined, token: string) =>
  novoContexto.newContext({ baseURL, extraHTTPHeaders: { authorization: `Bearer ${token}`, accept: 'application/json' } });

type Evento = { acao: string; entidadeId: string };

// O histórico da demanda, pela sessão da pessoa (o mesmo caminho do recebido-construir-qa.spec.ts).
const historico = async (page: Page, demandaId: string) => (await api<{ itens: Evento[] }>(page, 'GET', `/api/demandas/${demandaId}/historico`)).itens;
const totalDeDemandas = async (page: Page) => (await api<{ total: number }>(page, 'GET', '/api/demandas?limit=1')).total;
const decDa = async (page: Page, demandaId: string) => (await api<{ pacotesDecisao: { id: string }[] }>(page, 'GET', `/api/demandas/${demandaId}`)).pacotesDecisao[0]!.id;

const SEM_PERMISSAO = { erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao };
const TOKEN_INVALIDO = { erro: 'nao_autenticado', mensagem: MENSAGENS_ACESSO.token_invalido };
const NAO_ENCONTRADO = { erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO };

test('CP-2 e CP-8 pelo build: 403 fora da lista de cada integração, 404 na demanda alheia, 401 no token desconhecido, nada gravado', async ({ page, baseURL }) => {
  const { awave, construir } = exigirTokens();
  await entrarComo(page, 'cto');
  // A demanda da `pedidoParaBuscar` é de pessoa (a `sem2fa` do seed), com pedido gerado pela "cto".
  const alheia = await demandaDoSeed(page, TITULOS_DO_E2E.pedidoParaBuscar);
  const decId = await decDa(page, alheia);
  const eventosAntes = (await historico(page, alheia)).length;
  const demandasAntes = await totalDeDemandas(page);

  const doAwave = await contextoDe(baseURL, awave);
  const doConstruir = await contextoDe(baseURL, construir);
  // Fora do banco: no formato de token, mas nenhum hash o reconhece.
  const desconhecido = await contextoDe(baseURL, `wsod_${'A'.repeat(43)}`);
  const json = { 'content-type': 'application/json' };
  const corpoDoAwave = JSON.stringify({
    titulo: 'Relatório do e2e que não pode nascer (fictício)',
    tipo: 'melhoria',
    solicitanteNome: 'Awave',
    solicitantePapel: 'outro',
    descricaoProblema: 'Texto fictício.',
    contexto: 'Recusa esperada no e2e.',
  });
  try {
    // IN-08, CA-07.2: a demanda de pessoa responde como a que não existe, corpo igual.
    const lida = await doAwave.get(`/api/demandas/${alheia}`, { maxRedirects: 0 });
    expect(lida.status(), 'GET da demanda de pessoa pelo Awave').toBe(404);
    const inexistente = await doAwave.get('/api/demandas/DEM-20000101-9999', { maxRedirects: 0 });
    expect(inexistente.status(), 'GET de demanda inexistente pelo Awave').toBe(404);
    expect(await lida.json()).toEqual(await inexistente.json());
    expect(await inexistente.json()).toEqual(NAO_ENCONTRADO);

    // CP-2: o Awave fora de criar_demanda e ler_demanda (listar_demandas e as três rotas do /construir).
    const doAwaveNegado = [
      ['GET /api/demandas', await doAwave.get('/api/demandas', { maxRedirects: 0 })],
      ['GET pendentes', await doAwave.get('/api/pedidos-construcao/pendentes', { maxRedirects: 0 })],
      ['POST entrega', await doAwave.post(`/api/pedidos-construcao/${decId}/entrega`, { maxRedirects: 0 })],
      ['POST recebimento', await doAwave.post(`/api/pedidos-construcao/${decId}/recebimento`, { headers: json, data: JSON.stringify({ sha256: '0'.repeat(64) }), maxRedirects: 0 })],
    ] as const;
    for (const [rotulo, r] of doAwaveNegado) {
      expect(r.status(), `Awave em ${rotulo}`).toBe(403);
      expect(await r.json(), `corpo do 403 do Awave em ${rotulo}`).toEqual(SEM_PERMISSAO);
    }

    // CP-8: o /construir fora das três ações (criar, listar e ler demanda).
    const doConstruirNegado = [
      ['POST /api/demandas', await doConstruir.post('/api/demandas', { headers: json, data: corpoDoAwave, maxRedirects: 0 })],
      ['GET /api/demandas', await doConstruir.get('/api/demandas', { maxRedirects: 0 })],
      ['GET /api/demandas/:id', await doConstruir.get(`/api/demandas/${alheia}`, { maxRedirects: 0 })],
    ] as const;
    for (const [rotulo, r] of doConstruirNegado) {
      expect(r.status(), `/construir em ${rotulo}`).toBe(403);
      expect(await r.json(), `corpo do 403 do /construir em ${rotulo}`).toEqual(SEM_PERMISSAO);
    }

    // CA-01.3 e CA-01.5: token desconhecido, a mesma mensagem nas duas integrações, sem dizer o motivo.
    const doDesconhecido = [
      ['POST /api/demandas', await desconhecido.post('/api/demandas', { headers: json, data: corpoDoAwave, maxRedirects: 0 })],
      ['GET pendentes', await desconhecido.get('/api/pedidos-construcao/pendentes', { maxRedirects: 0 })],
    ] as const;
    for (const [rotulo, r] of doDesconhecido) {
      expect(r.status(), `token desconhecido em ${rotulo}`).toBe(401);
      expect(await r.json(), `corpo do 401 em ${rotulo}`).toEqual(TOKEN_INVALIDO);
    }
  } finally {
    await Promise.all([doAwave.dispose(), doConstruir.dispose(), desconhecido.dispose()]);
  }

  // Nenhuma recusa gravou: nem demanda nova, nem evento na demanda do pedido (entrega e recebimento negados).
  expect(await totalDeDemandas(page), 'total de demandas depois das recusas').toBe(demandasAntes);
  expect((await historico(page, alheia)).length, 'eventos da demanda do pedido depois das recusas').toBe(eventosAntes);
});

test('RF-12 a RF-14 pelo build, no pedido já recebido: fora de pendentes, mesmos bytes, recebimento repetido sem evento novo', async ({ page, baseURL }) => {
  const { construir } = exigirTokens();
  await entrarComo(page, 'cto');
  const dem = await demandaDoSeed(page, TITULOS_DO_E2E.pedidoRecebido);
  const decId = await decDa(page, dem);
  const doDec = (eventos: Evento[], acao: string) => eventos.filter((e) => e.acao === acao && e.entidadeId === decId).length;
  const antes = await historico(page, dem);
  // O seed (T15) deixa o DEC entregue e recebido uma vez.
  expect(doDec(antes, 'pedido_entregue'), 'pedido_entregue do seed').toBe(1);
  expect(doDec(antes, 'pedido_recebido'), 'pedido_recebido do seed').toBe(1);

  const ctx = await contextoDe(baseURL, construir);
  try {
    const pendentes = async () => {
      const r = await ctx.get('/api/pedidos-construcao/pendentes', { maxRedirects: 0 });
      expect(r.status(), 'GET pendentes').toBe(200);
      const corpo = (await r.json()) as { itens: Record<string, unknown>[] };
      // CA-12.6: só `itens`, e cada item só com `decId`.
      expect(Object.keys(corpo)).toEqual(['itens']);
      for (const i of corpo.itens) expect(Object.keys(i)).toEqual(['decId']);
      return corpo.itens.map((i) => i.decId);
    };
    // CA-12.5: o DEC recebido não está na lista.
    expect(await pendentes()).not.toContain(decId);

    // CA-09.3 e RF-13: POST sem corpo, sem content-type e sem Origin; JSON em UTF-8; duas entregas, os mesmos bytes.
    const entregar = async () => {
      const r = await ctx.post(`/api/pedidos-construcao/${decId}/entrega`, { maxRedirects: 0 });
      expect(r.status(), 'POST da entrega').toBe(200);
      expect(r.headers()['content-type'], 'content-type da entrega').toBe('application/json; charset=utf-8');
      return r.text();
    };
    const texto = await entregar();
    expect(await entregar()).toBe(texto);
    expect((JSON.parse(texto) as { pedido: string }).pedido).toBe(decId);
    const sha256 = createHash('sha256').update(texto, 'utf8').digest('hex');

    const receber = (corpo: unknown) =>
      ctx.post(`/api/pedidos-construcao/${decId}/recebimento`, { headers: { 'content-type': 'application/json' }, data: JSON.stringify(corpo), maxRedirects: 0 });
    // CA-14.5: fora do formato, 400 com o campo.
    const curto = await receber({ sha256: 'abc' });
    expect(curto.status(), 'recebimento com sha256 fora do formato').toBe(400);
    expect(await curto.json()).toMatchObject({ erro: 'entrada_invalida', campos: [{ campo: 'sha256' }] });
    // CA-14.3: repetir com o hash certo depois de recebido é 204, sem corpo.
    const repetido = await receber({ sha256 });
    expect(repetido.status(), 'recebimento repetido').toBe(204);
    expect(await repetido.text()).toBe('');
    expect(await pendentes()).not.toContain(decId);
  } finally {
    await ctx.dispose();
  }

  // P-02 e CA-14.3: a mesma entrega não grava outro pedido_entregue, e a repetição não grava outro pedido_recebido.
  const depois = await historico(page, dem);
  expect(doDec(depois, 'pedido_entregue'), 'pedido_entregue depois de entregar de novo').toBe(1);
  expect(doDec(depois, 'pedido_recebido'), 'pedido_recebido depois de repetir').toBe(1);
  expect(depois.length, 'eventos da demanda depois do teste').toBe(antes.length);
});

// CA-09.2 e o critério preliminar 6: o Awave chama por http://orquestrador_app (decisão do DEC). Pelo build de produção,
// o `Host` interno não muda nada: nem o proxy.ts, nem a CSP, nem a rota olham o `Host` para aceitar Bearer sem `Origin`.
// Sem criar demanda (o POST com o Host interno ficaria na conta das 10 por hora do Awave e na fila dos outros e2e): a
// leitura do Awave, a lista do /construir e a entrega (POST sem corpo) cobrem os dois métodos.
const HOST_INTERNO = { host: 'orquestrador_app' };

test('CA-09.2 pelo build: com o Host interno (orquestrador_app), Bearer e sem Origin, as respostas são as do endereço de sempre', async ({ page, baseURL }) => {
  const { awave, construir } = exigirTokens();
  await entrarComo(page, 'cto');
  const doSeedDoAwave = await demandaDoSeed(page, TITULOS_DO_E2E.awaveAguardando);
  const dem = await demandaDoSeed(page, TITULOS_DO_E2E.pedidoRecebido);
  const decId = await decDa(page, dem);
  const eventosAntes = (await historico(page, dem)).length;

  const doAwave = await contextoDe(baseURL, awave);
  const doConstruir = await contextoDe(baseURL, construir);
  try {
    // GET pelo Awave da demanda que ele criou: 200, as sete chaves (0.4.0: `andamento`), igual à leitura pelo endereço de
    // sempre.
    const interna = await doAwave.get(`/api/demandas/${doSeedDoAwave}`, { headers: HOST_INTERNO, maxRedirects: 0 });
    expect(interna.status(), 'GET da própria demanda pelo Awave, Host interno').toBe(200);
    const vista = (await interna.json()) as Record<string, unknown>;
    expect(Object.keys(vista).sort()).toEqual(['andamento', 'atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo']);
    expect(vista.id).toBe(doSeedDoAwave);
    const publica = await doAwave.get(`/api/demandas/${doSeedDoAwave}`, { maxRedirects: 0 });
    expect(publica.status(), 'GET da própria demanda pelo Awave, endereço de sempre').toBe(200);
    expect(await publica.json()).toEqual(vista);

    // GET pendentes pelo /construir: 200 e a mesma lista.
    const pendInterna = await doConstruir.get('/api/pedidos-construcao/pendentes', { headers: HOST_INTERNO, maxRedirects: 0 });
    expect(pendInterna.status(), 'GET pendentes, Host interno').toBe(200);
    const pendPublica = await doConstruir.get('/api/pedidos-construcao/pendentes', { maxRedirects: 0 });
    expect(pendPublica.status(), 'GET pendentes, endereço de sempre').toBe(200);
    expect(await pendInterna.json()).toEqual(await pendPublica.json());

    // POST da entrega sem corpo: 200, JSON em UTF-8 e os mesmos bytes pelos dois endereços.
    const entregaInterna = await doConstruir.post(`/api/pedidos-construcao/${decId}/entrega`, { headers: HOST_INTERNO, maxRedirects: 0 });
    expect(entregaInterna.status(), 'POST da entrega, Host interno').toBe(200);
    expect(entregaInterna.headers()['content-type'], 'content-type da entrega, Host interno').toBe('application/json; charset=utf-8');
    const entregaPublica = await doConstruir.post(`/api/pedidos-construcao/${decId}/entrega`, { maxRedirects: 0 });
    expect(entregaPublica.status(), 'POST da entrega, endereço de sempre').toBe(200);
    expect(await entregaInterna.text()).toBe(await entregaPublica.text());
  } finally {
    await Promise.all([doAwave.dispose(), doConstruir.dispose()]);
  }

  // A mesma entrega pelos dois endereços não grava outro pedido_entregue (P-02).
  expect((await historico(page, dem)).length, 'eventos da demanda depois das chamadas pelo Host interno').toBe(eventosAntes);
});
