// Fila do pg-boss sobre o mesmo Postgres (ADR-04). O esquema `pgboss` e as filas são do migrator (instalarFilas, chamado
// por scripts/migrate.ts); o app sobe com `migrate: false` e nunca faz DDL (T-02, C-34). O envio aceita o executor da
// transação de quem chama: o job some junto com o rollback (ADR-06). Payload só com ids, conferido por Zod (C-22).
import pg from 'pg';
import { PgBoss } from 'pg-boss';
import { z } from 'zod';
import type { Executor } from '../db/transacao';
import { log } from './log';

export const FILAS = {
  agenteExecutar: 'agente.executar',
  avisoDecPronto: 'aviso.dec-pronto',
  retencaoExpurgo: 'retencao.expurgo',
  workerBatimento: 'worker.batimento',
} as const;

export type NomeFila = (typeof FILAS)[keyof typeof FILAS];

export type PayloadDe = {
  'agente.executar': { execucaoId: string };
  'aviso.dec-pronto': { decId: string };
  'retencao.expurgo': Record<string, never>;
  'worker.batimento': Record<string, never>;
};

export type OpcoesEnvio = { singletonKey?: string; startAfter?: Date; retryLimit?: number };

export type Fila = {
  enviar<N extends NomeFila>(executor: Executor, nome: N, payload: PayloadDe[N], op?: OpcoesEnvio): Promise<string | null>;
  parar(): Promise<void>;
};

const ESQUEMA = 'pgboss';
const PAPEL_APP = 'orquestrador_app';

// agente.executar: sem retry do pg-boss; a nova tentativa é da execução (P1-e, T27), com singletonKey por tentativa.
const OPCOES_FILA: Record<NomeFila, Parameters<PgBoss['createQueue']>[1]> = {
  [FILAS.agenteExecutar]: { retryLimit: 0, expireInSeconds: 180, policy: 'stately' },
  [FILAS.avisoDecPronto]: { retryLimit: 2, retryDelay: 60, retryBackoff: true },
  [FILAS.retencaoExpurgo]: {},
  [FILAS.workerBatimento]: {},
};

// Exportado para os handlers do worker lerem o payload com o mesmo schema do envio (T27 em diante).
export const PAYLOADS: { [N in NomeFila]: z.ZodType<PayloadDe[N]> } = {
  [FILAS.agenteExecutar]: z.strictObject({ execucaoId: z.uuid() }),
  [FILAS.avisoDecPronto]: z.strictObject({ decId: z.string().regex(/^DEC-DEM-\d{8}-\d{4}-v\d{1,4}$/) }),
  [FILAS.retencaoExpurgo]: z.strictObject({}) as unknown as z.ZodType<Record<string, never>>,
  [FILAS.workerBatimento]: z.strictObject({}) as unknown as z.ZodType<Record<string, never>>,
};

// Os GRANT valem para o que já existe no esquema; rodam a cada migrate, depois de o pg-boss criar ou atualizar tabelas.
const GRANTS = [
  `GRANT USAGE ON SCHEMA ${ESQUEMA} TO ${PAPEL_APP}`,
  `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${ESQUEMA} TO ${PAPEL_APP}`,
  `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${ESQUEMA} TO ${PAPEL_APP}`,
  `GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ${ESQUEMA} TO ${PAPEL_APP}`,
];

// Sem ouvinte, o 'error' do EventEmitter derruba o processo. O log leva só classe e código (C-21).
const ouvirErros = (boss: PgBoss) => {
  boss.on('error', (erro) => log.warn({ evento: 'fila_erro', erro }));
};

// Com o migrator: instala ou atualiza o esquema do pg-boss, cria as filas que faltam e dá ao app só DML. Idempotente.
export async function instalarFilas(urlMigrator: string): Promise<void> {
  const boss = new PgBoss({ connectionString: urlMigrator, schema: ESQUEMA, supervise: false, schedule: false, max: 1 });
  ouvirErros(boss);
  await boss.start();
  try {
    const existentes = new Set((await boss.getQueues()).map((q) => q.name));
    for (const [nome, op] of Object.entries(OPCOES_FILA) as Array<[NomeFila, Parameters<PgBoss['createQueue']>[1]]>) {
      if (!existentes.has(nome)) await boss.createQueue(nome, op);
    }
  } finally {
    await boss.stop({ graceful: false });
  }
  const pool = new pg.Pool({ connectionString: urlMigrator, max: 1 });
  try {
    for (const s of GRANTS) await pool.query(s);
  } finally {
    await pool.end();
  }
}

// Com o papel do app: sem migração, sem supervisão nem agendador (o worker da T29 liga o que precisar).
export async function criarFila(urlApp: string): Promise<Fila & { boss: PgBoss }> {
  const boss = new PgBoss({ connectionString: urlApp, schema: ESQUEMA, migrate: false, supervise: false, schedule: false });
  ouvirErros(boss);
  await boss.start();
  return {
    boss,
    async enviar(executor, nome, payload, op = {}) {
      const dados = PAYLOADS[nome].parse(payload);
      return boss.send(nome, dados as object, { ...op, db: executor });
    },
    parar: () => boss.stop({ graceful: false }),
  };
}
