// RNF-03 (T35): leitura da fila e do detalhe com 5.000 demandas fictícias. As linhas entram pelo migrator, em lote
// (generate_series), com ESP, RSK, DEC, decisão e execução de agente em parte delas; depois, ANALYZE, como o autovacuum
// faria em produção. As chamadas passam pelos handlers reais (rota(), sessão do Better Auth com 2FA, Zod e Drizzle).
// O plano de execução é o do planejador de verdade, sem desligar a varredura: é o que a fila usa com volume.
// Medir tempo exige o relógio do processo (performance.now()), não o Relogio dos Deps: é a natureza deste teste.
import { drizzle } from 'drizzle-orm/node-postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GET as GET_DEMANDA } from '../../src/app/api/demandas/[id]/route';
import { GET as GET_LISTA } from '../../src/app/api/demandas/route';
import type { Db } from '../../src/db';
import * as schema from '../../src/db/schema';
import { definirDepsParaTeste, type Deps } from '../../src/lib/deps';
import { substituirDestinoDoLog } from '../../src/lib/log';
import { listarDemandas, obterDemanda } from '../../src/modules/demandas/consultas';
import { filtroDemandasSchema } from '../../src/modules/demandas/schemas';
import { novoBanco, type BancoDeTeste } from '../banco';
import { criarDepsDeTeste } from '../deps';
import { chamarRota } from '../requisicao';
import { criarPessoa } from '../sessao';

const TOTAL = 5_000;
const CHAMADAS = 100;
const LIMITE_P95_MS = 500;

let b: BancoDeTeste;
let deps: Deps;
let cookie: string;

// Id DEM-AAAAMMDD-NNNN de cada linha: a data é a da criação (uma demanda por hora desde 01/01/2026) e NNNN é o número
// da linha, de 0001 a 5000, sem repetir.
const idDe = (n: number): string => {
  const criada = new Date(Date.UTC(2026, 0, 1, 12) + n * 3_600_000);
  const aaaammdd = criada.toISOString().slice(0, 10).replaceAll('-', '');
  return `DEM-${aaaammdd}-${String(n).padStart(4, '0')}`;
};

const POPULAR = [
  `insert into demanda (id, titulo, tipo, status, solicitante_nome, linha_servico_provavel, urgencia, autor_tipo, autor_id, rascunho_agente, criada_em, atualizada_em)
   select 'DEM-' || to_char((timestamp '2026-01-01 12:00:00' + i * interval '1 hour'), 'YYYYMMDD') || '-' || lpad(i::text, 4, '0'),
          'Demanda ficticia ' || i,
          (array['bug', 'melhoria', 'novo_projeto', 'estudo', 'produto_proprio'])[1 + i % 5],
          (array['nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao', 'encerrada', 'aprovada', 'em_construcao', 'entregue', 'devolvida'])[1 + i % 9],
          'Pessoa Ficticia',
          (array['sob_medida', 'automacao_integracao', 'ia_controle_humano', 'diagnostico_sustentacao', 'indefinida', null])[1 + i % 6],
          (array['baixa', 'media', 'alta'])[1 + i % 3],
          case when i % 4 = 0 then 'agente' else 'pessoa' end,
          case when i % 4 = 0 then 'orquestrador' else 'u-ficticio-desempenho' end,
          i % 4 = 0,
          (timestamp '2026-01-01 12:00:00' + i * interval '1 hour') at time zone 'UTC',
          (timestamp '2026-01-01 12:00:00' + i * interval '1 hour') at time zone 'UTC'
   from generate_series(1, ${TOTAL}) as i`,
  // ESP v1 em metade das demandas e v2 em um quarto delas (o DEC dessas fica desatualizado).
  `insert into especificacao_tecnica (id, demanda_id, versao, descricao_objetiva, escopo_inclui, autor_tipo, autor_id, rascunho_agente, criada_em)
   select 'ESP-' || d.id || '-v' || v, d.id, v, 'Descricao ficticia', '["item ficticio"]'::jsonb, 'pessoa', 'u-ficticio-desempenho', false, d.criada_em
   from demanda d cross join generate_series(1, 2) as v
   where (right(d.id, 4)::int % 2 = 0 and v = 1) or (right(d.id, 4)::int % 4 = 0 and v = 2)`,
  `insert into parecer_risco (id, demanda_id, versao, risco_tecnico_nivel, risco_operacional_nivel, risco_juridico_nivel, autor_tipo, autor_id, rascunho_agente, criada_em)
   select 'RSK-' || d.id || '-v1', d.id, 1, 'baixo', 'medio', 'alto', 'agente', 'risco', true, d.criada_em
   from demanda d where right(d.id, 4)::int % 3 = 0`,
  `insert into pacote_decisao (id, demanda_id, versao, especificacao_id, especificacao_versao, parecer_risco_id, parecer_risco_versao, demanda_tipo,
     demanda_titulo, demanda_descricao, resumo_executivo, opcao_a, opcao_b, nivel_aprovacao_requerido, autor_tipo, autor_id, rascunho_agente, criada_em)
   select 'DEC-' || d.id || '-v1', d.id, 1, 'ESP-' || d.id || '-v1', 1, 'RSK-' || d.id || '-v1', 1, d.tipo,
          d.titulo, 'Contexto: ficticio', 'Resumo ficticio', '{"descricao":"Opcao A ficticia"}'::jsonb, '{"descricao":"Opcao B ficticia"}'::jsonb,
          'cto', 'agente', 'consolidacao', true, d.criada_em
   from demanda d where right(d.id, 4)::int % 6 = 0`,
  `insert into decisao (pacote_decisao_id, status_decisao, opcao_escolhida, decidida_por, decidida_em)
   select p.id, 'aprovada', 'A', 'u-ficticio-desempenho', p.criada_em
   from pacote_decisao p where right(p.demanda_id, 4)::int % 12 = 6`,
  `insert into execucao_agente (agente, chave_entrada, demanda_id, status, criada_em, atualizada_em)
   select 'insumo_tecnico', 'demanda:' || d.id, d.id, 'pendente', d.criada_em, d.criada_em
   from demanda d where right(d.id, 4)::int % 10 = 0`,
  'analyze',
];

// Filtros variados da fila: sem filtro, cada filtro sozinho, combinações, página grande e deslocamento fundo.
const FILTROS = [
  '',
  '?status=nova',
  '?status=em_analise&offset=40',
  '?tipo=bug',
  '?tipo=estudo&limit=100',
  '?linhaServicoProvavel=sob_medida',
  '?status=aprovada&tipo=melhoria',
  '?tipo=novo_projeto&linhaServicoProvavel=ia_controle_humano&status=pronta_para_decisao',
  '?limit=100&offset=4800',
  '?status=entregue&limit=50&offset=200',
];

// p95 pelo posto mais próximo: o valor na posição ceil(0,95 × n) da lista em ordem crescente.
function percentil(ms: number[], p: number): number {
  const ordenados = [...ms].sort((x, y) => x - y);
  return ordenados[Math.ceil((p / 100) * ordenados.length) - 1]!;
}

async function medir(chamada: () => Promise<Response>): Promise<number> {
  const inicio = performance.now();
  const r = await chamada();
  await r.arrayBuffer();
  const ms = performance.now() - inicio;
  expect(r.status).toBe(200);
  return ms;
}

type NoDoPlano = { 'Node Type': string; 'Relation Name'?: string; 'Index Name'?: string; Plans?: NoDoPlano[] };

function nosDe(no: NoDoPlano): NoDoPlano[] {
  return [no, ...(no.Plans ?? []).flatMap(nosDe)];
}

// As consultas que a função gera, com os parâmetros, capturadas pelo logger do Drizzle sobre o mesmo pool do app.
async function consultasGeradas(fn: (db: Db) => Promise<unknown>): Promise<Array<{ sql: string; params: unknown[] }>> {
  const capturadas: Array<{ sql: string; params: unknown[] }> = [];
  const db = drizzle(b.poolApp, {
    schema,
    casing: 'snake_case',
    logger: { logQuery: (sql, params) => capturadas.push({ sql, params }) },
  });
  await fn(db);
  return capturadas;
}

async function planoDe(consulta: { sql: string; params: unknown[] }): Promise<NoDoPlano> {
  const r = await b.poolApp.query<{ 'QUERY PLAN': Array<{ Plan: NoDoPlano }> }>(`explain (format json) ${consulta.sql}`, consulta.params);
  return r.rows[0]!['QUERY PLAN'][0]!.Plan;
}

const resumoDoPlano = (plano: NoDoPlano): string =>
  nosDe(plano)
    .map((n) => [n['Node Type'], n['Relation Name'], n['Index Name']].filter(Boolean).join(' '))
    .join(' > ');

// Tabelas do domínio que crescem com as demandas: nenhuma pode sair por varredura completa na leitura da fila e do
// detalhe. A tabela `user` (contas do painel, poucas linhas) fica de fora.
const TABELAS_QUE_CRESCEM = ['demanda', 'especificacao_tecnica', 'parecer_risco', 'pacote_decisao', 'decisao', 'execucao_agente'];
const varridasPorCompleto = (plano: NoDoPlano): string[] =>
  nosDe(plano)
    .filter((n) => n['Node Type'] === 'Seq Scan' && TABELAS_QUE_CRESCEM.includes(n['Relation Name'] ?? ''))
    .map((n) => n['Relation Name']!);

const relatar = (linha: string) => process.stdout.write(`T35 ${linha}\n`);

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => {} });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  cookie = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  for (const comando of POPULAR) await b.poolMigrator.query(comando);
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('RNF-03: leitura com 5.000 demandas', () => {
  it('a massa tem 5.000 demandas, com ESP, RSK, DEC, decisão e execução em parte delas', async () => {
    const r = await b.poolMigrator.query<Record<string, number>>(
      `select (select count(*)::int from demanda) as demandas, (select count(*)::int from especificacao_tecnica) as esp,
              (select count(*)::int from parecer_risco) as rsk, (select count(*)::int from pacote_decisao) as dec,
              (select count(*)::int from decisao) as decisoes, (select count(*)::int from execucao_agente) as execucoes`,
    );
    expect(r.rows[0]).toEqual({ demandas: 5000, esp: 3750, rsk: 1666, dec: 833, decisoes: 417, execucoes: 500 });
    // O id da massa segue o formato e a mesma regra que o teste usa para escolher as demandas do detalhe.
    expect((await b.poolMigrator.query('select 1 from demanda where id = $1', [idDe(4321)])).rowCount).toBe(1);
  });

  it(
    'p95 < 500 ms em GET /api/demandas e GET /api/demandas/:id, 100 chamadas de cada com cookie de pessoa',
    async () => {
      const lista: number[] = [];
      for (let k = 0; k < CHAMADAS; k++) {
        lista.push(await medir(() => chamarRota(GET_LISTA, { caminho: `/api/demandas${FILTROS[k % FILTROS.length]}`, cookie })));
      }
      // 50k + 6: todas têm ESP (metade também a v2, com o DEC desatualizado), um terço tem RSK e DEC (k múltiplo de 3)
      // e um sexto tem o DEC aprovado (k múltiplo de 6).
      const detalhe: number[] = [];
      for (let k = 0; k < CHAMADAS; k++) {
        const id = idDe(50 * k + 6);
        detalhe.push(await medir(() => chamarRota(GET_DEMANDA, { caminho: `/api/demandas/${id}`, params: { id }, cookie })));
      }
      const p95Lista = percentil(lista, 95);
      const p95Detalhe = percentil(detalhe, 95);
      const fmt = (v: number) => v.toFixed(1);
      relatar(`lista: p50 ${fmt(percentil(lista, 50))} ms, p95 ${fmt(p95Lista)} ms, máx ${fmt(Math.max(...lista))} ms`);
      relatar(`detalhe: p50 ${fmt(percentil(detalhe, 50))} ms, p95 ${fmt(p95Detalhe)} ms, máx ${fmt(Math.max(...detalhe))} ms`);
      expect(p95Lista).toBeLessThan(LIMITE_P95_MS);
      expect(p95Detalhe).toBeLessThan(LIMITE_P95_MS);
    },
    120_000,
  );

  it('a fila devolve a página certa sobre o volume: total por status e a mais nova primeiro', async () => {
    const r = await chamarRota(GET_LISTA, { caminho: '/api/demandas?status=nova&limit=3', cookie });
    const corpo = (await r.json()) as { itens: Array<{ id: string; status: string }>; total: number };
    // status 'nova' = i % 9 = 0: 9, 18, ..., 4995 → 555 demandas; as três mais novas são 4995, 4986 e 4977.
    expect(corpo.total).toBe(555);
    expect(corpo.itens.map((i) => i.id)).toEqual([idDe(4995), idDe(4986), idDe(4977)]);
  });
});

describe('plano de execução das consultas da fila e do detalhe, com volume (EXPLAIN)', () => {
  // A página sai por um índice que já entrega criada_em em ordem: o (status, criada_em) ou o de criada_em com o status
  // como filtro. Com o heap na ordem de criação (as demandas entram em ordem de tempo, aqui e em produção), o planejador
  // prefere o de criada_em, e um índice (status, criada_em, id) também não muda a escolha (ensaio na entrega da T35).
  // A contagem do mesmo filtro sai pelo (status, criada_em).
  it('EXPLAIN do filtro por status ordenado por criada_em usa o índice (status, criada_em), sem Seq Scan em demanda', async () => {
    const consultas = await consultasGeradas((db) => listarDemandas(db, filtroDemandasSchema.parse({ status: 'em_analise' })));
    expect(consultas).toHaveLength(2);
    const [pagina, contagem] = await Promise.all(consultas.map(planoDe));
    relatar(`EXPLAIN fila por status: ${resumoDoPlano(pagina!)}`);
    relatar(`EXPLAIN contagem por status: ${resumoDoPlano(contagem!)}`);
    const indicesDaPagina = nosDe(pagina!).filter((n) => n['Relation Name'] === 'demanda').map((n) => n['Index Name']);
    expect(indicesDaPagina).toHaveLength(1);
    expect(['demanda_status_criada_idx', 'demanda_criada_idx']).toContain(indicesDaPagina[0]);
    expect(nosDe(contagem!).map((n) => n['Index Name'])).toContain('demanda_status_criada_idx');
    expect(varridasPorCompleto(pagina!)).toEqual([]);
    expect(varridasPorCompleto(contagem!)).toEqual([]);
  });

  it.each([
    ['sem filtro', {}],
    ['por tipo', { tipo: 'bug' }],
    ['por linha de serviço', { linhaServicoProvavel: 'sob_medida' }],
    ['status, tipo e linha juntos', { status: 'pronta_para_decisao', tipo: 'novo_projeto', linhaServicoProvavel: 'ia_controle_humano' }],
  ])('fila %s: nenhuma varredura completa de demanda', async (caso, filtro) => {
    const consultas = await consultasGeradas((db) => listarDemandas(db, filtroDemandasSchema.parse(filtro)));
    expect(consultas).toHaveLength(2);
    const semFiltro = Object.keys(filtro).length === 0;
    for (const [i, c] of consultas.entries()) {
      const plano = await planoDe(c);
      relatar(`EXPLAIN fila ${caso}${i === 0 ? '' : ' (contagem)'}: ${resumoDoPlano(plano)}`);
      // A contagem sem filtro lê a tabela inteira por definição: a varredura completa é o plano certo para ela.
      if (semFiltro && i === 1) continue;
      expect(varridasPorCompleto(plano), c.sql).toEqual([]);
    }
  });

  it('detalhe de demanda com ESP, RSK, DEC e decisão: nenhuma consulta varre por completo as tabelas que crescem', async () => {
    const id = idDe(4206); // 4206 % 12 = 6: ESP v1, RSK v1 e DEC v1 aprovado
    const consultas = await consultasGeradas((db) => obterDemanda(db, id));
    expect(consultas).toHaveLength(5);
    for (const c of consultas) {
      const plano = await planoDe(c);
      relatar(`EXPLAIN detalhe: ${resumoDoPlano(plano)}`);
      expect(varridasPorCompleto(plano), c.sql).toEqual([]);
    }
  });
});
