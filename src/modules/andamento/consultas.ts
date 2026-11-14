// src/modules/andamento/consultas.ts — leituras do andamento (ADR-30, ADR-35). Só SELECT. O último andamento de uma
// demanda é a linha de maior id (o relógio injetado pode empatar). As linhas saem cruas: quem mostra passa cada uma por
// lerAndamento (regras.ts, AN-12). O id da linha e o prefixo do token nunca saem daqui. As três leituras usam o índice
// andamento_construcao_demanda_id_idx (demanda_id, id), conferido por EXPLAIN em consultas.test.ts (RNF-01).
import { desc, eq, inArray } from 'drizzle-orm';
import type { Db } from '../../db';
import { andamentoConstrucao as a, demanda } from '../../db/schema';

export type LinhaDeAndamento = {
  demandaId: string;
  decId: string;
  fase: string;
  tarefasProntas: number;
  tarefasTotal: number;
  statusConstrucao: string;
  gravadoEm: Date;
};

// Lista de permissão das colunas (G3.5): sem `id` e sem `ator_token_prefixo`.
const COLUNAS = {
  demandaId: a.demandaId,
  decId: a.decId,
  fase: a.fase,
  tarefasProntas: a.tarefasProntas,
  tarefasTotal: a.tarefasTotal,
  statusConstrucao: a.statusConstrucao,
  gravadoEm: a.gravadoEm,
};

export async function ultimoAndamento(db: Db, demandaId: string): Promise<LinhaDeAndamento | null> {
  const [l] = await db.select(COLUNAS).from(a).where(eq(a.demandaId, demandaId)).orderBy(desc(a.id)).limit(1);
  return l ?? null;
}

// Uma consulta por página da fila (ADR-16): o último de cada demanda pedida; a que não tem andamento fica fora do mapa.
// Lista vazia não consulta. 0.4.1 (B-08-1, ADR-39): a partir de `demanda`, uma junção lateral pega a linha de maior id
// de cada uma pelo índice (demanda_id, id): um Limit sobre Index Scan Backward por demanda, no máximo uma linha lida e
// nenhum Sort. A projeção é COLUNAS, chave a chave (SB-13).
export async function andamentosDasDemandas(db: Db, ids: readonly string[]): Promise<Map<string, LinhaDeAndamento>> {
  const mapa = new Map<string, LinhaDeAndamento>();
  const unicos = [...new Set(ids)];
  if (unicos.length === 0) return mapa;
  const u = db.select(COLUNAS).from(a).where(eq(a.demandaId, demanda.id)).orderBy(desc(a.id)).limit(1).as('ultimo');
  const linhas = await db
    .select({
      demandaId: u.demandaId,
      decId: u.decId,
      fase: u.fase,
      tarefasProntas: u.tarefasProntas,
      tarefasTotal: u.tarefasTotal,
      statusConstrucao: u.statusConstrucao,
      gravadoEm: u.gravadoEm,
    })
    .from(demanda)
    .crossJoinLateral(u)
    .where(inArray(demanda.id, unicos));
  for (const l of linhas) mapa.set(l.demandaId, l);
  return mapa;
}

// D-09: o último andamento da demanda como subconsulta, para a leitura do Awave juntar na mesma consulta da autoria
// (`leftJoin(ua, eq(ua.demandaId, demanda.id))`): o 404 sai da mesma consulta, sem leitura a mais num caso que no outro.
export function subconsultaDoUltimoAndamento(db: Db, demandaId: string) {
  return db.select(COLUNAS).from(a).where(eq(a.demandaId, demandaId)).orderBy(desc(a.id)).limit(1).as('ultimo_andamento');
}
