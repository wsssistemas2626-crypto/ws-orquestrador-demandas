// Entrega do Pedido de Construção ao /construir (RF-12, RF-13, ADR-26, IN-10, IN-12, IN-14, P-02). Só a integração
// `construir`, pela matriz. Nesta ordem, numa transação com o orçamento `entrega` (ADR-28):
//   1. IN-10: só o pedido que uma pessoa gerou; sem `pedido_gerado` de pessoa, o mesmo 404 de DEC inexistente;
//   2. a conferência e a montagem da geração (conferir.ts), sob a trava da demanda e sem pedir de novo a confirmação:
//      os bytes são os da geração por construção (CA-22.2), e as recusas são as dela, sem evento;
//   3. P-02: um `pedido_entregue` por hash, com o hash calculado aqui (IN-12), nunca o texto do cliente. A trava da
//      demanda põe em fila as entregas ao mesmo tempo, então o hash é conferido e gravado uma vez só.
// A lista de pendentes só lê (CA-12.6). Nenhuma linha de log aqui: a de rota() já leva só o tipo do ator (G3.10).
import { createHash } from 'node:crypto';
import type { Transacao } from '../../db/transacao';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import type { Ator } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import type { DepsDemanda } from '../demandas/servico';
import { registrarEvento } from '../historico/registrar';
import { executarComOrcamento } from '../integracoes/tempo-limite';
import { conferirEMontarPedido } from './conferir';
import { RE_SHA256, listarPendentes, pedidoGeradoPorPessoa, shasEntregues } from './pendentes';

export { RE_SHA256 };

export const sha256DoPedido = (json: string): string => createHash('sha256').update(json, 'utf8').digest('hex');

const naoEncontrado = () => new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);

export async function pendentesPara(deps: DepsDemanda, ator: Ator): Promise<Array<{ decId: string }>> {
  autorizar(ator, 'listar_pedidos_pendentes');
  const itens = await executarComOrcamento(deps.pool, ator, 'padrao', undefined, ({ tx }) => listarPendentes(tx));
  // Chave a chave (CA-12.6): nada além do id sai, mesmo que a consulta passe a trazer mais.
  return itens.map((i) => ({ decId: i.decId }));
}

export async function entregarPedido(deps: DepsDemanda, ator: Ator, decId: string, t?: Transacao): Promise<{ json: string; sha256: string }> {
  autorizar(ator, 'entregar_pedido');
  return executarComOrcamento(deps.pool, ator, 'entrega', t, async ({ tx }) => {
    if (!(await pedidoGeradoPorPessoa(tx, decId))) throw naoEncontrado();
    const { dec, json } = await conferirEMontarPedido(tx, decId);
    const sha256 = sha256DoPedido(json);
    if (!RE_SHA256.test(sha256)) throw new Error('entrega: sha256 fora do formato');
    if (!(await shasEntregues(tx, decId)).includes(sha256)) {
      await registrarEvento(
        tx,
        { ator, demandaId: dec.demandaId, entidade: 'pacote_decisao', entidadeId: dec.id, acao: 'pedido_entregue', depois: { sha256 } },
        deps.relogio,
      );
    }
    return { json, sha256 };
  });
}
