// GET /api/pedidos-construcao/:decId/situacao → 200 { situacao: 'vigente' | 'substituido' } (RF-01, 0.4.1). Só a
// integração `construir`, pela matriz. O id passa pela regex antes de tudo (C-17). Adaptador fino: autorização, erro,
// nosniff e no-store ficam em rota(). O corpo é montado chave a chave (SB-03).
import { paramId, rota } from '../../../../../lib/rota';
import { situacaoDoPedido } from '../../../../../modules/pedido-construcao/situacao';

export const GET = rota(
  { acao: 'ler_situacao_pedido', rota: '/api/pedidos-construcao/[decId]/situacao', params: paramId.versao('decId', 'DEC') },
  async ({ deps, ator, params }) => {
    const situacao = await situacaoDoPedido(deps, ator, params.decId);
    return { json: { situacao } };
  },
);
