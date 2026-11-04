'use server';

// Server Action "Gerar Pedido de Construção" da T11 (RF-22; 04, C-16): a mesma regra de POST
// /api/pacotes-decisao/:decId/pedido-construcao (gerarPedido, T22), com a mesma autorização (`gerar_pedido_construcao`: só
// pessoa) e o mesmo schema do parâmetro e do corpo da rota, pelo adaptador único do painel (acaoDoPainel, C-04). A
// geração grava evento, então é ação (POST), nunca GET. O id passa pela regex de DEC antes de tocar o banco (C-17). A
// confirmação de que o texto não tem dado pessoal (D3 do 0013) vem da caixa da T11 e vai a gerarPedido, que recusa sem
// ela. A resposta leva o nome do arquivo e o JSON exato que a rota devolve; o log de acaoDoPainel não leva nada dele
// (C-21).
import { acaoDoPainel, type ResultadoAcao } from '../../../../lib/acao-painel';
import { paramId } from '../../../../lib/rota';
import { gerarPedido } from '../../../../modules/pedido-construcao/gerar';
import { confirmacaoDoPedidoSchema } from '../../../../modules/pedido-construcao/schemas';

export type PedidoGerado = { nomeArquivo: string; json: string };

const gerar = acaoDoPainel(
  { acao: 'gerar_pedido_construcao', entrada: paramId.versao('decId', 'DEC').extend(confirmacaoDoPedidoSchema.shape) },
  async ({ ator, entrada, deps }): Promise<PedidoGerado> => {
    const { nomeArquivo, json } = await gerarPedido(deps, ator, entrada.decId, { confirmaSemDadoPessoal: entrada.confirmaSemDadoPessoal });
    return { nomeArquivo, json };
  },
);

export async function gerarPedidoNoPainel(entrada: unknown): Promise<ResultadoAcao<PedidoGerado>> {
  return gerar(entrada);
}
