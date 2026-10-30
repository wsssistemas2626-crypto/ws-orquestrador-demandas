// Minimização do texto que vai ao provedor de IA (RF-20, C-23). Vale para todo campo de texto de todo agente, não só
// para o texto bruto. Em ordem:
// 1. as linhas de cabeçalho de e-mail encaminhado saem inteiras, com a quebra de linha;
// 2. o nome do solicitante, quando informado, vira marcador;
// 3. e-mail, CNPJ, CPF e telefone viram marcadores, pelos mesmos detectores do Pedido de Construção (T22).
// O cabeçalho sai primeiro para que nome e e-mail da linha "De:" não sobrem nem como marcador. O CNPJ vem antes do CPF,
// e os dois antes do telefone, para o número mais longo ganhar o marcador certo.
import { DETECTORES, type TipoDadoPessoal } from './detectores';

export const MARCADORES: Record<TipoDadoPessoal, string> = {
  'e-mail': '[e-mail removido]',
  telefone: '[telefone removido]',
  CPF: '[CPF removido]',
  CNPJ: '[CNPJ removido]',
};

export const MARCADOR_NOME = '[nome removido]';

const ORDEM: readonly TipoDadoPessoal[] = ['e-mail', 'CNPJ', 'CPF', 'telefone'];

// Linha inteira que começa por um cabeçalho de e-mail, em pt-BR ou em inglês, com ou sem citação ("> ") e negrito
// ("*De:*"), sem diferença de caixa. "Enviado em:" é a forma do Outlook em pt-BR. "Assunto:" e "Data:" ficam: não
// identificam pessoa e ajudam a entender o pedido.
export const CABECALHOS_DE_EMAIL =
  /^[ \t>]*\**(?:De|Para|Cc|Cco|Enviado(?: em)?|Responder para|From|To|Bcc|Sent|Reply-To)\**[ \t]*:[^\r\n]*(?:\r\n|\n|\r)?/gim;

// Nome com menos de 3 letras seria palavra comum ("a", "eu"): trocá-lo apagaria o texto, não o nome.
const MINIMO_NOME = 3;

// Só os caracteres de sintaxe: no modo `u`, escapar outro caractere (como o hífen) é erro.
const escaparRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// O nome inteiro, sem diferença de caixa, com qualquer espaço entre as partes e sem ser pedaço de outra palavra.
function padraoDoNome(nome: string): RegExp | null {
  const partes = nome.trim().split(/\s+/).filter((p) => p !== '');
  if (partes.join(' ').length < MINIMO_NOME) return null;
  return new RegExp(`(?<![\\p{L}\\p{N}_])${partes.map(escaparRegex).join('\\s+')}(?![\\p{L}\\p{N}_])`, 'giu');
}

export function minimizar(texto: string, op: { nomes?: readonly string[] } = {}): string {
  let s = texto.replace(CABECALHOS_DE_EMAIL, '');
  for (const nome of op.nomes ?? []) {
    const re = padraoDoNome(nome);
    if (re) s = s.replace(re, MARCADOR_NOME);
  }
  // `replace` com regex global começa do zero e devolve o `lastIndex` a zero: os detectores compartilhados não guardam
  // estado de uma chamada para a outra.
  for (const tipo of ORDEM) s = s.replace(DETECTORES[tipo], MARCADORES[tipo]);
  return s;
}
