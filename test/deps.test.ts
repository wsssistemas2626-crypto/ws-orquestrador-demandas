import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { comTransacao } from '../src/db/transacao';
import { relogioFixo } from '../src/lib/relogio';
import { CONFIG_TESTE } from './auth';
import { novoBanco, type BancoDeTeste } from './banco';
import { criarDepsDeTeste } from './deps';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

describe('criarDepsDeTeste', () => {
  it('monta Deps reais sobre o banco do teste, com o relógio dado', async () => {
    const relogio = relogioFixo('2026-10-22T12:00:00Z');
    const deps = await criarDepsDeTeste(b, { relogio });
    try {
      expect(deps.relogio).toBe(relogio);
      expect(deps.pool).toBe(b.poolApp);
      expect(deps.db).toBe(b.db);
      expect(deps.config).toEqual({ ...CONFIG_TESTE, databaseUrl: b.urlApp });
      expect(deps.auth.options.baseURL).toBe(CONFIG_TESTE.urlBase);
      const id = await comTransacao(deps.pool, (t) => deps.fila.enviar(t.executor, 'aviso.dec-pronto', { decId: 'DEC-DEM-20261022-0001-v1' }));
      expect(id).toEqual(expect.any(String));
      const r = await b.db.execute(sql`select count(*)::int as n from pgboss.job where name = 'aviso.dec-pronto'`);
      expect(r.rows[0]).toEqual({ n: 1 });
    } finally {
      await deps.fila.parar();
    }
  });

  it('sem relógio dado, usa um relógio fixo (nunca o real)', async () => {
    const deps = await criarDepsDeTeste(b);
    try {
      expect(deps.relogio.agora().toISOString()).toBe('2026-10-22T12:00:00.000Z');
    } finally {
      await deps.fila.parar();
    }
  });
});
