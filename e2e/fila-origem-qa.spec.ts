// 06-T16-testes (qa-automacao) do DEC-DEM-20261111-0016-v1: a origem na T03, no navegador, além do
// e2e/fila-origem.spec.ts do engenheiro.
//   - CA-10.1 sem filtro: cada linha da primeira página diz a origem que a API dá para aquele id;
//   - CA-04.7: a demanda do Awave do seed aparece na fila com o selo de rascunho e "Origem: Awave";
//   - Tipo e Origem juntos, aplicados por "Filtrar" (com script);
//   - o formulário sem script com só a Origem escolhida: GET comum, origem lida pelo servidor e levada oculta aos contadores;
//   - "Próxima" mantém a origem.
//
// C-36 (G3.9 do plano): esta spec não cria demanda nem versão. Ela lê as demandas do seed fictício e as contagens da
// própria API, para rodar também na homologação, que já pode ter outras demandas.
//   - conta "cto": 0 demandas e 0 versões.
import { type Page } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { ROTULO_ORIGEM } from '../src/components/rotulos';
import { api, demandaDoSeed, entrarComo, expect, test } from './apoio';

type Origem = keyof typeof ROTULO_ORIGEM;
type Lista = { itens: { id: string; origem: Origem }[]; total: number };

const FILTRO_INVALIDO = 'Algum filtro do endereço não é válido. Mostrando todas as demandas.';
const ORIGENS: readonly Origem[] = ['pessoa', 'agente', 'awave'];

const regiaoDeAviso = (page: Page) => page.locator('main').getByRole('status');
const campo = (page: Page, rotulo: string) => page.getByLabel(rotulo, { exact: true });
const encontradas = (total: number) => (total === 1 ? '1 demanda encontrada.' : `${total.toLocaleString('pt-BR')} demandas encontradas.`);
const totalDaApi = async (page: Page, consulta: string): Promise<number> => (await api<Lista>(page, 'GET', `/api/demandas?limit=1&${consulta}`)).total;
// O React assumiu a lista: a Região de aviso só ganha "N demandas encontradas." no navegador.
const esperarFilaPronta = (page: Page) => expect(regiaoDeAviso(page)).toHaveText(/^[\d.]+ demandas? encontradas?\.$/);
const linhas = (page: Page) => page.locator('main tbody tr');
const textosDaColuna = async (page: Page, n: number) => (await page.locator(`main tbody tr td:nth-child(${n})`).allInnerTexts()).map((s) => s.trim());

test('CA-10.1 sem filtro: cada linha da primeira página diz a origem que a API dá para o id dela', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/demandas');
  await esperarFilaPronta(page);
  const ids = await textosDaColuna(page, 1);
  const titulos = await textosDaColuna(page, 2);
  expect(ids.length).toBeGreaterThanOrEqual(1);
  // A spec roda em série (workers: 1) e não cria demanda: as 100 mais novas de cada origem contêm as 20 da página 1.
  const origemDe = new Map<string, Origem>();
  for (const o of ORIGENS) for (const d of (await api<Lista>(page, 'GET', `/api/demandas?origem=${o}&limit=100`)).itens) origemDe.set(d.id, d.origem);
  for (const [i, id] of ids.entries()) {
    const o = origemDe.get(id);
    expect(o, `origem da API para ${id}`).toBeDefined();
    expect(titulos[i]!.endsWith(`Origem: ${ROTULO_ORIGEM[o!]}`), `${id}: ${titulos[i]}`).toBe(true);
    expect(titulos[i]!.match(/Origem: /g), id).toHaveLength(1);
  }
});

test('CA-04.7: a demanda do Awave do seed aparece na fila com o selo de rascunho e "Origem: Awave"', async ({ page }) => {
  await entrarComo(page, 'cto');
  const id = await demandaDoSeed(page, TITULOS_DO_E2E.awaveAguardando);
  await page.goto('/demandas?origem=awave&limit=100');
  await esperarFilaPronta(page);
  const linha = linhas(page).filter({ has: page.getByRole('link', { name: id, exact: true }) });
  await expect(linha).toHaveCount(1);
  await expect(linha.locator('td').nth(1)).toContainText(TITULOS_DO_E2E.awaveAguardando);
  await expect(linha.locator('td').nth(1)).toContainText('Rascunho de agente');
  await expect(linha.locator('td').nth(1)).toContainText('Origem: Awave');
});

test('Tipo e Origem juntos por "Filtrar": endereço, foco na legenda, total da API e só linhas com os dois valores', async ({ page }) => {
  await entrarComo(page, 'cto');
  // As três do Awave do seed são de tipo melhoria (T15).
  const total = await totalDaApi(page, 'tipo=melhoria&origem=awave');
  expect(total).toBeGreaterThanOrEqual(1);
  await page.goto('/demandas');
  await esperarFilaPronta(page);
  await campo(page, 'Tipo').selectOption({ label: 'Melhoria' });
  await campo(page, 'Origem').selectOption({ label: 'Awave' });
  await expect(page).toHaveURL(/\/demandas$/);
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page).toHaveURL(/\/demandas\?tipo=melhoria&origem=awave$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Demandas com tipo Melhoria e origem Awave, da mais nova para a mais antiga' })).toBeFocused();
  await expect(regiaoDeAviso(page)).toHaveText(encontradas(total));
  await expect(linhas(page)).toHaveCount(Math.min(total, 20));
  expect(new Set(await textosDaColuna(page, 3))).toEqual(new Set(['Melhoria']));
  for (const t of await textosDaColuna(page, 2)) expect(t.endsWith('Origem: Awave'), t).toBe(true);
  await expect(campo(page, 'Tipo')).toHaveValue('melhoria');
  await expect(campo(page, 'Origem')).toHaveValue('awave');
});

test('"Próxima" mantém a origem: página 2 com o mesmo filtro e só linhas da origem', async ({ page }) => {
  await entrarComo(page, 'cto');
  const total = await totalDaApi(page, 'origem=pessoa');
  // O seed tem mais de cinco demandas de pessoa (T15: 28 no banco novo, três do Awave).
  expect(total).toBeGreaterThan(5);
  await page.goto('/demandas?origem=pessoa&limit=5');
  await esperarFilaPronta(page);
  const paginacao = page.getByRole('navigation', { name: 'Paginação' });
  await paginacao.getByRole('link', { name: 'Próxima' }).click();
  await expect(page).toHaveURL(/\/demandas\?origem=pessoa&limit=5&offset=5$/);
  // A página 2 chegou (e não o esqueleto do Suspense, que tem as mesmas 5 linhas vazias): "Página 2" e o "Anterior" com
  // a origem.
  await expect(paginacao.locator('[aria-current="page"]')).toHaveText('Página 2');
  await expect(paginacao.getByRole('link', { name: 'Anterior' })).toHaveAttribute('href', '/demandas?origem=pessoa&limit=5');
  await expect(linhas(page).first().getByRole('link')).toBeVisible();
  await expect(campo(page, 'Origem')).toHaveValue('pessoa');
  await expect(page.locator('main caption')).toHaveText('Demandas com origem Pessoa, da mais nova para a mais antiga');
  await expect(linhas(page)).toHaveCount(Math.min(5, total - 5));
  for (const t of await textosDaColuna(page, 2)) expect(t.endsWith('Origem: Pessoa'), t).toBe(true);
  await expect(page.getByText(FILTRO_INVALIDO)).toHaveCount(0);
});

test.describe('sem script', () => {
  test.use({ javaScriptEnabled: false });

  test('só a Origem escolhida: GET comum, origem lida pelo servidor e levada oculta aos contadores', async ({ page }) => {
    await entrarComo(page, 'cto');
    await page.goto('/demandas');
    await campo(page, 'Origem').selectOption('awave');
    await page.getByRole('button', { name: 'Filtrar' }).click();
    await expect(page).toHaveURL(/\/demandas\?status=&tipo=&origem=awave&linhaServicoProvavel=$/);
    await expect(campo(page, 'Origem')).toHaveValue('awave');
    await expect(campo(page, 'Tipo')).toHaveValue('');
    await expect(page.getByText(FILTRO_INVALIDO)).toHaveCount(0);
    // Sem script, o Suspense não troca o esqueleto (Minor 1 da 06-T38-testes): os contadores podem estar no DOM duas vezes
    // (o esqueleto e o conteúdo escondido). Em todos, a origem vai oculta com o valor do enum.
    const ocultos = page.locator('main input[type="hidden"][name="origem"]');
    await expect(ocultos.first()).toBeAttached();
    const valores = await ocultos.evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
    expect(valores.length).toBeGreaterThanOrEqual(1);
    expect(new Set(valores)).toEqual(new Set(['awave']));
  });
});
