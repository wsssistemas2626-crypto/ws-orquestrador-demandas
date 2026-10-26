// C-06: 5 códigos errados (TOTP ou de recuperação) na mesma conta, dentro de 15 min e de qualquer IP, bloqueiam a
// verificação dessa conta por 15 min. Conta por conta, não por IP: o limite por IP é o `rateLimit` do Better Auth.
// A hora vem sempre do Relogio de quem chama (G3.4).
//
// O plugin twoFactor do Better Auth 1.7.6 tem um bloqueio próprio (10 erros seguidos, sem janela, 15 min, nas colunas
// da T47). Ele fica ligado como camada a mais: dentro de 15 min, este bloqueio vem antes; fora da janela, o do plugin
// pega o que este deixaria passar. Nenhum dos dois afrouxa o outro (verificacao.test.ts).
import { eq } from 'drizzle-orm';
import type { Db } from '../../db';
import { bloqueioVerificacao as tabela } from '../../db/schema';

export const LIMITE_FALHAS = 5;
export const JANELA_FALHAS_MS = 15 * 60 * 1000;
export const DURACAO_BLOQUEIO_MS = 15 * 60 * 1000;

export async function verificacaoBloqueada(db: Db, usuarioId: string, agora: Date): Promise<boolean> {
  const [linha] = await db
    .select({ bloqueadoAte: tabela.bloqueadoAte })
    .from(tabela)
    .where(eq(tabela.usuarioId, usuarioId));
  return !!linha?.bloqueadoAte && linha.bloqueadoAte.getTime() > agora.getTime();
}

// Soma uma falha na janela. Na 5ª, bloqueia e zera a contagem: depois do bloqueio, a próxima falha abre janela nova.
export async function registrarFalhaDeVerificacao(db: Db, usuarioId: string, agora: Date): Promise<{ bloqueou: boolean }> {
  return db.transaction(async (tx) => {
    await tx.insert(tabela).values({ usuarioId }).onConflictDoNothing();
    const [linha] = await tx.select().from(tabela).where(eq(tabela.usuarioId, usuarioId)).for('update');
    const naJanela = !!linha?.janelaInicio && agora.getTime() - linha.janelaInicio.getTime() < JANELA_FALHAS_MS;
    const falhas = (naJanela ? linha!.falhas : 0) + 1;
    if (falhas >= LIMITE_FALHAS) {
      await tx
        .update(tabela)
        .set({ falhas: 0, janelaInicio: null, bloqueadoAte: new Date(agora.getTime() + DURACAO_BLOQUEIO_MS) })
        .where(eq(tabela.usuarioId, usuarioId));
      return { bloqueou: true };
    }
    await tx
      .update(tabela)
      .set({ falhas, janelaInicio: naJanela ? linha!.janelaInicio : agora })
      .where(eq(tabela.usuarioId, usuarioId));
    return { bloqueou: false };
  });
}

// Código certo zera a contagem da janela.
export async function zerarFalhasDeVerificacao(db: Db, usuarioId: string): Promise<void> {
  await db.update(tabela).set({ falhas: 0, janelaInicio: null }).where(eq(tabela.usuarioId, usuarioId));
}
