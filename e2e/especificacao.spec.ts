// T41: Lista de textos (03, 2.4), T07 Nova versão da ESP e T10 Ver ESP (03, T07 e T10; RF-08, RF-11, RF-15, RF-19).
// Os dados são criados pela API com a sessão da conta fictícia "administradora": o limite por ator (C-36: 30 demandas e
// 60 versões por hora) conta por conta, e os outros e2e criam sobretudo com a "cto".
import { type Locator, type Page } from '@playwright/test';
import { api, entrarComo, expect, semViolacoes, test } from './apoio';

type Demanda = { id: string; status: string };
type Versao = { id: string };
type Esp = {
  id: string;
  versao: number;
  descricaoObjetiva: string;
  escopoInclui: string[];
  escopoExclui: string[];
  duvidasEmAberto: string[];
  sistemaAlvo: string | null;
  repositorioDestino: string | null;
  criteriosAceitePreliminares: string[] | null;
  definicaoDePronto: string[] | null;
};

const espValida = {
  descricaoObjetiva: 'Evitar pedidos duplicados (fictício).',
  escopoInclui: ['Conferir o id do pedido antes de criar (fictício)'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['O mesmo pedido não aparece duas vezes (fictício)'],
  definicaoDePronto: ['Testes verdes (fictício)'],
};

const TITULO = 'Demanda da especificação (fictício)';

async function criar(page: Page, extra: Record<string, unknown> = {}): Promise<Demanda> {
  return api<Demanda>(page, 'POST', '/api/demandas', { titulo: TITULO, tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia', ...extra });
}

const espPelaApi = (page: Page, id: string, extra: Record<string, unknown> = {}) => api<Versao>(page, 'POST', `/api/demandas/${id}/especificacoes`, { ...espValida, ...extra });
const especificacoes = async (page: Page, id: string) => (await api<{ itens: Esp[] }>(page, 'GET', `/api/demandas/${id}/especificacoes`)).itens;

async function abrirNova(page: Page, id: string, busca = ''): Promise<void> {
  await page.goto(`/demandas/${id}/especificacoes/nova${busca}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Nova versão da especificação técnica' })).toBeVisible();
}

const lista = (page: Page, nome: string): Locator => page.getByRole('group', { name: nome, exact: true });

// Preenche os obrigatórios de um tipo construído (03, T07).
async function preencherObrigatorios(page: Page): Promise<void> {
  await page.getByLabel('Descrição objetiva (obrigatório)').fill('Evitar pedidos duplicados (fictício).');
  await lista(page, 'Escopo inclui').getByRole('textbox', { name: 'Item 1', exact: true }).fill('Conferir o id do pedido (fictício)');
  await page.getByLabel('Sistema alvo (obrigatório)').fill('sistema-ficticio');
  await lista(page, 'Critérios de aceite preliminares (obrigatório)').getByRole('textbox', { name: 'Item 1', exact: true }).fill('O mesmo pedido não aparece duas vezes (fictício)');
  await lista(page, 'Definição de pronto (obrigatório)').getByRole('textbox', { name: 'Item 1', exact: true }).fill('Testes verdes (fictício)');
}

const resumoDeErros = (page: Page) => page.getByRole('alert').filter({ hasText: 'Corrija os campos abaixo para continuar.' });

test('primeira ESP: "Esta será a primeira especificação técnica desta demanda, a v1." e gravação volta à T05 com "ESP-…-v1 gravada."', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page);
  await abrirNova(page, d.id);
  await expect(page).toHaveTitle('Nova versão da especificação técnica — WS Orquestrador de Demandas');
  await expect(page.locator('main')).toContainText(`${d.id} — ${TITULO}`);
  await expect(page.getByText('Esta será a primeira especificação técnica desta demanda, a v1.')).toBeVisible();
  for (const nome of ['Escopo inclui', 'Escopo exclui', 'Dúvidas em aberto', 'Critérios de aceite preliminares (obrigatório)', 'Definição de pronto (obrigatório)']) {
    await expect(lista(page, nome).getByRole('textbox')).toHaveCount(1);
    await expect(lista(page, nome).getByRole('textbox', { name: 'Item 1', exact: true })).toHaveValue('');
  }
  await semViolacoes(page, 'T07 vazia');

  await preencherObrigatorios(page);
  await page.getByLabel('Situação atual').fill('Pedidos chegam duas vezes (fictício).');
  await page.getByLabel('ERP').fill('ERP fictício');
  await semViolacoes(page, 'T07 preenchida');
  await page.getByRole('button', { name: `Gravar ESP-${d.id}-v1` }).click();

  await expect(page).toHaveURL(new RegExp(`/demandas/${d.id}\\?aviso=especificacao-gravada&versao=ESP-${d.id}-v1$`));
  await expect(page.getByRole('alert').filter({ hasText: 'gravada.' })).toHaveText(`ESP-${d.id}-v1 gravada.`);
  await expect(page.getByRole('link', { name: `Ver ESP-${d.id}-v1` })).toBeVisible();
  const [esp] = await especificacoes(page, d.id);
  expect(esp).toMatchObject({
    versao: 1,
    descricaoObjetiva: 'Evitar pedidos duplicados (fictício).',
    escopoInclui: ['Conferir o id do pedido (fictício)'],
    escopoExclui: [],
    duvidasEmAberto: [],
    sistemaAlvo: 'sistema-ficticio',
    repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
    criteriosAceitePreliminares: ['O mesmo pedido não aparece duas vezes (fictício)'],
    definicaoDePronto: ['Testes verdes (fictício)'],
  });
});

test('v2 começa preenchida com a v1 e diz "A v1 continua guardada e não muda."; o DEC pendente fica desatualizado', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page);
  await espPelaApi(page, d.id, { escopoExclui: ['Relatórios (fictício)'] });
  await api(page, 'POST', `/api/demandas/${d.id}/pareceres-risco`, { riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'medio', riscoJuridicoNivel: 'baixo' });
  const dec = await api<Versao>(page, 'POST', `/api/demandas/${d.id}/pacotes-decisao`, {
    resumoExecutivo: 'Resumo fictício.',
    opcaoA: { descricao: 'Opção A fictícia' },
    opcaoB: { descricao: 'Opção B fictícia' },
    nivelAprovacaoRequerido: 'cto',
  });

  await page.goto(`/demandas/${d.id}`);
  await page.getByRole('link', { name: 'Nova versão da ESP' }).click();
  await expect(page).toHaveURL(new RegExp(`/demandas/${d.id}/especificacoes/nova$`));
  await expect(page.getByText(`Esta será a ESP-${d.id}-v2. A v1 continua guardada e não muda.`)).toBeVisible();
  await expect(page.getByLabel('Descrição objetiva (obrigatório)')).toHaveValue(espValida.descricaoObjetiva);
  await expect(lista(page, 'Escopo inclui').getByRole('textbox', { name: 'Item 1', exact: true })).toHaveValue(espValida.escopoInclui[0]!);
  await expect(lista(page, 'Escopo exclui').getByRole('textbox', { name: 'Item 1', exact: true })).toHaveValue('Relatórios (fictício)');
  await expect(page.getByLabel('Sistema alvo (obrigatório)')).toHaveValue('sistema-ficticio');
  await expect(page.getByText('Repositório destino: wsssistemas2626-crypto/sistema-ficticio')).toBeVisible();

  await page.getByLabel('Situação desejada').fill('Um pedido por compra (fictício).');
  await page.getByRole('button', { name: `Gravar ESP-${d.id}-v2` }).click();
  const alerta = page.getByRole('alert').filter({ hasText: 'gravada.' });
  await expect(alerta).toHaveText(`ESP-${d.id}-v2 gravada. O pacote ${dec.id} ficou desatualizado. Crie um pacote novo para decidir.`);
  const [v2, v1] = await especificacoes(page, d.id);
  expect(v2).toMatchObject({ versao: 2, escopoExclui: ['Relatórios (fictício)'] });
  expect(v1).toMatchObject({ versao: 1 });
  await semViolacoes(page, 'T05 depois de gravar a v2');
});

test('lista de textos: Adicionar item leva o foco ao campo novo; Remover leva ao anterior; 50 itens desabilita', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page);
  await abrirNova(page, d.id);
  const escopo = lista(page, 'Escopo inclui');
  const adicionar = escopo.getByRole('button', { name: 'Adicionar item' });

  await escopo.getByRole('textbox', { name: 'Item 1', exact: true }).fill('Primeiro (fictício)');
  await adicionar.click();
  await expect(escopo.getByRole('textbox', { name: 'Item 2', exact: true })).toBeFocused();
  await page.keyboard.type('Segundo (fictício)');
  await adicionar.click();
  await expect(escopo.getByRole('textbox', { name: 'Item 3', exact: true })).toBeFocused();

  await escopo.getByRole('button', { name: 'Remover item 3 de Escopo inclui' }).click();
  await expect(escopo.getByRole('textbox', { name: 'Item 2', exact: true })).toBeFocused();
  await expect(escopo.getByRole('textbox', { name: 'Item 2', exact: true })).toHaveValue('Segundo (fictício)');
  await escopo.getByRole('button', { name: 'Remover item 1 de Escopo inclui' }).click();
  await expect(escopo.getByRole('textbox')).toHaveCount(1);
  await expect(escopo.getByRole('textbox', { name: 'Item 1', exact: true })).toHaveValue('Segundo (fictício)');
  await expect(adicionar).toBeFocused();
  await escopo.getByRole('button', { name: 'Remover item 1 de Escopo inclui' }).click();
  await expect(escopo.getByRole('textbox')).toHaveCount(0);
  await expect(adicionar).toBeFocused();

  for (let i = 0; i < 50; i++) await adicionar.click();
  await expect(escopo.getByRole('textbox')).toHaveCount(50);
  await expect(adicionar).toBeDisabled();
  await expect(adicionar).toHaveAccessibleDescription('Limite de 50 itens atingido.');
  await expect(escopo.getByText('Limite de 50 itens atingido.')).toBeVisible();
  await semViolacoes(page, 'T07 com 50 itens');
  await escopo.getByRole('button', { name: 'Remover item 50 de Escopo inclui' }).click();
  await expect(adicionar).toBeEnabled();
  await expect(escopo.getByRole('textbox', { name: 'Item 49', exact: true })).toBeFocused();
});

test('repositório destino calculado: wsssistemas2626-crypto/<sistema alvo>; erros de construção da API no resumo', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page);
  await abrirNova(page, d.id);
  const sistema = page.getByLabel('Sistema alvo (obrigatório)');
  await sistema.fill('ws-exemplo');
  await expect(page.getByText('Repositório destino: wsssistemas2626-crypto/ws-exemplo')).toBeVisible();
  await expect(sistema).toHaveAccessibleDescription(/Só letras minúsculas, números e hífen\. Exemplo: ws-orquestrador-demandas\..*Repositório destino: wsssistemas2626-crypto\/ws-exemplo/);
  await page.getByLabel('Conta do repositório (obrigatório)').selectOption('fabianojp06');
  await expect(page.getByText('Repositório destino: fabianojp06/ws-exemplo')).toBeVisible();

  // Erros do cliente, na ordem da tela; o link leva ao campo (na lista, ao primeiro item).
  await sistema.fill('Com Maiúscula');
  await page.getByRole('button', { name: `Gravar ESP-${d.id}-v1` }).click();
  const resumo = resumoDeErros(page);
  await expect(resumo).toBeFocused();
  await expect(resumo.getByRole('link')).toHaveText([
    'Descrição objetiva: Informe a descrição objetiva.',
    'Sistema alvo: Sistema alvo aceita só letras minúsculas, números e hífen.',
    'Critérios de aceite preliminares: Informe ao menos um critério de aceite preliminar.',
    'Definição de pronto: Informe ao menos um item da definição de pronto.',
  ]);
  await expect(sistema).toHaveAttribute('aria-invalid', 'true');
  await expect(sistema).toHaveValue('Com Maiúscula');
  await resumo.getByRole('link', { name: /^Critérios de aceite preliminares/ }).click();
  await expect(lista(page, 'Critérios de aceite preliminares (obrigatório)').getByRole('textbox', { name: 'Item 1', exact: true })).toBeFocused();
  await semViolacoes(page, 'T07 com erro');

  // Erros que só a API vê: a demanda passou a Estudo → Melhoria fora da tela, depois de a tela abrir como Estudo.
  const estudo = await criar(page, { tipo: 'estudo' });
  await abrirNova(page, estudo.id);
  await expect(page.getByRole('group', { name: 'Construção (opcional: demanda do tipo Estudo não gera Pedido de Construção)' })).toBeVisible();
  await page.getByLabel('Descrição objetiva (obrigatório)').fill('Estudo fictício.');
  await api(page, 'PATCH', `/api/demandas/${estudo.id}`, { tipo: 'melhoria' });
  await page.getByRole('button', { name: `Gravar ESP-${estudo.id}-v1` }).click();
  await expect(resumo).toBeFocused();
  await expect(resumo.getByRole('link')).toHaveText([
    'Sistema alvo: Informe o sistema alvo.',
    'Critérios de aceite preliminares: Informe ao menos um critério de aceite preliminar.',
    'Definição de pronto: Informe ao menos um item da definição de pronto.',
  ]);
  await expect(page.getByLabel('Descrição objetiva (obrigatório)')).toHaveValue('Estudo fictício.');
  expect(await especificacoes(page, estudo.id)).toEqual([]);
  await semViolacoes(page, 'T07 com erro da API');
});

test('com dúvida: diálogo, "Gravar mesmo assim" e "A demanda foi para Aguardando informação."', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page);
  await abrirNova(page, d.id);
  await preencherObrigatorios(page);
  await lista(page, 'Dúvidas em aberto').getByRole('textbox', { name: 'Item 1', exact: true }).fill('Qual o volume diário de pedidos? (fictício)');
  const gravar = page.getByRole('button', { name: `Gravar ESP-${d.id}-v1` });
  await gravar.click();

  const dialogo = page.getByRole('dialog', { name: 'Gravar com dúvidas em aberto?' });
  await expect(dialogo).toBeVisible();
  await expect(dialogo.getByRole('heading', { name: 'Gravar com dúvidas em aberto?' })).toBeFocused();
  await expect(dialogo).toContainText('A demanda vai para Aguardando informação. Nenhuma mensagem é enviada ao solicitante.');
  await semViolacoes(page, 'T07 diálogo de dúvidas');
  await dialogo.getByRole('button', { name: 'Voltar' }).click();
  await expect(dialogo).toBeHidden();
  await expect(gravar).toBeFocused();
  expect(await especificacoes(page, d.id)).toEqual([]);

  await gravar.click();
  await page.keyboard.press('Escape');
  await expect(dialogo).toBeHidden();
  await expect(gravar).toBeFocused();

  await gravar.click();
  await dialogo.getByRole('button', { name: 'Gravar mesmo assim' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'gravada.' })).toHaveText(`ESP-${d.id}-v1 gravada. A demanda foi para Aguardando informação.`);
  expect((await api<Demanda>(page, 'GET', `/api/demandas/${d.id}`)).status).toBe('aguardando_informacao');
  await expect(page.getByRole('heading', { level: 2, name: 'Dúvidas em aberto' })).toBeVisible();
});

test('conflito de versão: outra ESP gravada enquanto a tela estava aberta; "Sua versão foi gravada como v2"', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page);
  await abrirNova(page, d.id);
  await preencherObrigatorios(page);
  await espPelaApi(page, d.id);
  await page.getByRole('button', { name: `Gravar ESP-${d.id}-v1` }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Outra versão' })).toHaveText(
    'Outra versão foi gravada enquanto você editava. Sua versão foi gravada como v2; confira as duas no detalhe.',
  );
  expect((await especificacoes(page, d.id)).map((e) => e.versao)).toEqual([2, 1]);
});

test('T10: somente leitura, sem botão de editar nem de excluir; "Criar nova versão a partir desta"', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page);
  const v1 = await espPelaApi(page, d.id, { situacaoAtual: 'Situação atual fictícia', escopoInclui: ['Inclui A (fictício)', 'Inclui B (fictício)'] });
  const v2 = await espPelaApi(page, d.id);

  await page.goto(`/demandas/${d.id}`);
  await page.getByRole('link', { name: `Ver ${v1.id}` }).click();
  await expect(page).toHaveURL(new RegExp(`/especificacoes/${v1.id}$`));
  await expect(page).toHaveTitle('Especificação técnica — WS Orquestrador de Demandas');
  await expect(page.getByRole('heading', { level: 1, name: `Especificação técnica v1 — ${TITULO}` })).toBeVisible();
  await expect(page.locator('main')).toContainText(v1.id);
  await expect(page.locator('main')).toContainText(/Criada em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2} por Pessoa Ficticia Administradora/);
  await expect(page.getByText('Esta versão não muda. Para corrigir, crie uma nova versão a partir dela.')).toBeVisible();
  await expect(page.getByText(`Existe uma versão mais nova: ${v2.id}.`)).toBeVisible();
  await expect(page.getByRole('link', { name: v2.id })).toHaveAttribute('href', `/especificacoes/${v2.id}`);
  for (const h2 of ['Problema', 'Escopo', 'Sistemas envolvidos', 'Dados', 'Restrições técnicas', 'Dúvidas em aberto', 'Construção'])
    await expect(page.getByRole('heading', { level: 2, name: h2 })).toBeVisible();
  const escopo = page.locator('dd').filter({ has: page.getByRole('listitem') }).first();
  await expect(escopo.getByRole('listitem')).toHaveText(['Inclui A (fictício)', 'Inclui B (fictício)']);
  await expect(page.getByText('Não informado.').first()).toBeVisible();
  await expect(page.getByText('Nenhum item.').first()).toBeVisible();
  await expect(page.locator('main').getByRole('button')).toHaveCount(0);
  await expect(page.locator('main').getByRole('link', { name: /Editar|Excluir|Apagar/ })).toHaveCount(0);
  await expect(page.locator('main form')).toHaveCount(0);
  await semViolacoes(page, 'T10');

  await page.getByRole('link', { name: 'Criar nova versão a partir desta' }).click();
  await expect(page).toHaveURL(new RegExp(`/demandas/${d.id}/especificacoes/nova\\?base=${v1.id}$`));
  await expect(page.getByText(`Esta será a ESP-${d.id}-v3. A v1 continua guardada e não muda.`)).toBeVisible();
  await expect(page.getByLabel('Situação atual')).toHaveValue('Situação atual fictícia');
  await expect(lista(page, 'Escopo inclui').getByRole('textbox', { name: 'Item 2', exact: true })).toHaveValue('Inclui B (fictício)');

  await page.getByLabel('Situação atual').fill('Mudou (fictício)');
  await page.getByRole('link', { name: 'Cancelar' }).click();
  const sair = page.getByRole('dialog', { name: 'Sair sem salvar?' });
  await expect(sair).toBeVisible();
  await sair.getByRole('button', { name: 'Sair sem salvar' }).click();
  await expect(page).toHaveURL(new RegExp(`/demandas/${d.id}$`));
  expect(await especificacoes(page, d.id)).toHaveLength(2);

  for (const caminho of [`/especificacoes/ESP-${d.id}-v9`, `/especificacoes/RSK-${d.id}-v1`, '/especificacoes/qualquer-coisa']) {
    await page.goto(caminho);
    await expect(page.getByRole('heading', { level: 1, name: 'Versão não encontrada' })).toBeVisible();
    await expect(page).toHaveTitle('Versão não encontrada — WS Orquestrador de Demandas');
  }
  await semViolacoes(page, 'T10 404');
});

test('sem sessão, a T07 e a T10 levam a /entrar, exista ou não o id', async ({ page }) => {
  for (const caminho of ['/demandas/DEM-20261022-9999/especificacoes/nova', '/especificacoes/ESP-DEM-20261022-9999-v1']) {
    await page.goto(caminho);
    await expect(page).toHaveURL(/\/entrar\?/);
  }
});

test('axe em 320 px: T07 sem rolagem da página inteira', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await abrirNova(page, d.id);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await semViolacoes(page, 'T07 em 320 px');
});
