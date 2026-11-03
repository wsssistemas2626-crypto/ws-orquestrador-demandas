// POST /api/demandas/:id/especificacoes (criarEspecificacaoSchema) → 201 EspecificacaoVista; GET → 200 { itens }, da
// mais nova para a mais antiga (RF-08). Adaptadores finos sobre o serviço: autorização, Zod e erro ficam em rota(); a
// autoria vem só do ator (C-11). O id da demanda passa pela regex antes de qualquer consulta (C-17).
import { paramId, rota } from '../../../../../lib/rota';
// M-2 do 0008: no GET, cada item segue vistaDaEspecificacaoPara.
import { listarEspecificacoes, vistaDaEspecificacaoPara } from '../../../../../modules/especificacoes/consultas';
import { criarEspecificacaoSchema } from '../../../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../../../modules/especificacoes/servico';

export const POST = rota(
  { acao: 'criar_especificacao', rota: '/api/demandas/[id]/especificacoes', params: paramId.demanda, corpo: criarEspecificacaoSchema },
  async ({ deps, ator, params, corpo }) => ({ status: 201, json: await criarEspecificacao(deps, ator, params.id, corpo) }),
);

export const GET = rota(
  { acao: 'ler_especificacao', rota: '/api/demandas/[id]/especificacoes', params: paramId.demanda },
  async ({ deps, ator, params }) => ({ json: { itens: (await listarEspecificacoes(deps.db, params.id)).map((v) => vistaDaEspecificacaoPara(ator, v)) } }),
);
