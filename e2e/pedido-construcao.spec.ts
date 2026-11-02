// T44: a seção "Pedido de Construção" da T11 (03, T11; RF-22; CA-26.3; 04, C-16 e C-28). Gerar é uma ação (Server
// Action, POST), e não um GET; baixar entrega o JSON exato que a API devolve; copiar usa a área de transferência; o 422
// mostra o campo e o tipo, nunca o valor; Estudo não tem botão. O axe roda aprovado antes de gerar, gerado, com erro 422
// e no Estudo.
//
// C-36 (06-T43-tech-lead, "C-36 no e2e"): esta spec não cria nenhuma demanda. Com A-02 (08-correcao: só um DEC aprovado
// por demanda), cada teste usa uma demanda própria do seed fictício (T33; scripts/seed-ficticio.ts, TITULOS_DO_E2E),
// achada por GET /api/demandas: três de tipo novo_projeto e uma de tipo estudo. Cada teste cria, pela API e com a
// sessão da conta "cto", a própria ESP, o próprio RSK e um DEC de nível "Só o CTO", e aprova o DEC pela API.
//   - conta "cto": 0 demandas e 12 versões (4 testes × ESP, RSK e DEC);
//   - conta "administradora": 0 demandas e 0 versões.
// Cada DEC cita a ESP e o RSK da própria demanda, criados no próprio teste: um teste não depende do outro e cada um
// roda sozinho. O caso de C-28 é uma ESP com um e-mail fictício, na demanda própria dele.
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { api, entrarComo, semViolacoes } from './apoio';

type Versao = { id: string };
type ListaDemandas = { itens: { id: string; titulo: string }[] };

// As demandas próprias de cada teste no seed (scripts/seed-ficticio.ts, TITULOS_DO_E2E), com o tipo de cada uma.
const SEED = {
  gerar: { tipo: 'novo_projeto', titulo: 'Portal do pedido: gerar e baixar (fictício)' },
  copiar: { tipo: 'novo_projeto', titulo: 'Portal do pedido: copiar o JSON (fictício)' },
  validacao: { tipo: 'novo_projeto', titulo: 'Portal do pedido: validação do /construir (fictício)' },
  estudo: { tipo: 'estudo', titulo: 'Estudo do pedido de construção (fictício)' },
} as const;

const EMAIL_FICTICIO = 'pessoa.ficticia@cliente.test';

const espConstruida = {
  descricaoObjetiva: 'Portal para o cliente acompanhar o pedido (fictício).',
  escopoInclui: ['Consulta da situação do pedido (fictício)'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['O cliente vê a situação do pedido (fictício)'],
  definicaoDePronto: ['Testes verdes (fictício)'],
};
const espEstudo = { descricaoObjetiva: 'Comparar formas de atendimento com IA (fictício).', escopoInclui: ['Levantar opções (fictício)'] };
const rskValido = { riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };
const decValido = {
  resumoExecutivo: 'Resumo executivo fictício.',
  opcaoA: { descricao: 'Construir o portal numa entrega (fictício)' },
  opcaoB: { descricao: 'Construir em duas entregas (fictício)' },
  nivelAprovacaoRequerido: 'cto',
};

async function demandaDoSeed(page: Page, chave: keyof typeof SEED): Promise<string> {
  const { tipo, titulo } = SEED[chave];
  const { itens } = await api<ListaDemandas>(page, 'GET', `/api/demandas?tipo=${tipo}&limit=100`);
  const d = itens.find((x) => x.titulo === titulo);
  if (!d) throw new Error(`e2e: o seed não tem a demanda própria do teste "${chave}"`);
  return d.id;
}

// ESP, RSK e DEC novos na demanda própria do teste; o DEC cita os dois, que são os mais novos.
async function prepararDec(page: Page, chave: keyof typeof SEED, esp: Record<string, unknown>): Promise<string> {
  const demandaId = await demandaDoSeed(page, chave);
  await api<Versao>(page, 'POST', `/api/demandas/${demandaId}/especificacoes`, esp);
  await api<Versao>(page, 'POST', `/api/demandas/${demandaId}/pareceres-risco`, rskValido);
  return (await api<Versao>(page, 'POST', `/api/demandas/${demandaId}/pacotes-decisao`, decValido)).id;
}

const aprovar = (page: Page, decId: string) => api(page, 'PATCH', `/api/pacotes-decisao/${decId}/decisao`, { statusDecisao: 'aprovada', opcaoEscolhida: 'A' });

async function prepararDecAprovado(page: Page, chave: keyof typeof SEED, esp: Record<string, unknown>): Promise<string> {
  const decId = await prepararDec(page, chave, esp);
  await aprovar(page, decId);
  return decId;
}

// O POST da rota, com o Origin do painel e o corpo JSON que ela exige (C-15).
function postDaApi(page: Page, decId: string) {
  return page.request.post(`/api/pacotes-decisao/${decId}/pedido-construcao`, {
    headers: { origin: new URL(page.url()).origin, 'content-type': 'application/json' },
    data: {},
  });
}

const secao = (page: Page) => page.getByRole('region', { name: 'Pedido de Construção', exact: true });
const bloco = (page: Page) => page.getByRole('region', { name: 'Conteúdo do Pedido de Construção', exact: true });
const gerar = (page: Page) => page.getByRole('button', { name: 'Gerar Pedido de Construção' });

test('CA-26.3: só depois de aprovado; gerar por ação; baixar devolve <DEC-id>.json igual à resposta da API', async ({ page }) => {
  await entrarComo(page, 'cto');
  const decId = await prepararDec(page, 'gerar', espConstruida);
  await page.goto(`/pacotes-decisao/${decId}`);
  await expect(page.getByText('Decisão pendente', { exact: true })).toBeVisible();
  await expect(secao(page)).toHaveCount(0);
  await expect(gerar(page)).toHaveCount(0);

  await aprovar(page, decId);
  await page.reload();
  await expect(secao(page)).toContainText(
    'Gere o pedido, baixe ou copie o JSON e grave-o na pasta pedidos/ da estruturaAutonoma. O envio ao /construir é manual nesta versão.',
  );
  await expect(secao(page)).toContainText(
    'O pedido vai para o repositório git da estruturaAutonoma. Não deixe nome, e-mail ou telefone de cliente na ESP nem no parecer de risco.',
  );
  await expect(page.getByRole('link', { name: `Baixar ${decId}.json` })).toHaveCount(0);
  await expect(bloco(page)).toHaveCount(0);
  await semViolacoes(page, 'T11 aprovado, antes de gerar');

  // C-16: o pedido sai da ação (POST), e nenhum GET pede o pedido.
  const gets: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'GET' && r.url().includes('pedido-construcao')) gets.push(r.url());
  });
  await gerar(page).click();
  await expect(page.getByRole('status')).toHaveText('Pedido de Construção gerado.');
  await expect(gerar(page)).toBeFocused();
  await expect(bloco(page)).toBeVisible();
  await expect(bloco(page)).toHaveAttribute('tabindex', '0');
  await expect(secao(page)).toContainText('O mesmo pacote gera sempre o mesmo pedido.');
  const link = page.getByRole('link', { name: `Baixar ${decId}.json` });
  await expect(link).toHaveAttribute('download', `${decId}.json`);
  await expect(link).toHaveAttribute('href', /^data:application\/json;charset=utf-8,/);
  await semViolacoes(page, 'T11 com o pedido gerado');

  const [download] = await Promise.all([page.waitForEvent('download'), link.click()]);
  expect(download.suggestedFilename()).toBe(`${decId}.json`);
  const baixado = await readFile((await download.path())!, 'utf8');
  const resposta = await postDaApi(page, decId);
  expect(resposta.status()).toBe(200);
  const daApi = await resposta.text();
  expect(baixado).toBe(daApi);
  // O bloco mostra o conteúdo exato devolvido.
  expect(await bloco(page).textContent()).toBe(daApi);
  expect(JSON.parse(daApi)).toMatchObject({ pedido: decId, sistema_alvo: 'sistema-ficticio', repositorio_destino: 'wsssistemas2626-crypto/sistema-ficticio' });
  expect(gets).toEqual([]);
});

test('Copiar JSON: "JSON copiado para a área de transferência." em role=status; a cópia que falha orienta copiar à mão', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await entrarComo(page, 'cto');
  const decId = await prepararDecAprovado(page, 'copiar', espConstruida);
  await page.goto(`/pacotes-decisao/${decId}`);
  await gerar(page).click();
  await expect(page.getByRole('status')).toHaveText('Pedido de Construção gerado.');

  await page.getByRole('button', { name: 'Copiar JSON' }).click();
  await expect(page.getByRole('status')).toHaveText('JSON copiado para a área de transferência.');
  const copiado = await page.evaluate(() => navigator.clipboard.readText());
  expect(copiado).toBe(await bloco(page).textContent());
  expect(JSON.parse(copiado)).toMatchObject({ pedido: decId });

  // Sem a área de transferência (permissão negada pelo navegador), a tela não finge que copiou.
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('negado (fictício)')) } });
  });
  await page.getByRole('button', { name: 'Copiar JSON' }).click();
  await expect(page.getByRole('status')).toHaveText('Não foi possível copiar. Selecione o conteúdo abaixo e copie com Ctrl+C.');
  await expect(bloco(page)).toBeVisible();
});

test('C-28: ESP com e-mail fictício → "O pedido não passou na validação do /construir. Nada foi entregue." com o campo e o tipo, sem o valor', async ({ page }) => {
  await entrarComo(page, 'cto');
  const decId = await prepararDecAprovado(page, 'validacao', { ...espConstruida, descricaoObjetiva: `Falar com ${EMAIL_FICTICIO} sobre o portal (fictício).` });
  await page.goto(`/pacotes-decisao/${decId}`);
  await gerar(page).click();
  const alerta = page.getByRole('alert').filter({ hasText: 'O pedido não passou na validação do /construir.' });
  await expect(alerta).toContainText('O pedido não passou na validação do /construir. Nada foi entregue. Erros:');
  await expect(alerta.getByRole('listitem')).toHaveText(['especificacao.conteudo: e-mail']);
  await expect(alerta).toContainText('Corrija criando uma versão nova da ESP e um pacote novo.');
  // O foco vai ao alerta, no invólucro focável dele.
  await expect(alerta.locator('xpath=..')).toBeFocused();
  await expect(page.locator('main')).not.toContainText(EMAIL_FICTICIO);
  await expect(page.getByRole('link', { name: /^Baixar / })).toHaveCount(0);
  await expect(bloco(page)).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('');
  await semViolacoes(page, 'T11 com erro 422 do pedido');
  // A API recusa igual, e nada é entregue.
  const r = await postDaApi(page, decId);
  expect(r.status()).toBe(422);
  expect(r.headers()['content-disposition']).toBeUndefined();
  expect(await r.text()).not.toContain(EMAIL_FICTICIO);
});

test('Estudo: "Demanda do tipo Estudo não gera Pedido de Construção." e nenhum botão', async ({ page }) => {
  await entrarComo(page, 'cto');
  const decId = await prepararDecAprovado(page, 'estudo', espEstudo);
  await page.goto(`/pacotes-decisao/${decId}`);
  await expect(page.getByText(/^Decisão registrada: Aprovada, opção A, por /)).toBeVisible();
  await expect(secao(page)).toContainText('Demanda do tipo Estudo não gera Pedido de Construção.');
  await expect(secao(page).getByRole('button')).toHaveCount(0);
  await expect(secao(page).getByRole('link')).toHaveCount(0);
  await expect(gerar(page)).toHaveCount(0);
  await semViolacoes(page, 'T11 aprovado de Estudo');
  // CA-22.3: a API também recusa.
  expect((await postDaApi(page, decId)).status()).toBe(422);
});
