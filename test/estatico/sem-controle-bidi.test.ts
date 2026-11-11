// test/estatico/sem-controle-bidi.test.ts — T06 do DEC-DEM-20261110-0015-v1 (parecer 1 da revisão): nenhum caractere de
// controle bidirecional cru no fonte ("Trojan Source", CVE-2021-42574). Em editor, no diff e na revisão, o resto da linha
// depois de um desses caracteres aparece invertido, e quem revisa não vê onde o literal acaba. Quando o texto precisa do
// caractere (o título `textoDeTerceiro` do seed), ele vem de código: String.fromCodePoint(0x202e).
// A classe da regex é montada por código, e não digitada: nem o caractere nem a sequência de escape aparecem aqui.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));

// U+202A a U+202E (LRE, RLE, PDF, LRO, RLO) e U+2066 a U+2069 (LRI, RLI, FSI, PDI).
const intervalo = (de: number, ate: number): number[] => Array.from({ length: ate - de + 1 }, (_, i) => de + i);
export const CONTROLES_BIDI: readonly number[] = [...intervalo(0x202a, 0x202e), ...intervalo(0x2066, 0x2069)];
const BIDI = new RegExp(`[${CONTROLES_BIDI.map((c) => String.fromCodePoint(c)).join('')}]`, 'u');

const codigo = (c: string): string => `U+${(c.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`;

export function achados(arquivo: string, fonte: string): string[] {
  return fonte.split('\n').flatMap((linha, i) => {
    const achado = BIDI.exec(linha);
    return achado ? [`${arquivo}:${i + 1}: ${codigo(achado[0])}`] : [];
  });
}

const arquivos = [
  ...globSync('{src,scripts,test,e2e}/**/*.{ts,tsx,css}', { cwd: raiz }),
  ...globSync('*.config.*', { cwd: raiz }),
].sort();

describe('sem caractere de controle bidirecional cru no fonte', () => {
  it('a varredura enxerga o código (falha se o glob quebrar)', () => {
    expect(arquivos).toEqual(
      expect.arrayContaining([
        'src/app/layout.tsx',
        'src/app/globals.css',
        'scripts/seed-ficticio.ts',
        'scripts/scripts.test.ts',
        'test/estatico/sem-controle-bidi.test.ts',
        'e2e/apoio.ts',
        'vitest.config.ts',
      ]),
    );
  });

  it('a lista cobre os nove controles, de U+202A a U+202E e de U+2066 a U+2069', () => {
    expect(CONTROLES_BIDI.map((c) => codigo(String.fromCodePoint(c)))).toEqual([
      'U+202A',
      'U+202B',
      'U+202C',
      'U+202D',
      'U+202E',
      'U+2066',
      'U+2067',
      'U+2068',
      'U+2069',
    ]);
  });

  it('reprova cada controle plantado, dizendo arquivo, linha e código', () => {
    const rlo = `const t = 'Pedido ${String.fromCodePoint(0x202e)} com texto';`;
    expect(achados('scripts/x.ts', `// linha 1\n${rlo}\n`)).toEqual(['scripts/x.ts:2: U+202E']);
    for (const c of CONTROLES_BIDI) {
      const ch = String.fromCodePoint(c);
      expect(achados('src/x.ts', `a${ch}b`), codigo(ch)).toEqual([`src/x.ts:1: ${codigo(ch)}`]);
    }
  });

  it('deixa passar o que não é controle bidirecional', () => {
    expect(achados('src/x.ts', "const rlo = String.fromCodePoint(0x202e); // 'Decisão (fictício)' — ok")).toEqual([]);
    // Vizinhos dos intervalos: U+2029 (separador de parágrafo), U+202F (espaço estreito), U+2065 e U+206A.
    for (const c of [0x2029, 0x202f, 0x2065, 0x206a]) {
      expect(achados('src/x.ts', `a${String.fromCodePoint(c)}b`)).toEqual([]);
    }
  });

  it('nenhum arquivo do repositório tem controle bidirecional cru', () => {
    expect(arquivos.flatMap((a) => achados(a, readFileSync(`${raiz}${a}`, 'utf8')))).toEqual([]);
  });
});
