// T11 (DEC-DEM-20261110-0015-v1): T05 Detalhe da demanda no arranjo A2 (03, seção 5): barra das cinco etapas (RF-08),
// cartão "Próxima ação" (RF-09) e o detalhe sem perder nada, com o histórico em lista (RF-10), nas duas larguras de
// teste (1280 × 720 e 390 × 844).
//
// C-36 (G3.10 do plano): só lê. As demandas são as do seed fictício (scripts/seed-ficticio.ts, TITULOS_DO_E2E, T06):
// a `etapasDupla` nasce com ESP v1, RSK v1 e o DEC v1 "CTO e administradora" com só a aprovação do CTO na opção A, e a
// `etapasSemVersoes` sem nenhuma versão. Nenhum teste grava versão nem decide nessas demandas: o estado delas é o que os
// critérios conferem (pendências da T06 e da T10).
import type { Page } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { api, demandaDoSeed, entrarComo, expect, semViolacoes, test } from './apoio';

const COMPUTADOR = { width: 1280, height: 720 } as const;
const CELULAR = { width: 390, height: 844 } as const;
const SECOES = ['Dados', 'Versões', 'Mudar status', 'Texto recebido', 'Histórico'] as const;

const barra = (page: Page) => page.getByRole('list', { name: 'Etapas da demanda' });
const proximaAcao = (page: Page) => page.getByRole('region', { name: 'Próxima ação' });
const secao = (page: Page, nome: string) => page.getByRole('region', { name: nome, exact: true });
const titulo2 = (page: Page, nome: string) => page.getByRole('heading', { level: 2, name: nome, exact: true });

async function abrir(page: Page, titulo: string): Promise<string> {
  const id = await demandaDoSeed(page, titulo);
  await page.goto(`/demandas/${id}`);
  await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
  return id;
}

// O axe conta como alvo pequeno o controle que, com a página rolada, fica sob a barra fixa do celular; a verificação
// volta ao topo, como no detalhe-demanda.spec.
async function axeNasDuasLarguras(page: Page, rotulo: string): Promise<void> {
  await page.setViewportSize(COMPUTADOR);
  await page.evaluate(() => window.scrollTo(0, 0));
  await semViolacoes(page, `${rotulo} em 1280 px`);
  await page.setViewportSize(CELULAR);
  await page.evaluate(() => window.scrollTo(0, 0));
  await semViolacoes(page, `${rotulo} em 390 px`);
  await page.setViewportSize(COMPUTADOR);
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize(COMPUTADOR);
  await entrarComo(page, 'cto');
});

test('CA-08.1 e CA-09.1: etapasDupla → estados da barra, etapa 4 atual e Próxima ação para a administradora', async ({ page }) => {
  const id = await abrir(page, TITULOS_DO_E2E.etapasDupla);
  const etapas = barra(page).getByRole('listitem');
  await expect(etapas).toHaveCount(5);
  await expect(etapas).toContainText(['Demanda', 'Especificação', 'Parecer de risco', 'Decisão', 'Pedido de Construção']);
  await expect(etapas).toContainText(['Registrada', 'Feita', 'Feito', '1 de 2 aprovações', 'Depois da aprovação']);
  await expect(etapas).toContainText([id, `ESP-${id}-v1`, `RSK-${id}-v1`, `DEC-${id}-v1`, 'Nenhuma']);
  await expect(barra(page).locator('[aria-current="step"]')).toHaveCount(1);
  await expect(barra(page).locator('[aria-current="step"]')).toContainText('Decisão');
  await expect(etapas.nth(3)).toHaveAttribute('aria-current', 'step');

  const cartao = proximaAcao(page);
  await expect(cartao).toContainText('Decidir entre as opções A e B.');
  await expect(cartao).toContainText('O CTO já aprovou a opção A. Falta a aprovação da administradora, com o identificador do documento assinado.');
  await expect(cartao).toContainText('Quem age: Administradora');
  const abrirDecisao = cartao.getByRole('link', { name: 'Abrir a decisão' });
  await expect(abrirDecisao).toHaveAttribute('href', `/pacotes-decisao/DEC-${id}-v1`);
  // CV-09: o cartão e a barra citam só o papel de quem aprovou, nunca o nome.
  await expect(cartao).not.toContainText('Pessoa Ficticia');
  await expect(barra(page)).not.toContainText('Pessoa Ficticia');
  await axeNasDuasLarguras(page, 'T05 com uma de duas aprovações');

  await abrirDecisao.click();
  await expect(page).toHaveURL(new RegExp(`/pacotes-decisao/DEC-${id}-v1$`));
});

test('CA-08.2: etapasSemVersoes → Especificação "Por fazer", "Nenhuma" e atual; Próxima ação linha 4 com link para a T07', async ({ page }) => {
  const id = await abrir(page, TITULOS_DO_E2E.etapasSemVersoes);
  const especificacao = barra(page).getByRole('listitem').nth(1);
  await expect(especificacao).toContainText('Especificação');
  await expect(especificacao).toContainText('Nenhuma');
  await expect(especificacao).toContainText('Por fazer');
  await expect(especificacao).toHaveAttribute('aria-current', 'step');
  await expect(barra(page).locator('[aria-current="step"]')).toHaveCount(1);

  const cartao = proximaAcao(page);
  await expect(cartao).toContainText('Escrever a especificação técnica.');
  await expect(cartao).toContainText('Quem age: Agente de insumo técnico ou uma pessoa');
  await expect(cartao.getByRole('link', { name: 'Escrever a especificação' })).toHaveAttribute('href', `/demandas/${id}/especificacoes/nova`);
  // O cartão só informa (RF-09): as versões continuam com os textos e os botões de hoje.
  await expect(secao(page, 'Versões')).toContainText('Nenhuma especificação técnica ainda.');
  await expect(secao(page, 'Versões').getByRole('link', { name: 'Nova versão da ESP' })).toBeVisible();
  await axeNasDuasLarguras(page, 'T05 sem versões');
});

test('CA-10.1: Dados, Versões, Status, Texto recebido e Histórico em 1280 e em 390 px; cada link de "Nesta página" foca o h2', async ({ page }) => {
  const id = await demandaDoSeed(page, TITULOS_DO_E2E.etapasDupla);
  for (const tamanho of [COMPUTADOR, CELULAR]) {
    await page.setViewportSize(tamanho);
    await page.goto(`/demandas/${id}`);
    for (const nome of SECOES) await expect(titulo2(page, nome), `${nome} em ${tamanho.width} px`).toBeVisible();
    const nav = page.getByRole('navigation', { name: 'Nesta página' });
    await expect(nav.getByRole('link')).toHaveText([...SECOES]);
    for (const nome of SECOES) {
      await nav.getByRole('link', { name: nome, exact: true }).click();
      await expect(titulo2(page, nome), `${nome} em ${tamanho.width} px`).toBeFocused();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `sem rolagem lateral em ${tamanho.width} px`).toBeLessThanOrEqual(tamanho.width);
  }
});

test('arranjo A2: a partir de 1200 px, Próxima ação e Histórico na coluna lateral; em 390 px, uma coluna na ordem do DOM', async ({ page }) => {
  await abrir(page, TITULOS_DO_E2E.etapasDupla);
  const caixa = async (nome: 'Próxima ação' | 'Dados' | 'Histórico') => {
    const c = await (nome === 'Próxima ação' ? proximaAcao(page) : secao(page, nome)).boundingBox();
    if (!c) throw new Error(`e2e: ${nome} sem caixa`);
    return c;
  };
  let [acao, dados, historico] = [await caixa('Próxima ação'), await caixa('Dados'), await caixa('Histórico')];
  expect(acao.x, 'Próxima ação à direita de Dados').toBeGreaterThanOrEqual(dados.x + dados.width);
  expect(historico.x, 'Histórico na mesma coluna da Próxima ação').toBe(acao.x);
  expect(historico.y, 'Histórico abaixo da Próxima ação').toBeGreaterThan(acao.y);

  await page.setViewportSize(CELULAR);
  [acao, dados, historico] = [await caixa('Próxima ação'), await caixa('Dados'), await caixa('Histórico')];
  expect(acao.x, 'uma coluna').toBe(dados.x);
  expect(acao.y, 'Próxima ação antes de Dados').toBeLessThan(dados.y);
  expect(historico.y, 'Histórico por último').toBeGreaterThan(dados.y);
});

test('CA-10.2: o histórico mostra todos os eventos, em lista, do mais novo para o mais antigo', async ({ page }) => {
  const id = await abrir(page, TITULOS_DO_E2E.etapasDupla);
  const { itens } = await api<{ itens: { ocorridoEm: string }[] }>(page, 'GET', `/api/demandas/${id}/historico`);
  expect(itens.length, 'a etapasDupla tem eventos de ESP, RSK, DEC e aprovação').toBeGreaterThan(3);
  const historico = secao(page, 'Histórico');
  await expect(historico).toContainText('Do mais novo para o mais antigo.');
  await expect(historico.getByRole('table')).toHaveCount(0);
  await expect(historico.getByRole('list').getByRole('listitem')).toHaveCount(itens.length);
  const datas = await historico.locator('li time').evaluateAll((ts) => ts.map((t) => t.getAttribute('datetime')));
  expect(datas).toEqual(itens.map((e) => new Date(e.ocorridoEm).toISOString()));
  await expect(page.getByText('Ver histórico completo')).toHaveCount(0);
});

test('"Mudar status" do cabeçalho leva o foco ao h2 Status; trilha com "Demandas" e o id atual', async ({ page }) => {
  const id = await abrir(page, TITULOS_DO_E2E.etapasDupla);
  const trilha = page.getByRole('navigation', { name: 'Trilha' });
  await expect(trilha.getByRole('link', { name: 'Demandas', exact: true })).toHaveAttribute('href', '/demandas');
  await expect(trilha.locator('[aria-current="page"]')).toHaveText(id);

  // Há dois "Mudar status": o do cabeçalho (primeiro no DOM) e o da navegação "Nesta página".
  const noCabecalho = page.getByRole('link', { name: 'Mudar status', exact: true }).first();
  await expect(noCabecalho.locator('xpath=ancestor::nav')).toHaveCount(0);
  await noCabecalho.click();
  await expect(titulo2(page, 'Mudar status')).toBeFocused();
});
