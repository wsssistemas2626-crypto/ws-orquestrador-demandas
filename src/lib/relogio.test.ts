import { describe, expect, it } from 'vitest';
import { relogioDoSistema, relogioFixo } from './relogio';

describe('relogio', () => {
  it('relogioFixo devolve o instante dado, como cópia', () => {
    const r = relogioFixo('2026-10-22T23:30:00-03:00');
    expect(r.agora().toISOString()).toBe('2026-10-23T02:30:00.000Z');
    expect(r.agora()).not.toBe(r.agora());
  });
  it('relogioFixo só anda quando mandado', () => {
    const r = relogioFixo('2026-10-22T10:00:00Z');
    r.avancar(90_000);
    expect(r.agora().toISOString()).toBe('2026-10-22T10:01:30.000Z');
    r.definir('2026-11-01T03:00:00Z');
    expect(r.agora().toISOString()).toBe('2026-11-01T03:00:00.000Z');
  });
  it('relogioDoSistema devolve Date', () => {
    expect(relogioDoSistema.agora()).toBeInstanceOf(Date);
  });
});
