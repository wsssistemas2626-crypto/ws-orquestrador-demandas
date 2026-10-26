// Testes da etapa 06-T11-testes (qa-automacao): GET /api/saude (RNF-17, ADR-12) quando os Deps nem montam (configuração
// inválida no boot) e quando o banco recusa a conexão: 503 rápido, sem motivo na resposta e sem segredo no log; e a
// resposta de 200 sem nada além do status. Banco real (Testcontainers).
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarDepsDeTeste } from '../../../../test/deps';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { SENTINELAS, contemSentinela } from '../../../../test/sentinelas';
import { criarDb, criarPool } from '../../../db';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { substituirDestinoDoLog } from '../../../lib/log';
import { GET } from './route';

let b: BancoDeTeste;
let deps: Deps;
const linhas: string[] = [];

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  substituirDestinoDoLog({
    write: (l) => {
      linhas.push(l);
    },
  });
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});
beforeEach(() => {
  linhas.length = 0;
});
afterEach(() => {
  definirDepsParaTeste(null);
  vi.unstubAllEnvs();
});

describe('GET /api/saude QA', () => {
  it('Deps que não montam (segredo curto no ambiente) → 503 indisponivel, sem o valor no log', async () => {
    definirDepsParaTeste(null);
    vi.stubEnv('BETTER_AUTH_SECRET', SENTINELAS.senha);
    vi.stubEnv('BETTER_AUTH_URL', 'http://127.0.0.1:3101');
    vi.stubEnv('DATABASE_URL', b.urlApp);
    const r = await GET();
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ status: 'indisponivel' });
    expect(r.headers.get('cache-control')).toBe('no-store');
    const texto = linhas.join('\n');
    expect(texto).toContain('"evento":"saude_indisponivel"');
    expect(contemSentinela(texto)).toBe(false);
  });
  it('banco que recusa a conexão → 503, e o log não leva a URL nem a senha', async () => {
    const url = `postgres://ficticio:${encodeURIComponent(SENTINELAS.senha)}@127.0.0.1:1/ficticio`;
    const pool = criarPool(url, { max: 1 });
    try {
      definirDepsParaTeste({ ...deps, pool, db: criarDb(pool) });
      const r = await GET();
      expect(r.status).toBe(503);
      expect(await r.json()).toEqual({ status: 'indisponivel' });
      const texto = linhas.join('\n');
      expect(texto).toContain('"evento":"saude_indisponivel"');
      expect(texto).not.toContain('127.0.0.1:1');
      expect(contemSentinela(texto)).toBe(false);
    } finally {
      await pool.end();
    }
  });
  it('200 só com { status: ok }: sem versão, sem cabeçalho de servidor, com nosniff e no-referrer', async () => {
    definirDepsParaTeste(deps);
    const r = await GET();
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('{"status":"ok"}');
    expect(r.headers.get('content-type')).toMatch(/^application\/json/);
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('referrer-policy')).toBe('no-referrer');
    expect(r.headers.get('x-powered-by')).toBeNull();
    expect(r.headers.get('server')).toBeNull();
    for (const [k] of r.headers) expect(k.startsWith('access-control-'), k).toBe(false);
  });
  it('a resposta de 200 não deixa linha de log (o healthcheck roda a cada poucos segundos)', async () => {
    definirDepsParaTeste(deps);
    expect((await GET()).status).toBe(200);
    expect(linhas).toHaveLength(0);
  });
});
