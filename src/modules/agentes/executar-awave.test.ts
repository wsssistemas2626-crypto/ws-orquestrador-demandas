// T08 do DEC-DEM-20261111-0016-v1 (IN-06 no worker, D-07, D-18, G8 #26): a execução que chega ao worker para uma demanda
// do Awave ainda não confirmada não chama o provedor (passo 3c, depois do M-02): fica `ignorada`, com `agente_ignorado` e
// motivo `sem_confirmacao`, sem linha em uso_ia. Depois da confirmação, roda como hoje. Postgres real, pelo papel do app,
// fila do pg-boss no mesmo banco e o provedor de IA falso (nenhuma chamada sai da máquina). Relógio fixo. Só dado fictício.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/sentry', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../lib/sentry')>()), capturarErro: vi.fn() }));

import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { atorDeIntegracao, CORPO_DO_AWAVE } from '../../../test/integracoes';
import { ProvedorFalso } from '../../../test/provedor-falso';
import { PROMPTS } from '../../agents';
import { textoDoEvento } from '../../components/rotulos';
import { comTransacao } from '../../db/transacao';
import type { Deps } from '../../lib/deps';
import { relogioFixo } from '../../lib/relogio';
import type { Agente, AtorPessoa } from '../acesso/ator';
import { confirmarDemanda } from '../demandas/confirmar';
import { criarDemandaSchema } from '../demandas/schemas';
import { alterarDemanda, criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { listarHistorico } from '../historico/consultas';
import { criarExecucao } from './execucoes';
import { executarAgente } from './executar';

const AGORA = '2026-10-22T12:00:00Z';
const MODELO = 'modelo-ficticio';
const HORA = 3_600_000;
const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-exec-awave-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };

let b: BancoDeTeste;
let base: Deps;
const relogio = relogioFixo(AGORA);
let provedor: ProvedorFalso;
let passo = 0;

const doAwave = () => criarDemanda(base, atorDeIntegracao('awave'), criarDemandaSchema.parse(CORPO_DO_AWAVE));
const ESP_SEM_DUVIDA = () => ({ ...(PROMPTS.insumo_tecnico.exemploSaida as object), duvidasEmAberto: [] });

const novaExecucao = async (agente: Agente, chaveEntrada: string, demandaId: string) => {
  const ex = await comTransacao(b.poolApp, (t) => criarExecucao(t, base, { agente, chaveEntrada, demandaId }));
  if (!ex) throw new Error('execução não criada');
  return ex;
};
const ligar = (agente: Agente) => b.poolMigrator.query('update configuracao_agente set ligado = true, modelo = $2 where agente = $1', [agente, MODELO]);
const statusDa = async (id: string) => (await b.poolMigrator.query('select status from execucao_agente where id = $1', [id])).rows[0].status as string;
const usos = async (id: string) => Number((await b.poolMigrator.query('select count(*) from uso_ia where execucao_agente_id = $1', [id])).rows[0].count);
const eventosDa = async (id: string) =>
  (
    await b.poolMigrator.query<{ acao: string; ator_tipo: string; ator_id: string; depois: unknown }>(
      `select acao, ator_tipo, ator_id, depois from evento where entidade = 'execucao_agente' and entidade_id = $1 order by id`,
      [id],
    )
  ).rows;
const resposta = (saida: unknown) => ({ texto: JSON.stringify(saida), modelo: MODELO, tokensEntrada: 1_000, tokensSaida: 200 });

beforeAll(async () => {
  b = await novoBanco();
  base = await criarDepsDeTeste(b, { relogio });
  await b.poolMigrator.query(`insert into "user" (id, name, email, papel) values ($1, 'Pessoa Ficticia CTO', 'exec-awave-cto@exemplo.test', 'cto')`, [cto.usuarioId]);
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
  // Começa com os agentes desligados: a execução é inserida à mão, como se tivesse entrado na fila por outro caminho.
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null');
  await b.poolMigrator.query('update configuracao_ia set teto_mensal = 10 where id = 1');
});

describe('IN-06 no worker (D-07): passo 3c', () => {
  // Mudança aprovada (M-5 da 0019, P2 e P5 da 02-triagem): o bloqueio não gasta a chave. O retorno e o status trocam
  // `ignorada` por `aguardando_confirmacao` e `pendente`; a recusa (provedor, uso, ESP e o evento) fica como estava.
  it('insumo técnico na demanda do Awave não confirmada: aguardando_confirmacao (mudança aprovada, M-5 da 0019), agente_ignorado sem_confirmacao, sem provedor nem uso', async () => {
    const dem = await doAwave();
    await ligar('insumo_tecnico');
    provedor.respostas.push(resposta(ESP_SEM_DUVIDA()));
    const id = await novaExecucao('insumo_tecnico', `demanda:${dem.id}`, dem.id);
    expect(await executarAgente({ ...base, provedor }, id)).toBe('aguardando_confirmacao');
    expect(await statusDa(id)).toBe('pendente');
    expect(provedor.chamadas).toEqual([]);
    expect(await usos(id)).toBe(0);
    expect(await eventosDa(id)).toEqual([
      { acao: 'agente_ignorado', ator_tipo: 'sistema', ator_id: 'sistema', depois: { agente: 'insumo_tecnico', motivo: 'sem_confirmacao' } },
    ]);
    expect(Number((await b.poolMigrator.query('select count(*) from especificacao_tecnica where demanda_id = $1', [dem.id])).rows[0].count)).toBe(0);
  });

  it('D-18: o histórico da demanda mostra o motivo com o texto fixo', async () => {
    const dem = await doAwave();
    await ligar('insumo_tecnico');
    const id = await novaExecucao('insumo_tecnico', `demanda:${dem.id}`, dem.id);
    await executarAgente({ ...base, provedor }, id);
    const ev = (await listarHistorico(base.db, dem.id)).find((e) => e.acao === 'agente_ignorado');
    expect(ev).toBeDefined();
    expect(textoDoEvento(ev!)).toBe('Agente de insumo técnico não rodou: demanda aberta pelo Awave ainda não confirmada');
  });

  // Mudança aprovada (M-5 da 0019): o retorno troca `ignorada` por `aguardando_confirmacao`; o resto não muda.
  it('o risco (esp:) na demanda do Awave não confirmada também é recusado (mudança aprovada, M-5 da 0019: aguardando_confirmacao), sem chamar o provedor', async () => {
    const dem = await doAwave();
    const esp = await criarEspecificacao(base, cto, dem.id, criarEspecificacaoSchema.parse(ESP_SEM_DUVIDA()));
    await ligar('risco');
    provedor.respostas.push(resposta(PROMPTS.risco.exemploSaida));
    const id = await novaExecucao('risco', `esp:${esp.id}`, dem.id);
    expect(await executarAgente({ ...base, provedor }, id)).toBe('aguardando_confirmacao');
    expect(provedor.chamadas).toEqual([]);
    expect(await usos(id)).toBe(0);
    expect(await eventosDa(id)).toEqual([
      { acao: 'agente_ignorado', ator_tipo: 'sistema', ator_id: 'sistema', depois: { agente: 'risco', motivo: 'sem_confirmacao' } },
    ]);
  });

  it('M-02 vem antes: a demanda do Awave encerrada sem confirmação sai com o motivo demanda_final', async () => {
    const dem = await doAwave();
    await alterarDemanda(base, cto, dem.id, { status: 'encerrada' });
    await ligar('insumo_tecnico');
    const id = await novaExecucao('insumo_tecnico', `demanda:${dem.id}`, dem.id);
    expect(await executarAgente({ ...base, provedor }, id)).toBe('ignorada');
    expect(await eventosDa(id)).toEqual([
      { acao: 'agente_ignorado', ator_tipo: 'sistema', ator_id: 'sistema', depois: { agente: 'insumo_tecnico', motivo: 'demanda_final' } },
    ]);
  });

  it('depois da confirmação, a mesma execução roda como hoje: chama o provedor, grava a ESP e o uso', async () => {
    const dem = await doAwave();
    // Confirmada com o insumo desligado: o evento entra e nenhuma execução nasce (CA-06.2).
    await confirmarDemanda(base, cto, dem.id);
    await ligar('insumo_tecnico');
    provedor.respostas.push(resposta(ESP_SEM_DUVIDA()));
    const id = await novaExecucao('insumo_tecnico', `demanda:${dem.id}`, dem.id);
    expect(await executarAgente({ ...base, provedor }, id)).toBe('concluida');
    expect(provedor.chamadas).toHaveLength(1);
    expect(await usos(id)).toBe(1);
    expect(Number((await b.poolMigrator.query('select count(*) from especificacao_tecnica where demanda_id = $1', [dem.id])).rows[0].count)).toBe(1);
  });

  it('regressão: a execução da demanda de pessoa não passa pela confirmação', async () => {
    const dem = await criarDemanda(base, cto, criarDemandaSchema.parse({ ...CORPO_DO_AWAVE, solicitanteNome: 'Pessoa Ficticia' }));
    await ligar('insumo_tecnico');
    provedor.respostas.push(resposta(ESP_SEM_DUVIDA()));
    const id = await novaExecucao('insumo_tecnico', `demanda:${dem.id}`, dem.id);
    expect(await executarAgente({ ...base, provedor }, id)).toBe('concluida');
    expect(provedor.chamadas).toHaveLength(1);
  });
});
