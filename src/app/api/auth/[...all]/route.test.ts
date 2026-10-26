// A rota do Better Auth não lê variável de ambiente ao ser importada: o `next build` carrega o módulo sem a
// configuração de produção. A configuração é lida (e conferida, C-33) só na primeira requisição.
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('rota /api/auth/[...all]', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('importa sem variável de ambiente e expõe GET e POST', async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', '');
    vi.stubEnv('BETTER_AUTH_URL', '');
    vi.stubEnv('DATABASE_URL', '');
    const rota = await import('./route');
    expect(typeof rota.GET).toBe('function');
    expect(typeof rota.POST).toBe('function');
  });

  it('com segredo curto, a requisição falha sem expor o valor (C-33)', async () => {
    vi.stubEnv('BETTER_AUTH_SECRET', 'curto-SENTINELA');
    vi.stubEnv('BETTER_AUTH_URL', 'http://127.0.0.1:3101');
    vi.stubEnv('DATABASE_URL', 'postgres://u:p@127.0.0.1:1/d');
    const rota = await import('./route');
    const erro = await rota.GET(new Request('http://127.0.0.1:3101/api/auth/get-session')).catch((e: unknown) => e);
    expect(String(erro)).toContain('BETTER_AUTH_SECRET');
    expect(String(erro)).not.toContain('SENTINELA');
  });

  it('T11: usa o Better Auth de obterDeps, o mesmo das rotas e das páginas', async () => {
    const rota = await import('./route');
    const { definirDepsParaTeste } = await import('../../../../lib/deps');
    const vistos: string[] = [];
    definirDepsParaTeste({
      auth: {
        handler: async (r: Request) => {
          vistos.push(new URL(r.url).pathname);
          return new Response(null, { status: 299 });
        },
      },
    } as never);
    try {
      const r = await rota.POST(new Request('http://127.0.0.1:3101/api/auth/sign-in/email', { method: 'POST' }));
      expect(r.status).toBe(299);
      expect(vistos).toEqual(['/api/auth/sign-in/email']);
    } finally {
      definirDepsParaTeste(null);
    }
  });
});
