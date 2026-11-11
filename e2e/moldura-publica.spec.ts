// T04 (RF-13): T01 Entrar, T02 2FA, Sem permissão e o 404 da raiz com a marca e as cores, sem a casca. O fluxo, os
// campos, os textos e os redirecionamentos são os de hoje (entrar.spec.ts, configurar-2fa.spec.ts e
// autenticacao-qa.spec.ts). A tela de erro (src/app/error.tsx) não tem como ser provocada no build de produção sem
// mexer no servidor; a marca dela é conferida no teste de unidade (src/components/casca/moldura-publica.test.ts).
//
// Axe nas duas larguras no mesmo estado (D-06): 1280 × 720 e 390 × 844, e de volta.
import { type Page } from '@playwright/test';
import { CONTAS_FICTICIAS } from '../scripts/seed-ficticio';
import { entrarSoComSenha, expect, ipFicticio, semViolacoes, test } from './apoio';

const NOME_DA_MARCA = 'WS Orquestrador de Demandas';
const ALT_QR = 'QR code para adicionar o WS Orquestrador de Demandas ao aplicativo autenticador';
const COMPUTADOR = { width: 1280, height: 720 };
const CELULAR = { width: 390, height: 844 };

// Só os alertas da tela: o anunciador de rota do Next também tem role="alert", fora do `main`.
const alerta = (page: Page) => page.getByRole('main').getByRole('alert');

async function semViolacoesNasDuasLargurasDaMoldura(page: Page, rotulo: string): Promise<void> {
  await page.setViewportSize(COMPUTADOR);
  await semViolacoes(page, `${rotulo} (1280 × 720)`);
  await page.setViewportSize(CELULAR);
  await semViolacoes(page, `${rotulo} (390 × 844)`);
  // 03, seção 10: reflow sem rolagem lateral da página.
  expect(await page.evaluate(() => document.documentElement.scrollWidth), `${rotulo}: sem rolagem lateral em 390 px`).toBeLessThanOrEqual(CELULAR.width);
  await page.setViewportSize(COMPUTADOR);
}

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': ipFicticio() });
});

test('RF-13: T01 com a marca sem link, cartão e o fluxo de hoje', async ({ page }) => {
  await page.goto('/entrar');
  await expect(page.getByText('WS', { exact: true })).toBeVisible();
  await expect(page.getByRole('banner')).toContainText('Orquestrador');
  await expect(page.getByRole('banner')).toContainText('de Demandas');
  await expect(page.getByRole('link', { name: NOME_DA_MARCA })).toHaveCount(0);
  await expect(page.getByRole('link')).toHaveCount(0);
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeFocused();
  // Nada da casca do painel antes de entrar.
  await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sair' })).toHaveCount(0);
  // Botão primário na largura do cartão (03, 7.2).
  const continuar = await page.getByRole('button', { name: 'Continuar' }).boundingBox();
  const email = await page.getByLabel('E-mail (obrigatório)').boundingBox();
  expect(continuar && email && Math.abs(continuar.width - email.width) <= 1, 'Continuar com a largura do campo').toBe(true);
});

test('RF-13: sem permissão e 404 com a marca como link para /demandas', async ({ page }) => {
  for (const caminho of ['/sem-permissao', '/nao-existe-ficticio']) {
    await page.goto(caminho);
    await expect(page.getByRole('link', { name: NOME_DA_MARCA })).toHaveAttribute('href', '/demandas');
    await expect(page.getByRole('link', { name: 'Voltar para a fila' })).toHaveAttribute('href', '/demandas');
    await semViolacoesNasDuasLargurasDaMoldura(page, caminho);
  }
  await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible();
  // A marca leva à fila; sem sessão, a fila manda para /entrar, como hoje.
  await page.getByRole('link', { name: NOME_DA_MARCA }).click();
  await expect(page).toHaveURL(/\/entrar\?callbackURL=%2Fdemandas&motivo=sessao$/);
});

test('CA-13.2: o QR da T02 continua #ffffff com módulos #000000, e o axe passa nos passos 1 e 2 nas duas larguras', async ({ page }) => {
  // A conta `sem2fa` só passa pelos passos 1 e 2 e nunca verifica um código: continua sem 2FA para C-04 (c).
  await entrarSoComSenha(page, 'sem2fa');
  await page.goto('/configurar-2fa');
  await expect(page.getByRole('heading', { level: 1, name: 'Configurar verificação em duas etapas' })).toBeFocused();
  await expect(page.getByRole('link', { name: NOME_DA_MARCA })).toHaveCount(0);
  await expect(page.getByText('WS', { exact: true })).toBeVisible();
  await semViolacoesNasDuasLargurasDaMoldura(page, 'configurar-2fa: passo 1');

  await page.getByLabel('Senha (obrigatório)').fill(CONTAS_FICTICIAS.sem2fa.senha);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Passo 2 de 3 — Ligue o aplicativo autenticador' })).toBeFocused();
  const qr = page.getByRole('img', { name: ALT_QR });
  await expect(qr).toBeVisible();
  await expect(qr.locator('rect')).toHaveCount(1);
  await expect(qr.locator('rect')).toHaveAttribute('fill', '#ffffff');
  await expect(qr.locator('path')).toHaveCount(1);
  await expect(qr.locator('path')).toHaveAttribute('fill', '#000000');
  // 16 px de área branca em volta do QR (03, 7.2).
  const caixa = await qr.boundingBox();
  const moldura = await qr.locator('xpath=..').boundingBox();
  expect(caixa && moldura && caixa.x - moldura.x >= 16 && caixa.y - moldura.y >= 16, 'área branca de 16 px em volta do QR').toBe(true);
  expect(await qr.locator('xpath=..').evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(255, 255, 255)');
  await semViolacoesNasDuasLargurasDaMoldura(page, 'configurar-2fa: passo 2');
});

test('CA-13.3: axe na T01 vazia, com erro e no passo 2, em 1280 × 720 e em 390 × 844', async ({ page }) => {
  await page.goto('/entrar');
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeFocused();
  await semViolacoesNasDuasLargurasDaMoldura(page, 'entrar: vazio');

  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(alerta(page)).toContainText('Preencha o e-mail e a senha.');
  await semViolacoesNasDuasLargurasDaMoldura(page, 'entrar: erro');

  await page.getByLabel('E-mail (obrigatório)').fill(CONTAS_FICTICIAS.cto.email);
  await page.getByLabel('Senha (obrigatório)').fill(CONTAS_FICTICIAS.cto.senha);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Código de verificação' })).toBeFocused();
  await semViolacoesNasDuasLargurasDaMoldura(page, 'entrar: passo 2');
});
