// Corpo da geração do Pedido de Construção (D3 do 0013): uma regra só para a rota (POST
// /api/pacotes-decisao/:decId/pedido-construcao) e para a Server Action da T11. `z.object` descarta chave desconhecida
// (C-11, como os outros schemas); tipo errado ("true", 1) é 400 entrada_invalida, como em todo corpo. A falta da
// confirmação, ou `false`, não é erro de formato: quem recusa, com 422, é gerarPedido, que vale também para quem chama a
// função direto.
import { z } from 'zod';

export const confirmacaoDoPedidoSchema = z.object({ confirmaSemDadoPessoal: z.boolean().optional() });
export type ConfirmacaoDoPedido = z.output<typeof confirmacaoDoPedidoSchema>;
