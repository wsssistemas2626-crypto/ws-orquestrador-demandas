// Preço por modelo e custo de cada chamada (RF-17, CA-17.1, P1-f). O custo é calculado em inteiros (milionésimo de
// dólar), para o arredondamento em 6 casas não depender de ponto flutuante. O preço vigente vem do Postgres real
// (Testcontainers), com a vigência só de inclusão da T06. Dados só fictícios.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { calcularCusto, precoVigente } from './preco';

let b: BancoDeTeste;

const inserirPreco = (modelo: string, entrada: string, saida: string, desde: string) =>
  b.poolMigrator.query(
    'insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, $2, $3, $4)',
    [modelo, entrada, saida, desde],
  );

beforeAll(async () => {
  b = await novoBanco();
  await inserirPreco('modelo-ficticio', '3', '15', '2026-10-01T03:00:00Z');
  await inserirPreco('modelo-ficticio', '2.5', '12.5', '2026-11-01T03:00:00Z');
  await inserirPreco('modelo-ficticio-barato', '0.25', '1.25', '2026-01-01T00:00:00Z');
});
afterAll(async () => {
  await b.fechar();
});

describe('calcularCusto (CA-17.1)', () => {
  it('CA-17.1: 1.000 tokens de entrada a 3/M e 200 de saída a 15/M custam 0,006', () => {
    expect(calcularCusto({ entradaPorMilhao: 3, saidaPorMilhao: 15 }, 1_000, 200)).toBe(0.006);
  });

  it('arredonda em 6 casas', () => {
    expect(calcularCusto({ entradaPorMilhao: 0.25, saidaPorMilhao: 1.25 }, 3, 7)).toBe(0.00001);
  });

  it('meio milionésimo arredonda para cima, e menos que isso para baixo', () => {
    // 1 token a 0,5/M = 0,0000005 → 0,000001; 1 token a 0,499999/M → 0.
    expect(calcularCusto({ entradaPorMilhao: 0.5, saidaPorMilhao: 0 }, 1, 0)).toBe(0.000001);
    expect(calcularCusto({ entradaPorMilhao: 0.499999, saidaPorMilhao: 0 }, 1, 0)).toBe(0);
  });

  it('preço com 6 casas não acumula erro de ponto flutuante', () => {
    // 0,1 e 0,2 não têm representação exata em binário; em inteiros, 10 × 0,1 + 10 × 0,2 = 3 milionésimos.
    expect(calcularCusto({ entradaPorMilhao: 0.1, saidaPorMilhao: 0.2 }, 10, 10)).toBe(0.000003);
    expect(calcularCusto({ entradaPorMilhao: 0.123456, saidaPorMilhao: 0.654321 }, 1_000_000, 1_000_000)).toBe(0.777777);
  });

  it('chamada sem token (erro antes da resposta) custa zero', () => {
    expect(calcularCusto({ entradaPorMilhao: 3, saidaPorMilhao: 15 }, 0, 0)).toBe(0);
  });

  it('valores grandes não perdem precisão: 1.000.000 de tokens a 999.999,999999/M', () => {
    expect(calcularCusto({ entradaPorMilhao: 999_999.999999, saidaPorMilhao: 0 }, 1_000_000, 0)).toBe(999_999.999999);
  });

  it.each([
    ['tokens de entrada negativos', -1, 0],
    ['tokens de saída negativos', 0, -1],
    ['tokens fracionários', 1.5, 0],
    ['tokens não finitos', Number.POSITIVE_INFINITY, 0],
  ])('%s são recusados', (_caso, entrada, saida) => {
    expect(() => calcularCusto({ entradaPorMilhao: 3, saidaPorMilhao: 15 }, entrada, saida)).toThrow(RangeError);
  });

  it.each([
    ['preço negativo', { entradaPorMilhao: -1, saidaPorMilhao: 15 }],
    ['preço não finito', { entradaPorMilhao: 3, saidaPorMilhao: Number.NaN }],
  ])('%s é recusado', (_caso, preco) => {
    expect(() => calcularCusto(preco, 1, 1)).toThrow(RangeError);
  });
});

describe('precoVigente (RF-17)', () => {
  it('precoVigente pega a vigência mais nova até a data', async () => {
    expect(await precoVigente(b.db, 'modelo-ficticio', new Date('2026-10-22T12:00:00Z'))).toEqual({ entradaPorMilhao: 3, saidaPorMilhao: 15 });
    expect(await precoVigente(b.db, 'modelo-ficticio', new Date('2026-11-15T12:00:00Z'))).toEqual({ entradaPorMilhao: 2.5, saidaPorMilhao: 12.5 });
  });

  it('a vigência vale a partir do instante exato em que começa', async () => {
    expect(await precoVigente(b.db, 'modelo-ficticio', new Date('2026-11-01T02:59:59.999Z'))).toEqual({ entradaPorMilhao: 3, saidaPorMilhao: 15 });
    expect(await precoVigente(b.db, 'modelo-ficticio', new Date('2026-11-01T03:00:00Z'))).toEqual({ entradaPorMilhao: 2.5, saidaPorMilhao: 12.5 });
  });

  it('antes da primeira vigência, ou para modelo sem preço, não há preço (null)', async () => {
    expect(await precoVigente(b.db, 'modelo-ficticio', new Date('2026-09-30T12:00:00Z'))).toBeNull();
    expect(await precoVigente(b.db, 'modelo-sem-preco', new Date('2026-10-22T12:00:00Z'))).toBeNull();
  });

  it('o modelo é comparado por inteiro, sem curinga nem diferença de caixa', async () => {
    for (const modelo of ['modelo-%', 'MODELO-FICTICIO', 'modelo-ficticio ', 'modelo-ficticio-barat_']) {
      expect(await precoVigente(b.db, modelo, new Date('2026-10-22T12:00:00Z')), modelo).toBeNull();
    }
  });

  it('o preço lido do numeric vira número, e alimenta o cálculo do custo', async () => {
    const p = await precoVigente(b.db, 'modelo-ficticio-barato', new Date('2026-10-22T12:00:00Z'));
    expect(p).toEqual({ entradaPorMilhao: 0.25, saidaPorMilhao: 1.25 });
    expect(calcularCusto(p!, 3, 7)).toBe(0.00001);
  });
});
