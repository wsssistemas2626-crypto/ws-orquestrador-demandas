// src/modules/andamento/registrar-qa.test.ts — 06-T07-testes do DEC-DEM-20261111-0017-v1 (qa-automacao), ao lado dos
// testes do engenheiro, sem mudar nada neles. Ataques ao serviço registrarAndamento que eles não fazem:
//   1. AN-03, o 404 sem oráculo, pelo adaptador real rota() (o mesmo mapearErro e os mesmos cabeçalhos da rota da T08):
//      DEC inexistente, fora do formato, sem pedido, substituído sem pedido, de outra demanda (evento de pessoa apontando
//      para uma demanda em construção), com evento de agente, de sistema, de entidade errada e sem demanda: o mesmo
//      status, os mesmos bytes do corpo e os mesmos cabeçalhos; e nenhum deles toma a trava da demanda (sem oráculo de
//      tempo), enquanto o DEC inexistente entra na mesma fila `pedido:<decId>` que o existente;
//   2. AN-05 e M-4 da 0019: a corrida entre o andamento, a entrega e o recebimento do mesmo DEC, com duas e três
//      transações reais e a fila conferida por pg_blocking_pids, e 20 rodadas dos três ao mesmo tempo;
//   3. AN-06: o prazo total vencendo depois do INSERT do andamento, depois do UPDATE do status e depois do último evento
//      (antes do COMMIT) desfaz tudo, inclusive a transição aprovada → em_construcao; vencido antes da conexão, nem
//      conecta.
// Postgres real (Testcontainers), papel do app, relógio fixo; o relógio monotônico só por vi.spyOn. Cada caso com DEC e
// autora próprios; contagens relativas. Token só gerado em tempo de teste. Dados fictícios.
import type pg from 'pg';
import { sql } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { andamentosDa, corpo, erroDe, porStatus, retratoDa } from '../../../test/andamento';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { atorDeIntegracao, tokenDeIntegracao } from '../../../test/integracoes';
import { CONFIRMADO, inserirEventoDoPedido, preparadorDePedidos, sha256DoTexto, totalDeEventos } from '../../../test/pedidos-construcao';
import { chamarRota } from '../../../test/requisicao';
import { criarPool } from '../../db';
import { comTransacao, type Transacao } from '../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../lib/deps';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { substituirDestinoDoLog } from '../../lib/log';
import { lerCode, reduzirErro } from '../../lib/reduzir-erro';
import { relogioFixo } from '../../lib/relogio';
import { paramId, rota } from '../../lib/rota';
import { alterarDemandaSchema } from '../demandas/schemas';
import { alterarDemanda } from '../demandas/servico';
import { transicoesManuaisDe } from '../demandas/transicoes';
import { MENSAGEM_INDISPONIVEL } from '../integracoes/tempo-limite';
import { entregarPedido } from '../pedido-construcao/entregar';
import { gerarPedido } from '../pedido-construcao/gerar';
import { MENSAGENS_RECEBIMENTO, receberPedido } from '../pedido-construcao/receber';
import { travarDemanda } from '../versoes';
import { registrarAndamento } from './registrar';
import { CORPO_INVALIDO_ANDAMENTO, MENSAGENS_ANDAMENTO, corpoAndamentoSchema } from './schemas';

const relogio = relogioFixo('2026-11-12T12:00:00Z');
const construir = atorDeIntegracao('construir');
const INEXISTENTE = 'DEC-DEM-20991231-9999-v1';
const NAO_ENCONTRADO = { erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO };

let b: BancoDeTeste;
let deps: Deps;
let token: string;
const preparador = preparadorDePedidos({
  deps: () => deps,
  rotulo: 'registrar-qa',
  entregar: () => Promise.reject(new Error('este teste entrega pelo serviço')),
});

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  token = await tokenDeIntegracao(deps, 'construir');
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const registrar = (decId: string, c = corpo()) => registrarAndamento(deps, construir, decId, c);

// O envio pelo adaptador real rota(), como a rota da T08 o monta (plano, T08): regex do DEC, Bearer, corpo fechado com o
// 422 próprio e o serviço. Só a parte da resposta que pode vazar algo: status, bytes do corpo e cabeçalhos.
const handler = rota(
  {
    acao: 'registrar_andamento',
    rota: '/api/pedidos-construcao/[decId]/andamento',
    params: paramId.versao('decId', 'DEC'),
    corpo: corpoAndamentoSchema,
    corpoInvalido: CORPO_INVALIDO_ANDAMENTO,
  },
  async ({ ator, params, corpo: c, deps: d }) => {
    await registrarAndamento(d, ator, params.decId, c);
    return { status: 204 };
  },
);
async function enviar(decId: string, c: unknown = corpo()) {
  const r = await chamarRota(handler, {
    metodo: 'POST',
    caminho: `/api/pedidos-construcao/${encodeURIComponent(decId)}/andamento`,
    params: { decId },
    bearer: token,
    semOrigin: true,
    corpo: c,
    cabecalhos: { accept: 'application/json' },
  });
  return { status: r.status, texto: await r.text(), cabecalhos: [...r.headers.entries()].sort(([x], [y]) => x.localeCompare(y)) };
}

// ---- concorrência (D-13: a fila conferida no banco, sem sono fixo) ----

// Segura o que `acao` travar numa transação até o teste soltar; devolve o pid dela e o resultado.
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
  const pid = Promise.race([tomada, fim.then((f) => Promise.reject(new Error(`a transação segura terminou antes: ${f.ok ? 'ok' : String(f.e)}`)))]);
  return { soltar, fim, pid };
}

// Os pids que esperam atrás de `pid` (trava presa por ele, ou na frente na fila), quando chegam a `n`; [] se não chegam.
async function naFilaDe(pid: number, n: number): Promise<number[]> {
  for (let i = 0; i < 200; i++) {
    const { rows } = await b.poolMigrator.query<{ pid: number }>(`select pid from pg_stat_activity where $1 = any(pg_blocking_pids(pid)) order by pid`, [pid]);
    if (rows.length >= n) return rows.map((r) => r.pid);
    await new Promise((r) => setTimeout(r, 10));
  }
  return [];
}

const eventosDoDec = async (decId: string, acao: string) =>
  Number((await b.poolMigrator.query<{ n: number }>(`select count(*)::int as n from evento where entidade_id = $1 and acao = $2`, [decId, acao])).rows[0]!.n);

// DEC aprovado de uma demanda nova, sem pedido gerado, cujo pedido_gerado de pessoa (forjado pelo migrator) aponta para a
// demanda `alvo`: o ataque de gravar na demanda de outro DEC (AN-03, demanda divergente).
async function decDeOutraDemanda(alvo: string) {
  const x = await preparador.prepararDec({ gerar: false });
  await inserirEventoDoPedido(b, deps, {
    acao: 'pedido_gerado',
    decId: x.decId,
    demandaId: alvo,
    atorTipo: 'pessoa',
    atorId: preparador.geradora.usuarioId,
    prefixo: null,
    depois: CONFIRMADO,
  });
  return x;
}

// v1 sem pedido gerado, substituído pelo v2 aprovado e gerado.
async function substituidoSemPedido() {
  const c = await preparador.prepararDec({ gerar: false });
  const v2 = await preparador.novoDec(c.autora, c.demandaId);
  await preparador.aprovar(v2);
  await gerarPedido(deps, preparador.geradora, v2, CONFIRMADO);
  return c;
}

describe('AN-03 adversarial: o 404 do envio, pelo rota(), não diz se o DEC existe', () => {
  it('nove formas de DEC sem pedido gerado por pessoa na própria demanda: mesmo status, mesmos bytes e mesmos cabeçalhos do inexistente; nada muda', async () => {
    // A demanda em construção que o atacante tenta mover pelo DEC de outra demanda.
    const vitima = await preparador.prepararDec();
    await porStatus(b, vitima.demandaId, 'em_construcao');
    const semPedido = await preparador.prepararDec({ gerar: false });
    const substituido = await substituidoSemPedido();
    const deOutra = await decDeOutraDemanda(vitima.demandaId);
    const porAgente = await preparador.prepararDec({ gerar: false });
    await inserirEventoDoPedido(b, deps, { acao: 'pedido_gerado', decId: porAgente.decId, demandaId: porAgente.demandaId, atorTipo: 'agente', atorId: 'orquestrador' });
    const porSistema = await preparador.prepararDec({ gerar: false });
    await inserirEventoDoPedido(b, deps, { acao: 'pedido_gerado', decId: porSistema.decId, demandaId: porSistema.demandaId, atorTipo: 'sistema', atorId: 'sistema', prefixo: null });
    // pedido_gerado de pessoa sobre a entidade `demanda` (não o pacote): não conta.
    const entidadeErrada = await preparador.prepararDec({ gerar: false });
    await inserirEventoDoPedido(b, deps, {
      acao: 'pedido_gerado',
      decId: entidadeErrada.decId,
      demandaId: entidadeErrada.demandaId,
      atorTipo: 'pessoa',
      atorId: preparador.geradora.usuarioId,
      entidade: 'demanda',
      prefixo: null,
      depois: CONFIRMADO,
    });
    // pedido_gerado de pessoa sem demanda_id: não conta.
    const semDemanda = await preparador.prepararDec({ gerar: false });
    await b.poolMigrator.query(
      `insert into evento (ocorrido_em, ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, entidade_id, acao, depois)
       values ($1, 'pessoa', $2, null, null, 'pacote_decisao', $3, 'pedido_gerado', $4::jsonb)`,
      [relogio.agora().toISOString(), preparador.geradora.usuarioId, semDemanda.decId, JSON.stringify(CONFIRMADO)],
    );

    const demandas = [vitima, semPedido, substituido, deOutra, porAgente, porSistema, entidadeErrada, semDemanda].map((c) => c.demandaId);
    const antes = await Promise.all(demandas.map((d) => retratoDa(b, d)));
    const totalAntes = await totalDeEventos(b);

    const referencia = await enviar(INEXISTENTE);
    expect(referencia.status).toBe(404);
    expect(JSON.parse(referencia.texto)).toEqual(NAO_ENCONTRADO);
    const casos: Array<[string, string]> = [
      ['fora do formato', 'DEC-xyz'],
      ['sem pedido gerado', semPedido.decId],
      ['substituído sem pedido', substituido.decId],
      ['de outra demanda (evento de pessoa apontando para a demanda em construção)', deOutra.decId],
      ['pedido_gerado de agente', porAgente.decId],
      ['pedido_gerado de sistema', porSistema.decId],
      ['pedido_gerado de pessoa na entidade demanda', entidadeErrada.decId],
      ['pedido_gerado de pessoa sem demanda', semDemanda.decId],
    ];
    for (const [nome, decId] of casos) {
      // Com o corpo do envio de construção e com o que mudaria o status (cancelado): a resposta não muda.
      for (const c of [corpo(), corpo({ fase: 'documentando', tarefasProntas: 17, status: 'cancelado' })])
        expect(await enviar(decId, c), nome).toEqual(referencia);
    }
    expect(await Promise.all(demandas.map((d) => retratoDa(b, d)))).toEqual(antes);
    expect(await totalDeEventos(b)).toBe(totalAntes);

    // Controle: o mesmo adaptador, com o DEC da vítima (pedido gerado por pessoa), chega ao serviço e grava.
    const ok = await enviar(vitima.decId);
    expect(ok).toMatchObject({ status: 204, texto: '' });
    expect(await andamentosDa(b, vitima.demandaId)).toHaveLength(1);
  });

  it('a fronteira: o DEC substituído que teve pedido gerado é 409 decSubstituido (CA-05.8), sem dizer o substituto, e nada grava', async () => {
    const c = await preparador.prepararDec();
    const v2 = await preparador.novoDec(c.autora, c.demandaId);
    await preparador.aprovar(v2);
    const antes = await retratoDa(b, c.demandaId);
    const r = await enviar(c.decId);
    expect(r.status).toBe(409);
    expect(JSON.parse(r.texto)).toEqual({ erro: 'conflito', mensagem: MENSAGENS_ANDAMENTO.decSubstituido });
    expect(r.texto).not.toContain(v2);
    expect(r.cabecalhos).toEqual((await enviar(INEXISTENTE)).cabecalhos);
    expect(await retratoDa(b, c.demandaId)).toEqual(antes);
  });

  it('sem oráculo de tempo: com as demandas travadas por uma pessoa, o 404 sai sem esperar; o DEC com pedido gerado espera a mesma trava', async () => {
    const vitima = await preparador.prepararDec();
    const semPedido = await preparador.prepararDec({ gerar: false });
    const substituido = await substituidoSemPedido();
    const deOutra = await decDeOutraDemanda(vitima.demandaId);
    const travadas = [vitima, semPedido, substituido, deOutra].map((c) => c.demandaId);
    const s = segurando(async (t) => {
      for (const d of travadas) await travarDemanda(t.tx, d);
    });
    const pid = await s.pid;
    let controle: Promise<unknown> | undefined;
    try {
      // Se o 404 tomasse a trava da demanda, esperaria os 2 s do lock_timeout e sairia 503 indisponivel.
      for (const decId of [semPedido.decId, substituido.decId, deOutra.decId]) {
        const e = await erroDe(registrar(decId));
        expect(e, decId).toBeInstanceOf(ErroDominio);
        expect(e, decId).toMatchObject({ codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
      }
      // Controle: o DEC com pedido gerado entra na fila da mesma trava.
      controle = erroDe(registrar(vitima.decId));
      expect(await naFilaDe(pid, 1)).toHaveLength(1);
    } finally {
      s.soltar();
    }
    expect((await s.fim).ok).toBe(true);
    expect(await controle).toBeUndefined();
    expect(await andamentosDa(b, vitima.demandaId)).toHaveLength(1);
    for (const d of [semPedido, substituido, deOutra]) expect(await andamentosDa(b, d.demandaId)).toEqual([]);
  });

  it('o DEC inexistente entra na mesma fila `pedido:<decId>` que o existente: espera quem a segura e só depois dá 404', async () => {
    const c = await b.poolMigrator.connect();
    let envio: Promise<unknown> | undefined;
    try {
      await c.query('begin');
      await c.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [`pedido:${INEXISTENTE}`]);
      const pid = (await c.query<{ pid: number }>('select pg_backend_pid() as pid')).rows[0]!.pid;
      envio = erroDe(registrar(INEXISTENTE));
      expect(await naFilaDe(pid, 1)).toHaveLength(1);
    } finally {
      await c.query('rollback');
      c.release();
    }
    expect(await envio).toMatchObject({ codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });
});

describe('AN-05 e M-4 da 0019: andamento, entrega e recebimento do mesmo DEC na mesma fila', () => {
  it('a entrega segura a trava do pedido: o andamento espera atrás dela, e os dois gravam', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    await porStatus(b, demandaId, 'em_construcao');
    const s = segurando((t) => entregarPedido(deps, construir, decId, t));
    const pid = await s.pid;
    const envio = erroDe(registrar(decId));
    try {
      expect(await naFilaDe(pid, 1)).toHaveLength(1);
    } finally {
      s.soltar();
    }
    expect((await s.fim).ok).toBe(true);
    expect(await envio).toBeUndefined();
    expect(await andamentosDa(b, demandaId)).toHaveLength(1);
    expect(await eventosDoDec(decId, 'pedido_entregue')).toBe(1);
  });

  it('o recebimento segura a trava do pedido: o andamento espera atrás dele, e os dois gravam', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    await porStatus(b, demandaId, 'em_construcao');
    const { sha256 } = await entregarPedido(deps, construir, decId);
    const s = segurando((t) => receberPedido(deps, construir, decId, sha256, t));
    const pid = await s.pid;
    const envio = erroDe(registrar(decId));
    try {
      expect(await naFilaDe(pid, 1)).toHaveLength(1);
    } finally {
      s.soltar();
    }
    expect(await s.fim).toEqual({ ok: true, r: { jaRecebido: false } });
    expect(await envio).toBeUndefined();
    expect(await andamentosDa(b, demandaId)).toHaveLength(1);
    expect(await eventosDoDec(decId, 'pedido_recebido')).toBe(1);
  });

  it('o andamento na frente (preso na trava da demanda): a entrega e o recebimento entram na fila atrás dele, sem deadlock, e saem na ordem', async () => {
    const { demandaId, decId, json } = await preparador.prepararDec();
    await porStatus(b, demandaId, 'aprovada', 'melhoria');
    const pessoa = segurando((t) => travarDemanda(t.tx, demandaId));
    const pidPessoa = await pessoa.pid;
    let envio: Promise<unknown> | undefined;
    let entrega: Promise<unknown> | undefined;
    let recebimento: Promise<unknown> | undefined;
    try {
      envio = erroDe(registrar(decId));
      const [pidEnvio] = await naFilaDe(pidPessoa, 1);
      expect(pidEnvio).toBeDefined();
      entrega = erroDe(entregarPedido(deps, construir, decId));
      expect(await naFilaDe(pidEnvio!, 1)).toHaveLength(1);
      // O hash que a entrega vai calcular é o da geração (CA-22.2): o recebimento só passa se vier depois dela.
      recebimento = receberPedido(deps, construir, decId, sha256DoTexto(json!)).then(
        (r) => r,
        (e: unknown) => e,
      );
      expect(await naFilaDe(pidEnvio!, 2)).toHaveLength(2);
    } finally {
      pessoa.soltar();
    }
    expect((await pessoa.fim).ok).toBe(true);
    expect(await envio).toBeUndefined();
    expect(await entrega).toBeUndefined();
    expect(await recebimento).toEqual({ jaRecebido: false });
    // A ordem da fila: o andamento (com a transição) antes da entrega, e a entrega antes do recebimento.
    const ordem = (
      await b.poolMigrator.query<{ acao: string }>(
        `select acao from evento where demanda_id = $1 and acao in ('status_alterado', 'andamento_registrado', 'pedido_entregue', 'pedido_recebido') and ator_tipo = 'integracao' order by id`,
        [demandaId],
      )
    ).rows.map((r) => r.acao);
    expect(ordem).toEqual(['status_alterado', 'andamento_registrado', 'pedido_entregue', 'pedido_recebido']);
    expect((await retratoDa(b, demandaId)).demanda.status).toBe('em_construcao');
  });

  it('20 rodadas de andamento, entrega e recebimento ao mesmo tempo: nenhum deadlock nem 503; uma entrega, um recebimento, 20 linhas e um marco', async () => {
    const { demandaId, decId, json } = await preparador.prepararDec();
    await porStatus(b, demandaId, 'em_construcao');
    const sha = sha256DoTexto(json!);
    let recebidos = 0;
    for (let i = 0; i < 20; i++) {
      const [envio, entrega, recebimento] = await Promise.allSettled([
        registrar(decId, corpo({ tarefasProntas: i, tarefasTotal: 20 })),
        entregarPedido(deps, construir, decId),
        receberPedido(deps, construir, decId, sha),
      ]);
      for (const r of [envio, entrega, recebimento])
        if (r!.status === 'rejected') {
          expect(reduzirErro(r.reason).code ?? lerCode(r.reason), `rodada ${i}`).not.toBe('40P01');
          expect(r.reason, `rodada ${i}`).not.toMatchObject({ codigo: 'indisponivel' });
        }
      expect(envio, `rodada ${i}`).toEqual({ status: 'fulfilled', value: undefined });
      expect(entrega, `rodada ${i}`).toEqual({ status: 'fulfilled', value: { json, sha256: sha } });
      // Só antes da primeira entrega o recebimento pode ser recusado, e só por não ter entrega.
      if (recebimento!.status === 'rejected') {
        expect(i, 'recusa de recebimento depois de uma entrega').toBe(0);
        expect(recebimento.reason).toMatchObject({ codigo: 'conflito', mensagem: MENSAGENS_RECEBIMENTO.naoEntregue });
      } else recebidos++;
    }
    expect(recebidos).toBeGreaterThanOrEqual(19);
    expect(await andamentosDa(b, demandaId)).toHaveLength(20);
    expect(await eventosDoDec(decId, 'andamento_registrado')).toBe(1);
    expect(await eventosDoDec(decId, 'pedido_entregue')).toBe(1);
    expect(await eventosDoDec(decId, 'pedido_recebido')).toBe(1);
    expect((await retratoDa(b, demandaId)).demanda.status).toBe('em_construcao');
  });
});

describe('CA-05.11: depois do cancelado do /construir, a mudança manual é a de hoje', () => {
  it('em devolvida pelo envio, a pessoa só leva a em_construcao ou em_analise; as outras são recusadas sem mudar nada', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    await porStatus(b, demandaId, 'em_construcao');
    await registrar(decId, corpo({ status: 'cancelado' }));
    expect((await retratoDa(b, demandaId)).demanda.status).toBe('devolvida');
    expect([...transicoesManuaisDe('devolvida')].sort()).toEqual(['em_analise', 'em_construcao']);
    const pessoa = (status: string) => alterarDemanda(deps, preparador.geradora, demandaId, alterarDemandaSchema.parse({ status }));
    for (const proibido of ['nova', 'aprovada', 'entregue', 'encerrada']) {
      const antes = await retratoDa(b, demandaId);
      const e = await erroDe(pessoa(proibido));
      expect(e, proibido).toBeInstanceOf(ErroDominio);
      expect(await retratoDa(b, demandaId), proibido).toEqual(antes);
    }
    expect(await erroDe(pessoa('em_analise'))).toBeUndefined();
    expect((await retratoDa(b, demandaId)).demanda.status).toBe('em_analise');
  });
});

// ---- prazo total (AN-06) ----

// O pg aceita query(texto, valores), query({ text, values }) e query({ text }, valores); o Drizzle usa a última.
type Consulta = { texto: string; valores: unknown[] };
function lerConsulta(args: unknown[]): Consulta {
  const q = args[0];
  const segundo = Array.isArray(args[1]) ? (args[1] as unknown[]) : undefined;
  if (typeof q === 'string') return { texto: q, valores: segundo ?? [] };
  const o = (q ?? {}) as { text?: string; values?: unknown[] };
  return { texto: o.text ?? '', valores: o.values ?? segundo ?? [] };
}

// Pool do app de uma conexão só, cujo cliente avisa `depois` ao fim de cada instrução que casa com `gatilho`.
function poolVigiado(gatilho: (c: Consulta) => boolean, depois: () => void): pg.Pool {
  const pool = criarPool(b.urlApp, { max: 1 });
  const vigiados = new WeakSet<object>();
  const conectar = pool.connect.bind(pool) as unknown as () => Promise<pg.PoolClient>;
  (pool as unknown as { connect: () => Promise<pg.PoolClient> }).connect = async () => {
    const cliente = await conectar();
    if (!vigiados.has(cliente)) {
      vigiados.add(cliente);
      const original = cliente.query.bind(cliente) as unknown as (...a: unknown[]) => Promise<unknown>;
      (cliente as unknown as { query: (...a: unknown[]) => Promise<unknown> }).query = (...a: unknown[]) => {
        const r = original(...a);
        return gatilho(lerConsulta(a))
          ? r.then((x) => {
              depois();
              return x;
            })
          : r;
      };
    }
    return cliente;
  };
  return pool;
}

describe('AN-06 adversarial: o prazo total vencendo no meio desfaz tudo, inclusive a transição', () => {
  const pontos: Array<[string, (c: Consulta) => boolean]> = [
    ['depois do INSERT do andamento', (c) => /^insert into "andamento_construcao"/i.test(c.texto)],
    ['depois do UPDATE do status da demanda', (c) => /^update "demanda"/i.test(c.texto)],
    ['depois do último evento, antes do COMMIT', (c) => /^insert into "evento"/i.test(c.texto) && c.valores.includes('andamento_registrado')],
  ];

  it.each(pontos)('%s: 503 indisponivel, e andamento, status, atualizada_em e eventos iguais aos de antes', async (_nome, gatilho) => {
    const { demandaId, decId } = await preparador.prepararDec();
    await porStatus(b, demandaId, 'aprovada', 'melhoria');
    const antes = await retratoDa(b, demandaId);
    let agora = 0;
    let disparou = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => agora);
    const pool = poolVigiado(gatilho, () => {
      disparou++;
      agora = 9_000;
    });
    try {
      const e = await erroDe(registrarAndamento({ pool, relogio }, construir, decId, corpo()));
      expect(disparou).toBe(1);
      expect(e).toBeInstanceOf(ErroDominio);
      expect(e).toMatchObject({ codigo: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
    } finally {
      await pool.end();
    }
    expect(await retratoDa(b, demandaId)).toEqual(antes);
  });

  it('controle: o mesmo pool vigiado, sem o prazo vencer, grava a linha e leva aprovada a em_construcao', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    await porStatus(b, demandaId, 'aprovada', 'melhoria');
    vi.spyOn(performance, 'now').mockImplementation(() => 0);
    let vistas = 0;
    const pool = poolVigiado(
      (c) => pontos.some(([, g]) => g(c)),
      () => vistas++,
    );
    try {
      expect(await registrarAndamento({ pool, relogio }, construir, decId, corpo())).toBeUndefined();
    } finally {
      await pool.end();
    }
    // As três instruções que os casos acima vigiam aconteceram de fato.
    expect(vistas).toBe(3);
    expect((await retratoDa(b, demandaId)).demanda.status).toBe('em_construcao');
    expect(await andamentosDa(b, demandaId)).toHaveLength(1);
  });

  it('prazo vencido antes da conexão: 503 indisponivel sem nem pedir conexão ao pool', async () => {
    const connect = vi.fn(() => {
      throw new Error('não deveria conectar');
    });
    const pool = { connect } as unknown as pg.Pool;
    let chamadas = 0;
    // A primeira leitura marca o início; a segunda, já na espera pela conexão, vê os 8 s gastos.
    vi.spyOn(performance, 'now').mockImplementation(() => (chamadas++ === 0 ? 0 : 8_000));
    const e = await erroDe(registrarAndamento({ pool, relogio }, construir, INEXISTENTE, corpo()));
    expect(e).toBeInstanceOf(ErroDominio);
    expect(e).toMatchObject({ codigo: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
    expect(connect).not.toHaveBeenCalled();
  });
});
