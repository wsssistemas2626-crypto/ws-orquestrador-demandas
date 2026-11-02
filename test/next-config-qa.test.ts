// Testes da etapa 06-T11-testes (qa-automacao): next.config.ts (C-15). A origem das Server Actions é o host de
// BETTER_AUTH_URL com a porta, sem caminho e nunca um curinga.
import { afterEach, describe, expect, it, vi } from 'vitest';

async function origens() {
  vi.resetModules();
  return (await import('../next.config')).default.experimental?.serverActions?.allowedOrigins;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('next.config QA: allowedOrigins', () => {
  it('BETTER_AUTH_URL com porta e caminho → só o host com a porta', async () => {
    vi.stubEnv('BETTER_AUTH_URL', 'https://orquestrador.exemplo.test:8443/painel?x=1');
    expect(await origens()).toEqual(['orquestrador.exemplo.test:8443']);
  });
  it('BETTER_AUTH_URL que não é URL (curinga solto, texto) não abre origem nenhuma', async () => {
    for (const valor of ['*', '*.exemplo.test', 'orquestrador.exemplo.test']) {
      vi.stubEnv('BETTER_AUTH_URL', valor);
      expect(await origens(), valor).toEqual([]);
    }
  });
});
