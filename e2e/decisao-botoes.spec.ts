// T12 do DEC-DEM-20261110-0015-v1 (0.2.0): a T11 com um formulário e três botões de envio (RF-11, ADR-18, 03, 6.4). O
// botão ativado define a decisão; o mesmo valor vai ao diálogo e à Server Action (CV-10). Com o pacote desatualizado,
// "Aprovar" fica focável, explicado e sem efeito: nenhum POST de Server Action (CV-11). Nenhuma opção vem marcada e a
// recomendação fica em texto antes das opções (CV-13, P-01). Identificador, data e comentários não têm `name` (CV-15).
//
// C-36: esta spec não cria demanda. Usa as demandas do seed da T06 (TITULOS_DO_E2E):
//   - `decisaoOpcaoB` e `decisaoDevolverComOpcao`: o teste cria pela API a ESP e o RSK que faltarem e um DEC de nível
//     cto, e grava a decisão pela tela. A `decisaoDevolverComOpcao` guarda também o DEC desatualizado dos testes do
//     CV-11 e do CA-11.3, criado uma vez (DEC e ESP nova) e achado pela API nas execuções seguintes;
//   - `decisaoRecomendaB`: o DEC de agente do seed, "CTO e administradora", com rascunhos citados. Nenhum teste grava
//     nele: o diálogo abre e fecha com "Voltar" ou Esc, e a API confere que ele continua pendente.
// Uso por conta deste arquivo: "cto" 0 demandas e até 8 versões; "administradora" 0 demandas e 0 versões.
import { type Locator, type Page } from '@playwright/test';
import { RECOMENDACAO_DO_E2E, TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { api, demandaDoSeed, entrarComo, expect, semViolacoes, test } from './apoio';
import { prepararEspERsk } from './preparacao';

type Versao = { id: string };
type Pacote = {
  id: string;
  statusDecisao: string;
  desatualizado: boolean;
  aprovadores: { papel: string; opcao: string }[];
  decisao: { opcaoEscolhida: string | null } | null;
};

const espValida = {
  descricaoObjetiva: 'Decidir pelos botões da tela (fictício).',
  escopoInclui: ['Três botões de decisão (fictício)'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['O botão ativado é a decisão gravada (fictício)'],
  definicaoDePronto: ['Testes verdes (fictício)'],
};
const rskValido = { riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };
const decValido = {
  resumoExecutivo: 'Resumo executivo fictício.',
  opcaoA: { descricao: 'Construir tudo numa entrega (fictício)' },
  opcaoB: { descricao: 'Construir em duas entregas (fictício)' },
  nivelAprovacaoRequerido: 'cto',
};

const REVISEI = 'Revisei os rascunhos de agente citados neste pacote (obrigatório)';
const IDENTIFICADOR = 'Identificador do documento assinado (obrigatório para aprovar)';
const DATA = 'Data da assinatura (obrigatório para aprovar)';
const INDISPONIVEL = 'Indisponível: pacote desatualizado.';

const acoes = (page: Page): Locator => page.getByRole('group', { name: 'Ações da decisão', exact: true });
const principal = (page: Page): Locator => acoes(page).getByRole('button', { name: /^Aprovar( a opção [AB])?$/ });
const botao = (page: Page, rotulo: 'Devolver' | 'Arquivar'): Locator => acoes(page).getByRole('button', { name: rotulo, exact: true });
const dialogo = (page: Page): Locator => page.getByRole('dialog', { name: 'Confirmar a decisão?' });
const resumoDeErros = (page: Page): Locator => page.getByRole('alert').filter({ hasText: 'Corrija os campos abaixo para continuar.' });
const opcao = (page: Page, letra: 'A' | 'B'): Locator => page.getByRole('radio', { name: new RegExp(`^Opção ${letra}`) });

const pacotes = async (page: Page, demandaId: string) => (await api<{ itens: Versao[] }>(page, 'GET', `/api/demandas/${demandaId}/pacotes-decisao`)).itens;
const pacote = (page: Page, decId: string) => api<Pacote>(page, 'GET', `/api/pacotes-decisao/${decId}`);

// A demanda do seed com ESP e RSK (só o que falta é criado, M-01).
async function demandaComEspERsk(page: Page, titulo: string): Promise<string> {
  const id = await demandaDoSeed(page, titulo);
  await prepararEspERsk({
    listarEsp: async () => (await api<{ itens: Versao[] }>(page, 'GET', `/api/demandas/${id}/especificacoes`)).itens,
    listarRsk: async () => (await api<{ itens: Versao[] }>(page, 'GET', `/api/demandas/${id}/pareceres-risco`)).itens,
    criarEsp: () => api<Versao>(page, 'POST', `/api/demandas/${id}/especificacoes`, espValida),
    criarRsk: () => api<Versao>(page, 'POST', `/api/demandas/${id}/pareceres-risco`, rskValido),
  });
  return id;
}

const novoPacoteCto = async (page: Page, demandaId: string): Promise<string> =>
  (await api<Versao>(page, 'POST', `/api/demandas/${demandaId}/pacotes-decisao`, decValido)).id;

// Um DEC pendente e desatualizado na `decisaoDevolverComOpcao`: o que já existe, ou um novo seguido de uma ESP nova.
async function decDesatualizado(page: Page): Promise<string> {
  const demandaId = await demandaComEspERsk(page, TITULOS_DO_E2E.decisaoDevolverComOpcao);
  for (const { id } of await pacotes(page, demandaId)) {
    const p = await pacote(page, id);
    if (p.statusDecisao === 'pendente' && p.desatualizado) return id;
  }
  const decId = await novoPacoteCto(page, demandaId);
  await api<Versao>(page, 'POST', `/api/demandas/${demandaId}/especificacoes`, espValida);
  expect((await pacote(page, decId)).desatualizado, `${decId} desatualizado`).toBe(true);
  return decId;
}

// O DEC de agente do seed na `decisaoRecomendaB`, pendente (nenhum teste grava nele).
async function decDeAgenteDoSeed(page: Page): Promise<string> {
  const demandaId = await demandaDoSeed(page, TITULOS_DO_E2E.decisaoRecomendaB);
  const [primeiro] = await pacotes(page, demandaId);
  if (!primeiro) throw new Error('e2e: o seed não tem o DEC de agente da decisaoRecomendaB');
  expect((await pacote(page, primeiro.id)).statusDecisao, `${primeiro.id} pendente`).toBe('pendente');
  return primeiro.id;
}

// Os POST de Server Action da T11 (a ação é um POST para a própria página).
function postsDaPagina(page: Page, decId: string): string[] {
  const posts: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname === `/pacotes-decisao/${decId}`) posts.push(r.url());
  });
  return posts;
}

test('CA-11.1 e CV-10: decisaoOpcaoB, nível cto: marcar B e "Aprovar a opção B" → diálogo "Aprovar a opção B." e a API grava B', async ({ page }) => {
  await entrarComo(page, 'cto');
  const decId = await novoPacoteCto(page, await demandaComEspERsk(page, TITULOS_DO_E2E.decisaoOpcaoB));
  await page.goto(`/pacotes-decisao/${decId}`);
  await expect(principal(page)).toHaveText('Aprovar');
  await opcao(page, 'B').check();
  await expect(principal(page)).toHaveText('Aprovar a opção B');
  await principal(page).click();
  const d = dialogo(page);
  await expect(d).toBeVisible();
  await expect(d).toContainText('Você vai registrar: Aprovar a opção B. Depois de registrada, a decisão deste pacote não muda.');
  await expect(d).toContainText('Repositório destino: wsssistemas2626-crypto/sistema-ficticio.');
  await expect(d).toContainText('Nível de aprovação: Só o CTO.');
  await d.getByRole('button', { name: 'Confirmar e registrar' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Decisão registrada' })).toHaveText('Decisão registrada: Aprovada, opção B.');
  await expect(page.getByText(/^Decisão registrada: Aprovada, opção B, por Pessoa Ficticia CTO em /)).toBeVisible();
  await expect(acoes(page)).toHaveCount(0);
  expect(await pacote(page, decId)).toMatchObject({
    statusDecisao: 'aprovada',
    decisao: { opcaoEscolhida: 'B' },
    aprovadores: [expect.objectContaining({ papel: 'cto', opcao: 'B' })],
  });
});

test('CV-10: decisaoDevolverComOpcao: marcar A e "Devolver" → diálogo de devolução; grava devolvida sem opção nem documento', async ({ page }) => {
  await entrarComo(page, 'cto');
  const decId = await novoPacoteCto(page, await demandaComEspERsk(page, TITULOS_DO_E2E.decisaoDevolverComOpcao));
  await page.goto(`/pacotes-decisao/${decId}`);
  await opcao(page, 'A').check();
  await expect(principal(page)).toHaveText('Aprovar a opção A');
  await expect(botao(page, 'Devolver')).toHaveAccessibleDescription('Devolver: a demanda volta para Em análise.');
  await botao(page, 'Devolver').click();
  const d = dialogo(page);
  await expect(d).toContainText('Você vai registrar: Devolver para nova análise. Depois de registrada, a decisão deste pacote não muda.');
  await expect(d).not.toContainText('Aprovar a opção');
  await d.getByRole('button', { name: 'Confirmar e registrar' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Pacote devolvido' })).toHaveText('Pacote devolvido para nova análise. A demanda voltou para Em análise.');
  await expect(page.getByText(/^Decisão registrada: Devolvida, por Pessoa Ficticia CTO em /)).toBeVisible();
  expect(await pacote(page, decId)).toMatchObject({ statusDecisao: 'devolvida', decisao: { opcaoEscolhida: null }, aprovadores: [] });
});

test('CV-10 e D-05: administradora num DEC dupla: Enter no identificador abre o diálogo e nada grava sem "Confirmar e registrar"; Enter em Comentários não envia', async ({
  page,
}) => {
  await entrarComo(page, 'cto');
  const decId = await decDeAgenteDoSeed(page);
  await entrarComo(page, 'administradora');
  const posts = postsDaPagina(page, decId);
  await page.goto(`/pacotes-decisao/${decId}`);
  // O documento aparece desde o início, sem aria-required: é obrigatório só para aprovar, e o rótulo diz isso.
  await expect(page.getByLabel(IDENTIFICADOR)).toBeVisible();
  await expect(page.getByLabel(IDENTIFICADOR)).not.toHaveAttribute('aria-required', /.*/);
  await expect(page.getByLabel(DATA)).not.toHaveAttribute('aria-required', /.*/);
  await expect(page.getByRole('checkbox', { name: REVISEI })).toHaveAttribute('aria-required', 'true');

  // CA-11.5: aprovar sem o documento dá os dois erros, e nada é enviado.
  await opcao(page, 'A').check();
  await page.getByRole('checkbox', { name: REVISEI }).check();
  await principal(page).click();
  await expect(resumoDeErros(page)).toBeFocused();
  await expect(resumoDeErros(page).getByRole('link')).toHaveText([
    'Identificador do documento assinado: Informe o identificador do documento assinado.',
    'Data da assinatura: Informe a data da assinatura.',
  ]);
  await expect(dialogo(page)).toBeHidden();
  await semViolacoes(page, 'T11 com os três botões e o erro do documento');

  // D-05: em Comentários (textarea), o Enter é quebra de linha e não envia.
  const comentarios = page.getByLabel('Comentários (opcional)');
  await comentarios.fill('Primeira linha (fictício)');
  await comentarios.press('Enter');
  await expect(comentarios).toHaveValue('Primeira linha (fictício)\n');
  await expect(dialogo(page)).toBeHidden();

  // CV-10: o Enter no identificador envia pelo principal, passa pela validação e abre o diálogo.
  await page.getByLabel(DATA).fill('2026-11-10');
  await page.getByLabel(IDENTIFICADOR).fill('DOC-FICTICIO-0003');
  await page.getByLabel(IDENTIFICADOR).press('Enter');
  const d = dialogo(page);
  await expect(d).toBeVisible();
  await expect(d).toContainText('Você vai registrar: Aprovar a opção A.');
  await expect(d).toContainText('Nível de aprovação: CTO e administradora.');
  await expect(resumoDeErros(page)).toHaveCount(0);
  await d.getByRole('button', { name: 'Voltar' }).click();
  await expect(d).toBeHidden();
  // O diálogo devolve o foco ao botão que enviou: o principal, também no Enter.
  await expect(principal(page)).toBeFocused();
  expect(posts).toEqual([]);
  expect(await pacote(page, decId)).toMatchObject({ statusDecisao: 'pendente', aprovadores: [], decisao: null });
});

test('CV-11: DEC desatualizado: clique, Enter e Espaço no principal e Enter num campo → zero POST de Server Action; explicação visível; Devolver e Arquivar disponíveis', async ({
  page,
}) => {
  await entrarComo(page, 'cto');
  const decId = await decDesatualizado(page);
  const posts = postsDaPagina(page, decId);
  await page.goto(`/pacotes-decisao/${decId}`);
  const aprovar = principal(page);
  await expect(page.getByText(INDISPONIVEL, { exact: true })).toBeVisible();
  await expect(aprovar).toHaveText('Aprovar');
  await expect(aprovar).toHaveAttribute('aria-disabled', 'true');
  // Continua focável: sem `disabled` (03, 2.6).
  await expect(aprovar).not.toHaveAttribute('disabled', /.*/);
  // O Playwright trata aria-disabled como indisponível; o clique forçado é o do mouse de quem usa.
  await aprovar.click({ force: true });
  await aprovar.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Space');
  await expect(aprovar).toBeFocused();
  // O único campo de texto é Comentários: o Enter nele não envia.
  await page.getByLabel('Comentários (opcional)').press('Enter');
  await expect(dialogo(page)).toBeHidden();
  await expect(resumoDeErros(page)).toHaveCount(0);
  expect(posts).toEqual([]);

  // Devolver e Arquivar disponíveis: abrem o diálogo; "Voltar" fecha sem gravar.
  for (const rotulo of ['Devolver', 'Arquivar'] as const) {
    await expect(botao(page, rotulo)).not.toHaveAttribute('aria-disabled', /.*/);
    await botao(page, rotulo).click();
    await expect(dialogo(page)).toBeVisible();
    await dialogo(page).getByRole('button', { name: 'Voltar' }).click();
    await expect(dialogo(page)).toBeHidden();
  }
  expect(posts).toEqual([]);
  expect((await pacote(page, decId)).statusDecisao).toBe('pendente');
});

test('CV-13: decisaoRecomendaB: nenhum rádio marcado, sem "Recomendada", principal "Aprovar" (1280 e 390 px); a recomendação em texto antes das opções', async ({
  page,
}) => {
  await entrarComo(page, 'cto');
  const decId = await decDeAgenteDoSeed(page);
  for (const tela of [
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(tela);
    await page.goto(`/pacotes-decisao/${decId}`);
    const rotulo = `${tela.width} px`;
    const opcoes = page.getByRole('radio', { name: /^Opção [AB]/ });
    await expect(opcoes, rotulo).toHaveCount(2);
    for (const r of await opcoes.all()) await expect(r, rotulo).not.toBeChecked();
    await expect(page.getByText('Recomendada'), rotulo).toHaveCount(0);
    await expect(principal(page), rotulo).toHaveText('Aprovar');
    const recomendacao = page.getByText(RECOMENDACAO_DO_E2E, { exact: true });
    await expect(recomendacao, rotulo).toBeVisible();
    const grupo = await page.getByRole('group', { name: 'Opção escolhida (obrigatório)', exact: true }).elementHandle();
    expect(await recomendacao.evaluate((el, g) => Boolean(g && el.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING), grupo), rotulo).toBe(true);
  }
});

test('CV-15: identificador, data e comentários sem atributo name; o form sem action nem method', async ({ page }) => {
  await entrarComo(page, 'cto');
  const decId = await decDeAgenteDoSeed(page);
  await entrarComo(page, 'administradora');
  await page.goto(`/pacotes-decisao/${decId}`);
  const form = page.locator('main form');
  await expect(form).toHaveCount(1);
  await expect(form).not.toHaveAttribute('action', /.*/);
  await expect(form).not.toHaveAttribute('method', /.*/);
  for (const rotulo of [IDENTIFICADOR, DATA, 'Comentários (opcional)']) await expect(page.getByLabel(rotulo), rotulo).not.toHaveAttribute('name', /.*/);
  await expect(page.getByRole('checkbox', { name: REVISEI })).not.toHaveAttribute('name', /.*/);
  // name só nos rádios de opção e nos três botões, com valores de enumeração.
  for (const b of await acoes(page).getByRole('button').all()) await expect(b).toHaveAttribute('name', 'acao');
  expect(await form.locator('[name]').evaluateAll((xs) => xs.map((x) => `${x.getAttribute('name')}=${(x as HTMLInputElement).value}`))).toEqual([
    'campo-opcaoEscolhida=A',
    'campo-opcaoEscolhida=B',
    'acao=aprovada',
    'acao=devolvida',
    'acao=arquivada',
  ]);
});

test('CA-11.3: desatualizado com "Indisponível: pacote desatualizado." visível e ligado por aria-describedby', async ({ page }) => {
  await entrarComo(page, 'cto');
  const decId = await decDesatualizado(page);
  await page.goto(`/pacotes-decisao/${decId}`);
  await expect(page.getByText(INDISPONIVEL, { exact: true })).toBeVisible();
  await expect(principal(page)).toHaveAccessibleDescription(INDISPONIVEL);
  await expect(botao(page, 'Devolver')).toHaveAccessibleDescription('Devolver: a demanda volta para Em análise.');
  await expect(botao(page, 'Arquivar')).toHaveAccessibleDescription('Arquivar: a demanda vai para Encerrada.');
  // As opções e o documento só servem para aprovar: com o pacote desatualizado, não aparecem (03, 6.4).
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByLabel(IDENTIFICADOR)).toHaveCount(0);
  await semViolacoes(page, 'T11 desatualizado com os três botões');
});

test('foco volta ao botão ativado ao fechar o diálogo com "Voltar"', async ({ page }) => {
  await entrarComo(page, 'cto');
  const decId = await decDeAgenteDoSeed(page);
  await page.goto(`/pacotes-decisao/${decId}`);
  // CA-11.4: "Devolver" sem a caixa de revisão dá o erro dela, e o diálogo não abre.
  await botao(page, 'Devolver').click();
  await expect(resumoDeErros(page)).toBeFocused();
  await expect(resumoDeErros(page).getByRole('link')).toHaveText([
    'Revisei os rascunhos de agente citados neste pacote: Marque que revisou os rascunhos de agente para registrar a decisão.',
  ]);
  await expect(dialogo(page)).toBeHidden();

  await page.getByRole('checkbox', { name: REVISEI }).check();
  await botao(page, 'Devolver').click();
  await expect(dialogo(page)).toContainText('Você vai registrar: Devolver para nova análise.');
  await dialogo(page).getByRole('button', { name: 'Voltar' }).click();
  await expect(dialogo(page)).toBeHidden();
  await expect(botao(page, 'Devolver')).toBeFocused();

  // Esc fecha como "Voltar", e o foco volta ao "Arquivar".
  await botao(page, 'Arquivar').click();
  await expect(dialogo(page)).toContainText('Você vai registrar: Arquivar.');
  await page.keyboard.press('Escape');
  await expect(dialogo(page)).toBeHidden();
  await expect(botao(page, 'Arquivar')).toBeFocused();
  expect((await pacote(page, decId)).statusDecisao).toBe('pendente');
});
