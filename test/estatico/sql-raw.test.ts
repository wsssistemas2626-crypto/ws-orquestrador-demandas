// C-17: nenhum `sql.raw(` em src/. SQL só pelo query builder do Drizzle e pelo template `sql` com parâmetros (G3.5).
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const arquivos = globSync('src/**/*.{ts,tsx}', { cwd: raiz }).sort();

it('a varredura enxerga src/ (falha se o glob quebrar)', () => {
  expect(arquivos).toEqual(expect.arrayContaining(['src/lib/rota.ts', 'src/db/transacao.ts', 'src/app/layout.tsx']));
});

it('nenhum sql.raw( em src/', () => {
  expect(arquivos.filter((a) => /\bsql\s*\.\s*raw\s*\(/.test(readFileSync(`${raiz}${a}`, 'utf8')))).toEqual([]);
});
