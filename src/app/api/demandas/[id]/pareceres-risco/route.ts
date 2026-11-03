// POST /api/demandas/:id/pareceres-risco (criarParecerRiscoSchema) → 201 ParecerRiscoVista; GET → 200 { itens }, da
// mais nova para a mais antiga (RF-09). Adaptadores finos sobre o serviço: autorização, Zod e erro ficam em rota(); a
// autoria vem só do ator (C-11). O id da demanda passa pela regex antes de qualquer consulta (C-17).
import { paramId, rota } from '../../../../../lib/rota';
// M-2 do 0008: no GET, cada item segue vistaDoParecerPara.
import { listarPareceresRisco, vistaDoParecerPara } from '../../../../../modules/pareceres-risco/consultas';
import { criarParecerRiscoSchema } from '../../../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../../../modules/pareceres-risco/servico';

export const POST = rota(
  { acao: 'criar_parecer_risco', rota: '/api/demandas/[id]/pareceres-risco', params: paramId.demanda, corpo: criarParecerRiscoSchema },
  async ({ deps, ator, params, corpo }) => ({ status: 201, json: await criarParecerRisco(deps, ator, params.id, corpo) }),
);

export const GET = rota(
  { acao: 'ler_parecer_risco', rota: '/api/demandas/[id]/pareceres-risco', params: paramId.demanda },
  async ({ deps, ator, params }) => ({ json: { itens: (await listarPareceresRisco(deps.db, params.id)).map((v) => vistaDoParecerPara(ator, v)) } }),
);
