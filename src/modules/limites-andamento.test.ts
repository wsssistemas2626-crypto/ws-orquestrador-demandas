// src/modules/limites-andamento.test.ts — AN-07 e ADR-31: o limite do andamento conta só o construir, por DEC (60) e no
// total (600), na janela móvel de 60 min pelo Relogio, sob a trava consultiva própria. Postgres real, relógio fixo, DEC
// pelo caminho real (preparadorDePedidos), linhas antigas pelo migrator. Dados fictícios.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { criarDepsDeTeste } from '../../test/deps';
import { atorDeIntegracao } from '../../test/integracoes';
import { preparadorDePedidos } from '../../test/pedidos-construcao';
import { comTransacao } from '../db/transacao';
import type { Deps } from '../lib/deps';
import { relogioFixo } from '../lib/relogio';
import type { Ator } from './acesso/ator';
import { conferirLimiteDeAndamento, LIMITE_ANDAMENTO, LIMITE_POR_HORA, TRAVA_DO_LIMITE_DE_ANDAMENTO } from './limites';

const relogio = relogioFixo('2026-11-12T12:00:00Z');
let b: BancoDeTeste;
let deps: Deps;
const p = preparadorDePedidos({ deps: () => deps, rotulo: 'limite-andamento', entregar: async () => new Response(null, { status: 500 }) });
const dec: Record<'x' | 'y' | 'z', { demandaId: string; decId: string }> = {} as never;

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  for (const k of ['x', 'y', 'z'] as const) dec[k] = await p.prepararDec({});
});
afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});

// `n` linhas do DEC, gravadas `minutosAtras` antes do relógio (pelo migrator: o app não tem como escolher a data).
async function linhas(k: 'x' | 'y' | 'z', n: number, minutosAtras = 1) {
  const quando = new Date(relogio.agora().getTime() - minutosAtras * 60_000).toISOString();
  await b.poolMigrator.query(
    `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em)
     select $1, $2, 'construindo', 0, 1, 'em_construcao', 'ficticio', $3 from generate_series(1, $4)`,
    [dec[k].demandaId, dec[k].decId, quando, n],
  );
}
const limpar = () => b.poolMigrator.query('delete from andamento_construcao');
const conferir = (decId: string, ator: Ator = atorDeIntegracao('construir')) =>
  comTransacao(deps.pool, ({ tx }) => conferirLimiteDeAndamento(tx, ator, decId, relogio));

describe('AN-07: só o construir conta; todo outro ator lança', () => {
  it.each<[string, Ator]>([
    ['awave', atorDeIntegracao('awave')],
    ['integração fora da lista', { tipo: 'integracao', integracao: 'jarvis', prefixoToken: 'ficticio' } as unknown as Ator],
    ['pessoa', { tipo: 'pessoa', usuarioId: 'u-ficticio', nome: 'Pessoa Ficticia', papel: 'cto' }],
    ['agente', { tipo: 'agente', agente: 'risco', prefixoToken: 'ficticio' }],
    ['sistema', { tipo: 'sistema' }],
  ])('%s lança antes de tomar a trava (AN-08 c)', async (_n, ator) => {
    const segura = await b.poolMigrator.connect();
    try {
      await segura.query('select pg_advisory_lock(hashtextextended($1, 0))', [TRAVA_DO_LIMITE_DE_ANDAMENTO]);
      const inicio = performance.now();
      await expect(conferir(dec.x.decId, ator)).rejects.toThrow();
      expect(performance.now() - inicio).toBeLessThan(1_000);
    } finally {
      await segura.query('select pg_advisory_unlock(hashtextextended($1, 0))', [TRAVA_DO_LIMITE_DE_ANDAMENTO]);
      segura.release();
    }
  });
});

describe('AN-07: contagem por DEC e total, na janela', () => {
  it('constantes: 60, 600, a chave literal e as mensagens da 03, seção 7', () => {
    expect(LIMITE_ANDAMENTO).toEqual({
      porDec: { maximo: 60, mensagem: 'Limite de 60 registros de andamento por hora deste pedido atingido. Tente de novo mais tarde.' },
      total: { maximo: 600, mensagem: 'Limite de 600 registros de andamento por hora do /construir atingido. Tente de novo mais tarde.' },
    });
    expect(TRAVA_DO_LIMITE_DE_ANDAMENTO).toBe('limite:andamento:integracao:construir');
  });
  it('59 do DEC passa; 60 dá 429 com a mensagem por DEC; outro DEC passa', async () => {
    await limpar();
    await linhas('x', 59);
    await expect(conferir(dec.x.decId)).resolves.toBeUndefined();
    await linhas('x', 1);
    await expect(conferir(dec.x.decId)).rejects.toMatchObject({ codigo: 'limite_excedido', mensagem: LIMITE_ANDAMENTO.porDec.mensagem });
    await expect(conferir(dec.y.decId)).resolves.toBeUndefined();
  });
  it('janela móvel: as de 61 min atrás não contam', async () => {
    await limpar();
    await linhas('x', 60, 61);
    await expect(conferir(dec.x.decId)).resolves.toBeUndefined();
  });
  it('total: 599 em outro DEC passa; 600 dá 429 com a mensagem total', async () => {
    await limpar();
    await linhas('z', 599);
    await expect(conferir(dec.x.decId)).resolves.toBeUndefined();
    await linhas('z', 1);
    await expect(conferir(dec.x.decId)).rejects.toMatchObject({ codigo: 'limite_excedido', mensagem: LIMITE_ANDAMENTO.total.mensagem });
  });
  it('599 no total e duas gravações simultâneas de DEC diferentes (duas conexões): uma passa, a outra 429', async () => {
    await limpar();
    await linhas('z', 599);
    const gravar = (k: 'x' | 'y') =>
      comTransacao(deps.pool, async ({ tx, executor }) => {
        await conferirLimiteDeAndamento(tx, atorDeIntegracao('construir'), dec[k].decId, relogio);
        await executor.executeSql(
          `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em) values ($1, $2, 'testando', 0, 0, 'em_construcao', 'ficticio', $3)`,
          [dec[k].demandaId, dec[k].decId, relogio.agora().toISOString()],
        );
      }).then(
        () => 'gravou',
        (e: { codigo?: string }) => e.codigo,
      );
    expect((await Promise.all([gravar('x'), gravar('y')])).sort()).toEqual(['gravou', 'limite_excedido']);
  });
  it('CA-12.6: os limites de pessoa, agente e Awave não mudam', () => {
    expect(LIMITE_POR_HORA).toEqual({ demanda: 30, artefato: 60 });
  });
});
