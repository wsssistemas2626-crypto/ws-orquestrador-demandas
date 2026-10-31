'use server';

// Server Action da T06 Editar dados (RF-06): a mesma regra de PATCH /api/demandas/:id (alterarDemanda, T15), com o
// schema da API sem o status, que muda só no detalhe (T05). O id passa pela regex antes de tocar o banco (C-17). A
// resposta leva só o id; o histórico registra o antes e o depois de cada campo (T12).
import { z } from 'zod';
import { acaoDoPainel, type ResultadoAcao } from '../../../../../lib/acao-painel';
import { RE_ID_DEMANDA } from '../../../../../modules/demandas/gerar-id';
import { alterarDemandaSchema } from '../../../../../modules/demandas/schemas';
import { alterarDemanda } from '../../../../../modules/demandas/servico';

const edicaoSchema = alterarDemandaSchema.omit({ status: true }).extend({ id: z.string().regex(RE_ID_DEMANDA) });

const alterar = acaoDoPainel({ acao: 'alterar_demanda', entrada: edicaoSchema }, async ({ ator, entrada, deps }): Promise<{ id: string }> => {
  const { id, ...mudancas } = entrada;
  const d = await alterarDemanda(deps, ator, id, mudancas);
  return { id: d.id };
});

export async function alterarDadosNoPainel(edicao: unknown): Promise<ResultadoAcao<{ id: string }>> {
  return alterar(edicao);
}
