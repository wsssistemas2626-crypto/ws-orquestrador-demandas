// DEC-DEM-20261112-0019-v1, 03-correcao, M-3: prazo total opcional da transação, que conta a espera pela conexão, cada
// instrução e o COMMIT. Sem prazo, nada muda. Postgres real, papel do app, prazos curtos passados direto a comTransacao
// (a suíte não espera os 8 s da integração) ou relógio monotônico falso, injetado. Dados fictícios.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { count, sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { criarPool, type Db } from './index';
import { evento } from './schema';
import { comTransacao, PrazoDaTransacaoEsgotado } from './transacao';

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
  ocorridoEm: new Date('2026-11-12T12:00:00Z'),
  atorTipo: 'sistema',
  atorId: 'sistema',
  entidade: 't',
  entidadeId: 'prazo-0019',
  acao: 't',
} as const;

const total = async () => {
  const [r] = await b.db.select({ total: count() }).from(evento);
  return r?.total;
};

type Ajustes = { stmt: string; lock: string };
const ajustes = async (tx: Db): Promise<Ajustes> =>
  (await tx.execute<Ajustes>(sql`select current_setting('statement_timeout') as stmt, current_setting('lock_timeout') as lock`)).rows[0]!;

async function erroDe(p: Promise<unknown>): Promise<unknown> {
  return p.then(
    () => undefined,
    (e: unknown) => e,
  );
}

describe('M-3: prazo total com Postgres real', () => {
  it('prazo de 400 ms e três pg_sleep(0.2): PrazoDaTransacaoEsgotado em menos de ~600 ms, nada gravado, conexão devolvida e limpa', async () => {
    const pool = criarPool(b.urlApp, { max: 1 });
    try {
      const inicio = performance.now();
      const e = await erroDe(
        comTransacao(
          pool,
          async ({ tx }) => {
            for (let i = 0; i < 3; i++) await tx.execute(sql`select pg_sleep(0.2)`);
            await tx.insert(evento).values(linha);
          },
          { prazoMs: 400 },
        ),
      );
      const decorrido = performance.now() - inicio;
      expect(e).toBeInstanceOf(PrazoDaTransacaoEsgotado);
      expect(decorrido).toBeLessThan(650);
      expect(await total()).toBe(0);
      expect(pool.waitingCount).toBe(0);
      expect(pool.idleCount).toBe(pool.totalCount);
      // A mesma conexão volta sem os tempos-limite da transação (set_config local).
      const depois = await pool.query<Ajustes>("select current_setting('statement_timeout') as stmt, current_setting('lock_timeout') as lock");
      expect(depois.rows[0]).toEqual({ stmt: '10s', lock: '0' });
    } finally {
      await pool.end();
    }
  });

  it('pool de uma conexão, segura por outra chamada: a espera conta no prazo, rejeita dentro dele, e o pool não vaza', async () => {
    const pool = criarPool(b.urlApp, { max: 1 });
    const segura = await pool.connect();
    try {
      const inicio = performance.now();
      const e = await erroDe(comTransacao(pool, async ({ tx }) => tx.insert(evento).values(linha), { prazoMs: 300 }));
      const decorrido = performance.now() - inicio;
      expect(e).toBeInstanceOf(PrazoDaTransacaoEsgotado);
      expect(decorrido).toBeGreaterThanOrEqual(250);
      expect(decorrido).toBeLessThan(1_000);
    } finally {
      segura.release();
    }
    // A conexão que chega depois do prazo é devolvida ao pool por quem desistiu.
    for (let i = 0; i < 50 && pool.waitingCount > 0; i++) await new Promise((r) => setTimeout(r, 10));
    expect(pool.waitingCount).toBe(0);
    try {
      expect(await comTransacao(pool, async () => 'atendida')).toBe('atendida');
      expect(await total()).toBe(0);
    } finally {
      await pool.end();
    }
  });

  it('sem prazo, nada muda: a mesma carga lenta termina e grava', async () => {
    const r = await comTransacao(b.poolApp, async ({ tx }) => {
      for (let i = 0; i < 3; i++) await tx.execute(sql`select pg_sleep(0.2)`);
      await tx.insert(evento).values(linha);
      return ajustes(tx);
    });
    expect(r).toEqual({ stmt: '10s', lock: '0' });
    expect(await total()).toBe(1);
  });
});

describe('M-3: prazo total com relógio falso', () => {
  it('antes do COMMIT: prazo vencido depois da última instrução desfaz tudo', async () => {
    let agora = 0;
    const e = await erroDe(
      comTransacao(
        b.poolApp,
        async ({ tx }) => {
          await tx.insert(evento).values(linha);
          agora = 2_000;
        },
        { prazoMs: 1_000, agora: () => agora },
      ),
    );
    expect(e).toBeInstanceOf(PrazoDaTransacaoEsgotado);
    expect(await total()).toBe(0);
  });

  it('antes de cada instrução: prazo vencido não deixa a instrução sair, pelo Drizzle e pelo executor', async () => {
    for (const pelo of ['drizzle', 'executor'] as const) {
      let agora = 0;
      const e = await erroDe(
        comTransacao(
          b.poolApp,
          async ({ tx, executor }) => {
            await tx.insert(evento).values(linha);
            agora = 2_000;
            if (pelo === 'drizzle') await tx.insert(evento).values(linha);
            else await executor.executeSql(`insert into evento (ocorrido_em, ator_tipo, ator_id, entidade, entidade_id, acao) values ($1, 'sistema', 'sistema', 't', 'y', 't')`, [new Date()]);
          },
          { prazoMs: 1_000, agora: () => agora },
        ),
      );
      expect(e, pelo).toBeInstanceOf(PrazoDaTransacaoEsgotado);
      expect(await total(), pelo).toBe(0);
    }
  });

  it('o piso vale enquanto o restante for maior; abaixo dele, statement_timeout e lock_timeout viram o restante (por parâmetro)', async () => {
    let agora = 0;
    const r = await comTransacao(
      b.poolApp,
      async ({ tx }) => {
        const longe = await ajustes(tx);
        agora = 7_000;
        const perto = await ajustes(tx);
        agora = 7_500;
        const mais = await ajustes(tx);
        return { longe, perto, mais };
      },
      { prazoMs: 8_000, piso: { statementMs: 5_000, lockMs: 2_000 }, agora: () => agora },
    );
    // Longe do fim, o que estava em vigor (aqui, o do pool; na integração, o SET LOCAL de limitarTempo).
    expect(r.longe).toEqual({ stmt: '10s', lock: '0' });
    // 1 s restando: abaixo dos dois pisos.
    expect(r.perto).toEqual({ stmt: '1s', lock: '1s' });
    expect(r.mais).toEqual({ stmt: '500ms', lock: '500ms' });
  });

  it('o piso não sobe: com 3 s restando, o lock_timeout de 2 s fica, e só o statement_timeout desce', async () => {
    let agora = 0;
    const r = await comTransacao(
      b.poolApp,
      async ({ tx }) => {
        await tx.execute(sql`set local lock_timeout = '2s'`);
        await tx.execute(sql`set local statement_timeout = '5s'`);
        agora = 5_000;
        return ajustes(tx);
      },
      { prazoMs: 8_000, piso: { statementMs: 5_000, lockMs: 2_000 }, agora: () => agora },
    );
    expect(r).toEqual({ stmt: '3s', lock: '2s' });
  });

  it('o erro da função sai como veio quando o prazo não tem nada com ele', async () => {
    const erro = new Error('erro de regra ficticio');
    const e = await erroDe(
      comTransacao(
        b.poolApp,
        async () => {
          throw erro;
        },
        { prazoMs: 5_000 },
      ),
    );
    expect(e).toBe(erro);
  });
});

describe('M-3: estático', () => {
  const fonte = readFileSync(fileURLToPath(new URL('./transacao.ts', import.meta.url)), 'utf8');

  it('o set_config leva os valores por parâmetro, nunca interpolados (G3.6)', () => {
    expect(fonte).toContain("select set_config('statement_timeout', $1, true), set_config('lock_timeout', $2, true)");
    expect(fonte).not.toMatch(/set_config\([^)]*\$\{/);
  });

  it('o relógio padrão é monotônico', () => {
    expect(fonte).toMatch(/performance\.now\(\)/);
  });
});
