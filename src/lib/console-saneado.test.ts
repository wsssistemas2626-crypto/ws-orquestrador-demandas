// M-05 (c) (DEC-DEM-20261103-0007-v1, C-21): depois de instalado, console.error e console.warn só escrevem pelo log por
// lista de permissão. O Next registra o erro de renderização pelo console; com isto, mensagem, pilha, cause e params
// não chegam ao stdout nem ao stderr do processo. Sentinela fictício.
import * as Sentry from '@sentry/node';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { desinstalarConsoleSaneado, instalarConsoleSaneado } from './console-saneado';
import { substituirDestinoDoLog } from './log';
import { capturarErro, iniciarSentry } from './sentry';

// M-3 (0008): o capturarErro de verdade, com uma chave para o teste fazê-lo lançar (Sentry que falha).
const falhaDoSentry = vi.hoisted(() => ({ lancar: false }));
vi.mock('./sentry', async (original) => {
  const real = await original<typeof import('./sentry')>();
  return {
    ...real,
    capturarErro: vi.fn((...args: Parameters<typeof real.capturarErro>) => {
      if (falhaDoSentry.lancar) throw new Error('sentry fora');
      real.capturarErro(...args);
    }),
  };
});

// O mesmo objeto `console` do processo, pelo global: o teste chama os métodos trocados como o Next chama, sem desligar o
// no-console (G3.7) neste arquivo.
const terminal: Console = globalThis.console;

const SENTINELA = 'token-ficticio-SENTINELA-0007';

function erroComToken(digest?: string): Error {
  const causa = Object.assign(new Error(`terminating connection ${SENTINELA}`), { code: '57P01' });
  const e = new Error(`Failed query: select ... params: ${SENTINELA}`, { cause: causa });
  Object.assign(e, { params: [SENTINELA] }, digest === undefined ? {} : { digest });
  return e;
}

// Espiões nas saídas reais do processo: nada do que passa por eles segue adiante durante o teste.
function espiarSaidas() {
  const escrito: string[] = [];
  const guardar = (pedaco: unknown) => {
    escrito.push(typeof pedaco === 'string' ? pedaco : Buffer.isBuffer(pedaco) ? pedaco.toString('utf8') : String(pedaco));
    return true;
  };
  const out = vi.spyOn(process.stdout, 'write').mockImplementation(guardar as never);
  const err = vi.spyOn(process.stderr, 'write').mockImplementation(guardar as never);
  return {
    escrito,
    restaurar: () => {
      out.mockRestore();
      err.mockRestore();
    },
  };
}

afterEach(() => {
  desinstalarConsoleSaneado();
  substituirDestinoDoLog(null);
});

describe('console saneado', () => {
  it('console.error(erro), console.error(texto, erro) e console.warn(erro) gravam só pelo log, sem o sentinela no stdout nem no stderr', () => {
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    const originais = { error: terminal.error, warn: terminal.warn };
    instalarConsoleSaneado();
    const saidas = espiarSaidas();
    try {
      terminal.error(erroComToken('1234567890'));
      terminal.error(`texto com o ${SENTINELA}`, erroComToken());
      terminal.warn(erroComToken());
    } finally {
      saidas.restaurar();
    }
    expect(saidas.escrito.join('')).not.toContain(SENTINELA);
    expect(linhas).toHaveLength(3);
    expect(linhas.join('')).not.toContain(SENTINELA);
    const r = linhas.map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(r[0]).toMatchObject({ level: 50, evento: 'console_erro', erroId: '1234567890', erro: { classe: 'Error', code: '57P01' } });
    expect(r[1]).toMatchObject({ level: 50, evento: 'console_erro', erro: { classe: 'Error', code: '57P01' } });
    expect(Object.keys(r[1]!)).not.toContain('erroId');
    expect(r[2]).toMatchObject({ level: 40, evento: 'console_aviso', erro: { classe: 'Error', code: '57P01' } });
    for (const x of r) expect(Object.keys(x).every((k) => ['level', 'time', 'evento', 'erro', 'erroId'].includes(k))).toBe(true);
    expect(terminal.error).not.toBe(originais.error);
    expect(terminal.warn).not.toBe(originais.warn);
  });

  it('texto solto e objeto não saem: só o evento', () => {
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    instalarConsoleSaneado();
    const saidas = espiarSaidas();
    try {
      terminal.error(`falhou para ${SENTINELA}`);
      terminal.warn({ token: SENTINELA }, SENTINELA);
    } finally {
      saidas.restaurar();
    }
    expect(saidas.escrito.join('')).not.toContain(SENTINELA);
    expect(linhas.map((l) => Object.keys(JSON.parse(l) as object).sort())).toEqual([
      ['evento', 'level', 'time'],
      ['evento', 'level', 'time'],
    ]);
    expect(linhas.join('')).not.toContain(SENTINELA);
  });

  it('console.log e console.info não mudam; instalar duas vezes não empilha; desinstalar devolve os originais', () => {
    const originais = { error: terminal.error, warn: terminal.warn, log: terminal.log, info: terminal.info };
    instalarConsoleSaneado();
    const trocado = terminal.error;
    instalarConsoleSaneado();
    expect(terminal.error).toBe(trocado);
    expect(terminal.log).toBe(originais.log);
    expect(terminal.info).toBe(originais.info);
    desinstalarConsoleSaneado();
    expect(terminal.error).toBe(originais.error);
    expect(terminal.warn).toBe(originais.warn);
  });

  // 04-regressao (qa-automacao): os casos exploratórios da 01 (D-01). O sentinela vai em todo lugar onde um erro leva
  // texto: name livre, cause em dois níveis, code fora do formato, digest fora do formato, AggregateError e o texto de
  // formatação do console (%s, %o). Nada disso pode chegar ao stdout, ao stderr nem à linha do log.
  it('erro com name livre, cause em dois níveis, code e digest fora do formato, AggregateError e %s/%o: nada do texto sai', () => {
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    instalarConsoleSaneado();
    const saidas = espiarSaidas();
    const fundo = Object.assign(new Error(`fundo ${SENTINELA}`), { code: '57P01', params: [SENTINELA] });
    const meio = new Error(`meio ${SENTINELA}`, { cause: fundo });
    const nomeLivre = Object.assign(new Error(`topo ${SENTINELA}`, { cause: meio }), {
      name: `Erro ${SENTINELA}`,
      digest: `digest ${SENTINELA}`,
      code: `code ${SENTINELA}`,
    });
    const agregado = new AggregateError([new Error(SENTINELA), meio], `agregado ${SENTINELA}`);
    try {
      terminal.error(nomeLivre);
      terminal.error('%s falhou: %o', SENTINELA, agregado);
      terminal.warn('%o', { cause: meio, token: SENTINELA });
    } finally {
      saidas.restaurar();
    }
    expect(saidas.escrito.join('')).not.toContain(SENTINELA);
    expect(linhas).toHaveLength(3);
    expect(linhas.join('')).not.toContain(SENTINELA);
    const r = linhas.map((l) => JSON.parse(l) as Record<string, unknown>);
    // name livre vira 'Error'; o code do próprio erro está fora do formato, e o do cause direto não existe: sem code.
    expect(r[0]).toEqual({ level: 50, time: expect.anything(), evento: 'console_erro', erro: { classe: 'Error' } });
    expect(r[1]).toEqual({ level: 50, time: expect.anything(), evento: 'console_erro', erro: { classe: 'AggregateError' } });
    expect(r[2]).toEqual({ level: 40, time: expect.anything(), evento: 'console_aviso' });
  });

  it('falha do próprio log não derruba quem chamou nem cai no console original', () => {
    substituirDestinoDoLog({
      write: () => {
        throw new Error(SENTINELA);
      },
    });
    instalarConsoleSaneado();
    const saidas = espiarSaidas();
    try {
      expect(() => terminal.error(erroComToken())).not.toThrow();
    } finally {
      saidas.restaurar();
    }
    expect(saidas.escrito.join('')).not.toContain(SENTINELA);
  });
});

// M-3 (DEC-DEM-20261103-0008-v1): o Error sem `digest` escrito por console.error vai ao Sentry pelo capturarErro (o com
// `digest` já vai pelo onRequestError); console.warn fica só no log. Transporte falso, sem rede; dados fictícios.
describe('M-3: console.error de Error sem digest vai ao Sentry', () => {
  const EMAIL = 'maria.teste@exemplo.invalid';
  const enviados: string[] = [];
  const transporte = () => ({
    send: async (env: unknown) => {
      enviados.push(JSON.stringify(env));
      return {};
    },
    flush: async () => true,
  });

  beforeAll(() => {
    iniciarSentry({ dsn: 'https://chave@exemplo.invalid/1', transporte });
  });

  beforeEach(() => {
    enviados.length = 0;
    falhaDoSentry.lancar = false;
    vi.mocked(capturarErro).mockClear();
  });

  function instalarComLog(): string[] {
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    instalarConsoleSaneado();
    return linhas;
  }

  it('Error sem digest: uma linha console_erro e um envelope, com o título TypeError e sem a mensagem nem o texto solto', async () => {
    const linhas = instalarComLog();
    const saidas = espiarSaidas();
    try {
      terminal.error('falha no after', new TypeError(`falha ficticia com ${EMAIL}`));
    } finally {
      saidas.restaurar();
    }
    await Sentry.flush(2000);
    expect(linhas).toHaveLength(1);
    expect(JSON.parse(linhas[0]!)).toMatchObject({ evento: 'console_erro', erro: { classe: 'TypeError' } });
    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toContain('TypeError');
    expect(enviados[0]).toContain('console_erro');
    for (const proibido of [EMAIL, 'falha ficticia', 'falha no after']) {
      expect(enviados[0]).not.toContain(proibido);
      expect(linhas[0]).not.toContain(proibido);
    }
    expect(saidas.escrito.join('')).not.toContain(EMAIL);
  });

  it('Error com digest (inclusive o de controle do Next): a linha do log e nenhum envelope', async () => {
    const linhas = instalarComLog();
    terminal.error(Object.assign(new Error('erro de página'), { digest: 'abc123' }));
    terminal.error(Object.assign(new Error('NEXT_REDIRECT;replace;/entrar;307;'), { digest: 'NEXT_REDIRECT;replace;/entrar;307;' }));
    await Sentry.flush(2000);
    expect(linhas).toHaveLength(2);
    expect(JSON.parse(linhas[0]!)).toMatchObject({ evento: 'console_erro', erroId: 'abc123' });
    expect(capturarErro).not.toHaveBeenCalled();
    expect(enviados).toEqual([]);
  });

  it('console.warn de Error sem digest: a linha console_aviso e nenhum envelope', async () => {
    const linhas = instalarComLog();
    terminal.warn(new TypeError(`aviso com ${EMAIL}`));
    await Sentry.flush(2000);
    expect(linhas).toHaveLength(1);
    expect(JSON.parse(linhas[0]!)).toMatchObject({ evento: 'console_aviso', erro: { classe: 'TypeError' } });
    expect(capturarErro).not.toHaveBeenCalled();
    expect(enviados).toEqual([]);
  });

  // B-a do 0008 (DEC-DEM-20261104-0010-v1): se o mesmo Error sem digest chegar ao onRequestError (que chama capturarErro)
  // e ao console.error, em qualquer ordem, sai um envelope só. Dois erros distintos com a mesma mensagem saem os dois.
  it('B-a: capturarErro(e) e console.error(e) do mesmo erro sem digest, nas duas ordens, geram um envelope cada par', async () => {
    const linhas = instalarComLog();
    const antes = new TypeError('falha fictícia antes');
    capturarErro(antes, { evento: 'erro_requisicao' });
    terminal.error(antes);
    await Sentry.flush(2000);
    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toContain('erro_requisicao');

    enviados.length = 0;
    const depois = new TypeError('falha fictícia depois');
    terminal.error(depois);
    capturarErro(depois, { evento: 'erro_requisicao' });
    await Sentry.flush(2000);
    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toContain('console_erro');
    // O log não é deduplicado: cada console.error deixa a linha dele.
    expect(linhas).toHaveLength(2);

    enviados.length = 0;
    terminal.error(new TypeError('mesma mensagem fictícia'));
    terminal.error(new TypeError('mesma mensagem fictícia'));
    await Sentry.flush(2000);
    expect(enviados).toHaveLength(2);
  });

  it('capturarErro que lança: console.error não lança, não chama o console original e não entra em laço', () => {
    falhaDoSentry.lancar = true;
    const linhas = instalarComLog();
    const saidas = espiarSaidas();
    try {
      expect(() => terminal.error(new Error(`falha com ${EMAIL}`))).not.toThrow();
    } finally {
      saidas.restaurar();
    }
    expect(capturarErro).toHaveBeenCalledTimes(1);
    expect(linhas).toHaveLength(1);
    expect(saidas.escrito).toEqual([]);
  });
});
