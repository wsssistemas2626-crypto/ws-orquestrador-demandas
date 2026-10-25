import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;

// statement_timeout de 10 s: consulta presa não segura conexão do pool indefinidamente.
export const criarPool = (url: string, op: { max?: number } = {}) =>
  new pg.Pool({ connectionString: url, max: op.max ?? 10, statement_timeout: 10_000 });

export const criarDb = (cliente: pg.Pool | pg.PoolClient): Db => drizzle(cliente, { schema, casing: 'snake_case' });
