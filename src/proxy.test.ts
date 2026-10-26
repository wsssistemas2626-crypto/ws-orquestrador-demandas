// Proxy do Next 16 (C-19): CSP com nonce novo a cada requisição e `Cache-Control: no-store` nas páginas. Não decide
// acesso (C-04): quem decide é `exigirPessoa`, dentro de cada página, rota e Server Action.
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { config, proxy } from './proxy';

const pedir = (caminho = '/demandas', cabecalhos: Record<string, string> = {}) =>
  proxy(new NextRequest(`http://127.0.0.1:3101${caminho}`, { headers: cabecalhos }));

const nonceDa = (csp: string) => /'nonce-([^']+)'/.exec(csp)?.[1];

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('proxy', () => {
  it('CSP de C-19 com nonce, na resposta', () => {
    const csp = pedir().headers.get('content-security-policy')!;
    const n = nonceDa(csp);
    expect(n).toMatch(/^[A-Za-z0-9+/]{22,}={0,2}$/);
    expect(csp).toBe(
      `default-src 'self'; script-src 'self' 'nonce-${n}' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`,
    );
  });
  it('nonce diferente a cada requisição', () => {
    expect(nonceDa(pedir().headers.get('content-security-policy')!)).not.toBe(nonceDa(pedir().headers.get('content-security-policy')!));
  });
  it('repassa o nonce e a CSP à página nos cabeçalhos da requisição (x-nonce)', () => {
    const r = pedir();
    const n = nonceDa(r.headers.get('content-security-policy')!);
    expect(r.headers.get('x-middleware-request-x-nonce')).toBe(n);
    expect(r.headers.get('x-middleware-request-content-security-policy')).toBe(r.headers.get('content-security-policy'));
  });
  it('x-nonce mandado pelo cliente é trocado pelo do servidor', () => {
    const r = pedir('/demandas', { 'x-nonce': 'nonce-do-atacante' });
    expect(r.headers.get('x-middleware-request-x-nonce')).not.toBe('nonce-do-atacante');
  });
  it('Cache-Control: no-store na página', () => {
    expect(pedir('/demandas/DEM-20261022-0001').headers.get('cache-control')).toBe('no-store');
  });
  it('não redireciona nem nega: segue para a página (não decide acesso)', () => {
    const r = pedir('/demandas');
    expect(r.status).toBe(200);
    expect(r.headers.get('location')).toBeNull();
    expect(r.headers.get('x-middleware-next')).toBe('1');
  });
  it('só no desenvolvimento a CSP aceita eval (exigido pelo React em modo dev)', () => {
    expect(pedir().headers.get('content-security-policy')).not.toContain('unsafe-eval');
    vi.stubEnv('NODE_ENV', 'development');
    expect(pedir().headers.get('content-security-policy')).toContain("'unsafe-eval'");
  });
  it('o matcher deixa de fora só os arquivos estáticos do Next', () => {
    const fonte = (config.matcher as Array<{ source: string }>)[0]!.source;
    const re = new RegExp(`^${fonte}$`);
    expect(re.test('/demandas')).toBe(true);
    expect(re.test('/api/demandas')).toBe(true);
    expect(re.test('/_next/static/chunks/app.js')).toBe(false);
    expect(re.test('/_next/image')).toBe(false);
    expect(re.test('/favicon.ico')).toBe(false);
  });
});
