// Limite por ator (C-36): no máximo 30 demandas e 60 artefatos (ESP, RSK e DEC somados) na última hora, com 429 acima
// disso. Conta pela autoria gravada (autor_tipo, autor_id), a mesma que vem do ator resolvido (C-11).
//
// Quem chama confere dentro da transação que vai gravar, antes de gerar id ou versão. A trava consultiva por ator e
// por tipo segura até o fim dessa transação: duas criações simultâneas do mesmo ator são contadas uma depois da outra,
// e o limite não é ultrapassado por corrida. Atores diferentes não esperam um pelo outro.
import { and, count, eq, gt, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { demanda, especificacaoTecnica, pacoteDecisao, parecerRisco } from '../db/schema';
import type { AutorArtefato } from '../db/schema/demandas';
import { ErroDominio } from '../lib/erros';
import type { Relogio } from '../lib/relogio';
import type { Ator } from './acesso/ator';

export type TipoLimite = 'demanda' | 'artefato';

export const LIMITE_POR_HORA: Readonly<Record<TipoLimite, number>> = Object.freeze({ demanda: 30, artefato: 60 });

export const MENSAGEM_LIMITE: Readonly<Record<TipoLimite, string>> = Object.freeze({
  demanda: 'Limite de 30 demandas por hora atingido. Tente de novo mais tarde.',
  artefato: 'Limite de 60 versões por hora atingido (especificações, pareceres de risco e pacotes de decisão somados). Tente de novo mais tarde.',
});

const JANELA_MS = 3_600_000;

type Autoria = { autorTipo: AutorArtefato; autorId: string };

// A mesma regra de autoria de quem grava: pessoa pelo id da conta, agente pelo nome do agente (sem o token).
function autoriaDo(ator: Ator): Autoria | null {
  if (ator.tipo === 'pessoa') return { autorTipo: 'pessoa', autorId: ator.usuarioId };
  if (ator.tipo === 'agente') return { autorTipo: 'agente', autorId: ator.agente };
  return null;
}

type TabelaComAutoria = typeof demanda | typeof especificacaoTecnica | typeof parecerRisco | typeof pacoteDecisao;

async function contar(tx: Db, tabela: TabelaComAutoria, a: Autoria, desde: Date): Promise<number> {
  const [linha] = await tx
    .select({ n: count() })
    .from(tabela)
    .where(and(eq(tabela.autorTipo, a.autorTipo), eq(tabela.autorId, a.autorId), gt(tabela.criadaEm, desde)));
  return linha?.n ?? 0;
}

export async function conferirLimite(tx: Db, ator: Ator, tipo: TipoLimite, relogio: Relogio): Promise<void> {
  const a = autoriaDo(ator);
  // O ator sistema não cria demanda nem artefato (autorizar nega); não há o que contar.
  if (!a) return;
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`limite:${tipo}:${a.autorTipo}:${a.autorId}`}, 0))`);
  const desde = new Date(relogio.agora().getTime() - JANELA_MS);
  const tabelas: TabelaComAutoria[] = tipo === 'demanda' ? [demanda] : [especificacaoTecnica, parecerRisco, pacoteDecisao];
  let total = 0;
  for (const tabela of tabelas) total += await contar(tx, tabela, a, desde);
  if (total >= LIMITE_POR_HORA[tipo]) throw new ErroDominio('limite_excedido', MENSAGEM_LIMITE[tipo]);
}
