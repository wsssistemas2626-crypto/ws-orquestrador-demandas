// Handler da fila retencao.expurgo (RF-24, C-31, C-32; 02, seção 8), agendada pelo worker todo dia às 03:00 de São
// Paulo. O payload é vazio e passa pelo mesmo schema do envio (C-22); fora dele, o job é descartado sem o conteúdo no
// log. O prazo vem da configuração do worker (RETENCAO_TEXTO_BRUTO_DIAS, conferida no boot). Erro vai ao log reduzido
// e ao Sentry e é relançado com mensagem fixa, sem causa (o pg-boss guarda a mensagem no job), para a nova tentativa
// da fila: o expurgo é idempotente, e repetir não cria evento duplicado.
import type { ConfigApp } from '../lib/env';
import { FILAS, PAYLOADS } from '../lib/fila';
import { log } from '../lib/log';
import { capturarErro } from '../lib/sentry';
import { expurgar, type DepsExpurgar } from '../modules/retencao/expurgar';
import type { JobRecebido } from './agente-executar';

const FILA = FILAS.retencaoExpurgo;

export type DepsExpurgo = DepsExpurgar & { config: Pick<ConfigApp, 'retencaoDias'> };

export async function tratarExpurgo(deps: DepsExpurgo, jobs: readonly JobRecebido[]): Promise<void> {
  for (const job of jobs) {
    if (!PAYLOADS[FILA].safeParse(job.data).success) {
      log.warn({ evento: 'expurgo_payload_invalido', fila: FILA, jobId: job.id });
      continue;
    }
    let r: Awaited<ReturnType<typeof expurgar>>;
    try {
      r = await expurgar(deps, deps.config.retencaoDias);
    } catch (e) {
      log.error({ evento: 'expurgo_erro', fila: FILA, jobId: job.id, erro: e });
      capturarErro(e, { evento: 'expurgo_erro' });
      throw new Error('expurgo_erro');
    }
    log.info({ evento: 'expurgo_job_tratado', fila: FILA, jobId: job.id, quantidade: r.textos + r.pendentes + r.sessoes + r.verificacoes });
  }
}
