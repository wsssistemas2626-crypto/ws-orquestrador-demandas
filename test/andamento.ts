// test/andamento.ts — ajudantes dos testes do andamento (T07 em diante). Linhas e status pelo migrator quando o caso
// pede um estado que nenhum caminho do app grava; dados fictícios; prefixo `ficticio` (G3.3).
import type { StatusConstrucao } from '../src/db/schema/andamento';
import type { CorpoAndamento } from '../src/modules/andamento/schemas';
import type { Status, Tipo } from '../src/modules/demandas/schemas';
import type { BancoDeTeste } from './banco';
import type { LinhaEvento } from './pedidos-construcao';

export const CORPO_CONSTRUINDO: CorpoAndamento = Object.freeze({ fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, status: 'em_construcao' });
export const corpo = (c: Partial<CorpoAndamento> = {}): CorpoAndamento => ({ ...CORPO_CONSTRUINDO, ...c });

export const STATUS_DA_DEMANDA: readonly Status[] = Object.freeze([
  'nova',
  'em_analise',
  'aguardando_informacao',
  'pronta_para_decisao',
  'aprovada',
  'em_construcao',
  'devolvida',
  'entregue',
  'encerrada',
]);

// A tabela da spec, seção 2.1 (P-02 de Fabiano), para a demanda do tipo melhoria. null = grava sem mudar o status;
// 'recusa' = 409. É a mesma de src/modules/andamento/regras.test.ts, escrita aqui à parte (aquele arquivo não muda, G5).
export const TABELA_DO_CONSTRUIR: Readonly<Record<Status, Readonly<Record<StatusConstrucao, Status | null | 'recusa'>>>> = Object.freeze({
  nova: { em_construcao: null, construido: null, cancelado: null },
  em_analise: { em_construcao: null, construido: null, cancelado: null },
  aguardando_informacao: { em_construcao: null, construido: null, cancelado: null },
  pronta_para_decisao: { em_construcao: null, construido: null, cancelado: null },
  aprovada: { em_construcao: 'em_construcao', construido: null, cancelado: null },
  em_construcao: { em_construcao: null, construido: null, cancelado: 'devolvida' },
  devolvida: { em_construcao: null, construido: null, cancelado: null },
  entregue: { em_construcao: 'recusa', construido: null, cancelado: 'recusa' },
  encerrada: { em_construcao: 'recusa', construido: 'recusa', cancelado: null },
});

// O esperado para o tipo: Estudo não vai para construção (só grava).
export function esperadoDaTabela(status: Status, tipo: Tipo, sc: StatusConstrucao): Status | null | 'recusa' {
  const e = TABELA_DO_CONSTRUIR[status][sc];
  return tipo === 'estudo' && e === 'em_construcao' ? null : e;
}

export const andamentosDa = async (b: BancoDeTeste, demandaId: string): Promise<Array<Record<string, unknown>>> =>
  (
    await b.poolMigrator.query(
      `select dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em from andamento_construcao where demanda_id = $1 order by id`,
      [demandaId],
    )
  ).rows;

export const eventosDo = async (b: BancoDeTeste, entidadeId: string, acao: string): Promise<LinhaEvento[]> =>
  (
    await b.poolMigrator.query<LinhaEvento>(
      `select ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, antes, depois from evento where entidade_id = $1 and acao = $2 order by id`,
      [entidadeId, acao],
    )
  ).rows;

export async function porStatus(b: BancoDeTeste, demandaId: string, status: Status, tipo?: Tipo): Promise<void> {
  await b.poolMigrator.query(`update demanda set status = $2, tipo = coalesce($3, tipo) where id = $1`, [demandaId, status, tipo ?? null]);
}

// Só o migrator apaga (o papel do app só lê e inclui, AN-10): o caso começa sem andamento.
export async function apagarAndamentos(b: BancoDeTeste, demandaId: string): Promise<void> {
  await b.poolMigrator.query(`delete from andamento_construcao where demanda_id = $1`, [demandaId]);
}

export async function inserirAndamento(
  b: BancoDeTeste,
  x: { demandaId: string; decId: string; fase?: string; prontas?: number; total?: number; status?: string; gravadoEm: Date },
): Promise<void> {
  await b.poolMigrator.query(
    `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em) values ($1, $2, $3, $4, $5, $6, 'ficticio', $7)`,
    [x.demandaId, x.decId, x.fase ?? 'construindo', x.prontas ?? 0, x.total ?? 1, x.status ?? 'em_construcao', x.gravadoEm.toISOString()],
  );
}

// O retrato do que o envio pode mudar: andamento, status, atualizada_em e eventos da demanda.
export async function retratoDa(b: BancoDeTeste, demandaId: string) {
  const d = (await b.poolMigrator.query(`select status, tipo, atualizada_em from demanda where id = $1`, [demandaId])).rows[0] as Record<string, unknown>;
  const n = Number((await b.poolMigrator.query<{ n: string }>(`select count(*) as n from evento where demanda_id = $1`, [demandaId])).rows[0]!.n);
  return { demanda: d, eventos: n, andamentos: await andamentosDa(b, demandaId) };
}

// Erro de uma promessa que deve falhar, sem try/catch no teste.
export async function erroDe(p: Promise<unknown>): Promise<unknown> {
  return p.then(
    () => undefined,
    (e: unknown) => e,
  );
}
