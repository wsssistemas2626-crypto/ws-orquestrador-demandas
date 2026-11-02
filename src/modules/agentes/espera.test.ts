// Novas tentativas da execução de agente (P1-e): 3 no total, com esperas de 30 s antes da 2ª e de 2 min antes da 3ª.
import { describe, expect, it } from 'vitest';
import { TENTATIVAS_MAXIMAS, esperaAntesDaTentativa } from './espera';

describe('esperaAntesDaTentativa (P1-e)', () => {
  it('P1-e: 3 tentativas, esperas de 30 s e 2 min', () => {
    expect(TENTATIVAS_MAXIMAS).toBe(3);
    expect(esperaAntesDaTentativa(2)).toBe(30_000);
    expect(esperaAntesDaTentativa(3)).toBe(120_000);
    expect(() => esperaAntesDaTentativa(4)).toThrow();
  });

  it.each([1, 0, -1, 2.5, Number.NaN, Number.POSITIVE_INFINITY])('a tentativa %s não tem espera e lança RangeError', (n) => {
    expect(() => esperaAntesDaTentativa(n)).toThrow(RangeError);
  });
});
