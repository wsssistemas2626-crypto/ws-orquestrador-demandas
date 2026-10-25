// Teste acrescentado na 06-T02-testes (qa-automacao). Arquivo separado do sentry.test.ts porque o Sentry é estado
// global do processo: lá ele é iniciado com DSN; aqui o contrato é "DSN ausente = desligado".
import * as Sentry from '@sentry/node';
import { expect, it, vi } from 'vitest';
import { SENTINELAS } from '../../test/sentinelas';
import { capturarErro, iniciarSentry } from './sentry';

it('sem DSN (ausente ou vazio) o Sentry não liga, não cria transporte e capturarErro não falha', async () => {
  const send = vi.fn(async () => ({}));
  const transporte = vi.fn(() => ({ send, flush: async () => true }));

  iniciarSentry({ transporte });
  iniciarSentry({ dsn: '', transporte });

  expect(Sentry.getClient()).toBeUndefined();
  expect(() => capturarErro(new Error(SENTINELAS.texto), { evento: 'desligado' })).not.toThrow();
  await Sentry.flush(100);
  expect(transporte).not.toHaveBeenCalled();
  expect(send).not.toHaveBeenCalled();
});
