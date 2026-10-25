import { describe, expect, it } from 'vitest';
import {
  aaaammddSaoPaulo,
  dataIsoSaoPaulo,
  formatarData,
  formatarDataHora,
  inicioDoMesSaoPaulo,
  inicioDoProximoMesSaoPaulo,
} from './fuso';

describe('fuso America/Sao_Paulo', () => {
  it('usa a data de São Paulo, não a UTC (CA-04.1)', () => {
    const d = new Date('2026-10-23T02:30:00Z'); // 22/10 23h30 em São Paulo
    expect(aaaammddSaoPaulo(d)).toBe('20261022');
    expect(dataIsoSaoPaulo(d)).toBe('2026-10-22');
  });
  it('início do mês civil de São Paulo', () => {
    expect(inicioDoMesSaoPaulo(new Date('2026-11-01T02:00:00Z')).toISOString()).toBe('2026-10-01T03:00:00.000Z');
    expect(inicioDoMesSaoPaulo(new Date('2026-11-01T03:00:00Z')).toISOString()).toBe('2026-11-01T03:00:00.000Z');
    expect(inicioDoProximoMesSaoPaulo(new Date('2026-10-15T12:00:00Z')).toISOString()).toBe('2026-11-01T03:00:00.000Z');
  });
  it('vira o ano em dezembro', () => {
    expect(inicioDoProximoMesSaoPaulo(new Date('2026-12-20T12:00:00Z')).toISOString()).toBe('2027-01-01T03:00:00.000Z');
    expect(inicioDoMesSaoPaulo(new Date('2027-01-01T02:59:59Z')).toISOString()).toBe('2026-12-01T03:00:00.000Z');
  });
  it('formata em pt-BR', () => {
    expect(formatarDataHora(new Date('2026-10-22T17:05:00Z'))).toBe('22/10/2026 às 14:05');
    expect(formatarData(new Date('2026-10-22T17:05:00Z'))).toBe('22/10/2026');
  });
});
