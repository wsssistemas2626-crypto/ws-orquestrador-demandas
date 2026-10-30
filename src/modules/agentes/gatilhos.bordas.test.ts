// Casos de borda, falha e concorrência dos gatilhos e da entrada pelo orquestrador (T28, 06-T28-testes): o rollback do
// artefato leva junto a execução e o job do agente seguinte (ADR-06), também na transação do worker; o estado do
// orquestrador que muda entre a leitura e o disparo; o limite por hora (C-36) na saída do orquestrador; a pendente
// convertida duas vezes ao mesmo tempo; marcarPendenteComoFalha sem pendente; a ESP com dúvida gravada pelo agente; a
// pendente sem papel nem origem; e agentesEmAndamento com mais de um agente e mais de uma demanda (T-03). Postgres real
// pelo papel do app, fila do pg-boss no mesmo banco, provedor falso e relógio fixo (RNF-14, RNF-15). Dados só fictícios.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/sentry', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../lib/sentry')>()), capturarErro: vi.fn() }));

import { criarDepsDeTeste } from '../../../test/deps';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { ProvedorFalso } from '../../../test/provedor-falso';
import { PROMPTS } from '../../agents';
import { comTransacao } from '../../db/transacao';
import type { Deps } from '../../lib/deps';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import type { Fila } from '../../lib/fila';
import { relogioFixo } from '../../lib/relogio';
import type { Agente, AtorAgente, AtorPessoa } from '../acesso/ator';
import { obterDemanda } from '../demandas/consultas';
import { MENSAGEM_ORQUESTRADOR_DESLIGADO, MENSAGEM_ORQUESTRADOR_SUSPENSO, entradaSchema, registrarEntrada } from '../demandas/entrada';
import { chaveDaPendente, marcarPendenteComoFalha } from '../demandas/entradas-pendentes';
import { criarDemandaSchema } from '../demandas/schemas';
import { criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { LIMITE_POR_HORA } from '../limites';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { idVersao } from '../versoes';
import { executarAgente, type DepsAgente } from './executar';

const AGORA = '2026-10-22T12:00:00Z';
const MODELO = 'modelo-ficticio';
const HORA = 3_600_000;
const TEXTO = 'Texto ficticio de pedido: os pedidos aparecem duplicados no painel desde a semana passada.';
const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-gatilhos-bordas-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const orquestrador: AtorAgente = { tipo: 'agente', agente: 'orquestrador', prefixoToken: null };
const SAIDA = { ...(PROMPTS.orquestrador.exemploSaida as object), perguntasParaSolicitante: [] } as Record<string, unknown>;

let b: BancoDeTeste;
let deps: Deps;
const relogio = relogioFixo(AGORA);
let provedor: ProvedorFalso;
let passo = 0;

const resposta = (saida: unknown) => ({ texto: JSON.stringify(saida), modelo: MODELO, tokensEntrada: 100, tokensSaida: 50 });
const ESP_SEM_DUVIDA = () => criarEspecificacaoSchema.parse({ ...(PROMPTS.insumo_tecnico.exemploSaida as object), duvidasEmAberto: [] });
const RSK = () => criarParecerRiscoSchema.parse(PROMPTS.risco.exemploSaida);
const DEMANDA = (titulo = 'Pedidos duplicados') => criarDemandaSchema.parse({ titulo, tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' });

const ligar = (a: Agente) => b.poolMigrator.query('update configuracao_agente set ligado = true, modelo = $2 where agente = $1', [a, MODELO]);

const consultar = async <T extends Record<string, unknown>>(texto: string, valores: unknown[] = []) => (await b.poolMigrator.query<T>(texto, valores)).rows;
const contar = async (tabela: string, onde = 'true', valores: unknown[] = []) =>
  Number((await consultar<{ n: string }>(`select count(*)::text as n from ${tabela} where ${onde}`, valores))[0]!.n);
const execucaoPor = async (agente: Agente, chave: string) =>
  (
    await consultar<{ id: string; status: string; demanda_id: string | null; artefato_id: string | null }>(
      'select id, status, demanda_id, artefato_id from execucao_agente where agente = $1 and chave_entrada = $2',
      [agente, chave],
    )
  )[0];
const statusDaPendente = async (id: string) => (await consultar<{ status: string }>('select status from entrada_pendente where id = $1', [id]))[0]?.status;

async function capturar(p: Promise<unknown>): Promise<ErroDominio> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ErroDominio) return e;
    throw e;
  }
  throw new Error('esperava ErroDominio');
}

async function enviarAoAgente(extra: Record<string, unknown> = {}): Promise<string> {
  const r = await registrarEntrada(deps, cto, entradaSchema.parse({ modo: 'agente', texto: TEXTO, solicitanteNome: 'Pessoa Ficticia', solicitantePapel: 'operacoes', ...extra }));
  if (r.tipo !== 'pendente') throw new Error('esperava pendente');
  return r.entradaId;
}
const preencherAMao = (entradaPendenteId: string) =>
  registrarEntrada(deps, cto, entradaSchema.parse({ modo: 'manual', titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia', entradaPendenteId }));

// Fila que envia de verdade (o job entra na transação) e falha logo depois, só para a chave escolhida: simula a última
// gravação da transação dando errado depois de o gatilho já ter criado a execução e o job.
const filaQueFalhaDepoisDoEnvio = (prefixoDaChave: string): Fila => ({
  enviar: async (executor, nome, payload, op) => {
    const id = await deps.fila.enviar(executor, nome, payload, op);
    if (op?.singletonKey?.startsWith(prefixoDaChave)) throw new Error('falha simulada depois do envio');
    return id;
  },
  parar: async () => {},
});

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  await b.poolMigrator.query(`insert into "user" (id, name, email, papel) values ($1, 'Pessoa Ficticia CTO', 'gatilhos-bordas-cto@exemplo.test', 'cto')`, [cto.usuarioId]);
  await b.poolMigrator.query('insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2)', [
    MODELO,
    '2026-10-01T03:00:00Z',
  ]);
});
afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});
beforeEach(async () => {
  // Cada teste duas horas depois do anterior, ainda em outubro: o limite por hora (C-36) de um teste não entra no outro.
  relogio.definir(AGORA);
  relogio.avancar(++passo * 2 * HORA);
  await b.poolMigrator.query('truncate uso_ia');
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null');
  await b.poolMigrator.query('update configuracao_ia set teto_mensal = 10 where id = 1');
  provedor = new ProvedorFalso();
});
afterEach(async () => {
  await b.poolMigrator.query('delete from entrada_pendente');
});

describe('ADR-06: o artefato desfeito leva junto a execução e o job do agente seguinte', () => {
  it('ESP sem dúvida gravada pela pessoa e desfeita → nenhuma execução nem job do risco', async () => {
    const dem = await criarDemanda(deps, cto, DEMANDA());
    await ligar('risco');
    await expect(
      comTransacao(b.poolApp, async (t) => {
        await criarEspecificacao(deps, cto, dem.id, ESP_SEM_DUVIDA(), t);
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    expect(await contar('especificacao_tecnica', 'demanda_id = $1', [dem.id])).toBe(0);
    expect(await contar('execucao_agente', `agente = 'risco' and demanda_id = $1`, [dem.id])).toBe(0);
    expect(await contar('pgboss.job', `name = 'agente.executar' and singleton_key like $1`, [`risco:esp:ESP-${dem.id}-%`])).toBe(0);
  });

  it('RSK gravado pela pessoa com ESP na demanda e desfeito → nenhuma execução nem job da consolidação', async () => {
    const dem = await criarDemanda(deps, cto, DEMANDA());
    await criarEspecificacao(deps, cto, dem.id, ESP_SEM_DUVIDA());
    await ligar('consolidacao');
    await expect(
      comTransacao(b.poolApp, async (t) => {
        await criarParecerRisco(deps, cto, dem.id, RSK(), t);
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    expect(await contar('parecer_risco', 'demanda_id = $1', [dem.id])).toBe(0);
    expect(await contar('execucao_agente', `agente = 'consolidacao' and demanda_id = $1`, [dem.id])).toBe(0);
    expect(await contar('pgboss.job', `name = 'agente.executar' and singleton_key like $1`, [`consolidacao:rsk:RSK-${dem.id}-%`])).toBe(0);
  });

  it('no worker: o RSK do agente de risco desfeito depois de enviar o job da consolidação leva o RSK, a execução e o job juntos', async () => {
    const dem = await criarDemanda(deps, cto, DEMANDA());
    await ligar('risco');
    await ligar('consolidacao');
    const esp = await criarEspecificacao(deps, cto, dem.id, ESP_SEM_DUVIDA());
    const risco = (await execucaoPor('risco', `esp:${esp.id}`))!;
    provedor.respostas.push(resposta(PROMPTS.risco.exemploSaida));
    const depsWorker: DepsAgente = { ...deps, fila: filaQueFalhaDepoisDoEnvio('consolidacao:'), provedor };

    await expect(executarAgente(depsWorker, risco.id)).rejects.toThrow('falha simulada depois do envio');

    expect(provedor.chamadas).toHaveLength(1);
    expect(await contar('parecer_risco', 'demanda_id = $1', [dem.id])).toBe(0);
    expect(await execucaoPor('consolidacao', `rsk:${idVersao('RSK', dem.id, 1)}`)).toBeUndefined();
    expect(await contar('pgboss.job', `name = 'agente.executar' and singleton_key like $1`, [`consolidacao:rsk:RSK-${dem.id}-%`])).toBe(0);
    // A execução do risco não fica concluída sem artefato; a chamada feita fica registrada como erro (CA-17.2).
    expect(await execucaoPor('risco', `esp:${esp.id}`)).toMatchObject({ artefato_id: null });
    expect((await execucaoPor('risco', `esp:${esp.id}`))!.status).not.toBe('concluida');
    expect(await consultar('select resultado from uso_ia where execucao_agente_id = $1', [risco.id])).toEqual([{ resultado: 'erro' }]);
  });

  it('no worker: a demanda do orquestrador desfeita depois de enviar o job do insumo técnico leva a demanda, a execução e o job, e a pendente continua aguardando', async () => {
    await ligar('orquestrador');
    await ligar('insumo_tecnico');
    const id = await enviarAoAgente();
    const ex = (await execucaoPor('orquestrador', chaveDaPendente(id)))!;
    const antes = {
      demandas: await contar('demanda'),
      execucoes: await contar('execucao_agente', `agente = 'insumo_tecnico'`),
      jobs: await contar('pgboss.job', `name = 'agente.executar' and singleton_key like 'insumo_tecnico:%'`),
      brutas: await contar('entrada_bruta'),
    };
    provedor.respostas.push(resposta(SAIDA));

    await expect(executarAgente({ ...deps, fila: filaQueFalhaDepoisDoEnvio('insumo_tecnico:'), provedor }, ex.id)).rejects.toThrow('falha simulada depois do envio');

    expect(provedor.chamadas).toHaveLength(1);
    expect({
      demandas: await contar('demanda'),
      execucoes: await contar('execucao_agente', `agente = 'insumo_tecnico'`),
      jobs: await contar('pgboss.job', `name = 'agente.executar' and singleton_key like 'insumo_tecnico:%'`),
      brutas: await contar('entrada_bruta'),
    }).toEqual(antes);
    expect(await statusDaPendente(id)).toBe('aguardando');
  });
});

describe('modo agente: o estado do orquestrador muda entre a leitura e o disparo', () => {
  // Um gatilho no banco do teste muda o estado logo depois de a pendente ser inserida, na mesma transação: é a outra
  // transação que desliga o agente ou baixa o teto entre as duas leituras de registrarParaOAgente.
  it.each([
    ['o teto cai a zero', `update configuracao_ia set teto_mensal = 0 where id = 1`],
    ['o orquestrador é desligado', `update configuracao_agente set ligado = false where agente = 'orquestrador'`],
  ])('%s → conflito com a mensagem da tela, sem pendente, execução nem job', async (_caso, mudanca) => {
    await ligar('orquestrador');
    const antes = { p: await contar('entrada_pendente'), e: await contar('execucao_agente', `agente = 'orquestrador'`), j: await contar('pgboss.job', `singleton_key like 'orquestrador:%'`) };
    await b.poolMigrator.query(`create function teste_muda_estado() returns trigger language plpgsql security definer as $$ begin ${mudanca}; return new; end $$`);
    await b.poolMigrator.query('create trigger teste_muda_estado after insert on entrada_pendente for each row execute function teste_muda_estado()');
    try {
      const e = await capturar(enviarAoAgente());
      expect(e.codigo).toBe('conflito');
      expect([MENSAGEM_ORQUESTRADOR_DESLIGADO, MENSAGEM_ORQUESTRADOR_SUSPENSO]).toContain(e.mensagem);
    } finally {
      await b.poolMigrator.query('drop trigger teste_muda_estado on entrada_pendente');
      await b.poolMigrator.query('drop function teste_muda_estado()');
    }
    expect({ p: await contar('entrada_pendente'), e: await contar('execucao_agente', `agente = 'orquestrador'`), j: await contar('pgboss.job', `singleton_key like 'orquestrador:%'`) }).toEqual(antes);
    // A mudança do gatilho foi desfeita com a transação: o orquestrador segue disponível para o próximo envio.
    await expect(enviarAoAgente()).resolves.toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('C-36 na saída do orquestrador', () => {
  it('limite de demandas por hora do orquestrador → reagendada com uso erro e a pendente aguardando; passada a hora, a nova tentativa cria a demanda', async () => {
    for (let i = 0; i < LIMITE_POR_HORA.demanda; i++) await criarDemanda(deps, orquestrador, DEMANDA(`Demanda ficticia ${i}`));
    await ligar('orquestrador');
    const id = await enviarAoAgente();
    const ex = (await execucaoPor('orquestrador', chaveDaPendente(id)))!;
    const demandas = await contar('demanda');
    provedor.respostas.push(resposta(SAIDA), resposta(SAIDA));

    expect(await executarAgente({ ...deps, provedor }, ex.id)).toBe('reagendada');
    expect(await contar('demanda')).toBe(demandas);
    expect(await statusDaPendente(id)).toBe('aguardando');
    expect(await execucaoPor('orquestrador', chaveDaPendente(id))).toMatchObject({ status: 'pendente', artefato_id: null });
    expect(await consultar('select resultado from uso_ia where execucao_agente_id = $1', [ex.id])).toEqual([{ resultado: 'erro' }]);
    expect((await consultar<{ k: string }>(`select singleton_key as k from pgboss.job where data->>'execucaoId' = $1 order by singleton_key`, [ex.id])).map((r) => r.k)).toEqual([
      `orquestrador:${chaveDaPendente(id)}:t1`,
      `orquestrador:${chaveDaPendente(id)}:t2`,
    ]);

    relogio.avancar(HORA);
    expect(await executarAgente({ ...deps, provedor }, ex.id)).toBe('concluida');
    expect(await contar('demanda')).toBe(demandas + 1);
    expect(await statusDaPendente(id)).toBeUndefined();
  });
});

describe('a pendente não converte duas vezes', () => {
  it('duas pessoas preenchem à mão a mesma pendente ao mesmo tempo → uma demanda, e a outra recebe nao_encontrado', async () => {
    await ligar('orquestrador');
    const id = await enviarAoAgente();
    const antes = { demandas: await contar('demanda'), brutas: await contar('entrada_bruta') };
    const r = await Promise.allSettled([preencherAMao(id), preencherAMao(id)]);
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
    const recusa = r.find((x) => x.status === 'rejected') as PromiseRejectedResult;
    expect(recusa.reason).toBeInstanceOf(ErroDominio);
    expect(recusa.reason).toMatchObject({ codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
    expect({ demandas: await contar('demanda'), brutas: await contar('entrada_bruta') }).toEqual({ demandas: antes.demandas + 1, brutas: antes.brutas + 1 });
    const criada = (r.find((x) => x.status === 'fulfilled') as PromiseFulfilledResult<Awaited<ReturnType<typeof preencherAMao>>>).value;
    if (criada.tipo !== 'demanda') throw new Error('esperava demanda');
    expect(await consultar('select texto from entrada_bruta where demanda_id = $1', [criada.demanda.id])).toEqual([{ texto: TEXTO }]);
    expect(await statusDaPendente(id)).toBeUndefined();
  });
});

describe('marcarPendenteComoFalha', () => {
  it('pendente já convertida → não falha e não recria linha', async () => {
    await ligar('orquestrador');
    const id = await enviarAoAgente();
    await preencherAMao(id);
    const total = await contar('entrada_pendente');
    await expect(comTransacao(b.poolApp, ({ tx }) => marcarPendenteComoFalha(tx, chaveDaPendente(id)))).resolves.toBeUndefined();
    expect(await statusDaPendente(id)).toBeUndefined();
    expect(await contar('entrada_pendente')).toBe(total);
  });

  it('chave de outro agente ou fora do formato → não toca na pendente que existe', async () => {
    await ligar('orquestrador');
    const id = await enviarAoAgente();
    for (const chave of ['demanda:DEM-20261022-0001', `esp:${id}`, 'entrada:nao-e-uuid', `entrada:${id}x`, `entrada: ${id}`]) {
      await expect(comTransacao(b.poolApp, ({ tx }) => marcarPendenteComoFalha(tx, chave))).resolves.toBeUndefined();
    }
    expect(await statusDaPendente(id)).toBe('aguardando');
  });
});

describe('mais casos do caminho do agente', () => {
  it('ESP com dúvida gravada pelo agente de insumo técnico → demanda aguardando_informacao e nenhum disparo do risco', async () => {
    await ligar('insumo_tecnico');
    await ligar('risco');
    const dem = await criarDemanda(deps, cto, DEMANDA());
    const insumo = (await execucaoPor('insumo_tecnico', `demanda:${dem.id}`))!;
    provedor.respostas.push(resposta({ ...(PROMPTS.insumo_tecnico.exemploSaida as object), duvidasEmAberto: ['Qual ERP o cliente usa?'] }));
    expect(await executarAgente({ ...deps, provedor }, insumo.id)).toBe('concluida');
    expect((await obterDemanda(deps.db, dem.id)).status).toBe('aguardando_informacao');
    expect(await contar('execucao_agente', `agente = 'risco' and demanda_id = $1`, [dem.id])).toBe(0);
    expect(await contar('pgboss.job', `name = 'agente.executar' and singleton_key like $1`, [`risco:esp:ESP-${dem.id}-%`])).toBe(0);
  });

  it('pendente sem papel nem origem → a demanda do orquestrador nasce sem papel e a entrada_bruta sem origem', async () => {
    await ligar('orquestrador');
    const id = await enviarAoAgente({ solicitantePapel: undefined });
    const ex = (await execucaoPor('orquestrador', chaveDaPendente(id)))!;
    provedor.respostas.push(resposta({ ...SAIDA, solicitantePapel: 'financeiro' }));
    expect(await executarAgente({ ...deps, provedor }, ex.id)).toBe('concluida');
    const demandaId = (await execucaoPor('orquestrador', chaveDaPendente(id)))!.artefato_id!;
    const d = await obterDemanda(deps.db, demandaId);
    expect(d.solicitantePapel).toBeNull();
    expect(await consultar('select origem from entrada_bruta where demanda_id = $1', [demandaId])).toEqual([{ origem: null }]);
  });

  it('T-03: agentesEmAndamento lista os agentes da demanda na ordem de criação, sem os de outra demanda nem o orquestrador sem demanda', async () => {
    await ligar('insumo_tecnico');
    const dem = await criarDemanda(deps, cto, DEMANDA('Com dois agentes'));
    relogio.avancar(1_000);
    await ligar('risco');
    await criarEspecificacao(deps, cto, dem.id, ESP_SEM_DUVIDA());
    relogio.avancar(1_000);
    const outra = await criarDemanda(deps, cto, DEMANDA('Outra demanda'));
    await ligar('orquestrador');
    await enviarAoAgente();

    expect((await obterDemanda(deps.db, dem.id)).agentesEmAndamento).toEqual([
      { agente: 'insumo_tecnico', status: 'pendente' },
      { agente: 'risco', status: 'pendente' },
    ]);
    expect((await obterDemanda(deps.db, outra.id)).agentesEmAndamento).toEqual([{ agente: 'insumo_tecnico', status: 'pendente' }]);
  });
});
