// 06-T08-testes do DEC-DEM-20261111-0016-v1 (qa-automacao): o IN-06 provado de ponta a ponta no servidor, com o provedor
// de fato ligado. O parecer 1 da 06-T08-revisao mostrou que o "nenhuma chamada ao provedor" de gatilhos-awave.test.ts
// confere um ProvedorFalso que nunca é passado ao código. Aqui o provedor falso entra no handler de verdade da fila
// (tratarAgenteExecutar, o mesmo que o worker registra), que recebe todo job agente.executar da demanda. O controle
// positivo, no mesmo teste, prova que a passada alcança o provedor: depois da confirmação, a mesma passada o chama.
// Também: a consolidação (rsk:) no passo 3c e a confirmação atômica com o disparo (G3.8). Postgres real, pelo papel do
// app, fila do pg-boss no mesmo banco. Relógio fixo, duas horas por teste (limite do Awave, IN-09). Só dado fictício.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/sentry', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../lib/sentry')>()), capturarErro: vi.fn() }));

import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { atorDeIntegracao, CORPO_DO_AWAVE } from '../../../test/integracoes';
import { ProvedorFalso } from '../../../test/provedor-falso';
import { PROMPTS } from '../../agents';
import { comTransacao } from '../../db/transacao';
import { tratarAgenteExecutar, type JobRecebido } from '../../jobs/agente-executar';
import type { Deps } from '../../lib/deps';
import type { Fila } from '../../lib/fila';
import { relogioFixo } from '../../lib/relogio';
import { capturarErro } from '../../lib/sentry';
import { AGENTES, type Agente, type AtorPessoa } from '../acesso/ator';
import { aguardaConfirmacao, jaConfirmada } from '../demandas/confirmacao';
import { confirmarDemanda } from '../demandas/confirmar';
import { criarDemandaSchema } from '../demandas/schemas';
import { criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { criarExecucao } from './execucoes';

const AGORA = '2026-10-22T12:00:00Z';
const MODELO = 'modelo-ficticio';
const HORA = 3_600_000;
const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-gatilho-awave-qa-cto', nome: 'Pessoa Ficticia QA', papel: 'cto' };

let b: BancoDeTeste;
let deps: Deps;
const relogio = relogioFixo(AGORA);
let passo = 0;

const ESP_SEM_DUVIDA = () => criarEspecificacaoSchema.parse({ ...(PROMPTS.insumo_tecnico.exemploSaida as object), duvidasEmAberto: [] });
const RSK = () => criarParecerRiscoSchema.parse(PROMPTS.risco.exemploSaida);
const resposta = (saida: unknown) => ({ texto: JSON.stringify(saida), modelo: MODELO, tokensEntrada: 1_000, tokensSaida: 200 });

const doAwave = () => criarDemanda(deps, atorDeIntegracao('awave'), criarDemandaSchema.parse(CORPO_DO_AWAVE));
const daPessoa = () => criarDemanda(deps, cto, criarDemandaSchema.parse({ ...CORPO_DO_AWAVE, solicitanteNome: 'Pessoa Ficticia' }));

const ligar = (agente: Agente) => b.poolMigrator.query('update configuracao_agente set ligado = true, modelo = $2 where agente = $1', [agente, MODELO]);

const execucoesDa = async (demandaId: string) =>
  (
    await b.poolMigrator.query<{ agente: string; chave_entrada: string; status: string }>(
      'select agente, chave_entrada, status from execucao_agente where demanda_id = $1 order by criada_em, chave_entrada',
      [demandaId],
    )
  ).rows;
const usosDa = async (demandaId: string) =>
  Number(
    (await b.poolMigrator.query('select count(*) from uso_ia where execucao_agente_id in (select id from execucao_agente where demanda_id = $1)', [demandaId]))
      .rows[0].count,
  );
const confirmacoesDa = async (demandaId: string) =>
  Number((await b.poolMigrator.query(`select count(*) from evento where acao = 'demanda_confirmada' and entidade_id = $1`, [demandaId])).rows[0].count);
const jobsDa = async (demandaId: string): Promise<JobRecebido[]> =>
  (
    await b.poolMigrator.query<JobRecebido>(
      `select j.id::text as id, j.data from pgboss.job j
        where j.name = 'agente.executar' and j.data->>'execucaoId' in (select id::text from execucao_agente where demanda_id = $1)`,
      [demandaId],
    )
  ).rows;

// A passada do worker: todo job agente.executar desta demanda que está na fila, pelo handler que o worker registra, com o
// provedor falso de fato nas dependências. Devolve quantos jobs passaram.
const passadaDoWorker = async (demandaId: string, provedor: ProvedorFalso): Promise<number> => {
  const jobs = await jobsDa(demandaId);
  await tratarAgenteExecutar({ ...deps, provedor }, jobs);
  return jobs.length;
};

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  await b.poolMigrator.query(`insert into "user" (id, name, email, papel) values ($1, 'Pessoa Ficticia QA', 'gatilho-awave-qa-cto@exemplo.test', 'cto')`, [
    cto.usuarioId,
  ]);
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
  vi.mocked(capturarErro).mockClear();
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null');
  await b.poolMigrator.query('update configuracao_ia set teto_mensal = 10 where id = 1');
});

describe('IN-06 de ponta a ponta: gatilho, fila e worker com o provedor ligado', () => {
  it('ESP e RSK da pessoa na demanda do Awave não confirmada: a passada do worker não chama o provedor; depois da confirmação, a mesma passada chama', async () => {
    for (const a of AGENTES) await ligar(a);
    const provedor = new ProvedorFalso();
    const dem = await doAwave();
    await criarEspecificacao(deps, cto, dem.id, ESP_SEM_DUVIDA());
    await criarParecerRisco(deps, cto, dem.id, RSK());

    // Antes da confirmação: nada na fila para a demanda, e a passada não alcança o provedor nem grava uso.
    expect(await passadaDoWorker(dem.id, provedor)).toBe(0);
    expect(provedor.chamadas).toEqual([]);
    expect(await usosDa(dem.id)).toBe(0);
    expect(await execucoesDa(dem.id)).toEqual([]);

    // Controle positivo: a pessoa confirma, e a mesma passada, com o mesmo provedor, chama o modelo do insumo uma vez.
    await confirmarDemanda(deps, cto, dem.id);
    // A ESP e o RSK gravados antes da confirmação não disparam nada de forma retroativa: só o insumo da confirmação.
    expect(await execucoesDa(dem.id)).toEqual([{ agente: 'insumo_tecnico', chave_entrada: `demanda:${dem.id}`, status: 'pendente' }]);
    provedor.respostas.push(resposta({ ...(PROMPTS.insumo_tecnico.exemploSaida as object), duvidasEmAberto: [] }));
    expect(await passadaDoWorker(dem.id, provedor)).toBe(1);
    expect(provedor.chamadas).toHaveLength(1);
    expect(provedor.chamadas[0]!.sistema).toBe(PROMPTS.insumo_tecnico.sistema);
    expect((await execucoesDa(dem.id)).find((e) => e.chave_entrada === `demanda:${dem.id}`)?.status).toBe('concluida');
    expect(await usosDa(dem.id)).toBe(1);
    expect(capturarErro).not.toHaveBeenCalled();
  });

  it('consolidação (rsk:) que chega à fila numa demanda do Awave não confirmada: o handler a deixa ignorada sem_confirmacao, sem provedor nem uso', async () => {
    await ligar('consolidacao');
    const provedor = new ProvedorFalso();
    provedor.respostas.push(resposta(PROMPTS.consolidacao.exemploSaida));
    const dem = await doAwave();
    await criarEspecificacao(deps, cto, dem.id, ESP_SEM_DUVIDA());
    const rsk = await criarParecerRisco(deps, cto, dem.id, RSK());
    expect(await execucoesDa(dem.id)).toEqual([]);
    // Como se a execução tivesse entrado por outro caminho: criada à mão, com o job na fila (defesa em profundidade, D-07).
    const id = await comTransacao(b.poolApp, (t) => criarExecucao(t, deps, { agente: 'consolidacao', chaveEntrada: `rsk:${rsk.id}`, demandaId: dem.id }));
    expect(id).not.toBeNull();

    expect(await passadaDoWorker(dem.id, provedor)).toBe(1);
    expect(provedor.chamadas).toEqual([]);
    expect(await usosDa(dem.id)).toBe(0);
    // Mudança aprovada (M-5 da 0019, pendência da 02-triagem): a execução bloqueada volta a `pendente` em vez de ficar
    // `ignorada`; provedor não chamado, uso zero e o evento continuam exigidos.
    expect(await execucoesDa(dem.id)).toEqual([{ agente: 'consolidacao', chave_entrada: `rsk:${rsk.id}`, status: 'pendente' }]);
    const { rows } = await b.poolMigrator.query(`select acao, ator_tipo, depois from evento where entidade = 'execucao_agente' and entidade_id = $1`, [id]);
    expect(rows).toEqual([{ acao: 'agente_ignorado', ator_tipo: 'sistema', depois: { agente: 'consolidacao', motivo: 'sem_confirmacao' } }]);
    expect(capturarErro).not.toHaveBeenCalled();
  });

  it('controle da consolidação: na demanda de pessoa, o RSK dispara pelo gatilho e a mesma passada chama o provedor com o prompt da consolidação', async () => {
    await ligar('consolidacao');
    const provedor = new ProvedorFalso();
    provedor.respostas.push(resposta(PROMPTS.consolidacao.exemploSaida));
    const dem = await daPessoa();
    await criarEspecificacao(deps, cto, dem.id, ESP_SEM_DUVIDA());
    const rsk = await criarParecerRisco(deps, cto, dem.id, RSK());
    expect(await execucoesDa(dem.id)).toEqual([{ agente: 'consolidacao', chave_entrada: `rsk:${rsk.id}`, status: 'pendente' }]);

    expect(await passadaDoWorker(dem.id, provedor)).toBe(1);
    expect(provedor.chamadas).toHaveLength(1);
    expect(provedor.chamadas[0]!.sistema).toBe(PROMPTS.consolidacao.sistema);
    expect(await usosDa(dem.id)).toBe(1);
  });
});

describe('RF-06: o evento e o disparo saem juntos (mesma transação)', () => {
  it('o envio do job falha com o insumo ligado: a confirmação não fica gravada, e a seguinte confirma e dispara', async () => {
    await ligar('insumo_tecnico');
    const dem = await doAwave();
    const filaQueFalha: Fila = {
      enviar: () => Promise.reject(new Error('fila indisponível (fictício)')),
      parar: async () => {},
    };
    await expect(confirmarDemanda({ ...deps, fila: filaQueFalha }, cto, dem.id)).rejects.toThrow('fila indisponível (fictício)');
    expect(await confirmacoesDa(dem.id)).toBe(0);
    expect(await execucoesDa(dem.id)).toEqual([]);
    expect(await jaConfirmada(deps.db, dem.id)).toBe(false);
    expect(await aguardaConfirmacao(deps.db, dem.id)).toBe(true);

    expect(await confirmarDemanda(deps, cto, dem.id)).toEqual({ jaConfirmada: false });
    expect(await confirmacoesDa(dem.id)).toBe(1);
    expect(await execucoesDa(dem.id)).toEqual([{ agente: 'insumo_tecnico', chave_entrada: `demanda:${dem.id}`, status: 'pendente' }]);
    expect(await jobsDa(dem.id)).toHaveLength(1);
  });

  it('G3.8: na transação de quem chama, desfeita depois, não sobra evento, execução nem job', async () => {
    await ligar('insumo_tecnico');
    const dem = await doAwave();
    await expect(
      comTransacao(b.poolApp, async (t) => {
        expect(await confirmarDemanda(deps, cto, dem.id, t)).toEqual({ jaConfirmada: false });
        // Dentro da transação, a confirmação e a execução já existem para quem lê por ela.
        expect(await jaConfirmada(t.tx, dem.id)).toBe(true);
        throw new Error('desfaz (fictício)');
      }),
    ).rejects.toThrow('desfaz (fictício)');
    expect(await confirmacoesDa(dem.id)).toBe(0);
    expect(await execucoesDa(dem.id)).toEqual([]);
    expect(await jobsDa(dem.id)).toEqual([]);
    expect(await aguardaConfirmacao(deps.db, dem.id)).toBe(true);
  });
});
