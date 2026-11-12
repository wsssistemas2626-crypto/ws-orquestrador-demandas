// GET /api/pareceres-risco/:rskId → 200 ParecerRiscoVista com `versaoMaisNova` e `especificacaoMaisNova` (RF-09). Só
// GET: versão gravada não muda (RF-11, CA-11.1), e o Next responde 405 a PATCH, PUT e DELETE. O id passa pela regex
// antes de qualquer consulta (C-17).
import { paramId, rota } from '../../../../lib/rota';
import { exigirVisivelPara } from '../../../../modules/demandas/confirmacao';
import { nomesDaDemanda } from '../../../../modules/demandas/consultas';
// M-2 do 0008: a resposta segue vistaDoParecerPara (só pessoa vê o nome do autor). M-a do 0009: e o texto livre sai
// minimizado para quem não é pessoa, com o nome do solicitante da demanda do RSK.
import { obterParecerRisco, vistaDoParecerPara } from '../../../../modules/pareceres-risco/consultas';

export const GET = rota(
  { acao: 'ler_parecer_risco', rota: '/api/pareceres-risco/[rskId]', params: paramId.versao('rskId', 'RSK') },
  async ({ deps, ator, params }) => {
    const v = await obterParecerRisco(deps.db, params.rskId);
    // M-1 da 0019: o RSK de demanda que aguarda confirmação dá, para agente e sistema, o mesmo 404 do inexistente.
    await exigirVisivelPara(deps.db, ator, v.demandaId);
    return { json: vistaDoParecerPara(ator, v, await nomesDaDemanda(deps.db, v.demandaId)) };
  },
);
