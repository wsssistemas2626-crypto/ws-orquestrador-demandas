import type pg from 'pg';
import { lerCode } from '../lib/reduzir-erro';
import { criarDb, type Db } from './index';

// O executor usa a mesma conexão da transação: o que o pg-boss enfileira por ele desfaz junto (ADR-06).
export type Executor = { executeSql(texto: string, valores?: unknown[]): Promise<{ rows: unknown[] }> };
export type Transacao = { tx: Db; executor: Executor };

// M-3 da 0019: o prazo total da transação venceu (na espera pela conexão, antes de uma instrução, numa instrução
// cortada pelo tempo-limite que o prazo encurtou, ou antes do COMMIT). Sem texto interno: quem traduz para o 503 é
// traduzirTempoEsgotado (tempo-limite.ts).
export class PrazoDaTransacaoEsgotado extends Error {
  constructor() {
    super('prazo_da_transacao_esgotado');
    this.name = 'PrazoDaTransacaoEsgotado';
  }
}

// O piso: os tempos-limite que quem abre a transação já pôs nela (o SET LOCAL de limitarTempo). O prazo só os baixa.
export type PisoDeTempo = { statementMs: number; lockMs: number };
// `prazoMs` (M-3 da 0019): só a integração usa (executarComOrcamento). Sem ele, nada muda. `agora` é o relógio
// monotônico, injetável para o teste.
export type OpcoesDaTransacao = { prazoMs?: number; piso?: PisoDeTempo; agora?: () => number };

type Prazo = { fim: number; agora: () => number; aplicado: PisoDeTempo; encurtado: boolean };

// 57014: statement_timeout; 55P03: lock_timeout.
const TEMPO_ESGOTADO: ReadonlySet<string> = new Set(['57014', '55P03']);

const restante = (p: Prazo): number => p.fim - p.agora();

// O prazo causou o erro: ele mesmo, em qualquer elo da cadeia de causas (o Drizzle embrulha o erro da consulta), ou um
// tempo-limite que o prazo encurtou.
function causadoPeloPrazo(e: unknown, p: Prazo): boolean {
  let atual: unknown = e;
  for (let i = 0; i < 5 && atual !== null && typeof atual === 'object'; i++) {
    if (atual instanceof PrazoDaTransacaoEsgotado) return true;
    const code = lerCode(atual);
    if (p.encurtado && code !== undefined && TEMPO_ESGOTADO.has(code)) return true;
    atual = (atual as { cause?: unknown }).cause;
  }
  return false;
}

// A espera pela conexão conta no prazo. Se o prazo vence antes, a conexão que chegar depois volta ao pool.
async function conectarNoPrazo(pool: pg.Pool, p: Prazo): Promise<pg.PoolClient> {
  const ms = restante(p);
  if (ms <= 0) throw new PrazoDaTransacaoEsgotado();
  const pedido = pool.connect();
  let venceu = false;
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const prazo = new Promise<never>((_, rejeitar) => {
    temporizador = setTimeout(() => {
      venceu = true;
      rejeitar(new PrazoDaTransacaoEsgotado());
    }, ms);
  });
  try {
    return await Promise.race([pedido, prazo]);
  } catch (e) {
    if (venceu)
      pedido.then(
        (c) => c.release(),
        () => undefined,
      );
    throw e;
  } finally {
    clearTimeout(temporizador);
  }
}

// Antes de cada instrução: prazo vencido lança; restante abaixo do piso em vigor baixa statement_timeout e lock_timeout
// para ele, só nesta transação (set_config local), com os valores por parâmetro (G3.6).
function comPrazo(cliente: pg.PoolClient, p: Prazo): pg.PoolClient {
  const consultar = async (...args: unknown[]): Promise<unknown> => {
    const ms = Math.floor(restante(p));
    if (ms <= 0) throw new PrazoDaTransacaoEsgotado();
    if (ms < p.aplicado.statementMs || ms < p.aplicado.lockMs) {
      const novo = { statementMs: Math.min(ms, p.aplicado.statementMs), lockMs: Math.min(ms, p.aplicado.lockMs) };
      await cliente.query("select set_config('statement_timeout', $1, true), set_config('lock_timeout', $2, true)", [
        String(novo.statementMs),
        String(novo.lockMs),
      ]);
      p.aplicado = novo;
      p.encurtado = true;
    }
    return (cliente.query as (...a: unknown[]) => Promise<unknown>).apply(cliente, args);
  };
  return new Proxy(cliente, {
    get(alvo, prop) {
      if (prop === 'query') return consultar;
      const v: unknown = Reflect.get(alvo, prop, alvo);
      return typeof v === 'function' ? (v as (...a: unknown[]) => unknown).bind(alvo) : v;
    },
  });
}

export async function comTransacao<T>(pool: pg.Pool, fn: (t: Transacao) => Promise<T>, op: OpcoesDaTransacao = {}): Promise<T> {
  if (op.prazoMs === undefined) return naConexao(await pool.connect(), fn, null);
  const agora = op.agora ?? (() => performance.now());
  const p: Prazo = {
    fim: agora() + op.prazoMs,
    agora,
    aplicado: op.piso ?? { statementMs: Number.POSITIVE_INFINITY, lockMs: Number.POSITIVE_INFINITY },
    encurtado: false,
  };
  return naConexao(await conectarNoPrazo(pool, p), fn, p);
}

async function naConexao<T>(cliente: pg.PoolClient, fn: (t: Transacao) => Promise<T>, p: Prazo | null): Promise<T> {
  // Emprestada, a conexão fica sem o ouvinte de erro do pool. Se o banco a derrubar no meio da transação, o 'error'
  // do cliente sem ouvinte derrubaria o processo; aqui ele só marca a conexão para descarte.
  let conexaoPerdida: Error | undefined;
  const aoPerderConexao = (e: Error) => {
    conexaoPerdida = e;
  };
  cliente.on('error', aoPerderConexao);
  let falhaNoRollback: Error | undefined;
  // BEGIN, COMMIT e ROLLBACK vão direto na conexão; só as instruções de quem chama passam pelo prazo.
  const daTransacao = p ? comPrazo(cliente, p) : cliente;
  try {
    await cliente.query('begin');
    const r = await fn({
      tx: criarDb(daTransacao),
      executor: { executeSql: (texto, valores) => daTransacao.query(texto, valores) },
    });
    if (p && restante(p) <= 0) throw new PrazoDaTransacaoEsgotado();
    await cliente.query('commit');
    return r;
  } catch (e) {
    try {
      await cliente.query('rollback');
    } catch (f) {
      falhaNoRollback = f instanceof Error ? f : new Error('rollback falhou');
    }
    throw p && causadoPeloPrazo(e, p) ? new PrazoDaTransacaoEsgotado() : e;
  } finally {
    cliente.off('error', aoPerderConexao);
    // Com erro, o pool descarta a conexão em vez de devolvê-la a quem pedir a próxima.
    cliente.release(falhaNoRollback ?? conexaoPerdida);
  }
}
