// T13 do DEC-DEM-20261110-0015-v1 (0.2.0): a T11 Decisão em 390 × 844, no arranjo C2 (RF-12; 03, 6.3 a 6.6). Todas as
// exigências de hoje continuam visíveis e obrigatórias: a revisão de C-14 sem abrir nada (CV-12), o documento assinado,
// a caixa de revisão, a frase da opção fixada e o rodapé fixo com "Aprovar a opção X", "Devolver" e "Arquivar". Nenhuma
// opção vem marcada (CV-13, P-01). O rodapé tem até 160 px, botões de 44 px e nunca cobre o elemento com foco
// (CA-12.3, CA-12.4); sem formulário, não existe (CA-12.5). Desatualizado: alerta visível, "Aprovar" indisponível e
// explicado, e a seção do Pedido de Construção escondida (CV-11, A-03), nas duas larguras.
//
// C-36: esta spec não cria demanda, e as versões que cria são da conta "administradora", porque a "cto" já chega perto
// das 60 versões por hora na suíte. Usa as demandas do seed da T06 (TITULOS_DO_E2E):
//   - `decisaoCelularDupla`: a administradora cria pela API a ESP e o RSK que faltarem e um DEC "CTO e administradora";
//     a "cto" aprova a opção A pela API; a administradora aprova pelo rodapé;
//   - `decisaoCelularCto`: a administradora cria a ESP e o RSK que faltarem e um DEC de nível cto; a "cto" aprova pelo
//     rodapé. O CA-12.5 usa os aprovados dela e, até haver um vigente e um substituído, a administradora cria DEC novos e
//     a "cto" os aprova pela API;
//   - `decisaoRecomendaB`: o DEC de agente do seed (rascunhos citados, "CTO e administradora"). Ninguém grava nele;
//   - `decisaoDevolverComOpcao`: o DEC desatualizado da decisao-botoes.spec, achado pela API. Só lê; com esta spec
//     sozinha, a "cto" o cria uma vez (DEC e ESP nova), como na decisao-botoes.spec.
// Uso por conta deste arquivo: "cto" 0 demandas e 0 versões (2 com a spec sozinha); "administradora" 0 demandas e até
// 8 versões.
import { type Locator, type Page } from '@playwright/test';
import { RECOMENDACAO_DO_E2E, TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { api, demandaDoSeed, entrarComo, expect, semViolacoes, test } from './apoio';
import { prepararEspERsk } from './preparacao';

test.use({ viewport: { width: 390, height: 844 } });

type Versao = { id: string };
type ItemDaLista = { id: string; statusDecisao: string; substituido: boolean; desatualizado: boolean };
type Pacote = {
  id: string;
  statusDecisao: string;
  desatualizado: boolean;
  aprovadores: { papel: string; opcao: string }[];
  decisao: { opcaoEscolhida: string | null } | null;
};

const espValida = {
  descricaoObjetiva: 'Decidir pelo celular (fictício).',
  escopoInclui: ['Rodapé fixo da decisão (fictício)'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['O rodapé não cobre o campo com foco (fictício)'],
  definicaoDePronto: ['Testes verdes (fictício)'],
};
const rskValido = { riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'medio', riscoJuridicoNivel: 'baixo' };
const decValido = (nivel: 'cto' | 'cto_e_administradora') => ({
  resumoExecutivo: 'Resumo executivo fictício.',
  opcaoA: { descricao: 'Construir tudo numa entrega (fictício)', vantagens: 'Resolve a causa (fictício)' },
  opcaoB: { descricao: 'Construir em duas entregas (fictício)' },
  nivelAprovacaoRequerido: nivel,
});

const COMPUTADOR = { width: 1280, height: 720 };
const CELULAR = { width: 390, height: 844 };
const BARRA = 56;
const REVISEI = 'Revisei os rascunhos de agente citados neste pacote (obrigatório)';
const IDENTIFICADOR = 'Identificador do documento assinado (obrigatório para aprovar)';
const DATA = 'Data da assinatura (obrigatório para aprovar)';
const INDISPONIVEL = 'Indisponível: pacote desatualizado.';
const VER_DETALHES = 'Ver vantagens, desvantagens e a revisão do pacote';
const AVISO_C28 = 'O pedido vai para o repositório git da estruturaAutonoma.';
const LEMBRETE_P1D = 'A demanda continua em Pronta para decisão até alguém mudar o status para Aprovada no detalhe da demanda.';

const acoes = (page: Page): Locator => page.getByRole('group', { name: 'Ações da decisão', exact: true });
const principal = (page: Page): Locator => acoes(page).getByRole('button', { name: /^Aprovar( a opção [AB])?$/ });
const botao = (page: Page, rotulo: 'Devolver' | 'Arquivar'): Locator => acoes(page).getByRole('button', { name: rotulo, exact: true });
const dialogo = (page: Page): Locator => page.getByRole('dialog', { name: 'Confirmar a decisão?' });
const opcao = (page: Page, letra: 'A' | 'B'): Locator => page.getByRole('radio', { name: new RegExp(`^Opção ${letra}`) });
const revisao = (page: Page): Locator => page.getByRole('region', { name: 'Revisão antes de decidir', exact: true });
const pedido = (page: Page): Locator => page.getByRole('region', { name: 'Pedido de Construção', exact: true });

const pacotes = async (page: Page, demandaId: string) => (await api<{ itens: ItemDaLista[] }>(page, 'GET', `/api/demandas/${demandaId}/pacotes-decisao`)).itens;
const pacote = (page: Page, decId: string) => api<Pacote>(page, 'GET', `/api/pacotes-decisao/${decId}`);
const aprovarPelaApi = (page: Page, decId: string, opcaoEscolhida: 'A' | 'B') =>
  api<unknown>(page, 'PATCH', `/api/pacotes-decisao/${decId}/decisao`, { statusDecisao: 'aprovada', opcaoEscolhida, revisouRascunhosDeAgente: false });

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

const novoPacote = async (page: Page, demandaId: string, nivel: 'cto' | 'cto_e_administradora'): Promise<string> =>
  (await api<Versao>(page, 'POST', `/api/demandas/${demandaId}/pacotes-decisao`, decValido(nivel))).id;

// O DEC de agente do seed na `decisaoRecomendaB`, pendente (nenhum teste grava nele).
async function decDeAgenteDoSeed(page: Page): Promise<string> {
  const demandaId = await demandaDoSeed(page, TITULOS_DO_E2E.decisaoRecomendaB);
  const [primeiro] = await pacotes(page, demandaId);
  if (!primeiro) throw new Error('e2e: o seed não tem o DEC de agente da decisaoRecomendaB');
  expect((await pacote(page, primeiro.id)).statusDecisao, `${primeiro.id} pendente`).toBe('pendente');
  return primeiro.id;
}

// Um DEC pendente e desatualizado na `decisaoDevolverComOpcao`: o que já existe (o da decisao-botoes.spec), ou um novo
// seguido de uma ESP nova.
async function decDesatualizado(page: Page): Promise<string> {
  const demandaId = await demandaComEspERsk(page, TITULOS_DO_E2E.decisaoDevolverComOpcao);
  for (const p of await pacotes(page, demandaId)) if (p.statusDecisao === 'pendente' && p.desatualizado) return p.id;
  const decId = await novoPacote(page, demandaId, 'cto');
  await api<Versao>(page, 'POST', `/api/demandas/${demandaId}/especificacoes`, espValida);
  expect((await pacote(page, decId)).desatualizado, `${decId} desatualizado`).toBe(true);
  return decId;
}

async function semRolagemLateral(page: Page, rotulo: string): Promise<void> {
  const r = await page.evaluate(() => ({ largura: document.documentElement.scrollWidth, janela: window.innerWidth }));
  expect(r.largura, `${rotulo}: sem rolagem lateral`).toBeLessThanOrEqual(r.janela);
}

// As medidas do rodapé e dos três botões, como a pessoa vê (CA-12.4).
async function medidasDoRodape(page: Page) {
  return page.evaluate(() => {
    const rodape = document.getElementById('rodape-da-decisao');
    if (!rodape) throw new Error('e2e: sem #rodape-da-decisao');
    const r = rodape.getBoundingClientRect();
    const botoes = ['decisao-aprovar', 'decisao-devolver', 'decisao-arquivar'].map((id) => {
      const b = document.getElementById(id)!.getBoundingClientRect();
      return { id, largura: b.width, altura: b.height, topo: b.top, esquerda: b.left };
    });
    return {
      posicao: getComputedStyle(rodape).position,
      rodape: { topo: r.top, base: r.bottom, altura: r.height, esquerda: r.left, largura: r.width },
      botoes,
      janela: { largura: window.innerWidth, altura: window.innerHeight },
    };
  });
}

async function conferirRodapeFixo(page: Page, rotulo: string): Promise<void> {
  const m = await medidasDoRodape(page);
  expect(m.posicao, `${rotulo}: rodapé fixo`).toBe('fixed');
  expect(m.rodape.altura, `${rotulo}: rodapé até 160 px`).toBeLessThanOrEqual(160);
  expect(Math.abs(m.rodape.base - m.janela.altura), `${rotulo}: rodapé colado embaixo`).toBeLessThanOrEqual(1);
  expect(m.rodape.esquerda, `${rotulo}: rodapé na largura toda`).toBe(0);
  expect(m.rodape.largura, `${rotulo}: rodapé na largura toda`).toBe(m.janela.largura);
  for (const b of m.botoes) {
    expect(b.largura, `${rotulo}: ${b.id} com 44 px de largura`).toBeGreaterThanOrEqual(44);
    expect(b.altura, `${rotulo}: ${b.id} com 44 px de altura`).toBeGreaterThanOrEqual(44);
  }
  const [aprovar, devolver, arquivar] = m.botoes;
  expect(aprovar!.altura, `${rotulo}: principal com 48 px`).toBeGreaterThanOrEqual(48);
  expect(aprovar!.largura, `${rotulo}: principal na largura toda`).toBeGreaterThanOrEqual(m.janela.largura - 32 - 1);
  // "Devolver" e "Arquivar" lado a lado, abaixo do principal, metade da largura cada.
  expect(devolver!.topo, `${rotulo}: Devolver e Arquivar na mesma linha`).toBe(arquivar!.topo);
  expect(devolver!.topo, `${rotulo}: abaixo do principal`).toBeGreaterThan(aprovar!.topo);
  expect(arquivar!.esquerda, `${rotulo}: Arquivar à direita`).toBeGreaterThan(devolver!.esquerda);
  expect(Math.abs(devolver!.largura - arquivar!.largura), `${rotulo}: mesma largura`).toBeLessThanOrEqual(1);
}

test('CA-12.1 e CA-12.2: administradora em decisaoCelularDupla (CTO aprovou A pela API): frase fixada, documento e rodapé visíveis; aprova pelo rodapé e vê "O pacote está aprovado."', async ({
  page,
}) => {
  await entrarComo(page, 'administradora');
  const demandaId = await demandaComEspERsk(page, TITULOS_DO_E2E.decisaoCelularDupla);
  const decId = await novoPacote(page, demandaId, 'cto_e_administradora');
  await entrarComo(page, 'cto');
  await aprovarPelaApi(page, decId, 'A');
  await entrarComo(page, 'administradora');
  await page.goto(`/pacotes-decisao/${decId}`);

  // CA-12.1: sem rolagem lateral e sem abrir nada.
  await expect(page.getByText('O CTO aprovou a opção A. A sua aprovação vale para a mesma opção. Para discordar, escolha devolver ou arquivar.', { exact: true })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(0);
  await expect(page.getByLabel(IDENTIFICADOR)).toBeVisible();
  await expect(page.getByLabel(DATA)).toBeVisible();
  await expect(page.getByText(/^CTO: Pessoa Ficticia CTO aprovou a opção A em /)).toBeVisible();
  await expect(page.getByText('Administradora: pendente.', { exact: true })).toBeVisible();
  await expect(principal(page)).toHaveText('Aprovar a opção A');
  for (const b of [principal(page), botao(page, 'Devolver'), botao(page, 'Arquivar')]) await expect(b).toBeInViewport();
  await conferirRodapeFixo(page, 'segunda aprovação');
  await semRolagemLateral(page, 'segunda aprovação');
  await semViolacoes(page, 'T11 em 390 px, segunda aprovação');

  // CA-12.2: documento preenchido e "Aprovar a opção A" pelo rodapé → diálogo com repositório e nível → aprovado.
  await page.getByLabel(IDENTIFICADOR).fill('DOC-FICTICIO-0013');
  await page.getByLabel(DATA).fill('2026-11-11');
  await principal(page).click();
  const d = dialogo(page);
  await expect(d).toBeVisible();
  await expect(d).toContainText('Você vai registrar: Aprovar a opção A. Depois de registrada, a decisão deste pacote não muda.');
  await expect(d).toContainText('Repositório destino: wsssistemas2626-crypto/sistema-ficticio.');
  await expect(d).toContainText('Nível de aprovação: CTO e administradora.');
  // 03, 6.5: no celular, "Confirmar e registrar" e "Voltar" empilhados na largura toda.
  const confirmar = await d.getByRole('button', { name: 'Confirmar e registrar' }).boundingBox();
  const voltar = await d.getByRole('button', { name: 'Voltar' }).boundingBox();
  expect(confirmar!.y + confirmar!.height).toBeLessThanOrEqual(voltar!.y);
  expect(Math.abs(confirmar!.width - voltar!.width)).toBeLessThanOrEqual(1);
  expect(confirmar!.width).toBeGreaterThan(CELULAR.width / 2);
  await semViolacoes(page, 'T11 em 390 px com o diálogo aberto');
  await d.getByRole('button', { name: 'Confirmar e registrar' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'O pacote está aprovado.' })).toHaveText('Aprovação da administradora registrada. O pacote está aprovado.');
  await expect(acoes(page)).toHaveCount(0);
  await expect(page.locator('#rodape-da-decisao')).toHaveCount(0);
  expect(await pacote(page, decId)).toMatchObject({ statusDecisao: 'aprovada', decisao: { opcaoEscolhida: 'A' } });
});

test('CV-13 e CV-19: decisaoRecomendaB em 390 px sem rádio marcado e sem "Recomendada"; "Voltar para a demanda" só no celular, com o id validado', async ({ page }) => {
  await entrarComo(page, 'cto');
  const decId = await decDeAgenteDoSeed(page);
  const demandaId = await demandaDoSeed(page, TITULOS_DO_E2E.decisaoRecomendaB);
  await page.goto(`/pacotes-decisao/${decId}`);
  const opcoes = page.getByRole('radio', { name: /^Opção [AB]/ });
  await expect(opcoes).toHaveCount(2);
  for (const r of await opcoes.all()) await expect(r).not.toBeChecked();
  await expect(page.getByText('Recomendada')).toHaveCount(0);
  await expect(principal(page)).toHaveText('Aprovar');
  // P-01: a recomendação em texto, visível sem abrir nada, antes das opções.
  const recomendacao = page.getByText(RECOMENDACAO_DO_E2E, { exact: true });
  await expect(recomendacao).toBeVisible();
  const grupo = await page.getByRole('group', { name: 'Opção escolhida (obrigatório)', exact: true }).elementHandle();
  expect(await recomendacao.evaluate((el, g) => Boolean(g && el.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING), grupo)).toBe(true);

  // CV-19: "Voltar para a demanda" sai da rota fixa e do id que casa a regex de hoje; só existe abaixo de 768 px.
  const voltar = page.getByRole('link', { name: 'Voltar para a demanda', exact: true });
  await expect(voltar).toBeVisible();
  await expect(voltar).toHaveAttribute('href', `/demandas/${demandaId}`);
  expect(demandaId).toMatch(/^DEM-\d{8}-\d{4}$/);
  const caixa = await voltar.boundingBox();
  expect(caixa!.height).toBeGreaterThanOrEqual(44);
  expect(caixa!.y).toBeLessThan((await page.getByRole('heading', { level: 1 }).boundingBox())!.y);
  await page.setViewportSize(COMPUTADOR);
  await expect(voltar).toBeHidden();
  await page.setViewportSize(CELULAR);
  await voltar.click();
  await expect(page).toHaveURL(new RegExp(`/demandas/${demandaId}$`));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITULOS_DO_E2E.decisaoRecomendaB);
});

test('CV-12 e CA-12.1: administradora no DEC de agente em 390 px: sem abrir nada, revisão completa, selos de rascunho, alerta, documento, caixa de revisão e rodapé', async ({
  page,
}) => {
  await entrarComo(page, 'administradora');
  const decId = await decDeAgenteDoSeed(page);
  await page.goto(`/pacotes-decisao/${decId}`);
  const r = revisao(page);
  await expect(r).toBeVisible();
  for (const termo of ['Especificação técnica citada', 'Sistema alvo', 'Repositório destino', 'Parecer de risco citado', 'Níveis de risco', 'Nível de aprovação'])
    await expect(r.getByText(termo, { exact: true }), termo).toBeVisible();
  for (const risco of ['Risco técnico', 'Risco operacional', 'Risco jurídico']) await expect(r.getByText(new RegExp(`^${risco}: `)), risco).toBeVisible();
  await expect(r.getByText('Nível de aprovação: CTO e administradora', { exact: true })).toBeVisible();
  // O selo "Rascunho de agente" da ESP e do RSK citados, dentro da revisão, e o do cabeçalho.
  const selos = r.getByText('Rascunho de agente', { exact: true });
  await expect(selos).toHaveCount(2);
  for (const s of await selos.all()) await expect(s).toBeVisible();
  await expect(page.getByText('Rascunho de agente', { exact: true }).first()).toBeVisible();
  // O repositório destino também no cabeçalho, e todos os alertas do estado: aqui, o de rascunho citado.
  await expect(page.getByText(/^Repositório destino: \S+/)).toBeVisible();
  await expect(page.getByText(/^Este pacote cita conteúdo gerado por agente de IA: DEC-.+\. Leia cada um antes de decidir\.$/)).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Recomendação do agente de consolidação' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Aprovações' })).toBeVisible();
  // No recolhível fechado ficam só critérios, definição de pronto e as opções completas.
  await expect(page.getByText('Critérios de aceite preliminares', { exact: true })).toBeHidden();
  await expect(page.getByText('Definição de pronto', { exact: true })).toBeHidden();
  await expect(page.getByRole('heading', { level: 2, name: 'Opções' })).toBeHidden();
  // CA-12.1: documento, caixa de revisão (obrigatória) e Comentários no formulário; o rodapé com os três botões.
  await expect(page.getByLabel(IDENTIFICADOR)).toBeVisible();
  await expect(page.getByLabel(DATA)).toBeVisible();
  await expect(page.getByRole('checkbox', { name: REVISEI })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: REVISEI })).toHaveAttribute('aria-required', 'true');
  await expect(page.getByRole('checkbox', { name: REVISEI })).not.toBeChecked();
  await expect(page.getByLabel('Comentários (opcional)')).toBeVisible();
  for (const b of [principal(page), botao(page, 'Devolver'), botao(page, 'Arquivar')]) await expect(b).toBeInViewport();
  await semRolagemLateral(page, 'DEC de agente');
  await semViolacoes(page, 'T11 em 390 px com rascunhos, conta da administradora');
  expect((await pacote(page, decId)).statusDecisao).toBe('pendente');
});

test('recolhível: "Ver vantagens…" com aria-expanded e aria-controls; aberto mostra opções completas, critérios e definição; a partir de 768 px, sem botão e sempre aberto', async ({
  page,
}) => {
  await entrarComo(page, 'cto');
  const decId = await decDeAgenteDoSeed(page);
  await page.goto(`/pacotes-decisao/${decId}`);
  const ver = page.getByRole('button', { name: VER_DETALHES, exact: true });
  await expect(ver).toBeVisible();
  await expect(ver).toHaveAttribute('aria-expanded', 'false');
  const alvo = await ver.getAttribute('aria-controls');
  expect(alvo).toBeTruthy();
  const bloco = page.locator(`[id="${alvo}"]`);
  await expect(bloco).toHaveCount(1);
  await expect(bloco).toBeHidden();
  await ver.click();
  await expect(ver).toHaveAttribute('aria-expanded', 'true');
  await expect(bloco).toBeVisible();
  for (const h of ['Opções']) await expect(bloco.getByRole('heading', { level: 2, name: h })).toBeVisible();
  for (const h of ['Opção A', 'Opção B']) await expect(bloco.getByRole('heading', { level: 3, name: h })).toBeVisible();
  await expect(bloco.getByText('Vantagens', { exact: true })).toHaveCount(2);
  await expect(bloco.getByText('Quando escolher', { exact: true })).toHaveCount(2);
  await expect(bloco.getByText('Critérios de aceite preliminares', { exact: true })).toBeVisible();
  await expect(bloco.getByText('Definição de pronto', { exact: true })).toBeVisible();
  // O que o C-14 manda mostrar não está no recolhível.
  await expect(bloco.getByText('Nível de aprovação', { exact: true })).toHaveCount(0);
  await expect(bloco.getByText('Repositório destino', { exact: true })).toHaveCount(0);
  await semViolacoes(page, 'T11 em 390 px com o recolhível aberto');
  await ver.click();
  await expect(ver).toHaveAttribute('aria-expanded', 'false');
  await expect(bloco).toBeHidden();
  await expect(ver).toBeFocused();

  await page.setViewportSize(COMPUTADOR);
  await expect(page.getByRole('button', { name: VER_DETALHES, exact: true })).toHaveCount(0);
  await expect(bloco).toBeVisible();
  await expect(bloco.getByText('Critérios de aceite preliminares', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Opções' })).toBeVisible();
});

test('CA-12.3 e CA-12.4: Tab do primeiro ao último campo sem nada focado sob o rodapé nem sob a barra; rodapé até 160 px e botões de 44 px', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const decId = await decDeAgenteDoSeed(page);
  await page.goto(`/pacotes-decisao/${decId}`);
  await conferirRodapeFixo(page, 'DEC de agente');

  await opcao(page, 'A').focus();
  const vistos: string[] = [];
  for (let passo = 0; passo < 40; passo++) {
    const f = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement;
      const rodape = document.getElementById('rodape-da-decisao')!;
      const ra = a.getBoundingClientRect();
      return { id: a.id || a.tagName, noRodape: rodape.contains(a), topo: ra.top, baixo: ra.bottom, topoDoRodape: rodape.getBoundingClientRect().top };
    });
    if (vistos.at(-1) !== f.id) vistos.push(f.id);
    if (!f.noRodape) expect(f.baixo, `${f.id} sob o rodapé`).toBeLessThanOrEqual(f.topoDoRodape);
    expect(f.topo, `${f.id} sob a barra`).toBeGreaterThanOrEqual(BARRA);
    if (f.id === 'decisao-arquivar') break;
    await page.keyboard.press('Tab');
  }
  // Passou por todo campo, na ordem do formulário, e chegou aos três botões no fim.
  expect(vistos).toEqual([
    'campo-opcaoEscolhida-A',
    'campo-referenciaDocumento',
    'campo-dataDocumento',
    'campo-comentarios',
    'campo-revisouRascunhosDeAgente',
    'decisao-aprovar',
    'decisao-devolver',
    'decisao-arquivar',
  ]);
  expect((await pacote(page, decId)).statusDecisao).toBe('pendente');
});

test('aprovação do CTO num DEC nível cto (decisaoCelularCto) pelo rodapé: marcar B, "Aprovar a opção B", diálogo e "Decisão registrada: Aprovada, opção B."', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const demandaId = await demandaComEspERsk(page, TITULOS_DO_E2E.decisaoCelularCto);
  const decId = await novoPacote(page, demandaId, 'cto');
  await entrarComo(page, 'cto');
  await page.goto(`/pacotes-decisao/${decId}`);
  await expect(principal(page)).toHaveText('Aprovar');
  await conferirRodapeFixo(page, 'nível cto');
  await opcao(page, 'B').check();
  await expect(opcao(page, 'B')).toBeChecked();
  await expect(principal(page)).toHaveText('Aprovar a opção B');
  await principal(page).click();
  const d = dialogo(page);
  await expect(d).toContainText('Você vai registrar: Aprovar a opção B.');
  await expect(d).toContainText('Repositório destino: wsssistemas2626-crypto/sistema-ficticio.');
  await expect(d).toContainText('Nível de aprovação: Só o CTO.');
  await d.getByRole('button', { name: 'Confirmar e registrar' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Decisão registrada' })).toHaveText('Decisão registrada: Aprovada, opção B.');
  await expect(page.locator('#rodape-da-decisao')).toHaveCount(0);
  expect(await pacote(page, decId)).toMatchObject({ statusDecisao: 'aprovada', decisao: { opcaoEscolhida: 'B' }, aprovadores: [expect.objectContaining({ papel: 'cto', opcao: 'B' })] });
});

test('CA-12.6 e CV-11: desatualizado em 390 px com o alerta visível sem abrir nada e o principal indisponível e explicado; pedido escondido (A-03) nas duas larguras', async ({ page }) => {
  await entrarComo(page, 'cto');
  const decId = await decDesatualizado(page);
  const posts: string[] = [];
  page.on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname === `/pacotes-decisao/${decId}`) posts.push(r.url());
  });
  await page.goto(`/pacotes-decisao/${decId}`);
  await expect(page.getByText(/^Este pacote está desatualizado\. A demanda já tem ESP-/)).toBeVisible();
  await expect(page.getByText('Desatualizado', { exact: true })).toBeVisible();
  const explicacao = page.getByText(INDISPONIVEL, { exact: true });
  await expect(explicacao).toBeVisible();
  await expect(explicacao).toBeInViewport();
  await expect(principal(page)).toHaveText('Aprovar');
  await expect(principal(page)).toHaveAttribute('aria-disabled', 'true');
  await expect(principal(page)).toHaveAccessibleDescription(INDISPONIVEL);
  await conferirRodapeFixo(page, 'desatualizado');
  await principal(page).click({ force: true });
  await expect(dialogo(page)).toBeHidden();
  expect(posts).toEqual([]);
  await expect(pedido(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Gerar Pedido de Construção' })).toHaveCount(0);
  await semViolacoes(page, 'T11 desatualizado em 390 px');

  await page.setViewportSize(COMPUTADOR);
  await expect(page.locator('#rodape-da-decisao')).toHaveCSS('position', 'static');
  await expect(explicacao).toBeVisible();
  await expect(pedido(page)).toHaveCount(0);
  expect((await pacote(page, decId)).statusDecisao).toBe('pendente');
});

test('CA-12.5 e CV-11: DEC já decidido sem rodapé e com "Decisão registrada: …"; o vigente com o lembrete e o pedido com o aviso do C-28; o substituído com o aviso e sem pedido, nas duas larguras', async ({
  page,
}) => {
  await entrarComo(page, 'administradora');
  const demandaId = await demandaComEspERsk(page, TITULOS_DO_E2E.decisaoCelularCto);
  // Um aprovado vigente e um substituído na demanda: os que já existem, ou DEC novos da administradora (até dois),
  // aprovados pela "cto" pela API na ordem em que foram criados. Com dois aprovados, o mais novo substitui o outro.
  const aprovadosDa = async () => (await pacotes(page, demandaId)).filter((p) => p.statusDecisao === 'aprovada');
  const novos: string[] = [];
  for (let i = (await aprovadosDa()).length; i < 2; i++) novos.push(await novoPacote(page, demandaId, 'cto'));
  await entrarComo(page, 'cto');
  for (const decId of novos) await aprovarPelaApi(page, decId, 'A');
  const aprovados = await aprovadosDa();
  const vigente = aprovados.find((p) => !p.substituido);
  const substituido = aprovados.find((p) => p.substituido);
  if (!vigente || !substituido) throw new Error(`e2e: ${demandaId} sem um aprovado vigente e um substituído`);

  for (const tela of [CELULAR, COMPUTADOR]) {
    const rotulo = `${tela.width} px`;
    await page.setViewportSize(tela);
    await page.goto(`/pacotes-decisao/${vigente.id}`);
    await expect(page.getByText(/^Decisão registrada: Aprovada, opção [AB], por Pessoa Ficticia CTO em /), rotulo).toBeVisible();
    await expect(page.locator('#rodape-da-decisao'), rotulo).toHaveCount(0);
    await expect(acoes(page), rotulo).toHaveCount(0);
    await expect(page.getByText(LEMBRETE_P1D, { exact: true }), rotulo).toBeVisible();
    await expect(pedido(page), rotulo).toBeVisible();
    await expect(pedido(page), rotulo).toContainText(AVISO_C28);
    await expect(page.getByRole('button', { name: 'Gerar Pedido de Construção' }), rotulo).toBeVisible();
    if (tela === CELULAR) await semViolacoes(page, 'T11 decidida em 390 px');

    await page.goto(`/pacotes-decisao/${substituido.id}`);
    await expect(page.getByText(/^Este pacote foi substituído por DEC-.+, aprovado depois dele, e não gera mais o Pedido de Construção\./), rotulo).toBeVisible();
    await expect(page.getByText('Substituído', { exact: true }), rotulo).toBeVisible();
    await expect(page.locator('#rodape-da-decisao'), rotulo).toHaveCount(0);
    await expect(pedido(page), rotulo).toHaveCount(0);
    if (tela === CELULAR) await semViolacoes(page, 'T11 substituída em 390 px');
  }
});
