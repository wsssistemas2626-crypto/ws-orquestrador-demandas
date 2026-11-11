// test/estatico/tipografia-h2.test.ts — RF-01 e 03, 2.3 (T16 do DEC-DEM-20261110-0015-v1; Minor 1 da 06-T15-tech-lead):
// todo `h2` do painel usa a escala da 03 (18 px, peso 700, entrelinha 1,3), que vem da regra de `h2` do globals.css.
// Nenhum `h2` de src/ sobrescreve o tamanho nem o peso por classe (`text-xl font-semibold` era o `h2` da 0.1.13). A cor,
// o espaço e o `sr-only` continuam livres.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');

// A tag de abertura do h2 (pode ocupar várias linhas) e, dentro dela, a classe de tamanho ou de peso.
const RE_H2 = /<h2\b[^>]*>/g;
const RE_TAMANHO_OU_PESO = /(?<![\w:-])(?:[a-z]+:)*(?:text-(?:xs|sm|base|lg|xl|[2-9]xl|\[[^\]\s]+\])|font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black))(?![\w-])/g;

// Exceção da própria 03: o `h2` desenhado como etiqueta (Mono 12 / 600, caixa alta; 2.3), como o "Próxima ação" do
// cartão marinho da T05 (5.5).
const ETIQUETA = /\bfont-mono\b[^>]*\buppercase\b|\buppercase\b[^>]*\bfont-mono\b/;

export function h2ForaDaEscala(arquivo: string, fonte: string): string[] {
  const achados: string[] = [];
  for (const m of fonte.matchAll(RE_H2)) {
    if (ETIQUETA.test(m[0])) continue;
    const linha = fonte.slice(0, m.index).split('\n').length;
    for (const c of m[0].matchAll(RE_TAMANHO_OU_PESO)) achados.push(`${arquivo}:${linha}: ${c[0]}`);
  }
  return achados;
}

const codigo = globSync('src/**/*.tsx', { cwd: raiz })
  .filter((a) => !/\.test\.tsx$/.test(a))
  .sort();

describe('03, 2.3 (T16): h2 só com a escala do globals.css', () => {
  it('a varredura enxerga o código (falha se o glob quebrar)', () => {
    expect(codigo).toEqual(expect.arrayContaining(['src/components/ResumoErros.tsx', 'src/app/(painel)/configuracao/agentes/page.tsx']));
  });

  it('os casos plantados reprovam e a cor, o espaço e o sr-only passam', () => {
    expect(h2ForaDaEscala('X.tsx', '<h2 id="a" className="text-xl font-semibold">')).toEqual(['X.tsx:1: text-xl', 'X.tsx:1: font-semibold']);
    expect(h2ForaDaEscala('X.tsx', 'a\n<h2\n  className="md:text-[1.75rem] text-erro"\n>')).toEqual(['X.tsx:2: md:text-[1.75rem]']);
    expect(h2ForaDaEscala('X.tsx', '<h2 id="a" tabIndex={-1} className="sr-only text-erro mt-2 text-marinho">')).toEqual([]);
    expect(h2ForaDaEscala('X.tsx', '<h3 className="text-lg font-semibold">')).toEqual([]);
    // A etiqueta da 03, 2.3 (h2 do cartão Próxima ação, 5.5) é a exceção; sem caixa alta, não é etiqueta.
    expect(h2ForaDaEscala('X.tsx', '<h2 id="p" className="font-mono text-xs font-semibold uppercase tracking-[0.08em]">')).toEqual([]);
    expect(h2ForaDaEscala('X.tsx', '<h2 className="font-mono text-xs font-semibold">')).toEqual(['X.tsx:1: text-xs', 'X.tsx:1: font-semibold']);
  });

  it('nenhum h2 de src/ sobrescreve tamanho ou peso', () => {
    expect(codigo.flatMap((a) => h2ForaDaEscala(a, ler(a)))).toEqual([]);
  });
});
