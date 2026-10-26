// GET /api/demandas/:id → 200 DemandaVista (sem texto bruto nem origem); PATCH /api/demandas/:id
// (alterarDemandaSchema) → 200 DemandaVista (RF-06, RF-07). O id passa pela regex antes de qualquer consulta (C-17).
import { ErroDominio } from '../../../../lib/erros';
import { paramId, rota } from '../../../../lib/rota';
import type { Ator, AtorPessoa } from '../../../../modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../../../../modules/acesso/mensagens';
import { obterDemanda } from '../../../../modules/demandas/consultas';
import { alterarDemandaSchema } from '../../../../modules/demandas/schemas';
import { alterarDemanda } from '../../../../modules/demandas/servico';

// `alterar_demanda` é só de pessoa na matriz, e rota() já autorizou; isto só estreita o tipo para o serviço, sem
// confiar no cast.
function somentePessoa(ator: Ator): AtorPessoa {
  if (ator.tipo !== 'pessoa') throw new ErroDominio('sem_permissao', MENSAGENS_ACESSO.sem_permissao);
  return ator;
}

export const GET = rota({ acao: 'ler_demanda', rota: '/api/demandas/[id]', params: paramId.demanda }, async ({ deps, params }) => ({
  json: await obterDemanda(deps.db, params.id),
}));

export const PATCH = rota(
  { acao: 'alterar_demanda', rota: '/api/demandas/[id]', params: paramId.demanda, corpo: alterarDemandaSchema },
  async ({ deps, ator, params, corpo }) => ({ json: await alterarDemanda(deps, somentePessoa(ator), params.id, corpo) }),
);
