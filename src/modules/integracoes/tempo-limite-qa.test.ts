// QA da T04 (IN-14, ADR-28, D-03): o orçamento de tempo junto com o limite do awave, como a T06 vai usar
// (executarComOrcamento sem `t` de fora e conferirLimite dentro do corpo). Postgres real, papel do app, relógio fixo.
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarPool } from '../../db';
import { comTransacao } from '../../db/transacao';
import { ErroDominio, mapearErro } from '../../lib/erros';
import { relogioFixo } from '../../lib/relogio';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { atorDeIntegracao, inserirDemandaDeIntegracao } from '../../../test/integracoes';
import type { Ator } from '../acesso/ator';
import { registrarEvento } from '../historico/registrar';
import { conferirLimite, MENSAGEM_LIMITE_AWAVE } from '../limites';
import { executarComOrcamento, MENSAGEM_INDISPONIVEL } from './tempo-limite';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

const awave = atorDeIntegracao('awave');
const CHAVE_AWAVE = 'limite:demanda:integracao:awave';
const pessoa: Ator = { tipo: 'pessoa', usuarioId: 'u-qa-t04', nome: 'Pessoa Ficticia', papel: 'cto' };
const erroDe = (p: Promise<unknown>) => p.then(() => 'passou' as const).catch((x: unknown) => x);

async function contarEventos(entidadeId: string): Promise<number> {
  const r = await b.poolMigrator.query<{ n: number }>('select count(*)::int as n from evento where entidade_id = $1', [entidadeId]);
  return r.rows[0]?.n ?? -1;
}
const evento = (entidadeId: string) => ({ ator: awave, entidade: 'demanda', entidadeId, acao: 'demanda_criada' as const });

describe('IN-14 com o limite do awave dentro do orçamento', () => {
  it('trava do limite segura por outra conexão: conferirLimite desiste pelo lock_timeout, 503 fixo, e o evento gravado antes some', async () => {
    const relogio = relogioFixo('2026-11-11T12:00:00Z');
    const segura = await b.poolMigrator.connect();
    let e: unknown;
    try {
      await segura.query('select pg_advisory_lock(hashtextextended($1, 0))', [CHAVE_AWAVE]);
      e = await erroDe(
        executarComOrcamento(b.poolApp, awave, 'padrao', undefined, async (t) => {
          await registrarEvento(t.tx, evento('DEM-20261111-0901'), relogio);
          await conferirLimite(t.tx, awave, 'demanda', relogio);
          return 'passou';
        }),
      );
    } finally {
      await segura.query('select pg_advisory_unlock(hashtextextended($1, 0))', [CHAVE_AWAVE]);
      segura.release();
    }
    expect(e).toBeInstanceOf(ErroDominio);
    expect(mapearErro(e)).toEqual({ status: 503, corpo: { erro: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL } });
    expect(await contarEventos('DEM-20261111-0901')).toBe(0);
  });

  it('a 11ª do awave dentro do orçamento continua 429 (não vira 503) e desfaz o que o corpo gravou antes', async () => {
    const relogio = relogioFixo('2026-11-12T12:00:00Z');
    for (let n = 1; n <= 10; n++) await inserirDemandaDeIntegracao(b, { id: `DEM-20261112-${String(n).padStart(4, '0')}`, criadaEm: new Date('2026-11-12T11:30:00Z') });
    const e = await erroDe(
      executarComOrcamento(b.poolApp, awave, 'padrao', undefined, async (t) => {
        await registrarEvento(t.tx, evento('DEM-20261112-0902'), relogio);
        await conferirLimite(t.tx, awave, 'demanda', relogio);
        return 'passou';
      }),
    );
    expect(e).toBeInstanceOf(ErroDominio);
    expect(mapearErro(e)).toEqual({ status: 429, corpo: { erro: 'limite_excedido', mensagem: MENSAGEM_LIMITE_AWAVE } });
    expect(await contarEventos('DEM-20261112-0902')).toBe(0);
  });

  it('dentro do orçamento e com a janela livre, o awave confere, grava e devolve o valor', async () => {
    const relogio = relogioFixo('2026-11-13T12:00:00Z');
    const r = await executarComOrcamento(b.poolApp, awave, 'padrao', undefined, async (t) => {
      await conferirLimite(t.tx, awave, 'demanda', relogio);
      await registrarEvento(t.tx, evento('DEM-20261113-0903'), relogio);
      return 'gravou';
    });
    expect(r).toBe('gravou');
    expect(await contarEventos('DEM-20261113-0903')).toBe(1);
  });
});

describe('IN-14: o SET LOCAL não vaza para a próxima transação, nem depois de falha', () => {
  it('depois do 503 da integração, a mesma conexão volta com lock_timeout 0 e statement_timeout 10s para a pessoa', async () => {
    const pool = criarPool(b.urlApp, { max: 1 });
    const segura = await b.poolMigrator.connect();
    try {
      await segura.query('select pg_advisory_lock(hashtextextended($1, 0))', ['qa:t04:vazamento']);
      const e = await erroDe(
        executarComOrcamento(pool, awave, 'entrega', undefined, async (t) => {
          await t.tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${'qa:t04:vazamento'}, 0))`);
          return 'passou';
        }),
      );
      expect(e).toMatchObject({ codigo: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
      const a = await executarComOrcamento(pool, pessoa, 'padrao', undefined, async (t) => {
        const r = await t.tx.execute<{ lock: string; stmt: string }>(
          sql`select current_setting('lock_timeout') as lock, current_setting('statement_timeout') as stmt`,
        );
        return r.rows[0];
      });
      expect(a).toEqual({ lock: '0', stmt: '10s' });
    } finally {
      await segura.query('select pg_advisory_unlock(hashtextextended($1, 0))', ['qa:t04:vazamento']);
      segura.release();
      await pool.end();
    }
  });
});

describe('IN-14: tradução uma vez só, por quem abriu a transação', () => {
  const tempoEsgotado = () => Object.assign(new Error('mensagem do banco (fictício)'), { code: '55P03' });

  it('com `t` de quem chama, o 55P03 do corpo passa cru; quem abriu a transação é quem traduz', async () => {
    const cru = await erroDe(
      comTransacao(b.poolApp, (t) =>
        executarComOrcamento(b.poolApp, awave, 'padrao', t, async () => {
          throw tempoEsgotado();
        }),
      ),
    );
    expect(cru).not.toBeInstanceOf(ErroDominio);
    expect(cru).toMatchObject({ code: '55P03' });

    const traduzido = await erroDe(
      executarComOrcamento(b.poolApp, awave, 'padrao', undefined, (t) =>
        executarComOrcamento(b.poolApp, awave, 'padrao', t, async () => {
          throw tempoEsgotado();
        }),
      ),
    );
    expect(traduzido).toBeInstanceOf(ErroDominio);
    expect(traduzido).toMatchObject({ codigo: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL, extras: {} });
  });

  it('a mensagem do 503 não leva texto do Postgres, do Drizzle nem dado do pedido', () => {
    expect(MENSAGEM_INDISPONIVEL).not.toMatch(/lock|timeout|statement|cancel|55P03|57014|DEM-|DEC-|wsod_|awave|construir/i);
    expect(new ErroDominio('indisponivel', MENSAGEM_INDISPONIVEL).message).toBe('indisponivel');
  });
});
