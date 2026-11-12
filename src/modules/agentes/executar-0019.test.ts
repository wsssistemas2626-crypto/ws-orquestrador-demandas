// DEC-DEM-20261112-0019-v1, 03-correcao, M-5 (P2 da 02-triagem): a guarda do worker olha a demanda da entrada (a da
// chave, que montarEntrada lê), falha fechada quando ela falta ou diverge da execução, e o bloqueio por falta de
// confirmação não gasta a chave: a execução volta a `pendente`, sem job, e a confirmação por pessoa a reenfileira. O
// insumo roda uma vez só. O batimento não reenfileira a execução que espera a confirmação. Postgres real, papel do app,
// fila do pg-boss no mesmo banco e o provedor falso. Relógio fixo, duas horas por teste (limite do Awave). Dados fictícios.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/sentry', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../lib/sentry')>()), capturarErro: vi.fn() }));

import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { atorDeIntegracao, CORPO_DO_AWAVE } from '../../../test/integracoes';
import { ProvedorFalso } from '../../../test/provedor-falso';
import { PROMPTS } from '../../agents';
import { comTransacao } from '../../db/transacao';
import { batimento } from '../../jobs/batimento';
import { tratarAgenteExecutar, type JobRecebido } from '../../jobs/agente-executar';
import type { Deps } from '../../lib/deps';
import { relogioFixo } from '../../lib/relogio';
import type { Agente, AtorPessoa } from '../acesso/ator';
import { confirmarDemanda } from '../demandas/confirmar';
import { criarDemandaSchema } from '../demandas/schemas';
import { criarDemanda } from '../demandas/servico';
import { criarExecucao } from './execucoes';
import { executarAgente } from './executar';

const AGORA = '2026-11-12T12:00:00Z';
const MODELO = 'modelo-ficticio';
const HORA = 3_600_000;
const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-exec-0019-cto', nome: 'Pessoa Ficticia 0019', papel: 'cto' };

let b: BancoDeTeste;
let base: Deps;
const relogio = relogioFixo(AGORA);
let provedor: ProvedorFalso;
let passo = 0;

const doAwave = () => criarDemanda(base, atorDeIntegracao('awave'), criarDemandaSchema.parse(CORPO_DO_AWAVE));
const daPessoa = () => criarDemanda(base, cto, criarDemandaSchema.parse({ ...CORPO_DO_AWAVE, solicitanteNome: 'Pessoa Ficticia' }));
const ESP_SEM_DUVIDA = () => ({ ...(PROMPTS.insumo_tecnico.exemploSaida as object), duvidasEmAberto: [] });
const resposta = (saida: unknown) => ({ texto: JSON.stringify(saida), modelo: MODELO, tokensEntrada: 1_000, tokensSaida: 200 });

const novaExecucao = async (agente: Agente, chaveEntrada: string, demandaId: string | null) => {
  const ex = await comTransacao(b.poolApp, (t) => criarExecucao(t, base, { agente, chaveEntrada, demandaId }));
  if (!ex) throw new Error('execução não criada');
  return ex;
};
const ligar = (agente: Agente) => b.poolMigrator.query('update configuracao_agente set ligado = true, modelo = $2 where agente = $1', [agente, MODELO]);
const desligar = (agente: Agente) => b.poolMigrator.query('update configuracao_agente set ligado = false where agente = $1', [agente]);
const execucao = async (id: string) =>
  (
    await b.poolMigrator.query<{ status: string; tentativas: number; proxima_tentativa_em: Date | null; bloqueada_ate: Date | null }>(
      'select status, tentativas, proxima_tentativa_em, bloqueada_ate from execucao_agente where id = $1',
      [id],
    )
  ).rows[0]!;
const contar = async (consulta: string, params: unknown[]) => Number((await b.poolMigrator.query(consulta, params)).rows[0].n);
const usos = (id: string) => contar('select count(*) as n from uso_ia where execucao_agente_id = $1', [id]);
const espsDa = (demandaId: string) => contar('select count(*) as n from especificacao_tecnica where demanda_id = $1', [demandaId]);
const eventosDa = async (id: string) =>
  (
    await b.poolMigrator.query<{ acao: string; ator_tipo: string; depois: unknown }>(
      `select acao, ator_tipo, depois from evento where entidade = 'execucao_agente' and entidade_id = $1 order by id`,
      [id],
    )
  ).rows;
// Os jobs da execução ainda na fila (estado `created`), como o worker os pegaria.
const jobsNaFila = async (execucaoId: string): Promise<JobRecebido[]> =>
  (
    await b.poolMigrator.query<JobRecebido>(
      `select id::text as id, data from pgboss.job where name = 'agente.executar' and state = 'created' and data->>'execucaoId' = $1`,
      [execucaoId],
    )
  ).rows;
// O worker tratou o job: o pg-boss o marca concluído. Sem isto, a política `stately` descartaria o reenvio da mesma
// tentativa enquanto o job antigo estivesse na fila.
const concluirJobs = (execucaoId: string) =>
  b.poolMigrator.query(`update pgboss.job set state = 'completed', completed_on = now() where name = 'agente.executar' and data->>'execucaoId' = $1`, [execucaoId]);
// A passada do worker sobre os jobs da execução na fila, pelo handler que o worker registra.
const passada = async (execucaoId: string): Promise<number> => {
  const jobs = await jobsNaFila(execucaoId);
  await tratarAgenteExecutar({ ...base, provedor }, jobs);
  return jobs.length;
};

beforeAll(async () => {
  b = await novoBanco();
  base = await criarDepsDeTeste(b, { relogio });
  await b.poolMigrator.query(`insert into "user" (id, name, email, papel) values ($1, 'Pessoa Ficticia 0019', 'exec-0019-cto@exemplo.test', 'cto')`, [cto.usuarioId]);
  await b.poolMigrator.query('insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2)', [
    MODELO,
    '2026-10-01T03:00:00Z',
  ]);
});
afterAll(async () => {
  await base.fila.parar();
  await b.fechar();
});
beforeEach(async () => {
  relogio.definir(AGORA);
  relogio.avancar(++passo * 2 * HORA);
  provedor = new ProvedorFalso();
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null');
  await b.poolMigrator.query('update configuracao_ia set teto_mensal = 10 where id = 1');
});

describe('M-5 (a): a guarda usa a demanda da entrada e falha fechada', () => {
  it.each([
    ['de outra demanda (de pessoa)', 'pessoa'],
    ['nula', 'nula'],
  ] as const)('chave demanda:<Awave não confirmada> com demanda_id %s: falhou entrada_nao_encontrada, sem provedor, uso nem ESP', async (_rotulo, tipo) => {
    const d1 = await doAwave();
    const d2 = await daPessoa();
    await ligar('insumo_tecnico');
    provedor.respostas.push(resposta(ESP_SEM_DUVIDA()));
    const id = await novaExecucao('insumo_tecnico', `demanda:${d1.id}`, tipo === 'pessoa' ? d2.id : null);
    expect(await executarAgente({ ...base, provedor }, id)).toBe('falhou');
    expect(provedor.chamadas).toEqual([]);
    expect(await usos(id)).toBe(0);
    expect(await espsDa(d1.id)).toBe(0);
    expect(await espsDa(d2.id)).toBe(0);
    expect((await execucao(id)).status).toBe('falhou');
    expect(await eventosDa(id)).toEqual([
      { acao: 'falha_agente', ator_tipo: 'agente', depois: { agente: 'insumo_tecnico', tentativas: 1, motivo: 'entrada_nao_encontrada' } },
    ]);
  });

  it('a mesma divergência com a demanda da chave já confirmada: falha fechada do mesmo jeito (não há uso legítimo)', async () => {
    const d1 = await doAwave();
    await confirmarDemanda(base, cto, d1.id);
    const d2 = await daPessoa();
    await ligar('insumo_tecnico');
    provedor.respostas.push(resposta(ESP_SEM_DUVIDA()));
    const id = await novaExecucao('insumo_tecnico', `demanda:${d1.id}`, d2.id);
    expect(await executarAgente({ ...base, provedor }, id)).toBe('falhou');
    expect(provedor.chamadas).toEqual([]);
    expect(await espsDa(d1.id)).toBe(0);
    expect(await espsDa(d2.id)).toBe(0);
  });

  it('chave esp: de ESP que não existe: falhou entrada_nao_encontrada, sem provedor', async () => {
    const d = await daPessoa();
    await ligar('risco');
    const id = await novaExecucao('risco', `esp:ESP-${d.id}-v9`, d.id);
    expect(await executarAgente({ ...base, provedor }, id)).toBe('falhou');
    expect(provedor.chamadas).toEqual([]);
    expect((await eventosDa(id)).map((e) => e.depois)).toEqual([{ agente: 'risco', tentativas: 1, motivo: 'entrada_nao_encontrada' }]);
  });

  it('regressão: a execução coerente da demanda de pessoa roda como hoje', async () => {
    const d = await daPessoa();
    await ligar('insumo_tecnico');
    provedor.respostas.push(resposta(ESP_SEM_DUVIDA()));
    const id = await novaExecucao('insumo_tecnico', `demanda:${d.id}`, d.id);
    expect(await executarAgente({ ...base, provedor }, id)).toBe('concluida');
    expect(provedor.chamadas).toHaveLength(1);
    expect(await espsDa(d.id)).toBe(1);
  });
});

describe('M-5 (b): o bloqueio não gasta a chave, e a confirmação dispara uma vez', () => {
  it('execução precoce: aguardando_confirmacao, pendente com as tentativas de antes, sem job novo; confirmada, roda uma vez e grava uma ESP', async () => {
    const d3 = await doAwave();
    await ligar('insumo_tecnico');
    const id = await novaExecucao('insumo_tecnico', `demanda:${d3.id}`, d3.id);
    const jobsAntes = (await jobsNaFila(id)).length;
    expect(jobsAntes).toBe(1);

    expect(await executarAgente({ ...base, provedor }, id)).toBe('aguardando_confirmacao');
    expect(await execucao(id)).toEqual({ status: 'pendente', tentativas: 0, proxima_tentativa_em: null, bloqueada_ate: null });
    expect((await jobsNaFila(id)).length).toBe(jobsAntes);
    expect(provedor.chamadas).toEqual([]);
    expect(await usos(id)).toBe(0);
    expect(await eventosDa(id)).toEqual([{ acao: 'agente_ignorado', ator_tipo: 'sistema', depois: { agente: 'insumo_tecnico', motivo: 'sem_confirmacao' } }]);

    // O worker terminou o job precoce.
    await concluirJobs(id);
    expect(await jobsNaFila(id)).toEqual([]);

    expect(await confirmarDemanda(base, cto, d3.id)).toEqual({ jaConfirmada: false });
    expect((await jobsNaFila(id)).length).toBe(1);
    provedor.respostas.push(resposta(ESP_SEM_DUVIDA()));
    expect(await passada(id)).toBe(1);
    expect(provedor.chamadas).toHaveLength(1);
    expect(await espsDa(d3.id)).toBe(1);
    expect((await execucao(id)).status).toBe('concluida');
    expect(await usos(id)).toBe(1);
  });

  it('confirmação com o insumo desligado: nada é enfileirado, e a execução continua pendente', async () => {
    const d = await doAwave();
    await ligar('insumo_tecnico');
    const id = await novaExecucao('insumo_tecnico', `demanda:${d.id}`, d.id);
    expect(await executarAgente({ ...base, provedor }, id)).toBe('aguardando_confirmacao');
    await concluirJobs(id);
    await desligar('insumo_tecnico');
    expect(await confirmarDemanda(base, cto, d.id)).toEqual({ jaConfirmada: false });
    expect(await jobsNaFila(id)).toEqual([]);
    expect((await execucao(id)).status).toBe('pendente');
    expect(provedor.chamadas).toEqual([]);
  });

  it('duas confirmações seguidas: um job só e uma chamada só ao provedor', async () => {
    const d = await doAwave();
    await ligar('insumo_tecnico');
    const id = await novaExecucao('insumo_tecnico', `demanda:${d.id}`, d.id);
    expect(await executarAgente({ ...base, provedor }, id)).toBe('aguardando_confirmacao');
    await concluirJobs(id);
    expect(await confirmarDemanda(base, cto, d.id)).toEqual({ jaConfirmada: false });
    expect(await confirmarDemanda(base, cto, d.id)).toEqual({ jaConfirmada: true });
    expect((await jobsNaFila(id)).length).toBe(1);
    provedor.respostas.push(resposta(ESP_SEM_DUVIDA()));
    provedor.respostas.push(resposta(ESP_SEM_DUVIDA()));
    expect(await passada(id)).toBe(1);
    expect(provedor.chamadas).toHaveLength(1);
    expect(await espsDa(d.id)).toBe(1);
  });

  it('o bloqueio repetido não esgota as tentativas: depois de quatro bloqueios, a execução ainda roda', async () => {
    const d = await doAwave();
    await ligar('insumo_tecnico');
    const id = await novaExecucao('insumo_tecnico', `demanda:${d.id}`, d.id);
    for (let i = 0; i < 4; i++) expect(await executarAgente({ ...base, provedor }, id)).toBe('aguardando_confirmacao');
    expect((await execucao(id)).tentativas).toBe(0);
    await concluirJobs(id);
    await confirmarDemanda(base, cto, d.id);
    provedor.respostas.push(resposta(ESP_SEM_DUVIDA()));
    expect(await passada(id)).toBe(1);
    expect((await execucao(id)).status).toBe('concluida');
  });
});

describe('M-5: o batimento e a execução que espera a confirmação', () => {
  it('a execução pendente da demanda não confirmada não é reenfileirada pelo batimento; depois da confirmação, é', async () => {
    const d = await doAwave();
    await ligar('insumo_tecnico');
    const id = await novaExecucao('insumo_tecnico', `demanda:${d.id}`, d.id);
    expect(await executarAgente({ ...base, provedor }, id)).toBe('aguardando_confirmacao');
    await concluirJobs(id);

    relogio.avancar(5 * 60_000);
    await batimento(base, 'instancia-ficticia-0019');
    expect(await jobsNaFila(id)).toEqual([]);

    // Confirmada com o insumo desligado (nada enfileirado na hora). A-3 da 04-revisao: enquanto o agente estiver
    // desligado, o batimento também não a reenfileira (o worker a encerraria como `ignorada` e gastaria a chave);
    // religado, ela volta a ser vista pelo batimento.
    await desligar('insumo_tecnico');
    await confirmarDemanda(base, cto, d.id);
    expect(await jobsNaFila(id)).toEqual([]);
    relogio.avancar(5 * 60_000);
    await batimento(base, 'instancia-ficticia-0019');
    expect(await jobsNaFila(id)).toEqual([]);
    await ligar('insumo_tecnico');
    relogio.avancar(5 * 60_000);
    await batimento(base, 'instancia-ficticia-0019');
    expect((await jobsNaFila(id)).length).toBe(1);
  });
});
