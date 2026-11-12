// T16 do DEC-DEM-20261111-0016-v1: a origem da demanda na T03, no navegador (03, seção 4; RF-10 na tela, CA-10.1 a
// CA-10.3, CA-10.7 e IN-16 com o CV-07 em `origem`). O filtro "Origem" só se aplica por "Filtrar" (WCAG 3.2.2), o título
// do resultado recebe o foco, os contadores mantêm a origem, e cada linha (1280 px) e cartão (390 px) diz a origem.
//
// C-36 (G3.9 do plano): esta spec não cria demanda nem versão. Ela lê as demandas do seed fictício (três do Awave desde
// a T15) e as contagens da própria API, para rodar também na homologação, que já pode ter outras demandas.
//   - conta "cto": 0 demandas e 0 versões.
import { type Page } from '@playwright/test';
import { ROTULO_ORIGEM } from '../src/components/rotulos';
import { abrirRecolhivel, api, entrarComo, expect, semViolacoes, semViolacoesNasDuasLarguras, test } from './apoio';

type Origem = keyof typeof ROTULO_ORIGEM;
type Lista = { itens: { id: string; origem: Origem }[]; total: number };

const FILTRO_INVALIDO = 'Algum filtro do endereço não é válido. Mostrando todas as demandas.';
const VAZIO_COM_FILTRO = 'Nenhuma demanda com esses filtros.';
const ORIGENS: readonly Origem[] = ['pessoa', 'agente', 'awave'];

const contadores = (page: Page) => page.getByRole('group', { name: 'Filtrar por status' });
const regiaoDeAviso = (page: Page) => page.locator('main').getByRole('status');
const resultado = (page: Page) => page.locator('#resultado-da-fila');
const seletorOrigem = (page: Page) => page.getByLabel('Origem', { exact: true });
const encontradas = (total: number) => (total === 1 ? '1 demanda encontrada.' : `${total.toLocaleString('pt-BR')} demandas encontradas.`);
const totalDaApi = async (page: Page, consulta: string): Promise<number> => (await api<Lista>(page, 'GET', `/api/demandas?limit=1&${consulta}`)).total;
// O React assumiu a lista: a Região de aviso só ganha "N demandas encontradas." no navegador.
const esperarFilaPronta = (page: Page) => expect(regiaoDeAviso(page)).toHaveText(/^[\d.]+ demandas? encontradas?\.$/);

test('filtro Origem = Awave: legenda, "Origem: Awave" e axe nas duas larguras', async ({ page }) => {
  await entrarComo(page, 'cto');
  const total = await totalDaApi(page, 'origem=awave');
  // O seed deixa três demandas do Awave (T15).
  expect(total).toBeGreaterThanOrEqual(1);
  await page.goto('/demandas');
  await esperarFilaPronta(page);
  await seletorOrigem(page).selectOption('awave');
  // WCAG 3.2.2: mudar a seleção não aplica nada.
  await expect(page).toHaveURL(/\/demandas$/);
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page).toHaveURL(/\/demandas\?origem=awave$/);
  await expect(page.getByRole('heading', { name: 'Demandas com origem Awave, da mais nova para a mais antiga' })).toBeFocused();
  await expect(regiaoDeAviso(page)).toHaveText(encontradas(total));
  await expect(page.getByText('Origem: Awave').first()).toBeVisible();
  await expect(page.getByText('Origem: Pessoa')).toHaveCount(0);
  await expect(page.getByText('Origem: Agente de IA')).toHaveCount(0);
  await expect(seletorOrigem(page)).toHaveValue('awave');
  // Os contadores contam só a origem (03, 4.1 item 3): "Todas" tem o total da API com a origem.
  await expect(contadores(page).getByRole('button', { name: /^Todas/ })).toHaveAccessibleName(`Todas ${total.toLocaleString('pt-BR')} ${total === 1 ? 'demanda' : 'demandas'}`);
  await semViolacoesNasDuasLarguras(page, 'T03 com origem Awave');
});

test('IN-16: origem injetada na URL não é refletida', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/demandas?origem=%3Cscript%3E');
  await expect(page.getByText(FILTRO_INVALIDO)).toBeVisible();
  expect(await page.locator('a[href*="script"], input[value*="script"]').count()).toBe(0);
  // O filtro inválido derruba o filtro inteiro (03, 4.4): Origem em "Todas", nada oculto e "Todas" pressionado.
  await expect(seletorOrigem(page)).toHaveValue('');
  await expect(page.locator('main input[type="hidden"][name="origem"]')).toHaveCount(0);
  await expect(contadores(page).getByRole('button', { name: /^Todas/ })).toHaveAttribute('aria-pressed', 'true');
  expect(await page.locator('main').innerHTML()).not.toContain('%3Cscript%3E');
  // Valor fora da lista, sem marcação: o mesmo estado.
  await page.goto('/demandas?origem=construir');
  await expect(page.getByText(FILTRO_INVALIDO)).toBeVisible();
  await expect(page.locator('main [href*="construir"], main [value="construir"]')).toHaveCount(0);
});

test('CA-10.1 e CA-10.2: por origem, a lista e o total da API, e cada linha com "Origem: <rótulo>"', async ({ page }) => {
  await entrarComo(page, 'cto');
  for (const o of ORIGENS) {
    const total = await totalDaApi(page, `origem=${o}`);
    await page.goto(`/demandas?origem=${o}&limit=100`);
    await expect(resultado(page)).toHaveCount(1);
    if (total === 0) {
      // Estado "vazio com filtro" (03, 4.4).
      await expect(page.locator('main').getByText(VAZIO_COM_FILTRO)).toBeVisible();
      continue;
    }
    await esperarFilaPronta(page);
    await expect(regiaoDeAviso(page), o).toHaveText(encontradas(total));
    await expect(page.locator('main tbody tr')).toHaveCount(Math.min(total, 100));
    const titulos = (await page.locator('main tbody tr td:nth-child(2)').allInnerTexts()).map((s) => s.trim());
    for (const t of titulos) expect(t.endsWith(`Origem: ${ROTULO_ORIGEM[o]}`), `${o}: ${t}`).toBe(true);
  }
});

test('CA-10.3 e F2: com origem=awave, o contador "Nova" mantém a origem; "Limpar filtros" tira', async ({ page }) => {
  await entrarComo(page, 'cto');
  const total = await totalDaApi(page, 'origem=awave&status=nova');
  // O seed deixa duas do Awave em Nova (awaveAguardando e awaveConfirmar).
  expect(total).toBeGreaterThanOrEqual(1);
  await page.goto('/demandas?origem=awave');
  await esperarFilaPronta(page);
  await contadores(page).getByRole('button', { name: /^Nova/ }).click();
  await expect(page).toHaveURL(/\/demandas\?status=nova&origem=awave$/);
  await expect(resultado(page)).toBeFocused();
  await expect(resultado(page)).toHaveText('Demandas com status Nova e origem Awave, da mais nova para a mais antiga');
  await expect(regiaoDeAviso(page)).toHaveText(encontradas(total));
  await expect(contadores(page).getByRole('button', { name: /^Nova/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(seletorOrigem(page)).toHaveValue('awave');
  await page.locator('main fieldset').getByRole('link', { name: 'Limpar filtros' }).click();
  await expect(page).toHaveURL(/\/demandas$/);
  await expect(seletorOrigem(page)).toHaveValue('');
});

test.describe('celular', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('"Mais filtros (1 ativo)" com só a origem escolhida; Origem com 44 px; cartão com "Origem" depois de "Urgência"', async ({ page }) => {
    await entrarComo(page, 'cto');
    const { itens, total } = await api<Lista>(page, 'GET', '/api/demandas?origem=awave&limit=20');
    expect(total).toBeGreaterThanOrEqual(1);
    await page.goto('/demandas');
    await esperarFilaPronta(page);
    await expect(page.getByRole('button', { name: 'Mais filtros', exact: true })).toBeVisible();
    await abrirRecolhivel(page, /^Mais filtros/);
    await seletorOrigem(page).selectOption('awave');
    await page.getByRole('button', { name: 'Filtrar' }).click();
    await expect(page).toHaveURL(/\/demandas\?origem=awave$/);
    await expect(page.getByRole('button', { name: 'Mais filtros (1 ativo)' })).toBeVisible();
    const lista = page.getByRole('list', { name: 'Demandas com origem Awave, da mais nova para a mais antiga' });
    const cartoes = lista.getByRole('listitem');
    await expect(cartoes).toHaveCount(itens.length);
    for (const [i, d] of itens.entries()) {
      const cartao = cartoes.nth(i);
      await expect(cartao.getByRole('link', { name: d.id, exact: true })).toBeVisible();
      expect(await cartao.locator('dt').allTextContents()).toEqual(['Tipo', 'Urgência', 'Origem', 'Linha de serviço', 'Etapas', 'Idade']);
      await expect(cartao.locator('dd').nth(2)).toHaveText('Awave');
    }
    await abrirRecolhivel(page, /^Mais filtros/);
    const caixa = await seletorOrigem(page).boundingBox();
    expect(caixa, 'seletor Origem').not.toBeNull();
    expect(caixa!.height, 'seletor Origem: altura').toBeGreaterThanOrEqual(44);
    await semViolacoes(page, 'fila com origem Awave e "Mais filtros" aberto em 390 px');
  });
});
