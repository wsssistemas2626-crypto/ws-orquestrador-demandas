// GET /api/especificacoes/:espId → 200 EspecificacaoVista com `versaoMaisNova` (RF-08). Só GET: versão gravada não muda
// (RF-11, CA-11.1), e o Next responde 405 a PATCH, PUT e DELETE. O id passa pela regex antes de qualquer consulta (C-17).
import { paramId, rota } from '../../../../lib/rota';
import { obterEspecificacao } from '../../../../modules/especificacoes/consultas';

export const GET = rota(
  { acao: 'ler_especificacao', rota: '/api/especificacoes/[espId]', params: paramId.versao('espId', 'ESP') },
  async ({ deps, params }) => ({ json: await obterEspecificacao(deps.db, params.espId) }),
);
