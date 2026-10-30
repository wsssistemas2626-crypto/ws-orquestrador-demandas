// Casos de borda, falha e concorrência da execução de agente (T27, 06-T27-testes): recusa do serviço que não é saída
// inválida, limite por hora (C-36), execução perdida no reagendamento e na falha, teto e interruptor conferidos antes de
// cada tentativa (RNF-07, CA-19.4), virada do mês em São Paulo (CA-18.2), as três tentativas pelo erro transitório,
// sucesso na última tentativa, resposta fora do envelope e o handler da fila com o payload real do job (contrato do envio
// com a leitura). Postgres real pelo papel do app, provedor falso e relógio fixo (RNF-14, RNF-15). Dados só fictícios.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/sentry', async (importOriginal) => ({ ...(await importOriginal<typeof import('../../lib/sentry')>()), capturarErro: vi.fn() }));

import { criarDepsDeTeste } from '../../../test/deps';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { ProvedorFalso } from '../../../test/provedor-falso';
import { SENTINELAS, contemSentinela } from '../../../test/sentinelas';
import { PROMPTS } from '../../agents';
import { comTransacao } from '../../db/transacao';
import type { Deps } from '../../lib/deps';
import { substituirDestinoDoLog } from '../../lib/log';
import { relogioFixo } from '../../lib/relogio';
import { capturarErro } from '../../lib/sentry';
import { tratarAgenteExecutar } from '../../jobs/agente-executar';
import type { Agente, AtorAgente, AtorPessoa } from '../acesso/ator';
import { criarDemandaSchema } from '../demandas/schemas';
import { criarDemanda } from '../demandas/servico';
import { criarEspecificacaoSchema } from '../especificacoes/schemas';
import { criarEspecificacao } from '../especificacoes/servico';
import { criarParecerRiscoSchema } from '../pareceres-risco/schemas';
import { criarParecerRisco } from '../pareceres-risco/servico';
import { LIMITE_POR_HORA } from '../limites';
import { idVersao } from '../versoes';
import { criarExecucao, TRAVA_MS } from './execucoes';
import { executarAgente, type DepsAgente } from './executar';
import { ErroProvedor, type ProvedorIA, type RespostaDoProvedor } from './provedor';

const AGORA = '2026-10-22T12:00:00Z';
const MODELO = 'modelo-ficticio';
const HORA = 3_600_000;
const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-bordas-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const agenteRisco: AtorAgente = { tipo: 'agente', agente: 'risco', prefixoToken: null };

let b: BancoDeTeste;
let base: Deps;
const relogio = relogioFixo(AGORA);
let provedor: ProvedorFalso;
let deps: DepsAgente;
let passo = 0;
let dem: { id: string };
let esp: { id: string };

// --- ajudantes ---

const resposta = (saida: unknown, extra: Partial<RespostaDoProvedor> = {}): RespostaDoProvedor => ({
  texto: typeof saida === 'string' ? saida : JSON.stringify(saida),
  modelo: MODELO,
  tokensEntrada: 1_000,
  tokensSaida: 200,
  ...extra,
});
const RSK_VALIDO = PROMPTS.risco.exemploSaida;
const FORA_DO_SCHEMA = { resumo: SENTINELAS.texto, riscoTecnicoNivel: 'altissimo' };

const novaDemanda = () =>
  criarDemanda(base, cto, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' }));
const espDaPessoa = (demandaId: string) =>
  criarEspecificacao(
    base,
    cto,
    demandaId,
    criarEspecificacaoSchema.parse({ ...(PROMPTS.insumo_tecnico.exemploSaida as object), descricaoObjetiva: `Descrição com ${SENTINELAS.texto}` }),
  );

const novaExecucao = (agente: Agente = 'risco', chaveEntrada = `esp:${esp.id}`, demandaId: string | null = dem.id) =>
  comTransacao(b.poolApp, (t) => criarExecucao(t, base, { agente, chaveEntrada, demandaId }));

const execucao = async (id: string) =>
  (
    await b.poolMigrator.query<{ status: string; tentativas: number; proxima_tentativa_em: Date | null; bloqueada_ate: Date | null; artefato_id: string | null }>(
      'select status, tentativas, proxima_tentativa_em, bloqueada_ate, artefato_id from execucao_agente where id = $1',
      [id],
    )
  ).rows[0]!;
const usos = async (id: string) =>
  (
    await b.poolMigrator.query<{ demanda_id: string | null; modelo: string; tokens_entrada: number; tokens_saida: number; custo: string; resultado: string }>(
      'select demanda_id, modelo, tokens_entrada, tokens_saida, custo, resultado from uso_ia where execucao_agente_id = $1 order by ocorrido_em, id',
      [id],
    )
  ).rows;
const jobs = async (id: string) =>
  (
    await b.poolMigrator.query<{ data: unknown; singleton_key: string; start_after: Date }>(
      `select data, singleton_key, start_after from pgboss.job where name = 'agente.executar' and data->>'execucaoId' = $1 order by singleton_key`,
      [id],
    )
  ).rows;
const eventosDa = async (id: string) =>
  (
    await b.poolMigrator.query<{ acao: string; ator_tipo: string; ator_id: string; demanda_id: string | null; depois: unknown }>(
      `select acao, ator_tipo, ator_id, demanda_id, depois from evento where entidade = 'execucao_agente' and entidade_id = $1 order by id`,
      [id],
    )
  ).rows;
const contarRsk = async (demandaId: string) =>
  Number((await b.poolMigrator.query('select count(*) from parecer_risco where demanda_id = $1', [demandaId])).rows[0].count);

const ligar = (agente: Agente, modelo = MODELO) => b.poolMigrator.query('update configuracao_agente set ligado = true, modelo = $2 where agente = $1', [agente, modelo]);
const desligar = (agente: Agente) => b.poolMigrator.query('update configuracao_agente set ligado = false where agente = $1', [agente]);
const definirTeto = (v: number) => b.poolMigrator.query('update configuracao_ia set teto_mensal = $1 where id = 1', [v]);
let gastos = 0;
// Gasto já feito no mês: uma execução qualquer e o uso dela, pelo migrator, na hora do relógio.
async function gastar(custo: number): Promise<void> {
  const chave = `demanda:DEM-20990102-${String(++gastos).padStart(4, '0')}`;
  const ex = await b.poolMigrator.query(
    `insert into execucao_agente (agente, chave_entrada, status, tentativas, criada_em, atualizada_em) values ('insumo_tecnico', $1, 'falhou', 1, $2, $2) returning id`,
    [chave, relogio.agora()],
  );
  await b.poolMigrator.query(
    `insert into uso_ia (execucao_agente_id, agente, modelo, tokens_entrada, tokens_saida, custo, resultado, ocorrido_em) values ($1, 'insumo_tecnico', $2, 0, 0, $3, 'sucesso', $4)`,
    [ex.rows[0].id, MODELO, custo, relogio.agora()],
  );
}

// Provedor que, no meio da chamada, deixa a trava vencer e põe outro worker para rodar a mesma execução até o fim.
function provedorQuePerdeAExecucao(id: string, doOutro: RespostaDoProvedor, minha: RespostaDoProvedor | Error) {
  const outro = new ProvedorFalso();
  outro.respostas.push(doOutro);
  const estado: { interna?: string } = {};
  const lento: ProvedorIA = {
    gerar: async () => {
      relogio.avancar(TRAVA_MS + 1);
      estado.interna = await executarAgente({ ...base, provedor: outro }, id);
      if (minha instanceof Error) throw minha;
      return minha;
    },
  };
  return { lento, estado };
}

beforeAll(async () => {
  b = await novoBanco();
  base = await criarDepsDeTeste(b, { relogio });
  await b.poolMigrator.query(`insert into "user" (id, name, email, papel) values ($1, 'Pessoa Ficticia CTO', 'bordas-cto@exemplo.test', 'cto')`, [cto.usuarioId]);
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
  // Cada teste duas horas depois do anterior, seja qual for a ordem: o limite por hora (C-36) de um não entra no outro.
  relogio.definir(AGORA);
  relogio.avancar(++passo * 2 * HORA);
  await b.poolMigrator.query('truncate uso_ia');
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null');
  await ligar('risco');
  await definirTeto(10);
  provedor = new ProvedorFalso();
  deps = { ...base, provedor };
  dem = await novaDemanda();
  esp = await espDaPessoa(dem.id);
  vi.mocked(capturarErro).mockClear();
});
afterEach(() => substituirDestinoDoLog(null));

describe('recusa do serviço depois de o schema passar (pendências da 06-T27-revisao)', () => {
  it('execução sem demanda (demandaId nulo) → nao_encontrado no gravar: falhou com recusada_pelo_servico, uso erro, sem artefato nem nova tentativa', async () => {
    provedor.respostas.push(resposta(RSK_VALIDO));
    const id = (await novaExecucao('risco', `esp:${esp.id}`, null))!;
    expect(await executarAgente(deps, id)).toBe('falhou');

    expect(provedor.chamadas).toHaveLength(1);
    expect(await contarRsk(dem.id)).toBe(0);
    expect(await execucao(id)).toMatchObject({ status: 'falhou', tentativas: 1, artefato_id: null, bloqueada_ate: null, proxima_tentativa_em: null });
    expect(await usos(id)).toEqual([{ demanda_id: null, modelo: MODELO, tokens_entrada: 1_000, tokens_saida: 200, custo: '0.006000', resultado: 'erro' }]);
    const ev = await eventosDa(id);
    expect(ev).toEqual([
      { acao: 'falha_agente', ator_tipo: 'agente', ator_id: 'risco', demanda_id: null, depois: { agente: 'risco', tentativas: 1, motivo: 'recusada_pelo_servico' } },
    ]);
    expect(contemSentinela(JSON.stringify(ev))).toBe(false);
    expect(await jobs(id)).toHaveLength(1);
    // Recusa de regra de negócio não é erro de programação: não vai ao Sentry.
    expect(capturarErro).not.toHaveBeenCalled();
  });

  it('C-36: limite de artefatos por hora do agente → reagendada com uso erro; passada a hora, a nova tentativa grava', async () => {
    const lote = await novaDemanda();
    for (let i = 0; i < LIMITE_POR_HORA.artefato; i++) await criarParecerRisco(base, agenteRisco, lote.id, criarParecerRiscoSchema.parse(RSK_VALIDO));
    provedor.respostas.push(resposta(RSK_VALIDO), resposta(RSK_VALIDO));
    const id = (await novaExecucao())!;
    const t0 = relogio.agora();

    expect(await executarAgente(deps, id)).toBe('reagendada');
    expect(await contarRsk(dem.id)).toBe(0);
    expect(await usos(id)).toMatchObject([{ resultado: 'erro', tokens_entrada: 1_000, tokens_saida: 200, custo: '0.006000' }]);
    expect(await execucao(id)).toMatchObject({ status: 'pendente', tentativas: 1, proxima_tentativa_em: new Date(t0.getTime() + 30_000) });
    expect((await jobs(id)).map((j) => j.singleton_key)).toEqual([`risco:esp:${esp.id}:t1`, `risco:esp:${esp.id}:t2`]);
    expect(await eventosDa(id)).toEqual([]);
    expect(capturarErro).not.toHaveBeenCalled();

    relogio.avancar(HORA);
    expect(await executarAgente(deps, id)).toBe('concluida');
    expect(await contarRsk(dem.id)).toBe(1);
    expect(await execucao(id)).toMatchObject({ status: 'concluida', tentativas: 2, artefato_id: idVersao('RSK', dem.id, 1) });
    expect((await usos(id)).map((u) => u.resultado)).toEqual(['erro', 'sucesso']);
  });
});

describe('execução perdida (ADR-07): quem ficou para trás não reagenda nem marca falha', () => {
  it('trava vencida durante a chamada, os dois com saída inválida: só o job do segundo worker fica, sem o t2 do primeiro', async () => {
    const id = (await novaExecucao())!;
    const { lento, estado } = provedorQuePerdeAExecucao(id, resposta(FORA_DO_SCHEMA), resposta(FORA_DO_SCHEMA));
    expect(await executarAgente({ ...base, provedor: lento }, id)).toBe('ja_tratada');
    expect(estado.interna).toBe('reagendada');

    // O segundo worker fez a 2ª tentativa e reagendou a 3ª; o reagendamento do primeiro foi desfeito.
    expect(await execucao(id)).toMatchObject({ status: 'pendente', tentativas: 2, proxima_tentativa_em: new Date(relogio.agora().getTime() + 120_000) });
    expect((await jobs(id)).map((j) => j.singleton_key)).toEqual([`risco:esp:${esp.id}:t1`, `risco:esp:${esp.id}:t3`]);
    expect((await usos(id)).map((u) => u.resultado)).toEqual(['fora_do_schema', 'fora_do_schema']);
    expect(await contarRsk(dem.id)).toBe(0);
    expect(await eventosDa(id)).toEqual([]);
  });

  it('trava vencida durante a chamada e o primeiro recebe 401: a execução continua concluida, sem evento falha_agente', async () => {
    const id = (await novaExecucao())!;
    const { lento, estado } = provedorQuePerdeAExecucao(id, resposta(RSK_VALIDO), new ErroProvedor('autenticacao'));
    expect(await executarAgente({ ...base, provedor: lento }, id)).toBe('ja_tratada');
    expect(estado.interna).toBe('concluida');

    expect(await execucao(id)).toMatchObject({ status: 'concluida', tentativas: 2, artefato_id: idVersao('RSK', dem.id, 1) });
    expect(await contarRsk(dem.id)).toBe(1);
    expect(await eventosDa(id)).toEqual([]);
    expect((await usos(id)).map((u) => u.resultado).sort()).toEqual(['erro', 'sucesso']);
  });

  it('duas execuções do mesmo agente na mesma demanda ao mesmo tempo (ESP v1 e v2) → dois RSK, v1 e v2, sem colisão de versão', async () => {
    const esp2 = await espDaPessoa(dem.id);
    provedor.respostas.push(resposta(RSK_VALIDO), resposta(RSK_VALIDO));
    const id1 = (await novaExecucao('risco', `esp:${esp.id}`))!;
    const id2 = (await novaExecucao('risco', `esp:${esp2.id}`))!;
    expect(await Promise.all([executarAgente(deps, id1), executarAgente(deps, id2)])).toEqual(['concluida', 'concluida']);
    expect(provedor.chamadas).toHaveLength(2);
    expect(await contarRsk(dem.id)).toBe(2);
    const artefatos = [(await execucao(id1)).artefato_id, (await execucao(id2)).artefato_id].sort();
    expect(artefatos).toEqual([idVersao('RSK', dem.id, 1), idVersao('RSK', dem.id, 2)]);
  });
});

describe('teto e interruptor conferidos antes de cada tentativa (RNF-07, CA-18.2, CA-19.4)', () => {
  it('RNF-07: a 1ª tentativa leva o gasto ao teto → a 2ª não chama o provedor e a execução fica ignorada por teto', async () => {
    await definirTeto(3);
    // 1.000.000 de tokens de entrada a 3 por milhão: exatamente o teto.
    provedor.respostas.push(resposta(FORA_DO_SCHEMA, { tokensEntrada: 1_000_000, tokensSaida: 0 }), resposta(RSK_VALIDO));
    const id = (await novaExecucao())!;
    expect(await executarAgente(deps, id)).toBe('reagendada');
    expect(await usos(id)).toMatchObject([{ resultado: 'fora_do_schema', custo: '3.000000' }]);

    relogio.avancar(30_000);
    expect(await executarAgente(deps, id)).toBe('ignorada');
    expect(provedor.chamadas).toHaveLength(1);
    expect(await contarRsk(dem.id)).toBe(0);
    expect(await execucao(id)).toMatchObject({ status: 'ignorada', tentativas: 2 });
    expect(await eventosDa(id)).toEqual([
      { acao: 'suspensao_por_teto', ator_tipo: 'sistema', ator_id: 'sistema', demanda_id: dem.id, depois: { agente: 'risco', motivo: 'teto' } },
    ]);
  });

  it('CA-19.4: agente desligado entre a 1ª e a 2ª tentativa → a 2ª não chama o provedor', async () => {
    provedor.respostas.push(resposta(FORA_DO_SCHEMA), resposta(RSK_VALIDO));
    const id = (await novaExecucao())!;
    expect(await executarAgente(deps, id)).toBe('reagendada');
    await desligar('risco');
    relogio.avancar(30_000);
    expect(await executarAgente(deps, id)).toBe('ignorada');
    expect(provedor.chamadas).toHaveLength(1);
    expect(await contarRsk(dem.id)).toBe(0);
    expect(await eventosDa(id)).toMatchObject([{ acao: 'agente_ignorado', depois: { agente: 'risco', motivo: 'desligado' } }]);
  });

  it('CA-18.2: gasto no teto em 31/10 às 23 h de São Paulo; um instante antes da meia-noite segue suspenso, e à meia-noite de 1º/11 chama', async () => {
    relogio.definir('2026-11-01T02:00:00Z'); // 31/10, 23 h em São Paulo
    await gastar(10);
    const esp2 = await espDaPessoa(dem.id);
    provedor.respostas.push(resposta(RSK_VALIDO));

    relogio.definir('2026-11-01T02:59:59.999Z');
    const antes = (await novaExecucao('risco', `esp:${esp.id}`))!;
    expect(await executarAgente(deps, antes)).toBe('ignorada');
    expect(provedor.chamadas).toHaveLength(0);

    relogio.definir('2026-11-01T03:00:00Z');
    const depois = (await novaExecucao('risco', `esp:${esp2.id}`))!;
    expect(await executarAgente(deps, depois)).toBe('concluida');
    expect(provedor.chamadas).toHaveLength(1);
  });
});

describe('as três tentativas (P1-e, CA-16.2, CA-16.3)', () => {
  it('erro transitório nas três → falhou com erro_provedor, três usos erro, jobs t1 a t3 e sem Sentry', async () => {
    provedor.respostas.push(new ErroProvedor('transitorio'), new ErroProvedor('transitorio'), new ErroProvedor('transitorio', { entrada: 7, saida: 0 }));
    const id = (await novaExecucao())!;
    const t0 = relogio.agora().getTime();
    expect(await executarAgente(deps, id)).toBe('reagendada');
    relogio.avancar(30_000);
    expect(await executarAgente(deps, id)).toBe('reagendada');
    relogio.avancar(120_000);
    expect(await executarAgente(deps, id)).toBe('falhou');

    expect(provedor.chamadas).toHaveLength(3);
    expect(await execucao(id)).toMatchObject({ status: 'falhou', tentativas: 3, proxima_tentativa_em: null });
    expect(await usos(id)).toMatchObject([
      { resultado: 'erro', tokens_entrada: 0 },
      { resultado: 'erro', tokens_entrada: 0 },
      { resultado: 'erro', tokens_entrada: 7 },
    ]);
    const j = await jobs(id);
    expect(j.map((x) => x.singleton_key)).toEqual([1, 2, 3].map((n) => `risco:esp:${esp.id}:t${n}`));
    expect(j.map((x) => x.start_after.getTime()).slice(1)).toEqual([t0 + 30_000, t0 + 30_000 + 120_000]);
    expect(await eventosDa(id)).toEqual([
      { acao: 'falha_agente', ator_tipo: 'agente', ator_id: 'risco', demanda_id: dem.id, depois: { agente: 'risco', tentativas: 3, motivo: 'erro_provedor' } },
    ]);
    expect(capturarErro).not.toHaveBeenCalled();
  });

  it('válida só na 3ª tentativa → concluida, um RSK e nenhum evento falha_agente', async () => {
    provedor.respostas.push(resposta(FORA_DO_SCHEMA), resposta('não é JSON'), resposta(RSK_VALIDO));
    const id = (await novaExecucao())!;
    expect(await executarAgente(deps, id)).toBe('reagendada');
    relogio.avancar(30_000);
    expect(await executarAgente(deps, id)).toBe('reagendada');
    relogio.avancar(120_000);
    expect(await executarAgente(deps, id)).toBe('concluida');

    expect(await contarRsk(dem.id)).toBe(1);
    expect(await execucao(id)).toMatchObject({ status: 'concluida', tentativas: 3, artefato_id: idVersao('RSK', dem.id, 1) });
    expect((await usos(id)).map((u) => u.resultado)).toEqual(['fora_do_schema', 'fora_do_schema', 'sucesso']);
    expect(await eventosDa(id)).toEqual([]);
  });

  it('o job da 3ª tentativa entregue antes dos 2 min não chama o provedor', async () => {
    provedor.respostas.push(resposta(FORA_DO_SCHEMA), resposta(FORA_DO_SCHEMA), resposta(RSK_VALIDO));
    const id = (await novaExecucao())!;
    await executarAgente(deps, id);
    relogio.avancar(30_000);
    await executarAgente(deps, id);
    relogio.avancar(120_000 - 1);
    expect(await executarAgente(deps, id)).toBe('ja_tratada');
    expect(provedor.chamadas).toHaveLength(2);
    relogio.avancar(1);
    expect(await executarAgente(deps, id)).toBe('concluida');
  });
});

describe('leitura da resposta', () => {
  it.each([
    ['tokens de entrada negativos', { tokensEntrada: -1 }],
    ['tokens de saída fracionários', { tokensSaida: 1.5 }],
    ['tokens NaN', { tokensEntrada: Number.NaN }],
    ['texto nulo', { texto: null as never }],
  ])('fora do envelope (%s) → uso erro e nova tentativa, sem artefato e sem Sentry', async (_n, extra) => {
    provedor.respostas.push(resposta(RSK_VALIDO, extra));
    const id = (await novaExecucao())!;
    expect(await executarAgente(deps, id)).toBe('reagendada');
    expect(await usos(id)).toMatchObject([{ resultado: 'erro' }]);
    expect(await contarRsk(dem.id)).toBe(0);
    expect(capturarErro).not.toHaveBeenCalled();
  });

  it('JSON com texto em volta (fora de bloco de código) é saída inválida', async () => {
    provedor.respostas.push(resposta(`Segue o parecer: ${JSON.stringify(RSK_VALIDO)}`));
    const id = (await novaExecucao())!;
    expect(await executarAgente(deps, id)).toBe('reagendada');
    expect(await usos(id)).toMatchObject([{ resultado: 'fora_do_schema' }]);
  });

  it('bloco de código sem linguagem e com espaço em volta ainda é lido', async () => {
    provedor.respostas.push(resposta('  ```\n' + JSON.stringify(RSK_VALIDO) + '\n```  '));
    expect(await executarAgente(deps, (await novaExecucao())!)).toBe('concluida');
  });
});

describe('handler da fila com o job real (contrato do envio com a leitura, C-22, CA-16.4)', () => {
  it('o payload gravado por criarExecucao passa no handler; o mesmo job duas vezes no lote chama o provedor uma vez', async () => {
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    provedor.respostas.push(resposta(RSK_VALIDO), resposta(RSK_VALIDO));
    const id = (await novaExecucao())!;
    const [job] = await jobs(id);
    await tratarAgenteExecutar(deps, [
      { id: 'job-a', data: job!.data },
      { id: 'job-b', data: job!.data },
    ]);
    expect(provedor.chamadas).toHaveLength(1);
    expect(await contarRsk(dem.id)).toBe(1);
    const tratados = linhas.map((l) => JSON.parse(l)).filter((l) => l.evento === 'agente_job_tratado');
    expect(tratados).toMatchObject([
      { jobId: 'job-a', execucaoId: id, status: 'concluida' },
      { jobId: 'job-b', execucaoId: id, status: 'ja_tratada' },
    ]);
    expect(contemSentinela(linhas.join(''))).toBe(false);
  });
});
