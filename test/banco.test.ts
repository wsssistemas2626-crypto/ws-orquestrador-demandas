// Ajudante de banco dos testes (T04, test/banco.ts): cada arquivo de teste tem um banco só dele, já migrado, o que
// deixa os testes independentes de ordem (RNF-15). Testes da etapa 06-T04-testes (qa-automacao).
import { sql } from 'drizzle-orm';
import { expect, it } from 'vitest';
import { novoBanco } from './banco';

it('três bancos pedidos ao mesmo tempo saem todos (a trava serializa a cópia do modelo), cada um com nome próprio', async () => {
  const bancos = await Promise.all([novoBanco(), novoBanco(), novoBanco()]);
  try {
    const nomes = await Promise.all(bancos.map(async (x) => (await x.poolMigrator.query('select current_database() as nome')).rows[0].nome as string));
    expect(new Set(nomes).size).toBe(3);
    for (const nome of nomes) expect(nome).toMatch(/^t_[0-9a-f]{32}$/);
  } finally {
    await Promise.all(bancos.map((x) => x.fechar()));
  }
});

it('os bancos são isolados: o que um grava, o outro não vê', async () => {
  const [um, outro] = await Promise.all([novoBanco(), novoBanco()]);
  try {
    await um.poolApp.query(`insert into evento (ocorrido_em, ator_tipo, ator_id, entidade, entidade_id, acao) values ($1, 'sistema', 'sistema', 't', 'x', 't')`, [
      new Date('2026-10-22T12:00:00Z'),
    ]);
    expect((await um.poolApp.query('select count(*)::int as n from evento')).rows[0].n).toBe(1);
    expect((await outro.poolApp.query('select count(*)::int as n from evento')).rows[0].n).toBe(0);
  } finally {
    await Promise.all([um.fechar(), outro.fechar()]);
  }
});

it('o banco novo já vem migrado, e poolApp e db entram com o papel do app, poolMigrator com o dono', async () => {
  const b = await novoBanco();
  try {
    expect((await b.poolMigrator.query(`select count(*)::int as n from pg_tables where schemaname = 'public'`)).rows[0].n).toBeGreaterThan(0);
    expect((await b.poolApp.query('select current_user as u')).rows[0].u).toBe('orquestrador_app');
    const peloDb = await b.db.execute(sql`select current_user as u`);
    expect(peloDb.rows[0]?.u).toBe('orquestrador_app');
    const dono = (await b.poolMigrator.query('select current_user as u')).rows[0].u as string;
    expect(dono).not.toBe('orquestrador_app');
    expect(new URL(b.urlApp).username).toBe('orquestrador_app');
    expect(new URL(b.urlApp).pathname).toBe(new URL(b.urlMigrator).pathname);
  } finally {
    await b.fechar();
  }
});

it('fechar encerra os dois pools', async () => {
  const b = await novoBanco();
  await b.fechar();
  await expect(b.poolApp.query('select 1')).rejects.toThrow();
  await expect(b.poolMigrator.query('select 1')).rejects.toThrow();
});
