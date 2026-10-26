// Schemas de entrada do pacote de decisão (DEC, RF-10, RF-23), os mesmos para rota, Server Action e job do agente de
// consolidação (ADR-09). As duas opções têm o mesmo schema e são guardadas em jsonb; nenhum campo de autoria, de versão,
// de ESP ou RSK citados nem de decisão (C-11: `z.object` descarta chave desconhecida). A decisão (T21) tem schema
// próprio, só para pessoa.
import { z } from 'zod';
import { NIVEIS_APROVACAO, OPCOES_DECISAO, STATUS_DECISAO } from '../../db/schema/decisao';
import type { StatusDecisao } from '../demandas/consultas';
import { filtroDemandasSchema, textoLivre } from '../demandas/schemas';

// Fonte única no esquema do banco (o CHECK do nível usa a mesma lista).
export const NIVEIS = NIVEIS_APROVACAO;
// 'pendente' é derivado (sem linha em decisao); os outros três são os gravados.
export const STATUS_DECISAO_FILTRO = ['pendente', ...STATUS_DECISAO] as const satisfies readonly StatusDecisao[];

export const opcaoSchema = z.object({
  descricao: textoLivre.min(1),
  vantagens: textoLivre.optional(),
  desvantagens: textoLivre.optional(),
  quandoEscolher: textoLivre.optional(),
});

export const criarPacoteDecisaoSchema = z.object({
  resumoExecutivo: textoLivre.min(1),
  opcaoA: opcaoSchema,
  opcaoB: opcaoSchema,
  recomendacao: textoLivre.optional(),
  nivelAprovacaoRequerido: z.enum(NIVEIS),
});

// Query de GET /pacotes-decisao (RF-23): limit e offset são os da fila de demandas (RF-06); chave repetida chega como
// lista e é recusada.
export const filtroPacotesSchema = z.object({
  statusDecisao: z.enum(STATUS_DECISAO_FILTRO).optional(),
  limit: filtroDemandasSchema.shape.limit,
  offset: filtroDemandasSchema.shape.offset,
});

// Corpo de PATCH /pacotes-decisao/:decId/decisao (RF-13, RF-14). A opção só existe na aprovação, e só A ou B; nas
// outras duas, a chave mandada junto é descartada. Quem aprova, em nome de quem e com que nome vem da sessão (C-11):
// `registrarComo` é só um pedido, que `decidir.ts` confere contra o papel da conta (C-12, P1-a).
const comuns = { comentarios: textoLivre.optional(), revisouRascunhosDeAgente: z.boolean().optional() };
export const LIMITE_REFERENCIA_DOCUMENTO = 200;

export const registrarDecisaoSchema = z.discriminatedUnion('statusDecisao', [
  z.object({
    statusDecisao: z.literal('aprovada'),
    opcaoEscolhida: z.enum(OPCOES_DECISAO),
    referenciaDocumento: z.string().trim().min(1).max(LIMITE_REFERENCIA_DOCUMENTO).optional(),
    dataDocumento: z.iso.date().optional(),
    registrarComo: z.literal('administradora').optional(),
    ...comuns,
  }),
  z.object({ statusDecisao: z.literal('devolvida'), ...comuns }),
  z.object({ statusDecisao: z.literal('arquivada'), ...comuns }),
]);

export type CriarPacoteDecisao = z.output<typeof criarPacoteDecisaoSchema>;
export type FiltroPacotes = z.output<typeof filtroPacotesSchema>;
export type RegistrarDecisao = z.output<typeof registrarDecisaoSchema>;
