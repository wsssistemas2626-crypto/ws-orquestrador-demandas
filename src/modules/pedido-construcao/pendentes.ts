// O que o /construir pode buscar (02, 5.3; RF-12, IN-10), numa consulta só, e as leituras do Pedido de Construção no
// histórico que a entrega (entregar.ts), o recebimento (receber.ts) e o painel usam (ADR-26, RF-15). O estado sai dos
// eventos, que são só de inclusão (ADR-03): nenhuma coluna de estado. Todas procuram `evento` por `acao` e
// `entidade_id`, pelo índice `evento_acao_entidade_idx` (ADR-27, RNF-02). Só leitura: nada aqui grava evento (CA-12.6).
// A lista não monta o pedido: um DEC cuja entrega seria recusada (por exemplo, pelo nome do solicitante) continua nela
// até o recebimento (P-02); não há corte por data (P-03).
import { and, asc, eq, isNotNull, min, notExists, notInArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Db } from '../../db';
import { decisao, demanda, evento, pacoteDecisao } from '../../db/schema';
import { STATUS_FINAIS } from '../demandas/transicoes';
import { expressaoDesatualizado } from '../pacotes-decisao/desatualizado';
import { expressaoSubstituidoPor } from '../pacotes-decisao/substituido';

const ENTIDADE = 'pacote_decisao';
const RE_SHA256 = /^[0-9a-f]{64}$/;

// Nome próprio para o NOT EXISTS correlacionado: a subconsulta `g` também lê `evento`.
const recebido = alias(evento, 'recebido');

// Pendente: DEC com `pedido_gerado` de pessoa sobre o pacote de decisão (IN-10), decisão `aprovada`, não substituído
// por um aprovado mais novo da demanda, não desatualizado, demanda fora de status final e sem `pedido_recebido`. Do
// primeiro `pedido_gerado` mais antigo para o mais novo, e depois pelo id. Só o id sai.
export async function listarPendentes(db: Db): Promise<Array<{ decId: string }>> {
  const g = db
    .select({ decId: evento.entidadeId, primeiro: min(evento.ocorridoEm).as('primeiro') })
    .from(evento)
    .where(and(eq(evento.acao, 'pedido_gerado'), eq(evento.entidade, ENTIDADE), eq(evento.atorTipo, 'pessoa')))
    .groupBy(evento.entidadeId)
    .as('g');
  return db
    .select({ decId: pacoteDecisao.id })
    .from(pacoteDecisao)
    .innerJoin(g, eq(g.decId, pacoteDecisao.id))
    .innerJoin(decisao, and(eq(decisao.pacoteDecisaoId, pacoteDecisao.id), eq(decisao.statusDecisao, 'aprovada')))
    .innerJoin(demanda, eq(demanda.id, pacoteDecisao.demandaId))
    .where(
      and(
        notInArray(demanda.status, [...STATUS_FINAIS]),
        sql`${expressaoSubstituidoPor()} is null`,
        sql`not ${expressaoDesatualizado()}`,
        notExists(
          db
            .select({ x: sql`1` })
            .from(recebido)
            .where(and(eq(recebido.acao, 'pedido_recebido'), eq(recebido.entidade, ENTIDADE), eq(recebido.entidadeId, pacoteDecisao.id))),
        ),
      ),
    )
    .orderBy(asc(g.primeiro), asc(pacoteDecisao.id));
}

// IN-10: a entrega só sai do que uma pessoa gerou. A demanda vem do evento, que sempre a leva; sem ela, não conta.
export async function pedidoGeradoPorPessoa(db: Db, decId: string): Promise<{ demandaId: string } | null> {
  const [linha] = await db
    .select({ demandaId: evento.demandaId })
    .from(evento)
    .where(
      and(
        eq(evento.acao, 'pedido_gerado'),
        eq(evento.entidade, ENTIDADE),
        eq(evento.entidadeId, decId),
        eq(evento.atorTipo, 'pessoa'),
        isNotNull(evento.demandaId),
      ),
    )
    .orderBy(asc(evento.id))
    .limit(1);
  return linha?.demandaId ? { demandaId: linha.demandaId } : null;
}

// ADR-26 e P-02: os hashes já entregues do DEC, na ordem de gravação e sem repetir. Só o que casa com o formato do
// servidor (IN-12); qualquer outro valor em `depois` é ignorado.
export async function shasEntregues(db: Db, decId: string): Promise<string[]> {
  const linhas = await db
    .select({ sha256: sql<string | null>`${evento.depois}->>'sha256'` })
    .from(evento)
    .where(and(eq(evento.acao, 'pedido_entregue'), eq(evento.entidade, ENTIDADE), eq(evento.entidadeId, decId)))
    .orderBy(asc(evento.id));
  const shas = linhas.map((l) => l.sha256).filter((s): s is string => typeof s === 'string' && RE_SHA256.test(s));
  return [...new Set(shas)];
}

// IN-11: o recebimento com este hash já foi gravado para este DEC (a repetição não grava de novo).
export async function recebidoComSha(db: Db, decId: string, sha256: string): Promise<boolean> {
  if (!RE_SHA256.test(sha256)) return false;
  const [linha] = await db
    .select({ id: evento.id })
    .from(evento)
    .where(
      and(
        eq(evento.acao, 'pedido_recebido'),
        eq(evento.entidade, ENTIDADE),
        eq(evento.entidadeId, decId),
        sql`${evento.depois}->>'sha256' = ${sha256}`,
      ),
    )
    .limit(1);
  return linha !== undefined;
}

// RF-15: "Recebido pelo /construir em <data>", a do primeiro pedido_recebido; null se não houve.
export async function recebimentoDoPedido(db: Db, decId: string): Promise<Date | null> {
  const [linha] = await db
    .select({ em: evento.ocorridoEm })
    .from(evento)
    .where(and(eq(evento.acao, 'pedido_recebido'), eq(evento.entidade, ENTIDADE), eq(evento.entidadeId, decId)))
    .orderBy(asc(evento.ocorridoEm), asc(evento.id))
    .limit(1);
  return linha?.em ?? null;
}
