// Especificação técnica (ESP, RF-08) e parecer de risco (RSK, RF-09): versões imutáveis. O papel do app só tem
// SELECT e INSERT nelas (RF-11, CA-11.2, C-34). O id é derivado da demanda e da versão, e o banco confere isso; a
// restrição única (demanda_id, versao) é a segunda barreira da trava da demanda (CA-04.3) e o índice do max(versao)
// que calcula o DEC desatualizado (RF-12).
import { sql } from 'drizzle-orm';
import { boolean, check, integer, jsonb, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { demanda, type AutorArtefato } from './demandas';

const momento = () => timestamp({ withTimezone: true });

export const NIVEIS_RISCO = ['baixo', 'medio', 'alto'] as const;
export type NivelRisco = (typeof NIVEIS_RISCO)[number];

export const especificacaoTecnica = pgTable(
  'especificacao_tecnica',
  {
    id: text().primaryKey(),
    demandaId: text()
      .notNull()
      .references(() => demanda.id),
    versao: integer().notNull(),
    descricaoObjetiva: text().notNull(),
    situacaoAtual: text(),
    situacaoDesejada: text(),
    escopoInclui: jsonb().$type<string[]>().notNull(),
    escopoExclui: jsonb().$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    sistemasErp: text(),
    sistemasEcommerceMarketplace: text(),
    sistemasApisTerceiros: text(),
    sistemasServicosInternos: text(),
    dadosEntidades: text(),
    dadosCamposCriticos: text(),
    restricoesTecnicas: text(),
    duvidasEmAberto: jsonb().$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    // Os quatro campos de construção (RF-08, RF-22): obrigatórios fora do tipo estudo, conferidos no serviço.
    sistemaAlvo: text(),
    repositorioDestino: text(),
    criteriosAceitePreliminares: jsonb().$type<string[]>(),
    definicaoDePronto: jsonb().$type<string[]>(),
    autorTipo: text().$type<AutorArtefato>().notNull(),
    autorId: text().notNull(),
    rascunhoAgente: boolean().notNull(),
    // Sem FK: a tabela execucao_agente nasce na T06, e o artefato não depende dela para existir.
    execucaoAgenteId: uuid(),
    criadaEm: momento().notNull(),
  },
  (t) => [
    unique('especificacao_tecnica_demanda_versao_unique').on(t.demandaId, t.versao),
    check('especificacao_tecnica_id_check', sql`"id" = ('ESP-' || "demanda_id" || '-v' || "versao"::text)`),
    check('especificacao_tecnica_versao_check', sql`"versao" between 1 and 9999`),
    check('especificacao_tecnica_autor_tipo_check', sql`"autor_tipo" in ('pessoa', 'agente')`),
    check('especificacao_tecnica_rascunho_agente_check', sql`"rascunho_agente" = ("autor_tipo" = 'agente')`),
    check('especificacao_tecnica_escopo_inclui_check', sql`jsonb_typeof("escopo_inclui") = 'array'`),
    check('especificacao_tecnica_escopo_exclui_check', sql`jsonb_typeof("escopo_exclui") = 'array'`),
    check('especificacao_tecnica_duvidas_em_aberto_check', sql`jsonb_typeof("duvidas_em_aberto") = 'array'`),
    check('especificacao_tecnica_criterios_aceite_preliminares_check', sql`jsonb_typeof("criterios_aceite_preliminares") = 'array'`),
    check('especificacao_tecnica_definicao_de_pronto_check', sql`jsonb_typeof("definicao_de_pronto") = 'array'`),
  ],
);

export const parecerRisco = pgTable(
  'parecer_risco',
  {
    id: text().primaryKey(),
    demandaId: text()
      .notNull()
      .references(() => demanda.id),
    versao: integer().notNull(),
    resumo: text(),
    riscoTecnicoNivel: text().$type<NivelRisco>().notNull(),
    riscoTecnicoComentario: text(),
    riscoOperacionalNivel: text().$type<NivelRisco>().notNull(),
    riscoOperacionalComentario: text(),
    riscoJuridicoNivel: text().$type<NivelRisco>().notNull(),
    riscoJuridicoComentario: text(),
    recomendacoesMitigacao: jsonb().$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    preCondicoes: jsonb().$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    envolverJuridicoOuAdministradoraQuando: text(),
    autorTipo: text().$type<AutorArtefato>().notNull(),
    autorId: text().notNull(),
    rascunhoAgente: boolean().notNull(),
    execucaoAgenteId: uuid(),
    criadaEm: momento().notNull(),
  },
  (t) => [
    unique('parecer_risco_demanda_versao_unique').on(t.demandaId, t.versao),
    check('parecer_risco_id_check', sql`"id" = ('RSK-' || "demanda_id" || '-v' || "versao"::text)`),
    check('parecer_risco_versao_check', sql`"versao" between 1 and 9999`),
    check('parecer_risco_risco_tecnico_nivel_check', sql`"risco_tecnico_nivel" in ('baixo', 'medio', 'alto')`),
    check('parecer_risco_risco_operacional_nivel_check', sql`"risco_operacional_nivel" in ('baixo', 'medio', 'alto')`),
    check('parecer_risco_risco_juridico_nivel_check', sql`"risco_juridico_nivel" in ('baixo', 'medio', 'alto')`),
    check('parecer_risco_autor_tipo_check', sql`"autor_tipo" in ('pessoa', 'agente')`),
    check('parecer_risco_rascunho_agente_check', sql`"rascunho_agente" = ("autor_tipo" = 'agente')`),
    check('parecer_risco_recomendacoes_mitigacao_check', sql`jsonb_typeof("recomendacoes_mitigacao") = 'array'`),
    check('parecer_risco_pre_condicoes_check', sql`jsonb_typeof("pre_condicoes") = 'array'`),
  ],
);
