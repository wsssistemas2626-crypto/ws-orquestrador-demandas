// Confirmação de recebimento do Pedido de Construção pelo /construir (RF-14, ADR-26, IN-11, IN-12). Só a integração
// `construir`, pela matriz. Compara o SHA-256 enviado com o hash da última entrega gravada (entregar.ts); não remonta o
// pedido, então o DEC substituído, desatualizado ou com a demanda em status final depois da entrega ainda confirma.
// Numa transação com o orçamento `padrao` (ADR-28), sob a trava consultiva do DEC, a mesma da entrega (IN-11 e M-4 da
// 0019), nesta ordem:
//   1. IN-10: só o pedido que uma pessoa gerou; sem `pedido_gerado` de pessoa, o mesmo 404 de DEC inexistente;
//   2. sem nenhuma entrega, 409 `naoEntregue`; hash diferente do da última entrega (inclusive um entregue antes e já
//      substituído, P1 da 0019), 409 `shaDiferente`, sem dizer se ele já foi entregue;
//   3. já recebido com este hash: sucesso sem gravar (a repetição é idempotente);
//   4. `pedido_recebido` com o hash da entrega que bateu, nunca o texto do cliente (IN-12).
// Recusado em 1 ou 2, nenhum evento. Nenhuma linha de log aqui: a de rota() já leva só o tipo do ator (G3.10).
import { z } from 'zod';
import type { Transacao } from '../../db/transacao';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import type { Ator } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import type { DepsDemanda } from '../demandas/servico';
import { registrarEvento } from '../historico/registrar';
import { executarComOrcamento } from '../integracoes/tempo-limite';
import { RE_SHA256, pedidoGeradoPorPessoa, recebidoComSha, travarPedido, ultimoShaEntregue } from './pendentes';

// 03, seção 8, por inteiro.
export const MENSAGENS_RECEBIMENTO = {
  formato: 'Informe o sha256 com 64 caracteres hexadecimais minúsculos.',
  naoEntregue: 'Este pedido ainda não foi entregue ao /construir. Peça a entrega antes de confirmar o recebimento.',
  shaDiferente: 'O SHA-256 enviado não confere com o pedido entregue. Busque o pedido de novo.',
} as const;

// D-04: issue `custom`, para o mapearErro repassar o texto da 03 em `campos`; ausente, nulo e tipo errado também caem
// aqui. Chave a mais é 400 (C-11). O formato é o de pendentes.ts, uma fonte só (Minor 1 da 06-T10-revisao).
export const recebimentoSchema = z.strictObject({
  sha256: z.custom<string>((v) => typeof v === 'string' && RE_SHA256.test(v), { message: MENSAGENS_RECEBIMENTO.formato }),
});

const naoEncontrado = () => new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);

export async function receberPedido(deps: DepsDemanda, ator: Ator, decId: string, sha256: string, t?: Transacao): Promise<{ jaRecebido: boolean }> {
  autorizar(ator, 'confirmar_recebimento_pedido');
  return executarComOrcamento(deps.pool, ator, 'padrao', t, async ({ tx }) => {
    // IN-11 e M-4 da 0019: recebimentos e entregas do mesmo DEC entram em fila; quem vem depois vê o que o anterior
    // gravou. Os hashes só são lidos depois da trava.
    await travarPedido(tx, decId);
    const gerado = await pedidoGeradoPorPessoa(tx, decId);
    if (!gerado) throw naoEncontrado();
    const ultimo = await ultimoShaEntregue(tx, decId);
    if (ultimo === null) throw new ErroDominio('conflito', MENSAGENS_RECEBIMENTO.naoEntregue);
    if (sha256 !== ultimo) throw new ErroDominio('conflito', MENSAGENS_RECEBIMENTO.shaDiferente);
    if (await recebidoComSha(tx, decId, ultimo)) return { jaRecebido: true };
    await registrarEvento(
      tx,
      { ator, demandaId: gerado.demandaId, entidade: 'pacote_decisao', entidadeId: decId, acao: 'pedido_recebido', depois: { sha256: ultimo } },
      deps.relogio,
    );
    return { jaRecebido: false };
  });
}
