// T46: axe em todas as telas do painel (CA-26.4, RNF-11, critério preliminar 14): T01 a T12, em três estados ou mais
// cada, com as regras de TAGS_AXE (e2e/apoio.ts). As specs de cada tela já rodam o axe nos estados que só aparecem
// depois de gravar (decidido, gravado, ligado); esta passa por todas de uma vez, nos estados que se alcançam sem gravar.
//
// C-36 (06-T43-tech-lead e 06-T44-tech-lead, "C-36"): esta spec usa as demandas do seed fictício (T33), achadas por GET
// /api/demandas, e o ESP, o RSK e o DEC de rascunho de agente que o seed grava na demanda de tipo bug. Fora a T11, só faz
// GET, abre telas e envia formulários vazios ou inválidos, que a validação recusa antes de gravar. A T11 grava uma vez
// (08-correcao, A-04): o DEC de agente nasce "CTO e administradora", então o estado "só a aprovação do CTO" da conta
// administradora precisa de um DEC de pessoa de nível cto, criado pela "cto" (ESP, RSK e DEC) na demanda própria do
// seed (TITULOS_DO_E2E.axeSoCto), como no P1-b da decisao.spec.
//   - conta "cto": 0 demandas e 3 versões (a ESP, o RSK e o DEC da T11);
//   - conta "administradora": 0 demandas e 0 versões.
// Cuidados de ordem: esta spec roda antes da decisao.spec (ordem alfabética, workers: 1), que precisa do DEC de rascunho
// do seed pendente. Aqui o diálogo da decisão abre e fecha com "Voltar", e o teste confere pela API que o pacote continua
// pendente. Na T12, o diálogo de ligar fecha com "Cancelar" e nada muda (os agentes seguem como o seed os deixou). Na T02,
// a conta `sem2fa` só chega ao passo 2 com a senha certa e nunca verifica um código, como nas specs da T37: continua sem
// 2FA e nenhuma falha de senha ou de código é somada a ela. Na T01, o erro é o de campo vazio, que não chega ao servidor.
import { type Page } from '@playwright/test';
import { CONTAS_FICTICIAS } from '../scripts/seed-ficticio';
import { api, entrarComo, entrarSoComSenha, expect, ipFicticio, semViolacoes, test } from './apoio';

type ListaDemandas = { itens: { id: string; titulo: string }[] };
type Pacote = { id: string; rascunhoAgente: boolean; statusDecisao: string };
type ConfiguracaoAgente = { agente: string; ligado: boolean; atualizadoEm: string | null };

// Títulos de duas das cinco demandas do seed (scripts/seed-ficticio.ts, DEMANDAS). A de tipo bug tem ESP, RSK e DEC de
// rascunho de agente; a de tipo melhoria não tem nenhuma versão.
const SEED = {
  bug: 'Pedidos do marketplace duplicados no ERP (fictício)',
  melhoria: 'Filtro por período no relatório de chamados (fictício)',
} as const;

const RESUMO = 'Corrija os campos abaixo para continuar.';

// Só os alertas da tela: o anunciador de rota do Next também tem role="alert", fora do `main`.
const alertaDaTela = (page: Page) => page.getByRole('main').getByRole('alert');
const resumoDeErros = (page: Page) => page.getByRole('alert').filter({ hasText: RESUMO });
const sairSemSalvar = (page: Page) => page.getByRole('dialog', { name: 'Sair sem salvar?' });

async function demandaDoSeed(page: Page, tipo: keyof typeof SEED): Promise<string> {
  const { itens } = await api<ListaDemandas>(page, 'GET', `/api/demandas?tipo=${tipo}&limit=100`);
  const d = itens.find((x) => x.titulo === SEED[tipo]);
  if (!d) throw new Error(`e2e: o seed não tem a demanda de tipo ${tipo}`);
  return d.id;
}

// Título de scripts/seed-ficticio.ts (TITULOS_DO_E2E.axeSoCto): a demanda própria do DEC de nível cto da T11.
const TITULO_SO_CTO = 'Pacote só do CTO no axe (fictício)';

// ESP, RSK e DEC de pessoa de nível cto na demanda própria; devolve o id do DEC.
async function decDePessoaSoDoCto(page: Page): Promise<string> {
  const { itens } = await api<ListaDemandas>(page, 'GET', '/api/demandas?tipo=melhoria&limit=100');
  const d = itens.find((x) => x.titulo === TITULO_SO_CTO);
  if (!d) throw new Error('e2e: o seed não tem a demanda do DEC só do CTO');
  await api(page, 'POST', `/api/demandas/${d.id}/especificacoes`, {
    descricaoObjetiva: 'Conferir a tela de decisão (fictício).',
    escopoInclui: ['Tela de decisão (fictício)'],
    sistemaAlvo: 'sistema-ficticio',
    repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
    criteriosAceitePreliminares: ['A tela passa no axe (fictício)'],
    definicaoDePronto: ['Testes verdes (fictício)'],
  });
  await api(page, 'POST', `/api/demandas/${d.id}/pareceres-risco`, { riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' });
  const dec = await api<Pacote>(page, 'POST', `/api/demandas/${d.id}/pacotes-decisao`, {
    resumoExecutivo: 'Resumo executivo fictício.',
    opcaoA: { descricao: 'Opção A (fictício)' },
    opcaoB: { descricao: 'Opção B (fictício)' },
    nivelAprovacaoRequerido: 'cto',
  });
  return dec.id;
}

// O axe conta como alvo pequeno o controle que, com a página rolada, fica sob o cabeçalho fixo da moldura (ver a
// detalhe-demanda.spec). Depois de um foco que rolou a página, a verificação volta ao topo.
async function axe(page: Page, rotulo: string): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await semViolacoes(page, rotulo);
}

test('T01 Entrar: vazio, com erro e passo 2 (código)', async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': ipFicticio() });
  await page.goto('/entrar');
  await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeFocused();
  await axe(page, 'T01 vazio');

  await page.getByLabel('E-mail (obrigatório)').fill(CONTAS_FICTICIAS.cto.email);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(alertaDaTela(page)).toContainText('Preencha o e-mail e a senha.');
  await axe(page, 'T01 com erro');

  await page.getByLabel('Senha (obrigatório)').fill(CONTAS_FICTICIAS.cto.senha);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Código de verificação' })).toBeFocused();
  await axe(page, 'T01 passo 2');
});

test('T02 Configurar 2FA: passo 1, passo 2 e passo 2 com erro', async ({ page }) => {
  await page.setExtraHTTPHeaders({ 'x-real-ip': ipFicticio() });
  await entrarSoComSenha(page, 'sem2fa');
  await page.goto('/configurar-2fa');
  await expect(page.getByRole('heading', { level: 1, name: 'Configurar verificação em duas etapas' })).toBeFocused();
  await expect(page.getByRole('heading', { level: 2, name: 'Passo 1 de 3 — Confirme sua senha' })).toBeVisible();
  await axe(page, 'T02 passo 1');

  await page.getByLabel('Senha (obrigatório)').fill(CONTAS_FICTICIAS.sem2fa.senha);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Passo 2 de 3 — Ligue o aplicativo autenticador' })).toBeFocused();
  await axe(page, 'T02 passo 2');

  // Código vazio: a tela recusa antes de chamar o servidor, e nenhuma falha de código conta para a conta.
  await page.getByRole('button', { name: 'Verificar' }).click();
  await expect(alertaDaTela(page).first()).toBeVisible();
  await expect(page.getByLabel('Código de 6 dígitos (obrigatório)')).toHaveAttribute('aria-invalid', 'true');
  await axe(page, 'T02 passo 2 com erro');
});

test('T03 Fila: com dados, filtrada, vazia com filtro e com filtro inválido', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/demandas');
  await expect(page.getByRole('heading', { level: 1, name: 'Demandas' })).toBeVisible();
  await expect(page.locator('main tbody tr').first()).toBeVisible();
  await axe(page, 'T03 com dados');

  await page.goto('/demandas?tipo=bug');
  await expect(page.locator('main caption')).toHaveText('Demandas com tipo Bug, da mais nova para a mais antiga');
  await axe(page, 'T03 filtrada');

  await page.goto('/demandas?status=entregue&tipo=produto_proprio&linhaServicoProvavel=indefinida');
  await expect(page.getByText('Nenhuma demanda com esses filtros.')).toBeVisible();
  await axe(page, 'T03 vazia com filtro');

  await page.goto('/demandas?status=qualquer-coisa');
  await expect(page.locator('main').getByText('Algum filtro do endereço não é válido. Mostrando todas as demandas.')).toBeVisible();
  await axe(page, 'T03 com filtro inválido');
});

test('T04 Nova demanda: vazia, com erro e preenchida sem salvar', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/demandas/nova');
  await expect(page.getByRole('heading', { level: 1, name: 'Nova demanda' })).toBeVisible();
  await expect(page.getByText('Agente orquestrador desligado. Preencha os campos abaixo.')).toBeVisible();
  await axe(page, 'T04 vazia');

  await page.getByRole('button', { name: 'Salvar demanda' }).click();
  await expect(resumoDeErros(page)).toBeFocused();
  await axe(page, 'T04 com erro');

  await page.getByLabel('Texto do pedido (opcional)').fill('Texto fictício.');
  await page.getByLabel('Nome do solicitante (obrigatório)').fill('Pessoa Ficticia');
  await page.getByLabel('Título (obrigatório)').fill('Demanda preenchida e não salva (fictício)');
  await page.getByRole('radio', { name: 'Melhoria' }).check();
  await page.getByRole('button', { name: 'Adicionar anexo' }).click();
  await axe(page, 'T04 preenchida');
});

test('T05 Detalhe: com versões e rascunhos de agente, sem versões e com erro ao mudar status', async ({ page }) => {
  await entrarComo(page, 'cto');
  const bug = await demandaDoSeed(page, 'bug');
  await page.goto(`/demandas/${bug}`);
  await expect(page.getByRole('heading', { level: 1, name: SEED.bug })).toBeVisible();
  await expect(page.getByText(`ESP-${bug}-v1`, { exact: true })).toBeVisible();
  await expect(page.getByText('Rascunho de agente').first()).toBeVisible();
  await axe(page, 'T05 com versões e rascunhos');

  const melhoria = await demandaDoSeed(page, 'melhoria');
  await page.goto(`/demandas/${melhoria}`);
  await expect(page.getByRole('heading', { level: 1, name: SEED.melhoria })).toBeVisible();
  await expect(page.getByText('Nenhuma especificação técnica ainda.')).toBeVisible();
  await axe(page, 'T05 sem versões');

  const antes = await api<{ status: string }>(page, 'GET', `/api/demandas/${melhoria}`);
  await page.getByRole('button', { name: 'Mudar status' }).click();
  await expect(resumoDeErros(page)).toBeFocused();
  await axe(page, 'T05 com erro ao mudar status');
  expect((await api<{ status: string }>(page, 'GET', `/api/demandas/${melhoria}`)).status).toBe(antes.status);
});

test('T06 Editar dados: com dados, com erro e com o diálogo de saída', async ({ page }) => {
  await entrarComo(page, 'cto');
  const bug = await demandaDoSeed(page, 'bug');
  await page.goto(`/demandas/${bug}/editar`);
  await expect(page.getByRole('heading', { level: 1, name: 'Editar dados da demanda' })).toBeVisible();
  await expect(page.getByLabel('Título (obrigatório)')).toHaveValue(SEED.bug);
  await axe(page, 'T06 com dados');

  await page.getByLabel('Título (obrigatório)').fill('');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(resumoDeErros(page)).toBeFocused();
  await axe(page, 'T06 com erro');

  await page.getByRole('link', { name: 'Cancelar' }).click();
  await expect(sairSemSalvar(page)).toBeVisible();
  await axe(page, 'T06 com o diálogo de saída');
  await sairSemSalvar(page).getByRole('button', { name: 'Continuar editando' }).click();
  await expect(sairSemSalvar(page)).toBeHidden();
  expect((await api<{ titulo: string }>(page, 'GET', `/api/demandas/${bug}`)).titulo).toBe(SEED.bug);
});

test('T07 Nova versão da ESP: primeira, com erro e a partir da v1 de agente', async ({ page }) => {
  await entrarComo(page, 'cto');
  const melhoria = await demandaDoSeed(page, 'melhoria');
  await page.goto(`/demandas/${melhoria}/especificacoes/nova`);
  await expect(page.getByRole('heading', { level: 1, name: 'Nova versão da especificação técnica' })).toBeVisible();
  await expect(page.getByText('Esta será a primeira especificação técnica desta demanda, a v1.')).toBeVisible();
  await axe(page, 'T07 primeira');

  await page.getByRole('button', { name: /^Gravar ESP-/ }).click();
  await expect(resumoDeErros(page)).toBeFocused();
  await axe(page, 'T07 com erro');

  const bug = await demandaDoSeed(page, 'bug');
  await page.goto(`/demandas/${bug}/especificacoes/nova`);
  await expect(page.getByText(/^Esta será a ESP-.+-v\d+\. A v\d+ continua guardada e não muda\.$/)).toBeVisible();
  await axe(page, 'T07 a partir da v1');
});

test('T08 Novo parecer de risco: sem ESP, com erro e a partir da v1 de agente', async ({ page }) => {
  await entrarComo(page, 'cto');
  const melhoria = await demandaDoSeed(page, 'melhoria');
  await page.goto(`/demandas/${melhoria}/pareceres-risco/novo`);
  await expect(page.getByRole('heading', { level: 1, name: 'Novo parecer de risco' })).toBeVisible();
  await expect(
    page.getByText('Esta demanda ainda não tem especificação técnica. Você pode gravar o parecer, mas o pacote de decisão vai exigir as duas.'),
  ).toBeVisible();
  await axe(page, 'T08 sem ESP');

  await page.getByRole('button', { name: /^Gravar RSK-/ }).click();
  await expect(resumoDeErros(page)).toBeFocused();
  await axe(page, 'T08 com erro');

  const bug = await demandaDoSeed(page, 'bug');
  await page.goto(`/demandas/${bug}/pareceres-risco/novo`);
  await expect(page.getByRole('button', { name: /^Gravar RSK-.+-v\d+$/ })).toBeVisible();
  await axe(page, 'T08 a partir da v1');
});

test('T09 Novo pacote de decisão: sem ESP e RSK, vazio e com erro', async ({ page }) => {
  await entrarComo(page, 'cto');
  const melhoria = await demandaDoSeed(page, 'melhoria');
  await page.goto(`/demandas/${melhoria}/pacotes-decisao/novo`);
  await expect(page.getByRole('heading', { level: 1, name: 'Novo pacote de decisão' })).toBeVisible();
  await expect(page.getByText(/^Ainda não dá para criar o pacote\. Falta: /)).toBeVisible();
  await expect(page.locator('main form')).toHaveCount(0);
  await axe(page, 'T09 sem ESP e RSK');

  const bug = await demandaDoSeed(page, 'bug');
  await page.goto(`/demandas/${bug}/pacotes-decisao/novo`);
  await expect(page.getByText(/^Este será o DEC-.+-v\d+\./)).toBeVisible();
  await axe(page, 'T09 vazio');

  await page.getByRole('button', { name: /^Gravar DEC-/ }).click();
  await expect(resumoDeErros(page)).toBeFocused();
  await axe(page, 'T09 com erro');
});

test('T10 Ver versão: ESP de agente, RSK de agente e versão não encontrada', async ({ page }) => {
  await entrarComo(page, 'cto');
  const bug = await demandaDoSeed(page, 'bug');
  await page.goto(`/especificacoes/ESP-${bug}-v1`);
  await expect(page.getByRole('heading', { level: 1, name: `Especificação técnica v1 — ${SEED.bug}` })).toBeVisible();
  await expect(page.getByText('Rascunho de agente').first()).toBeVisible();
  await axe(page, 'T10 ESP');

  await page.goto(`/pareceres-risco/RSK-${bug}-v1`);
  await expect(page.getByRole('heading', { level: 1, name: `Parecer de risco v1 — ${SEED.bug}` })).toBeVisible();
  await axe(page, 'T10 RSK');

  await page.goto(`/especificacoes/ESP-${bug}-v999`);
  await expect(page.getByRole('heading', { level: 1, name: 'Versão não encontrada' })).toBeVisible();
  await axe(page, 'T10 versão não encontrada');
});

test('T11 Decisão: pendente com rascunhos, com erro, com o diálogo aberto e na conta administradora', async ({ page }) => {
  await entrarComo(page, 'cto');
  const bug = await demandaDoSeed(page, 'bug');
  const decId = `DEC-${bug}-v1`;
  const pacote = await api<Pacote>(page, 'GET', `/api/pacotes-decisao/${decId}`);
  expect(pacote).toMatchObject({ rascunhoAgente: true, statusDecisao: 'pendente' });
  const registrar = page.getByRole('button', { name: 'Registrar decisão' });

  await page.goto(`/pacotes-decisao/${decId}`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Decisão: /);
  await expect(page.getByRole('region', { name: 'Revisão antes de decidir' })).toBeVisible();
  await axe(page, 'T11 pendente com rascunhos');

  await registrar.click();
  await expect(resumoDeErros(page)).toBeFocused();
  await axe(page, 'T11 com erro');

  await page.getByRole('group', { name: 'Decisão (obrigatório)', exact: true }).getByRole('radio', { name: 'Aprovar', exact: true }).check();
  await page.getByRole('radio', { name: /^Opção A/ }).check();
  await page.getByRole('checkbox', { name: 'Revisei os rascunhos de agente citados neste pacote (obrigatório)' }).check();
  await registrar.click();
  const dialogo = page.getByRole('dialog', { name: 'Confirmar a decisão?' });
  await expect(dialogo).toBeVisible();
  await semViolacoes(page, 'T11 com o diálogo aberto');
  // "Voltar" fecha sem registrar: o pacote do seed continua pendente para a decisao.spec.
  await dialogo.getByRole('button', { name: 'Voltar' }).click();
  await expect(dialogo).toBeHidden();
  expect((await api<Pacote>(page, 'GET', `/api/pacotes-decisao/${decId}`)).statusDecisao).toBe('pendente');

  // Só do CTO: DEC de pessoa de nível cto, criado antes de trocar de conta.
  const soDoCto = await decDePessoaSoDoCto(page);

  // A administradora no DEC de agente do seed, que nasce "CTO e administradora" (A-04): ela vê as duas aprovações
  // pendentes e o próprio formulário, sem a frase de P1-b, e nada é registrado (o formulário fica intocado, para a
  // navegação seguinte não pedir confirmação de saída).
  await entrarComo(page, 'administradora');
  await page.goto(`/pacotes-decisao/${decId}`);
  await expect(page.getByRole('region', { name: 'Revisão antes de decidir' })).toContainText('Nível de aprovação: CTO e administradora');
  await expect(page.getByText('CTO: pendente.', { exact: true })).toBeVisible();
  await expect(page.getByText('Administradora: pendente.', { exact: true })).toBeVisible();
  await expect(page.getByText('Este pacote exige só a aprovação do CTO.', { exact: true })).toHaveCount(0);
  await expect(page.locator('main form')).toHaveCount(1);
  await expect(registrar).toBeVisible();
  await axe(page, 'T11 na conta administradora, em dupla aprovação');
  expect((await api<Pacote>(page, 'GET', `/api/pacotes-decisao/${decId}`)).statusDecisao).toBe('pendente');

  // A administradora no DEC de nível cto: a frase de P1-b e nenhum formulário.
  await page.goto(`/pacotes-decisao/${soDoCto}`);
  await expect(page.getByText('Este pacote exige só a aprovação do CTO.', { exact: true })).toBeVisible();
  await expect(page.locator('main form')).toHaveCount(0);
  await axe(page, 'T11 na conta administradora');
});

test('T12 Agentes e teto: inicial, com erro de teto, com o diálogo de ligar e na conta administradora', async ({ page }) => {
  await entrarComo(page, 'cto');
  const antes = (await api<{ agentes: ConfiguracaoAgente[] }>(page, 'GET', '/api/agentes')).agentes;
  await page.goto('/configuracao/agentes');
  await expect(page.getByRole('heading', { level: 1, name: 'Agentes e teto de gasto' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Agentes de IA' })).toBeVisible();
  await axe(page, 'T12 inicial');

  const campo = page.getByRole('textbox', { name: 'Teto mensal de gasto (US$)' });
  const valorAntes = await campo.inputValue();
  await campo.fill('-1');
  await page.getByRole('button', { name: 'Salvar teto' }).click();
  await expect(resumoDeErros(page)).toBeFocused();
  await expect(campo).toHaveAttribute('aria-invalid', 'true');
  await axe(page, 'T12 com erro de teto');

  const interruptor = page.getByRole('switch', { name: 'Agente orquestrador (entrada)', exact: true });
  await interruptor.click();
  const dialogo = page.getByRole('dialog', { name: 'Ligar o agente orquestrador?' });
  await expect(dialogo).toBeVisible();
  await semViolacoes(page, 'T12 com o diálogo de ligar');
  await dialogo.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialogo).toBeHidden();
  await expect(interruptor).toHaveAttribute('aria-checked', 'false');
  // Nada mudou: os agentes e o teto continuam como estavam.
  expect((await api<{ agentes: ConfiguracaoAgente[] }>(page, 'GET', '/api/agentes')).agentes).toEqual(antes);
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Teto mensal de gasto (US$)' })).toHaveValue(valorAntes);

  await entrarComo(page, 'administradora');
  await page.goto('/configuracao/agentes');
  await expect(page.getByText('Só o CTO altera esta configuração.')).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Agente orquestrador (entrada)', exact: true })).toBeDisabled();
  await axe(page, 'T12 na conta administradora');
});
