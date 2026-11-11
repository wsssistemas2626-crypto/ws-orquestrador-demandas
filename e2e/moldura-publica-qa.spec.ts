// Escrito na 06-T04-testes (qa-automacao), pedido DEC-DEM-20261110-0015-v1. Completa o moldura-publica.spec.ts em
// 390 × 844, onde a construção só rodou o axe:
//   - C-40 na T01: um callbackURL de outra origem não vira link, e a vigia de origem (apoio.ts) prova que nada sai;
//   - C-04 (c) na T02: nos passos 1 e 2 não há link, menu nem "Sair" (a unidade só vê o HTML do passo 1);
//   - Sem permissão e 404: o link da marca é o primeiro Tab, tem foco visível e alvo de 44 px, e fica acima do cartão.
// A conta `sem2fa` só passa pelos passos 1 e 2 e nunca verifica um código, como em autenticacao-qa.spec.ts.
import { type Locator, type Page } from '@playwright/test';
import { CONTAS_FICTICIAS } from '../scripts/seed-ficticio';
import { entrarSoComSenha, expect, ipFicticio, test } from './apoio';

const NOME_DA_MARCA = 'WS Orquestrador de Demandas';
const CELULAR = { width: 390, height: 844 };

test.use({ viewport: CELULAR });

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': ipFicticio() });
});

async function caixa(l: Locator) {
  const b = await l.boundingBox();
  if (!b) throw new Error('e2e: elemento sem caixa (invisível)');
  return b;
}

async function semRolagemLateral(page: Page, rotulo: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth), `${rotulo}: sem rolagem lateral em 390 px`).toBeLessThanOrEqual(CELULAR.width);
}

async function semNadaDoPainel(page: Page) {
  await expect(page.getByRole('link')).toHaveCount(0);
  await expect(page.getByRole('navigation')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sair' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Menu' })).toHaveCount(0);
}

test('C-40 na T01 em 390 px: callbackURL de outra origem não vira link; a marca fica acima do cartão', async ({ page }) => {
  await page.goto('/entrar?callbackURL=https%3A%2F%2Fexemplo.test%2Froubo&motivo=sessao');
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeFocused();
  await expect(page.getByText('Sua sessão terminou. Entre de novo para continuar.')).toBeVisible();
  await semNadaDoPainel(page);
  await expect(page.getByRole('banner')).toContainText('WS');
  const marca = await caixa(page.getByRole('banner'));
  const principal = await caixa(page.getByRole('main'));
  expect(marca.y + marca.height, 'a marca acima do cartão').toBeLessThanOrEqual(principal.y);
  await semRolagemLateral(page, 'entrar');
});

test('C-04 (c) na T02 em 390 px: nos passos 1 e 2, nenhum link, menu nem "Sair"; o QR cabe na tela', async ({ page }) => {
  await entrarSoComSenha(page, 'sem2fa');
  await page.goto('/configurar-2fa');
  await expect(page.getByRole('heading', { level: 1, name: 'Configurar verificação em duas etapas' })).toBeFocused();
  await expect(page.getByText('WS', { exact: true })).toBeVisible();
  await semNadaDoPainel(page);
  await semRolagemLateral(page, 'configurar-2fa: passo 1');

  await page.getByLabel('Senha (obrigatório)').fill(CONTAS_FICTICIAS.sem2fa.senha);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Passo 2 de 3 — Ligue o aplicativo autenticador' })).toBeFocused();
  await semNadaDoPainel(page);
  const qr = await caixa(page.getByRole('img', { name: /QR code/ }));
  expect(qr.x, 'o QR começa dentro da tela').toBeGreaterThanOrEqual(0);
  expect(qr.x + qr.width, 'o QR termina dentro da tela').toBeLessThanOrEqual(CELULAR.width);
  await semRolagemLateral(page, 'configurar-2fa: passo 2');
});

test('Sem permissão e 404 em 390 px: a marca é o primeiro Tab, com foco visível, alvo de 44 px e acima do cartão', async ({ page }) => {
  for (const caminho of ['/sem-permissao', '/nao-existe-ficticio']) {
    await page.goto(caminho);
    const link = page.getByRole('link', { name: NOME_DA_MARCA });
    await expect(link, caminho).toHaveAttribute('href', '/demandas');
    await page.keyboard.press('Tab');
    await expect(link, `${caminho}: primeiro Tab`).toBeFocused();
    const contorno = await link.evaluate((e) => {
      const s = getComputedStyle(e);
      return { estilo: s.outlineStyle, largura: Number.parseFloat(s.outlineWidth) };
    });
    expect(contorno.estilo, `${caminho}: foco visível`).toBe('solid');
    expect(contorno.largura, `${caminho}: contorno de 2 px`).toBeGreaterThanOrEqual(2);
    const alvo = await caixa(link);
    expect(alvo.height, `${caminho}: altura do alvo`).toBeGreaterThanOrEqual(44);
    expect(alvo.width, `${caminho}: largura do alvo`).toBeGreaterThanOrEqual(44);
    const principal = await caixa(page.getByRole('main'));
    expect(alvo.y + alvo.height, `${caminho}: a marca acima do cartão`).toBeLessThanOrEqual(principal.y);
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await semRolagemLateral(page, caminho);
  }
});
