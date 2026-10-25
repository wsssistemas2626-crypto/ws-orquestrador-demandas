import { pathToFileURL } from 'node:url';
import { expect, it } from 'vitest';
import { ehExecucaoDireta } from './migrate';

const URL_SCRIPT = pathToFileURL('/srv/app/scripts/migrate.ts').href;

it('roda quando o arquivo é o chamado pela linha de comando, com caminho absoluto ou relativo', () => {
  expect(ehExecucaoDireta('/srv/app/scripts/migrate.ts', URL_SCRIPT, '/srv/app')).toBe(true);
  expect(ehExecucaoDireta('scripts/migrate.ts', URL_SCRIPT, '/srv/app')).toBe(true);
});

it('não roda quando é importado (ajudante de teste, worker)', () => {
  expect(ehExecucaoDireta('/srv/app/node_modules/vitest/vitest.mjs', URL_SCRIPT, '/srv/app')).toBe(false);
  expect(ehExecucaoDireta(undefined, URL_SCRIPT, '/srv/app')).toBe(false);
});
