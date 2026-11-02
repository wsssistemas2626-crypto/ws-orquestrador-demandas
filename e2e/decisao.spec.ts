// T43: T11 Decisão do pacote (03, T11; RF-12 a RF-14; 04, C-14; P1-a, P1-b, P1-d). Os pacotes são criados pela API
// com a sessão da conta fictícia "cto", um DEC novo por teste, todos sobre uma demanda só desta spec (do seed, com a
// ESP e o RSK gravados na primeira vez que um teste precisa). Uma demanda por teste estourava o limite por ator da
// suíte inteira (C-36: 30 demandas por hora por conta). A ordem do arquivo é a do fluxo: aprovar e a dupla aprovação
// deixam a demanda em Pronta para decisão; devolver a leva a Em análise; arquivar, a Encerrada; depois, o 404 e a
// sessão, sem mudar o banco. Cada teste roda também sozinho. O pacote de rascunho de agente é o do seed fictício
// (T33), que nasce "CTO e administradora" (08-correcao, A-04: o nível do DEC de agente é da regra do servidor), e
// nenhum teste daqui registra decisão nele. O P1-b usa um DEC de pessoa de nível "Só o CTO", criado pela "cto". Com
// A-02 (só um DEC aprovado por demanda), a dupla aprovação usa uma demanda própria, que vem do seed
// (TITULOS_DO_E2E.duplaAprovacao) e não da API, pelo mesmo limite C-36; ela troca a sessão da página da "cto" para
// a "administradora". O axe roda nos estados pendente (com e sem rascunho de agente), com erro, com o diálogo aberto,
// sem formulário, com o conflito da A-02, desatualizado e decidido (aprovado, aprovado nas duas contas, devolvido e
// arquivado).
//
// DEC-DEM-20261102-0002-v1: a demanda da spec também vem do seed (TITULOS_DO_E2E.decisao), achada por demandaDoSeed.
//
// DEC-DEM-20261102-0003-v1: as demandas do seed ficam no banco e acumulam versões e decisões entre execuções contra o
// mesmo banco (homologação reaproveitada, --repeat-each). Cada teste confere pela API o estado de que precisa antes de
// qualquer POST, e não supõe o número da versão (proximoId):
//   - exigem banco recém-semeado: "nível cto: aprovar A" e "dupla aprovação" (a demanda não pode ter DEC aprovado: A-02
//     recusa o segundo), "CA-12.4" (a demanda tem de estar num status de onde a devolução a leva a Em análise; depois
//     do "Arquivar" ela fica Encerrada, que é final) e "Arquivar" (só a partida de ORIGENS_DO_FLUXO prova a mudança
//     para Encerrada: B-01 do DEC-DEM-20261102-0003-v1, corrigido no DEC-DEM-20261102-0004-v1). Fora do CI, eles
//     são pulados com a mensagem "exige banco recém-semeado: ..."; no CI, o banco é sempre novo (Testcontainers), e a
//     mesma pré-condição falsa reprova o teste;
//   - rodam em qualquer banco: C-14, M-01, P1-b, A-02 (o segundo DEC aprovado recebe o 409, e a demanda fica com um só
//     DEC aprovado) e o de 404 e sessão.
// Uso por conta deste arquivo: "cto" 0 demandas pela API; "administradora" 0 demandas.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { api, demandaDoSeed, entrarComo, semViolacoes } from './apoio';
import { prepararEspERsk, procurarEmPaginas, proximoId, TAMANHO_DA_PAGINA } from './preparacao';

type Versao = { id: string };
type Pacote = { id: string; rascunhoAgente: boolean; statusDecisao: string };

// Os status de onde um DEC novo leva a demanda a Pronta para decisão e a devolução a leva a Em análise
// (src/modules/demandas/transicoes.ts, AUTOMATICAS: dec_criado e decisao_devolvida). Fora deles, a transição automática
// não faz nada.
const ORIGENS_DO_FLUXO: readonly string[] = ['nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao'];

// Pré-condição de banco recém-semeado, conferida antes de qualquer POST: o teste pulado não gasta versão do C-36 nem
// muda o banco. No CI (banco novo pelo Testcontainers), a pré-condição falsa é defeito e reprova; fora dele, pula com
// a mensagem.
function exigeBancoRecemSemeado(condicao: boolean, motivo: string): void {
  const mensagem = `exige banco recém-semeado: ${motivo}`;
  if (process.env.CI) expect(condicao, mensagem).toBe(true);
  else test.skip(!condicao, mensagem);
}

const especificacoes = async (page: Page, id: string) => (await api<{ itens: Versao[] }>(page, 'GET', `/api/demandas/${id}/especificacoes`)).itens;
const pareceres = async (page: Page, id: string) => (await api<{ itens: Versao[] }>(page, 'GET', `/api/demandas/${id}/pareceres-risco`)).itens;
const pacotes = async (page: Page, id: string) => (await api<{ itens: Pacote[] }>(page, 'GET', `/api/demandas/${id}/pacotes-decisao`)).itens;
const statusDa = async (page: Page, id: string) => (await api<{ status: string }>(page, 'GET', `/api/demandas/${id}`)).status;
const temDecAprovado = async (page: Page, id: string) => (await pacotes(page, id)).some((p) => p.statusDecisao === 'aprovada');

const espValida = {
  descricaoObjetiva: 'Evitar pedidos duplicados (fictício).',
  escopoInclui: ['Conferir o id do pedido antes de criar (fictício)'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['O mesmo pedido não aparece duas vezes (fictício)'],
  definicaoDePronto: ['Testes verdes (fictício)'],
};
const rskValido = { riscoTecnicoNivel: 'alto', riscoOperacionalNivel: 'medio', riscoJuridicoNivel: 'baixo' };
const TITULO = TITULOS_DO_E2E.decisao;

// A demanda da spec vem do seed (DEC-DEM-20261102-0002-v1), e não de uma variável do módulo: quando um teste falhava, o
// worker novo do Playwright perdia a variável e criava outra demanda pela "cto", e o fim da suíte recebia 429 (C-36). O
// estado fica no banco. DEC-DEM-20261102-0003-v1 (M-01): a preparação confere a lista de ESP e a de RSK separadamente e
// cria só o que falta (prepararEspERsk). Se a ESP gravou e o RSK falhou (429 ou tempo esgotado), o teste reprova, e o
// worker novo cria só o RSK, sem versão a mais; sem falha, ele acha as mesmas versões e não cria nada.
async function completarEspERsk(page: Page, id: string): Promise<string> {
  await prepararEspERsk({
    listarEsp: () => especificacoes(page, id),
    listarRsk: () => pareceres(page, id),
    criarEsp: () => api<Versao>(page, 'POST', `/api/demandas/${id}/especificacoes`, espValida),
    criarRsk: () => api<Versao>(page, 'POST', `/api/demandas/${id}/pareceres-risco`, rskValido),
  });
  return id;
}

const demanda = async (page: Page): Promise<string> => completarEspERsk(page, await demandaDoSeed(page, TITULO));

async function novoPacote(page: Page, demandaId: string, nivel: 'cto' | 'cto_e_administradora'): Promise<string> {
  const dec = await api<Versao>(page, 'POST', `/api/demandas/${demandaId}/pacotes-decisao`, {
    resumoExecutivo: 'Resumo executivo fictício.',
    opcaoA: { descricao: 'Construir tudo numa entrega (fictício)', vantagens: 'Resolve a causa (fictício)' },
    opcaoB: { descricao: 'Construir em duas entregas (fictício)' },
    nivelAprovacaoRequerido: nivel,
  });
  return dec.id;
}

async function prepararPacote(page: Page, nivel: 'cto' | 'cto_e_administradora'): Promise<{ demandaId: string; decId: string }> {
  const demandaId = await demanda(page);
  return { demandaId, decId: await novoPacote(page, demandaId, nivel) };
}

// N-03: percorre as páginas da fila de pendentes, que cresce a cada execução contra o mesmo banco.
async function idDoDecDeRascunhoDoSeed(page: Page): Promise<string> {
  const dec = await procurarEmPaginas(
    (offset) => api<{ itens: Pacote[]; total: number }>(page, 'GET', `/api/pacotes-decisao?statusDecisao=pendente&limit=${TAMANHO_DA_PAGINA}&offset=${offset}`),
    (p) => p.rascunhoAgente,
  );
  if (!dec) throw new Error('e2e: o seed não tem DEC de rascunho de agente pendente');
  return dec.id;
}

const grupo = (page: Page, nome: string): Locator => page.getByRole('group', { name: nome, exact: true });
const decisao = (page: Page, rotulo: 'Aprovar' | 'Devolver para nova análise' | 'Arquivar'): Locator =>
  grupo(page, 'Decisão (obrigatório)').getByRole('radio', { name: rotulo, exact: true });
const resumoDeErros = (page: Page) => page.getByRole('alert').filter({ hasText: 'Corrija os campos abaixo para continuar.' });
const dialogo = (page: Page) => page.getByRole('dialog', { name: 'Confirmar a decisão?' });
const registrar = (page: Page) => page.getByRole('button', { name: 'Registrar decisão' });

async function confirmar(page: Page): Promise<void> {
  await registrar(page).click();
  await expect(dialogo(page)).toBeVisible();
  await dialogo(page).getByRole('button', { name: 'Confirmar e registrar' }).click();
}

// Aprovar a opção A pela tela, com comentário, no DEC de nível cto aberto na página ("nível cto: aprovar A" e A-02).
async function aprovarOpcaoA(page: Page): Promise<void> {
  await decisao(page, 'Aprovar').check();
  await page.getByRole('radio', { name: 'Opção A — Construir tudo numa entrega (fictício)' }).check();
  await page.getByLabel('Comentários (opcional)').fill('Pode seguir (fictício).');
  await confirmar(page);
}

const alertaAprovada = (page: Page) => page.getByRole('alert').filter({ hasText: 'Decisão registrada: Aprovada, opção A.' });

test('C-14: revisão visível antes de decidir e repetida no diálogo, num DEC de agente (seed); sem marcar a revisão, o erro', async ({ page }) => {
  await entrarComo(page, 'cto');
  const decId = await idDoDecDeRascunhoDoSeed(page);
  await page.goto(`/pacotes-decisao/${decId}`);
  await expect(page).toHaveTitle('Decisão do pacote — WS Orquestrador de Demandas');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Decisão: /);
  const revisao = page.getByRole('region', { name: 'Revisão antes de decidir' });
  await expect(revisao).toContainText('wsssistemas2626-crypto/');
  await expect(revisao).toContainText('Risco técnico:');
  await expect(revisao).toContainText('Risco jurídico:');
  await expect(revisao).toContainText('Nível de aprovação:');
  await expect(page.getByText('Rascunho de agente').first()).toBeVisible();
  await expect(page.getByText(/^Este pacote cita conteúdo gerado por agente de IA: DEC-.+, ESP-.+ e RSK-.+\. Leia cada um antes de decidir\.$/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Recomendação do agente de consolidação' })).toBeVisible();
  await semViolacoes(page, 'T11 pendente com rascunhos');

  // Validação no envio: nada marcado.
  await registrar(page).click();
  await expect(resumoDeErros(page)).toBeFocused();
  await expect(resumoDeErros(page).getByRole('link')).toHaveText([
    'Decisão: Escolha a decisão.',
    'Revisei os rascunhos de agente citados neste pacote: Marque que revisou os rascunhos de agente para registrar a decisão.',
  ]);
  await semViolacoes(page, 'T11 com erro');

  // O grupo "Opção escolhida" aparece ao marcar Aprovar, sem mover o foco (03, T11).
  await expect(grupo(page, 'Opção escolhida (obrigatório)')).toHaveCount(0);
  await decisao(page, 'Aprovar').check();
  await expect(decisao(page, 'Aprovar')).toBeFocused();
  await page.getByRole('radio', { name: /^Opção A/ }).check();
  await registrar(page).click();
  await expect(resumoDeErros(page).getByRole('link')).toHaveText([
    'Revisei os rascunhos de agente citados neste pacote: Marque que revisou os rascunhos de agente para registrar a decisão.',
  ]);
  await expect(dialogo(page)).toBeHidden();

  await page.getByRole('checkbox', { name: 'Revisei os rascunhos de agente citados neste pacote (obrigatório)' }).check();
  await registrar(page).click();
  const d = dialogo(page);
  await expect(d).toBeVisible();
  await expect(d).toContainText('Você vai registrar: Aprovar a opção A. Depois de registrada, a decisão deste pacote não muda.');
  await expect(d).toContainText('wsssistemas2626-crypto/');
  await expect(d).toContainText(/Só o CTO|CTO e administradora/);
  await semViolacoes(page, 'T11 com o diálogo aberto');
  // "Voltar" fecha sem registrar e devolve o foco ao botão de origem; o pacote do seed continua pendente.
  await d.getByRole('button', { name: 'Voltar' }).click();
  await expect(d).toBeHidden();
  await expect(registrar(page)).toBeFocused();
  expect((await api<Pacote>(page, 'GET', `/api/pacotes-decisao/${decId}`)).statusDecisao).toBe('pendente');
});

test('M-01: a preparação da demanda da spec completa o que falta e não cria versão a mais', async ({ page }) => {
  await entrarComo(page, 'cto');
  const id = await demandaDoSeed(page, TITULO);
  const espAntes = (await especificacoes(page, id)).map((v) => v.id);
  const rskAntes = (await pareceres(page, id)).map((v) => v.id);
  // Duas vezes seguidas: a segunda não cria nada.
  expect(await demanda(page)).toBe(id);
  expect(await demanda(page)).toBe(id);
  const espDepois = (await especificacoes(page, id)).map((v) => v.id);
  const rskDepois = (await pareceres(page, id)).map((v) => v.id);
  // Lista vazia ganha exatamente a v1; lista com versão fica igual. As duas terminam com pelo menos um item.
  expect(espDepois, 'ESP da demanda').toEqual(espAntes.length === 0 ? [proximoId('ESP', id, [])] : espAntes);
  expect(rskDepois, 'RSK da demanda').toEqual(rskAntes.length === 0 ? [proximoId('RSK', id, [])] : rskAntes);
});

test('P1-b: administradora em DEC de nível cto vê "Este pacote exige só a aprovação do CTO." e nenhum formulário', async ({ page }) => {
  // DEC de pessoa de nível cto: o de agente do seed nasce "CTO e administradora" (A-04).
  await entrarComo(page, 'cto');
  const { decId } = await prepararPacote(page, 'cto');
  await entrarComo(page, 'administradora');
  await page.goto(`/pacotes-decisao/${decId}`);
  await expect(page.getByText('Este pacote exige só a aprovação do CTO.', { exact: true })).toBeVisible();
  await expect(page.locator('main form')).toHaveCount(0);
  await expect(registrar(page)).toHaveCount(0);
  await semViolacoes(page, 'T11 sem formulário para a administradora');
});

test('nível cto: aprovar A → "Decisão registrada: Aprovada, opção A." e o lembrete de status manual (P1-d)', async ({ page }) => {
  await entrarComo(page, 'cto');
  const demandaId = await demandaDoSeed(page, TITULO);
  const status = await statusDa(page, demandaId);
  const aprovado = await temDecAprovado(page, demandaId);
  exigeBancoRecemSemeado(!aprovado && ORIGENS_DO_FLUXO.includes(status), `a demanda ${demandaId} já tem DEC aprovado (A-02) ou está ${status}`);
  const decId = await novoPacote(page, await completarEspERsk(page, demandaId), 'cto');
  await page.goto(`/demandas/${demandaId}`);
  await page.getByRole('link', { name: `Abrir decisão ${decId}` }).click();
  await expect(page).toHaveURL(new RegExp(`/pacotes-decisao/${decId}$`));
  await expect(page.getByRole('heading', { level: 1, name: `Decisão: ${TITULO}` })).toBeVisible();
  await expect(page.getByText('Decisão pendente', { exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await semViolacoes(page, 'T11 pendente');

  await aprovarOpcaoA(page);
  const resultado = alertaAprovada(page);
  await expect(resultado).toHaveText('Decisão registrada: Aprovada, opção A.');
  // O foco vai ao alerta de resultado (03, T11, Foco), no invólucro focável dele.
  await expect(resultado.locator('xpath=..')).toBeFocused();
  await expect(page.getByText('A demanda continua em Pronta para decisão até alguém mudar o status para Aprovada no detalhe da demanda.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ir para a demanda' })).toHaveAttribute('href', `/demandas/${demandaId}`);
  await expect(page.getByText(/^Decisão registrada: Aprovada, opção A, por Pessoa Ficticia CTO em \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}\.$/)).toBeVisible();
  await expect(page.getByText('Pode seguir (fictício).')).toBeVisible();
  await expect(page.locator('main form')).toHaveCount(0);
  await semViolacoes(page, 'T11 decidido');
  expect(await api<Pacote>(page, 'GET', `/api/pacotes-decisao/${decId}`)).toMatchObject({ statusDecisao: 'aprovada' });
  expect(await statusDa(page, demandaId)).toBe('pronta_para_decisao');
});

test('A-02: com um DEC aprovado na demanda, aprovar outro mostra o conflito e o pacote continua pendente', async ({ page }) => {
  await entrarComo(page, 'cto');
  const demandaId = await demanda(page);
  // Sozinho (--grep) num banco recém-semeado, a demanda ainda não tem DEC aprovado: o teste aprova um pela tela.
  if (!(await temDecAprovado(page, demandaId))) {
    const primeiro = await novoPacote(page, demandaId, 'cto');
    await page.goto(`/pacotes-decisao/${primeiro}`);
    await aprovarOpcaoA(page);
    await expect(alertaAprovada(page)).toHaveText('Decisão registrada: Aprovada, opção A.');
  }
  const aprovadosAntes = (await pacotes(page, demandaId)).filter((p) => p.statusDecisao === 'aprovada').map((p) => p.id);
  expect(aprovadosAntes, 'DEC aprovados da demanda antes').toHaveLength(1);

  const decId = await novoPacote(page, demandaId, 'cto');
  await page.goto(`/pacotes-decisao/${decId}`);
  await expect(page.getByText('Decisão pendente', { exact: true })).toBeVisible();
  await aprovarOpcaoA(page);
  await expect(page.getByRole('alert').filter({ hasText: 'Não foi possível concluir' })).toHaveText(
    'Não foi possível concluir: outro pacote desta demanda já está aprovado.',
  );
  await semViolacoes(page, 'T11 com o conflito da A-02');
  expect((await api<Pacote>(page, 'GET', `/api/pacotes-decisao/${decId}`)).statusDecisao).toBe('pendente');
  const aprovadosDepois = (await pacotes(page, demandaId)).filter((p) => p.statusDecisao === 'aprovada').map((p) => p.id);
  expect(aprovadosDepois, 'DEC aprovados da demanda depois: exatamente um, o mesmo').toEqual(aprovadosAntes);
});

test('dupla aprovação: CTO aprova; administradora entra, vê a opção fixada, informa documento e data; "O pacote está aprovado."', async ({ page }) => {
  await entrarComo(page, 'cto');
  // Demanda própria (A-02): o teste anterior já deixou um DEC aprovado na demanda da spec.
  const dd = await demandaDoSeed(page, TITULOS_DO_E2E.duplaAprovacao);
  // Um DEC só com a aprovação do CTO não tem decisão e não conta.
  exigeBancoRecemSemeado(!(await temDecAprovado(page, dd)), `a demanda ${dd} já tem DEC aprovado (A-02)`);
  const decId = await novoPacote(page, await completarEspERsk(page, dd), 'cto_e_administradora');
  await page.goto(`/pacotes-decisao/${decId}`);
  await expect(page.getByText('CTO: pendente.', { exact: true })).toBeVisible();
  await expect(page.getByText('Administradora: pendente.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Identificador do documento assinado (obrigatório)')).toHaveCount(0);
  await decisao(page, 'Aprovar').check();
  await page.getByRole('radio', { name: /^Opção B/ }).check();
  await registrar(page).click();
  await expect(dialogo(page)).toContainText('Nível de aprovação: CTO e administradora.');
  await dialogo(page).getByRole('button', { name: 'Confirmar e registrar' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Aprovação do CTO' })).toHaveText('Aprovação do CTO registrada. Falta a aprovação da administradora.');
  await expect(
    page.getByText('Sua aprovação está registrada. Falta a aprovação da administradora, com a referência ao documento assinado. O pacote só vale depois dela.'),
  ).toBeVisible();
  await expect(page.getByText(/^CTO: Pessoa Ficticia CTO aprovou a opção B em /)).toBeVisible();
  await expect(page.locator('main form')).toHaveCount(0);

  await entrarComo(page, 'administradora');
  await page.goto(`/pacotes-decisao/${decId}`);
  await decisao(page, 'Aprovar').check();
  await expect(page.getByText('O CTO aprovou a opção B. A sua aprovação vale para a mesma opção. Para discordar, escolha devolver ou arquivar.')).toBeVisible();
  await expect(page.getByRole('radio', { name: /^Opção/ })).toHaveCount(0);
  await expect(page.getByLabel('Identificador do documento assinado (obrigatório)')).toHaveAccessibleDescription(
    'Exemplo: número do documento no sistema de assinatura.',
  );
  await registrar(page).click();
  await expect(resumoDeErros(page).getByRole('link')).toHaveText([
    'Identificador do documento assinado: Informe o identificador do documento assinado.',
    'Data da assinatura: Informe a data da assinatura.',
  ]);
  await semViolacoes(page, 'T11 segunda aprovação com erro');
  await page.getByLabel('Identificador do documento assinado (obrigatório)').fill('DOC-FICTICIO-0001');
  await page.getByLabel('Data da assinatura (obrigatório)').fill('2026-10-23');
  await confirmar(page);
  await expect(page.getByRole('alert').filter({ hasText: 'O pacote está aprovado.' })).toHaveText('Aprovação da administradora registrada. O pacote está aprovado.');
  await expect(
    page.getByText(/^Administradora: Pessoa Ficticia Administradora aprovou a opção B em .+, com o documento DOC-FICTICIO-0001 assinado em 23\/10\/2026\.$/),
  ).toBeVisible();
  await expect(page.getByText('O sistema guarda a referência ao documento assinado; ela não substitui a assinatura.')).toBeVisible();
  await semViolacoes(page, 'T11 aprovado nas duas contas');
});

test('CA-12.4: desatualizado: aviso, Aprovar indisponível e explicado; Devolver → "A demanda voltou para Em análise."', async ({ page }) => {
  await entrarComo(page, 'cto');
  const demandaId = await demandaDoSeed(page, TITULO);
  const status = await statusDa(page, demandaId);
  exigeBancoRecemSemeado(ORIGENS_DO_FLUXO.includes(status), `a demanda ${demandaId} está ${status}, e a devolução não a leva a Em análise`);
  const decId = await novoPacote(page, await completarEspERsk(page, demandaId), 'cto');
  const esp = await api<Versao>(page, 'POST', `/api/demandas/${demandaId}/especificacoes`, espValida);
  await page.goto(`/pacotes-decisao/${decId}`);
  await expect(page.getByText('Desatualizado', { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      `Este pacote está desatualizado. A demanda já tem ${esp.id}, mais nova que a citada aqui. Ele não pode ser aprovado; você pode devolvê-lo ou arquivá-lo. Para aprovar, crie um pacote novo.`,
    ),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Criar pacote novo' })).toHaveAttribute('href', `/demandas/${demandaId}/pacotes-decisao/novo`);
  const aprovar = decisao(page, 'Aprovar');
  await expect(aprovar).toHaveAttribute('aria-disabled', 'true');
  await expect(aprovar).toHaveAccessibleDescription('Indisponível: pacote desatualizado.');
  await aprovar.click({ force: true });
  await expect(aprovar).not.toBeChecked();
  await semViolacoes(page, 'T11 desatualizado');

  await decisao(page, 'Devolver para nova análise').check();
  await expect(grupo(page, 'Opção escolhida (obrigatório)')).toHaveCount(0);
  await registrar(page).click();
  await expect(dialogo(page)).toContainText('Você vai registrar: Devolver para nova análise.');
  await dialogo(page).getByRole('button', { name: 'Confirmar e registrar' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Pacote devolvido' })).toHaveText('Pacote devolvido para nova análise. A demanda voltou para Em análise.');
  await expect(page.getByText(/^Decisão registrada: Devolvida, por Pessoa Ficticia CTO em /)).toBeVisible();
  expect(await statusDa(page, demandaId)).toBe('em_analise');
  await semViolacoes(page, 'T11 devolvido');
});

test('Arquivar → "Pacote arquivado. A demanda foi para Encerrada."', async ({ page }) => {
  await entrarComo(page, 'cto');
  const demandaId = await demandaDoSeed(page, TITULO);
  const status = await statusDa(page, demandaId);
  // Só a partida de ORIGENS_DO_FLUXO prova a mudança para Encerrada: é a origem de decisao_arquivada. De Encerrada,
  // que é final, arquivar grava a decisão e não muda o status; e o alerta é texto fixo. Por isso o teste confere o
  // status antes e depois de arquivar.
  exigeBancoRecemSemeado(ORIGENS_DO_FLUXO.includes(status), `a demanda ${demandaId} está ${status}, e o arquivamento não prova a mudança para Encerrada`);
  const decId = await novoPacote(page, await completarEspERsk(page, demandaId), 'cto');
  // De qualquer status de ORIGENS_DO_FLUXO, o DEC novo leva a demanda a Pronta para decisão (dec_criado), que é origem
  // de decisao_arquivada: o status antes de arquivar é sempre pronta_para_decisao.
  expect(await statusDa(page, demandaId), `status da demanda ${demandaId} antes de arquivar`).toBe('pronta_para_decisao');
  await page.goto(`/pacotes-decisao/${decId}`);
  await decisao(page, 'Arquivar').check();
  await confirmar(page);
  await expect(page.getByRole('alert').filter({ hasText: 'Pacote arquivado' })).toHaveText('Pacote arquivado. A demanda foi para Encerrada.');
  expect((await api<Pacote>(page, 'GET', `/api/pacotes-decisao/${decId}`)).statusDecisao).toBe('arquivada');
  expect(await statusDa(page, demandaId), `status da demanda ${demandaId} depois de arquivar`).toBe('encerrada');
  await semViolacoes(page, 'T11 arquivado');
});

// Sem pré-condição e sem POST: vale em qualquer banco, e roda também quando o "Arquivar" é pulado numa execução repetida.
test('404 para DEC inexistente, id de outro tipo e caminho inválido; sem sessão, a decisão vai para /entrar', async ({ page }) => {
  await entrarComo(page, 'cto');
  const demandaId = await demandaDoSeed(page, TITULO);
  // N-01: a versão que não existe é a seguinte à mais nova, lida agora; nada é criado entre a leitura e o goto.
  const decInexistente = proximoId('DEC', demandaId, (await pacotes(page, demandaId)).map((p) => p.id));
  for (const caminho of [`/pacotes-decisao/${decInexistente}`, `/pacotes-decisao/ESP-${demandaId}-v1`, '/pacotes-decisao/qualquer-coisa']) {
    const r = await page.goto(caminho);
    expect(r?.status(), caminho).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible();
  }
  // O DEC de agente do seed existe em qualquer banco (o C-14 depende dele).
  const decId = await idDoDecDeRascunhoDoSeed(page);
  await page.context().clearCookies();
  await page.goto(`/pacotes-decisao/${decId}`);
  await expect(page).toHaveURL(/\/entrar\?/);
});
