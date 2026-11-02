import type pg from 'pg';
import { criarDb, type Db } from './index';

// O executor usa a mesma conexão da transação: o que o pg-boss enfileira por ele desfaz junto (ADR-06).
export type Executor = { executeSql(texto: string, valores?: unknown[]): Promise<{ rows: unknown[] }> };
export type Transacao = { tx: Db; executor: Executor };

export async function comTransacao<T>(pool: pg.Pool, fn: (t: Transacao) => Promise<T>): Promise<T> {
  const cliente = await pool.connect();
  // Emprestada, a conexão fica sem o ouvinte de erro do pool. Se o banco a derrubar no meio da transação, o 'error'
  // do cliente sem ouvinte derrubaria o processo; aqui ele só marca a conexão para descarte.
  let conexaoPerdida: Error | undefined;
  const aoPerderConexao = (e: Error) => {
    conexaoPerdida = e;
  };
  cliente.on('error', aoPerderConexao);
  let falhaNoRollback: Error | undefined;
  try {
    await cliente.query('begin');
    const r = await fn({
      tx: criarDb(cliente),
      executor: { executeSql: (texto, valores) => cliente.query(texto, valores) },
    });
    await cliente.query('commit');
    return r;
  } catch (e) {
    try {
      await cliente.query('rollback');
    } catch (f) {
      falhaNoRollback = f instanceof Error ? f : new Error('rollback falhou');
    }
    throw e;
  } finally {
    cliente.off('error', aoPerderConexao);
    // Com erro, o pool descarta a conexão em vez de devolvê-la a quem pedir a próxima.
    cliente.release(falhaNoRollback ?? conexaoPerdida);
  }
}
