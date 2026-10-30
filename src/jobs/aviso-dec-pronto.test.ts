// Handler da fila aviso.dec-pronto (T30; 02, seção 8) e o registro dela no worker. Banco real, pg-boss sobre o mesmo
// banco pelo papel do app, relógio fixo (RNF-15) e enviador falso (RNF-14). Dados só fictícios.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CONFIG_TESTE } from '../../test/auth';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { EnviadorFalso } from '../../test/enviador-falso';
import { SENTINELAS, contemSentinela } from '../../test/sentinelas';
import { user } from '../db/schema';
import { comTransacao } from '../db/transacao';
import { criarFila, FILAS } from '../lib/fila';
import { substituirDestinoDoLog } from '../lib/log';
import { relogioFixo } from '../lib/relogio';
import type { AtorPessoa } from '../modules/acesso/ator';
import type { DepsAviso } from '../modules/avisos/aviso-dec';
import { criarDemandaSchema } from '../modules/demandas/schemas';
import { criarDemanda } from '../modules/demandas/servico';
import { criarEspecificacaoSchema } from '../modules/especificacoes/schemas';
import { criarEspecificacao } from '../modules/especificacoes/servico';
import { criarPacoteDecisao } from '../modules/pacotes-decisao/criar';
import { criarPacoteDecisaoSchema } from '../modules/pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../modules/pareceres-risco/servico';
import { iniciarWorker, type DepsWorker } from '../worker/iniciar';
import { tratarAvisoDecPronto } from './aviso-dec-pronto';

const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-aviso-job-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const relogio = relogioFixo('2026-10-22T12:00:00Z');
const CONFIG = { ...CONFIG_TESTE, emailRemetente: 'avisos@exemplo.test', emailAvisoDecisao: 'decisao@exemplo.test' };

let b: BancoDeTeste;
let deps: DepsWorker;
let enviador: EnviadorFalso;
let dia = 0;
const linhas: string[] = [];
const paradas: Array<() => Promise<void>> = [];

beforeAll(async () => {
  b = await novoBanco();
  await b.db.insert(user).values({ id: cto.usuarioId, name: cto.nome, email: 'aviso-job-cto@exemplo.test', papel: 'cto' });
});
afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});
beforeEach(async () => {
  relogio.definir('2026-10-22T12:00:00Z');
  relogio.avancar(++dia * 86_400_000);
  enviador = new EnviadorFalso();
  // A fila de cada teste é nova: o worker de um teste não pega o job do outro.
  if (deps) await deps.fila.parar();
  deps = {
    db: b.db,
    pool: b.poolApp,
    relogio,
    fila: await criarFila(b.urlApp, { agendador: true }),
    provedor: null,
    config: { ...CONFIG, databaseUrl: b.urlApp },
    enviador,
  };
  await b.poolMigrator.query(`delete from pgboss.job where name = $1`, [FILAS.avisoDecPronto]);
  linhas.length = 0;
  substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
});
afterEach(async () => {
  substituirDestinoDoLog(null);
  while (paradas.length > 0) await paradas.pop()!();
});

const depsAviso = (): DepsAviso => ({ pool: b.poolApp, relogio, config: CONFIG, enviador });
const registros = () => linhas.map((l) => JSON.parse(l) as Record<string, unknown>);
const statusDoAviso = async (decId: string) => (await b.poolMigrator.query('select status from aviso_email where pacote_decisao_id = $1', [decId])).rows[0]?.status;

async function decPronto(): Promise<string> {
  const d = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' }));
  await criarEspecificacao(
    deps,
    cto,
    d.id,
    criarEspecificacaoSchema.parse({
      descricaoObjetiva: 'x',
      escopoInclui: ['a'],
      sistemaAlvo: 'meu-sistema',
      repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
      criteriosAceitePreliminares: ['c'],
      definicaoDePronto: ['p'],
    }),
  );
  await criarParecerRisco(deps, cto, d.id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
  const dec = await criarPacoteDecisao(
    deps,
    cto,
    d.id,
    criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'r', opcaoA: { descricao: 'A' }, opcaoB: { descricao: 'B' }, nivelAprovacaoRequerido: 'cto' }),
  );
  return dec.id;
}

describe('tratarAvisoDecPronto', () => {
  it('payload válido → envia e registra o resultado só com ids e status', async () => {
    const decId = await decPronto();
    await tratarAvisoDecPronto(depsAviso(), [{ id: 'job-1', data: { decId } }]);
    expect(enviador.enviados).toHaveLength(1);
    expect(registros()).toContainEqual(expect.objectContaining({ evento: 'aviso_job_tratado', fila: FILAS.avisoDecPronto, jobId: 'job-1', status: 'enviado' }));
    expect(linhas.join('\n')).not.toContain(CONFIG.emailAvisoDecisao);
  });

  it('payload fora do schema (Zod, C-22) → descartado sem o conteúdo no log e sem envio', async () => {
    await tratarAvisoDecPronto(depsAviso(), [
      { id: 'job-2', data: { decId: 'DEC-DEM-20261022-0001-v1', email: SENTINELAS.email } },
      { id: 'job-3', data: { texto: SENTINELAS.texto } },
    ]);
    expect(enviador.chamadas).toBe(0);
    expect(registros().filter((r) => r.evento === 'aviso_payload_invalido').map((r) => r.jobId)).toEqual(['job-2', 'job-3']);
    expect(contemSentinela(linhas.join('\n'))).toBe(false);
  });

  it('falha passageira → relança um erro de mensagem fixa, para o pg-boss tentar de novo', async () => {
    const decId = await decPronto();
    enviador.falhasAntes = 1;
    const erro = await tratarAvisoDecPronto(depsAviso(), [{ id: 'job-4', data: { decId } }]).then(
      () => null,
      (e: unknown) => e as Error,
    );
    expect(erro).toBeInstanceOf(Error);
    expect(erro?.message).toBe('aviso_nao_enviado');
    expect(await statusDoAviso(decId)).toBe('pendente');
  });

  it('erro inesperado → relança sem a mensagem original, com log reduzido', async () => {
    const quebrado: DepsAviso = {
      ...depsAviso(),
      pool: { connect: async () => Promise.reject(new Error(`banco fora ${SENTINELAS.email}`)) } as unknown as DepsAviso['pool'],
    };
    const erro = await tratarAvisoDecPronto(quebrado, [{ id: 'job-5', data: { decId: 'DEC-DEM-20261022-0001-v1' } }]).then(
      () => null,
      (e: unknown) => e as Error,
    );
    expect(erro?.message).toBe('aviso_erro_inesperado');
    expect(erro?.cause).toBeUndefined();
    expect(contemSentinela(`${erro?.message}\n${erro?.stack}`)).toBe(false);
    expect(registros()).toContainEqual(expect.objectContaining({ evento: 'aviso_erro_inesperado', jobId: 'job-5', erro: { classe: 'Error' } }));
    expect(contemSentinela(linhas.join('\n'))).toBe(false);
  });

  // 06-T30-testes (qa-automacao): CA-25.2 pelo handler, com os dois jobs do mesmo DEC no mesmo lote.
  it('CA-25.2 no handler: dois jobs do mesmo DEC → um e-mail só, o segundo termina ja_enviado', async () => {
    const decId = await decPronto();
    await tratarAvisoDecPronto(depsAviso(), [
      { id: 'job-6', data: { decId } },
      { id: 'job-7', data: { decId } },
    ]);
    expect(enviador.enviados).toHaveLength(1);
    expect(enviador.chamadas).toBe(1);
    expect(
      registros()
        .filter((r) => r.evento === 'aviso_job_tratado')
        .map((r) => [r.jobId, r.status]),
    ).toEqual([
      ['job-6', 'enviado'],
      ['job-7', 'ja_enviado'],
    ]);
    expect(await statusDoAviso(decId)).toBe('enviado');
  });
});

describe('no worker', () => {
  async function iniciar(d: DepsWorker = deps) {
    const w = await iniciarWorker(d);
    paradas.push(w.parar);
    return w;
  }

  it('o worker registra aviso.dec-pronto: DEC criado → um e-mail, job concluído e aviso enviado', async () => {
    await iniciar();
    const decId = await decPronto();
    await expect.poll(() => enviador.enviados.length, { timeout: 15_000 }).toBe(1);
    await expect.poll(() => statusDoAviso(decId), { timeout: 5_000 }).toBe('enviado');
    await expect
      .poll(async () => (await b.poolMigrator.query(`select state from pgboss.job where name = $1 and data->>'decId' = $2`, [FILAS.avisoDecPronto, decId])).rows.map((r) => r.state), {
        timeout: 5_000,
      })
      .toEqual(['completed']);
    expect(enviador.enviados[0]!.texto).toContain(decId);
  });

  it('sem enviador nas dependências, o worker usa o que não envia: aviso sem_provedor', async () => {
    await iniciar({ ...deps, enviador: undefined });
    const decId = await decPronto();
    await expect.poll(() => statusDoAviso(decId), { timeout: 15_000 }).toBe('sem_provedor');
    expect(enviador.chamadas).toBe(0);
  });

  it('parar() tira também o work de aviso.dec-pronto: o job criado depois fica na fila', async () => {
    const w = await iniciar();
    await w.parar();
    const decId = await decPronto();
    await new Promise((r) => setTimeout(r, 2_500));
    expect(enviador.chamadas).toBe(0);
    expect(await statusDoAviso(decId)).toBe('pendente');
  });

  // 06-T30-testes (qa-automacao): CA-25.1 e CA-25.2 pelo caminho real (DEC criado → job no pg-boss → worker → enviador).
  const jobsDoDec = async (decId: string) =>
    (
      await b.poolMigrator.query(`select state, retry_count, retry_limit, output from pgboss.job where name = $1 and data->>'decId' = $2 order by created_on, id`, [
        FILAS.avisoDecPronto,
        decId,
      ])
    ).rows as Array<{ state: string; retry_count: number; retry_limit: number; output: unknown }>;

  it('CA-25.2 no worker: o mesmo aviso enfileirado duas vezes → os dois jobs concluem e sai um e-mail só, com o id e o link (CA-25.1)', async () => {
    const decId = await decPronto();
    // O segundo job do mesmo DEC, sem singletonKey (por exemplo, um reenvio manual), antes de o worker subir.
    await comTransacao(b.poolApp, ({ executor }) => deps.fila.enviar(executor, FILAS.avisoDecPronto, { decId }));
    expect(await jobsDoDec(decId)).toHaveLength(2);
    await iniciar();
    await expect.poll(async () => (await jobsDoDec(decId)).map((j) => j.state), { timeout: 15_000 }).toEqual(['completed', 'completed']);
    expect(enviador.enviados).toHaveLength(1);
    expect(enviador.chamadas).toBe(1);
    expect(enviador.enviados[0]!.texto).toContain(decId);
    expect(enviador.enviados[0]!.texto).toContain(`Abrir a tela de decisão: ${CONFIG_TESTE.urlBase}/pacotes-decisao/${decId}`);
    expect(enviador.enviados[0]!.para).toBe(CONFIG.emailAvisoDecisao);
    expect(await statusDoAviso(decId)).toBe('enviado');
  });

  it('falha no envio dentro do worker → o job fica em retry no pg-boss (3 execuções), com a mensagem fixa e sem dado do erro original', async () => {
    const quebrado = { enviar: async () => Promise.reject(new Error(`quebrou para ${SENTINELAS.email} ${SENTINELAS.texto}`)) };
    await iniciar({ ...deps, enviador: quebrado });
    const decId = await decPronto();
    await expect.poll(async () => (await jobsDoDec(decId)).map((j) => j.state), { timeout: 15_000 }).toEqual(['retry']);
    const [job] = await jobsDoDec(decId);
    // retry_limit 2 = 1 execução + 2 novas tentativas (TENTATIVAS_AVISO). O pg-boss só conta retry_count ao buscar de novo.
    expect(job).toMatchObject({ retry_limit: 2 });
    expect(JSON.stringify(job!.output)).toContain('aviso_nao_enviado');
    expect(contemSentinela(JSON.stringify(job!.output))).toBe(false);
    expect((await b.poolMigrator.query('select status, tentativas from aviso_email where pacote_decisao_id = $1', [decId])).rows[0]).toEqual({ status: 'pendente', tentativas: 1 });
    expect(contemSentinela(linhas.join('\n'))).toBe(false);
  });
});
