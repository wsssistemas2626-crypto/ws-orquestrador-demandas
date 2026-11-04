// Minimização do texto que vai ao provedor de IA (RF-20, C-23). Vale para todo campo de texto de todo agente, não só
// para o texto bruto. Em ordem:
// 1. as linhas de cabeçalho de e-mail encaminhado saem inteiras, com a quebra de linha;
// 2. e-mail, CNPJ, CPF e telefone viram marcadores, pelos mesmos detectores do Pedido de Construção (T22);
// 3. o nome completo de cada solicitante informado vira marcador, sem diferença de caixa nem de acento;
// 4. depois, cada parte de todos esses nomes (M-1 do 0009), com 3 letras ou mais e fora de PARTICULAS_DO_NOME, vira
//    marcador quando, no texto, começa por letra maiúscula; o resto da parte é sem diferença de caixa nem de acento.
// O cabeçalho sai primeiro para que nome e e-mail da linha "De:" não sobrem nem como marcador. O CNPJ vem antes do CPF,
// e os dois antes do telefone, para o número mais longo ganhar o marcador certo. Os detectores vêm antes do nome: o nome
// trocado primeiro desmontaria o e-mail "nome@dominio" (o "]" do marcador não casa no usuário do e-mail) e deixaria o
// domínio no texto. Todos os nomes completos vêm antes de todas as partes, para o nome completo virar um marcador só e a
// parte de um nome não quebrar o nome completo de outro. Nada é trocado dentro de um marcador, para um nome como
// "removido" ou "CPF", ou uma parte como "Nome", não o estragar. A maiúscula da parte evita trocar a palavra comum
// ("30 dias", "camisa rosa"); o nome escrito todo em minúscula ("a joana pediu") sobra, risco aceito no RSK do 0011.
// Sem acento nos dois sentidos, e também com o texto em NFD: a busca corre sobre uma cópia do texto dobrada sem mudar o
// comprimento, e a troca é feita na mesma faixa do texto original, que não é normalizado.
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

// Sem ser pedaço de outra palavra: nem letra, nem marca, nem número, nem "_" colados.
const ANTES = '(?<![\\p{L}\\p{M}\\p{N}_])';
const DEPOIS = '(?![\\p{L}\\p{M}\\p{N}_])';

// O nome inteiro, sem diferença de caixa nem de acento, com qualquer espaço entre os pedaços e sem ser pedaço de outra
// palavra.
function padraoDoNome(nome: string): RegExp | null {
  const pedacos = nome.trim().split(/\s+/).filter((p) => p !== '');
  if (pedacos.join(' ').length < MINIMO_NOME) return null;
  return new RegExp(`${ANTES}${pedacos.map(padraoDoPedaco).join('\\s+')}${DEPOIS}`, 'giu');
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

// Todas as partes numa regex só, em alternância, da mais longa para a mais curta.
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
  return new RegExp(`${ANTES}(?:${padroes.map((p) => p.padrao).join('|')})${DEPOIS}`, 'giu');
}

// Qualquer marcador, num grupo de captura: `split` devolve os marcadores nas posições ímpares, e o texto entre eles nas
// pares.
const RE_MARCADOR = new RegExp(`(${[...Object.values(MARCADORES), MARCADOR_NOME].map(escaparRegex).join('|')})`);

// A parte só é trocada se o trecho original começar por maiúscula. A conferência fica fora da regex com a flag `i`: com
// `iu`, `\p{Lu}` casa letra minúscula também.
const RE_COMECA_MAIUSCULA = /^\p{Lu}/u;

// Troca no trecho (fora de marcador) as faixas que a regex casa no texto dobrado e que `aceitar` deixa, mantendo o
// resto do trecho original como está.
function trocarNoTrecho(trecho: string, re: RegExp, aceitar: (casado: string) => boolean): string {
  let saida = '';
  let ultimo = 0;
  for (const m of dobrarTexto(trecho).matchAll(re)) {
    const inicio = m.index;
    const fim = inicio + m[0].length;
    if (!aceitar(trecho.slice(inicio, fim))) continue;
    saida += trecho.slice(ultimo, inicio) + MARCADOR_NOME;
    ultimo = fim;
  }
  return ultimo === 0 ? trecho : saida + trecho.slice(ultimo);
}

// Troca o nome só no texto fora dos marcadores. A borda do nome não muda: o "[" e o "]" dos marcadores não são letra.
function trocarNome(s: string, re: RegExp, aceitar: (casado: string) => boolean = () => true): string {
  return s
    .split(RE_MARCADOR)
    .map((parte, i) => (i % 2 === 1 ? parte : trocarNoTrecho(parte, re, aceitar)))
    .join('');
}

export function minimizar(texto: string, op: { nomes?: readonly string[] } = {}): string {
  let s = texto.replace(CABECALHOS_DE_EMAIL, '');
  // `replace` com regex global começa do zero e devolve o `lastIndex` a zero: os detectores compartilhados não guardam
  // estado de uma chamada para a outra.
  for (const tipo of ORDEM) s = s.replace(DETECTORES[tipo], MARCADORES[tipo]);
  const nomes = op.nomes ?? [];
  for (const nome of nomes) {
    const re = padraoDoNome(nome);
    if (re) s = trocarNome(s, re);
  }
  const partes = padraoDasPartes(nomes);
  if (partes) s = trocarNome(s, partes, (casado) => RE_COMECA_MAIUSCULA.test(casado));
  return s;
}

// O texto e cada texto de uma lista passam por `minimizar`; o resto (nulo, número, booleano) sai como está. Uma regra
// só para a entrada do agente e para a vista da API de quem não é pessoa (M-1 do 0008).
export function minimizarValor(v: unknown, nomes: readonly string[]): unknown {
  if (typeof v === 'string') return minimizar(v, { nomes });
  if (Array.isArray(v)) return v.map((i) => minimizarValor(i, nomes));
  return v;
}
