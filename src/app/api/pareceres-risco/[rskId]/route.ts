// GET /api/pareceres-risco/:rskId → 200 ParecerRiscoVista com `versaoMaisNova` e `especificacaoMaisNova` (RF-09). Só
// GET: versão gravada não muda (RF-11, CA-11.1), e o Next responde 405 a PATCH, PUT e DELETE. O id passa pela regex
// antes de qualquer consulta (C-17).
import { paramId, rota } from '../../../../lib/rota';
// M-2 do 0008: a resposta segue vistaDoParecerPara (só pessoa vê o nome do autor).
import { obterParecerRisco, vistaDoParecerPara } from '../../../../modules/pareceres-risco/consultas';

export const GET = rota(
  { acao: 'ler_parecer_risco', rota: '/api/pareceres-risco/[rskId]', params: paramId.versao('rskId', 'RSK') },
  async ({ deps, ator, params }) => ({ json: vistaDoParecerPara(ator, await obterParecerRisco(deps.db, params.rskId)) }),
);
