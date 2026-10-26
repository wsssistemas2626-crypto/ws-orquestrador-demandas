// Restrições das tabelas de acesso (T04), provadas com o papel do app no Postgres real. Dados só fictícios.
// Testes da etapa 06-T04-testes (qa-automacao).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

const app = (sql: string, p: unknown[] = []) => b.poolApp.query(sql, p);
const CRIADO_EM = '2026-10-22T12:00:00Z';

let seq = 0;
const novoUsuario = async (papel: string = 'cto') => {
  seq += 1;
  const id = `u-qa-${seq}`;
  await app(`insert into "user" (id, name, email, papel) values ($1, 'Pessoa Ficticia', $2, $3)`, [id, `pessoa${seq}@exemplo.test`, papel]);
  return id;
};

describe('user (Better Auth com papel)', () => {
  it('aceita os papéis cto e administradora', async () => {
    const cto = await novoUsuario('cto');
    const adm = await novoUsuario('administradora');
    const r = await app(`select id, papel, two_factor_enabled, email_verified, desativado_em from "user" where id = any($1) order by papel`, [[cto, adm]]);
    expect(r.rows).toEqual([
      { id: adm, papel: 'administradora', two_factor_enabled: false, email_verified: false, desativado_em: null },
      { id: cto, papel: 'cto', two_factor_enabled: false, email_verified: false, desativado_em: null },
    ]);
  });

  it.each(['admin', 'CTO', '', 'agente'])('recusa papel fora da lista (%j): 23514', async (papel) => {
    await expect(novoUsuario(papel)).rejects.toMatchObject({ code: '23514', constraint: 'user_papel_check' });
  });

  it('recusa conta sem papel: 23502', async () => {
    await expect(app(`insert into "user" (id, name, email) values ('u-qa-sem-papel', 'Pessoa Ficticia', 'sem.papel@exemplo.test')`)).rejects.toMatchObject({
      code: '23502',
    });
  });

  it('e-mail é único: 23505', async () => {
    await app(`insert into "user" (id, name, email, papel) values ('u-qa-email-1', 'Pessoa Ficticia', 'repetido@exemplo.test', 'cto')`);
    await expect(
      app(`insert into "user" (id, name, email, papel) values ('u-qa-email-2', 'Pessoa Ficticia', 'repetido@exemplo.test', 'administradora')`),
    ).rejects.toMatchObject({ code: '23505', constraint: 'user_email_unique' });
  });
});

describe('session, account, two_factor e bloqueio_verificacao', () => {
  it('sessão: token único (23505) e usuário existente (23503)', async () => {
    const u = await novoUsuario();
    await app(`insert into session (id, expires_at, token, user_id) values ('s-qa-1', $1, 'token-ficticio-1', $2)`, [CRIADO_EM, u]);
    await expect(app(`insert into session (id, expires_at, token, user_id) values ('s-qa-2', $1, 'token-ficticio-1', $2)`, [CRIADO_EM, u])).rejects.toMatchObject({
      code: '23505',
      constraint: 'session_token_unique',
    });
    await expect(
      app(`insert into session (id, expires_at, token, user_id) values ('s-qa-3', $1, 'token-ficticio-3', 'u-qa-inexistente')`, [CRIADO_EM]),
    ).rejects.toMatchObject({ code: '23503' });
  });

  it('apagar a conta apaga em cascata sessão, conta de login, two_factor e bloqueio', async () => {
    const u = await novoUsuario();
    await app(`insert into session (id, expires_at, token, user_id) values ('s-qa-cascata', $1, 'token-ficticio-cascata', $2)`, [CRIADO_EM, u]);
    await app(`insert into account (id, account_id, provider_id, user_id) values ('a-qa-cascata', $1, 'credential', $1)`, [u]);
    await app(`insert into two_factor (id, secret, backup_codes, user_id) values ('tf-qa-cascata', 'segredo-ficticio-cifrado', 'codigos-ficticios', $1)`, [u]);
    await app(`insert into bloqueio_verificacao (usuario_id) values ($1)`, [u]);
    await app(`delete from "user" where id = $1`, [u]);
    for (const [tabela, coluna] of [
      ['session', 'user_id'],
      ['account', 'user_id'],
      ['two_factor', 'user_id'],
      ['bloqueio_verificacao', 'usuario_id'],
    ] as const) {
      expect((await app(`select 1 from ${tabela} where ${coluna} = $1`, [u])).rows, tabela).toEqual([]);
    }
  });

  it('bloqueio_verificacao: falhas começa em 0, sem janela nem bloqueio, e não aceita negativo (23514)', async () => {
    const u = await novoUsuario();
    await app(`insert into bloqueio_verificacao (usuario_id) values ($1)`, [u]);
    const [r] = (await app(`select falhas, janela_inicio, bloqueado_ate from bloqueio_verificacao where usuario_id = $1`, [u])).rows;
    expect(r).toEqual({ falhas: 0, janela_inicio: null, bloqueado_ate: null });
    await expect(app(`update bloqueio_verificacao set falhas = -1 where usuario_id = $1`, [u])).rejects.toMatchObject({
      code: '23514',
      constraint: 'bloqueio_verificacao_falhas_check',
    });
  });

  it('bloqueio_verificacao: um por conta (23505) e só de conta existente (23503)', async () => {
    const u = await novoUsuario();
    await app(`insert into bloqueio_verificacao (usuario_id) values ($1)`, [u]);
    await expect(app(`insert into bloqueio_verificacao (usuario_id) values ($1)`, [u])).rejects.toMatchObject({ code: '23505' });
    await expect(app(`insert into bloqueio_verificacao (usuario_id) values ('u-qa-inexistente')`)).rejects.toMatchObject({ code: '23503' });
  });
});

describe('token_servico (C-09)', () => {
  const inserir = (agente: string, hash: string, criadoEm: string | null = CRIADO_EM) =>
    criadoEm === null
      ? app(`insert into token_servico (agente, hash, prefixo) values ($1, $2, 'wsod_qa0')`, [agente, hash])
      : app(`insert into token_servico (agente, hash, prefixo, criado_em) values ($1, $2, 'wsod_qa0', $3) returning id`, [agente, hash, criadoEm]);

  it.each(['orquestrador', 'insumo_tecnico', 'risco', 'consolidacao'])('aceita o agente %s, com id uuid gerado pelo banco', async (agente) => {
    const r = await inserir(agente, `hash-ficticio-${agente}`);
    expect(r.rows[0].id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it.each(['outro', 'Risco', '', 'pessoa'])('recusa agente fora da lista (%j): 23514', async (agente) => {
    await expect(inserir(agente, `hash-ficticio-recusado-${agente}`)).rejects.toMatchObject({ code: '23514', constraint: 'token_servico_agente_check' });
  });

  it('hash é único: 23505', async () => {
    await inserir('risco', 'hash-ficticio-repetido');
    await expect(inserir('consolidacao', 'hash-ficticio-repetido')).rejects.toMatchObject({ code: '23505', constraint: 'token_servico_hash_unique' });
  });

  it('criado_em não tem padrão no banco: sem a data do Relogio, a inclusão é recusada (23502, G3.4)', async () => {
    await expect(inserir('risco', 'hash-ficticio-sem-data', null)).rejects.toMatchObject({ code: '23502' });
  });

  it('o app revoga de fato: grava revogado_em e mantém hash, agente e prefixo', async () => {
    const { rows } = await inserir('orquestrador', 'hash-ficticio-revogado');
    const id = rows[0].id;
    await app(`update token_servico set revogado_em = $1 where id = $2`, ['2026-10-23T09:00:00Z', id]);
    const [r] = (await app(`select agente, hash, prefixo, criado_em, revogado_em from token_servico where id = $1`, [id])).rows;
    expect(r).toEqual({
      agente: 'orquestrador',
      hash: 'hash-ficticio-revogado',
      prefixo: 'wsod_qa0',
      criado_em: new Date(CRIADO_EM),
      revogado_em: new Date('2026-10-23T09:00:00Z'),
    });
  });
});

describe('modelo físico', () => {
  it('toda coluna de data do esquema public é timestamptz', async () => {
    const r = await b.poolMigrator.query(
      `select table_name, column_name, data_type from information_schema.columns where table_schema = 'public' and data_type like 'timestamp%' and data_type <> 'timestamp with time zone'`,
    );
    expect(r.rows).toEqual([]);
  });

  it('as colunas de FK do Better Auth e o identifier da verificação têm índice', async () => {
    const r = await b.poolMigrator.query(`select indexname, indexdef from pg_indexes where schemaname = 'public' and indexname = any($1) order by 1`, [
      ['account_user_id_idx', 'session_user_id_idx', 'two_factor_user_id_idx', 'verification_identifier_idx'],
    ]);
    expect(r.rows.map((x) => [x.indexname, /\((\w+)\)$/.exec(x.indexdef)?.[1]])).toEqual([
      ['account_user_id_idx', 'user_id'],
      ['session_user_id_idx', 'user_id'],
      ['two_factor_user_id_idx', 'user_id'],
      ['verification_identifier_idx', 'identifier'],
    ]);
  });
});

describe('two_factor: colunas do plugin twoFactor do Better Auth 1.7.6 (T47)', () => {
  it('tem verified, failed_verification_count e locked_until com os tipos e padrões', async () => {
    const r = await b.poolMigrator.query(
      `select column_name, data_type, is_nullable, column_default from information_schema.columns
        where table_schema = 'public' and table_name = 'two_factor' and column_name = any($1) order by column_name`,
      [['failed_verification_count', 'locked_until', 'verified']],
    );
    expect(r.rows).toEqual([
      { column_name: 'failed_verification_count', data_type: 'integer', is_nullable: 'NO', column_default: '0' },
      { column_name: 'locked_until', data_type: 'timestamp with time zone', is_nullable: 'YES', column_default: null },
      { column_name: 'verified', data_type: 'boolean', is_nullable: 'YES', column_default: 'true' },
    ]);
  });

  it('linha gravada sem as colunas novas nasce verificada, com zero falhas e sem bloqueio', async () => {
    const u = await novoUsuario();
    await app(`insert into two_factor (id, secret, backup_codes, user_id) values ('tf-qa-t47-a', 'segredo-ficticio-cifrado', 'codigos-ficticios', $1)`, [u]);
    const [r] = (await app(`select verified, failed_verification_count, locked_until from two_factor where id = 'tf-qa-t47-a'`)).rows;
    expect(r).toEqual({ verified: true, failed_verification_count: 0, locked_until: null });
  });

  it('o app grava falha e bloqueio, e a contagem não fica negativa (23514)', async () => {
    const u = await novoUsuario();
    await app(`insert into two_factor (id, secret, backup_codes, user_id, verified) values ('tf-qa-t47-b', 'segredo-ficticio-cifrado', 'codigos-ficticios', $1, false)`, [u]);
    await app(`update two_factor set failed_verification_count = 5, locked_until = $1 where id = 'tf-qa-t47-b'`, ['2026-10-22T12:15:00Z']);
    const [r] = (await app(`select verified, failed_verification_count, locked_until from two_factor where id = 'tf-qa-t47-b'`)).rows;
    expect(r).toEqual({ verified: false, failed_verification_count: 5, locked_until: new Date('2026-10-22T12:15:00Z') });
    await expect(app(`update two_factor set failed_verification_count = -1 where id = 'tf-qa-t47-b'`)).rejects.toMatchObject({
      code: '23514',
      constraint: 'two_factor_failed_verification_count_check',
    });
  });
});

// Testes da etapa 06-T47-testes (qa-automacao): bordas das colunas novas e o papel do app sem DDL sobre elas (C-34).
describe('two_factor: bordas das colunas do plugin e privilégio do app (T47, C-34)', () => {
  it('contagem negativa já na inclusão é recusada (23514)', async () => {
    const u = await novoUsuario();
    await expect(
      app(`insert into two_factor (id, secret, backup_codes, user_id, failed_verification_count) values ('tf-qa-t47-neg', 'segredo-ficticio-cifrado', 'codigos-ficticios', $1, -1)`, [u]),
    ).rejects.toMatchObject({ code: '23514', constraint: 'two_factor_failed_verification_count_check' });
    expect((await app(`select 1 from two_factor where id = 'tf-qa-t47-neg'`)).rows).toEqual([]);
  });

  it('contagem nula é recusada (23502), na inclusão e na alteração', async () => {
    const u = await novoUsuario();
    await expect(
      app(`insert into two_factor (id, secret, backup_codes, user_id, failed_verification_count) values ('tf-qa-t47-nulo', 'segredo-ficticio-cifrado', 'codigos-ficticios', $1, null)`, [u]),
    ).rejects.toMatchObject({ code: '23502' });
    await app(`insert into two_factor (id, secret, backup_codes, user_id) values ('tf-qa-t47-nulo2', 'segredo-ficticio-cifrado', 'codigos-ficticios', $1)`, [u]);
    await expect(app(`update two_factor set failed_verification_count = null where id = 'tf-qa-t47-nulo2'`)).rejects.toMatchObject({ code: '23502' });
  });

  it('verified aceita nulo explícito (o plugin não o exige) e o app desfaz o bloqueio', async () => {
    const u = await novoUsuario();
    await app(
      `insert into two_factor (id, secret, backup_codes, user_id, verified, failed_verification_count, locked_until) values ('tf-qa-t47-c', 'segredo-ficticio-cifrado', 'codigos-ficticios', $1, null, 3, $2)`,
      [u, '2026-10-22T12:15:00Z'],
    );
    await app(`update two_factor set failed_verification_count = 0, locked_until = null where id = 'tf-qa-t47-c'`);
    const [r] = (await app(`select verified, failed_verification_count, locked_until from two_factor where id = 'tf-qa-t47-c'`)).rows;
    expect(r).toEqual({ verified: null, failed_verification_count: 0, locked_until: null });
  });

  it.each([
    ['apagar a coluna locked_until', 'alter table two_factor drop column locked_until'],
    ['apagar a constraint da contagem', 'alter table two_factor drop constraint two_factor_failed_verification_count_check'],
    ['trocar o padrão de verified', 'alter table two_factor alter column verified set default false'],
  ])('o papel do app não faz DDL em two_factor: %s é recusado (42501)', async (_nome, sql) => {
    await expect(app(sql)).rejects.toMatchObject({ code: '42501' });
  });
});
