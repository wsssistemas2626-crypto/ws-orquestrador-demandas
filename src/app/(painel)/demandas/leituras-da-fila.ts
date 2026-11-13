// D-08 (T09 do DEC-DEM-20261110-0015-v1): as duas leituras novas da T03, só pela página da fila, que antes pede a pessoa
// (exigirPessoaNaPagina) e autoriza "listar_demandas" (CV-06; test/estatico/leituras-da-fila.test.ts confere a cadeia).
// Só do servidor: lê o banco das dependências.
import type { Db } from '../../../db';
import { log } from '../../../lib/log';
import { andamentosDasDemandas } from '../../../modules/andamento/consultas';
import { lerAndamento } from '../../../modules/andamento/regras';
import type { AndamentoVista } from '../../../modules/andamento/schemas';
import { contarDemandasPorStatus, etapasDasDemandas, type ContagemPorStatus } from '../../../modules/demandas/resumo-da-fila';
import type { FiltroDemandas } from '../../../modules/demandas/schemas';

// Contadores por status com o tipo, a linha de serviço e (0.3.0, 03, 4.1 item 3) a origem da URL (o status, a página e
// o limite não entram: RF-05). Número que falta é tolerável; número errado não (02, seção 5): a falha vira null e os
// contadores ficam sem número, filtrando do mesmo jeito. O log não leva filtro, SQL nem parâmetro (CV-08), no formato do
// painel_fila_falhou.
export async function contagemOuNada(db: Db, filtro: FiltroDemandas): Promise<ContagemPorStatus | null> {
  try {
    return await contarDemandasPorStatus(db, { tipo: filtro.tipo, linhaServicoProvavel: filtro.linhaServicoProvavel, origem: filtro.origem });
  } catch (e) {
    log.error({ evento: 'painel_contadores_falhou', rota: '/demandas', erro: e });
    return null;
  }
}

// As marcas ESP, RSK e DEC das demandas da página. Sem embrulho: a falha sobe para a lista, que mostra o erro de hoje.
export const etapasDaPagina = etapasDasDemandas;

// 0.4.0 (T12 do DEC-DEM-20261111-0017-v1; RF-08; 03, 4.4; ADR-35): o último andamento de cada demanda da página, numa
// consulta, já conferido por lerAndamento (AN-12, D-16): linha fora do esquema fica fora do mapa (sem selo). Leitura
// separada da lista: a falha vira null, e a fila aparece sem selo e com o aviso da 03. O log não leva ids, SQL nem
// parâmetro (no formato do painel_contadores_falhou).
export async function andamentosDaPagina(db: Db, ids: readonly string[]): Promise<Map<string, AndamentoVista> | null> {
  try {
    const linhas = await andamentosDasDemandas(db, ids);
    const mapa = new Map<string, AndamentoVista>();
    for (const [id, l] of linhas) {
      const a = lerAndamento(l);
      if (a) mapa.set(id, a);
    }
    return mapa;
  } catch (e) {
    log.error({ evento: 'painel_andamento_falhou', rota: '/demandas', erro: e });
    return null;
  }
}
