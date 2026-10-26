// Testes da etapa 06-T11-testes (qa-automacao): register() do boot (C-33) com variável obrigatória ausente ou URL fora
// de http/https: o app não sobe, o erro cita só o nome e o Sentry não liga.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SENTINELAS } from '../test/sentinelas';

const sentry = vi.hoisted(() => ({ chamadas: 0 }));
vi.mock('./lib/sentry', () => ({
  iniciarSentry: () => {
    sentry.chamadas++;
  },
}));

const ENV_VALIDO = {
  NEXT_RUNTIME: 'nodejs',
  BETTER_AUTH_SECRET: 'SEGREDO-FICTICIO-DE-TESTE-'.padEnd(48, '0'),
  BETTER_AUTH_URL: 'http://127.0.0.1:3101',
  DATABASE_URL: 'postgres://ficticio:ficticio@127.0.0.1:5434/ficticio',
};

afterEach(() => {
  vi.unstubAllEnvs();
  sentry.chamadas = 0;
});

async function subir(env: Record<string, string>): Promise<unknown> {
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const { register } = await import('./instrumentation');
  return register().then(
    () => null,
    (e: unknown) => e,
  );
}

describe('instrumentation.register QA', () => {
  it('sem DATABASE_URL o app não sobe, e o Sentry não liga', async () => {
    const erro = await subir({ ...ENV_VALIDO, DATABASE_URL: '' });
    expect(String(erro)).toContain('DATABASE_URL');
    expect(sentry.chamadas).toBe(0);
  });
  it('BETTER_AUTH_URL fora de http/https, com sentinela, não sobe e o erro não traz o valor', async () => {
    const erro = await subir({ ...ENV_VALIDO, BETTER_AUTH_URL: `javascript:${SENTINELAS.texto}` });
    expect(String(erro)).toContain('BETTER_AUTH_URL');
    expect(String(erro)).not.toContain(SENTINELAS.texto);
    expect(sentry.chamadas).toBe(0);
  });
  it('retenção nos limites (1 e 365) sobe', async () => {
    expect(await subir({ ...ENV_VALIDO, RETENCAO_TEXTO_BRUTO_DIAS: '1' })).toBeNull();
    expect(await subir({ ...ENV_VALIDO, RETENCAO_TEXTO_BRUTO_DIAS: '365' })).toBeNull();
    expect(sentry.chamadas).toBe(2);
  });
});
