// GET /api/pacotes-decisao/:decId → 200 PacoteDecisaoVista, com `statusDecisao`, `aprovadores` e `desatualizado`
// (RF-10, RF-12). Só GET: versão gravada não muda (RF-11, CA-11.1), e o Next responde 405 a PATCH, PUT e DELETE; a
// decisão tem rota própria (T21). O id passa pela regex antes de qualquer consulta (C-17).
import { paramId, rota } from '../../../../lib/rota';
import { exigirVisivelPara } from '../../../../modules/demandas/confirmacao';
import { nomesDaDemanda } from '../../../../modules/demandas/consultas';
// M-2 do 0008: a resposta segue vistaDoPacotePara (só pessoa vê autor, aprovadores, referência e decididaPor). M-a do
// 0009: e o texto livre sai minimizado para quem não é pessoa, com o nome do solicitante da demanda do DEC.
import { obterPacoteDecisao, vistaDoPacotePara } from '../../../../modules/pacotes-decisao/consultas';

export const GET = rota(
  { acao: 'ler_pacote_decisao', rota: '/api/pacotes-decisao/[decId]', params: paramId.versao('decId', 'DEC') },
  async ({ deps, ator, params }) => {
    const v = await obterPacoteDecisao(deps.db, params.decId);
    // M-1 da 0019: o DEC de demanda que aguarda confirmação dá, para agente e sistema, o mesmo 404 do inexistente.
    await exigirVisivelPara(deps.db, ator, v.demandaId);
    return { json: vistaDoPacotePara(ator, v, await nomesDaDemanda(deps.db, v.demandaId)) };
  },
);
