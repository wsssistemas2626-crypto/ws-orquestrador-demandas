// T07: as três conferências do pg-boss 12.34.0 (T-02) contra a versão instalada, sobre o esquema que o migrator cria.
import type { PgBoss } from 'pg-boss';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { comTransacao } from '../db/transacao';
import { FILAS, criarFila, instalarFilas, type Fila } from './fila';

let b: BancoDeTeste;
let fila: Fila & { boss: PgBoss };
beforeAll(async () => {
  b = await novoBanco();
  fila = await criarFila(b.urlApp);
});
afterAll(async () => {
  await fila.parar();
  await b.fechar();
});
const jobs = async (nome: string) => (await b.poolMigrator.query(`select data from pgboss.job where name = $1`, [nome])).rows;
const enviarAgente = (chave: string) =>
  comTransacao(b.poolApp, ({ executor }) =>
    fila.enviar(executor, FILAS.agenteExecutar, { execucaoId: '00000000-0000-4000-8000-000000000001' }, { singletonKey: chave }),
  );

describe('pg-boss 12.34.0 sobre o esquema criado pelo migrator (T-02)', () => {
  it('o app sobe com migrate: false e não tem CREATE no esquema pgboss', async () => {
    const r = await b.poolMigrator.query(`select has_schema_privilege('orquestrador_app', 'pgboss', 'CREATE') as cria`);
    expect(r.rows[0].cria).toBe(false);
  });

  it('as quatro filas existem, criadas pelo migrator', async () => {
    const nomes = (await fila.boss.getQueues()).map((q) => q.name).sort();
    expect(nomes).toEqual(Object.values(FILAS).sort());
  });

  it('instalarFilas de novo, num banco já instalado, não falha nem duplica fila', async () => {
    await instalarFilas(b.urlMigrator);
    const r = await b.poolMigrator.query(`select name from pgboss.queue order by name`);
    expect(r.rows.map((x) => x.name)).toEqual(Object.values(FILAS).sort());
  });

  it('send com o executor da transação desfaz junto com ela (ADR-06)', async () => {
    await expect(
      comTransacao(b.poolApp, async ({ executor }) => {
        await fila.enviar(executor, FILAS.avisoDecPronto, { decId: 'DEC-DEM-20261022-0001-v1' }, { singletonKey: 'DEC-DEM-20261022-0001-v1' });
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    expect(await jobs(FILAS.avisoDecPronto)).toEqual([]);
    await comTransacao(b.poolApp, ({ executor }) =>
      fila.enviar(executor, FILAS.avisoDecPronto, { decId: 'DEC-DEM-20261022-0001-v1' }, { singletonKey: 'DEC-DEM-20261022-0001-v1' }),
    );
    expect(await jobs(FILAS.avisoDecPronto)).toEqual([{ data: { decId: 'DEC-DEM-20261022-0001-v1' } }]);
  });

  it('singletonKey repetida é descartada; a da próxima tentativa entra (ADR-07)', async () => {
    expect(await enviarAgente('risco:esp:ESP-DEM-20261022-0001-v1:t1')).not.toBeNull();
    expect(await enviarAgente('risco:esp:ESP-DEM-20261022-0001-v1:t1')).toBeNull();
    expect(await enviarAgente('risco:esp:ESP-DEM-20261022-0001-v1:t2')).not.toBeNull();
  });

  // Na política padrão do pg-boss 12.34.0 a singletonKey sozinha não descarta nada, e na `singleton` também não (visto
  // falhando nesta etapa); por isso agente.executar nasce `stately`. Os dois testes abaixo fixam o que ela garante.
  it('agente.executar usa a política stately; as outras filas, a padrão', async () => {
    expect((await fila.boss.getQueue(FILAS.agenteExecutar))?.policy).toBe('stately');
    for (const nome of [FILAS.avisoDecPronto, FILAS.retencaoExpurgo, FILAS.workerBatimento]) {
      expect((await fila.boss.getQueue(nome))?.policy, nome).toBe('standard');
    }
  });

  it('stately: chaves diferentes ficam ativas ao mesmo tempo, e com a chave já ativa entra no máximo mais uma na fila', async () => {
    const a = await enviarAgente('insumo_tecnico:dem:DEM-20261022-0002:t1');
    const c = await enviarAgente('consolidacao:dem:DEM-20261022-0002:t1');
    expect(a).not.toBeNull();
    expect(c).not.toBeNull();
    const pegos = (await fila.boss.fetch(FILAS.agenteExecutar, { batchSize: 10 })).map((j) => j.id);
    expect(pegos).toEqual(expect.arrayContaining([a, c]));
    const estados = await b.poolMigrator.query(`select state from pgboss.job where id = any($1::uuid[])`, [[a, c]]);
    expect(estados.rows.map((r) => r.state)).toEqual(['active', 'active']);
    // A garantia de execução única depois que o job sai da fila é a reivindicação da execução (T27, ADR-07).
    expect(await enviarAgente('insumo_tecnico:dem:DEM-20261022-0002:t1')).not.toBeNull();
    expect(await enviarAgente('insumo_tecnico:dem:DEM-20261022-0002:t1')).toBeNull();
  });

  it('payload fora do formato da fila é recusado antes de ir ao banco (C-22)', async () => {
    await expect(
      comTransacao(b.poolApp, ({ executor }) =>
        fila.enviar(executor, FILAS.agenteExecutar, { execucaoId: 'x', texto: 'nao pode' } as never),
      ),
    ).rejects.toThrow();
    await expect(
      comTransacao(b.poolApp, ({ executor }) =>
        fila.enviar(executor, FILAS.agenteExecutar, { execucaoId: '00000000-0000-4000-8000-000000000002', texto: 'SENTINELA-TEXTO' } as never),
      ),
    ).rejects.toThrow();
    const r = await b.poolMigrator.query(`select count(*)::int as n from pgboss.job where data::text like '%SENTINELA-TEXTO%'`);
    expect(r.rows[0].n).toBe(0);
  });

  it('um worker com o papel do app processa o job', async () => {
    const vistos: string[] = [];
    await fila.boss.work(FILAS.avisoDecPronto, async ([job]) => {
      vistos.push((job!.data as { decId: string }).decId);
    });
    await expect.poll(() => vistos, { timeout: 10_000 }).toContain('DEC-DEM-20261022-0001-v1');
  });
});
