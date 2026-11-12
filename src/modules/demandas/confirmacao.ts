// Confirmação da demanda do Awave (RF-06, IN-06, ADR-25): "confirmada" é a existência do evento `demanda_confirmada` da
// própria demanda, sem coluna nem UPDATE (C-34). Lê só `demanda` e `evento`, nunca o esquema do pg-boss (D-07). Usada pelo
// gatilho (dispararSeLigado, para os quatro agentes), pelo worker (passo 3c) e pela própria confirmação.
import { and, eq } from 'drizzle-orm';
import type { Db } from '../../db';
import { demanda, evento } from '../../db/schema';

export async function jaConfirmada(db: Db, demandaId: string): Promise<boolean> {
  const [l] = await db
    .select({ id: evento.id })
    .from(evento)
    .where(and(eq(evento.acao, 'demanda_confirmada'), eq(evento.entidade, 'demanda'), eq(evento.entidadeId, demandaId)))
    .limit(1);
  return l !== undefined;
}

// IN-06 e G8 #23: demanda de integração sem a confirmação de uma pessoa não vai a nenhum agente de IA. Demanda que não
// existe: false (a montagem da entrada segue dando "não encontrado"). Autoria fora da lista: true (falha fechada).
export async function aguardaConfirmacao(db: Db, demandaId: string): Promise<boolean> {
  const [d] = await db.select({ autorTipo: demanda.autorTipo }).from(demanda).where(eq(demanda.id, demandaId));
  if (!d) return false;
  switch (d.autorTipo) {
    case 'pessoa':
    case 'agente':
      return false;
    case 'integracao':
      return !(await jaConfirmada(db, demandaId));
    default: {
      const nunca: never = d.autorTipo;
      void nunca;
      return true;
    }
  }
}
