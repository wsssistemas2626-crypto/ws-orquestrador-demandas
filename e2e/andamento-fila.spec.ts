// T12 do DEC-DEM-20261111-0017-v1 (RF-08, CA-08.1 a CA-08.5; 03, seção 4): o selo de fase das demandas em construção na
// célula Status da tabela (1280 × 720) e no topo do cartão (390 × 844 e 320 px), e o axe com os selos nas duas larguras.
//
// G3.11 do plano: esta spec não cria demanda nem versão e não manda andamento. Ela lê as demandas do seed fictício da T10
// (scripts/seed-ficticio.ts, TITULOS_DO_E2E), cujo andamento é gravado na subida do banco e não muda depois (a única que
// muda é a andamentoParaEnviar, na T14, e esta spec não a olha). Conta "cto", só leitura.
import { type Locator, type Page } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { demandaDoSeed, entrarComo, expect, semViolacoesNasDuasLarguras, test } from './apoio';

const EM_CONSTRUCAO = '/demandas?status=em_construcao&limit=100';
const DEVOLVIDA = '/demandas?status=devolvida&limit=100';
const LISTA_EM_CONSTRUCAO = 'Demandas com status Em construção, da mais nova para a mais antiga';
const LISTA_DEVOLVIDA = 'Demandas com status Devolvida pela construção, da mais nova para a mais antiga';

const regiaoDeAviso = (page: Page) => page.locator('main').getByRole('status');
const esperarFilaPronta = (page: Page) => expect(regiaoDeAviso(page)).toHaveText(/^[\d.]+ demandas? encontradas?\.$/);

// A célula Status (4ª coluna) da linha da demanda, e o topo do cartão (id, selo de status e selo de fase).
const celulaStatus = (page: Page, id: string): Locator =>
  page.getByRole('row').filter({ has: page.getByRole('link', { name: id, exact: true }) }).getByRole('cell').nth(3);
const topoDoCartao = (page: Page, lista: string, id: string): Locator =>
  page.getByRole('list', { name: lista }).getByRole('listitem').filter({ has: page.getByRole('link', { name: id, exact: true }) }).locator('div').first();

// O texto visível do selo vai escondido do leitor; o do leitor, em sr-only, logo depois (03, 4.1 itens 2 e 3).
async function temSelo(lugar: Locator, visivel: string, leitor: string): Promise<void> {
  await expect(lugar.locator('span[aria-hidden="true"]')).toHaveText(visivel);
  await expect(lugar.locator('.sr-only')).toHaveText(leitor);
  await expect(lugar.locator('span[aria-hidden="true"]')).toBeVisible();
}
async function semSelo(lugar: Locator): Promise<void> {
  await expect(lugar).toBeVisible();
  await expect(lugar.locator('span[aria-hidden="true"]')).toHaveCount(0);
  await expect(lugar.locator('.sr-only')).toHaveCount(0);
  await expect(lugar).not.toContainText('Andamento:');
}

type Ids = Record<'construindo' | 'concluido' | 'semPlano' | 'semAndamento' | 'cancelado' | 'revisando', string>;
async function idsDoSeed(page: Page): Promise<Ids> {
  return {
    construindo: await demandaDoSeed(page, TITULOS_DO_E2E.andamentoConstruindo),
    concluido: await demandaDoSeed(page, TITULOS_DO_E2E.andamentoConcluido),
    semPlano: await demandaDoSeed(page, TITULOS_DO_E2E.andamentoSemPlano),
    semAndamento: await demandaDoSeed(page, TITULOS_DO_E2E.emConstrucaoSemAndamento),
    cancelado: await demandaDoSeed(page, TITULOS_DO_E2E.andamentoCancelado),
    revisando: await demandaDoSeed(page, TITULOS_DO_E2E.andamentoRevisando),
  };
}

test('CA-08.1 a CA-08.4: na tabela, o selo de fase na célula Status só das demandas em construção com andamento', async ({ page }) => {
  await entrarComo(page, 'cto');
  const ids = await idsDoSeed(page);
  await page.goto(EM_CONSTRUCAO);
  await esperarFilaPronta(page);
  await expect(page.getByRole('table', { name: LISTA_EM_CONSTRUCAO })).toBeVisible();
  await expect(celulaStatus(page, ids.construindo)).toContainText('Em construção');
  await temSelo(celulaStatus(page, ids.construindo), 'Construindo · 9/17', 'Andamento: Construindo, 9 de 17 tarefas prontas.');
  await temSelo(celulaStatus(page, ids.concluido), 'Construção concluída', 'Andamento: construção concluída.');
  await temSelo(celulaStatus(page, ids.semPlano), 'Entendendo o pedido', 'Andamento: Entendendo o pedido.');
  await semSelo(celulaStatus(page, ids.semAndamento));
  // O selo fica abaixo do selo de status, na mesma célula (03, 4.1 item 1).
  const status = await celulaStatus(page, ids.construindo).locator('[data-cor]').boundingBox();
  const fase = await celulaStatus(page, ids.construindo).locator('span[aria-hidden="true"]').boundingBox();
  expect(status).not.toBeNull();
  expect(fase).not.toBeNull();
  expect(fase!.y).toBeGreaterThanOrEqual(status!.y + status!.height);

  await page.goto(DEVOLVIDA);
  await esperarFilaPronta(page);
  await expect(celulaStatus(page, ids.cancelado)).toContainText('Devolvida pela construção');
  await semSelo(celulaStatus(page, ids.cancelado));
});

test.describe('celular', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('CA-08.1 a CA-08.4: no cartão, o mesmo selo, logo abaixo do selo de status', async ({ page }) => {
    await entrarComo(page, 'cto');
    const ids = await idsDoSeed(page);
    await page.goto(EM_CONSTRUCAO);
    await esperarFilaPronta(page);
    await expect(page.locator('main table')).toBeHidden();
    await temSelo(topoDoCartao(page, LISTA_EM_CONSTRUCAO, ids.construindo), 'Construindo · 9/17', 'Andamento: Construindo, 9 de 17 tarefas prontas.');
    await temSelo(topoDoCartao(page, LISTA_EM_CONSTRUCAO, ids.concluido), 'Construção concluída', 'Andamento: construção concluída.');
    await temSelo(topoDoCartao(page, LISTA_EM_CONSTRUCAO, ids.semPlano), 'Entendendo o pedido', 'Andamento: Entendendo o pedido.');
    await semSelo(topoDoCartao(page, LISTA_EM_CONSTRUCAO, ids.semAndamento));
    // Sem item novo na lista de dados do cartão (03, 4.1 item 5).
    const cartao = page.getByRole('list', { name: LISTA_EM_CONSTRUCAO }).getByRole('listitem').filter({ has: page.getByRole('link', { name: ids.construindo, exact: true }) });
    expect(await cartao.locator('dt').allTextContents()).toEqual(['Tipo', 'Urgência', 'Origem', 'Linha de serviço', 'Etapas', 'Idade']);

    await page.goto(DEVOLVIDA);
    await esperarFilaPronta(page);
    await semSelo(topoDoCartao(page, LISTA_DEVOLVIDA, ids.cancelado));
  });
});

test('320 px: "Revisando e entregando · 17/17" no cartão, sem rolagem lateral', async ({ page }) => {
  await entrarComo(page, 'cto');
  const id = await demandaDoSeed(page, TITULOS_DO_E2E.andamentoRevisando);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(EM_CONSTRUCAO);
  await esperarFilaPronta(page);
  await temSelo(topoDoCartao(page, LISTA_EM_CONSTRUCAO, id), 'Revisando e entregando · 17/17', 'Andamento: Revisando e entregando, 17 de 17 tarefas prontas.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('CA-08.5: axe sem violação com os selos de fase, em 1280 × 720 e 390 × 844', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto(EM_CONSTRUCAO);
  await esperarFilaPronta(page);
  await expect(page.locator('main').getByText('Construindo · 9/17').first()).toBeAttached();
  await semViolacoesNasDuasLarguras(page, 'fila com os selos de fase');
});
