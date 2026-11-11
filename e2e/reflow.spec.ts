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

// T15 (RF-14, CA-14.2, RNF-05; 03, 8.2): T09 Novo pacote de decisão (formulário, com as mesmas regras de T04 a T08), T10
// Ver versão de ESP e de RSK e T12 Agentes e teto (leitura em seções: cada seção num cartão; a tabela da T12 com a
// rolagem própria de hoje). Usa a demanda do seed `etapasDupla`, a única que nasce com ESP e RSK (a T09 só mostra o
// formulário com as duas), e só lê: nada é gravado, e a T12 não é alterada (C-36, G3.10).
const T09: Tela = {
  nome: 'T09 Novo pacote de decisão',
  caminho: (id) => `/demandas/${id}/pacotes-decisao/novo`,
  titulo: 'Novo pacote de decisão',
  // Resumo executivo, Opção A, Opção B, Recomendação e o nível de aprovação.
  cartoes: 5,
};

type TelaDeLeitura = { nome: string; caminho: (id: string) => string; titulo: RegExp; cartoes: number };
const TELAS_DE_LEITURA: readonly TelaDeLeitura[] = [
  // Problema, Escopo, Sistemas envolvidos, Dados, Restrições técnicas, Dúvidas em aberto e Construção.
  { nome: 'T10 Ver ESP', caminho: (id) => `/especificacoes/ESP-${id}-v1`, titulo: /^Especificação técnica v1 — /, cartoes: 7 },
  // Resumo, os três riscos, Recomendações de mitigação, Pré-condições e "Quando envolver…".
  { nome: 'T10 Ver RSK', caminho: (id) => `/pareceres-risco/RSK-${id}-v1`, titulo: /^Parecer de risco v1 — /, cartoes: 7 },
  // Gasto do mês e Agentes.
  { nome: 'T12 Agentes e teto', caminho: () => '/configuracao/agentes', titulo: /^Agentes e teto de gasto$/, cartoes: 2 },
];

async function abrirLeitura(page: Page, tela: TelaDeLeitura, id: string): Promise<void> {
  await page.goto(tela.caminho(id));
  await expect(page.getByRole('heading', { level: 1, name: tela.titulo })).toBeVisible();
}

// Cada seção, título de seção, lista de definição, tabela e campo da página dentro de um cartão (o `Cartao` é um
// `section`); e o número de cartões é o da tela. O diálogo da T12 (fechado) fica dentro do cartão "Agentes".
async function secoesEmCartoes(page: Page, tela: TelaDeLeitura): Promise<void> {
  const r = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return null;
    const elementos = [...main.querySelectorAll('section, h2, dl, table, fieldset, input, select, textarea')];
    return {
      cartoes: main.querySelectorAll('section.rounded-cartao').length,
      // T16 (Minor 2 da 06-T15-tech-lead): só o cartão (`section`) conta; o <dialog> da T12 também tem `rounded-cartao`
      // e não pode ser o cartão dos próprios campos.
      fora: elementos.filter((e) => !e.closest('section.rounded-cartao')).map((e) => `${e.tagName.toLowerCase()}#${e.id}`),
    };
  });
  expect(r, `${tela.nome}: a página`).not.toBeNull();
  expect(r!.fora, `${tela.nome}: fora de cartão`).toEqual([]);
  expect(r!.cartoes, `${tela.nome}: cartões`).toBe(tela.cartoes);
}

for (const [largura, conta] of [
  [390, 'administradora'],
  [320, 'cto'],
] as const) {
  test.describe(`T15 em ${largura} px`, () => {
    test.use({ viewport: { width: largura, height: 844 } });

    test('T09, T10 e T12: sem rolagem lateral, e cada seção num cartão', async ({ page }) => {
      await entrarComo(page, conta);
      const id = await demandaDoSeed(page, TITULOS_DO_E2E.etapasDupla);
      await abrir(page, T09, id);
      await semRolagemLateral(page, `${T09.nome} em ${largura} px`);
      await camposEmCartoes(page, T09);
      if (largura === 390) await semViolacoes(page, `${T09.nome} em 390 px`);
      for (const tela of TELAS_DE_LEITURA) {
        await abrirLeitura(page, tela, id);
        await semRolagemLateral(page, `${tela.nome} em ${largura} px`);
        await secoesEmCartoes(page, tela);
        if (largura === 390) await semViolacoes(page, `${tela.nome} em 390 px`);
      }
    });
  });
}

test.describe('T15 em 1280 px', () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test('T09, T10 e T12: cada seção num cartão, e o formulário da T09 com até 760 px', async ({ page }) => {
    await entrarComo(page, 'administradora');
    const id = await demandaDoSeed(page, TITULOS_DO_E2E.etapasDupla);
    await abrir(page, T09, id);
    await camposEmCartoes(page, T09);
    const largura = await page.locator('main form').evaluate((f) => f.getBoundingClientRect().width);
    expect(largura, `${T09.nome}: largura do formulário`).toBeLessThanOrEqual(760);
    await semViolacoes(page, `${T09.nome} em 1280 px`);
    for (const tela of TELAS_DE_LEITURA) {
      await abrirLeitura(page, tela, id);
      await secoesEmCartoes(page, tela);
      await semViolacoes(page, `${tela.nome} em 1280 px`);
    }
  });
});
