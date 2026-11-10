// T05 (DEC-DEM-20261110-0015-v1): casca do painel (RF-03) e gaveta do menu (RF-04), nas duas larguras de teste
// (1280 × 720 e 390 × 844), e o "Sair" pelos dois caminhos (CV-16). Só leitura: entra pela API, faz GET e abre telas;
// não cria demanda nem versão (C-36). Os dois testes de "Sair" encerram só a sessão aberta pelo próprio teste.
import type { Page } from '@playwright/test';
import { CONTAS_FICTICIAS } from '../scripts/seed-ficticio';
import { api, entrarComo, expect, semViolacoes, test } from './apoio';

// Título da demanda de tipo bug do seed fictício (scripts/seed-ficticio.ts), a que tem ESP, RSK e o DEC de rascunho de
// agente (o mesmo DEC da axe-todas e da fontes.spec).
const TITULO_BUG_DO_SEED = 'Pedidos do marketplace duplicados no ERP (fictício)';
const CONTA = `${CONTAS_FICTICIAS.cto.nome} (CTO)`;
const CELULAR = { width: 390, height: 844 } as const;
const COMPUTADOR = { width: 1280, height: 720 } as const;

async function demandaBugDoSeed(page: Page): Promise<string> {
  const { itens } = await api<{ itens: { id: string; titulo: string }[] }>(page, 'GET', '/api/demandas?tipo=bug&limit=100');
  const bug = itens.find((x) => x.titulo === TITULO_BUG_DO_SEED);
  if (!bug) throw new Error('e2e: o seed não tem a demanda de tipo bug');
  return bug.id;
}

// `exact`: com a gaveta aberta também existe o botão "Fechar menu".
const botaoMenu = (page: Page) => page.getByRole('button', { name: 'Menu', exact: true });
const gaveta = (page: Page) => page.getByRole('dialog', { name: 'Menu' });
const navegacao = (page: Page) => page.getByRole('navigation', { name: 'Principal' });
const classeDoHtml = (page: Page) => page.evaluate(() => document.documentElement.className);

// Abre a gaveta pelo botão "Menu". O clique antes da hidratação não faz nada; por isso a abertura é conferida e, se não
// abriu, o clique se repete (o botão só abre, nunca fecha: repetir é seguro).
async function abrirGaveta(page: Page): Promise<void> {
  await expect(async () => {
    await botaoMenu(page).click({ timeout: 1_000 });
    await expect(gaveta(page)).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
}

// "Sair" pela casca ou pela gaveta (CV-16): um POST para a saída do Better Auth, a tela vai a /entrar e o cookie antigo,
// posto de volta, recebe 401 na API (C-07 de hoje).
async function sairEConferir(page: Page, ondeEsta: 'casca' | 'gaveta'): Promise<void> {
  const antes = await page.context().cookies();
  expect(antes.filter((c) => /session_token$/.test(c.name)), 'cookie de sessão antes de sair').toHaveLength(1);
  const pedidoDeSaida = page.waitForRequest((r) => new URL(r.url()).pathname === '/api/auth/sign-out');
  const area = ondeEsta === 'casca' ? page.getByRole('banner') : gaveta(page);
  await area.getByRole('button', { name: 'Sair' }).click();
  expect((await pedidoDeSaida).method()).toBe('POST');
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
  await page.context().addCookies(antes);
  const r = await page.request.get('/api/demandas');
  expect(r.status(), 'cookie antigo depois de sair').toBe(401);
}

test.describe('computador (1280 × 720)', () => {
  test.use({ viewport: COMPUTADOR });

  test('CA-03.1: menu lateral com três itens, item atual, conta e Sair em T03, T05, T11 e T12', async ({ page }) => {
    await entrarComo(page, 'cto');
    const bug = await demandaBugDoSeed(page);
    const telas: ReadonlyArray<readonly [string, string]> = [
      ['/demandas', 'Demandas'],
      [`/demandas/${bug}`, 'Demandas'],
      [`/pacotes-decisao/DEC-${bug}-v1`, 'Demandas'],
      ['/configuracao/agentes', 'Agentes e teto'],
    ];
    for (const [caminho, atual] of telas) {
      await page.goto(caminho);
      const banner = page.getByRole('banner');
      await expect(banner, caminho).toBeVisible();
      await expect(navegacao(page), caminho).toHaveCount(1);
      await expect(navegacao(page).getByRole('link'), caminho).toHaveText(['Demandas', 'Nova demanda', 'Agentes e teto']);
      await expect(navegacao(page).locator('[aria-current="page"]'), caminho).toHaveCount(1);
      await expect(navegacao(page).getByRole('link', { name: atual, exact: true }), caminho).toHaveAttribute('aria-current', 'page');
      await expect(banner.getByText(CONTA, { exact: true }), caminho).toBeVisible();
      await expect(banner.getByRole('button', { name: 'Sair' }), caminho).toBeVisible();
      // CV-19: a marca só leva à fila.
      await expect(banner.getByRole('link', { name: 'WS Orquestrador de Demandas' }), caminho).toHaveAttribute('href', '/demandas');
      // A barra do celular não existe nesta largura, nem a gaveta.
      await expect(botaoMenu(page), caminho).toBeHidden();
      await expect(gaveta(page), caminho).toBeHidden();
      await expect(page.getByRole('banner'), caminho).toHaveCount(1);
      // Menu lateral de 248 px, à esquerda, na altura da janela; o conteúdo começa depois dele.
      const lateral = await banner.boundingBox();
      const conteudo = await page.locator('main#conteudo').boundingBox();
      expect({ x: lateral?.x, largura: lateral?.width, altura: lateral?.height }, caminho).toEqual({ x: 0, largura: 248, altura: COMPUTADOR.height });
      expect(conteudo?.x ?? 0, caminho).toBeGreaterThanOrEqual(248);
    }
  });

  test('menu lateral de 216 px no tablete (768 a 1199 px) e fixo ao rolar', async ({ page }) => {
    await entrarComo(page, 'cto');
    await page.setViewportSize({ width: 1000, height: 600 });
    await page.goto('/demandas');
    const banner = page.getByRole('banner');
    await expect(banner).toBeVisible();
    expect((await banner.boundingBox())?.width).toBe(216);
    await expect(navegacao(page)).toBeVisible();
    await expect(botaoMenu(page)).toBeHidden();
    await page.mouse.wheel(0, 2_000);
    await expect(async () => expect((await banner.boundingBox())?.y).toBe(0)).toPass();
  });

  test('CA-03.2: primeiro Tab no "Pular para o conteúdo"; Enter leva ao main; o h1 não recebe foco na primeira carga', async ({ page }) => {
    await entrarComo(page, 'cto');
    await page.goto('/demandas');
    await expect(page.getByRole('heading', { level: 1, name: 'Demandas' })).toBeVisible();
    await expect(page.locator('main h1')).not.toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('main#conteudo')).toBeFocused();
  });

  test('CA-03.4: "Nova demanda" no menu leva o foco ao h1 da T04', async ({ page }) => {
    await entrarComo(page, 'cto');
    await page.goto('/demandas');
    await navegacao(page).getByRole('link', { name: 'Nova demanda' }).click();
    await expect(page).toHaveURL(/\/demandas\/nova$/);
    await expect(page.locator('main h1')).toBeFocused();
    await expect(navegacao(page).getByRole('link', { name: 'Nova demanda' })).toHaveAttribute('aria-current', 'page');
  });

  test('CA-03.5 e CV-16: Sair pela casca leva a /entrar e o cookie antigo recebe 401 em /api/demandas', async ({ page }) => {
    await entrarComo(page, 'cto');
    await page.goto('/demandas');
    await sairEConferir(page, 'casca');
  });
});

test.describe('celular (390 × 844)', () => {
  test.use({ viewport: CELULAR });

  test('CA-04.1 a CA-04.3: Menu fechado, abre com foco dentro, 20 Tabs não saem, Esc fecha e volta a Menu', async ({ page }) => {
    await entrarComo(page, 'cto');
    await page.goto('/demandas');
    const menu = botaoMenu(page);
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toHaveAttribute('aria-controls', 'gaveta-menu');
    // O menu lateral não aparece; a barra tem 56 px e a marca compacta é link para a fila.
    await expect(navegacao(page)).toBeHidden();
    await expect(page.getByRole('banner').getByRole('button', { name: 'Sair' })).toBeHidden();
    expect((await page.getByRole('banner').boundingBox())?.height).toBe(56);
    await expect(page.getByRole('banner').getByRole('link', { name: 'WS Orquestrador de Demandas' })).toHaveAttribute('href', '/demandas');
    const alvo = await menu.boundingBox();
    expect(Math.min(alvo?.width ?? 0, alvo?.height ?? 0)).toBeGreaterThanOrEqual(44);

    await abrirGaveta(page);
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    const g = gaveta(page);
    await expect(page.getByRole('button', { name: 'Fechar menu' })).toBeFocused();
    // A gaveta tem a marca sem link, os três itens com o atual, a conta e "Sair".
    await expect(g.getByRole('link', { name: 'WS Orquestrador de Demandas' })).toHaveCount(0);
    await expect(g.getByRole('navigation', { name: 'Principal' }).getByRole('link')).toHaveText(['Demandas', 'Nova demanda', 'Agentes e teto']);
    await expect(g.getByRole('link', { name: 'Demandas', exact: true })).toHaveAttribute('aria-current', 'page');
    await expect(g.getByText(CONTA, { exact: true })).toBeVisible();
    await expect(g.getByRole('button', { name: 'Sair' })).toBeVisible();
    // Animação de 200 ms (03, 2.4), página atrás sem rolagem.
    expect(await g.evaluate((d) => getComputedStyle(d).animationDuration)).toBe('0.2s');
    expect(await classeDoHtml(page)).toContain('gaveta-aberta');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');

    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      expect(await g.evaluate((d) => d.contains(document.activeElement)), `Tab ${i + 1}`).toBe(true);
    }
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Shift+Tab');
      expect(await g.evaluate((d) => d.contains(document.activeElement)), `Shift+Tab ${i + 1}`).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(g).toBeHidden();
    await expect(menu).toBeFocused();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(await classeDoHtml(page)).not.toContain('gaveta-aberta');
  });

  test('"Fechar menu" fecha e devolve o foco a Menu; a gaveta abre de novo', async ({ page }) => {
    await entrarComo(page, 'cto');
    await page.goto('/demandas');
    await abrirGaveta(page);
    await page.getByRole('button', { name: 'Fechar menu' }).click();
    await expect(gaveta(page)).toBeHidden();
    await expect(botaoMenu(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(gaveta(page)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fechar menu' })).toBeFocused();
  });

  test('CA-04.4: "Agentes e teto" na gaveta abre a T12, gaveta fechada e foco no h1', async ({ page }) => {
    await entrarComo(page, 'cto');
    await page.goto('/demandas');
    await abrirGaveta(page);
    await gaveta(page).getByRole('link', { name: 'Agentes e teto' }).click();
    await expect(page).toHaveURL(/\/configuracao\/agentes$/);
    await expect(gaveta(page)).toBeHidden();
    await expect(botaoMenu(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('main h1')).toBeFocused();
    expect(await classeDoHtml(page)).not.toContain('gaveta-aberta');
  });

  test('clique no véu e item da tela atual fecham e devolvem o foco a Menu', async ({ page }) => {
    await entrarComo(page, 'cto');
    await page.goto('/demandas');
    await abrirGaveta(page);
    // A gaveta tem min(320 px, 85 %) de largura: o ponto (370, 400) é o véu.
    await page.mouse.click(370, 400);
    await expect(gaveta(page)).toBeHidden();
    await expect(botaoMenu(page)).toBeFocused();

    await abrirGaveta(page);
    // Clique dentro da gaveta, fora de controle (entre os itens e a conta), não fecha.
    await page.mouse.click(160, 500);
    await expect(gaveta(page)).toBeVisible();
    await gaveta(page).getByRole('link', { name: 'Demandas', exact: true }).click();
    await expect(gaveta(page)).toBeHidden();
    await expect(botaoMenu(page)).toBeFocused();
    await expect(page).toHaveURL(/\/demandas$/);
  });

  test('janela de 390 para 1280 px com a gaveta aberta fecha a gaveta', async ({ page }) => {
    await entrarComo(page, 'cto');
    await page.goto('/demandas');
    await abrirGaveta(page);
    await page.setViewportSize(COMPUTADOR);
    await expect(gaveta(page)).toBeHidden();
    await expect(navegacao(page)).toHaveCount(1);
    await expect(navegacao(page)).toBeVisible();
    await expect(page.locator('main#conteudo')).toBeFocused();
    expect(await classeDoHtml(page)).not.toContain('gaveta-aberta');
  });

  test('RNF-11: com reducedMotion reduce, a gaveta abre sem transição', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await entrarComo(page, 'cto');
    await page.goto('/demandas');
    await abrirGaveta(page);
    const duracao = await gaveta(page).evaluate((d) => getComputedStyle(d).animationDuration);
    expect(Number.parseFloat(duracao)).toBeLessThan(0.001);
  });

  test('CV-16: Sair pela gaveta leva a /entrar e o cookie antigo recebe 401', async ({ page }) => {
    await entrarComo(page, 'cto');
    await page.goto('/demandas');
    await abrirGaveta(page);
    await sairEConferir(page, 'gaveta');
  });

  test('CA-04.5: axe com a gaveta aberta', async ({ page }) => {
    await entrarComo(page, 'cto');
    await page.goto('/demandas');
    await semViolacoes(page, 'barra do celular em 390 px');
    await abrirGaveta(page);
    await semViolacoes(page, 'gaveta aberta em 390 px');
  });
});
