// Entrada do processo worker (`pnpm worker`). Confere a configuração (C-31: retenção fora de 1..365 não sobe; o erro
// cita só o nome da variável), liga o Sentry (desligado sem DSN), monta as dependências e inicia o worker. O provedor
// de IA só existe com ANTHROPIC_API_KEY (CA-16.5); sem ela, as execuções ficam `ignorada`. No SIGTERM (e no SIGINT),
// para de pegar jobs, fecha a fila e o pool e sai.
import { criarDb, criarPool } from '../db';
import { ErroConfiguracao } from '../lib/env';
import { lerConfigWorker } from '../lib/env-worker';
import { criarFila } from '../lib/fila';
import { log } from '../lib/log';
import { relogioDoSistema } from '../lib/relogio';
import { capturarErro, iniciarSentry } from '../lib/sentry';
import { criarProvedor } from '../modules/agentes/provedor';
import { iniciarWorker } from './iniciar';

async function principal(): Promise<void> {
  const config = lerConfigWorker();
  iniciarSentry({ dsn: process.env.SENTRY_DSN || undefined });
  const pool = criarPool(config.databaseUrl);
  const db = criarDb(pool);
  const fila = await criarFila(config.databaseUrl, { agendador: true });
  const provedor = criarProvedor({ ANTHROPIC_API_KEY: config.chaveAnthropic });
  const worker = await iniciarWorker({ db, pool, relogio: relogioDoSistema, fila, provedor, config });

  let encerrando = false;
  const encerrar = async (sinal: string) => {
    if (encerrando) return;
    encerrando = true;
    log.info({ evento: 'worker_encerrando', codigoErro: sinal, instancia: worker.instancia });
    try {
      await worker.parar();
      await fila.parar();
      await pool.end();
    } catch (e) {
      log.error({ evento: 'worker_erro_ao_encerrar', erro: e });
      process.exitCode = 1;
    }
    process.exit();
  };
  process.once('SIGTERM', () => void encerrar('SIGTERM'));
  process.once('SIGINT', () => void encerrar('SIGINT'));
}

principal().catch((e: unknown) => {
  // Configuração inválida: só os nomes das variáveis (a mensagem do ErroConfiguracao não tem valor).
  if (e instanceof ErroConfiguracao) log.error({ evento: 'worker_configuracao_invalida', codigoErro: e.variaveis.join(',') });
  else {
    log.error({ evento: 'worker_falha_ao_subir', erro: e });
    capturarErro(e, { evento: 'worker_falha_ao_subir' });
  }
  // A fila já pode estar de pé (temporizadores do pg-boss seguram o processo): sai de vez, com 2 s para o Sentry enviar.
  process.exitCode = 1;
  setTimeout(() => process.exit(1), 2_000);
});
