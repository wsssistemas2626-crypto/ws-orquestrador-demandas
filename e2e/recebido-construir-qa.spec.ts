// 06-T19-testes (qa-automacao) do DEC-DEM-20261111-0016-v1: a T11 do pedido que o /construir já recebeu, no navegador
// (RF-15, CA-15.1; RF-16, CA-16.3; 03, 6.1). O recebido-construir.spec.ts confere o formato da data; aqui, a data é a do
// evento: o datetime do <time> é o instante do primeiro pedido_recebido do DEC no histórico da demanda, e o texto é esse
// instante no fuso do sistema. Também: a administradora vê a mesma linha, e a página não diz mais que o envio é só
// manual. Só leitura, sobre o DEC da demanda `pedidoRecebido` do seed (T15): nenhuma demanda, versão ou evento é criado,
// e nada depende da ordem dos testes nem do relógio.
import type { Page } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { formatarDataHora } from '../src/lib/fuso';
import { api, demandaDoSeed, entrarComo, expect, test } from './apoio';

type Evento = { id: number; ocorridoEm: string; entidade: string; entidadeId: string; acao: string };

const LINHA = /^Recebido pelo \/construir em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}\.$/;

// O DEC do pedido recebido e o primeiro pedido_recebido dele no histórico (a mesma regra de recebimentoDoPedido: o mais
// antigo, e depois pelo id).
async function decEPrimeiroRecebido(page: Page): Promise<{ decId: string; em: Date }> {
  const id = await demandaDoSeed(page, TITULOS_DO_E2E.pedidoRecebido);
  const d = await api<{ pacotesDecisao: { id: string }[] }>(page, 'GET', `/api/demandas/${id}`);
  const decId = d.pacotesDecisao[0]!.id;
  const h = await api<{ itens: Evento[] }>(page, 'GET', `/api/demandas/${id}/historico`);
  const recebidos = h.itens
    .filter((e) => e.acao === 'pedido_recebido' && e.entidade === 'pacote_decisao' && e.entidadeId === decId)
    .sort((a, b) => Date.parse(a.ocorridoEm) - Date.parse(b.ocorridoEm) || a.id - b.id);
  expect(recebidos.length, 'o seed tem o pedido_recebido do DEC').toBeGreaterThan(0);
  return { decId, em: new Date(recebidos[0]!.ocorridoEm) };
}

test('CA-15.1: a data da linha é a do primeiro pedido_recebido do DEC, no fuso do sistema', async ({ page }) => {
  await entrarComo(page, 'cto');
  const { decId, em } = await decEPrimeiroRecebido(page);
  await page.goto(`/pacotes-decisao/${decId}`);
  const linha = page.getByText(LINHA);
  await expect(linha).toHaveCount(1);
  await expect(linha).toBeVisible();
  const time = linha.locator('time');
  await expect(time).toHaveCount(1);
  await expect(time).toHaveAttribute('datetime', em.toISOString());
  await expect(time).toHaveText(formatarDataHora(em));
  await expect(linha).toHaveText(`Recebido pelo /construir em ${formatarDataHora(em)}.`);
});

test('CA-15.1: a administradora vê a mesma linha, com o mesmo instante', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const { decId, em } = await decEPrimeiroRecebido(page);
  await page.goto(`/pacotes-decisao/${decId}`);
  const linha = page.getByText(LINHA);
  await expect(linha).toBeVisible();
  await expect(linha.locator('time')).toHaveAttribute('datetime', em.toISOString());
  await expect(linha).toHaveText(`Recebido pelo /construir em ${formatarDataHora(em)}.`);
});

test('CA-16.3: a T11 do pedido recebido não diz em lugar nenhum que o envio ao /construir é só manual', async ({ page }) => {
  await entrarComo(page, 'cto');
  const { decId } = await decEPrimeiroRecebido(page);
  await page.goto(`/pacotes-decisao/${decId}`);
  await expect(page.getByText(LINHA)).toBeVisible();
  const secao = page.getByRole('region', { name: 'Pedido de Construção', exact: true });
  await expect(secao).toContainText('Com a busca automática do /construir ligada');
  await expect(secao).toContainText('Com a busca desligada, baixe ou copie o JSON');
  await expect(page.locator('main')).not.toContainText('manual nesta versão');
  await expect(page.locator('main')).not.toContainText('O envio ao /construir é manual');
});
