// T36: moldura do painel (03, 2.7) e páginas comuns de erro (03, 2.8).
import { entrarComo, expect, semViolacoes, test } from './apoio';

test('moldura: pular para o conteúdo, navegação principal, página atual, um h1, lang pt-BR e axe', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/demandas');
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
  const nav = page.getByRole('navigation', { name: 'Principal' });
  await expect(nav.getByRole('link', { name: 'Demandas' })).toHaveAttribute('aria-current', 'page');
  await expect(nav.getByRole('link', { name: 'Nova demanda' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Agentes e teto' })).toBeVisible();
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page).toHaveTitle('Demandas — WS Orquestrador de Demandas');
  await semViolacoes(page, 'moldura');
});

test('moldura: a conta aparece com o papel, o link de pular leva ao main e a tela estreita tem o botão Menu', async ({ page }) => {
  await entrarComo(page, 'administradora');
  await page.goto('/demandas');
  await expect(page.getByRole('banner')).toContainText('Pessoa Ficticia Administradora (Administradora)');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('main#conteudo')).toBeFocused();
  await page.setViewportSize({ width: 320, height: 640 });
  const menu = page.getByRole('button', { name: 'Menu' });
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeHidden();
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Nova demanda' })).toBeVisible();
  await semViolacoes(page, 'moldura em 320 px com o menu aberto');
});

test('sem sessão, o painel leva a /entrar', async ({ page }) => {
  await page.goto('/demandas');
  await expect(page).toHaveURL(/\/entrar/);
});

test('404 com o texto de 03, 2.8', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/demandas/DEM-20261022-9999');
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  await expect(page.getByText('Confira o endereço ou o id. A demanda, a versão ou o pacote podem não existir.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar para a fila' })).toBeVisible();
  await expect(page).toHaveTitle('Página não encontrada — WS Orquestrador de Demandas');
  await semViolacoes(page, '404');
});

test('sem permissão com o texto de 03, 2.8', async ({ page }) => {
  await page.goto('/sem-permissao');
  await expect(page.getByRole('heading', { level: 1, name: 'Sem permissão' })).toBeVisible();
  await expect(page.getByText('Sua conta não pode fazer esta ação. Se precisar, fale com o CTO.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar para a fila' })).toHaveAttribute('href', '/demandas');
  await expect(page).toHaveTitle('Sem permissão — WS Orquestrador de Demandas');
  await semViolacoes(page, 'sem permissão');
});
