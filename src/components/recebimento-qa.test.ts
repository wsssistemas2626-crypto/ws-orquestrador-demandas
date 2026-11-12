// 06-T19-testes (qa-automacao) do DEC-DEM-20261111-0016-v1: bordas da linha "Recebido pelo /construir em …" (RF-15,
// CA-15.1; 03, 6.1) que o recebimento.test.ts não cobre: a meia-noite e a virada do ano no fuso do sistema, a hora 00
// (e não 24), os segundos cortados (não arredondados), os zeros à esquerda, a forma exata do retorno e a independência
// do relógio real. Datas fixas; nenhuma leitura de banco.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { linhaDoRecebimento } from './dados-da-decisao';

afterEach(() => {
  vi.useRealTimers();
});

describe('linhaDoRecebimento: bordas da data (QA da T19)', () => {
  it.each([
    ['um segundo antes da meia-noite em São Paulo fica no dia anterior', '2026-11-11T02:59:59.000Z', '10/11/2026 às 23:59'],
    ['a meia-noite em São Paulo é 00:00, e não 24:00', '2026-11-11T03:00:00.000Z', '11/11/2026 às 00:00'],
    ['a virada do ano em UTC ainda é 31/12 em São Paulo', '2027-01-01T02:30:00.000Z', '31/12/2026 às 23:30'],
    ['dia, mês, hora e minuto com zero à esquerda', '2026-03-05T12:07:00.000Z', '05/03/2026 às 09:07'],
    ['os segundos são cortados, não arredondados para o minuto seguinte', '2026-11-11T17:32:59.999Z', '11/11/2026 às 14:32'],
  ])('%s', (_nome, iso, data) => {
    const l = linhaDoRecebimento(new Date(iso));
    // A forma exata: só texto e iso; o iso guarda o instante inteiro do evento, com os milissegundos.
    expect(l).toStrictEqual({ texto: `Recebido pelo /construir em ${data}.`, iso });
    // A data aparece uma vez só na frase (a página parte a frase pela data, com lastIndexOf).
    expect(l!.texto.split(data)).toHaveLength(2);
    expect(l!.texto.endsWith(`${data}.`)).toBe(true);
  });

  it('não lê o relógio real: o mesmo instante dá a mesma linha com o relógio do processo em outro ano', () => {
    const em = new Date('2026-11-11T17:32:00.000Z');
    const antes = linhaDoRecebimento(em);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2031-06-30T23:59:00.000Z'));
    expect(linhaDoRecebimento(em)).toStrictEqual(antes);
    expect(antes).toStrictEqual({ texto: 'Recebido pelo /construir em 11/11/2026 às 14:32.', iso: '2026-11-11T17:32:00.000Z' });
  });

  it('não muda o Date recebido', () => {
    const em = new Date('2026-11-11T17:32:00.000Z');
    linhaDoRecebimento(em);
    expect(em.toISOString()).toBe('2026-11-11T17:32:00.000Z');
  });
});
