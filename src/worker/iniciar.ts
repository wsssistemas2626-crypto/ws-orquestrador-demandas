// Processo worker (ADR-04; 02, seção 8): o pg-boss com o papel do app (`migrate: false`; o esquema e as filas são do
// migrator), com o agendador e a supervisão ligados só aqui. Registra:
// - agente.executar com concorrência 1: uma chamada ao provedor por vez (RNF-07);
// - worker.batimento a cada minuto (batimento e varredura de execuções órfãs);
// - aviso.dec-pronto com concorrência 1 (T30): o e-mail de DEC pronto, com a nova tentativa do pg-boss;
// - retencao.expurgo todo dia às 03:00 de São Paulo, com concorrência 1 (T31): texto bruto, entrada pendente, sessões
//   e verificações vencidas.
// Cada instância grava o próprio batimento ao subir e a cada minuto, fora da fila: o job agendado roda em uma instância
// só, e o alerta de duas instâncias (RNF-05) precisa ver as duas.
import { randomUUID } from 'node:crypto';
import type { PgBoss } from 'pg-boss';
import { tratarAvisoDecPronto } from '../jobs/aviso-dec-pronto';
import { batimento, gravarBatimento } from '../jobs/batimento';
import { tratarAgenteExecutar, type JobRecebido } from '../jobs/agente-executar';
import { tratarExpurgo } from '../jobs/expurgo-texto-bruto';
import type { ConfigWorker } from '../lib/env-worker';
import { FILAS, PAYLOADS, type Fila } from '../lib/fila';
import { log } from '../lib/log';
import { capturarErro } from '../lib/sentry';
import type { DepsAgente } from '../modules/agentes/executar';
import { EnviadorSemProvedor, type EnviadorEmail } from '../modules/avisos/enviador';

// Sem `enviador`, o worker usa o que não envia: o aviso fica `sem_provedor` (src/worker/index.ts sempre passa o da
// fábrica).
export type DepsWorker = DepsAgente & { fila: Fila & { boss: PgBoss }; config: ConfigWorker; enviador?: EnviadorEmail };

export const FUSO_AGENDAMENTOS = 'America/Sao_Paulo';
export const CRON_BATIMENTO = '* * * * *';
export const CRON_EXPURGO = '0 3 * * *';
export const INTERVALO_BATIMENTO_MS = 60_000;

// Handler de worker.batimento: payload pelo schema da fila (C-22); erro vai ao log reduzido e ao Sentry, sem relançar
// (o pg-boss guardaria a mensagem no job), e o próximo minuto tenta de novo.
async function tratarBatimento(deps: DepsWorker, instancia: string, jobs: readonly JobRecebido[]): Promise<void> {
  const fila = FILAS.workerBatimento;
  for (const job of jobs) {
    if (!PAYLOADS[fila].safeParse(job.data).success) {
      log.warn({ evento: 'worker_payload_invalido', fila, jobId: job.id });
      continue;
    }
    try {
      await batimento(deps, instancia);
    } catch (e) {
      log.error({ evento: 'worker_batimento_erro', fila, jobId: job.id, instancia, erro: e });
      capturarErro(e, { evento: 'worker_batimento_erro' });
    }
  }
}

export async function iniciarWorker(deps: DepsWorker): Promise<{ instancia: string; parar(): Promise<void> }> {
  const boss = deps.fila.boss;
  const instancia = randomUUID();
  await gravarBatimento(deps, instancia);

  await boss.schedule(FILAS.workerBatimento, CRON_BATIMENTO, {});
  await boss.schedule(FILAS.retencaoExpurgo, CRON_EXPURGO, {}, { tz: FUSO_AGENDAMENTOS });

  const depsAviso = { ...deps, enviador: deps.enviador ?? new EnviadorSemProvedor() };
  const filas = [FILAS.agenteExecutar, FILAS.workerBatimento, FILAS.avisoDecPronto, FILAS.retencaoExpurgo] as const;
  await boss.work(FILAS.agenteExecutar, { localConcurrency: 1, batchSize: 1 }, (jobs) => tratarAgenteExecutar(deps, jobs));
  await boss.work(FILAS.workerBatimento, { localConcurrency: 1, batchSize: 1 }, (jobs) => tratarBatimento(deps, instancia, jobs));
  // batchSize 1: o erro relançado para a nova tentativa vale só para o job que falhou.
  await boss.work(FILAS.avisoDecPronto, { localConcurrency: 1, batchSize: 1 }, (jobs) => tratarAvisoDecPronto(depsAviso, jobs));
  // O prazo é o da configuração do worker (lerConfigWorker, conferido no boot: 1 a 365 dias).
  await boss.work(FILAS.retencaoExpurgo, { localConcurrency: 1, batchSize: 1 }, (jobs) => tratarExpurgo(deps, jobs));

  // Evento próprio (Minor 4 da 06-T29-revisao): a falha do temporizador fica só no log, como aviso; a do job agendado,
  // `worker_batimento_erro`, vai também ao Sentry.
  const temporizador = setInterval(() => {
    gravarBatimento(deps, instancia).catch((e: unknown) => log.warn({ evento: 'worker_batimento_temporizador_erro', instancia, erro: e }));
  }, INTERVALO_BATIMENTO_MS);
  // O temporizador não segura o processo: quem encerra é o SIGTERM (src/worker/index.ts).
  temporizador.unref();

  log.info({ evento: 'worker_iniciado', instancia });
  let parado = false;
  return {
    instancia,
    async parar() {
      if (parado) return;
      parado = true;
      clearInterval(temporizador);
      for (const nome of filas) await boss.offWork(nome);
      log.info({ evento: 'worker_parado', instancia });
    },
  };
}
