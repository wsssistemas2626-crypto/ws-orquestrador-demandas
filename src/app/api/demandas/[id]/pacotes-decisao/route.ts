// POST /api/demandas/:id/pacotes-decisao (criarPacoteDecisaoSchema) → 201 PacoteDecisaoVista, ou 400 com `faltando`
// quando a demanda não tem ESP ou RSK; GET → 200 { itens }, do mais novo para o mais antigo (RF-10). Adaptadores finos
// sobre o serviço: autorização, Zod e erro ficam em rota(); a autoria vem só do ator (C-11). O id da demanda passa pela
// regex antes de qualquer consulta (C-17).
import { paramId, rota } from '../../../../../lib/rota';
import { nomesDaDemanda } from '../../../../../modules/demandas/consultas';
// M-2 do 0008: no GET, cada item segue vistaDoPacotePara. M-a do 0009: o 201 do POST também, e o texto livre sai
// minimizado para quem não é pessoa, com o nome do solicitante da demanda do caminho.
import { listarPacotesDaDemanda, vistaDoPacotePara } from '../../../../../modules/pacotes-decisao/consultas';
import { criarPacoteDecisao } from '../../../../../modules/pacotes-decisao/criar';
import { criarPacoteDecisaoSchema } from '../../../../../modules/pacotes-decisao/schemas';

export const POST = rota(
  { acao: 'criar_pacote_decisao', rota: '/api/demandas/[id]/pacotes-decisao', params: paramId.demanda, corpo: criarPacoteDecisaoSchema },
  async ({ deps, ator, params, corpo }) => {
    // B-3 do 0009: os nomes antes de gravar. Se a leitura falhar, nada foi gravado (nem o status, nem o aviso) e a nova
    // tentativa não duplica a versão. Demanda que não existe devolve [] aqui, e o 404 continua vindo do serviço.
    const nomes = await nomesDaDemanda(deps.db, params.id);
    const v = await criarPacoteDecisao(deps, ator, params.id, corpo);
    return { status: 201, json: vistaDoPacotePara(ator, v, nomes) };
  },
);

export const GET = rota({ acao: 'ler_pacote_decisao', rota: '/api/demandas/[id]/pacotes-decisao', params: paramId.demanda }, async ({ deps, ator, params }) => {
  const itens = await listarPacotesDaDemanda(deps.db, params.id);
  const nomes = await nomesDaDemanda(deps.db, params.id);
  return { json: { itens: itens.map((v) => vistaDoPacotePara(ator, v, nomes)) } };
});
