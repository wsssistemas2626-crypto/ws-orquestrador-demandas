// Escrito na 06-T37-testes (qa-automacao). Leitor de QR code (ISO/IEC 18004) só para os testes, escrito sem importar
// nada de src/lib/qr.ts: as tabelas são as da norma (tabela 1, total de codewords e bits de sobra; tabela 9, blocos do
// nível M; anexo C, formato; anexo D, versão; anexo E, posição dos alinhamentos), o mapa dos módulos de função é
// desenhado por regiões e a correção de erro é conferida pelas síndromes (c(α^i) = 0), e não pelo resto da divisão
// que o gerador usa. Assim um erro de tabela ou de posição no gerador não sai igual na leitura (Minor 2 da
// 06-T37-revisao).
//
// Só o que a T02 precisa: nível M, modo byte. Qualquer desvio da norma lança erro com o motivo.

type Modulos = readonly (readonly boolean[])[];

// Anexo E: centros dos padrões de alinhamento, índice = versão.
export const ALINHAMENTO_NORMA: readonly (readonly number[])[] = [
  [],
  [],
  [6, 18],
  [6, 22],
  [6, 26],
  [6, 30],
  [6, 34],
  [6, 22, 38],
  [6, 24, 42],
  [6, 26, 46],
  [6, 28, 50],
  [6, 30, 54],
  [6, 32, 58],
  [6, 34, 62],
  [6, 26, 46, 66],
  [6, 26, 48, 70],
  [6, 26, 50, 74],
  [6, 30, 54, 78],
  [6, 30, 56, 82],
  [6, 30, 58, 86],
  [6, 34, 62, 90],
  [6, 28, 50, 72, 94],
  [6, 26, 50, 74, 98],
  [6, 30, 54, 78, 102],
  [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110],
  [6, 30, 58, 86, 114],
  [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122],
  [6, 30, 54, 78, 102, 126],
  [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134],
  [6, 34, 60, 86, 112, 138],
  [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146],
  [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154],
  [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162],
  [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
];

// Tabela 1: total de codewords, índice = versão.
export const TOTAL_CODEWORDS_NORMA: readonly number[] = [
  0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655, 733, 815, 901, 991, 1085, 1156, 1258, 1364, 1474,
  1588, 1706, 1828, 1921, 2051, 2185, 2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706,
];

// Tabela 1: bits que sobram depois do último codeword.
export function bitsDeSobraNorma(versao: number): number {
  if (versao === 1) return 0;
  if (versao <= 6) return 7;
  if (versao <= 13) return 0;
  if (versao <= 20) return 3;
  if (versao <= 27) return 4;
  if (versao <= 34) return 3;
  return 0;
}

// Tabela 9, nível M: número de blocos e codewords de correção por bloco, índice = versão.
export const BLOCOS_M_NORMA: readonly number[] = [
  0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40,
  43, 45, 47, 49,
];
export const ECC_POR_BLOCO_M_NORMA: readonly number[] = [
  0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
  28, 28, 28, 28, 28, 28, 28, 28,
];

// Tabela 7, nível M, modo byte: quantos bytes cabem em cada versão.
export const CAPACIDADE_BYTES_M_NORMA: readonly number[] = [
  0, 14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560, 624, 666, 711, 779, 857, 911, 997, 1059,
  1125, 1190, 1264, 1370, 1452, 1538, 1628, 1722, 1809, 1911, 1989, 2099, 2213, 2331,
];

// Anexo C: os 15 bits de formato do nível M já com a máscara 101010000010010, índice = padrão de máscara.
export const FORMATO_M_NORMA: readonly number[] = [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0];

// Anexo D: os 18 bits de versão, da 7 à 40 (índice = versão; abaixo da 7 não há).
export const VERSAO_NORMA: readonly number[] = [
  0, 0, 0, 0, 0, 0, 0, 0x07c94, 0x085bc, 0x09a99, 0x0a4d3, 0x0bbf6, 0x0c762, 0x0d847, 0x0e60d, 0x0f928, 0x10b78, 0x1145d, 0x12a17,
  0x13532, 0x149a6, 0x15683, 0x168c9, 0x177ec, 0x18ec4, 0x191e1, 0x1afab, 0x1b08e, 0x1cc1a, 0x1d33f, 0x1ed75, 0x1f250, 0x209d5,
  0x216f0, 0x228ba, 0x2379f, 0x24b0b, 0x2542e, 0x26a64, 0x27541, 0x28c69,
];

// Seção 8.8.1: i é a linha (y), j é a coluna (x).
const MASCARA_NORMA: ReadonlyArray<(i: number, j: number) => boolean> = [
  (i, j) => (i + j) % 2 === 0,
  (i) => i % 2 === 0,
  (_i, j) => j % 3 === 0,
  (i, j) => (i + j) % 3 === 0,
  (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
  (i, j) => ((i * j) % 2) + ((i * j) % 3) === 0,
  (i, j) => (((i * j) % 2) + ((i * j) % 3)) % 2 === 0,
  (i, j) => (((i + j) % 2) + ((i * j) % 3)) % 2 === 0,
];

export const ladoNorma = (versao: number): number => 17 + 4 * versao;

function versaoDoLado(lado: number): number {
  const v = (lado - 17) / 4;
  if (!Number.isInteger(v) || v < 1 || v > 40) throw new Error(`leitor-qr: lado ${lado} não é de versão 1 a 40`);
  return v;
}

// Centros de alinhamento que não caem sobre um localizador.
export function centrosDeAlinhamento(versao: number): Array<[number, number]> {
  const n = ladoNorma(versao);
  const pos = ALINHAMENTO_NORMA[versao]!;
  const centros: Array<[number, number]> = [];
  for (const cy of pos)
    for (const cx of pos) {
      const sobre = (cx < 9 && cy < 9) || (cx >= n - 8 && cy < 9) || (cx < 9 && cy >= n - 8);
      if (!sobre) centros.push([cx, cy]);
    }
  return centros;
}

// Módulo de função (sem dado), por região: localizador + separador + formato nos três cantos, o padrão de tempo, os
// alinhamentos e, da versão 7 em diante, os dois blocos de versão. O módulo escuro fica no canto inferior esquerdo.
export function ehModuloDeFuncaoNorma(versao: number, x: number, y: number): boolean {
  const n = ladoNorma(versao);
  if (x < 9 && y < 9) return true;
  if (x >= n - 8 && y < 9) return true;
  if (x < 9 && y >= n - 8) return true;
  if (x === 6 || y === 6) return true;
  if (versao >= 7 && ((x >= n - 11 && x < n - 8 && y < 6) || (y >= n - 11 && y < n - 8 && x < 6))) return true;
  return centrosDeAlinhamento(versao).some(([cx, cy]) => Math.abs(x - cx) <= 2 && Math.abs(y - cy) <= 2);
}

// As duas cópias do formato (bit 0 em (8, 0) na primeira; em (n-1, 8) na segunda).
export function formatoDasCopias(m: Modulos): { copia1: number; copia2: number } {
  const n = m.length;
  const b = (x: number, y: number) => (m[y]![x] ? 1 : 0);
  const pos1: Array<[number, number]> = [];
  for (let i = 0; i <= 5; i++) pos1.push([8, i]);
  pos1.push([8, 7], [8, 8], [7, 8]);
  for (let i = 9; i < 15; i++) pos1.push([14 - i, 8]);
  const pos2: Array<[number, number]> = [];
  for (let i = 0; i < 8; i++) pos2.push([n - 1 - i, 8]);
  for (let i = 8; i < 15; i++) pos2.push([8, n - 15 + i]);
  let copia1 = 0;
  let copia2 = 0;
  pos1.forEach(([x, y], i) => (copia1 |= b(x, y) << i));
  pos2.forEach(([x, y], i) => (copia2 |= b(x, y) << i));
  return { copia1, copia2 };
}

// Os dois blocos de versão (6 × 3): o do canto superior direito e o do inferior esquerdo, bit 0 no canto de cada um.
export function versaoDasCopias(m: Modulos): { direita: number; esquerda: number } {
  const n = m.length;
  let direita = 0;
  let esquerda = 0;
  for (let i = 0; i < 18; i++) {
    const a = n - 11 + (i % 3);
    const c = Math.floor(i / 3);
    if (m[c]![a]) direita |= 1 << i;
    if (m[a]![c]) esquerda |= 1 << i;
  }
  return { direita, esquerda };
}

// Padrões de função desenhados como a norma pede. Devolve a lista do que está errado (vazia quando tudo confere).
export function padroesErrados(m: Modulos): string[] {
  const n = m.length;
  const versao = versaoDoLado(n);
  const erros: string[] = [];
  const localizador = (x0: number, y0: number, nome: string) => {
    for (let dy = -1; dy <= 7; dy++)
      for (let dx = -1; dx <= 7; dx++) {
        const x = x0 + dx;
        const y = y0 + dy;
        if (x < 0 || y < 0 || x >= n || y >= n) continue;
        const dentro = dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6;
        const borda = dentro && (dx === 0 || dx === 6 || dy === 0 || dy === 6);
        const miolo = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
        // Fora do 7 × 7 é o separador, sempre claro.
        if (m[y]![x] !== (borda || miolo)) erros.push(`localizador ${nome} em (${x},${y})`);
      }
  };
  localizador(0, 0, 'superior esquerdo');
  localizador(n - 7, 0, 'superior direito');
  localizador(0, n - 7, 'inferior esquerdo');
  for (let i = 8; i <= n - 9; i++) {
    if (m[6]![i] !== (i % 2 === 0)) erros.push(`tempo horizontal em (${i},6)`);
    if (m[i]![6] !== (i % 2 === 0)) erros.push(`tempo vertical em (6,${i})`);
  }
  for (const [cx, cy] of centrosDeAlinhamento(versao))
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++)
        if (m[cy + dy]![cx + dx] !== (Math.max(Math.abs(dx), Math.abs(dy)) !== 1)) erros.push(`alinhamento (${cx},${cy}) em (${cx + dx},${cy + dy})`);
  if (!m[n - 8]![8]) erros.push('módulo escuro em (8,n-8)');
  return erros;
}

// GF(256) com o polinômio 0x11D, por tabela de exponencial e logaritmo.
const EXP: number[] = [];
const LOG: number[] = new Array<number>(256).fill(0);
{
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP.push(x);
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP.push(EXP[i - 255]!);
}
const vezes = (a: number, b: number): number => (a === 0 || b === 0 ? 0 : EXP[LOG[a]! + LOG[b]!]!);

// Bloco válido de Reed-Solomon: o polinômio do bloco se anula em α^0 … α^(ecc-1), as raízes do gerador.
export function sindromesNulas(bloco: readonly number[], ecc: number): boolean {
  for (let i = 0; i < ecc; i++) {
    const alfa = EXP[i]!;
    let s = 0;
    for (const c of bloco) s = vezes(s, alfa) ^ c;
    if (s !== 0) return false;
  }
  return true;
}

export type QrLido = { versao: number; mascara: number; bytes: Uint8Array; texto: string };

export function lerQr(m: Modulos): QrLido {
  const n = m.length;
  if (!m.every((linha) => linha.length === n)) throw new Error('leitor-qr: símbolo não é quadrado');
  const versao = versaoDoLado(n);

  const { copia1, copia2 } = formatoDasCopias(m);
  if (copia1 !== copia2) throw new Error('leitor-qr: as duas cópias do formato diferem');
  const mascara = FORMATO_M_NORMA.indexOf(copia1);
  if (mascara < 0) throw new Error('leitor-qr: formato fora do nível M');
  if (versao >= 7) {
    const { direita, esquerda } = versaoDasCopias(m);
    if (direita !== VERSAO_NORMA[versao] || esquerda !== VERSAO_NORMA[versao]) throw new Error('leitor-qr: bits de versão fora do anexo D');
  }

  // Zigue-zague de duas colunas, da direita para a esquerda, começando de baixo para cima e pulando a coluna 6.
  const bits: number[] = [];
  let subindo = true;
  for (let direita = n - 1; direita >= 1; direita -= 2) {
    if (direita === 6) direita = 5;
    for (let k = 0; k < n; k++) {
      const y = subindo ? n - 1 - k : k;
      for (const x of [direita, direita - 1]) {
        if (ehModuloDeFuncaoNorma(versao, x, y)) continue;
        bits.push(m[y]![x] !== MASCARA_NORMA[mascara]!(y, x) ? 1 : 0);
      }
    }
    subindo = !subindo;
  }
  const total = TOTAL_CODEWORDS_NORMA[versao]!;
  if (bits.length !== total * 8 + bitsDeSobraNorma(versao)) throw new Error('leitor-qr: módulos de dados fora da tabela 1');
  const codewords: number[] = [];
  for (let i = 0; i < total * 8; i += 8) codewords.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));

  // Blocos: os curtos primeiro, cada longo com um codeword de dados a mais; dados e correção intercalados.
  const blocos = BLOCOS_M_NORMA[versao]!;
  const ecc = ECC_POR_BLOCO_M_NORMA[versao]!;
  const totalDados = total - blocos * ecc;
  const curto = Math.floor(totalDados / blocos);
  const longos = totalDados % blocos;
  const tamanho = (b: number) => curto + (b >= blocos - longos ? 1 : 0);
  const porBloco: number[][] = Array.from({ length: blocos }, () => []);
  let k = 0;
  for (let i = 0; i <= curto; i++) for (let b = 0; b < blocos; b++) if (i < tamanho(b)) porBloco[b]!.push(codewords[k++]!);
  for (let i = 0; i < ecc; i++) for (let b = 0; b < blocos; b++) porBloco[b]!.push(codewords[k++]!);
  porBloco.forEach((bloco, b) => {
    if (!sindromesNulas(bloco, ecc)) throw new Error(`leitor-qr: correção de erro do bloco ${b} não confere`);
  });
  const dados = porBloco.flatMap((bloco, b) => bloco.slice(0, tamanho(b)));

  // Modo byte: 0100, contagem de 8 bits (versões 1 a 9) ou 16 (10 a 40), os bytes, o terminador e o enchimento.
  const fluxo = dados.flatMap((byte) => [7, 6, 5, 4, 3, 2, 1, 0].map((s) => (byte >> s) & 1));
  const ler = (de: number, qtd: number) => fluxo.slice(de, de + qtd).reduce((a, b) => (a << 1) | b, 0);
  if (ler(0, 4) !== 0b0100) throw new Error('leitor-qr: modo diferente de byte');
  const bitsContagem = versao < 10 ? 8 : 16;
  const qtd = ler(4, bitsContagem);
  const inicio = 4 + bitsContagem;
  if (inicio + qtd * 8 > fluxo.length) throw new Error('leitor-qr: contagem maior que a capacidade');
  const bytes = Uint8Array.from({ length: qtd }, (_, i) => ler(inicio + 8 * i, 8));
  let p = inicio + qtd * 8;
  const terminador = Math.min(4, fluxo.length - p);
  if (ler(p, terminador) !== 0) throw new Error('leitor-qr: terminador diferente de 0000');
  p += terminador;
  while (p % 8 !== 0) {
    if (fluxo[p] !== 0) throw new Error('leitor-qr: bits de alinhamento ao byte diferentes de 0');
    p++;
  }
  for (let enchimento = 0xec; p < fluxo.length; p += 8, enchimento ^= 0xec ^ 0x11)
    if (ler(p, 8) !== enchimento) throw new Error('leitor-qr: enchimento diferente de 0xEC e 0x11 alternados');

  return { versao, mascara, bytes, texto: new TextDecoder('utf-8', { fatal: true }).decode(bytes) };
}
