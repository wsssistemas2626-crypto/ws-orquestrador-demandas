// Texto da ESP e do RSK citados no DEC, para `especificacao.conteudo` e `risco.conteudo` do Pedido de Construção
// (RF-22). Campos em ordem fixa, com os rótulos da 03 (T07 e T08); campo vazio fica de fora. Só lê a versão gravada,
// que é imutável: o mesmo artefato dá sempre o mesmo texto. Id, autor, data e marca de rascunho não entram.
// D1 do 0013: valoresDaEspecificacao e valoresDoParecer dão os mesmos campos, só com os valores escritos por pessoa, sem
// rótulo nem nível, para a conferência do nome do solicitante (o rótulo "Campos críticos" não é o nome de ninguém). As
// duas leem as mesmas listas do texto, e a guarda de gerar.test.ts quebra se um campo novo ficar de fora.
import type { NivelRisco } from '../../db/schema/versoes';
import type { EspecificacaoVista } from '../especificacoes/consultas';
import type { ParecerRiscoVista } from '../pareceres-risco/consultas';

type Campo<T> = readonly [keyof T, string];

// Os quatro campos de construção ficam fora: vão no topo do pedido (sistema_alvo, repositorio_destino, ...). Exportada
// para a guarda de gerar.test.ts (D1 do 0013).
export const CAMPOS_DA_ESP: ReadonlyArray<Campo<EspecificacaoVista>> = [
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
export const ROTULO_DO_NIVEL: Readonly<Record<NivelRisco, string>> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' };
const ORDEM_DO_NIVEL: Readonly<Record<NivelRisco, number>> = { baixo: 0, medio: 1, alto: 2 };

export const RISCOS = [
  ['riscoTecnicoNivel', 'riscoTecnicoComentario', 'Risco técnico'],
  ['riscoOperacionalNivel', 'riscoOperacionalComentario', 'Risco operacional'],
  ['riscoJuridicoNivel', 'riscoJuridicoComentario', 'Risco jurídico'],
] as const;

export const ROTULO_DO_COMENTARIO = 'Comentário';

// Os blocos do RSK fora dos três riscos: o resumo antes deles, o resto depois.
const RESUMO_DO_PARECER: Campo<ParecerRiscoVista> = ['resumo', 'Resumo'];
const DEPOIS_DOS_RISCOS: ReadonlyArray<Campo<ParecerRiscoVista>> = [
  ['recomendacoesMitigacao', 'Recomendações de mitigação'],
  ['preCondicoes', 'Pré-condições'],
  ['envolverJuridicoOuAdministradoraQuando', 'Quando envolver o jurídico ou a administradora'],
];
// Exportada para a guarda de gerar.test.ts (D1 do 0013).
export const CAMPOS_DO_PARECER: ReadonlyArray<Campo<ParecerRiscoVista>> = [RESUMO_DO_PARECER, ...DEPOIS_DOS_RISCOS];

const preenchido = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

// Os valores preenchidos de um campo: o texto, ou cada item preenchido da lista. Vazio: nada.
function valores(valor: unknown): string[] {
  if (Array.isArray(valor)) return valor.filter(preenchido);
  return preenchido(valor) ? [valor] : [];
}

// Texto: "Rótulo: valor". Lista: "Rótulo:" e um item por linha, com hífen. Vazio: nada.
function bloco(rotulo: string, valor: unknown): string[] {
  const v = valores(valor);
  if (Array.isArray(valor)) return v.length > 0 ? [`${rotulo}:\n${v.map((i) => `- ${i}`).join('\n')}`] : [];
  return v.length > 0 ? [`${rotulo}: ${v[0]}`] : [];
}

const juntarBlocos = (blocos: string[]): string => blocos.join('\n\n');

export function textoDaEspecificacao(esp: EspecificacaoVista): string {
  return juntarBlocos(CAMPOS_DA_ESP.flatMap(([campo, rotulo]) => bloco(rotulo, esp[campo])));
}

export function valoresDaEspecificacao(esp: EspecificacaoVista): string[] {
  return CAMPOS_DA_ESP.flatMap(([campo]) => valores(esp[campo]));
}

export function textoDoParecer(rsk: ParecerRiscoVista): string {
  const riscos = RISCOS.map(([nivel, comentario, rotulo]) => {
    const linha = `${rotulo}: ${ROTULO_DO_NIVEL[rsk[nivel]]}`;
    const c = rsk[comentario];
    return preenchido(c) ? `${linha}\n${ROTULO_DO_COMENTARIO}: ${c}` : linha;
  });
  return juntarBlocos([
    ...bloco(RESUMO_DO_PARECER[1], rsk[RESUMO_DO_PARECER[0]]),
    ...riscos,
    ...DEPOIS_DOS_RISCOS.flatMap(([campo, rotulo]) => bloco(rotulo, rsk[campo])),
  ]);
}

// Na ordem do texto: o resumo, o comentário de cada risco (o nível fica fora) e os blocos depois dos riscos.
export function valoresDoParecer(rsk: ParecerRiscoVista): string[] {
  return [
    ...valores(rsk[RESUMO_DO_PARECER[0]]),
    ...RISCOS.flatMap(([, comentario]) => valores(rsk[comentario])),
    ...DEPOIS_DOS_RISCOS.flatMap(([campo]) => valores(rsk[campo])),
  ];
}

// D-04 da 0.4.1: as partes da descrição, o separador, o rótulo e descricaoSemRotulos vieram de
// pacotes-decisao/criar.ts, sem mudar o corpo, para criar.ts poder importar textosDaCriacao de montar.ts sem ciclo
// (montar.ts importava descricaoSemRotulos de criar.ts). criar.ts os reexporta.

// Exportada para os testes da descrição e do Pedido de Construção (D1 do 0013).
export const PARTES_DA_DESCRICAO = [
  ['contexto', 'Contexto'],
  ['descricaoProblema', 'Problema'],
  ['impactoPercebido', 'Impacto percebido'],
] as const;

export const SEPARADOR_DA_DESCRICAO = '\n\n';

// D1 do 0013: o rótulo de uma parte no começo de um bloco (o começo do texto ou logo depois da linha em branco que
// separa as partes). Os rótulos não têm caractere de regex. Fica sem exportar: tem a flag g, e só o `replace` abaixo a
// usa (o `replace` começa do zero).
const RE_ROTULO_DA_DESCRICAO = new RegExp(`(^|${SEPARADOR_DA_DESCRICAO})(?:${PARTES_DA_DESCRICAO.map(([, rotulo]) => rotulo).join('|')}): `, 'g');

// D1 do 0013: a descrição gravada no DEC sem os rótulos "Contexto: ", "Problema: " e "Impacto percebido: " do começo de
// cada bloco, para o Pedido de Construção conferir o nome do solicitante só no que a pessoa escreveu (o rótulo
// "Contexto" não é o nome de ninguém). O mesmo texto fora do começo de um bloco fica.
export function descricaoSemRotulos(descricao: string): string {
  return descricao.replace(RE_ROTULO_DA_DESCRICAO, '$1');
}

// O maior dos três níveis, com baixo < medio < alto (RF-22, CA-22.5).
export function nivelMaior(rsk: ParecerRiscoVista): NivelRisco {
  return RISCOS.map(([nivel]) => rsk[nivel]).reduce((maior, n) => (ORDEM_DO_NIVEL[n] > ORDEM_DO_NIVEL[maior] ? n : maior));
}
