// DEC-DEM-20261112-0019-v1, 03-correcao, M-3: o orçamento da integração vale pela transação inteira (Awave 8 s, /construir
// 12 s, abaixo dos 10 s e 15 s dos clientes), e o estouro vira o 503 fixo, sem gravar. Pessoa, agente e sistema não
// ganham prazo total. O relógio monotônico (performance.now) é adiantado pelo teste, para não esperar 8 s de verdade.
// Postgres real, papel do app, relógio fixo. Dados fictícios.
import { sql } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { atorDeIntegracao } from '../../../test/integracoes';
import type { Db } from '../../db';
import { PrazoDaTransacaoEsgotado } from '../../db/transacao';
import { ErroDominio, mapearErro } from '../../lib/erros';
import { relogioFixo } from '../../lib/relogio';
import type { Ator } from '../acesso/ator';
import { registrarEvento } from '../historico/registrar';
import { executarComOrcamento, MENSAGEM_INDISPONIVEL, PISO_MS, PRAZO_TOTAL_MS, prazoTotalDe, traduzirTempoEsgotado } from './tempo-limite';

let b: BancoDeTeste;
const relogio = relogioFixo('2026-11-12T12:00:00Z');
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const pessoa: Ator = { tipo: 'pessoa', usuarioId: 'u-prazo-0019', nome: 'Pessoa Ficticia', papel: 'cto' };
const agente: Ator = { tipo: 'agente', agente: 'orquestrador', prefixoToken: 'ficticio' };
const sistema: Ator = { tipo: 'sistema' };

const contarEventos = async (entidadeId: string) =>
  Number((await b.poolMigrator.query('select count(*) as n from evento where entidade_id = $1', [entidadeId])).rows[0].n);
const evento = (ator: Ator, entidadeId: string) => ({ ator, entidade: 'demanda', entidadeId, acao: 'demanda_criada' as const });

// Adianta o relógio monotônico da transação a partir do momento em que `adiantar` é chamado.
function relogioMonotonico() {
  const real = performance.now.bind(performance);
  let salto = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => real() + salto);
  return { adiantar: (ms: number) => void (salto += ms) };
}

describe('M-3: prazoTotalDe e as constantes', () => {
  it('integração: 8 s no padrão e 12 s na entrega; pessoa, agente e sistema: sem prazo total', () => {
    for (const integracao of ['awave', 'construir'] as const) {
      expect(prazoTotalDe(atorDeIntegracao(integracao), 'padrao')).toBe(8_000);
      expect(prazoTotalDe(atorDeIntegracao(integracao), 'entrega')).toBe(12_000);
    }
    for (const ator of [pessoa, agente, sistema]) {
      expect(prazoTotalDe(ator, 'padrao'), ator.tipo).toBeNull();
      expect(prazoTotalDe(ator, 'entrega'), ator.tipo).toBeNull();
    }
    expect(() => prazoTotalDe({ tipo: 'robo' } as unknown as Ator, 'padrao')).toThrow('ator desconhecido');
  });

  it('o prazo fica abaixo do tempo-limite de cada cliente (Awave 10 s, /construir 15 s)', () => {
    expect(PRAZO_TOTAL_MS.padrao).toBeLessThan(10_000);
    expect(PRAZO_TOTAL_MS.entrega).toBeLessThan(15_000);
    expect(Object.isFrozen(PRAZO_TOTAL_MS)).toBe(true);
  });

  it.each(['padrao', 'entrega'] as const)('o piso do orçamento %s é o que limitarTempo põe na transação', async (orcamento) => {
    const r = await executarComOrcamento(b.poolApp, atorDeIntegracao('awave'), orcamento, undefined, async ({ tx }: { tx: Db }) =>
      (await tx.execute<{ stmt: string; lock: string }>(sql`select current_setting('statement_timeout') as stmt, current_setting('lock_timeout') as lock`)).rows[0],
    );
    expect(r).toEqual({ stmt: `${PISO_MS[orcamento].statementMs / 1000}s`, lock: `${PISO_MS[orcamento].lockMs / 1000}s` });
  });

  it('PrazoDaTransacaoEsgotado vira o 503 fixo, sem texto interno', () => {
    const t = traduzirTempoEsgotado(new PrazoDaTransacaoEsgotado());
    expect(t).toBeInstanceOf(ErroDominio);
    expect(t).toMatchObject({ codigo: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL, extras: {} });
    expect(mapearErro(t)).toEqual({ status: 503, corpo: { erro: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL } });
  });
});

describe('M-3: executarComOrcamento com o prazo total', () => {
  it.each([
    ['awave', 'padrao', 8_000],
    ['construir', 'entrega', 12_000],
  ] as const)('%s (%s): instruções que somadas passam de %i ms → indisponivel, e nada gravado', async (integracao, orcamento, prazo) => {
    const id = `prazo-${integracao}-${orcamento}`;
    const m = relogioMonotonico();
    const e = await executarComOrcamento(b.poolApp, atorDeIntegracao(integracao), orcamento, undefined, async ({ tx }) => {
      await registrarEvento(tx, evento(atorDeIntegracao(integracao), id), relogio);
      m.adiantar(prazo + 1);
      await tx.execute(sql`select 1`);
      return 'passou';
    }).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErroDominio);
    expect(e).toMatchObject({ codigo: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
    expect(await contarEventos(id)).toBe(0);
  });

  it('logo abaixo do prazo, grava como hoje', async () => {
    const id = 'prazo-awave-abaixo';
    const m = relogioMonotonico();
    const r = await executarComOrcamento(b.poolApp, atorDeIntegracao('awave'), 'padrao', undefined, async ({ tx }) => {
      m.adiantar(7_000);
      await registrarEvento(tx, evento(atorDeIntegracao('awave'), id), relogio);
      return 'passou';
    });
    expect(r).toBe('passou');
    expect(await contarEventos(id)).toBe(1);
  });

  it('pessoa, agente e sistema com a mesma carga lenta: sem 503, grava', async () => {
    for (const ator of [pessoa, agente, sistema]) {
      const id = `prazo-sem-${ator.tipo}`;
      const m = relogioMonotonico();
      const r = await executarComOrcamento(b.poolApp, ator, 'padrao', undefined, async ({ tx }) => {
        await registrarEvento(tx, { ...evento(pessoa, id) }, relogio);
        m.adiantar(60_000);
        await tx.execute(sql`select 1`);
        return 'passou';
      });
      expect(r, ator.tipo).toBe('passou');
      expect(await contarEventos(id), ator.tipo).toBe(1);
      vi.restoreAllMocks();
    }
  });
});
