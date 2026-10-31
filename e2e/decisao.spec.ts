// T43: T11 Decisão do pacote (03, T11; RF-12 a RF-14; 04, C-14; P1-a, P1-b, P1-d). Os pacotes são criados pela API com a
// sessão da conta fictícia "cto", um DEC novo por teste, todos sobre uma demanda só desta spec (criada com a ESP e o RSK
// na primeira vez que um teste precisa). Uma demanda por teste estourava o limite por ator da suíte inteira (C-36: 30
// demandas por hora por conta). A ordem do arquivo é a do fluxo: aprovar e a dupla aprovação deixam a demanda em Pronta
// para decisão; devolver a leva a Em análise; arquivar, a Encerrada, por último. Cada teste roda também sozinho. O
// pacote de rascunho de agente é o do seed fictício (T33), de nível "Só o CTO", e nenhum teste daqui registra decisão
// nele. A dupla aprovação troca a sessão da página da "cto" para a "administradora". O axe roda pendente,
// desatualizado, com erro e decidido.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { api, entrarComo, semViolacoes } from './apoio';

type Demanda = { id: string };
type Versao = { id: string };
type Pacote = { id: string; rascunhoAgente: boolean; statusDecisao: string };

const espValida = {
  descricaoObjetiva: 'Evitar pedidos duplicados (fictício).',
  escopoInclui: ['Conferir o id do pedido antes de criar (fictício)'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['O mesmo pedido não aparece duas vezes (fictício)'],
  definicaoDePronto: ['Testes verdes (fictício)'],
};
const rskValido = { riscoTecnicoNivel: 'alto', riscoOperacionalNivel: 'medio', riscoJuridicoNivel: 'baixo' };
const TITULO = 'Demanda da decisão (fictício)';

let demandaDaSpec: string | null = null;

async function demanda(page: Page): Promise<string> {
  if (demandaDaSpec) return demandaDaSpec;
  const d = await api<Demanda>(page, 'POST', '/api/demandas', { titulo: TITULO, tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' });
  await api<Versao>(page, 'POST', `/api/demandas/${d.id}/especificacoes`, espValida);
  await api<Versao>(page, 'POST', `/api/demandas/${d.id}/pareceres-risco`, rskValido);
  demandaDaSpec = d.id;
  return d.id;
}

async function prepararPacote(page: Page, nivel: 'cto' | 'cto_e_administradora'): Promise<{ demandaId: string; decId: string }> {
  const id = await demanda(page);
  const d = { id };
  const dec = await api<Versao>(page, 'POST', `/api/demandas/${d.id}/pacotes-decisao`, {
    resumoExecutivo: 'Resumo executivo fictício.',
    opcaoA: { descricao: 'Construir tudo numa entrega (fictício)', vantagens: 'Resolve a causa (fictício)' },
    opcaoB: { descricao: 'Construir em duas entregas (fictício)' },
    nivelAprovacaoRequerido: nivel,
  });
  return { demandaId: d.id, decId: dec.id };
}

async function idDoDecDeRascunhoDoSeed(page: Page): Promise<string> {
  const { itens } = await api<{ itens: Pacote[] }>(page, 'GET', '/api/pacotes-decisao?statusDecisao=pendente&limit=100');
  const dec = itens.find((p) => p.rascunhoAgente);
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

test('P1-b: administradora em DEC de nível cto vê "Este pacote exige só a aprovação do CTO." e nenhum formulário', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const decId = await idDoDecDeRascunhoDoSeed(page);
  await page.goto(`/pacotes-decisao/${decId}`);
  await expect(page.getByText('Este pacote exige só a aprovação do CTO.', { exact: true })).toBeVisible();
  await expect(page.locator('main form')).toHaveCount(0);
  await expect(registrar(page)).toHaveCount(0);
  await semViolacoes(page, 'T11 sem formulário para a administradora');
});

test('nível cto: aprovar A → "Decisão registrada: Aprovada, opção A." e o lembrete de status manual (P1-d)', async ({ page }) => {
  await entrarComo(page, 'cto');
  const { demandaId, decId } = await prepararPacote(page, 'cto');
  await page.goto(`/demandas/${demandaId}`);
  await page.getByRole('link', { name: `Abrir decisão ${decId}` }).click();
  await expect(page).toHaveURL(new RegExp(`/pacotes-decisao/${decId}$`));
  await expect(page.getByRole('heading', { level: 1, name: `Decisão: ${TITULO}` })).toBeVisible();
  await expect(page.getByText('Decisão pendente', { exact: true })).toBeVisible();
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await semViolacoes(page, 'T11 pendente');

  await decisao(page, 'Aprovar').check();
  await page.getByRole('radio', { name: 'Opção A — Construir tudo numa entrega (fictício)' }).check();
  await page.getByLabel('Comentários (opcional)').fill('Pode seguir (fictício).');
  await confirmar(page);
  const resultado = page.getByRole('alert').filter({ hasText: 'Decisão registrada: Aprovada, opção A.' });
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
  expect((await api<{ status: string }>(page, 'GET', `/api/demandas/${demandaId}`)).status).toBe('pronta_para_decisao');
});

test('dupla aprovação: CTO aprova; administradora entra, vê a opção fixada, informa documento e data; "O pacote está aprovado."', async ({ page }) => {
  await entrarComo(page, 'cto');
  const { decId } = await prepararPacote(page, 'cto_e_administradora');
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
  const { demandaId, decId } = await prepararPacote(page, 'cto');
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
  expect((await api<{ status: string }>(page, 'GET', `/api/demandas/${demandaId}`)).status).toBe('em_analise');
  await semViolacoes(page, 'T11 devolvido');
});

test('Arquivar → "Pacote arquivado. A demanda foi para Encerrada."; 404 e sem sessão', async ({ page }) => {
  await entrarComo(page, 'cto');
  const { demandaId, decId } = await prepararPacote(page, 'cto');
  await page.goto(`/pacotes-decisao/${decId}`);
  await decisao(page, 'Arquivar').check();
  await confirmar(page);
  await expect(page.getByRole('alert').filter({ hasText: 'Pacote arquivado' })).toHaveText('Pacote arquivado. A demanda foi para Encerrada.');
  expect((await api<{ status: string }>(page, 'GET', `/api/demandas/${demandaId}`)).status).toBe('encerrada');

  for (const caminho of [`/pacotes-decisao/DEC-${demandaId}-v9`, `/pacotes-decisao/ESP-${demandaId}-v1`, '/pacotes-decisao/qualquer-coisa']) {
    const r = await page.goto(caminho);
    expect(r?.status(), caminho).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible();
  }
  await page.context().clearCookies();
  await page.goto(`/pacotes-decisao/${decId}`);
  await expect(page).toHaveURL(/\/entrar\?/);
});
