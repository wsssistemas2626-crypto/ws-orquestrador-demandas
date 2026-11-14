// src/modules/demandas/arquivamento.ts — 0.4.1 (S-04, decisão S1 de Fabiano e 7.1; ADR-38): para onde vai a demanda
// quando o DEC mais novo é arquivado, pelo estado do aprovado vigente. A única tabela da regra: o servidor
// (mudarStatusPorArquivamento, sob a trava) e a T11 (dica do Arquivar) leem esta mesma função. Pura: sem banco.
import type { Status } from './schemas';

export const ESTADOS_DO_VIGENTE = ['nenhum', 'atualizado', 'desatualizado'] as const;
export type EstadoDoVigente = (typeof ESTADOS_DO_VIGENTE)[number];

export function estadoDoVigente(v: { desatualizado: boolean } | null): EstadoDoVigente {
  if (v === null) return 'nenhum';
  return v.desatualizado ? 'desatualizado' : 'atualizado';
}

// Sem vigente, encerrada (como até a 0.4.0); com o vigente atualizado, aprovada (S1); desatualizado, em_analise (7.1).
function destinoNasOrigens(estado: EstadoDoVigente): Status {
  switch (estado) {
    case 'nenhum':
      return 'encerrada';
    case 'atualizado':
      return 'aprovada';
    case 'desatualizado':
      return 'em_analise';
    default: {
      const nunca: never = estado;
      throw new Error(`arquivamento: estado desconhecido ${String(nunca)}`);
    }
  }
}

// null: o status não muda (nem evento).
export function destinoDoArquivamento(status: Status, estado: EstadoDoVigente): Status | null {
  switch (status) {
    case 'nova':
    case 'aguardando_informacao':
    case 'pronta_para_decisao':
      return destinoNasOrigens(estado);
    case 'em_analise': {
      // Com o vigente desatualizado, o destino seria o próprio em_analise: nada muda.
      const destino = destinoNasOrigens(estado);
      return destino === 'em_analise' ? null : destino;
    }
    case 'aprovada':
    case 'em_construcao':
    case 'devolvida':
    case 'entregue':
    case 'encerrada':
      return null;
    default: {
      const nunca: never = status;
      throw new Error(`arquivamento: status desconhecido ${String(nunca)}`);
    }
  }
}
