// ADR-16 (T07 do DEC-DEM-20261110-0015-v1): duas leituras só de consulta para a T03, chamadas pela página depois de
// exigirPessoaNaPagina e autorizar(pessoa, 'listar_demandas'), por src/app/(painel)/demandas/leituras-da-fila.ts (D-08).
// Não tocam listarDemandas, DemandaResumo nem a API. Devolvem só contagens e booleanos (CV-06): nenhum texto da demanda
// sai daqui. Os filtros chegam já validados por filtroDemandasSchema e os ids da página entram por inArray, como
// parâmetros. Custo fixo (RNF-09): uma consulta cada, qualquer que seja o tamanho da página; lista vazia não consulta.
// Plano de execução conferido com volume em resumo-da-fila.test.ts.
import { and, count, eq, exists, inArray } from 'drizzle-orm';
import type { Db } from '../../db';
import { demanda, especificacaoTecnica, pacoteDecisao, parecerRisco } from '../../db/schema';
import { STATUS, type FiltroDemandas, type Status } from './schemas';

export type ContagemPorStatus = { porStatus: Record<Status, number>; todas: number };
export type EtapasNaFila = { esp: boolean; rsk: boolean; dec: boolean };

// Contagem por status com os filtros de tipo e de linha da URL; o status da URL não entra (cada contador é um status).
// A tabela é limitada a 9.999 linhas pela demanda_seq: sem filtro, a contagem lê a tabela inteira de propósito.
export async function contarDemandasPorStatus(db: Db, filtro: Pick<FiltroDemandas, 'tipo' | 'linhaServicoProvavel'>): Promise<ContagemPorStatus> {
  const onde = and(
    filtro.tipo ? eq(demanda.tipo, filtro.tipo) : undefined,
    filtro.linhaServicoProvavel ? eq(demanda.linhaServicoProvavel, filtro.linhaServicoProvavel) : undefined,
  );
  const linhas = await db.select({ status: demanda.status, n: count() }).from(demanda).where(onde).groupBy(demanda.status);
  const porStatus = Object.fromEntries(STATUS.map((s) => [s, 0])) as Record<Status, number>;
  for (const l of linhas) porStatus[l.status] = l.n;
  return { porStatus, todas: linhas.reduce((t, l) => t + l.n, 0) };
}

// Se a demanda tem ao menos uma versão de ESP, RSK e DEC (qualquer versão conta como feita). Demanda que não existe
// fica fora do mapa. Um `exists` por tabela, e não junção: com junção o planejador varre as três tabelas de versões
// inteiras a cada página (Hash Join, ensaio da T07); com `exists`, cada demanda da página é uma busca no índice único
// (demanda_id, versao) de cada tabela, e o custo acompanha o tamanho da página, não o do banco.
type TabelaDeVersoes = typeof especificacaoTecnica | typeof parecerRisco | typeof pacoteDecisao;

export async function etapasDasDemandas(db: Db, ids: readonly string[]): Promise<Map<string, EtapasNaFila>> {
  const r = new Map<string, EtapasNaFila>();
  if (ids.length === 0) return r;
  const temVersao = (t: TabelaDeVersoes) => exists(db.select({ id: t.id }).from(t).where(eq(t.demandaId, demanda.id))).mapWith(Boolean);
  const linhas = await db
    .select({ id: demanda.id, esp: temVersao(especificacaoTecnica), rsk: temVersao(parecerRisco), dec: temVersao(pacoteDecisao) })
    .from(demanda)
    .where(inArray(demanda.id, [...ids]));
  for (const l of linhas) r.set(l.id, { esp: l.esp, rsk: l.rsk, dec: l.dec });
  return r;
}
