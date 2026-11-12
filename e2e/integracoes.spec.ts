// T20 do DEC-DEM-20261111-0016-v1: as integrações pelo build de produção (e2e/servidor.ts: `next build` e `next start`,
// com o proxy.ts e a CSP de verdade). Bearer sem `Origin` passa (CA-09.1, CA-09.3, IN-15), e o /construir faz o caminho
// inteiro: pendentes, entrega sem corpo e recebimento pelo SHA-256 (CP-7).
//
// Tokens só do e2e local (D-10, e2e/integracoes.ts), num banco descartável; contra a homologação os dois testes pulam com o
// motivo escrito. No e2e local, sem os tokens, o teste falha: um pulo ali esconderia a falta do arquivo.
//
// C-36 e D2 (G3.9 do plano): nenhuma demanda de pessoa nem versão criada pela API.
//   - token `awave`: 1 demanda. O seed já gastou 3 das 10 da hora (T15), e o Awave fica com 4;
//   - conta "cto": só leitura (acha a demanda do seed e o DEC dela).
//
// B-1 da 0019 (IN-04): o trace fica desligado neste arquivo, como no irmão e2e/integracoes-qa.spec.ts. O
// `retain-on-failure` do playwright.config.ts gravaria o cabeçalho `authorization` dos contextos de API num teste que
// falha. O test/estatico/trace-e2e.test.ts exige isso de toda spec com credencial no cabeçalho.
import { createHash } from 'node:crypto';
import { request as novoContexto } from '@playwright/test';
import { TITULOS_DO_E2E } from '../scripts/seed-ficticio';
import { api, demandaDoSeed, entrarComo, expect, test } from './apoio';
import { HOMOLOGACAO, MOTIVO_SEM_TOKENS, tokensDoE2e, type TokensDoE2e } from './integracoes';

const tokens = tokensDoE2e();

test.use({ trace: 'off' });

function exigirTokens(): TokensDoE2e {
  test.skip(HOMOLOGACAO, MOTIVO_SEM_TOKENS);
  if (tokens === null) throw new Error('e2e: o e2e/servidor.ts não deixou os tokens das integrações (E2E_ARQUIVO_TOKENS)');
  return tokens;
}

// As chamadas como os clientes fazem: Bearer, `accept: application/json` e nenhum `Origin` (o contexto de API do
// Playwright não manda `Origin` sozinho).
const contextoDe = (baseURL: string | undefined, token: string) =>
  novoContexto.newContext({ baseURL, extraHTTPHeaders: { authorization: `Bearer ${token}`, accept: 'application/json' } });

test('CA-09.1: o Awave cria e lê a própria demanda, sem Origin', async ({ baseURL }) => {
  const { awave } = exigirTokens();
  const ctx = await contextoDe(baseURL, awave);
  try {
    // O corpo do contrato da tool do Awave (awave-agents 0ab8ced), com texto fictício.
    const r = await ctx.post('/api/demandas', {
      headers: { 'content-type': 'application/json' },
      data: JSON.stringify({
        titulo: 'Relatório do e2e (fictício)',
        tipo: 'melhoria',
        solicitanteNome: 'Awave',
        solicitantePapel: 'outro',
        descricaoProblema: 'Texto fictício.',
        contexto: 'Aberta pelo e2e.',
      }),
      maxRedirects: 0,
    });
    expect(r.status(), 'POST /api/demandas do Awave').toBe(201);
    const { id } = (await r.json()) as { id: string };
    expect(id).toMatch(/^DEM-\d{8}-\d{4}$/);
    const lida = await ctx.get(`/api/demandas/${id}`, { maxRedirects: 0 });
    expect(lida.status(), 'GET /api/demandas/:id do Awave').toBe(200);
    const vista = (await lida.json()) as Record<string, unknown>;
    expect(Object.keys(vista).sort()).toEqual(['atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo']);
    expect(vista).toMatchObject({ id, tipo: 'melhoria', status: 'nova' });
  } finally {
    await ctx.dispose();
  }
});

test('CP-7: pendentes, entrega sem corpo e recebimento pelo SHA-256', async ({ page, baseURL }) => {
  const { construir } = exigirTokens();
  await entrarComo(page, 'cto');
  const dem = await demandaDoSeed(page, TITULOS_DO_E2E.pedidoParaBuscar);
  const decId = (await api<{ pacotesDecisao: { id: string }[] }>(page, 'GET', `/api/demandas/${dem}`)).pacotesDecisao[0]!.id;
  const ctx = await contextoDe(baseURL, construir);
  try {
    const pendentes = async () => {
      const r = await ctx.get('/api/pedidos-construcao/pendentes', { maxRedirects: 0 });
      expect(r.status(), 'GET /api/pedidos-construcao/pendentes').toBe(200);
      return ((await r.json()) as { itens: { decId: string }[] }).itens.map((i) => i.decId);
    };
    // O e2e local sobe um banco recém-semeado: o DEC da `pedidoParaBuscar` está na lista. Outros e2e geram pedidos
    // (pedido-construcao.spec.ts), então a lista pode ter mais itens: o teste procura o DEC, não exige um item só.
    expect(await pendentes()).toContain(decId);
    const entrega = await ctx.post(`/api/pedidos-construcao/${decId}/entrega`, { maxRedirects: 0 });
    expect(entrega.status(), 'POST da entrega').toBe(200);
    const texto = await entrega.text();
    expect((JSON.parse(texto) as { pedido: string }).pedido).toBe(decId);
    const sha256 = createHash('sha256').update(texto, 'utf8').digest('hex');
    const recebimento = (corpo: { sha256: string }) =>
      ctx.post(`/api/pedidos-construcao/${decId}/recebimento`, { headers: { 'content-type': 'application/json' }, data: JSON.stringify(corpo), maxRedirects: 0 });
    expect((await recebimento({ sha256: '0'.repeat(64) })).status(), 'recebimento com o SHA-256 errado').toBe(409);
    expect(await pendentes()).toContain(decId);
    expect((await recebimento({ sha256 })).status(), 'recebimento com o SHA-256 certo').toBe(204);
    expect(await pendentes()).not.toContain(decId);
  } finally {
    await ctx.dispose();
  }
});
