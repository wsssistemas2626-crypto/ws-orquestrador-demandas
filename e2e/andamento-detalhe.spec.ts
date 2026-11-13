// T13 do DEC-DEM-20261111-0017-v1 (RF-07, RF-09, CA-07.1, CA-07.2, CA-09.1 a CA-09.5, CA-06.5; 03, 5.1 a 5.8): no
// detalhe da demanda (T05), a seção "Andamento da construção", o primeiro item de "Nesta página", a linha 15 da Próxima
// ação e o histórico do /construir; e o axe com a seção, em 1280 × 720 e 390 × 844.
//
// G3.11 do plano: esta spec não cria demanda nem versão e não manda andamento. Ela lê as demandas do seed fictício da T10
// (scripts/seed-ficticio.ts, TITULOS_DO_E2E), cujo andamento é gravado na subida do banco e não muda depois (a única que
// muda é a andamentoParaEnviar, na T14, e esta spec não a olha). Conta "cto", só leitura. A marcação de Entregue
// (CA-07.3) fica no Vitest (src/components/dados-das-etapas-andamento.test.ts): o e2e não muda o seed.
import { type Locator, type Page } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { demandaDoSeed, entrarComo, expect, semViolacoesNasDuasLarguras, test } from './apoio';

const SECAO = 'Andamento da construção';
const ID_DA_SECAO = 'andamento-da-construcao';
const ATOR = '/construir (prefixo ficticio)';
const LINHA_11 = 'Acompanhar a construção. Quando terminar, mudar o status para Entregue ou Devolvida pela construção.';
const LINHA_12 = 'Ler o motivo da devolução no histórico e voltar a demanda para Em construção ou Em análise.';
const LINHA_15 = 'Construção concluída: confira e marque como Entregue.';
const DETALHE_15 = 'O /construir não marca Entregue: quem confere a entrega é uma pessoa.';
const SEM_PLANO = 'Nenhuma tarefa contada. O plano de tarefas ainda não foi feito, ou este pedido não tem plano.';
const CANCELADA = 'A construção deste pedido foi cancelada no /construir.';
const NOTA = 'Esta página não se atualiza sozinha. Recarregue para ver o andamento mais novo.';

const secao = (page: Page): Locator => page.getByRole('region', { name: SECAO });
const proximaAcao = (page: Page): Locator => page.getByRole('region', { name: 'Próxima ação' });
const historico = (page: Page): Locator => page.getByRole('region', { name: 'Histórico' });
const nestaPagina = (page: Page): Locator => page.getByRole('navigation', { name: 'Nesta página' });
// O valor (dd) do termo (dt) da lista de descrição da seção.
const valor = (s: Locator, termo: string): Locator => s.locator(`dt:text-is("${termo}") + dd`);

async function abrirDetalhe(page: Page, titulo: string): Promise<string> {
  await entrarComo(page, 'cto');
  const id = await demandaDoSeed(page, titulo);
  await page.goto(`/demandas/${id}`);
  await expect(page.locator('main h1')).toBeVisible();
  return id;
}

// O link leva o foco ao h2 só depois da hidratação; antes dela, é âncora comum. O clique se repete até o foco chegar.
async function seguirAteOFoco(link: Locator, alvo: Locator): Promise<void> {
  await expect(async () => {
    await link.click({ timeout: 1_000 });
    await expect(alvo).toBeFocused({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
}

test('CA-09.1 e CA-06.5: andamentoConstruindo em 1280 × 720 — seção, "Nesta página", link do DEC, barra, data, nota e histórico do /construir', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const id = await abrirDetalhe(page, TITULOS_DO_E2E.andamentoConstruindo);
  const s = secao(page);
  await expect(s).toBeVisible();

  // "Nesta página": "Andamento da construção" em primeiro, levando o foco ao h2 focável da seção.
  const links = nestaPagina(page).getByRole('link');
  await expect(links.first()).toHaveText(SECAO);
  const h2 = s.getByRole('heading', { level: 2, name: SECAO });
  await expect(h2).toHaveAttribute('id', ID_DA_SECAO);
  await expect(h2).toHaveAttribute('tabindex', '-1');
  await seguirAteOFoco(links.first(), h2);

  // No DOM: depois da Próxima ação e antes de Dados (03, 5.1 item 2).
  const ordem = await page.evaluate((idSecao) => {
    const proxima = document.querySelector('section[aria-labelledby="proxima-acao"]');
    const andamento = document.getElementById(idSecao);
    const dados = document.getElementById('dados');
    if (!proxima || !andamento || !dados) return null;
    return {
      depoisDaProxima: Boolean(proxima.compareDocumentPosition(andamento) & Node.DOCUMENT_POSITION_FOLLOWING),
      antesDeDados: Boolean(andamento.compareDocumentPosition(dados) & Node.DOCUMENT_POSITION_FOLLOWING),
    };
  }, ID_DA_SECAO);
  expect(ordem).toEqual({ depoisDaProxima: true, antesDeDados: true });

  // Pedido de Construção: o id do DEC desta demanda, em Mono, como link para a T11.
  const dec = valor(s, 'Pedido de Construção').getByRole('link');
  await expect(dec).toHaveText(new RegExp(`^DEC-${id}-v\\d+$`));
  const decId = (await dec.textContent())!;
  await expect(dec).toHaveAttribute('href', `/pacotes-decisao/${decId}`);
  await expect(dec).toHaveAccessibleName(decId);
  await expect(dec).toHaveClass(/\bfont-mono\b/);

  await expect(valor(s, 'Fase')).toHaveText('Construindo');
  await expect(valor(s, 'Situação')).toHaveText('Em andamento');
  await expect(valor(s, 'Tarefas prontas')).toContainText('9 de 17 tarefas');

  // A barra: <progress> nativo, nome do dt "Tarefas prontas" e o texto do valor por inteiro (03, 5.3).
  const barra = s.getByRole('progressbar', { name: 'Tarefas prontas' });
  await expect(barra).toHaveCount(1);
  await expect(barra).toHaveJSProperty('tagName', 'PROGRESS');
  await expect(barra).toHaveAttribute('value', '9');
  await expect(barra).toHaveAttribute('max', '17');
  await expect(barra).toHaveAttribute('aria-valuetext', '9 de 17 tarefas');

  // A data da última mudança em <time> com o ISO em UTC, e a nota.
  const data = s.getByText(/^Última mudança informada pelo \/construir em .+\.$/);
  await expect(data).toBeVisible();
  await expect(data.locator('time')).toHaveAttribute('datetime', /Z$/);
  await expect(s.getByText(NOTA, { exact: true })).toBeVisible();
  // Nada de style= na seção (CV-02: a CSP recusa estilo em linha).
  await expect(s.locator('[style]')).toHaveCount(0);
  await expect(s.getByRole('alert')).toHaveCount(0);

  // Histórico: o andamento e a mudança de status, os dois com o ator /construir e o prefixo (CA-06.5).
  const andamento = historico(page).getByRole('listitem').filter({ hasText: `Registrou o andamento de ${decId}: Construindo, 9 de 17 tarefas` });
  await expect(andamento).toHaveCount(1);
  await expect(andamento).toContainText(ATOR);
  const status = historico(page).getByRole('listitem').filter({ hasText: 'Antes: Aprovada. Depois: Em construção.' });
  await expect(status).toHaveCount(1);
  await expect(status).toContainText('Mudou o status');
  await expect(status).toContainText(ATOR);
  await expect(historico(page)).not.toContainText('wsod_');
});

test('CA-09.2: andamentoSemPlano — o texto de total 0 e nenhuma barra', async ({ page }) => {
  await abrirDetalhe(page, TITULOS_DO_E2E.andamentoSemPlano);
  const s = secao(page);
  await expect(valor(s, 'Fase')).toHaveText('Entendendo o pedido');
  await expect(valor(s, 'Situação')).toHaveText('Em andamento');
  await expect(valor(s, 'Tarefas prontas')).toHaveText(SEM_PLANO);
  await expect(s.locator('progress')).toHaveCount(0);
  await expect(page.getByRole('progressbar')).toHaveCount(0);
});

test('CA-09.3: andamentoCancelado — Situação "Cancelada", o alerta, status Devolvida pela construção e a linha 12', async ({ page }) => {
  await abrirDetalhe(page, TITULOS_DO_E2E.andamentoCancelado);
  const s = secao(page);
  await expect(valor(s, 'Situação')).toHaveText('Cancelada');
  await expect(s.getByText(CANCELADA, { exact: true })).toBeVisible();
  // Alerta estático: não é resultado de ação da pessoa.
  await expect(s.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('main [data-cor]').first()).toHaveText('Devolvida pela construção');
  await expect(proximaAcao(page)).toContainText(LINHA_12);
});

test('CA-09.4 e CA-07.2: emConstrucaoSemAndamento — sem seção nem item em "Nesta página"; Próxima ação linha 11', async ({ page }) => {
  await abrirDetalhe(page, TITULOS_DO_E2E.emConstrucaoSemAndamento);
  await expect(nestaPagina(page).getByRole('link').first()).toHaveText('Dados');
  await expect(nestaPagina(page).getByRole('link', { name: SECAO })).toHaveCount(0);
  await expect(secao(page)).toHaveCount(0);
  await expect(page.locator(`#${ID_DA_SECAO}`)).toHaveCount(0);
  await expect(proximaAcao(page)).toContainText(LINHA_11);
  await expect(proximaAcao(page)).not.toContainText(LINHA_15);
});

test('CA-07.1: andamentoConcluido — linha 15 e o link "Mudar o status" levando o foco ao h2 "Mudar status"', async ({ page }) => {
  await abrirDetalhe(page, TITULOS_DO_E2E.andamentoConcluido);
  const p = proximaAcao(page);
  await expect(p).toContainText(LINHA_15);
  await expect(p).toContainText(DETALHE_15);
  await expect(p).toContainText('Quem age: Uma pessoa (CTO ou administradora)');
  await expect(valor(secao(page), 'Situação')).toHaveText('Concluída');
  const link = p.getByRole('link', { name: 'Mudar o status', exact: true });
  await expect(link).toHaveAttribute('href', '#mudar-status');
  await seguirAteOFoco(link, page.getByRole('heading', { level: 2, name: 'Mudar status', exact: true }));
});

test('CA-09.5: axe sem violação com a seção, em 1280 × 720 e 390 × 844; na coluna lateral, nada sobreposto', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await abrirDetalhe(page, TITULOS_DO_E2E.andamentoConstruindo);
  await expect(secao(page)).toBeVisible();

  // A partir de 1200 px, na coluna lateral: Próxima ação, Andamento e Histórico, um embaixo do outro, sem se cruzar.
  const caixas = await Promise.all([proximaAcao(page), secao(page), historico(page)].map((l) => l.boundingBox()));
  const [proxima, andamento, hist] = caixas;
  expect(proxima && andamento && hist).toBeTruthy();
  expect(andamento!.y).toBeGreaterThanOrEqual(proxima!.y + proxima!.height);
  expect(hist!.y).toBeGreaterThanOrEqual(andamento!.y + andamento!.height);
  expect(Math.abs(andamento!.x - proxima!.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(hist!.x - andamento!.x)).toBeLessThanOrEqual(1);

  await semViolacoesNasDuasLarguras(page, 'detalhe com a seção Andamento da construção');
});
