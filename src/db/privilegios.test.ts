// Guarda da ADR-03 (C-34): o papel do app tem exatamente os privilégios de PRIVILEGIOS, nada a mais. Roda no CI.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { PAPEL_APP, PRIVILEGIOS, SEQUENCIAS } from './privilegios';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});
const q = async (sql: string, p: unknown[] = []) => (await b.poolMigrator.query(sql, p)).rows;

describe('guarda de privilégios do orquestrador_app (C-34)', () => {
  it('toda tabela do esquema public tem regra, e toda regra tem tabela', async () => {
    const tabelas = (await q(`select tablename from pg_tables where schemaname = 'public' order by 1`)).map((r) => r.tablename);
    expect(tabelas.sort()).toEqual(PRIVILEGIOS.map((r) => r.tabela).sort());
  });

  it('privilégios de tabela são exatamente os da regra (sem TRUNCATE, TRIGGER, REFERENCES)', async () => {
    for (const r of PRIVILEGIOS) {
      const tem = (
        await q(
          `select privilege_type from information_schema.table_privileges where grantee = $1 and table_schema = 'public' and table_name = $2`,
          [PAPEL_APP, r.tabela],
        )
      )
        .map((x) => x.privilege_type)
        .sort();
      expect(tem, r.tabela).toEqual([...r.privilegios].sort());
    }
  });

  it('UPDATE por coluna só nas colunas listadas', async () => {
    for (const r of PRIVILEGIOS.filter((x) => x.colunasUpdate)) {
      const cols = (
        await q(
          `select column_name from information_schema.column_privileges where grantee = $1 and table_schema = 'public' and table_name = $2 and privilege_type = 'UPDATE'`,
          [PAPEL_APP, r.tabela],
        )
      )
        .map((x) => x.column_name)
        .sort();
      expect(cols, r.tabela).toEqual([...r.colunasUpdate!].sort());
    }
  });

  it('nenhum privilégio por coluna além da regra (um GRANT UPDATE (coluna) esquecido quebra a imutabilidade)', async () => {
    for (const r of PRIVILEGIOS) {
      const porColuna = await q(
        `select privilege_type, column_name from information_schema.column_privileges where grantee = $1 and table_schema = 'public' and table_name = $2`,
        [PAPEL_APP, r.tabela],
      );
      const alemDaTabela = porColuna
        .filter((x) => !(r.privilegios as string[]).includes(x.privilege_type))
        .map((x) => `${x.privilege_type}:${x.column_name}`)
        .sort();
      const esperado = (r.colunasUpdate ?? []).map((c) => `UPDATE:${c}`).sort();
      expect(alemDaTabela, r.tabela).toEqual(esperado);
    }
  });

  it('PUBLIC não tem privilégio em tabela do esquema public', async () => {
    expect(await q(`select table_name, privilege_type from information_schema.table_privileges where grantee = 'PUBLIC' and table_schema = 'public'`)).toEqual([]);
  });

  it('o papel do app não é dono de nada, não é superusuário e não cria esquema, banco ou papel', async () => {
    expect(await q(`select relname from pg_class c join pg_roles r on r.oid = c.relowner where r.rolname = $1`, [PAPEL_APP])).toEqual([]);
    const [papel] = await q(`select rolsuper, rolcreaterole, rolcreatedb from pg_roles where rolname = $1`, [PAPEL_APP]);
    expect(papel).toEqual({ rolsuper: false, rolcreaterole: false, rolcreatedb: false });
    const [esq] = await q(`select has_schema_privilege($1, 'public', 'CREATE') as cria`, [PAPEL_APP]);
    expect(esq.cria).toBe(false);
  });

  it('sequências só com USAGE', async () => {
    for (const s of SEQUENCIAS) {
      const [r] = await q(
        `select has_sequence_privilege($1, $2, 'USAGE') as usa, has_sequence_privilege($1, $2, 'UPDATE') as altera`,
        [PAPEL_APP, s.nome],
      );
      expect(r, s.nome).toEqual({ usa: true, altera: false });
    }
  });

  it('o app lê o registro de migrations (saúde, ADR-12)', async () => {
    const r = await b.poolApp.query('select count(*) from drizzle.__drizzle_migrations');
    expect(Number(r.rows[0].count)).toBeGreaterThan(0);
  });

  it('o app não altera o registro de migrations', async () => {
    await expect(b.poolApp.query('delete from drizzle.__drizzle_migrations')).rejects.toMatchObject({ code: '42501' });
  });

  it('evento: UPDATE, DELETE e TRUNCATE recusados com o papel do app (CA-21.2)', async () => {
    await b.poolApp.query(
      `insert into evento (ocorrido_em, ator_tipo, ator_id, entidade, entidade_id, acao) values (now(), 'sistema', 'sistema', 'teste', 'x', 'teste')`,
    );
    for (const sql of ['update evento set acao = $1', 'delete from evento', 'truncate evento']) {
      await expect(b.poolApp.query(sql, sql.includes('$1') ? ['outra'] : []), sql).rejects.toMatchObject({ code: '42501' });
    }
  });

  it('token_servico: o app só revoga; não troca hash nem agente, nem apaga', async () => {
    for (const sql of ["update token_servico set hash = 'x'", "update token_servico set agente = 'risco'", 'delete from token_servico']) {
      await expect(b.poolApp.query(sql), sql).rejects.toMatchObject({ code: '42501' });
    }
    await b.poolApp.query('update token_servico set revogado_em = now() where false');
  });
});
