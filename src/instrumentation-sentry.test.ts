// 04-regressao do DEC-DEM-20261104-0010-v1 (qa-automacao), B-a do 0008: o caminho do route handler do Next 16.4.1, pela
// evidência da 03 (server/route-modules/route-module.js:320-328): o mesmo objeto de erro, sem `digest`, vai ao
// console.error e ao onRequestError. Aqui com o onRequestError real, o console saneado real e o Sentry real em
// transporte falso (sem rede), ao contrário do instrumentation.test.ts, que simula o ./lib/sentry. Sai um envelope só
// por objeto de erro, nas duas ordens; o log continua com as duas linhas. Erros distintos com a mesma mensagem vão os
// dois. Dados fictícios.
import * as Sentry from '@sentry/node';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { onRequestError } from './instrumentation';
import { desinstalarConsoleSaneado, instalarConsoleSaneado } from './lib/console-saneado';
import { substituirDestinoDoLog } from './lib/log';
import { iniciarSentry } from './lib/sentry';

// O `console` do processo pelo global, sem desligar o no-console (G3.7) neste arquivo.
const terminal: Console = globalThis.console;

const SENTINELA = 'maria.teste@exemplo.invalid';
const enviados: string[] = [];
const transporte = () => ({
  send: async (env: unknown) => {
    enviados.push(JSON.stringify(env));
    return {};
  },
  flush: async () => true,
});

const requisicao = { method: 'POST' };
const contexto = { routerKind: 'App Router', routePath: '/api/auth/[...all]', routeType: 'route' };

let linhas: string[] = [];
const eventosDoLog = () => linhas.map((l) => (JSON.parse(l) as { evento: string }).evento);

beforeAll(() => {
  iniciarSentry({ dsn: 'https://chave@exemplo.invalid/1', transporte });
});

beforeEach(() => {
  vi.stubEnv('NEXT_RUNTIME', 'nodejs');
  enviados.length = 0;
  linhas = [];
  substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
  instalarConsoleSaneado();
});

afterEach(() => {
  desinstalarConsoleSaneado();
  substituirDestinoDoLog(null);
  vi.unstubAllEnvs();
});

describe('B-a do 0008: erro que escapa do route handler vai ao Sentry uma vez', () => {
  it('console.error(err) e depois onRequestError(err), como o RouteModule faz: um envelope e as duas linhas do log', async () => {
    const err = new TypeError(`falha fictícia com ${SENTINELA}`);
    terminal.error(err);
    await onRequestError(err, requisicao, contexto);
    await Sentry.flush(2000);
    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toContain('TypeError');
    expect(enviados[0]).toContain('console_erro');
    expect(enviados[0]).not.toContain('erro_requisicao');
    expect(eventosDoLog()).toEqual(['console_erro', 'erro_requisicao']);
    expect([...enviados, ...linhas].join('')).not.toContain(SENTINELA);
  });

  it('na ordem inversa (gancho antes do console): um envelope, com o evento do gancho', async () => {
    const err = new TypeError(`falha fictícia com ${SENTINELA}`);
    await onRequestError(err, requisicao, contexto);
    terminal.error(err);
    await Sentry.flush(2000);
    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toContain('erro_requisicao');
    expect(enviados[0]).not.toContain('console_erro');
    expect(eventosDoLog()).toEqual(['erro_requisicao', 'console_erro']);
    expect([...enviados, ...linhas].join('')).not.toContain(SENTINELA);
  });

  it('dois erros distintos com a mesma mensagem, cada um pelos dois caminhos: dois envelopes', async () => {
    for (let i = 0; i < 2; i++) {
      const err = new TypeError('mesma mensagem fictícia');
      terminal.error(err);
      await onRequestError(err, requisicao, contexto);
    }
    await Sentry.flush(2000);
    expect(enviados).toHaveLength(2);
    expect(eventosDoLog()).toEqual(['console_erro', 'erro_requisicao', 'console_erro', 'erro_requisicao']);
  });

  it('erro de página, já com digest: o console não manda e o gancho manda uma vez', async () => {
    const err = Object.assign(new TypeError(`falha fictícia com ${SENTINELA}`), { digest: '1234567890' });
    terminal.error(err);
    await onRequestError(err, requisicao, { routePath: '/demandas/[id]' });
    await Sentry.flush(2000);
    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toContain('erro_requisicao');
    expect([...enviados, ...linhas].join('')).not.toContain(SENTINELA);
  });
});
