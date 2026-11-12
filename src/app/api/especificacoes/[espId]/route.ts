// GET /api/especificacoes/:espId → 200 EspecificacaoVista com `versaoMaisNova` (RF-08). Só GET: versão gravada não muda
// (RF-11, CA-11.1), e o Next responde 405 a PATCH, PUT e DELETE. O id passa pela regex antes de qualquer consulta (C-17).
import { paramId, rota } from '../../../../lib/rota';
import { exigirVisivelPara } from '../../../../modules/demandas/confirmacao';
import { nomesDaDemanda } from '../../../../modules/demandas/consultas';
// M-2 do 0008: a resposta segue vistaDaEspecificacaoPara (só pessoa vê o nome do autor). M-a do 0009: e o texto livre
// sai minimizado para quem não é pessoa, com o nome do solicitante da demanda da ESP.
import { obterEspecificacao, vistaDaEspecificacaoPara } from '../../../../modules/especificacoes/consultas';

export const GET = rota(
  { acao: 'ler_especificacao', rota: '/api/especificacoes/[espId]', params: paramId.versao('espId', 'ESP') },
  async ({ deps, ator, params }) => {
    const v = await obterEspecificacao(deps.db, params.espId);
    // M-1 da 0019: a ESP de demanda que aguarda confirmação dá, para agente e sistema, o mesmo 404 da inexistente.
    await exigirVisivelPara(deps.db, ator, v.demandaId);
    return { json: vistaDaEspecificacaoPara(ator, v, await nomesDaDemanda(deps.db, v.demandaId)) };
  },
);
