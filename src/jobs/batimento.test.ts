// T29: batimento do worker e varredura de execuções órfãs (ADR-06, ADR-07, RNF-05) contra o Postgres real, pelo papel
// do app, com a fila do pg-boss no mesmo banco e o provedor de IA falso (RNF-14). Relógio fixo (RNF-15). Dados fictícios.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { criarDepsDeTeste } from '../../test/deps';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { ProvedorFalso } from '../../test/provedor-falso';
import { PROMPTS } from '../agents';
import type { Deps } from '../lib/deps';
import { substituirDestinoDoLog } from '../lib/log';
import { relogioFixo } from '../lib/relogio';
import type { AtorPessoa } from '../modules/acesso/ator';
import { situacaoDoWorker } from '../modules/agentes/situacao-worker';
import { executarAgente } from '../modules/agentes/executar';
import { criarDemandaSchema } from '../modules/demandas/schemas';
import { criarDemanda } from '../modules/demandas/servico';
import { batimento } from './batimento';

const AGORA = '2026-10-22T12:00:00Z';
const MODELO = 'modelo-ficticio';
const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-batimento-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };

let b: BancoDeTeste;
let deps: Deps;
const relogio = relogioFixo(AGORA);
let passo = 0;

const mais = (ms: number) => new Date(relogio.agora().getTime() + ms);

type Linha = { status: 'pendente' | 'em_andamento' | 'concluida' | 'falhou' | 'ignorada'; tentativas?: number; proxima?: Date | null; trava?: Date | null; atualizada?: Date; artefato?: string | null };
let numero = 0;
async function execucao(l: Linha): Promise<{ id: string; chave: string }> {
  const chave = `demanda:DEM-20261022-${String(++numero).padStart(4, '0')}`;
  const r = await b.poolMigrator.query<{ id: string }>(
    `insert into execucao_agente (agente, chave_entrada, status, tentativas, proxima_tentativa_em, bloqueada_ate, artefato_id, criada_em, atualizada_em)
     values ('insumo_tecnico', $1, $2, $3, $4, $5, $6, $7, $7) returning id`,
    [chave, l.status, l.tentativas ?? 0, l.proxima ?? null, l.trava ?? null, l.artefato ?? null, l.atualizada ?? relogio.agora()],
  );
  return { id: r.rows[0]!.id, chave };
}

const jobsDeAgente = async () =>
  (
    await b.poolMigrator.query<{ data: Record<string, unknown>; singleton_key: string; state: string }>(
      `select data, singleton_key, state from pgboss.job where name = 'agente.executar' order by singleton_key`,
    )
  ).rows;
const batimentos = async () =>
  (await b.poolMigrator.query<{ instancia: string; visto_em: Date }>('select instancia, visto_em from worker_batimento order by instancia')).rows;

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  await b.poolMigrator.query(`insert into "user" (id, name, email, papel) values ($1, 'Pessoa Ficticia CTO', 'batimento-cto@exemplo.test', 'cto')`, [cto.usuarioId]);
  await b.poolMigrator.query('insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2)', [
    MODELO,
    '2026-10-01T03:00:00Z',
  ]);
  await b.poolMigrator.query('update configuracao_ia set teto_mensal = 10 where id = 1');
});
afterAll(async () => {
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});
beforeEach(async () => {
  // Cada teste duas horas depois do anterior, ainda em outubro (C-36); a base começa sem execução, job nem batimento.
  relogio.definir(AGORA);
  relogio.avancar(++passo * 2 * HORA);
  await b.poolMigrator.query('truncate worker_batimento, uso_ia, execucao_agente cascade');
  await b.poolMigrator.query(`delete from pgboss.job where name = 'agente.executar'`);
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null');
});

describe('batimento da instância', () => {
  it('grava o batimento da instância', async () => {
    await batimento(deps, 'instancia-a');
    expect(await batimentos()).toEqual([{ instancia: 'instancia-a', visto_em: relogio.agora() }]);
    relogio.avancar(MINUTO);
    await batimento(deps, 'instancia-a');
    // Uma linha por instância: o batimento seguinte só atualiza a hora.
    expect(await batimentos()).toEqual([{ instancia: 'instancia-a', visto_em: relogio.agora() }]);
  });

  it('limpa o batimento de instância que não bate há mais de um dia, e não mexe na recente', async () => {
    await batimento(deps, 'instancia-antiga');
    relogio.avancar(HORA);
    await batimento(deps, 'instancia-recente');
    relogio.avancar(24 * HORA);
    await batimento(deps, 'instancia-atual');
    expect((await batimentos()).map((x) => x.instancia)).toEqual(['instancia-atual', 'instancia-recente']);
  });

  it('C-21: o log do batimento leva só o evento, a instância e a quantidade', async () => {
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    try {
      await execucao({ status: 'pendente', proxima: mais(-2 * MINUTO) });
      await batimento(deps, 'instancia-log');
    } finally {
      substituirDestinoDoLog(null);
    }
    const registros = linhas.map((l) => JSON.parse(l) as Record<string, unknown>).filter((r) => r.evento === 'worker_batimento');
    expect(registros).toHaveLength(1);
    expect(registros[0]).toMatchObject({ evento: 'worker_batimento', instancia: 'instancia-log', quantidade: 1 });
    expect(Object.keys(registros[0]!).filter((k) => !['level', 'time', 'msg'].includes(k)).sort()).toEqual(['evento', 'instancia', 'quantidade']);
  });
});

describe('varredura de execuções órfãs', () => {
  it('reenfileira pendente vencida há mais de 1 min e em_andamento com trava vencida; não mexe na que ainda vale', async () => {
    const pendenteVencida = await execucao({ status: 'pendente', tentativas: 1, proxima: mais(-2 * MINUTO) });
    const pendenteRecente = await execucao({ status: 'pendente', tentativas: 1, proxima: mais(-30_000) });
    const pendenteFutura = await execucao({ status: 'pendente', tentativas: 1, proxima: mais(MINUTO) });
    const travaVencida = await execucao({ status: 'em_andamento', tentativas: 2, trava: mais(-1_000) });
    const travaValendo = await execucao({ status: 'em_andamento', tentativas: 1, trava: mais(MINUTO) });
    await execucao({ status: 'concluida', tentativas: 1, artefato: 'ESP-DEM-20261022-0099-v1', atualizada: mais(-HORA) });
    await execucao({ status: 'falhou', tentativas: 3, atualizada: mais(-HORA) });
    await execucao({ status: 'ignorada', tentativas: 1, atualizada: mais(-HORA) });

    expect(await batimento(deps, 'instancia-a')).toEqual({ reenfileiradas: 2 });

    // Payload só com o id (C-22); a chave é a da próxima tentativa (ADR-07).
    expect(await jobsDeAgente()).toEqual(
      [
        { data: { execucaoId: pendenteVencida.id }, singleton_key: `insumo_tecnico:${pendenteVencida.chave}:t2`, state: 'created' },
        { data: { execucaoId: travaVencida.id }, singleton_key: `insumo_tecnico:${travaVencida.chave}:t3`, state: 'created' },
      ].sort((x, y) => x.singleton_key.localeCompare(y.singleton_key)),
    );
    const ids = (await jobsDeAgente()).map((j) => j.data.execucaoId);
    for (const naoMexe of [pendenteRecente, pendenteFutura, travaValendo]) expect(ids).not.toContain(naoMexe.id);
    // A varredura não muda a execução: quem muda é a reivindicação, quando o job rodar.
    const linhas = await b.poolMigrator.query<{ status: string }>('select status from execucao_agente where id = any($1::uuid[]) order by status', [
      [pendenteVencida.id, travaVencida.id],
    ]);
    expect(linhas.rows.map((r) => r.status)).toEqual(['em_andamento', 'pendente']);
  });

  it('pendente da 1ª tentativa (sem proxima_tentativa_em) cujo job se perdeu volta depois de 1 min parada', async () => {
    const parada = await execucao({ status: 'pendente', atualizada: mais(-2 * MINUTO) });
    const nova = await execucao({ status: 'pendente', atualizada: mais(-30_000) });
    expect(await batimento(deps, 'instancia-a')).toEqual({ reenfileiradas: 1 });
    expect(await jobsDeAgente()).toEqual([{ data: { execucaoId: parada.id }, singleton_key: `insumo_tecnico:${parada.chave}:t1`, state: 'created' }]);
    expect((await jobsDeAgente()).map((j) => j.data.execucaoId)).not.toContain(nova.id);
  });

  it('cobre a execução do orquestrador, que não tem demanda (pendência da 06-T28-revisao)', async () => {
    const chave = 'entrada:00000000-0000-4000-8000-0000000000aa';
    const r = await b.poolMigrator.query<{ id: string }>(
      `insert into execucao_agente (agente, chave_entrada, status, tentativas, bloqueada_ate, criada_em, atualizada_em)
       values ('orquestrador', $1, 'em_andamento', 1, $2, $3, $3) returning id`,
      [chave, mais(-1_000), mais(-3 * MINUTO)],
    );
    expect(await batimento(deps, 'instancia-a')).toEqual({ reenfileiradas: 1 });
    expect(await jobsDeAgente()).toEqual([{ data: { execucaoId: r.rows[0]!.id }, singleton_key: `orquestrador:${chave}:t2`, state: 'created' }]);
  });

  it('o job da tentativa ainda na fila não é duplicado: a pendente que só espera a vez não ganha job novo', async () => {
    await b.poolMigrator.query('update configuracao_agente set ligado = true, modelo = $1 where agente = $2', [MODELO, 'insumo_tecnico']);
    await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Fila cheia', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' }));
    expect(await jobsDeAgente()).toHaveLength(1);
    relogio.avancar(10 * MINUTO);
    expect(await batimento(deps, 'instancia-a')).toEqual({ reenfileiradas: 0 });
    expect(await jobsDeAgente()).toHaveLength(1);
  });

  it('reenfileirar duas vezes é inofensivo: a reivindicação deixa uma só execução rodar', async () => {
    await b.poolMigrator.query('update configuracao_agente set ligado = true, modelo = $1 where agente = $2', [MODELO, 'insumo_tecnico']);
    const dem = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Worker caiu', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' }));
    // O worker pegou o job da 1ª tentativa, reivindicou e caiu no meio da chamada: a trava venceu.
    await b.poolMigrator.query(`update pgboss.job set state = 'failed' where name = 'agente.executar'`);
    await b.poolMigrator.query(`update execucao_agente set status = 'em_andamento', tentativas = 1, bloqueada_ate = $1`, [mais(-1_000)]);

    expect(await batimento(deps, 'instancia-a')).toEqual({ reenfileiradas: 1 });
    relogio.avancar(MINUTO);
    expect(await batimento(deps, 'instancia-b')).toEqual({ reenfileiradas: 0 });
    const novos = (await jobsDeAgente()).filter((j) => j.state === 'created');
    expect(novos).toHaveLength(1);
    expect(novos[0]!.singleton_key).toBe(`insumo_tecnico:demanda:${dem.id}:t2`);

    // Mesmo que o job chegue duas vezes ao worker, o provedor é chamado uma vez e há uma ESP só.
    const provedor = new ProvedorFalso();
    provedor.respostas.push({ texto: JSON.stringify(PROMPTS.insumo_tecnico.exemploSaida), modelo: MODELO, tokensEntrada: 10, tokensSaida: 10 });
    const execucaoId = novos[0]!.data.execucaoId as string;
    expect(await executarAgente({ ...deps, provedor }, execucaoId)).toBe('concluida');
    expect(await executarAgente({ ...deps, provedor }, execucaoId)).toBe('ja_tratada');
    expect(provedor.chamadas).toHaveLength(1);
    const esps = await b.poolMigrator.query('select id from especificacao_tecnica where demanda_id = $1', [dem.id]);
    expect(esps.rows).toHaveLength(1);
    // Concluída, a execução sai da varredura.
    relogio.avancar(10 * MINUTO);
    expect(await batimento(deps, 'instancia-a')).toEqual({ reenfileiradas: 0 });
  });

  it('o envio do job sai pelo papel do app, sem gravar nada além do job (a execução não muda na varredura)', async () => {
    const e = await execucao({ status: 'pendente', tentativas: 2, proxima: mais(-5 * MINUTO) });
    const antes = (await b.poolMigrator.query('select * from execucao_agente where id = $1', [e.id])).rows[0];
    await batimento(deps, 'instancia-a');
    const depois = (await b.poolMigrator.query('select * from execucao_agente where id = $1', [e.id])).rows[0];
    expect(depois).toEqual(antes);
  });
});

// 06-T29-testes (qa-automacao): bordas da varredura, a corrida com a reivindicação, o teto de 100 e a trava vencida na
// 3ª tentativa. Mesma base, relógio fixo e dados fictícios dos testes acima.
describe('varredura: bordas e corridas (06-T29-testes)', () => {
  const ligarInsumo = () => b.poolMigrator.query('update configuracao_agente set ligado = true, modelo = $1 where agente = $2', [MODELO, 'insumo_tecnico']);
  const respostaValida = () => ({ texto: JSON.stringify(PROMPTS.insumo_tecnico.exemploSaida), modelo: MODELO, tokensEntrada: 10, tokensSaida: 10 });

  it('borda de 1 min da pendente: exatamente 1 min parada não volta; 1 min e 1 ms volta (com e sem proxima_tentativa_em)', async () => {
    const naBordaComProxima = await execucao({ status: 'pendente', tentativas: 1, proxima: mais(-MINUTO) });
    const passouComProxima = await execucao({ status: 'pendente', tentativas: 1, proxima: mais(-MINUTO - 1) });
    const naBordaSemProxima = await execucao({ status: 'pendente', atualizada: mais(-MINUTO) });
    const passouSemProxima = await execucao({ status: 'pendente', atualizada: mais(-MINUTO - 1) });
    // proxima_tentativa_em recente vale mais que atualizada_em velha: o job dessa tentativa ainda pode estar esperando.
    const proximaRecenteAtualizadaVelha = await execucao({ status: 'pendente', tentativas: 1, proxima: mais(-30_000), atualizada: mais(-HORA) });

    expect(await batimento(deps, 'instancia-a')).toEqual({ reenfileiradas: 2 });
    const ids = (await jobsDeAgente()).map((j) => j.data.execucaoId);
    expect(ids.sort()).toEqual([passouComProxima.id, passouSemProxima.id].sort());
    for (const fica of [naBordaComProxima, naBordaSemProxima, proximaRecenteAtualizadaVelha]) expect(ids).not.toContain(fica.id);
  });

  it('borda da trava: em_andamento com bloqueada_ate igual a agora não volta; 1 ms vencida volta', async () => {
    const naBorda = await execucao({ status: 'em_andamento', tentativas: 1, trava: mais(0) });
    const vencida = await execucao({ status: 'em_andamento', tentativas: 1, trava: mais(-1) });
    expect(await batimento(deps, 'instancia-a')).toEqual({ reenfileiradas: 1 });
    expect(await jobsDeAgente()).toEqual([{ data: { execucaoId: vencida.id }, singleton_key: `insumo_tecnico:${vencida.chave}:t2`, state: 'created' }]);
    expect((await jobsDeAgente()).map((j) => j.data.execucaoId)).not.toContain(naBorda.id);
  });

  it('corrida com a reivindicação: job t1 ativo e execução ainda pendente; a varredura cria no máximo um job e o provedor é chamado uma vez', async () => {
    await ligarInsumo();
    const dem = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Corrida', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' }));
    // Um worker pegou o job da 1ª tentativa (active) e ainda não reivindicou: a execução segue pendente, parada há 10 min.
    await b.poolMigrator.query(`update pgboss.job set state = 'active', started_on = now() where name = 'agente.executar'`);
    relogio.avancar(10 * MINUTO);
    const [exec] = (await b.poolMigrator.query<{ id: string; status: string }>('select id, status from execucao_agente')).rows;
    expect(exec!.status).toBe('pendente');

    await batimento(deps, 'instancia-a');
    relogio.avancar(MINUTO);
    await batimento(deps, 'instancia-a');
    const jobs = await jobsDeAgente();
    // Um ativo e no máximo um novo na fila, os dois da mesma tentativa: nunca um job por batimento.
    expect(jobs.filter((j) => j.state === 'active')).toHaveLength(1);
    expect(jobs.filter((j) => j.state === 'created').length).toBeLessThanOrEqual(1);
    expect(new Set(jobs.map((j) => j.singleton_key))).toEqual(new Set([`insumo_tecnico:demanda:${dem.id}:t1`]));
    expect(jobs.every((j) => j.data.execucaoId === exec!.id)).toBe(true);

    // Os dois jobs chegam ao worker: o primeiro reivindica e conclui; o outro não acha nada para fazer.
    const provedor = new ProvedorFalso();
    provedor.respostas.push(respostaValida());
    const resultados = [];
    for (const j of jobs) resultados.push(await executarAgente({ ...deps, provedor }, j.data.execucaoId as string));
    expect(resultados.sort()).toEqual(['concluida', ...Array<string>(jobs.length - 1).fill('ja_tratada')].sort());
    expect(provedor.chamadas).toHaveLength(1);
    expect((await b.poolMigrator.query('select id from especificacao_tecnica where demanda_id = $1', [dem.id])).rows).toHaveLength(1);
    expect((await b.poolMigrator.query<{ status: string }>('select status from execucao_agente where id = $1', [exec!.id])).rows[0]!.status).toBe('concluida');
    relogio.avancar(10 * MINUTO);
    expect(await batimento(deps, 'instancia-a')).toEqual({ reenfileiradas: 0 });
  });

  it('teto de 100 por batimento: 101 órfãs dão 100 jobs, sem repetir; a mais nova entra quando as outras saem da varredura', async () => {
    const r = await b.poolMigrator.query<{ id: string }>(
      `insert into execucao_agente (agente, chave_entrada, status, tentativas, proxima_tentativa_em, criada_em, atualizada_em)
       select 'insumo_tecnico', 'demanda:DEM-20261022-' || lpad((5000 + i)::text, 4, '0'), 'pendente', 1, $1::timestamptz,
              $1::timestamptz - interval '3 hours' + i * interval '1 second', $1::timestamptz - interval '3 hours' + i * interval '1 second'
       from generate_series(1, 101) as i order by i returning id`,
      [mais(-2 * MINUTO)],
    );
    const ids = r.rows.map((x) => x.id);
    const maisNova = ids[100]!;

    expect(await batimento(deps, 'instancia-a')).toEqual({ reenfileiradas: 100 });
    let jobs = await jobsDeAgente();
    expect(jobs).toHaveLength(100);
    expect(jobs.map((j) => j.data.execucaoId)).not.toContain(maisNova);

    // As 100 ainda estão na fila: o batimento seguinte não duplica nenhuma.
    relogio.avancar(MINUTO);
    expect(await batimento(deps, 'instancia-a')).toEqual({ reenfileiradas: 0 });
    expect(await jobsDeAgente()).toHaveLength(100);

    // O worker tratou as 100 (aqui, ignoradas): a que sobrou entra no batimento seguinte.
    await b.poolMigrator.query(`update execucao_agente set status = 'ignorada' where id <> $1`, [maisNova]);
    relogio.avancar(MINUTO);
    expect(await batimento(deps, 'instancia-a')).toEqual({ reenfileiradas: 1 });
    jobs = await jobsDeAgente();
    expect(jobs).toHaveLength(101);
    expect(jobs.filter((j) => j.data.execucaoId === maisNova)).toHaveLength(1);
  });

  it('trava vencida na 3ª tentativa: a varredura manda o job t4, e ele falha sem chamar o provedor (P1-e)', async () => {
    await ligarInsumo();
    const dem = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Terceira caiu', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' }));
    await b.poolMigrator.query(`update pgboss.job set state = 'failed' where name = 'agente.executar'`);
    await b.poolMigrator.query(`update execucao_agente set status = 'em_andamento', tentativas = 3, bloqueada_ate = $1`, [mais(-1_000)]);

    expect(await batimento(deps, 'instancia-a')).toEqual({ reenfileiradas: 1 });
    const novo = (await jobsDeAgente()).filter((j) => j.state === 'created');
    expect(novo.map((j) => j.singleton_key)).toEqual([`insumo_tecnico:demanda:${dem.id}:t4`]);

    const provedor = new ProvedorFalso();
    provedor.respostas.push(respostaValida());
    expect(await executarAgente({ ...deps, provedor }, novo[0]!.data.execucaoId as string)).toBe('falhou');
    expect(provedor.chamadas).toHaveLength(0);
    expect((await b.poolMigrator.query('select id from uso_ia')).rows).toHaveLength(0);
    relogio.avancar(10 * MINUTO);
    expect(await batimento(deps, 'instancia-a')).toEqual({ reenfileiradas: 0 });
  });
});

describe('situacaoDoWorker', () => {
  it('sem batimento nenhum: atrasado e sem instâncias', async () => {
    expect(await situacaoDoWorker(deps.db, relogio)).toEqual({ ultimoBatimento: null, atrasado: true, instanciasRecentes: 0, duasInstancias: false });
  });

  it('atrasado depois de 5 min sem batimento; duasInstancias com duas em 2 min', async () => {
    const inicio = relogio.agora();
    await batimento(deps, 'instancia-a');
    expect(await situacaoDoWorker(deps.db, relogio)).toEqual({ ultimoBatimento: inicio, atrasado: false, instanciasRecentes: 1, duasInstancias: false });

    relogio.avancar(5 * MINUTO);
    expect((await situacaoDoWorker(deps.db, relogio)).atrasado).toBe(false);
    relogio.avancar(1);
    expect(await situacaoDoWorker(deps.db, relogio)).toMatchObject({ ultimoBatimento: inicio, atrasado: true, instanciasRecentes: 0 });

    relogio.definir(inicio.toISOString());
    relogio.avancar(90_000);
    await batimento(deps, 'instancia-b');
    expect(await situacaoDoWorker(deps.db, relogio)).toEqual({ ultimoBatimento: relogio.agora(), atrasado: false, instanciasRecentes: 2, duasInstancias: true });

    // A instância a parou de bater: 2 min e 1 ms depois do último batimento dela, sobra uma.
    relogio.definir(inicio.toISOString());
    relogio.avancar(2 * MINUTO + 1);
    expect(await situacaoDoWorker(deps.db, relogio)).toMatchObject({ instanciasRecentes: 1, duasInstancias: false });
  });
});
