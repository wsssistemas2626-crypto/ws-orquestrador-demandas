// DEC-DEM-20261112-0019-v1, 03-correcao, M-4 (P1 da 02-triagem): entrega e recebimento do mesmo DEC entram na mesma
// fila (a trava consultiva `pedido:<decId>`), e o recebimento só aceita o hash da última entrega. A entrega grava sempre
// que o hash difere do último (X → Y → X grava as três). Banco, rotas e token `construir` reais; o hash antigo entra
// pelo migrator. O token só nasce em tempo de teste. Relógio fixo, dados fictícios.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { atorDeIntegracao } from '../../../test/integracoes';
import { chamadasDoConstruir, inserirEventoDoPedido, preparadorDePedidos, sha256DoTexto as sha } from '../../../test/pedidos-construcao';
import { comTransacao } from '../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../lib/deps';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { substituirDestinoDoLog } from '../../lib/log';
import { criarTokenDeIntegracao } from '../acesso/tokens-servico';
import { MENSAGEM_INDISPONIVEL } from '../integracoes/tempo-limite';
import { entregarPedido } from './entregar';
import { listarPendentes, ultimoShaEntregue } from './pendentes';
import { MENSAGENS_RECEBIMENTO, receberPedido } from './receber';

const X = 'a'.repeat(64);
const construir = atorDeIntegracao('construir');

let b: BancoDeTeste;
let deps: Deps;
let token: string;

const chamadas = chamadasDoConstruir(() => token);
const preparador = preparadorDePedidos({ deps: () => deps, rotulo: 'recebimento-0019', entregar: (decId) => chamadas.entregar(decId) });

const eventosDo = async (decId: string, acao: 'pedido_entregue' | 'pedido_recebido') =>
  (await b.poolMigrator.query<{ depois: { sha256: string } }>('select depois from evento where entidade_id = $1 and acao = $2 order by id', [decId, acao])).rows.map(
    (r) => r.depois.sha256,
  );
const entregarX = (decId: string, demandaId: string, sha256 = X) =>
  inserirEventoDoPedido(b, deps, { acao: 'pedido_entregue', decId, demandaId, atorTipo: 'integracao', atorId: 'construir', depois: { sha256 } });
const pendentes = async () => (await listarPendentes(deps.db)).map((p) => p.decId);

async function erroDe(p: Promise<unknown>): Promise<unknown> {
  return p.then(
    () => undefined,
    (e: unknown) => e,
  );
}

// Espera alguém entrar na fila da trava consultiva `pedido:<decId>` (o mesmo filtro de recebimento.test.ts).
async function esperaNaTrava(decId: string): Promise<boolean> {
  for (let i = 0; i < 100; i++) {
    const { rows } = await b.poolMigrator.query<{ n: number }>(
      `select count(*)::int as n from pg_locks
        where locktype = 'advisory' and not granted and objsubid = 1
          and database = (select oid from pg_database where datname = current_database())
          and classid::bigint = ((hashtextextended($1, 0) >> 32) & 4294967295)
          and objid::bigint = (hashtextextended($1, 0) & 4294967295)`,
      [`pedido:${decId}`],
    );
    if (rows[0]!.n > 0) return true;
    await new Promise((r) => setTimeout(r, 10));
  }
  return false;
}

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  token = (await comTransacao(deps.pool, (t) => criarTokenDeIntegracao(t, 'construir', deps.relogio))).token;
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('M-4: ultimoShaEntregue', () => {
  it('nulo sem entrega; o hash do pedido_entregue de maior id, ignorando o que está fora do formato', async () => {
    const { decId, demandaId } = await preparador.prepararDec({ entregar: false });
    expect(await ultimoShaEntregue(deps.db, decId)).toBeNull();
    await entregarX(decId, demandaId, X);
    expect(await ultimoShaEntregue(deps.db, decId)).toBe(X);
    await entregarX(decId, demandaId, 'b'.repeat(64));
    expect(await ultimoShaEntregue(deps.db, decId)).toBe('b'.repeat(64));
    await entregarX(decId, demandaId, 'NAO-E-HASH');
    expect(await ultimoShaEntregue(deps.db, decId)).toBe('b'.repeat(64));
  });
});

describe('M-4: corrida entre a entrega nova e o recebimento do hash anterior', () => {
  it('B espera A na trava do pedido, recebe 409 shaDiferente, não grava, e o DEC continua pendente', async () => {
    const { decId, demandaId } = await preparador.prepararDec({ entregar: false });
    await entregarX(decId, demandaId);

    let soltar!: () => void;
    const barreira = new Promise<void>((r) => (soltar = r));
    let entregou!: () => void;
    const entregaFeita = new Promise<void>((r) => (entregou = r));
    const sessaoA = comTransacao(b.poolApp, async (t) => {
      const r = await entregarPedido(deps, construir, decId, t);
      entregou();
      await barreira;
      return r;
    });
    let resultadoB: Promise<unknown> | undefined;
    let terminou = false;
    try {
      await entregaFeita;
      resultadoB = erroDe(receberPedido(deps, construir, decId, X)).finally(() => {
        terminou = true;
      });
      expect(await esperaNaTrava(decId)).toBe(true);
      expect(terminou).toBe(false);
    } finally {
      soltar();
    }
    const { sha256: y } = await sessaoA;
    expect(y).not.toBe(X);
    const e = await resultadoB!;
    expect(e).toBeInstanceOf(ErroDominio);
    expect(e).toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_RECEBIMENTO.shaDiferente });
    expect(await eventosDo(decId, 'pedido_recebido')).toEqual([]);
    expect(await eventosDo(decId, 'pedido_entregue')).toEqual([X, y]);
    expect(await pendentes()).toContain(decId);
  });

  it('a entrega espera a mesma trava: com pedido:<decId> preso por outra transação, a rota responde o 503 fixo, sem gravar', async () => {
    const { decId } = await preparador.prepararDec({ entregar: false });
    const outra = await b.poolMigrator.connect();
    try {
      await outra.query('begin');
      await outra.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [`pedido:${decId}`]);
      const r = await chamadas.entregar(decId);
      expect(r.status).toBe(503);
      expect(await r.json()).toEqual({ erro: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
    } finally {
      await outra.query('rollback');
      outra.release();
    }
    expect(await eventosDo(decId, 'pedido_entregue')).toEqual([]);
  });
});

describe('M-4: o recebimento aceita só o hash da última entrega', () => {
  it('sem corrida: X entregue antes e Y depois; X → 409 sem gravar; Y → grava; Y de novo → jaRecebido e um evento só', async () => {
    const { decId, demandaId } = await preparador.prepararDec({ entregar: false });
    await entregarX(decId, demandaId);
    const r = await chamadas.entregar(decId);
    expect(r.status).toBe(200);
    const y = sha(await r.text());
    expect(await eventosDo(decId, 'pedido_entregue')).toEqual([X, y]);

    const e = await erroDe(receberPedido(deps, construir, decId, X));
    expect(e).toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_RECEBIMENTO.shaDiferente });
    expect(await eventosDo(decId, 'pedido_recebido')).toEqual([]);
    expect(await pendentes()).toContain(decId);

    expect(await receberPedido(deps, construir, decId, y)).toEqual({ jaRecebido: false });
    expect(await receberPedido(deps, construir, decId, y)).toEqual({ jaRecebido: true });
    expect(await eventosDo(decId, 'pedido_recebido')).toEqual([y]);
    expect(await pendentes()).not.toContain(decId);
  });

  it('X → Y → X: a entrega de volta ao hash anterior grava de novo, e o recebimento do último passa', async () => {
    const { decId, demandaId } = await preparador.prepararDec({ entregar: false });
    const r1 = await chamadas.entregar(decId);
    expect(r1.status).toBe(200);
    const y = sha(await r1.text());
    await entregarX(decId, demandaId);
    const r2 = await chamadas.entregar(decId);
    expect(r2.status).toBe(200);
    expect(sha(await r2.text())).toBe(y);
    expect(await eventosDo(decId, 'pedido_entregue')).toEqual([y, X, y]);
    expect(await erroDe(receberPedido(deps, construir, decId, X))).toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_RECEBIMENTO.shaDiferente });
    expect(await receberPedido(deps, construir, decId, y)).toEqual({ jaRecebido: false });
  });

  it('P-02, como hoje: a entrega repetida do mesmo hash grava um pedido_entregue só', async () => {
    const { decId } = await preparador.prepararDec({ entregar: false });
    expect((await chamadas.entregar(decId)).status).toBe(200);
    expect((await chamadas.entregar(decId)).status).toBe(200);
    expect(await eventosDo(decId, 'pedido_entregue')).toHaveLength(1);
  });

  it('como hoje: sem entrega, 409 naoEntregue; DEC sem pedido gerado, o 404 de sempre', async () => {
    const semEntrega = await preparador.prepararDec({ entregar: false });
    expect(await erroDe(receberPedido(deps, construir, semEntrega.decId, X))).toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_RECEBIMENTO.naoEntregue });
    const semGerar = await preparador.prepararDec({ gerar: false });
    expect(await erroDe(receberPedido(deps, construir, semGerar.decId, X))).toMatchObject({ codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });
});
