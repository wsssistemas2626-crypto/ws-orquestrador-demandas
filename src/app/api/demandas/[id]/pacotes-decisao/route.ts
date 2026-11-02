// POST /api/demandas/:id/pacotes-decisao (criarPacoteDecisaoSchema) → 201 PacoteDecisaoVista, ou 400 com `faltando`
// quando a demanda não tem ESP ou RSK; GET → 200 { itens }, do mais novo para o mais antigo (RF-10). Adaptadores finos
// sobre o serviço: autorização, Zod e erro ficam em rota(); a autoria vem só do ator (C-11). O id da demanda passa pela
// regex antes de qualquer consulta (C-17).
import { paramId, rota } from '../../../../../lib/rota';
import { listarPacotesDaDemanda } from '../../../../../modules/pacotes-decisao/consultas';
import { criarPacoteDecisao } from '../../../../../modules/pacotes-decisao/criar';
import { criarPacoteDecisaoSchema } from '../../../../../modules/pacotes-decisao/schemas';

export const POST = rota(
  { acao: 'criar_pacote_decisao', rota: '/api/demandas/[id]/pacotes-decisao', params: paramId.demanda, corpo: criarPacoteDecisaoSchema },
  async ({ deps, ator, params, corpo }) => ({ status: 201, json: await criarPacoteDecisao(deps, ator, params.id, corpo) }),
);

export const GET = rota(
  { acao: 'ler_pacote_decisao', rota: '/api/demandas/[id]/pacotes-decisao', params: paramId.demanda },
  async ({ deps, params }) => ({ json: { itens: await listarPacotesDaDemanda(deps.db, params.id) } }),
);
