// T42: T08 Novo parecer de risco e T10 Ver RSK (03, T08 e T10; RF-09, RF-11, RF-19), e o achado 1 da 06-T41-revisao na
// Lista de textos (o erro de item fica na linha certa depois de remover). Os dados são criados pela API com a sessão da
// conta fictícia "administradora", como na T41: o limite por ator (C-36: 30 demandas e 60 versões por hora) conta por
// conta, e os outros e2e criam sobretudo com a "cto". Cada teste cria a própria demanda.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { api, entrarComo, semViolacoes } from './apoio';

type Demanda = { id: string; status: string };
type Versao = { id: string };
type Rsk = {
  id: string;
  versao: number;
  resumo: string | null;
  riscoTecnicoNivel: string;
  riscoOperacionalNivel: string;
  riscoJuridicoNivel: string;
  riscoJuridicoComentario: string | null;
  recomendacoesMitigacao: string[];
  preCondicoes: string[];
};

const espValida = {
  descricaoObjetiva: 'Evitar pedidos duplicados (fictício).',
  escopoInclui: ['Conferir o id do pedido antes de criar (fictício)'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['O mesmo pedido não aparece duas vezes (fictício)'],
  definicaoDePronto: ['Testes verdes (fictício)'],
};
const rskValido = { riscoTecnicoNivel: 'alto', riscoOperacionalNivel: 'medio', riscoJuridicoNivel: 'baixo' };

const TITULO = 'Demanda do parecer de risco (fictício)';

const criar = (page: Page) => api<Demanda>(page, 'POST', '/api/demandas', { titulo: TITULO, tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' });
const rskPelaApi = (page: Page, id: string, extra: Record<string, unknown> = {}) => api<Versao>(page, 'POST', `/api/demandas/${id}/pareceres-risco`, { ...rskValido, ...extra });
const pareceres = async (page: Page, id: string) => (await api<{ itens: Rsk[] }>(page, 'GET', `/api/demandas/${id}/pareceres-risco`)).itens;

async function abrirNovo(page: Page, id: string, busca = ''): Promise<void> {
  await page.goto(`/demandas/${id}/pareceres-risco/novo${busca}`);
  await expect(page.getByRole('heading', { level: 1, name: 'Novo parecer de risco' })).toBeVisible();
}

const grupo = (page: Page, nome: string): Locator => page.getByRole('group', { name: nome, exact: true });
const nivel = (page: Page, risco: string, rotulo: 'Baixo' | 'Médio' | 'Alto'): Locator =>
  grupo(page, `Nível do ${risco} (obrigatório)`).getByRole('radio', { name: rotulo, exact: true });
const item = (page: Page, lista: string, n: number): Locator => grupo(page, lista).getByRole('textbox', { name: `Item ${n}`, exact: true });

async function marcarNiveis(page: Page): Promise<void> {
  await nivel(page, 'risco técnico', 'Alto').check();
  await nivel(page, 'risco operacional', 'Médio').check();
  await nivel(page, 'risco jurídico', 'Baixo').check();
}

const resumoDeErros = (page: Page) => page.getByRole('alert').filter({ hasText: 'Corrija os campos abaixo para continuar.' });
const chegada = (page: Page) => page.getByRole('alert').filter({ hasText: /gravado\.|Outra versão/ });

test('sem ESP: aviso "Esta demanda ainda não tem especificação técnica…" e gravação permitida', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page);
  await page.goto(`/demandas/${d.id}`);
  await page.getByRole('link', { name: 'Novo parecer de risco' }).click();
  await expect(page).toHaveURL(new RegExp(`/demandas/${d.id}/pareceres-risco/novo$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Novo parecer de risco' })).toBeVisible();
  await expect(page).toHaveTitle('Novo parecer de risco — WS Orquestrador de Demandas');
  await expect(page.locator('main')).toContainText(`${d.id} — ${TITULO}`);
  await expect(
    page.getByText('Esta demanda ainda não tem especificação técnica. Você pode gravar o parecer, mas o pacote de decisão vai exigir as duas.'),
  ).toBeVisible();
  // Vazio (03, T08): nenhum nível marcado e um item vazio em cada lista.
  for (const r of ['risco técnico', 'risco operacional', 'risco jurídico'])
    for (const rotulo of ['Baixo', 'Médio', 'Alto'] as const) await expect(nivel(page, r, rotulo)).not.toBeChecked();
  for (const l of ['Recomendações de mitigação', 'Pré-condições']) {
    await expect(grupo(page, l).getByRole('textbox')).toHaveCount(1);
    await expect(item(page, l, 1)).toHaveValue('');
  }
  await expect(grupo(page, 'Pré-condições')).toHaveAccessibleDescription('Um item por pré-condição. O que precisa estar resolvido antes de construir.');
  await expect(page.getByLabel('Quando envolver o jurídico ou a administradora')).toHaveAccessibleDescription(
    'Situações em que a decisão precisa passar pelo jurídico ou pela administradora.',
  );
  await semViolacoes(page, 'T08 vazia');

  await page.getByLabel('Resumo', { exact: true }).fill('Risco controlado (fictício).');
  await marcarNiveis(page);
  await grupo(page, 'Risco jurídico').getByLabel('Comentário').fill('Sem contrato novo (fictício).');
  await item(page, 'Recomendações de mitigação', 1).fill('Testar a integração antes (fictício)');
  await semViolacoes(page, 'T08 preenchida');
  await page.getByRole('button', { name: `Gravar RSK-${d.id}-v1` }).click();

  await expect(page).toHaveURL(new RegExp(`/demandas/${d.id}\\?aviso=parecer-gravado&versao=RSK-${d.id}-v1$`));
  await expect(chegada(page)).toHaveText(`RSK-${d.id}-v1 gravado.`);
  await expect(page.getByRole('link', { name: `Ver RSK-${d.id}-v1` })).toBeVisible();
  const [rsk] = await pareceres(page, d.id);
  expect(rsk).toMatchObject({
    versao: 1,
    resumo: 'Risco controlado (fictício).',
    riscoTecnicoNivel: 'alto',
    riscoOperacionalNivel: 'medio',
    riscoJuridicoNivel: 'baixo',
    riscoJuridicoComentario: 'Sem contrato novo (fictício).',
    recomendacoesMitigacao: ['Testar a integração antes (fictício)'],
    preCondicoes: [],
  });
  await semViolacoes(page, 'T05 depois de gravar o RSK');
});

test('erros "Escolha o nível do risco técnico." (e dos outros dois); o erro de item fica na linha certa depois de remover', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page);
  await abrirNovo(page, d.id);
  const gravar = page.getByRole('button', { name: `Gravar RSK-${d.id}-v1` });
  await page.getByLabel('Resumo', { exact: true }).fill('Resumo digitado (fictício).');
  await gravar.click();

  const resumo = resumoDeErros(page);
  await expect(resumo).toBeFocused();
  await expect(resumo.getByRole('link')).toHaveText([
    'Nível do risco técnico: Escolha o nível do risco técnico.',
    'Nível do risco operacional: Escolha o nível do risco operacional.',
    'Nível do risco jurídico: Escolha o nível do risco jurídico.',
  ]);
  await expect(grupo(page, 'Nível do risco operacional (obrigatório)')).toHaveAccessibleDescription('Escolha o nível do risco operacional.');
  await expect(page.getByLabel('Resumo', { exact: true })).toHaveValue('Resumo digitado (fictício).');
  // O axe roda com o resumo no topo: depois do link, a rolagem deixa um rádio de 20 px meio sob o cabeçalho fixo, e o
  // target-size conta só a parte visível (ver Pendências da 06-T42).
  await semViolacoes(page, 'T08 com erro');
  await resumo.getByRole('link', { name: /^Nível do risco jurídico/ }).click();
  await expect(nivel(page, 'risco jurídico', 'Baixo')).toBeFocused();
  expect(await pareceres(page, d.id)).toEqual([]);

  // Achado 1 da 06-T41-revisao: erro no item 2; remover o item 1 leva o erro (e o link do resumo) para o novo item 1.
  await marcarNiveis(page);
  const preCondicoes = grupo(page, 'Pré-condições');
  await item(page, 'Pré-condições', 1).fill('Primeira (fictício)');
  await preCondicoes.getByRole('button', { name: 'Adicionar item' }).click();
  await item(page, 'Pré-condições', 2).fill('x'.repeat(10_001));
  await gravar.click();
  await expect(resumo).toBeFocused();
  await expect(resumo.getByRole('link')).toHaveText(['Item 2 de Pré-condições: Este campo aceita até 10.000 caracteres.']);
  await expect(item(page, 'Pré-condições', 2)).toHaveAttribute('aria-invalid', 'true');
  await expect(item(page, 'Pré-condições', 1)).not.toHaveAttribute('aria-invalid', 'true');

  await preCondicoes.getByRole('button', { name: 'Remover item 1 de Pré-condições' }).click();
  await expect(preCondicoes.getByRole('textbox')).toHaveCount(1);
  await expect(preCondicoes.getByRole('button', { name: 'Adicionar item' })).toBeFocused();
  await expect(item(page, 'Pré-condições', 1)).toHaveValue('x'.repeat(10_001));
  await expect(item(page, 'Pré-condições', 1)).toHaveAttribute('aria-invalid', 'true');
  await expect(item(page, 'Pré-condições', 1)).toHaveAccessibleDescription('Este campo aceita até 10.000 caracteres.');
  await expect(resumo.getByRole('link')).toHaveText(['Item 1 de Pré-condições: Este campo aceita até 10.000 caracteres.']);
  await resumo.getByRole('link').click();
  await expect(item(page, 'Pré-condições', 1)).toBeFocused();

  // Remover a linha com erro tira o erro e o resumo.
  await preCondicoes.getByRole('button', { name: 'Remover item 1 de Pré-condições' }).click();
  await expect(resumo).toHaveCount(0);
  await expect(preCondicoes.getByRole('button', { name: 'Adicionar item' })).toBeFocused();
  await semViolacoes(page, 'T08 depois de remover o item com erro');
});

test('gravado: "RSK-…-v2 gravado."; se um DEC pendente ficou desatualizado, o aviso de 03', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page);
  const esp = await api<Versao>(page, 'POST', `/api/demandas/${d.id}/especificacoes`, espValida);
  await rskPelaApi(page, d.id, { resumo: 'Resumo da v1 (fictício)', preCondicoes: ['Contrato assinado (fictício)'] });
  const dec = await api<Versao>(page, 'POST', `/api/demandas/${d.id}/pacotes-decisao`, {
    resumoExecutivo: 'Resumo fictício.',
    opcaoA: { descricao: 'Opção A fictícia' },
    opcaoB: { descricao: 'Opção B fictícia' },
    nivelAprovacaoRequerido: 'cto',
  });

  await page.goto(`/demandas/${d.id}`);
  await page.getByRole('link', { name: 'Novo parecer de risco' }).click();
  await expect(page).toHaveURL(new RegExp(`/demandas/${d.id}/pareceres-risco/novo$`));
  await expect(page.getByText(`Este será o RSK-${d.id}-v2. A especificação mais nova desta demanda é a ${esp.id}.`)).toBeVisible();
  await expect(page.getByLabel('Resumo', { exact: true })).toHaveValue('Resumo da v1 (fictício)');
  await expect(nivel(page, 'risco técnico', 'Alto')).toBeChecked();
  await expect(nivel(page, 'risco operacional', 'Médio')).toBeChecked();
  await expect(nivel(page, 'risco jurídico', 'Baixo')).toBeChecked();
  await expect(item(page, 'Pré-condições', 1)).toHaveValue('Contrato assinado (fictício)');
  await semViolacoes(page, 'T08 a partir da v1');

  await nivel(page, 'risco jurídico', 'Alto').check();
  await page.getByRole('button', { name: `Gravar RSK-${d.id}-v2` }).click();
  await expect(chegada(page)).toHaveText(`RSK-${d.id}-v2 gravado. O pacote ${dec.id} ficou desatualizado. Crie um pacote novo para decidir.`);
  const [v2, v1] = await pareceres(page, d.id);
  expect(v2).toMatchObject({ versao: 2, riscoJuridicoNivel: 'alto', preCondicoes: ['Contrato assinado (fictício)'] });
  expect(v1).toMatchObject({ versao: 1, riscoJuridicoNivel: 'baixo' });
  await expect(page.getByText('Desatualizado', { exact: true })).toBeVisible();
  await semViolacoes(page, 'T05 depois de gravar a v2 do RSK');
});

test('conflito de versão: outro RSK gravado enquanto a tela estava aberta; "Sua versão foi gravada como v2"', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page);
  await abrirNovo(page, d.id);
  await marcarNiveis(page);
  await rskPelaApi(page, d.id);
  await page.getByRole('button', { name: `Gravar RSK-${d.id}-v1` }).click();
  await expect(chegada(page)).toHaveText('Outra versão foi gravada enquanto você editava. Sua versão foi gravada como v2; confira as duas no detalhe.');
  expect((await pareceres(page, d.id)).map((r) => r.versao)).toEqual([2, 1]);
});

test('T10 do RSK: níveis em texto, sem editar nem excluir; "Criar nova versão a partir desta"; 404', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page);
  const v1 = await rskPelaApi(page, d.id, { riscoTecnicoComentario: 'Integração frágil (fictício)', recomendacoesMitigacao: ['Mitigação A (fictício)', 'Mitigação B (fictício)'] });
  const v2 = await rskPelaApi(page, d.id, { riscoJuridicoNivel: 'alto' });

  await page.goto(`/demandas/${d.id}`);
  await page.getByRole('link', { name: `Ver ${v1.id}` }).click();
  await expect(page).toHaveURL(new RegExp(`/pareceres-risco/${v1.id}$`));
  await expect(page).toHaveTitle('Parecer de risco — WS Orquestrador de Demandas');
  await expect(page.getByRole('heading', { level: 1, name: `Parecer de risco v1 — ${TITULO}` })).toBeVisible();
  await expect(page.locator('main')).toContainText(v1.id);
  await expect(page.locator('main')).toContainText(/Criada em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2} por Pessoa Ficticia Administradora/);
  await expect(page.getByText('Esta versão não muda. Para corrigir, crie uma nova versão a partir dela.')).toBeVisible();
  await expect(page.getByText(`Existe uma versão mais nova: ${v2.id}.`)).toBeVisible();
  await expect(page.getByRole('link', { name: v2.id })).toHaveAttribute('href', `/pareceres-risco/${v2.id}`);
  for (const h2 of ['Resumo', 'Risco técnico', 'Risco operacional', 'Risco jurídico', 'Recomendações de mitigação', 'Pré-condições', 'Quando envolver o jurídico ou a administradora'])
    await expect(page.getByRole('heading', { level: 2, name: h2, exact: true })).toBeVisible();
  for (const texto of ['Risco técnico: Alto', 'Risco operacional: Médio', 'Risco jurídico: Baixo']) await expect(page.getByText(texto, { exact: true })).toBeVisible();
  await expect(page.getByText('Integração frágil (fictício)')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Recomendações de mitigação' }).getByRole('listitem')).toHaveText(['Mitigação A (fictício)', 'Mitigação B (fictício)']);
  await expect(page.getByText('Não informado.').first()).toBeVisible();
  await expect(page.getByText('Nenhum item.').first()).toBeVisible();
  await expect(page.locator('main').getByRole('button')).toHaveCount(0);
  await expect(page.locator('main').getByRole('link', { name: /Editar|Excluir|Apagar/ })).toHaveCount(0);
  await expect(page.locator('main form')).toHaveCount(0);
  await semViolacoes(page, 'T10 do RSK');

  await page.getByRole('link', { name: 'Criar nova versão a partir desta' }).click();
  await expect(page).toHaveURL(new RegExp(`/demandas/${d.id}/pareceres-risco/novo\\?base=${v1.id}$`));
  await expect(page.getByRole('button', { name: `Gravar RSK-${d.id}-v3` })).toBeVisible();
  await expect(nivel(page, 'risco jurídico', 'Baixo')).toBeChecked();
  await expect(grupo(page, 'Risco técnico').getByLabel('Comentário')).toHaveValue('Integração frágil (fictício)');
  await expect(item(page, 'Recomendações de mitigação', 2)).toHaveValue('Mitigação B (fictício)');

  await grupo(page, 'Risco técnico').getByLabel('Comentário').fill('Mudou (fictício)');
  await page.getByRole('link', { name: 'Cancelar' }).click();
  const sair = page.getByRole('dialog', { name: 'Sair sem salvar?' });
  await expect(sair).toBeVisible();
  await sair.getByRole('button', { name: 'Sair sem salvar' }).click();
  await expect(page).toHaveURL(new RegExp(`/demandas/${d.id}$`));
  expect(await pareceres(page, d.id)).toHaveLength(2);

  for (const caminho of [`/pareceres-risco/RSK-${d.id}-v9`, `/pareceres-risco/ESP-${d.id}-v1`, `/pareceres-risco/${d.id}`, '/pareceres-risco/qualquer-coisa']) {
    const r = await page.goto(caminho);
    expect(r?.status(), caminho).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: 'Versão não encontrada' })).toBeVisible();
    await expect(page).toHaveTitle('Versão não encontrada — WS Orquestrador de Demandas');
  }
  await semViolacoes(page, 'T10 do RSK 404');
  for (const caminho of ['/demandas/DEM-20261022-9999/pareceres-risco/novo', '/demandas/qualquer-coisa/pareceres-risco/novo']) {
    const r = await page.goto(caminho);
    expect(r?.status(), caminho).toBe(404);
    await expect(page.locator('main form')).toHaveCount(0);
  }
});

test('sem sessão, a T08 e a T10 do RSK levam a /entrar, exista ou não o id', async ({ page }) => {
  for (const caminho of ['/demandas/DEM-20261022-9999/pareceres-risco/novo', '/pareceres-risco/RSK-DEM-20261022-9999-v1']) {
    await page.goto(caminho);
    await expect(page).toHaveURL(/\/entrar\?/);
  }
});

test('axe em 320 px: T08 sem rolagem da página inteira', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page);
  await page.setViewportSize({ width: 320, height: 640 });
  await abrirNovo(page, d.id);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await semViolacoes(page, 'T08 em 320 px');
});
