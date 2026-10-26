// Status da demanda e transições (RF-07). As manuais são só de pessoa (alterarDemanda); as automáticas, do ator
// `sistema`, disparadas por ESP com dúvida, DEC criado e decisão devolvida ou arquivada, sem passar por `autorizar`
// (a matriz nega o sistema em toda ação). Os motivos de recusa são os da 03 (T05); a tela acrescenta o prefixo
// "Não foi possível concluir: ".
import { eq } from 'drizzle-orm';
import { demanda } from '../../db/schema';
import type { Transacao } from '../../db/transacao';
import type { Deps } from '../../lib/deps';
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
