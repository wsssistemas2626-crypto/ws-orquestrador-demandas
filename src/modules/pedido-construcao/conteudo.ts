// Texto da ESP e do RSK citados no DEC, para `especificacao.conteudo` e `risco.conteudo` do Pedido de Construção
// (RF-22). Campos em ordem fixa, com os rótulos da 03 (T07 e T08); campo vazio fica de fora. Só lê a versão gravada,
// que é imutável: o mesmo artefato dá sempre o mesmo texto. Id, autor, data e marca de rascunho não entram.
import type { NivelRisco } from '../../db/schema/versoes';
import type { EspecificacaoVista } from '../especificacoes/consultas';
import type { ParecerRiscoVista } from '../pareceres-risco/consultas';

type Campo<T> = readonly [keyof T, string];

// Os quatro campos de construção ficam fora: vão no topo do pedido (sistema_alvo, repositorio_destino, ...).
const CAMPOS_DA_ESP: ReadonlyArray<Campo<EspecificacaoVista>> = [
  ['descricaoObjetiva', 'Descrição objetiva'],
  ['situacaoAtual', 'Situação atual'],
  ['situacaoDesejada', 'Situação desejada'],
  ['escopoInclui', 'Escopo inclui'],
  ['escopoExclui', 'Escopo exclui'],
  ['sistemasErp', 'ERP'],
  ['sistemasEcommerceMarketplace', 'E-commerce e marketplace'],
  ['sistemasApisTerceiros', 'APIs de terceiros'],
  ['sistemasServicosInternos', 'Serviços internos da WS'],
  ['dadosEntidades', 'Entidades'],
  ['dadosCamposCriticos', 'Campos críticos'],
  ['restricoesTecnicas', 'Restrições técnicas'],
  ['duvidasEmAberto', 'Dúvidas em aberto'],
];

// Rótulos de nível da 03 (seção 2.2). O pedido não é tela, por isso não depende de src/components/rotulos.ts (T36).
const ROTULO_DO_NIVEL: Readonly<Record<NivelRisco, string>> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' };
const ORDEM_DO_NIVEL: Readonly<Record<NivelRisco, number>> = { baixo: 0, medio: 1, alto: 2 };

const RISCOS = [
  ['riscoTecnicoNivel', 'riscoTecnicoComentario', 'Risco técnico'],
  ['riscoOperacionalNivel', 'riscoOperacionalComentario', 'Risco operacional'],
  ['riscoJuridicoNivel', 'riscoJuridicoComentario', 'Risco jurídico'],
] as const;

const preenchido = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

// Texto: "Rótulo: valor". Lista: "Rótulo:" e um item por linha, com hífen. Vazio: nada.
function bloco(rotulo: string, valor: unknown): string[] {
  if (Array.isArray(valor)) {
    const itens = valor.filter(preenchido);
    return itens.length > 0 ? [`${rotulo}:\n${itens.map((i) => `- ${i}`).join('\n')}`] : [];
  }
  return preenchido(valor) ? [`${rotulo}: ${valor}`] : [];
}

const juntarBlocos = (blocos: string[]): string => blocos.join('\n\n');

export function textoDaEspecificacao(esp: EspecificacaoVista): string {
  return juntarBlocos(CAMPOS_DA_ESP.flatMap(([campo, rotulo]) => bloco(rotulo, esp[campo])));
}

export function textoDoParecer(rsk: ParecerRiscoVista): string {
  const riscos = RISCOS.map(([nivel, comentario, rotulo]) => {
    const linha = `${rotulo}: ${ROTULO_DO_NIVEL[rsk[nivel]]}`;
    const c = rsk[comentario];
    return preenchido(c) ? `${linha}\nComentário: ${c}` : linha;
  });
  return juntarBlocos([
    ...bloco('Resumo', rsk.resumo),
    ...riscos,
    ...bloco('Recomendações de mitigação', rsk.recomendacoesMitigacao),
    ...bloco('Pré-condições', rsk.preCondicoes),
    ...bloco('Quando envolver o jurídico ou a administradora', rsk.envolverJuridicoOuAdministradoraQuando),
  ]);
}

// O maior dos três níveis, com baixo < medio < alto (RF-22, CA-22.5).
export function nivelMaior(rsk: ParecerRiscoVista): NivelRisco {
  return RISCOS.map(([nivel]) => rsk[nivel]).reduce((maior, n) => (ORDEM_DO_NIVEL[n] > ORDEM_DO_NIVEL[maior] ? n : maior));
}
