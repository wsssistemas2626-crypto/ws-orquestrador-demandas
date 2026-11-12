// POST /api/demandas → 201 DemandaVista; GET /api/demandas?status&tipo&linhaServicoProvavel&limit&offset → 200
// { itens, total, limit, offset } (RF-03, RF-06). Adaptadores finos sobre o serviço da T15: autorização, Zod e erro
// ficam em rota(); a autoria vem só do ator (C-11), e o id só é gerado depois do Zod (C-36).
// M-06 (C-10, RF-20): a resposta do POST segue vistaDaDemandaPara, o mesmo contrato do GET por id para o agente. M-2 da
// 0019: para a integração, o serviço já devolve a vista de seis chaves, montada dentro da transação orçada.
import { rota } from '../../../lib/rota';
import { listarDemandasPara, vistaDaDemandaPara } from '../../../modules/demandas/consultas';
import { criarDemandaSchema, filtroDemandasSchema } from '../../../modules/demandas/schemas';
import { criarDemanda } from '../../../modules/demandas/servico';

export const POST = rota({ acao: 'criar_demanda', rota: '/api/demandas', corpo: criarDemandaSchema }, async ({ deps, ator, corpo }) => ({
  status: 201,
  json: ator.tipo === 'integracao' ? await criarDemanda(deps, ator, corpo) : vistaDaDemandaPara(ator, await criarDemanda(deps, ator, corpo)),
}));

export const GET = rota({ acao: 'listar_demandas', rota: '/api/demandas', query: filtroDemandasSchema }, async ({ deps, ator, query }) => ({
  json: await listarDemandasPara(deps.db, query, ator),
}));
