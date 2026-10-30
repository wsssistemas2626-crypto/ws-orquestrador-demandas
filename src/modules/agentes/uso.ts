// Registro de uso por chamada ao provedor de IA (RF-17, CA-17.2, CA-17.3). Uma linha por chamada, haja o que houver:
// sucesso, saída fora do schema ou erro (com os tokens que houver, inclusive zero). Só números, o modelo e o resultado:
// o tipo da entrada não tem campo de texto, e a gravação é campo a campo, para nada que chegue a mais ir ao banco. A data
// vem do relógio injetado (G3.4). `tx` é a transação de quem chama, quando houver (a execução da T27 grava em transação
// própria, fora da chamada ao provedor).
import type { Db } from '../../db';
import { usoIa, type ResultadoUso } from '../../db/schema';
import type { Relogio } from '../../lib/relogio';
import type { Agente } from '../acesso/ator';

export type UsoIa = {
  execucaoId: string;
  agente: Agente;
  demandaId: string | null;
  modelo: string;
  tokensEntrada: number;
  tokensSaida: number;
  custo: number;
  resultado: ResultadoUso;
};

function conferir(u: UsoIa): void {
  for (const n of [u.tokensEntrada, u.tokensSaida]) {
    if (!Number.isSafeInteger(n) || n < 0) throw new RangeError('registrarUso: tokens precisam ser inteiros não negativos');
  }
  if (!Number.isFinite(u.custo) || u.custo < 0) throw new RangeError('registrarUso: custo precisa ser finito e não negativo');
}

export async function registrarUso(tx: Db, u: UsoIa, relogio: Relogio): Promise<void> {
  conferir(u);
  await tx.insert(usoIa).values({
    execucaoAgenteId: u.execucaoId,
    agente: u.agente,
    demandaId: u.demandaId,
    modelo: u.modelo,
    tokensEntrada: u.tokensEntrada,
    tokensSaida: u.tokensSaida,
    // numeric(12, 6): o custo de calcularCusto já tem 6 casas; toFixed só escreve sem notação científica.
    custo: u.custo.toFixed(6),
    resultado: u.resultado,
    ocorridoEm: relogio.agora(),
  });
}
