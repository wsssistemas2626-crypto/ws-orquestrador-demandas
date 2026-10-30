// T29: o processo worker sobre o pg-boss do banco de teste, pelo papel do app (migrate: false), com o provedor de IA
// falso (RNF-14) e o relógio fixo (RNF-15). Dados só fictícios.
import { afterAll, afterEach, beforeAll, beforeEach, expect, it } from 'vitest';
import { CONFIG_TESTE } from '../../test/auth';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { PROMPTS } from '../agents';
import { comTransacao } from '../db/transacao';
import { criarFila, FILAS } from '../lib/fila';
import { substituirDestinoDoLog } from '../lib/log';
import { relogioFixo } from '../lib/relogio';
import type { AtorPessoa } from '../modules/acesso/ator';
import { situacaoDoWorker } from '../modules/agentes/situacao-worker';
import type { PedidoAoProvedor, ProvedorIA, RespostaDoProvedor } from '../modules/agentes/provedor';
import { criarDemandaSchema } from '../modules/demandas/schemas';
import { criarDemanda } from '../modules/demandas/servico';
import { iniciarWorker, type DepsWorker } from './iniciar';

const AGORA = '2026-10-22T12:00:00Z';
const MODELO = 'modelo-ficticio';
const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-worker-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };

// Provedor falso que demora a responder e conta quantas chamadas estão abertas ao mesmo tempo.
class ProvedorLento implements ProvedorIA {
  chamadas: PedidoAoProvedor[] = [];
  abertas = 0;
  maximoAberto = 0;
  async gerar(p: PedidoAoProvedor): Promise<RespostaDoProvedor> {
    this.chamadas.push(p);
    this.abertas += 1;
    this.maximoAberto = Math.max(this.maximoAberto, this.abertas);
    try {
      await new Promise((r) => setTimeout(r, 1_000));
      return { texto: JSON.stringify(PROMPTS.insumo_tecnico.exemploSaida), modelo: MODELO, tokensEntrada: 10, tokensSaida: 10 };
    } finally {
      this.abertas -= 1;
    }
  }
}

let b: BancoDeTeste;
let deps: DepsWorker;
let provedor: ProvedorLento;
const relogio = relogioFixo(AGORA);
const paradas: Array<() => Promise<void>> = [];

beforeAll(async () => {
  b = await novoBanco();
  provedor = new ProvedorLento();
  deps = {
    db: b.db,
    pool: b.poolApp,
    relogio,
    fila: await criarFila(b.urlApp, { agendador: true }),
    provedor,
    config: { ...CONFIG_TESTE, databaseUrl: b.urlApp },
  };
  await b.poolMigrator.query(`insert into "user" (id, name, email, papel) values ($1, 'Pessoa Ficticia CTO', 'worker-cto@exemplo.test', 'cto')`, [cto.usuarioId]);
  await b.poolMigrator.query('insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2)', [
    MODELO,
    '2026-10-01T03:00:00Z',
  ]);
  await b.poolMigrator.query('update configuracao_ia set teto_mensal = 10 where id = 1');
});
afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});
beforeEach(async () => {
  // Cada teste começa sem execução, job de agente nem batimento, com os agentes desligados (não depende da ordem).
  relogio.definir(AGORA);
  provedor.chamadas = [];
  provedor.maximoAberto = 0;
  await b.poolMigrator.query('truncate worker_batimento, uso_ia, execucao_agente cascade');
  await b.poolMigrator.query(`delete from pgboss.job where name = 'agente.executar'`);
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null');
});
afterEach(async () => {
  while (paradas.length > 0) await paradas.pop()!();
});

async function iniciar(d: DepsWorker = deps) {
  const w = await iniciarWorker(d);
  paradas.push(w.parar);
  return w;
}

it('registra a fila de agentes com concorrência 1 e os dois agendamentos', async () => {
  const w = await iniciar();
  const agendamentos = await b.poolMigrator.query<{ name: string; cron: string; timezone: string | null; data: unknown }>(
    'select name, cron, timezone, data from pgboss.schedule order by name',
  );
  expect(agendamentos.rows).toHaveLength(2);
  expect(agendamentos.rows[0]).toMatchObject({ name: FILAS.retencaoExpurgo, cron: '0 3 * * *', timezone: 'America/Sao_Paulo', data: {} });
  expect(agendamentos.rows[1]).toMatchObject({ name: FILAS.workerBatimento, cron: '* * * * *', data: {} });

  // Duas execuções na fila ao mesmo tempo: o worker chama o provedor uma de cada vez (RNF-07).
  await b.poolMigrator.query('update configuracao_agente set ligado = true, modelo = $1 where agente = $2', [MODELO, 'insumo_tecnico']);
  for (const titulo of ['Primeira na fila', 'Segunda na fila']) {
    await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo, tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' }));
  }
  await expect
    .poll(async () => (await b.poolMigrator.query(`select status from execucao_agente order by status`)).rows.map((r) => r.status), { timeout: 20_000 })
    .toEqual(['concluida', 'concluida']);
  expect(provedor.chamadas).toHaveLength(2);
  expect(provedor.maximoAberto).toBe(1);
  expect(w.instancia).toMatch(/^[0-9a-f-]{36}$/);
});

it('grava o batimento da instância ao subir, sem esperar o primeiro agendamento', async () => {
  const w = await iniciar();
  const r = await b.poolMigrator.query<{ visto_em: Date }>('select visto_em from worker_batimento where instancia = $1', [w.instancia]);
  expect(r.rows).toEqual([{ visto_em: relogio.agora() }]);
});

it('RNF-05: duas instâncias no mesmo banco aparecem como duas em situacaoDoWorker', async () => {
  const outraFila = await criarFila(b.urlApp, { agendador: true });
  paradas.push(() => outraFila.parar());
  const a = await iniciar();
  const c = await iniciar({ ...deps, fila: outraFila });
  expect(a.instancia).not.toBe(c.instancia);
  expect(await situacaoDoWorker(b.db, relogio)).toMatchObject({ atrasado: false, duasInstancias: true });
});

it('o job worker.batimento roda a varredura: a execução órfã volta para a fila', async () => {
  await iniciar();
  const orfa = await b.poolMigrator.query<{ id: string }>(
    `insert into execucao_agente (agente, chave_entrada, status, tentativas, proxima_tentativa_em, criada_em, atualizada_em)
     values ('insumo_tecnico', 'demanda:DEM-20261022-0901', 'pendente', 1, $1, $1, $1) returning id`,
    [new Date(relogio.agora().getTime() - 5 * 60_000)],
  );
  const id = orfa.rows[0]!.id;
  await comTransacao(b.poolApp, ({ executor }) => deps.fila.enviar(executor, FILAS.workerBatimento, {}));
  await expect
    .poll(async () => (await b.poolMigrator.query(`select count(*)::int as n from pgboss.job where name = 'agente.executar' and data->>'execucaoId' = $1`, [id])).rows[0].n, {
      timeout: 15_000,
    })
    .toBe(1);
});

it('job de batimento com payload fora do formato é descartado pelo schema, sem o conteúdo no log (Zod, C-21)', async () => {
  const linhas: string[] = [];
  substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
  try {
    await iniciar();
    const job = await deps.fila.boss.send(FILAS.workerBatimento, { texto: 'SENTINELA-TEXTO' });
    await expect
      .poll(async () => (await b.poolMigrator.query(`select state from pgboss.job where id = $1`, [job])).rows[0]?.state, { timeout: 15_000 })
      .toBe('completed');
    const registros = linhas.map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(registros).toContainEqual(expect.objectContaining({ evento: 'worker_payload_invalido', fila: FILAS.workerBatimento, jobId: job }));
    expect(linhas.join('\n')).not.toContain('SENTINELA');
  } finally {
    substituirDestinoDoLog(null);
  }
});

it('parar() encerra o worker e pode ser chamado de novo sem erro', async () => {
  const w = await iniciarWorker(deps);
  await w.parar();
  await expect(w.parar()).resolves.toBeUndefined();
});
