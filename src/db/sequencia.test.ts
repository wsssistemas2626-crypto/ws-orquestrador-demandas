// Sequência global do id da demanda (RF-04, RNF-09, C-34), provada no Postgres real com o papel do app. Arquivo
// próprio, com banco só seu: o setval do migrator mexe no estado da sequência e não pode vazar para outro teste.
// Etapa 06-T05-testes (qa-automacao).
import type pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../test/banco';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

const proximo = async (cliente: pg.Pool | pg.PoolClient = b.poolApp) =>
  Number((await cliente.query(`select nextval('demanda_seq') as n`)).rows[0].n);

describe('demanda_seq: global, sem cache, de 1 a 9999 e sem recomeçar (RF-04, RNF-09)', () => {
  // Cada teste parte de um ponto conhecido, fixado pelo migrator; nenhum depende do que o anterior consumiu.
  const posicionar = (valor: number, chamado: boolean) => b.poolMigrator.query(`select setval('demanda_seq', $1, $2)`, [valor, chamado]);
  beforeEach(async () => {
    await posicionar(1, false);
  });

  it('o primeiro número é 1, e os seguintes vêm em ordem, sem pular', async () => {
    expect([await proximo(), await proximo(), await proximo()]).toEqual([1, 2, 3]);
  });

  it('duas conexões do app alternadas recebem números consecutivos (CACHE 1: nenhuma guarda um bloco)', async () => {
    const c1 = await b.poolApp.connect();
    const c2 = await b.poolApp.connect();
    try {
      const numeros = [await proximo(c1), await proximo(c2), await proximo(c1), await proximo(c2)];
      expect(numeros).toEqual([1, 2, 3, 4]);
    } finally {
      c1.release();
      c2.release();
    }
  });

  it('20 pedidos ao mesmo tempo recebem 20 números distintos, de 1 a 20', async () => {
    const numeros = await Promise.all(Array.from({ length: 20 }, () => proximo()));
    expect([...numeros].sort((x, y) => x - y)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('o número usado numa transação desfeita não volta: a sequência é global e não reinicia', async () => {
    const c = await b.poolApp.connect();
    try {
      await c.query('begin');
      expect(await proximo(c)).toBe(1);
      await c.query('rollback');
    } finally {
      c.release();
    }
    expect(await proximo()).toBe(2);
  });

  it('9999 ainda sai; o 10.000º pedido falha com 2200H e continua falhando (NO CYCLE: não volta a 1)', async () => {
    await posicionar(9998, true);
    expect(await proximo()).toBe(9999);
    await expect(proximo()).rejects.toMatchObject({ code: '2200H' });
    await expect(proximo()).rejects.toMatchObject({ code: '2200H' });
  });
});

describe('demanda_seq: o app só tem nextval (C-34)', () => {
  it.each([
    ['setval', `select setval('demanda_seq', 1)`],
    ['leitura direta da sequência', 'select last_value from demanda_seq'],
    ['alter sequence', 'alter sequence demanda_seq restart with 1'],
    ['drop sequence', 'drop sequence demanda_seq'],
  ])('%s é recusado com o papel do app (42501)', async (_caso, sql) => {
    await expect(b.poolApp.query(sql)).rejects.toMatchObject({ code: '42501' });
  });

  it('o catálogo confere: limites 1 e 9999, sem ciclo, cache 1, dona não é o app', async () => {
    const r = await b.poolMigrator.query(
      `select s.seqstart::int as inicio, s.seqmin::int as minimo, s.seqmax::int as maximo, s.seqcycle as ciclo, s.seqcache::int as cache, r.rolname <> 'orquestrador_app' as dona_outra
         from pg_sequence s join pg_class c on c.oid = s.seqrelid join pg_roles r on r.oid = c.relowner
        where c.relname = 'demanda_seq'`,
    );
    expect(r.rows).toEqual([{ inicio: 1, minimo: 1, maximo: 9999, ciclo: false, cache: 1, dona_outra: true }]);
  });
});
