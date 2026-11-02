// DEC desatualizado (RF-12): a demanda já tem ESP ou RSK com versão maior que a citada no DEC. A expressão é
// correlacionada com a linha de `pacote_decisao` da consulta externa e usa o índice único (demanda_id, versao) de cada
// tabela. A T15 usa para a transição manual para `aprovada` (RF-07); a T20 e a T21 usam na leitura e na decisão.
import { and, eq, sql, type SQL } from 'drizzle-orm';
import type { Db } from '../../db';
import { decisao, especificacaoTecnica, pacoteDecisao, parecerRisco } from '../../db/schema';

export function expressaoDesatualizado(): SQL {
  return sql`(${pacoteDecisao.especificacaoVersao} < (select max(${especificacaoTecnica.versao}) from ${especificacaoTecnica} where ${especificacaoTecnica.demandaId} = ${pacoteDecisao.demandaId}) or ${pacoteDecisao.parecerRiscoVersao} < (select max(${parecerRisco.versao}) from ${parecerRisco} where ${parecerRisco.demandaId} = ${pacoteDecisao.demandaId}))`;
}

// Há um DEC da demanda com decisão `aprovada` (a decisão só é gravada quando a aprovação está completa, T21) e que
// não está desatualizado. Com a trava da demanda segura por quem chama, o resultado vale até o fim da transação.
export async function temPacoteAprovadoAtualizado(tx: Db, demandaId: string): Promise<boolean> {
  const [linha] = await tx
    .select({ id: pacoteDecisao.id })
    .from(pacoteDecisao)
    .innerJoin(decisao, eq(decisao.pacoteDecisaoId, pacoteDecisao.id))
    .where(and(eq(pacoteDecisao.demandaId, demandaId), eq(decisao.statusDecisao, 'aprovada'), sql`not ${expressaoDesatualizado()}`))
    .limit(1);
  return linha !== undefined;
}
