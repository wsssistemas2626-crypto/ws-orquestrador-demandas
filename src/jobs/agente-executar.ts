// Handler da fila agente.executar (02, seção 8; T29 o registra no worker com concorrência 1). Cada job traz só
// { execucaoId } (C-22), lido com o mesmo schema do envio; payload fora dele não chega à execução. Erro inesperado vai ao
// log reduzido (classe e código) e ao Sentry, e não é relançado: o pg-boss guardaria a mensagem do erro no próprio job,
// e a execução presa é retomada pela varredura do batimento quando a trava vence (ADR-07).
import { FILAS, PAYLOADS } from '../lib/fila';
import { log } from '../lib/log';
import { capturarErro } from '../lib/sentry';
import { executarAgente, type DepsAgente } from '../modules/agentes/executar';

export type JobRecebido = { id: string; data: unknown };

const FILA = FILAS.agenteExecutar;

export async function tratarAgenteExecutar(deps: DepsAgente, jobs: readonly JobRecebido[]): Promise<void> {
  // Um de cada vez: a fila tem uma chamada ao provedor por vez (RNF-07).
  for (const job of jobs) {
    const payload = PAYLOADS[FILA].safeParse(job.data);
    if (!payload.success) {
      log.warn({ evento: 'agente_payload_invalido', fila: FILA, jobId: job.id });
      continue;
    }
    const { execucaoId } = payload.data;
    try {
      const status = await executarAgente(deps, execucaoId);
      log.info({ evento: 'agente_job_tratado', fila: FILA, jobId: job.id, execucaoId, status });
    } catch (e) {
      log.error({ evento: 'agente_erro_inesperado', fila: FILA, jobId: job.id, execucaoId, erro: e });
      capturarErro(e, { evento: 'agente_erro_inesperado' });
    }
  }
}
