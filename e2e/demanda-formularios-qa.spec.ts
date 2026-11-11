// T39 (06-T39-testes, qa-automacao): o que os e2e do engenheiro (nova-demanda.spec.ts e editar-demanda.spec.ts) não
// conferem no navegador:
//   - o status HTTP 404 (achado 3 da 06-T39-revisao): o esqueleto da 03 ficou de fora da T06 justamente para não perder
//     o 404, e nenhum teste segurava essa escolha;
//   - duplo clique em "Salvar demanda": um envio só, uma demanda só; a resposta da Server Action não traz o texto colado
//     nem o nome do solicitante;
//   - o alerta de chegada só com os valores fixos de `?aviso=`, na fila e no detalhe;
//   - T06 com anexos: remover, acrescentar e limpar a urgência, gravados como a tela mostrou;
//   - o aviso do navegador ao fechar a aba com conteúdo não salvo (beforeunload).
// Os dados de cada teste são criados aqui, pela conta "administradora": o limite de 30 demandas por hora (C-36) conta por
// ator, e os outros e2e criam com a conta "cto". Nenhum teste depende de outro ter rodado antes.
import { type Page, type Request } from '@playwright/test';
import { api, entrarComo, expect, semViolacoes, test } from './apoio';

const UUID = '0f1e2d3c-4b5a-4968-8776-655443322110';
const SENTINELA_TEXTO = 'SENTINELA-TEXTO-E2E-7f3a';
const SENTINELA_NOME = 'Pessoa Ficticia Sentinela E2E';
const TITULO_404 = 'Página não encontrada — WS Orquestrador de Demandas';
const ALERTA_CRIADA = /^Demanda DEM-\d{8}-\d{4} criada com status Nova\.$/;

type Demanda = { id: string };
type Historico = { itens: { acao: string; antes: Record<string, unknown> | null; depois: Record<string, unknown> | null }[] };

const total = async (page: Page): Promise<number> => (await api<{ total: number }>(page, 'GET', '/api/demandas?limit=1')).total;
const ehServerAction = (r: Request) => r.method() === 'POST' && r.headers()['next-action'] !== undefined;

test('404 com status HTTP 404, e não 200, em toda tela de demanda que não existe', async ({ page }) => {
  await entrarComo(page, 'administradora');
  for (const caminho of ['/demandas/DEM-20261022-9999', '/demandas/DEM-20261022-9999/editar', '/demandas/qualquer-coisa', '/demandas/qualquer-coisa/editar']) {
    const r = await page.goto(caminho);
    expect(r?.status(), caminho).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible();
    await expect(page).toHaveTitle(TITULO_404);
  }
  // "Preencher à mão": entrada que não existe, fora do formato, vazia ou repetida. O título da aba fica "Nova demanda — …"
  // (achado 4 da 06-T39-revisao, Minor): aqui só o status e a tela.
  for (const caminho of [`/demandas/nova?entrada=${UUID}`, '/demandas/nova?entrada=nao-e-uuid', '/demandas/nova?entrada=', `/demandas/nova?entrada=${UUID}&entrada=${UUID}`]) {
    const r = await page.goto(caminho);
    expect(r?.status(), caminho).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible();
    await expect(page.getByLabel(/^Texto do pedido/)).toHaveCount(0);
  }
  await semViolacoes(page, '404 dentro do painel');
});

test('duplo clique em "Salvar demanda": um envio só e uma demanda só; a resposta não traz o texto colado nem o nome', async ({ page }) => {
  await entrarComo(page, 'administradora');
  await page.goto('/demandas/nova');
  await expect(page.getByRole('heading', { level: 1, name: 'Nova demanda' })).toBeVisible();
  const antes = await total(page);
  const envios: Request[] = [];
  page.on('request', (r) => {
    if (ehServerAction(r)) envios.push(r);
  });
  // O corpo da Server Action é lido pela rota do teste, que busca a resposta, guarda o texto e a entrega igual ao
  // navegador: no build de produção (`next start`, 08-correcao), a página navega logo depois, e o navegador descarta o
  // corpo de quem já saiu da página.
  const corpos: string[] = [];
  await page.route('**/*', async (rota) => {
    if (!ehServerAction(rota.request())) return rota.continue();
    const resposta = await rota.fetch();
    corpos.push(await resposta.text());
    await rota.fulfill({ response: resposta });
  });

  await page.getByLabel('Texto do pedido (opcional)').fill(`Texto fictício. ${SENTINELA_TEXTO}`);
  await page.getByLabel('Nome do solicitante (obrigatório)').fill(SENTINELA_NOME);
  await page.getByLabel('Título (obrigatório)').fill('Duplo clique (fictício)');
  await page.getByRole('radio', { name: 'Estudo' }).check();
  await page.getByRole('button', { name: 'Salvar demanda' }).dblclick();

  await expect(page.getByText(ALERTA_CRIADA)).toBeVisible();
  // O segundo envio, se houvesse, sairia no segundo clique, antes da resposta do primeiro.
  expect(envios).toHaveLength(1);
  expect(corpos).toHaveLength(1);
  const corpo = corpos[0]!;
  expect(corpo).not.toContain(SENTINELA_TEXTO);
  expect(corpo).not.toContain(SENTINELA_NOME);
  expect(await total(page)).toBe(antes + 1);
});

test('alerta de chegada só com os valores fixos de ?aviso=: outro valor não mostra nada, na fila e no detalhe', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await api<Demanda>(page, 'POST', '/api/demandas', { titulo: 'Demanda do aviso (fictício)', tipo: 'estudo', solicitanteNome: 'Pessoa Ficticia' });
  const alertas = () => page.locator('main').getByRole('alert');

  for (const aviso of ['entrada-enviada-x', 'demanda-criada', 'ENTRADA-ENVIADA', '%3Cscript%3Ealert(1)%3C%2Fscript%3E']) {
    await page.goto(`/demandas?aviso=${aviso}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Demandas' })).toBeVisible();
    await expect(alertas()).toHaveCount(0);
  }
  for (const aviso of ['entrada-enviada', 'alteracoes-salvas-x', 'demanda-criada&aviso=demanda-criada', '%3Cscript%3Ealert(1)%3C%2Fscript%3E']) {
    await page.goto(`/demandas/${d.id}?aviso=${aviso}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Demanda do aviso (fictício)' })).toBeVisible();
    await expect(alertas()).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText('script');
  }
  await page.goto(`/demandas/${d.id}?aviso=demanda-criada`);
  await expect(alertas()).toHaveText(`Demanda ${d.id} criada com status Nova.`);
  await semViolacoes(page, 'detalhe provisório com o alerta de chegada');
});

test('T06 com anexos: remover o 1º, acrescentar um link e limpar a urgência; a API grava a lista inteira e o null, e o histórico tem os dois campos', async ({ page }) => {
  await entrarComo(page, 'administradora');
  const d = await api<Demanda>(page, 'POST', '/api/demandas', {
    titulo: 'Demanda com anexos para editar (fictício)',
    tipo: 'melhoria',
    solicitanteNome: 'Pessoa Ficticia',
    urgencia: 'alta',
    anexos: [
      { tipo: 'url', referencia: 'https://exemplo.test/a', descricao: 'A' },
      { tipo: 'arquivo', referencia: 'b-ficticio.pdf' },
    ],
  });
  await page.goto(`/demandas/${d.id}/editar`);
  await expect(page.getByRole('heading', { level: 1, name: 'Editar dados da demanda' })).toBeVisible();

  const adicionar = page.getByRole('button', { name: 'Adicionar anexo' });
  await page.getByRole('group', { name: 'Anexo 1' }).getByRole('button', { name: 'Remover anexo 1' }).click();
  await expect(adicionar).toBeFocused();
  // O antigo anexo 2 vira o 1, com os valores dele.
  await expect(page.getByRole('group', { name: 'Anexo 1' }).getByLabel('Referência')).toHaveValue('b-ficticio.pdf');
  await expect(page.getByRole('group', { name: 'Anexo 1' }).getByLabel('Tipo')).toHaveValue('arquivo');
  await expect(page.getByRole('group', { name: 'Anexo 2' })).toHaveCount(0);

  await adicionar.click();
  const novo = page.getByRole('group', { name: 'Anexo 2' });
  await expect(novo.getByLabel('Tipo')).toBeFocused();
  await novo.getByLabel('Referência').fill('https://exemplo.test/c');
  await novo.getByLabel('Descrição').fill('C (fictício)');
  await page.getByRole('radio', { name: 'Não informada' }).check();
  await page.getByRole('button', { name: 'Salvar alterações' }).click();

  await expect(page).toHaveURL(new RegExp(`/demandas/${d.id}\\?aviso=alteracoes-salvas$`));
  const depois = await api<Record<string, unknown>>(page, 'GET', `/api/demandas/${d.id}`);
  expect(depois).toMatchObject({
    urgencia: null,
    anexos: [
      { tipo: 'arquivo', referencia: 'b-ficticio.pdf' },
      { tipo: 'url', referencia: 'https://exemplo.test/c', descricao: 'C (fictício)' },
    ],
  });
  const h = await api<Historico>(page, 'GET', `/api/demandas/${d.id}/historico`);
  const campos = h.itens.filter((e) => e.acao === 'campo_alterado').map((e) => Object.keys(e.depois ?? e.antes ?? {})[0]);
  expect(new Set(campos)).toEqual(new Set(['anexos', 'urgencia']));
});

test('fechar a aba com conteúdo não salvo pede o aviso do navegador (beforeunload); sem nada digitado, fecha direto', async ({ page }) => {
  await entrarComo(page, 'administradora');
  await page.goto('/demandas/nova');
  await page.getByLabel('Título (obrigatório)').click();
  await page.keyboard.type('Rascunho que não foi salvo (fictício)');
  const aviso = page.waitForEvent('dialog');
  await page.close({ runBeforeUnload: true });
  const d = await aviso;
  expect(d.type()).toBe('beforeunload');
  await d.accept();
  await expect.poll(() => page.isClosed()).toBe(true);

  // Sem nada digitado: nenhum aviso, a aba fecha.
  const limpa = await page.context().newPage();
  await limpa.goto('/demandas/nova');
  await expect(limpa.getByRole('heading', { level: 1, name: 'Nova demanda' })).toBeVisible();
  await limpa.getByLabel('Título (obrigatório)').click();
  const dialogos: string[] = [];
  limpa.on('dialog', (x) => {
    dialogos.push(x.type());
    void x.dismiss();
  });
  const fechou = limpa.waitForEvent('close');
  await limpa.close({ runBeforeUnload: true });
  await fechou;
  expect(dialogos).toEqual([]);
});
