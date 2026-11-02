// Boot do app (C-31, C-33): `register()` do Next confere a configuração antes de atender e liga o Sentry só com DSN.
// Com segredo curto ou retenção fora de 1..365, o app não sobe, e o erro cita só o nome da variável.
import { afterEach, describe, expect, it, vi } from 'vitest';

const sentry = vi.hoisted(() => ({ chamadas: [] as Array<{ dsn?: string }> }));
vi.mock('./lib/sentry', () => ({
  iniciarSentry: (op: { dsn?: string }) => {
    sentry.chamadas.push(op);
  },
}));

const ENV_VALIDO = {
  NEXT_RUNTIME: 'nodejs',
  BETTER_AUTH_SECRET: 'SEGREDO-FICTICIO-DE-TESTE-'.padEnd(48, '0'),
  BETTER_AUTH_URL: 'http://127.0.0.1:3101',
  DATABASE_URL: 'postgres://ficticio:ficticio@127.0.0.1:5434/ficticio',
  RETENCAO_TEXTO_BRUTO_DIAS: '90',
  SENTRY_DSN: '',
};

function definirEnv(env: Record<string, string>) {
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
}

afterEach(() => {
  vi.unstubAllEnvs();
  sentry.chamadas.length = 0;
});

describe('instrumentation.register', () => {
  it('com a configuração válida, sobe e chama o Sentry com o DSN do ambiente (vazio = desligado)', async () => {
    definirEnv(ENV_VALIDO);
    const { register } = await import('./instrumentation');
    await expect(register()).resolves.toBeUndefined();
    expect(sentry.chamadas).toEqual([{ dsn: undefined }]);
  });
  it('passa o SENTRY_DSN quando existe', async () => {
    definirEnv({ ...ENV_VALIDO, SENTRY_DSN: 'https://chave@sentry.exemplo.test/1' });
    const { register } = await import('./instrumentation');
    await register();
    expect(sentry.chamadas).toEqual([{ dsn: 'https://chave@sentry.exemplo.test/1' }]);
  });
  it('C-33: segredo curto impede a subida e o erro cita só o nome', async () => {
    definirEnv({ ...ENV_VALIDO, BETTER_AUTH_SECRET: 'curto-SENTINELA' });
    const { register } = await import('./instrumentation');
    const erro = await register().catch((e: unknown) => e);
    expect(String(erro)).toContain('BETTER_AUTH_SECRET');
    expect(String(erro)).not.toContain('SENTINELA');
    expect(sentry.chamadas).toHaveLength(0);
  });
  it('C-31: retenção de 400 dias impede a subida', async () => {
    definirEnv({ ...ENV_VALIDO, RETENCAO_TEXTO_BRUTO_DIAS: '400' });
    const { register } = await import('./instrumentation');
    await expect(register()).rejects.toThrow('RETENCAO_TEXTO_BRUTO_DIAS');
  });
  it('fora do runtime nodejs não faz nada', async () => {
    definirEnv({ ...ENV_VALIDO, NEXT_RUNTIME: 'edge', BETTER_AUTH_SECRET: 'curto' });
    const { register } = await import('./instrumentation');
    await expect(register()).resolves.toBeUndefined();
    expect(sentry.chamadas).toHaveLength(0);
  });
});
