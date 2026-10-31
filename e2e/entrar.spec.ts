// T37: T01 Entrar (03, T01). Login pela tela, com senha e código; erros; Sair (C-05); destino seguro (C-40); sem
// cadastro (CA-01.4); modo recuperação; axe nos três estados. Cada teste usa um IP fictício próprio, para o limite por
// IP do Better Auth (C-06) não ligar um teste ao outro.
//
// O código errado só é tentado na conta da administradora, no máximo duas vezes por execução: o bloqueio de C-06 (5
// falhas em 15 min por conta) nunca chega a valer, e o login da conta cto, que todas as telas usam, nunca falha.
import { expect, test, type Page } from '@playwright/test';
import { CONTAS_FICTICIAS } from '../scripts/seed-ficticio';
import { relogioDoSistema } from '../src/lib/relogio';
import { codigoErrado, codigoTotp } from '../test/sessao';
import { ipFicticio, semViolacoes } from './apoio';

type Conta = 'cto' | 'administradora';

// Só os alertas da tela: o anunciador de rota do Next também tem role="alert", fora do `main`.
const alerta = (page: Page) => page.getByRole('main').getByRole('alert');

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': ipFicticio() });
});

async function senhaEContinuar(page: Page, conta: Conta, senha: string = CONTAS_FICTICIAS[conta].senha): Promise<void> {
  await page.getByLabel('E-mail (obrigatório)').fill(CONTAS_FICTICIAS[conta].email);
  await page.getByLabel('Senha (obrigatório)').fill(senha);
  await page.getByRole('button', { name: 'Continuar' }).click();
}

async function entrarPelaTela(page: Page, conta: Conta): Promise<void> {
  await senhaEContinuar(page, conta);
  await expect(page.getByRole('heading', { level: 1, name: 'Código de verificação' })).toBeFocused();
  await page.getByLabel('Código (obrigatório)').fill(codigoTotp(CONTAS_FICTICIAS[conta].segredoTotp, relogioDoSistema.agora()));
  await page.getByRole('button', { name: 'Entrar' }).click();
}

test('CA-01.1: senha e código válidos entram na fila', async ({ page }) => {
  await page.goto('/entrar');
  await expect(page).toHaveTitle('Entrar — WS Orquestrador de Demandas');
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeFocused();
  await page.getByLabel('E-mail (obrigatório)').fill(CONTAS_FICTICIAS.cto.email);
  await page.getByLabel('Senha (obrigatório)').fill(CONTAS_FICTICIAS.cto.senha);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { name: 'Código de verificação' })).toBeFocused();
  await expect(page.getByText('Digite o código de 6 dígitos do seu aplicativo autenticador.')).toBeVisible();
  const codigo = page.getByLabel('Código (obrigatório)');
  await expect(codigo).toHaveAttribute('inputmode', 'numeric');
  await expect(codigo).toHaveAttribute('autocomplete', 'one-time-code');
  await codigo.fill(codigoTotp(CONTAS_FICTICIAS.cto.segredoTotp, relogioDoSistema.agora()));
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/demandas$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Demandas' })).toBeVisible();
});

test('erro de senha: "E-mail ou senha incorretos." em role=alert, foco no resumo, e axe no estado de erro', async ({ page }) => {
  await page.goto('/entrar');
  await senhaEContinuar(page, 'cto', 'Senha-Ficticia-Errada-Para-O-Teste-2026');
  await expect(alerta(page)).toHaveText('E-mail ou senha incorretos.');
  await expect(page.locator(':focus')).toContainText('E-mail ou senha incorretos.');
  // O que foi digitado continua; a pessoa só corrige a senha.
  await expect(page.getByLabel('E-mail (obrigatório)')).toHaveValue(CONTAS_FICTICIAS.cto.email);
  await semViolacoes(page, 'entrar: senha incorreta');

  // E-mail que não existe: a mesma mensagem (03, T01).
  await page.getByLabel('E-mail (obrigatório)').fill('ninguem@ficticio.test');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(alerta(page)).toHaveText('E-mail ou senha incorretos.');
});

test('validação ao enviar: campos vazios e código fora de 6 dígitos, com o resumo de erros e aria-invalid', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Continuar' }).click();
  const resumo = alerta(page);
  await expect(resumo).toContainText('Corrija os campos abaixo para continuar.');
  await expect(resumo).toContainText('Preencha o e-mail e a senha.');
  await expect(resumo).toBeFocused();
  await expect(page.getByLabel('E-mail (obrigatório)')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Senha (obrigatório)')).toHaveAttribute('aria-invalid', 'true');
  await semViolacoes(page, 'entrar: campos vazios');

  await senhaEContinuar(page, 'cto');
  await expect(page.getByRole('heading', { name: 'Código de verificação' })).toBeFocused();
  await page.getByLabel('Código (obrigatório)').fill('123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(alerta(page)).toContainText('O código precisa ter 6 dígitos.');
  await expect(page.getByLabel('Código (obrigatório)')).toHaveAttribute('aria-invalid', 'true');
});

test('código errado: "Código inválido ou expirado…", e o código certo em seguida entra', async ({ page }) => {
  const conta = CONTAS_FICTICIAS.administradora;
  await page.goto('/entrar');
  await senhaEContinuar(page, 'administradora');
  await expect(page.getByRole('heading', { name: 'Código de verificação' })).toBeFocused();
  await page.getByLabel('Código (obrigatório)').fill(codigoErrado(conta.segredoTotp, relogioDoSistema.agora()));
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(alerta(page)).toHaveText('Código inválido ou expirado. Confira se o relógio do celular está certo e tente de novo.');
  await expect(page.locator(':focus')).toContainText('Código inválido ou expirado.');
  await page.getByLabel('Código (obrigatório)').fill(codigoTotp(conta.segredoTotp, relogioDoSistema.agora()));
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/demandas$/);
});

test('passo 2 vencido: "O tempo para digitar o código acabou. Entre de novo." e volta ao passo 1 com o e-mail', async ({ page }) => {
  await page.goto('/entrar');
  await senhaEContinuar(page, 'cto');
  await expect(page.getByRole('heading', { level: 1, name: 'Código de verificação' })).toBeFocused();
  // O cookie de dois fatores do login some (venceu ou foi apagado): o servidor não sabe mais de quem é o código.
  await page.context().clearCookies();
  await page.getByLabel('Código (obrigatório)').fill(codigoTotp(CONTAS_FICTICIAS.cto.segredoTotp, relogioDoSistema.agora()));
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(alerta(page)).toHaveText('O tempo para digitar o código acabou. Entre de novo.');
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
  await expect(page.getByLabel('E-mail (obrigatório)')).toHaveValue(CONTAS_FICTICIAS.cto.email);
  await expect(page.getByLabel('Senha (obrigatório)')).toHaveValue('');
  await expect(page).toHaveURL(/\/entrar$/);
});

test('C-05: depois de Sair, entrar de novo pede o código', async ({ page }) => {
  await page.goto('/entrar');
  await entrarPelaTela(page, 'cto');
  await expect(page).toHaveURL(/\/demandas$/);
  await page.getByRole('button', { name: 'Sair' }).click();
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
  // Sem sessão: o painel volta a /entrar.
  await page.goto('/demandas');
  await expect(page).toHaveURL(/\/entrar\?/);
  await expect(page.getByText('Sua sessão terminou. Entre de novo para continuar.')).toBeVisible();
  // A senha certa não basta: o passo do código aparece de novo (nenhum "lembrar dispositivo").
  await senhaEContinuar(page, 'cto');
  await expect(page.getByRole('heading', { level: 1, name: 'Código de verificação' })).toBeFocused();
  await page.goto('/demandas');
  await expect(page).toHaveURL(/\/entrar\?/);
});

test('C-40: /entrar?callbackURL=https://atacante.test termina em /demandas', async ({ page }) => {
  await page.goto('/entrar?callbackURL=https%3A%2F%2Fatacante.test');
  await entrarPelaTela(page, 'cto');
  await expect(page).toHaveURL(/\/demandas$/);
  expect(new URL(page.url()).hostname).not.toBe('atacante.test');
  expect(new URL(page.url()).pathname).toBe('/demandas');
});

test('C-40: o caminho do painel que a pessoa tentava abrir é o destino depois do login', async ({ page }) => {
  await page.goto('/demandas');
  await expect(page).toHaveURL(/\/entrar\?callbackURL=%2Fdemandas&motivo=sessao$/);
  // Destino do painel com consulta (filtro da fila): mantido como veio.
  await page.goto('/entrar?callbackURL=%2Fdemandas%3Fstatus%3Dnova');
  await entrarPelaTela(page, 'cto');
  await expect(page).toHaveURL(/\/demandas\?status=nova$/);
});

test('CA-01.4: /cadastro e /api/auth/sign-up/email não criam conta (404 na tela; recusa na API)', async ({ page }) => {
  await page.goto('/cadastro');
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  await page.goto('/entrar');
  await expect(page.getByRole('link', { name: /cadastr|criar conta|esqueci/i })).toHaveCount(0);

  const origem = new URL(page.url()).origin;
  const conta = { email: 'cadastro-novo@ficticio.test', password: 'Senha-Ficticia-Do-Cadastro-2026', name: 'Pessoa Ficticia Cadastro' };
  const cadastro = await page.request.post('/api/auth/sign-up/email', { headers: { origin: origem, 'x-real-ip': ipFicticio() }, data: conta });
  expect(cadastro.status()).toBeGreaterThanOrEqual(400);
  const login = await page.request.post('/api/auth/sign-in/email', {
    headers: { origin: origem, 'x-real-ip': ipFicticio() },
    data: { email: conta.email, password: conta.password },
  });
  expect(login.status()).toBe(401);
});

test('modo recuperação: textos de 03 e código de recuperação inválido', async ({ page }) => {
  await page.goto('/entrar');
  await senhaEContinuar(page, 'administradora');
  await expect(page.getByRole('heading', { name: 'Código de verificação' })).toBeFocused();
  await page.getByRole('button', { name: 'Usar um código de recuperação' }).click();
  await expect(
    page.getByText('Digite um dos códigos de recuperação que você guardou ao configurar a verificação. Cada código vale uma vez.'),
  ).toBeVisible();
  const campo = page.getByLabel('Código de recuperação (obrigatório)');
  await expect(campo).toBeFocused();
  await campo.fill('fict0-cio00');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(alerta(page)).toHaveText('Código de recuperação inválido ou já usado.');
  await semViolacoes(page, 'entrar: código de recuperação inválido');

  await page.getByRole('button', { name: 'Usar o código do aplicativo' }).click();
  await expect(page.getByLabel('Código (obrigatório)')).toBeFocused();
  await expect(page.getByText('Digite o código de 6 dígitos do seu aplicativo autenticador.')).toBeVisible();
});

test('axe: vazio, erro e passo 2', async ({ page }) => {
  await page.goto('/entrar');
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeFocused();
  await semViolacoes(page, 'entrar: vazio');

  // "Mostrar senha" é caixa de seleção com rótulo e troca o tipo do campo.
  const senha = page.getByLabel('Senha (obrigatório)');
  await expect(senha).toHaveAttribute('type', 'password');
  await page.getByLabel('Mostrar senha').check();
  await expect(senha).toHaveAttribute('type', 'text');
  await page.getByLabel('Mostrar senha').uncheck();

  await page.getByLabel('E-mail (obrigatório)').fill(CONTAS_FICTICIAS.cto.email);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(alerta(page)).toContainText('Preencha o e-mail e a senha.');
  await semViolacoes(page, 'entrar: erro');

  await senha.fill(CONTAS_FICTICIAS.cto.senha);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { name: 'Código de verificação' })).toBeFocused();
  await semViolacoes(page, 'entrar: passo 2');
});
