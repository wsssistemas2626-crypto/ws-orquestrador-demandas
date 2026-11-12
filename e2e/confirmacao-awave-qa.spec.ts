// 06-T18-testes (qa-automacao), DEC-DEM-20261111-0016-v1: o que o e2e da T18 (confirmacao-awave.spec.ts) não cobre na
// seção "Confirmação do Awave" da T05 (RF-06, CA-06.7; RF-10, CA-10.7; 03, 5.4 estado de erro e seção 10).
//   - A descrição acessível do botão é o texto da consequência (o aria-describedby resolve no navegador, não só no HTML).
//   - O estado de erro: alerta com o prefixo "Não foi possível concluir: ", foco no alerta, botão de volta, selo e
//     Próxima ação intactos, nenhum anúncio de sucesso, e axe nas duas larguras com o alerta na tela.
// Conta "cto"; não cria demanda nem versão e não grava nada. O erro é provocado como no controle do IN-07
// (seguranca.spec.ts): a chamada da Server Action vai com o id trocado pelo de uma demanda de pessoa, e a ação responde
// com o 409 da regra. Se o corpo não tiver o id da `awaveAguardando`, a chamada é abortada, para nunca confirmá-la.
import { type Request } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { api, demandaDoSeed, entrarComo, expect, semViolacoesNasDuasLarguras, test } from './apoio';

const SECAO = 'Confirmação do Awave';
const SELO = 'Aguardando confirmação';
const P2 =
  'Ao confirmar, a demanda segue o fluxo de qualquer outra: se o agente de insumo técnico estiver ligado, ele recebe o título, a descrição e o contexto e começa a especificação técnica.';
const ehServerAction = (r: Request) => r.method() === 'POST' && r.headers()['next-action'] !== undefined;

test('aguardando: a descrição acessível de "Confirmar demanda" é a consequência, no computador e no celular', async ({ page }) => {
  await entrarComo(page, 'cto');
  await page.goto(`/demandas/${await demandaDoSeed(page, TITULOS_DO_E2E.awaveAguardando)}`);
  const botao = page.getByRole('button', { name: 'Confirmar demanda' });
  await expect(botao).toHaveAccessibleDescription(P2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(botao).toHaveAccessibleDescription(P2);
});

test('erro de conflito: alerta com o prefixo e foco, botão de volta, selo e linha 14 intactos, axe nas duas larguras; nada gravado', async ({ page }) => {
  await entrarComo(page, 'cto');
  const id = await demandaDoSeed(page, TITULOS_DO_E2E.awaveAguardando);
  const dePessoa = await demandaDoSeed(page, TITULOS_DO_E2E.etapasSemVersoes);
  const confirmacoes = async (demanda: string) =>
    (await api<{ itens: { acao: string }[] }>(page, 'GET', `/api/demandas/${demanda}/historico`)).itens.filter((e) => e.acao === 'demanda_confirmada').length;
  expect(await confirmacoes(id)).toBe(0);
  await page.goto(`/demandas/${id}`);

  let chamadas = 0;
  await page.route('**/*', async (rota) => {
    const r = rota.request();
    if (!ehServerAction(r)) return rota.continue();
    chamadas++;
    const corpo = r.postData() ?? '';
    if (!corpo.includes(id)) return rota.abort();
    const resposta = await rota.fetch({ headers: await r.allHeaders(), postData: corpo.replaceAll(id, dePessoa) });
    return rota.fulfill({ response: resposta });
  });

  const regiao = page.getByRole('region', { name: SECAO });
  const botao = regiao.getByRole('button', { name: 'Confirmar demanda' });
  // O clique antes da hidratação não envia nada: repete só enquanto nenhuma chamada saiu (o botão fica desabilitado
  // durante o envio, então não há segundo envio).
  await expect(async () => {
    if (chamadas === 0) await botao.click();
    await expect.poll(() => chamadas, { timeout: 2_000 }).toBeGreaterThan(0);
  }).toPass({ timeout: 15_000 });

  const alerta = regiao.getByRole('alert');
  await expect(alerta).toHaveText('Não foi possível concluir: Só demanda aberta pelo Awave precisa de confirmação.');
  await expect(alerta.locator('xpath=..')).toBeFocused();
  await expect(botao).toBeEnabled();
  await expect(regiao.locator('[aria-busy="true"]')).toHaveCount(0);
  await expect(regiao.locator('[aria-busy="false"]')).toHaveCount(1);
  await expect(page.getByRole('status').filter({ hasText: 'Demanda confirmada.' })).toHaveCount(0);
  await expect(page.getByText(SELO, { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Próxima ação' })).toContainText('Confirmar a demanda aberta pelo Awave.');
  expect(chamadas).toBe(1);

  await page.unroute('**/*');
  await semViolacoesNasDuasLarguras(page, 'T05 Awave com erro na confirmação');
  expect(await confirmacoes(id)).toBe(0);
  expect(await confirmacoes(dePessoa)).toBe(0);
});
