// POST /api/demandas/:id/pacotes-decisao (criarPacoteDecisaoSchema) → 201 PacoteDecisaoVista, ou 400 com `faltando`
// quando a demanda não tem ESP ou RSK; GET → 200 { itens }, do mais novo para o mais antigo (RF-10). Adaptadores finos
// sobre o serviço: autorização, Zod e erro ficam em rota(); a autoria vem só do ator (C-11). O id da demanda passa pela
// regex antes de qualquer consulta (C-17).
import { paramId, rota } from '../../../../../lib/rota';
import { exigirVisivelPara } from '../../../../../modules/demandas/confirmacao';
import { nomesDaDemanda } from '../../../../../modules/demandas/consultas';
// M-2 do 0008: no GET, cada item segue vistaDoPacotePara. M-a do 0009: o 201 do POST também, e o texto livre sai
// minimizado para quem não é pessoa, com o nome do solicitante da demanda do caminho.
import { listarPacotesDaDemanda, vistaDoPacotePara } from '../../../../../modules/pacotes-decisao/consultas';
import { criarPacoteDecisaoComNomes } from '../../../../../modules/pacotes-decisao/criar';
import { criarPacoteDecisaoSchema } from '../../../../../modules/pacotes-decisao/schemas';

export const POST = rota(
  { acao: 'criar_pacote_decisao', rota: '/api/demandas/[id]/pacotes-decisao', params: paramId.demanda, corpo: criarPacoteDecisaoSchema },
  async ({ deps, ator, params, corpo }) => {
    // B-3 do 0010: os nomes vêm do serviço, tirados da linha da demanda travada, na mesma transação da gravação. Uma
    // renomeação no meio não sai em claro no 201, e se a conta falhar nada foi gravado, nem o status, nem o aviso (B-3
    // do 0009). Demanda que não existe continua com o 404 do serviço. Quatro argumentos, sem `t` nem `extras` (B-1 do
    // 0006, guarda em test/estatico/pacote-sem-extras.test.ts).
    const { vista, nomes } = await criarPacoteDecisaoComNomes(deps, ator, params.id, corpo);
    return { status: 201, json: vistaDoPacotePara(ator, vista, nomes) };
  },
);

// M-1 da 0019: para agente e sistema, a demanda que aguarda confirmação dá o mesmo 404 da inexistente, antes de listar.
export const GET = rota({ acao: 'ler_pacote_decisao', rota: '/api/demandas/[id]/pacotes-decisao', params: paramId.demanda }, async ({ deps, ator, params }) => {
  await exigirVisivelPara(deps.db, ator, params.id);
  const itens = await listarPacotesDaDemanda(deps.db, params.id);
  const nomes = await nomesDaDemanda(deps.db, params.id);
  return { json: { itens: itens.map((v) => vistaDoPacotePara(ator, v, nomes)) } };
});
