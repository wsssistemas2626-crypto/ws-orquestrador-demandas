// Escrito na 06-T15-testes (qa-automacao), pedido 0015. Fecha o que o reflow.spec (T15) deixa aberto: lá, T09, T10 e
// T12 são medidas como abrem, e a regra "dentro do cartão" é a de `closest('.rounded-cartao')`, que o `<dialog>` da T12
// também satisfaz (06-T15-tech-lead, Minor 2). Aqui, em 320 px, com a conta "cto" (a única que abre o diálogo e o
// erro do teto da T12):
//   - T09: o formulário com texto longo sem ponto de quebra, campo acima do limite e o resumo de erros (quatro erros, na
//     ordem da tela), e as mensagens de cada campo dentro do cartão do campo;
//   - T10 (ESP e RSK) e T12: cada elemento de cada cartão cabe na largura do cartão, e cada cartão na janela; a região
//     da tabela da T12 cabe no cartão, e só o conteúdo dela pode rolar (CA-14.2: "fora das regiões de tabela que já
//     rolam hoje");
//   - T12: o diálogo de ligar fica dentro do cartão "Agentes" e cabe em 320 px; o erro do teto e o resumo de erros ficam
//     dentro do cartão "Gasto do mês".
// Em cada estado: nenhuma rolagem lateral; o foco do resumo e dos links dele fora da barra do topo (WCAG 2.4.11); axe
// sem violação em 320 px (página no topo, 06-T14-tech-lead, Minor 3) e em 1280 px, no mesmo estado. Nenhuma regra do
// axe é desligada.
// Nada é gravado: a validação da tela barra os dois envios e o diálogo é cancelado. O teste confere zero POST (Server
// Action) em cada aba, e a demanda, o teto e os agentes iguais pela API no começo e no fim. Antes de clicar no
// interruptor, confere que ele está desligado: ligado, o clique desligaria sem diálogo, e isso grava.
// C-36: não cria demanda nem versão. Usa a demanda do seed `etapasDupla` (a única com ESP e RSK), só para leitura.
import type { Page } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { api, demandaDoSeed, entrarComo, expect, semViolacoes, test } from './apoio';

const ESTREITA = { width: 320, height: 844 };
const COMPUTADOR = { width: 1280, height: 720 };
// A barra do topo da casca abaixo de 768 px (T05).
const BARRA = 56;

const resumoDeErros = (p: Page) => p.getByRole('alert').filter({ hasText: 'Corrija os campos abaixo para continuar.' });

// A tela numa aba nova do contexto (mesma sessão), já em 320 px, com os POST anotados. Com formulário, espera a
// hidratação dele: um clique antes seria um envio nativo, e não o envio da tela.
async function abrirAba(page: Page, caminho: string, titulo: string | RegExp, comFormulario: boolean): Promise<{ p: Page; posts: string[] }> {
  const p = await page.context().newPage();
  await p.setViewportSize(ESTREITA);
  const posts: string[] = [];
  p.on('request', (r) => {
    if (r.method() === 'POST') posts.push(new URL(r.url()).pathname);
  });
  await p.goto(caminho);
  await expect(p.getByRole('heading', { level: 1, name: titulo, exact: typeof titulo === 'string' })).toBeVisible();
  if (comFormulario) {
    await p.waitForFunction(() => {
      const f = document.querySelector('main form');
      return f !== null && Object.keys(f).some((k) => k.startsWith('__reactProps$'));
    });
  }
  return { p, posts };
}

async function semRolagemLateral(p: Page, rotulo: string): Promise<void> {
  const r = await p.evaluate(() => ({ largura: document.documentElement.scrollWidth, janela: window.innerWidth }));
  expect(r.largura, `${rotulo}: largura da página`).toBeLessThanOrEqual(r.janela);
}

// Cada cartão (`section.rounded-cartao` do `main`) cabe na janela, e cada elemento visível dele cabe na largura do
// cartão. Fica de fora só o que está dentro da região rolável da tabela (a região em si tem de caber), o que está no
// `<dialog>` (camada de topo, medido à parte) e o texto só para leitor de tela.
async function tudoCabeNosCartoes(p: Page, rotulo: string, cartoes: number): Promise<void> {
  const r = await p.evaluate(() => {
    const janela = window.innerWidth;
    const lista = [...document.querySelectorAll('main section.rounded-cartao')];
    const fora: string[] = [];
    const nome = (e: Element) => `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''}`;
    for (const cartao of lista) {
      const c = cartao.getBoundingClientRect();
      if (c.left < -0.5 || c.right > janela + 0.5) fora.push(`cartão ${nome(cartao)} fora da janela`);
      for (const e of cartao.querySelectorAll('*')) {
        const regiao = e.closest('[role="region"]');
        if (regiao !== null && regiao !== e) continue;
        if (e.closest('dialog') !== null || e.closest('.sr-only') !== null) continue;
        const b = e.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) continue;
        if (b.left < c.left - 0.5 || b.right > c.right + 0.5) fora.push(`${nome(e)} passa do cartão ${cartao.getAttribute('aria-labelledby') ?? ''}`);
      }
    }
    return { cartoes: lista.length, fora };
  });
  expect(r.fora, `${rotulo}: fora do cartão ou da janela`).toEqual([]);
  expect(r.cartoes, `${rotulo}: cartões`).toBe(cartoes);
}

// O elemento com foco não fica sob a barra do topo.
async function focoForaDaBarra(p: Page, rotulo: string): Promise<void> {
  const f = await p.evaluate(() => {
    const a = document.activeElement;
    if (!a || a === document.body) return null;
    return { id: a.id || a.getAttribute('role') || a.tagName, topo: a.getBoundingClientRect().top };
  });
  expect(f, `${rotulo}: há foco`).not.toBeNull();
  expect(f!.topo, `${rotulo}: ${f!.id} sob a barra do topo`).toBeGreaterThanOrEqual(BARRA);
}

// Axe no estado em que a tela está: em 320 px com a página no topo, e em 1280 px; depois volta a 320 px.
async function axeNasDuasLarguras(p: Page, rotulo: string): Promise<void> {
  await p.evaluate(() => window.scrollTo(0, 0));
  await semViolacoes(p, `${rotulo} em 320 px`);
  await p.setViewportSize(COMPUTADOR);
  await semViolacoes(p, `${rotulo} em 1280 px`);
  await p.setViewportSize(ESTREITA);
}

test.describe('T15 em 320 px com conteúdo e estados que crescem', () => {
  test.use({ viewport: ESTREITA });

  test('T09 com erros e texto longo, T10 e T12 com diálogo e erro do teto: tudo cabe nos cartões, sem rolagem lateral, foco fora da barra e axe; nada gravado', async ({ page }) => {
    await entrarComo(page, 'cto');
    const id = await demandaDoSeed(page, TITULOS_DO_E2E.etapasDupla);
    const demandaAntes = await api<unknown>(page, 'GET', `/api/demandas/${id}`);
    const tetoAntes = await api<unknown>(page, 'GET', '/api/configuracao/teto');
    const agentesAntes = await api<unknown>(page, 'GET', '/api/agentes');

    // T09: descrição da opção A longa e sem espaço, recomendação acima do limite; resumo, descrição B e nível vazios.
    {
      const { p, posts } = await abrirAba(page, `/demandas/${id}/pacotes-decisao/novo`, 'Novo pacote de decisão', true);
      await p.getByRole('textbox', { name: /^Descrição da opção A/ }).fill('descricaoficticiasemespaco'.repeat(12));
      await p.getByRole('textbox', { name: /^Vantagens da opção A/ }).fill('vantagemficticiasemespaco'.repeat(12));
      await p.getByRole('textbox', { name: /^Recomendação/ }).fill('r'.repeat(10_001));
      await p.getByRole('button', { name: /^Gravar DEC-/ }).click();

      const resumo = resumoDeErros(p);
      await expect(resumo, 'T09').toBeFocused();
      await focoForaDaBarra(p, 'T09: resumo de erros');
      await expect(resumo.getByRole('link')).toHaveText([
        'Resumo executivo: Informe o resumo executivo.',
        'Descrição da opção B: Descreva a opção B.',
        'Recomendação: Este campo aceita até 10.000 caracteres.',
        'Nível de aprovação requerido: Escolha o nível de aprovação requerido.',
      ]);
      await resumo.getByRole('link', { name: 'Resumo executivo: Informe o resumo executivo.', exact: true }).click();
      await expect(p.locator('#campo-resumoExecutivo')).toBeFocused();
      await focoForaDaBarra(p, 'T09: Resumo executivo');
      await resumo.getByRole('link', { name: 'Nível de aprovação requerido: Escolha o nível de aprovação requerido.', exact: true }).click();
      await expect(p.locator('#campo-nivelAprovacaoRequerido-cto')).toBeFocused();
      await focoForaDaBarra(p, 'T09: Nível de aprovação requerido');

      // Cada campo e a mensagem de erro dele dentro de um cartão, e os 5 cartões da tela vazia.
      const estrutura = await p.evaluate(() => {
        const form = document.querySelector('main form');
        if (!form) return null;
        const elementos = [...form.querySelectorAll('fieldset, section, input, select, textarea, [id$="-erro"]')];
        return {
          mensagens: form.querySelectorAll('[id$="-erro"]').length,
          fora: elementos.filter((e) => !e.closest('section.rounded-cartao')).map((e) => `${e.tagName.toLowerCase()}#${e.id}`),
        };
      });
      expect(estrutura, 'T09: o formulário').not.toBeNull();
      expect(estrutura!.fora, 'T09 com erros: fora de cartão').toEqual([]);
      expect(estrutura!.mensagens, 'T09: uma mensagem por campo com erro').toBe(4);
      await semRolagemLateral(p, 'T09 com erros e texto longo');
      await tudoCabeNosCartoes(p, 'T09 com erros e texto longo', 5);
      await axeNasDuasLarguras(p, 'T09 com erros e texto longo');
      expect(posts, 'T09: nada enviado').toEqual([]);
    }

    // T10: as duas versões da demanda, só leitura.
    for (const [caminho, titulo, rotulo] of [
      [`/especificacoes/ESP-${id}-v1`, /^Especificação técnica v1 — /, 'T10 Ver ESP'],
      [`/pareceres-risco/RSK-${id}-v1`, /^Parecer de risco v1 — /, 'T10 Ver RSK'],
    ] as const) {
      const { p, posts } = await abrirAba(page, caminho, titulo, false);
      await semRolagemLateral(p, rotulo);
      await tudoCabeNosCartoes(p, rotulo, 7);
      expect(posts, `${rotulo}: nada enviado`).toEqual([]);
      await p.close();
    }

    // T12: o diálogo de ligar (cancelado) e o erro do teto (validação da tela).
    {
      const { p, posts } = await abrirAba(page, '/configuracao/agentes', 'Agentes e teto de gasto', true);
      await semRolagemLateral(p, 'T12');
      await tudoCabeNosCartoes(p, 'T12', 2);
      await expect(p.getByRole('region', { name: 'Agentes de IA' })).toBeVisible();

      const interruptor = p.getByRole('switch', { name: 'Agente de consolidação (DEC)', exact: true });
      await expect(interruptor, 'T12: desligado antes do clique (ligado, o clique grava)').toHaveAttribute('aria-checked', 'false');
      await interruptor.click();
      const dialogo = p.getByRole('dialog', { name: 'Ligar o agente de consolidação?' });
      await expect(dialogo).toBeVisible();
      const ondeEsta = await dialogo.evaluate((d) => {
        const b = d.getBoundingClientRect();
        return { cartao: d.closest('section.rounded-cartao')?.getAttribute('aria-labelledby') ?? null, esquerda: b.left, direita: b.right, janela: window.innerWidth };
      });
      expect(ondeEsta.cartao, 'T12: o diálogo fica dentro do cartão "Agentes"').toBe('agentes');
      expect(ondeEsta.esquerda, 'T12: o diálogo cabe em 320 px').toBeGreaterThanOrEqual(0);
      expect(ondeEsta.direita, 'T12: o diálogo cabe em 320 px').toBeLessThanOrEqual(ondeEsta.janela);
      await expect(dialogo.getByRole('button', { name: 'Ligar agente' })).toBeInViewport();
      await expect(dialogo.getByRole('button', { name: 'Cancelar' })).toBeInViewport();
      await semRolagemLateral(p, 'T12 com o diálogo aberto');
      await semViolacoes(p, 'T12 com o diálogo aberto em 320 px');
      await dialogo.getByRole('button', { name: 'Cancelar' }).click();
      await expect(dialogo).toBeHidden();
      await expect(interruptor).toHaveAttribute('aria-checked', 'false');
      await expect(interruptor).toBeFocused();

      const campo = p.getByRole('textbox', { name: 'Teto mensal de gasto (US$)' });
      await campo.fill('-1');
      await p.getByRole('button', { name: 'Salvar teto' }).click();
      const resumo = resumoDeErros(p);
      await expect(resumo, 'T12').toBeFocused();
      await focoForaDaBarra(p, 'T12: resumo de erros');
      await resumo.getByRole('link', { name: 'Teto mensal de gasto (US$): O teto não pode ser negativo.', exact: true }).click();
      await expect(campo).toBeFocused();
      await focoForaDaBarra(p, 'T12: Teto mensal de gasto');
      const noCartao = await p.evaluate(() =>
        ['campo-tetoMensal-erro', 'campo-tetoMensal'].map((i) => document.getElementById(i)?.closest('section.rounded-cartao')?.getAttribute('aria-labelledby') ?? null),
      );
      expect(noCartao, 'T12: o campo e a mensagem dentro do cartão "Gasto do mês"').toEqual(['gasto-do-mes', 'gasto-do-mes']);
      await expect(resumo.locator('xpath=ancestor::section[contains(concat(" ", @class, " "), " rounded-cartao ")]')).toHaveAttribute('aria-labelledby', 'gasto-do-mes');
      await semRolagemLateral(p, 'T12 com erro do teto');
      await tudoCabeNosCartoes(p, 'T12 com erro do teto', 2);
      await axeNasDuasLarguras(p, 'T12 com erro do teto');
      expect(posts, 'T12: nada enviado').toEqual([]);
    }

    expect(await api<unknown>(page, 'GET', `/api/demandas/${id}`), 'a demanda e as versões não mudaram').toEqual(demandaAntes);
    expect(await api<unknown>(page, 'GET', '/api/configuracao/teto'), 'o teto não mudou').toEqual(tetoAntes);
    expect(await api<unknown>(page, 'GET', '/api/agentes'), 'os agentes não mudaram').toEqual(agentesAntes);
  });
});
