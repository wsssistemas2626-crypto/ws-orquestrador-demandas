// Número de versão de ESP, RSK e DEC e trava da demanda (RF-11, CA-04.3). Quem grava versão nova faz, numa transação:
// travarDemanda → proximaVersao → insert. A trava (SELECT ... FOR UPDATE na linha da demanda) põe em fila as criações
// simultâneas da mesma demanda; a restrição única (demanda_id, versao) de cada tabela é a segunda barreira. A mesma trava
// fecha a corrida entre ESP ou RSK nova e a decisão do DEC (C-13, T21).
import { eq, max } from 'drizzle-orm';
import type { Db } from '../db';
import { demanda, especificacaoTecnica, pacoteDecisao, parecerRisco } from '../db/schema';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../lib/erros';
import type { PrefixoVersao } from '../lib/rota';

export type TabelaVersionada = typeof especificacaoTecnica | typeof parecerRisco | typeof pacoteDecisao;

// A união das regex por prefixo de rota() (G3.10); o teste confere que aceitam as mesmas formas.
export const RE_ID_VERSAO = /^(ESP|RSK|DEC)-DEM-\d{8}-\d{4}-v\d{1,4}$/;

export const idVersao = (prefixo: PrefixoVersao, demandaId: string, versao: number): string => `${prefixo}-${demandaId}-v${versao}`;

export async function travarDemanda(tx: Db, demandaId: string): Promise<typeof demanda.$inferSelect> {
  const [linha] = await tx.select().from(demanda).where(eq(demanda.id, demandaId)).for('update');
  if (!linha) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);
  return linha;
}

// max(versao) + 1, e não a contagem: um buraco na numeração não faz repetir versão.
export async function proximaVersao(tx: Db, tabela: TabelaVersionada, demandaId: string): Promise<number> {
  const [linha] = await tx
    .select({ maior: max(tabela.versao) })
    .from(tabela)
    .where(eq(tabela.demandaId, demandaId));
  return (linha?.maior ?? 0) + 1;
}
