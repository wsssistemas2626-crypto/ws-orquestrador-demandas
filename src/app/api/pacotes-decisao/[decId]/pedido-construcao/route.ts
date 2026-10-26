// POST /api/pacotes-decisao/:decId/pedido-construcao → 200 com o Pedido de Construção para baixar (RF-22). POST, e não
// GET, porque a geração grava evento (C-16; sem GET exportado, o Next responde 405). Só pessoa com 2FA, pela matriz.
// Corpo da resposta = o JSON gerado, byte a byte; `filename` montado do id que já passou pela regex (C-29, C-17).
// Adaptador fino sobre o serviço: autorização, erro, nosniff e no-store ficam em rota().
import { paramId, rota } from '../../../../../lib/rota';
import { gerarPedido } from '../../../../../modules/pedido-construcao/gerar';

export const POST = rota(
  {
    acao: 'gerar_pedido_construcao',
    rota: '/api/pacotes-decisao/[decId]/pedido-construcao',
    params: paramId.versao('decId', 'DEC'),
  },
  async ({ deps, ator, params }) => {
    const { nomeArquivo, json } = await gerarPedido(deps, ator, params.decId);
    return {
      texto: json,
      cabecalhos: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': `attachment; filename="${nomeArquivo}"`,
      },
    };
  },
);
