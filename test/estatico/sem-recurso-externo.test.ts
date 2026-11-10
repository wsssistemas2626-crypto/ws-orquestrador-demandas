// test/estatico/sem-recurso-externo.test.ts — CV-02 (04): nada de recurso de outra origem no código.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ESTE = 'test/estatico/sem-recurso-externo.test.ts';

type Regra = { nome: string; arquivos: RegExp; padrao: RegExp };
const REGRAS: readonly Regra[] = [
  { nome: 'Google Fonts', arquivos: /./, padrao: /fonts\.(?:googleapis|gstatic)\.com/i },
  { nome: 'next/font/google', arquivos: /./, padrao: /next\/font\/google/ },
  { nome: '@import com URL', arquivos: /./, padrao: /@import\s+(?:url\(\s*)?['"]?(?:https?:)?\/\//i },
  { nome: '<link> ou <script> absoluto', arquivos: /./, padrao: /<(?:link|script)\b[^>]*\b(?:href|src)\s*=\s*\{?\s*['"`](?:https?:)?\/\//i },
  { nome: 'url( em CSS', arquivos: /^src\/.*\.css$/, padrao: /url\(/i },
  { nome: 'style={', arquivos: /^src\/.*\.tsx$/, padrao: /\bstyle=\{/ },
  { nome: 'dangerouslySetInnerHTML', arquivos: /^src\/.*\.tsx?$/, padrao: /dangerouslySetInnerHTML/ },
  { nome: '.style da fonte', arquivos: /^src\//, padrao: /\b(?:fonteSans|fonteMono)\.style\b/ },
  { nome: 'endereço absoluto na interface', arquivos: /^src\/(?:app|components)\/.*\.(?:tsx?|css)$/, padrao: /https?:\/\/(?!www\.w3\.org\/2000\/svg)[a-z0-9-]+(?:\.[a-z0-9-]+)+/i },
];

export function achados(arquivo: string, fonte: string): string[] {
  return REGRAS.filter((r) => r.arquivos.test(arquivo) && r.padrao.test(fonte)).map((r) => `${arquivo}: ${r.nome}`);
}

const arquivos = [
  ...globSync('src/**/*.{ts,tsx,css}', { cwd: raiz }).filter((a) => !/\.test\.tsx?$/.test(a)),
  ...globSync('e2e/**/*.ts', { cwd: raiz }),
  ...globSync('test/**/*.ts', { cwd: raiz }).filter((a) => a !== ESTE),
  ...globSync('{next,playwright,postcss}.config.*', { cwd: raiz }),
].sort();

describe('CV-02: sem recurso externo', () => {
  it('a varredura enxerga o código (falha se o glob quebrar)', () => {
    expect(arquivos).toEqual(expect.arrayContaining(['src/app/globals.css', 'src/app/layout.tsx', 'e2e/apoio.ts', 'next.config.ts', 'playwright.config.ts']));
  });

  it('cada regra reprova a forma plantada', () => {
    expect(achados('src/app/globals.css', "@import url('https://fonts.googleapis.com/css2?family=Noto+Sans');")).toEqual([
      'src/app/globals.css: Google Fonts',
      'src/app/globals.css: @import com URL',
      'src/app/globals.css: url( em CSS',
      'src/app/globals.css: endereço absoluto na interface',
    ]);
    expect(achados('src/app/fontes.ts', "import { Noto_Sans } from 'next/font/google';")).toEqual(['src/app/fontes.ts: next/font/google']);
    expect(achados('src/app/layout.tsx', '<link rel="stylesheet" href="https://exemplo.test/x.css" />')).toContain('src/app/layout.tsx: <link> ou <script> absoluto');
    expect(achados('src/app/layout.tsx', '<script src={"//exemplo.test/x.js"} />')).toContain('src/app/layout.tsx: <link> ou <script> absoluto');
    expect(achados('src/app/marca.css', '.m { background: url(data:image/png;base64,AAAA) }')).toEqual(['src/app/marca.css: url( em CSS']);
    expect(achados('src/components/X.tsx', '<div style={{ color: "red" }} />')).toEqual(['src/components/X.tsx: style={']);
    expect(achados('src/components/X.tsx', '<div dangerouslySetInnerHTML={{ __html: t }} />')).toEqual(['src/components/X.tsx: dangerouslySetInnerHTML']);
    expect(achados('src/app/layout.tsx', '<body style={fonteSans.style}>')).toEqual(['src/app/layout.tsx: style={', 'src/app/layout.tsx: .style da fonte']);
    expect(achados('src/components/Marca.tsx', "const logo = 'https://cdn.exemplo.test/logo.svg';")).toEqual(['src/components/Marca.tsx: endereço absoluto na interface']);
  });

  it('deixa passar o que é da casa', () => {
    expect(achados('src/app/globals.css', "@import 'tailwindcss';")).toEqual([]);
    expect(achados('src/components/Icone.tsx', '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" />')).toEqual([]);
    expect(achados('src/components/dados-da-demanda.ts', "'Use um link que comece com http:// ou https://.'")).toEqual([]);
    expect(achados('src/app/layout.tsx', '<html className={`${fonteSans.variable} ${fonteMono.variable}`}>')).toEqual([]);
  });

  it('nenhum arquivo do repositório tem recurso externo', () => {
    expect(arquivos.flatMap((a) => achados(a, readFileSync(`${raiz}${a}`, 'utf8')))).toEqual([]);
  });
});
