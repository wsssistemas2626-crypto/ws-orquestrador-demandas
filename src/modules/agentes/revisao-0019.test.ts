// DEC-DEM-20261112-0019-v1, 04-correcao (04-maestro.md). A execução adiada até a confirmação (M-5 da 0019):
// - A-3: confirmada com o agente indisponível (desligado ou suspenso pelo teto), ela não é reenfileirada pelo batimento
//   (o worker a encerraria como `ignorada` e gastaria a chave); quando o agente volta, o batimento a reenfileira e o
//   insumo roda uma vez;
// - M-a: a decisão de adiar é refeita sob a trava da demanda; a confirmação que entra entre a primeira olhada e o adiamento
//   não deixa a execução pendente sem job: ela segue e roda;
// - M-b: o reenfileiramento da confirmação atualiza `atualizada_em`, e o batimento não manda o job em dobro.
// Postgres real, papel do app, fila do pg-boss no mesmo banco e o provedor falso. Relógio fixo. Dados fictícios.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/sentry', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../lib/sentry')>()), capturarErro: vi.fn() }));
// Só para provocar a corrida do M-a: a primeira olhada do worker vê "aguarda", e a confirmação entra logo depois dela.
// Fora do caso que pede, a função é a de verdade.
vi.mock('../demandas/confirmacao', async (importOriginal) => {
  const real = await importOriginal<typeof import('../demandas/confirmacao')>();
  return { ...real, aguardaConfirmacao: vi.fn(real.aguardaConfirmacao) };
});

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
import { aguardaConfirmacao } from '../demandas/confirmacao';
import { confirmarDemanda } from '../demandas/confirmar';
import { criarDemandaSchema } from '../demandas/schemas';
import { criarDemanda } from '../demandas/servico';
import { criarExecucao } from './execucoes';
import { executarAgente } from './executar';

const AGORA = '2026-11-12T12:00:00Z';
const MODELO = 'modelo-ficticio';
const HORA = 3_600_000;
const INSTANCIA = 'instancia-ficticia-0019-revisao';
const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-rev-0019-cto', nome: 'Pessoa Ficticia 0019', papel: 'cto' };

let b: BancoDeTeste;
let base: Deps;
const relogio = relogioFixo(AGORA);
let provedor: ProvedorFalso;
let passo = 0;

const doAwave = () => criarDemanda(base, atorDeIntegracao('awave'), criarDemandaSchema.parse(CORPO_DO_AWAVE));
const ESP_SEM_DUVIDA = () => ({ ...(PROMPTS.insumo_tecnico.exemploSaida as object), duvidasEmAberto: [] });
const resposta = (saida: unknown) => ({ texto: JSON.stringify(saida), modelo: MODELO, tokensEntrada: 1_000, tokensSaida: 200 });

const novaExecucao = async (agente: Agente, chaveEntrada: string, demandaId: string | null) => {
  const ex = await comTransacao(b.poolApp, (t) => criarExecucao(t, base, { agente, chaveEntrada, demandaId }));
  if (!ex) throw new Error('execução não criada');
  return ex;
};
const ligar = (agente: Agente) => b.poolMigrator.query('update configuracao_agente set ligado = true, modelo = $2 where agente = $1', [agente, MODELO]);
const desligar = (agente: Agente) => b.poolMigrator.query('update configuracao_agente set ligado = false where agente = $1', [agente]);
const teto = (valor: number) => b.poolMigrator.query('update configuracao_ia set teto_mensal = $1 where id = 1', [valor]);
const execucao = async (id: string) =>
  (await b.poolMigrator.query<{ status: string; tentativas: number; atualizada_em: Date }>('select status, tentativas, atualizada_em from execucao_agente where id = $1', [id]))
    .rows[0]!;
const contar = async (consulta: string, params: unknown[]) => Number((await b.poolMigrator.query(consulta, params)).rows[0].n);
const espsDa = (demandaId: string) => contar('select count(*) as n from especificacao_tecnica where demanda_id = $1', [demandaId]);
const eventosDa = async (id: string) =>
  (await b.poolMigrator.query<{ acao: string; depois: unknown }>(`select acao, depois from evento where entidade = 'execucao_agente' and entidade_id = $1 order by id`, [id]))
    .rows;
const jobsNaFila = async (execucaoId: string): Promise<JobRecebido[]> =>
  (
    await b.poolMigrator.query<JobRecebido>(
      `select id::text as id, data from pgboss.job where name = 'agente.executar' and state = 'created' and data->>'execucaoId' = $1`,
      [execucaoId],
    )
  ).rows;
// Todos os jobs da execução que ainda não terminaram (na fila ou com o worker).
const jobsVivos = (execucaoId: string) =>
  contar(`select count(*) as n from pgboss.job where name = 'agente.executar' and state in ('created', 'retry', 'active') and data->>'execucaoId' = $1`, [execucaoId]);
const concluirJobs = (execucaoId: string) =>
  b.poolMigrator.query(`update pgboss.job set state = 'completed', completed_on = now() where name = 'agente.executar' and data->>'execucaoId' = $1`, [execucaoId]);
// O worker pegou o job (pg-boss o marca ativo).
const pegarJobs = (execucaoId: string) =>
  b.poolMigrator.query(`update pgboss.job set state = 'active', started_on = now() where name = 'agente.executar' and state = 'created' and data->>'execucaoId' = $1`, [
    execucaoId,
  ]);
const passada = async (execucaoId: string): Promise<number> => {
  const jobs = await jobsNaFila(execucaoId);
  await tratarAgenteExecutar({ ...base, provedor }, jobs);
  return jobs.length;
};

// A execução precoce numa demanda do Awave não confirmada, já devolvida a pendente pelo worker, e o job dela concluído.
async function adiada(): Promise<{ demandaId: string; id: string }> {
  const d = await doAwave();
  await ligar('insumo_tecnico');
  const id = await novaExecucao('insumo_tecnico', `demanda:${d.id}`, d.id);
  expect(await executarAgente({ ...base, provedor }, id)).toBe('aguardando_confirmacao');
  await concluirJobs(id);
  return { demandaId: d.id, id };
}

beforeAll(async () => {
  b = await novoBanco();
  base = await criarDepsDeTeste(b, { relogio });
  await b.poolMigrator.query(`insert into "user" (id, name, email, papel) values ($1, 'Pessoa Ficticia 0019', 'rev-0019-cto@exemplo.test', 'cto')`, [cto.usuarioId]);
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
  await teto(10);
});

describe('A-3: confirmada com o agente indisponível, a execução adiada não gasta a chave e roda quando ele volta', () => {
  it('desligado: o batimento não a reenfileira; religado, o batimento a reenfileira e o insumo roda uma vez', async () => {
    const { demandaId, id } = await adiada();
    await desligar('insumo_tecnico');
    expect(await confirmarDemanda(base, cto, demandaId)).toEqual({ jaConfirmada: false });
    expect(await jobsNaFila(id)).toEqual([]);

    relogio.avancar(5 * 60_000);
    await batimento(base, INSTANCIA);
    expect(await jobsNaFila(id)).toEqual([]);
    expect((await execucao(id)).status).toBe('pendente');

    await ligar('insumo_tecnico');
    relogio.avancar(5 * 60_000);
    await batimento(base, INSTANCIA);
    expect((await jobsNaFila(id)).length).toBe(1);
    provedor.respostas.push(resposta(ESP_SEM_DUVIDA()));
    provedor.respostas.push(resposta(ESP_SEM_DUVIDA()));
    expect(await passada(id)).toBe(1);
    expect(provedor.chamadas).toHaveLength(1);
    expect(await espsDa(demandaId)).toBe(1);
    expect((await execucao(id)).status).toBe('concluida');
    // Nenhum `agente_ignorado` com `desligado`: a chave não foi gasta no caminho.
    expect((await eventosDa(id)).map((e) => e.acao)).not.toContain('falha_agente');
    expect((await eventosDa(id)).filter((e) => (e.depois as { motivo?: string } | null)?.motivo === 'desligado')).toEqual([]);

    // Concluída (e o job tratado marcado concluído, como o pg-boss faz), o batimento não a manda de novo.
    await concluirJobs(id);
    relogio.avancar(5 * 60_000);
    await batimento(base, INSTANCIA);
    expect(await jobsNaFila(id)).toEqual([]);
  });

  it('suspenso pelo teto: o mesmo; com o teto de volta, roda uma vez', async () => {
    const { demandaId, id } = await adiada();
    await teto(0);
    await confirmarDemanda(base, cto, demandaId);
    relogio.avancar(5 * 60_000);
    await batimento(base, INSTANCIA);
    expect(await jobsNaFila(id)).toEqual([]);
    expect((await execucao(id)).status).toBe('pendente');

    await teto(10);
    relogio.avancar(5 * 60_000);
    await batimento(base, INSTANCIA);
    provedor.respostas.push(resposta(ESP_SEM_DUVIDA()));
    expect(await passada(id)).toBe(1);
    expect(provedor.chamadas).toHaveLength(1);
    expect(await espsDa(demandaId)).toBe(1);
    expect((await execucao(id)).status).toBe('concluida');
  });

  it('regressão: a pendente comum (não adiada) de agente desligado continua sendo reenfileirada pelo batimento, como na 0.3.0', async () => {
    const d = await criarDemanda(base, cto, criarDemandaSchema.parse({ ...CORPO_DO_AWAVE, solicitanteNome: 'Pessoa Ficticia' }));
    await ligar('insumo_tecnico');
    const id = await novaExecucao('insumo_tecnico', `demanda:${d.id}`, d.id);
    await concluirJobs(id);
    await desligar('insumo_tecnico');
    relogio.avancar(5 * 60_000);
    await batimento(base, INSTANCIA);
    expect((await jobsNaFila(id)).length).toBe(1);
  });
});

describe('M-a: a decisão de adiar é refeita sob a trava da demanda', () => {
  it('a confirmação entra entre a primeira olhada e o adiamento: a execução segue e roda uma vez, sem ficar pendente sem job', async () => {
    const d = await doAwave();
    await ligar('insumo_tecnico');
    const id = await novaExecucao('insumo_tecnico', `demanda:${d.id}`, d.id);
    await concluirJobs(id);
    vi.mocked(aguardaConfirmacao).mockImplementationOnce(async () => {
      // A primeira olhada viu "aguarda"; a pessoa confirma antes de o worker adiar.
      await confirmarDemanda(base, cto, d.id);
      return true;
    });
    provedor.respostas.push(resposta(ESP_SEM_DUVIDA()));
    expect(await executarAgente({ ...base, provedor }, id)).toBe('concluida');
    expect(provedor.chamadas).toHaveLength(1);
    expect(await espsDa(d.id)).toBe(1);
    expect((await execucao(id)).status).toBe('concluida');
    expect((await eventosDa(id)).map((e) => e.acao)).not.toContain('agente_ignorado');
  });

  it('sem confirmação, a segunda olhada (sob a trava) confirma o adiamento: pendente, sem provedor', async () => {
    const { id } = await adiada();
    expect((await execucao(id)).status).toBe('pendente');
    expect(provedor.chamadas).toEqual([]);
  });
});

describe('M-b: o reenfileiramento da confirmação atualiza atualizada_em', () => {
  it('confirmada minutos depois do adiamento: atualizada_em é a hora da confirmação, e o batimento seguinte não manda outro job', async () => {
    const { demandaId, id } = await adiada();
    relogio.avancar(5 * 60_000);
    const horaDaConfirmacao = relogio.agora();
    await confirmarDemanda(base, cto, demandaId);
    expect((await execucao(id)).atualizada_em).toEqual(horaDaConfirmacao);
    expect((await jobsNaFila(id)).length).toBe(1);
    // O worker pegou o job da confirmação e ainda não terminou.
    await pegarJobs(id);
    expect(await batimento(base, INSTANCIA)).toEqual({ reenfileiradas: 0 });
    expect(await jobsVivos(id)).toBe(1);
  });
});
