// test/estatico/cores-so-por-token.test.ts — CA-01.1, CA-01.2 e CA-01.3 (RF-01): hexadecimal só no @theme do
// globals.css (e o QR da T02), nenhum style={ em src/, e cada cor do manual com variável de valor exato.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');
const GLOBALS = 'src/app/globals.css';

// Cor hexadecimal de 3, 4, 6 ou 8 dígitos, fora de entidade HTML (&#123;) e de identificador (#conteudo).
const RE_HEX = /(?<![\w&])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})(?![\w-])/gi;

// CA-01.1: a única exceção é o QR da T02, que desenha em preto sobre branco e só com essas duas cores.
const EXCECOES: Readonly<Record<string, readonly string[]>> = {
  'src/app/configurar-2fa/AssistenteDoisFatores.tsx': ['#ffffff', '#000000'],
};

export function hexForaDoTema(arquivo: string, fonte: string): string[] {
  const permitidas = EXCECOES[arquivo] ?? [];
  return [...fonte.matchAll(RE_HEX)].map((m) => m[0].toLowerCase()).filter((h) => !permitidas.includes(h)).map((h) => `${arquivo}: ${h}`);
}

// O globals.css só tem hexadecimal dentro do primeiro bloco `@theme { … }` (o `@theme inline` das famílias não tem cor).
export function hexForaDoBlocoTheme(css: string): string[] {
  const tema = /@theme\s*\{[^}]*\}/.exec(css)?.[0] ?? '';
  return [...css.replace(tema, '').matchAll(RE_HEX)].map((m) => m[0].toLowerCase());
}

const codigo = globSync('src/**/*.{ts,tsx}', { cwd: raiz })
  .filter((a) => !/\.test\.tsx?$/.test(a))
  .sort();
const outrosCss = globSync('src/**/*.css', { cwd: raiz })
  .filter((a) => a !== GLOBALS)
  .sort();

// CA-01.3: paleta do manual (MKT-2026-005, 3.1), pelos nomes da 03, 2.1.
const PALETA: Readonly<Record<string, string>> = {
  marinho: '#12385f',
  acao: '#1a6ae0',
  'acao-escura': '#1354b4',
  'azul-claro': '#7db0f5',
  tinta: '#0f1620',
  'tinta-media': '#4a5763',
  superficie: '#f6f8fa',
  nevoa: '#eaf1fd',
  linha: '#dfe4ea',
  branco: '#ffffff',
  positivo: '#0f7a52',
  atencao: '#8a5a00',
  erro: '#b42318',
};

describe('CA-01.1: hexadecimal só no @theme do globals.css (e o QR da T02)', () => {
  it('a varredura enxerga o código (falha se o glob quebrar)', () => {
    expect(codigo).toEqual(expect.arrayContaining(['src/app/layout.tsx', 'src/components/Selo.tsx', 'src/components/Botao.tsx', 'src/app/configurar-2fa/AssistenteDoisFatores.tsx']));
    expect(codigo.some((a) => a.endsWith('.test.ts'))).toBe(false);
  });

  it('a regra reprova a forma plantada e deixa passar o que não é cor', () => {
    expect(hexForaDoTema('src/components/X.tsx', "const c = '#1A6AE0';")).toEqual(['src/components/X.tsx: #1a6ae0']);
    expect(hexForaDoTema('src/components/X.tsx', 'fill="#fff" stroke="#00000080"')).toEqual(['src/components/X.tsx: #fff', 'src/components/X.tsx: #00000080']);
    expect(hexForaDoTema('src/app/configurar-2fa/AssistenteDoisFatores.tsx', 'fill="#ffffff" stroke="#000000"')).toEqual([]);
    expect(hexForaDoTema('src/app/configurar-2fa/AssistenteDoisFatores.tsx', 'fill="#12385f"')).toEqual(['src/app/configurar-2fa/AssistenteDoisFatores.tsx: #12385f']);
    expect(hexForaDoTema('src/components/X.tsx', 'href="#conteudo" href="#resultado-da-fila" &#123;')).toEqual([]);
    expect(hexForaDoBlocoTheme('@theme {\n  --color-x: #123456;\n}\n.a { color: #abcdef; }')).toEqual(['#abcdef']);
    expect(hexForaDoBlocoTheme('@theme {\n  --color-x: #123456;\n}\n.a { color: var(--color-x); }')).toEqual([]);
  });

  it('nenhum .ts ou .tsx de src/ tem hexadecimal fora da exceção do QR', () => {
    expect(codigo.flatMap((a) => hexForaDoTema(a, ler(a)))).toEqual([]);
  });

  it('nenhum outro .css de src/ tem hexadecimal, e o globals.css só dentro do @theme', () => {
    expect(outrosCss.flatMap((a) => hexForaDoTema(a, ler(a)))).toEqual([]);
    expect(hexForaDoBlocoTheme(ler(GLOBALS))).toEqual([]);
  });
});

describe('CA-01.2: nenhum style={ em src/', () => {
  it('nenhum arquivo de src/ usa style={', () => {
    expect(codigo.filter((a) => /\bstyle=\{/.test(ler(a)))).toEqual([]);
  });
});

describe('CA-01.3: cada cor do manual tem uma variável com o valor exato, dentro do @theme', () => {
  const tema = /@theme\s*\{([^}]*)\}/.exec(ler(GLOBALS))?.[1] ?? '';
  it.each(Object.entries(PALETA))('--color-%s = %s', (nome, valor) => {
    expect(tema).toMatch(new RegExp(`--color-${nome}:\\s*${valor};`, 'i'));
  });
});
