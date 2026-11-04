// T44: a seção "Pedido de Construção" da T11 (03, T11; RF-22; CA-26.3; 04, C-16 e C-28). Gerar é uma ação (Server
// Action, POST), e não um GET; baixar entrega o JSON exato que a API devolve; copiar usa a área de transferência; o 422
// mostra o campo e o tipo, nunca o valor; Estudo não tem botão. O axe roda aprovado antes de marcar a caixa, com a caixa
// sem marcar e o erro dela, com a caixa marcada, gerado, com erro 422 (e-mail; e-mail e nome) e no Estudo.
//
// DEC-DEM-20261104-0013-v1 (04-regressao): D3, a caixa de confirmação de que o texto não tem dado pessoal (sem ela, a
// tela não chama a ação; a API responde 422; o evento pedido_gerado grava a confirmação e o histórico a mostra); D1, o
// nome do solicitante no texto recusa com `<caminho>: nome`, sem o valor, num 422 só com o C-28; D2, aprovadoPor com o
// papel. Todos os POST que devem passar, ou que provam outra recusa (C-28, Estudo), mandam a confirmação.
//
// C-36 (06-T43-tech-lead, "C-36 no e2e"): esta spec não cria nenhuma demanda. Com A-02 (08-correcao: só um DEC aprovado
// por demanda), cada teste usa uma demanda própria do seed fictício (T33; scripts/seed-ficticio.ts, TITULOS_DO_E2E),
// achada por GET /api/demandas: três de tipo novo_projeto e uma de tipo estudo. Cada teste cria, pela API e com a
// sessão da conta "cto", a própria ESP, o próprio RSK e um DEC de nível "Só o CTO", e aprova o DEC pela API.
//   - conta "cto": 0 demandas e 12 versões (4 testes × ESP, RSK e DEC);
//   - conta "administradora": 0 demandas e 0 versões.
// O teste de C-28 também troca o solicitante da própria demanda (PATCH, duas vezes) para provar o D1 e devolve o nome
// do seed no fim, mesmo se falhar.
// Cada DEC cita a ESP e o RSK da própria demanda, criados no próprio teste: um teste não depende do outro e cada um
// roda sozinho. O caso de C-28 é uma ESP com um e-mail fictício, na demanda própria dele.
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { CONTAS_FICTICIAS } from '../scripts/seed-ficticio';
import { api, entrarComo, semViolacoes } from './apoio';

type Versao = { id: string };
type ListaDemandas = { itens: { id: string; titulo: string }[] };
type Historico = { itens: { acao: string; entidadeId: string; antes: unknown; depois: unknown }[] };

// D3 do 0013: o corpo que confirma que o texto não tem dado pessoal, e os textos da caixa e das recusas (dados-do-pedido.ts
// e gerar.ts), escritos aqui por inteiro para o teste quebrar se mudarem.
const CONFIRMADO = { confirmaSemDadoPessoal: true } as const;
const ROTULO_DA_CAIXA =
  'Confirmo que o título, a descrição, a ESP e o parecer de risco deste pacote não têm dado pessoal de ninguém: nome, e-mail, telefone ou CPF.';
const ERRO_DA_CAIXA = 'Marque a confirmação para gerar o pedido.';
const SEM_CONFIRMACAO = 'Confirme que o título, a descrição, a ESP e o parecer de risco não têm dado pessoal de ninguém. Nada foi entregue.';
const NAO_PASSOU = 'O pedido não passou na validação do /construir. Nada foi entregue.';
const ORIENTACAO = {
  nome: 'O nome do solicitante, inteiro ou em parte com inicial maiúscula, está nos campos da lista. Tire o nome e gere de novo.',
  demanda: 'Título e descrição (demanda.titulo, demanda.descricao): corrija na demanda, em "Editar dados".',
  esp: 'ESP, critérios de aceite, definição de pronto, sistema e repositório: corrija numa versão nova da ESP.',
  aviso: 'Atenção: com este pacote aprovado, outro pacote desta demanda não pode ser aprovado nesta versão. Fale com o CTO antes de refazer o texto.',
} as const;
const HISTORICO_COM_CONFIRMACAO = (decId: string) => `Gerou o Pedido de Construção de ${decId}, com a confirmação de que o texto não tem dado pessoal`;

// DEC-<demanda>-v<n> → a demanda.
const demandaDoDec = (decId: string) => decId.slice('DEC-'.length, decId.lastIndexOf('-v'));

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

// O POST da rota, com o Origin do painel e o corpo JSON que ela exige (C-15). Por padrão, com a confirmação (D3 do 0013).
function postDaApi(page: Page, decId: string, corpo: unknown = CONFIRMADO) {
  return page.request.post(`/api/pacotes-decisao/${decId}/pedido-construcao`, {
    headers: { origin: new URL(page.url()).origin, 'content-type': 'application/json' },
    data: corpo,
  });
}

const pedidosGerados = async (page: Page, decId: string) =>
  (await api<Historico>(page, 'GET', `/api/demandas/${demandaDoDec(decId)}/historico`)).itens
    .filter((e) => e.acao === 'pedido_gerado')
    .map((e) => ({ entidadeId: e.entidadeId, antes: e.antes, depois: e.depois }));

const secao = (page: Page) => page.getByRole('region', { name: 'Pedido de Construção', exact: true });
const bloco = (page: Page) => page.getByRole('region', { name: 'Conteúdo do Pedido de Construção', exact: true });
const gerar = (page: Page) => page.getByRole('button', { name: 'Gerar Pedido de Construção' });
const caixa = (page: Page) => page.getByRole('checkbox', { name: ROTULO_DA_CAIXA, exact: true });

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
  // D3 do 0013: o aviso novo e, antes do botão, a caixa desmarcada, obrigatória e com rótulo associado; o botão segue
  // habilitado (validação no envio).
  await expect(secao(page)).toContainText(
    'O pedido vai para o repositório git da estruturaAutonoma. Não deixe nome, e-mail, telefone ou CPF de qualquer pessoa ou do cliente no título, na descrição, na ESP nem no parecer de risco.',
  );
  await expect(caixa(page)).toHaveCount(1);
  await expect(caixa(page)).not.toBeChecked();
  await expect(caixa(page)).toHaveAttribute('aria-required', 'true');
  await expect(caixa(page)).not.toHaveAttribute('aria-invalid', /.*/);
  await expect(gerar(page)).toBeEnabled();
  await expect(page.getByRole('link', { name: `Baixar ${decId}.json` })).toHaveCount(0);
  await expect(bloco(page)).toHaveCount(0);
  await semViolacoes(page, 'T11 aprovado, antes de marcar a caixa');

  // C-16: o pedido sai da ação (POST), e nenhum GET pede o pedido. A Server Action é um POST para a própria página.
  const gets: string[] = [];
  const acoes: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'GET' && r.url().includes('pedido-construcao')) gets.push(r.url());
    if (r.method() === 'POST' && new URL(r.url()).pathname === `/pacotes-decisao/${decId}`) acoes.push(r.url());
  });

  // D3 do 0013: com a caixa desmarcada, o botão não chama a ação; o erro fica na caixa (aria-describedby) e o foco vai
  // para ela.
  await gerar(page).click();
  await expect(secao(page).getByText(ERRO_DA_CAIXA, { exact: true })).toBeVisible();
  await expect(caixa(page)).toBeFocused();
  await expect(caixa(page)).toHaveAttribute('aria-invalid', 'true');
  await expect(caixa(page)).toHaveAccessibleDescription(ERRO_DA_CAIXA);
  await expect(caixa(page)).not.toBeChecked();
  await expect(page.getByRole('status')).toHaveText('');
  await expect(bloco(page)).toHaveCount(0);
  await expect(page.getByRole('link', { name: `Baixar ${decId}.json` })).toHaveCount(0);
  expect(acoes).toEqual([]);
  await semViolacoes(page, 'T11 com a caixa sem marcar e o erro dela');

  // Pelo teclado: o Espaço marca a caixa, que já tem o foco, e o erro some.
  await page.keyboard.press('Space');
  await expect(caixa(page)).toBeChecked();
  await expect(secao(page).getByText(ERRO_DA_CAIXA, { exact: true })).toHaveCount(0);
  await expect(caixa(page)).not.toHaveAttribute('aria-invalid', /.*/);
  expect(acoes).toEqual([]);
  await semViolacoes(page, 'T11 com a caixa marcada');

  await gerar(page).click();
  await expect(page.getByRole('status')).toHaveText('Pedido de Construção gerado.');
  expect(acoes).toHaveLength(1);
  await expect(gerar(page)).toBeFocused();
  // A caixa continua marcada depois de gerar.
  await expect(caixa(page)).toBeChecked();
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
  // D2 do 0013: aprovadoPor leva o papel de quem aprovou, e não o nome da conta.
  expect(JSON.parse(daApi)).toMatchObject({
    pedido: decId,
    decisao: { id: decId, aprovadoPor: 'cto' },
    sistema_alvo: 'sistema-ficticio',
    repositorio_destino: 'wsssistemas2626-crypto/sistema-ficticio',
  });
  expect(daApi).not.toContain(CONTAS_FICTICIAS.cto.nome);
  expect(gets).toEqual([]);
  expect(acoes).toHaveLength(1);

  // D3 do 0013 pela API: sem a confirmação, ou com false, 422 com a mensagem, sem download e sem evento.
  for (const corpo of [{}, { confirmaSemDadoPessoal: false }]) {
    const r = await postDaApi(page, decId, corpo);
    expect(r.status(), JSON.stringify(corpo)).toBe(422);
    expect(r.headers()['content-disposition']).toBeUndefined();
    expect(await r.json()).toEqual({ erro: 'nao_processavel', mensagem: SEM_CONFIRMACAO });
  }
  // Duas gerações aceitas (a da tela e a da API), cada uma com a confirmação no evento; as recusas não gravam.
  const esperado = { entidadeId: decId, antes: null, depois: CONFIRMADO };
  expect(await pedidosGerados(page, decId)).toEqual([esperado, esperado]);
  // O histórico da demanda (T05) mostra a confirmação.
  await page.goto(`/demandas/${demandaDoDec(decId)}`);
  await expect(page.getByText(HISTORICO_COM_CONFIRMACAO(decId), { exact: true })).toHaveCount(2);
});

test('Copiar JSON: "JSON copiado para a área de transferência." em role=status; a cópia que falha orienta copiar à mão', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await entrarComo(page, 'cto');
  const decId = await prepararDecAprovado(page, 'copiar', espConstruida);
  await page.goto(`/pacotes-decisao/${decId}`);
  await caixa(page).check();
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

test('C-28: ESP com e-mail fictício → "O pedido não passou na validação do /construir. Nada foi entregue." com o campo e o tipo, sem o valor; D1 do 0013: com o nome do solicitante, um 422 só com os dois', async ({
  page,
}) => {
  await entrarComo(page, 'cto');
  const decId = await prepararDecAprovado(page, 'validacao', { ...espConstruida, descricaoObjetiva: `Falar com ${EMAIL_FICTICIO} sobre o portal (fictício).` });
  await page.goto(`/pacotes-decisao/${decId}`);
  await caixa(page).check();
  await gerar(page).click();
  const alerta = page.getByRole('alert').filter({ hasText: 'O pedido não passou na validação do /construir.' });
  await expect(alerta).toContainText('O pedido não passou na validação do /construir. Nada foi entregue. Erros:');
  await expect(alerta.getByRole('listitem')).toHaveText(['especificacao.conteudo: e-mail']);
  // D1 do 0013 (E5): a orientação diz onde corrigir o campo e avisa do A-02, um parágrafo por linha; a frase única de
  // antes só vale quando nenhum campo do pedido está na lista.
  await expect(alerta.locator('p')).toHaveText([`${NAO_PASSOU} Erros:`, ORIENTACAO.esp, ORIENTACAO.aviso]);
  await expect(alerta).not.toContainText('Corrija criando uma versão nova da ESP e um pacote novo.');
  // O foco vai ao alerta, no invólucro focável dele.
  await expect(alerta.locator('xpath=..')).toBeFocused();
  await expect(page.locator('main')).not.toContainText(EMAIL_FICTICIO);
  await expect(page.getByRole('link', { name: /^Baixar / })).toHaveCount(0);
  await expect(bloco(page)).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('');
  await semViolacoes(page, 'T11 com erro 422 do pedido');
  // A API recusa igual, com a confirmação (a recusa é a do C-28, e não a da falta dela), e nada é entregue.
  const r = await postDaApi(page, decId);
  expect(r.status()).toBe(422);
  expect(r.headers()['content-disposition']).toBeUndefined();
  const texto = await r.text();
  expect(texto).not.toContain(EMAIL_FICTICIO);
  expect(JSON.parse(texto)).toEqual({ erro: 'nao_processavel', mensagem: NAO_PASSOU, erros: ['especificacao.conteudo: e-mail'] });

  // D1 do 0013 (E4 e E6): o nome conferido é o atual da demanda. Com o solicitante "Portal Ficticio", a parte "Portal",
  // com inicial maiúscula, está no título copiado no DEC: um 422 só, com o C-28 primeiro e o nome depois, sem o valor.
  const demandaId = demandaDoDec(decId);
  const { solicitanteNome } = await api<{ solicitanteNome: string }>(page, 'GET', `/api/demandas/${demandaId}`);
  await api(page, 'PATCH', `/api/demandas/${demandaId}`, { solicitanteNome: 'Portal Ficticio' });
  try {
    await gerar(page).click();
    await expect(alerta.getByRole('listitem')).toHaveText(['especificacao.conteudo: e-mail', 'demanda.titulo: nome']);
    await expect(alerta.locator('p')).toHaveText([`${NAO_PASSOU} Erros:`, ORIENTACAO.nome, ORIENTACAO.demanda, ORIENTACAO.esp, ORIENTACAO.aviso]);
    await expect(alerta.locator('xpath=..')).toBeFocused();
    await expect(alerta).not.toContainText('Portal Ficticio');
    await expect(alerta).not.toContainText(EMAIL_FICTICIO);
    await expect(bloco(page)).toHaveCount(0);
    await semViolacoes(page, 'T11 com erro 422 de e-mail e nome');
    const comNome = await postDaApi(page, decId);
    expect(comNome.status()).toBe(422);
    const textoComNome = await comNome.text();
    expect(JSON.parse(textoComNome)).toEqual({ erro: 'nao_processavel', mensagem: NAO_PASSOU, erros: ['especificacao.conteudo: e-mail', 'demanda.titulo: nome'] });
    expect(textoComNome).not.toMatch(/Portal Ficticio|Ficticio/);
  } finally {
    await api(page, 'PATCH', `/api/demandas/${demandaId}`, { solicitanteNome });
  }
  // Com o nome do seed de volta, só o e-mail; nenhuma recusa gravou evento.
  const r2 = await postDaApi(page, decId);
  expect(await r2.json()).toEqual({ erro: 'nao_processavel', mensagem: NAO_PASSOU, erros: ['especificacao.conteudo: e-mail'] });
  expect(await pedidosGerados(page, decId)).toEqual([]);
});

test('Estudo: "Demanda do tipo Estudo não gera Pedido de Construção." e nenhum botão', async ({ page }) => {
  await entrarComo(page, 'cto');
  const decId = await prepararDecAprovado(page, 'estudo', espEstudo);
  await page.goto(`/pacotes-decisao/${decId}`);
  await expect(page.getByText(/^Decisão registrada: Aprovada, opção A, por /)).toBeVisible();
  await expect(secao(page)).toContainText('Demanda do tipo Estudo não gera Pedido de Construção.');
  await expect(secao(page).getByRole('button')).toHaveCount(0);
  await expect(secao(page).getByRole('link')).toHaveCount(0);
  await expect(secao(page).getByRole('checkbox')).toHaveCount(0);
  await expect(gerar(page)).toHaveCount(0);
  await semViolacoes(page, 'T11 aprovado de Estudo');
  // CA-22.3: a API também recusa, com a confirmação (a recusa é a do Estudo, e não a da falta dela).
  const r = await postDaApi(page, decId);
  expect(r.status()).toBe(422);
  expect(await r.json()).toEqual({ erro: 'nao_processavel', mensagem: 'demanda do tipo estudo não gera Pedido de Construção' });
});
