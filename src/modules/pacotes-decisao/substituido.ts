// DEC substituído (0.1.13, DEC-DEM-20261104-0014-v1, opção b do E5 do 0013): o DEC com decisão `aprovada` que não é o
// aprovado mais novo da demanda. Sem coluna, sem migration e sem status novo: é calculado na leitura, como o
// `desatualizado`. "Aprovado mais novo" é o DEC de maior `versao` da demanda com decisão `aprovada`, e não o de data mais
// nova, para não depender do relógio; pelo A-01 (decidir.ts), só o DEC mais novo se decide, então ele é sempre o último
// aprovado. Só ele gera o Pedido de Construção (gerar.ts).
import { and, desc, eq, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Db } from '../../db';
import { decisao, pacoteDecisao } from '../../db/schema';

// Nomes próprios: a subconsulta é correlacionada com a linha de `pacote_decisao` da consulta externa (que também junta
// `decisao`) e não pode se confundir com ela nem com as subconsultas de expressaoDesatualizado. No template `sql`, a
// tabela com alias sai só com o nome do alias; por isso o FROM escreve a tabela e o alias lado a lado.
const decAprovado = alias(pacoteDecisao, 'dec_aprovado');
const decisaoAprovada = alias(decisao, 'decisao_aprovada');

// O id do aprovado mais novo da mesma demanda, com versão maior que a da linha externa; nulo se não há. Quem lê só vale
// o resultado para DEC aprovado (consultas.ts): pendente, devolvido e arquivado nunca são substituídos.
export function expressaoSubstituidoPor(): SQL {
  return sql`(select ${decAprovado.id} from ${pacoteDecisao} ${decAprovado} inner join ${decisao} ${decisaoAprovada} on ${decisaoAprovada.pacoteDecisaoId} = ${decAprovado.id} where ${decAprovado.demandaId} = ${pacoteDecisao.demandaId} and ${decisaoAprovada.statusDecisao} = 'aprovada' and ${decAprovado.versao} > ${pacoteDecisao.versao} order by ${decAprovado.versao} desc limit 1)`;
}

// O id do aprovado mais novo da demanda, ou null. Lido sob a trava da demanda por quem chama (decidir.ts): nenhuma
// decisão de outro DEC entra até o fim da transação (C-13).
export async function aprovadoMaisNovo(tx: Db, demandaId: string): Promise<string | null> {
  const [linha] = await tx
    .select({ id: pacoteDecisao.id })
    .from(pacoteDecisao)
    .innerJoin(decisao, eq(decisao.pacoteDecisaoId, pacoteDecisao.id))
    .where(and(eq(pacoteDecisao.demandaId, demandaId), eq(decisao.statusDecisao, 'aprovada')))
    .orderBy(desc(pacoteDecisao.versao))
    .limit(1);
  return linha?.id ?? null;
}
