// T38: T03 Fila de demandas (03, T03; RF-06, CA-26.1, T-03). Os dados são criados pela API com a sessão da conta
// fictícia, e as contagens vêm da própria API: o mesmo teste roda no banco novo do e2e e na homologação (BASE_URL), que
// já pode ter outras demandas. O estado "Nenhuma demanda ainda" (banco sem nenhuma demanda) não existe no e2e, porque o
// seed cria cinco; ele é conferido no HTML do servidor (src/app/(painel)/demandas/fila.test.ts).
import { expect, test, type Page } from '@playwright/test';
import { api, entrarComo, semViolacoes } from './apoio';

type Demanda = { id: string; status: string };
type Lista = { itens: Demanda[]; total: number };

const LEGENDA_TODAS = 'Demandas, da mais nova para a mais antiga';
const LEGENDA_AGUARDANDO = 'Demandas com status Aguardando informação, da mais nova para a mais antiga';

async function criarDemanda(page: Page, titulo: string, tipo = 'melhoria'): Promise<Demanda> {
  return api<Demanda>(page, 'POST', '/api/demandas', { titulo, tipo, solicitanteNome: 'Pessoa Ficticia', urgencia: 'media' });
}

// Nova → Em análise → Aguardando informação, pelas transições manuais (RF-07).
async function levarAAguardandoInformacao(page: Page, id: string): Promise<void> {
  await api(page, 'PATCH', `/api/demandas/${id}`, { status: 'em_analise' });
  await api(page, 'PATCH', `/api/demandas/${id}`, { status: 'aguardando_informacao' });
}

const total = async (page: Page, consulta = ''): Promise<number> => (await api<Lista>(page, 'GET', `/api/demandas?limit=1${consulta}`)).total;

const regiaoDeAviso = (page: Page) => page.locator('main').getByRole('status');

test('vazio com filtro: "Nenhuma demanda com esses filtros.", e "Limpar filtros" volta à lista com o foco no caption', async ({ page }) => {
  await entrarComo(page, 'cto');
  // Nenhum teste cria demanda entregue de produto próprio com linha indefinida.
  const consulta = 'status=entregue&tipo=produto_proprio&linhaServicoProvavel=indefinida';
  expect(await total(page, `&${consulta}`)).toBe(0);
  await page.goto(`/demandas?${consulta}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Demandas' })).toBeVisible();
  await expect(page.getByText('Nenhuma demanda com esses filtros.')).toBeVisible();
  await expect(page.locator('main table')).toHaveCount(0);
  await expect(page.getByLabel('Status')).toHaveValue('entregue');
  await semViolacoes(page, 'fila vazia com filtro');
  await page.locator('main').getByRole('link', { name: 'Limpar filtros' }).last().click();
  await expect(page).toHaveURL(/\/demandas$/);
  await expect(page.getByText(LEGENDA_TODAS)).toBeFocused();
  await expect(page.getByLabel('Status')).toHaveValue('');
});

test('CA-26.1: 5 demandas com status diferentes, filtro aguardando_informacao mostra só as desse status', async ({ page }) => {
  await entrarComo(page, 'cto');
  const criadas: Demanda[] = [];
  for (let i = 1; i <= 5; i++) criadas.push(await criarDemanda(page, `Fila CA-26.1 demanda ${i} (fictício)`));
  const [a, b, c, d] = criadas as [Demanda, Demanda, Demanda, Demanda, Demanda];
  await levarAAguardandoInformacao(page, a.id);
  await levarAAguardandoInformacao(page, b.id);
  await api(page, 'PATCH', `/api/demandas/${c.id}`, { status: 'em_analise' });
  await api(page, 'PATCH', `/api/demandas/${d.id}`, { status: 'encerrada' });
  const esperadas = await total(page, '&status=aguardando_informacao');
  expect(esperadas).toBeGreaterThanOrEqual(2);
  expect(esperadas).toBeLessThanOrEqual(20);

  await page.goto('/demandas');
  // O texto da Região de aviso só chega depois que o React assume a lista inicial: antes disso, o pedido de foco do
  // "Filtrar" pode ser consumido pelo efeito atrasado dela (04-regressao do DEC-DEM-20261103-0006-v1, fila-qa.spec.ts).
  await expect(regiaoDeAviso(page)).toHaveText(/^[\d.]+ demandas? encontradas?\.$/);
  await page.getByLabel('Status').selectOption({ label: 'Aguardando informação' });
  await expect(page).not.toHaveURL(/status=/); // não aplica ao mudar a seleção (WCAG 3.2.2)
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page).toHaveURL(/status=aguardando_informacao/);
  await expect(page.getByText(LEGENDA_AGUARDANDO)).toBeFocused();
  await expect(page.getByRole('table')).toContainText('Aguardando informação');
  await expect(page.locator('main tbody tr')).toHaveCount(esperadas);
  const status = await page.locator('main tbody tr td:nth-child(4)').allInnerTexts();
  expect(new Set(status.map((s) => s.trim()))).toEqual(new Set(['Aguardando informação']));
  for (const x of [a, b]) await expect(page.getByRole('link', { name: x.id, exact: true })).toBeVisible();
  for (const x of criadas.slice(2)) await expect(page.getByRole('link', { name: x.id, exact: true })).toHaveCount(0);
  await expect(regiaoDeAviso(page)).toHaveText(`${esperadas} demandas encontradas.`);
  await expect(page.getByLabel('Status')).toHaveValue('aguardando_informacao');
  await semViolacoes(page, 'fila filtrada');

  // O id leva ao detalhe da demanda (T05).
  await expect(page.getByRole('link', { name: a.id, exact: true })).toHaveAttribute('href', `/demandas/${a.id}`);
});

test('filtro inválido na URL mostra o alerta e a lista sem filtro', async ({ page }) => {
  await entrarComo(page, 'cto');
  const todas = await total(page);
  await page.goto('/demandas?status=qualquer-coisa&tipo=bug');
  await expect(page.locator('main').getByText('Algum filtro do endereço não é válido. Mostrando todas as demandas.')).toBeVisible();
  await expect(page.locator('main caption')).toHaveText(LEGENDA_TODAS);
  await expect(page.getByLabel('Status')).toHaveValue('');
  await expect(page.getByLabel('Tipo')).toHaveValue('');
  await expect(regiaoDeAviso(page)).toHaveText(`${todas.toLocaleString('pt-BR')} ${todas === 1 ? 'demanda encontrada' : 'demandas encontradas'}.`);
  await semViolacoes(page, 'fila com filtro inválido');
});

test('paginação: Anterior desabilitado na página 1; Próxima leva à página 2', async ({ page }) => {
  await entrarComo(page, 'cto');
  for (let n = await total(page); n <= 20; n++) await criarDemanda(page, `Fila paginação ${n + 1} (fictício)`, 'estudo');
  await page.goto('/demandas');
  const paginacao = page.getByRole('navigation', { name: 'Paginação' });
  await expect(paginacao.getByRole('link', { name: 'Anterior' })).toHaveAttribute('aria-disabled', 'true');
  await expect(paginacao.getByText('Página 1')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('main tbody tr')).toHaveCount(20);
  const primeiraDaPagina1 = await page.locator('main tbody tr td:first-child').first().innerText();
  // Lista inicial já assumida pelo React antes do clique que pede o foco (ver o teste CA-26.1).
  await expect(regiaoDeAviso(page)).toHaveText(/^[\d.]+ demandas? encontradas?\.$/);

  await paginacao.getByRole('link', { name: 'Próxima' }).click();
  await expect(page).toHaveURL(/offset=20/);
  await expect(page.getByText(LEGENDA_TODAS)).toBeFocused();
  await expect(paginacao.getByText('Página 2')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('main tbody tr td:first-child').first()).not.toHaveText(primeiraDaPagina1);
  await expect(paginacao.getByRole('link', { name: 'Anterior' })).not.toHaveAttribute('aria-disabled', 'true');
  await semViolacoes(page, 'fila na página 2');

  await paginacao.getByRole('link', { name: 'Anterior' }).click();
  await expect(page).toHaveURL(/\/demandas$/);
  await expect(page.getByText(LEGENDA_TODAS)).toBeFocused();
  await expect(paginacao.getByText('Página 1')).toHaveAttribute('aria-current', 'page');
});

test('axe: vazio, filtrado e com dados; botão "Nova demanda" e tabela rolável em 320 px', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/demandas?status=entregue&tipo=produto_proprio&linhaServicoProvavel=indefinida');
  await expect(page.getByText('Nenhuma demanda com esses filtros.')).toBeVisible();
  await semViolacoes(page, 'fila vazia');

  await page.goto('/demandas?tipo=bug');
  await expect(page.locator('main caption')).toHaveText('Demandas com tipo Bug, da mais nova para a mais antiga');
  await semViolacoes(page, 'fila filtrada por tipo');

  await page.goto('/demandas');
  await expect(page.locator('main tbody tr').first()).toBeVisible();
  await expect(page.locator('main').getByRole('link', { name: 'Nova demanda' })).toHaveAttribute('href', '/demandas/nova');
  await semViolacoes(page, 'fila com dados');

  await page.setViewportSize({ width: 320, height: 640 });
  const regiao = page.getByRole('region', { name: 'Tabela de demandas' });
  await expect(regiao).toHaveAttribute('tabindex', '0');
  // Sem rolagem horizontal da página inteira: só a região da tabela rola (03, T03).
  const larguraDaPagina = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(larguraDaPagina).toBeLessThanOrEqual(320);
  await semViolacoes(page, 'fila com dados em 320 px');
});
