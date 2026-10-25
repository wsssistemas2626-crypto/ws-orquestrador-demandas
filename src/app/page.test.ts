// T01: a raiz `/` leva à fila de demandas. Escrito na 06-T01-testes (qa-automacao).
import { describe, expect, it } from 'vitest';
import Inicio from './page';

describe('página inicial', () => {
  it('redireciona para /demandas', () => {
    let capturado: unknown;
    try {
      Inicio();
    } catch (e) {
      capturado = e;
    }
    expect(capturado).toBeInstanceOf(Error);
    // o redirect do Next lança um erro com digest 'NEXT_REDIRECT;<tipo>;<url>;<status>;'
    const digest = (capturado as { digest?: unknown }).digest;
    expect(typeof digest).toBe('string');
    expect(String(digest).split(';')).toEqual(expect.arrayContaining(['NEXT_REDIRECT', '/demandas']));
  });
});
