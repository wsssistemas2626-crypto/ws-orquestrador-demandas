// Handler da fila retencao.expurgo (T31; RF-24, C-31, C-32) e o registro dele no worker. Banco real, pg-boss sobre o
// mesmo banco pelo papel do app, relógio fixo (RNF-15). Dados só fictícios.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CONFIG_TESTE } from '../../test/auth';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { SENTINELAS, contemSentinela } from '../../test/sentinelas';
import { criarFila, FILAS } from '../lib/fila';
import { substituirDestinoDoLog } from '../lib/log';
import { relogioFixo } from '../lib/relogio';
import { iniciarWorker, type DepsWorker } from '../worker/iniciar';
import { tratarExpurgo, type DepsExpurgo } from './expurgo-texto-bruto';

const DIA = 86_400_000;
const AGORA = '2026-10-22T12:00:00Z';
const relogio = relogioFixo(AGORA);

let b: BancoDeTeste;
let deps: DepsWorker;
const linhas: string[] = [];
const paradas: Array<() => Promise<void>> = [];

beforeAll(async () => {
  b = await novoBanco();
  deps = {
    db: b.db,
    pool: b.poolApp,
    relogio,
    fila: await criarFila(b.urlApp, { agendador: true }),
    provedor: null,
    // Prazo de 30 dias, diferente do padrão: prova que o job lê o prazo da configuração do worker.
    config: { ...CONFIG_TESTE, retencaoDias: 30, databaseUrl: b.urlApp },
  };
});
afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});
beforeEach(async () => {
  relogio.definir(AGORA);
  await b.poolMigrator.query('truncate entrada_pendente, evento, rotina_execucao cascade');
  await b.poolMigrator.query(`delete from pgboss.job where name = $1`, [FILAS.retencaoExpurgo]);
  linhas.length = 0;
  substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
});
afterEach(async () => {
  substituirDestinoDoLog(null);
  while (paradas.length > 0) await paradas.pop()!();
});

const registros = () => linhas.map((l) => JSON.parse(l) as Record<string, unknown>);
const depsExpurgo = (): DepsExpurgo => ({ pool: b.poolApp, relogio, config: { retencaoDias: 30 } });

async function criarPendente(dias: number): Promise<string> {
  const r = await b.poolMigrator.query<{ id: string }>(
    `insert into entrada_pendente (texto, solicitante_nome, status, registrada_por, recebida_em) values ($1, $2, 'falhou', 'u-ficticio', $3) returning id`,
    [SENTINELAS.texto, SENTINELAS.nome, new Date(new Date(AGORA).getTime() - dias * DIA)],
  );
  return r.rows[0]!.id;
}
const pendentes = async () => (await b.poolMigrator.query('select id from entrada_pendente')).rows.map((r) => r.id);
const rotina = async () => (await b.poolMigrator.query('select ultima_execucao_em, quantidade from rotina_execucao')).rows;

describe('tratarExpurgo', () => {
  it('payload válido → expurga com o prazo da configuração e registra só a quantidade', async () => {
    const de31 = await criarPendente(31);
    const de29 = await criarPendente(29);
    await tratarExpurgo(depsExpurgo(), [{ id: 'job-1', data: {} }]);
    expect(await pendentes()).toEqual([de29]);
    expect(await pendentes()).not.toContain(de31);
    expect(await rotina()).toEqual([{ ultima_execucao_em: relogio.agora(), quantidade: 1 }]);
    expect(registros()).toContainEqual(expect.objectContaining({ evento: 'expurgo_job_tratado', fila: FILAS.retencaoExpurgo, jobId: 'job-1', quantidade: 1 }));
    expect(contemSentinela(linhas.join('\n'))).toBe(false);
  });

  it('payload fora do schema (Zod, C-22) → descartado sem o conteúdo no log e sem expurgo', async () => {
    await criarPendente(31);
    await tratarExpurgo(depsExpurgo(), [
      { id: 'job-2', data: { texto: SENTINELAS.texto } },
      { id: 'job-3', data: null },
    ]);
    expect(await pendentes()).toHaveLength(1);
    expect(await rotina()).toEqual([]);
    expect(registros().filter((r) => r.evento === 'expurgo_payload_invalido').map((r) => r.jobId)).toEqual(['job-2', 'job-3']);
    expect(contemSentinela(linhas.join('\n'))).toBe(false);
  });

  it('erro no expurgo → relança um erro de mensagem fixa, sem causa, com log reduzido', async () => {
    const quebrado: DepsExpurgo = {
      ...depsExpurgo(),
      pool: { connect: async () => Promise.reject(new Error(`banco fora ${SENTINELAS.email}`)) } as unknown as DepsExpurgo['pool'],
    };
    const erro = await tratarExpurgo(quebrado, [{ id: 'job-4', data: {} }]).then(
      () => null,
      (e: unknown) => e as Error,
    );
    expect(erro).toBeInstanceOf(Error);
    expect(erro?.message).toBe('expurgo_erro');
    expect(erro?.cause).toBeUndefined();
    expect(contemSentinela(`${erro?.message}\n${erro?.stack}`)).toBe(false);
    expect(registros()).toContainEqual(expect.objectContaining({ evento: 'expurgo_erro', fila: FILAS.retencaoExpurgo, jobId: 'job-4', erro: { classe: 'Error' } }));
    expect(contemSentinela(linhas.join('\n'))).toBe(false);
  });

  it('prazo fora de 1..365 na configuração → erro de mensagem fixa e nada apagado', async () => {
    await criarPendente(31);
    const erro = await tratarExpurgo({ ...depsExpurgo(), config: { retencaoDias: 0 } }, [{ id: 'job-5', data: {} }]).then(
      () => null,
      (e: unknown) => e as Error,
    );
    expect(erro?.message).toBe('expurgo_erro');
    expect(await pendentes()).toHaveLength(1);
  });
});

describe('no worker', () => {
  async function iniciar(d: DepsWorker = deps) {
    const w = await iniciarWorker(d);
    paradas.push(w.parar);
    return w;
  }
  const estadoDoJob = async (id: string | null) => (await b.poolMigrator.query('select state from pgboss.job where id = $1', [id])).rows[0]?.state;

  it('o worker registra retencao.expurgo: o job agendado expurga e termina concluído', async () => {
    const de31 = await criarPendente(31);
    await iniciar();
    const job = await deps.fila.boss.send(FILAS.retencaoExpurgo, {});
    await expect.poll(() => estadoDoJob(job), { timeout: 15_000 }).toBe('completed');
    expect(await pendentes()).not.toContain(de31);
    expect(await rotina()).toEqual([{ ultima_execucao_em: relogio.agora(), quantidade: 1 }]);
  });

  it('parar() tira também o work de retencao.expurgo: o job enviado depois fica na fila', async () => {
    await criarPendente(31);
    const w = await iniciar();
    await w.parar();
    const job = await deps.fila.boss.send(FILAS.retencaoExpurgo, {});
    await new Promise((r) => setTimeout(r, 2_500));
    expect(await estadoDoJob(job)).toBe('created');
    expect(await pendentes()).toHaveLength(1);
  });
});
