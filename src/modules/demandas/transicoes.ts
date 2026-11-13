// Status da demanda e transições (RF-07). As manuais são só de pessoa (alterarDemanda); as automáticas, do ator
// `sistema`, disparadas por ESP com dúvida, DEC criado e decisão devolvida ou arquivada, sem passar por `autorizar`
// (a matriz nega o sistema em toda ação). Os motivos de recusa são os da 03 (T05); a tela acrescenta o prefixo
// "Não foi possível concluir: ".
import { eq } from 'drizzle-orm';
import { demanda } from '../../db/schema';
import type { StatusConstrucao } from '../../db/schema/andamento';
import type { Transacao } from '../../db/transacao';
import type { Deps } from '../../lib/deps';
import { ErroDominio } from '../../lib/erros';
import { atorDesconhecido, type Ator } from '../acesso/ator';
import { mudancaDeCampo, registrarEvento } from '../historico/registrar';
import { travarDemanda } from '../versoes';
import type { Status, Tipo } from './schemas';

const lista = (...s: Status[]): readonly Status[] => Object.freeze(s);

const MANUAIS: Readonly<Record<Status, readonly Status[]>> = Object.freeze({
  nova: lista('em_analise', 'encerrada'),
  em_analise: lista('aguardando_informacao', 'encerrada'),
  aguardando_informacao: lista('em_analise', 'encerrada'),
  pronta_para_decisao: lista('em_analise', 'aprovada', 'encerrada'),
  aprovada: lista('em_construcao', 'encerrada'),
  em_construcao: lista('entregue', 'devolvida'),
  devolvida: lista('em_construcao', 'em_analise'),
  entregue: lista(),
  encerrada: lista(),
});

const FINAIS: Readonly<Partial<Record<Status, string>>> = Object.freeze({ entregue: 'Entregue', encerrada: 'Encerrada' });

// M-02: a fonte única dos status finais é FINAIS, sem segunda lista nos serviços. Numa demanda em status final, criar
// ESP, RSK ou DEC é recusado com 409 (`conflito`, e não `entrada_invalida` nem `limite_excedido`, que fazem o executor de
// agente tentar de novo e gastar outra chamada paga).
export const STATUS_FINAIS: readonly Status[] = Object.freeze(Object.keys(FINAIS) as Status[]);

export function ehStatusFinal(status: Status): boolean {
  return Object.prototype.hasOwnProperty.call(FINAIS, status);
}

export const MENSAGEM_DEMANDA_FINAL =
  'Esta demanda está em status final. Não aceita nova especificação, parecer de risco nem pacote de decisão.';

// Chamada logo depois da trava da demanda, antes do limite por ator e de qualquer insert, evento, gatilho ou aviso.
export function recusarSeDemandaFinal(status: Status): void {
  if (ehStatusFinal(status)) throw new ErroDominio('conflito', MENSAGEM_DEMANDA_FINAL);
}

export const MOTIVOS_TRANSICAO = Object.freeze({
  semPacote: 'a demanda não tem pacote de decisão aprovado e atualizado.',
  estudo: 'demanda do tipo Estudo não vai para construção.',
  foraDaTabela: 'esta mudança de status não é permitida a partir do status atual.',
});

export function transicoesManuaisDe(status: Status): readonly Status[] {
  return Object.prototype.hasOwnProperty.call(MANUAIS, status) ? MANUAIS[status] : lista();
}

export function conferirTransicaoManual(
  de: Status,
  para: Status,
  ctx: { tipo: Tipo; temPacoteAprovadoAtualizado: boolean },
): { ok: true } | { ok: false; motivo: string } {
  const final = FINAIS[de];
  if (final) return { ok: false, motivo: `${final} é um status final. Não há próxima mudança.` };
  if (!transicoesManuaisDe(de).includes(para)) return { ok: false, motivo: MOTIVOS_TRANSICAO.foraDaTabela };
  if (para === 'aprovada' && !ctx.temPacoteAprovadoAtualizado) return { ok: false, motivo: MOTIVOS_TRANSICAO.semPacote };
  if (para === 'em_construcao' && ctx.tipo === 'estudo') return { ok: false, motivo: MOTIVOS_TRANSICAO.estudo };
  return { ok: true };
}

export type TransicaoAutomatica = 'duvida_em_aberto' | 'dec_criado' | 'decisao_devolvida' | 'decisao_arquivada';

const AUTOMATICAS: Readonly<Record<TransicaoAutomatica, { de: readonly Status[]; para: Status }>> = Object.freeze({
  duvida_em_aberto: { de: lista('nova', 'em_analise', 'pronta_para_decisao'), para: 'aguardando_informacao' },
  dec_criado: { de: lista('nova', 'em_analise', 'aguardando_informacao'), para: 'pronta_para_decisao' },
  decisao_devolvida: { de: lista('nova', 'aguardando_informacao', 'pronta_para_decisao'), para: 'em_analise' },
  decisao_arquivada: { de: lista('nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao'), para: 'encerrada' },
});

// Só muda se o status atual está na origem permitida; fora dela, não faz nada (nem evento). Trava a linha da demanda
// (quem chama em geral já a travou; travar de novo na mesma transação não espera).
export async function mudarStatusPeloSistema(
  t: Transacao,
  deps: Pick<Deps, 'relogio'>,
  demandaId: string,
  motivo: TransicaoAutomatica,
): Promise<void> {
  const atual = await travarDemanda(t.tx, demandaId);
  const regra = AUTOMATICAS[motivo];
  if (!regra.de.includes(atual.status)) return;
  await t.tx.update(demanda).set({ status: regra.para, atualizadaEm: deps.relogio.agora() }).where(eq(demanda.id, demandaId));
  await registrarEvento(
    t.tx,
    { ator: { tipo: 'sistema' }, demandaId, entidade: 'demanda', entidadeId: demandaId, acao: 'status_alterado', ...mudancaDeCampo('status', atual.status, regra.para) },
    deps.relogio,
  );
}

// 0.4.0 (RF-05, ADR-34, A1): as duas transições do /construir, com origem fixa. `entregue` e `encerrada` nunca são
// destino. Pelo ator integração construir, com o prefixo do token no status_alterado (nunca "Sistema"). D-08: a única
// fonte é esta tabela, lida por decidirPorStatus (andamento/regras.ts) e por mudarStatusPeloConstruir.
export const AUTOMATICAS_DO_CONSTRUIR: Readonly<Partial<Record<StatusConstrucao, Readonly<{ de: Status; para: Status }>>>> = Object.freeze({
  em_construcao: Object.freeze({ de: 'aprovada', para: 'em_construcao' }),
  cancelado: Object.freeze({ de: 'em_construcao', para: 'devolvida' }),
});

// P-02 de Fabiano: entregue aceita construido; encerrada aceita cancelado; o resto é 409.
export const CONTRADIZ_STATUS_FINAL: Readonly<Record<'entregue' | 'encerrada', readonly StatusConstrucao[]>> = Object.freeze({
  entregue: Object.freeze(['em_construcao', 'cancelado'] as const),
  encerrada: Object.freeze(['em_construcao', 'construido'] as const),
});

// O destino, ou null. A demanda do tipo Estudo não vai para construção (a mesma regra da mudança manual).
export function transicaoDoConstruir(atual: { status: Status; tipo: Tipo }, sc: StatusConstrucao): Status | null {
  const regra = Object.hasOwn(AUTOMATICAS_DO_CONSTRUIR, sc) ? AUTOMATICAS_DO_CONSTRUIR[sc] : undefined;
  if (!regra || regra.de !== atual.status) return null;
  if (regra.para === 'em_construcao' && atual.tipo === 'estudo') return null;
  return regra.para;
}

// Só o construir. `atual` é a linha devolvida pela trava da demanda na transação de quem chama (AN-04): nada é lido de
// novo aqui. Sem transação própria nem SET (AN-06).
export async function mudarStatusPeloConstruir(
  t: Transacao,
  deps: Pick<Deps, 'relogio'>,
  ator: Ator,
  atual: { id: string; status: Status; tipo: Tipo },
  sc: StatusConstrucao,
): Promise<Status | null> {
  switch (ator.tipo) {
    case 'integracao':
      if (ator.integracao !== 'construir') throw new Error('transições do /construir: só o construir');
      break;
    case 'pessoa':
    case 'agente':
    case 'sistema':
      throw new Error('transições do /construir: só o construir');
    default:
      return atorDesconhecido(ator);
  }
  const para = transicaoDoConstruir(atual, sc);
  if (para === null) return null;
  await t.tx.update(demanda).set({ status: para, atualizadaEm: deps.relogio.agora() }).where(eq(demanda.id, atual.id));
  await registrarEvento(
    t.tx,
    { ator, demandaId: atual.id, entidade: 'demanda', entidadeId: atual.id, acao: 'status_alterado', ...mudancaDeCampo('status', atual.status, para) },
    deps.relogio,
  );
  return para;
}
