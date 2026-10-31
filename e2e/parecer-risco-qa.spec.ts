// T42 (06-T42-testes, qa-automacao): o que o e2e do engenheiro (parecer-risco.spec.ts) não confere no navegador:
//   - `?base=` de outra demanda, de versão que não existe, de ESP ou fora do formato: a T08 parte do RSK mais novo da
//     própria demanda e não mostra nada da outra;
//   - o alerta de chegada da T08 na T05 com a URL forjada: versão de outra demanda, versão de ESP com o aviso do RSK (e o
//     contrário), DEC de outra demanda ou em dia, valor de `?aviso=` fora da lista, marcação na URL;
//   - duplo clique em "Gravar": um envio só, um RSK só, e a resposta da Server Action sem o que foi digitado;
//   - a correção do achado 1 da 06-T41-revisao ligada também na T07 da ESP (FormularioEspecificacao passa `aoRemover`):
//     o engenheiro a viu no navegador só na T08.
// Os dados de cada teste são criados aqui, pela conta "cto". O limite por ator (C-36: 30 demandas por hora) conta por
// conta, e a "administradora" já não tem folga na suíte inteira: com as 4 demandas daqui por ela, os 3 últimos testes
// do parecer-risco.spec.ts (que roda depois deste) falharam, e o de 320 px só cria uma demanda. Nenhum teste depende de
// outro ter rodado antes.
import { expect, test, type Page, type Request } from '@playwright/test';
import { api, entrarComo, semViolacoes } from './apoio';

type Demanda = { id: string };
type Versao = { id: string };

const TITULO = 'Demanda do parecer de risco QA (fictício)';
const SENTINELA = 'SENTINELA-RSK-E2E-7d1e';

const espValida = {
  descricaoObjetiva: 'Evitar pedidos duplicados (fictício).',
  escopoInclui: ['Conferir o id do pedido antes de criar (fictício)'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['O mesmo pedido não aparece duas vezes (fictício)'],
  definicaoDePronto: ['Testes verdes (fictício)'],
};
const rskValido = { riscoTecnicoNivel: 'alto', riscoOperacionalNivel: 'medio', riscoJuridicoNivel: 'baixo' };
const decValido = { resumoExecutivo: 'Resumo fictício.', opcaoA: { descricao: 'Opção A fictícia' }, opcaoB: { descricao: 'Opção B fictícia' }, nivelAprovacaoRequerido: 'cto' };

const criar = (page: Page) => api<Demanda>(page, 'POST', '/api/demandas', { titulo: TITULO, tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' });
const espPelaApi = (page: Page, id: string, extra: Record<string, unknown> = {}) => api<Versao>(page, 'POST', `/api/demandas/${id}/especificacoes`, { ...espValida, ...extra });
const rskPelaApi = (page: Page, id: string, extra: Record<string, unknown> = {}) => api<Versao>(page, 'POST', `/api/demandas/${id}/pareceres-risco`, { ...rskValido, ...extra });
const pareceres = async (page: Page, id: string) => (await api<{ itens: Versao[] }>(page, 'GET', `/api/demandas/${id}/pareceres-risco`)).itens;
const ehServerAction = (r: Request) => r.method() === 'POST' && r.headers()['next-action'] !== undefined;
const grupo = (page: Page, nome: string) => page.getByRole('group', { name: nome, exact: true });
const item = (page: Page, lista: string, n: number) => grupo(page, lista).getByRole('textbox', { name: `Item ${n}`, exact: true });
const nivel = (page: Page, risco: string, rotulo: 'Baixo' | 'Médio' | 'Alto') => grupo(page, `Nível do ${risco} (obrigatório)`).getByRole('radio', { name: rotulo, exact: true });

test('?base= de outra demanda, de versão que não existe, de ESP ou fora do formato: a T08 parte do RSK mais novo da própria demanda; a chegada na T05 não confia na URL', async ({ page }) => {
  await entrarComo(page, 'cto');
  const a = await criar(page);
  await espPelaApi(page, a.id);
  const rskA = await rskPelaApi(page, a.id, { resumo: 'Resumo da outra demanda (fictício)' });
  const decA = await api<Versao>(page, 'POST', `/api/demandas/${a.id}/pacotes-decisao`, decValido);
  await rskPelaApi(page, a.id); // o DEC da outra demanda fica pendente e desatualizado
  const d = await criar(page);
  const espD = await espPelaApi(page, d.id);
  const rskD = await rskPelaApi(page, d.id, { resumo: 'Resumo desta demanda (fictício)', riscoTecnicoNivel: 'baixo' });
  const decD = await api<Versao>(page, 'POST', `/api/demandas/${d.id}/pacotes-decisao`, decValido); // em dia

  for (const base of [rskA.id, `RSK-${d.id}-v9`, espD.id, decD.id, 'qualquer-coisa', '%3Cscript%3Ealert(1)%3C%2Fscript%3E']) {
    const r = await page.goto(`/demandas/${d.id}/pareceres-risco/novo?base=${base}`);
    expect(r?.status(), base).toBe(200);
    await expect(page.getByText(`Este será o RSK-${d.id}-v2. A especificação mais nova desta demanda é a ${espD.id}.`)).toBeVisible();
    await expect(page.getByLabel('Resumo', { exact: true })).toHaveValue('Resumo desta demanda (fictício)');
    await expect(nivel(page, 'risco técnico', 'Baixo')).toBeChecked();
    await expect(page.locator('main')).not.toContainText('Resumo da outra demanda');
    await expect(page.locator('main')).not.toContainText('script');
  }
  // Duas bases na URL (lista): nenhuma vale, e a página parte da mais nova.
  await page.goto(`/demandas/${d.id}/pareceres-risco/novo?base=${rskA.id}&base=${rskD.id}`);
  await expect(page.getByLabel('Resumo', { exact: true })).toHaveValue('Resumo desta demanda (fictício)');

  const chegada = () => page.locator('main').getByRole('alert').filter({ hasText: /gravad[oa]\.|Outra versão|desatualizado\. Crie/ });
  for (const busca of [
    `aviso=parecer-gravado&versao=${rskA.id}`,
    `aviso=parecer-conflito&versao=${rskA.id}`,
    `aviso=parecer-gravado&versao=RSK-${d.id}-v9`,
    `aviso=parecer-gravado-x&versao=${rskD.id}`,
    `aviso=parecer-gravado&versao=${espD.id}`,
    `aviso=especificacao-gravada&versao=${rskD.id}`,
    `aviso=parecer-gravado&versao=%3Cscript%3Ealert(1)%3C%2Fscript%3E`,
  ]) {
    await page.goto(`/demandas/${d.id}?${busca}`);
    await expect(page.getByRole('heading', { level: 1, name: TITULO })).toBeVisible();
    await expect(chegada(), busca).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText('script');
  }
  // A versão é desta demanda, mas o DEC da URL é de outra, ou é desta e está em dia: só a frase da versão.
  for (const dec of [decA.id, decD.id]) {
    await page.goto(`/demandas/${d.id}?aviso=parecer-gravado&versao=${rskD.id}&dec=${dec}`);
    await expect(chegada(), dec).toHaveText(`${rskD.id} gravado.`);
  }
  await semViolacoes(page, 'T05 com a chegada da T08');
});

test('duplo clique em "Gravar": um envio só e um RSK só; a resposta da Server Action não traz o que foi digitado', async ({ page }) => {
  await entrarComo(page, 'cto');
  const d = await criar(page);
  await page.goto(`/demandas/${d.id}/pareceres-risco/novo`);
  await expect(page.getByRole('heading', { level: 1, name: 'Novo parecer de risco' })).toBeVisible();
  const envios: Request[] = [];
  page.on('request', (r) => {
    if (ehServerAction(r)) envios.push(r);
  });

  await page.getByLabel('Resumo', { exact: true }).fill(`Resumo ${SENTINELA} (fictício)`);
  await nivel(page, 'risco técnico', 'Alto').check();
  await nivel(page, 'risco operacional', 'Médio').check();
  await nivel(page, 'risco jurídico', 'Baixo').check();
  await item(page, 'Pré-condições', 1).fill(`Pré-condição ${SENTINELA} (fictício)`);
  await page.getByRole('button', { name: `Gravar RSK-${d.id}-v1` }).dblclick();

  await expect(page).toHaveURL(new RegExp(`/demandas/${d.id}\\?aviso=parecer-gravado&versao=RSK-${d.id}-v1$`));
  await expect(page.getByRole('alert').filter({ hasText: 'gravado.' })).toHaveText(`RSK-${d.id}-v1 gravado.`);
  // O segundo envio, se houvesse, sairia no segundo clique, antes da resposta do primeiro.
  expect(envios).toHaveLength(1);
  expect(envios[0]!.postData() ?? '').toContain(SENTINELA);
  const corpo = (await (await envios[0]!.response())?.text()) ?? '';
  expect(corpo).toContain(`RSK-${d.id}-v1`);
  expect(corpo).not.toContain(SENTINELA);
  expect((await pareceres(page, d.id)).map((r) => r.id)).toEqual([`RSK-${d.id}-v1`]);
});

test('T07 da ESP com a correção da Lista de textos: erro no item 2 de "Escopo inclui"; remover o item 1 leva o erro e o link do resumo para o novo item 1', async ({ page }) => {
  await entrarComo(page, 'cto');
  const d = await criar(page);
  await page.goto(`/demandas/${d.id}/especificacoes/nova`);
  await expect(page.getByRole('heading', { level: 1, name: 'Nova versão da especificação técnica' })).toBeVisible();

  await page.getByLabel('Descrição objetiva (obrigatório)').fill('Evitar pedidos duplicados (fictício).');
  const escopo = grupo(page, 'Escopo inclui');
  await item(page, 'Escopo inclui', 1).fill('Primeiro escopo (fictício)');
  await escopo.getByRole('button', { name: 'Adicionar item' }).click();
  await item(page, 'Escopo inclui', 2).fill('x'.repeat(10_001));
  await page.getByLabel('Sistema alvo (obrigatório)').fill('sistema-ficticio');
  await item(page, 'Critérios de aceite preliminares (obrigatório)', 1).fill('Critério (fictício)');
  await item(page, 'Definição de pronto (obrigatório)', 1).fill('Pronto (fictício)');
  await page.getByRole('button', { name: `Gravar ESP-${d.id}-v1` }).click();

  const resumo = page.getByRole('alert').filter({ hasText: 'Corrija os campos abaixo para continuar.' });
  await expect(resumo).toBeFocused();
  await expect(resumo.getByRole('link')).toHaveText(['Item 2 de Escopo inclui: Este campo aceita até 10.000 caracteres.']);
  await expect(item(page, 'Escopo inclui', 2)).toHaveAttribute('aria-invalid', 'true');

  await escopo.getByRole('button', { name: 'Remover item 1 de Escopo inclui' }).click();
  await expect(escopo.getByRole('textbox')).toHaveCount(1);
  await expect(escopo.getByRole('button', { name: 'Adicionar item' })).toBeFocused();
  await expect(item(page, 'Escopo inclui', 1)).toHaveAttribute('aria-invalid', 'true');
  await expect(item(page, 'Escopo inclui', 1)).toHaveAccessibleDescription('Este campo aceita até 10.000 caracteres.');
  await expect(resumo.getByRole('link')).toHaveText(['Item 1 de Escopo inclui: Este campo aceita até 10.000 caracteres.']);
  await resumo.getByRole('link').click();
  await expect(item(page, 'Escopo inclui', 1)).toBeFocused();

  // Corrigido o item, o envio grava: o erro movido não prende a tela.
  await item(page, 'Escopo inclui', 1).fill('Escopo corrigido (fictício)');
  await page.getByRole('button', { name: `Gravar ESP-${d.id}-v1` }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'gravada.' })).toHaveText(`ESP-${d.id}-v1 gravada.`);
  const [esp] = (await api<{ itens: Array<{ escopoInclui: string[] }> }>(page, 'GET', `/api/demandas/${d.id}/especificacoes`)).itens;
  expect(esp!.escopoInclui).toEqual(['Escopo corrigido (fictício)']);
});
