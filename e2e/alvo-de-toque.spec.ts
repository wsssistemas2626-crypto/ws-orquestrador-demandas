// T16 do DEC-DEM-20261110-0015-v1 (RNF-03; 03, 2.4): em 390 × 844, todo controle de T03, T05, T11 e da gaveta tem alvo
// de 44 × 44 px no mínimo. Entram botão, campo, seleção, área de texto, rádio, caixa de seleção e link solto (fora de
// frase: "Nesta página", "Ver", "Limpar filtros", "Ver agentes e teto", trilha, id da demanda). Ficam de fora:
//   - o link dentro de frase, pela 03, 2.4: o pai dele tem um nó de texto direto, não vazio, ao lado do link (como em
//     "<p>Texto <a>link</a>.</p>"). Um pai que só junta elementos (o id do cartão ao lado do Selo; "Ver agentes e teto"
//     ao lado do <p> do Alerta) não faz do link um link de frase, e ele é medido (06-T16-testes, Minor 1 da
//     06-T16-tech-lead);
//   - o que não está na tela nesta largura (display: none, sr-only como o "Pular para o conteúdo" sem foco).
// O alvo do rádio e da caixa de seleção é a linha que junta o controle e o rótulo (a linha `min-h-11` do GrupoOpcoes e
// da CaixaSelecao; no cartão de opção, o cartão inteiro, que o rótulo estica).
// "Ver agentes e teto" só aparece com os agentes suspensos pelo teto, estado que esta spec não cria (ela só lê). A
// classe dele (`min-h-11`, `md:min-h-6`) e o lugar dele no Alerta, fora do <p>, são conferidos no HTML, em
// src/components/componentes-qa.test.ts.
//
// C-36: só lê. Usa as demandas do seed (TITULOS_DO_E2E.decisaoRecomendaB, a mesma que a decisao-celular-qa só lê) e não
// cria demanda nem versão, em nenhuma conta. Contas: "administradora" (T03, T05 e T11) e "cto" (gaveta).
import type { Page } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { abrirGaveta, abrirRecolhivel, api, demandaDoSeed, entrarComo, expect, test } from './apoio';

const MINIMO = 44;

test.use({ viewport: { width: 390, height: 844 } });

type Medida = {
  // Cada link solto medido, como `a "texto"`: prova de que a vigia olha para ele (06-T16-testes).
  linksMedidos: string[];
  // Os controles com alvo abaixo de 44 × 44 px, como `tag#id "texto" L×A`.
  pequenos: string[];
};

// Mede os controles visíveis dentro de `raiz`.
async function medirAlvos(page: Page, raiz: string): Promise<Medida> {
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
      // Link de frase: o pai tem texto solto ao lado do link. O texto de um elemento irmão (Selo, <p>) não conta.
      const dentroDeFrase = (a: Element) => {
        const bloco = a.parentElement;
        if (!bloco) return false;
        return [...bloco.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '');
      };
      const alvoDe = (c: Element): Element => {
        if (c instanceof HTMLInputElement && (c.type === 'radio' || c.type === 'checkbox')) {
          const cartao = c.closest('.isolate');
          return cartao ?? c.parentElement ?? c;
        }
        return c;
      };
      const textoDe = (c: Element) => (c.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
      const seletor = 'button, select, textarea, input:not([type="hidden"]), a[href], [role="switch"], [role="button"]';
      const linksMedidos: string[] = [];
      const pequenos: string[] = [];
      for (const area of document.querySelectorAll(raiz)) {
        for (const c of area.querySelectorAll(seletor)) {
          if (!naTela(c) || c.closest('[inert]')) continue;
          if (c.tagName === 'A') {
            if (dentroDeFrase(c)) continue;
            linksMedidos.push(`a "${textoDe(c)}"`);
          }
          const r = alvoDe(c).getBoundingClientRect();
          if (r.width < minimo - 0.5 || r.height < minimo - 0.5) {
            pequenos.push(`${c.tagName.toLowerCase()}#${c.id} "${textoDe(c)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
          }
        }
      }
      return { linksMedidos, pequenos };
    },
    { raiz, minimo: MINIMO },
  );
}

async function alvosPequenos(page: Page, raiz: string): Promise<string[]> {
  return (await medirAlvos(page, raiz)).pequenos;
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
  const { linksMedidos, pequenos } = await medirAlvos(page, 'header, main');
  expect(pequenos).toEqual([]);
  // 06-T16-testes: o id do cartão (pai com o Selo ao lado) é link solto e entra na medida.
  expect(linksMedidos, 'id da demanda no cartão medido').toContainEqual(expect.stringMatching(/^a "DEM-\d{8}-\d{4}"$/));
});

test('RNF-03: T05 Detalhe em 390 px: todo controle com 44 × 44 px', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const { demandaId } = await decDeAgenteDoSeed(page);
  await page.goto(`/demandas/${demandaId}`);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const { linksMedidos, pequenos } = await medirAlvos(page, 'header, main');
  expect(pequenos).toEqual([]);
  // 06-T16-testes: o "Ver" das tabelas de versões, o que a T16 aumentou para 44 px, entra na medida.
  expect(linksMedidos, '"Ver" das versões medido').toContain('a "Ver"');
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
  await abrirGaveta(page);
  expect(await alvosPequenos(page, 'dialog#gaveta-menu')).toEqual([]);
});
