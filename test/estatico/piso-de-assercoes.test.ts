// test/estatico/piso-de-assercoes.test.ts — CV-20 (04) e D-12: nenhum teste de segurança perde asserção. Piso = linhas
// com "expect(" em 198e97d (git grep -c "expect(" 198e97d, contado pelo tech-lead em 10/11/2026). Só sobe.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const PISO: Readonly<Record<string, number>> = {
  'e2e/seguranca.spec.ts': 28,
  'e2e/seguranca-qa.spec.ts': 38,
  'src/proxy.test.ts': 17,
  'test/estatico/classes-de-erro.test.ts': 4,
  'test/estatico/compose.test.ts': 8,
  'test/estatico/decisao-e2e.test.ts': 37,
  'test/estatico/eslint.test.ts': 5,
  'test/estatico/exigir-pessoa.test.ts': 4,
  'test/estatico/pacote-sem-extras.test.ts': 21,
  'test/estatico/painel-qa.test.ts': 14,
  'test/estatico/preco-so-por-script.test.ts': 5,
  'test/estatico/projeto.test.ts': 27,
  'test/estatico/relogio.test.ts': 5,
  'test/estatico/sql-raw.test.ts': 2,
  'test/estatico/variaveis.test.ts': 8,
  'test/estatico/varreduras-qa.test.ts': 22,
  'test/estatico/worker-agendador.test.ts': 12,
};
export const linhasComExpect = (fonte: string): number => fonte.split('\n').filter((l) => l.includes('expect(')).length;

describe('CV-20: piso de asserções por arquivo', () => {
  it('a contagem é por linha, como o git grep -c', () => {
    expect(linhasComExpect('expect(a).toBe(1);\nconst x = 1;\nexpect(b).toBe(2); expect(c).toBe(3);')).toBe(2);
  });
  it.each(Object.entries(PISO))('%s tem ao menos %i linhas com expect(', (arquivo, piso) => {
    expect(linhasComExpect(readFileSync(`${raiz}${arquivo}`, 'utf8'))).toBeGreaterThanOrEqual(piso);
  });
});
