// Minimização do texto que vai ao provedor de IA (RF-20, C-23). Vale para todo campo de texto de todo agente, não só
// para o texto bruto. Em ordem:
// 1. as linhas de cabeçalho de e-mail encaminhado saem inteiras, com a quebra de linha;
// 2. e-mail, CNPJ, CPF e telefone viram marcadores, pelos mesmos detectores do Pedido de Construção (T22);
// 3. o nome completo de cada solicitante informado vira marcador, sem diferença de caixa nem de acento, com espaço ou
//    "_" entre os pedaços; a borda é qualquer coisa que não seja letra nem marca (número e "_" colados também são);
// 4. depois, cada parte de todos esses nomes (M-1 do 0009), com 3 letras ou mais e fora de PARTICULAS_DO_NOME, vira
//    marcador quando, no texto, começa por letra maiúscula e tem fronteira nas duas pontas (`haFronteira`): o que não é
//    letra, a passagem de minúscula para maiúscula (CamelCase) e o fim de uma sigla ("Joana2", "Joana_x",
//    "JoanaFicticia", "JOANAFicticia", B-1 da revisão do 0011); o resto da parte é sem diferença de caixa nem de acento.
// O cabeçalho sai primeiro para que nome e e-mail da linha "De:" não sobrem nem como marcador. O CNPJ vem antes do CPF,
// e os dois antes do telefone, para o número mais longo ganhar o marcador certo. Os detectores vêm antes do nome: o nome
// trocado primeiro desmontaria o e-mail "nome@dominio" (o "]" do marcador não casa no usuário do e-mail) e deixaria o
// domínio no texto. Todos os nomes completos vêm antes de todas as partes, para o nome completo virar um marcador só e a
// parte de um nome não quebrar o nome completo de outro. Nada é trocado dentro de um marcador, para um nome como
// "removido" ou "CPF", ou uma parte como "Nome", não o estragar. A maiúscula da parte evita trocar a palavra comum
// ("30 dias", "camisa rosa"); o nome escrito todo em minúscula ("a joana pediu") sobra, risco aceito no RSK do 0011.
// Sem acento nos dois sentidos, e também com o texto em NFD: a busca corre sobre uma cópia do texto dobrada sem mudar o
// comprimento, e a troca é feita na mesma faixa do texto original, que não é normalizado.
// D1 do 0013: os passos 3 e 4 ficam em `trocarNomes`, e o Pedido de Construção pergunta por `temNome` se o texto tem o
// nome do solicitante (a mesma regra, sem cópia), para recusar a geração em vez de trocar.
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

// M-1 do 0009: palavras do nome que não viram marcador sozinhas, mesmo com 3 letras ou mais. Lista fechada, em
// minúscula e sem acento (a comparação dobra caixa e acento: "Dos", "DA" e "Júnior" ficam). Partículas e sufixos de
// parentesco, que são palavras comuns no texto ("o Neto do cliente").
export const PARTICULAS_DO_NOME: ReadonlySet<string> = new Set([
  'da',
  'das',
  'de',
  'do',
  'dos',
  'du',
  'del',
  'della',
  'di',
  'van',
  'von',
  'der',
  'den',
  'le',
  'la',
  'e',
  'y',
  'filho',
  'filha',
  'neto',
  'neta',
  'junior',
  'sobrinho',
]);

// Sem acento: a forma decomposta sem as marcas combinantes.
const semAcento = (s: string): string => s.normalize('NFD').replace(/\p{M}/gu, '');

// O texto dobrado sem mudar o comprimento: o caractere composto que é uma letra de uma unidade mais marcas vira a letra
// base; o resto (inclusive a marca combinante solta de um texto em NFD) fica onde está. Assim a faixa casada no texto
// dobrado é a mesma faixa no texto original.
const RE_LETRA_E_MARCAS = /^\p{L}\p{M}+$/u;
function dobrarTexto(s: string): string {
  let r = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charAt(i);
    if (c.charCodeAt(0) < 0x80) {
      r += c;
      continue;
    }
    const d = c.normalize('NFD');
    r += d.length > 1 && RE_LETRA_E_MARCAS.test(d) && d.charCodeAt(0) < 0xd800 ? d.charAt(0) : c;
  }
  return r;
}

// Um pedaço do nome, já sem acento, em regex: cada caractere é literal e pode vir seguido de marcas combinantes (texto
// em NFD).
const padraoDoPedaco = (pedaco: string): string => [...semAcento(pedaco)].map((c) => `${escaparRegex(c)}\\p{M}*`).join('');

// B-1 da revisão do 0011: borda do nome completo é só letra e marca. Número e "_" colados viram borda ("Joana Ficticia2",
// "x_Joana Ficticia").
const ANTES = '(?<![\\p{L}\\p{M}])';
const DEPOIS = '(?![\\p{L}\\p{M}])';

// O nome inteiro, sem diferença de caixa nem de acento, com qualquer espaço ou "_" entre os pedaços ("Joana_Ficticia",
// B-1 da revisão do 0011) e sem ser pedaço de outra palavra. Sem separador entre os pedaços não casa: "Ana Lise" não
// pode trocar "análise".
function padraoDoNome(nome: string): RegExp | null {
  const pedacos = nome.trim().split(/\s+/).filter((p) => p !== '');
  if (pedacos.join(' ').length < MINIMO_NOME) return null;
  return new RegExp(`${ANTES}${pedacos.map(padraoDoPedaco).join('[\\s_]+')}${DEPOIS}`, 'giu');
}

// M-1 do 0009: as partes do nome. O nome é cortado em espaço, hífen e apóstrofo; cada pedaço perde as pontas que não são
// letra nem número ("(Ficticia)" vira "Ficticia"); entra se tiver 3 letras ou mais e não for partícula; sem repetição
// (sem diferença de caixa nem de acento). Exportada para teste.
export function partesDoNome(nome: string): string[] {
  const partes: string[] = [];
  const vistas = new Set<string>();
  for (const bruto of nome.split(/[\s\-‐‑'’ʼ]+/u)) {
    const parte = bruto.replace(/^[^\p{L}\p{N}]+/u, '').replace(/[^\p{L}\p{M}\p{N}]+$/u, '');
    if ((parte.match(/\p{L}/gu) ?? []).length < MINIMO_NOME) continue;
    const chave = semAcento(parte).toLowerCase();
    if (PARTICULAS_DO_NOME.has(chave) || vistas.has(chave)) continue;
    vistas.add(chave);
    partes.push(parte);
  }
  return partes;
}

// Todas as partes numa regex só, em alternância, da mais longa para a mais curta. Sem borda na regex (B-1 da revisão do
// 0011): quem decide a borda é `haFronteira`, no `aceitar`, sobre o texto original.
function padraoDasPartes(nomes: readonly string[]): RegExp | null {
  const vistas = new Set<string>();
  const padroes: { tamanho: number; padrao: string }[] = [];
  for (const nome of nomes) {
    for (const parte of partesDoNome(nome)) {
      const chave = semAcento(parte).toLowerCase();
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      padroes.push({ tamanho: chave.length, padrao: padraoDoPedaco(parte) });
    }
  }
  if (padroes.length === 0) return null;
  padroes.sort((a, b) => b.tamanho - a.tamanho);
  return new RegExp(`(?:${padroes.map((p) => p.padrao).join('|')})`, 'giu');
}

// Qualquer marcador, num grupo de captura: `split` devolve os marcadores nas posições ímpares, e o texto entre eles nas
// pares.
const RE_MARCADOR = new RegExp(`(${[...Object.values(MARCADORES), MARCADOR_NOME].map(escaparRegex).join('|')})`);

// A parte só é trocada se o trecho original começar por maiúscula. A conferência fica fora da regex com a flag `i`: com
// `iu`, `\p{Lu}` casa letra minúscula também. Pelo mesmo motivo, as regex de caixa abaixo não têm `i`.
const RE_COMECA_MAIUSCULA = /^\p{Lu}/u;
const RE_LETRA = /^\p{L}$/u;
const RE_MINUSCULA = /^\p{Ll}$/u;
const RE_MAIUSCULA = /^\p{Lu}$/u;
const RE_MARCA = /^\p{M}$/u;

// O code point que começa em `i` (par substituto inteiro) e o que termina logo antes de `i`.
function codePointEm(s: string, i: number): string | undefined {
  const c = s.codePointAt(i);
  return c === undefined ? undefined : String.fromCodePoint(c);
}
function codePointAntes(s: string, i: number): string | undefined {
  if (i <= 0) return undefined;
  const baixo = s.charCodeAt(i - 1);
  if (i >= 2 && baixo >= 0xdc00 && baixo <= 0xdfff) {
    const alto = s.charCodeAt(i - 2);
    if (alto >= 0xd800 && alto <= 0xdbff) return s.slice(i - 2, i);
  }
  return s.charAt(i - 1);
}

// B-1 da revisão do 0011: há fronteira de palavra em `pos` (entre o que vem antes e o que começa ali)? Com `x` o último
// caractere antes de `pos` que não é marca, `y` o caractere em `pos` e `z` o seguinte a `y`, pulando as marcas de `y`:
// - sem `x` ou sem `y` (começo ou fim do trecho), ou um dos dois não é letra (número, "_", pontuação, espaço): é;
// - `x` minúscula e `y` maiúscula (CamelCase, "Joana|Ficticia"): é;
// - `x` e `y` maiúsculas e `z` minúscula (fim de sigla, "X|Ficticia", "JOANA|Ficticia"): é;
// - o resto não é ("Ana|bela", "ANA|TEL", "Ana|é").
// A mesma função vale para a borda direita de uma parte e a esquerda da seguinte, no mesmo `pos`: o que a primeira
// chamada de `minimizar` deixa, a segunda também deixa. Exportada para teste.
export function haFronteira(s: string, pos: number): boolean {
  let i = pos;
  let x = codePointAntes(s, i);
  while (x !== undefined && RE_MARCA.test(x)) {
    i -= x.length;
    x = codePointAntes(s, i);
  }
  const y = codePointEm(s, pos);
  if (x === undefined || y === undefined) return true;
  if (!RE_LETRA.test(x) || !RE_LETRA.test(y)) return true;
  if (RE_MINUSCULA.test(x) && RE_MAIUSCULA.test(y)) return true;
  if (RE_MAIUSCULA.test(x) && RE_MAIUSCULA.test(y)) {
    let j = pos + y.length;
    let z = codePointEm(s, j);
    while (z !== undefined && RE_MARCA.test(z)) {
      j += z.length;
      z = codePointEm(s, j);
    }
    return z !== undefined && RE_MINUSCULA.test(z);
  }
  return false;
}

type Aceitar = (trecho: string, inicio: number, fim: number) => boolean;

// Troca no trecho (fora de marcador) as faixas que a regex casa no texto dobrado e que `aceitar` deixa, mantendo o
// resto do trecho original como está. Casamento recusado não pula para o fim dele: a busca recomeça um code point depois
// do início, para não esconder um casamento bom que começa dentro do recusado ("AnAna" com a parte "Ana"). Cada posição
// é tentada no máximo uma vez a mais: continua linear.
function trocarNoTrecho(trecho: string, re: RegExp, aceitar: Aceitar): string {
  const dobrado = dobrarTexto(trecho);
  let saida = '';
  let ultimo = 0;
  re.lastIndex = 0;
  for (let m = re.exec(dobrado); m !== null; m = re.exec(dobrado)) {
    const inicio = m.index;
    const fim = inicio + m[0].length;
    if (!aceitar(trecho, inicio, fim)) {
      re.lastIndex = inicio + (codePointEm(dobrado, inicio)?.length ?? 1);
      continue;
    }
    saida += trecho.slice(ultimo, inicio) + MARCADOR_NOME;
    ultimo = fim;
  }
  return ultimo === 0 ? trecho : saida + trecho.slice(ultimo);
}

// A parte do nome: começa por maiúscula no texto original e tem fronteira nas duas pontas.
const aceitarParte: Aceitar = (trecho, inicio, fim) =>
  RE_COMECA_MAIUSCULA.test(trecho.slice(inicio, fim)) && haFronteira(trecho, inicio) && haFronteira(trecho, fim);

// Troca o nome só no texto fora dos marcadores. O começo e o fim do trecho são borda: o "[" e o "]" dos marcadores não
// são letra.
function trocarNome(s: string, re: RegExp, aceitar: Aceitar = () => true): string {
  return s
    .split(RE_MARCADOR)
    .map((parte, i) => (i % 2 === 1 ? parte : trocarNoTrecho(parte, re, aceitar)))
    .join('');
}

// Passos 3 e 4 de `minimizar` (nome completo e partes), sem o cabeçalho de e-mail e sem os detectores.
function trocarNomes(texto: string, nomes: readonly string[]): string {
  let s = texto;
  for (const nome of nomes) {
    const re = padraoDoNome(nome);
    if (re) s = trocarNome(s, re);
  }
  const partes = padraoDasPartes(nomes);
  if (partes) s = trocarNome(s, partes, aceitarParte);
  return s;
}

// D1 do 0013: o texto tem o nome, inteiro ou uma parte aceita pela mesma regra? É "a etapa do nome mudaria o texto": a
// troca só acontece fora de marcador e sempre põe MARCADOR_NOME no lugar de um trecho que não é esse marcador, então a
// igualdade é exata. Só a etapa do nome: "Para: o financeiro" (cabeçalho) não conta, e e-mail, telefone e CPF ficam com
// os detectores (C-28). Uma regra só com `minimizar`, sem cópia.
export function temNome(texto: string, nomes: readonly string[]): boolean {
  return trocarNomes(texto, nomes) !== texto;
}

export function minimizar(texto: string, op: { nomes?: readonly string[] } = {}): string {
  let s = texto.replace(CABECALHOS_DE_EMAIL, '');
  // `replace` com regex global começa do zero e devolve o `lastIndex` a zero: os detectores compartilhados não guardam
  // estado de uma chamada para a outra.
  for (const tipo of ORDEM) s = s.replace(DETECTORES[tipo], MARCADORES[tipo]);
  return trocarNomes(s, op.nomes ?? []);
}

// O texto e cada texto de uma lista passam por `minimizar`; o resto (nulo, número, booleano) sai como está. Uma regra
// só para a entrada do agente e para a vista da API de quem não é pessoa (M-1 do 0008).
export function minimizarValor(v: unknown, nomes: readonly string[]): unknown {
  if (typeof v === 'string') return minimizar(v, { nomes });
  if (Array.isArray(v)) return v.map((i) => minimizarValor(i, nomes));
  return v;
}
