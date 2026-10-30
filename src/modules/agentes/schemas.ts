// Schema de saída de cada agente de IA (ADR-09): é o mesmo schema de entrada da rota que grava o artefato. A resposta do
// provedor só vira ESP, RSK ou DEC se passar nele (T27); chave desconhecida é descartada pelo `z.object` do Zod 4
// (C-11, C-25), então nada da saída define autoria, status nem id.
//
// O orquestrador não tem rota própria: a saída dele é a demanda sem os campos do solicitante (nome, papel e anexos vêm
// da entrada pendente, gravada pela pessoa, nunca do modelo), mais as perguntas ao solicitante (RF-15) e os avisos de
// classificação incerta.
import { z } from 'zod';
import type { Agente } from '../acesso/ator';
import { criarDemandaSchema, listaDeTextos } from '../demandas/schemas';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarPacoteDecisaoSchema } from '../pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';

export const LIMITE_FLAGS = 20;
export const LIMITE_FLAG = 200;

export const saidaOrquestradorSchema = criarDemandaSchema
  .omit({ solicitanteNome: true, solicitantePapel: true, anexos: true })
  .extend({
    perguntasParaSolicitante: listaDeTextos.default([]),
    flags: z.array(z.string().trim().min(1).max(LIMITE_FLAG)).max(LIMITE_FLAGS).default([]),
  });

export type SaidaOrquestrador = z.output<typeof saidaOrquestradorSchema>;

export const SCHEMA_DE_SAIDA: Readonly<Record<Agente, z.ZodType>> = Object.freeze({
  orquestrador: saidaOrquestradorSchema,
  insumo_tecnico: criarEspecificacaoSchema,
  risco: criarParecerRiscoSchema,
  consolidacao: criarPacoteDecisaoSchema,
});
