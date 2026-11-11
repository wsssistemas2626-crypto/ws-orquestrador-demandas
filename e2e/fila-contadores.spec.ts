// T09 do DEC-DEM-20261110-0015-v1: a T03 no arranjo A1, no navegador. Contadores que filtram (RF-05), a tabela densa
// com Etapas e Idade (RF-06) e a lista de cartões abaixo de 768 px (RF-07), em 1280 × 720, 390 × 844 e 320 px.
//
// C-36 (G3.10 do plano): esta spec não cria demanda nem versão. Ela lê as demandas do seed fictício (23 no banco novo:
// mais de 20, o que dá a página 2) e as contagens da própria API, para rodar também na homologação, que já pode ter
// outras demandas.
//   - conta "cto": 0 demandas e 0 versões.
import { type Page } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { ROTULO_STATUS } from '../src/components/rotulos';
import { api, demandaDoSeed, entrarComo, expect, semViolacoes, test } from './apoio';

type Lista = { itens: { id: string; titulo: string; status: keyof typeof ROTULO_STATUS }[]; total: number };

const LEGENDA_TODAS = 'Demandas, da mais nova para a mais antiga';
const FILTRO_INVALIDO = 'Algum filtro do endereço não é válido. Mostrando todas as demandas.';
const STATUS_DO_ENUM = ['', 'nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao', 'aprovada', 'em_construcao', 'entregue', 'devolvida', 'encerrada'];

const contadores = (page: Page) => page.getByRole('group', { name: 'Filtrar por status' });
const regiaoDeAviso = (page: Page) => page.locator('main').getByRole('status');
const resultado = (page: Page) => page.locator('#resultado-da-fila');
const encontradas = (total: number) => (total === 1 ? '1 demanda encontrada.' : `${total.toLocaleString('pt-BR')} demandas encontradas.`);
const totalDaApi = async (page: Page, consulta: string): Promise<number> => (await api<Lista>(page, 'GET', `/api/demandas?limit=1&${consulta}`)).total;

// O React assumiu a lista: a Região de aviso só ganha "N demandas encontradas." no navegador (fila-qa.spec.ts). Antes
// disso, o clique num contador é o GET comum do formulário, sem o foco no resultado.
const esperarFilaPronta = (page: Page) => expect(regiaoDeAviso(page)).toHaveText(/^[\d.]+ demandas? encontradas?\.$/);

test('CA-05.2: ativar "Pronta para decisão" filtra, pressiona, foca o resultado e anuncia o total da API', async ({ page }) => {
  await entrarComo(page, 'cto');
  const total = await totalDaApi(page, 'status=pronta_para_decisao');
  // O seed deixa a etapasDupla e a decisaoRecomendaB em "Pronta para decisão".
  expect(total).toBeGreaterThanOrEqual(1);
  await page.goto('/demandas');
  await esperarFilaPronta(page);
  const contador = contadores(page).getByRole('button', { name: /^Pronta para decisão/ });
  await expect(contador).toHaveAccessibleName(`Pronta para decisão ${total.toLocaleString('pt-BR')} ${total === 1 ? 'demanda' : 'demandas'}`);
  await expect(contador).toHaveAttribute('aria-pressed', 'false');
  await contador.click();
  await expect(page).toHaveURL(/\/demandas\?status=pronta_para_decisao$/);
  await expect(contador).toHaveAttribute('aria-pressed', 'true');
  await expect(contadores(page).getByRole('button', { name: /^Todas/ })).toHaveAttribute('aria-pressed', 'false');
  await expect(resultado(page)).toBeFocused();
  await expect(regiaoDeAviso(page)).toHaveText(encontradas(total));
  // Uma página de até 20 linhas (na homologação reaproveitada pode haver mais).
  await expect(page.locator('main tbody tr')).toHaveCount(Math.min(total, 20));
  expect(new Set((await page.locator('main tbody tr td:nth-child(4)').allInnerTexts()).map((s) => s.trim()))).toEqual(new Set(['Pronta para decisão']));
});

test('CA-05.3: com status=nova&tipo=bug&offset=20, "Em análise" mantém tipo e tira offset', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/demandas?status=nova&tipo=bug&offset=20');
  await expect(contadores(page).getByRole('button', { name: /^Nova/ })).toHaveAttribute('aria-pressed', 'true');
  await contadores(page).getByRole('button', { name: /^Em análise/ }).click();
  // Com ou sem script, o endereço é o mesmo: o status do botão, depois o tipo oculto.
  await expect(page).toHaveURL(/\/demandas\?status=em_analise&tipo=bug$/);
  await expect(contadores(page).getByRole('button', { name: /^Em análise/ })).toHaveAttribute('aria-pressed', 'true');
});

test('CA-05.5: ativar o pressionado tira o status e "Todas" fica pressionado', async ({ page }) => {
  await entrarComo(page, 'cto');
  expect(await totalDaApi(page, 'status=nova')).toBeGreaterThanOrEqual(1);
  await page.goto('/demandas?status=nova');
  await esperarFilaPronta(page);
  const nova = contadores(page).getByRole('button', { name: /^Nova/ });
  await expect(nova).toHaveAttribute('aria-pressed', 'true');
  await nova.click();
  await expect(page).toHaveURL(/\/demandas$/);
  await expect(nova).toHaveAttribute('aria-pressed', 'false');
  await expect(contadores(page).getByRole('button', { name: /^Todas/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(resultado(page)).toBeFocused();
  await expect(resultado(page)).toHaveText(LEGENDA_TODAS);
});

test('CA-05.6: Enter e Espaço num contador filtram como o clique', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/demandas');
  await esperarFilaPronta(page);
  await contadores(page).getByRole('button', { name: /^Nova/ }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/demandas\?status=nova$/);
  await expect(resultado(page)).toBeFocused();
  await expect(contadores(page).getByRole('button', { name: /^Nova/ })).toHaveAttribute('aria-pressed', 'true');

  await esperarFilaPronta(page);
  await contadores(page).getByRole('button', { name: /^Encerrada/ }).focus();
  await page.keyboard.press('Space');
  await expect(page).toHaveURL(/\/demandas\?status=encerrada$/);
  await expect(resultado(page)).toBeFocused();
  await expect(contadores(page).getByRole('button', { name: /^Encerrada/ })).toHaveAttribute('aria-pressed', 'true');
});

test('CA-05.7 e CV-07: ?status=%3Cscript%3E&tipo=bug mostra o alerta, "Todas" pressionado, nenhum status fora do enum', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/demandas?status=%3Cscript%3E&tipo=bug');
  await expect(page.locator('main').getByText(FILTRO_INVALIDO)).toBeVisible();
  await expect(contadores(page).getByRole('button', { name: /^Todas/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(contadores(page).locator('[aria-pressed="true"]')).toHaveCount(1);
  for (const v of await page.locator('input[name="status"]').evaluateAll((xs) => xs.map((x) => (x as HTMLInputElement).value))) expect(STATUS_DO_ENUM).toContain(v);
  const valoresDosBotoes = await contadores(page)
    .getByRole('button')
    .evaluateAll((xs) => xs.map((x) => (x as HTMLButtonElement).value));
  expect(valoresDosBotoes).toHaveLength(10);
  for (const v of valoresDosBotoes) expect(STATUS_DO_ENUM).toContain(v);
  // O filtro inválido derruba o filtro inteiro (regra da 0.1.13): nem o tipo vai oculto.
  await expect(page.locator('main input[type="hidden"][name="tipo"]')).toHaveCount(0);
  // Nada do texto injetado em valor, endereço ou texto da tela. (A fila pode ter, no título de uma demanda do seed, um
  // <script> mostrado como texto: o C-18 da seguranca.spec. Por isso a conferência é pelo valor injetado e pelos
  // atributos, e não pela palavra. E é no `main`, e não no documento inteiro: o Next guarda o endereço pedido, tal como
  // veio, no dado de navegação dentro de um <script> do próprio framework, que não é tela nem atributo.)
  expect(await page.locator('main').innerHTML()).not.toContain('%3Cscript%3E');
  await expect(page.locator('main [value*="<"], main [href*="<"], main [href*="%3C" i], main [href*="script"]')).toHaveCount(0);
  await semViolacoes(page, 'fila com status injetado na URL');
});

test('CA-06.1: o nome acessível da célula de etapas segue a API', async ({ page }) => {
  await entrarComo(page, 'cto');
  const marca = (feita: boolean) => (feita ? 'feita' : 'por fazer');
  for (const titulo of [TITULOS_DO_E2E.espListaDeTextos, TITULOS_DO_E2E.etapasDupla, TITULOS_DO_E2E.etapasSemVersoes]) {
    const id = await demandaDoSeed(page, titulo);
    const tem = async (rota: string) => (await api<{ itens: unknown[] }>(page, 'GET', `/api/demandas/${id}/${rota}`)).itens.length > 0;
    const esperado = `Etapas: ESP ${marca(await tem('especificacoes'))}, RSK ${marca(await tem('pareceres-risco'))}, DEC ${marca(await tem('pacotes-decisao'))}`;
    await page.goto('/demandas?tipo=melhoria&limit=100');
    const linha = page.getByRole('row').filter({ has: page.getByRole('link', { name: id, exact: true }) });
    await expect(linha.getByRole('cell', { name: esperado, exact: true })).toBeVisible();
  }
  // A do seed com ESP, RSK e DEC: as três feitas.
  const dupla = await demandaDoSeed(page, TITULOS_DO_E2E.etapasDupla);
  const linhaDupla = page.getByRole('row').filter({ has: page.getByRole('link', { name: dupla, exact: true }) });
  await expect(linhaDupla.getByRole('cell', { name: 'Etapas: ESP feita, RSK feita, DEC feita', exact: true })).toBeVisible();
  await semViolacoes(page, 'fila com 100 por página');
});

test('CA-06.3: com mais de 20 demandas, "Próxima" leva à página 2 com o foco no resultado', async ({ page }) => {
  await entrarComo(page, 'cto');
  expect(await totalDaApi(page, '')).toBeGreaterThan(20);
  await page.goto('/demandas');
  await esperarFilaPronta(page);
  const paginacao = page.getByRole('navigation', { name: 'Paginação' });
  await paginacao.getByRole('link', { name: 'Próxima' }).click();
  await expect(page).toHaveURL(/\/demandas\?offset=20$/);
  await expect(resultado(page)).toBeFocused();
  await expect(resultado(page)).toHaveText(LEGENDA_TODAS);
  await expect(paginacao.getByText('Página 2')).toHaveAttribute('aria-current', 'page');
});

test.describe('celular', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('CA-07.1: sem tabela visível; lista com um item por demanda, cada um com os oito dados', async ({ page }) => {
    await entrarComo(page, 'cto');
    const { itens } = await api<Lista>(page, 'GET', '/api/demandas?limit=8');
    expect(itens).toHaveLength(8);
    await page.goto('/demandas?limit=8');
    await esperarFilaPronta(page);
    await expect(page.locator('main table')).toBeHidden();
    // 06-T09-testes: a tabela está no DOM (uma forma por largura, a outra com display: none) e fora da árvore de
    // acessibilidade; o id de foco continua um só.
    await expect(page.locator('main table')).toHaveCount(1);
    await expect(page.getByRole('table')).toHaveCount(0);
    await expect(resultado(page)).toHaveCount(1);
    const lista = page.getByRole('list', { name: LEGENDA_TODAS });
    const cartoes = lista.getByRole('listitem');
    await expect(cartoes).toHaveCount(8);
    for (const [i, d] of itens.entries()) {
      const cartao = cartoes.nth(i);
      await expect(cartao.getByRole('link', { name: d.id, exact: true })).toHaveAttribute('href', `/demandas/${d.id}`);
      await expect(cartao.getByRole('heading', { level: 3 })).toHaveText(d.titulo);
      await expect(cartao).toContainText(ROTULO_STATUS[d.status]);
      expect(await cartao.locator('dt').allTextContents()).toEqual(['Tipo', 'Urgência', 'Linha de serviço', 'Etapas', 'Idade']);
      await expect(cartao.locator('dd')).toHaveCount(5);
      await expect(cartao.locator('dd').nth(3)).toContainText(/^Etapas: ESP (feita|por fazer), RSK (feita|por fazer), DEC (feita|por fazer)/);
      await expect(cartao.locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}T/);
    }
    await semViolacoes(page, 'fila em cartões em 390 px');
  });

  test('CA-07.2: contador no celular foca o resultado da lista e anuncia o total', async ({ page }) => {
    await entrarComo(page, 'cto');
    const total = await totalDaApi(page, 'status=nova');
    expect(total).toBeGreaterThanOrEqual(1);
    await page.goto('/demandas');
    await esperarFilaPronta(page);
    await contadores(page).getByRole('button', { name: /^Nova/ }).click();
    await expect(page).toHaveURL(/\/demandas\?status=nova$/);
    await expect(resultado(page)).toBeFocused();
    await expect(regiaoDeAviso(page)).toHaveText(encontradas(total));
    // Uma página de até 20 cartões: na suíte inteira, mais de 20 demandas ficam em "Nova".
    await expect(page.getByRole('list', { name: 'Demandas com status Nova, da mais nova para a mais antiga' }).getByRole('listitem')).toHaveCount(Math.min(total, 20));
  });

  test('"Mais filtros (1 ativo)" com tipo=bug; abre com aria-expanded e mostra Tipo, Linha, Filtrar e Limpar filtros', async ({ page }) => {
    await entrarComo(page, 'cto');
    await page.goto('/demandas?tipo=bug');
    await esperarFilaPronta(page);
    const botao = page.getByRole('button', { name: 'Mais filtros (1 ativo)' });
    // Pelo rótulo exato: a lista tem o nome do título do resultado ("Demandas com tipo Bug, …").
    const tipo = page.getByLabel('Tipo', { exact: true });
    await expect(botao).toHaveAttribute('aria-expanded', 'false');
    await expect(botao).toHaveAttribute('aria-controls', 'mais-filtros');
    await expect(tipo).toBeHidden();
    await botao.click();
    await expect(botao).toHaveAttribute('aria-expanded', 'true');
    await expect(tipo).toBeVisible();
    await expect(tipo).toHaveValue('bug');
    await expect(page.getByLabel('Linha de serviço', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filtrar' })).toBeVisible();
    await expect(page.locator('main fieldset').getByRole('link', { name: 'Limpar filtros' })).toBeVisible();
    await semViolacoes(page, 'fila com "Mais filtros" aberto em 390 px');
    await botao.click();
    await expect(botao).toHaveAttribute('aria-expanded', 'false');
    await expect(tipo).toBeHidden();
  });

  test('RNF-03: contadores, id do cartão, Filtrar e Limpar filtros com ao menos 44 × 44 px', async ({ page }) => {
    await entrarComo(page, 'cto');
    await page.goto('/demandas');
    await esperarFilaPronta(page);
    const medir = async (rotulo: string, caixa: { width: number; height: number } | null) => {
      expect(caixa, rotulo).not.toBeNull();
      expect(caixa!.width, `${rotulo}: largura`).toBeGreaterThanOrEqual(44);
      expect(caixa!.height, `${rotulo}: altura`).toBeGreaterThanOrEqual(44);
    };
    const botoes = contadores(page).getByRole('button');
    await expect(botoes).toHaveCount(10);
    for (let i = 0; i < 10; i++) await medir(`contador ${i + 1}`, await botoes.nth(i).boundingBox());
    const primeiroId = page.getByRole('list', { name: LEGENDA_TODAS }).getByRole('listitem').first().getByRole('link');
    await medir('id do cartão', await primeiroId.boundingBox());
    await page.getByRole('button', { name: 'Mais filtros' }).click();
    await medir('Filtrar', await page.getByRole('button', { name: 'Filtrar' }).boundingBox());
    await medir('Limpar filtros', await page.locator('main fieldset').getByRole('link', { name: 'Limpar filtros' }).boundingBox());
  });
});

test('CA-07.3: em 320 px, scrollWidth não passa da largura da janela', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.setViewportSize({ width: 320, height: 640 });
  for (const endereco of ['/demandas', '/demandas?tipo=melhoria&limit=100']) {
    await page.goto(endereco);
    await esperarFilaPronta(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), endereco).toBeLessThanOrEqual(320);
  }
});

test('CA-07.4: em 1280 px, a tabela está visível e a lista não está na árvore de acessibilidade', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/demandas');
  await esperarFilaPronta(page);
  await expect(page.getByRole('table', { name: LEGENDA_TODAS })).toBeVisible();
  await expect(page.getByRole('list', { name: LEGENDA_TODAS })).toHaveCount(0);
  await expect(page.locator('main ul[aria-labelledby="resultado-da-fila"]')).toBeHidden();
  // 06-T09-testes (Minor 3 da 06-T09-revisao): a lista está no DOM e só fica escondida; o id de foco continua um só.
  await expect(page.locator('main ul[aria-labelledby="resultado-da-fila"]')).toHaveCount(1);
  await expect(resultado(page)).toHaveCount(1);
  await expect(page.getByRole('button', { name: /^Mais filtros/ })).toBeHidden();
  await expect(page.getByLabel('Tipo', { exact: true })).toBeVisible();
});

// --- 06-T09-testes (qa-automacao): bordas da ligação entre contadores, filtros e a contagem. Só leem: nenhuma demanda
// nem versão é criada (C-36).

test('CA-05.1 e CA-05.4: com tipo=bug, cada contador mostra o total da API para aquele status e tipo, na ordem', async ({ page }) => {
  await entrarComo(page, 'cto');
  // Pré-condição que torna o teste discriminante: há demandas de outro tipo, então contar sem o filtro daria outro número.
  const todasComBug = await totalDaApi(page, 'tipo=bug');
  expect(await totalDaApi(page, '')).toBeGreaterThan(todasComBug);
  await page.goto('/demandas?tipo=bug');
  await esperarFilaPronta(page);
  const botoes = contadores(page).getByRole('button');
  await expect(botoes).toHaveCount(10);
  const esperados: [string, string][] = [['Todas', 'tipo=bug'], ...Object.entries(ROTULO_STATUS).map(([s, r]): [string, string] => [r, `status=${s}&tipo=bug`])];
  for (const [i, [rotulo, consulta]] of esperados.entries()) {
    const n = await totalDaApi(page, consulta);
    await expect(botoes.nth(i), rotulo).toHaveAccessibleName(`${rotulo} ${n.toLocaleString('pt-BR')} ${n === 1 ? 'demanda' : 'demandas'}`);
  }
  await expect(contadores(page).locator('[aria-pressed="true"]')).toHaveCount(1);
  await expect(botoes.first()).toHaveAttribute('aria-pressed', 'true');
});

test('"Filtrar" com status na URL mantém o status (campo oculto) e aplica o tipo, com o foco no resultado', async ({ page }) => {
  await entrarComo(page, 'cto');
  // O seed deixa demandas de melhoria em "Pronta para decisão" (etapasDupla, decisaoRecomendaB).
  const total = await totalDaApi(page, 'status=pronta_para_decisao&tipo=melhoria');
  expect(total).toBeGreaterThanOrEqual(1);
  await page.goto('/demandas?status=pronta_para_decisao');
  await esperarFilaPronta(page);
  await page.getByLabel('Tipo', { exact: true }).selectOption('melhoria');
  // WCAG 3.2.2: mudar a seleção não aplica nada.
  await expect(page).toHaveURL(/\/demandas\?status=pronta_para_decisao$/);
  await page.getByRole('button', { name: 'Filtrar' }).click();
  await expect(page).toHaveURL(/\/demandas\?status=pronta_para_decisao&tipo=melhoria$/);
  await expect(contadores(page).getByRole('button', { name: /^Pronta para decisão/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(resultado(page)).toBeFocused();
  await expect(regiaoDeAviso(page)).toHaveText(encontradas(total));
  // Os contadores remontam com o tipo novo e contam só melhoria.
  await expect(contadores(page).getByRole('button', { name: /^Pronta para decisão/ })).toHaveAccessibleName(
    `Pronta para decisão ${total.toLocaleString('pt-BR')} ${total === 1 ? 'demanda' : 'demandas'}`,
  );
});
