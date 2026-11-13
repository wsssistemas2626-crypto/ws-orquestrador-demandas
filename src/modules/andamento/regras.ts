// Regras puras do registro do andamento (0.4.0; 01, seções 1 e 5; ADR-34). Sem banco, sem relógio.
import type { FaseAndamento, StatusConstrucao } from '../../db/schema/andamento';
import type { Status, Tipo } from '../demandas/schemas';
import { CONTRADIZ_STATUS_FINAL, transicaoDoConstruir } from '../demandas/transicoes';
import { andamentoLidoSchema, type AndamentoVista } from './schemas';

export type EstadoDoAndamento = Pick<AndamentoVista, 'decId' | 'fase' | 'tarefasProntas' | 'tarefasTotal' | 'statusConstrucao'>;
export type MarcoDoEvento = { fase: FaseAndamento; tarefasProntas: number; tarefasTotal: number; statusConstrucao: StatusConstrucao };

// Nunca lança: linha fora do esquema (ou o left join sem linha) é "sem andamento".
export function lerAndamento(linha: unknown): AndamentoVista | null {
  const r = andamentoLidoSchema.safeParse(linha);
  if (!r.success) return null;
  const l = r.data;
  return { decId: l.decId, fase: l.fase, tarefasProntas: l.tarefasProntas, tarefasTotal: l.tarefasTotal, statusConstrucao: l.statusConstrucao, atualizadoEm: l.gravadoEm };
}

// Os cinco campos (AN-04): sem o decId, o primeiro envio de um DEC novo passaria por "mesmo estado".
export function mesmoEstado(g: EstadoDoAndamento | null, n: EstadoDoAndamento): boolean {
  return g !== null && g.decId === n.decId && g.fase === n.fase && g.tarefasProntas === n.tarefasProntas && g.tarefasTotal === n.tarefasTotal && g.statusConstrucao === n.statusConstrucao;
}

// A2: evento só no primeiro andamento ou com fase, statusConstrucao ou DEC diferente.
export function mudancaDeMarco(g: EstadoDoAndamento | null, n: EstadoDoAndamento): boolean {
  return g === null || g.fase !== n.fase || g.statusConstrucao !== n.statusConstrucao || g.decId !== n.decId;
}

// C-30 e AN-11: `antes` e `depois` do evento, chave a chave, só enumeração e inteiro.
export const marcoDoEvento = (e: EstadoDoAndamento): MarcoDoEvento => ({
  fase: e.fase,
  tarefasProntas: e.tarefasProntas,
  tarefasTotal: e.tarefasTotal,
  statusConstrucao: e.statusConstrucao,
});

export type DecisaoDoAndamento = { tipo: 'recusa' } | { tipo: 'grava'; para: Status | null };

// A tabela da spec, seção 2.1 (P-02). Switch exaustivo sobre os nove status, sem ramo padrão que grave (AN-04).
export function decidirPorStatus(atual: { status: Status; tipo: Tipo }, sc: StatusConstrucao): DecisaoDoAndamento {
  switch (atual.status) {
    case 'entregue':
    case 'encerrada':
      return CONTRADIZ_STATUS_FINAL[atual.status].includes(sc) ? { tipo: 'recusa' } : { tipo: 'grava', para: null };
    case 'nova':
    case 'em_analise':
    case 'aguardando_informacao':
    case 'pronta_para_decisao':
    case 'aprovada':
    case 'em_construcao':
    case 'devolvida':
      return { tipo: 'grava', para: transicaoDoConstruir(atual, sc) };
    default: {
      const nunca: never = atual.status;
      throw new Error(`andamento: status desconhecido ${String(nunca)}`);
    }
  }
}
