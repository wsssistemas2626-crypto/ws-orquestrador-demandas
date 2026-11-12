// POST /api/pedidos-construcao/:decId/entrega → 200 com o Pedido de Construção, byte a byte o da geração (RF-13,
// CA-22.2). POST, e não GET, porque a entrega grava `pedido_entregue` (C-16). Sem corpo: o /construir manda só o Bearer,
// sem Origin e sem content-type. Só a integração `construir`, pela matriz. O id passa pela regex antes de tudo (C-17).
// Adaptador fino sobre o serviço: autorização, erro, nosniff e no-store ficam em rota().
import { paramId, rota } from '../../../../../lib/rota';
import { entregarPedido } from '../../../../../modules/pedido-construcao/entregar';

export const POST = rota(
  { acao: 'entregar_pedido', rota: '/api/pedidos-construcao/[decId]/entrega', params: paramId.versao('decId', 'DEC') },
  async ({ deps, ator, params }) => {
    const { json } = await entregarPedido(deps, ator, params.decId);
    return { texto: json, cabecalhos: { 'content-type': 'application/json; charset=utf-8' } };
  },
);
