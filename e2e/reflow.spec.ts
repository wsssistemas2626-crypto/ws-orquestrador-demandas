// T14 (DEC-DEM-20261110-0015-v1; RF-14, CA-14.2, RNF-05; 03, 8.2): as telas de formulário com cartões e tokens. Em 390
// e em 320 px, nenhuma rolagem horizontal da página (WCAG 1.4.10); em toda largura, cada fieldset, seção e campo do
// formulário dentro de um cartão (`Cartao`, classe `rounded-cartao`), e o formulário com até 760 px no computador. A
// T15 acrescenta T09, T10 e T12 aqui. Nenhum teste cria demanda nem versão (C-36, G3.10): T06, T07 e T08 abrem a
// demanda do seed `espListaDeTextos` e só leem. Um login por largura, para o TOTP não receber 429 (06-T05).
import type { Page } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { demandaDoSeed, entrarComo, expect, semViolacoes, test } from './apoio';

// Cartões que cada formulário tem com os agentes desligados (o e2e sobe com eles desligados): um por fieldset ou seção
// de hoje, e um por campo solto (03, 8.2).
type Tela = { nome: string; caminho: (id: string) => string; titulo: string; cartoes: number };
const TELAS: readonly Tela[] = [
  // Texto recebido, Solicitante, Classificação, Descrição e Anexos.
  { nome: 'T04 Nova demanda', caminho: () => '/demandas/nova', titulo: 'Nova demanda', cartoes: 5 },
  // Solicitante, Classificação, Descrição e Anexos.
  { nome: 'T06 Editar dados', caminho: (id) => `/demandas/${id}/editar`, titulo: 'Editar dados da demanda', cartoes: 4 },
  // Problema, Escopo, Sistemas envolvidos, Dados, Restrições técnicas, Dúvidas em aberto e Construção.
  { nome: 'T07 Nova ESP', caminho: (id) => `/demandas/${id}/especificacoes/nova`, titulo: 'Nova versão da especificação técnica', cartoes: 7 },
  // Resumo, os três riscos, Recomendações de mitigação, Pré-condições e "Quando envolver…".
  { nome: 'T08 Novo RSK', caminho: (id) => `/demandas/${id}/pareceres-risco/novo`, titulo: 'Novo parecer de risco', cartoes: 7 },
];

async function abrir(page: Page, tela: Tela, id: string): Promise<void> {
  await page.goto(tela.caminho(id));
  await expect(page.getByRole('heading', { level: 1, name: tela.titulo, exact: true })).toBeVisible();
}

async function semRolagemLateral(page: Page, rotulo: string): Promise<void> {
  const r = await page.evaluate(() => ({ largura: document.documentElement.scrollWidth, janela: window.innerWidth }));
  expect(r.largura, `${rotulo}: largura da página`).toBeLessThanOrEqual(r.janela);
}

// Cada fieldset, seção e campo do formulário fica dentro de um cartão; e o número de cartões é o da tela.
async function camposEmCartoes(page: Page, tela: Tela): Promise<void> {
  const r = await page.evaluate(() => {
    const form = document.querySelector('main form');
    if (!form) return null;
    const elementos = [...form.querySelectorAll('fieldset, section, input, select, textarea')];
    return {
      cartoes: form.querySelectorAll('.rounded-cartao').length,
      fora: elementos.filter((e) => !e.closest('.rounded-cartao')).map((e) => `${e.tagName.toLowerCase()}#${e.id}`),
    };
  });
  expect(r, `${tela.nome}: o formulário`).not.toBeNull();
  expect(r!.fora, `${tela.nome}: fora de cartão`).toEqual([]);
  expect(r!.cartoes, `${tela.nome}: cartões`).toBe(tela.cartoes);
}

for (const [largura, conta] of [
  [390, 'cto'],
  [320, 'administradora'],
] as const) {
  test.describe(`${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 844 } });

    test('T04, T06, T07 e T08: sem rolagem lateral, e cada campo num cartão', async ({ page }) => {
      await entrarComo(page, conta);
      const id = await demandaDoSeed(page, TITULOS_DO_E2E.espListaDeTextos);
      for (const tela of TELAS) {
        await abrir(page, tela, id);
        await semRolagemLateral(page, `${tela.nome} em ${largura} px`);
        await camposEmCartoes(page, tela);
        if (largura === 390) await semViolacoes(page, `${tela.nome} em 390 px`);
      }
    });
  });
}

test.describe('1280 px', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('T04, T06, T07 e T08: cada campo num cartão e o formulário com até 760 px', async ({ page }) => {
    await entrarComo(page, 'administradora');
    const id = await demandaDoSeed(page, TITULOS_DO_E2E.espListaDeTextos);
    for (const tela of TELAS) {
      await abrir(page, tela, id);
      await camposEmCartoes(page, tela);
      const largura = await page.locator('main form').evaluate((f) => f.getBoundingClientRect().width);
      expect(largura, `${tela.nome}: largura do formulário`).toBeLessThanOrEqual(760);
    }
  });
});
