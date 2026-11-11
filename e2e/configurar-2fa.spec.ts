// T37: T02 Configurar verificação em duas etapas (03, T02). Contas do seed (T33), uma por papel no teste, para nenhum
// teste depender da ordem:
//   - `sem2fa` nunca termina a ativação (só passa pelos passos 1 e 2 com erro): continua sem 2FA para C-04 (c);
//   - `configurar2fa` percorre o fluxo inteiro e termina com 2FA.
// O banco do e2e é novo a cada execução (Testcontainers ou homologação recém-subida).
import { type Page } from '@playwright/test';
import { CONTAS_FICTICIAS } from '../scripts/seed-ficticio';
import { relogioDoSistema } from '../src/lib/relogio';
import { codigoErrado, codigoTotp } from '../test/sessao';
import { entrarSoComSenha, expect, ipFicticio, semViolacoes, test } from './apoio';

const TITULO = 'Configurar verificação em duas etapas';
const PASSO_1 = 'Passo 1 de 3 — Confirme sua senha';
const PASSO_2 = 'Passo 2 de 3 — Ligue o aplicativo autenticador';
const PASSO_3 = 'Passo 3 de 3 — Guarde os códigos de recuperação';
const ALT_QR = 'QR code para adicionar o WS Orquestrador de Demandas ao aplicativo autenticador';

// Só os alertas da tela: o anunciador de rota do Next também tem role="alert", fora do `main`.
const alerta = (page: Page) => page.getByRole('main').getByRole('alert');

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': ipFicticio() });
});

// A chave em texto, agrupada de 4 em 4 (03, T02), e o segredo sem os espaços.
async function chaveDaTela(page: Page): Promise<string> {
  const agrupada = (await page.locator('#dois-fatores-chave').textContent()) ?? '';
  expect(agrupada).toMatch(/^(?:[A-Z2-7]{4} )*[A-Z2-7]{1,4}$/);
  return agrupada.replace(/ /g, '');
}

test('C-04 c e CA-01.2: conta sem 2FA que abre /demandas vai a /configurar-2fa', async ({ page }) => {
  // Sem sessão nenhuma, /configurar-2fa leva a /entrar.
  await page.goto('/configurar-2fa');
  await expect(page).toHaveURL(/\/entrar\?motivo=sessao$/);

  await entrarSoComSenha(page, 'sem2fa');
  await page.goto('/demandas');
  await expect(page).toHaveURL(/\/configurar-2fa$/);
  await expect(page).toHaveTitle(`${TITULO} — WS Orquestrador de Demandas`);
  await expect(page.getByRole('heading', { level: 1, name: TITULO })).toBeFocused();
  await expect(page.getByText('Para usar o painel, configure a verificação em duas etapas.')).toBeVisible();
  // Nada do painel aparece antes: nem a navegação, nem o "Sair".
  await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0);
  // A API também recusa a sessão sem 2FA (403).
  expect((await page.request.get('/api/demandas')).status()).toBe(403);

  // Pela tela de login: senha certa de conta sem 2FA vai direto a /configurar-2fa.
  await page.context().clearCookies();
  await page.goto('/entrar');
  await page.getByLabel('E-mail (obrigatório)').fill(CONTAS_FICTICIAS.sem2fa.email);
  await page.getByLabel('Senha (obrigatório)').fill(CONTAS_FICTICIAS.sem2fa.senha);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page).toHaveURL(/\/configurar-2fa$/);
  await expect(page.getByRole('heading', { level: 1, name: TITULO })).toBeVisible();
});

test('passos 1 e 2 com erro: "Senha incorreta." e "Código inválido…", com axe nos dois passos', async ({ page }) => {
  await entrarSoComSenha(page, 'sem2fa');
  await page.goto('/configurar-2fa');
  await expect(page.getByRole('heading', { level: 1, name: TITULO })).toBeFocused();
  await expect(page.getByRole('heading', { level: 2, name: PASSO_1 })).toBeVisible();
  await semViolacoes(page, 'configurar-2fa: passo 1');

  await page.getByLabel('Senha (obrigatório)').fill('Senha-Ficticia-Errada-Para-O-Teste-2026');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(alerta(page)).toHaveText('Senha incorreta.');
  await expect(page.locator(':focus')).toContainText('Senha incorreta.');
  await semViolacoes(page, 'configurar-2fa: passo 1 com erro');

  await page.getByLabel('Senha (obrigatório)').fill(CONTAS_FICTICIAS.sem2fa.senha);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { level: 2, name: PASSO_2 })).toBeFocused();
  await expect(page.getByRole('img', { name: ALT_QR })).toBeVisible();
  await expect(page.getByText('No aplicativo, escolha adicionar conta e leia o QR code.')).toBeVisible();
  await expect(page.getByText('Não consegue ler o QR code? Digite esta chave no aplicativo:')).toBeVisible();
  const segredo = await chaveDaTela(page);
  const codigo = page.getByLabel('Código de 6 dígitos (obrigatório)');
  await expect(codigo).toHaveAttribute('inputmode', 'numeric');
  await expect(codigo).toHaveAttribute('autocomplete', 'one-time-code');
  await semViolacoes(page, 'configurar-2fa: passo 2');

  await codigo.fill(codigoErrado(segredo, relogioDoSistema.agora()));
  await page.getByRole('button', { name: 'Verificar' }).click();
  await expect(alerta(page)).toHaveText('Código inválido. Confira se o relógio do celular está certo e digite o código atual.');
  await expect(page.locator(':focus')).toContainText('Código inválido.');
  await semViolacoes(page, 'configurar-2fa: passo 2 com erro');
});

test('fluxo completo: senha → chave → código → códigos de recuperação → "Guardei" → fila com "Verificação em duas etapas ativada."', async ({ page }) => {
  const conta = CONTAS_FICTICIAS.configurar2fa;
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await entrarSoComSenha(page, 'configurar2fa');
  await page.goto('/configurar-2fa');
  await expect(page.getByRole('heading', { level: 1, name: TITULO })).toBeFocused();

  await page.getByLabel('Senha (obrigatório)').fill(conta.senha);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { level: 2, name: PASSO_2 })).toBeFocused();
  await expect(page.getByRole('img', { name: ALT_QR })).toBeVisible();
  const segredo = await chaveDaTela(page);
  await page.getByRole('button', { name: 'Copiar chave' }).click();
  await expect(page.getByRole('main').getByRole('status')).toHaveText('Chave copiada.');
  // O botão copia o valor sem os espaços (03, T02).
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(segredo);

  await page.getByLabel('Código de 6 dígitos (obrigatório)').fill(codigoTotp(segredo, relogioDoSistema.agora()));
  await page.getByRole('button', { name: 'Verificar' }).click();
  await expect(page.getByRole('heading', { level: 2, name: PASSO_3 })).toBeFocused();
  await expect(page.getByText('Se perder o celular, cada um destes códigos permite entrar uma vez. Eles aparecem só agora.')).toBeVisible();
  const itens = page.locator('#dois-fatores-codigos li');
  await expect(itens).toHaveCount(10);
  const codigos = (await itens.allTextContents()).map((c) => c.trim());

  await page.getByRole('button', { name: 'Copiar códigos' }).click();
  await expect(page.getByRole('main').getByRole('status')).toHaveText('Códigos copiados.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(codigos.join('\n'));
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar códigos' }).click();
  expect((await download).suggestedFilename()).toBe('codigos-de-recuperacao-ws-orquestrador.txt');
  await semViolacoes(page, 'configurar-2fa: passo 3');

  // "Concluir" sem a caixa marcada.
  await page.getByRole('button', { name: 'Concluir' }).click();
  const resumo = alerta(page);
  await expect(resumo).toContainText('Marque que guardou os códigos para concluir.');
  await expect(resumo).toBeFocused();
  const caixa = page.getByLabel('Guardei os códigos em lugar seguro (obrigatório)');
  await expect(caixa).toHaveAttribute('aria-invalid', 'true');
  await semViolacoes(page, 'configurar-2fa: passo 3 com erro');

  await caixa.check();
  await page.getByRole('button', { name: 'Concluir' }).click();
  await expect(page).toHaveURL(/\/demandas(\?|$)/);
  await expect(page.getByRole('heading', { level: 1, name: 'Demandas' })).toBeVisible();
  await expect(page.getByText('Verificação em duas etapas ativada.')).toBeVisible();
  await semViolacoes(page, 'fila com a verificação ativada');

  // Com 2FA ativo, /configurar-2fa não abre de novo.
  await page.goto('/configurar-2fa');
  await expect(page).toHaveURL(/\/demandas$/);

  // Sair e entrar com um dos códigos de recuperação guardados.
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await page.getByLabel('E-mail (obrigatório)').fill(conta.email);
  await page.getByLabel('Senha (obrigatório)').fill(conta.senha);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Código de verificação' })).toBeFocused();
  await page.getByRole('button', { name: 'Usar um código de recuperação' }).click();
  await page.getByLabel('Código de recuperação (obrigatório)').fill(codigos[0]!);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/demandas$/);
});
