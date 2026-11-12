// T19 do DEC-DEM-20261111-0016-v1: a T11 do pedido que o /construir já recebeu (RF-15; CA-15.1, CA-15.4; RF-16,
// CA-16.3; 03, 6.1 a 6.3). Conta "cto"; só leitura: o DEC é o da demanda `pedidoRecebido` do seed (T15), que já tem o
// pedido_gerado, o pedido_entregue e o pedido_recebido. Nenhuma demanda nem versão é criada. CA-15.2 (sem
// pedido_recebido, a linha não existe) fica em Vitest (D-11): o estado dos DEC do seed muda numa homologação
// reaproveitada.
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { api, demandaDoSeed, entrarComo, expect, semViolacoesNasDuasLarguras, test } from './apoio';

const TEXTO_DA_SECAO =
  'Gere o pedido. Com a busca automática do /construir ligada, ele pega o pedido gerado na busca seguinte (a cada 5 minutos), e o recebimento aparece no topo desta página. Com a busca desligada, baixe ou copie o JSON e grave-o na pasta pedidos/ da estruturaAutonoma.';

test('T11 com o pedido recebido: a linha no cabeçalho e axe nas duas larguras', async ({ page }) => {
  await entrarComo(page, 'cto');
  const id = await demandaDoSeed(page, TITULOS_DO_E2E.pedidoRecebido);
  const d = await api<{ pacotesDecisao: { id: string }[] }>(page, 'GET', `/api/demandas/${id}`);
  await page.goto(`/pacotes-decisao/${d.pacotesDecisao[0]!.id}`);
  const linha = page.getByText(/^Recebido pelo \/construir em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}\.$/);
  await expect(linha).toBeVisible();
  await expect(linha.locator('time')).toHaveAttribute('datetime', /Z$/);
  // O <time> leva o instante do evento, e o texto é a data e a hora dele no fuso do sistema.
  await expect(linha.locator('time')).toHaveText(/^\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}$/);
  // 03, 6.1: depois de "Repositório destino" e antes das citações; o visto é decorativo e a linha não é focável.
  const cabecalho = page.locator('main p').filter({ hasText: /^(?:Repositório destino: |Recebido pelo \/construir em |Cita: )/ });
  await expect(cabecalho).toHaveCount(3);
  await expect(cabecalho.nth(0)).toContainText('Repositório destino: ');
  await expect(cabecalho.nth(1)).toContainText('Recebido pelo /construir em ');
  await expect(cabecalho.nth(2)).toContainText('Cita: ');
  await expect(cabecalho.nth(1).locator('svg')).toHaveAttribute('aria-hidden', 'true');
  await expect(cabecalho.nth(1).locator('a, button, [tabindex]')).toHaveCount(0);
  // CA-16.3: a seção do pedido com o texto novo.
  await expect(page.getByRole('region', { name: 'Pedido de Construção', exact: true })).toContainText(TEXTO_DA_SECAO);
  // CA-15.4: axe sem violação com a linha, em 1280 × 720 e em 390 × 844.
  await semViolacoesNasDuasLarguras(page, 'T11 com recebimento');
});

test('T11 com o pedido recebido em 390 px: a linha visível, sem rolagem lateral', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await entrarComo(page, 'cto');
  const id = await demandaDoSeed(page, TITULOS_DO_E2E.pedidoRecebido);
  const d = await api<{ pacotesDecisao: { id: string }[] }>(page, 'GET', `/api/demandas/${id}`);
  await page.goto(`/pacotes-decisao/${d.pacotesDecisao[0]!.id}`);
  const linha = page.getByText(/^Recebido pelo \/construir em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}\.$/);
  await expect(linha).toBeVisible();
  await expect(linha).toBeInViewport();
  // Reflow (03, seção 10): nada passa da largura da janela.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
