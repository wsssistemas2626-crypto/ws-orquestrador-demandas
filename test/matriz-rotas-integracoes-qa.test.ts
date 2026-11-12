// Escrito na 06-T03-testes (qa-automacao), ao lado de matriz-rotas.test.ts, sem mudar nada nele. CA-03.1 e CA-03.2
// pelas rotas reais, com os tokens reais das duas integrações, do jeito que um cliente de servidor chama (Bearer, sem
// Origin e sem cookie) e do jeito do teste da T13 (com Origin):
//   - cada rota cuja ação nega a integração responde 403 com a mensagem de sem permissão;
//   - nada é gravado, conferido dentro do mesmo teste, antes e depois das chamadas de cada rota. Assim a prova não
//     depende de ordem nem de rodar o arquivo inteiro (parecer 4 da 06-T03-revisao sobre o "nada gravado" de
//     matriz-rotas.test.ts, que só tem sentido depois do laço das rotas);
//   - casos nomeados do CA-03.1 (GET /api/demandas pelo awave) e do CA-03.2 (POST /api/demandas e GET /api/demandas/:id
//     pelo construir), para a rastreabilidade não depender do laço.
// As rotas em que a integração é permitida (awave em criar_demanda e ler_demanda) ficam com a T05 e a T06 (D-01).
// Banco e tokens reais (Testcontainers); nenhuma sessão de pessoa é criada. Cresce sozinho: cada route.ts nova entra no
// laço (as três de pedidos-construcao, na T11 e na T12).
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { definirDepsParaTeste, type Deps } from '../src/lib/deps';
import { substituirDestinoDoLog } from '../src/lib/log';
import type { HandlerRota } from '../src/lib/rota';
import { INTEGRACOES, type Integracao } from '../src/modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../src/modules/acesso/mensagens';
import { atoresProibidos } from '../src/modules/acesso/matriz';
import { novoBanco, type BancoDeTeste } from './banco';
import { criarDepsDeTeste } from './deps';
import { tokenDeIntegracao } from './integracoes';
import { METODOS, chamarRota, padraoDaRota, type Metodo } from './requisicao';

const raiz = fileURLToPath(new URL('../', import.meta.url));
const PUBLICAS = /^src\/app\/api\/(auth|saude)\//;
const arquivos = globSync('src/app/api/**/route.ts', { cwd: raiz })
  .filter((a) => !PUBLICAS.test(a))
  .sort();
const MUDAM_ESTADO: ReadonlySet<Metodo> = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
const SEM_PERMISSAO = { erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao };

let b: BancoDeTeste;
let deps: Deps;
const tokens = {} as Record<Integracao, string>;

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  for (const i of INTEGRACOES) tokens[i] = await tokenDeIntegracao(deps, i);
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

// O que uma rota de negócio grava: eventos (todo ato vai ao histórico), demandas, versões, execuções e uso de IA.
async function contagem(): Promise<Record<string, number>> {
  const { rows } = await b.poolMigrator.query(
    `select (select count(*) from evento)::int as eventos,
            (select count(*) from demanda)::int as demandas,
            (select count(*) from especificacao_tecnica)::int as especificacoes,
            (select count(*) from execucao_agente)::int as execucoes,
            (select count(*) from token_servico)::int as tokens`,
  );
  return rows[0] as Record<string, number>;
}

const caminhoCom = (h: HandlerRota) => h.meta.rota.replace(/\[([A-Za-z]+)\]/g, (_, n: string) => encodeURIComponent(h.meta.exemplo[n] ?? 'x'));

function chamarComIntegracao(h: HandlerRota, metodo: Metodo, i: Integracao, comOrigin: boolean): Promise<Response> {
  return chamarRota(h, {
    metodo,
    caminho: caminhoCom(h),
    params: h.meta.exemplo,
    bearer: tokens[i],
    semOrigin: !comOrigin,
    ...(MUDAM_ESTADO.has(metodo) ? { corpo: {} } : {}),
  });
}

async function handlerDe(arquivo: string, metodo: Metodo): Promise<HandlerRota | undefined> {
  const mod = (await import(`${raiz}${arquivo}`)) as Record<string, unknown>;
  return mod[metodo] as HandlerRota | undefined;
}

describe('CA-03.1 e CA-03.2: cada rota real nega a integração que a matriz nega, e nada é gravado', () => {
  it('a varredura enxerga as rotas de demandas (falha se o glob quebrar)', () => {
    expect(arquivos).toEqual(expect.arrayContaining(['src/app/api/demandas/route.ts', 'src/app/api/demandas/[id]/route.ts']));
  });

  for (const arquivo of arquivos) {
    it(`${arquivo}: 403 com a mensagem de sem permissão para cada integração proibida, com e sem Origin, sem gravar`, async () => {
      let conferidas = 0;
      for (const metodo of METODOS) {
        const h = await handlerDe(arquivo, metodo);
        if (h === undefined) continue;
        expect(h.meta?.acao, `${metodo}: handler sem ação`).toBeDefined();
        expect(h.meta.rota, `${metodo}: meta.rota`).toBe(padraoDaRota(arquivo));
        const proibidas = atoresProibidos(h.meta.acao).flatMap((x) => (x.tipo === 'integracao' ? [x.integracao] : []));
        const antes = await contagem();
        for (const i of proibidas)
          for (const comOrigin of [false, true]) {
            const r = await chamarComIntegracao(h, metodo, i, comOrigin);
            const rotulo = `${metodo} ${i} ${comOrigin ? 'com' : 'sem'} Origin`;
            expect(r.status, rotulo).toBe(403);
            expect(await r.json(), rotulo).toEqual(SEM_PERMISSAO);
            conferidas++;
          }
        expect(await contagem(), `${metodo}: gravou algo para integração recusada`).toEqual(antes);
      }
      // Toda route.ts de negócio exporta ao menos um método, e nenhuma ação de hoje está aberta às duas integrações.
      expect(conferidas, 'nenhuma chamada conferida').toBeGreaterThan(0);
    });
  }
});

describe('casos nomeados do CA-03.1 e do CA-03.2 (Bearer sem Origin)', () => {
  const CASOS: ReadonlyArray<{ fonte: string; arquivo: string; metodo: Metodo; integracao: Integracao }> = [
    { fonte: 'CA-03.1', arquivo: 'src/app/api/demandas/route.ts', metodo: 'GET', integracao: 'awave' },
    { fonte: 'CA-03.2', arquivo: 'src/app/api/demandas/route.ts', metodo: 'POST', integracao: 'construir' },
    { fonte: 'CA-03.2', arquivo: 'src/app/api/demandas/[id]/route.ts', metodo: 'GET', integracao: 'construir' },
  ];
  it.each(CASOS)('$fonte: $metodo $arquivo com o token $integracao responde 403 e não grava', async ({ arquivo, metodo, integracao }) => {
    const h = await handlerDe(arquivo, metodo);
    expect(h, 'a rota não exporta o método').toBeDefined();
    const antes = await contagem();
    const r = await chamarComIntegracao(h!, metodo, integracao, false);
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual(SEM_PERMISSAO);
    expect(await contagem()).toEqual(antes);
  });
  it('CA-03.2 com corpo válido do contrato do Awave: o construir continua 403 no POST /api/demandas, sem gravar', async () => {
    const h = (await handlerDe('src/app/api/demandas/route.ts', 'POST'))!;
    const antes = await contagem();
    const r = await chamarRota(h, {
      metodo: 'POST',
      caminho: '/api/demandas',
      bearer: tokens.construir,
      semOrigin: true,
      corpo: {
        titulo: 'Relatório semanal (fictício)',
        tipo: 'melhoria',
        solicitanteNome: 'Awave',
        solicitantePapel: 'outro',
        descricaoProblema: 'Texto fictício.',
        contexto: 'Contexto fictício.',
      },
    });
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual(SEM_PERMISSAO);
    expect(await contagem()).toEqual(antes);
  });
});
