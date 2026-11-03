// Boot do app (C-31, C-33): `register()` do Next confere a configuração antes de atender e liga o Sentry só com DSN.
// Com segredo curto ou retenção fora de 1..365, o app não sobe, e o erro cita só o nome da variável.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { desinstalarConsoleSaneado } from './lib/console-saneado';
import { substituirDestinoDoLog } from './lib/log';

// O `console` do processo pelo global, sem desligar o no-console (G3.7) neste arquivo.
const terminal: Console = globalThis.console;

const sentry = vi.hoisted(() => ({ chamadas: [] as Array<{ dsn?: string }>, capturados: [] as Array<{ erro: unknown; contexto?: { evento: string } }> }));
vi.mock('./lib/sentry', () => ({
  iniciarSentry: (op: { dsn?: string }) => {
    sentry.chamadas.push(op);
  },
  capturarErro: (erro: unknown, contexto?: { evento: string }) => {
    sentry.capturados.push({ erro, contexto });
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
  sentry.capturados.length = 0;
  substituirDestinoDoLog(null);
  // register() troca o console (M-05 c): cada teste devolve o original.
  desinstalarConsoleSaneado();
});

// M-05 (b) (DEC-DEM-20261103-0007-v1, C-21): o erro de página, layout ou metadados vai ao log por lista de permissão e
// ao Sentry pelo mesmo saneamento das rotas, com o digest do Next como identificador.
describe('instrumentation.onRequestError', () => {
  const SENTINELA = 'token-ficticio-SENTINELA-0007';

  function erroComToken(digest?: string): Error {
    const causa = Object.assign(new Error(`terminating connection ${SENTINELA}`), { code: '57P01' });
    const e = new Error(`Failed query: select ... params: ${SENTINELA}`, { cause: causa });
    Object.assign(e, { params: [SENTINELA] }, digest === undefined ? {} : { digest });
    e.stack = `Error: ${SENTINELA}\n    at consulta (arquivo.js:1:1)`;
    return e;
  }
  const requisicao = { path: `/demandas/DEM-20261103-0007?q=${SENTINELA}`, method: 'GET', headers: { cookie: `wsod.session_token=${SENTINELA}` } };
  const contexto = { routerKind: 'App Router', routePath: '/demandas/[id]', routeType: 'render', renderSource: 'react-server-components' };

  function capturarLog(): string[] {
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    return linhas;
  }

  it('grava uma linha só, com evento, rota-modelo, erroId e o erro reduzido, sem o sentinela; e chama capturarErro', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    const linhas = capturarLog();
    const { onRequestError } = await import('./instrumentation');
    const erro = erroComToken('1234567890');
    await onRequestError(erro, requisicao, contexto);
    expect(linhas).toHaveLength(1);
    const linha = JSON.parse(linhas[0]!) as Record<string, unknown>;
    expect(linha).toMatchObject({
      level: 50,
      evento: 'erro_requisicao',
      metodo: 'GET',
      rota: '/demandas/[id]',
      codigoErro: 'erro_interno',
      erroId: '1234567890',
      erro: { classe: 'Error', code: '57P01' },
    });
    expect(Object.keys(linha).sort()).toEqual(['codigoErro', 'erro', 'erroId', 'evento', 'level', 'metodo', 'rota', 'time']);
    expect(linhas[0]).not.toContain(SENTINELA);
    expect(linhas[0]).not.toContain('DEM-20261103-0007');
    expect(sentry.capturados).toEqual([{ erro, contexto: { evento: 'erro_requisicao' } }]);
  });

  it('digest fora do formato: sai sem erroId', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    const { onRequestError } = await import('./instrumentation');
    for (const digest of [`id ${SENTINELA}`, 'x'.repeat(65), '']) {
      const linhas = capturarLog();
      await onRequestError(erroComToken(digest), requisicao, contexto);
      expect(linhas).toHaveLength(1);
      expect(Object.keys(JSON.parse(linhas[0]!) as object)).not.toContain('erroId');
      expect(linhas[0]).not.toContain(SENTINELA);
    }
    const linhas = capturarLog();
    await onRequestError(erroComToken(), requisicao, contexto);
    expect(Object.keys(JSON.parse(linhas[0]!) as object)).not.toContain('erroId');
  });

  it('método e rota fora do formato não entram; valor que não é Error vira classe desconhecida', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    const linhas = capturarLog();
    const { onRequestError } = await import('./instrumentation');
    await onRequestError(SENTINELA, { ...requisicao, method: `GET ${SENTINELA}` }, { ...contexto, routePath: `/x?${SENTINELA}` });
    const linha = JSON.parse(linhas[0]!) as Record<string, unknown>;
    expect(linha).toMatchObject({ evento: 'erro_requisicao', erro: { classe: 'desconhecido' } });
    expect(Object.keys(linha)).not.toContain('metodo');
    expect(Object.keys(linha)).not.toContain('rota');
    expect(linhas.join('')).not.toContain(SENTINELA);
  });

  it('redirect() e notFound() do Next não são erro: nada vai ao log nem ao Sentry', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    const linhas = capturarLog();
    const { onRequestError } = await import('./instrumentation');
    for (const digest of ['NEXT_REDIRECT;replace;/entrar?callbackURL=%2Fdemandas;307;', 'NEXT_HTTP_ERROR_FALLBACK;404', 'NEXT_NOT_FOUND']) {
      await onRequestError(Object.assign(new Error(digest), { digest }), requisicao, contexto);
    }
    expect(linhas).toEqual([]);
    expect(sentry.capturados).toEqual([]);
  });

  it('fora do runtime Node, não faz nada', async () => {
    vi.stubEnv('NEXT_RUNTIME', 'edge');
    const linhas = capturarLog();
    const { onRequestError } = await import('./instrumentation');
    await onRequestError(erroComToken('1234567890'), requisicao, contexto);
    expect(linhas).toEqual([]);
    expect(sentry.capturados).toEqual([]);
  });
});

describe('instrumentation.register', () => {
  it('com a configuração válida, sobe e chama o Sentry com o DSN do ambiente (vazio = desligado)', async () => {
    definirEnv(ENV_VALIDO);
    const { register } = await import('./instrumentation');
    await expect(register()).resolves.toBeUndefined();
    expect(sentry.chamadas).toEqual([{ dsn: undefined }]);
  });
  it('M-05 (c): depois da configuração e do Sentry, console.error e console.warn passam a sair só pelo log', async () => {
    definirEnv(ENV_VALIDO);
    const originais = { error: terminal.error, warn: terminal.warn, log: terminal.log };
    const { register } = await import('./instrumentation');
    await register();
    expect(terminal.error).not.toBe(originais.error);
    expect(terminal.warn).not.toBe(originais.warn);
    expect(terminal.log).toBe(originais.log);
    desinstalarConsoleSaneado();
    expect(terminal.error).toBe(originais.error);
  });
  it('M-05 (c): com a configuração inválida, o console não é trocado (o erro de boot segue legível)', async () => {
    definirEnv({ ...ENV_VALIDO, BETTER_AUTH_SECRET: 'curto' });
    const original = terminal.error;
    const { register } = await import('./instrumentation');
    await register().catch(() => undefined);
    expect(terminal.error).toBe(original);
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
