// Histórico de eventos (RF-21): quem mudou o quê e quando. Só de inclusão para o papel do app (CA-21.2, C-34).
// `ocorrido_em` não tem padrão no banco: a data vem sempre do Relogio injetado (G3.4).
import { sql } from 'drizzle-orm';
import { bigint, check, index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export type AtorTipo = 'pessoa' | 'agente' | 'sistema';

export const evento = pgTable(
  'evento',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    ocorridoEm: timestamp({ withTimezone: true }).notNull(),
    atorTipo: text().$type<AtorTipo>().notNull(),
    atorId: text().notNull(),
    atorTokenPrefixo: text(),
    demandaId: text(),
    entidade: text().notNull(),
    entidadeId: text().notNull(),
    acao: text().notNull(),
    antes: jsonb(),
    depois: jsonb(),
  },
  (t) => [
    check('evento_ator_tipo_check', sql`"ator_tipo" in ('pessoa', 'agente', 'sistema')`),
    index('evento_demanda_ocorrido_idx').on(t.demandaId, t.ocorridoEm),
  ],
);
