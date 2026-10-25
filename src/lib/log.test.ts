import { afterEach, describe, expect, it } from 'vitest';
import { SENTINELAS, contemSentinela } from '../../test/sentinelas';
import { CAMPOS_PERMITIDOS, criarLogger, log, substituirDestinoDoLog } from './log';

const capturar = () => {
  const linhas: string[] = [];
  return {
    linhas,
    destino: {
      write: (l: string) => {
        linhas.push(l);
      },
    },
  };
};

describe('log por lista de permissão (C-21)', () => {
  afterEach(() => substituirDestinoDoLog(null));

  it('descarta campo fora da lista', () => {
    const { linhas, destino } = capturar();
    criarLogger(destino).info({
      evento: 'teste',
      texto: SENTINELAS.texto,
      email: SENTINELAS.email,
      headers: { authorization: SENTINELAS.token },
    } as never);
    expect(contemSentinela(linhas.join(''))).toBe(false);
    expect(JSON.parse(linhas[0]!)).toMatchObject({ evento: 'teste' });
  });

  it('mantém os campos da lista e nada além deles, do pino só nível e hora', () => {
    const { linhas, destino } = capturar();
    criarLogger(destino).warn({ evento: 'rota', metodo: 'GET', rota: '/api/demandas', status: 200, ms: 12, nome: SENTINELAS.nome } as never);
    const linha = JSON.parse(linhas[0]!) as Record<string, unknown>;
    expect(linha).toMatchObject({ evento: 'rota', metodo: 'GET', rota: '/api/demandas', status: 200, ms: 12, level: 40 });
    const extras = Object.keys(linha).filter((k) => !(CAMPOS_PERMITIDOS as readonly string[]).includes(k));
    expect(extras.sort()).toEqual(['level', 'time']);
  });

  it('erro vira { classe, code } antes de ir à saída', () => {
    const { linhas, destino } = capturar();
    const e = Object.assign(new Error(`violates check (${SENTINELAS.email})`), { code: '23514', detail: SENTINELAS.texto });
    criarLogger(destino).error({ evento: 'falha', erro: e } as never);
    const linha = JSON.parse(linhas[0]!);
    expect(linha.erro).toEqual({ classe: 'Error', code: '23514' });
    expect(contemSentinela(linhas.join(''))).toBe(false);
  });

  it('erro em texto solto não vai à saída: vira classe desconhecida', () => {
    const { linhas, destino } = capturar();
    criarLogger(destino).error({ evento: 'falha', erro: `falhou para ${SENTINELAS.email}` });
    expect(JSON.parse(linhas[0]!).erro).toEqual({ classe: 'desconhecido' });
    expect(contemSentinela(linhas.join(''))).toBe(false);
  });

  it('redact continua como segunda barreira para campo permitido com objeto', () => {
    const { linhas, destino } = capturar();
    criarLogger(destino).info({ evento: 'x', erro: { senha: SENTINELAS.senha, token: SENTINELAS.token } } as never);
    expect(contemSentinela(linhas.join(''))).toBe(false);
  });

  it('o log padrão escreve no destino trocado pelo teste, com o mesmo filtro', () => {
    const { linhas, destino } = capturar();
    substituirDestinoDoLog(destino);
    log.info({ evento: 'padrao', email: SENTINELAS.email } as never);
    log.error({ evento: 'padrao-erro', erro: new Error(SENTINELAS.texto) });
    expect(linhas).toHaveLength(2);
    expect(JSON.parse(linhas[0]!)).toMatchObject({ evento: 'padrao' });
    expect(JSON.parse(linhas[1]!).erro).toEqual({ classe: 'Error' });
    expect(contemSentinela(linhas.join(''))).toBe(false);
  });
});
