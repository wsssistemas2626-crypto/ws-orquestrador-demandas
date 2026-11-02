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

// Testes da etapa 06-T04-testes (qa-automacao): a guarda acima confere a lista de privilégios; estes conferem o que o
// papel do app de fato consegue fazer, e fecham os lados que a lista não cobre (esquemas, banco, sequências, registro
// de migrations).
describe('guarda de privilégios: DDL, esquemas, sequências e registro de migrations (C-34, ADR-03, ADR-12)', () => {
  // Esquemas do usuário: fora os do catálogo do Postgres (pg_catalog, pg_toast, information_schema).
  const ESQUEMAS_DO_USUARIO = `select nspname from pg_namespace where nspname not like 'pg\\_%' and nspname <> 'information_schema'`;

  it('o app tem USAGE só em public, drizzle e pgboss (T07), e CREATE em nenhum esquema nem no banco', async () => {
    const usa = (await q(`${ESQUEMAS_DO_USUARIO} and has_schema_privilege($1, oid, 'USAGE') order by 1`, [PAPEL_APP])).map((r) => r.nspname);
    expect(usa).toEqual(['drizzle', 'pgboss', 'public']);
    const cria = await q(`${ESQUEMAS_DO_USUARIO} and has_schema_privilege($1, oid, 'CREATE')`, [PAPEL_APP]);
    expect(cria).toEqual([]);
    const [banco] = await q(`select has_database_privilege($1, current_database(), 'CREATE') as cria`, [PAPEL_APP]);
    expect(banco.cria).toBe(false);
  });

  it('o app não é dono de esquema nem do banco', async () => {
    expect(await q(`select nspname from pg_namespace n join pg_roles r on r.oid = n.nspowner where r.rolname = $1`, [PAPEL_APP])).toEqual([]);
    expect(await q(`select datname from pg_database d join pg_roles r on r.oid = d.datdba where r.rolname = $1`, [PAPEL_APP])).toEqual([]);
  });

  it.each([
    ['criar tabela', 'create table public.t_qa (id int)'],
    ['criar esquema', 'create schema qa_esquema'],
    ['acrescentar coluna em evento', 'alter table evento add column qa int'],
    ['apagar a tabela evento', 'drop table evento'],
    ['criar índice em evento', 'create index evento_qa_idx on evento (acao)'],
    ['criar gatilho em user', 'create trigger qa_gatilho before update on "user" for each row execute function suppress_redundant_updates_trigger()'],
    ['criar função em public', 'create function public.qa_fn() returns int language sql as $$ select 1 $$'],
    ['criar tabela no esquema drizzle', 'create table drizzle.t_qa (id int)'],
  ])('o papel do app não faz DDL: %s é recusado (42501)', async (_nome, sql) => {
    await expect(b.poolApp.query(sql)).rejects.toMatchObject({ code: '42501' });
  });

  it('TRUNCATE é recusado ao app em toda tabela da regra, mutável ou não (42501)', async () => {
    for (const r of PRIVILEGIOS) {
      await expect(b.poolApp.query(`truncate "${r.tabela}"`), r.tabela).rejects.toMatchObject({ code: '42501' });
    }
  });

  it('toda sequência de public fora de SEQUENCIAS fica sem privilégio do app, e toda entrada de SEQUENCIAS existe', async () => {
    const sequencias = (await q(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where c.relkind = 'S' and n.nspname = 'public' order by 1`)).map((r) => r.relname as string);
    // Hoje só a identidade de evento; a T05 traz a demanda_seq (com USAGE, em SEQUENCIAS).
    expect(sequencias).toContain('evento_id_seq');
    const listadas = SEQUENCIAS.map((s) => s.nome);
    for (const nome of listadas) expect(sequencias, nome).toContain(nome);
    for (const nome of sequencias) {
      const [r] = await q(
        `select has_sequence_privilege($1, $2, 'USAGE') as usa, has_sequence_privilege($1, $2, 'SELECT') as le, has_sequence_privilege($1, $2, 'UPDATE') as altera`,
        [PAPEL_APP, `public.${nome}`],
      );
      expect(r, nome).toEqual({ usa: listadas.includes(nome), le: false, altera: false });
    }
  });

  it('o app não mexe na sequência da identidade de evento: nextval e setval recusados (42501)', async () => {
    await expect(b.poolApp.query(`select nextval('evento_id_seq')`)).rejects.toMatchObject({ code: '42501' });
    await expect(b.poolApp.query(`select setval('evento_id_seq', 1000)`)).rejects.toMatchObject({ code: '42501' });
  });

  it('no registro de migrations o app tem só SELECT: INSERT, UPDATE e TRUNCATE também recusados', async () => {
    const tem = (await q(`select privilege_type from information_schema.table_privileges where grantee = $1 and table_schema = 'drizzle'`, [PAPEL_APP])).map((r) => r.privilege_type);
    expect(tem).toEqual(['SELECT']);
    for (const sql of [
      `insert into drizzle.__drizzle_migrations (hash, created_at) values ('qa', 1)`,
      `update drizzle.__drizzle_migrations set hash = 'qa'`,
      'truncate drizzle.__drizzle_migrations',
    ]) {
      await expect(b.poolApp.query(sql), sql).rejects.toMatchObject({ code: '42501' });
    }
  });

  it('o app faz o CRUD das tabelas do Better Auth e do bloqueio (privilégio dado de fato, não só listado)', async () => {
    await b.poolApp.query(`insert into "user" (id, name, email, papel) values ('u-qa-crud', 'Pessoa Ficticia', 'crud@exemplo.test', 'cto')`);
    await b.poolApp.query(`insert into bloqueio_verificacao (usuario_id) values ('u-qa-crud')`);
    await b.poolApp.query(`update bloqueio_verificacao set falhas = 3 where usuario_id = 'u-qa-crud'`);
    await b.poolApp.query(`update "user" set name = 'Pessoa Ficticia Dois' where id = 'u-qa-crud'`);
    const [u] = (await b.poolApp.query(`select name from "user" where id = 'u-qa-crud'`)).rows;
    expect(u.name).toBe('Pessoa Ficticia Dois');
    await b.poolApp.query(`delete from bloqueio_verificacao where usuario_id = 'u-qa-crud'`);
    await b.poolApp.query(`delete from "user" where id = 'u-qa-crud'`);
    expect((await b.poolApp.query(`select 1 from "user" where id = 'u-qa-crud'`)).rows).toEqual([]);
  });
});

// T07: o esquema do pg-boss é do migrator (instalarFilas, em scripts/migrate.ts). O app usa a fila sem DDL (T-02).
describe('esquema pgboss: criado pelo migrator, usado pelo app sem DDL (T07, C-34)', () => {
  it('o esquema pgboss existe e é do migrator, não do app', async () => {
    const [esq] = await q(`select r.rolname as dono from pg_namespace n join pg_roles r on r.oid = n.nspowner where n.nspname = 'pgboss'`);
    expect(esq).toBeDefined();
    expect(esq.dono).not.toBe(PAPEL_APP);
  });

  it('o app não tem CREATE no esquema pgboss', async () => {
    const [esq] = await q(`select has_schema_privilege($1, 'pgboss', 'CREATE') as cria`, [PAPEL_APP]);
    expect(esq.cria).toBe(false);
  });

  it('nenhum objeto do esquema pgboss é do app', async () => {
    expect(
      await q(`select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace join pg_roles r on r.oid = c.relowner where n.nspname = 'pgboss' and r.rolname = $1`, [PAPEL_APP]),
    ).toEqual([]);
    expect(
      await q(`select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_roles r on r.oid = p.proowner where n.nspname = 'pgboss' and r.rolname = $1`, [PAPEL_APP]),
    ).toEqual([]);
  });

  it('o app tem SELECT, INSERT, UPDATE e DELETE nas tabelas do pgboss, sem TRUNCATE, TRIGGER nem REFERENCES', async () => {
    const tabelas = (await q(`select tablename from pg_tables where schemaname = 'pgboss' order by 1`)).map((r) => r.tablename as string);
    expect(tabelas).toContain('job');
    expect(tabelas).toContain('queue');
    for (const t of tabelas) {
      const tem = (
        await q(`select privilege_type from information_schema.table_privileges where grantee = $1 and table_schema = 'pgboss' and table_name = $2`, [PAPEL_APP, t])
      )
        .map((x) => x.privilege_type)
        .sort();
      expect(tem, t).toEqual(['DELETE', 'INSERT', 'SELECT', 'UPDATE']);
    }
  });

  it('PUBLIC não tem privilégio em tabela do esquema pgboss', async () => {
    expect(await q(`select table_name, privilege_type from information_schema.table_privileges where grantee = 'PUBLIC' and table_schema = 'pgboss'`)).toEqual([]);
  });

  it.each([
    ['criar tabela no esquema pgboss', 'create table pgboss.t_qa (id int)'],
    ['acrescentar coluna em pgboss.job', 'alter table pgboss.job add column qa int'],
    ['apagar a tabela pgboss.queue', 'drop table pgboss.queue'],
    ['criar índice em pgboss.job', 'create index job_qa_idx on pgboss.job (name)'],
    ['esvaziar pgboss.job', 'truncate pgboss.job'],
  ])('o papel do app não faz DDL no pgboss: %s é recusado (42501)', async (_nome, sql) => {
    await expect(b.poolApp.query(sql)).rejects.toMatchObject({ code: '42501' });
  });
});
