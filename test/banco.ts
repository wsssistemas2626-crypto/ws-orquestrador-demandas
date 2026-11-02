// Banco novo por arquivo de teste, copiado do `modelo` migrado no setup global. `poolApp` usa o papel do app
// (orquestrador_app, sem DDL); `poolMigrator`, o dono do esquema, só para preparar e conferir.
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { inject } from 'vitest';
import { criarDb, criarPool } from '../src/db';

export async function novoBanco() {
  const admin = inject('pgAdmin');
  const nome = `t_${randomUUID().replaceAll('-', '')}`;
  const p = new pg.Pool({ connectionString: admin, max: 1 });
  const c = await p.connect();
  try {
    // `create database ... template` falha se duas cópias do mesmo modelo correm juntas: a trava serializa.
    await c.query('select pg_advisory_lock(4242)');
    await c.query(`create database ${nome} template modelo`);
  } finally {
    await c.query('select pg_advisory_unlock(4242)');
    c.release();
    await p.end();
  }
  const urlMigrator = admin.replace(/\/postgres$/, `/${nome}`);
  const u = new URL(urlMigrator);
  u.username = 'orquestrador_app';
  u.password = 'app_teste';
  const urlApp = u.toString();
  const poolApp = criarPool(urlApp);
  const poolMigrator = criarPool(urlMigrator, { max: 2 });
  return {
    urlApp,
    urlMigrator,
    poolApp,
    poolMigrator,
    db: criarDb(poolApp),
    fechar: async () => {
      await poolApp.end();
      await poolMigrator.end();
    },
  };
}

export type BancoDeTeste = Awaited<ReturnType<typeof novoBanco>>;
