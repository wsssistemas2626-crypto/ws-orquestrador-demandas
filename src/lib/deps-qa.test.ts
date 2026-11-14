// Testes da etapa 06-T11-testes (qa-automacao): obterDeps() com DATABASE_URL_MIGRATOR presente no ambiente segue só no
// papel do app, inclusive na fila (C-27); banco fora no boot rejeita sem a senha da URL e a próxima chamada monta de
// novo. Banco real (Testcontainers).
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { CONFIG_TESTE } from '../../test/auth';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { SENTINELAS } from '../../test/sentinelas';
import { diagnosticoDasSessoes, papeisDasSessoesDeCliente, sessoesDoBanco } from '../../test/sessoes-do-banco';

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

describe('obterDeps QA', () => {
  it('C-27: com DATABASE_URL_MIGRATOR no ambiente, o pool e a fila conectam só como orquestrador_app', async () => {
    envValido();
    vi.stubEnv('DATABASE_URL_MIGRATOR', b.urlMigrator);
    const { obterDeps } = await import('./deps');
    const d = await obterDeps();
    try {
      // A fila já conectou no start(); o pool conecta aqui. Toda sessão de cliente deste banco é do papel do app
      // (`select distinct usename` só de `client backend`, com espera contada pela sessão ainda sem papel; C-27, SB-14).
      const papeis = await papeisDasSessoesDeCliente(d.pool);
      const diagnostico = diagnosticoDasSessoes(await sessoesDoBanco(d.pool));
      expect(papeis, diagnostico).toEqual(['orquestrador_app']);
      expect(d.config.databaseUrl).toBe(b.urlApp);
      expect(Object.values(d.config)).not.toContain(b.urlMigrator);
    } finally {
      await d.fila.parar();
      await d.pool.end();
    }
  });
  it('banco fora no boot: rejeita sem a senha da URL, e a próxima chamada, com o banco de pé, monta', async () => {
    envValido();
    vi.stubEnv('DATABASE_URL', `postgres://ficticio:${encodeURIComponent(SENTINELAS.senha)}@127.0.0.1:1/ficticio`);
    const { obterDeps } = await import('./deps');
    const erro = await obterDeps().then(
      () => null,
      (e: unknown) => e,
    );
    expect(erro).not.toBeNull();
    expect(String(erro)).not.toContain(SENTINELAS.senha);
    expect(JSON.stringify(erro, Object.getOwnPropertyNames(erro ?? {}))).not.toContain(SENTINELAS.senha);
    vi.stubEnv('DATABASE_URL', b.urlApp);
    const d = await obterDeps();
    try {
      expect(d.config.databaseUrl).toBe(b.urlApp);
    } finally {
      await d.fila.parar();
      await d.pool.end();
    }
  }, 30_000);
  it('chamadas ao mesmo tempo com a montagem falhando: as duas rejeitam, e nenhuma fica presa', async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', 'curto');
    const { obterDeps } = await import('./deps');
    const r = await Promise.allSettled([obterDeps(), obterDeps()]);
    expect(r.map((x) => x.status)).toEqual(['rejected', 'rejected']);
  });
});
