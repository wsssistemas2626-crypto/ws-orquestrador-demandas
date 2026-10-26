// GET /api/pacotes-decisao?statusDecisao&limit&offset → 200 { itens, total, limit, offset }, do mais novo para o mais
// antigo, com `desatualizado` em cada item (RF-23). Status fora da lista, limit acima de 100 ou chave repetida → 400
// pelo Zod em rota(). A query não vai ao log (C-21).
import { rota } from '../../../lib/rota';
import { listarPacotes } from '../../../modules/pacotes-decisao/consultas';
import { filtroPacotesSchema } from '../../../modules/pacotes-decisao/schemas';

export const GET = rota({ acao: 'ler_pacote_decisao', rota: '/api/pacotes-decisao', query: filtroPacotesSchema }, async ({ deps, query }) => ({
  json: await listarPacotes(deps.db, query),
}));
