// Prompts dos quatro agentes de IA (RF-16, ADR-10): um por agente, como constante. A execução de agente (T27) usa
// `PROMPTS[agente]` com o schema de `SCHEMA_DE_SAIDA[agente]` (src/modules/agentes/schemas.ts).
import type { Agente } from '../modules/acesso/ator';
import type { PromptDeAgente } from './comum';
import { PROMPT_CONSOLIDACAO } from './consolidacao';
import { PROMPT_INSUMO_TECNICO } from './insumo-tecnico';
import { PROMPT_ORQUESTRADOR } from './orquestrador';
import { PROMPT_RISCO } from './risco';

export type { PromptDeAgente } from './comum';

export const PROMPTS: Readonly<Record<Agente, PromptDeAgente>> = Object.freeze({
  orquestrador: PROMPT_ORQUESTRADOR,
  insumo_tecnico: PROMPT_INSUMO_TECNICO,
  risco: PROMPT_RISCO,
  consolidacao: PROMPT_CONSOLIDACAO,
});
