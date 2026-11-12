// Batimento do worker e varredura de execuções órfãs (02, seção 8; ADR-06, ADR-07, RNF-05). A cada minuto:
// 1. grava o batimento da instância (uma linha por instância) e apaga o das que não batem há mais de um dia;
// 2. reenfileira a execução `pendente` cuja hora de tentar venceu há mais de 1 min (o job dela se perdeu) e a
//    `em_andamento` com a trava vencida (o worker caiu no meio da chamada).
// A varredura não muda a execução: só envia o job da próxima tentativa, com a singletonKey dela (`…:t<n+1>`). Se o job
// dessa tentativa ainda está na fila, a política `stately` descarta o envio repetido; se dois chegarem ao worker, a
// reivindicação condicional (ADR-07) deixa um só rodar. O log leva só a instância e a quantidade (C-21).
import { and, asc, eq, lt, ne, or, sql } from 'drizzle-orm';
import { execucaoAgente, workerBatimento } from '../db/schema';
import { comTransacao } from '../db/transacao';
import type { Deps } from '../lib/deps';
import { FILAS } from '../lib/fila';
import { log } from '../lib/log';
import { chaveDoJob } from '../modules/agentes/execucoes';
import { semEsperaDeConfirmacao } from '../modules/demandas/confirmacao';

// Folga antes de reenfileirar a pendente: o job dela pode só estar esperando a vez na fila.
export const FOLGA_PENDENTE_MS = 60_000;
// Instância sem batimento há mais de um dia não volta (cada subida do worker gera uma nova).
export const GUARDA_BATIMENTO_MS = 24 * 60 * 60_000;
// Teto por batimento: o que sobrar fica para o minuto seguinte.
export const LIMITE_VARREDURA = 100;

export type DepsBatimento = Pick<Deps, 'db' | 'pool' | 'relogio' | 'fila'>;

export async function gravarBatimento(deps: Pick<Deps, 'db' | 'relogio'>, instancia: string): Promise<void> {
  const agora = deps.relogio.agora();
  await deps.db
    .insert(workerBatimento)
    .values({ instancia, vistoEm: agora })
    .onConflictDoUpdate({ target: workerBatimento.instancia, set: { vistoEm: agora } });
}

export async function batimento(deps: DepsBatimento, instancia: string): Promise<{ reenfileiradas: number }> {
  const agora = deps.relogio.agora();
  await gravarBatimento(deps, instancia);
  await deps.db
    .delete(workerBatimento)
    .where(and(lt(workerBatimento.vistoEm, new Date(agora.getTime() - GUARDA_BATIMENTO_MS)), ne(workerBatimento.instancia, instancia)));

  // A pendente da 1ª tentativa não tem proxima_tentativa_em: conta a hora em que ela foi criada ou mudou por último. M-5
  // da 0019: a pendente cuja demanda aguarda a confirmação de uma pessoa não é órfã (o worker a devolveu de propósito, e
  // a confirmação a reenfileira); sem este filtro, ela voltaria ao worker a cada minuto.
  const limitePendente = new Date(agora.getTime() - FOLGA_PENDENTE_MS);
  const orfas = await deps.db
    .select({ id: execucaoAgente.id, agente: execucaoAgente.agente, chaveEntrada: execucaoAgente.chaveEntrada, tentativas: execucaoAgente.tentativas })
    .from(execucaoAgente)
    .where(
      or(
        and(
          eq(execucaoAgente.status, 'pendente'),
          lt(sql`coalesce(${execucaoAgente.proximaTentativaEm}, ${execucaoAgente.atualizadaEm})`, limitePendente),
          semEsperaDeConfirmacao(execucaoAgente.demandaId),
        ),
        and(eq(execucaoAgente.status, 'em_andamento'), lt(execucaoAgente.bloqueadaAte, agora)),
      ),
    )
    .orderBy(asc(execucaoAgente.atualizadaEm), asc(execucaoAgente.id))
    .limit(LIMITE_VARREDURA);

  let reenfileiradas = 0;
  for (const e of orfas) {
    const jobId = await comTransacao(deps.pool, ({ executor }) =>
      deps.fila.enviar(executor, FILAS.agenteExecutar, { execucaoId: e.id }, { singletonKey: chaveDoJob(e.agente, e.chaveEntrada, e.tentativas + 1) }),
    );
    if (jobId) reenfileiradas += 1;
  }
  log.info({ evento: 'worker_batimento', instancia, quantidade: reenfileiradas });
  return { reenfileiradas };
}
