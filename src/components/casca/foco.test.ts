// T05 (pedido 0015; ADR-15; 03, 3.3): a volta do Tab dentro da gaveta. O Chromium deixa o Tab sair do <dialog> modal
// para a interface do navegador, então a casca faz a volta à mão: do último focável vai ao primeiro, e Shift+Tab no
// primeiro vai ao último. No meio, o navegador segue sozinho.
import { describe, expect, it } from 'vitest';
import { proximoIndiceCircular } from './foco';

describe('Tab circular da gaveta (ADR-15)', () => {
  it('do último vai ao primeiro; Shift do primeiro vai ao último; no meio, nada a fazer', () => {
    expect(proximoIndiceCircular(4, 5, false)).toBe(0);
    expect(proximoIndiceCircular(0, 5, true)).toBe(4);
    expect(proximoIndiceCircular(2, 5, false)).toBeNull();
    expect(proximoIndiceCircular(-1, 5, false)).toBe(0);
  });

  it('foco fora da lista: Tab vai ao primeiro e Shift+Tab ao último', () => {
    expect(proximoIndiceCircular(-1, 5, true)).toBe(4);
  });

  it('no meio, com Shift, também é o navegador que move', () => {
    expect(proximoIndiceCircular(2, 5, true)).toBeNull();
    expect(proximoIndiceCircular(4, 5, true)).toBeNull();
    expect(proximoIndiceCircular(0, 5, false)).toBeNull();
  });

  it('um focável só: Tab e Shift+Tab ficam nele', () => {
    expect(proximoIndiceCircular(0, 1, false)).toBe(0);
    expect(proximoIndiceCircular(0, 1, true)).toBe(0);
  });

  it('nenhum focável: nada a fazer', () => {
    expect(proximoIndiceCircular(-1, 0, false)).toBeNull();
    expect(proximoIndiceCircular(-1, 0, true)).toBeNull();
  });
});
