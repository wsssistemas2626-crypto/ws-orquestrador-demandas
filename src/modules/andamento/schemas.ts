// src/modules/andamento/schemas.ts — o contrato do andamento (0.4.0; 01, seção 4; 03, seção 7). O corpo é fechado em
// quatro chaves (AN-02): enumerações das listas da tabela (fonte única, src/db/schema/andamento.ts) e inteiros JSON de
// 0 a 999 com prontas ≤ total. Sem coerção, passthrough, catch ou default: o que não está no formato é 422, sem eco.
import { z } from 'zod';
import { FASES_ANDAMENTO, MAXIMO_DE_TAREFAS, STATUS_CONSTRUCAO, type FaseAndamento, type StatusConstrucao } from '../../db/schema/andamento';

export const RE_ID_DEC_ANDAMENTO = /^DEC-DEM-\d{8}-\d{4}-v\d{1,4}$/;

// 03, seção 7, por inteiro. O 409 de status final não diz o status; o de DEC substituído não cita o substituto.
export const MENSAGENS_ANDAMENTO = Object.freeze({
  corpoInvalido:
    'Andamento fora do formato. Envie só fase, tarefasProntas, tarefasTotal e status, com fase e status da lista e 0 ≤ tarefasProntas ≤ tarefasTotal ≤ 999.',
  decSubstituido: 'O pacote deste pedido foi substituído por um aprovado mais novo. O andamento não foi registrado: envie o do pedido novo.',
  statusFinal: 'A demanda deste pedido já está em um status final e não aceita este andamento. Nada foi registrado.',
});

export const CORPO_INVALIDO_ANDAMENTO = Object.freeze({ codigo: 'nao_processavel' as const, mensagem: MENSAGENS_ANDAMENTO.corpoInvalido });

const tarefas = z.number().int().min(0).max(MAXIMO_DE_TAREFAS);

export const corpoAndamentoSchema = z
  .strictObject({ fase: z.enum(FASES_ANDAMENTO), tarefasProntas: tarefas, tarefasTotal: tarefas, status: z.enum(STATUS_CONSTRUCAO) })
  .refine((c) => c.tarefasProntas <= c.tarefasTotal);

export type CorpoAndamento = z.infer<typeof corpoAndamentoSchema>;

// A linha lida do banco passa por aqui antes de qualquer tela ou API (AN-12; CA-04.6): fora do esquema, "sem andamento".
export const andamentoLidoSchema = z
  .object({
    decId: z.string().regex(RE_ID_DEC_ANDAMENTO),
    fase: z.enum(FASES_ANDAMENTO),
    tarefasProntas: tarefas,
    tarefasTotal: tarefas,
    statusConstrucao: z.enum(STATUS_CONSTRUCAO),
    gravadoEm: z.date(),
  })
  .refine((l) => l.tarefasProntas <= l.tarefasTotal);

export type AndamentoVista = { decId: string; fase: FaseAndamento; tarefasProntas: number; tarefasTotal: number; statusConstrucao: StatusConstrucao; atualizadoEm: Date };
export type AndamentoDaIntegracao = { fase: FaseAndamento; tarefasProntas: number; tarefasTotal: number; atualizadoEm: Date };

// IN-08 e AN-09: o Awave vê quatro chaves, montadas uma a uma; nunca decId, statusConstrucao nem prefixo.
export function paraIntegracao(a: AndamentoVista | null): AndamentoDaIntegracao | null {
  return a === null ? null : { fase: a.fase, tarefasProntas: a.tarefasProntas, tarefasTotal: a.tarefasTotal, atualizadoEm: a.atualizadoEm };
}
