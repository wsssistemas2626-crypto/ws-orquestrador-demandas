// GET /api/demandas/:id → 200 DemandaVista (sem texto bruto nem origem); PATCH /api/demandas/:id
// (alterarDemandaSchema) → 200 DemandaVista (RF-06, RF-07). O id passa pela regex antes de qualquer consulta (C-17).
// M-06 (C-10, RF-20): no GET, quem não é pessoa recebe a vista mínima (vistaDaDemandaPara). O PATCH é só de pessoa.
import { paramId, rota } from '../../../../lib/rota';
import { exigirAtorPessoa } from '../../../../modules/acesso/ator-pessoa';
import { obterDemanda, vistaDaDemandaPara } from '../../../../modules/demandas/consultas';
import { alterarDemandaSchema } from '../../../../modules/demandas/schemas';
import { alterarDemanda } from '../../../../modules/demandas/servico';

export const GET = rota({ acao: 'ler_demanda', rota: '/api/demandas/[id]', params: paramId.demanda }, async ({ deps, ator, params }) => ({
  json: vistaDaDemandaPara(ator, await obterDemanda(deps.db, params.id)),
}));

export const PATCH = rota(
  { acao: 'alterar_demanda', rota: '/api/demandas/[id]', params: paramId.demanda, corpo: alterarDemandaSchema },
  async ({ deps, ator, params, corpo }) => ({ json: await alterarDemanda(deps, exigirAtorPessoa(ator), params.id, corpo) }),
);
