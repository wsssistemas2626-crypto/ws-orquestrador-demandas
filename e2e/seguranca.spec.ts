// T46: verificações transversais de segurança do painel e da API (04, C-15, C-18 e C-19). Os controles já existem (C-18:
// o React escapa todo texto e o lint barra `dangerouslySetInnerHTML`; C-19: src/proxy.ts e next.config.ts; C-15:
// rota() e nenhum cabeçalho de CORS); esta spec os confere no navegador e na resposta HTTP, como chegam à pessoa.
//
// C-36 (06-T43-tech-lead e 06-T44-tech-lead, "C-36"): esta spec não cria nenhuma demanda. Ela usa a demanda de tipo
// estudo do seed fictício (T33), achada por GET /api/demandas, que a pedido-construcao.spec também usa e que, pela
// ordem alfabética, já pode ter ESP, RSK e um DEC aprovado quando esta spec roda: nada aqui supõe que ela esteja sem
// pacote. Só o caso de C-18 grava, com a sessão da conta "cto", uma versão nova da ESP nessa demanda.
//   - conta "cto": 0 demandas e 1 versão (a ESP do caso C-18);
//   - conta "administradora": 0 demandas e 0 versões.
// O POST de outra origem do caso C-15 leva corpo vazio: se o Origin passasse, a validação recusaria com 400 e nada seria
// gravado.
import { type Page } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { api, demandaDoSeed, entrarComo, expect, test } from './apoio';

type Versao = { id: string };
type ListaDemandas = { itens: { id: string; titulo: string }[] };

// Título da demanda de tipo estudo do seed (scripts/seed-ficticio.ts, DEMANDAS).
const ESTUDO_DO_SEED = 'Estudo de atendimento com IA e revisão humana (fictício)';

const ATAQUE = '<script>alert(1)</script><img src=x onerror=alert(2)>';
const NEGRITO = '<b>negrito</b>';

async function demandaDeEstudoDoSeed(page: Page): Promise<string> {
  const { itens } = await api<ListaDemandas>(page, 'GET', '/api/demandas?tipo=estudo&limit=100');
  const d = itens.find((x) => x.titulo === ESTUDO_DO_SEED);
  if (!d) throw new Error('e2e: o seed não tem a demanda de tipo estudo');
  return d.id;
}

// O nonce da CSP do cabeçalho: 'nonce-<valor>' dentro de script-src.
function nonceDa(csp: string | undefined): string {
  const m = /script-src [^;]*'nonce-([^']+)'/.exec(csp ?? '');
  if (!m?.[1]) throw new Error('e2e: CSP sem nonce');
  return m[1];
}

test('C-18: ESP com <script> e <img onerror> aparece como texto e nada executa', async ({ page }) => {
  await entrarComo(page, 'cto');
  const dialogos: string[] = [];
  page.on('dialog', (d) => {
    dialogos.push(d.message());
    void d.dismiss();
  });
  const demandaId = await demandaDeEstudoDoSeed(page);
  const esp = await api<Versao>(page, 'POST', `/api/demandas/${demandaId}/especificacoes`, { descricaoObjetiva: ATAQUE, escopoInclui: [NEGRITO] });

  await page.goto(`/especificacoes/${esp.id}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Especificação técnica v\d+ — /);
  await expect(page.getByText(ATAQUE, { exact: true })).toBeVisible();
  await expect(page.getByText(NEGRITO, { exact: true })).toBeVisible();
  // Nenhum elemento nasceu do texto: nem imagem, nem script, nem negrito dentro do conteúdo da tela.
  await expect(page.locator('main img')).toHaveCount(0);
  await expect(page.locator('main script')).toHaveCount(0);
  await expect(page.locator('main b')).toHaveCount(0);
  // A API devolve o texto como foi gravado, sem tirar nem escapar nada: quem escapa é a tela.
  const daApi = await api<{ descricaoObjetiva: string; escopoInclui: string[] }>(page, 'GET', `/api/especificacoes/${esp.id}`);
  expect(daApi).toMatchObject({ descricaoObjetiva: ATAQUE, escopoInclui: [NEGRITO] });
  expect(dialogos).toEqual([]);
});

// CV-18 (T09 do DEC-DEM-20261110-0015-v1): o C-18 também no cartão da T03 em 390 px. A demanda é a `textoDeTerceiro` do
// seed (scripts/seed-ficticio.ts), cujo título traz <script>, <img onerror> e o caractere de direção U+202E; o título
// vem da constante importada, nunca copiado (o teste sem-controle-bidi reprova o caractere cru). Só lê: nada é gravado.
test('C-18 e CV-18: título com <script>, <img onerror> e U+202E aparece como texto no cartão da T03 em 390 px, isolado por <bdi>', async ({ page }) => {
  await entrarComo(page, 'cto');
  const dialogos: string[] = [];
  page.on('dialog', (d) => {
    dialogos.push(d.message());
    void d.dismiss();
  });
  const titulo = TITULOS_DO_E2E.textoDeTerceiro;
  expect(titulo).toContain(String.fromCodePoint(0x202e));
  const id = await demandaDoSeed(page, titulo);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demandas?tipo=melhoria&limit=100');
  const cartao = page.getByRole('listitem').filter({ has: page.getByRole('link', { name: id, exact: true }) });
  await expect(cartao).toHaveCount(1);
  await expect(cartao.getByRole('heading', { level: 3 })).toHaveText(titulo);
  await expect(cartao.locator('h3 > bdi')).toHaveText(titulo);
  await expect(cartao.locator('img, script')).toHaveCount(0);
  await expect(page.locator('main img')).toHaveCount(0);
  await expect(page.locator('main script')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __xss?: unknown }).__xss)).toBeUndefined();
  expect(dialogos).toEqual([]);
});

// CV-18 (T11 do DEC-DEM-20261110-0015-v1): o C-18 também na T05 no arranjo A2, com a mesma `textoDeTerceiro`. O título
// aparece literal no h1, isolado por <bdi>, e na trilha só o id; a barra de etapas e a Próxima ação são texto da tela.
// Nas duas larguras. Só lê: nada é gravado.
test('C-18 e CV-18: na T05 da textoDeTerceiro, o título literal no h1 com <bdi>; barra e Próxima ação em texto; nada executa', async ({ page }) => {
  await entrarComo(page, 'cto');
  const dialogos: string[] = [];
  page.on('dialog', (d) => {
    dialogos.push(d.message());
    void d.dismiss();
  });
  const titulo = TITULOS_DO_E2E.textoDeTerceiro;
  expect(titulo).toContain(String.fromCodePoint(0x202e));
  const id = await demandaDoSeed(page, titulo);
  for (const tamanho of [
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(tamanho);
    await page.goto(`/demandas/${id}`);
    await expect(page.locator('main h1'), `${tamanho.width} px`).toHaveText(titulo);
    await expect(page.locator('main h1 > bdi'), `${tamanho.width} px`).toHaveText(titulo);
    await expect(page.getByRole('navigation', { name: 'Trilha' }).locator('[aria-current="page"]')).toHaveText(id);
    const barra = page.getByRole('list', { name: 'Etapas da demanda' });
    await expect(barra.getByRole('listitem')).toHaveCount(5);
    await expect(barra).not.toContainText('<script>');
    const cartao = page.getByRole('region', { name: 'Próxima ação' });
    await expect(cartao).toContainText('Escrever a especificação técnica.');
    await expect(cartao).not.toContainText('<script>');
    await expect(page.locator('main img')).toHaveCount(0);
    await expect(page.locator('main script')).toHaveCount(0);
    expect(await page.evaluate(() => (window as unknown as { __xss?: unknown }).__xss)).toBeUndefined();
  }
  expect(dialogos).toEqual([]);
});

test('C-19: /demandas/[id] e GET /api/demandas/:id com CSP de nonce, nosniff, no-referrer, no-store, sem X-Powered-By', async ({ page }) => {
  await entrarComo(page, 'cto');
  const id = await demandaDeEstudoDoSeed(page);
  for (const caminho of [`/demandas/${id}`, `/api/demandas/${id}`]) {
    // A página vem da navegação do navegador, como chega à pessoa; a API, do pedido com a sessão da página.
    const r = caminho.startsWith('/api') ? await page.request.get(caminho) : await page.goto(caminho);
    if (!r) throw new Error(`e2e: ${caminho} sem resposta`);
    expect(r.status(), caminho).toBe(200);
    const h = r.headers();
    const pagina = !caminho.startsWith('/api');
    if (pagina) {
      expect(h['content-security-policy'], caminho).toMatch(/script-src 'self' 'nonce-[^']+'.*frame-ancestors 'none'/);
      expect(h['content-security-policy'], caminho).toContain("object-src 'none'");
      expect(h['content-security-policy'], caminho).toContain("base-uri 'none'");
      expect(h['content-security-policy'], caminho).not.toContain("'unsafe-inline'");
    }
    expect(h['x-content-type-options'], caminho).toBe('nosniff');
    expect(h['referrer-policy'], caminho).toBe('no-referrer');
    expect(h['x-frame-options'], caminho).toBe('DENY');
    // Página e API exigem no-store sempre (08-correcao, M-04): o e2e local roda contra o build de produção (`next start`,
    // e2e/servidor.ts), como a homologação, e não mais contra o `next dev`, que trocava o Cache-Control da página. Sem
    // 'unsafe-eval' na CSP: ele só existe em desenvolvimento (src/proxy.ts).
    if (pagina) expect(h['content-security-policy'], caminho).not.toContain("'unsafe-eval'");
    expect(h['cache-control'], caminho).toContain('no-store');
    expect(h['x-powered-by'], caminho).toBeUndefined();
  }
});

test('C-19: o nonce é novo a cada resposta e é o mesmo de todo <script> da página', async ({ page }) => {
  await entrarComo(page, 'cto');
  const id = await demandaDeEstudoDoSeed(page);
  const primeira = await page.request.get(`/demandas/${id}`);
  const segunda = await page.request.get(`/demandas/${id}`);
  const nonce = nonceDa(primeira.headers()['content-security-policy']);
  expect(nonceDa(segunda.headers()['content-security-policy'])).not.toBe(nonce);

  const scripts = (await primeira.text()).match(/<script\b[^>]*>/g) ?? [];
  expect(scripts.length).toBeGreaterThan(0);
  for (const s of scripts) expect(s).toContain(`nonce="${nonce}"`);
  // O x-nonce que o cliente manda não vale: a página usa o do servidor.
  const forjada = await page.request.get(`/demandas/${id}`, { headers: { 'x-nonce': 'NONCE-FORJADO-FICTICIO' } });
  expect(nonceDa(forjada.headers()['content-security-policy'])).not.toBe('NONCE-FORJADO-FICTICIO');
  expect(await forjada.text()).not.toContain('NONCE-FORJADO-FICTICIO');
});

test('C-15: OPTIONS não devolve Access-Control-Allow-Origin; POST com sessão e de outra origem recebe 403', async ({ page, request }) => {
  const preflight = await request.fetch('/api/demandas', {
    method: 'OPTIONS',
    headers: { origin: 'https://atacante.test', 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' },
  });
  expect(preflight.headers()['access-control-allow-origin']).toBeUndefined();
  expect(preflight.headers()['access-control-allow-credentials']).toBeUndefined();

  await entrarComo(page, 'cto');
  const r = await page.request.post('/api/demandas', { headers: { origin: 'https://atacante.test', 'content-type': 'application/json' }, data: '{}' });
  expect(r.status()).toBe(403);
  expect(r.headers()['access-control-allow-origin']).toBeUndefined();
});
