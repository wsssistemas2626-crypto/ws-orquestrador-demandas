// ADR-28 e IN-14 (T04): o servidor desiste antes do cliente (Awave 10 s, /construir 15 s) e nada fica gravado. Só a
// integração recebe o SET LOCAL, e só na transação que o serviço abre. Postgres real, papel do app, relógio fixo.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarPool, type Db } from '../../db';
import { comTransacao } from '../../db/transacao';
import { ErroDominio, mapearErro } from '../../lib/erros';
import { relogioFixo } from '../../lib/relogio';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { atorDeIntegracao } from '../../../test/integracoes';
import type { Ator } from '../acesso/ator';
import { registrarEvento } from '../historico/registrar';
import { executarComOrcamento, limitarTempo, MENSAGEM_INDISPONIVEL, traduzirTempoEsgotado } from './tempo-limite';

let b: BancoDeTeste;
const relogio = relogioFixo('2026-11-11T12:00:00Z');
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

type Ajustes = { lock: string; stmt: string; origem: string };
async function ajustes(tx: Db): Promise<Ajustes> {
  const r = await tx.execute<Ajustes>(
    sql`select current_setting('lock_timeout') as lock, current_setting('statement_timeout') as stmt, (select source from pg_settings where name = 'statement_timeout') as origem`,
  );
  return r.rows[0]!;
}

const pessoa: Ator = { tipo: 'pessoa', usuarioId: 'u1', nome: 'Pessoa Ficticia', papel: 'cto' };
const agente: Ator = { tipo: 'agente', agente: 'orquestrador', prefixoToken: 'ficticio' };
const sistema: Ator = { tipo: 'sistema' };

async function contarEventos(entidadeId: string): Promise<number> {
  const r = await b.poolMigrator.query<{ n: number }>('select count(*)::int as n from evento where entidade_id = $1', [entidadeId]);
  return r.rows[0]?.n ?? -1;
}

const eventoDoAwave = (entidadeId: string) => ({ ator: atorDeIntegracao('awave'), entidade: 'demanda', entidadeId, acao: 'demanda_criada' as const });

describe('ADR-28: o orçamento de tempo só vale para integração', () => {
  it('D-03: a mensagem do 503 é fixa', () => {
    expect(MENSAGEM_INDISPONIVEL).toBe('O Orquestrador não concluiu o pedido a tempo e nada foi gravado. Tente de novo em alguns minutos.');
  });

  it.each([
    ['awave', 'padrao', '5s'],
    ['awave', 'entrega', '10s'],
    ['construir', 'padrao', '5s'],
    ['construir', 'entrega', '10s'],
  ] as const)('integração %s, orçamento %s: lock_timeout 2s e statement_timeout %s, postos na transação', async (integracao, orcamento, stmt) => {
    const a = await executarComOrcamento(b.poolApp, atorDeIntegracao(integracao), orcamento, undefined, (t) => ajustes(t.tx));
    expect(a).toEqual({ lock: '2s', stmt, origem: 'session' });
  });

  it('pessoa, agente e sistema: nada muda (lock_timeout 0 e o statement_timeout do pool, 10 s)', async () => {
    const fora = await b.poolApp.query<{ lock: string; stmt: string }>("select current_setting('lock_timeout') as lock, current_setting('statement_timeout') as stmt");
    expect(fora.rows[0]).toEqual({ lock: '0', stmt: '10s' });
    for (const ator of [pessoa, agente, sistema]) {
      const a = await executarComOrcamento(b.poolApp, ator, 'padrao', undefined, (t) => ajustes(t.tx));
      expect(a, ator.tipo).toEqual({ lock: '0', stmt: '10s', origem: 'client' });
      const e = await executarComOrcamento(b.poolApp, ator, 'entrega', undefined, (t) => ajustes(t.tx));
      expect(e, ator.tipo).toEqual({ lock: '0', stmt: '10s', origem: 'client' });
    }
  });

  it('o SET LOCAL termina com a transação: a próxima, na mesma conexão, volta ao de antes', async () => {
    const pool = criarPool(b.urlApp, { max: 1 });
    try {
      await executarComOrcamento(pool, atorDeIntegracao('awave'), 'padrao', undefined, async () => undefined);
      const depois = await pool.query<{ lock: string; stmt: string }>("select current_setting('lock_timeout') as lock, current_setting('statement_timeout') as stmt");
      expect(depois.rows[0]).toEqual({ lock: '0', stmt: '10s' });
    } finally {
      await pool.end();
    }
  });

  it('com a transação de quem chama, não aplica SET LOCAL e usa a mesma transação', async () => {
    await comTransacao(b.poolApp, async (t) => {
      const a = await executarComOrcamento(b.poolApp, atorDeIntegracao('awave'), 'padrao', t, async (t2) => {
        expect(t2).toBe(t);
        return ajustes(t2.tx);
      });
      expect(a).toEqual({ lock: '0', stmt: '10s', origem: 'client' });
    });
  });

  it('o corpo que termina bem é gravado e o valor dele volta', async () => {
    const r = await executarComOrcamento(b.poolApp, atorDeIntegracao('awave'), 'padrao', undefined, async (t) => {
      await registrarEvento(t.tx, eventoDoAwave('DEM-20261111-0801'), relogio);
      return 'feito';
    });
    expect(r).toBe('feito');
    expect(await contarEventos('DEM-20261111-0801')).toBe(1);
  });

  it('tipo de ator desconhecido, montado à mão, lança antes de qualquer SET', async () => {
    await expect(
      comTransacao(b.poolApp, (t) => limitarTempo(t.tx, { tipo: 'robo' } as unknown as Ator, 'padrao')),
    ).rejects.toThrow(/ator desconhecido/);
  });
});

describe('IN-14: tempo esgotado vira 503 fixo e nada fica gravado', () => {
  it('trava segura por outra conexão: em ~2 s, ErroDominio indisponivel; 503 sem texto do Postgres; o INSERT anterior desfeito', async () => {
    const chave = 'limite:demanda:integracao:awave';
    const segura = await b.poolMigrator.connect();
    let e: unknown;
    try {
      await segura.query('select pg_advisory_lock(hashtextextended($1, 0))', [chave]);
      e = await executarComOrcamento(b.poolApp, atorDeIntegracao('awave'), 'padrao', undefined, async (t) => {
        await registrarEvento(t.tx, eventoDoAwave('DEM-20261111-0802'), relogio);
        await t.tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${chave}, 0))`);
        return 'passou';
      }).catch((x: unknown) => x);
    } finally {
      await segura.query('select pg_advisory_unlock(hashtextextended($1, 0))', [chave]);
      segura.release();
    }
    expect(e).toBeInstanceOf(ErroDominio);
    expect(e).toMatchObject({ codigo: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
    const { status, corpo } = mapearErro(e);
    expect(status).toBe(503);
    expect(corpo).toEqual({ erro: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
    // Nem a mensagem do erro leva texto do Postgres (o `message` do ErroDominio é só o código).
    expect((e as Error).message).toBe('indisponivel');
    expect(JSON.stringify(corpo)).not.toMatch(/lock|timeout|cancel|advisory|55P03|DEM-20261111-0802/i);
    expect(await contarEventos('DEM-20261111-0802')).toBe(0);
  });

  it('statement_timeout esgotado de verdade (57014 do Postgres, embrulhado pelo Drizzle) também vira indisponivel, sem gravar', async () => {
    const e = await executarComOrcamento(b.poolApp, atorDeIntegracao('construir'), 'entrega', undefined, async (t) => {
      await registrarEvento(t.tx, { ...eventoDoAwave('DEM-20261111-0803'), ator: atorDeIntegracao('construir') }, relogio);
      // Encurta só nesta transação, para o teste não esperar os 10 s do orçamento.
      await t.tx.execute(sql`set local statement_timeout = '50ms'`);
      await t.tx.execute(sql`select pg_sleep(1)`);
      return 'passou';
    }).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErroDominio);
    expect(e).toMatchObject({ codigo: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
    expect(await contarEventos('DEM-20261111-0803')).toBe(0);
  });

  it('ErroDominio do corpo passa igual, sem virar 503', async () => {
    const proprio = new ErroDominio('limite_excedido', 'Limite (fictício).');
    const e = await executarComOrcamento(b.poolApp, atorDeIntegracao('awave'), 'padrao', undefined, async () => {
      throw proprio;
    }).catch((x: unknown) => x);
    expect(e).toBe(proprio);
  });

  it('outro erro do Postgres passa igual (vira 500 genérico na rota, não 503)', async () => {
    const e = await executarComOrcamento(b.poolApp, atorDeIntegracao('awave'), 'padrao', undefined, async (t) => {
      await t.tx.execute(sql`select 1 / 0`);
    }).catch((x: unknown) => x);
    expect(e).not.toBeInstanceOf(ErroDominio);
    expect(mapearErro(e).status).toBe(500);
  });
});

describe('traduzirTempoEsgotado', () => {
  const comCodigo = (code: string) => Object.assign(new Error('mensagem do banco com dado (fictício)'), { code });

  it.each(['57014', '55P03'])('%s vira ErroDominio indisponivel, direto, na causa ou em objeto simples', (code) => {
    for (const e of [comCodigo(code), new Error('embrulho', { cause: comCodigo(code) }), { code }]) {
      const t = traduzirTempoEsgotado(e);
      expect(t).toBeInstanceOf(ErroDominio);
      expect(t).toMatchObject({ codigo: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL, extras: {} });
    }
  });

  it('outro erro e ErroDominio passam iguais', () => {
    const dominio = new ErroDominio('conflito', 'Conflito (fictício).');
    for (const e of [comCodigo('23505'), comCodigo('40001'), comCodigo('57P01'), new Error('sem código'), dominio, { code: '5701' }, 'texto', undefined, null])
      expect(traduzirTempoEsgotado(e)).toBe(e);
  });
});

describe('estático', () => {
  const fonte = readFileSync(fileURLToPath(new URL('./tempo-limite.ts', import.meta.url)), 'utf8');

  // O SQL cru já é barrado em todo src/ por test/estatico/sql-raw.test.ts e varreduras-qa.test.ts (C-17).
  it('os SET LOCAL são literais constantes', () => {
    expect(fonte).toMatch(/sql`set local lock_timeout = '2s'`/);
    expect(fonte).toMatch(/sql`set local statement_timeout = '5s'`/);
    expect(fonte).toMatch(/sql`set local statement_timeout = '10s'`/);
    // Nenhum valor interpolado num SET.
    expect(fonte).not.toMatch(/sql`set [^`]*\$\{/);
  });

  it('nenhuma linha de log nova (IN-14)', () => {
    expect(fonte).not.toMatch(/\blog\s*\.|console\./);
  });
});
