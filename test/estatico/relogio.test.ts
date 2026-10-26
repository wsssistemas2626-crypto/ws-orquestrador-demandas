// G3.4 e RNF-15: toda data vem de `Relogio`. `new Date()` sem argumento e `Date.now()` só existem em src/lib/relogio.ts.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const PROIBIDO = /\bnew\s+Date\s*\(\s*\)|\bDate\s*\.\s*now\s*\(/;

const arquivos = globSync('src/**/*.{ts,tsx}', { cwd: raiz })
  .filter((x) => !x.endsWith('.test.ts') && x !== 'src/lib/relogio.ts')
  .sort();

it('a varredura enxerga src/ (falha se o glob quebrar)', () => {
  expect(arquivos).toEqual(expect.arrayContaining(['src/lib/fuso.ts', 'src/modules/acesso/auth.ts']));
  expect(arquivos).not.toContain('src/lib/relogio.ts');
});

// Vale também para comentário: o texto proibido não aparece fora de relogio.ts, e o teste fica simples e sem exceção.
it('new Date() sem argumento e Date.now() só em src/lib/relogio.ts', () => {
  expect(arquivos.filter((a) => PROIBIDO.test(readFileSync(`${raiz}${a}`, 'utf8')))).toEqual([]);
});

it('a regra pega as formas proibidas e deixa passar a data com argumento', () => {
  for (const t of ['new Date()', 'new Date( )', 'Date.now()', 'Date . now()']) expect(t).toMatch(PROIBIDO);
  for (const t of ['new Date(ms)', 'new Date(iso)', 'relogio.agora()', 'performance.now()']) expect(t).not.toMatch(PROIBIDO);
});
