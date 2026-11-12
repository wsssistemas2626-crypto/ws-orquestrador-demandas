// ADR-28 e IN-14: o servidor desiste antes do cliente (Awave 10 s, /construir 15 s) e nada fica gravado. Só para
// integração e só na transação que o serviço abre: pessoa, agente e sistema seguem com o statement_timeout do pool
// (criarPool) e sem lock_timeout, como hoje. O tempo esgotado vira 503 com mensagem fixa, sem texto do Postgres; o
// ROLLBACK de comTransacao desfaz tudo o que a transação gravou antes.
import type pg from 'pg';
import { sql } from 'drizzle-orm';
import type { Db } from '../../db';
import { comTransacao, type Transacao } from '../../db/transacao';
import { ErroDominio } from '../../lib/erros';
import { lerCode, reduzirErro } from '../../lib/reduzir-erro';
import { atorDesconhecido, type Ator } from '../acesso/ator';

// 'padrao': criar e ler demanda, listar pendentes, confirmar recebimento. 'entrega': a entrega do pedido, que refaz as
// conferências da geração.
export type Orcamento = 'padrao' | 'entrega';

// D-03.
export const MENSAGEM_INDISPONIVEL = 'O Orquestrador não concluiu o pedido a tempo e nada foi gravado. Tente de novo em alguns minutos.';

// 57014: statement_timeout (query_canceled); 55P03: lock_timeout (lock_not_available).
const TEMPO_ESGOTADO: ReadonlySet<string> = new Set(['57014', '55P03']);

// G3.6: os SET LOCAL são literais constantes, sem valor interpolado.
export async function limitarTempo(tx: Db, ator: Ator, orcamento: Orcamento): Promise<void> {
  switch (ator.tipo) {
    case 'integracao':
      await tx.execute(sql`set local lock_timeout = '2s'`);
      if (orcamento === 'entrega') await tx.execute(sql`set local statement_timeout = '10s'`);
      else await tx.execute(sql`set local statement_timeout = '5s'`);
      return;
    case 'pessoa':
    case 'agente':
    case 'sistema':
      return;
    default:
      return atorDesconhecido(ator);
  }
}

// O código vem do erro, da causa (o Drizzle embrulha o erro do pg) ou de objeto simples com `code`; nunca a mensagem.
export function traduzirTempoEsgotado(e: unknown): unknown {
  if (e instanceof ErroDominio) return e;
  const codigo = reduzirErro(e).code ?? lerCode(e);
  return codigo !== undefined && TEMPO_ESGOTADO.has(codigo) ? new ErroDominio('indisponivel', MENSAGEM_INDISPONIVEL) : e;
}

// Com a transação de quem chama, usa a mesma, sem SET LOCAL (quem abriu a transação decide o tempo dela). Sem ela, abre
// a própria, aplica o orçamento do ator e traduz o tempo esgotado.
export async function executarComOrcamento<T>(
  pool: pg.Pool,
  ator: Ator,
  orcamento: Orcamento,
  t: Transacao | undefined,
  corpo: (t: Transacao) => Promise<T>,
): Promise<T> {
  if (t) return corpo(t);
  try {
    return await comTransacao(pool, async (tr) => {
      await limitarTempo(tr.tx, ator, orcamento);
      return corpo(tr);
    });
  } catch (e) {
    throw traduzirTempoEsgotado(e);
  }
}
