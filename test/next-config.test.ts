// next.config.ts (C-15, C-19, RNF-04): Server Actions só da origem de BETTER_AUTH_URL e com corpo de até 1 MB;
// cabeçalhos estáticos em toda resposta; HSTS só em produção; sem o cabeçalho X-Powered-By.
import { afterEach, describe, expect, it, vi } from 'vitest';

async function carregar() {
  vi.resetModules();
  return (await import('../next.config')).default;
}

async function cabecalhosDe(cfg: Awaited<ReturnType<typeof carregar>>) {
  const regras = await cfg.headers!();
  expect(regras).toHaveLength(1);
  expect(regras[0]!.source).toBe('/:path*');
  return Object.fromEntries(regras[0]!.headers.map((h) => [h.key.toLowerCase(), h.value]));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('next.config', () => {
  it('Server Actions: allowedOrigins só com o host de BETTER_AUTH_URL e bodySizeLimit de 1 MB', async () => {
    vi.stubEnv('BETTER_AUTH_URL', 'https://orquestrador.exemplo.test');
    const cfg = await carregar();
    expect(cfg.experimental?.serverActions).toEqual({ allowedOrigins: ['orquestrador.exemplo.test'], bodySizeLimit: '1mb' });
  });
  it('sem BETTER_AUTH_URL (no build), allowedOrigins fica vazio: só a própria origem', async () => {
    vi.stubEnv('BETTER_AUTH_URL', '');
    expect((await carregar()).experimental?.serverActions?.allowedOrigins).toEqual([]);
  });
  it('BETTER_AUTH_URL inválida não abre origem nenhuma', async () => {
    vi.stubEnv('BETTER_AUTH_URL', 'isto não é url');
    expect((await carregar()).experimental?.serverActions?.allowedOrigins).toEqual([]);
  });
  it('cabeçalhos estáticos fora de produção, sem HSTS', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const h = await cabecalhosDe(await carregar());
    expect(h).toEqual({ 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer', 'x-frame-options': 'DENY' });
  });
  it('em produção, também HSTS', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const h = await cabecalhosDe(await carregar());
    expect(h['strict-transport-security']).toBe('max-age=63072000; includeSubDomains');
    expect(h['x-frame-options']).toBe('DENY');
  });
  it('poweredByHeader desligado e nenhum cabeçalho CORS', async () => {
    const cfg = await carregar();
    expect(cfg.poweredByHeader).toBe(false);
    const h = await cabecalhosDe(cfg);
    for (const k of Object.keys(h)) expect(k.startsWith('access-control-')).toBe(false);
  });
});
