// Detectores de dado pessoal: e-mail, telefone brasileiro, CPF e CNPJ (04, C-23 e C-28). O Pedido de Construção procura
// e-mail, telefone e CPF antes de ser entregue (C-28; CNPJ não, decisão da 04); a minimização do que vai ao provedor de
// IA (T24) usa os quatro. O resultado diz onde está e de que tipo é, nunca o valor encontrado.
export type TipoDadoPessoal = 'e-mail' | 'telefone' | 'CPF' | 'CNPJ';

// Globais, para a T24 trocar todas as ocorrências. Aqui só se pergunta "tem?", por `search`, que ignora e preserva o
// `lastIndex`: uma chamada não muda o resultado da seguinte.
export const DETECTORES: Record<TipoDadoPessoal, RegExp> = {
  'e-mail': /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
  telefone: /(?:\+55\s?)?(?:\(\d{2}\)|\b\d{2})\s?9?\d{4}[-\s]\d{4}\b/g,
  CPF: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{11}\b/g,
  CNPJ: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b|\b\d{14}\b/g,
};

export type DadoPessoalEncontrado = { caminho: string; tipo: TipoDadoPessoal };

const juntar = (caminho: string, chave: string): string => (caminho === '' ? chave : `${caminho}.${chave}`);

// Percorre texto, lista e objeto. Caminho no formato `a.b[1].c`; na raiz, o `caminho` dado (ou vazio). Número, booleano
// e nulo não são lidos. Um item por campo e tipo, na ordem das chaves e dos tipos pedidos.
export function encontrarDadosPessoais(valor: unknown, tipos: TipoDadoPessoal[], caminho = ''): DadoPessoalEncontrado[] {
  if (typeof valor === 'string') return tipos.filter((tipo) => valor.search(DETECTORES[tipo]) >= 0).map((tipo) => ({ caminho, tipo }));
  if (Array.isArray(valor)) return valor.flatMap((item, i) => encontrarDadosPessoais(item, tipos, `${caminho}[${i}]`));
  if (valor !== null && typeof valor === 'object') {
    return Object.entries(valor).flatMap(([chave, item]) => encontrarDadosPessoais(item, tipos, juntar(caminho, chave)));
  }
  return [];
}
