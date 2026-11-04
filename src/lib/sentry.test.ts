import * as Sentry from '@sentry/node';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SENTINELAS, contemSentinela } from '../../test/sentinelas';
import { capturarErro, iniciarSentry, limparEvento } from './sentry';

// B-3 da revisão do 0011 (DEC-DEM-20261104-0012-v1): com reduzirErro total, só o envio pode fazer capturarErro lançar.
// Para o teste do B-4 do 0010 seguir provando que a marca vem depois do envio, a falha é injetada no `captureException`,
// armada uma vez; o resto do @sentry/node é o original.
const falhaNoEnvio = vi.hoisted(() => ({ armada: false }));
vi.mock('@sentry/node', async (importOriginal) => {
  const original = await importOriginal<typeof import('@sentry/node')>();
  return {
    ...original,
    captureException: (...a: Parameters<typeof original.captureException>) => {
      if (falhaNoEnvio.armada) {
        falhaNoEnvio.armada = false;
        throw new Error('falha fictícia no envio');
      }
      return original.captureException(...a);
    },
  };
});

// Um transporte falso para o arquivo todo: o Sentry é iniciado uma vez só.
const enviados: string[] = [];
const transporte = () => ({
  send: async (env: unknown) => {
    enviados.push(JSON.stringify(env));
    return {};
  },
  flush: async () => true,
});

beforeAll(() => {
  iniciarSentry({ dsn: 'https://chave@sentry.exemplo.test/1', transporte });
});

beforeEach(() => {
  enviados.length = 0;
});

async function enviar(e: unknown, contexto?: { evento: string }): Promise<string> {
  capturarErro(e, contexto);
  await Sentry.flush(2000);
  expect(enviados.length).toBeGreaterThan(0);
  return enviados.join('');
}

it('beforeSend remove request.data, cookies, cabeçalhos, query, extra e user', () => {
  const ev = limparEvento({
    request: {
      data: SENTINELAS.texto,
      cookies: { s: SENTINELAS.token },
      headers: { cookie: SENTINELAS.token },
      query_string: `email=${SENTINELAS.email}`,
      url: `/api/demandas?email=${SENTINELAS.email}`,
    },
    extra: { e: SENTINELAS.email },
    user: { email: SENTINELAS.email },
    contexts: { response: { headers: { 'set-cookie': SENTINELAS.token } } },
    breadcrumbs: [{ message: SENTINELAS.texto }],
  });
  expect(contemSentinela(JSON.stringify(ev))).toBe(false);
  expect(ev.request.url).toBe('/api/demandas');
});

it('o envelope enviado pelo transporte falso não tem sentinela (C-21)', async () => {
  const erro = Object.assign(new Error(`falhou com ${SENTINELAS.email}\nsegunda linha ${SENTINELAS.texto}`), {
    code: '23505',
    detail: SENTINELAS.nome,
    cause: new Error(SENTINELAS.senha),
  });
  const saida = await enviar(erro, { evento: 'teste' });
  expect(contemSentinela(saida)).toBe(false);
  expect(saida).toContain('Error 23505');
});

it('linha da mensagem que começa por "    at " não vira quadro de pilha no Sentry (C-21)', async () => {
  const saida = await enviar(new Error(`falhou\n    at ${SENTINELAS.texto}\n    at ${SENTINELAS.email}`));
  expect(contemSentinela(saida)).toBe(false);
  // A pilha não sumiu: o quadro deste arquivo de teste continua no envelope.
  expect(saida).toContain('sentry.test');
});

// B-1 do 0009 (DEC-DEM-20261104-0010-v1): a classe de exemplo passou de ErroDeConsulta a ConsultaError. Pela regra nova
// (reduzir-erro.ts), só sai a classe terminada em Error ou Exception, ou uma das CLASSES_DO_PROJETO; a outra vira 'Error'.
it('subclasse que troca o name no construtor mantém os quadros e não vaza a mensagem', async () => {
  class ConsultaError extends Error {
    constructor(mensagem: string) {
      super(mensagem);
      this.name = 'ConsultaError';
    }
  }
  const saida = await enviar(new ConsultaError(`falhou\n    at ${SENTINELAS.nome}`));
  expect(contemSentinela(saida)).toBe(false);
  expect(saida).toContain('ConsultaError');
  expect(saida).toContain('sentry.test');
});

it('B-1 do 0009: subclasse com name fora da regra sai como Error, com os quadros e sem o name', async () => {
  class ErroDeConsulta extends Error {
    constructor(mensagem: string) {
      super(mensagem);
      this.name = 'ErroDeConsulta';
    }
  }
  const saida = await enviar(new ErroDeConsulta(`falhou\n    at ${SENTINELAS.nome}`));
  expect(contemSentinela(saida)).toBe(false);
  expect(saida).not.toContain('ErroDeConsulta');
  expect(saida).toContain('"value":"Error"');
  expect(saida).toContain('sentry.test');
});

// Testes acrescentados na 06-T02-testes (qa-automacao).

it('usuário, extra e contexto da resposta postos no escopo não chegam ao envelope pelo beforeSend real', async () => {
  Sentry.withScope((escopo) => {
    escopo.setUser({ id: SENTINELAS.nome, email: SENTINELAS.email, ip_address: '203.0.113.7' });
    escopo.setExtra('corpo', { texto: SENTINELAS.texto, senha: SENTINELAS.senha });
    escopo.setExtras({ telefone: SENTINELAS.telefone });
    escopo.setContext('response', { headers: { 'set-cookie': SENTINELAS.token } });
    capturarErro(new Error('x'), { evento: 'escopo' });
  });
  await Sentry.flush(2000);
  expect(enviados.length).toBeGreaterThan(0);
  const saida = enviados.join('');
  expect(contemSentinela(saida)).toBe(false);
  expect(saida).not.toContain('203.0.113.7');
});

it('breadcrumb com sentinela é descartado e não vai no envelope', async () => {
  await Sentry.withIsolationScope(async () => {
    Sentry.addBreadcrumb({ category: 'http', message: SENTINELAS.texto, data: { email: SENTINELAS.email } });
    const saida = await enviar(new Error('x'));
    expect(contemSentinela(saida)).toBe(false);
  });
});

it('valor que não é Error vai como "desconhecido", sem o conteúdo', async () => {
  const saida = await enviar(`falhou para ${SENTINELAS.email} ${SENTINELAS.texto}`);
  expect(contemSentinela(saida)).toBe(false);
  expect(saida).toContain('desconhecido');
});

it('objeto com message e code que não é Error não vaza o message', async () => {
  const saida = await enviar({ message: SENTINELAS.texto, code: '23505', detail: SENTINELAS.email });
  expect(contemSentinela(saida)).toBe(false);
  expect(saida).toContain('desconhecido');
});

it('code com texto livre não vai ao título do Sentry', async () => {
  const saida = await enviar(Object.assign(new Error('x'), { code: `falhou ${SENTINELAS.email}` }));
  expect(contemSentinela(saida)).toBe(false);
});

it('Error.stackTraceLimit = 0 com mensagem de várias linhas não manda a mensagem', async () => {
  const limite = Error.stackTraceLimit;
  let erro: Error;
  try {
    Error.stackTraceLimit = 0;
    erro = new Error(`falhou\n    at ${SENTINELAS.texto}\n    at ${SENTINELAS.email}`);
    void erro.stack;
  } finally {
    Error.stackTraceLimit = limite;
  }
  const saida = await enviar(erro);
  expect(contemSentinela(saida)).toBe(false);
});

it('erro com name vazio e mensagem com linha "    at " não manda a mensagem', async () => {
  const erro = new Error(`falhou\n    at ${SENTINELAS.texto}`);
  erro.name = '';
  const saida = await enviar(erro);
  expect(contemSentinela(saida)).toBe(false);
});

it('erro com cause encadeada não leva a mensagem nem a pilha da causa', async () => {
  const causa = Object.assign(new Error(`causa com ${SENTINELAS.email}\n    at ${SENTINELAS.nome}`), { code: '23514' });
  const erro = new Error(`Failed query: params: ${SENTINELAS.texto}`, { cause: causa });
  erro.name = 'DrizzleQueryError';
  const saida = await enviar(erro);
  expect(contemSentinela(saida)).toBe(false);
  expect(saida).toContain('DrizzleQueryError 23514');
});

// B-a do 0008 (DEC-DEM-20261104-0010-v1): o mesmo objeto de erro vai ao Sentry uma vez só, venha ele do onRequestError
// ou do console saneado, em qualquer ordem. A marca é por objeto, não por mensagem: erros distintos com a mesma mensagem
// vão os dois, e valor que não é objeto vai toda vez.
describe('B-a do 0008: um envio por objeto de erro', () => {
  const contarEnvios = async (passos: () => void): Promise<number> => {
    enviados.length = 0;
    passos();
    await Sentry.flush(2000);
    return enviados.length;
  };

  it('o mesmo objeto passado duas vezes gera um envio', async () => {
    const e = new TypeError('falha fictícia');
    expect(
      await contarEnvios(() => {
        capturarErro(e, { evento: 'erro_requisicao' });
        capturarErro(e, { evento: 'console_erro' });
      }),
    ).toBe(1);
    // Depois de enviado, continua marcado.
    expect(await contarEnvios(() => capturarErro(e))).toBe(0);
  });

  it('dois objetos distintos com a mesma mensagem geram dois envios', async () => {
    expect(
      await contarEnvios(() => {
        capturarErro(new Error('mesma mensagem'));
        capturarErro(new Error('mesma mensagem'));
      }),
    ).toBe(2);
  });

  it('valor que não é objeto vai toda vez', async () => {
    expect(
      await contarEnvios(() => {
        capturarErro('falha em texto');
        capturarErro('falha em texto');
        capturarErro(42);
        capturarErro(42);
      }),
    ).toBe(4);
  });
});

// 04-regressao do DEC-DEM-20261104-0010-v1 (qa-automacao), B-1 do 0009 no título do Sentry, a outra saída além do log:
// code com 10 ou mais dígitos (CPF e celular fictícios), no erro ou na cause, e classe que é um nome de pessoa não vão
// ao envelope; o título fica só 'Error'. O code do Postgres continua no título.
describe('04-regressao do 0010: B-1 do 0009 no título do Sentry', () => {
  it.each(['00000000191', '11900000000', '1234567890'])('code %s não vai ao envelope, nem do erro nem da cause', async (code) => {
    const doErro = await enviar(Object.assign(new Error('x'), { code }));
    expect(doErro).not.toContain(code);
    expect(doErro).toContain('"value":"Error"');
    enviados.length = 0;
    const daCausa = await enviar(new Error('x', { cause: Object.assign(new Error('y'), { code }) }));
    expect(daCausa).not.toContain(code);
    expect(daCausa).toContain('"value":"Error"');
  });

  it('classe Joana não vai ao envelope; DrizzleQueryError com code 23505 continua no título', async () => {
    const nome = new Error('x');
    nome.name = 'Joana';
    const saida = await enviar(nome);
    expect(saida).not.toContain('Joana');
    expect(saida).toContain('"value":"Error"');
    enviados.length = 0;
    const banco = Object.assign(new Error('x'), { code: '23505' });
    banco.name = 'DrizzleQueryError';
    expect(await enviar(banco)).toContain('DrizzleQueryError 23505');
  });
});

// B-2 do 0010 (DEC-DEM-20261104-0011-v1, D-4): name que muda entre leituras ou que não é texto não chega ao título.
describe('B-2 do 0010: o título do Sentry não usa name que muda nem name que não é texto', () => {
  it('objeto com toString que muda: o título é Error, sem o nome fictício', async () => {
    const e = new Error('x');
    let n = 0;
    e.name = { toString: () => (n++ < 2 ? 'TypeError' : 'Joana Ficticia') } as never;
    const saida = await enviar(e);
    expect(saida).not.toContain('Joana');
    expect(saida).not.toContain('TypeError');
    expect(saida).toContain('"value":"Error"');
  });

  it('getter de name que muda entre leituras: o título é o valor conferido, sem o nome fictício', async () => {
    const e = new Error('x');
    let n = 0;
    Object.defineProperty(e, 'name', { get: () => (n++ === 0 ? 'TypeError' : 'Joana Ficticia') });
    const saida = await enviar(e);
    expect(saida).not.toContain('Joana');
    expect(saida).toContain('"value":"TypeError"');
  });
});

// B-4 do 0010 (DEC-DEM-20261104-0011-v1, D-5): o objeto só fica marcado como enviado depois de o envio voltar. Uma falha
// no meio não deixa o erro marcado sem ter ido. Desde o B-3 da revisão do 0011, a falha injetada é a do próprio envio
// (`captureException` que lança uma vez, no vi.mock do topo): o getter de `code` que lança não faz mais capturarErro
// lançar (ver o bloco do B-3 abaixo).
describe('B-4 do 0010: a marca de enviado vem depois do envio', () => {
  it('a primeira chamada lança e não envia; a segunda envia um evento só', async () => {
    const e = Object.assign(new Error('x'), { code: '23505' });
    enviados.length = 0;
    falhaNoEnvio.armada = true;
    expect(() => capturarErro(e)).toThrow('falha fictícia no envio');
    await Sentry.flush(2000);
    expect(enviados.length).toBe(0);
    capturarErro(e);
    capturarErro(e);
    await Sentry.flush(2000);
    expect(enviados.length).toBe(1);
    expect(enviados.join('')).toContain('Error 23505');
  });
});

// B-3 da revisão do 0011 (DEC-DEM-20261104-0012-v1): getter que lança e Proxy não fazem capturarErro lançar; o evento
// sai com o título Error. Erros e armadilhas fictícios.
describe('B-3 do 0011: o erro com getter que lança chega ao Sentry', () => {
  const lanca = () => {
    throw new Error('getter fictício');
  };

  it('Error com getter de name que lança: não lança e envia um evento com o título Error', async () => {
    const e = Object.defineProperty(new Error('falha fictícia'), 'name', { get: lanca });
    expect(() => capturarErro(e)).not.toThrow();
    await Sentry.flush(2000);
    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toContain('"value":"Error"');
  });

  it('Proxy com get que lança: não lança e envia um evento com o título Error', async () => {
    const p = new Proxy(new Error('falha fictícia'), { get: lanca });
    expect(() => capturarErro(p)).not.toThrow();
    await Sentry.flush(2000);
    expect(enviados).toHaveLength(1);
    expect(enviados[0]).toContain('"value":"Error"');
  });
});

it('stack que não começa pelo cabeçalho atual do erro não manda quadro nenhum, só o título', async () => {
  const erro = new Error(`falhou\n    at ${SENTINELAS.texto}`);
  void erro.stack; // o V8 monta o stack com a mensagem de agora
  erro.message = 'mensagem trocada depois';
  const saida = await enviar(erro);
  expect(contemSentinela(saida)).toBe(false);
  expect(saida).not.toContain('sentry.test');
  expect(saida).toContain('"value":"Error"');
});
