// Preço por modelo e custo de cada chamada ao provedor de IA (RF-17, P1-f: USD). O preço é por milhão de tokens, com
// vigência: preço novo é linha nova (só por script, C-26), e a chamada usa o preço vigente no instante dela.
//
// O custo é calculado em inteiros: o preço, com até 6 casas, vira milionésimos de dólar por milhão de tokens; tokens ×
// esse valor dá o custo em 10⁻¹² dólar, que se arredonda (meio para cima) em milionésimos. Assim o arredondamento em 6
// casas não depende de ponto flutuante, e o valor cabe no numeric(12, 6) de uso_ia.custo.
import { and, desc, eq, lte } from 'drizzle-orm';
import type { Db } from '../../db';
import { precoModelo } from '../../db/schema';

export type PrecoPorMilhao = { entradaPorMilhao: number; saidaPorMilhao: number };

const MILHAO = 1_000_000n;

function tokensValidos(n: number): bigint {
  if (!Number.isSafeInteger(n) || n < 0) throw new RangeError('calcularCusto: tokens precisam ser inteiros não negativos');
  return BigInt(n);
}

// Milionésimos de dólar por milhão de tokens. O numeric(12, 6) do preço tem no máximo 6 casas: o arredondamento só
// apaga o erro de representação do número lido do banco.
function precoEmMilionesimos(p: number): bigint {
  if (!Number.isFinite(p) || p < 0) throw new RangeError('calcularCusto: preço precisa ser finito e não negativo');
  return BigInt(Math.round(p * 1_000_000));
}

export function calcularCusto(p: PrecoPorMilhao, tokensEntrada: number, tokensSaida: number): number {
  const total = tokensValidos(tokensEntrada) * precoEmMilionesimos(p.entradaPorMilhao) + tokensValidos(tokensSaida) * precoEmMilionesimos(p.saidaPorMilhao);
  // total está em 10⁻¹² dólar; (total + meio milhão) / milhão arredonda meio para cima em milionésimos.
  const milionesimos = (total + MILHAO / 2n) / MILHAO;
  return Number(milionesimos) / 1_000_000;
}

// A vigência mais nova até `em`, pelo índice único (modelo, vigente_desde). O modelo é comparado por igualdade, sem
// curinga.
export async function precoVigente(db: Db, modelo: string, em: Date): Promise<PrecoPorMilhao | null> {
  const [linha] = await db
    .select({ entrada: precoModelo.precoEntradaPorMilhao, saida: precoModelo.precoSaidaPorMilhao })
    .from(precoModelo)
    .where(and(eq(precoModelo.modelo, modelo), lte(precoModelo.vigenteDesde, em)))
    .orderBy(desc(precoModelo.vigenteDesde))
    .limit(1);
  if (!linha) return null;
  return { entradaPorMilhao: Number(linha.entrada), saidaPorMilhao: Number(linha.saida) };
}
