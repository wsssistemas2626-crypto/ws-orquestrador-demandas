// M-05 (c) (DEC-DEM-20261103-0007-v1, C-21): depois de instalado, console.error e console.warn só escrevem pelo log por
// lista de permissão. O Next registra o erro de renderização pelo console; com isto, mensagem, pilha, cause e params
// não chegam ao stdout nem ao stderr do processo. Sentinela fictício.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { desinstalarConsoleSaneado, instalarConsoleSaneado } from './console-saneado';
import { substituirDestinoDoLog } from './log';

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
