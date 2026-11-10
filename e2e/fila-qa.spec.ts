// T38 (06-T38-testes, qa-automacao): a fila no navegador, além do e2e/fila.spec.ts do engenheiro.
//   - tipo e linha de serviço juntos, aplicados pelo botão, com as linhas conferidas coluna a coluna;
//   - "Voltar" e "Avançar" do navegador: a tabela e as seleções acompanham o endereço;
//   - "Filtrar" sem mudar nada e "Limpar filtros" do formulário, com o foco no resultado;
//   - o formulário sem script: GET comum, e as opções "Todos" (valor vazio) não viram filtro inválido.
// Os dados são criados pela API, e as contagens vêm da própria API, como no fila.spec.ts.
import { type Page } from '@playwright/test';
import { api, entrarComo, expect, semViolacoes, test } from './apoio';

type Demanda = { id: string };
type Lista = { total: number };

const LEGENDA_TODAS = 'Demandas, da mais nova para a mais antiga';
const LEGENDA_BUG = 'Demandas com tipo Bug, da mais nova para a mais antiga';
const FILTRO_INVALIDO = 'Algum filtro do endereço não é válido. Mostrando todas as demandas.';

const criar = (page: Page, corpo: Record<string, string>) =>
  api<Demanda>(page, 'POST', '/api/demandas', { solicitanteNome: 'Pessoa Ficticia', ...corpo });

const total = async (page: Page, consulta: string): Promise<number> => (await api<Lista>(page, 'GET', `/api/demandas?limit=1&${consulta}`)).total;

const coluna = (page: Page, n: number) => page.locator(`main tbody tr td:nth-child(${n})`).allInnerTexts();

// A Região de aviso só ganha "N demandas encontradas." depois que o React assume a lista da carga inicial (o efeito de
// ResultadoAnunciado). Antes disso, um clique que pede o foco no resultado pode ter o pedido consumido pelo efeito
// atrasado da lista inicial, e o resultado novo chega sem o foco (04-regressao do DEC-DEM-20261103-0006-v1: falhou 1 vez
// em 3 no "tipo e linha de serviço juntos", com a URL do caminho com script). Esperar o texto fecha essa janela.
const esperarFilaPronta = (page: Page) => expect(page.locator('main').getByRole('status')).toHaveText(/^[\d.]+ demandas? encontradas?\.$/);

test('tipo e linha de serviço juntos: só as linhas com os dois valores, legenda com os dois e contagem da API', async ({ page }) => {
  await entrarComo(page, 'cto');
  const alvo = await criar(page, { titulo: 'Fila QA tipo e linha (fictício)', tipo: 'novo_projeto', linhaServicoProvavel: 'ia_controle_humano' });
  await criar(page, { titulo: 'Fila QA só o tipo (fictício)', tipo: 'novo_projeto', linhaServicoProvavel: 'sob_medida' });
  await criar(page, { titulo: 'Fila QA só a linha (fictício)', tipo: 'melhoria', linhaServicoProvavel: 'ia_controle_humano' });
  const esperadas = await total(page, 'tipo=novo_projeto&linhaServicoProvavel=ia_controle_humano');
  expect(esperadas).toBeGreaterThanOrEqual(1);
  expect(esperadas).toBeLessThanOrEqual(20);

  await page.goto('/demandas');
  await esperarFilaPronta(page);
  await page.getByLabel('Tipo').selectOption({ label: 'Novo projeto' });
  await page.getByLabel('Linha de serviço').selectOption({ label: 'IA com controle humano' });
  await expect(page).toHaveURL(/\/demandas$/);
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page).toHaveURL(/\/demandas\?tipo=novo_projeto&linhaServicoProvavel=ia_controle_humano$/);
  const legenda = 'Demandas com tipo Novo projeto e linha de serviço IA com controle humano, da mais nova para a mais antiga';
  await expect(page.getByText(legenda)).toBeFocused();
  await expect(page.locator('main tbody tr')).toHaveCount(esperadas);
  expect(new Set((await coluna(page, 3)).map((s) => s.trim()))).toEqual(new Set(['Novo projeto']));
  expect(new Set((await coluna(page, 6)).map((s) => s.trim()))).toEqual(new Set(['IA com controle humano']));
  await expect(page.getByRole('link', { name: alvo.id, exact: true })).toBeVisible();
  await expect(page.locator('main').getByRole('status')).toHaveText(esperadas === 1 ? '1 demanda encontrada.' : `${esperadas} demandas encontradas.`);
  await semViolacoes(page, 'fila com tipo e linha');
});

test('"Voltar" e "Avançar" do navegador: a tabela e as seleções acompanham o endereço', async ({ page }) => {
  await entrarComo(page, 'cto');
  await criar(page, { titulo: 'Fila QA voltar (fictício)', tipo: 'bug' });
  await page.goto('/demandas');
  await page.getByLabel('Tipo').selectOption({ label: 'Bug' });
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page).toHaveURL(/\/demandas\?tipo=bug$/);
  await expect(page.locator('main caption')).toHaveText(LEGENDA_BUG);

  await page.goBack();
  await expect(page).toHaveURL(/\/demandas$/);
  await expect(page.locator('main caption')).toHaveText(LEGENDA_TODAS);
  await expect(page.getByLabel('Tipo')).toHaveValue('');

  await page.goForward();
  await expect(page).toHaveURL(/\/demandas\?tipo=bug$/);
  await expect(page.locator('main caption')).toHaveText(LEGENDA_BUG);
  await expect(page.getByLabel('Tipo')).toHaveValue('bug');
  expect(new Set((await coluna(page, 3)).map((s) => s.trim()))).toEqual(new Set(['Bug']));
});

test('"Filtrar" sem mudar nada fica no mesmo endereço e leva o foco ao resultado', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/demandas');
  await expect(page.locator('main caption')).toHaveText(LEGENDA_TODAS);
  // A Região de aviso só ganha "N demandas encontradas." no navegador, depois que o React assume a página. No build de
  // produção (`next start`, 08-correcao), o HTML chega antes disso, e um clique cedo vira o GET comum do formulário
  // (`?status=&tipo=&linhaServicoProvavel=`), que é o caminho sem script, conferido no fim deste arquivo.
  await expect(page.locator('main').getByRole('status')).toHaveText(/^[\d.]+ demandas? encontradas?\.$/);
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page).toHaveURL(/\/demandas$/);
  await expect(page.getByText(LEGENDA_TODAS)).toBeFocused();
});

test('"Limpar filtros" do formulário, com resultado na tela: volta a /demandas, com o foco no caption e as seleções em "Todos"', async ({ page }) => {
  await entrarComo(page, 'cto');
  await criar(page, { titulo: 'Fila QA limpar (fictício)', tipo: 'bug' });
  await page.goto('/demandas?tipo=bug');
  await expect(page.locator('main caption')).toHaveText(LEGENDA_BUG);
  await expect(page.getByLabel('Tipo')).toHaveValue('bug');
  await esperarFilaPronta(page);
  await page.locator('main fieldset').getByRole('link', { name: 'Limpar filtros' }).click();
  await expect(page).toHaveURL(/\/demandas$/);
  await expect(page.getByText(LEGENDA_TODAS)).toBeFocused();
  await expect(page.getByLabel('Tipo')).toHaveValue('');
});

test.describe('sem script', () => {
  test.use({ javaScriptEnabled: false });

  test('o formulário faz um GET comum; "Todos" vai vazio e não vira filtro inválido', async ({ page }) => {
    await entrarComo(page, 'cto');
    await page.goto('/demandas');
    await page.getByLabel('Tipo').selectOption('bug');
    await page.getByRole('button', { name: 'Filtrar' }).click();
    await expect(page).toHaveURL(/\/demandas\?status=&tipo=bug&linhaServicoProvavel=$/);
    await expect(page.getByLabel('Tipo')).toHaveValue('bug');
    await expect(page.getByLabel('Status')).toHaveValue('');
    await expect(page.getByText(FILTRO_INVALIDO)).toHaveCount(0);
    // Sem script, a lista dentro do Suspense não troca o esqueleto pelo resultado (achado Minor 1 da 06-T38-testes):
    // por isso este teste confere só o formulário e o filtro lido pelo servidor, e não a tabela.
  });
});
