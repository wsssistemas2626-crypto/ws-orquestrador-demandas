// T08 do DEC-DEM-20261111-0016-v1 (IN-06, G8 #23 e #25): nenhum agente de IA trabalha na demanda do Awave antes de uma
// pessoa confirmar. A guarda fica na primeira linha de dispararSeLigado e vale para os quatro agentes: ESP sem dúvida
// (risco) e RSK com ESP (consolidação) numa demanda do Awave não confirmada não criam execução nem job. Postgres real,
// pelo papel do app, fila do pg-boss no mesmo banco e o provedor de IA falso. Relógio fixo. Só dado fictício.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { atorDeIntegracao, CORPO_DO_AWAVE } from '../../../test/integracoes';
import { ProvedorFalso } from '../../../test/provedor-falso';
import { PROMPTS } from '../../agents';
import { comTransacao } from '../../db/transacao';
import type { Deps } from '../../lib/deps';
import { relogioFixo } from '../../lib/relogio';
import { AGENTES, type AtorPessoa } from '../acesso/ator';
import { aguardaConfirmacao, jaConfirmada } from '../demandas/confirmacao';
import { confirmarDemanda } from '../demandas/confirmar';
import { criarDemandaSchema } from '../demandas/schemas';
import { criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { executarAgente } from './executar';
import { dispararSeLigado } from './gatilhos';

const AGORA = '2026-10-22T12:00:00Z';
const MODELO = 'modelo-ficticio';
const HORA = 3_600_000;
const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-gatilho-awave-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };

let b: BancoDeTeste;
let deps: Deps;
const relogio = relogioFixo(AGORA);
let passo = 0;

const ESP_SEM_DUVIDA = () => criarEspecificacaoSchema.parse({ ...(PROMPTS.insumo_tecnico.exemploSaida as object), duvidasEmAberto: [] });
const RSK = () => criarParecerRiscoSchema.parse(PROMPTS.risco.exemploSaida);

const doAwave = () => criarDemanda(deps, atorDeIntegracao('awave'), criarDemandaSchema.parse(CORPO_DO_AWAVE));
const daPessoa = () => criarDemanda(deps, cto, criarDemandaSchema.parse({ ...CORPO_DO_AWAVE, solicitanteNome: 'Pessoa Ficticia' }));
const doOrquestrador = () => criarDemanda(deps, { tipo: 'agente', agente: 'orquestrador', prefixoToken: null }, criarDemandaSchema.parse(CORPO_DO_AWAVE));

const ligarTodos = async () => {
  for (const a of AGENTES) await b.poolMigrator.query('update configuracao_agente set ligado = true, modelo = $2 where agente = $1', [a, MODELO]);
};

const execucoesDa = async (demandaId: string) =>
  (
    await b.poolMigrator.query<{ agente: string; chave_entrada: string; status: string }>(
      'select agente, chave_entrada, status from execucao_agente where demanda_id = $1 order by criada_em, chave_entrada',
      [demandaId],
    )
  ).rows;
const jobsDa = async (demandaId: string) =>
  Number(
    (
      await b.poolMigrator.query(
        `select count(*) from pgboss.job j where j.name = 'agente.executar' and j.data->>'execucaoId' in (select id::text from execucao_agente where demanda_id = $1)`,
        [demandaId],
      )
    ).rows[0].count,
  );

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  await b.poolMigrator.query(`insert into "user" (id, name, email, papel) values ($1, 'Pessoa Ficticia CTO', 'gatilho-awave-cto@exemplo.test', 'cto')`, [cto.usuarioId]);
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
  relogio.definir(AGORA);
  relogio.avancar(++passo * 2 * HORA);
  // Os quatro agentes ligados, com preço vigente e teto livre.
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null');
  await ligarTodos();
  await b.poolMigrator.query('update configuracao_ia set teto_mensal = 10 where id = 1');
});

describe('IN-06: nenhum agente antes da confirmação', () => {
  it('ESP sem dúvida e RSK da pessoa na demanda do Awave não confirmada: nenhuma execução, nenhum job, nenhuma chamada ao provedor', async () => {
    const provedor = new ProvedorFalso();
    const dem = await doAwave();
    const esp = await criarEspecificacao(deps, cto, dem.id, ESP_SEM_DUVIDA());
    const rsk = await criarParecerRisco(deps, cto, dem.id, RSK());
    expect(esp.id).toBe(`ESP-${dem.id}-v1`);
    expect(rsk.id).toBe(`RSK-${dem.id}-v1`);
    expect(await execucoesDa(dem.id)).toEqual([]);
    expect(await jobsDa(dem.id)).toBe(0);
    expect(provedor.chamadas).toEqual([]);
  });

  it('dispararSeLigado chamado direto, para cada agente, na demanda do Awave não confirmada: false e nada criado', async () => {
    const dem = await doAwave();
    for (const agente of AGENTES)
      expect(await comTransacao(b.poolApp, (t) => dispararSeLigado(t, deps, agente, `demanda:${dem.id}`, dem.id))).toBe(false);
    expect(await execucoesDa(dem.id)).toEqual([]);
    expect(await jobsDa(dem.id)).toBe(0);
  });

  it('depois da confirmação, uma ESP nova sem dúvida dispara o risco como hoje', async () => {
    const dem = await doAwave();
    await criarEspecificacao(deps, cto, dem.id, ESP_SEM_DUVIDA());
    expect(await execucoesDa(dem.id)).toEqual([]);
    await confirmarDemanda(deps, cto, dem.id);
    const esp2 = await criarEspecificacao(deps, cto, dem.id, ESP_SEM_DUVIDA());
    expect(await execucoesDa(dem.id)).toEqual([
      { agente: 'insumo_tecnico', chave_entrada: `demanda:${dem.id}`, status: 'pendente' },
      { agente: 'risco', chave_entrada: `esp:${esp2.id}`, status: 'pendente' },
    ]);
    expect(await jobsDa(dem.id)).toBe(2);
  });

  it('depois da confirmação, o RSK com ESP dispara a consolidação como hoje', async () => {
    const dem = await doAwave();
    await confirmarDemanda(deps, cto, dem.id);
    await b.poolMigrator.query(`update configuracao_agente set ligado = false where agente in ('insumo_tecnico', 'risco')`);
    await criarEspecificacao(deps, cto, dem.id, ESP_SEM_DUVIDA());
    const rsk = await criarParecerRisco(deps, cto, dem.id, RSK());
    expect((await execucoesDa(dem.id)).filter((e) => e.agente === 'consolidacao')).toEqual([
      { agente: 'consolidacao', chave_entrada: `rsk:${rsk.id}`, status: 'pendente' },
    ]);
  });

  it('regressão: a mesma ESP e o mesmo RSK numa demanda de pessoa disparam como hoje', async () => {
    const dem = await daPessoa();
    const esp = await criarEspecificacao(deps, cto, dem.id, ESP_SEM_DUVIDA());
    const rsk = await criarParecerRisco(deps, cto, dem.id, RSK());
    expect(await execucoesDa(dem.id)).toEqual([
      { agente: 'insumo_tecnico', chave_entrada: `demanda:${dem.id}`, status: 'pendente' },
      { agente: 'risco', chave_entrada: `esp:${esp.id}`, status: 'pendente' },
      { agente: 'consolidacao', chave_entrada: `rsk:${rsk.id}`, status: 'pendente' },
    ]);
  });

  it('regressão: a demanda do agente orquestrador dispara o insumo técnico como hoje, sem confirmação', async () => {
    const dem = await doOrquestrador();
    expect(await execucoesDa(dem.id)).toEqual([{ agente: 'insumo_tecnico', chave_entrada: `demanda:${dem.id}`, status: 'pendente' }]);
  });

  it('entrada sem demanda (orquestrador, demandaId nulo) continua disparando como hoje', async () => {
    const chave = 'entrada:00000000-0000-4000-8000-0000000000a8';
    expect(await comTransacao(b.poolApp, (t) => dispararSeLigado(t, deps, 'orquestrador', chave, null))).toBe(true);
    const { rows } = await b.poolMigrator.query('select agente, demanda_id from execucao_agente where chave_entrada = $1', [chave]);
    expect(rows).toEqual([{ agente: 'orquestrador', demanda_id: null }]);
  });

  it('a execução criada depois da confirmação roda: o worker chama o provedor', async () => {
    const provedor = new ProvedorFalso();
    provedor.respostas.push({ texto: JSON.stringify({ ...(PROMPTS.insumo_tecnico.exemploSaida as object), duvidasEmAberto: [] }), modelo: MODELO, tokensEntrada: 10, tokensSaida: 10 });
    const dem = await doAwave();
    await confirmarDemanda(deps, cto, dem.id);
    const [insumo] = await b.poolMigrator.query<{ id: string }>('select id from execucao_agente where chave_entrada = $1', [`demanda:${dem.id}`]).then((r) => r.rows);
    expect(await executarAgente({ ...deps, provedor }, insumo!.id)).toBe('concluida');
    expect(provedor.chamadas).toHaveLength(1);
  });
});

describe('aguardaConfirmacao e jaConfirmada (G8 #23)', () => {
  it('pessoa e agente não aguardam; Awave aguarda até a confirmação; demanda que não existe não aguarda', async () => {
    const pessoa = await daPessoa();
    const agente = await doOrquestrador();
    const awave = await doAwave();
    expect(await aguardaConfirmacao(deps.db, pessoa.id)).toBe(false);
    expect(await aguardaConfirmacao(deps.db, agente.id)).toBe(false);
    expect(await aguardaConfirmacao(deps.db, awave.id)).toBe(true);
    expect(await aguardaConfirmacao(deps.db, 'DEM-20261022-9999')).toBe(false);
    expect(await jaConfirmada(deps.db, awave.id)).toBe(false);
    await confirmarDemanda(deps, cto, awave.id);
    expect(await jaConfirmada(deps.db, awave.id)).toBe(true);
    expect(await aguardaConfirmacao(deps.db, awave.id)).toBe(false);
  });

  it('a confirmação é a do evento demanda_confirmada da própria demanda: outro evento ou outra demanda não contam', async () => {
    const awave = await doAwave();
    const outra = await doAwave();
    await confirmarDemanda(deps, cto, outra.id);
    // O mesmo id com outra entidade não é a confirmação da demanda.
    await b.poolMigrator.query(
      `insert into evento (ocorrido_em, ator_tipo, ator_id, demanda_id, entidade, entidade_id, acao, depois) values ($1, 'pessoa', $2, $3, 'execucao_agente', $3, 'demanda_confirmada', '{"confirmada":true}')`,
      [relogio.agora(), cto.usuarioId, awave.id],
    );
    expect(await jaConfirmada(deps.db, awave.id)).toBe(false);
    expect(await aguardaConfirmacao(deps.db, awave.id)).toBe(true);
  });
});

describe('falha fechada: autoria fora da lista aguarda confirmação (G8 #23)', () => {
  let b2: BancoDeTeste;
  beforeAll(async () => {
    b2 = await novoBanco();
    // Só neste banco descartável: a linha que o CHECK de verdade recusaria.
    await b2.poolMigrator.query('alter table demanda drop constraint demanda_autor_tipo_check');
    await b2.poolMigrator.query(
      `insert into demanda (id, titulo, tipo, status, solicitante_nome, autor_tipo, autor_id, rascunho_agente, criada_em, atualizada_em)
       values ('DEM-20261022-0801', 'Demanda (fictício)', 'melhoria', 'nova', 'Pessoa Ficticia', 'jarvis', 'jarvis', true, $1, $1)`,
      [AGORA],
    );
  });
  afterAll(async () => {
    await b2.fechar();
  });

  it('autor_tipo desconhecido → true: nenhum agente trabalha na demanda', async () => {
    expect(await aguardaConfirmacao(b2.db, 'DEM-20261022-0801')).toBe(true);
  });
});
