// Novas tentativas da execução de agente (P1-e): 3 tentativas no total, com espera de 30 s antes da 2ª e de 2 min antes
// da 3ª. A 1ª não tem espera (o job sai na mesma transação do artefato que a disparou), e não existe 4ª.
export const TENTATIVAS_MAXIMAS = 3;

const ESPERA_MS: Readonly<Record<number, number>> = Object.freeze({ 2: 30_000, 3: 120_000 });

export function esperaAntesDaTentativa(n: number): number {
  const ms = Number.isInteger(n) && n >= 2 && n <= TENTATIVAS_MAXIMAS ? ESPERA_MS[n] : undefined;
  if (ms === undefined) throw new RangeError(`esperaAntesDaTentativa: só há espera antes das tentativas 2 a ${TENTATIVAS_MAXIMAS}`);
  return ms;
}
