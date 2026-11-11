// 06-T12-testes (qa-automacao) do DEC-DEM-20261110-0015-v1: bordas da T11 com três botões que a spec da construção
// (decisao-botoes.spec.ts) não cobre. Todo envio passa pela validação e pelo diálogo, também pelo Enter num rádio ou na
// caixa de revisão; nenhuma opção vem marcada, nem depois de um erro; as exigências de hoje continuam na tela em 390 px;
// e cada ação pede só o que ela exige (o documento é só para aprovar; a revisão, para as três).
//
// C-36: esta spec não cria demanda nem versão. Usa só o DEC de agente do seed na `decisaoRecomendaB` ("CTO e
// administradora", com rascunhos citados), e nenhum teste grava nele: o diálogo fecha com "Voltar", e a API confere no
// fim que o pacote continua pendente e sem aprovação. Uso por conta: "cto" 0 demandas e 0 versões; "administradora" 0.
import { type Locator, type Page } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { api, demandaDoSeed, entrarComo, expect, semViolacoes, test } from './apoio';

type Versao = { id: string };
type Pacote = { statusDecisao: string; aprovadores: unknown[]; decisao: unknown };

const REVISEI = 'Revisei os rascunhos de agente citados neste pacote (obrigatório)';
const IDENTIFICADOR = 'Identificador do documento assinado (obrigatório para aprovar)';
const DATA = 'Data da assinatura (obrigatório para aprovar)';
const ERRO_REVISAO = 'Revisei os rascunhos de agente citados neste pacote: Marque que revisou os rascunhos de agente para registrar a decisão.';

const acoes = (page: Page): Locator => page.getByRole('group', { name: 'Ações da decisão', exact: true });
const principal = (page: Page): Locator => acoes(page).getByRole('button', { name: /^Aprovar( a opção [AB])?$/ });
const botao = (page: Page, rotulo: 'Devolver' | 'Arquivar'): Locator => acoes(page).getByRole('button', { name: rotulo, exact: true });
const dialogo = (page: Page): Locator => page.getByRole('dialog', { name: 'Confirmar a decisão?' });
const resumoDeErros = (page: Page): Locator => page.getByRole('alert').filter({ hasText: 'Corrija os campos abaixo para continuar.' });
const opcoes = (page: Page): Locator => page.getByRole('radio', { name: /^Opção [AB]/ });
const pacote = (page: Page, decId: string) => api<Pacote>(page, 'GET', `/api/pacotes-decisao/${decId}`);

// O DEC de agente do seed na `decisaoRecomendaB`, pendente e sem aprovação (nenhum teste grava nele).
async function decDeAgenteDoSeed(page: Page): Promise<string> {
  const demandaId = await demandaDoSeed(page, TITULOS_DO_E2E.decisaoRecomendaB);
  const [primeiro] = (await api<{ itens: Versao[] }>(page, 'GET', `/api/demandas/${demandaId}/pacotes-decisao`)).itens;
  if (!primeiro) throw new Error('e2e: o seed não tem o DEC de agente da decisaoRecomendaB');
  expect(await pacote(page, primeiro.id), `${primeiro.id} pendente e sem aprovação`).toMatchObject({ statusDecisao: 'pendente', aprovadores: [], decisao: null });
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

async function nenhumaMarcada(page: Page, rotulo: string): Promise<void> {
  await expect(opcoes(page), rotulo).toHaveCount(2);
  for (const r of await opcoes(page).all()) await expect(r, rotulo).not.toBeChecked();
  await expect(principal(page), rotulo).toHaveText('Aprovar');
}

test('Enter num rádio de opção e na caixa de revisão envia pelo principal: cai na validação ou no diálogo, e nada grava', async ({ page }) => {
  await entrarComo(page, 'cto');
  const decId = await decDeAgenteDoSeed(page);
  const posts = postsDaPagina(page, decId);
  await page.goto(`/pacotes-decisao/${decId}`);
  await nenhumaMarcada(page, 'ao abrir');

  // Enter no rádio: a validação de hoje pede a revisão, e o diálogo não abre.
  const b = page.getByRole('radio', { name: /^Opção B/ });
  await b.check();
  await expect(principal(page)).toHaveText('Aprovar a opção B');
  await b.press('Enter');
  await expect(resumoDeErros(page)).toBeFocused();
  await expect(resumoDeErros(page).getByRole('link')).toHaveText([ERRO_REVISAO]);
  await expect(dialogo(page)).toBeHidden();

  // Enter na caixa de revisão marcada: o diálogo abre com a opção marcada, o repositório e o nível (C-14).
  const caixa = page.getByRole('checkbox', { name: REVISEI });
  await caixa.check();
  await caixa.press('Enter');
  const d = dialogo(page);
  await expect(d).toBeVisible();
  await expect(d).toContainText('Você vai registrar: Aprovar a opção B. Depois de registrada, a decisão deste pacote não muda.');
  await expect(d).toContainText('Repositório destino: ');
  await expect(d).toContainText('Nível de aprovação: CTO e administradora.');
  await d.getByRole('button', { name: 'Voltar' }).click();
  await expect(d).toBeHidden();
  // O Enter enviou pelo principal, e o diálogo devolve o foco a ele.
  await expect(principal(page)).toBeFocused();
  expect(posts).toEqual([]);
  expect(await pacote(page, decId)).toMatchObject({ statusDecisao: 'pendente', aprovadores: [], decisao: null });
});

test('administradora em 390 px: as exigências de hoje na tela, nenhuma opção marcada nem depois do erro, e cada ação pede só o que exige', async ({
  page,
}) => {
  await entrarComo(page, 'cto');
  const decId = await decDeAgenteDoSeed(page);
  await entrarComo(page, 'administradora');
  const posts = postsDaPagina(page, decId);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/pacotes-decisao/${decId}`);

  // As exigências de hoje, visíveis sem abrir nada: o alerta de rascunho, o documento, a caixa de revisão e os três botões.
  await expect(page.getByText(/^Este pacote cita conteúdo gerado por agente de IA: /)).toBeVisible();
  await expect(page.getByLabel(IDENTIFICADOR)).toBeVisible();
  await expect(page.getByLabel(DATA)).toBeVisible();
  await expect(page.getByRole('checkbox', { name: REVISEI })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: REVISEI })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: REVISEI })).toHaveAttribute('aria-required', 'true');
  for (const b of [principal(page), botao(page, 'Devolver'), botao(page, 'Arquivar')]) await expect(b).toBeVisible();
  await nenhumaMarcada(page, '390 px ao abrir');

  // "Aprovar" sem nada: as quatro exigências da aprovação, na ordem da tela; a validação não escolhe opção por ninguém.
  await principal(page).click();
  await expect(resumoDeErros(page)).toBeFocused();
  await expect(resumoDeErros(page).getByRole('link')).toHaveText([
    'Opção escolhida: Escolha a opção A ou a opção B.',
    'Identificador do documento assinado: Informe o identificador do documento assinado.',
    'Data da assinatura: Informe a data da assinatura.',
    ERRO_REVISAO,
  ]);
  await expect(dialogo(page)).toBeHidden();
  await nenhumaMarcada(page, '390 px depois do erro');
  await semViolacoes(page, 'T11 em 390 px, administradora, com os quatro erros da aprovação');

  // "Arquivar" sem a revisão: só a revisão é pedida (o documento é só para aprovar).
  await botao(page, 'Arquivar').click();
  await expect(resumoDeErros(page).getByRole('link')).toHaveText([ERRO_REVISAO]);
  await expect(dialogo(page)).toBeHidden();

  // "Devolver" com a revisão e sem o documento: abre o diálogo de devolução, sem pedir o documento.
  await page.getByRole('checkbox', { name: REVISEI }).check();
  await botao(page, 'Devolver').click();
  const d = dialogo(page);
  await expect(d).toBeVisible();
  await expect(d).toContainText('Você vai registrar: Devolver para nova análise.');
  await expect(d).toContainText('Nível de aprovação: CTO e administradora.');
  await expect(resumoDeErros(page)).toHaveCount(0);
  await d.getByRole('button', { name: 'Voltar' }).click();
  await expect(d).toBeHidden();
  await expect(botao(page, 'Devolver')).toBeFocused();
  await nenhumaMarcada(page, '390 px depois do diálogo');

  expect(posts).toEqual([]);
  expect(await pacote(page, decId)).toMatchObject({ statusDecisao: 'pendente', aprovadores: [], decisao: null });
});
