// Operação do worker: aviso por e-mail do DEC pronto (RF-25), batimento por instância (RNF-05) e a última execução de
// cada rotina agendada (C-31). Datas sem padrão no banco: vêm do Relogio (G3.4).
import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text } from 'drizzle-orm/pg-core';
import { momento } from './comum';
import { pacoteDecisao } from './decisao';

export const STATUS_AVISO_EMAIL = ['pendente', 'enviado', 'falhou', 'sem_provedor'] as const;
export const ROTINAS = ['retencao.expurgo'] as const;

export type StatusAvisoEmail = (typeof STATUS_AVISO_EMAIL)[number];
export type Rotina = (typeof ROTINAS)[number];

// Um aviso por DEC (CA-25.2): a chave primária é o próprio DEC. Sem destinatário nem corpo: o e-mail é montado na hora
// a partir do id do DEC e da configuração (C-38).
export const avisoEmail = pgTable(
  'aviso_email',
  {
    pacoteDecisaoId: text()
      .primaryKey()
      .references(() => pacoteDecisao.id),
    status: text().$type<StatusAvisoEmail>().notNull().default('pendente'),
    tentativas: integer().notNull().default(0),
    idProvedor: text(),
    enviadoEm: momento(),
    atualizadoEm: momento().notNull(),
  },
  () => [
    check('aviso_email_status_check', sql`"status" in ('pendente', 'enviado', 'falhou', 'sem_provedor')`),
    check('aviso_email_tentativas_check', sql`"tentativas" >= 0`),
    check('aviso_email_enviado_tem_data_check', sql`"status" <> 'enviado' or "enviado_em" is not null`),
  ],
);

// Uma linha por instância do worker; a tela de agentes mostra worker sem sinal (> 5 min) e duas instâncias (RNF-05).
export const workerBatimento = pgTable(
  'worker_batimento',
  {
    instancia: text().primaryKey(),
    vistoEm: momento().notNull(),
  },
  (t) => [index('worker_batimento_visto_idx').on(t.vistoEm)],
);

// Última execução de cada rotina agendada, para o painel mostrar o último expurgo (C-31).
export const rotinaExecucao = pgTable(
  'rotina_execucao',
  {
    rotina: text().$type<Rotina>().primaryKey(),
    ultimaExecucaoEm: momento().notNull(),
    quantidade: integer().notNull(),
  },
  () => [
    check('rotina_execucao_rotina_check', sql`"rotina" in ('retencao.expurgo')`),
    check('rotina_execucao_quantidade_check', sql`"quantidade" >= 0`),
  ],
);
