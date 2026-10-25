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

// Acrescentados na 06-T01-testes (qa-automacao).
describe('fuso America/Sao_Paulo: casos de borda', () => {
  it('vira o dia às 03:00 UTC, no limite exato (CA-04.1)', () => {
    expect(aaaammddSaoPaulo(new Date('2026-10-23T02:59:59.999Z'))).toBe('20261022');
    expect(aaaammddSaoPaulo(new Date('2026-10-23T03:00:00.000Z'))).toBe('20261023');
    expect(dataIsoSaoPaulo(new Date('2026-10-23T02:59:59.999Z'))).toBe('2026-10-22');
    expect(dataIsoSaoPaulo(new Date('2026-10-23T03:00:00.000Z'))).toBe('2026-10-23');
  });

  it('virada de ano: 31/12 em São Paulo enquanto já é 01/01 em UTC', () => {
    const d = new Date('2027-01-01T01:00:00Z'); // 31/12/2026 22h00 em São Paulo
    expect(aaaammddSaoPaulo(d)).toBe('20261231');
    expect(dataIsoSaoPaulo(d)).toBe('2026-12-31');
    expect(formatarData(d)).toBe('31/12/2026');
  });

  it('dia e mês com um dígito saem com zero à esquerda', () => {
    const d = new Date('2026-03-05T15:07:00Z'); // 05/03/2026 12h07 em São Paulo
    expect(aaaammddSaoPaulo(d)).toBe('20260305');
    expect(dataIsoSaoPaulo(d)).toBe('2026-03-05');
    expect(formatarData(d)).toBe('05/03/2026');
    expect(formatarDataHora(d)).toBe('05/03/2026 às 12:07');
  });

  it('meia-noite sai como 00:00, nunca 24:00', () => {
    expect(formatarDataHora(new Date('2026-10-23T03:00:00Z'))).toBe('23/10/2026 às 00:00');
    expect(formatarDataHora(new Date('2026-10-23T02:59:00Z'))).toBe('22/10/2026 às 23:59');
  });

  it('início do mês é idempotente e o próximo mês é estritamente depois', () => {
    const inicio = inicioDoMesSaoPaulo(new Date('2026-10-15T12:00:00Z'));
    expect(inicioDoMesSaoPaulo(inicio).toISOString()).toBe(inicio.toISOString());
    const proximo = inicioDoProximoMesSaoPaulo(inicio);
    expect(proximo.toISOString()).toBe('2026-11-01T03:00:00.000Z');
    expect(proximo.getTime()).toBeGreaterThan(inicio.getTime());
    // o último milissegundo do mês ainda pertence ao mês corrente
    expect(inicioDoMesSaoPaulo(new Date(proximo.getTime() - 1)).toISOString()).toBe(inicio.toISOString());
  });

  it('fevereiro de ano bissexto e de ano comum', () => {
    expect(inicioDoProximoMesSaoPaulo(new Date('2028-02-29T12:00:00Z')).toISOString()).toBe('2028-03-01T03:00:00.000Z');
    expect(inicioDoProximoMesSaoPaulo(new Date('2027-02-28T12:00:00Z')).toISOString()).toBe('2027-03-01T03:00:00.000Z');
    expect(dataIsoSaoPaulo(new Date('2028-02-29T12:00:00Z'))).toBe('2028-02-29');
  });

  // Desvio 2 da 06-T01-construcao: o deslocamento vem do próprio dia 1º, não da data de referência. São Paulo teve
  // horário de verão (-02:00) de 04/11/2018 a 17/02/2019; o tzdata do Node guarda esse histórico.
  it('com horário de verão, usa o deslocamento do dia 1º do mês alvo (Desvio 2)', () => {
    // 01/12/2018 já estava no horário de verão: meia-noite local = 02:00 UTC
    expect(inicioDoMesSaoPaulo(new Date('2018-12-15T12:00:00Z')).toISOString()).toBe('2018-12-01T02:00:00.000Z');
    // referência em fevereiro de 2019 (ainda -02:00), alvo 01/03/2019 (já -03:00)
    expect(inicioDoProximoMesSaoPaulo(new Date('2019-02-10T12:00:00Z')).toISOString()).toBe('2019-03-01T03:00:00.000Z');
    // referência em outubro de 2018 (-03:00), alvo 01/11/2018 (ainda -03:00, o verão começou em 04/11)
    expect(inicioDoProximoMesSaoPaulo(new Date('2018-10-15T12:00:00Z')).toISOString()).toBe('2018-11-01T03:00:00.000Z');
    // referência em novembro de 2018 (-02:00 a partir de 04/11), alvo 01/12/2018 (-02:00)
    expect(inicioDoProximoMesSaoPaulo(new Date('2018-11-15T12:00:00Z')).toISOString()).toBe('2018-12-01T02:00:00.000Z');
    // no horário de verão, 23h30 local de 15/01/2019 é 01h30 UTC de 16/01
    expect(aaaammddSaoPaulo(new Date('2019-01-16T01:30:00Z'))).toBe('20190115');
    expect(formatarDataHora(new Date('2019-01-16T01:30:00Z'))).toBe('15/01/2019 às 23:30');
  });
});
