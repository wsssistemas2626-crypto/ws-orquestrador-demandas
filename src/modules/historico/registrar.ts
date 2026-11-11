// Histórico de eventos (RF-21): quem mudou o quê e quando, com a pessoa, o agente ou o sistema identificado. Só de
// inclusão (o papel do app não tem UPDATE nem DELETE em `evento`, C-34). A data vem sempre do Relogio (G3.4).
//
// C-30: o histórico não guarda dado de terceiro. A mudança de campo grava o valor só dos campos de enumeração da lista
// de permissão; qualquer outro campo, inclusive um que ainda não existe, vira `{ alterado: true }`.
import type { Db } from '../../db';
import { evento } from '../../db/schema';
import type { Relogio } from '../../lib/relogio';
import { atorDesconhecido, type Ator } from '../acesso/ator';

export type AcaoEvento =
  | 'demanda_criada'
  | 'status_alterado'
  | 'campo_alterado'
  | 'especificacao_criada'
  | 'parecer_risco_criado'
  | 'pacote_decisao_criado'
  | 'aprovacao_registrada'
  | 'decisao_registrada'
  // 0.1.13: a aprovação do DEC mais novo substituiu o aprovado anterior; `depois` leva só os dois ids (decidir.ts).
  | 'pacote_decisao_substituido'
  | 'agente_ligado'
  | 'agente_desligado'
  | 'teto_alterado'
  | 'suspensao_por_teto'
  | 'agente_ignorado'
  | 'falha_agente'
  | 'pedido_gerado'
  | 'texto_expurgado'
  | 'entrada_pendente_expurgada'
  | '2fa_ativado'
  | '2fa_desativado'
  | 'conta_criada'
  | 'conta_desativada'
  | 'token_criado'
  | 'token_revogado'
  // 0.3.0 (RF-15): a pessoa confirmou a demanda do Awave; o /construir buscou o pedido e confirmou o recebimento.
  | 'demanda_confirmada'
  | 'pedido_entregue'
  | 'pedido_recebido';

export type NovoEvento = {
  ator: Ator;
  demandaId?: string | null;
  entidade: string;
  entidadeId: string;
  acao: AcaoEvento;
  antes?: Record<string, unknown> | null;
  depois?: Record<string, unknown> | null;
};

// Lista de permissão: só estes campos guardam o valor de antes e de depois (CA-06.4). São enumerações, sem texto livre.
const CAMPOS_COM_VALOR: ReadonlySet<string> = new Set(['tipo', 'status', 'solicitantePapel', 'linhaServicoProvavel', 'urgencia']);

// Os campos de texto livre da demanda, que podem trazer dado de terceiro (C-30). Informativo: quem decide é a lista de
// permissão acima, e todo campo fora dela é tratado como estes.
export const CAMPOS_TEXTO_LIVRE: ReadonlySet<string> = new Set([
  'titulo',
  'solicitanteNome',
  'anexos',
  'contexto',
  'descricaoProblema',
  'impactoPercebido',
  'justificativaUrgencia',
]);

const ALTERADO = { alterado: true } as const;

// Valor de enumeração é texto (ou nulo, quando o campo é opcional). Qualquer outra forma não é gravada.
const valorDeEnumeracao = (v: unknown): string | null | typeof ALTERADO => (v === null || typeof v === 'string' ? v : ALTERADO);

export function mudancaDeCampo(campo: string, antes: unknown, depois: unknown): { antes: Record<string, unknown>; depois: Record<string, unknown> } {
  if (!CAMPOS_COM_VALOR.has(campo)) return { antes: { [campo]: { ...ALTERADO } }, depois: { [campo]: { ...ALTERADO } } };
  return { antes: { [campo]: valorDeEnumeracao(antes) }, depois: { [campo]: valorDeEnumeracao(depois) } };
}

// IN-02 e IN-12: a integração grava o próprio nome em ator_id e o prefixo do token; tipo desconhecido lança, e nada é
// gravado como outro ator.
function colunasDoAtor(ator: Ator): { atorTipo: Ator['tipo']; atorId: string; atorTokenPrefixo: string | null } {
  switch (ator.tipo) {
    case 'pessoa':
      return { atorTipo: 'pessoa', atorId: ator.usuarioId, atorTokenPrefixo: null };
    case 'agente':
      return { atorTipo: 'agente', atorId: ator.agente, atorTokenPrefixo: ator.prefixoToken };
    case 'integracao':
      return { atorTipo: 'integracao', atorId: ator.integracao, atorTokenPrefixo: ator.prefixoToken };
    case 'sistema':
      return { atorTipo: 'sistema', atorId: 'sistema', atorTokenPrefixo: null };
    default:
      return atorDesconhecido(ator);
  }
}

// Só para teste (ramos-por-ator.test.ts): a mesma função, sem mudar o uso interno.
export const colunasDoAtorParaTeste = colunasDoAtor;

// `tx` é a transação de quem chama, quando houver: o evento entra ou sai junto com a mudança que ele registra.
export async function registrarEvento(tx: Db, ev: NovoEvento, relogio: Relogio): Promise<void> {
  await tx.insert(evento).values({
    ocorridoEm: relogio.agora(),
    ...colunasDoAtor(ev.ator),
    demandaId: ev.demandaId ?? null,
    entidade: ev.entidade,
    entidadeId: ev.entidadeId,
    acao: ev.acao,
    antes: ev.antes ?? null,
    depois: ev.depois ?? null,
  });
}
