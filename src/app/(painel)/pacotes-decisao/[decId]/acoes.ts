'use server';

// Server Action da T11 Decisão do pacote (RF-13, RF-14): a mesma regra de PATCH /api/pacotes-decisao/:decId/decisao
// (registrarDecisao, T21), com o schema da API e a mesma autorização (`registrar_decisao`: só pessoa), pelo adaptador
// único do painel (acaoDoPainel, C-04). O id passa pela regex de DEC antes de tocar o banco (C-17). Quem aprova, com que
// nome e em nome de quem vem só da sessão (C-11, P1-a): a tela não manda `registrarComo`, e o servidor confere o papel
// (P1-b) e a opção da segunda aprovação. A resposta leva só o id e o resultado; nada do comentário volta nem vai ao log.
import { z } from 'zod';
import { RE_ID_DEC } from '../../../../components/dados-do-pacote';
import { acaoDoPainel, type ResultadoAcao } from '../../../../lib/acao-painel';
import { registrarDecisao, type ResultadoDecisao } from '../../../../modules/pacotes-decisao/decidir';
import { registrarDecisaoSchema } from '../../../../modules/pacotes-decisao/schemas';

// O corpo da API fica inteiro em `decisao`: o schema é uma união discriminada e não aceita `.extend`.
const decisaoSchema = z.object({ decId: z.string().regex(RE_ID_DEC), decisao: registrarDecisaoSchema });

export type ResultadoDaDecisaoNoPainel = { decId: string; resultado: ResultadoDecisao };

const decidir = acaoDoPainel({ acao: 'registrar_decisao', entrada: decisaoSchema }, async ({ ator, entrada, deps }): Promise<ResultadoDaDecisaoNoPainel> => {
  const { resultado } = await registrarDecisao(deps, ator, entrada.decId, entrada.decisao);
  return { decId: entrada.decId, resultado };
});

export async function registrarDecisaoNoPainel(entrada: unknown): Promise<ResultadoAcao<ResultadoDaDecisaoNoPainel>> {
  return decidir(entrada);
}
