// T41 (06-T41-testes, qa-automacao): o que o e2e do engenheiro (especificacao.spec.ts) não confere no navegador:
//   - o status HTTP 404, e não 200, na T07 e na T10 (pendência da 06-T41-revisao, como o achado 3 da T39): a página
//     ficou sem esqueleto "Carregando" justamente para não perder o 404;
//   - `?base=` de outra demanda, de versão que não existe ou fora do formato: a T07 parte da mais nova da própria demanda
//     e não mostra nada da outra;
//   - o alerta de chegada da T07 na T05 com a URL forjada: versão de outra demanda, DEC de outra demanda, valor de
//     `?aviso=` fora da lista, marcação na URL;
//   - duplo clique em "Gravar": um envio só, uma ESP só, e a resposta da Server Action sem o que foi digitado.
// Os dados de cada teste são criados aqui, pela conta "administradora" (o limite por ator, C-36, conta por conta).
// Nenhum teste depende de outro ter rodado antes.
import { expect, test, type Page, type Request } from '@playwright/test';
import { api, entrarComo, semViolacoes } from './apoio';

type Demanda = { id: string };
type Versao = { id: string };

const TITULO = 'Demanda da especificação QA (fictício)';
const SENTINELA = 'SENTINELA-ESP-E2E-4b2c';

const espValida = {
  descricaoObjetiva: 'Evitar pedidos duplicados (fictício).',
  escopoInclui: ['Conferir o id do pedido antes de criar (fictício)'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['O mesmo pedido não aparece duas vezes (fictício)'],
  definicaoDePronto: ['Testes verdes (fictício)'],
};

const criar = (page: Page) => api<Demanda>(page, 'POST', '/api/demandas', { titulo: TITULO, tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' });
const espPelaApi = (page: Page, id: string, extra: Record<string, unknown> = {}) => api<Versao>(page, 'POST', `/api/demandas/${id}/especificacoes`, { ...espValida, ...extra });
const especificacoes = async (page: Page, id: string) => (await api<{ itens: Versao[] }>(page, 'GET', `/api/demandas/${id}/especificacoes`)).itens;
const ehServerAction = (r: Request) => r.method() === 'POST' && r.headers()['next-action'] !== undefined;
const item1 = (page: Page, grupo: string) => page.getByRole('group', { name: grupo, exact: true }).getByRole('textbox', { name: 'Item 1', exact: true });

test('404 com status HTTP 404, e não 200, na T07 e na T10 que não existem', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page);

  for (const caminho of ['/demandas/DEM-20261022-9999/especificacoes/nova', '/demandas/qualquer-coisa/especificacoes/nova', '/demandas/dem-20261022-0001/especificacoes/nova']) {
    const r = await page.goto(caminho);
    expect(r?.status(), caminho).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible();
    await expect(page.locator('main form')).toHaveCount(0);
  }
  await semViolacoes(page, 'T07 404');

  // A demanda existe e ainda não tem ESP; os outros são de outro artefato ou fora do formato.
  for (const caminho of [
    `/especificacoes/ESP-${d.id}-v1`,
    `/especificacoes/RSK-${d.id}-v1`,
    `/especificacoes/DEC-${d.id}-v1`,
    `/especificacoes/esp-${d.id}-v1`,
    `/especificacoes/${d.id}`,
    '/especificacoes/qualquer-coisa',
  ]) {
    const r = await page.goto(caminho);
    expect(r?.status(), caminho).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: 'Versão não encontrada' })).toBeVisible();
    await expect(page).toHaveTitle('Versão não encontrada — WS Orquestrador de Demandas');
  }

  // A que existe responde 200, com a T07 e a T10.
  const v1 = await espPelaApi(page, d.id);
  expect((await page.goto(`/especificacoes/${v1.id}`))?.status()).toBe(200);
  expect((await page.goto(`/demandas/${d.id}/especificacoes/nova?base=${v1.id}`))?.status()).toBe(200);
});

test('?base= de outra demanda, de versão que não existe ou fora do formato: a T07 parte da mais nova da própria demanda; a chegada na T05 não confia na URL', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const a = await criar(page);
  const espA = await espPelaApi(page, a.id, { descricaoObjetiva: 'Descrição da outra demanda (fictício)' });
  await api(page, 'POST', `/api/demandas/${a.id}/pareceres-risco`, { riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' });
  const decA = await api<Versao>(page, 'POST', `/api/demandas/${a.id}/pacotes-decisao`, {
    resumoExecutivo: 'Resumo fictício.',
    opcaoA: { descricao: 'Opção A fictícia' },
    opcaoB: { descricao: 'Opção B fictícia' },
    nivelAprovacaoRequerido: 'cto',
  });
  await espPelaApi(page, a.id); // o DEC da outra demanda fica pendente e desatualizado
  const d = await criar(page);
  const espD = await espPelaApi(page, d.id, { descricaoObjetiva: 'Descrição desta demanda (fictício)' });

  for (const base of [espA.id, `ESP-${d.id}-v9`, `RSK-${d.id}-v1`, 'qualquer-coisa', '%3Cscript%3Ealert(1)%3C%2Fscript%3E']) {
    const r = await page.goto(`/demandas/${d.id}/especificacoes/nova?base=${base}`);
    expect(r?.status(), base).toBe(200);
    await expect(page.getByText(`Esta será a ESP-${d.id}-v2. A v1 continua guardada e não muda.`)).toBeVisible();
    await expect(page.getByLabel('Descrição objetiva (obrigatório)')).toHaveValue('Descrição desta demanda (fictício)');
    await expect(page.locator('main')).not.toContainText('Descrição da outra demanda');
    await expect(page.locator('main')).not.toContainText('script');
  }
  // Duas bases na URL (lista): nenhuma vale.
  await page.goto(`/demandas/${d.id}/especificacoes/nova?base=${espA.id}&base=${espD.id}`);
  await expect(page.getByLabel('Descrição objetiva (obrigatório)')).toHaveValue('Descrição desta demanda (fictício)');

  const chegada = () => page.locator('main').getByRole('alert').filter({ hasText: /gravada\.|Outra versão|desatualizado/ });
  for (const busca of [
    `aviso=especificacao-gravada&versao=${espA.id}`,
    `aviso=especificacao-conflito&versao=${espA.id}`,
    `aviso=especificacao-gravada&versao=ESP-${d.id}-v9`,
    `aviso=especificacao-gravada-x&versao=${espD.id}`,
    `aviso=especificacao-gravada&versao=%3Cscript%3Ealert(1)%3C%2Fscript%3E`,
  ]) {
    await page.goto(`/demandas/${d.id}?${busca}`);
    await expect(page.getByRole('heading', { level: 1, name: TITULO })).toBeVisible();
    await expect(chegada(), busca).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText('script');
  }
  // A versão é desta demanda, mas o DEC da URL é de outra: só a frase da versão.
  await page.goto(`/demandas/${d.id}?aviso=especificacao-gravada&versao=${espD.id}&dec=${decA.id}`);
  await expect(chegada()).toHaveText(`${espD.id} gravada.`);
  await semViolacoes(page, 'T05 com a chegada da T07');
});

test('duplo clique em "Gravar": um envio só e uma ESP só; a resposta da Server Action não traz o que foi digitado', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page);
  await page.goto(`/demandas/${d.id}/especificacoes/nova`);
  await expect(page.getByRole('heading', { level: 1, name: 'Nova versão da especificação técnica' })).toBeVisible();
  const envios: Request[] = [];
  page.on('request', (r) => {
    if (ehServerAction(r)) envios.push(r);
  });

  await page.getByLabel('Descrição objetiva (obrigatório)').fill(`Descrição ${SENTINELA} (fictício)`);
  await item1(page, 'Escopo inclui').fill(`Escopo ${SENTINELA} (fictício)`);
  await page.getByLabel('Sistema alvo (obrigatório)').fill('sistema-ficticio');
  await item1(page, 'Critérios de aceite preliminares (obrigatório)').fill('Critério (fictício)');
  await item1(page, 'Definição de pronto (obrigatório)').fill('Pronto (fictício)');
  await page.getByRole('button', { name: `Gravar ESP-${d.id}-v1` }).dblclick();

  await expect(page).toHaveURL(new RegExp(`/demandas/${d.id}\\?aviso=especificacao-gravada&versao=ESP-${d.id}-v1$`));
  await expect(page.getByRole('alert').filter({ hasText: 'gravada.' })).toHaveText(`ESP-${d.id}-v1 gravada.`);
  // O segundo envio, se houvesse, sairia no segundo clique, antes da resposta do primeiro.
  expect(envios).toHaveLength(1);
  expect(envios[0]!.postData() ?? '').toContain(SENTINELA);
  const corpo = (await (await envios[0]!.response())?.text()) ?? '';
  expect(corpo).toContain(`ESP-${d.id}-v1`);
  expect(corpo).not.toContain(SENTINELA);
  expect((await especificacoes(page, d.id)).map((e) => e.id)).toEqual([`ESP-${d.id}-v1`]);
});
