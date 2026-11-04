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
// mais longo. Flag `u` obrigatória: sem ela, `\p{L}` seria a classe dos caracteres "p{L}".
//
// A âncora sozinha perdia o e-mail colado no fim de outro ("a@exemplo.test+b@exemplo.test", 04-regressao do 0012): o
// caractere antes do "+" é o "t" do TLD, que é da classe do usuário, e o lookbehind recusava o começo ali. A regex de
// antes recomeçava a busca logo no fim do casamento anterior e casava o segundo. Por isso o `exec` deste detector, quando
// continua uma busca global (`lastIndex` > 0, o fim do casamento anterior em `replace` e `matchAll`), tenta primeiro, só
// naquela posição (flag `y`), a mesma regex sem o lookbehind; se não casar ali, segue a regex ancorada. A tentativa extra
// percorre uma vez a sequência que começa no fim do anterior (e o domínio depois do "@" dela), e o casamento seguinte, se
// houver, termina depois dela: continua linear, também numa cadeia longa de e-mails colados. Com isso, todo caractere que
// a regex de antes cobria continua coberto, e o casamento novo pode começar antes (acento no usuário). A busca de "tem?"
// (`search`, Pedido de Construção) começa do zero e não usa a tentativa extra.
const USUARIO_DO_EMAIL = '[\\p{L}\\p{M}\\p{N}._%+-]';
const EMAIL_SEM_ANCORA = `${USUARIO_DO_EMAIL}+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}`;
const EMAIL_ANCORADO = `(?<!${USUARIO_DO_EMAIL})${EMAIL_SEM_ANCORA}`;

class DetectorDeEmail extends RegExp {
  // Cópia própria de cada instância: `matchAll` cria outra instância (Symbol.species) e as duas não dividem `lastIndex`.
  readonly #colado = new RegExp(EMAIL_SEM_ANCORA, 'uy');

  // `matchAll` e `split` chamam `new DetectorDeEmail(origem, flags)`; o padrão é sempre o do e-mail.
  constructor(_origem?: unknown, flags = 'gu') {
    super(EMAIL_ANCORADO, flags);
  }

  override exec(texto: string): RegExpExecArray | null {
    const inicio = this.lastIndex;
    if (this.global && !this.sticky && inicio > 0) {
      this.#colado.lastIndex = inicio;
      const m = this.#colado.exec(texto);
      if (m) {
        this.lastIndex = this.#colado.lastIndex;
        return m;
      }
    }
    return super.exec(texto);
  }
}

export const DETECTORES: Record<TipoDadoPessoal, RegExp> = {
  'e-mail': new DetectorDeEmail(),
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
