import { count, sql } from 'drizzle-orm';
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

// Testes da etapa 06-T04-testes (qa-automacao).

it('o Drizzle e o executor da transação usam a mesma conexão (ADR-06: o job enfileirado desfaz junto)', async () => {
  const pids = await comTransacao(b.poolApp, async ({ tx, executor }) => {
    const peloDrizzle = await tx.execute(sql`select pg_backend_pid() as pid`);
    const peloExecutor = await executor.executeSql('select pg_backend_pid() as pid');
    return [peloDrizzle.rows[0]?.pid, (peloExecutor.rows[0] as { pid: number }).pid];
  });
  expect(pids[0]).toBeTypeOf('number');
  expect(pids[0]).toBe(pids[1]);
});

it('antes do commit, o que a transação gravou não aparece para outra conexão', async () => {
  let vistoDeFora: number | undefined;
  await comTransacao(b.poolApp, async ({ tx }) => {
    await tx.insert(evento).values(linha);
    const r = await b.poolMigrator.query('select count(*)::int as n from evento');
    vistoDeFora = r.rows[0].n;
  });
  expect(vistoDeFora).toBe(0);
  expect(await total()).toBe(1);
});

it('o erro da função sai como veio, sem embrulho, e nada fica gravado', async () => {
  const erro = new Error('erro de regra ficticio');
  await expect(
    comTransacao(b.poolApp, async ({ tx }) => {
      await tx.insert(evento).values(linha);
      throw erro;
    }),
  ).rejects.toBe(erro);
  expect(await total()).toBe(0);
});

it('dentro da transação, o papel do app também não altera evento (CA-21.2) e a inclusão anterior é desfeita', async () => {
  const falha = await comTransacao(b.poolApp, async ({ tx, executor }) => {
    await tx.insert(evento).values(linha);
    await executor.executeSql('update evento set acao = $1', ['alterada']);
  }).then(
    () => null,
    (e: { code?: string }) => e,
  );
  expect(falha?.code).toBe('42501');
  expect(await total()).toBe(0);
});

// Se o rollback não rodasse, a conexão voltaria ao pool presa numa transação abortada, e a próxima transação nela
// falharia (25P02). As 10 chamadas pedem conexão no mesmo instante, então cada uma pega uma conexão diferente do pool
// de 10: todas as conexões passam pelo erro e, depois, todas gravam.
it('depois de 10 transações com erro ao mesmo tempo, 10 transações seguintes gravam em todas as conexões', async () => {
  const comErro = await Promise.allSettled(
    Array.from({ length: 10 }, () =>
      comTransacao(b.poolApp, async ({ tx }) => {
        await tx.insert(evento).values(linha);
        await tx.insert(evento).values({ ...linha, atorTipo: 'invalido' as never });
      }),
    ),
  );
  expect(comErro.every((r) => r.status === 'rejected')).toBe(true);
  expect(b.poolApp.totalCount).toBe(10);
  const pids = await Promise.all(
    Array.from({ length: 10 }, () =>
      comTransacao(b.poolApp, async ({ tx, executor }) => {
        await tx.insert(evento).values(linha);
        return (await executor.executeSql('select pg_backend_pid() as pid')).rows[0] as { pid: number };
      }),
    ),
  );
  expect(new Set(pids.map((p) => p.pid)).size).toBe(10);
  expect(await total()).toBe(10);
});

// Etapa 06-T05-construcao (parecer 2 da 06-T04-tech-lead.md): o banco derruba a conexão no meio da transação. A
// conexão emprestada não tem o ouvinte de erro do pool; sem um ouvinte próprio, o 'error' do cliente derrubaria o
// processo. O rollback falha, e a conexão morta não pode voltar ao pool. A transação mata a própria conexão, para o
// erro chegar na consulta ativa (06-T04-qa-automacao.md, Decisões tomadas).
it('conexão derrubada no meio da transação: o erro sai, o processo segue, a conexão morta sai do pool e a próxima transação grava', async () => {
  let pidMorto: number | undefined;
  const falha = await comTransacao(b.poolApp, async ({ tx, executor }) => {
    await tx.insert(evento).values(linha);
    pidMorto = ((await executor.executeSql('select pg_backend_pid() as pid')).rows[0] as { pid: number }).pid;
    await executor.executeSql('select pg_terminate_backend(pg_backend_pid())');
    await executor.executeSql('select 1');
  }).then(
    () => null,
    (e: unknown) => e,
  );
  expect(falha).toBeInstanceOf(Error);
  expect(pidMorto).toBeTypeOf('number');
  const pids = await Promise.all(
    Array.from({ length: 10 }, () =>
      comTransacao(b.poolApp, async ({ tx, executor }) => {
        await tx.insert(evento).values(linha);
        return ((await executor.executeSql('select pg_backend_pid() as pid')).rows[0] as { pid: number }).pid;
      }),
    ),
  );
  expect(pids).not.toContain(pidMorto);
  expect(b.poolApp.totalCount).toBeLessThanOrEqual(10);
  expect(await total()).toBe(10);
});
