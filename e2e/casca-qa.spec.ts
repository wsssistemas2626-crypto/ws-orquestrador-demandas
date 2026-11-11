// Escrito na 06-T05-testes (qa-automacao), pedido 0015. Fecha, no navegador, o que o casca.spec.ts deixa aberto:
//   - as fronteiras da casca: 767 px (barra e "Menu"), 768 px (menu lateral de 216 px), 1199 px (216 px) e 1200 px
//     (248 px), na altura da janela (G3.6 do plano e o `--breakpoint-xl` da construção);
//   - CA-04.2 com prova de volta, e não só de "continua dentro": Shift+Tab em "Fechar menu" vai a "Sair", e Tab em
//     "Sair" volta a "Fechar menu"; a gaveta é modal e o `main` atrás não recebe foco; Espaço no "Menu" abre;
//   - o item atual com outro endereço (desvio 3 da construção): "Demandas" na T05 vai à fila, fecha a gaveta e põe o
//     foco no h1; a gaveta reabre com o item novo;
//   - clique dentro da gaveta, fora de controle, depois da entrada de 200 ms: não fecha (o casca.spec clica por
//     coordenada durante a animação, quando o ponto ainda é véu);
//   - "Sair" com a gaveta aberta: em /entrar a página volta a rolar (a classe `gaveta-aberta` sai);
//   - 320 px: a barra fica em 56 px e cabe na largura, e a gaveta cabe na tela com "Sair" à vista;
//   - o 404 do painel (RF-03) com a casca nas duas larguras.
// Só leitura: entra pela API e abre telas; não cria demanda (C-36). O teste de "Sair" encerra só a própria sessão.
import type { Page } from '@playwright/test';
import { CONTAS_FICTICIAS } from '../scripts/seed-ficticio';
import { api, entrarComo, expect, test } from './apoio';

const CONTA = `${CONTAS_FICTICIAS.cto.nome} (CTO)`;
const TITULO_BUG_DO_SEED = 'Pedidos do marketplace duplicados no ERP (fictício)';
const CELULAR = { width: 390, height: 844 } as const;
const COMPUTADOR = { width: 1280, height: 720 } as const;
// Id no formato de hoje (^DEM-\d{8}-\d{4}$), de uma data em que o seed não cria demanda.
const DEMANDA_QUE_NAO_EXISTE = 'DEM-20000101-0001';

const botaoMenu = (page: Page) => page.getByRole('button', { name: 'Menu', exact: true });
const fecharMenu = (page: Page) => page.getByRole('button', { name: 'Fechar menu' });
const gaveta = (page: Page) => page.getByRole('dialog', { name: 'Menu' });
const navegacao = (page: Page) => page.getByRole('navigation', { name: 'Principal' });
const classeDoHtml = (page: Page) => page.evaluate(() => document.documentElement.className);
const largura = async (page: Page, seletor: string) => (await page.locator(seletor).boundingBox())?.width;

async function demandaBugDoSeed(page: Page): Promise<string> {
  const { itens } = await api<{ itens: { id: string; titulo: string }[] }>(page, 'GET', '/api/demandas?tipo=bug&limit=100');
  const bug = itens.find((x) => x.titulo === TITULO_BUG_DO_SEED);
  if (!bug) throw new Error('e2e: o seed não tem a demanda de tipo bug');
  return bug.id;
}

// Igual ao casca.spec: o clique antes da hidratação não abre; o botão só abre, então repetir é seguro.
async function abrirGaveta(page: Page): Promise<void> {
  await expect(async () => {
    await botaoMenu(page).click({ timeout: 1_000 });
    await expect(gaveta(page)).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
}

test.beforeEach(async ({ page }) => {
  await entrarComo(page, 'cto');
});

test('fronteiras: 767 px barra com "Menu"; 768 e 1199 px menu lateral de 216 px; 1200 px de 248 px', async ({ page }) => {
  await page.setViewportSize({ width: 767, height: 800 });
  await page.goto('/demandas');
  const banner = page.getByRole('banner');
  await expect(botaoMenu(page)).toBeVisible();
  await expect(navegacao(page)).toBeHidden();
  await expect.poll(async () => (await banner.boundingBox())?.height, '767 px').toBe(56);
  for (const [janela, menu] of [
    [768, 216],
    [1199, 216],
    [1200, 248],
  ] as const) {
    await page.setViewportSize({ width: janela, height: 800 });
    await expect(navegacao(page), `${janela} px`).toBeVisible();
    await expect(botaoMenu(page), `${janela} px`).toBeHidden();
    await expect.poll(async () => (await banner.boundingBox())?.width, `${janela} px: largura do menu`).toBe(menu);
    await expect.poll(async () => (await banner.boundingBox())?.height, `${janela} px: altura do menu`).toBe(800);
    expect((await page.locator('main#conteudo').boundingBox())?.x ?? 0, `${janela} px: main depois do menu`).toBeGreaterThanOrEqual(menu);
  }
});

test.describe('celular (390 × 844)', () => {
  test.use({ viewport: CELULAR });

  test('CA-04.2: Shift+Tab no primeiro vai a "Sair", Tab no último volta; modal com o main inerte; Espaço abre', async ({ page }) => {
    await page.goto('/demandas');
    await abrirGaveta(page);
    const g = gaveta(page);
    await expect(fecharMenu(page)).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(g.getByRole('button', { name: 'Sair' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(fecharMenu(page)).toBeFocused();
    // Do primeiro ao último pela ordem: Fechar menu, os três itens, Sair.
    const ordem: string[] = [];
    for (let i = 0; i < 5; i++) {
      ordem.push(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? ''));
      await page.keyboard.press('Tab');
    }
    expect(ordem).toEqual(['Fechar menu', 'Demandas', 'Nova demanda', 'Agentes e teto', 'Sair']);
    await expect(fecharMenu(page)).toBeFocused();

    // Modal: o resto da página fica inerte e não recebe foco nem por script.
    expect(await g.evaluate((d) => d.matches(':modal'))).toBe(true);
    const focoForaDaGaveta = await page.evaluate(() => {
      const main = document.getElementById('conteudo');
      main?.focus();
      return document.activeElement === main;
    });
    expect(focoForaDaGaveta, 'main#conteudo com a gaveta aberta').toBe(false);
    await expect(fecharMenu(page)).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(g).toBeHidden();
    await expect(botaoMenu(page)).toBeFocused();
    await page.keyboard.press('Space');
    await expect(g).toBeVisible();
    await expect(botaoMenu(page)).toHaveAttribute('aria-expanded', 'true');
    await expect(fecharMenu(page)).toBeFocused();
  });

  test('na T05, "Demandas" (atual, outro endereço) vai à fila, fecha a gaveta e põe o foco no h1; a gaveta reabre', async ({ page }) => {
    const bug = await demandaBugDoSeed(page);
    await page.goto(`/demandas/${bug}`);
    await abrirGaveta(page);
    const demandas = gaveta(page).getByRole('link', { name: 'Demandas', exact: true });
    await expect(demandas).toHaveAttribute('aria-current', 'page');
    await demandas.click();
    await expect(page).toHaveURL(/\/demandas$/);
    await expect(gaveta(page)).toBeHidden();
    await expect(page.getByRole('heading', { level: 1, name: 'Demandas' })).toBeFocused();
    await expect(botaoMenu(page)).toHaveAttribute('aria-expanded', 'false');
    expect(await classeDoHtml(page)).not.toContain('gaveta-aberta');

    await abrirGaveta(page);
    await expect(fecharMenu(page)).toBeFocused();
    await expect(gaveta(page).locator('[aria-current="page"]')).toHaveCount(1);
    await expect(gaveta(page).getByRole('link', { name: 'Demandas', exact: true })).toHaveAttribute('aria-current', 'page');
  });

  test('clique dentro da gaveta, fora de controle, não fecha (depois da entrada de 200 ms); o véu fecha', async ({ page }) => {
    await page.goto('/demandas');
    await abrirGaveta(page);
    const g = gaveta(page);
    // A gaveta entra pela esquerda em 200 ms: antes do fim, o ponto onde ela vai ficar ainda é véu. O clique por
    // localizador espera o elemento parar; a espera explícita deixa isso dito.
    await g.evaluate((d) => Promise.all(d.getAnimations().map((a) => a.finished)));
    expect((await g.boundingBox())?.x).toBe(0);
    await g.getByText(CONTA, { exact: true }).click();
    await expect(g).toBeVisible();
    await g.getByText('WS', { exact: true }).click();
    await expect(g).toBeVisible();
    await expect(botaoMenu(page)).toHaveAttribute('aria-expanded', 'true');
    // O véu: à direita da gaveta (320 px em 390 px).
    await page.mouse.click(370, 400);
    await expect(g).toBeHidden();
    await expect(botaoMenu(page)).toBeFocused();
  });

  test('"Sair" com a gaveta aberta: em /entrar a página volta a rolar, sem a classe da gaveta', async ({ page }) => {
    await page.goto('/demandas');
    await abrirGaveta(page);
    expect(await classeDoHtml(page)).toContain('gaveta-aberta');
    await gaveta(page).getByRole('button', { name: 'Sair' }).click();
    await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
    await expect.poll(() => classeDoHtml(page)).not.toContain('gaveta-aberta');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).not.toBe('hidden');
    await expect(gaveta(page)).toHaveCount(0);
  });

  test('320 px: barra de 56 px que cabe na largura; gaveta dentro da tela com "Sair" à vista', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/demandas');
    const banner = page.getByRole('banner');
    await expect(botaoMenu(page)).toBeVisible();
    await expect.poll(async () => (await banner.boundingBox())?.height).toBe(56);
    const marca = await banner.getByRole('link', { name: 'WS Orquestrador de Demandas' }).boundingBox();
    expect((marca?.x ?? 0) + (marca?.width ?? 0), 'a marca compacta cabe em 320 px').toBeLessThanOrEqual(320);
    expect(await banner.evaluate((b) => b.scrollWidth <= b.clientWidth), 'a barra não rola de lado').toBe(true);
    const alvo = await botaoMenu(page).boundingBox();
    expect(Math.min(alvo?.width ?? 0, alvo?.height ?? 0)).toBeGreaterThanOrEqual(44);

    await abrirGaveta(page);
    // 06-T11-testes: a medida espera o fim da entrada de 200 ms, como no teste do clique acima. Medida durante a
    // animação, a caixa vinha com a fração de pixel do transform (272.00000762939453) e o teste falhava às vezes.
    await gaveta(page).evaluate((d) => Promise.all(d.getAnimations().map((a) => a.finished)));
    // min(320 px, 85 %) em 320 px: 272 px, e o véu fica à direita.
    expect(await largura(page, 'dialog#gaveta-menu')).toBe(272);
    await expect(gaveta(page).getByRole('button', { name: 'Sair' })).toBeInViewport();
    await expect(fecharMenu(page)).toBeInViewport();
  });

  test('404 do painel em 390 px: barra com "Menu", e a gaveta com "Demandas" atual', async ({ page }) => {
    await page.goto(`/demandas/${DEMANDA_QUE_NAO_EXISTE}`);
    await expect(page.locator('main h1')).toHaveText('Página não encontrada');
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(botaoMenu(page)).toHaveAttribute('aria-expanded', 'false');
    await abrirGaveta(page);
    await expect(gaveta(page).getByRole('link', { name: 'Demandas', exact: true })).toHaveAttribute('aria-current', 'page');
    await page.keyboard.press('Escape');
    await expect(botaoMenu(page)).toBeFocused();
  });
});

test('404 do painel em 1280 px (RF-03): a casca com os três itens, a conta e "Sair", e o h1 dentro do main', async ({ page }) => {
  await page.setViewportSize(COMPUTADOR);
  await page.goto(`/demandas/${DEMANDA_QUE_NAO_EXISTE}`);
  await expect(page.locator('main#conteudo h1')).toHaveText('Página não encontrada');
  await expect(navegacao(page)).toHaveCount(1);
  await expect(navegacao(page).getByRole('link')).toHaveText(['Demandas', 'Nova demanda', 'Agentes e teto']);
  await expect(navegacao(page).locator('[aria-current="page"]')).toHaveCount(1);
  await expect(page.getByRole('banner').getByRole('button', { name: 'Sair' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar para a fila' })).toHaveAttribute('href', '/demandas');
  expect(await largura(page, 'header')).toBe(248);
});
