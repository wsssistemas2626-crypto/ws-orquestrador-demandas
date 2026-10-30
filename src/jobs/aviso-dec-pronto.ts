// Handler da fila aviso.dec-pronto (RF-25; 02, seção 8). Cada job traz só { decId } (C-22), lido com o mesmo schema do
// envio; payload fora dele é descartado sem o conteúdo no log. Ao contrário de agente.executar, esta fila usa a nova
// tentativa do pg-boss (retryLimit 2, ADR-07 (a)): o handler relança quando o envio falhou e ainda há tentativa. O erro
// relançado tem mensagem fixa e nenhuma causa, porque o pg-boss guarda a mensagem no próprio job. Na 3ª falha,
// enviarAviso marca o aviso `falhou` e manda ao Sentry, e o job termina sem erro.
import { FILAS, PAYLOADS } from '../lib/fila';
import { log } from '../lib/log';
import { capturarErro } from '../lib/sentry';
import { AvisoNaoEnviado, enviarAviso, type DepsAviso } from '../modules/avisos/aviso-dec';
import type { JobRecebido } from './agente-executar';

const FILA = FILAS.avisoDecPronto;

export async function tratarAvisoDecPronto(deps: DepsAviso, jobs: readonly JobRecebido[]): Promise<void> {
  for (const job of jobs) {
    const payload = PAYLOADS[FILA].safeParse(job.data);
    if (!payload.success) {
      log.warn({ evento: 'aviso_payload_invalido', fila: FILA, jobId: job.id });
      continue;
    }
    let status: string;
    try {
      status = await enviarAviso(deps, payload.data.decId);
    } catch (e) {
      // enviarAviso já registrou a falha do envio (aviso_email_falha), com a tentativa.
      if (e instanceof AvisoNaoEnviado) throw new Error('aviso_nao_enviado');
      log.error({ evento: 'aviso_erro_inesperado', fila: FILA, jobId: job.id, erro: e });
      capturarErro(e, { evento: 'aviso_erro_inesperado' });
      throw new Error('aviso_erro_inesperado');
    }
    log.info({ evento: 'aviso_job_tratado', fila: FILA, jobId: job.id, status });
  }
}
