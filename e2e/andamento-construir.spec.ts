// T14 do DEC-DEM-20261111-0017-v1 (CP-1, CP-5, CA-02.2, CA-03.1, CA-05.1, CA-10.1, RF-10): o envio do andamento pelo
// /construir ponta a ponta no build de produção (e2e/servidor.ts: `next build` e `next start`, com o proxy.ts e a CSP de
// verdade). O token `construir` manda `POST /api/pedidos-construcao/<DEC>/andamento` com Bearer e sem `Origin`, e a
// "cto" vê o resultado na fila (selo de fase) e no detalhe (seção "Andamento da construção").
//
// G3.11 do plano: nenhuma demanda nem versão é criada. A única demanda que este arquivo muda é a `andamentoParaEnviar`
// do seed (T10): pedido gerado por pessoa, entregue e recebido, demanda em `aprovada` e sem andamento. Os outros e2e não
// a olham (andamento-fila.spec.ts e andamento-detalhe.spec.ts). Os testes não supõem o estado de antes: o corpo enviado
// é sempre o mesmo (`entendendo_o_pedido 0/0 em_construcao`), e repetir o mesmo estado responde 204 sem gravar (CA-04.2).
// Assim, cada teste roda sozinho e a ordem entre eles não importa.
//
// Tokens só os do e2e local (D-10, e2e/integracoes.ts), num banco descartável; contra a homologação os testes pulam com o
// motivo escrito, e a V-02 da 09 cobre. No e2e local, sem os tokens, o teste falha: um pulo ali esconderia a falta do
// arquivo. Nenhum token vai a rótulo de `expect` (G3.3). O trace fica desligado neste arquivo: o `retain-on-failure` do
// playwright.config.ts gravaria o cabeçalho `authorization` dos contextos de API num teste que falha
// (test/estatico/trace-e2e.test.ts).
import { request as novoContexto, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { MENSAGEM_NAO_ENCONTRADO } from '../src/lib/erros';
import { MENSAGENS_ANDAMENTO } from '../src/modules/andamento/schemas';
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

// O corpo do CP-1: o primeiro andamento que o /construir manda, antes do plano de tarefas.
const ENTENDENDO = { fase: 'entendendo_o_pedido', tarefasProntas: 0, tarefasTotal: 0, status: 'em_construcao' } as const;
const DEC_INEXISTENTE = 'DEC-DEM-20991231-9999-v1';
const SEM_PLANO = 'Nenhuma tarefa contada. O plano de tarefas ainda não foi feito, ou este pedido não tem plano.';

const enviar = (ctx: APIRequestContext, decId: string, corpo: unknown) =>
  ctx.post(`/api/pedidos-construcao/${decId}/andamento`, { headers: { 'content-type': 'application/json' }, data: JSON.stringify(corpo), maxRedirects: 0 });

type Evento = {
  acao: string;
  entidade: string;
  entidadeId: string;
  ator: Record<string, unknown>;
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
};

// 06-T14-testes (Minor 1 da 06-T14-tech-lead): o ator do /construir como o histórico o mostra (historico/consultas.ts):
// a integração e só o prefixo do token, os 8 caracteres depois do prefixo fixo de 5 (tokens-servico.ts). O prefixo não é
// segredo (aparece no painel); o token inteiro nunca entra em valor esperado nem em rótulo.
const atorDoConstruir = (token: string) => ({ tipo: 'integracao', integracao: 'construir', prefixo: token.slice(5, 13) });
const semId = ({ acao, entidade, entidadeId, ator, antes, depois }: Evento) => ({ acao, entidade, entidadeId, ator, antes, depois });
type AndamentoDaPessoa = { decId: string; fase: string; tarefasProntas: number; tarefasTotal: number; statusConstrucao: string; atualizadoEm: string };
type DemandaDaPessoa = { status: string; andamento: AndamentoDaPessoa | null; pacotesDecisao: { id: string }[] };

const demandaDaPessoa = (page: Page, id: string) => api<DemandaDaPessoa>(page, 'GET', `/api/demandas/${id}`);
const historico = async (page: Page, id: string) => (await api<{ itens: Evento[] }>(page, 'GET', `/api/demandas/${id}/historico`)).itens;

// A "cto" acha a `andamentoParaEnviar` e o DEC dela (o único pacote da demanda no seed).
async function demandaParaEnviar(page: Page): Promise<{ id: string; decId: string }> {
  await entrarComo(page, 'cto');
  const id = await demandaDoSeed(page, TITULOS_DO_E2E.andamentoParaEnviar);
  const decId = (await demandaDaPessoa(page, id)).pacotesDecisao[0]!.id;
  return { id, decId };
}

// A seção do detalhe e o valor (dd) de um termo (dt) dela, como em andamento-detalhe.spec.ts.
const secao = (page: Page): Locator => page.getByRole('region', { name: 'Andamento da construção' });
const valor = (s: Locator, termo: string): Locator => s.locator(`dt:text-is("${termo}") + dd`);
const linhaDaData = (s: Locator): Locator => s.getByText(/^Última mudança informada pelo \/construir em .+\.$/);

async function abrirDetalhe(page: Page, id: string): Promise<Locator> {
  await page.goto(`/demandas/${id}`);
  await expect(page.locator('main h1')).toBeVisible();
  const s = secao(page);
  await expect(s).toBeVisible();
  return s;
}

test('CP-1 e CA-05.1: o /construir manda "Entendendo o pedido", a demanda vai a Em construção e a fila e o detalhe mostram o andamento', async ({ page, baseURL }) => {
  const { construir } = exigirTokens();
  const { id, decId } = await demandaParaEnviar(page);

  const ctx = await contextoDe(baseURL, construir);
  try {
    const r = await enviar(ctx, decId, ENTENDENDO);
    expect(r.status(), 'POST do andamento').toBe(204);
    expect(await r.text()).toBe('');
  } finally {
    await ctx.dispose();
  }

  // CA-05.1: a demanda em `em_construcao`, com o andamento do DEC na vista da pessoa e o evento do /construir.
  const d = await demandaDaPessoa(page, id);
  expect(d.status).toBe('em_construcao');
  expect(d.andamento).toMatchObject({ decId, fase: 'entendendo_o_pedido', tarefasProntas: 0, tarefasTotal: 0, statusConstrucao: 'em_construcao' });
  expect(d.andamento!.atualizadoEm).toMatch(/Z$/);
  // O corpo é sempre o mesmo e a demanda nunca volta a `aprovada`: em qualquer banco, mesmo já usado, há um só evento de
  // cada, o do primeiro envio. O `status_alterado` é preso à transição do /construir (entidade, antes, depois e ator), e
  // não a um `status_alterado` que o seed tenha gravado antes de `aprovada` (Minor 1 da 06-T14-tech-lead).
  const eventos = await historico(page, id);
  const ator = atorDoConstruir(construir);
  expect(eventos.filter((e) => e.acao === 'andamento_registrado' && e.entidadeId === decId).map(semId), 'andamento_registrado do DEC').toEqual([
    {
      acao: 'andamento_registrado',
      entidade: 'pacote_decisao',
      entidadeId: decId,
      ator,
      antes: null,
      depois: { fase: 'entendendo_o_pedido', tarefasProntas: 0, tarefasTotal: 0, statusConstrucao: 'em_construcao' },
    },
  ]);
  expect(eventos.filter((e) => e.acao === 'status_alterado' && e.ator.tipo === 'integracao').map(semId), 'status_alterado do /construir').toEqual([
    { acao: 'status_alterado', entidade: 'demanda', entidadeId: id, ator, antes: { status: 'aprovada' }, depois: { status: 'em_construcao' } },
  ]);

  // A fila de Em construção: o selo "Entendendo o pedido" na célula Status da linha da demanda (CA-08.3).
  await page.goto('/demandas?status=em_construcao&limit=100');
  await expect(page.locator('main').getByRole('status')).toHaveText(/^[\d.]+ demandas? encontradas?\.$/);
  const celula = page.getByRole('row').filter({ has: page.getByRole('link', { name: id, exact: true }) }).getByRole('cell').nth(3);
  await expect(celula).toContainText('Em construção');
  await expect(celula.locator('span[aria-hidden="true"]')).toHaveText('Entendendo o pedido');
  await expect(celula.locator('.sr-only')).toHaveText('Andamento: Entendendo o pedido.');

  // O detalhe: a seção com o DEC, a fase, a situação, o texto de total 0 e a data em <time> (CA-09.2).
  const s = await abrirDetalhe(page, id);
  const dec = valor(s, 'Pedido de Construção').getByRole('link');
  await expect(dec).toHaveText(decId);
  await expect(dec).toHaveAttribute('href', `/pacotes-decisao/${decId}`);
  await expect(valor(s, 'Fase')).toHaveText('Entendendo o pedido');
  await expect(valor(s, 'Situação')).toHaveText('Em andamento');
  await expect(valor(s, 'Tarefas prontas')).toHaveText(SEM_PLANO);
  await expect(linhaDaData(s).locator('time')).toHaveAttribute('datetime', /Z$/);
  await expect(page.locator('main [data-cor]').first()).toHaveText('Em construção');
});

test('CP-5: o mesmo corpo de novo responde 204 e não grava nada: nem evento, nem nova data na seção', async ({ page, baseURL }) => {
  const { construir } = exigirTokens();
  const { id, decId } = await demandaParaEnviar(page);

  const ctx = await contextoDe(baseURL, construir);
  try {
    // Garante o estado sem supor o de antes: na primeira vez grava, nas outras já é o mesmo estado.
    expect((await enviar(ctx, decId, ENTENDENDO)).status(), 'POST do andamento (estado de partida)').toBe(204);
    const eventosAntes = (await historico(page, id)).length;
    const vistaAntes = await demandaDaPessoa(page, id);
    const dataAntes = await linhaDaData(await abrirDetalhe(page, id)).locator('time').getAttribute('datetime');
    expect(dataAntes).toMatch(/Z$/);

    const repetido = await enviar(ctx, decId, ENTENDENDO);
    expect(repetido.status(), 'POST do mesmo andamento').toBe(204);
    expect(await repetido.text()).toBe('');

    expect((await historico(page, id)).length, 'eventos da demanda depois de repetir').toBe(eventosAntes);
    expect(await demandaDaPessoa(page, id)).toEqual(vistaAntes);
    const s = await abrirDetalhe(page, id);
    await expect(linhaDaData(s).locator('time')).toHaveAttribute('datetime', dataAntes!);
  } finally {
    await ctx.dispose();
  }
});

test('CA-02.2 e CA-03.1 pelo build: chave a mais é 422 com a mensagem da 03, DEC inexistente é 404, sem eco e sem gravar', async ({ page, baseURL }) => {
  const { construir } = exigirTokens();
  const { id, decId } = await demandaParaEnviar(page);
  const eventosAntes = (await historico(page, id)).length;
  const vistaAntes = await demandaDaPessoa(page, id);

  const CHAVE = 'chaveDoE2eFicticia';
  const VALOR = 'valorDoE2eFicticio';
  const NAO_PROCESSAVEL = { erro: 'nao_processavel', mensagem: MENSAGENS_ANDAMENTO.corpoInvalido };
  const NAO_ENCONTRADO = { erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO };

  const ctx = await contextoDe(baseURL, construir);
  try {
    // CA-02.2: a chave a mais, no DEC real e num DEC que não existe (o corpo é conferido antes de qualquer consulta).
    for (const [rotulo, alvo] of [
      ['DEC da demanda', decId],
      ['DEC inexistente', DEC_INEXISTENTE],
    ] as const) {
      const r = await enviar(ctx, alvo, { ...ENTENDENDO, [CHAVE]: VALOR });
      expect(r.status(), `chave a mais no ${rotulo}`).toBe(422);
      const texto = await r.text();
      expect(JSON.parse(texto), `corpo do 422 no ${rotulo}`).toEqual(NAO_PROCESSAVEL);
      expect(texto).not.toContain(CHAVE);
      expect(texto).not.toContain(VALOR);
    }

    // CA-03.1: DEC no formato que não existe, corpo válido.
    const r = await enviar(ctx, DEC_INEXISTENTE, ENTENDENDO);
    expect(r.status(), 'DEC inexistente').toBe(404);
    const texto = await r.text();
    expect(JSON.parse(texto)).toEqual(NAO_ENCONTRADO);
    expect(texto).not.toContain(DEC_INEXISTENTE);
    expect(texto).not.toContain('entendendo_o_pedido');
  } finally {
    await ctx.dispose();
  }

  // Nenhuma recusa gravou na demanda do pedido.
  expect((await historico(page, id)).length, 'eventos da demanda depois das recusas').toBe(eventosAntes);
  expect(await demandaDaPessoa(page, id)).toEqual(vistaAntes);
});

test('CA-10.1 pelo build: o Awave lê a própria demanda com as sete chaves e andamento null', async ({ page, baseURL }) => {
  const { awave } = exigirTokens();
  await entrarComo(page, 'cto');
  const id = await demandaDoSeed(page, TITULOS_DO_E2E.awaveAguardando);
  const ctx = await contextoDe(baseURL, awave);
  try {
    const r = await ctx.get(`/api/demandas/${id}`, { maxRedirects: 0 });
    expect(r.status(), 'GET da própria demanda pelo Awave').toBe(200);
    const vista = (await r.json()) as Record<string, unknown>;
    expect(Object.keys(vista).sort()).toEqual(['andamento', 'atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo']);
    expect(vista).toMatchObject({ id, andamento: null });
  } finally {
    await ctx.dispose();
  }
});
