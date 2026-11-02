// T40: T05 Detalhe da demanda (03, T05; RF-06, RF-07 CA-07.3, RF-12, RF-15 CA-15.3, RF-16, RF-21, RF-24, RF-26 CA-26.2,
// C-18). Os dados são criados pela API com a sessão da conta fictícia. A maioria dos testes usa a conta
// "administradora": o limite de 30 demandas por hora (C-36) conta por ator, e os outros e2e criam com a conta "cto". Os
// dois testes que precisam de um pacote aprovado usam a "cto", porque só ela aprova um DEC de nível "cto" (P1-b).
import { expect, test, type Page } from '@playwright/test';
import { api, entrarComo, semViolacoes } from './apoio';

type Demanda = { id: string; status: string };
type Versao = { id: string };

const HISTORICO = 'Histórico da demanda, do mais novo para o mais antigo';

// ESP de um tipo construído (melhoria): os quatro campos de construção são obrigatórios (CA-08.2).
const espValida = {
  descricaoObjetiva: 'Evitar pedidos duplicados (fictício).',
  escopoInclui: ['Conferir o id do pedido antes de criar (fictício)'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['O mesmo pedido não aparece duas vezes (fictício)'],
  definicaoDePronto: ['Testes verdes (fictício)'],
};
const rskValido = { riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'medio', riscoJuridicoNivel: 'baixo' };
const decValido = {
  resumoExecutivo: 'Resumo fictício.',
  opcaoA: { descricao: 'Opção A fictícia' },
  opcaoB: { descricao: 'Opção B fictícia' },
  nivelAprovacaoRequerido: 'cto',
};

async function criar(page: Page, extra: Record<string, unknown> = {}): Promise<Demanda> {
  return api<Demanda>(page, 'POST', '/api/demandas', { titulo: 'Demanda do detalhe (fictício)', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia', ...extra });
}

const esp = (page: Page, id: string, extra: Record<string, unknown> = {}) => api<Versao>(page, 'POST', `/api/demandas/${id}/especificacoes`, { ...espValida, ...extra });
const rsk = (page: Page, id: string) => api<Versao>(page, 'POST', `/api/demandas/${id}/pareceres-risco`, rskValido);
const dec = (page: Page, id: string) => api<Versao>(page, 'POST', `/api/demandas/${id}/pacotes-decisao`, decValido);

// ESP, RSK e DEC, e a aprovação do DEC (opção A) pela conta cto. O status fica "Pronta para decisão" (P1-d).
async function comPacoteAprovado(page: Page): Promise<{ demanda: Demanda; decId: string }> {
  const d = await criar(page);
  await esp(page, d.id);
  await rsk(page, d.id);
  const p = await dec(page, d.id);
  await api(page, 'PATCH', `/api/pacotes-decisao/${p.id}/decisao`, { statusDecisao: 'aprovada', opcaoEscolhida: 'A' });
  return { demanda: d, decId: p.id };
}

async function abrir(page: Page, id: string, titulo = 'Demanda do detalhe (fictício)'): Promise<void> {
  await page.goto(`/demandas/${id}`);
  await expect(page.getByRole('heading', { level: 1, name: titulo })).toBeVisible();
}

const historico = (page: Page) => page.getByRole('table', { name: HISTORICO });

// O axe conta como alvo pequeno o controle que, com a página rolada, fica sob o cabeçalho fixo da moldura. Depois de um
// foco ou de uma âncora que rolou a página, a verificação volta ao topo, como nas outras telas.
async function semViolacoesDoTopo(page: Page, rotulo: string): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await semViolacoes(page, rotulo);
}

test('CA-26.2: ESP v1, v2, RSK v1 e DEC v1 desatualizado: as quatro versões, o selo Desatualizado e o histórico', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page);
  await esp(page, d.id);
  await rsk(page, d.id);
  await dec(page, d.id);
  await esp(page, d.id);
  await abrir(page, d.id);
  await expect(page).toHaveTitle('Detalhe da demanda — WS Orquestrador de Demandas');
  for (const v of [`ESP-${d.id}-v1`, `ESP-${d.id}-v2`, `RSK-${d.id}-v1`, `DEC-${d.id}-v1`]) await expect(page.getByText(v, { exact: true })).toBeVisible();
  await expect(page.getByText('Desatualizado', { exact: true })).toBeVisible();
  await expect(page.getByText('Decisão pendente', { exact: true })).toBeVisible();
  await expect(page.getByText(`O pacote DEC-${d.id}-v1 está desatualizado: a demanda já tem uma versão mais nova de ESP ou de parecer de risco. Crie um pacote novo para decidir.`)).toBeVisible();
  await expect(historico(page)).toContainText(`Criou ESP-${d.id}-v2`);
  await expect(historico(page)).toContainText(`Criou DEC-${d.id}-v1`);
  await expect(historico(page)).toContainText('Pessoa Ficticia Administradora (Administradora)');
  // DEC criado leva a demanda a "Pronta para decisão" pelo sistema (RF-07): o histórico mostra o antes e o depois.
  await expect(historico(page).getByRole('row').filter({ hasText: 'Mudou o status' }).first()).toContainText('Sistema');
  await expect(page.getByRole('link', { name: `Ver ESP-${d.id}-v2` })).toHaveAttribute('href', `/especificacoes/ESP-${d.id}-v2`);
  await expect(page.getByRole('link', { name: `Abrir decisão DEC-${d.id}-v1` })).toHaveAttribute('href', `/pacotes-decisao/DEC-${d.id}-v1`);
  await expect(page.getByRole('link', { name: 'Novo pacote de decisão' })).toBeVisible();
  await semViolacoes(page, 'detalhe com versões');
});

test('CA-07.3: em_construcao → Entregue pelo painel; selo e histórico com a pessoa', async ({ page }) => {
  await entrarComo(page, 'cto');
  const { demanda: d } = await comPacoteAprovado(page);
  await api(page, 'PATCH', `/api/demandas/${d.id}`, { status: 'aprovada' });
  await api(page, 'PATCH', `/api/demandas/${d.id}`, { status: 'em_construcao' });
  await abrir(page, d.id);
  const secao = page.locator('section', { has: page.getByRole('heading', { level: 2, name: 'Mudar status' }) });
  await expect(secao).toContainText('Status atual: Em construção');
  await expect(secao.getByRole('radio')).toHaveCount(2);
  await secao.getByRole('radio', { name: 'Entregue' }).check();
  await secao.getByRole('button', { name: 'Mudar status' }).click();

  await expect(page.locator('main').getByRole('status')).toHaveText('Status alterado para Entregue.');
  await expect(secao).toContainText('Status atual: Entregue');
  await expect(secao).toContainText('Entregue é um status final. Não há próxima mudança.');
  await expect(secao.getByRole('radio')).toHaveCount(0);
  await expect(page.locator('main > div > div').first().getByText('Entregue', { exact: true })).toBeVisible();
  const linha = historico(page).getByRole('row').filter({ hasText: 'Mudou o status' }).first();
  await expect(linha).toContainText('Pessoa Ficticia CTO (CTO)');
  await expect(linha.getByRole('cell')).toHaveText([/\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}/, 'Pessoa Ficticia CTO (CTO)', 'Mudou o status', 'Em construção', 'Entregue']);
  expect((await api<Demanda>(page, 'GET', `/api/demandas/${d.id}`)).status).toBe('entregue');
});

test('409 ao mudar status: "Não foi possível concluir: a demanda não tem pacote de decisão aprovado e atualizado."', async ({ page }) => {
  await entrarComo(page, 'cto');
  const { demanda: d } = await comPacoteAprovado(page);
  await abrir(page, d.id);
  const secao = page.locator('section', { has: page.getByRole('heading', { level: 2, name: 'Mudar status' }) });
  const aprovada = secao.getByRole('radio', { name: 'Aprovada' });
  await expect(aprovada).not.toHaveAttribute('aria-disabled', 'true');

  // Uma ESP nova, gravada depois de a tela abrir, deixa o pacote aprovado desatualizado.
  await esp(page, d.id);
  await aprovada.check();
  await secao.getByRole('button', { name: 'Mudar status' }).click();
  const alerta = secao.getByRole('alert');
  await expect(alerta).toHaveText('Não foi possível concluir: a demanda não tem pacote de decisão aprovado e atualizado.');
  await expect(alerta.locator('xpath=..')).toBeFocused();
  expect((await api<Demanda>(page, 'GET', `/api/demandas/${d.id}`)).status).toBe('pronta_para_decisao');
  await semViolacoesDoTopo(page, 'detalhe com erro de status');

  // Ao recarregar, a regra aparece na própria opção (03, T05: aria-disabled e o motivo ligado).
  await page.reload();
  await expect(aprovada).toHaveAttribute('aria-disabled', 'true');
  await expect(aprovada).toHaveAccessibleDescription('Aprovada: precisa de um pacote de decisão aprovado e atualizado.');
});

test('sem opção marcada: "Escolha o novo status." no resumo, que recebe o foco; nada muda', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page);
  await abrir(page, d.id);
  await page.getByRole('button', { name: 'Mudar status' }).click();
  const resumo = page.getByRole('alert').filter({ hasText: 'Corrija os campos abaixo para continuar.' });
  await expect(resumo).toBeFocused();
  await expect(resumo.getByRole('link')).toHaveText(['Novo status: Escolha o novo status.']);
  await resumo.getByRole('link').click();
  await expect(page.getByRole('radio', { name: 'Em análise' })).toBeFocused();
  expect((await api<Demanda>(page, 'GET', `/api/demandas/${d.id}`)).status).toBe('nova');
});

test('CA-15.3: aguardando_informacao lista as dúvidas da ESP mais nova, com a nota de que nada é enviado', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page);
  await esp(page, d.id, { duvidasEmAberto: ['Qual o volume diário de pedidos? (fictício)'] });
  await esp(page, d.id, { duvidasEmAberto: ['Há ambiente de teste do ERP? (fictício)', 'Quem aprova a mudança? (fictício)'] });
  expect((await api<Demanda>(page, 'GET', `/api/demandas/${d.id}`)).status).toBe('aguardando_informacao');
  await abrir(page, d.id);

  const secao = page.locator('section', { has: page.getByRole('heading', { level: 2, name: 'Dúvidas em aberto' }) });
  await expect(secao).toContainText(`Da ESP-${d.id}-v2.`);
  await expect(secao.getByRole('listitem')).toHaveText(['Há ambiente de teste do ERP? (fictício)', 'Quem aprova a mudança? (fictício)']);
  await expect(secao).not.toContainText('Qual o volume diário');
  await expect(secao).toContainText('O sistema não envia estas perguntas ao solicitante. Trate-as fora do sistema e, com a resposta, grave uma ESP nova sem dúvida.');

  await expect(page.getByText('Esta demanda está aguardando informação.')).toBeVisible();
  await page.getByRole('link', { name: 'Veja as dúvidas em aberto.' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Dúvidas em aberto' })).toBeFocused();
  await page.getByRole('navigation', { name: 'Nesta página' }).getByRole('link', { name: 'Histórico' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Histórico' })).toBeFocused();
  await semViolacoesDoTopo(page, 'detalhe aguardando informação');
});

test('texto recebido fechado por padrão, com o aviso de dado pessoal; demanda sem texto: "Esta demanda foi criada sem texto colado."', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const r = await api<{ demanda: Demanda }>(page, 'POST', '/api/demandas/entrada', {
    modo: 'manual',
    texto: 'Bom dia,\nos pedidos estão duplicando (texto fictício).',
    origem: { canal: 'email', referencia: 'REF-FICTICIA-T40' },
    titulo: 'Demanda com texto (fictício)',
    tipo: 'bug',
    solicitanteNome: 'Pessoa Ficticia',
  });
  await abrir(page, r.demanda.id, 'Demanda com texto (fictício)');
  const detalhes = page.locator('details');
  await expect(detalhes).not.toHaveAttribute('open');
  await expect(page.getByText('os pedidos estão duplicando', { exact: false })).toBeHidden();
  await page.getByText('Mostrar texto recebido').click();
  await expect(detalhes).toHaveAttribute('open');
  await expect(detalhes).toContainText(/Contém dado pessoal de terceiro\. Não copie para fora do sistema sem necessidade\. Será apagado em \d{2}\/\d{2}\/\d{4}\./);
  await expect(detalhes.locator('pre')).toHaveText('Bom dia,\nos pedidos estão duplicando (texto fictício).');
  await expect(detalhes).toContainText('E-mail');
  await expect(detalhes).toContainText('REF-FICTICIA-T40');
  await semViolacoes(page, 'detalhe com texto recebido aberto');

  const semTexto = await criar(page);
  await abrir(page, semTexto.id);
  await expect(page.getByText('Esta demanda foi criada sem texto colado.')).toBeVisible();
  await expect(page.locator('details')).toHaveCount(0);
});

test('C-18: título com <script> e <img onerror> aparece literal e nada executa', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const ataque = 'Título <script>window.__xss=1</script><img src=x onerror="window.__xss=2">';
  const r = await api<{ demanda: Demanda }>(page, 'POST', '/api/demandas/entrada', {
    modo: 'manual',
    texto: '<script>window.__xss=3</script><img src=x onerror="window.__xss=4">',
    titulo: ataque,
    tipo: 'bug',
    solicitanteNome: 'Pessoa <b>Ficticia</b>',
    contexto: '<img src=x onerror="window.__xss=5">',
    anexos: [{ tipo: 'arquivo', referencia: '<img src=x onerror="window.__xss=6">', descricao: '<script>window.__xss=7</script>' }],
  });
  const dialogos: string[] = [];
  page.on('dialog', (x) => {
    dialogos.push(x.message());
    void x.dismiss();
  });
  await abrir(page, r.demanda.id, ataque);
  await page.getByText('Mostrar texto recebido').click();
  await expect(page.locator('details pre')).toHaveText('<script>window.__xss=3</script><img src=x onerror="window.__xss=4">');
  await expect(page.locator('main')).toContainText('Pessoa <b>Ficticia</b>');
  await expect(page.locator('main')).toContainText('<img src=x onerror="window.__xss=5">');
  await expect(page.locator('main img')).toHaveCount(0);
  await expect(page.locator('main script')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  expect(dialogos).toEqual([]);
});

test('axe: recém-criada, com anexos, e em 320 px sem rolagem da página inteira', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await criar(page, { anexos: [{ tipo: 'url', referencia: 'https://exemplo.test/a', descricao: 'Anexo fictício' }], urgencia: 'alta' });
  await abrir(page, d.id);
  await expect(page.getByText('Nenhuma especificação técnica ainda.')).toBeVisible();
  await expect(page.getByText('Nenhum parecer de risco ainda.')).toBeVisible();
  await expect(page.getByText('Nenhum pacote de decisão ainda.')).toBeVisible();
  await expect(
    page.getByText('Para criar um pacote de decisão, a demanda precisa de especificação técnica e de parecer de risco. Falta: especificação técnica e parecer de risco.'),
  ).toBeVisible();
  await expect(page.getByText('Link: https://exemplo.test/a — Anexo fictício')).toBeVisible();
  await expect(page.locator('main a[href="https://exemplo.test/a"]')).toHaveCount(0);
  await expect(historico(page)).toContainText('Criou a demanda');
  await expect(page.getByRole('link', { name: 'Editar dados' })).toHaveAttribute('href', `/demandas/${d.id}/editar`);
  await semViolacoes(page, 'detalhe recém-criado');

  await page.setViewportSize({ width: 320, height: 640 });
  const larguraDaPagina = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(larguraDaPagina).toBeLessThanOrEqual(320);
  await semViolacoes(page, 'detalhe em 320 px');
});
