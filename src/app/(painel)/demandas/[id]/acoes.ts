'use server';

// Server Action de "Mudar status" da T05 (RF-07, CA-07.3): a mesma regra de PATCH /api/demandas/:id com só o status
// (alterarDemanda, T15, que confere a tabela de transições, o pacote aprovado e atualizado e o tipo Estudo, e grava o
// evento com a pessoa). O id passa pela regex antes de tocar o banco (C-17). A resposta leva só o id e o status novo.
import { z } from 'zod';
import { acaoDoPainel, type ResultadoAcao } from '../../../../lib/acao-painel';
import { RE_ID_DEMANDA } from '../../../../modules/demandas/gerar-id';
import { STATUS, type Status } from '../../../../modules/demandas/schemas';
import { alterarDemanda } from '../../../../modules/demandas/servico';

const mudarStatusSchema = z.object({ id: z.string().regex(RE_ID_DEMANDA), status: z.enum(STATUS) });

const mudar = acaoDoPainel({ acao: 'alterar_demanda', entrada: mudarStatusSchema }, async ({ ator, entrada, deps }): Promise<{ id: string; status: Status }> => {
  const d = await alterarDemanda(deps, ator, entrada.id, { status: entrada.status });
  return { id: d.id, status: d.status };
});

export async function mudarStatusNoPainel(pedido: unknown): Promise<ResultadoAcao<{ id: string; status: Status }>> {
  return mudar(pedido);
}
