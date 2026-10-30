// Execução de agente no banco (ADR-06, ADR-07, P1-e): uma linha por (agente, chave de entrada), criada na transação do
// artefato que a disparou, junto com o job; a reivindicação condicional deixa uma só execução rodar por vez (CA-16.4).
//
// Toda mudança de estado depois da reivindicação é guardada por (id, em_andamento, tentativas): se a trava venceu e outro
// worker reivindicou de novo, quem ficou para trás não grava nada e recebe ExecucaoPerdida, que desfaz a transação dele.
// O payload do job leva só o id da execução (C-22); a singletonKey é por tentativa, `<agente>:<chave>:t<n>` (ADR-07).
import { and, eq, isNull, lt, lte, or, sql } from 'drizzle-orm';
import type { Db } from '../../db';
import { execucaoAgente } from '../../db/schema';
import type { Transacao } from '../../db/transacao';
import type { Deps } from '../../lib/deps';
import { FILAS } from '../../lib/fila';
import type { Relogio } from '../../lib/relogio';
import type { Agente } from '../acesso/ator';
import { esperaAntesDaTentativa } from './espera';

export type ExecucaoAgente = typeof execucaoAgente.$inferSelect;

// 150 s: acima do tempo limite de 120 s da chamada ao provedor (RNF-06), para a trava não vencer no meio de uma chamada
// que ainda pode responder.
export const TRAVA_MS = 150_000;

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A execução mudou de mãos (trava vencida e reivindicada de novo) ou já terminou: quem recebe isto não grava nada.
export class ExecucaoPerdida extends Error {
  constructor() {
    super('execucao_perdida');
    this.name = 'ExecucaoPerdida';
  }
}

export const chaveDoJob = (agente: Agente, chaveEntrada: string, tentativa: number): string => `${agente}:${chaveEntrada}:t${tentativa}`;

const somar = (d: Date, ms: number): Date => new Date(d.getTime() + ms);

// Insere a execução se ainda não existe e, só nesse caso, envia o job da 1ª tentativa pelo executor da mesma transação.
// Devolve o id, ou null quando a mesma entrada já tinha execução (idempotente).
export async function criarExecucao(
  t: Transacao,
  deps: Pick<Deps, 'fila' | 'relogio'>,
  e: { agente: Agente; chaveEntrada: string; demandaId: string | null },
): Promise<string | null> {
  const agora = deps.relogio.agora();
  const [linha] = await t.tx
    .insert(execucaoAgente)
    .values({ agente: e.agente, chaveEntrada: e.chaveEntrada, demandaId: e.demandaId, status: 'pendente', tentativas: 0, criadaEm: agora, atualizadaEm: agora })
    .onConflictDoNothing({ target: [execucaoAgente.agente, execucaoAgente.chaveEntrada] })
    .returning({ id: execucaoAgente.id });
  if (!linha) return null;
  await deps.fila.enviar(t.executor, FILAS.agenteExecutar, { execucaoId: linha.id }, { singletonKey: chaveDoJob(e.agente, e.chaveEntrada, 1) });
  return linha.id;
}

// ADR-07: pendente (e já na hora da tentativa) ou em andamento com a trava vencida. Nada voltou: outra execução já
// cuidou dela, ou ainda não é a hora da próxima tentativa.
export async function reivindicar(db: Db, execucaoId: string, relogio: Relogio): Promise<ExecucaoAgente | null> {
  if (!RE_UUID.test(execucaoId)) return null;
  const agora = relogio.agora();
  const [linha] = await db
    .update(execucaoAgente)
    .set({ status: 'em_andamento', bloqueadaAte: somar(agora, TRAVA_MS), tentativas: sql`${execucaoAgente.tentativas} + 1`, atualizadaEm: agora })
    .where(
      and(
        eq(execucaoAgente.id, execucaoId),
        or(
          and(eq(execucaoAgente.status, 'pendente'), or(isNull(execucaoAgente.proximaTentativaEm), lte(execucaoAgente.proximaTentativaEm, agora))),
          and(eq(execucaoAgente.status, 'em_andamento'), lt(execucaoAgente.bloqueadaAte, agora)),
        ),
      ),
    )
    .returning();
  return linha ?? null;
}

// A execução continua com quem a reivindicou: em andamento e no mesmo número de tentativa.
const daMesmaReivindicacao = (exec: ExecucaoAgente) =>
  and(eq(execucaoAgente.id, exec.id), eq(execucaoAgente.status, 'em_andamento'), eq(execucaoAgente.tentativas, exec.tentativas));

// Trava a linha até o fim da transação, antes de gravar o artefato: a reivindicação de outro worker espera, e quem
// perdeu a execução nem chega a gravar.
export async function confirmarPosse(tx: Db, exec: ExecucaoAgente): Promise<void> {
  const [linha] = await tx.select({ id: execucaoAgente.id }).from(execucaoAgente).where(daMesmaReivindicacao(exec)).for('update');
  if (!linha) throw new ExecucaoPerdida();
}

export async function encerrar(
  tx: Db,
  exec: ExecucaoAgente,
  status: 'concluida' | 'falhou' | 'ignorada',
  relogio: Relogio,
  artefatoId: string | null = null,
): Promise<void> {
  const r = await tx
    .update(execucaoAgente)
    .set({ status, artefatoId, bloqueadaAte: null, proximaTentativaEm: null, atualizadaEm: relogio.agora() })
    .where(daMesmaReivindicacao(exec))
    .returning({ id: execucaoAgente.id });
  if (r.length === 0) throw new ExecucaoPerdida();
}

// Volta a pendente com a hora da próxima tentativa e envia o job dela, com startAfter igual, na mesma transação.
export async function reagendar(t: Transacao, deps: Pick<Deps, 'fila' | 'relogio'>, exec: ExecucaoAgente): Promise<Date> {
  const agora = deps.relogio.agora();
  const proxima = somar(agora, esperaAntesDaTentativa(exec.tentativas + 1));
  const r = await t.tx
    .update(execucaoAgente)
    .set({ status: 'pendente', proximaTentativaEm: proxima, bloqueadaAte: null, atualizadaEm: agora })
    .where(daMesmaReivindicacao(exec))
    .returning({ id: execucaoAgente.id });
  if (r.length === 0) throw new ExecucaoPerdida();
  await deps.fila.enviar(
    t.executor,
    FILAS.agenteExecutar,
    { execucaoId: exec.id },
    { singletonKey: chaveDoJob(exec.agente, exec.chaveEntrada, exec.tentativas + 1), startAfter: proxima },
  );
  return proxima;
}
