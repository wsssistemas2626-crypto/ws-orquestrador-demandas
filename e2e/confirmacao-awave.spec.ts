// T18 do DEC-DEM-20261111-0016-v1: a T05 da demanda aberta pelo Awave (RF-06, CA-06.7; RF-10 no detalhe, CA-10.1,
// CA-10.4 e CA-10.7; RF-15 com o ator de integração no histórico; 03, 5.1 a 5.5 e seção 10). Conta "cto"; não cria
// demanda nem versão: usa as três demandas do Awave do seed (T15) e uma de pessoa. Só o teste "confirmar" grava, e grava
// uma vez a confirmação da `awaveConfirmar`; numa homologação reaproveitada, onde ela já foi confirmada, ele pula com o
// motivo escrito. Selo, seção e Próxima ação são conferidos juntos nos três estados (Pendência da 06-T17-revisao e da
// 06-T17-testes). A tela não diz se o agente de insumo foi acionado (parecer 3 da 06-T08-revisao).
import { type Page } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { demandaDoSeed, entrarComo, expect, semViolacoesNasDuasLarguras, test } from './apoio';

const SELO = 'Aguardando confirmação';
const LINHA_14 = 'Confirmar a demanda aberta pelo Awave.';
const SECAO = 'Confirmação do Awave';

const proximaAcao = (page: Page) => page.getByRole('region', { name: 'Próxima ação' });
const secao = (page: Page) => page.getByRole('region', { name: SECAO });
const nestaPagina = (page: Page) => page.getByRole('navigation', { name: 'Nesta página' }).getByRole('link');

test('aguardando: selo, Próxima ação, origem, histórico e axe', async ({ page }) => {
  await entrarComo(page, 'cto');
  const id = await demandaDoSeed(page, TITULOS_DO_E2E.awaveAguardando);
  await page.goto(`/demandas/${id}`);
  await expect(page.getByText(SELO, { exact: true })).toBeVisible();
  await expect(proximaAcao(page)).toContainText(LINHA_14);
  await expect(proximaAcao(page)).toContainText('Até a confirmação, nenhum agente de IA trabalha nela.');
  // "Nesta página": a seção nova logo depois de Dados (03, 5.1 item 3).
  await expect(nestaPagina(page)).toHaveText(['Dados', SECAO, 'Versões', 'Mudar status', 'Texto recebido', 'Histórico']);
  await page.getByRole('link', { name: 'Ir para a confirmação' }).click();
  await expect(page.getByRole('heading', { name: SECAO })).toBeFocused();
  const botao = page.getByRole('button', { name: 'Confirmar demanda' });
  await expect(botao).toHaveAttribute('aria-describedby', 'confirmacao-consequencia');
  await expect(page.locator('#confirmacao-consequencia')).toHaveText(
    'Ao confirmar, a demanda segue o fluxo de qualquer outra: se o agente de insumo técnico estiver ligado, ele recebe o título, a descrição e o contexto e começa a especificação técnica.',
  );
  await expect(secao(page)).toContainText('Esta demanda foi aberta pelo Awave e ainda não foi confirmada. Até uma pessoa confirmar, nenhum agente de IA trabalha nela.');
  await expect(secao(page)).toContainText('Leia os dados antes. Se a demanda não deve seguir, não confirme: use Mudar status e escolha Encerrada.');
  const dados = page.locator('dl');
  await expect(dados.getByText('Origem', { exact: true })).toBeVisible();
  await expect(dados.locator('dt', { hasText: 'Origem' }).locator('xpath=following-sibling::dd')).toHaveText('Awave');
  await expect(dados.locator('dt', { hasText: 'Criada por' }).locator('xpath=following-sibling::dd')).toHaveText('Awave');
  await expect(page.getByText(/^Awave \(prefixo ficticio\)$/).first()).toBeVisible();
  // 44 px de altura no computador e no celular, e a largura toda do cartão no celular (03, 5.2).
  expect((await botao.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
  await page.setViewportSize({ width: 390, height: 844 });
  const noCelular = await botao.boundingBox();
  const cartao = await secao(page).boundingBox();
  expect(noCelular?.height ?? 0).toBeGreaterThanOrEqual(44);
  // Abaixo de 768 px o Cartao tem `p-4` (16 px) e borda de 1 px: o conteúdo é a largura do cartão menos 34 px. Folga de
  // 1 px só para o arredondamento (06-T18-testes; Minor 2 da 06-T18-revisao: antes descontava 2 * 24, o de 768 px).
  expect(noCelular?.width ?? 0).toBeGreaterThanOrEqual((cartao?.width ?? 0) - 2 * 16 - 2 - 1);
  await page.setViewportSize({ width: 1280, height: 720 });
  await semViolacoesNasDuasLarguras(page, 'T05 Awave aguardando');
});

test('confirmar: "Confirmando…", aviso, foco no h2, quem e quando, sem selo', async ({ page }) => {
  await entrarComo(page, 'cto');
  const id = await demandaDoSeed(page, TITULOS_DO_E2E.awaveConfirmar);
  await page.goto(`/demandas/${id}`);
  const botao = page.getByRole('button', { name: 'Confirmar demanda' });
  test.skip((await botao.count()) === 0, 'exige banco recém-semeado: a demanda do seed já foi confirmada');
  // A resposta da Server Action fica presa até o teste ver o "Confirmando…" (03, 5.4, Carregando).
  let soltar: () => void = () => undefined;
  const preso = new Promise<void>((r) => {
    soltar = r;
  });
  await page.route('**/*', async (rota) => {
    const r = rota.request();
    if (!(r.method() === 'POST' && r.headers()['next-action'] !== undefined)) return rota.continue();
    await preso;
    return rota.continue();
  });
  await botao.click();
  const enviando = page.getByRole('button', { name: 'Confirmando…' });
  await expect(enviando).toBeDisabled();
  await expect(secao(page).locator('[aria-busy="true"]')).toHaveCount(1);
  soltar();
  await expect(page.getByRole('status').filter({ hasText: 'Demanda confirmada.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: SECAO })).toBeFocused();
  await expect(page.getByText(/^Confirmada por Pessoa Ficticia CTO \(CTO\) em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}\.$/)).toBeVisible();
  await expect(secao(page).locator('time')).toHaveAttribute('datetime', /Z$/);
  await expect(secao(page)).toContainText('Desde a confirmação, a demanda segue o fluxo de qualquer outra.');
  await expect(page.getByRole('button', { name: 'Confirmar demanda' })).toHaveCount(0);
  await expect(page.getByText(SELO, { exact: true })).toHaveCount(0);
  await expect(proximaAcao(page)).not.toContainText(LINHA_14);
  await expect(page.getByText('Confirmou a demanda aberta pelo Awave')).toBeVisible();
  // A seção continua, sem botão, e continua em "Nesta página".
  await expect(nestaPagina(page)).toContainText([SECAO]);
  await page.unroute('**/*');
  await semViolacoesNasDuasLarguras(page, 'T05 Awave confirmada');
});

test('encerrada sem confirmação: sem botão, texto do status final', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto(`/demandas/${await demandaDoSeed(page, TITULOS_DO_E2E.awaveEncerrada)}`);
  await expect(page.getByText('Esta demanda foi aberta pelo Awave e não foi confirmada. Ela está em Encerrada, um status final: não há confirmação a fazer.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar demanda' })).toHaveCount(0);
  await expect(page.getByText(SELO, { exact: true })).toHaveCount(0);
  await expect(proximaAcao(page)).toContainText('Nada. A demanda está em Encerrada.');
  await expect(proximaAcao(page)).not.toContainText(LINHA_14);
  await semViolacoesNasDuasLarguras(page, 'T05 Awave encerrada sem confirmação');
});

test('demanda de pessoa: sem seção, sem item em "Nesta página", sem selo', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto(`/demandas/${await demandaDoSeed(page, TITULOS_DO_E2E.etapasSemVersoes)}`);
  await expect(page.getByRole('heading', { name: SECAO })).toHaveCount(0);
  await expect(page.getByText(SELO, { exact: true })).toHaveCount(0);
  await expect(nestaPagina(page)).toHaveText(['Dados', 'Versões', 'Mudar status', 'Texto recebido', 'Histórico']);
  await expect(proximaAcao(page)).not.toContainText(LINHA_14);
  const dados = page.locator('dl');
  await expect(dados.locator('dt', { hasText: 'Origem' }).locator('xpath=following-sibling::dd')).toHaveText('Pessoa');
});
