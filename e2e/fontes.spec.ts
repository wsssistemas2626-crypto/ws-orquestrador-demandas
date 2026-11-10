// e2e/fontes.spec.ts — CV-04 (DEC-DEM-20261110-0015-v1, T02): a família de fato carregada, @font-face só da mesma
// origem e woff2 com o content-type certo. Só leitura: entra pela API, faz GET e abre telas; não cria demanda (C-36).
import type { Page } from '@playwright/test';
import { api, entrarComo, expect, test } from './apoio';

// Título da demanda de tipo bug do seed fictício (scripts/seed-ficticio.ts), a que tem o DEC de rascunho de agente
// (o mesmo DEC da axe-todas).
const TITULO_BUG_DO_SEED = 'Pedidos do marketplace duplicados no ERP (fictício)';

// O ouvinte entra antes da primeira navegação do teste: o contexto é novo, sem cache, e cada woff2 gera resposta.
async function conferirFontes(page: Page, caminho: string, temMono: boolean) {
  const respostas: { url: string; tipo: string | undefined }[] = [];
  page.on('response', (r) => {
    if (r.url().endsWith('.woff2')) respostas.push({ url: r.url(), tipo: r.headers()['content-type'] });
  });
  await page.goto(caminho);
  await page.evaluate(() => document.fonts.ready);
  const r = await page.evaluate(() => {
    const primeira = (ff: string) => ff.split(',')[0]!.trim().replace(/^['"]|['"]$/g, '');
    const mono = document.querySelector('.font-mono');
    // O src vem com a base da folha: o build grava a URL relativa ao CSS (`../media/x.woff2`), e é contra ela que o
    // navegador a resolve.
    const regras: { base: string; src: string }[] = [];
    for (const folha of [...document.styleSheets])
      for (const regra of [...folha.cssRules]) if (regra instanceof CSSFontFaceRule) regras.push({ base: folha.href ?? document.baseURI, src: regra.style.getPropertyValue('src') });
    return {
      corpo: primeira(getComputedStyle(document.body).fontFamily),
      mono: mono ? primeira(getComputedStyle(mono).fontFamily) : null,
      carregadas: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/^['"]|['"]$/g, '')),
      regras,
    };
  });
  expect(r.carregadas).toContain(r.corpo);
  if (temMono) expect(r.carregadas).toContain(r.mono);
  expect(r.regras.length).toBeGreaterThan(0);
  const origem = new URL(page.url()).origin;
  // Cada parte do src é local(...) ou url(...) de .woff2 que, resolvida contra a folha, fica na mesma origem, em
  // /_next/static/media/ (CV-04).
  for (const { base, src } of r.regras)
    for (const parte of src.split(/,\s*(?=url|local)/)) {
      const p = parte.trim();
      expect(p).toMatch(/^(?:url\("?[^")]+\.woff2"?\)(?:\s*format\("woff2"\))?|local\([^)]*\))$/);
      const endereco = /^url\("?([^")]+)"?\)/.exec(p)?.[1];
      if (endereco !== undefined) {
        const absoluto = new URL(endereco, base);
        expect({ origem: absoluto.origin, caminho: absoluto.pathname }).toEqual({ origem, caminho: expect.stringMatching(/^\/_next\/static\/media\/[^/]+\.woff2$/) });
      }
    }
  expect(respostas.length).toBeGreaterThan(0);
  for (const x of respostas) expect({ origem: new URL(x.url).origin, tipo: x.tipo }).toEqual({ origem, tipo: 'font/woff2' });
}

test('CV-04 na T01: Noto Sans carregada da mesma origem', async ({ page }) => {
  await conferirFontes(page, '/entrar', false);
});

test('CV-04 na T03: Noto Sans e Noto Sans Mono (ids) carregadas', async ({ page }) => {
  await entrarComo(page, 'cto'); // pela API: não navega
  await conferirFontes(page, '/demandas', true);
});

test('CV-04 na T11: o DEC do seed (o mesmo da axe-todas) com as duas famílias', async ({ page }) => {
  await entrarComo(page, 'cto'); // pela API: não navega
  const { itens } = await api<{ itens: { id: string; titulo: string }[] }>(page, 'GET', '/api/demandas?tipo=bug&limit=100');
  const bug = itens.find((x) => x.titulo === TITULO_BUG_DO_SEED);
  if (!bug) throw new Error('e2e: o seed não tem a demanda de tipo bug');
  await conferirFontes(page, `/pacotes-decisao/DEC-${bug.id}-v1`, true);
});
