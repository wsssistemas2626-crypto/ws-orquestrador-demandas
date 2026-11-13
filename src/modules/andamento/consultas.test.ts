// src/modules/andamento/consultas.test.ts — ADR-30 e ADR-35: o último andamento é a linha de maior id (o relógio pode
// empatar); a página lê numa consulta só; a subconsulta do Awave junta na consulta da demanda. Os planos usam
// andamento_construcao_demanda_id_idx. Postgres real; linhas pelo migrator; dados fictícios. T06 do pedido
// DEC-DEM-20261111-0017-v1.
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import type { Db } from '../../db';
import * as schema from '../../db/schema';
import { demanda } from '../../db/schema';
import { andamentosDasDemandas, subconsultaDoUltimoAndamento, ultimoAndamento } from './consultas';

let b: BancoDeTeste;
const QUANDO = '2026-11-12T12:00:00Z';
const m = (s: string, p: unknown[] = []) => b.poolMigrator.query(s, p);

// Uma demanda com ESP, RSK e DEC v1, pelo migrator (o SQL é o de src/db/schema/andamento.test.ts da T01).
async function demandaComDec(n: number): Promise<{ dem: string; dec: string }> {
  const dem = `DEM-20261112-${String(n).padStart(4, '0')}`;
  await m(
    `insert into demanda (id, titulo, tipo, solicitante_nome, autor_tipo, autor_id, criada_em, atualizada_em) values ($1, 'Demanda ficticia', 'melhoria', 'Pessoa Ficticia', 'pessoa', 'u-ficticio', $2, $2)`,
    [dem, QUANDO],
  );
  await m(
    `insert into especificacao_tecnica (id, demanda_id, versao, descricao_objetiva, escopo_inclui, escopo_exclui, duvidas_em_aberto, autor_tipo, autor_id, rascunho_agente, criada_em) values ($1, $2, 1, 'x', '[]', '[]', '[]', 'pessoa', 'u-ficticio', false, $3)`,
    [`ESP-${dem}-v1`, dem, QUANDO],
  );
  await m(
    `insert into parecer_risco (id, demanda_id, versao, resumo, risco_tecnico_nivel, risco_operacional_nivel, risco_juridico_nivel, autor_tipo, autor_id, rascunho_agente, criada_em) values ($1, $2, 1, 'Resumo ficticio', 'baixo', 'baixo', 'baixo', 'pessoa', 'u-ficticio', false, $3)`,
    [`RSK-${dem}-v1`, dem, QUANDO],
  );
  await m(
    `insert into pacote_decisao (id, demanda_id, versao, especificacao_id, especificacao_versao, parecer_risco_id, parecer_risco_versao, demanda_tipo, demanda_titulo, demanda_descricao, resumo_executivo, opcao_a, opcao_b, nivel_aprovacao_requerido, autor_tipo, autor_id, rascunho_agente, criada_em)
     values ($1, $2, 1, $3, 1, $4, 1, 'melhoria', 'Demanda ficticia', 'Contexto: ficticio', 'Resumo ficticio', '{"descricao":"A"}', '{"descricao":"B"}', 'cto', 'pessoa', 'u-ficticio', false, $5)`,
    [`DEC-${dem}-v1`, dem, `ESP-${dem}-v1`, `RSK-${dem}-v1`, QUANDO],
  );
  return { dem, dec: `DEC-${dem}-v1` };
}

async function andamento(dem: string, dec: string, fase: string, prontas: number, total: number, status = 'em_construcao') {
  await m(
    `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em) values ($1, $2, $3, $4, $5, $6, 'ficticio', $7)`,
    [dem, dec, fase, prontas, total, status, QUANDO],
  );
}

// Db sobre o pool do app que guarda as consultas que o Drizzle manda: o EXPLAIN roda sobre o SQL exato das funções.
async function consultasGeradas(fn: (db: Db) => Promise<unknown>): Promise<Array<{ sql: string; params: unknown[] }>> {
  const capturadas: Array<{ sql: string; params: unknown[] }> = [];
  const db: Db = drizzle(b.poolApp, { schema, casing: 'snake_case', logger: { logQuery: (sql, params) => capturadas.push({ sql, params }) } });
  await fn(db);
  return capturadas;
}

// A leitura do Awave (D-09) no formato que a T09 usa: a demanda com o último andamento juntado na mesma consulta.
const lerComSubconsulta = async (db: Db, id: string) => {
  const ua = subconsultaDoUltimoAndamento(db, id);
  const [l] = await db
    .select({ id: demanda.id, fase: ua.fase, tarefasProntas: ua.tarefasProntas, gravadoEm: ua.gravadoEm })
    .from(demanda)
    .leftJoin(ua, eq(ua.demandaId, demanda.id))
    .where(eq(demanda.id, id));
  return l;
};

let a: { dem: string; dec: string };
let semAndamento: { dem: string; dec: string };
beforeAll(async () => {
  b = await novoBanco();
  a = await demandaComDec(1);
  semAndamento = await demandaComDec(2);
  // Mesma data nas três: vale a ordem de gravação.
  await andamento(a.dem, a.dec, 'planejando', 0, 0);
  await andamento(a.dem, a.dec, 'construindo', 9, 17);
  await andamento(a.dem, a.dec, 'construindo', 3, 19);
  // Volume para o planejador decidir como em produção: 2.000 demandas (0003 a 2002), cada uma com ESP, RSK e DEC v1, e
  // os 200 DEC do RNF-01 (0003 a 0202) com 30 andamentos cada (6.000 linhas; o limite é 60 por DEC por hora). Com 2
  // linhas por DEC a tabela cabe em 5 páginas e a varredura completa sai mais barata que o índice, e o plano não diria
  // nada sobre a produção. Em lote, pelo migrator, com a mesma data em todas as linhas (vale a ordem de gravação).
  const dem = `'DEM-20261112-' || lpad(g::text, 4, '0')`;
  const serie = 'from generate_series(3, 2002) g';
  await m(
    `insert into demanda (id, titulo, tipo, solicitante_nome, autor_tipo, autor_id, criada_em, atualizada_em) select ${dem}, 'Demanda ficticia', 'melhoria', 'Pessoa Ficticia', 'pessoa', 'u-ficticio', $1, $1 ${serie}`,
    [QUANDO],
  );
  await m(
    `insert into especificacao_tecnica (id, demanda_id, versao, descricao_objetiva, escopo_inclui, escopo_exclui, duvidas_em_aberto, autor_tipo, autor_id, rascunho_agente, criada_em) select 'ESP-' || ${dem} || '-v1', ${dem}, 1, 'x', '[]', '[]', '[]', 'pessoa', 'u-ficticio', false, $1 ${serie}`,
    [QUANDO],
  );
  await m(
    `insert into parecer_risco (id, demanda_id, versao, resumo, risco_tecnico_nivel, risco_operacional_nivel, risco_juridico_nivel, autor_tipo, autor_id, rascunho_agente, criada_em) select 'RSK-' || ${dem} || '-v1', ${dem}, 1, 'Resumo ficticio', 'baixo', 'baixo', 'baixo', 'pessoa', 'u-ficticio', false, $1 ${serie}`,
    [QUANDO],
  );
  await m(
    `insert into pacote_decisao (id, demanda_id, versao, especificacao_id, especificacao_versao, parecer_risco_id, parecer_risco_versao, demanda_tipo, demanda_titulo, demanda_descricao, resumo_executivo, opcao_a, opcao_b, nivel_aprovacao_requerido, autor_tipo, autor_id, rascunho_agente, criada_em)
     select 'DEC-' || ${dem} || '-v1', ${dem}, 1, 'ESP-' || ${dem} || '-v1', 1, 'RSK-' || ${dem} || '-v1', 1, 'melhoria', 'Demanda ficticia', 'Contexto: ficticio', 'Resumo ficticio', '{"descricao":"A"}', '{"descricao":"B"}', 'cto', 'pessoa', 'u-ficticio', false, $1 ${serie}`,
    [QUANDO],
  );
  await m(
    `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em)
     select ${dem}, 'DEC-' || ${dem} || '-v1', 'testando', k, 30, 'em_construcao', 'ficticio', $1
     from generate_series(3, 202) g cross join generate_series(1, 30) k order by g, k`,
    [QUANDO],
  );
  await m('analyze demanda');
  await m('analyze andamento_construcao');
}, 120_000);
afterAll(async () => {
  await b.fechar();
});

describe('ultimoAndamento', () => {
  it('a linha de maior id, com os sete campos (sem id nem prefixo do token)', async () => {
    expect(await ultimoAndamento(b.db, a.dem)).toEqual({
      demandaId: a.dem,
      decId: a.dec,
      fase: 'construindo',
      tarefasProntas: 3,
      tarefasTotal: 19,
      statusConstrucao: 'em_construcao',
      gravadoEm: new Date(QUANDO),
    });
  });
  it('sem andamento: null; demanda que não existe: null', async () => {
    expect(await ultimoAndamento(b.db, semAndamento.dem)).toBeNull();
    expect(await ultimoAndamento(b.db, 'DEM-20261112-9999')).toBeNull();
  });
  it('uma consulta só, com o id como parâmetro', async () => {
    const consultas = await consultasGeradas((db) => ultimoAndamento(db, a.dem));
    expect(consultas).toHaveLength(1);
    expect(consultas[0]!.sql).toMatch(/^select /);
    expect(consultas[0]!.sql).not.toContain(a.dem);
    expect(consultas[0]!.params).toContain(a.dem);
  });
});

describe('andamentosDasDemandas', () => {
  it('o último de cada demanda pedida, numa consulta; sem andamento fica fora do mapa; lista vazia não consulta', async () => {
    const mapa = await andamentosDasDemandas(b.db, [a.dem, semAndamento.dem, 'DEM-20261112-0003']);
    expect([...mapa.keys()].sort()).toEqual([a.dem, 'DEM-20261112-0003']);
    expect(mapa.get(a.dem)).toEqual({
      demandaId: a.dem,
      decId: a.dec,
      fase: 'construindo',
      tarefasProntas: 3,
      tarefasTotal: 19,
      statusConstrucao: 'em_construcao',
      gravadoEm: new Date(QUANDO),
    });
    expect(mapa.get('DEM-20261112-0003')).toMatchObject({ fase: 'testando', tarefasProntas: 30, tarefasTotal: 30 });
    expect(await andamentosDasDemandas(b.db, [])).toEqual(new Map());
  });
  it('uma consulta por chamada, com ids repetidos uma vez só nos parâmetros; lista vazia não consulta', async () => {
    const consultas = await consultasGeradas((db) => andamentosDasDemandas(db, [a.dem, a.dem, 'DEM-20261112-0003']));
    expect(consultas).toHaveLength(1);
    expect(consultas[0]!.sql).not.toContain(a.dem);
    expect(consultas[0]!.params.filter((p) => p === a.dem)).toHaveLength(1);
    expect(await consultasGeradas((db) => andamentosDasDemandas(db, []))).toEqual([]);
  });
});

describe('subconsultaDoUltimoAndamento (D-09)', () => {
  it('junta na consulta da demanda: com andamento, os campos do último; sem, nulos; demanda que não existe, nada', async () => {
    expect(await lerComSubconsulta(b.db, a.dem)).toEqual({ id: a.dem, fase: 'construindo', tarefasProntas: 3, gravadoEm: new Date(QUANDO) });
    expect(await lerComSubconsulta(b.db, semAndamento.dem)).toEqual({ id: semAndamento.dem, fase: null, tarefasProntas: null, gravadoEm: null });
    expect(await lerComSubconsulta(b.db, 'DEM-20261112-9999')).toBeUndefined();
  });
  it('a leitura da demanda com o andamento é uma consulta só', async () => {
    expect(await consultasGeradas((db) => lerComSubconsulta(db, a.dem))).toHaveLength(1);
  });
});

// RNF-01: os planos das três leituras, sobre o SQL exato que as funções mandam (capturado pelo logger do Drizzle).
type NoDoPlano = { 'Node Type': string; 'Relation Name'?: string; 'Index Name'?: string; Plans?: NoDoPlano[] };
const nosDe = (no: NoDoPlano): NoDoPlano[] => [no, ...(no.Plans ?? []).flatMap(nosDe)];
async function planoDe(fn: (db: Db) => Promise<unknown>): Promise<{ nos: NoDoPlano[]; texto: string }> {
  const [c, ...resto] = await consultasGeradas(fn);
  expect(resto).toEqual([]);
  const json = await m(`explain (format json) ${c!.sql}`, c!.params);
  const texto = (await m(`explain ${c!.sql}`, c!.params)).rows.map((r) => r['QUERY PLAN'] as string).join('\n');
  process.stdout.write(`T06 plano\n${texto}\n`);
  return { nos: nosDe((json.rows[0]!['QUERY PLAN'] as Array<{ Plan: NoDoPlano }>)[0]!.Plan), texto };
}
const leAndamentoPor = (nos: NoDoPlano[]) => nos.filter((n) => n['Relation Name'] === 'andamento_construcao');

describe('planos (RNF-01)', () => {
  it('o último por demanda usa andamento_construcao_demanda_id_idx, sem varrer a tabela', async () => {
    const { nos, texto } = await planoDe((db) => ultimoAndamento(db, a.dem));
    expect(texto).toContain('andamento_construcao_demanda_id_idx');
    expect(leAndamentoPor(nos).map((n) => n['Node Type'])).not.toContain('Seq Scan');
  });
  it('a página usa andamento_construcao_demanda_id_idx, sem varrer a tabela', async () => {
    const { nos, texto } = await planoDe((db) => andamentosDasDemandas(db, [a.dem, 'DEM-20261112-0003']));
    expect(texto).toContain('andamento_construcao_demanda_id_idx');
    expect(leAndamentoPor(nos).map((n) => n['Node Type'])).not.toContain('Seq Scan');
  });
  it('a leitura com a subconsulta usa a chave da demanda e andamento_construcao_demanda_id_idx, sem varrer nenhuma das duas', async () => {
    const { nos, texto } = await planoDe((db) => lerComSubconsulta(db, a.dem));
    expect(texto).toContain('andamento_construcao_demanda_id_idx');
    expect(texto).toContain('demanda_pkey');
    expect(nos.filter((n) => n['Node Type'] === 'Seq Scan').map((n) => n['Relation Name'])).toEqual([]);
  });
});

// 06-T06-testes (qa-automacao). Fica no fim do arquivo e usa demandas próprias (3001 e 3002), fora das faixas acima,
// sem `analyze`: não muda os dados nem as estatísticas que os outros blocos leem.
describe('o último é a linha de maior id, não a de maior gravado_em (ADR-30)', () => {
  const ANTES = '2026-11-12T11:00:00Z';
  const DEPOIS = '2026-11-12T13:00:00Z';
  let x: { dem: string; dec: string };
  let y: { dem: string; dec: string };
  beforeAll(async () => {
    x = await demandaComDec(3001);
    y = await demandaComDec(3002);
    // O relógio injetado voltou: a segunda linha (maior id) tem data anterior à primeira.
    for (const [dem, dec] of [
      [x.dem, x.dec],
      [y.dem, y.dec],
    ] as const) {
      await m(
        `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em) values ($1, $2, 'testando', 5, 10, 'em_construcao', 'ficticio', $3)`,
        [dem, dec, DEPOIS],
      );
      await m(
        `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em) values ($1, $2, 'revisando_e_entregando', 10, 10, 'construido', 'ficticio', $3)`,
        [dem, dec, ANTES],
      );
    }
  });
  const esperado = (dem: string, dec: string) => ({
    demandaId: dem,
    decId: dec,
    fase: 'revisando_e_entregando',
    tarefasProntas: 10,
    tarefasTotal: 10,
    statusConstrucao: 'construido',
    gravadoEm: new Date(ANTES),
  });

  it('ultimoAndamento devolve a linha gravada por último, mesmo com data anterior', async () => {
    expect(await ultimoAndamento(b.db, x.dem)).toEqual(esperado(x.dem, x.dec));
  });
  it('andamentosDasDemandas devolve, para cada demanda, a linha gravada por último dela', async () => {
    const mapa = await andamentosDasDemandas(b.db, [y.dem, x.dem]);
    expect(mapa).toEqual(
      new Map([
        [y.dem, esperado(y.dem, y.dec)],
        [x.dem, esperado(x.dem, x.dec)],
      ]),
    );
  });
  it('a subconsulta do Awave devolve a linha gravada por último, mesmo com data anterior', async () => {
    expect(await lerComSubconsulta(b.db, x.dem)).toEqual({ id: x.dem, fase: 'revisando_e_entregando', tarefasProntas: 10, gravadoEm: new Date(ANTES) });
  });
});

describe('andamentosDasDemandas numa página cheia (ADR-16, RF-08)', () => {
  it('200 demandas com andamento, 10 sem e uma que não existe: 200 entradas, cada uma com o último da própria demanda, numa consulta', async () => {
    const comAndamento = Array.from({ length: 200 }, (_, i) => `DEM-20261112-${String(i + 3).padStart(4, '0')}`);
    const semNada = Array.from({ length: 10 }, (_, i) => `DEM-20261112-${String(i + 203).padStart(4, '0')}`);
    const ids = [...semNada, 'DEM-20261112-9999', ...[...comAndamento].reverse()];
    let mapa = new Map<string, unknown>();
    const consultas = await consultasGeradas(async (db) => {
      mapa = await andamentosDasDemandas(db, ids);
    });
    expect(consultas).toHaveLength(1);
    expect([...mapa.keys()].sort()).toEqual(comAndamento);
    for (const dem of comAndamento) {
      expect(mapa.get(dem), dem).toEqual({
        demandaId: dem,
        decId: `DEC-${dem}-v1`,
        fase: 'testando',
        tarefasProntas: 30,
        tarefasTotal: 30,
        statusConstrucao: 'em_construcao',
        gravadoEm: new Date(QUANDO),
      });
    }
  });
});
