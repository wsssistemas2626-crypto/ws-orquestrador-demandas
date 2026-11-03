// GET /api/pacotes-decisao?statusDecisao&limit&offset → 200 { itens, total, limit, offset }, do mais novo para o mais
// antigo, com `desatualizado` em cada item (RF-23). Status fora da lista, limit acima de 100 ou chave repetida → 400
// pelo Zod em rota(). A query não vai ao log (C-21).
import { rota } from '../../../lib/rota';
// M-2 do 0008: cada item segue vistaDoPacotePara.
import { listarPacotes, vistaDoPacotePara } from '../../../modules/pacotes-decisao/consultas';
import { filtroPacotesSchema } from '../../../modules/pacotes-decisao/schemas';

export const GET = rota({ acao: 'ler_pacote_decisao', rota: '/api/pacotes-decisao', query: filtroPacotesSchema }, async ({ deps, ator, query }) => {
  const { itens, ...pagina } = await listarPacotes(deps.db, query);
  return { json: { itens: itens.map((v) => vistaDoPacotePara(ator, v)), ...pagina } };
});
