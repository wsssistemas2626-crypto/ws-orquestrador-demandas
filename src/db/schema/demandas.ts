// Demanda (RF-03 a RF-07), o texto bruto da entrada (RF-05, RF-24) e a entrada que espera o agente orquestrador
// (T-01). Enumerações como text + CHECK (sem ALTER TYPE em migration futura); listas em jsonb, validadas pelo Zod da
// API e, no banco, pelo menos quanto a serem listas. Datas sem padrão no banco: vêm do Relogio (G3.4).
import { sql } from 'drizzle-orm';
import { boolean, check, index, jsonb, pgSequence, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

const momento = () => timestamp({ withTimezone: true });

export const TIPOS_DEMANDA = ['bug', 'melhoria', 'novo_projeto', 'estudo', 'produto_proprio'] as const;
export const STATUS_DEMANDA = [
  'nova',
  'em_analise',
  'aguardando_informacao',
  'pronta_para_decisao',
  'encerrada',
  'aprovada',
  'em_construcao',
  'entregue',
  'devolvida',
] as const;
export const PAPEIS_SOLICITANTE = ['operacoes', 'financeiro', 'produto', 'outro'] as const;
export const LINHAS_SERVICO = ['sob_medida', 'automacao_integracao', 'ia_controle_humano', 'diagnostico_sustentacao', 'indefinida'] as const;
export const URGENCIAS = ['baixa', 'media', 'alta'] as const;
export const AUTORES_ARTEFATO = ['pessoa', 'agente'] as const;
export const STATUS_ENTRADA_PENDENTE = ['aguardando', 'falhou'] as const;

export type TipoDemanda = (typeof TIPOS_DEMANDA)[number];
export type StatusDemanda = (typeof STATUS_DEMANDA)[number];
export type PapelSolicitante = (typeof PAPEIS_SOLICITANTE)[number];
export type LinhaServico = (typeof LINHAS_SERVICO)[number];
export type Urgencia = (typeof URGENCIAS)[number];
export type AutorArtefato = (typeof AUTORES_ARTEFATO)[number];
export type StatusEntradaPendente = (typeof STATUS_ENTRADA_PENDENTE)[number];
export type Anexo = { tipo: 'url' | 'arquivo'; referencia: string; descricao?: string };
export type Origem = { canal?: 'email' | 'mensagem' | 'formulario' | 'outro'; referencia?: string };

// RF-04 e RNF-09: sequência global de 4 dígitos. O 10.000º nextval falha (2200H) e vira capacidade_de_ids_esgotada.
export const demandaSeq = pgSequence('demanda_seq', { startWith: 1, minValue: 1, maxValue: 9999, cycle: false, cache: 1 });

export const demanda = pgTable(
  'demanda',
  {
    id: text().primaryKey(),
    titulo: text().notNull(),
    tipo: text().$type<TipoDemanda>().notNull(),
    status: text().$type<StatusDemanda>().notNull().default('nova'),
    solicitanteNome: text().notNull(),
    solicitantePapel: text().$type<PapelSolicitante>(),
    linhaServicoProvavel: text().$type<LinhaServico>(),
    urgencia: text().$type<Urgencia>(),
    justificativaUrgencia: text(),
    contexto: text(),
    descricaoProblema: text(),
    impactoPercebido: text(),
    anexos: jsonb().$type<Anexo[]>().notNull().default(sql`'[]'::jsonb`),
    duvidasEntrada: jsonb().$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    autorTipo: text().$type<AutorArtefato>().notNull(),
    autorId: text().notNull(),
    rascunhoAgente: boolean().notNull().default(false),
    criadaEm: momento().notNull(),
    atualizadaEm: momento().notNull(),
  },
  (t) => [
    check('demanda_id_check', sql`"id" ~ '^DEM-[0-9]{8}-[0-9]{4}$'`),
    check('demanda_tipo_check', sql`"tipo" in ('bug', 'melhoria', 'novo_projeto', 'estudo', 'produto_proprio')`),
    check(
      'demanda_status_check',
      sql`"status" in ('nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao', 'encerrada', 'aprovada', 'em_construcao', 'entregue', 'devolvida')`,
    ),
    check('demanda_solicitante_papel_check', sql`"solicitante_papel" in ('operacoes', 'financeiro', 'produto', 'outro')`),
    check(
      'demanda_linha_servico_provavel_check',
      sql`"linha_servico_provavel" in ('sob_medida', 'automacao_integracao', 'ia_controle_humano', 'diagnostico_sustentacao', 'indefinida')`,
    ),
    check('demanda_urgencia_check', sql`"urgencia" in ('baixa', 'media', 'alta')`),
    check('demanda_autor_tipo_check', sql`"autor_tipo" in ('pessoa', 'agente')`),
    check('demanda_anexos_check', sql`jsonb_typeof("anexos") = 'array'`),
    check('demanda_duvidas_entrada_check', sql`jsonb_typeof("duvidas_entrada") = 'array'`),
    index('demanda_criada_idx').on(t.criadaEm),
    index('demanda_status_criada_idx').on(t.status, t.criadaEm),
    index('demanda_tipo_criada_idx').on(t.tipo, t.criadaEm),
    index('demanda_linha_criada_idx').on(t.linhaServicoProvavel, t.criadaEm),
    index('demanda_autor_criada_idx').on(t.autorTipo, t.autorId, t.criadaEm),
  ],
);

// Texto bruto em tabela própria (dado pessoal de terceiro, D1 e D2): nenhuma leitura de demanda o traz por acidente, e
// o expurgo só precisa de UPDATE em texto, origem e expurgada_em. Antes do expurgo há texto; depois, nem texto nem origem.
export const entradaBruta = pgTable(
  'entrada_bruta',
  {
    demandaId: text()
      .primaryKey()
      .references(() => demanda.id),
    texto: text(),
    origem: jsonb().$type<Origem>(),
    recebidaEm: momento().notNull(),
    expurgadaEm: momento(),
  },
  (t) => [
    check(
      'entrada_bruta_expurgo_check',
      sql`("expurgada_em" is null and "texto" is not null) or ("expurgada_em" is not null and "texto" is null and "origem" is null)`,
    ),
    check('entrada_bruta_origem_check', sql`jsonb_typeof("origem") = 'object'`),
    index('entrada_bruta_a_expurgar_idx').on(t.recebidaEm).where(sql`"expurgada_em" is null`),
  ],
);

// T-01: a entrada enviada ao agente orquestrador antes de a demanda existir. Operacional e curta: some quando a
// demanda nasce ou no expurgo (C-31).
export const entradaPendente = pgTable(
  'entrada_pendente',
  {
    id: uuid().primaryKey().defaultRandom(),
    texto: text().notNull(),
    origem: jsonb().$type<Origem>(),
    solicitanteNome: text().notNull(),
    solicitantePapel: text().$type<PapelSolicitante>(),
    status: text().$type<StatusEntradaPendente>().notNull().default('aguardando'),
    registradaPor: text().notNull(),
    recebidaEm: momento().notNull(),
  },
  (t) => [
    check('entrada_pendente_solicitante_papel_check', sql`"solicitante_papel" in ('operacoes', 'financeiro', 'produto', 'outro')`),
    check('entrada_pendente_status_check', sql`"status" in ('aguardando', 'falhou')`),
    check('entrada_pendente_origem_check', sql`jsonb_typeof("origem") = 'object'`),
    index('entrada_pendente_recebida_idx').on(t.recebidaEm),
  ],
);
