// T39: T06 Editar dados da demanda (03, T06; RF-06). A demanda é criada pela API com a sessão da conta fictícia; a tela
// abre com os valores atuais, salva só o que mudou e volta ao detalhe (T05) com o alerta da 03.
import { expect, test, type Page } from '@playwright/test';
import { api, entrarComo, semViolacoes } from './apoio';

type Demanda = { id: string; titulo: string; contexto: string | null; urgencia: string | null; atualizadaEm: string };
type Historico = { itens: { acao: string; antes: Record<string, unknown> | null; depois: Record<string, unknown> | null }[] };

async function criar(page: Page, extra: Record<string, unknown> = {}): Promise<Demanda> {
  return api<Demanda>(page, 'POST', '/api/demandas', {
    titulo: 'Demanda para editar (fictício)',
    tipo: 'melhoria',
    solicitanteNome: 'Pessoa Ficticia',
    urgencia: 'media',
    contexto: 'Contexto fictício antigo',
    ...extra,
  });
}

async function abrir(page: Page, id: string): Promise<void> {
  await page.goto(`/demandas/${id}/editar`);
  await expect(page.getByRole('heading', { level: 1, name: 'Editar dados da demanda' })).toBeVisible();
}

test('salvar alterações volta à T05 com "Alterações salvas. O histórico registra o antes e o depois."', async ({ page }) => {
  await entrarComo(page, 'cto');
  const d = await criar(page);
  await abrir(page, d.id);
  await expect(page).toHaveTitle('Editar dados da demanda — WS Orquestrador de Demandas');
  await expect(page.locator('main')).toContainText(d.id);
  await expect(page.getByText('As alterações ficam no histórico, com o valor de antes e o de depois. Os pacotes de decisão já criados guardam uma cópia dos dados e não mudam.')).toBeVisible();
  await expect(page.getByLabel('Título (obrigatório)')).toHaveValue('Demanda para editar (fictício)');
  await expect(page.getByRole('radio', { name: 'Melhoria' })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'Média' })).toBeChecked();
  await expect(page.getByLabel('Contexto')).toHaveValue('Contexto fictício antigo');
  await expect(page.getByLabel('Texto do pedido')).toHaveCount(0);

  await page.getByLabel('Título (obrigatório)').fill('Demanda editada (fictício)');
  await page.getByLabel('Contexto').fill('');
  await page.getByRole('radio', { name: 'Alta' }).check();
  await page.getByRole('button', { name: 'Salvar alterações' }).click();

  await expect(page).toHaveURL(new RegExp(`/demandas/${d.id}\\?aviso=alteracoes-salvas$`));
  await expect(page.getByRole('alert').filter({ hasText: 'Alterações salvas.' })).toHaveText('Alterações salvas. O histórico registra o antes e o depois.');
  await expect(page.getByRole('heading', { level: 1, name: 'Demanda editada (fictício)' })).toBeVisible();

  const depois = await api<Demanda>(page, 'GET', `/api/demandas/${d.id}`);
  expect(depois).toMatchObject({ titulo: 'Demanda editada (fictício)', contexto: null, urgencia: 'alta' });
  const h = await api<Historico>(page, 'GET', `/api/demandas/${d.id}/historico`);
  const campos = h.itens.filter((e) => e.acao === 'campo_alterado').map((e) => Object.keys(e.depois ?? e.antes ?? {})[0]);
  expect(new Set(campos)).toEqual(new Set(['titulo', 'urgencia', 'contexto']));
});

test('sem mudança: "Nada foi alterado."', async ({ page }) => {
  await entrarComo(page, 'cto');
  const d = await criar(page);
  await abrir(page, d.id);
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  const alerta = page.getByRole('alert').filter({ hasText: 'Nada foi alterado.' });
  await expect(alerta).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/demandas/${d.id}/editar$`));
  const depois = await api<Demanda>(page, 'GET', `/api/demandas/${d.id}`);
  expect(depois.atualizadaEm).toBe(d.atualizadaEm);
  await semViolacoes(page, 'edição sem mudança');
});

test('erro de validação: título vazio vai ao resumo e o resto continua', async ({ page }) => {
  await entrarComo(page, 'cto');
  const d = await criar(page);
  await abrir(page, d.id);
  await page.getByLabel('Título (obrigatório)').fill('');
  await page.getByLabel('Impacto percebido').fill('Impacto fictício');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  const resumo = page.getByRole('alert').filter({ hasText: 'Corrija os campos abaixo para continuar.' });
  await expect(resumo).toBeFocused();
  await expect(resumo.getByRole('link')).toHaveText(['Título: Informe o título.']);
  await expect(page.getByLabel('Impacto percebido')).toHaveValue('Impacto fictício');
  await semViolacoes(page, 'edição com erro');
});

test('"Cancelar" com alteração pede confirmação; id que não existe: 404', async ({ page }) => {
  await entrarComo(page, 'cto');
  const d = await criar(page);
  await abrir(page, d.id);
  await page.getByLabel('Justificativa da urgência').fill('Justificativa fictícia');
  await page.getByRole('link', { name: 'Cancelar' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Sair sem salvar?' });
  await expect(dialogo).toBeVisible();
  await dialogo.getByRole('button', { name: 'Sair sem salvar' }).click();
  await expect(page).toHaveURL(new RegExp(`/demandas/${d.id}$`));
  expect((await api<{ justificativaUrgencia: string | null }>(page, 'GET', `/api/demandas/${d.id}`)).justificativaUrgencia).toBeNull();

  for (const caminho of ['/demandas/DEM-20261022-9999/editar', '/demandas/qualquer-coisa/editar']) {
    await page.goto(caminho);
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
    await expect(page).toHaveTitle('Página não encontrada — WS Orquestrador de Demandas');
  }
});

test('sem sessão, a edição e o detalhe levam a /entrar, exista ou não o id (o 404 não revela o id)', async ({ page }) => {
  for (const caminho of ['/demandas/DEM-20261022-9999/editar', '/demandas/DEM-20261022-9999']) {
    await page.goto(caminho);
    await expect(page).toHaveURL(/\/entrar\?/);
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toHaveCount(0);
  }
});

test('axe: com dados e com anexos', async ({ page }) => {
  await entrarComo(page, 'cto');
  const d = await criar(page, { anexos: [{ tipo: 'url', referencia: 'https://exemplo.test/a', descricao: 'Anexo fictício' }], solicitantePapel: 'produto' });
  await abrir(page, d.id);
  await expect(page.getByRole('group', { name: 'Anexo 1' }).getByLabel('Referência')).toHaveValue('https://exemplo.test/a');
  await expect(page.getByLabel('Papel do solicitante')).toHaveValue('produto');
  await semViolacoes(page, 'edição com dados');
});
