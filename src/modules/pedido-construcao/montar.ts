// Montagem do Pedido de Construção (RF-22; seção 3.1 do /construir), só com dado imutável: a cópia da demanda gravada
// no DEC, a ESP e o RSK citados por ele e a decisão registrada. Nada de data de geração, nome do solicitante, texto
// bruto, anexo, resumo, recomendação ou comentário. As chaves são escritas sempre na mesma ordem, e é essa ordem que o
// `JSON.stringify` segue: o mesmo DEC dá o mesmo pedido, byte a byte (CA-22.2).
import { PAPEIS_APROVACAO } from '../../db/schema/decisao';
import type { NivelRisco } from '../../db/schema/versoes';
import type { TipoDemanda } from '../../db/schema/demandas';
import { ErroDominio } from '../../lib/erros';
import { dataIsoSaoPaulo } from '../../lib/fuso';
import type { EspecificacaoVista } from '../especificacoes/consultas';
import type { PacoteDecisaoVista } from '../pacotes-decisao/consultas';
import type { ParecerRiscoVista } from '../pareceres-risco/consultas';
import { nivelMaior, textoDaEspecificacao, textoDoParecer } from './conteudo';

// Os campos de construção vêm da ESP como estão; nulo (ESP de estudo numa demanda que mudou de tipo) chega ao
// validarPedido, que recusa com a mensagem dele.
export type PedidoConstrucao = {
  pedido: string;
  demanda: { id: string; tipo: TipoDemanda; titulo: string; descricao: string };
  especificacao: { id: string; conteudo: string };
  risco: { id: string; nivel: NivelRisco; conteudo: string };
  decisao: { id: string; opcaoEscolhida: string; aprovadoPor: string; aprovadoEm: string };
  sistema_alvo: string | null;
  repositorio_destino: string | null;
  criterios_aceite_preliminares: string[] | null;
  definicao_de_pronto: string[] | null;
};

// Texto do 409 (CA-22.4), em minúscula: a tela acrescenta "Não foi possível concluir: ".
export const MENSAGEM_PEDIDO_SEM_APROVACAO = 'o Pedido de Construção só é gerado de pacote aprovado.';

// Nomes das aprovações na ordem do papel (cto, administradora), e não na da vista, que ordena por instante e, no mesmo
// instante, pelo nome do papel.
function aprovadoPor(dec: PacoteDecisaoVista): string {
  return [...dec.aprovadores]
    .sort((a, b) => PAPEIS_APROVACAO.indexOf(a.papel) - PAPEIS_APROVACAO.indexOf(b.papel))
    .map((a) => a.nome)
    .join(' e ');
}

export function montarPedido(dados: { dec: PacoteDecisaoVista; esp: EspecificacaoVista; rsk: ParecerRiscoVista }): PedidoConstrucao {
  const { dec, esp, rsk } = dados;
  // Só decisão aprovada completa: pendente (inclusive com uma das duas aprovações), devolvida e arquivada não geram.
  const opcao = dec.statusDecisao === 'aprovada' ? dec.decisao?.opcaoEscolhida : null;
  if (!dec.decisao || !opcao) throw new ErroDominio('conflito', MENSAGEM_PEDIDO_SEM_APROVACAO);
  const escolhida = opcao === 'A' ? dec.opcaoA : dec.opcaoB;
  return {
    pedido: dec.id,
    demanda: { id: dec.demandaId, tipo: dec.demandaTipo, titulo: dec.demandaTitulo, descricao: dec.demandaDescricao },
    especificacao: { id: esp.id, conteudo: textoDaEspecificacao(esp) },
    risco: { id: rsk.id, nivel: nivelMaior(rsk), conteudo: textoDoParecer(rsk) },
    decisao: {
      id: dec.id,
      opcaoEscolhida: `${opcao}: ${escolhida.descricao}`,
      aprovadoPor: aprovadoPor(dec),
      // decidida_em = data da aprovação que completou a decisão, no fuso de São Paulo.
      aprovadoEm: dataIsoSaoPaulo(dec.decisao.decididaEm),
    },
    sistema_alvo: esp.sistemaAlvo,
    repositorio_destino: esp.repositorioDestino,
    criterios_aceite_preliminares: esp.criteriosAceitePreliminares,
    definicao_de_pronto: esp.definicaoDePronto,
  };
}
