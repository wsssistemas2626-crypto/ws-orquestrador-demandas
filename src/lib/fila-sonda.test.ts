// Testes da etapa 06-T07-testes (qa-automacao): sondas do pg-boss 12.34.0 que fila.test.ts não prova sozinho.
// Banco próprio por arquivo; o teste de `migrate: false` usa ainda um segundo banco, porque rebaixa a versão do esquema.
// Nenhum teste depende de outro: cada um envia e confere só os próprios jobs, pelo id devolvido.
import { PgBoss } from 'pg-boss';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { comTransacao, type Executor } from '../db/transacao';
import { FILAS, criarFila, type Fila, type NomeFila } from './fila';
import { substituirDestinoDoLog } from './log';

let b: BancoDeTeste;
let fila: Fila & { boss: PgBoss };
beforeAll(async () => {
  b = await novoBanco();
  fila = await criarFila(b.urlApp);
});
afterAll(async () => {
  await fila.parar();
  await b.fechar();
});

const UUID = '00000000-0000-4000-8000-0000000000a1';
const dadosDoJob = async (id: string) => (await b.poolMigrator.query(`select name, data from pgboss.job where id = $1`, [id])).rows;
// Executor que não fala com banco nenhum: se o Zod deixasse passar, o pg-boss o chamaria para gravar o job.
const executorFalso = () => ({ executeSql: vi.fn(async () => ({ rows: [] as unknown[] })) }) satisfies Executor;

describe('payload por fila (C-22): fora do formato, a recusa vem do Zod e o banco nem é tocado', () => {
  it.each<[string, NomeFila, unknown]>([
    ['agente.executar com execucaoId que não é uuid', FILAS.agenteExecutar, { execucaoId: 'x' }],
    ['agente.executar sem execucaoId', FILAS.agenteExecutar, {}],
    ['agente.executar com demandaId a mais', FILAS.agenteExecutar, { execucaoId: UUID, demandaId: 'DEM-20261022-0001' }],
    ['agente.executar com o texto da demanda', FILAS.agenteExecutar, { execucaoId: UUID, texto: 'SENTINELA-TEXTO' }],
    ['aviso.dec-pronto com id de ESP', FILAS.avisoDecPronto, { decId: 'ESP-DEM-20261022-0001-v1' }],
    ['aviso.dec-pronto com sufixo depois do id', FILAS.avisoDecPronto, { decId: "DEC-DEM-20261022-0001-v1' or 1=1" }],
    ['aviso.dec-pronto com quebra de linha no fim', FILAS.avisoDecPronto, { decId: 'DEC-DEM-20261022-0001-v1\n' }],
    ['aviso.dec-pronto com versão de cinco dígitos', FILAS.avisoDecPronto, { decId: 'DEC-DEM-20261022-0001-v12345' }],
    ['aviso.dec-pronto com o e-mail do destinatário', FILAS.avisoDecPronto, { decId: 'DEC-DEM-20261022-0001-v1', email: 'pessoa.ficticia@exemplo.test' }],
    ['aviso.dec-pronto com payload nulo', FILAS.avisoDecPronto, null],
    ['retencao.expurgo com qualquer chave', FILAS.retencaoExpurgo, { texto: 'SENTINELA-TEXTO' }],
    ['worker.batimento com qualquer chave', FILAS.workerBatimento, { instancia: 'w1' }],
  ])('%s: recusado', async (_caso, nome, payload) => {
    const executor = executorFalso();
    await expect(fila.enviar(executor, nome, payload as never)).rejects.toBeInstanceOf(z.ZodError);
    expect(executor.executeSql).not.toHaveBeenCalled();
  });

  it.each<[string, NomeFila, object]>([
    ['agente.executar só com o uuid da execução', FILAS.agenteExecutar, { execucaoId: UUID }],
    ['aviso.dec-pronto com versão de quatro dígitos (limite)', FILAS.avisoDecPronto, { decId: 'DEC-DEM-20261022-0001-v9999' }],
    ['retencao.expurgo vazio', FILAS.retencaoExpurgo, {}],
    ['worker.batimento vazio', FILAS.workerBatimento, {}],
  ])('%s: aceito, pelo executor da transação, e gravado igual ao enviado', async (_caso, nome, payload) => {
    const id = await comTransacao(b.poolApp, async ({ executor }) => {
      const espiao = { executeSql: vi.fn((texto: string, valores?: unknown[]) => executor.executeSql(texto, valores)) };
      const r = await fila.enviar(espiao, nome, payload as never);
      expect(espiao.executeSql).toHaveBeenCalled();
      return r;
    });
    expect(id).not.toBeNull();
    expect(await dadosDoJob(id!)).toEqual([{ name: nome, data: payload }]);
  });
});

describe('envio na transação (ADR-06): antes do commit, nenhuma outra conexão vê o job', () => {
  it('o job só aparece para outra conexão depois do commit', async () => {
    let visivelAntes: unknown[] | undefined;
    const id = await comTransacao(b.poolApp, async ({ executor }) => {
      const r = await fila.enviar(executor, FILAS.workerBatimento, {});
      visivelAntes = await dadosDoJob(r!);
      return r;
    });
    expect(visivelAntes).toEqual([]);
    expect(await dadosDoJob(id!)).toEqual([{ name: FILAS.workerBatimento, data: {} }]);
  });
});

describe('opções das filas, como o plano manda (ADR-07, P1-e)', () => {
  it('agente.executar: sem retry do pg-boss (a nova tentativa é da execução, T27) e expira em 180 s', async () => {
    expect(await fila.boss.getQueue(FILAS.agenteExecutar)).toMatchObject({ policy: 'stately', retryLimit: 0, expireInSeconds: 180 });
  });

  it('aviso.dec-pronto: 2 novas tentativas, a partir de 60 s, com espera crescente', async () => {
    expect(await fila.boss.getQueue(FILAS.avisoDecPronto)).toMatchObject({ policy: 'standard', retryLimit: 2, retryDelay: 60, retryBackoff: true });
  });
});

describe('migrate: false (T-02; parecer 3 da 06-T07-revisao)', () => {
  it('com o esquema pgboss numa versão anterior, criarFila recusa sem tentar DDL; sem a opção, o pg-boss tentaria migrar e o banco recusaria (42501)', async () => {
    const b2 = await novoBanco();
    try {
      const versao = async () => (await b2.poolMigrator.query('select version from pgboss.version')).rows.map((r) => r.version as number);
      const [atual] = await versao();
      await b2.poolMigrator.query('update pgboss.version set version = version - 1');

      // Com migrate: false o pg-boss só confere a versão: falha sem chegar ao banco com DDL (sem code do Postgres).
      const comOpcao = await criarFila(b2.urlApp).then(
        async (f) => {
          await f.parar();
          return null;
        },
        (e: unknown) => e as Error & { code?: string },
      );
      expect(comOpcao).toBeInstanceOf(Error);
      expect(comOpcao?.message).toBe('pg-boss database requires migrations');
      expect(comOpcao?.code).toBeUndefined();

      // Controle: o mesmo papel, sem migrate: false, tenta migrar e o banco recusa. É o que o teste acima pega se a
      // opção sair de criarFila.
      const semOpcao = new PgBoss({ connectionString: b2.urlApp, schema: 'pgboss', supervise: false, schedule: false });
      semOpcao.on('error', () => {});
      await expect(semOpcao.start()).rejects.toMatchObject({ code: '42501' });

      expect(await versao()).toEqual([atual! - 1]);
    } finally {
      await b2.fechar();
    }
  });
});

describe('ouvinte de error (desvio 3; parecer 5 da 06-T07-revisao)', () => {
  it('erro emitido pelo pg-boss não derruba o processo e vai ao log só com classe e código', async () => {
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    let tratado: boolean;
    try {
      const erro = Object.assign(new Error('SENTINELA-MENSAGEM postgres://orquestrador_app:SENTINELA-SENHA@db.exemplo.test/x'), {
        code: '57P01',
        detail: 'SENTINELA-DETALHE',
      });
      tratado = fila.boss.emit('error', erro);
    } finally {
      substituirDestinoDoLog(null);
    }
    expect(tratado).toBe(true);
    expect(linhas).toHaveLength(1);
    expect(JSON.parse(linhas[0]!)).toMatchObject({ level: 40, evento: 'fila_erro', erro: { classe: 'Error', code: '57P01' } });
    expect(linhas[0]).not.toContain('SENTINELA');
  });

  it('controle: um PgBoss sem ouvinte lança o erro emitido (é o que derrubaria o processo)', () => {
    const semOuvinte = new PgBoss({ connectionString: b.urlApp, schema: 'pgboss', migrate: false, supervise: false, schedule: false });
    expect(() => semOuvinte.emit('error', new Error('erro sem ouvinte'))).toThrow('erro sem ouvinte');
  });
});
