// Escrito na 06-T37-testes (qa-automacao). Fecha o Minor 2 da 06-T37-revisao: em qr.test.ts, a leitura de volta usa
// mapaDeFuncao, blocosDaVersao e restoReedSolomon do próprio gerador, e um erro de posição de alinhamento ou de linha de
// tabela fora das versões 1, 5 e 10 sairia igual na escrita e na leitura. Aqui as tabelas vêm da norma (ISO/IEC 18004,
// copiadas em test/leitor-qr.ts) e o leitor não importa nada de src/lib/qr.ts. Cobre as 40 versões, não só as 7 a 10
// do totpURI.
import { describe, expect, it } from 'vitest';
import {
  ALINHAMENTO_NORMA,
  bitsDeSobraNorma,
  BLOCOS_M_NORMA,
  CAPACIDADE_BYTES_M_NORMA,
  centrosDeAlinhamento,
  ECC_POR_BLOCO_M_NORMA,
  ehModuloDeFuncaoNorma,
  FORMATO_M_NORMA,
  formatoDasCopias,
  ladoNorma,
  lerQr,
  padroesErrados,
  sindromesNulas,
  TOTAL_CODEWORDS_NORMA,
  VERSAO_NORMA,
  versaoDasCopias,
} from '../../test/leitor-qr';
import { bitsDeFormato, bitsDeVersao, blocosDaVersao, gerarQr, mapaDeFuncao, restoReedSolomon } from './qr';

const VERSOES = Array.from({ length: 40 }, (_, i) => i + 1);

// Texto ASCII imprimível de `tamanho` bytes, diferente por versão, sem depender de nada aleatório.
const textoDe = (tamanho: number, semente: number): string =>
  Array.from({ length: tamanho }, (_, i) => String.fromCharCode(32 + ((i * 37 + semente * 11) % 95))).join('');

describe('as tabelas de test/leitor-qr.ts são coerentes entre si (antes de servirem de régua)', () => {
  it('capacidade em bytes = (codewords de dados × 8 − 4 − contagem) / 8, nas 40 versões', () => {
    for (const v of VERSOES) {
      const dados = TOTAL_CODEWORDS_NORMA[v]! - BLOCOS_M_NORMA[v]! * ECC_POR_BLOCO_M_NORMA[v]!;
      const contagem = v < 10 ? 8 : 16;
      expect(Math.floor((dados * 8 - 4 - contagem) / 8), `versão ${v}`).toBe(CAPACIDADE_BYTES_M_NORMA[v]);
    }
  });

  it('o último alinhamento fica a 7 módulos da borda, e os módulos sem função somam os da tabela 1', () => {
    for (const v of VERSOES) {
      const n = ladoNorma(v);
      if (v >= 2) expect(ALINHAMENTO_NORMA[v]!.at(-1), `versão ${v}`).toBe(n - 7);
      let livres = 0;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!ehModuloDeFuncaoNorma(v, x, y)) livres++;
      expect(livres, `versão ${v}`).toBe(TOTAL_CODEWORDS_NORMA[v]! * 8 + bitsDeSobraNorma(v));
    }
  });

  it('as síndromes reconhecem o bloco publicado "HELLO WORLD" 1-M e recusam um byte trocado', () => {
    const bloco = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17, 196, 35, 39, 119, 235, 215, 231, 226, 93, 23];
    expect(sindromesNulas(bloco, 10)).toBe(true);
    expect(sindromesNulas(bloco.map((c, i) => (i === 3 ? c ^ 1 : c)), 10)).toBe(false);
  });
});

describe('src/lib/qr.ts contra a norma, nas 40 versões', () => {
  it('blocos e correção de nível M e total de codewords (tabelas 1 e 9)', () => {
    for (const v of VERSOES)
      expect(blocosDaVersao(v), `versão ${v}`).toEqual({
        blocos: BLOCOS_M_NORMA[v],
        eccPorBloco: ECC_POR_BLOCO_M_NORMA[v],
        totalCodewords: TOTAL_CODEWORDS_NORMA[v],
      });
  });

  it('bits de versão da 7 à 40 (anexo D) e bits de formato do nível M, máscaras 0 a 7 (anexo C)', () => {
    for (let v = 7; v <= 40; v++) expect(bitsDeVersao(v), `versão ${v}`).toBe(VERSAO_NORMA[v]);
    FORMATO_M_NORMA.forEach((f, mascara) => expect(bitsDeFormato('M', mascara), `máscara ${mascara}`).toBe(f));
  });

  it('mapa de função igual ao da norma, módulo a módulo (alinhamentos do anexo E, blocos de versão, formato)', () => {
    for (const v of VERSOES) {
      const mapa = mapaDeFuncao(v);
      const n = ladoNorma(v);
      expect(mapa, `versão ${v}`).toHaveLength(n);
      const diferentes: string[] = [];
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) if (mapa[y]![x] !== ehModuloDeFuncaoNorma(v, x, y)) diferentes.push(`(${x},${y})`);
      expect(diferentes, `versão ${v}`).toEqual([]);
    }
  });

  it('a correção de um bloco gerada pelo gerador é um codeword válido pelas síndromes, nos tamanhos de correção do nível M', () => {
    for (const ecc of new Set(ECC_POR_BLOCO_M_NORMA.slice(1))) {
      const dados = Array.from({ length: 40 }, (_, i) => (i * 73 + ecc) % 256);
      expect(sindromesNulas([...dados, ...restoReedSolomon(dados, ecc)], ecc), `${ecc} codewords de correção`).toBe(true);
    }
  });
});

describe('gerarQr lido por um leitor que não usa o gerador', () => {
  it.each(VERSOES)('versão %i: o texto do tamanho da capacidade cabe nela, é lido de volta igual, e um byte a mais muda de versão', (v) => {
    const texto = textoDe(CAPACIDADE_BYTES_M_NORMA[v]!, v);
    const qr = gerarQr(texto);
    expect(qr.versao).toBe(v);
    expect(qr.modulos).toHaveLength(ladoNorma(v));
    expect(padroesErrados(qr.modulos)).toEqual([]);
    const lido = lerQr(qr.modulos);
    expect(lido.mascara).toBe(qr.mascara);
    expect(lido.texto).toBe(texto);
    if (v >= 7) expect(versaoDasCopias(qr.modulos)).toEqual({ direita: VERSAO_NORMA[v], esquerda: VERSAO_NORMA[v] });
    if (v < 40) expect(gerarQr(`${texto}x`).versao).toBe(v + 1);
    else expect(() => gerarQr(`${texto}x`)).toThrow(RangeError);
  });

  it('um alinhamento por centro do anexo E, e nenhum na versão 1', () => {
    expect(centrosDeAlinhamento(1)).toEqual([]);
    expect(centrosDeAlinhamento(2)).toEqual([[18, 18]]);
    expect(centrosDeAlinhamento(7)).toHaveLength(6);
    expect(centrosDeAlinhamento(40)).toHaveLength(46);
  });

  it('o totpURI fictício da T02 e texto com acento (UTF-8 de 2 bytes) são lidos de volta iguais', () => {
    const uri =
      'otpauth://totp/WS%20Orquestrador%20de%20Demandas:configurar2fa%40ficticio.test?secret=IZUWG5DJMNUW6VDPORYEQ3LMINZGIU3PNVSW45DFKRSXG5DFGAZQ&issuer=WS%20Orquestrador%20de%20Demandas&digits=6&period=30';
    for (const texto of [uri, 'Pessoa Ficticia: ação, código, ênfase']) {
      const qr = gerarQr(texto);
      expect(lerQr(qr.modulos).texto).toBe(texto);
      const { copia1, copia2 } = formatoDasCopias(qr.modulos);
      expect(copia1).toBe(copia2);
    }
  });

  it('o leitor recusa um símbolo com um módulo de dado trocado (a régua não aceita qualquer coisa)', () => {
    const qr = gerarQr('WS Orquestrador de Demandas');
    const n = qr.modulos.length;
    const adulterado = qr.modulos.map((linha) => [...linha]);
    // (n-1, n-1) é o primeiro módulo de dado do zigue-zague.
    adulterado[n - 1]![n - 1] = !adulterado[n - 1]![n - 1];
    expect(() => lerQr(adulterado)).toThrow(/correção de erro/);
  });
});
