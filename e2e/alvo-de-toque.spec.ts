// T16 do DEC-DEM-20261110-0015-v1 (RNF-03; 03, 2.4): em 390 × 844, todo controle de T03, T05, T11 e da gaveta tem alvo
// de 44 × 44 px no mínimo. Entram botão, campo, seleção, área de texto, rádio, caixa de seleção e link solto (fora de
// frase: "Nesta página", "Ver", "Limpar filtros", "Ver agentes e teto", trilha, id da demanda). Ficam de fora:
//   - o link dentro de frase (o texto do bloco dele é maior que o do link), pela 03, 2.4;
//   - o que não está na tela nesta largura (display: none, sr-only como o "Pular para o conteúdo" sem foco).
// O alvo do rádio e da caixa de seleção é a linha que junta o controle e o rótulo (a linha `min-h-11` do GrupoOpcoes e
// da CaixaSelecao; no cartão de opção, o cartão inteiro, que o rótulo estica).
//
// C-36: só lê. Usa as demandas do seed (TITULOS_DO_E2E.decisaoRecomendaB, a mesma que a decisao-celular-qa só lê) e não
// cria demanda nem versão, em nenhuma conta. Contas: "administradora" (T03, T05 e T11) e "cto" (gaveta).
import type { Page } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { api, demandaDoSeed, entrarComo, expect, test } from './apoio';

const MINIMO = 44;

test.use({ viewport: { width: 390, height: 844 } });

// Os controles visíveis dentro de `raiz` com alvo abaixo de 44 × 44 px, descritos como "tag#id "texto" L×A".
async function alvosPequenos(page: Page, raiz: string): Promise<string[]> {
  return page.evaluate(
    ({ raiz, minimo }) => {
      const naTela = (e: Element) => {
        if (e.getClientRects().length === 0) return false;
        const s = getComputedStyle(e);
        if (s.visibility === 'hidden') return false;
        const r = e.getBoundingClientRect();
        // sr-only (1 × 1 px, recortado): não é alvo de toque até receber foco.
        return !(r.width <= 1 && r.height <= 1);
      };
      const dentroDeFrase = (a: Element) => {
        const bloco = a.parentElement;
        if (!bloco) return false;
        return (bloco.textContent ?? '').trim().length > (a.textContent ?? '').trim().length;
      };
      const alvoDe = (c: Element): Element => {
        if (c instanceof HTMLInputElement && (c.type === 'radio' || c.type === 'checkbox')) {
          const cartao = c.closest('.isolate');
          return cartao ?? c.parentElement ?? c;
        }
        return c;
      };
      const seletor = 'button, select, textarea, input:not([type="hidden"]), a[href], [role="switch"], [role="button"]';
      const pequenos: string[] = [];
      for (const area of document.querySelectorAll(raiz)) {
        for (const c of area.querySelectorAll(seletor)) {
          if (!naTela(c) || c.closest('[inert]')) continue;
          if (c.tagName === 'A' && dentroDeFrase(c)) continue;
          const r = alvoDe(c).getBoundingClientRect();
          if (r.width < minimo - 0.5 || r.height < minimo - 0.5) {
            const texto = (c.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
            pequenos.push(`${c.tagName.toLowerCase()}#${c.id} "${texto}" ${Math.round(r.width)}×${Math.round(r.height)}`);
          }
        }
      }
      return pequenos;
    },
    { raiz, minimo: MINIMO },
  );
}

// Abre o recolhível. O clique antes da hidratação não faz nada; ele só se repete enquanto o botão segue fechado.
async function abrirRecolhivel(page: Page, nome: RegExp): Promise<void> {
  const botao = page.locator('main').getByRole('button', { name: nome });
  await expect(async () => {
    if ((await botao.getAttribute('aria-expanded')) !== 'true') await botao.click({ timeout: 1_000 });
    await expect(botao).toHaveAttribute('aria-expanded', 'true', { timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
}

async function decDeAgenteDoSeed(page: Page): Promise<{ demandaId: string; decId: string }> {
  const demandaId = await demandaDoSeed(page, TITULOS_DO_E2E.decisaoRecomendaB);
  const [primeiro] = (await api<{ itens: { id: string }[] }>(page, 'GET', `/api/demandas/${demandaId}/pacotes-decisao`)).itens;
  if (!primeiro) throw new Error('e2e: o seed não tem o DEC de agente da decisaoRecomendaB');
  return { demandaId, decId: primeiro.id };
}

test('RNF-03: T03 Fila em 390 px, com "Mais filtros" aberto: todo controle com 44 × 44 px', async ({ page }) => {
  await entrarComo(page, 'administradora');
  await page.goto('/demandas');
  await expect(page.locator('main').getByRole('status')).toHaveText(/^[\d.]+ demandas? encontradas?\.$/);
  await expect(page.locator('main ul[aria-labelledby="resultado-da-fila"] > li').first()).toBeVisible();
  await abrirRecolhivel(page, /^Mais filtros/);
  expect(await alvosPequenos(page, 'header, main')).toEqual([]);
});

test('RNF-03: T05 Detalhe em 390 px: todo controle com 44 × 44 px', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const { demandaId } = await decDeAgenteDoSeed(page);
  await page.goto(`/demandas/${demandaId}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await alvosPequenos(page, 'header, main')).toEqual([]);
});

test('RNF-03: T11 Decisão em 390 px, com o recolhível aberto: todo controle com 44 × 44 px', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const { decId } = await decDeAgenteDoSeed(page);
  await page.goto(`/pacotes-decisao/${decId}`);
  await expect(page.locator('#rodape-da-decisao')).toBeVisible();
  expect(await alvosPequenos(page, 'header, main')).toEqual([]);
  await abrirRecolhivel(page, /^Ver /);
  expect(await alvosPequenos(page, 'header, main')).toEqual([]);
});

test('RNF-03: gaveta aberta em 390 px: todo controle com 44 × 44 px', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/demandas');
  const gaveta = page.getByRole('dialog', { name: 'Menu' });
  await expect(async () => {
    if (!(await gaveta.isVisible())) await page.getByRole('button', { name: 'Menu', exact: true }).click({ timeout: 1_000 });
    await expect(gaveta).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
  await gaveta.evaluate((d) => Promise.all(d.getAnimations().map((a) => a.finished)).then(() => undefined));
  expect(await alvosPequenos(page, 'dialog#gaveta-menu')).toEqual([]);
});
