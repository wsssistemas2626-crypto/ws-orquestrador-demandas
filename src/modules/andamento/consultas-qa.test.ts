// src/modules/andamento/consultas-qa.test.ts — 06-T07-testes do DEC-DEM-20261111-0018-v1 (qa-automacao). B-08-1 com
// muitas linhas por demanda (3.000, 500, 2 e 1), medido por `explain (analyze)` com as linhas descartadas por filtro, e
// um controle com a consulta da 0.4.0 que prova que a medida e o detector de Sort não são vazios; o plano sem Sort sobre
// andamento_construcao em páginas de 1 a 204 demandas, com estatísticas tortas; SB-13 com ids adversariais (aspas,
// comando, curinga, espaço, caixa, homóglifo, id enorme), sozinhos e misturados com um id válido. Banco próprio (não
// muda as estatísticas de consultas.test.ts); Postgres real; dados fictícios; datas fixas.
import { desc, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import type { Db } from '../../db';
import * as schema from '../../db/schema';
import { andamentoConstrucao as a } from '../../db/schema';
import { andamentosDasDemandas } from './consultas';

let b: BancoDeTeste;
const ANTES = '2026-11-12T08:00:00Z';
const QUANDO = '2026-11-12T12:00:00Z';
const DEPOIS = '2026-11-12T16:00:00Z';
const m = (s: string, p: unknown[] = []) => b.poolMigrator.query(s, p);
const dem = (n: number) => `DEM-20261112-${String(n).padStart(4, '0')}`;
const dec = (n: number) => `DEC-${dem(n)}-v1`;

// Demandas de..ate, cada uma com ESP, RSK e DEC v1, pelo migrator (o SQL é o de consultas.test.ts).
async function demandas(de: number, ate: number): Promise<void> {
  const d = `'DEM-20261112-' || lpad(g::text, 4, '0')`;
  const serie = 'from generate_series($2::int, $3::int) g';
  await m(
    `insert into demanda (id, titulo, tipo, solicitante_nome, autor_tipo, autor_id, criada_em, atualizada_em) select ${d}, 'Demanda ficticia', 'melhoria', 'Pessoa Ficticia', 'pessoa', 'u-ficticio', $1, $1 ${serie}`,
    [QUANDO, de, ate],
  );
  await m(
    `insert into especificacao_tecnica (id, demanda_id, versao, descricao_objetiva, escopo_inclui, escopo_exclui, duvidas_em_aberto, autor_tipo, autor_id, rascunho_agente, criada_em) select 'ESP-' || ${d} || '-v1', ${d}, 1, 'x', '[]', '[]', '[]', 'pessoa', 'u-ficticio', false, $1 ${serie}`,
    [QUANDO, de, ate],
  );
  await m(
    `insert into parecer_risco (id, demanda_id, versao, resumo, risco_tecnico_nivel, risco_operacional_nivel, risco_juridico_nivel, autor_tipo, autor_id, rascunho_agente, criada_em) select 'RSK-' || ${d} || '-v1', ${d}, 1, 'Resumo ficticio', 'baixo', 'baixo', 'baixo', 'pessoa', 'u-ficticio', false, $1 ${serie}`,
    [QUANDO, de, ate],
  );
  await m(
    `insert into pacote_decisao (id, demanda_id, versao, especificacao_id, especificacao_versao, parecer_risco_id, parecer_risco_versao, demanda_tipo, demanda_titulo, demanda_descricao, resumo_executivo, opcao_a, opcao_b, nivel_aprovacao_requerido, autor_tipo, autor_id, rascunho_agente, criada_em)
     select 'DEC-' || ${d} || '-v1', ${d}, 1, 'ESP-' || ${d} || '-v1', 1, 'RSK-' || ${d} || '-v1', 1, 'melhoria', 'Demanda ficticia', 'Contexto: ficticio', 'Resumo ficticio', '{"descricao":"A"}', '{"descricao":"B"}', 'cto', 'pessoa', 'u-ficticio', false, $1 ${serie}`,
    [QUANDO, de, ate],
  );
}

async function andamento(n: number, fase: string, prontas: number, total: number, status: string, quando: string) {
  await m(
    `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em) values ($1, $2, $3, $4, $5, $6, 'ficticio', $7)`,
    [dem(n), dec(n), fase, prontas, total, status, quando],
  );
}

// Db sobre o pool do app que guarda as consultas que o Drizzle manda (o mesmo molde de consultas.test.ts).
async function consultasGeradas(fn: (db: Db) => Promise<unknown>): Promise<Array<{ sql: string; params: unknown[] }>> {
  const capturadas: Array<{ sql: string; params: unknown[] }> = [];
  const db: Db = drizzle(b.poolApp, { schema, casing: 'snake_case', logger: { logQuery: (sql, params) => capturadas.push({ sql, params }) } });
  await fn(db);
  return capturadas;
}

type No = {
  'Node Type': string;
  'Relation Name'?: string;
  'Index Name'?: string;
  'Actual Rows'?: number;
  'Actual Loops'?: number;
  'Rows Removed by Filter'?: number;
  'Rows Removed by Index Recheck'?: number;
  Plans?: No[];
};
const nosDe = (no: No): No[] => [no, ...(no.Plans ?? []).flatMap(nosDe)];
const deAndamento = (nos: No[]) => nos.filter((n) => n['Relation Name'] === 'andamento_construcao');
// Linhas tocadas em andamento_construcao: as que o nó devolve e as que ele leu e descartou (filtro, recheck), vezes as
// voltas. Sem as descartadas, uma varredura que filtra depois de ler passaria por "uma linha".
const lidasDeAndamento = (nos: No[]) =>
  deAndamento(nos).reduce(
    (s, n) => s + ((n['Actual Rows'] ?? 0) + (n['Rows Removed by Filter'] ?? 0) + (n['Rows Removed by Index Recheck'] ?? 0)) * (n['Actual Loops'] ?? 0),
    0,
  );
const ORDENACOES = ['Sort', 'Incremental Sort'];
const sortsSobreAndamento = (nos: No[]) => nos.filter((n) => ORDENACOES.includes(n['Node Type']) && deAndamento(nosDe(n)).length > 0);

// O plano executado (pelo papel do app) da única consulta que `fn` manda.
async function analisar(fn: (db: Db) => Promise<unknown>): Promise<No[]> {
  const [c, ...resto] = await consultasGeradas(fn);
  expect(resto).toEqual([]);
  const r = await b.poolApp.query(`explain (analyze, format json) ${c!.sql}`, c!.params);
  return nosDe((r.rows[0]!['QUERY PLAN'] as Array<{ Plan: No }>)[0]!.Plan);
}

// A consulta da fila na 0.4.0 (selectDistinctOn … orderBy(demandaId, desc(id))), só como controle da medida.
const consulta040 = (db: Db, ids: string[]) =>
  db
    .selectDistinctOn([a.demandaId], { demandaId: a.demandaId, id: a.id })
    .from(a)
    .where(inArray(a.demandaId, ids))
    .orderBy(a.demandaId, desc(a.id));

const PESADA = 6001; // 3.000 linhas
const MEDIA = 6004; // 500 linhas, intercaladas com as da PESADA
const UMA = 6002; // 1 linha, a última gravada no banco inteiro
const DUAS = 6003; // 2 linhas
const SEM = 6005; // nenhuma linha
const FUNDO = Array.from({ length: 300 }, (_, i) => dem(5001 + i)); // 20 linhas cada

beforeAll(async () => {
  b = await novoBanco();
  await demandas(5001, 5300);
  await demandas(6001, 6005);
  await m(
    `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em)
     select 'DEM-20261112-' || lpad(g::text, 4, '0'), 'DEC-DEM-20261112-' || lpad(g::text, 4, '0') || '-v1', 'testando', k, 20, 'em_construcao', 'ficticio', $1
     from generate_series(5001, 5300) g cross join generate_series(1, 20) k order by g, k`,
    [QUANDO],
  );
  // PESADA e MEDIA intercaladas (ids alternam enquanto as duas têm linha), com gravado_em e tarefas_prontas maiores que
  // os da linha final de cada uma: só o maior id aponta a linha certa.
  await m(
    `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em)
     select 'DEM-20261112-' || lpad(g::text, 4, '0'), 'DEC-DEM-20261112-' || lpad(g::text, 4, '0') || '-v1', 'construindo', k % 900, 999, 'em_construcao', 'ficticio', $1
     from (select 6001 as g, k from generate_series(1, 3000) k union all select 6004, k from generate_series(1, 500) k) t
     order by k, g`,
    [DEPOIS],
  );
  await andamento(DUAS, 'planejando', 0, 5, 'em_construcao', DEPOIS);
  await andamento(PESADA, 'documentando', 1, 999, 'cancelado', ANTES);
  await andamento(MEDIA, 'revisando_e_entregando', 2, 999, 'construido', ANTES);
  await andamento(DUAS, 'testando', 4, 5, 'em_construcao', ANTES);
  await andamento(UMA, 'entendendo_o_pedido', 0, 0, 'em_construcao', QUANDO);
  await m('analyze demanda');
  await m('analyze andamento_construcao');
}, 120_000);
afterAll(async () => {
  await b.fechar();
});

const ESPERADO = new Map([
  [dem(PESADA), { demandaId: dem(PESADA), decId: dec(PESADA), fase: 'documentando', tarefasProntas: 1, tarefasTotal: 999, statusConstrucao: 'cancelado', gravadoEm: new Date(ANTES) }],
  [dem(MEDIA), { demandaId: dem(MEDIA), decId: dec(MEDIA), fase: 'revisando_e_entregando', tarefasProntas: 2, tarefasTotal: 999, statusConstrucao: 'construido', gravadoEm: new Date(ANTES) }],
  [dem(UMA), { demandaId: dem(UMA), decId: dec(UMA), fase: 'entendendo_o_pedido', tarefasProntas: 0, tarefasTotal: 0, statusConstrucao: 'em_construcao', gravadoEm: new Date(QUANDO) }],
  [dem(DUAS), { demandaId: dem(DUAS), decId: dec(DUAS), fase: 'testando', tarefasProntas: 4, tarefasTotal: 5, statusConstrucao: 'em_construcao', gravadoEm: new Date(ANTES) }],
]);
const COM_ANDAMENTO = [dem(PESADA), dem(MEDIA), dem(UMA), dem(DUAS)];
const contar = async (sql: string, p: unknown[] = []) => Number((await m(sql, p)).rows[0]!.n);

describe('B-08-1 (qa): uma linha lida por demanda, com muitas linhas de andamento', () => {
  it('as quatro demandas da página somam 3.505 linhas de andamento (a prova roda com volume)', async () => {
    expect(await contar('select count(*) as n from andamento_construcao where demanda_id = any($1)', [COM_ANDAMENTO])).toBe(3505);
  });
  it('explain analyze: 3.000, 500, 2 e 1 linhas → exatamente 4 lidas, nenhuma descartada por filtro', async () => {
    const nos = await analisar((db) => andamentosDasDemandas(db, COM_ANDAMENTO));
    expect(lidasDeAndamento(nos)).toBe(4);
    for (const n of deAndamento(nos)) {
      expect(n['Actual Rows'], n['Node Type']).toBeLessThanOrEqual(1);
      expect(n['Rows Removed by Filter'] ?? 0, n['Node Type']).toBe(0);
    }
  });
  it('só a demanda de 3.000 linhas: 1 lida', async () => {
    expect(lidasDeAndamento(await analisar((db) => andamentosDasDemandas(db, [dem(PESADA)])))).toBe(1);
  });
  it('controle: a consulta da 0.4.0 lê as 3.505 linhas e tem Sort sobre andamento_construcao (a medida e o detector não são vazios)', async () => {
    const nos = await analisar((db) => consulta040(db, COM_ANDAMENTO));
    expect(lidasDeAndamento(nos)).toBeGreaterThanOrEqual(3505);
    expect(sortsSobreAndamento(nos).length).toBeGreaterThan(0);
  });
  it('página de 200 demandas de fundo (20 linhas cada): exatamente 200 lidas', async () => {
    expect(lidasDeAndamento(await analisar((db) => andamentosDasDemandas(db, FUNDO.slice(0, 200))))).toBe(200);
  });
  it('demanda sem andamento e id que não existe na página: no máximo uma lida por demanda que existe', async () => {
    const nos = await analisar((db) => andamentosDasDemandas(db, [...COM_ANDAMENTO, dem(SEM), 'DEM-20261112-9999']));
    expect(lidasDeAndamento(nos)).toBeLessThanOrEqual(5);
  });
  it('o resultado é a linha de maior id de cada uma: não a de maior gravado_em, nem a de maior tarefas_prontas, nem a última do banco', async () => {
    const mapa = await andamentosDasDemandas(b.db, [dem(SEM), 'DEM-20261112-9999', ...COM_ANDAMENTO]);
    expect(mapa).toEqual(ESPERADO);
  });
});

describe('B-08-1 (qa): plano sem Sort sobre andamento_construcao, com estatísticas tortas', () => {
  const PAGINAS: Array<[string, string[]]> = [
    ['1 demanda (a de 3.000 linhas)', [dem(PESADA)]],
    ['4 demandas (3.000, 500, 2 e 1)', COM_ANDAMENTO],
    ['50 demandas de fundo', FUNDO.slice(0, 50)],
    ['204 demandas (200 de fundo e as 4)', [...FUNDO.slice(100, 300), ...COM_ANDAMENTO]],
  ];
  it.each(PAGINAS)('%s: usa andamento_construcao_demanda_id_idx, sem Seq Scan e sem Sort nem Incremental Sort sobre ela', async (_, ids) => {
    const nos = await analisar((db) => andamentosDasDemandas(db, ids));
    expect(deAndamento(nos).map((n) => n['Index Name'])).toContain('andamento_construcao_demanda_id_idx');
    expect(deAndamento(nos).map((n) => n['Node Type'])).not.toContain('Seq Scan');
    expect(sortsSobreAndamento(nos)).toEqual([]);
    expect(lidasDeAndamento(nos)).toBeLessThanOrEqual(ids.length);
  });
});

// SB-13 (b) e (c), adversarial: o id só entra como parâmetro; nenhuma forma dele muda o SQL, alarga ou encolhe o
// resultado, ou mexe no banco.
const X = dem(PESADA);
const MALICIOSOS = [
  `${X}' or '1'='1`,
  "'); drop table demanda; --",
  "'; delete from andamento_construcao; --",
  `${X}' union select demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, gravado_em from andamento_construcao --`,
  "' or ultimo.demanda_id is not null --",
  "x') or true or ('x",
  `${X}'::text or 1=1 --`,
  '" or ""="',
  '%',
  'DEM-20261112-600%',
  'DEM-20261112-600_',
  '*',
  '$1',
  '\\',
  '/* */',
  `${X} `,
  ` ${X}`,
  `${X}\n`,
  X.toLowerCase(),
  X.replace('-', '‐'),
  X.replace('E', 'Е'),
  'x'.repeat(5000),
];
// Os que têm texto de SQL ou aspas: não podem aparecer no texto da consulta.
const COM_SQL = MALICIOSOS.filter((s) => /['"]|drop|delete|union/.test(s));

describe('SB-13 (qa): ids adversariais em andamentosDasDemandas', () => {
  it('só ids maliciosos: mapa vazio, sem erro', async () => {
    await expect(andamentosDasDemandas(b.db, MALICIOSOS)).resolves.toEqual(new Map());
  });
  it('maliciosos misturados com um id válido: só a linha do válido, a de maior id, com as sete chaves', async () => {
    const mapa = await andamentosDasDemandas(b.db, [...MALICIOSOS.slice(0, 11), X, ...MALICIOSOS.slice(11)]);
    expect([...mapa.keys()]).toEqual([X]);
    expect(mapa.get(X)).toEqual(ESPERADO.get(X));
    expect(Object.keys(mapa.get(X)!).sort()).toEqual(['decId', 'demandaId', 'fase', 'gravadoEm', 'statusConstrucao', 'tarefasProntas', 'tarefasTotal']);
  });
  it('uma consulta; nenhum id no texto do SQL; cada id uma vez nos parâmetros, tal como veio; sem ator_token_prefixo nem select *', async () => {
    const ids = [...MALICIOSOS, ...MALICIOSOS, X];
    const consultas = await consultasGeradas((db) => andamentosDasDemandas(db, ids));
    expect(consultas).toHaveLength(1);
    const { sql, params } = consultas[0]!;
    for (const s of COM_SQL) expect(sql, s).not.toContain(s);
    expect(sql).not.toContain(X);
    for (const s of [...MALICIOSOS, X]) expect(params.filter((p) => p === s), s).toHaveLength(1);
    expect(sql).not.toContain('ator_token_prefixo');
    expect(sql).not.toMatch(/\.\*|select \*/i);
  });
  it('depois de todas as chamadas maliciosas, demanda e andamento_construcao seguem com as mesmas linhas', async () => {
    const antes = [await contar('select count(*) as n from demanda'), await contar('select count(*) as n from andamento_construcao')];
    await andamentosDasDemandas(b.db, MALICIOSOS);
    for (const s of MALICIOSOS) await andamentosDasDemandas(b.db, [s, X]);
    expect([await contar('select count(*) as n from demanda'), await contar('select count(*) as n from andamento_construcao')]).toEqual(antes);
    // 305 demandas; 6.000 linhas de fundo + 3.505 das quatro da página.
    expect(antes).toEqual([305, 9505]);
  });
  it('um id malicioso por vez, ao lado do válido: sempre só o válido', async () => {
    for (const s of MALICIOSOS) {
      const mapa = await andamentosDasDemandas(b.db, [s, X]);
      expect([...mapa.keys()], s).toEqual([X]);
    }
  });
});
