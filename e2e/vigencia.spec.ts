// T14 (DEC-DEM-20261111-0018-v1, 0.4.1): a vigência no navegador, na T11 e na T05 (RF-03, RF-06; CA-06.1 a CA-06.3,
// CA-06.5, CA-03.1 e CA-03.6; 03, seções 4, 6.2, 8 e 9). Os textos esperados são os da seção 8 da 03, escritos por
// inteiro aqui.
//
// G3.12 do plano: nenhum teste cria demanda nem versão. As três demandas vêm do seed fictício (T10, TITULOS_DO_E2E), com
// o v1 aprovado na opção A e o v2 pendente, da mesma ESP e do mesmo RSK:
//   - vigenciaComPendente: v1 "cto" vigente, v2 "cto_e_administradora" pendente → (a) no v2, (b) no v1;
//   - vigenciaNivelMenor: v1 "cto_e_administradora" vigente, v2 "cto" pendente → (c) no v2, nada no v1;
//   - vigenciaArquivar: v1 "cto" vigente, v2 "cto" pendente → arquivar o v2 leva a demanda a Aprovada (S1).
// Os três primeiros testes só leem. O do CA-03.1 arquiva o v2 da `vigenciaArquivar` quando ele ainda está pendente; numa
// segunda execução sobre o mesmo banco (homologação reaproveitada), o v2 já está arquivado, e o teste confere só o estado
// final, sem pular. Cada teste roda sozinho, em qualquer ordem.
//
// Critério 5 do plano (03, seção 9): em cada aviso, o <p> não é focável e só o link entra no Tab; o nome acessível dos
// links "Abrir o pacote" tem o id inteiro. O link do (c) se chama "Criar pacote novo", como o do desatualizado (3.2.4).
//
// Uso por conta deste arquivo: "cto" 0 demandas e 0 versões pela API (um arquivamento pela tela, na primeira execução);
// "administradora" nenhum uso.
import type { Locator, Page } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { api, demandaDoSeed, entrarComo, expect, semViolacoes, semViolacoesNasDuasLarguras, test } from './apoio';

type Pacote = { id: string; statusDecisao: string; substituido: boolean };

// 03, seção 8, por inteiro.
const avisoVigente = (v: string) =>
  `Esta demanda já tem um pacote aprovado em vigor: ${v}. Quando a aprovação deste pacote ficar completa, ele passa a valer no lugar de ${v}, e um pedido já gerado de ${v} deixa de valer.`;
const avisoMaisNovoPendente = (p: string) =>
  `Há um pacote mais novo pendente nesta demanda: ${p}. Quando a aprovação dele ficar completa, ele passa a valer no lugar deste, e um pedido já gerado deste pacote deixa de valer.`;
const avisoNivelMenor = (v: string) =>
  `A aprovação deste pacote será recusada: o pacote em vigor nesta demanda, ${v}, exigiu a aprovação do CTO e da administradora, e um pacote só do CTO não pode substituí-lo. Você pode devolver ou arquivar este pacote. Para substituir ${v}, crie um pacote novo com aprovação do CTO e da administradora.`;
const abrirPacote = (id: string) => `Abrir o pacote ${id}`;
const dicaArquivarAprovada = (v: string) => `Arquivar: a demanda vai para Aprovada, e ${v} continua em vigor.`;
const arquivadaAprovada = (v: string) => `Pacote arquivado. A demanda está em Aprovada, e ${v} continua em vigor.`;
const PROXIMA_ACAO_APROVADA = 'Gerar o Pedido de Construção e, quando a construção começar, mudar o status para Em construção.';

// O começo de cada aviso, para conferir que ele não aparece.
const INICIO_A = /^Esta demanda já tem um pacote aprovado em vigor/;
const INICIO_B = /^Há um pacote mais novo pendente nesta demanda/;
const INICIO_C = /^A aprovação deste pacote será recusada/;

const statusDa = async (page: Page, id: string) => (await api<{ status: string }>(page, 'GET', `/api/demandas/${id}`)).status;
const pacote = (page: Page, decId: string) => api<Pacote>(page, 'GET', `/api/pacotes-decisao/${decId}`);
const botaoArquivar = (page: Page): Locator =>
  page.getByRole('group', { name: 'Ações da decisão', exact: true }).getByRole('button', { name: 'Arquivar', exact: true });

// As demandas da vigência nascem com o v1 e o v2 pelo seed, e nenhum e2e cria DEC nelas: os ids são os da numeração.
// A pré-condição é conferida pela API antes de abrir a tela, para a falha dizer o estado, e não o texto que faltou.
async function daVigencia(page: Page, titulo: string, v2Esperado: readonly string[] = ['pendente']): Promise<{ demandaId: string; v1: string; v2: string }> {
  const demandaId = await demandaDoSeed(page, titulo);
  const v1 = `DEC-${demandaId}-v1`;
  const v2 = `DEC-${demandaId}-v2`;
  const [p1, p2] = [await pacote(page, v1), await pacote(page, v2)];
  expect({ status: p1.statusDecisao, substituido: p1.substituido }, `v1 de "${titulo}"`).toEqual({ status: 'aprovada', substituido: false });
  expect(v2Esperado, `v2 de "${titulo}" está ${p2.statusDecisao}`).toContain(p2.statusDecisao);
  return { demandaId, v1, v2 };
}

// Critério 5: o aviso é o <p> com o texto inteiro e um link, dentro do mesmo Alerta. O <p> não é focável, e no Tab só o
// link entra: de fora para o link e do link para fora, sem parar em nada do aviso.
async function avisoNaPagina(page: Page, texto: string, nomeDoLink: string, href: string): Promise<void> {
  const p = page.getByText(texto, { exact: true });
  await expect(p).toBeVisible();
  await expect(p).not.toHaveAttribute('tabindex');
  expect(await p.evaluate((e) => (e as HTMLElement).tabIndex), 'o <p> do aviso fora do Tab').toBe(-1);
  const aviso = p.locator('xpath=..');
  await expect(aviso, 'o aviso é estático, sem role').not.toHaveAttribute('role');
  await expect(aviso.locator('a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]')).toHaveCount(1);
  const link = aviso.getByRole('link');
  await expect(link).toHaveAccessibleName(nomeDoLink);
  await expect(link).toHaveAttribute('href', href);

  const focoNoAviso = () => aviso.evaluate((a) => a.contains(document.activeElement));
  await link.focus();
  await page.keyboard.press('Shift+Tab');
  expect(await focoNoAviso(), 'Shift+Tab a partir do link sai do aviso').toBe(false);
  await page.keyboard.press('Tab');
  await expect(link).toBeFocused();
  await page.keyboard.press('Tab');
  expect(await focoNoAviso(), 'Tab a partir do link sai do aviso').toBe(false);
}

test.beforeEach(async ({ page }) => {
  await entrarComo(page, 'cto');
});

test('CA-06.1 e CA-03.6: v2 pendente com v1 em vigor → aviso (a) e link para o v1; sem (c); dica do Arquivar; axe', async ({ page }) => {
  const { v1, v2 } = await daVigencia(page, TITULOS_DO_E2E.vigenciaComPendente);
  await page.goto(`/pacotes-decisao/${v2}`);
  await avisoNaPagina(page, avisoVigente(v1), abrirPacote(v1), `/pacotes-decisao/${v1}`);
  await expect(page.getByText(INICIO_C)).toHaveCount(0);
  await expect(page.getByText(INICIO_B)).toHaveCount(0);
  await expect(botaoArquivar(page)).toHaveAccessibleDescription(dicaArquivarAprovada(v1));
  await semViolacoesNasDuasLarguras(page, 'T11 com o aviso (a)');
});

test('CA-06.2: v1 em vigor com o v2 mais novo pendente → aviso (b) e link para o v2; axe', async ({ page }) => {
  const { v1, v2 } = await daVigencia(page, TITULOS_DO_E2E.vigenciaComPendente);
  await page.goto(`/pacotes-decisao/${v1}`);
  await avisoNaPagina(page, avisoMaisNovoPendente(v2), abrirPacote(v2), `/pacotes-decisao/${v2}`);
  await expect(page.getByText(INICIO_A)).toHaveCount(0);
  await expect(page.getByText(INICIO_C)).toHaveCount(0);
  await semViolacoesNasDuasLarguras(page, 'T11 com o aviso (b)');
});

test('CA-06.3: v2 só do CTO com v1 de dupla aprovação → aviso (c) e "Criar pacote novo"; sem (a); o v1 sem (b); axe', async ({ page }) => {
  const { demandaId, v1, v2 } = await daVigencia(page, TITULOS_DO_E2E.vigenciaNivelMenor);
  await page.goto(`/pacotes-decisao/${v2}`);
  await avisoNaPagina(page, avisoNivelMenor(v1), 'Criar pacote novo', `/demandas/${demandaId}/pacotes-decisao/novo`);
  await expect(page.getByText(INICIO_A)).toHaveCount(0);
  await semViolacoesNasDuasLarguras(page, 'T11 com o aviso (c)');

  await page.goto(`/pacotes-decisao/${v1}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Decisão: ${TITULOS_DO_E2E.vigenciaNivelMenor}`);
  await expect(page.getByText(v1, { exact: true }).first()).toBeVisible();
  await expect(page.getByText(INICIO_B)).toHaveCount(0);
  await expect(page.getByText(INICIO_A)).toHaveCount(0);
  await expect(page.getByText(INICIO_C)).toHaveCount(0);
  await semViolacoes(page, 'T11 do v1 de dupla aprovação, sem aviso');
});

test('CA-03.1: arquivar o v2 com v1 em vigor → Aprovada e v1 continua; T05 com o v1 na etapa 4 e a Próxima ação; axe', async ({ page }) => {
  const { demandaId, v1, v2 } = await daVigencia(page, TITULOS_DO_E2E.vigenciaArquivar, ['pendente', 'arquivada']);
  if ((await pacote(page, v2)).statusDecisao === 'pendente') {
    await page.goto(`/pacotes-decisao/${v2}`);
    await expect(botaoArquivar(page)).toHaveAccessibleDescription(dicaArquivarAprovada(v1));
    await botaoArquivar(page).click();
    const dialogo = page.getByRole('dialog', { name: 'Confirmar a decisão?' });
    await expect(dialogo).toBeVisible();
    await dialogo.getByRole('button', { name: 'Confirmar e registrar' }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Pacote arquivado' })).toHaveText(arquivadaAprovada(v1));
    await semViolacoesNasDuasLarguras(page, 'T11 arquivado com o v1 em vigor');
  }
  // Nos dois casos (arquivado agora ou numa execução anterior): o estado final pela API.
  expect((await pacote(page, v2)).statusDecisao, `v2 ${v2}`).toBe('arquivada');
  expect(await pacote(page, v1), `v1 ${v1}`).toMatchObject({ statusDecisao: 'aprovada', substituido: false });
  expect(await statusDa(page, demandaId), `status da demanda ${demandaId} depois de arquivar`).toBe('aprovada');

  await page.goto(`/demandas/${demandaId}`);
  const etapas = page.getByRole('list', { name: 'Etapas da demanda' }).getByRole('listitem');
  await expect(etapas).toHaveCount(5);
  const decisao = etapas.nth(3);
  await expect(decisao).toContainText('Decisão');
  await expect(decisao).toContainText(v1);
  await expect(decisao).toContainText('Aprovada, opção A');
  await expect(decisao).not.toContainText(v2);
  await expect(decisao).not.toContainText('Arquivada');
  await expect(etapas.nth(4)).toHaveAttribute('aria-current', 'step');
  const cartao = page.getByRole('region', { name: 'Próxima ação' });
  await expect(cartao).toContainText(PROXIMA_ACAO_APROVADA);
  await expect(cartao.getByRole('link', { name: 'Abrir a decisão aprovada' })).toHaveAttribute('href', `/pacotes-decisao/${v1}`);
  await semViolacoesNasDuasLarguras(page, 'T05 com o v2 arquivado e o v1 em vigor');
});
