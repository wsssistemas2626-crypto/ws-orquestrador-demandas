// T37: QR code do totpURI na T02 (03, T02, passo 2), gerado no próprio navegador, sem biblioteca e sem rede. Os testes
// conferem as peças da norma (ISO/IEC 18004) contra valores publicados e, depois, leem de volta o símbolo inteiro por um
// caminho escrito aqui (máscara pela tabela da norma, formato lido do símbolo, blocos separados), para o texto lido ser
// o texto escrito.
import { describe, expect, it } from 'vitest';
import { bitsDeFormato, bitsDeVersao, blocosDaVersao, caminhoSvgDoQr, gerarQr, mapaDeFuncao, restoReedSolomon } from './qr';

type Modulos = readonly (readonly boolean[])[];

const MASCARAS: ReadonlyArray<(x: number, y: number) => boolean> = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

// Primeira cópia do formato, ao redor do localizador do canto superior esquerdo (bit 0 em (8,0)); segunda cópia, dividida
// entre o canto inferior esquerdo e o superior direito.
function formatoLido(m: Modulos): { copia1: number; copia2: number } {
  const n = m.length;
  const bit = (x: number, y: number) => (m[y]![x] ? 1 : 0);
  let copia1 = 0;
  let copia2 = 0;
  const pos1: Array<[number, number]> = [];
  for (let i = 0; i <= 5; i++) pos1.push([8, i]);
  pos1.push([8, 7], [8, 8], [7, 8]);
  for (let i = 9; i < 15; i++) pos1.push([14 - i, 8]);
  const pos2: Array<[number, number]> = [];
  for (let i = 0; i < 8; i++) pos2.push([n - 1 - i, 8]);
  for (let i = 8; i < 15; i++) pos2.push([8, n - 15 + i]);
  pos1.forEach(([x, y], i) => (copia1 |= bit(x, y) << i));
  pos2.forEach(([x, y], i) => (copia2 |= bit(x, y) << i));
  return { copia1, copia2 };
}

// Lê o símbolo como um leitor faria: acha a máscara pelo formato, desfaz a máscara, percorre as colunas em zigue-zague,
// separa os blocos e confere a correção de erro de cada um. Devolve os bytes do texto.
function lerSimbolo(m: Modulos, versao: number): Uint8Array {
  const n = m.length;
  const { copia1 } = formatoLido(m);
  const mascara = [0, 1, 2, 3, 4, 5, 6, 7].find((k) => bitsDeFormato('M', k) === copia1);
  if (mascara === undefined) throw new Error('formato que não é de nível M');
  const funcao = mapaDeFuncao(versao);
  const bits: number[] = [];
  for (let direita = n - 1; direita >= 1; direita -= 2) {
    if (direita === 6) direita = 5;
    for (let v = 0; v < n; v++) {
      for (let j = 0; j < 2; j++) {
        const x = direita - j;
        const subindo = ((direita + 1) & 2) === 0;
        const y = subindo ? n - 1 - v : v;
        if (funcao[y]![x]) continue;
        bits.push((m[y]![x] !== MASCARAS[mascara]!(x, y) ? 1 : 0));
      }
    }
  }
  const { blocos, eccPorBloco, totalCodewords } = blocosDaVersao(versao);
  const codewords: number[] = [];
  for (let i = 0; i + 8 <= bits.length && codewords.length < totalCodewords; i += 8)
    codewords.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  const curtos = blocos - (totalCodewords % blocos);
  const tamCurto = Math.floor(totalCodewords / blocos);
  const dadosCurto = tamCurto - eccPorBloco;
  const porBloco: number[][] = Array.from({ length: blocos }, () => []);
  let k = 0;
  // Dados intercalados: os blocos curtos têm um codeword a menos.
  for (let i = 0; i < dadosCurto + 1; i++)
    for (let b = 0; b < blocos; b++) if (i < dadosCurto || b >= curtos) porBloco[b]!.push(codewords[k++]!);
  const ecc: number[][] = Array.from({ length: blocos }, () => []);
  for (let i = 0; i < eccPorBloco; i++) for (let b = 0; b < blocos; b++) ecc[b]!.push(codewords[k++]!);
  porBloco.forEach((d, b) => expect(restoReedSolomon(d, eccPorBloco), `ECC do bloco ${b}`).toEqual(ecc[b]));
  const dados = porBloco.flat();
  const fluxo = dados.flatMap((byte) => [7, 6, 5, 4, 3, 2, 1, 0].map((s) => (byte >> s) & 1));
  const ler = (de: number, qtd: number) => fluxo.slice(de, de + qtd).reduce((a, b) => (a << 1) | b, 0);
  expect(ler(0, 4), 'modo byte').toBe(0b0100);
  const bitsContagem = versao < 10 ? 8 : 16;
  const tamanho = ler(4, bitsContagem);
  return Uint8Array.from({ length: tamanho }, (_, i) => ler(4 + bitsContagem + 8 * i, 8));
}

function localizadorEm(m: Modulos, x0: number, y0: number): boolean {
  for (let dy = 0; dy < 7; dy++)
    for (let dx = 0; dx < 7; dx++) {
      const borda = dx === 0 || dx === 6 || dy === 0 || dy === 6;
      const miolo = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4;
      if (m[y0 + dy]![x0 + dx] !== (borda || miolo)) return false;
    }
  return true;
}

const URI_FICTICIA =
  'otpauth://totp/WS%20Orquestrador%20de%20Demandas:configurar2fa%40ficticio.test?secret=IZUWG5DJMNUW6VDPORYEQ3LMINZGIU3PNVSW45DFKRSXG5DFGAZQ&issuer=WS%20Orquestrador%20de%20Demandas&digits=6&period=30';

describe('peças da norma', () => {
  it('Reed-Solomon: o exemplo "HELLO WORLD" 1-M (16 codewords de dados, 10 de correção)', () => {
    const dados = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
    expect(restoReedSolomon(dados, 10)).toEqual([196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
  });

  it('bits de formato da tabela da norma (nível e máscara, BCH e a máscara 101010000010010)', () => {
    expect(bitsDeFormato('L', 0)).toBe(0b111011111000100);
    expect(bitsDeFormato('M', 0)).toBe(0b101010000010010);
    expect(bitsDeFormato('M', 5)).toBe(0b100000011001110);
    expect(bitsDeFormato('H', 7)).toBe(0b000100000111011);
  });

  it('bits de versão (7 e 10)', () => {
    expect(bitsDeVersao(7)).toBe(0x07c94);
    expect(bitsDeVersao(10)).toBe(0x0a4d3);
  });

  it('blocos de nível M: total de codewords e correção por bloco', () => {
    expect(blocosDaVersao(1)).toEqual({ blocos: 1, eccPorBloco: 10, totalCodewords: 26 });
    expect(blocosDaVersao(5)).toEqual({ blocos: 2, eccPorBloco: 24, totalCodewords: 134 });
    expect(blocosDaVersao(10)).toEqual({ blocos: 5, eccPorBloco: 26, totalCodewords: 346 });
  });
});

describe('gerarQr', () => {
  it('texto curto: versão 1, 21 × 21, os três localizadores, o padrão de tempo e o módulo escuro', () => {
    const { versao, modulos } = gerarQr('WS');
    expect(versao).toBe(1);
    expect(modulos).toHaveLength(21);
    expect(modulos.every((linha) => linha.length === 21)).toBe(true);
    expect(localizadorEm(modulos, 0, 0)).toBe(true);
    expect(localizadorEm(modulos, 14, 0)).toBe(true);
    expect(localizadorEm(modulos, 0, 14)).toBe(true);
    for (let i = 8; i <= 12; i++) {
      expect(modulos[6]![i]).toBe(i % 2 === 0);
      expect(modulos[i]![6]).toBe(i % 2 === 0);
    }
    expect(modulos[21 - 8]![8]).toBe(true);
  });

  it('as duas cópias do formato são iguais e de nível M', () => {
    const { mascara, modulos } = gerarQr(URI_FICTICIA);
    const { copia1, copia2 } = formatoLido(modulos);
    expect(copia1).toBe(copia2);
    expect(copia1).toBe(bitsDeFormato('M', mascara));
  });

  it.each([
    ['WS', 1],
    ['Chave de teste fictícia com acentuação: ação, código', 4],
    ['x'.repeat(140), 8],
    [URI_FICTICIA, 10],
  ])('lido de volta, devolve o mesmo texto (%#, versão %i)', (texto, versaoEsperada) => {
    const { versao, modulos } = gerarQr(texto);
    expect(versao).toBe(versaoEsperada);
    expect(modulos).toHaveLength(17 + 4 * versao);
    expect(new TextDecoder().decode(lerSimbolo(modulos, versao))).toBe(texto);
  });

  it('texto acima da capacidade do nível M na versão 40 é recusado', () => {
    expect(() => gerarQr('x'.repeat(2400))).toThrow(RangeError);
  });
});

describe('caminhoSvgDoQr', () => {
  it('um quadrado por módulo escuro, deslocado pela margem de 4 módulos', () => {
    const { modulos } = gerarQr('WS');
    const { lado, d } = caminhoSvgDoQr(modulos);
    expect(lado).toBe(21 + 8);
    const escuros = modulos.flat().filter(Boolean).length;
    expect(d.match(/M\d+ \d+h1v1h-1z/g)).toHaveLength(escuros);
    expect(d.startsWith('M4 4h1v1h-1z')).toBe(true);
  });
});
