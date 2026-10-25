import { afterEach, describe, expect, it, vi } from 'vitest';
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

// Acrescentados na 06-T01-testes (qa-automacao).
describe('relogio: casos de borda', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('relogioFixo recusa data inválida com RangeError (parecer 1 da 06-T01-revisao)', () => {
    expect(() => relogioFixo('nao-e-data')).toThrow(RangeError);
    expect(() => relogioFixo('')).toThrow(RangeError);
    expect(() => relogioFixo('2026-13-40T99:00:00Z')).toThrow(RangeError);
  });

  it('definir com data inválida lança RangeError e mantém o instante anterior', () => {
    const r = relogioFixo('2026-10-22T10:00:00Z');
    expect(() => r.definir('nao-e-data')).toThrow(RangeError);
    expect(r.agora().toISOString()).toBe('2026-10-22T10:00:00.000Z');
  });

  it('alterar o Date devolvido não muda o relógio', () => {
    const r = relogioFixo('2026-10-22T10:00:00Z');
    r.agora().setTime(0);
    expect(r.agora().toISOString()).toBe('2026-10-22T10:00:00.000Z');
  });

  it('avancar aceita valor negativo e acumula', () => {
    const r = relogioFixo('2026-11-01T03:00:00Z');
    r.avancar(-1);
    expect(r.agora().toISOString()).toBe('2026-11-01T02:59:59.999Z');
    r.avancar(1);
    r.avancar(60_000);
    expect(r.agora().toISOString()).toBe('2026-11-01T03:01:00.000Z');
  });

  it('relógios fixos são independentes entre si', () => {
    const a = relogioFixo('2026-10-22T10:00:00Z');
    const b = relogioFixo('2026-10-22T10:00:00Z');
    a.avancar(1_000);
    expect(b.agora().toISOString()).toBe('2026-10-22T10:00:00.000Z');
  });

  it('relogioDoSistema lê a hora do sistema (relógio simulado, sem depender do real)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-22T13:45:00Z'));
    expect(relogioDoSistema.agora().toISOString()).toBe('2026-10-22T13:45:00.000Z');
    vi.setSystemTime(new Date('2027-01-01T00:00:00Z'));
    expect(relogioDoSistema.agora().toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });
});
