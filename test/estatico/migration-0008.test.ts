// test/estatico/migration-0008.test.ts — RNF-05 e AN-10: duas migrations novas, só aditivas; a custom só com o GRANT.
// T01 do pedido DEC-DEM-20261111-0017-v1.
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

// T03 do DEC-DEM-20261111-0018-v1 (G5): com a 0010, a 0008 e a 0009 deixam de ser as últimas; a ordem delas no diário
// segue conferida pelo índice. A 0010 tem a guarda própria em migration-0010.test.ts.
it('a 0008 e a 0009 estão nos índices 8 e 9 do diário; a 0009 é a custom de nome rls_andamento_construcao', () => {
  expect(diario.entries.find((e) => e.idx === 8)?.tag).toBe('0008_slippery_whirlwind');
  expect(diario.entries.find((e) => e.idx === 9)?.tag).toBe('0009_rls_andamento_construcao');
});

it('a 0008 só cria a tabela, os CHECKs, as FKs sem cascata e os índices', () => {
  const sql = sqlDa(8);
  for (const proibido of [
    /\bupdate\s+"/i,
    /\bdelete\s+from\b/i,
    /\bdrop\b/i,
    /\brename\b/i,
    /\bset\s+data\s+type\b/i,
    /\btruncate\b/i,
    /\bgrant\b/i,
    /on delete cascade/i,
    /alter table "(demanda|evento)"/i,
  ])
    expect(sql, String(proibido)).not.toMatch(proibido);
  expect(sql).toContain('CREATE TABLE "andamento_construcao"');
  for (const nome of [
    'andamento_construcao_fase_check',
    'andamento_construcao_status_construcao_check',
    'andamento_construcao_tarefas_check',
    'andamento_construcao_dec_id_check',
    'andamento_construcao_ator_token_prefixo_check',
    'andamento_construcao_demanda_id_idx',
    'andamento_construcao_dec_gravado_idx',
    'andamento_construcao_gravado_idx',
  ])
    expect(sql).toContain(nome);
});

it('a 0009 é só o GRANT SELECT, INSERT na tabela nova: sem sequência, UPDATE nem DELETE', () => {
  expect(comandos(sqlDa(9))).toEqual(['GRANT SELECT, INSERT ON "andamento_construcao" TO orquestrador_app;']);
});
