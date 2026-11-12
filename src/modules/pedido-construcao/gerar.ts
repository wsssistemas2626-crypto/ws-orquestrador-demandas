// Geração do Pedido de Construção (RF-22, C-28, ADR-05). Nesta ordem:
//   1. autorizar: só pessoa (agente e sistema recebem 403, também chamando a função direto);
//   2. a confirmação de que o texto não tem dado pessoal (D3 do 0013): sem ela, ou `false`, 422 antes de tocar o banco
//      (não diz se o DEC existe);
//   3. a conferência e a montagem de conferir.ts (ADR-26), a mesma da entrega ao /construir: trava da demanda, status
//      final, aprovada, substituído, desatualizado, estudo, montagem só com a ESP e o RSK citados, C-28 e nome do
//      solicitante atual, validarPedido;
//   4. evento `pedido_gerado` com a confirmação, e o JSON serializado.
// Recusado em 2 ou 3, nada é entregue e nenhum evento é gravado. O mesmo DEC gera sempre o mesmo pedido (CA-22.2) quando
// aceito. Aceita a transação de quem chama (G3.8).
import { comTransacao, type Transacao } from '../../db/transacao';
import { ErroDominio } from '../../lib/erros';
import type { Ator } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import type { DepsDemanda } from '../demandas/servico';
import { registrarEvento } from '../historico/registrar';
import { MENSAGENS_PEDIDO, conferirEMontarPedido } from './conferir';
import type { ConfirmacaoDoPedido } from './schemas';

export { MENSAGENS_PEDIDO };

export async function gerarPedido(
  deps: DepsDemanda,
  ator: Ator,
  decId: string,
  entrada: ConfirmacaoDoPedido,
  t?: Transacao,
): Promise<{ nomeArquivo: string; json: string }> {
  autorizar(ator, 'gerar_pedido_construcao');
  if (entrada.confirmaSemDadoPessoal !== true) throw new ErroDominio('nao_processavel', MENSAGENS_PEDIDO.semConfirmacao);

  const corpo = async ({ tx }: Transacao): Promise<string> => {
    const { dec, json } = await conferirEMontarPedido(tx, decId);
    // Sem conteúdo no evento: o pedido leva texto de ESP e RSK (C-30). Só o booleano fixo da confirmação (D3 do 0013).
    await registrarEvento(
      tx,
      { ator, demandaId: dec.demandaId, entidade: 'pacote_decisao', entidadeId: dec.id, acao: 'pedido_gerado', depois: { confirmaSemDadoPessoal: true } },
      deps.relogio,
    );
    return json;
  };

  const json = t ? await corpo(t) : await comTransacao(deps.pool, corpo);
  return { nomeArquivo: `${decId}.json`, json };
}
