// Geração do Pedido de Construção (RF-22, C-28, ADR-05). Nesta ordem:
//   1. autorizar: só pessoa (agente e sistema recebem 403, também chamando a função direto);
//   2. a confirmação de que o texto não tem dado pessoal (D3 do 0013): sem ela, ou `false`, 422 antes de tocar o banco
//      (não diz se o DEC existe);
//   3. a demanda do DEC (404 se o DEC não existe), travada como na decisão; demanda em status final → 409 (M-08). Só
//      depois, o DEC, lido sob a trava, com decisão `aprovada` completa, ou 409 (CA-22.4); desatualizado → 409 (A-03);
//   4. demanda do tipo estudo, pela cópia gravada no DEC → 422 (CA-22.3);
//   5. a montagem, só com a ESP e o RSK citados no DEC;
//   6. e-mail, telefone ou CPF em qualquer campo (C-28) e o nome do solicitante da demanda travada, inteiro ou em parte,
//      em qualquer texto escrito por pessoa (D1 do 0013) → um 422 só, com o caminho e o tipo, sem o valor: primeiro a
//      lista do C-28, depois os caminhos com `nome`;
//   7. o validarPedido copiado do /construir (src/vendor/construir, ADR-05) → 422 com os erros dele;
//   8. evento `pedido_gerado` com a confirmação e o JSON serializado.
// Recusado em 2, 3, 4, 6 ou 7, nada é entregue e nenhum evento é gravado. O mesmo DEC gera sempre o mesmo pedido
// (CA-22.2) quando aceito. Aceita a transação de quem chama (G3.8).
import { eq } from 'drizzle-orm';
import { pacoteDecisao } from '../../db/schema';
import { comTransacao, type Transacao } from '../../db/transacao';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { validarPedido } from '../../vendor/construir/pedido.mjs';
import type { Ator } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import { encontrarDadosPessoais, type TipoDadoPessoal } from '../dados-pessoais/detectores';
import { temNome } from '../dados-pessoais/minimizar';
import { nomesDoSolicitante } from '../demandas/consultas';
import type { DepsDemanda } from '../demandas/servico';
import { ehStatusFinal } from '../demandas/transicoes';
import { obterEspecificacao } from '../especificacoes/consultas';
import { registrarEvento } from '../historico/registrar';
import { obterPacoteDecisao } from '../pacotes-decisao/consultas';
import { obterParecerRisco } from '../pareceres-risco/consultas';
import { travarDemanda } from '../versoes';
import { MENSAGEM_PEDIDO_SEM_APROVACAO, montarPedido, textosDoPedido } from './montar';
import type { ConfirmacaoDoPedido } from './schemas';
import { serializarPedido } from './serializar';

// Textos da 03 (T11). O de 409 é em minúscula: a tela acrescenta "Não foi possível concluir: ". O de 422 vem com a lista
// `erros`, que a tela mostra depois de "Erros:".
export const MENSAGENS_PEDIDO = {
  naoAprovado: MENSAGEM_PEDIDO_SEM_APROVACAO,
  desatualizado: 'o pacote está desatualizado: a demanda tem ESP ou RSK mais nova que a citada.',
  // M-08: texto decidido na 02-triagem do DEC-DEM-20261103-0007-v1, para revisão da ux-ui-design.
  demandaFinal: 'a demanda está em status final; o pacote não gera mais Pedido de Construção.',
  estudo: 'demanda do tipo estudo não gera Pedido de Construção',
  naoPassou: 'O pedido não passou na validação do /construir. Nada foi entregue.',
  // D3 do 0013: texto da 02-triagem, para revisão da ux-ui-design. Sem lista: não diz nada do DEC.
  semConfirmacao: 'Confirme que o título, a descrição, a ESP e o parecer de risco não têm dado pessoal de ninguém. Nada foi entregue.',
} as const;

// CNPJ fica de fora no pedido (decisão da 04, C-28); a minimização da T24 usa os quatro.
const DADOS_PESSOAIS_DO_PEDIDO: TipoDadoPessoal[] = ['e-mail', 'telefone', 'CPF'];

// D1 do 0013: o tipo do erro do nome, montado só aqui. `nome` não é um TipoDadoPessoal: não tem detector nem marcador, e a
// minimização da T24 não muda.
const TIPO_NOME = 'nome';

const naoPassou = (erros: string[]) => new ErroDominio('nao_processavel', MENSAGENS_PEDIDO.naoPassou, { erros });

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
    // M-08: o mesmo padrão de registrarDecisao. A trava da demanda põe em fila o encerramento e a ESP ou o RSK novos;
    // o DEC (e o `desatualizado`) só é lido depois dela.
    const [alvo] = await tx.select({ demandaId: pacoteDecisao.demandaId }).from(pacoteDecisao).where(eq(pacoteDecisao.id, decId));
    if (!alvo) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);
    const demandaTravada = await travarDemanda(tx, alvo.demandaId);
    if (ehStatusFinal(demandaTravada.status)) throw new ErroDominio('conflito', MENSAGENS_PEDIDO.demandaFinal);
    const dec = await obterPacoteDecisao(tx, decId);
    if (dec.statusDecisao !== 'aprovada') throw new ErroDominio('conflito', MENSAGENS_PEDIDO.naoAprovado);
    // A-03 (08-correcao): ESP ou RSK gravada depois da aprovação substitui a citada; o pedido não sai com a versão velha.
    if (dec.desatualizado) throw new ErroDominio('conflito', MENSAGENS_PEDIDO.desatualizado);
    if (dec.demandaTipo === 'estudo') throw new ErroDominio('nao_processavel', MENSAGENS_PEDIDO.estudo);

    // Em sequência: `tx` tem uma conexão só.
    const esp = await obterEspecificacao(tx, dec.especificacaoId);
    const rsk = await obterParecerRisco(tx, dec.parecerRiscoId);
    const pedido = montarPedido({ dec, esp, rsk });

    // D1 do 0013 (E6): o nome conferido é o atual da demanda travada, a mesma fonte da vista mínima. Nulo, ou com menos
    // de 3 letras, não confere nada. Nomes de outras pessoas ficam com a confirmação do passo 2.
    const nomes = nomesDoSolicitante(demandaTravada.solicitanteNome);
    const comNome = textosDoPedido({ dec, esp, rsk })
      .filter((texto) => texto.valores.some((v) => temNome(v, nomes)))
      .map((texto) => `${texto.caminho}: ${TIPO_NOME}`);
    const erros = [...encontrarDadosPessoais(pedido, DADOS_PESSOAIS_DO_PEDIDO).map((d) => `${d.caminho}: ${d.tipo}`), ...comNome];
    if (erros.length > 0) throw naoPassou(erros);
    const validacao = validarPedido(pedido);
    if (!validacao.ok) throw naoPassou(validacao.erros);

    // Sem conteúdo no evento: o pedido leva texto de ESP e RSK (C-30). Só o booleano fixo da confirmação (D3 do 0013).
    await registrarEvento(
      tx,
      { ator, demandaId: dec.demandaId, entidade: 'pacote_decisao', entidadeId: dec.id, acao: 'pedido_gerado', depois: { confirmaSemDadoPessoal: true } },
      deps.relogio,
    );
    return serializarPedido(pedido);
  };

  const json = t ? await corpo(t) : await comTransacao(deps.pool, corpo);
  return { nomeArquivo: `${decId}.json`, json };
}
