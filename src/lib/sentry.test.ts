import * as Sentry from '@sentry/node';
import { expect, it } from 'vitest';
import { SENTINELAS, contemSentinela } from '../../test/sentinelas';
import { capturarErro, iniciarSentry, limparEvento } from './sentry';

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
  const enviados: string[] = [];
  const transporte = () => ({
    send: async (env: unknown) => {
      enviados.push(JSON.stringify(env));
      return {};
    },
    flush: async () => true,
  });
  iniciarSentry({ dsn: 'https://chave@sentry.exemplo.test/1', transporte });
  const erro = Object.assign(new Error(`falhou com ${SENTINELAS.email}\nsegunda linha ${SENTINELAS.texto}`), {
    code: '23505',
    detail: SENTINELAS.nome,
    cause: new Error(SENTINELAS.senha),
  });
  capturarErro(erro, { evento: 'teste' });
  await Sentry.flush(2000);
  expect(enviados.length).toBeGreaterThan(0);
  const saida = enviados.join('');
  expect(contemSentinela(saida)).toBe(false);
  expect(saida).toContain('Error 23505');
});
