// T43: T09 Novo pacote de decisão (03, T09; RF-10, RF-19). Os dados são criados pela API com a sessão da conta fictícia
// "administradora", numa demanda só desta spec: o limite por ator (C-36: 30 demandas por hora por conta) já está quase
// cheio nas duas contas com as outras specs da suíte, e a decisao.spec usa a única demanda que sobra na "cto". A
// demanda nasce com a ESP no primeiro teste ("sem RSK") e ganha o RSK no primeiro que precisa dele; cada teste roda
// também sozinho. O axe roda vazio, com erro e preenchido, e na T11 depois de gravar.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { api, entrarComo, semViolacoes } from './apoio';

type Demanda = { id: string; status: string };
type Versao = { id: string };
type Pacote = {
  id: string;
  versao: number;
  especificacaoId: string;
  parecerRiscoId: string;
  resumoExecutivo: string;
  opcaoA: Record<string, string>;
  opcaoB: Record<string, string>;
  recomendacao: string | null;
  nivelAprovacaoRequerido: string;
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
const TITULO = 'Demanda do pacote de decisão (fictício)';

const criar = (page: Page) => api<Demanda>(page, 'POST', '/api/demandas', { titulo: TITULO, tipo: 'novo_projeto', solicitanteNome: 'Pessoa Ficticia' });
const pacotes = async (page: Page, id: string) => (await api<{ itens: Pacote[] }>(page, 'GET', `/api/demandas/${id}/pacotes-decisao`)).itens;
const resumoDeErros = (page: Page) => page.getByRole('alert').filter({ hasText: 'Corrija os campos abaixo para continuar.' });
const nivel = (page: Page, rotulo: 'Só o CTO' | 'CTO e administradora'): Locator =>
  page.getByRole('group', { name: 'Nível de aprovação requerido (obrigatório)', exact: true }).getByRole('radio', { name: rotulo, exact: true });

// A demanda da spec, criada na primeira vez que um teste precisa: primeiro só com a ESP, depois com o RSK.
let daSpec: { id: string; esp: string; rsk: string | null } | null = null;
async function soComEsp(page: Page): Promise<{ id: string; esp: string; rsk: string | null }> {
  if (daSpec) return daSpec;
  const d = await criar(page);
  const esp = await api<Versao>(page, 'POST', `/api/demandas/${d.id}/especificacoes`, espValida);
  daSpec = { id: d.id, esp: esp.id, rsk: null };
  return daSpec;
}
async function comEspERsk(page: Page): Promise<{ id: string; esp: string; rsk: string }> {
  const d = await soComEsp(page);
  const rsk = d.rsk ?? (await api<Versao>(page, 'POST', `/api/demandas/${d.id}/pareceres-risco`, rskValido)).id;
  daSpec = { ...d, rsk };
  return { ...d, rsk };
}

async function abrirNovo(page: Page, id: string): Promise<void> {
  await page.goto(`/demandas/${id}/pacotes-decisao/novo`);
  await expect(page.getByRole('heading', { level: 1, name: 'Novo pacote de decisão' })).toBeVisible();
}

test('sem RSK: "Ainda não dá para criar o pacote. Falta: parecer de risco." com o botão para criar, sem formulário', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await soComEsp(page);
  await abrirNovo(page, d.id);
  await expect(page).toHaveTitle('Novo pacote de decisão — WS Orquestrador de Demandas');
  await expect(page.getByText('Ainda não dá para criar o pacote. Falta: parecer de risco.', { exact: true })).toBeVisible();
  await expect(page.locator('main form')).toHaveCount(0);
  await expect(page.locator('main').getByRole('link', { name: 'Nova versão da ESP' })).toHaveCount(0);
  await semViolacoes(page, 'T09 sem RSK');
  await page.locator('main').getByRole('link', { name: 'Novo parecer de risco' }).click();
  await expect(page).toHaveURL(new RegExp(`/demandas/${d.id}/pareceres-risco/novo$`));
  for (const caminho of ['/demandas/DEM-20261022-9999/pacotes-decisao/novo', '/demandas/qualquer-coisa/pacotes-decisao/novo']) {
    const r = await page.goto(caminho);
    expect(r?.status(), caminho).toBe(404);
  }
});

test('gravar: vai à T11 com "DEC-…-v1 criado. A demanda está pronta para decisão e o aviso por e-mail entrou na fila de envio."', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const c = await comEspERsk(page);
  const d = { id: c.id };
  const esp = { id: c.esp };
  const rsk = { id: c.rsk };
  await page.goto(`/demandas/${d.id}`);
  await page.getByRole('link', { name: 'Novo pacote de decisão' }).click();
  await expect(page).toHaveURL(new RegExp(`/demandas/${d.id}/pacotes-decisao/novo$`));
  await expect(page.locator('main')).toContainText(`${d.id} — ${TITULO}`);
  await expect(
    page.getByText(
      `Este será o DEC-${d.id}-v1. Ele vai citar a ${esp.id} e o ${rsk.id}, as versões mais novas desta demanda. Os dados da demanda são copiados para o pacote e não mudam depois.`,
    ),
  ).toBeVisible();
  await expect(page.getByLabel('Recomendação')).toHaveAccessibleDescription('Qual opção você recomenda e por quê.');
  await semViolacoes(page, 'T09 vazia');

  await page.getByLabel('Resumo executivo (obrigatório)').fill('Resumo executivo fictício.');
  await page.getByLabel('Descrição da opção A (obrigatório)').fill('Construir tudo (fictício)');
  await page.getByLabel('Vantagens da opção A', { exact: true }).fill('Resolve a causa (fictício)');
  await page.getByLabel('Descrição da opção B (obrigatório)').fill('Construir em duas entregas (fictício)');
  await page.getByLabel('Quando escolher a opção B').fill('Se a duplicação seguir (fictício)');
  await page.getByLabel('Recomendação').fill('Opção B (fictício)');
  await nivel(page, 'CTO e administradora').check();
  await semViolacoes(page, 'T09 preenchida');
  await page.getByRole('button', { name: `Gravar DEC-${d.id}-v1` }).click();

  await expect(page).toHaveURL(new RegExp(`/pacotes-decisao/DEC-${d.id}-v1\\?aviso=pacote-criado$`));
  await expect(page.getByRole('alert').filter({ hasText: 'criado.' })).toHaveText(
    `DEC-${d.id}-v1 criado. A demanda está pronta para decisão e o aviso por e-mail entrou na fila de envio.`,
  );
  const [dec] = await pacotes(page, d.id);
  expect(dec).toMatchObject({
    versao: 1,
    especificacaoId: esp.id,
    parecerRiscoId: rsk.id,
    resumoExecutivo: 'Resumo executivo fictício.',
    opcaoA: { descricao: 'Construir tudo (fictício)', vantagens: 'Resolve a causa (fictício)' },
    opcaoB: { descricao: 'Construir em duas entregas (fictício)', quandoEscolher: 'Se a duplicação seguir (fictício)' },
    recomendacao: 'Opção B (fictício)',
    nivelAprovacaoRequerido: 'cto_e_administradora',
  });
  expect((await api<Demanda>(page, 'GET', `/api/demandas/${d.id}`)).status).toBe('pronta_para_decisao');
  await semViolacoes(page, 'T11 depois de criar o pacote');
});

test('erros de 03, T09: resumo, as duas descrições e o nível; o texto digitado continua; saída sem salvar pede confirmação', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = { id: (await comEspERsk(page)).id };
  const antes = (await pacotes(page, d.id)).length;
  await abrirNovo(page, d.id);
  await page.getByLabel('Vantagens da opção A', { exact: true }).fill('Digitado antes do erro (fictício)');
  await page.getByRole('button', { name: `Gravar DEC-${d.id}-v${antes + 1}` }).click();

  const resumo = resumoDeErros(page);
  await expect(resumo).toBeFocused();
  await expect(resumo.getByRole('link')).toHaveText([
    'Resumo executivo: Informe o resumo executivo.',
    'Descrição da opção A: Descreva a opção A.',
    'Descrição da opção B: Descreva a opção B.',
    'Nível de aprovação requerido: Escolha o nível de aprovação requerido.',
  ]);
  await expect(page.getByLabel('Descrição da opção B (obrigatório)')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Descrição da opção B (obrigatório)')).toHaveAccessibleDescription('Descreva a opção B.');
  await expect(page.getByLabel('Vantagens da opção A', { exact: true })).toHaveValue('Digitado antes do erro (fictício)');
  await semViolacoes(page, 'T09 com erro');
  await resumo.getByRole('link', { name: /^Nível de aprovação/ }).click();
  await expect(nivel(page, 'Só o CTO')).toBeFocused();
  expect(await pacotes(page, d.id)).toHaveLength(antes);

  await page.getByRole('link', { name: 'Cancelar' }).click();
  const sair = page.getByRole('dialog', { name: 'Sair sem salvar?' });
  await expect(sair).toBeVisible();
  await sair.getByRole('button', { name: 'Sair sem salvar' }).click();
  await expect(page).toHaveURL(new RegExp(`/demandas/${d.id}$`));
});
