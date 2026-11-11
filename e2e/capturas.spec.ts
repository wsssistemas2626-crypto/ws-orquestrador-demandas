// T17 do DEC-DEM-20261110-0015-v1: as nove capturas de tela do manual (RF-17, CA-17.2), T01, T03, T05 e T11 em
// 1280 × 720 e em 390 × 844, mais a gaveta do menu aberta em 390 px. As regras puras ficam em e2e/capturas.ts.
//   - CV-17: todo teste é pulado com CI no ambiente ou com a baseURL fora do loopback; só o seed fictício
//     (scripts/seed-ficticio.ts) aparece; a T02 (QR, segredo TOTP e códigos de recuperação) não é capturada.
//   - D-04: a captura que já existe é pulada antes de entrar, salvo se estiver em REGRAVAR. As nove nascem no primeiro
//     `pnpm test:e2e` da T17, e as rodadas seguintes pulam (a árvore continua limpa).
//   - C-36 (G3.10 do plano): só lê. A T05 e a T11 usam a demanda `etapasDupla` do seed (ESP, RSK e o DEC "CTO e
//     administradora" com só a aprovação do CTO na opção A): a T11 abre na conta administradora, que ainda não aprovou e
//     vê o formulário, sem registrar nada.
import { existsSync, mkdirSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { abrirGaveta, demandaDoSeed, entrarComo, expect, test } from './apoio';
import { deveGravar, PASTA_DAS_CAPTURAS, podeCapturar, type NomeDaCaptura } from './capturas';

test.beforeEach(({ baseURL }) => {
  test.skip(!podeCapturar(baseURL, process.env.CI), 'CV-17: capturas só em loopback e fora do CI');
});

// O arquivo da captura; pula o teste se ele já existe e não está em REGRAVAR (D-04).
function arquivoDa(nome: NomeDaCaptura): string {
  const arquivo = `${PASTA_DAS_CAPTURAS}${nome}.png`;
  test.skip(!deveGravar(nome, existsSync(arquivo)), `${nome}.png já existe (D-04)`);
  return arquivo;
}

// Só a janela, do topo, com as fontes Noto já carregadas e sem animação em curso.
async function capturar(page: Page, arquivo: string): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  mkdirSync(PASTA_DAS_CAPTURAS, { recursive: true });
  await page.screenshot({ path: arquivo, fullPage: false, animations: 'disabled' });
}

// A fila carregada: o anúncio do resultado só existe depois da lista.
async function filaCarregada(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: 'Demandas' })).toBeVisible();
  await expect(page.locator('main').getByRole('status')).toHaveText(/^[\d.]+ demandas? encontradas?\.$/);
}

for (const [largura, altura] of [[1280, 720], [390, 844]] as const) {
  test.describe(`${largura} px`, () => {
    test.use({ viewport: { width: largura, height: altura } });

    test('T01 Entrar', async ({ page }) => {
      const arquivo = arquivoDa(`t01-entrar-${largura}`);
      await page.goto('/entrar');
      await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible();
      await capturar(page, arquivo);
    });

    test('T03 Fila', async ({ page }) => {
      const arquivo = arquivoDa(`t03-fila-${largura}`);
      await entrarComo(page, 'cto');
      await page.goto('/demandas');
      await filaCarregada(page);
      await capturar(page, arquivo);
    });

    test('T05 Detalhe da demanda', async ({ page }) => {
      const arquivo = arquivoDa(`t05-demanda-${largura}`);
      await entrarComo(page, 'cto');
      const id = await demandaDoSeed(page, TITULOS_DO_E2E.etapasDupla);
      await page.goto(`/demandas/${id}`);
      await expect(page.getByRole('heading', { level: 1, name: TITULOS_DO_E2E.etapasDupla })).toBeVisible();
      await expect(page.getByRole('list', { name: 'Etapas da demanda' })).toBeVisible();
      await expect(page.getByRole('region', { name: 'Próxima ação' })).toContainText('Quem age: Administradora');
      await capturar(page, arquivo);
    });

    test('T11 Decisão', async ({ page }) => {
      const arquivo = arquivoDa(`t11-decisao-${largura}`);
      await entrarComo(page, 'administradora');
      const id = await demandaDoSeed(page, TITULOS_DO_E2E.etapasDupla);
      await page.goto(`/pacotes-decisao/DEC-${id}-v1`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Decisão: /);
      await expect(page.locator('main form')).toHaveCount(1);
      await expect(page.getByRole('group', { name: 'Ações da decisão', exact: true }).getByRole('button', { name: 'Aprovar a opção A' })).toBeVisible();
      await capturar(page, arquivo);
    });
  });
}

test.describe('390 px, gaveta', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Gaveta do menu aberta', async ({ page }) => {
    const arquivo = arquivoDa('gaveta-aberta-390');
    await entrarComo(page, 'cto');
    await page.goto('/demandas');
    await filaCarregada(page);
    await abrirGaveta(page);
    await capturar(page, arquivo);
  });
});
