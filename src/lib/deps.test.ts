// obterDeps(): as dependências de produção, montadas uma vez a partir de lerConfigApp() (C-27, C-33). Banco real
// (Testcontainers) para a montagem de verdade, com o papel do app.
import { afterAll, beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { CONFIG_TESTE } from '../../test/auth';

let b: BancoDeTeste;

beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

const envValido = () => {
  vi.stubEnv('BETTER_AUTH_SECRET', CONFIG_TESTE.segredoAuth);
  vi.stubEnv('BETTER_AUTH_URL', 'http://127.0.0.1:3101');
  vi.stubEnv('DATABASE_URL', b.urlApp);
};

describe('obterDeps', () => {
  it('importar o módulo não lê variável de ambiente', async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', '');
    vi.stubEnv('DATABASE_URL', '');
    const m = await import('./deps');
    expect(typeof m.obterDeps).toBe('function');
  });
  it('monta uma vez só, mesmo com chamadas ao mesmo tempo, sobre DATABASE_URL e o relógio do sistema', async () => {
    envValido();
    const { obterDeps } = await import('./deps');
    const { relogioDoSistema } = await import('./relogio');
    const [d1, d2] = await Promise.all([obterDeps(), obterDeps()]);
    try {
      expect(d1).toBe(d2);
      expect(await obterDeps()).toBe(d1);
      expect(d1.relogio).toBe(relogioDoSistema);
      expect(d1.config).toMatchObject({ urlBase: 'http://127.0.0.1:3101', databaseUrl: b.urlApp, retencaoDias: 90 });
      const { rows } = await d1.pool.query<{ usuario: string }>('select current_user as usuario');
      expect(rows[0]!.usuario).toBe('orquestrador_app');
      expect(typeof d1.auth.handler).toBe('function');
      expect(typeof d1.fila.enviar).toBe('function');
    } finally {
      await d1.fila.parar();
      await d1.pool.end();
    }
  });
  it('C-33: configuração inválida rejeita com o nome da variável, sem o valor, e a próxima chamada tenta de novo', async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', 'curto-SENTINELA');
    vi.stubEnv('BETTER_AUTH_URL', 'http://127.0.0.1:3101');
    vi.stubEnv('DATABASE_URL', b.urlApp);
    const { obterDeps } = await import('./deps');
    const erro = await obterDeps().catch((e: unknown) => e);
    expect(String(erro)).toContain('BETTER_AUTH_SECRET');
    expect(String(erro)).not.toContain('SENTINELA');
    envValido();
    const d = await obterDeps();
    await d.fila.parar();
    await d.pool.end();
  });
  it('definirDepsParaTeste troca o que obterDeps devolve; null volta ao normal', async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', 'curto');
    const { definirDepsParaTeste, obterDeps } = await import('./deps');
    const falsos = { marcador: 'deps-falsos' } as never;
    definirDepsParaTeste(falsos);
    expect(await obterDeps()).toBe(falsos);
    definirDepsParaTeste(null);
    await expect(obterDeps()).rejects.toThrow('BETTER_AUTH_SECRET');
  });
});
