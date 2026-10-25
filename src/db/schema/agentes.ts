// Agentes de IA (RF-16 a RF-19): interruptor e modelo por agente, teto mensal, preço por modelo, execução por entrada e
// registro de uso por chamada. Enumerações como text + CHECK (sem ALTER TYPE em migration futura). Datas sem padrão no
// banco: vêm do Relogio (G3.4). Valores em USD (P1-f), em numeric, lidos como texto pelo driver.
import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, numeric, pgTable, smallint, text, unique, uuid } from 'drizzle-orm/pg-core';
import { momento } from './comum';
import { demanda } from './demandas';

// Fonte única da lista de agentes no banco. A T10 reexporta em src/modules/acesso/ator.ts, sem redeclarar.
export const AGENTES = ['orquestrador', 'insumo_tecnico', 'risco', 'consolidacao'] as const;
export const MOEDAS = ['USD'] as const;
export const STATUS_EXECUCAO = ['pendente', 'em_andamento', 'concluida', 'falhou', 'ignorada'] as const;
export const RESULTADOS_USO = ['sucesso', 'fora_do_schema', 'erro'] as const;

export type Agente = (typeof AGENTES)[number];
export type Moeda = (typeof MOEDAS)[number];
export type StatusExecucao = (typeof STATUS_EXECUCAO)[number];
export type ResultadoUso = (typeof RESULTADOS_USO)[number];

// RF-19: um interruptor por agente. As quatro linhas nascem na migration custom, desligadas (CA-19.1). O app não
// cria nem apaga agente: só liga, desliga e troca o modelo. Ligado exige modelo, porque o custo sai do preço dele.
export const configuracaoAgente = pgTable(
  'configuracao_agente',
  {
    agente: text().$type<Agente>().primaryKey(),
    ligado: boolean().notNull().default(false),
    modelo: text(),
    atualizadoEm: momento(),
    // id do usuário da sessão, sem FK, como evento.ator_id: a conta removida não leva a configuração junto.
    atualizadoPor: text(),
  },
  () => [
    check('configuracao_agente_agente_check', sql`"agente" in ('orquestrador', 'insumo_tecnico', 'risco', 'consolidacao')`),
    check('configuracao_agente_ligado_tem_modelo_check', sql`not "ligado" or "modelo" is not null`),
  ],
);

// RF-18: o teto mensal, numa linha só (id = 1). Nasce 0, e teto 0 suspende os agentes.
export const configuracaoIa = pgTable(
  'configuracao_ia',
  {
    id: smallint().primaryKey(),
    tetoMensal: numeric({ precision: 12, scale: 2 }).notNull().default('0'),
    moeda: text().$type<Moeda>().notNull().default('USD'),
    atualizadoEm: momento(),
    atualizadoPor: text(),
  },
  () => [
    check('configuracao_ia_id_check', sql`"id" = 1`),
    check('configuracao_ia_teto_mensal_check', sql`"teto_mensal" >= 0`),
    check('configuracao_ia_moeda_check', sql`"moeda" in ('USD')`),
  ],
);

// RF-17: preço por milhão de tokens, por vigência. Preço novo é linha nova; a anterior fica para o custo já registrado.
export const precoModelo = pgTable(
  'preco_modelo',
  {
    id: uuid().primaryKey().defaultRandom(),
    modelo: text().notNull(),
    precoEntradaPorMilhao: numeric({ precision: 12, scale: 6 }).notNull(),
    precoSaidaPorMilhao: numeric({ precision: 12, scale: 6 }).notNull(),
    moeda: text().$type<Moeda>().notNull().default('USD'),
    vigenteDesde: momento().notNull(),
  },
  (t) => [
    // Também é o índice do preço vigente: modelo = $1 and vigente_desde <= $2 order by vigente_desde desc limit 1.
    unique('preco_modelo_modelo_vigencia_unique').on(t.modelo, t.vigenteDesde),
    check('preco_modelo_preco_entrada_por_milhao_check', sql`"preco_entrada_por_milhao" >= 0`),
    check('preco_modelo_preco_saida_por_milhao_check', sql`"preco_saida_por_milhao" >= 0`),
    check('preco_modelo_moeda_check', sql`"moeda" in ('USD')`),
  ],
);

// ADR-07: uma execução por agente e entrada; o UPDATE condicional da reivindicação garante que só um worker a roda
// (CA-16.4). A chave de entrada só tem o tipo e o id da entrada (T28, C-22): nunca texto do pedido.
export const execucaoAgente = pgTable(
  'execucao_agente',
  {
    id: uuid().primaryKey().defaultRandom(),
    agente: text().$type<Agente>().notNull(),
    chaveEntrada: text().notNull(),
    // Nulo no orquestrador, que trabalha antes de a demanda existir (T-01).
    demandaId: text().references(() => demanda.id),
    status: text().$type<StatusExecucao>().notNull().default('pendente'),
    tentativas: integer().notNull().default(0),
    proximaTentativaEm: momento(),
    bloqueadaAte: momento(),
    // Id do artefato gravado (ESP, RSK, DEC ou a demanda, no orquestrador): sem FK, porque aponta para tabelas diferentes.
    artefatoId: text(),
    criadaEm: momento().notNull(),
    atualizadaEm: momento().notNull(),
  },
  (t) => [
    unique('execucao_agente_agente_chave_unique').on(t.agente, t.chaveEntrada),
    check('execucao_agente_agente_check', sql`"agente" in ('orquestrador', 'insumo_tecnico', 'risco', 'consolidacao')`),
    check('execucao_agente_status_check', sql`"status" in ('pendente', 'em_andamento', 'concluida', 'falhou', 'ignorada')`),
    check('execucao_agente_tentativas_check', sql`"tentativas" >= 0`),
    check(
      'execucao_agente_chave_entrada_check',
      sql`("agente" = 'orquestrador' and "chave_entrada" ~ '^entrada:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
        or ("agente" = 'insumo_tecnico' and "chave_entrada" ~ '^demanda:DEM-[0-9]{8}-[0-9]{4}$')
        or ("agente" = 'risco' and "chave_entrada" ~ '^esp:ESP-DEM-[0-9]{8}-[0-9]{4}-v[0-9]{1,4}$')
        or ("agente" = 'consolidacao' and "chave_entrada" ~ '^rsk:RSK-DEM-[0-9]{8}-[0-9]{4}-v[0-9]{1,4}$')`,
    ),
    check('execucao_agente_concluida_tem_artefato_check', sql`"status" <> 'concluida' or "artefato_id" is not null`),
    check('execucao_agente_em_andamento_tem_trava_check', sql`"status" <> 'em_andamento' or "bloqueada_ate" is not null`),
    // Varredura do batimento (T29): pendente com proxima_tentativa_em vencida e em_andamento com trava vencida.
    index('execucao_agente_status_proxima_idx').on(t.status, t.proximaTentativaEm),
    // agentesEmAndamento da demanda (T-03).
    index('execucao_agente_demanda_status_idx').on(t.demandaId, t.status),
  ],
);

// RF-17: uma linha por chamada ao provedor, haja o que houver (CA-17.2). Só números e o resultado: sem coluna de
// prompt, resposta ou texto (CA-17.3). Só de inclusão para o app.
export const usoIa = pgTable(
  'uso_ia',
  {
    id: uuid().primaryKey().defaultRandom(),
    execucaoAgenteId: uuid()
      .notNull()
      .references(() => execucaoAgente.id),
    agente: text().$type<Agente>().notNull(),
    demandaId: text().references(() => demanda.id),
    modelo: text().notNull(),
    tokensEntrada: integer().notNull(),
    tokensSaida: integer().notNull(),
    custo: numeric({ precision: 12, scale: 6 }).notNull(),
    resultado: text().$type<ResultadoUso>().notNull(),
    ocorridoEm: momento().notNull(),
  },
  (t) => [
    check('uso_ia_agente_check', sql`"agente" in ('orquestrador', 'insumo_tecnico', 'risco', 'consolidacao')`),
    check('uso_ia_resultado_check', sql`"resultado" in ('sucesso', 'fora_do_schema', 'erro')`),
    check('uso_ia_tokens_entrada_check', sql`"tokens_entrada" >= 0`),
    check('uso_ia_tokens_saida_check', sql`"tokens_saida" >= 0`),
    check('uso_ia_custo_check', sql`"custo" >= 0`),
    // Gasto do mês (teto, CA-18.1): soma de custo desde o início do mês em São Paulo.
    index('uso_ia_ocorrido_idx').on(t.ocorridoEm),
  ],
);
