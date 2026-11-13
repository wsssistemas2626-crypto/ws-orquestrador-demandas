// src/modules/andamento/registrar-concorrencia.test.ts — T07 do DEC-DEM-20261111-0017-v1: AN-05 (quem escreve o que o
// registro lê entra em fila pela trava da demanda) e AN-08 (a trava do limite é a última e só o envio que grava a toma).
// D-13: duas transações reais, com a ordem forçada. Uma transação de pessoa segura a trava da demanda até o teste soltar;
// o teste só solta depois de ver o envio esperando por ela (pg_blocking_pids), sem depender de sono nem do relógio real.
// Onde o plano fala em "menos de 1 s", a transação de quem confere roda com lock_timeout de 1 s: se esperasse por alguma
// trava presa, falharia com 55P03. Postgres real, papel do app, relógio fixo, dados fictícios.
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { andamentosDa, corpo, erroDe, porStatus, retratoDa } from '../../../test/andamento';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { atorDeIntegracao, CORPO_DO_AWAVE } from '../../../test/integracoes';
import { CONFIRMADO, preparadorDePedidos } from '../../../test/pedidos-construcao';
import { comTransacao, type Transacao } from '../../db/transacao';
import type { Deps } from '../../lib/deps';
import { ErroDominio } from '../../lib/erros';
import { lerCode, reduzirErro } from '../../lib/reduzir-erro';
import { relogioFixo } from '../../lib/relogio';
import { alterarDemandaSchema, criarDemandaSchema } from '../demandas/schemas';
import { alterarDemanda, criarDemanda } from '../demandas/servico';
import { MENSAGEM_INDISPONIVEL } from '../integracoes/tempo-limite';
import { TRAVA_DO_LIMITE_DE_ANDAMENTO } from '../limites';
import { registrarDecisao } from '../pacotes-decisao/decidir';
import { registrarDecisaoSchema } from '../pacotes-decisao/schemas';
import { gerarPedido } from '../pedido-construcao/gerar';
import { registrarAndamento } from './registrar';
import { MENSAGENS_ANDAMENTO } from './schemas';

const relogio = relogioFixo('2026-11-12T12:00:00Z');
const construir = atorDeIntegracao('construir');

let b: BancoDeTeste;
let deps: Deps;
const preparador = preparadorDePedidos({
  deps: () => deps,
  rotulo: 'registrar-concorrencia',
  entregar: () => Promise.reject(new Error('este teste não entrega pedido')),
});

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
});
afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});

const registrar = (decId: string, c = corpo()) => registrarAndamento(deps, construir, decId, c);
const statusETipo = async (demandaId: string) =>
  (await b.poolMigrator.query<{ status: string; tipo: string }>(`select status, tipo from demanda where id = $1`, [demandaId])).rows[0]!;
const aprovarNa = (decId: string, t: Transacao) =>
  registrarDecisao(deps, preparador.geradora, decId, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }), t);
const mudarStatus = (demandaId: string, status: string, t?: Transacao) =>
  alterarDemanda(deps, preparador.geradora, demandaId, alterarDemandaSchema.parse({ status }), t);

// Segura a trava da demanda numa transação de pessoa até o teste soltar; devolve o pid dela e o resultado.
function segurando<T>(acao: (t: Transacao) => Promise<T>) {
  let soltar!: () => void;
  const solta = new Promise<void>((r) => (soltar = r));
  let tomou!: (pid: number) => void;
  const tomada = new Promise<number>((r) => (tomou = r));
  const fim = comTransacao(deps.pool, async (t) => {
    const r = await acao(t);
    const [linha] = (await t.tx.execute<{ pid: number }>(sql`select pg_backend_pid() as pid`)).rows;
    tomou(linha!.pid);
    await solta;
    return r;
  }).then(
    (r) => ({ ok: true as const, r }),
    (e: unknown) => ({ ok: false as const, e }),
  );
  // Se a ação falhar antes de segurar, o teste não fica esperando a trava que nunca veio.
  const pid = Promise.race([tomada, fim.then((f) => Promise.reject(new Error(`a transação segura terminou antes: ${f.ok ? 'ok' : String(f.e)}`)))]);
  return { soltar, fim, pid };
}

// Alguém entrou na fila atrás da transação `pid` (pg_blocking_pids não depende do papel de quem consulta).
async function esperaAtrasDe(pid: number): Promise<boolean> {
  for (let i = 0; i < 200; i++) {
    const { rows } = await b.poolMigrator.query<{ n: number }>(`select count(*)::int as n from pg_stat_activity where $1 = any(pg_blocking_pids(pid))`, [pid]);
    if (rows[0]!.n > 0) return true;
    await new Promise((r) => setTimeout(r, 10));
  }
  return false;
}

// Roda `acao` numa transação com lock_timeout de 1 s: se alguma trava continuasse presa, falharia com 55P03.
const semEsperarTrava = <T>(acao: (t: Transacao) => Promise<T>) =>
  comTransacao(deps.pool, async (t) => {
    await t.tx.execute(sql`set local lock_timeout = '1s'`);
    return acao(t);
  });

// Segura a trava do limite numa conexão do migrator (trava de sessão), como outra gravação de andamento em curso.
async function comTravaDoLimite<T>(f: () => Promise<T>): Promise<T> {
  const c = await b.poolMigrator.connect();
  try {
    await c.query('select pg_advisory_lock(hashtextextended($1, 0))', [TRAVA_DO_LIMITE_DE_ANDAMENTO]);
    return await f();
  } finally {
    await c.query('select pg_advisory_unlock(hashtextextended($1, 0))', [TRAVA_DO_LIMITE_DE_ANDAMENTO]);
    c.release();
  }
}

describe('AN-05: corridas com quem escreve o que o registro lê', () => {
  it('(a) dois envios iguais do mesmo DEC ao mesmo tempo: uma linha e um andamento_registrado', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    const r = await Promise.allSettled([registrar(decId), registrar(decId)]);
    expect(r.map((x) => x.status)).toEqual(['fulfilled', 'fulfilled']);
    expect(await andamentosDa(b, demandaId)).toHaveLength(1);
    const n = (await b.poolMigrator.query(`select count(*)::int as n from evento where entidade_id = $1 and acao = 'andamento_registrado'`, [decId])).rows[0].n;
    expect(n).toBe(1);
  });

  it('(b) pessoa marca entregue com a trava segura e o envio cancelado espera: entregue fica, o envio é 409 statusFinal', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    await porStatus(b, demandaId, 'em_construcao');
    const s = segurando((t) => mudarStatus(demandaId, 'entregue', t));
    const pid = await s.pid;
    const envio = erroDe(registrar(decId, corpo({ status: 'cancelado' })));
    try {
      expect(await esperaAtrasDe(pid)).toBe(true);
    } finally {
      s.soltar();
    }
    expect((await s.fim).ok).toBe(true);
    expect(await envio).toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_ANDAMENTO.statusFinal });
    expect((await statusETipo(demandaId)).status).toBe('entregue');
    expect(await andamentosDa(b, demandaId)).toEqual([]);
  });

  it('(b) o inverso: o envio cancelado primeiro leva a devolvida, e a pessoa recebe conflito ao marcar entregue', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    await porStatus(b, demandaId, 'em_construcao');
    await registrar(decId, corpo({ status: 'cancelado' }));
    const e = await erroDe(mudarStatus(demandaId, 'entregue'));
    expect(e).toBeInstanceOf(ErroDominio);
    expect(e).toMatchObject({ codigo: 'conflito' });
    expect((await statusETipo(demandaId)).status).toBe('devolvida');
    expect(await andamentosDa(b, demandaId)).toHaveLength(1);
  });

  it('(c) a decisão do v2 com a trava segura e o envio do v1 espera: 409 decSubstituido, nenhuma linha do v1', async () => {
    const c = await preparador.prepararDec();
    const v2 = await preparador.novoDec(c.autora, c.demandaId);
    const s = segurando((t) => aprovarNa(v2, t));
    const pid = await s.pid;
    const envio = erroDe(registrar(c.decId));
    try {
      expect(await esperaAtrasDe(pid)).toBe(true);
    } finally {
      s.soltar();
    }
    expect((await s.fim).ok).toBe(true);
    expect(await envio).toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_ANDAMENTO.decSubstituido });
    expect(await andamentosDa(b, c.demandaId)).toEqual([]);
  });

  it('(c) o inverso: o envio do v1 grava; depois da decisão do v2, um envio novo do v1 é 409', async () => {
    const c = await preparador.prepararDec();
    await registrar(c.decId);
    const v2 = await preparador.novoDec(c.autora, c.demandaId);
    await preparador.aprovar(v2);
    expect(await erroDe(registrar(c.decId, corpo({ fase: 'testando' })))).toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_ANDAMENTO.decSubstituido });
    expect((await andamentosDa(b, c.demandaId)).map((l) => [l.dec_id, l.fase])).toEqual([[c.decId, 'construindo']]);
  });

  it('(d) pessoa troca o tipo para estudo com a trava segura e o envio em_construcao espera: continua aprovada, linha gravada', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    await porStatus(b, demandaId, 'aprovada', 'melhoria');
    const s = segurando((t) => alterarDemanda(deps, preparador.geradora, demandaId, alterarDemandaSchema.parse({ tipo: 'estudo' }), t));
    const pid = await s.pid;
    const envio = registrar(decId);
    try {
      expect(await esperaAtrasDe(pid)).toBe(true);
    } finally {
      s.soltar();
    }
    expect((await s.fim).ok).toBe(true);
    expect(await envio).toBeUndefined();
    expect(await statusETipo(demandaId)).toEqual({ status: 'aprovada', tipo: 'estudo' });
    expect(await andamentosDa(b, demandaId)).toHaveLength(1);
  });

  it('(e) envios do v1 e do v2 da mesma demanda juntos, 50 vezes: nenhum deadlock (40P01); o v1 sempre 409, o v2 sempre grava', async () => {
    const c = await preparador.prepararDec();
    const v2 = await preparador.novoDec(c.autora, c.demandaId);
    await preparador.aprovar(v2);
    await gerarPedido(deps, preparador.geradora, v2, CONFIRMADO);
    for (let i = 0; i < 50; i++) {
      const [r1, r2] = await Promise.allSettled([
        registrar(c.decId, corpo({ tarefasProntas: i, tarefasTotal: 50 })),
        registrar(v2, corpo({ tarefasProntas: i, tarefasTotal: 50 })),
      ]);
      for (const r of [r1, r2]) if (r!.status === 'rejected') expect(reduzirErro(r.reason).code ?? lerCode(r.reason)).not.toBe('40P01');
      expect(r1).toMatchObject({ status: 'rejected', reason: { codigo: 'conflito', mensagem: MENSAGENS_ANDAMENTO.decSubstituido } });
      expect(r2).toEqual({ status: 'fulfilled', value: undefined });
    }
    const linhas = await andamentosDa(b, c.demandaId);
    expect(linhas).toHaveLength(50);
    expect(new Set(linhas.map((l) => l.dec_id))).toEqual(new Set([v2]));
  });
});

describe('AN-08: a trava do limite é a última e só quem grava a toma', () => {
  it('(1) com a trava do limite presa, o envio de estado novo é 503 indisponivel sem gravar, e a demanda fica livre logo depois', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    const antes = await retratoDa(b, demandaId);
    await comTravaDoLimite(async () => {
      const e = await erroDe(registrar(decId));
      expect(e).toBeInstanceOf(ErroDominio);
      expect(e).toMatchObject({ codigo: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
      expect(await retratoDa(b, demandaId)).toEqual(antes);
      await semEsperarTrava((t) => mudarStatus(demandaId, 'em_analise', t));
    });
    expect((await statusETipo(demandaId)).status).toBe('em_analise');
  });

  it('(2) com a trava do limite presa, pessoa muda o status de outra demanda e o awave cria demanda sem esperar', async () => {
    const { demandaId } = await preparador.prepararDec();
    await comTravaDoLimite(async () => {
      await semEsperarTrava((t) => mudarStatus(demandaId, 'em_analise', t));
      const criada = await semEsperarTrava((t) => criarDemanda(deps, atorDeIntegracao('awave'), criarDemandaSchema.parse(CORPO_DO_AWAVE), t));
      expect(criada.id).toMatch(/^DEM-\d{8}-\d{4}$/);
    });
    expect((await statusETipo(demandaId)).status).toBe('em_analise');
  });

  it('(3) com a trava do limite presa, o envio no mesmo estado resolve sem erro (não chega à trava)', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    await registrar(decId);
    const antes = await retratoDa(b, demandaId);
    await comTravaDoLimite(async () => {
      expect(await registrar(decId)).toBeUndefined();
    });
    expect(await retratoDa(b, demandaId)).toEqual(antes);
  });
});
