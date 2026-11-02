// POST /api/demandas → 201 DemandaVista; GET /api/demandas?status&tipo&linhaServicoProvavel&limit&offset → 200
// { itens, total, limit, offset } (RF-03, RF-06). Adaptadores finos sobre o serviço da T15: autorização, Zod e erro
// ficam em rota(); a autoria vem só do ator (C-11), e o id só é gerado depois do Zod (C-36).
import { rota } from '../../../lib/rota';
import { listarDemandas } from '../../../modules/demandas/consultas';
import { criarDemandaSchema, filtroDemandasSchema } from '../../../modules/demandas/schemas';
import { criarDemanda } from '../../../modules/demandas/servico';

export const POST = rota({ acao: 'criar_demanda', rota: '/api/demandas', corpo: criarDemandaSchema }, async ({ deps, ator, corpo }) => ({
  status: 201,
  json: await criarDemanda(deps, ator, corpo),
}));

export const GET = rota({ acao: 'listar_demandas', rota: '/api/demandas', query: filtroDemandasSchema }, async ({ deps, query }) => ({
  json: await listarDemandas(deps.db, query),
}));
