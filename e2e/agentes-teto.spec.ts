// T45: T12 Agentes e teto de gasto (03, T12; RF-17 a RF-19; 04, C-12, C-26 e C-31; RNF-05; P1-f). Estado inicial, salvar
// o teto (e os dois erros), ligar com o diálogo da 03 e desligar sem confirmação, a falha ao ligar (o interruptor volta e
// o agente continua desligado), a conta administradora com os controles desabilitados e os valores legíveis, e o último
// expurgo. O axe roda no estado inicial, com erro de teto, com o diálogo aberto, com agente ligado, na falha ao ligar e
// na conta administradora.
//
// C-36 (06-T43-tech-lead e 06-T44-tech-lead, "C-36"): esta spec não cria demanda nem versão, em nenhuma conta.
//   - conta "cto": 0 demandas e 0 versões;
//   - conta "administradora": 0 demandas e 0 versões.
// Teto e interruptor são configuração e não contam no limite (src/modules/limites.ts).
//
// Esta é a primeira spec na ordem alfabética, e o teto e os interruptores valem para o sistema inteiro: um agente ligado
// mudaria a Nova demanda das specs seguintes. Por isso cada teste que altera devolve, num `finally`, o teto a 0 e os
// quatro agentes a desligados, pela API. Desligar o que já está desligado não grava nada, e os agentes que nenhum teste
// liga continuam "Nunca alterado". Só o agente de risco recebe o modelo fictício do seed (pela API, como o painel não
// escolhe modelo), para poder ligar; o de consolidação fica sem modelo, para a falha ao ligar.
import { type Page } from '@playwright/test';
import { MODELO_FICTICIO } from '../scripts/seed-ficticio';
import { AGENTES, type Agente } from '../src/modules/acesso/ator';
import { api, entrarComo, expect, semViolacoes, test } from './apoio';

type ConfiguracaoAgente = { agente: Agente; ligado: boolean; atualizadoEm: string | null; atualizadoPor: { nome: string } | null };

const ROTULOS: Readonly<Record<Agente, string>> = {
  orquestrador: 'Agente orquestrador (entrada)',
  insumo_tecnico: 'Agente de insumo técnico (ESP)',
  risco: 'Agente de risco (RSK)',
  consolidacao: 'Agente de consolidação (DEC)',
};

const TETO_NAO_DEFINIDO = 'Teto não definido: com US$ 0,00, nenhum agente chama o provedor, mesmo ligado. Defina o teto para usar os agentes.';
const DATA_HORA = /\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}/;

const agentesDaApi = async (page: Page) => (await api<{ agentes: ConfiguracaoAgente[] }>(page, 'GET', '/api/agentes')).agentes;
const linhaDo = (page: Page, agente: Agente) => page.getByRole('row').filter({ has: page.getByRole('switch', { name: ROTULOS[agente], exact: true }) });
const aviso = (page: Page) => page.getByRole('main').getByRole('status');

// O sistema como o seed o deixou: teto 0 e os quatro desligados. O modelo do risco fica, e não liga nada sozinho.
async function restaurar(page: Page): Promise<void> {
  await api(page, 'PUT', '/api/configuracao/teto', { tetoMensal: '0' });
  for (const agente of AGENTES) await api(page, 'PATCH', `/api/agentes/${agente}`, { ligado: false });
}

test('estado inicial: quatro desligados, "Nunca alterado", alerta de teto não definido', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/configuracao/agentes');
  await expect(page).toHaveTitle('Agentes e teto de gasto — WS Orquestrador de Demandas');
  await expect(page.getByRole('heading', { level: 1, name: 'Agentes e teto de gasto' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Agentes e teto' })).toHaveAttribute('aria-current', 'page');
  for (const agente of AGENTES) {
    await expect(page.getByRole('switch', { name: ROTULOS[agente], exact: true })).toHaveAttribute('aria-checked', 'false');
    await expect(linhaDo(page, agente)).toContainText('Desligado');
  }
  await expect(page.getByText(TETO_NAO_DEFINIDO)).toBeVisible();
  await expect(page.getByText(/^\p{Lu}\p{Ll}+ de \d{4}: US\$ 0,00 de US\$ 0,00\. Nenhuma chamada este mês\.$/u)).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Teto mensal de gasto (US$)' })).toHaveValue('0,00');
  await expect(page.getByRole('table', { name: 'Agentes de IA' })).toBeVisible();

  // "Última mudança" é a da API: "Nunca alterado" quem nunca mudou, "<nome>, <data>" quem mudou. Orquestrador, insumo
  // técnico e consolidação nenhuma spec altera: no banco do seed, são sempre "Nunca alterado".
  for (const c of await agentesDaApi(page)) {
    if (c.atualizadoEm === null) await expect(linhaDo(page, c.agente)).toContainText('Nunca alterado');
    else await expect(linhaDo(page, c.agente)).toContainText(`${c.atualizadoPor?.nome ?? ''}, `);
    if (c.agente !== 'risco') await expect(linhaDo(page, c.agente)).toContainText('Nunca alterado');
  }
  await semViolacoes(page, 'T12 inicial');
});

test('salvar teto 10,00 → "Teto salvo: US$ 10,00."; "-1" → "O teto não pode ser negativo."', async ({ page }) => {
  await entrarComo(page, 'cto');
  try {
    await page.goto('/configuracao/agentes');
    const campo = page.getByRole('textbox', { name: 'Teto mensal de gasto (US$)' });
    const salvar = page.getByRole('button', { name: 'Salvar teto' });

    await campo.fill('-1');
    await salvar.click();
    const resumo = page.getByRole('alert').filter({ hasText: 'Corrija os campos abaixo para continuar.' });
    await expect(resumo).toBeFocused();
    await expect(resumo.getByRole('link', { name: 'Teto mensal de gasto (US$): O teto não pode ser negativo.' })).toBeVisible();
    await expect(campo).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#campo-tetoMensal-erro')).toHaveText('O teto não pode ser negativo.');
    // O que foi digitado continua no campo (03, 2.5).
    await expect(campo).toHaveValue('-1');
    await semViolacoes(page, 'T12 com erro de teto');

    await campo.fill('10,123');
    await salvar.click();
    await expect(page.locator('#campo-tetoMensal-erro')).toHaveText('Informe o teto com até duas casas decimais, por exemplo 10,00.');

    await campo.fill('10,00');
    await salvar.click();
    await expect(aviso(page)).toHaveText('Teto salvo: US$ 10,00.');
    await expect(campo).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText(/^\p{Lu}\p{Ll}+ de \d{4}: US\$ 0,00 de US\$ 10,00\. Nenhuma chamada este mês\.$/u)).toBeVisible();
    await expect(page.getByText(TETO_NAO_DEFINIDO)).toBeHidden();
    // Recarregada, a página mostra o valor gravado.
    await page.reload();
    await expect(page.getByRole('textbox', { name: 'Teto mensal de gasto (US$)' })).toHaveValue('10,00');
    expect((await api<{ tetoMensal: number }>(page, 'GET', '/api/configuracao/teto')).tetoMensal).toBe(10);
  } finally {
    await restaurar(page);
  }
});

test('ligar o risco: diálogo de 03, "Agente de risco ligado."; desligar sem confirmação; histórico com quem mudou', async ({ page }) => {
  await entrarComo(page, 'cto');
  try {
    // O modelo é escolhido pela API (o painel não escolhe): sem ele, ligar dá 409.
    await api(page, 'PATCH', '/api/agentes/risco', { ligado: false, modelo: MODELO_FICTICIO });
    await page.goto('/configuracao/agentes');
    const interruptor = page.getByRole('switch', { name: 'Agente de risco (RSK)', exact: true });

    // Cancelar: o diálogo fecha, nada muda e o foco volta ao interruptor.
    await interruptor.click();
    const dialogo = page.getByRole('dialog', { name: 'Ligar o agente de risco?' });
    await expect(dialogo).toBeVisible();
    await expect(dialogo).toContainText(
      'Ele passa a chamar o provedor de IA a cada especificação técnica sem dúvida gravada, dentro do teto mensal. O resultado é sempre um rascunho que uma pessoa revisa.',
    );
    await expect(dialogo.getByRole('button', { name: 'Ligar agente' })).toBeVisible();
    await semViolacoes(page, 'T12 com o diálogo de ligar aberto');
    await dialogo.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialogo).toBeHidden();
    await expect(interruptor).toHaveAttribute('aria-checked', 'false');
    await expect(interruptor).toBeFocused();

    // Ligar agente.
    const antes = Date.now();
    await interruptor.click();
    await dialogo.getByRole('button', { name: 'Ligar agente' }).click();
    await expect(aviso(page)).toHaveText('Agente de risco ligado.');
    await expect(interruptor).toHaveAttribute('aria-checked', 'true');
    await expect(linhaDo(page, 'risco')).toContainText('Ligado');
    await expect(interruptor).toBeFocused();

    // Quem mudou e quando: o que a API guardou é o que a linha mostra.
    const risco = (await agentesDaApi(page)).find((c) => c.agente === 'risco')!;
    expect(risco).toMatchObject({ ligado: true, atualizadoPor: { nome: 'Pessoa Ficticia CTO' } });
    expect(new Date(risco.atualizadoEm!).getTime()).toBeGreaterThanOrEqual(antes - 5_000);
    await expect(linhaDo(page, 'risco')).toContainText('Pessoa Ficticia CTO, ');
    await expect(linhaDo(page, 'risco').locator(`time[datetime="${new Date(risco.atualizadoEm!).toISOString()}"]`)).toHaveText(DATA_HORA);
    await semViolacoes(page, 'T12 com agente ligado');

    // Desligar: sem diálogo.
    await interruptor.click();
    await expect(aviso(page)).toHaveText('Agente de risco desligado.');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(interruptor).toHaveAttribute('aria-checked', 'false');
    expect((await agentesDaApi(page)).find((c) => c.agente === 'risco')!.ligado).toBe(false);
  } finally {
    await restaurar(page);
  }
});

test('falha ao ligar: "Não foi possível ligar o agente de consolidação. Ele continua desligado." e o interruptor volta', async ({ page }) => {
  await entrarComo(page, 'cto');
  try {
    await page.goto('/configuracao/agentes');
    const interruptor = page.getByRole('switch', { name: 'Agente de consolidação (DEC)', exact: true });
    await interruptor.click();
    await page.getByRole('dialog', { name: 'Ligar o agente de consolidação?' }).getByRole('button', { name: 'Ligar agente' }).click();
    const alerta = page.getByRole('alert').filter({ hasText: 'Não foi possível ligar o agente de consolidação. Ele continua desligado.' });
    await expect(alerta).toBeVisible();
    await expect(page.locator(':focus')).toContainText('Não foi possível ligar o agente de consolidação. Ele continua desligado.');
    await expect(interruptor).toHaveAttribute('aria-checked', 'false');
    await expect(interruptor).toBeEnabled();
    await expect(linhaDo(page, 'consolidacao')).toContainText('Desligado');
    // Nada foi gravado: continua "Nunca alterado".
    await expect(linhaDo(page, 'consolidacao')).toContainText('Nunca alterado');
    expect((await agentesDaApi(page)).find((c) => c.agente === 'consolidacao')).toMatchObject({ ligado: false, atualizadoEm: null });
    await semViolacoes(page, 'T12 com falha ao ligar');
  } finally {
    await restaurar(page);
  }
});

test('administradora: controles desabilitados com "Só o CTO altera esta configuração." e valores legíveis', async ({ page }) => {
  await entrarComo(page, 'administradora');
  await page.goto('/configuracao/agentes');
  await expect(page.getByText('Só o CTO altera esta configuração.')).toBeVisible();
  const campo = page.getByRole('textbox', { name: 'Teto mensal de gasto (US$)' });
  await expect(campo).toBeDisabled();
  await expect(campo).toHaveValue('0,00');
  await expect(page.getByRole('button', { name: 'Salvar teto' })).toBeDisabled();
  for (const agente of AGENTES) {
    const interruptor = page.getByRole('switch', { name: ROTULOS[agente], exact: true });
    await expect(interruptor).toBeDisabled();
    await expect(interruptor).toHaveAttribute('aria-checked', 'false');
    await expect(linhaDo(page, agente)).toContainText('Desligado');
  }
  await expect(page.getByText(TETO_NAO_DEFINIDO)).toBeVisible();
  // A regra é a do servidor (C-12): a API recusa a administradora.
  const r = await page.request.put('/api/configuracao/teto', {
    headers: { origin: new URL(test.info().project.use.baseURL!).origin, 'content-type': 'application/json' },
    data: JSON.stringify({ tetoMensal: '10' }),
  });
  expect(r.status()).toBe(403);
  await semViolacoes(page, 'T12 na conta administradora');
});

test('mostra a data do último expurgo ou "O expurgo ainda não rodou."', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto('/configuracao/agentes');
  // Sem worker (e2e local), o expurgo não rodou; na homologação, o worker pode já ter rodado.
  await expect(page.getByText(/^(Último expurgo do texto recebido: \d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}\.|O expurgo ainda não rodou\.)$/)).toBeVisible();
});

// qa-automacao (06-T45-testes): o estado global que esta spec deixa para as seguintes. Só lê, pela API e pela tela; não
// cria demanda nem versão (C-36). Passa sozinho também (é o estado do seed), e acusa o `finally` que deixar de restaurar.
test('depois desta spec: teto 0 e os quatro agentes desligados, como o seed os deixou', async ({ page }) => {
  await entrarComo(page, 'cto');
  expect((await api<{ tetoMensal: number }>(page, 'GET', '/api/configuracao/teto')).tetoMensal).toBe(0);
  for (const c of await agentesDaApi(page)) expect(c.ligado, c.agente).toBe(false);
  // Os três que nenhum teste liga com sucesso continuam sem mudança gravada.
  for (const c of (await agentesDaApi(page)).filter((c) => c.agente !== 'risco')) expect(c.atualizadoEm, c.agente).toBeNull();
  await page.goto('/demandas/nova');
  await expect(page.getByText('Agente orquestrador desligado. Preencha os campos abaixo.')).toBeVisible();
});
