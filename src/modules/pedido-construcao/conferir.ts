// Conferência e montagem do Pedido de Construção (RF-22 passos 3 a 11 do cap. 05, ADR-26). A geração (gerar.ts) e a
// entrega ao /construir (entregar.ts) chamam esta mesma função: os bytes são iguais por construção (CA-22.2). Nesta ordem:
//   1. a demanda do DEC (404 se o DEC não existe), travada como na decisão; demanda em status final → 409 (M-08). Só
//      depois, o DEC, lido sob a trava, com decisão `aprovada` completa, ou 409 (CA-22.4); substituído por um aprovado
//      mais novo da demanda → 409 (0.1.13: só o aprovado mais novo gera, e nunca há dois pedidos válidos da mesma
//      demanda); desatualizado → 409 (A-03);
//   2. demanda do tipo estudo, pela cópia gravada no DEC → 422 (CA-22.3);
//   3. a montagem, só com a ESP e o RSK citados no DEC;
//   4. e-mail, telefone ou CPF em qualquer campo (C-28) e o nome do solicitante da demanda travada, inteiro ou em parte,
//      em qualquer texto escrito por pessoa (D1 do 0013), ou o caminho marcado pelo nome em vigor na criação do DEC,
//      gravado a partir da 0.4.1 → um 422 só, com o caminho e o tipo, sem o valor: primeiro a lista do C-28, depois os
//      caminhos com `nome`;
//   5. o validarPedido copiado do /construir (src/vendor/construir, ADR-05) → 422 com os erros dele.
// Sem autorizar, sem a confirmação de dado pessoal e sem evento: quem chama faz. Recusado, nada é gravado aqui. Precisa
// rodar numa transação (a trava da demanda vale até o fim dela).
import { eq } from 'drizzle-orm';
import type { Db } from '../../db';
import { pacoteDecisao } from '../../db/schema';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { validarPedido } from '../../vendor/construir/pedido.mjs';
import { encontrarDadosPessoais, type TipoDadoPessoal } from '../dados-pessoais/detectores';
import { temNome } from '../dados-pessoais/minimizar';
import { nomesDoSolicitante } from '../demandas/consultas';
import { ehStatusFinal } from '../demandas/transicoes';
import { obterEspecificacao } from '../especificacoes/consultas';
import { obterPacoteDecisao, type PacoteDecisaoVista } from '../pacotes-decisao/consultas';
import { obterParecerRisco } from '../pareceres-risco/consultas';
import { travarDemanda } from '../versoes';
import { caminhosDaCriacaoNoPedido, lerCaminhosDaCriacao } from './caminhos-da-criacao';
import { MENSAGEM_PEDIDO_SEM_APROVACAO, montarPedido, textosDoPedido } from './montar';
import { serializarPedido } from './serializar';

// Textos da 03 (T11). O de 409 é em minúscula: a tela acrescenta "Não foi possível concluir: ". O de 422 vem com a lista
// `erros`, que a tela mostra depois de "Erros:". gerar.ts reexporta.
export const MENSAGENS_PEDIDO = {
  naoAprovado: MENSAGEM_PEDIDO_SEM_APROVACAO,
  desatualizado: 'o pacote está desatualizado: a demanda tem ESP ou RSK mais nova que a citada.',
  // M-08: texto decidido na 02-triagem do DEC-DEM-20261103-0007-v1, para revisão da ux-ui-design.
  demandaFinal: 'a demanda está em status final; o pacote não gera mais Pedido de Construção.',
  estudo: 'demanda do tipo estudo não gera Pedido de Construção',
  naoPassou: 'O pedido não passou na validação do /construir. Nada foi entregue.',
  // D3 do 0013: texto da 02-triagem, para revisão da ux-ui-design. Sem lista: não diz nada do DEC.
  semConfirmacao: 'Confirme que o título, a descrição, a ESP e o parecer de risco não têm dado pessoal de ninguém. Nada foi entregue.',
  // 0.1.13: texto da 02-triagem do DEC-DEM-20261104-0014-v1, para revisão da ux-ui-design. Só o id do DEC que gera.
  substituido: (id: string) => `o pacote foi substituído por ${id}, aprovado depois dele; só o pacote aprovado mais novo gera o Pedido de Construção.`,
} as const;

// CNPJ fica de fora no pedido (decisão da 04, C-28); a minimização da T24 usa os quatro.
const DADOS_PESSOAIS_DO_PEDIDO: TipoDadoPessoal[] = ['e-mail', 'telefone', 'CPF'];

// D1 do 0013: o tipo do erro do nome, montado só aqui. `nome` não é um TipoDadoPessoal: não tem detector nem marcador, e a
// minimização da T24 não muda.
const TIPO_NOME = 'nome';

const naoPassou = (erros: string[]) => new ErroDominio('nao_processavel', MENSAGENS_PEDIDO.naoPassou, { erros });

export async function conferirEMontarPedido(tx: Db, decId: string): Promise<{ dec: PacoteDecisaoVista; json: string }> {
  // M-08: o mesmo padrão de registrarDecisao. A trava da demanda põe em fila o encerramento e a ESP ou o RSK novos; o DEC
  // (e o `desatualizado`) só é lido depois dela.
  const [alvo] = await tx
    .select({ demandaId: pacoteDecisao.demandaId, caminhosDaCriacao: pacoteDecisao.caminhosComNomeNaCriacao })
    .from(pacoteDecisao)
    .where(eq(pacoteDecisao.id, decId));
  if (!alvo) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);
  // 0.4.1 (S-03, SB-08): imutável desde a criação; fora do formato é erro interno, nunca null nem lista vazia.
  const daCriacao = lerCaminhosDaCriacao(alvo.caminhosDaCriacao);
  const demandaTravada = await travarDemanda(tx, alvo.demandaId);
  if (ehStatusFinal(demandaTravada.status)) throw new ErroDominio('conflito', MENSAGENS_PEDIDO.demandaFinal);
  const dec = await obterPacoteDecisao(tx, decId);
  if (dec.statusDecisao !== 'aprovada') throw new ErroDominio('conflito', MENSAGENS_PEDIDO.naoAprovado);
  // 0.1.13: lido junto com o DEC, sob a trava: uma aprovação do DEC mais novo ao mesmo tempo espera esta transação ou já
  // é vista. Vem antes do desatualizado, porque aponta o DEC que gera.
  if (dec.substituidoPor) throw new ErroDominio('conflito', MENSAGENS_PEDIDO.substituido(dec.substituidoPor));
  // A-03 (08-correcao): ESP ou RSK gravada depois da aprovação substitui a citada; o pedido não sai com a versão velha.
  if (dec.desatualizado) throw new ErroDominio('conflito', MENSAGENS_PEDIDO.desatualizado);
  if (dec.demandaTipo === 'estudo') throw new ErroDominio('nao_processavel', MENSAGENS_PEDIDO.estudo);

  // Em sequência: `tx` tem uma conexão só.
  const esp = await obterEspecificacao(tx, dec.especificacaoId);
  const rsk = await obterParecerRisco(tx, dec.parecerRiscoId);
  const pedido = montarPedido({ dec, esp, rsk });

  // D1 do 0013 (E6): o nome conferido é o atual da demanda travada, a mesma fonte da vista mínima. Nulo, ou com menos de
  // 3 letras, não confere nada. Nomes de outras pessoas ficam com a confirmação de quem gera (gerar.ts).
  // 0.4.1 (S-03, SB-08): e também o caminho que o nome em vigor na criação marcou, traduzido para o pedido (a opção
  // escolhida vira decisao.opcaoEscolhida; a outra não vai ao pedido e não recusa). Coluna nula (DEC anterior à 0.4.1):
  // só o nome atual. Um caminho marcado pelos dois critérios sai uma vez, na ordem de textosDoPedido.
  const nomes = nomesDoSolicitante(demandaTravada.solicitanteNome);
  // montarPedido já recusou o DEC sem decisão aprovada: aqui a opção existe.
  const escolhida = dec.decisao?.opcaoEscolhida;
  const marcados = daCriacao === null || !escolhida ? new Set<string>() : caminhosDaCriacaoNoPedido(daCriacao, escolhida);
  const comNome = textosDoPedido({ dec, esp, rsk })
    .filter((texto) => marcados.has(texto.caminho) || texto.valores.some((v) => temNome(v, nomes)))
    .map((texto) => `${texto.caminho}: ${TIPO_NOME}`);
  const erros = [...encontrarDadosPessoais(pedido, DADOS_PESSOAIS_DO_PEDIDO).map((d) => `${d.caminho}: ${d.tipo}`), ...comNome];
  if (erros.length > 0) throw naoPassou(erros);
  const validacao = validarPedido(pedido);
  if (!validacao.ok) throw naoPassou(validacao.erros);

  return { dec, json: serializarPedido(pedido) };
}
