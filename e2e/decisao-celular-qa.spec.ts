// Escrito na 06-T13-testes (qa-automacao), pedido 0015. Fecha, no navegador e nas duas larguras (1280 × 720 e
// 390 × 844), o que a decisao-celular.spec deixa aberto na T11 da T13: lá, as exigências de aprovação aparecem e o
// caminho feliz passa; aqui, cada uma continua obrigatória pelo rodapé fixo do celular e pelo cartão do computador:
//   - nada vem marcado ao abrir (CV-13, P-01): nem opção, nem a caixa de revisão, nem o documento preenchido;
//   - "Aprovar" sem nada dá os erros da opção, do identificador, da data e da revisão, sem diálogo (CA-11.2, CA-11.4,
//     CA-11.5); "Devolver" e "Arquivar" sem a caixa dão só o da revisão; cada exigência sozinha volta a barrar;
//   - na segunda aprovação, a frase da opção fixada fica no lugar das opções, e o documento continua obrigatório só
//     para aprovar (CA-12.1, CA-11.6);
//   - no celular, o resumo de erros e cada campo que o link dele foca ficam fora do rodapé e da barra (CA-12.3);
//   - nada é enviado: zero POST de Server Action, e a API confere o pacote pendente.
// Cada largura abre numa aba nova do mesmo contexto: o formulário sujo da primeira não segura a navegação da segunda.
//
// C-36: não cria demanda. Usa as do seed da T06 (TITULOS_DO_E2E):
//   - `decisaoRecomendaB`: o DEC de agente do seed ("CTO e administradora", rascunhos citados). Só lê;
//   - `decisaoCelularDupla`: a administradora cria a ESP e o RSK que faltarem e um DEC "CTO e administradora"; a "cto"
//     aprova a opção A pela API; a administradora só abre o diálogo e volta, sem registrar.
// Uso por conta deste arquivo: "cto" 0 demandas e 0 versões; "administradora" 0 demandas e até 3 versões.
import type { Locator, Page } from '@playwright/test';
import { RECOMENDACAO_DO_E2E, TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { api, demandaDoSeed, entrarComo, expect, test } from './apoio';
import { prepararEspERsk } from './preparacao';

type Versao = { id: string };
type Pacote = { statusDecisao: string; aprovadores: { papel: string; opcao: string }[]; decisao: unknown };

const COMPUTADOR = { width: 1280, height: 720 };
const CELULAR = { width: 390, height: 844 };
const LARGURAS = [CELULAR, COMPUTADOR] as const;
const BARRA = 56;

const espValida = {
  descricaoObjetiva: 'Decidir pelo celular (fictício).',
  escopoInclui: ['Rodapé fixo da decisão (fictício)'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['O rodapé não cobre o campo com foco (fictício)'],
  definicaoDePronto: ['Testes verdes (fictício)'],
};
const rskValido = { riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'medio', riscoJuridicoNivel: 'baixo' };
const decDupla = {
  resumoExecutivo: 'Resumo executivo fictício.',
  opcaoA: { descricao: 'Construir tudo numa entrega (fictício)' },
  opcaoB: { descricao: 'Construir em duas entregas (fictício)' },
  nivelAprovacaoRequerido: 'cto_e_administradora',
};

const REVISEI = 'Revisei os rascunhos de agente citados neste pacote (obrigatório)';
const IDENTIFICADOR = 'Identificador do documento assinado (obrigatório para aprovar)';
const DATA = 'Data da assinatura (obrigatório para aprovar)';
const COMENTARIOS = 'Comentários (opcional)';
const FIXADA_A = 'O CTO aprovou a opção A. A sua aprovação vale para a mesma opção. Para discordar, escolha devolver ou arquivar.';
// Os links do resumo de erros: "<rótulo>: <mensagem>", na ordem da tela (validarDecisao).
const ERRO = {
  opcao: 'Opção escolhida: Escolha a opção A ou a opção B.',
  identificador: 'Identificador do documento assinado: Informe o identificador do documento assinado.',
  data: 'Data da assinatura: Informe a data da assinatura.',
  revisao: 'Revisei os rascunhos de agente citados neste pacote: Marque que revisou os rascunhos de agente para registrar a decisão.',
} as const;

const acoes = (p: Page): Locator => p.getByRole('group', { name: 'Ações da decisão', exact: true });
const principal = (p: Page): Locator => acoes(p).getByRole('button', { name: /^Aprovar( a opção [AB])?$/ });
const botao = (p: Page, rotulo: 'Devolver' | 'Arquivar'): Locator => acoes(p).getByRole('button', { name: rotulo, exact: true });
const dialogo = (p: Page): Locator => p.getByRole('dialog', { name: 'Confirmar a decisão?' });
const resumoDeErros = (p: Page): Locator => p.getByRole('alert').filter({ hasText: 'Corrija os campos abaixo para continuar.' });
const opcoes = (p: Page): Locator => p.getByRole('radio', { name: /^Opção [AB]/ });
const opcao = (p: Page, letra: 'A' | 'B'): Locator => p.getByRole('radio', { name: new RegExp(`^Opção ${letra}`) });
const caixa = (p: Page): Locator => p.getByRole('checkbox', { name: REVISEI });

const pacote = (page: Page, decId: string) => api<Pacote>(page, 'GET', `/api/pacotes-decisao/${decId}`);

// O DEC de agente do seed na `decisaoRecomendaB`, pendente (nenhum teste grava nele).
async function decDeAgenteDoSeed(page: Page): Promise<string> {
  const demandaId = await demandaDoSeed(page, TITULOS_DO_E2E.decisaoRecomendaB);
  const [primeiro] = (await api<{ itens: Versao[] }>(page, 'GET', `/api/demandas/${demandaId}/pacotes-decisao`)).itens;
  if (!primeiro) throw new Error('e2e: o seed não tem o DEC de agente da decisaoRecomendaB');
  expect((await pacote(page, primeiro.id)).statusDecisao, `${primeiro.id} pendente`).toBe('pendente');
  return primeiro.id;
}

// A T11 numa aba nova do contexto (mesma sessão), na largura pedida, com os POST de Server Action anotados. Antes de
// devolver, espera a hidratação do botão principal: um clique antes dela seria um envio nativo do formulário (GET),
// e não o envio da tela.
async function abrirT11(page: Page, decId: string, tela: { width: number; height: number }): Promise<{ p: Page; posts: string[] }> {
  const p = await page.context().newPage();
  await p.setViewportSize(tela);
  const posts: string[] = [];
  p.on('request', (r) => {
    if (r.method() === 'POST' && new URL(r.url()).pathname === `/pacotes-decisao/${decId}`) posts.push(r.url());
  });
  await p.goto(`/pacotes-decisao/${decId}`);
  await p.waitForFunction(() => {
    const b = document.getElementById('decisao-aprovar');
    return b !== null && Object.keys(b).some((k) => k.startsWith('__reactProps$'));
  });
  return { p, posts };
}

// CA-12.3: no celular, o elemento com foco não fica sob o rodapé fixo nem sob a barra de 56 px.
async function focoAVista(p: Page, rotulo: string): Promise<void> {
  const f = await p.evaluate(() => {
    const a = document.activeElement as HTMLElement | null;
    const rodape = document.getElementById('rodape-da-decisao');
    if (!a || a === document.body || !rodape) return null;
    const ra = a.getBoundingClientRect();
    return { id: a.id || a.getAttribute('role') || a.tagName, noRodape: rodape.contains(a), topo: ra.top, baixo: ra.bottom, topoDoRodape: rodape.getBoundingClientRect().top };
  });
  expect(f, `${rotulo}: há foco e rodapé`).not.toBeNull();
  if (!f!.noRodape) expect(f!.baixo, `${rotulo}: ${f!.id} sob o rodapé`).toBeLessThanOrEqual(f!.topoDoRodape);
  expect(f!.topo, `${rotulo}: ${f!.id} sob a barra`).toBeGreaterThanOrEqual(BARRA);
}

// Ativa um dos três botões e confere o resumo: focado, com exatamente estes links, e sem diálogo.
async function barra(p: Page, alvo: Locator, erros: readonly string[], rotulo: string, celular: boolean): Promise<void> {
  await alvo.click();
  await expect(resumoDeErros(p), rotulo).toBeFocused();
  await expect(resumoDeErros(p).getByRole('link'), rotulo).toHaveText([...erros]);
  await expect(dialogo(p), rotulo).toBeHidden();
  if (celular) await focoAVista(p, `${rotulo}: resumo de erros`);
}

test('administradora no DEC de agente, nas duas larguras: nada marcado ao abrir; opção, documento e revisão obrigatórios pelos três botões; nada enviado', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const decId = await decDeAgenteDoSeed(page);

  for (const tela of LARGURAS) {
    const celular = tela === CELULAR;
    const l = `${tela.width} px`;
    const { p, posts } = await abrirT11(page, decId, tela);
    await expect(p.locator('#rodape-da-decisao'), l).toHaveCSS('position', celular ? 'fixed' : 'static');

    // CV-13 e P-01: nada vem marcado nem preenchido; o principal não sugere opção.
    await expect(opcoes(p), l).toHaveCount(2);
    for (const r of await opcoes(p).all()) await expect(r, l).not.toBeChecked();
    await expect(caixa(p), l).not.toBeChecked();
    for (const rotulo of [IDENTIFICADOR, DATA, COMENTARIOS]) await expect(p.getByLabel(rotulo), `${l}: ${rotulo}`).toHaveValue('');
    await expect(p.getByText('Recomendada'), l).toHaveCount(0);
    await expect(principal(p), l).toHaveText('Aprovar');
    // As exigências à vista sem abrir nada: revisão com o nível, recomendação, documento, caixa obrigatória e botões.
    const revisao = p.getByRole('region', { name: 'Revisão antes de decidir', exact: true });
    await expect(revisao.getByText('Nível de aprovação: CTO e administradora', { exact: true }), l).toBeVisible();
    await expect(p.getByText(RECOMENDACAO_DO_E2E, { exact: true }), l).toBeVisible();
    for (const rotulo of [IDENTIFICADOR, DATA, COMENTARIOS]) await expect(p.getByLabel(rotulo), `${l}: ${rotulo}`).toBeVisible();
    await expect(caixa(p), l).toBeVisible();
    await expect(caixa(p), l).toHaveAttribute('aria-required', 'true');
    for (const b of [principal(p), botao(p, 'Devolver'), botao(p, 'Arquivar')]) await expect(b, l).toBeVisible();
    if (celular) for (const b of [principal(p), botao(p, 'Devolver'), botao(p, 'Arquivar')]) await expect(b, l).toBeInViewport();

    // "Aprovar" sem nada: as quatro exigências, na ordem da tela.
    await barra(p, principal(p), [ERRO.opcao, ERRO.identificador, ERRO.data, ERRO.revisao], `${l}, Aprovar sem nada`, celular);
    // Cada link do resumo leva o foco ao campo, à vista (no celular, fora do rodapé).
    const alvos = ['campo-opcaoEscolhida-A', 'campo-referenciaDocumento', 'campo-dataDocumento', 'campo-revisouRascunhosDeAgente'];
    for (const [i, id] of alvos.entries()) {
      await resumoDeErros(p).getByRole('link').nth(i).click();
      await expect(p.locator(`[id="${id}"]`), `${l}: link para ${id}`).toBeFocused();
      if (celular) await focoAVista(p, `${l}: link para ${id}`);
    }

    // "Devolver" e "Arquivar" sem a caixa: só a revisão (opção e documento valem só para aprovar).
    await barra(p, botao(p, 'Devolver'), [ERRO.revisao], `${l}, Devolver sem a caixa`, celular);
    await barra(p, botao(p, 'Arquivar'), [ERRO.revisao], `${l}, Arquivar sem a caixa`, celular);

    // Cada exigência sozinha volta a barrar o "Aprovar".
    await p.getByLabel(IDENTIFICADOR).fill('DOC-FICTICIO-0113');
    await p.getByLabel(DATA).fill('2026-11-11');
    await caixa(p).check();
    await barra(p, principal(p), [ERRO.opcao], `${l}, sem a opção`, celular);
    await opcao(p, 'B').check();
    await expect(principal(p), l).toHaveText('Aprovar a opção B');
    await p.getByLabel(DATA).fill('');
    await barra(p, principal(p), [ERRO.data], `${l}, sem a data`, celular);
    await p.getByLabel(DATA).fill('2026-11-11');
    await p.getByLabel(IDENTIFICADOR).fill('   ');
    await barra(p, principal(p), [ERRO.identificador], `${l}, identificador em branco`, celular);
    await p.getByLabel(IDENTIFICADOR).fill('DOC-FICTICIO-0113');
    await caixa(p).uncheck();
    await barra(p, principal(p), [ERRO.revisao], `${l}, sem a caixa`, celular);

    // Tudo cumprido: o diálogo de C-14 abre com a ação, o repositório e o nível, e "Voltar" não grava.
    await caixa(p).check();
    await principal(p).click();
    const d = dialogo(p);
    await expect(d, l).toBeVisible();
    await expect(d, l).toContainText('Você vai registrar: Aprovar a opção B.');
    await expect(d, l).toContainText(/Repositório destino: \S+\./);
    await expect(d, l).toContainText('Nível de aprovação: CTO e administradora.');
    await expect(resumoDeErros(p), l).toHaveCount(0);
    await d.getByRole('button', { name: 'Voltar' }).click();
    await expect(d, l).toBeHidden();
    await expect(principal(p), l).toBeFocused();
    expect(posts, `${l}: nenhum POST de Server Action`).toEqual([]);
    await p.close();
  }
  expect(await pacote(page, decId)).toMatchObject({ statusDecisao: 'pendente', aprovadores: [], decisao: null });
});

test('segunda aprovação nas duas larguras: a frase fixada no lugar das opções; o documento obrigatório só para aprovar; nada enviado sem confirmar', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const demandaId = await demandaDoSeed(page, TITULOS_DO_E2E.decisaoCelularDupla);
  await prepararEspERsk({
    listarEsp: async () => (await api<{ itens: Versao[] }>(page, 'GET', `/api/demandas/${demandaId}/especificacoes`)).itens,
    listarRsk: async () => (await api<{ itens: Versao[] }>(page, 'GET', `/api/demandas/${demandaId}/pareceres-risco`)).itens,
    criarEsp: () => api<Versao>(page, 'POST', `/api/demandas/${demandaId}/especificacoes`, espValida),
    criarRsk: () => api<Versao>(page, 'POST', `/api/demandas/${demandaId}/pareceres-risco`, rskValido),
  });
  const decId = (await api<Versao>(page, 'POST', `/api/demandas/${demandaId}/pacotes-decisao`, decDupla)).id;
  await entrarComo(page, 'cto');
  await api<unknown>(page, 'PATCH', `/api/pacotes-decisao/${decId}/decisao`, { statusDecisao: 'aprovada', opcaoEscolhida: 'A', revisouRascunhosDeAgente: false });
  await entrarComo(page, 'administradora');

  for (const tela of LARGURAS) {
    const celular = tela === CELULAR;
    const l = `${tela.width} px`;
    const { p, posts } = await abrirT11(page, decId, tela);

    // A frase fixada no lugar das opções; nada para marcar; o documento vazio e à vista; o principal já diz a opção.
    await expect(p.getByText(FIXADA_A, { exact: true }), l).toBeVisible();
    await expect(p.getByRole('radio'), l).toHaveCount(0);
    await expect(p.getByText(/^CTO: Pessoa Ficticia CTO aprovou a opção A em /), l).toBeVisible();
    await expect(p.getByText('Administradora: pendente.', { exact: true }), l).toBeVisible();
    for (const rotulo of [IDENTIFICADOR, DATA]) {
      await expect(p.getByLabel(rotulo), `${l}: ${rotulo}`).toBeVisible();
      await expect(p.getByLabel(rotulo), `${l}: ${rotulo}`).toHaveValue('');
    }
    await expect(principal(p), l).toHaveText('Aprovar a opção A');

    // O documento é obrigatório para aprovar: sem ele, os dois erros; só com o identificador, o da data.
    await barra(p, principal(p), [ERRO.identificador, ERRO.data], `${l}, segunda aprovação sem documento`, celular);
    await p.getByLabel(IDENTIFICADOR).fill('DOC-FICTICIO-0213');
    await barra(p, principal(p), [ERRO.data], `${l}, segunda aprovação sem a data`, celular);

    // Para devolver, o documento não é exigido: o diálogo abre direto, e "Voltar" não grava.
    await botao(p, 'Devolver').click();
    await expect(dialogo(p), l).toContainText('Você vai registrar: Devolver para nova análise.');
    await expect(dialogo(p), l).not.toContainText('Aprovar a opção');
    await dialogo(p).getByRole('button', { name: 'Voltar' }).click();
    await expect(dialogo(p), l).toBeHidden();
    await expect(botao(p, 'Devolver'), l).toBeFocused();

    // Com o documento completo, o diálogo de C-14 abre para a opção fixada, com o repositório e o nível.
    await p.getByLabel(DATA).fill('2026-11-11');
    await principal(p).click();
    const d = dialogo(p);
    await expect(d, l).toContainText('Você vai registrar: Aprovar a opção A.');
    await expect(d, l).toContainText('Repositório destino: wsssistemas2626-crypto/sistema-ficticio.');
    await expect(d, l).toContainText('Nível de aprovação: CTO e administradora.');
    await d.getByRole('button', { name: 'Voltar' }).click();
    await expect(d, l).toBeHidden();
    await expect(principal(p), l).toBeFocused();
    expect(posts, `${l}: nenhum POST de Server Action`).toEqual([]);
    await p.close();
  }
  const final = await pacote(page, decId);
  expect(final.statusDecisao).toBe('pendente');
  expect(final.aprovadores).toEqual([expect.objectContaining({ papel: 'cto', opcao: 'A' })]);
});
