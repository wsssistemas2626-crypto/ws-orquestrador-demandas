// test/estatico/migration-0007.test.ts — RNF-06 e IN-17: uma migration nova, gerada, só aditiva.
// T01 do pedido DEC-DEM-20261111-0016-v1.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const diario = JSON.parse(readFileSync(`${raiz}drizzle/meta/_journal.json`, 'utf8')) as { entries: { idx: number; tag: string }[] };

// T01 do DEC-DEM-20261111-0017-v1 (G5): a 0008 e a 0009 vieram depois; a 0007 é lida pelo índice, não como a última.
it('a 0007 está no índice 7 do diário', () => {
  expect(diario.entries.find((e) => e.idx === 7)?.tag).toBe('0007_greedy_wendigo');
});

it('a 0007 não apaga, renomeia, reescreve nem troca tipo de nada', () => {
  const tag = diario.entries.find((e) => e.idx === 7)!.tag;
  const sql = readFileSync(`${raiz}drizzle/${tag}.sql`, 'utf8');
  for (const proibido of [/\bupdate\s+"/i, /\bdelete\s+from\b/i, /\bdrop\s+column\b/i, /\bdrop\s+table\b/i, /\brename\b/i, /\bset\s+data\s+type\b/i, /\btruncate\b/i, /\bgrant\b/i])
    expect(sql, String(proibido)).not.toMatch(proibido);
  for (const esperado of ['token_servico_dono_check', 'token_servico_integracao_check', 'evento_ator_integracao_check', 'demanda_autor_integracao_check', 'evento_acao_entidade_idx'])
    expect(sql).toContain(esperado);
});
