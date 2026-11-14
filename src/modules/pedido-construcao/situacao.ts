// src/modules/pedido-construcao/situacao.ts — a situação do Pedido de Construção para o /construir (0.4.1, S-02, RF-01,
// ADR-36). Só a integração `construir`, pela matriz, antes de abrir transação (SB-01). Numa transação com o orçamento
// `padrao` e prazo total, sem transação de quem chama, sem SET próprio e sem trava (SB-03, SB-04): a leitura não espera
// uma entrega nem um envio de andamento em curso. Nesta ordem:
//   1. só DEC com pedido gerado por pessoa (pendentes.ts); senão, o 404 de DEC inexistente (SB-02);
//   2. a demanda do DEC tem de ser a do evento (AN-03 da 0.4.0); senão, o mesmo 404;
//   3. `vigente` se o DEC é o aprovado vigente da demanda (aprovadoVigente, a mesma função do 409 decSubstituido do
//      andamento: a rota e o envio nunca divergem, SB-06); senão, `substituido`.
// Não filtra status final nem substituído (Pendência 4 de 01). Sem evento e sem log próprio: a linha de rota() basta.
// A situação informa, não autoriza: nenhum código do Orquestrador a usa para decidir entrega, recebimento ou andamento.
import { eq } from 'drizzle-orm';
import { pacoteDecisao } from '../../db/schema';
import type { Deps } from '../../lib/deps';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import type { Ator } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import { executarComOrcamento } from '../integracoes/tempo-limite';
import { aprovadoVigente } from '../pacotes-decisao/substituido';
import { pedidoGeradoPorPessoa } from './pendentes';

export const SITUACOES_DO_PEDIDO = ['vigente', 'substituido'] as const;
export type SituacaoDoPedido = (typeof SITUACOES_DO_PEDIDO)[number];
export type DepsSituacao = Pick<Deps, 'pool'>;

const naoEncontrado = () => new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);

export async function situacaoDoPedido(deps: DepsSituacao, ator: Ator, decId: string): Promise<SituacaoDoPedido> {
  autorizar(ator, 'ler_situacao_pedido');
  return executarComOrcamento(deps.pool, ator, 'padrao', undefined, async ({ tx }) => {
    const gerado = await pedidoGeradoPorPessoa(tx, decId);
    if (!gerado) throw naoEncontrado();
    const [dec] = await tx.select({ demandaId: pacoteDecisao.demandaId }).from(pacoteDecisao).where(eq(pacoteDecisao.id, decId));
    if (!dec || dec.demandaId !== gerado.demandaId) throw naoEncontrado();
    // O valor sai do código, nunca do banco (SB-03).
    return (await aprovadoVigente(tx, dec.demandaId))?.id === decId ? 'vigente' : 'substituido';
  });
}
