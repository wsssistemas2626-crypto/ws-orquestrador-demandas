// GET /api/pacotes-decisao/:decId → 200 PacoteDecisaoVista, com `statusDecisao`, `aprovadores` e `desatualizado`
// (RF-10, RF-12). Só GET: versão gravada não muda (RF-11, CA-11.1), e o Next responde 405 a PATCH, PUT e DELETE; a
// decisão tem rota própria (T21). O id passa pela regex antes de qualquer consulta (C-17).
import { paramId, rota } from '../../../../lib/rota';
// M-2 do 0008: a resposta segue vistaDoPacotePara (só pessoa vê autor, aprovadores, referência e decididaPor).
import { obterPacoteDecisao, vistaDoPacotePara } from '../../../../modules/pacotes-decisao/consultas';

export const GET = rota(
  { acao: 'ler_pacote_decisao', rota: '/api/pacotes-decisao/[decId]', params: paramId.versao('decId', 'DEC') },
  async ({ deps, ator, params }) => ({ json: vistaDoPacotePara(ator, await obterPacoteDecisao(deps.db, params.decId)) }),
);
