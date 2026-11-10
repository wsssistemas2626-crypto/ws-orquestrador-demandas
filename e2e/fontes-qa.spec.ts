// e2e/fontes-qa.spec.ts — CA-02.2 e RNF-06 (DEC-DEM-20261110-0015-v1, T02), complemento do qa-automacao na
// 06-T02-testes. O fontes.spec.ts prova que a primeira família do corpo e a do `.font-mono` estão carregadas, mas não
// qual é qual: com o corpo em Noto Sans Mono, ou com uma família só para tudo, ele passaria. Aqui cada família é ligada,
// pelos @font-face da página, aos arquivos que ela de fato usa:
//   - o corpo usa a família cujos arquivos são os quatro noto_sans_latin_<peso>_normal (400, 600, 700, 800);
//   - o id da demanda usa a família cujos arquivos são os dois noto_sans_mono_latin_<peso>_normal (400, 600);
//   - seis arquivos ao todo, cada peso declarado igual ao do nome do arquivo, todos com font-display: swap;
//   - o corpo em Noto Sans também em T02, T04, T05 e T12 ("qualquer tela" do CA-02.2).
// Sem corrida com o streaming: a lista da T03 chega por Suspense depois do `load`, e o `document.fonts.ready` lido antes
// dela resolve sem a Mono pedida. Por isso o teste espera o id na tela e confere a carga com `expect.poll`.
// Só leitura: entra pela API, faz GET e abre telas; não cria demanda (C-36). A vigia da T01 vale em todos.
import type { Page } from '@playwright/test';
import { api, entrarComo, entrarSoComSenha, expect, ipFicticio, test } from './apoio';

// Título da demanda de tipo bug do seed fictício (scripts/seed-ficticio.ts), o mesmo da axe-todas e do fontes.spec.
const TITULO_BUG_DO_SEED = 'Pedidos do marketplace duplicados no ERP (fictício)';
const ID_DE_DEMANDA = /^DEM-\d{8}-\d{4}$/;

type Face = { familia: string; peso: string; display: string; arquivos: string[] };
type Leitura = { corpo: string; id: string | null; faces: Face[] };

async function lerFontes(page: Page, caminho: string, comId = false): Promise<Leitura> {
  const resposta = await page.goto(caminho);
  expect(resposta?.status(), caminho).toBeLessThan(400);
  // Só o id visível: a partir da T09 a fila tem tabela e cartões no DOM, e um dos dois fica com display: none.
  if (comId) await page.locator('main a:visible').filter({ hasText: ID_DE_DEMANDA }).first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate((fonteDoId) => {
    const semAspas = (s: string) => s.trim().replace(/^['"]|['"]$/g, '');
    const primeira = (ff: string) => semAspas(ff.split(',')[0] ?? '');
    const faces: { familia: string; peso: string; display: string; arquivos: string[] }[] = [];
    for (const folha of [...document.styleSheets])
      for (const regra of [...folha.cssRules])
        if (regra instanceof CSSFontFaceRule) {
          const base = folha.href ?? document.baseURI;
          const arquivos = [...regra.style.getPropertyValue('src').matchAll(/url\("?([^")]+)"?\)/g)].map((m) => new URL(m[1] ?? '', base).pathname.split('/').pop() ?? '');
          faces.push({
            familia: semAspas(regra.style.getPropertyValue('font-family')),
            peso: regra.style.getPropertyValue('font-weight'),
            display: regra.style.getPropertyValue('font-display'),
            arquivos,
          });
        }
    const re = new RegExp(fonteDoId);
    const id = [...document.querySelectorAll('main a')].find((a) => a.getClientRects().length > 0 && re.test((a.textContent ?? '').trim()));
    return { corpo: primeira(getComputedStyle(document.body).fontFamily), id: id ? primeira(getComputedStyle(id).fontFamily) : null, faces };
  }, ID_DE_DEMANDA.source);
}

const familiasCarregadas = (page: Page) =>
  page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => ({ familia: f.family.trim().replace(/^['"]|['"]$/g, ''), peso: f.weight })));

// A família de fato carregada no peso 400 (a computada sozinha aparece mesmo com a fonte bloqueada, CV-04).
async function carregadaNoPeso400(page: Page, familia: string, rotulo: string) {
  await expect.poll(() => familiasCarregadas(page), { message: `${rotulo}: ${familia} carregada no peso 400` }).toContainEqual({ familia, peso: '400' });
}

// Os @font-face (com arquivo) da família, como "nome do arquivo sem hash → peso declarado".
function arquivosDaFamilia(l: Leitura, familia: string): Record<string, string> {
  const r: Record<string, string> = {};
  for (const f of l.faces.filter((x) => x.familia === familia))
    for (const a of f.arquivos) r[/^([a-z_]+_\d{3}_normal)/.exec(a)?.[1] ?? a] = f.peso;
  return r;
}

const ARQUIVOS_SANS = {
  noto_sans_latin_400_normal: '400',
  noto_sans_latin_600_normal: '600',
  noto_sans_latin_700_normal: '700',
  noto_sans_latin_800_normal: '800',
};
const ARQUIVOS_MONO = { noto_sans_mono_latin_400_normal: '400', noto_sans_mono_latin_600_normal: '600' };

// O corpo está na família dos quatro arquivos da Noto Sans, e o peso regular dela está carregado.
async function corpoEmNotoSans(page: Page, l: Leitura, tela: string) {
  expect(arquivosDaFamilia(l, l.corpo), `${tela}: arquivos da família do corpo (${l.corpo})`).toEqual(ARQUIVOS_SANS);
  await carregadaNoPeso400(page, l.corpo, `${tela}, corpo`);
}

test('CA-02.2 e RNF-06 na T03: corpo em Noto Sans, id em Noto Sans Mono, seis arquivos com swap', async ({ page }) => {
  await entrarComo(page, 'cto'); // pela API: não navega
  const l = await lerFontes(page, '/demandas', true);

  await corpoEmNotoSans(page, l, 'T03');
  expect(l.id, 'T03: há um id de demanda na tela').not.toBeNull();
  const familiaDoId = l.id ?? '';
  expect(familiaDoId).not.toBe(l.corpo);
  expect(arquivosDaFamilia(l, familiaDoId), `T03: arquivos da família do id (${familiaDoId})`).toEqual(ARQUIVOS_MONO);
  await carregadaNoPeso400(page, familiaDoId, 'T03, id');

  // RNF-06: seis arquivos .woff2, nenhum a mais, e todo @font-face com arquivo em font-display: swap.
  const comArquivo = l.faces.filter((f) => f.arquivos.length > 0);
  expect(new Set(comArquivo.flatMap((f) => f.arquivos)).size).toBe(6);
  for (const f of comArquivo) expect({ familia: f.familia, peso: f.peso, display: f.display }).toEqual({ familia: f.familia, peso: f.peso, display: 'swap' });
  // As faces sem arquivo são só o fallback métrico do next/font (local), nunca de outra família.
  for (const f of l.faces.filter((x) => x.arquivos.length === 0)) expect(f.familia).toMatch(/ Fallback$/);
});

test('CA-02.2 na T01: corpo em Noto Sans antes de entrar', async ({ page }) => {
  await corpoEmNotoSans(page, await lerFontes(page, '/entrar'), 'T01');
});

test('CA-02.2 na T02: corpo em Noto Sans na configuração da 2FA', async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': ipFicticio() });
  await entrarSoComSenha(page, 'sem2fa'); // pela API; nunca verifica código (como a axe-todas)
  await corpoEmNotoSans(page, await lerFontes(page, '/configurar-2fa'), 'T02');
});

test('CA-02.2 na T04, T05 e T12: corpo em Noto Sans nas telas do painel', async ({ page }) => {
  await entrarComo(page, 'cto'); // pela API: não navega
  const { itens } = await api<{ itens: { id: string; titulo: string }[] }>(page, 'GET', '/api/demandas?tipo=bug&limit=100');
  const bug = itens.find((x) => x.titulo === TITULO_BUG_DO_SEED);
  if (!bug) throw new Error('e2e: o seed não tem a demanda de tipo bug');
  for (const [tela, caminho] of [
    ['T04', '/demandas/nova'],
    ['T05', `/demandas/${bug.id}`],
    ['T12', '/configuracao/agentes'],
  ] as const)
    await corpoEmNotoSans(page, await lerFontes(page, caminho), tela);
});
