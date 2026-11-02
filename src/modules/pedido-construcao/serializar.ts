// Serialização determinística do Pedido de Construção (RF-22, CA-22.2): dois espaços de recuo e uma quebra de linha no
// fim, como um arquivo de pedidos/ da estruturaAutonoma. A ordem das chaves é a da montagem (montar.ts).
import type { PedidoConstrucao } from './montar';

export function serializarPedido(p: PedidoConstrucao): string {
  return `${JSON.stringify(p, null, 2)}\n`;
}
