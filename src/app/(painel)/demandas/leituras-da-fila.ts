// D-08 (T09 do DEC-DEM-20261110-0015-v1): as duas leituras novas da T03, só pela página da fila, que antes pede a pessoa
// (exigirPessoaNaPagina) e autoriza "listar_demandas" (CV-06; test/estatico/leituras-da-fila.test.ts confere a cadeia).
// Só do servidor: lê o banco das dependências.
import type { Db } from '../../../db';
import { log } from '../../../lib/log';
import { contarDemandasPorStatus, etapasDasDemandas, type ContagemPorStatus } from '../../../modules/demandas/resumo-da-fila';
import type { FiltroDemandas } from '../../../modules/demandas/schemas';

// Contadores por status com o tipo e a linha de serviço da URL (o status, a página e o limite não entram: RF-05). Número
// que falta é tolerável; número errado não (02, seção 5): a falha vira null e os contadores ficam sem número, filtrando
// do mesmo jeito. O log não leva filtro, SQL nem parâmetro (CV-08), no formato do painel_fila_falhou.
export async function contagemOuNada(db: Db, filtro: FiltroDemandas): Promise<ContagemPorStatus | null> {
  try {
    return await contarDemandasPorStatus(db, { tipo: filtro.tipo, linhaServicoProvavel: filtro.linhaServicoProvavel });
  } catch (e) {
    log.error({ evento: 'painel_contadores_falhou', rota: '/demandas', erro: e });
    return null;
  }
}

// As marcas ESP, RSK e DEC das demandas da página. Sem embrulho: a falha sobe para a lista, que mostra o erro de hoje.
export const etapasDaPagina = etapasDasDemandas;
