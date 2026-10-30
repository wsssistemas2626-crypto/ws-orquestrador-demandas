// Situação do worker para a tela de agentes (RNF-05; 02, seção 8): o último batimento, o alerta de worker sem sinal
// (mais de 5 min sem batimento) e o de duas instâncias (duas ou mais bateram nos últimos 2 min). Réplica a mais quebra a
// tolerância do teto (RNF-07), porque passa a haver duas chamadas ao provedor ao mesmo tempo.
import { count, gte, max } from 'drizzle-orm';
import type { Db } from '../../db';
import { workerBatimento } from '../../db/schema';
import type { Relogio } from '../../lib/relogio';

export const ATRASO_MAXIMO_MS = 5 * 60_000;
export const JANELA_INSTANCIAS_MS = 2 * 60_000;

export type SituacaoWorker = { ultimoBatimento: Date | null; atrasado: boolean; instanciasRecentes: number; duasInstancias: boolean };

export async function situacaoDoWorker(db: Db, relogio: Relogio): Promise<SituacaoWorker> {
  const agora = relogio.agora();
  const [ultimo] = await db.select({ em: max(workerBatimento.vistoEm) }).from(workerBatimento);
  const [recentes] = await db
    .select({ n: count() })
    .from(workerBatimento)
    .where(gte(workerBatimento.vistoEm, new Date(agora.getTime() - JANELA_INSTANCIAS_MS)));
  const ultimoBatimento = ultimo?.em ?? null;
  const instanciasRecentes = recentes?.n ?? 0;
  return {
    ultimoBatimento,
    atrasado: ultimoBatimento === null || agora.getTime() - ultimoBatimento.getTime() > ATRASO_MAXIMO_MS,
    instanciasRecentes,
    duasInstancias: instanciasRecentes >= 2,
  };
}
