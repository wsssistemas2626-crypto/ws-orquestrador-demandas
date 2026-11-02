// 06-T46-testes (qa-automacao): bordas de C-15, C-18 e C-19 que a seguranca.spec.ts (T46) não confere.
//   - C-15: POST com sessão e sem Origin; Origin certa com corpo text/plain (o envio de formulário de outro site);
//     PATCH de outra origem; GET de outra origem sem Access-Control-Allow-Origin; OPTIONS na rota com id e na do login.
//   - C-19: os cabeçalhos também na resposta de erro da API (401 sem sessão e 404 de id fora do formato), na página
//     pública /entrar e na página 404 do painel.
//   - C-18: o texto de ataque num RSK, na T10 do RSK e no formulário da T08 que parte dele.
//
// C-36 (06-T43-tech-lead e 06-T44-tech-lead, "C-36"): esta spec não cria nenhuma demanda. Usa a demanda de tipo estudo
// do seed fictício, achada por GET /api/demandas, como a seguranca.spec.ts, e não supõe nada sobre as versões dela. Só
// o caso de C-18 grava, com a sessão da conta "cto", uma versão nova do RSK nessa demanda. Os envios de C-15 levam
// corpo vazio ou inválido: se o controle falhasse, a validação recusaria com 400 e nada seria gravado.
//   - conta "cto": 0 demandas e 1 versão (o RSK do caso C-18);
//   - conta "administradora": 0 demandas e 0 versões.
import { expect, test, type APIResponse, type Page } from '@playwright/test';
import { api, entrarComo, ipFicticio } from './apoio';

type Versao = { id: string };
type ListaDemandas = { itens: { id: string; titulo: string }[] };

// Título da demanda de tipo estudo do seed (scripts/seed-ficticio.ts, DEMANDAS).
const ESTUDO_DO_SEED = 'Estudo de atendimento com IA e revisão humana (fictício)';
const DE_FORA = 'https://atacante.test';
const ATAQUE = '<script>alert(1)</script><img src=x onerror=alert(2)>';

// Homologação (BASE_URL): build de produção, onde a página também tem de vir com no-store e a CSP sem 'unsafe-eval'.
// É o mesmo sinal do playwright.config.ts, e não um valor que o servidor testado devolve (Minor 1 da 06-T46-revisao).
const HOMOLOGACAO = !!process.env.BASE_URL;

async function demandaDeEstudoDoSeed(page: Page): Promise<string> {
  const { itens } = await api<ListaDemandas>(page, 'GET', '/api/demandas?tipo=estudo&limit=100');
  const d = itens.find((x) => x.titulo === ESTUDO_DO_SEED);
  if (!d) throw new Error('e2e: o seed não tem a demanda de tipo estudo');
  return d.id;
}

function origemDoPainel(): string {
  const base = test.info().project.use.baseURL;
  if (!base) throw new Error('e2e: baseURL ausente no playwright.config.ts');
  return new URL(base).origin;
}

// Resposta do navegador (page.goto) ou do pedido com a sessão (page.request): as duas expõem status e cabeçalhos.
type Resposta = Pick<APIResponse, 'headers'>;

// Os cabeçalhos fixos de C-19 e nenhum de CORS, em qualquer resposta.
function cabecalhosFixos(r: Resposta, rotulo: string): void {
  const h = r.headers();
  expect(h['x-content-type-options'], rotulo).toBe('nosniff');
  expect(h['referrer-policy'], rotulo).toBe('no-referrer');
  expect(h['x-frame-options'], rotulo).toBe('DENY');
  expect(h['x-powered-by'], rotulo).toBeUndefined();
  expect(h['access-control-allow-origin'], rotulo).toBeUndefined();
  expect(h['access-control-allow-credentials'], rotulo).toBeUndefined();
}

function cabecalhosDaApi(r: Resposta, rotulo: string): void {
  cabecalhosFixos(r, rotulo);
  expect(r.headers()['cache-control'], rotulo).toBe('no-store');
}

function cabecalhosDaPagina(r: Resposta, rotulo: string): void {
  cabecalhosFixos(r, rotulo);
  const csp = r.headers()['content-security-policy'] ?? '';
  expect(csp, rotulo).toMatch(/script-src 'self' 'nonce-[^']+'.*frame-ancestors 'none'/);
  expect(csp, rotulo).toContain("object-src 'none'");
  expect(csp, rotulo).toContain("base-uri 'none'");
  expect(csp, rotulo).not.toContain("'unsafe-inline'");
  if (HOMOLOGACAO) {
    expect(csp, rotulo).not.toContain("'unsafe-eval'");
    expect(r.headers()['cache-control'], rotulo).toContain('no-store');
  }
}

test('C-15: com sessão, POST sem Origin dá 403, Origin certa com text/plain dá 415 e PATCH de outra origem dá 403; nada muda', async ({ page }) => {
  await entrarComo(page, 'cto');
  const id = await demandaDeEstudoDoSeed(page);
  const antes = await api<unknown>(page, 'GET', `/api/demandas/${id}`);
  const total = async () => (await api<ListaDemandas>(page, 'GET', '/api/demandas?limit=100')).itens.length;
  const totalAntes = await total();

  const semOrigem = await page.request.post('/api/demandas', { headers: { 'content-type': 'application/json' }, data: '{}' });
  expect(semOrigem.status(), 'POST sem Origin').toBe(403);
  cabecalhosDaApi(semOrigem, 'POST sem Origin');

  // O formulário de outro site manda text/plain sem preflight; aqui até com a Origin certa o corpo que não é JSON cai.
  const textoPuro = await page.request.post('/api/demandas', { headers: { origin: origemDoPainel(), 'content-type': 'text/plain' }, data: '{}' });
  expect(textoPuro.status(), 'POST text/plain').toBe(415);
  cabecalhosDaApi(textoPuro, 'POST text/plain');

  // Corpo com chave desconhecida: se a Origin passasse, o schema recusaria com 400 (C-11) e o teste falharia do mesmo jeito.
  const patch = await page.request.fetch(`/api/demandas/${id}`, {
    method: 'PATCH',
    headers: { origin: DE_FORA, 'content-type': 'application/json' },
    data: JSON.stringify({ campoQueNaoExiste: 'fictício' }),
  });
  expect(patch.status(), 'PATCH de outra origem').toBe(403);
  cabecalhosDaApi(patch, 'PATCH de outra origem');

  expect(await api<unknown>(page, 'GET', `/api/demandas/${id}`)).toEqual(antes);
  expect(await total()).toBe(totalAntes);
});

test('C-15: GET de outra origem responde sem CORS; OPTIONS na rota com id e na do login também', async ({ page, request }) => {
  await entrarComo(page, 'cto');
  const id = await demandaDeEstudoDoSeed(page);
  const leitura = await page.request.get(`/api/demandas/${id}`, { headers: { origin: DE_FORA } });
  expect(leitura.status()).toBe(200);
  cabecalhosDaApi(leitura, 'GET de outra origem');

  for (const caminho of [`/api/demandas/${id}`, '/api/auth/sign-in/email']) {
    const preflight = await request.fetch(caminho, {
      method: 'OPTIONS',
      headers: {
        origin: DE_FORA,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
        'x-real-ip': ipFicticio(),
      },
    });
    expect(preflight.headers()['access-control-allow-origin'], caminho).toBeUndefined();
    expect(preflight.headers()['access-control-allow-credentials'], caminho).toBeUndefined();
    expect(preflight.headers()['access-control-allow-methods'], caminho).toBeUndefined();
  }
});

test('C-19: a resposta de erro da API também traz no-store, nosniff, no-referrer e DENY, sem X-Powered-By nem detalhe', async ({ page, request }) => {
  const semSessao = await request.get('/api/demandas');
  expect(semSessao.status()).toBe(401);
  cabecalhosDaApi(semSessao, '401 sem sessão');
  expect(await semSessao.text()).not.toMatch(/at \w+ \(|node_modules|select |stack/i);

  await entrarComo(page, 'cto');
  const foraDoFormato = await page.request.get('/api/demandas/nao-e-um-id');
  expect(foraDoFormato.status()).toBe(404);
  cabecalhosDaApi(foraDoFormato, '404 de id fora do formato');
  expect(await foraDoFormato.text()).not.toMatch(/at \w+ \(|node_modules|select |stack/i);
});

test('C-19: a página pública /entrar e a página 404 do painel têm CSP de nonce, nosniff, no-referrer, DENY e nenhum X-Powered-By', async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': ipFicticio() });
  const entrar = await page.goto('/entrar');
  if (!entrar) throw new Error('e2e: /entrar sem resposta');
  expect(entrar.status()).toBe(200);
  cabecalhosDaPagina(entrar, '/entrar');

  await entrarComo(page, 'cto');
  const inexistente = await page.request.get('/demandas/DEM-20000101-9999');
  expect(inexistente.status()).toBe(404);
  cabecalhosDaPagina(inexistente, '404 do painel');
});

test('C-18: RSK com <script> e <img onerror> no resumo aparece como texto na T10 e no formulário da T08 que parte dele', async ({ page }) => {
  await entrarComo(page, 'cto');
  const dialogos: string[] = [];
  page.on('dialog', (d) => {
    dialogos.push(d.message());
    void d.dismiss();
  });
  const demandaId = await demandaDeEstudoDoSeed(page);
  const rsk = await api<Versao>(page, 'POST', `/api/demandas/${demandaId}/pareceres-risco`, {
    riscoTecnicoNivel: 'baixo',
    riscoOperacionalNivel: 'baixo',
    riscoJuridicoNivel: 'baixo',
    resumo: ATAQUE,
  });

  await page.goto(`/pareceres-risco/${rsk.id}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Parecer de risco v\d+ — /);
  await expect(page.getByText(ATAQUE, { exact: true })).toBeVisible();
  await expect(page.locator('main img')).toHaveCount(0);
  await expect(page.locator('main script')).toHaveCount(0);

  // A T08 a partir desta versão: o texto volta no campo, como valor, e não vira elemento.
  await page.goto(`/demandas/${demandaId}/pareceres-risco/novo?base=${rsk.id}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Novo parecer de risco' })).toBeVisible();
  await expect(page.getByLabel('Resumo', { exact: true })).toHaveValue(ATAQUE);
  await expect(page.locator('main img')).toHaveCount(0);
  await expect(page.locator('main script')).toHaveCount(0);

  const daApi = await api<{ resumo: string }>(page, 'GET', `/api/pareceres-risco/${rsk.id}`);
  expect(daApi.resumo).toBe(ATAQUE);
  expect(dialogos).toEqual([]);
});
