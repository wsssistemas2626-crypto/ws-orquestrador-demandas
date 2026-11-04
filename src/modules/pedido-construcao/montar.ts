// Montagem do Pedido de Construção (RF-22; seção 3.1 do /construir), só com dado imutável: a cópia da demanda gravada
// no DEC, a ESP e o RSK citados por ele e a decisão registrada. Nenhum nome de pessoa entra pelo sistema: nada de data de
// geração, nome do solicitante, nome de quem aprovou (aprovadoPor leva o papel, D2 do 0013), texto bruto, anexo, resumo,
// recomendação ou comentário. As chaves são escritas sempre na mesma ordem, e é essa ordem que o `JSON.stringify` segue:
// o mesmo DEC dá o mesmo pedido, byte a byte (CA-22.2).
import { PAPEIS_APROVACAO, type OpcaoDecisao } from '../../db/schema/decisao';
import type { NivelRisco } from '../../db/schema/versoes';
import type { TipoDemanda } from '../../db/schema/demandas';
import { ErroDominio } from '../../lib/erros';
import { dataIsoSaoPaulo } from '../../lib/fuso';
import type { EspecificacaoVista } from '../especificacoes/consultas';
import { descricaoSemRotulos } from '../pacotes-decisao/criar';
import type { PacoteDecisaoVista } from '../pacotes-decisao/consultas';
import type { ParecerRiscoVista } from '../pareceres-risco/consultas';
import { nivelMaior, textoDaEspecificacao, textoDoParecer, valoresDaEspecificacao, valoresDoParecer } from './conteudo';

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

type DadosDoPedido = { dec: PacoteDecisaoVista; esp: EspecificacaoVista; rsk: ParecerRiscoVista };

// Texto do 409 (CA-22.4), em minúscula: a tela acrescenta "Não foi possível concluir: ".
export const MENSAGEM_PEDIDO_SEM_APROVACAO = 'o Pedido de Construção só é gerado de pacote aprovado.';

// D2 do 0013: os papéis das aprovações (cto, administradora), gravados na própria aprovação e não lidos da conta (trocar
// o nome ou o papel da conta depois não muda o arquivo), na ordem da aprovação: pelo instante e, no mesmo instante, pela
// ordem de PAPEIS_APROVACAO. A ordenação fica aqui, sem depender da ordem da consulta.
function aprovadoPor(dec: PacoteDecisaoVista): string {
  return [...dec.aprovadores]
    .sort((a, b) => a.registradaEm.getTime() - b.registradaEm.getTime() || PAPEIS_APROVACAO.indexOf(a.papel) - PAPEIS_APROVACAO.indexOf(b.papel))
    .map((a) => a.papel)
    .join(' e ');
}

// A opção escolhida da decisão aprovada completa, uma regra só para montarPedido e textosDoPedido. Pendente (inclusive
// com uma das duas aprovações), devolvida e arquivada não geram.
function opcaoEscolhida(dec: PacoteDecisaoVista): { opcao: OpcaoDecisao; descricao: string; decididaEm: Date } {
  const opcao = dec.statusDecisao === 'aprovada' ? dec.decisao?.opcaoEscolhida : null;
  if (!dec.decisao || !opcao) throw new ErroDominio('conflito', MENSAGEM_PEDIDO_SEM_APROVACAO);
  return { opcao, descricao: (opcao === 'A' ? dec.opcaoA : dec.opcaoB).descricao, decididaEm: dec.decisao.decididaEm };
}

export function montarPedido(dados: DadosDoPedido): PedidoConstrucao {
  const { dec, esp, rsk } = dados;
  const escolhida = opcaoEscolhida(dec);
  return {
    pedido: dec.id,
    demanda: { id: dec.demandaId, tipo: dec.demandaTipo, titulo: dec.demandaTitulo, descricao: dec.demandaDescricao },
    especificacao: { id: esp.id, conteudo: textoDaEspecificacao(esp) },
    risco: { id: rsk.id, nivel: nivelMaior(rsk), conteudo: textoDoParecer(rsk) },
    decisao: {
      id: dec.id,
      opcaoEscolhida: `${escolhida.opcao}: ${escolhida.descricao}`,
      aprovadoPor: aprovadoPor(dec),
      // decidida_em = data da aprovação que completou a decisão, no fuso de São Paulo.
      aprovadoEm: dataIsoSaoPaulo(escolhida.decididaEm),
    },
    sistema_alvo: esp.sistemaAlvo,
    repositorio_destino: esp.repositorioDestino,
    criterios_aceite_preliminares: esp.criteriosAceitePreliminares,
    definicao_de_pronto: esp.definicaoDePronto,
  };
}

// D1 do 0013: os valores escritos por pessoa que saem no pedido, antes de receberem rótulo, com o caminho do pedido onde
// cada um sai; na ordem das chaves do pedido e um caminho por item das listas. Ficam fora os valores que o sistema gera
// (ids, tipo, nível, aprovadoPor e aprovadoEm) e os rótulos ("Contexto", "Campos críticos", "Alto", "A: "). É sobre
// esta lista que gerarPedido confere o nome do solicitante.
export type TextoDoPedido = { caminho: string; valores: string[] };

export function textosDoPedido(dados: DadosDoPedido): TextoDoPedido[] {
  const { dec, esp, rsk } = dados;
  const lista = (caminho: string, itens: readonly string[] | null): TextoDoPedido[] =>
    (itens ?? []).map((v, i) => ({ caminho: `${caminho}[${i}]`, valores: [v] }));
  const opcional = (caminho: string, v: string | null): TextoDoPedido[] => (v === null ? [] : [{ caminho, valores: [v] }]);
  return [
    { caminho: 'demanda.titulo', valores: [dec.demandaTitulo] },
    { caminho: 'demanda.descricao', valores: [descricaoSemRotulos(dec.demandaDescricao)] },
    { caminho: 'especificacao.conteudo', valores: valoresDaEspecificacao(esp) },
    { caminho: 'risco.conteudo', valores: valoresDoParecer(rsk) },
    { caminho: 'decisao.opcaoEscolhida', valores: [opcaoEscolhida(dec).descricao] },
    ...opcional('sistema_alvo', esp.sistemaAlvo),
    ...opcional('repositorio_destino', esp.repositorioDestino),
    ...lista('criterios_aceite_preliminares', esp.criteriosAceitePreliminares),
    ...lista('definicao_de_pronto', esp.definicaoDePronto),
  ];
}
