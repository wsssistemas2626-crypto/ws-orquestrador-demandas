import { count } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { evento } from './schema';
import { comTransacao } from './transacao';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(async () => {
  await b.poolMigrator.query('truncate evento');
});

const linha = {
  ocorridoEm: new Date('2026-10-22T12:00:00Z'),
  atorTipo: 'sistema',
  atorId: 'sistema',
  entidade: 't',
  entidadeId: 'x',
  acao: 't',
} as const;

const total = async () => {
  const [r] = await b.db.select({ total: count() }).from(evento);
  return r?.total;
};

it('erro dentro da transação desfaz o Drizzle e o executor juntos', async () => {
  await expect(
    comTransacao(b.poolApp, async ({ tx, executor }) => {
      await tx.insert(evento).values(linha);
      await executor.executeSql(
        `insert into evento (ocorrido_em, ator_tipo, ator_id, entidade, entidade_id, acao) values ($1, 'sistema', 'sistema', 't', 'y', 't')`,
        [new Date('2026-10-22T12:00:01Z')],
      );
      throw new Error('desfaz');
    }),
  ).rejects.toThrow('desfaz');
  expect(await total()).toBe(0);
});

it('sem erro, grava o Drizzle e o executor juntos e devolve o resultado da função', async () => {
  const r = await comTransacao(b.poolApp, async ({ tx, executor }) => {
    await tx.insert(evento).values(linha);
    await executor.executeSql(
      `insert into evento (ocorrido_em, ator_tipo, ator_id, entidade, entidade_id, acao) values ($1, 'sistema', 'sistema', 't', 'y', 't')`,
      [new Date('2026-10-22T12:00:01Z')],
    );
    return 'ok';
  });
  expect(r).toBe('ok');
  expect(await total()).toBe(2);
});

// O pool tem 10 conexões: se a transação com erro não devolvesse a sua, a 11ª volta ficaria esperando até o timeout.
it('erro do banco dentro da transação desfaz e devolve a conexão ao pool', async () => {
  for (let i = 0; i < 12; i++) {
    await expect(
      comTransacao(b.poolApp, async ({ tx }) => {
        await tx.insert(evento).values(linha);
        await tx.insert(evento).values({ ...linha, atorTipo: 'invalido' as never });
      }),
    ).rejects.toThrow();
  }
  expect(await total()).toBe(0);
  expect(b.poolApp.waitingCount).toBe(0);
});

it('evento recusa ator_tipo fora da lista', async () => {
  await expect(b.db.insert(evento).values({ ...linha, atorTipo: 'outro' as never })).rejects.toMatchObject({
    cause: expect.objectContaining({ code: '23514' }),
  });
});

it('a conexão tem statement_timeout de 10 s', async () => {
  const r = await b.poolApp.query('show statement_timeout');
  expect(r.rows[0].statement_timeout).toBe('10s');
});
