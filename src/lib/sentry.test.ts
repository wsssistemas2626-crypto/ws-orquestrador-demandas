import * as Sentry from '@sentry/node';
import { beforeAll, beforeEach, expect, it } from 'vitest';
import { SENTINELAS, contemSentinela } from '../../test/sentinelas';
import { capturarErro, iniciarSentry, limparEvento } from './sentry';

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

it('subclasse que troca o name no construtor mantém os quadros e não vaza a mensagem', async () => {
  class ErroDeConsulta extends Error {
    constructor(mensagem: string) {
      super(mensagem);
      this.name = 'ErroDeConsulta';
    }
  }
  const saida = await enviar(new ErroDeConsulta(`falhou\n    at ${SENTINELAS.nome}`));
  expect(contemSentinela(saida)).toBe(false);
  expect(saida).toContain('ErroDeConsulta');
  expect(saida).toContain('sentry.test');
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
