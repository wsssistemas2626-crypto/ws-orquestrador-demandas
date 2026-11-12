// GET /api/pedidos-construcao/pendentes → 200 { itens: [{ decId }] } (RF-12, CA-12.6). Só a integração `construir`, pela
// matriz; Bearer sem Origin é aceito (cliente de servidor, C-15). Só leitura. Adaptador fino sobre o serviço:
// autorização, erro, nosniff e no-store ficam em rota().
import { rota } from '../../../../lib/rota';
import { pendentesPara } from '../../../../modules/pedido-construcao/entregar';

export const GET = rota({ acao: 'listar_pedidos_pendentes', rota: '/api/pedidos-construcao/pendentes' }, async ({ deps, ator }) => ({
  json: { itens: await pendentesPara(deps, ator) },
}));
