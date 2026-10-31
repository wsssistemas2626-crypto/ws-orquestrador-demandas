'use server';

// Server Action da T09 Novo pacote de decisão (RF-10, RF-19): a mesma regra de POST /api/demandas/:id/pacotes-decisao
// (criarPacoteDecisao, T20), com o schema da API e a mesma autorização, pelo adaptador único do painel (acaoDoPainel,
// C-04). O id da demanda passa pela regex antes de tocar o banco (C-17); a autoria vem só da sessão (C-11: o schema
// descarta chave desconhecida). O serviço cita a ESP e o RSK mais novos, leva a demanda a Pronta para decisão e põe o
// aviso por e-mail na fila (RF-25), numa transação. A resposta leva só os ids: nada dos campos volta ao navegador nem vai
// ao log (C-21).
import { z } from 'zod';
import type { ResultadoGravacaoPacote } from '../../../../../../components/dados-do-pacote';
import { acaoDoPainel, type ResultadoAcao } from '../../../../../../lib/acao-painel';
import { RE_ID_DEMANDA } from '../../../../../../modules/demandas/gerar-id';
import { criarPacoteDecisao } from '../../../../../../modules/pacotes-decisao/criar';
import { criarPacoteDecisaoSchema } from '../../../../../../modules/pacotes-decisao/schemas';

const gravacaoSchema = criarPacoteDecisaoSchema.extend({ demandaId: z.string().regex(RE_ID_DEMANDA) });

const gravar = acaoDoPainel({ acao: 'criar_pacote_decisao', entrada: gravacaoSchema }, async ({ ator, entrada, deps }): Promise<ResultadoGravacaoPacote> => {
  const { demandaId, ...pacote } = entrada;
  const dec = await criarPacoteDecisao(deps, ator, demandaId, pacote);
  return { id: dec.id, demandaId };
});

export async function gravarPacoteNoPainel(entrada: unknown): Promise<ResultadoAcao<ResultadoGravacaoPacote>> {
  return gravar(entrada);
}
