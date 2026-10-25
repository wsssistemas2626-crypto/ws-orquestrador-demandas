import type pg from 'pg';
import { criarDb, type Db } from './index';

// O executor usa a mesma conexão da transação: o que o pg-boss enfileira por ele desfaz junto (ADR-06).
export type Executor = { executeSql(texto: string, valores?: unknown[]): Promise<{ rows: unknown[] }> };
export type Transacao = { tx: Db; executor: Executor };

export async function comTransacao<T>(pool: pg.Pool, fn: (t: Transacao) => Promise<T>): Promise<T> {
  const cliente = await pool.connect();
  try {
    await cliente.query('begin');
    const r = await fn({
      tx: criarDb(cliente),
      executor: { executeSql: (texto, valores) => cliente.query(texto, valores) },
    });
    await cliente.query('commit');
    return r;
  } catch (e) {
    await cliente.query('rollback').catch(() => undefined);
    throw e;
  } finally {
    cliente.release();
  }
}
