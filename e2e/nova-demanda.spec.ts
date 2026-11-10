// T39: T04 Nova demanda (03, T04; RF-03 CA-03.2, RF-05, RF-20, RNF-04). No e2e o agente orquestrador está desligado
// (os agentes nascem desligados, e nenhum teste liga): vale o modo manual. Os modos "ligado" e "suspenso" e o "Preencher
// à mão" são conferidos no HTML (src/app/(painel)/demandas/nova/formularios.test.ts), porque ligar o agente mudaria a
// configuração para os outros testes do mesmo banco.
import { type Page } from '@playwright/test';
import { api, entrarComo, expect, semViolacoes, test } from './apoio';

const RESUMO = 'Corrija os campos abaixo para continuar.';

const resumo = (page: Page) => page.getByRole('alert').filter({ hasText: RESUMO });

async function abrir(page: Page): Promise<void> {
  await entrarComo(page, 'cto');
  await page.goto('/demandas/nova');
  await expect(page.getByRole('heading', { level: 1, name: 'Nova demanda' })).toBeVisible();
}

test('CA-03.2: preencher e salvar cria a demanda; T05 mostra "Demanda DEM-… criada com status Nova." e a fila mostra o id', async ({ page }) => {
  await abrir(page);
  await expect(page).toHaveTitle('Nova demanda — WS Orquestrador de Demandas');
  await expect(page.getByText('Agente orquestrador desligado. Preencha os campos abaixo.')).toBeVisible();
  await page.getByLabel('Texto do pedido (opcional)').fill('Texto fictício do pedido.');
  await page.getByLabel('Nome do solicitante (obrigatório)').fill('Pessoa Ficticia');
  await page.getByLabel('Título (obrigatório)').fill('Pedidos duplicados no ERP');
  await page.getByRole('radio', { name: 'Bug' }).check();
  await page.getByRole('button', { name: 'Salvar demanda' }).click();
  const alerta = page.getByText(/^Demanda DEM-\d{8}-\d{4} criada com status Nova\.$/);
  await expect(alerta).toBeVisible();
  const id = (await alerta.textContent())!.match(/DEM-\d{8}-\d{4}/)![0];
  await expect(page).toHaveURL(new RegExp(`/demandas/${id}\\?aviso=demanda-criada$`));
  await expect(page.getByRole('heading', { level: 1, name: 'Pedidos duplicados no ERP' })).toBeVisible();

  // A API confirma o que foi gravado (e o texto colado nunca volta na vista da demanda).
  const d = await api<Record<string, unknown>>(page, 'GET', `/api/demandas/${id}`);
  expect(d).toMatchObject({ id, titulo: 'Pedidos duplicados no ERP', tipo: 'bug', status: 'nova', solicitanteNome: 'Pessoa Ficticia', anexos: [] });
  expect(JSON.stringify(d)).not.toContain('Texto fictício do pedido.');

  await page.goto('/demandas');
  await expect(page.getByRole('link', { name: id })).toBeVisible();
});

test('erros: nome, título e tipo; resumo com links e foco; o texto digitado continua', async ({ page }) => {
  await abrir(page);
  await page.getByLabel('Texto do pedido (opcional)').fill('Texto fictício que não pode se perder.');
  await page.getByLabel('Contexto').fill('Contexto fictício.');
  await page.getByRole('button', { name: 'Salvar demanda' }).click();

  await expect(resumo(page)).toBeFocused();
  await expect(resumo(page).getByRole('link')).toHaveText([
    'Nome do solicitante: Informe o nome do solicitante.',
    'Título: Informe o título.',
    'Tipo: Escolha o tipo.',
  ]);
  await expect(page.getByLabel('Título (obrigatório)')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Título (obrigatório)')).toHaveAccessibleDescription('Informe o título.');
  await expect(page.getByLabel('Texto do pedido (opcional)')).toHaveValue('Texto fictício que não pode se perder.');
  await expect(page.getByLabel('Contexto')).toHaveValue('Contexto fictício.');
  await semViolacoes(page, 'nova demanda com erro');

  // O link do resumo leva o foco ao campo; no grupo de opções, à primeira opção.
  await resumo(page).getByRole('link', { name: 'Título: Informe o título.' }).click();
  await expect(page.getByLabel('Título (obrigatório)')).toBeFocused();
  await resumo(page).getByRole('link', { name: 'Tipo: Escolha o tipo.' }).click();
  await expect(page.getByRole('radio', { name: 'Bug' })).toBeFocused();

  // Corrigido, salva: nenhuma demanda foi criada no envio com erro.
  await page.getByLabel('Nome do solicitante (obrigatório)').fill('Pessoa Ficticia');
  await page.getByLabel('Título (obrigatório)').fill('Demanda corrigida (fictício)');
  await page.getByRole('radio', { name: 'Melhoria' }).check();
  await page.getByRole('button', { name: 'Salvar demanda' }).click();
  await expect(page.getByText(/^Demanda DEM-\d{8}-\d{4} criada com status Nova\.$/)).toBeVisible();
});

test('texto com 100.001 caracteres: mensagem do limite, e nada é gravado', async ({ page }) => {
  await abrir(page);
  const antes = (await api<{ total: number }>(page, 'GET', '/api/demandas?limit=1')).total;
  await page.getByLabel('Texto do pedido (opcional)').fill('x'.repeat(100_001));
  await expect(page.getByText('100.001 de 100.000 caracteres')).toBeVisible();
  await page.getByLabel('Nome do solicitante (obrigatório)').fill('Pessoa Ficticia');
  await page.getByLabel('Título (obrigatório)').fill('Texto acima do limite (fictício)');
  await page.getByRole('radio', { name: 'Estudo' }).check();
  await page.getByRole('button', { name: 'Salvar demanda' }).click();
  await expect(resumo(page)).toBeFocused();
  await expect(resumo(page).getByRole('link')).toHaveText(['Texto do pedido: O texto tem 100.001 caracteres. O limite é 100.000.']);
  await expect(page.getByLabel('Texto do pedido (opcional)')).toHaveAttribute('aria-invalid', 'true');
  expect((await api<{ total: number }>(page, 'GET', '/api/demandas?limit=1')).total).toBe(antes);
});

test('anexos: adicionar e remover com foco previsível; "Remover anexo 1"; o anexo é gravado', async ({ page }) => {
  await abrir(page);
  const adicionar = page.getByRole('button', { name: 'Adicionar anexo' });
  await adicionar.click();
  const anexo1 = page.getByRole('group', { name: 'Anexo 1' });
  await expect(anexo1.getByLabel('Tipo')).toBeFocused();
  await adicionar.click();
  const anexo2 = page.getByRole('group', { name: 'Anexo 2' });
  await expect(anexo2.getByLabel('Tipo')).toBeFocused();

  // Remover o 2 leva ao anexo anterior; remover o único leva a "Adicionar anexo".
  await anexo2.getByRole('button', { name: 'Remover anexo 2' }).click();
  await expect(page.getByRole('group', { name: 'Anexo 2' })).toHaveCount(0);
  await expect(anexo1.getByLabel('Tipo')).toBeFocused();
  await anexo1.getByRole('button', { name: 'Remover anexo 1' }).click();
  await expect(page.getByRole('group', { name: 'Anexo 1' })).toHaveCount(0);
  await expect(adicionar).toBeFocused();

  // Link sem http(s) é recusado no envio, no campo do anexo.
  await adicionar.click();
  await anexo1.getByLabel('Referência').fill('javascript:alert(1)');
  await page.getByLabel('Nome do solicitante (obrigatório)').fill('Pessoa Ficticia');
  await page.getByLabel('Título (obrigatório)').fill('Demanda com anexo (fictício)');
  await page.getByRole('radio', { name: 'Novo projeto' }).check();
  await page.getByRole('button', { name: 'Salvar demanda' }).click();
  await expect(resumo(page).getByRole('link')).toHaveText(['Referência do anexo 1: Use um link que comece com http:// ou https://.']);
  await resumo(page).getByRole('link').click();
  await expect(anexo1.getByLabel('Referência')).toBeFocused();

  await anexo1.getByLabel('Referência').fill('https://exemplo.test/especificacao-ficticia');
  await anexo1.getByLabel('Descrição').fill('Especificação fictícia');
  await page.getByRole('button', { name: 'Salvar demanda' }).click();
  const alerta = page.getByText(/^Demanda DEM-\d{8}-\d{4} criada com status Nova\.$/);
  await expect(alerta).toBeVisible();
  const id = (await alerta.textContent())!.match(/DEM-\d{8}-\d{4}/)![0];
  const d = await api<{ anexos: unknown[] }>(page, 'GET', `/api/demandas/${id}`);
  expect(d.anexos).toEqual([{ tipo: 'url', referencia: 'https://exemplo.test/especificacao-ficticia', descricao: 'Especificação fictícia' }]);
});

test('sair com conteúdo não salvo pede confirmação; sem conteúdo, não', async ({ page }) => {
  await abrir(page);
  const nav = page.getByRole('navigation', { name: 'Principal' });
  await page.getByLabel('Título (obrigatório)').fill('Rascunho que não foi salvo (fictício)');
  await nav.getByRole('link', { name: 'Demandas' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Sair sem salvar?' });
  await expect(dialogo).toBeVisible();
  await expect(dialogo).toContainText('O que você digitou nesta tela será perdido.');
  await expect(dialogo.getByRole('heading', { name: 'Sair sem salvar?' })).toBeFocused();
  await semViolacoes(page, 'nova demanda com o diálogo de saída');
  await dialogo.getByRole('button', { name: 'Continuar editando' }).click();
  await expect(dialogo).toBeHidden();
  await expect(page).toHaveURL(/\/demandas\/nova$/);
  await expect(page.getByLabel('Título (obrigatório)')).toHaveValue('Rascunho que não foi salvo (fictício)');

  await page.getByRole('link', { name: 'Cancelar' }).click();
  await expect(dialogo).toBeVisible();
  await dialogo.getByRole('button', { name: 'Sair sem salvar' }).click();
  await expect(page).toHaveURL(/\/demandas$/);

  // Sem nada digitado, "Cancelar" volta direto.
  await page.goto('/demandas/nova');
  await page.getByRole('link', { name: 'Cancelar' }).click();
  await expect(page).toHaveURL(/\/demandas$/);
});

test('modo agente: a fila mostra o aviso de texto enviado ao agente', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/demandas?aviso=entrada-enviada');
  await expect(page.getByRole('alert').filter({ hasText: 'Texto enviado ao agente orquestrador.' })).toHaveText(
    'Texto enviado ao agente orquestrador. A demanda aparece na fila quando ele terminar; se ele falhar, você poderá preencher à mão.',
  );
  await semViolacoes(page, 'fila com o aviso de entrada enviada');
});

test('"Preencher à mão" de uma entrada que não existe: 404', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/demandas/nova?entrada=0f1e2d3c-4b5a-4968-8776-655443322110');
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
  await page.goto('/demandas/nova?entrada=nao-e-uuid');
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible();
});

test('axe: vazio, com erro e preenchido; 320 px sem rolagem da página', async ({ page }) => {
  await abrir(page);
  await semViolacoes(page, 'nova demanda vazia');
  await page.getByRole('button', { name: 'Salvar demanda' }).click();
  await expect(resumo(page)).toBeFocused();
  await semViolacoes(page, 'nova demanda com erro');
  await page.getByLabel('Texto do pedido (opcional)').fill('Texto fictício.');
  await page.getByLabel('Nome do solicitante (obrigatório)').fill('Pessoa Ficticia');
  await page.getByLabel('Título (obrigatório)').fill('Demanda preenchida (fictício)');
  await page.getByRole('radio', { name: 'Melhoria' }).check();
  await page.getByRole('radio', { name: 'Alta' }).check();
  await page.getByRole('button', { name: 'Adicionar anexo' }).click();
  await semViolacoes(page, 'nova demanda preenchida');
  await page.setViewportSize({ width: 320, height: 640 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await semViolacoes(page, 'nova demanda em 320 px');
});
