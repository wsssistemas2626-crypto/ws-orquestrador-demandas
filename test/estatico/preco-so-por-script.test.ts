// C-26 (06-T23-testes, qa-automacao): preço por modelo só por script. O papel do app tem INSERT em preco_modelo (o
// script da T33 usa o mesmo papel), então a barreira é não haver código do app que grave nela: nenhum arquivo de src/,
// fora dos testes, inclui, altera ou apaga preço. Ler o preço vigente continua permitido (preco.ts).
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const arquivos = globSync('src/**/*.{ts,tsx}', { cwd: raiz })
  .filter((a) => !/\.test\.tsx?$/.test(a))
  .sort();

// Drizzle (`.insert(precoModelo)`, `.update(...)`, `.delete(...)`) e SQL no template (`insert into preco_modelo`).
const GRAVA_PRECO = [/\.\s*(insert|update|delete)\s*\(\s*(schema\s*\.\s*)?precoModelo\b/, /\b(insert\s+into|update|delete\s+from)\s+"?preco_modelo"?\b/i];
const gravaPreco = (texto: string) => GRAVA_PRECO.some((re) => re.test(texto));

it('a varredura enxerga src/, inclusive quem lê o preço (falha se o glob quebrar)', () => {
  expect(arquivos).toEqual(expect.arrayContaining(['src/modules/agentes/preco.ts', 'src/app/api/agentes/route.ts', 'src/app/api/configuracao/teto/route.ts']));
  expect(readFileSync(`${raiz}src/modules/agentes/preco.ts`, 'utf8')).toContain('precoModelo');
});

it('o detector pega as formas de gravar preço e deixa passar a leitura', () => {
  expect(['tx.insert(precoModelo).values(p)', 'db.update(precoModelo).set(x)', 'db .delete( schema.precoModelo )', 'sql`insert into preco_modelo (modelo) values (${m})`', 'delete from "preco_modelo"'].every(gravaPreco)).toBe(
    true,
  );
  expect(['db.select().from(precoModelo)', 'select preco_entrada_por_milhao from preco_modelo', 'precoModeloVigente()'].some(gravaPreco)).toBe(false);
});

it('nenhum arquivo de src/ grava em preco_modelo (o preço entra só por scripts/)', () => {
  expect(arquivos.filter((a) => gravaPreco(readFileSync(`${raiz}${a}`, 'utf8')))).toEqual([]);
});
