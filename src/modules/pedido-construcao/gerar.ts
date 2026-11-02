// Geração do Pedido de Construção (RF-22, C-28, ADR-05). Nesta ordem:
//   1. autorizar: só pessoa (agente e sistema recebem 403, também chamando a função direto);
//   2. o DEC (404 se não existe) com decisão `aprovada` completa, ou 409 (CA-22.4); desatualizado → 409 (A-03);
//   3. demanda do tipo estudo, pela cópia gravada no DEC → 422 (CA-22.3);
//   4. a montagem, só com a ESP e o RSK citados no DEC;
//   5. e-mail, telefone ou CPF em qualquer campo → 422 com o caminho e o tipo, sem o valor (C-28);
//   6. o validarPedido copiado do /construir (src/vendor/construir, ADR-05) → 422 com os erros dele;
//   7. evento `pedido_gerado` e o JSON serializado.
// Recusado em 2, 3, 5 ou 6, nada é entregue e nenhum evento é gravado. O mesmo DEC gera sempre o mesmo pedido
// (CA-22.2). Aceita a transação de quem chama (G3.8).
import { comTransacao, type Transacao } from '../../db/transacao';
import { ErroDominio } from '../../lib/erros';
import { validarPedido } from '../../vendor/construir/pedido.mjs';
import type { Ator } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import { encontrarDadosPessoais, type TipoDadoPessoal } from '../dados-pessoais/detectores';
import type { DepsDemanda } from '../demandas/servico';
import { obterEspecificacao } from '../especificacoes/consultas';
import { registrarEvento } from '../historico/registrar';
import { obterPacoteDecisao } from '../pacotes-decisao/consultas';
import { obterParecerRisco } from '../pareceres-risco/consultas';
import { MENSAGEM_PEDIDO_SEM_APROVACAO, montarPedido } from './montar';
import { serializarPedido } from './serializar';

// Textos da 03 (T11). O de 409 é em minúscula: a tela acrescenta "Não foi possível concluir: ". O de 422 vem com a lista
// `erros`, que a tela mostra depois de "Erros:".
export const MENSAGENS_PEDIDO = {
  naoAprovado: MENSAGEM_PEDIDO_SEM_APROVACAO,
  desatualizado: 'o pacote está desatualizado: a demanda tem ESP ou RSK mais nova que a citada.',
  estudo: 'demanda do tipo estudo não gera Pedido de Construção',
  naoPassou: 'O pedido não passou na validação do /construir. Nada foi entregue.',
} as const;

// CNPJ fica de fora no pedido (decisão da 04, C-28); a minimização da T24 usa os quatro.
const DADOS_PESSOAIS_DO_PEDIDO: TipoDadoPessoal[] = ['e-mail', 'telefone', 'CPF'];

const naoPassou = (erros: string[]) => new ErroDominio('nao_processavel', MENSAGENS_PEDIDO.naoPassou, { erros });

export async function gerarPedido(deps: DepsDemanda, ator: Ator, decId: string, t?: Transacao): Promise<{ nomeArquivo: string; json: string }> {
  autorizar(ator, 'gerar_pedido_construcao');

  const corpo = async ({ tx }: Transacao): Promise<string> => {
    const dec = await obterPacoteDecisao(tx, decId);
    if (dec.statusDecisao !== 'aprovada') throw new ErroDominio('conflito', MENSAGENS_PEDIDO.naoAprovado);
    // A-03 (08-correcao): ESP ou RSK gravada depois da aprovação substitui a citada; o pedido não sai com a versão velha.
    if (dec.desatualizado) throw new ErroDominio('conflito', MENSAGENS_PEDIDO.desatualizado);
    if (dec.demandaTipo === 'estudo') throw new ErroDominio('nao_processavel', MENSAGENS_PEDIDO.estudo);

    // Em sequência: `tx` tem uma conexão só.
    const esp = await obterEspecificacao(tx, dec.especificacaoId);
    const rsk = await obterParecerRisco(tx, dec.parecerRiscoId);
    const pedido = montarPedido({ dec, esp, rsk });

    const dadosPessoais = encontrarDadosPessoais(pedido, DADOS_PESSOAIS_DO_PEDIDO);
    if (dadosPessoais.length > 0) throw naoPassou(dadosPessoais.map((d) => `${d.caminho}: ${d.tipo}`));
    const validacao = validarPedido(pedido);
    if (!validacao.ok) throw naoPassou(validacao.erros);

    // Sem conteúdo no evento: o pedido leva texto de ESP e RSK (C-30).
    await registrarEvento(tx, { ator, demandaId: dec.demandaId, entidade: 'pacote_decisao', entidadeId: dec.id, acao: 'pedido_gerado' }, deps.relogio);
    return serializarPedido(pedido);
  };

  const json = t ? await corpo(t) : await comTransacao(deps.pool, corpo);
  return { nomeArquivo: `${decId}.json`, json };
}
