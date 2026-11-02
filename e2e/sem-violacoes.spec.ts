// DEC-DEM-20261102-0002-v1: o `semViolacoes` (e2e/apoio.ts) e o <title> da página. Depois de uma Server Action, o Next 16
// re-renderiza a página e o metadado chega por streaming, depois do corpo: no CI, o axe rodou nesse intervalo e acusou
// `document-title` em telas que têm título (agentes-teto.spec.ts, "T12 com agente ligado"; decisao.spec.ts, "T11
// decidido"). O tempo do streaming não se controla no teste, então o teste monta o estado que o axe viu: a página pronta e
// sem <title>.
//   - corrida: o título some e volta 500 ms depois; o `semViolacoes` espera o título e passa;
//   - controle negativo: o título some e não volta; o `semViolacoes` reprova pela regra `document-title`, que continua
//     ligada (nenhuma regra do axe é desligada nem filtrada).
//
// C-36 (06-T43-tech-lead e 06-T44-tech-lead, "C-36"): esta spec não cria demanda nem versão, em nenhuma conta.
//   - conta "cto": 0 demandas e 0 versões;
//   - conta "administradora": 0 demandas e 0 versões.
import { expect, test, type Page } from '@playwright/test';
import { entrarComo, semViolacoes } from './apoio';

const TITULO = 'Agentes e teto de gasto — WS Orquestrador de Demandas';

async function abrirComTitulo(page: Page): Promise<void> {
  await entrarComo(page, 'cto');
  await page.goto('/configuracao/agentes');
  await expect(page.getByRole('heading', { level: 1, name: 'Agentes e teto de gasto' })).toBeVisible();
  await expect(page).toHaveTitle(TITULO);
}

const tirarTitulo = (page: Page) => page.evaluate(() => document.querySelectorAll('title').forEach((t) => t.remove()));

test('corrida: o <title> chega 500 ms depois do corpo; o axe espera o título e não acusa violação', async ({ page }) => {
  await abrirComTitulo(page);
  await tirarTitulo(page);
  await expect(page).toHaveTitle('');
  await page.evaluate((titulo) => {
    setTimeout(() => {
      document.title = titulo;
    }, 500);
  }, TITULO);
  await semViolacoes(page, 'T12 com o título atrasado');
  await expect(page).toHaveTitle(TITULO);
});

test('controle negativo: tela sem <title> continua reprovada pela regra document-title', async ({ page }) => {
  await abrirComTitulo(page);
  await tirarTitulo(page);
  await expect(page).toHaveTitle('');
  await expect(semViolacoes(page, 'T12 sem título')).rejects.toThrow(/document-title/);
});
