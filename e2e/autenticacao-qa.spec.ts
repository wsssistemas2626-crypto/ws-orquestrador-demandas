// Escrito na 06-T37-testes (qa-automacao). O que entrar.spec.ts e configurar-2fa.spec.ts não provam no navegador:
//   - C-06 na tela: o 429 do limite por IP chega ao cliente do Better Auth como status 429 e vira o texto da 03 (o
//     teste unitário de mensagemDoErro só supõe esse status);
//   - C-05 pelo cookie: o login pela tela não deixa cookie de "dispositivo confiável";
//   - a fila só mostra o aviso da T02 com o valor fixo, e nada do endereço vai para a tela;
//   - o QR code da tela, lido de volta por um leitor que não usa src/lib/qr.ts (test/leitor-qr.ts), leva o segredo da
//     chave em texto, e nenhum pedido da página leva o segredo para fora (03, T02).
// Cada teste tem um IP fictício próprio (limite por IP, C-06). A conta `sem2fa` só passa pelo passo 1 e nunca verifica
// um código: continua sem 2FA, como C-04 (c) precisa, e nenhuma falha de código é somada à conta.
import { type Page } from '@playwright/test';
import { CONTAS_FICTICIAS } from '../scripts/seed-ficticio';
import { relogioDoSistema } from '../src/lib/relogio';
import { lerQr } from '../test/leitor-qr';
import { codigoTotp } from '../test/sessao';
import { entrarSoComSenha, expect, ipFicticio, test } from './apoio';

// Só os alertas da tela: o anunciador de rota do Next também tem role="alert", fora do `main`.
const alerta = (page: Page) => page.getByRole('main').getByRole('alert');
const ALT_QR = 'QR code para adicionar o WS Orquestrador de Demandas ao aplicativo autenticador';

test.beforeEach(async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': ipFicticio() });
});

const respostaDoLogin = (page: Page) =>
  page.waitForResponse((r) => new URL(r.url()).pathname === '/api/auth/sign-in/email' && r.request().method() === 'POST');

test('C-06 na tela: a 11ª tentativa de senha no minuto, do mesmo IP, mostra "Muitas tentativas…" no alerta', async ({ page }) => {
  await page.goto('/entrar');
  // Conta que não existe: nenhuma conta do seed é tocada.
  await page.getByLabel('E-mail (obrigatório)').fill('limite-de-tentativas@ficticio.test');
  await page.getByLabel('Senha (obrigatório)').fill('Senha-Ficticia-Errada-Para-O-Limite-2026');
  for (let i = 1; i <= 10; i++) {
    const resposta = respostaDoLogin(page);
    await page.getByRole('button', { name: 'Continuar' }).click();
    expect((await resposta).status(), `tentativa ${i}`).toBe(401);
    await expect(alerta(page)).toHaveText('E-mail ou senha incorretos.');
  }
  const decimaPrimeira = respostaDoLogin(page);
  await page.getByRole('button', { name: 'Continuar' }).click();
  expect((await decimaPrimeira).status()).toBe(429);
  await expect(alerta(page)).toHaveText('Muitas tentativas. Aguarde um minuto e tente de novo.');
  await expect(page.locator(':focus')).toContainText('Muitas tentativas.');
  // A tela continua no passo 1, com o que foi digitado.
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
  await expect(page.getByLabel('E-mail (obrigatório)')).toHaveValue('limite-de-tentativas@ficticio.test');
});

test('C-05 pelo cookie: o login pela tela não deixa cookie de dispositivo confiável; a fila só mostra o aviso da T02 com o valor fixo', async ({ page }) => {
  const conta = CONTAS_FICTICIAS.cto;
  await page.goto('/entrar');
  await page.getByLabel('E-mail (obrigatório)').fill(conta.email);
  await page.getByLabel('Senha (obrigatório)').fill(conta.senha);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Código de verificação' })).toBeFocused();
  await page.getByLabel('Código (obrigatório)').fill(codigoTotp(conta.segredoTotp, relogioDoSistema.agora()));
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/demandas$/);

  const nomes = (await page.context().cookies()).map((c) => c.name);
  expect(nomes.filter((n) => /session_token$/.test(n))).toHaveLength(1);
  expect(nomes.filter((n) => /trust/i.test(n))).toEqual([]);

  // Sem o valor fixo, nenhum aviso; e nada do endereço aparece na tela.
  for (const aviso of ['2FA-ATIVADO', '2fa-ativado ', 'SENTINELA-aviso<b>negrito</b>', '']) {
    await page.goto(`/demandas?aviso=${encodeURIComponent(aviso)}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Demandas' })).toBeVisible();
    await expect(page.getByText('Verificação em duas etapas ativada.')).toHaveCount(0);
    // Dentro de `main`, onde a tela escreve (o corpo inteiro também tem os scripts do Next com o endereço).
    await expect(page.getByRole('main')).not.toContainText('SENTINELA');
  }
  await page.goto('/demandas?aviso=2fa-ativado');
  await expect(page.getByRole('main').getByText('Verificação em duas etapas ativada.')).toBeVisible();
});

test('QR code do passo 2, lido de volta por um leitor independente: o totpURI com o segredo da chave em texto, sem nada sair da página', async ({ page }) => {
  const pedidos: string[] = [];
  page.on('request', (r) => pedidos.push(r.url()));
  await entrarSoComSenha(page, 'sem2fa');
  await page.goto('/configurar-2fa');
  await page.getByLabel('Senha (obrigatório)').fill(CONTAS_FICTICIAS.sem2fa.senha);
  await page.getByRole('button', { name: 'Continuar' }).click();
  const qr = page.getByRole('img', { name: ALT_QR });
  await expect(qr).toBeVisible();

  const segredo = ((await page.locator('#dois-fatores-chave').textContent()) ?? '').replace(/ /g, '');
  expect(segredo).toMatch(/^[A-Z2-7]{16,}$/);

  // O SVG da tela: um quadrado de 1 × 1 por módulo escuro, deslocado pela zona de silêncio de 4 módulos.
  const caixa = (await qr.getAttribute('viewBox')) ?? '';
  const d = (await qr.locator('path').getAttribute('d')) ?? '';
  const lado = Number(caixa.split(' ')[2]);
  const n = lado - 8;
  expect(caixa).toBe(`0 0 ${lado} ${lado}`);
  expect(d.replace(/M\d+ \d+h1v1h-1z/g, '')).toBe('');
  const modulos = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  for (const [, xs, ys] of d.matchAll(/M(\d+) (\d+)h1v1h-1z/g)) {
    const x = Number(xs) - 4;
    const y = Number(ys) - 4;
    expect(x >= 0 && x < n && y >= 0 && y < n, `módulo (${x},${y}) dentro do símbolo`).toBe(true);
    modulos[y]![x] = true;
  }

  const uri = new URL(lerQr(modulos).texto);
  expect(uri.protocol).toBe('otpauth:');
  expect(uri.host).toBe('totp');
  expect(uri.searchParams.get('secret')).toBe(segredo);
  expect(uri.searchParams.get('issuer')).toBe('WS Orquestrador de Demandas');
  expect(decodeURIComponent(uri.pathname)).toContain(CONTAS_FICTICIAS.sem2fa.email);

  // Só desenho no DOM: nenhuma imagem, referência externa ou objeto embutido no SVG.
  expect(await qr.locator('image, use, foreignObject, a').count()).toBe(0);
  // Nenhum pedido da página foi a outro endereço, nem levou o segredo na URL.
  const host = new URL(page.url()).host;
  expect(pedidos.filter((u) => new URL(u).host !== host)).toEqual([]);
  expect(pedidos.filter((u) => u.includes(segredo))).toEqual([]);
});
