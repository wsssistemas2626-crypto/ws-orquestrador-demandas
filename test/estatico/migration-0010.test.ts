// test/estatico/migration-0010.test.ts — SB-10 e RNF-08: uma migration nova, gerada e só aditiva; nenhuma custom, nenhum
// GRANT; as da main não mudam. T03 do pedido DEC-DEM-20261111-0018-v1.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const diario = JSON.parse(readFileSync(`${raiz}drizzle/meta/_journal.json`, 'utf8')) as { entries: { idx: number; tag: string }[] };
const sqlDa = (idx: number) => readFileSync(`${raiz}drizzle/${diario.entries.find((e) => e.idx === idx)!.tag}.sql`, 'utf8');
const comandos = (sql: string) =>
  sql
    .split('--> statement-breakpoint')
    .map((s) =>
      s
        .split('\n')
        .filter((l) => !l.trim().startsWith('--'))
        .join('\n')
        .trim(),
    )
    .filter(Boolean);

it('a 0010 é a última e a única nova, e não é custom (nome gerado, sem rls_)', () => {
  expect(diario.entries.map((e) => e.idx)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  expect(diario.entries.find((e) => e.idx === 10)!.tag).toMatch(/^0010_[a-z]+_[a-z_]+$/);
  expect(diario.entries.find((e) => e.idx === 10)!.tag).not.toMatch(/rls_/);
});

it('a 0010 é só o ADD COLUMN anulável e sem padrão', () => {
  expect(comandos(sqlDa(10))).toEqual(['ALTER TABLE "pacote_decisao" ADD COLUMN "caminhos_com_nome_na_criacao" text[];']);
});
