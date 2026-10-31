// QR code (ISO/IEC 18004) do totpURI da T02, gerado no navegador: o segredo TOTP nunca sai da página para um serviço de
// imagem. Só o que a tela precisa: modo byte (UTF-8), nível de correção M, versões 1 a 40, máscara pela menor
// penalidade. Desenho e algoritmo seguem a norma; os passos e as tabelas são os mesmos de implementações de referência
// (Reed-Solomon sobre GF(256) com o polinômio 0x11D, BCH do formato e da versão).
//
// Sem dependência nova: o plano da T37 não traz biblioteca de QR, e a T37 não pode instalar uma (pendência na entrega).

export type NivelCorrecao = 'L' | 'M' | 'Q' | 'H';
export type Qr = { versao: number; mascara: number; modulos: boolean[][] };

// Bits do nível no campo de formato (norma, tabela 12).
const BITS_DO_NIVEL: Readonly<Record<NivelCorrecao, number>> = { L: 1, M: 0, Q: 3, H: 2 };

// Nível M, índice = versão (o 0 não existe).
const ECC_POR_BLOCO_M = [
  -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
  28, 28, 28, 28, 28, 28, 28, 28, 28,
] as const;
const BLOCOS_M = [
  -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38,
  40, 43, 45, 47, 49,
] as const;

const bit = (x: number, i: number): boolean => ((x >>> i) & 1) !== 0;

// Multiplicação em GF(2^8) módulo x^8 + x^4 + x^3 + x^2 + 1.
function multiplicar(x: number, y: number): number {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}

function divisorReedSolomon(grau: number): number[] {
  const resultado = new Array<number>(grau).fill(0);
  resultado[grau - 1] = 1;
  let raiz = 1;
  for (let i = 0; i < grau; i++) {
    for (let j = 0; j < resultado.length; j++) {
      resultado[j] = multiplicar(resultado[j]!, raiz);
      if (j + 1 < resultado.length) resultado[j]! ^= resultado[j + 1]!;
    }
    raiz = multiplicar(raiz, 0x02);
  }
  return resultado;
}

// Os codewords de correção de um bloco: o resto da divisão dos dados pelo polinômio gerador de grau `grau`.
export function restoReedSolomon(dados: readonly number[], grau: number): number[] {
  const divisor = divisorReedSolomon(grau);
  const resto = new Array<number>(grau).fill(0);
  for (const b of dados) {
    const fator = b ^ resto.shift()!;
    resto.push(0);
    divisor.forEach((coef, i) => (resto[i]! ^= multiplicar(coef, fator)));
  }
  return resto;
}

// 15 bits: 2 do nível, 3 da máscara, 10 de BCH(15,5), com a máscara fixa 101010000010010.
export function bitsDeFormato(nivel: NivelCorrecao, mascara: number): number {
  const dados = (BITS_DO_NIVEL[nivel] << 3) | mascara;
  let resto = dados;
  for (let i = 0; i < 10; i++) resto = (resto << 1) ^ ((resto >>> 9) * 0x537);
  return ((dados << 10) | resto) ^ 0x5412;
}

// 18 bits a partir da versão 7: 6 da versão e 12 de BCH(18,6).
export function bitsDeVersao(versao: number): number {
  let resto = versao;
  for (let i = 0; i < 12; i++) resto = (resto << 1) ^ ((resto >>> 11) * 0x1f25);
  return (versao << 12) | resto;
}

const ladoDaVersao = (versao: number): number => versao * 4 + 17;

// Módulos que levam dados (e correção), sem os de função, em bits.
function modulosDeDados(versao: number): number {
  let resultado = (16 * versao + 128) * versao + 64;
  if (versao >= 2) {
    const n = Math.floor(versao / 7) + 2;
    resultado -= (25 * n - 10) * n - 55;
    if (versao >= 7) resultado -= 36;
  }
  return resultado;
}

export function blocosDaVersao(versao: number): { blocos: number; eccPorBloco: number; totalCodewords: number } {
  return { blocos: BLOCOS_M[versao]!, eccPorBloco: ECC_POR_BLOCO_M[versao]!, totalCodewords: Math.floor(modulosDeDados(versao) / 8) };
}

function codewordsDeDados(versao: number): number {
  const { blocos, eccPorBloco, totalCodewords } = blocosDaVersao(versao);
  return totalCodewords - blocos * eccPorBloco;
}

function posicoesDeAlinhamento(versao: number): number[] {
  if (versao === 1) return [];
  const n = Math.floor(versao / 7) + 2;
  const passo = Math.floor((versao * 8 + n * 3 + 5) / (n * 4 - 4)) * 2;
  const resultado = [6];
  for (let pos = ladoDaVersao(versao) - 7; resultado.length < n; pos -= passo) resultado.splice(1, 0, pos);
  return resultado;
}

class Simbolo {
  readonly lado: number;
  readonly modulos: boolean[][];
  readonly funcao: boolean[][];

  constructor(readonly versao: number) {
    this.lado = ladoDaVersao(versao);
    this.modulos = Array.from({ length: this.lado }, () => new Array<boolean>(this.lado).fill(false));
    this.funcao = Array.from({ length: this.lado }, () => new Array<boolean>(this.lado).fill(false));
    this.desenharPadroes();
  }

  private definirFuncao(x: number, y: number, escuro: boolean): void {
    this.modulos[y]![x] = escuro;
    this.funcao[y]![x] = true;
  }

  private desenharPadroes(): void {
    const n = this.lado;
    for (let i = 0; i < n; i++) {
      this.definirFuncao(6, i, i % 2 === 0);
      this.definirFuncao(i, 6, i % 2 === 0);
    }
    this.desenharLocalizador(3, 3);
    this.desenharLocalizador(n - 4, 3);
    this.desenharLocalizador(3, n - 4);
    const pos = posicoesDeAlinhamento(this.versao);
    const k = pos.length;
    for (let i = 0; i < k; i++)
      for (let j = 0; j < k; j++) {
        const sobreLocalizador = (i === 0 && j === 0) || (i === 0 && j === k - 1) || (i === k - 1 && j === 0);
        if (!sobreLocalizador) this.desenharAlinhamento(pos[i]!, pos[j]!);
      }
    // Reserva a área do formato (o valor certo entra depois da máscara) e desenha a versão.
    this.desenharFormato(0);
    this.desenharVersao();
  }

  private desenharLocalizador(x: number, y: number): void {
    for (let dy = -4; dy <= 4; dy++)
      for (let dx = -4; dx <= 4; dx++) {
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && xx < this.lado && yy >= 0 && yy < this.lado) this.definirFuncao(xx, yy, d !== 2 && d !== 4);
      }
  }

  private desenharAlinhamento(x: number, y: number): void {
    for (let dy = -2; dy <= 2; dy++)
      for (let dx = -2; dx <= 2; dx++) this.definirFuncao(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }

  desenharFormato(mascara: number): void {
    const bits = bitsDeFormato('M', mascara);
    const n = this.lado;
    for (let i = 0; i <= 5; i++) this.definirFuncao(8, i, bit(bits, i));
    this.definirFuncao(8, 7, bit(bits, 6));
    this.definirFuncao(8, 8, bit(bits, 7));
    this.definirFuncao(7, 8, bit(bits, 8));
    for (let i = 9; i < 15; i++) this.definirFuncao(14 - i, 8, bit(bits, i));
    for (let i = 0; i < 8; i++) this.definirFuncao(n - 1 - i, 8, bit(bits, i));
    for (let i = 8; i < 15; i++) this.definirFuncao(8, n - 15 + i, bit(bits, i));
    // O módulo escuro fixo.
    this.definirFuncao(8, n - 8, true);
  }

  private desenharVersao(): void {
    if (this.versao < 7) return;
    const bits = bitsDeVersao(this.versao);
    for (let i = 0; i < 18; i++) {
      const escuro = bit(bits, i);
      const a = this.lado - 11 + (i % 3);
      const b = Math.floor(i / 3);
      this.definirFuncao(a, b, escuro);
      this.definirFuncao(b, a, escuro);
    }
  }

  // Zigue-zague de duas colunas, de baixo para cima e de volta, pulando a coluna do padrão de tempo.
  desenharCodewords(dados: readonly number[]): void {
    const n = this.lado;
    let i = 0;
    for (let direita = n - 1; direita >= 1; direita -= 2) {
      if (direita === 6) direita = 5;
      for (let v = 0; v < n; v++)
        for (let j = 0; j < 2; j++) {
          const x = direita - j;
          const subindo = ((direita + 1) & 2) === 0;
          const y = subindo ? n - 1 - v : v;
          if (!this.funcao[y]![x] && i < dados.length * 8) {
            this.modulos[y]![x] = bit(dados[i >>> 3]!, 7 - (i & 7));
            i++;
          }
        }
    }
  }

  // Aplicar duas vezes desfaz (XOR).
  aplicarMascara(mascara: number): void {
    for (let y = 0; y < this.lado; y++)
      for (let x = 0; x < this.lado; x++) {
        if (this.funcao[y]![x]) continue;
        if (inverte(mascara, x, y)) this.modulos[y]![x] = !this.modulos[y]![x];
      }
  }

  penalidade(): number {
    const n = this.lado;
    const m = this.modulos;
    let total = 0;
    const linha = (y: number) => m[y]!;
    const coluna = (x: number) => m.map((l) => l[x]!);
    const PADRAO = [true, false, true, true, true, false, true];
    for (let k = 0; k < n; k++) {
      for (const seq of [linha(k), coluna(k)]) {
        // Regra 1: corridas de 5 ou mais da mesma cor.
        let corrida = 1;
        for (let i = 1; i <= n; i++) {
          if (i < n && seq[i] === seq[i - 1]) corrida++;
          else {
            if (corrida >= 5) total += 3 + (corrida - 5);
            corrida = 1;
          }
        }
        // Regra 3: 1:1:3:1:1 com quatro claros de um dos lados (fora do símbolo conta como claro).
        for (let i = 0; i + 7 <= n; i++) {
          if (!PADRAO.every((p, j) => seq[i + j] === p)) continue;
          const claros = (de: number, ate: number) => {
            for (let j = de; j < ate; j++) if (j >= 0 && j < n && seq[j]) return false;
            return true;
          };
          if (claros(i - 4, i) || claros(i + 7, i + 11)) total += 40;
        }
      }
    }
    // Regra 2: blocos 2 × 2 da mesma cor.
    for (let y = 0; y < n - 1; y++)
      for (let x = 0; x < n - 1; x++) {
        const c = m[y]![x];
        if (c === m[y]![x + 1] && c === m[y + 1]![x] && c === m[y + 1]![x + 1]) total += 3;
      }
    // Regra 4: equilíbrio entre escuros e claros.
    const escuros = m.reduce((s, l) => s + l.filter(Boolean).length, 0);
    const modulos = n * n;
    total += (Math.ceil(Math.abs(escuros * 20 - modulos * 10) / modulos) - 1) * 10;
    return total;
  }
}

function inverte(mascara: number, x: number, y: number): boolean {
  switch (mascara) {
    case 0:
      return (x + y) % 2 === 0;
    case 1:
      return y % 2 === 0;
    case 2:
      return x % 3 === 0;
    case 3:
      return (x + y) % 3 === 0;
    case 4:
      return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
    case 5:
      return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6:
      return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    default:
      return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
}

// Mapa dos módulos de função de uma versão (localizadores, tempo, alinhamento, formato, versão): o que não leva dado.
export function mapaDeFuncao(versao: number): boolean[][] {
  return new Simbolo(versao).funcao.map((l) => [...l]);
}

// Fluxo de bits do modo byte, com terminador e preenchimento até a capacidade da versão.
function codewordsDoTexto(bytes: Uint8Array, versao: number): number[] {
  const bits: number[] = [];
  const escrever = (valor: number, tamanho: number) => {
    for (let i = tamanho - 1; i >= 0; i--) bits.push((valor >>> i) & 1);
  };
  escrever(0b0100, 4);
  escrever(bytes.length, versao < 10 ? 8 : 16);
  for (const b of bytes) escrever(b, 8);
  const capacidade = codewordsDeDados(versao) * 8;
  escrever(0, Math.min(4, capacidade - bits.length));
  escrever(0, (8 - (bits.length % 8)) % 8);
  for (let enchimento = 0xec; bits.length < capacidade; enchimento ^= 0xec ^ 0x11) escrever(enchimento, 8);
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) codewords.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
  return codewords;
}

// Divide em blocos, calcula a correção de cada um e intercala (os blocos curtos têm um codeword de dados a menos).
function comCorrecao(dados: readonly number[], versao: number): number[] {
  const { blocos, eccPorBloco, totalCodewords } = blocosDaVersao(versao);
  const curtos = blocos - (totalCodewords % blocos);
  const tamCurto = Math.floor(totalCodewords / blocos);
  const lista: number[][] = [];
  for (let i = 0, k = 0; i < blocos; i++) {
    const dat = dados.slice(k, k + tamCurto - eccPorBloco + (i < curtos ? 0 : 1));
    k += dat.length;
    const ecc = restoReedSolomon(dat, eccPorBloco);
    if (i < curtos) dat.push(0);
    lista.push([...dat, ...ecc]);
  }
  const resultado: number[] = [];
  for (let i = 0; i < lista[0]!.length; i++)
    lista.forEach((bloco, j) => {
      if (i !== tamCurto - eccPorBloco || j >= curtos) resultado.push(bloco[i]!);
    });
  return resultado;
}

export function gerarQr(texto: string): Qr {
  const bytes = new TextEncoder().encode(texto);
  let versao = 1;
  for (; versao <= 40; versao++) {
    const bitsUsados = 4 + (versao < 10 ? 8 : 16) + bytes.length * 8;
    if (bitsUsados <= codewordsDeDados(versao) * 8) break;
  }
  if (versao > 40) throw new RangeError('gerarQr: texto acima da capacidade');
  const simbolo = new Simbolo(versao);
  simbolo.desenharCodewords(comCorrecao(codewordsDoTexto(bytes, versao), versao));
  let melhor = 0;
  let menor = Infinity;
  for (let k = 0; k < 8; k++) {
    simbolo.aplicarMascara(k);
    simbolo.desenharFormato(k);
    const p = simbolo.penalidade();
    if (p < menor) {
      menor = p;
      melhor = k;
    }
    simbolo.aplicarMascara(k);
  }
  simbolo.aplicarMascara(melhor);
  simbolo.desenharFormato(melhor);
  return { versao, mascara: melhor, modulos: simbolo.modulos };
}

// Caminho SVG de um quadrado de 1 × 1 por módulo escuro, com a zona de silêncio de `margem` módulos (a norma pede 4).
export function caminhoSvgDoQr(modulos: readonly (readonly boolean[])[], margem = 4): { lado: number; d: string } {
  const partes: string[] = [];
  modulos.forEach((linha, y) =>
    linha.forEach((escuro, x) => {
      if (escuro) partes.push(`M${x + margem} ${y + margem}h1v1h-1z`);
    }),
  );
  return { lado: modulos.length + margem * 2, d: partes.join('') };
}
