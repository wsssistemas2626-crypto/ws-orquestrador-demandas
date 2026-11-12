// Andamento do Pedido de Construção informado pelo /construir (0.4.0, ADR-30): uma linha por gravação aceita, só de
// inclusão para o papel do app (AN-10). O último andamento da demanda é a linha de maior `id` (o relógio injetado pode
// empatar). `gravado_em` sem padrão no banco: vem do Relogio (G3.4). As listas abaixo são a fonte do Zod; os CHECKs as
// repetem como literal (sem SQL cru, C-17) e o teste confere as duas.
import { sql } from 'drizzle-orm';
import { bigint, check, index, integer, pgTable, text } from 'drizzle-orm/pg-core';
import { momento } from './comum';
import { pacoteDecisao } from './decisao';
import { demanda } from './demandas';

export const FASES_ANDAMENTO = ['entendendo_o_pedido', 'planejando', 'construindo', 'testando', 'revisando_e_entregando', 'documentando'] as const;
export const STATUS_CONSTRUCAO = ['em_construcao', 'construido', 'cancelado'] as const;
export type FaseAndamento = (typeof FASES_ANDAMENTO)[number];
export type StatusConstrucao = (typeof STATUS_CONSTRUCAO)[number];
export const MAXIMO_DE_TAREFAS = 999;

export const andamentoConstrucao = pgTable(
  'andamento_construcao',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    // A demanda do DEC conferida no registro (AN-03), nunca do corpo nem da URL.
    demandaId: text()
      .notNull()
      .references(() => demanda.id),
    decId: text()
      .notNull()
      .references(() => pacoteDecisao.id),
    fase: text().$type<FaseAndamento>().notNull(),
    tarefasProntas: integer().notNull(),
    tarefasTotal: integer().notNull(),
    statusConstrucao: text().$type<StatusConstrucao>().notNull(),
    // Quem gravou cada número, também sem evento (A2): revogação pelo prefixo. Nunca sai em vista, API ou tela.
    atorTokenPrefixo: text().notNull(),
    gravadoEm: momento().notNull(),
  },
  (t) => [
    check(
      'andamento_construcao_fase_check',
      sql`"fase" in ('entendendo_o_pedido', 'planejando', 'construindo', 'testando', 'revisando_e_entregando', 'documentando')`,
    ),
    check('andamento_construcao_status_construcao_check', sql`"status_construcao" in ('em_construcao', 'construido', 'cancelado')`),
    check('andamento_construcao_tarefas_check', sql`"tarefas_prontas" >= 0 and "tarefas_prontas" <= "tarefas_total" and "tarefas_total" <= 999`),
    check('andamento_construcao_dec_id_check', sql`"dec_id" ~ '^DEC-DEM-[0-9]{8}-[0-9]{4}-v[0-9]{1,4}$'`),
    check('andamento_construcao_ator_token_prefixo_check', sql`"ator_token_prefixo" ~ '^[A-Za-z0-9_-]{8}$'`),
    index('andamento_construcao_demanda_id_idx').on(t.demandaId, t.id),
    index('andamento_construcao_dec_gravado_idx').on(t.decId, t.gravadoEm),
    index('andamento_construcao_gravado_idx').on(t.gravadoEm),
  ],
);
