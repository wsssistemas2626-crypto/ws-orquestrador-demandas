'use server';

// Server Action da T04 Nova demanda (RF-03, RF-05): a mesma regra de POST /api/demandas/entrada, com o mesmo schema
// (entradaSchema, T17) e a mesma autorização, pelo adaptador único do painel (acaoDoPainel, C-04). A resposta leva só o
// id da demanda (modo manual) ou o aviso de que a entrada foi ao agente: nada do texto colado nem do solicitante volta
// ao navegador, e nada disso vai ao log (C-21).
import { acaoDoPainel, type ResultadoAcao } from '../../../../lib/acao-painel';
import { entradaSchema, registrarEntrada } from '../../../../modules/demandas/entrada';

export type ResultadoEntradaNoPainel = { tipo: 'demanda'; id: string } | { tipo: 'pendente' };

const registrar = acaoDoPainel({ acao: 'registrar_entrada', entrada: entradaSchema }, async ({ ator, entrada, deps }): Promise<ResultadoEntradaNoPainel> => {
  const r = await registrarEntrada(deps, ator, entrada);
  return r.tipo === 'demanda' ? { tipo: 'demanda', id: r.demanda.id } : { tipo: 'pendente' };
});

export async function registrarEntradaNoPainel(entrada: unknown): Promise<ResultadoAcao<ResultadoEntradaNoPainel>> {
  return registrar(entrada);
}
