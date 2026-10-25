import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { log } from '../lib/log';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;

// statement_timeout de 10 s: consulta presa não segura conexão do pool indefinidamente.
// O ouvinte de 'error' é obrigatório: uma conexão ociosa que o banco derruba (reinício, pg_terminate_backend) faz o
// pool emitir 'error', e sem ouvinte o processo cai. O pool já descarta a conexão; o log leva só classe e código (C-21).
export const criarPool = (url: string, op: { max?: number } = {}) => {
  const pool = new pg.Pool({ connectionString: url, max: op.max ?? 10, statement_timeout: 10_000 });
  pool.on('error', (erro) => log.warn({ evento: 'conexao_perdida', erro }));
  return pool;
};

export const criarDb = (cliente: pg.Pool | pg.PoolClient): Db => drizzle(cliente, { schema, casing: 'snake_case' });
