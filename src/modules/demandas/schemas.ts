// Schemas de entrada da demanda (RF-03, RF-06, RF-07), os mesmos para rota, Server Action e job (ADR-09). Limites da
// RNF-04; anexo `url` só http e https, até 2.048 caracteres (C-18); nenhum campo de autoria (C-11: `z.object` descarta
// chave desconhecida, e nenhum schema usa `.passthrough()` nem `.loose()`). As enumerações têm fonte única no esquema do
// banco; aqui só ganham o nome curto que os módulos usam.
import { z } from 'zod';
import {
  LINHAS_SERVICO,
  PAPEIS_SOLICITANTE as PAPEIS_SOLICITANTE_DB,
  STATUS_DEMANDA,
  TIPOS_DEMANDA,
  URGENCIAS as URGENCIAS_DB,
  type StatusDemanda,
  type TipoDemanda,
} from '../../db/schema/demandas';

export const TIPOS = TIPOS_DEMANDA;
export const STATUS = STATUS_DEMANDA;
export const PAPEIS_SOLICITANTE = PAPEIS_SOLICITANTE_DB;
export const LINHAS = LINHAS_SERVICO;
export const URGENCIAS = URGENCIAS_DB;
export type Tipo = TipoDemanda;
export type Status = StatusDemanda;

// RNF-04 e C-18.
export const LIMITE_TEXTO = 10_000;
export const LIMITE_ITENS = 50;
export const LIMITE_REFERENCIA = 2_048;
export const LIMITE_NOME = 200;
export const LIMITE_PAGINA = 100;

export const textoLivre = z.string().trim().max(LIMITE_TEXTO);
export const listaDeTextos = z.array(textoLivre.min(1)).max(LIMITE_ITENS);

const PROTOCOLOS_DE_LINK: ReadonlySet<string> = new Set(['http:', 'https:']);
// O servidor nunca busca a URL (C-18): só confere a forma. `javascript:`, `data:`, `file:` e texto sem esquema saem.
const ehLinkPermitido = (v: string): boolean => URL.canParse(v) && PROTOCOLOS_DE_LINK.has(new URL(v).protocol);

export const anexoSchema = z
  .object({
    tipo: z.enum(['url', 'arquivo']),
    referencia: z.string().trim().min(1).max(LIMITE_REFERENCIA),
    descricao: textoLivre.optional(),
  })
  .refine((a) => a.tipo !== 'url' || ehLinkPermitido(a.referencia), {
    message: 'Use um link que comece com http:// ou https://.',
    path: ['referencia'],
  });

const anexos = z.array(anexoSchema).max(LIMITE_ITENS);
const nomeSolicitante = z.string().trim().min(1).max(LIMITE_NOME);

// Sem refinamento no nível do objeto: a T17 estende este schema (`.extend`), e o Zod 4 não estende objeto refinado.
export const criarDemandaSchema = z.object({
  titulo: textoLivre.min(1),
  tipo: z.enum(TIPOS),
  solicitanteNome: nomeSolicitante,
  solicitantePapel: z.enum(PAPEIS_SOLICITANTE).optional(),
  linhaServicoProvavel: z.enum(LINHAS).optional(),
  urgencia: z.enum(URGENCIAS).optional(),
  justificativaUrgencia: textoLivre.optional(),
  contexto: textoLivre.optional(),
  descricaoProblema: textoLivre.optional(),
  impactoPercebido: textoLivre.optional(),
  anexos: anexos.default([]),
});

// Os campos de criar, todos opcionais, mais o status (RF-07). Ausente = não muda; `null` limpa um campo que a demanda
// pode ter vazio. Os três obrigatórios e a lista de anexos não aceitam `null`.
export const alterarDemandaSchema = z.object({
  titulo: textoLivre.min(1).optional(),
  tipo: z.enum(TIPOS).optional(),
  solicitanteNome: nomeSolicitante.optional(),
  solicitantePapel: z.enum(PAPEIS_SOLICITANTE).nullable().optional(),
  linhaServicoProvavel: z.enum(LINHAS).nullable().optional(),
  urgencia: z.enum(URGENCIAS).nullable().optional(),
  justificativaUrgencia: textoLivre.nullable().optional(),
  contexto: textoLivre.nullable().optional(),
  descricaoProblema: textoLivre.nullable().optional(),
  impactoPercebido: textoLivre.nullable().optional(),
  anexos: anexos.optional(),
  status: z.enum(STATUS).optional(),
});

// Query da fila (RF-06, CA-06.2): os números chegam como texto; chave repetida chega como lista e é recusada.
export const filtroDemandasSchema = z.object({
  status: z.enum(STATUS).optional(),
  tipo: z.enum(TIPOS).optional(),
  linhaServicoProvavel: z.enum(LINHAS).optional(),
  limit: z.coerce.number().int().min(1).max(LIMITE_PAGINA).default(20),
  offset: z.coerce.number().int().min(0).max(1_000_000).default(0),
});

export type CriarDemanda = z.output<typeof criarDemandaSchema>;
export type AlterarDemanda = z.output<typeof alterarDemandaSchema>;
export type FiltroDemandas = z.output<typeof filtroDemandasSchema>;
