// test/estatico/classes-antigas.test.ts — D-01 e RF-01 (T16 do DEC-DEM-20261110-0015-v1): depois da T16, só os nomes
// de token da 03, 2.1 existem. Nenhum .ts/.tsx de src/ usa classe com nome da 0.1.13 (`text-texto`, `bg-primaria`,
// `border-borda`…) nem classe da paleta do Tailwind (`bg-blue-50`, `text-white`…), e o globals.css não declara mais os
// apelidos `--color-texto`, `--color-primaria`, `--color-borda`…
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');
const GLOBALS = 'src/app/globals.css';

// Nomes da 0.1.13 (03, 2.1, "Mapa dos tokens de hoje para os novos"). O fim `(?![\w-])` evita o falso positivo em token
// novo que começa igual (`text-texto-claro`, `bg-atencao-fundo`).
const NOMES_ANTIGOS = ['texto', 'texto-suave', 'fundo', 'fundo-suave', 'borda', 'primaria', 'perigo', 'sucesso', 'atencao-texto'] as const;
const ANTIGAS = new RegExp(
  String.raw`\b(?:bg|text|border|ring|outline|accent|decoration|fill|stroke)-(?:${NOMES_ANTIGOS.join('|')})(?![\w-])`,
  'g',
);
const PALETA_TAILWIND =
  /\b(?:bg|text|border|ring|outline|accent|decoration|fill|stroke|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b|\b(?:bg|text|border)-(?:white|black)\b/g;

export function classesAntigas(arquivo: string, fonte: string): string[] {
  const achados: string[] = [];
  fonte.split('\n').forEach((linha, i) => {
    for (const re of [ANTIGAS, PALETA_TAILWIND]) {
      for (const m of linha.matchAll(re)) achados.push(`${arquivo}:${i + 1}: ${m[0]}`);
    }
  });
  return achados;
}

// Variáveis `--color-<nome antigo>` declaradas em qualquer lugar do CSS.
export function apelidosNoCss(css: string): string[] {
  return NOMES_ANTIGOS.filter((n) => new RegExp(String.raw`--color-${n}\s*:`).test(css)).map((n) => `--color-${n}`);
}

const codigo = globSync('src/**/*.{ts,tsx}', { cwd: raiz })
  .filter((a) => !/\.test\.tsx?$/.test(a))
  .sort();

describe('D-01 e RF-01 (T16): só os nomes de token da 03 em src/', () => {
  it('a varredura enxerga o código (falha se o glob quebrar) e deixa os testes de fora', () => {
    expect(codigo).toEqual(expect.arrayContaining(['src/app/layout.tsx', 'src/components/Botao.tsx', 'src/components/CampoTexto.tsx', 'src/app/(painel)/demandas/fila.tsx']));
    expect(codigo.some((a) => /\.test\.tsx?$/.test(a))).toBe(false);
  });

  it('os casos plantados reprovam: nome antigo e paleta do Tailwind, com e sem variante e opacidade', () => {
    expect(classesAntigas('X.tsx', "className='text-primaria'")).toEqual(['X.tsx:1: text-primaria']);
    expect(classesAntigas('X.tsx', 'a\nclassName="bg-blue-50 hover:bg-red-800 text-white"')).toEqual([
      'X.tsx:2: bg-blue-50',
      'X.tsx:2: bg-red-800',
      'X.tsx:2: text-white',
    ]);
    expect(classesAntigas('X.tsx', 'aria-disabled:text-texto-suave border-borda bg-fundo-suave/50 text-atencao-texto')).toEqual([
      'X.tsx:1: text-texto-suave',
      'X.tsx:1: border-borda',
      'X.tsx:1: bg-fundo-suave',
      'X.tsx:1: text-atencao-texto',
    ]);
    expect(classesAntigas('X.tsx', 'ring-perigo outline-sucesso bg-black/50 from-slate-900')).toEqual([
      'X.tsx:1: ring-perigo',
      'X.tsx:1: outline-sucesso',
      'X.tsx:1: bg-black',
      'X.tsx:1: from-slate-900',
    ]);
  });

  it('os nomes da 03 passam, inclusive os que começam igual a um nome antigo', () => {
    const novos =
      'text-acao-escura bg-superficie text-branco bg-acao text-tinta text-tinta-media border-tinta-suave border-linha ' +
      'text-erro bg-erro-fundo text-positivo bg-positivo-fundo text-atencao bg-atencao-fundo text-texto-claro ' +
      'text-texto-claro-apoio bg-marinho bg-marinho-luz bg-nevoa bg-tinta/50 text-selo-violeta bg-selo-cinza-fundo';
    expect(classesAntigas('X.tsx', novos)).toEqual([]);
  });

  it('nenhum .ts ou .tsx de src/ (fora os testes) usa classe com nome antigo ou da paleta do Tailwind', () => {
    expect(codigo.flatMap((a) => classesAntigas(a, ler(a)))).toEqual([]);
  });
});

describe('D-01 (T16): o globals.css não declara mais os apelidos da 0.1.13', () => {
  it('o caso plantado reprova e o tema da 03 passa', () => {
    expect(apelidosNoCss('@theme {\n  --color-texto: var(--color-tinta);\n  --color-primaria: #000;\n}')).toEqual(['--color-texto', '--color-primaria']);
    expect(apelidosNoCss('@theme {\n  --color-tinta: #0f1620;\n  --color-texto-claro: #dfe6ee;\n  --color-atencao-fundo: #fdf3e0;\n}')).toEqual([]);
  });

  it('nenhum --color-<nome antigo> no globals.css', () => {
    expect(apelidosNoCss(ler(GLOBALS))).toEqual([]);
  });
});
