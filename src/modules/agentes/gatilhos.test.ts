// Gatilhos dos agentes (T28: RF-16 disparos, RF-19 CA-19.2, C-22) contra o Postgres real, pelo papel do app, com a
// fila do pg-boss no mesmo banco e o provedor de IA falso (RNF-14). Relógio fixo (RNF-15). Dados só fictícios.
// Cada gatilho entra na transação do artefato que o dispara: demanda criada → insumo técnico; ESP sem dúvida → risco;
// RSK com ESP na demanda → consolidação. Agente desligado ou suspenso pelo teto: nada é criado.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { criarDepsDeTeste } from '../../../test/deps';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { ProvedorFalso } from '../../../test/provedor-falso';
import { PROMPTS } from '../../agents';
import { comTransacao } from '../../db/transacao';
import type { Deps } from '../../lib/deps';
import { relogioFixo } from '../../lib/relogio';
import type { Agente, AtorPessoa } from '../acesso/ator';
import { criarDemandaSchema } from '../demandas/schemas';
import { criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { idVersao } from '../versoes';
import { executarAgente } from './executar';
import { ERRO_SEM_FILA, dispararSeLigado, estadoDoAgente, orquestradorDisponivel } from './gatilhos';

const AGORA = '2026-10-22T12:00:00Z';
const MODELO = 'modelo-ficticio';
const HORA = 3_600_000;
const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-gatilho-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };

let b: BancoDeTeste;
let deps: Deps;
const relogio = relogioFixo(AGORA);
let passo = 0;

const ESP_SEM_DUVIDA = () => criarEspecificacaoSchema.parse({ ...(PROMPTS.insumo_tecnico.exemploSaida as object), duvidasEmAberto: [] });
const ESP_COM_DUVIDA = () => criarEspecificacaoSchema.parse({ ...(PROMPTS.insumo_tecnico.exemploSaida as object), duvidasEmAberto: ['Qual ERP o cliente usa?'] });
const RSK = () => criarParecerRiscoSchema.parse(PROMPTS.risco.exemploSaida);

const novaDemanda = () =>
  criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' }));

const ligar = (agente: Agente) => b.poolMigrator.query('update configuracao_agente set ligado = true, modelo = $2 where agente = $1', [agente, MODELO]);
const definirTeto = (v: number) => b.poolMigrator.query('update configuracao_ia set teto_mensal = $1 where id = 1', [v]);

const execucoes = async () =>
  (
    await b.poolMigrator.query<{ id: string; agente: string; chave_entrada: string; demanda_id: string | null; status: string }>(
      'select id, agente, chave_entrada, demanda_id, status from execucao_agente order by criada_em, chave_entrada',
    )
  ).rows;
const jobsDeAgente = async () =>
  (await b.poolMigrator.query<{ data: Record<string, unknown>; singleton_key: string }>(`select data, singleton_key from pgboss.job where name = 'agente.executar' order by created_on, singleton_key`)).rows;

let gastos = 0;
async function gastar(custo: number): Promise<void> {
  const chave = `demanda:DEM-20990101-${String(++gastos).padStart(4, '0')}`;
  const ex = await b.poolMigrator.query(
    `insert into execucao_agente (agente, chave_entrada, status, tentativas, criada_em, atualizada_em) values ('insumo_tecnico', $1, 'falhou', 1, $2, $2) returning id`,
    [chave, relogio.agora()],
  );
  await b.poolMigrator.query(
    `insert into uso_ia (execucao_agente_id, agente, modelo, tokens_entrada, tokens_saida, custo, resultado, ocorrido_em) values ($1, 'insumo_tecnico', $2, 0, 0, $3, 'sucesso', $4)`,
    [ex.rows[0].id, MODELO, custo, relogio.agora()],
  );
}

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  await b.poolMigrator.query(`insert into "user" (id, name, email, papel) values ($1, 'Pessoa Ficticia CTO', 'gatilho-cto@exemplo.test', 'cto')`, [cto.usuarioId]);
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
  // Cada teste duas horas depois do anterior, ainda em outubro (C-36); a base começa sem execução, sem job e sem gasto.
  relogio.definir(AGORA);
  relogio.avancar(++passo * 2 * HORA);
  await b.poolMigrator.query('truncate uso_ia, execucao_agente cascade');
  await b.poolMigrator.query(`delete from pgboss.job where name = 'agente.executar'`);
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null');
  await definirTeto(10);
});

describe('demanda criada → insumo técnico', () => {
  it('CA-19.2: insumo_tecnico desligado → criar demanda não enfileira nada, e a pessoa grava a ESP', async () => {
    const dem = await novaDemanda();
    expect(await execucoes()).toEqual([]);
    expect(await jobsDeAgente()).toEqual([]);
    await expect(criarEspecificacao(deps, cto, dem.id, ESP_SEM_DUVIDA())).resolves.toMatchObject({ versao: 1 });
  });

  it('insumo_tecnico ligado → uma execução demanda:<id> e um job com payload só { execucaoId } (C-22)', async () => {
    await ligar('insumo_tecnico');
    const dem = await novaDemanda();
    const ex = await execucoes();
    expect(ex).toMatchObject([{ agente: 'insumo_tecnico', chave_entrada: `demanda:${dem.id}`, demanda_id: dem.id, status: 'pendente' }]);
    const jobs = await jobsDeAgente();
    expect(jobs).toHaveLength(1);
    expect(Object.keys(jobs[0]!.data)).toEqual(['execucaoId']);
    expect(jobs[0]!.data).toEqual({ execucaoId: ex[0]!.id });
    expect(jobs[0]!.singleton_key).toBe(`insumo_tecnico:demanda:${dem.id}:t1`);
  });

  it('ADR-06: a transação da demanda desfeita leva a execução e o job junto', async () => {
    await ligar('insumo_tecnico');
    await expect(
      comTransacao(b.poolApp, async (t) => {
        await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Desfeita', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' }), t);
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    expect(await execucoes()).toEqual([]);
    expect(await jobsDeAgente()).toEqual([]);
  });
});

describe('ESP → risco', () => {
  it('ESP com dúvida não dispara o risco; ESP sem dúvida dispara', async () => {
    const dem = await novaDemanda();
    await ligar('risco');
    const comDuvida = await criarEspecificacao(deps, cto, dem.id, ESP_COM_DUVIDA());
    expect(await execucoes()).toEqual([]);
    const semDuvida = await criarEspecificacao(deps, cto, dem.id, ESP_SEM_DUVIDA());
    expect(comDuvida.id).toBe(idVersao('ESP', dem.id, 1));
    expect(await execucoes()).toMatchObject([{ agente: 'risco', chave_entrada: `esp:${semDuvida.id}`, demanda_id: dem.id, status: 'pendente' }]);
    expect((await jobsDeAgente()).map((j) => j.singleton_key)).toEqual([`risco:esp:${semDuvida.id}:t1`]);
  });

  it('risco desligado → ESP sem dúvida não dispara nada', async () => {
    const dem = await novaDemanda();
    await criarEspecificacao(deps, cto, dem.id, ESP_SEM_DUVIDA());
    expect(await execucoes()).toEqual([]);
  });
});

describe('RSK → consolidação', () => {
  it('RSK com ESP na demanda dispara a consolidação; RSK sem ESP, não', async () => {
    await ligar('consolidacao');
    const semEsp = await novaDemanda();
    await criarParecerRisco(deps, cto, semEsp.id, RSK());
    expect(await execucoes()).toEqual([]);

    const comEsp = await novaDemanda();
    await criarEspecificacao(deps, cto, comEsp.id, ESP_SEM_DUVIDA());
    const rsk = await criarParecerRisco(deps, cto, comEsp.id, RSK());
    expect(await execucoes()).toMatchObject([{ agente: 'consolidacao', chave_entrada: `rsk:${rsk.id}`, demanda_id: comEsp.id, status: 'pendente' }]);
  });

  it('a ESP com dúvida também conta como ESP na demanda para a consolidação', async () => {
    await ligar('consolidacao');
    const dem = await novaDemanda();
    await criarEspecificacao(deps, cto, dem.id, ESP_COM_DUVIDA());
    const rsk = await criarParecerRisco(deps, cto, dem.id, RSK());
    expect(await execucoes()).toMatchObject([{ agente: 'consolidacao', chave_entrada: `rsk:${rsk.id}` }]);
  });
});

describe('teto e interruptor (RF-18, RF-19)', () => {
  it('suspenso pelo teto → não dispara (teto 0 e gasto igual ao teto)', async () => {
    await ligar('insumo_tecnico');
    await definirTeto(0);
    await novaDemanda();
    expect(await execucoes()).toEqual([]);

    await definirTeto(5);
    await gastar(5);
    await novaDemanda();
    expect((await execucoes()).filter((e) => e.agente === 'insumo_tecnico' && e.status === 'pendente')).toEqual([]);
    expect(await jobsDeAgente()).toEqual([]);

    await definirTeto(10);
    const dem = await novaDemanda();
    expect((await execucoes()).filter((e) => e.status === 'pendente')).toMatchObject([{ chave_entrada: `demanda:${dem.id}` }]);
  });

  it('estadoDoAgente e orquestradorDisponivel: desligado, suspenso e disponível', async () => {
    expect(await estadoDoAgente(deps.db, 'orquestrador', relogio)).toBe('desligado');
    expect(await orquestradorDisponivel(deps.db, relogio)).toBe(false);
    await ligar('orquestrador');
    expect(await estadoDoAgente(deps.db, 'orquestrador', relogio)).toBe('disponivel');
    expect(await orquestradorDisponivel(deps.db, relogio)).toBe(true);
    await definirTeto(0);
    expect(await estadoDoAgente(deps.db, 'orquestrador', relogio)).toBe('suspenso');
    expect(await orquestradorDisponivel(deps.db, relogio)).toBe(false);
  });

  it('dispararSeLigado: desligado → false sem nada criado; ligado → true; a mesma entrada de novo → false, sem 2ª execução', async () => {
    const dem = await novaDemanda();
    const chave = `demanda:${dem.id}`;
    expect(await comTransacao(b.poolApp, (t) => dispararSeLigado(t, deps, 'insumo_tecnico', chave, dem.id))).toBe(false);
    expect(await execucoes()).toEqual([]);
    await ligar('insumo_tecnico');
    expect(await comTransacao(b.poolApp, (t) => dispararSeLigado(t, deps, 'insumo_tecnico', chave, dem.id))).toBe(true);
    expect(await comTransacao(b.poolApp, (t) => dispararSeLigado(t, deps, 'insumo_tecnico', chave, dem.id))).toBe(false);
    expect(await execucoes()).toHaveLength(1);
    expect(await jobsDeAgente()).toHaveLength(1);
  });

  it('dependências sem fila: com o agente desligado, grava normalmente; ligado, falha alto e a demanda não é gravada', async () => {
    const semFila = { db: deps.db, pool: deps.pool, relogio };
    const entrada = criarDemandaSchema.parse({ titulo: 'Sem fila', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' });
    await expect(criarDemanda(semFila, cto, entrada)).resolves.toMatchObject({ status: 'nova' });
    await ligar('insumo_tecnico');
    const antes = Number((await b.poolMigrator.query(`select count(*) from demanda where titulo = 'Sem fila'`)).rows[0].count);
    await expect(criarDemanda(semFila, cto, entrada)).rejects.toThrow(ERRO_SEM_FILA);
    expect(Number((await b.poolMigrator.query(`select count(*) from demanda where titulo = 'Sem fila'`)).rows[0].count)).toBe(antes);
    expect(await execucoes()).toEqual([]);
  });
});

describe('cadeia pelo worker', () => {
  it('a ESP gravada pelo agente de insumo técnico dispara o risco na mesma transação, e o RSK do agente dispara a consolidação', async () => {
    for (const a of ['insumo_tecnico', 'risco', 'consolidacao'] as const) await ligar(a);
    const provedor = new ProvedorFalso();
    provedor.respostas.push(
      { texto: JSON.stringify({ ...(PROMPTS.insumo_tecnico.exemploSaida as object), duvidasEmAberto: [] }), modelo: MODELO, tokensEntrada: 10, tokensSaida: 10 },
      { texto: JSON.stringify(PROMPTS.risco.exemploSaida), modelo: MODELO, tokensEntrada: 10, tokensSaida: 10 },
    );
    const dem = await novaDemanda();
    const [insumo] = await execucoes();
    expect(await executarAgente({ ...deps, provedor }, insumo!.id)).toBe('concluida');
    const esp = idVersao('ESP', dem.id, 1);
    const risco = (await execucoes()).find((e) => e.agente === 'risco');
    expect(risco).toMatchObject({ chave_entrada: `esp:${esp}`, demanda_id: dem.id, status: 'pendente' });
    expect(await executarAgente({ ...deps, provedor }, risco!.id)).toBe('concluida');
    expect((await execucoes()).find((e) => e.agente === 'consolidacao')).toMatchObject({ chave_entrada: `rsk:${idVersao('RSK', dem.id, 1)}`, status: 'pendente' });
  });
});
