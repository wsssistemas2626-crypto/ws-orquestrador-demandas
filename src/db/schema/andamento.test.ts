// src/db/schema/andamento.test.ts — AN-10, RNF-05, ADR-30, CA-04.6: a forma do andamento vale no banco, e o papel do
// app só lê e inclui. Postgres real; dados fictícios; prefixo fictício `ficticio`. T01 do pedido DEC-DEM-20261111-0017-v1.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { FASES_ANDAMENTO, STATUS_CONSTRUCAO } from './andamento';

let b: BancoDeTeste;
const DEM = 'DEM-20261112-0701';
const DEC = `DEC-${DEM}-v1`;
const QUANDO = '2026-11-12T12:00:00Z';
const m = (s: string, p: unknown[] = []) => b.poolMigrator.query(s, p);

beforeAll(async () => {
  b = await novoBanco();
  await m(
    `insert into demanda (id, titulo, tipo, solicitante_nome, autor_tipo, autor_id, criada_em, atualizada_em) values ($1, 'Demanda ficticia', 'melhoria', 'Pessoa Ficticia', 'pessoa', 'u-ficticio', $2, $2)`,
    [DEM, QUANDO],
  );
  await m(
    `insert into especificacao_tecnica (id, demanda_id, versao, descricao_objetiva, escopo_inclui, escopo_exclui, duvidas_em_aberto, autor_tipo, autor_id, rascunho_agente, criada_em) values ($1, $2, 1, 'x', '[]', '[]', '[]', 'pessoa', 'u-ficticio', false, $3)`,
    [`ESP-${DEM}-v1`, DEM, QUANDO],
  );
  await m(
    `insert into parecer_risco (id, demanda_id, versao, resumo, risco_tecnico_nivel, risco_operacional_nivel, risco_juridico_nivel, autor_tipo, autor_id, rascunho_agente, criada_em) values ($1, $2, 1, 'Resumo ficticio', 'baixo', 'baixo', 'baixo', 'pessoa', 'u-ficticio', false, $3)`,
    [`RSK-${DEM}-v1`, DEM, QUANDO],
  );
  await m(
    `insert into pacote_decisao (id, demanda_id, versao, especificacao_id, especificacao_versao, parecer_risco_id, parecer_risco_versao, demanda_tipo, demanda_titulo, demanda_descricao, resumo_executivo, opcao_a, opcao_b, nivel_aprovacao_requerido, autor_tipo, autor_id, rascunho_agente, criada_em)
     values ($1, $2, 1, $3, 1, $4, 1, 'melhoria', 'Demanda ficticia', 'Contexto: ficticio', 'Resumo ficticio', '{"descricao":"A"}', '{"descricao":"B"}', 'cto', 'pessoa', 'u-ficticio', false, $5)`,
    [DEC, DEM, `ESP-${DEM}-v1`, `RSK-${DEM}-v1`, QUANDO],
  );
});
afterAll(async () => {
  await b.fechar();
});

type Linha = { demanda: string; dec: string; fase: string; prontas: unknown; total: unknown; status: string; prefixo: string };
const VALIDA: Linha = { demanda: DEM, dec: DEC, fase: 'construindo', prontas: 9, total: 17, status: 'em_construcao', prefixo: 'ficticio' };
const inserir = (l: Partial<Linha> = {}) => {
  const x = { ...VALIDA, ...l };
  return b.poolApp.query(
    `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em) values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [x.demanda, x.dec, x.fase, x.prontas, x.total, x.status, x.prefixo, QUANDO],
  );
};
const viola = (constraint: string) => expect.objectContaining({ code: '23514', constraint });

describe('andamento_construcao: a forma no banco (AN-10)', () => {
  it('o papel do app inclui a linha válida, e as bordas 0/0 e 999/999', async () => {
    await expect(inserir()).resolves.toBeDefined();
    await expect(inserir({ prontas: 0, total: 0 })).resolves.toBeDefined();
    await expect(inserir({ prontas: 999, total: 999 })).resolves.toBeDefined();
  });
  it.each([
    [{ fase: 'Construindo' }, 'andamento_construcao_fase_check'],
    [{ fase: '' }, 'andamento_construcao_fase_check'],
    [{ status: 'entregue' }, 'andamento_construcao_status_construcao_check'],
    [{ prontas: 10, total: 9 }, 'andamento_construcao_tarefas_check'],
    [{ prontas: -1 }, 'andamento_construcao_tarefas_check'],
    [{ prontas: 0, total: 1000 }, 'andamento_construcao_tarefas_check'],
    [{ prefixo: 'curto' }, 'andamento_construcao_ator_token_prefixo_check'],
    [{ prefixo: 'abc!defg' }, 'andamento_construcao_ator_token_prefixo_check'],
  ] as const)('CHECK recusa %o', async (l, nome) => {
    await expect(inserir(l as Partial<Linha>)).rejects.toEqual(viola(nome));
  });
  it('o CHECK do dec_id recusa id fora do formato (conferido pelo migrator, sem FK no caminho)', async () => {
    const { rows } = await m(`select pg_get_constraintdef(oid) as d from pg_constraint where conname = 'andamento_construcao_dec_id_check'`);
    expect(rows[0]?.d).toContain('^DEC-DEM-[0-9]{8}-[0-9]{4}-v[0-9]{1,4}$');
  });
  it('FKs para demanda e pacote_decisao, sem ON DELETE CASCADE (23503 com id que não existe)', async () => {
    await expect(inserir({ demanda: 'DEM-20261112-9999' })).rejects.toMatchObject({ code: '23503' });
    await expect(inserir({ dec: 'DEC-DEM-20261112-9999-v1' })).rejects.toMatchObject({ code: '23503' });
    const { rows } = await m(`select confdeltype from pg_constraint where conrelid = 'andamento_construcao'::regclass and contype = 'f'`);
    expect(rows.map((r) => r.confdeltype)).toEqual(['a', 'a']);
  });
  it('fonte única: os CHECKs de fase e de status listam exatamente FASES_ANDAMENTO e STATUS_CONSTRUCAO', async () => {
    const def = async (nome: string) => (await m(`select pg_get_constraintdef(oid) as d from pg_constraint where conname = $1`, [nome])).rows[0]!.d as string;
    const valores = (d: string) => [...d.matchAll(/'([a-z_]+)'::text/g)].map((x) => x[1]).sort();
    expect(valores(await def('andamento_construcao_fase_check'))).toEqual([...FASES_ANDAMENTO].sort());
    expect(valores(await def('andamento_construcao_status_construcao_check'))).toEqual([...STATUS_CONSTRUCAO].sort());
  });
  it('índices (demanda_id, id), (dec_id, gravado_em) e (gravado_em)', async () => {
    const { rows } = await m(`select indexname, indexdef from pg_indexes where tablename = 'andamento_construcao' order by 1`);
    const def = Object.fromEntries(rows.map((r) => [r.indexname, r.indexdef]));
    expect(def.andamento_construcao_demanda_id_idx).toMatch(/\(demanda_id, id\)/);
    expect(def.andamento_construcao_dec_gravado_idx).toMatch(/\(dec_id, gravado_em\)/);
    expect(def.andamento_construcao_gravado_idx).toMatch(/\(gravado_em\)/);
  });
});

describe('andamento_construcao: só de inclusão para o app (AN-10, C-34)', () => {
  const retrato = async () => (await m(`select coalesce(jsonb_agg(to_jsonb(t) order by t.id), '[]'::jsonb)::text as f from andamento_construcao t`)).rows[0]!.f as string;
  it.each([
    ['update andamento_construcao set fase = $1', ['testando']],
    ['update andamento_construcao set tarefas_prontas = 0', []],
    ['update andamento_construcao set ator_token_prefixo = $1', ['outro123']],
    ['delete from andamento_construcao', []],
    ['truncate andamento_construcao', []],
  ])('"%s" recusado (42501) com linhas gravadas, e nada muda', async (sql, p) => {
    await inserir();
    const antes = await retrato();
    await expect(b.poolApp.query(sql, p)).rejects.toMatchObject({ code: '42501' });
    expect(await retrato()).toBe(antes);
  });
  it('o app não usa a sequência da identidade (nextval recusado), e o INSERT não precisa dela', async () => {
    await expect(b.poolApp.query(`select nextval('andamento_construcao_id_seq')`)).rejects.toMatchObject({ code: '42501' });
  });
  it('nada novo em demanda nem em evento: as colunas são as de 0ac099a', async () => {
    const { rows } = await m(
      `select table_name, count(*)::int as n from information_schema.columns where table_schema = 'public' and table_name in ('demanda', 'evento') group by 1 order by 1`,
    );
    // Os números de 0ac099a, contados em src/db/schema/demandas.ts e historico.ts (e conferidos no
    // drizzle/meta/0007_snapshot.json): demanda tem 19 colunas, evento tem 11.
    expect(rows).toEqual([
      { table_name: 'demanda', n: 19 },
      { table_name: 'evento', n: 11 },
    ]);
  });
});
