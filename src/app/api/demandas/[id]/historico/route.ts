// GET /api/demandas/:id/historico → 200 { itens: EventoVisivel[] } (RF-21), do mais novo para o mais antigo. Só pessoa
// (matriz). Demanda que não existe responde 404, como a leitura da demanda, e não uma lista vazia.
import { paramId, rota } from '../../../../../lib/rota';
import { obterDemanda } from '../../../../../modules/demandas/consultas';
import { listarHistorico } from '../../../../../modules/historico/consultas';

export const GET = rota(
  { acao: 'ler_historico', rota: '/api/demandas/[id]/historico', params: paramId.demanda },
  async ({ deps, params }) => {
    await obterDemanda(deps.db, params.id);
    return { json: { itens: await listarHistorico(deps.db, params.id) } };
  },
);
