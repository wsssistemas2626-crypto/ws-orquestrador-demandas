// POST /api/pedidos-construcao/:decId/recebimento { sha256 } → 204 sem corpo (RF-14). O /construir manda o Bearer, o
// JSON e nenhum Origin. Só a integração `construir`, pela matriz. O id passa pela regex antes de tudo (C-17), e o corpo
// pelo Zod antes de qualquer consulta ao DEC (D-04). Adaptador fino sobre o serviço: autorização, erro, nosniff e
// no-store ficam em rota().
import { paramId, rota } from '../../../../../lib/rota';
import { receberPedido, recebimentoSchema } from '../../../../../modules/pedido-construcao/receber';

export const POST = rota(
  {
    acao: 'confirmar_recebimento_pedido',
    rota: '/api/pedidos-construcao/[decId]/recebimento',
    params: paramId.versao('decId', 'DEC'),
    corpo: recebimentoSchema,
  },
  async ({ deps, ator, params, corpo }) => {
    await receberPedido(deps, ator, params.decId, corpo.sha256);
    return { status: 204 };
  },
);
