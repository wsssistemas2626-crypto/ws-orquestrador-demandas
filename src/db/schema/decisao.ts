// Pacote de decisão (DEC, RF-10), aprovação (RF-13, RF-14) e decisão: só de inclusão para o papel do app (RF-11,
// C-34). statusDecisao e aprovadores do DEC são derivados destas tabelas: pendente = sem linha em decisao; uma decisão
// por DEC é a chave primária de decisao (CA-11.3).
import { sql } from 'drizzle-orm';
import { boolean, check, date, integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { demanda, type AutorArtefato, type TipoDemanda } from './demandas';
import { especificacaoTecnica, parecerRisco } from './versoes';

const momento = () => timestamp({ withTimezone: true });

export const NIVEIS_APROVACAO = ['cto', 'cto_e_administradora'] as const;
export const PAPEIS_APROVACAO = ['cto', 'administradora'] as const;
export const OPCOES_DECISAO = ['A', 'B'] as const;
// Gravados; 'pendente' é derivado (sem linha em decisao) e nunca é gravado.
export const STATUS_DECISAO = ['aprovada', 'devolvida', 'arquivada'] as const;

export type NivelAprovacao = (typeof NIVEIS_APROVACAO)[number];
export type PapelAprovacao = (typeof PAPEIS_APROVACAO)[number];
export type OpcaoDecisao = (typeof OPCOES_DECISAO)[number];
export type StatusDecisaoGravado = (typeof STATUS_DECISAO)[number];
export type Opcao = { descricao: string; vantagens?: string; desvantagens?: string; quandoEscolher?: string };

export const pacoteDecisao = pgTable(
  'pacote_decisao',
  {
    id: text().primaryKey(),
    demandaId: text()
      .notNull()
      .references(() => demanda.id),
    versao: integer().notNull(),
    especificacaoId: text()
      .notNull()
      .references(() => especificacaoTecnica.id),
    especificacaoVersao: integer().notNull(),
    parecerRiscoId: text()
      .notNull()
      .references(() => parecerRisco.id),
    parecerRiscoVersao: integer().notNull(),
    // Cópia da demanda no momento do DEC: o Pedido de Construção sai daqui e não muda se a demanda for editada (RF-22).
    demandaTipo: text().$type<TipoDemanda>().notNull(),
    demandaTitulo: text().notNull(),
    demandaDescricao: text().notNull(),
    resumoExecutivo: text().notNull(),
    opcaoA: jsonb().$type<Opcao>().notNull(),
    opcaoB: jsonb().$type<Opcao>().notNull(),
    recomendacao: text(),
    nivelAprovacaoRequerido: text().$type<NivelAprovacao>().notNull(),
    autorTipo: text().$type<AutorArtefato>().notNull(),
    autorId: text().notNull(),
    rascunhoAgente: boolean().notNull(),
    execucaoAgenteId: uuid(),
    criadaEm: momento().notNull(),
  },
  (t) => [
    unique('pacote_decisao_demanda_versao_unique').on(t.demandaId, t.versao),
    check('pacote_decisao_id_check', sql`"id" = ('DEC-' || "demanda_id" || '-v' || "versao"::text)`),
    check('pacote_decisao_versao_check', sql`"versao" between 1 and 9999`),
    // Com o id da ESP e do RSK derivado da demanda e da versão, estas duas garantem que o DEC cita versões da própria
    // demanda, com o número de versão que a regra de desatualizado compara.
    check(
      'pacote_decisao_especificacao_check',
      sql`"especificacao_id" = ('ESP-' || "demanda_id" || '-v' || "especificacao_versao"::text)`,
    ),
    check('pacote_decisao_parecer_risco_check', sql`"parecer_risco_id" = ('RSK-' || "demanda_id" || '-v' || "parecer_risco_versao"::text)`),
    check('pacote_decisao_demanda_tipo_check', sql`"demanda_tipo" in ('bug', 'melhoria', 'novo_projeto', 'estudo', 'produto_proprio')`),
    check('pacote_decisao_nivel_aprovacao_requerido_check', sql`"nivel_aprovacao_requerido" in ('cto', 'cto_e_administradora')`),
    check('pacote_decisao_opcao_a_check', sql`jsonb_typeof("opcao_a") = 'object'`),
    check('pacote_decisao_opcao_b_check', sql`jsonb_typeof("opcao_b") = 'object'`),
    check('pacote_decisao_autor_tipo_check', sql`"autor_tipo" in ('pessoa', 'agente')`),
    check('pacote_decisao_rascunho_agente_check', sql`"rascunho_agente" = ("autor_tipo" = 'agente')`),
  ],
);

// papel_aprovacao (em nome de quem) é separado de registrada_por (o usuário da sessão), para os dois modos de P1-a.
// A assinatura da administradora fica como referência a documento externo, sem substituí-la.
export const aprovacao = pgTable(
  'aprovacao',
  {
    id: uuid().primaryKey().defaultRandom(),
    pacoteDecisaoId: text()
      .notNull()
      .references(() => pacoteDecisao.id),
    papelAprovacao: text().$type<PapelAprovacao>().notNull(),
    nomeAprovador: text().notNull(),
    registradaPor: text().notNull(),
    opcao: text().$type<OpcaoDecisao>().notNull(),
    comentario: text(),
    referenciaDocumento: text(),
    dataDocumento: date({ mode: 'string' }),
    revisouRascunhos: boolean().notNull().default(false),
    registradaEm: momento().notNull(),
  },
  (t) => [
    unique('aprovacao_pacote_papel_unique').on(t.pacoteDecisaoId, t.papelAprovacao),
    check('aprovacao_papel_aprovacao_check', sql`"papel_aprovacao" in ('cto', 'administradora')`),
    check('aprovacao_opcao_check', sql`"opcao" in ('A', 'B')`),
    check(
      'aprovacao_documento_administradora_check',
      sql`"papel_aprovacao" <> 'administradora' or ("referencia_documento" is not null and "data_documento" is not null)`,
    ),
  ],
);

export const decisao = pgTable(
  'decisao',
  {
    pacoteDecisaoId: text()
      .primaryKey()
      .references(() => pacoteDecisao.id),
    statusDecisao: text().$type<StatusDecisaoGravado>().notNull(),
    opcaoEscolhida: text().$type<OpcaoDecisao>(),
    comentarios: text(),
    decididaPor: text().notNull(),
    // = dataAprovacao quando aprovada.
    decididaEm: momento().notNull(),
  },
  () => [
    check('decisao_status_decisao_check', sql`"status_decisao" in ('aprovada', 'devolvida', 'arquivada')`),
    check('decisao_opcao_escolhida_check', sql`"opcao_escolhida" in ('A', 'B')`),
    check('decisao_aprovada_tem_opcao_check', sql`"status_decisao" <> 'aprovada' or "opcao_escolhida" is not null`),
    check('decisao_opcao_so_na_aprovada_check', sql`"status_decisao" = 'aprovada' or "opcao_escolhida" is null`),
  ],
);
