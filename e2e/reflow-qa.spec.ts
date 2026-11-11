// Escrito na 06-T14-testes (qa-automacao), pedido 0015. Fecha o que o reflow.spec (T14) deixa aberto: lá, T06, T07 e
// T08 são medidas como abrem; aqui, em 320 px, depois de o conteúdo crescer como cresce no uso (CA-14.2, RNF-05; 03,
// 8.2):
//   - T06: anexos até o limite, com a dica do limite (a T14 trocou o token dela), e o resumo de erros;
//   - T07: itens novos em "Dúvidas em aberto", o repositório destino com um sistema alvo longo, sem hífen, e o resumo de
//     erros;
//   - T08: itens novos nas duas listas e o resumo de erros do "Resumo" acima do limite.
// Em cada estado: nenhuma rolagem lateral; cada campo novo (fieldset de anexo, item de lista) dentro de um cartão, e o
// mesmo número de cartões da tela vazia; o resumo de erros e o campo que o link dele foca fora da barra do topo (WCAG
// 2.4.11); axe sem violação em 320 px e em 1280 px, no mesmo estado. Antes do axe em 320 px a página volta ao topo: a
// regra target-size acusa campo que a rolagem deixou sob a barra fixa ao lado de "Menu", o que depende da posição de
// rolagem e não da tela (06-T14-tech-lead, Minor 3). Nenhuma regra do axe é desligada.
// Nada é gravado: a validação da tela barra o envio, e o teste confere zero POST (Server Action) e a demanda igual
// pela API. Cada tela abre numa aba nova do mesmo contexto: o formulário sujo da anterior não segura a navegação.
// C-36: não cria demanda nem versão. Usa a demanda do seed `espListaDeTextos`, só para leitura. Um login só.
import type { Page } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { LIMITE_ANEXOS, TEXTOS_DEMANDA } from '../src/components/dados-da-demanda';
import { api, demandaDoSeed, entrarComo, expect, semViolacoes, test } from './apoio';

const ESTREITA = { width: 320, height: 844 };
const COMPUTADOR = { width: 1280, height: 720 };
// A barra do topo da casca abaixo de 768 px (T05).
const BARRA = 56;

const resumoDeErros = (p: Page) => p.getByRole('alert').filter({ hasText: 'Corrija os campos abaixo para continuar.' });

// A tela numa aba nova do contexto (mesma sessão), já em 320 px, com os POST anotados. Antes de devolver, espera a
// hidratação do formulário: um clique antes dela seria um envio nativo (GET), e não o envio da tela.
async function abrirAba(page: Page, caminho: string, titulo: string): Promise<{ p: Page; posts: string[] }> {
  const p = await page.context().newPage();
  await p.setViewportSize(ESTREITA);
  const posts: string[] = [];
  p.on('request', (r) => {
    if (r.method() === 'POST') posts.push(new URL(r.url()).pathname);
  });
  await p.goto(caminho);
  await expect(p.getByRole('heading', { level: 1, name: titulo, exact: true })).toBeVisible();
  await p.waitForFunction(() => {
    const f = document.querySelector('main form');
    return f !== null && Object.keys(f).some((k) => k.startsWith('__reactProps$'));
  });
  return { p, posts };
}

async function semRolagemLateral(p: Page, rotulo: string): Promise<void> {
  const r = await p.evaluate(() => ({ largura: document.documentElement.scrollWidth, janela: window.innerWidth }));
  expect(r.largura, `${rotulo}: largura da página`).toBeLessThanOrEqual(r.janela);
}

// Cada fieldset, seção e campo do formulário dentro de um cartão, e o número de cartões o da tela vazia.
async function camposEmCartoes(p: Page, rotulo: string, cartoes: number): Promise<void> {
  const r = await p.evaluate(() => {
    const form = document.querySelector('main form');
    if (!form) return null;
    const elementos = [...form.querySelectorAll('fieldset, section, input, select, textarea')];
    return {
      cartoes: form.querySelectorAll('.rounded-cartao').length,
      fora: elementos.filter((e) => !e.closest('.rounded-cartao')).map((e) => `${e.tagName.toLowerCase()}#${e.id}`),
    };
  });
  expect(r, `${rotulo}: o formulário`).not.toBeNull();
  expect(r!.fora, `${rotulo}: fora de cartão`).toEqual([]);
  expect(r!.cartoes, `${rotulo}: cartões`).toBe(cartoes);
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

// Envia, confere o resumo focado e fora da barra, e segue o link do campo indicado até o campo, também fora da barra.
async function errosAVista(p: Page, rotulo: string, enviar: RegExp | string, link: string, campo: string): Promise<void> {
  await p.getByRole('button', { name: enviar }).click();
  await expect(resumoDeErros(p), rotulo).toBeFocused();
  await focoForaDaBarra(p, `${rotulo}: resumo de erros`);
  await resumoDeErros(p).getByRole('link', { name: link, exact: true }).click();
  await expect(p.getByLabel(campo, { exact: true }), rotulo).toBeFocused();
  await focoForaDaBarra(p, `${rotulo}: ${campo}`);
}

// Axe no estado em que a tela está: em 320 px com a página no topo, e em 1280 px.
async function axeNasDuasLarguras(p: Page, rotulo: string): Promise<void> {
  await p.evaluate(() => window.scrollTo(0, 0));
  await semViolacoes(p, `${rotulo} em 320 px`);
  await p.setViewportSize(COMPUTADOR);
  await semViolacoes(p, `${rotulo} em 1280 px`);
}

test.describe('320 px com o conteúdo crescido', () => {
  test.use({ viewport: ESTREITA });

  test('T06, T07 e T08: anexos no limite, itens novos e resumo de erros sem rolagem lateral, tudo em cartões, foco fora da barra e axe; nada gravado', async ({ page }) => {
    await entrarComo(page, 'administradora');
    const id = await demandaDoSeed(page, TITULOS_DO_E2E.espListaDeTextos);
    const antes = await api<unknown>(page, 'GET', `/api/demandas/${id}`);

    // T06: anexos até o limite. A dica do limite fica ligada ao botão desabilitado (token trocado na T14).
    {
      const { p, posts } = await abrirAba(page, `/demandas/${id}/editar`, 'Editar dados da demanda');
      const adicionar = p.getByRole('button', { name: 'Adicionar anexo', exact: true });
      for (let i = 0; i < LIMITE_ANEXOS && (await adicionar.isEnabled()); i++) await adicionar.click();
      await expect(adicionar).toBeDisabled();
      await expect(p.getByRole('group', { name: /^Anexo \d+$/ })).toHaveCount(LIMITE_ANEXOS);
      await expect(adicionar).toHaveAccessibleDescription(TEXTOS_DEMANDA.erroLimiteAnexos);
      await p
        .getByRole('group', { name: 'Anexo 1', exact: true })
        .getByLabel('Referência', { exact: true })
        .fill(`https://exemplo.test/${'caminhoficticiosemespaco'.repeat(12)}`);
      await p.getByLabel('Título (obrigatório)', { exact: true }).fill('');
      await errosAVista(p, 'T06', 'Salvar alterações', 'Título: Informe o título.', 'Título (obrigatório)');
      await semRolagemLateral(p, 'T06 com anexos no limite e erros');
      await camposEmCartoes(p, 'T06 com anexos no limite e erros', 4);
      await axeNasDuasLarguras(p, 'T06 com anexos no limite e erros');
      expect(posts, 'T06: nada enviado').toEqual([]);
    }

    // T07: três dúvidas a mais, sistema alvo longo sem ponto de quebra e a descrição objetiva vazia.
    {
      const { p, posts } = await abrirAba(page, `/demandas/${id}/especificacoes/nova`, 'Nova versão da especificação técnica');
      const duvidas = p.getByRole('group', { name: 'Dúvidas em aberto', exact: true });
      const itensAntes = await duvidas.getByRole('textbox').count();
      for (let i = 0; i < 3; i++) await duvidas.getByRole('button', { name: 'Adicionar item', exact: true }).click();
      await expect(duvidas.getByRole('textbox')).toHaveCount(itensAntes + 3);
      await duvidas.getByRole('textbox').last().fill('duvidaficticiasemespaco'.repeat(10));
      const sistemaLongo = 'sistemaficticiocomnomebemlongo'.repeat(3);
      await p.getByRole('textbox', { name: /^Sistema alvo/ }).fill(sistemaLongo);
      await expect(p.locator('#repositorio-destino')).toContainText(sistemaLongo);
      await p.getByLabel('Descrição objetiva (obrigatório)', { exact: true }).fill('');
      await errosAVista(p, 'T07', /^Gravar ESP-/, 'Descrição objetiva: Informe a descrição objetiva.', 'Descrição objetiva (obrigatório)');
      await expect(p.getByRole('dialog', { name: 'Gravar com dúvidas em aberto?' })).toBeHidden();
      await semRolagemLateral(p, 'T07 com itens novos e erros');
      await camposEmCartoes(p, 'T07 com itens novos e erros', 7);
      await axeNasDuasLarguras(p, 'T07 com itens novos e erros');
      expect(posts, 'T07: nada enviado').toEqual([]);
    }

    // T08: dois itens a mais em cada lista e o "Resumo" acima do limite.
    {
      const { p, posts } = await abrirAba(page, `/demandas/${id}/pareceres-risco/novo`, 'Novo parecer de risco');
      for (const nome of ['Recomendações de mitigação', 'Pré-condições']) {
        const grupo = p.getByRole('group', { name: nome, exact: true });
        const itensAntes = await grupo.getByRole('textbox').count();
        for (let i = 0; i < 2; i++) await grupo.getByRole('button', { name: 'Adicionar item', exact: true }).click();
        await expect(grupo.getByRole('textbox')).toHaveCount(itensAntes + 2);
        await grupo.getByRole('textbox').last().fill('itemficticiosemespaco'.repeat(10));
      }
      await p.getByLabel('Resumo', { exact: true }).fill('x'.repeat(10_001));
      await errosAVista(p, 'T08', /^Gravar RSK-/, 'Resumo: Este campo aceita até 10.000 caracteres.', 'Resumo');
      await semRolagemLateral(p, 'T08 com itens novos e erros');
      await camposEmCartoes(p, 'T08 com itens novos e erros', 7);
      await axeNasDuasLarguras(p, 'T08 com itens novos e erros');
      expect(posts, 'T08: nada enviado').toEqual([]);
    }

    expect(await api<unknown>(page, 'GET', `/api/demandas/${id}`), 'a demanda e as versões não mudaram').toEqual(antes);
  });
});
