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

  // Testes acrescentados na 06-T02-testes (qa-automacao).

  it.each(['info', 'warn', 'error'] as const)('nível %s: nenhum sentinela passado como campo de topo chega à saída', (nivel) => {
    const { linhas, destino } = capturar();
    criarLogger(destino)[nivel]({
      evento: 'topo',
      texto: SENTINELAS.texto,
      email: SENTINELAS.email,
      telefone: SENTINELAS.telefone,
      token: SENTINELAS.token,
      senha: SENTINELAS.senha,
      password: SENTINELAS.senha,
      nome: SENTINELAS.nome,
      solicitanteNome: SENTINELAS.nome,
      cookie: SENTINELAS.token,
      authorization: `Bearer ${SENTINELAS.token}`,
      headers: { cookie: SENTINELAS.token },
      body: { texto: SENTINELAS.texto },
    } as never);
    expect(linhas).toHaveLength(1);
    expect(contemSentinela(linhas.join(''))).toBe(false);
    expect(Object.keys(JSON.parse(linhas[0]!) as object).sort()).toEqual(['evento', 'level', 'time']);
  });

  // C-21: o redact de 02 com *.email, *.nome, *.anexos e *.referencia a mais. Cada chave é testada sozinha dentro de um
  // campo permitido que aceita objeto, para que a remoção de uma delas da lista quebre o teste.
  it.each([
    'senha',
    'password',
    'token',
    'texto',
    'origem',
    'solicitanteNome',
    'conteudo',
    'email',
    'nome',
    'anexos',
    'referencia',
    'authorization',
    'cookie',
    'message',
    'detail',
    'stack',
  ])('segunda barreira: a chave %s dentro de campo permitido sai como [removido]', (chave) => {
    const { linhas, destino } = capturar();
    criarLogger(destino).info({ evento: 'redact', erro: { [chave]: `${SENTINELAS.texto} ${SENTINELAS.email}` } } as never);
    expect(contemSentinela(linhas.join(''))).toBe(false);
    expect(JSON.parse(linhas[0]!).erro[chave]).toBe('[removido]');
  });

  it('erro de consulta do Drizzle com causa do Postgres sai só com a classe e o code da causa', () => {
    const { linhas, destino } = capturar();
    const causa = Object.assign(new Error(`new row violates check (${SENTINELAS.texto})`), {
      code: '23514',
      detail: `Failing row contains (${SENTINELAS.email}, ${SENTINELAS.nome})`,
    });
    const e = Object.assign(new Error(`Failed query: insert into demanda params: ${SENTINELAS.texto},${SENTINELAS.email}`), {
      name: 'DrizzleQueryError',
      cause: causa,
      query: `insert ... ${SENTINELAS.texto}`,
      params: [SENTINELAS.texto, SENTINELAS.email],
    });
    criarLogger(destino).error({ evento: 'falha-consulta', erro: e });
    expect(JSON.parse(linhas[0]!).erro).toEqual({ classe: 'DrizzleQueryError', code: '23514' });
    expect(contemSentinela(linhas.join(''))).toBe(false);
  });

  it('erro nulo, indefinido ou numérico vira classe desconhecida', () => {
    const { linhas, destino } = capturar();
    const logger = criarLogger(destino);
    logger.error({ evento: 'nulo', erro: null });
    logger.error({ evento: 'indefinido', erro: undefined });
    logger.error({ evento: 'numero', erro: 42 });
    expect(linhas.map((l) => JSON.parse(l).erro)).toEqual([
      { classe: 'desconhecido' },
      { classe: 'desconhecido' },
      { classe: 'desconhecido' },
    ]);
  });

  it('campo permitido herdado do protótipo não passa: só conta a chave própria do objeto', () => {
    const { linhas, destino } = capturar();
    const campos = Object.assign(Object.create({ rota: SENTINELAS.texto, demandaId: SENTINELAS.email }), { evento: 'proprio' });
    criarLogger(destino).info(campos as never);
    expect(contemSentinela(linhas.join(''))).toBe(false);
    expect(Object.keys(JSON.parse(linhas[0]!) as object).sort()).toEqual(['evento', 'level', 'time']);
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
