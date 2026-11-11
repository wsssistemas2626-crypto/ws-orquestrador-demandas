// Histórico de eventos (RF-21): quem mudou o quê e quando. Só de inclusão para o papel do app (CA-21.2, C-34).
// `ocorrido_em` não tem padrão no banco: a data vem sempre do Relogio injetado (G3.4).
import { sql } from 'drizzle-orm';
import { bigint, check, index, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { momento } from './comum';

export type AtorTipo = 'pessoa' | 'agente' | 'sistema' | 'integracao';

export const evento = pgTable(
  'evento',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    ocorridoEm: momento().notNull(),
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
    check('evento_ator_tipo_check', sql`"ator_tipo" in ('pessoa', 'agente', 'sistema', 'integracao')`),
    // IN-12: ato de integração sempre com o nome da lista e o prefixo do token.
    check('evento_ator_integracao_check', sql`"ator_tipo" <> 'integracao' or ("ator_id" in ('awave', 'construir') and "ator_token_prefixo" is not null)`),
    index('evento_demanda_ocorrido_idx').on(t.demandaId, t.ocorridoEm),
    // ADR-27: pendentes, entregue, recebido e confirmada procuram por ação e entidade.
    index('evento_acao_entidade_idx').on(t.acao, t.entidadeId),
  ],
);
