// Detectores de dado pessoal: e-mail, telefone brasileiro, CPF e CNPJ (04, C-23 e C-28). O Pedido de Construção procura
// e-mail, telefone e CPF antes de ser entregue (C-28; CNPJ não, decisão da 04); a minimização do que vai ao provedor de
// IA (T24) usa os quatro. O resultado diz onde está e de que tipo é, nunca o valor encontrado.
export type TipoDadoPessoal = 'e-mail' | 'telefone' | 'CPF' | 'CNPJ';

// Globais, para a T24 trocar todas as ocorrências. Aqui só se pergunta "tem?", por `search`, que ignora e preserva o
// `lastIndex`: uma chamada não muda o resultado da seguinte.
//
// E-mail (M-a e B-2 da revisão do 0011): o usuário aceita letra, marca combinante (texto em NFD) e número de qualquer
// alfabeto, além de `._%+-`; o domínio e o TLD seguem ASCII. O início é ancorado: o lookbehind só deixa começar no
// primeiro caractere de uma sequência de usuário. Sem a âncora, cada posição de uma sequência longa sem "@" tentava de
// novo até o fim (custo quadrático: 100 mil caracteres em ~20 s). Com ela, cada sequência e cada "@" são tentados uma vez
// só, e o custo é linear sem limite de tamanho; por isso não há `{1,64}` no usuário, que deixaria de detectar o usuário
// mais longo. A classe nova contém a antiga e o casamento termina no mesmo lugar: nenhum e-mail detectado antes deixa
// de ser. Flag `u` obrigatória: sem ela, `\p{L}` seria a classe dos caracteres "p{L}".
export const DETECTORES: Record<TipoDadoPessoal, RegExp> = {
  'e-mail': /(?<![\p{L}\p{M}\p{N}._%+-])[\p{L}\p{M}\p{N}._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/gu,
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
