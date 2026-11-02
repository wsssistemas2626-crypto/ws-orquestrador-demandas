// Schema de entrada do parecer de risco (RSK, RF-09, T-05), o mesmo para rota, Server Action e job do agente de risco
// (ADR-09). Três riscos com nível obrigatório (CA-09.2) e comentário opcional; recomendações e pré-condições são listas
// (CA-09.3). Nenhum campo de autoria (C-11: `z.object` descarta chave desconhecida).
import { z } from 'zod';
import { NIVEIS_RISCO } from '../../db/schema/versoes';
import { listaDeTextos, textoLivre } from '../demandas/schemas';

// Fonte única no esquema do banco (o CHECK de cada nível usa a mesma lista).
export const NIVEIS = NIVEIS_RISCO;
export type Nivel = (typeof NIVEIS)[number];

export const criarParecerRiscoSchema = z.object({
  resumo: textoLivre.optional(),
  riscoTecnicoNivel: z.enum(NIVEIS),
  riscoTecnicoComentario: textoLivre.optional(),
  riscoOperacionalNivel: z.enum(NIVEIS),
  riscoOperacionalComentario: textoLivre.optional(),
  riscoJuridicoNivel: z.enum(NIVEIS),
  riscoJuridicoComentario: textoLivre.optional(),
  recomendacoesMitigacao: listaDeTextos.default([]),
  preCondicoes: listaDeTextos.default([]),
  envolverJuridicoOuAdministradoraQuando: textoLivre.optional(),
});

export type CriarParecerRisco = z.output<typeof criarParecerRiscoSchema>;
