// Leitura do texto recebido de uma demanda (RF-05, RF-24): só por pessoa (`ler_texto_bruto`, nenhum agente), e só por
// esta função. A vista da demanda (consultas.ts) nunca traz o texto nem a origem (RF-06). Depois do expurgo (T31) sobra
// só a data em que ele aconteceu.
import { eq } from 'drizzle-orm';
import type { Db } from '../../db';
import { demanda, entradaBruta, type Origem } from '../../db/schema/demandas';
import type { ConfigApp } from '../../lib/env';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import type { AtorPessoa } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import { RE_ID_DEMANDA } from './gerar-id';

export type TextoRecebido =
  | { situacao: 'sem_texto' }
  | { situacao: 'guardado'; texto: string; origem: Origem | null; recebidaEm: Date; apagarEm: Date }
  | { situacao: 'expurgado'; expurgadaEm: Date };

export type DepsTextoRecebido = { db: Db; config: Pick<ConfigApp, 'retencaoDias'> };

const DIA_MS = 86_400_000;

// A data a partir da qual o texto pode ser expurgado: recebida + prazo de retenção (RETENCAO_TEXTO_BRUTO_DIAS, C-31).
export const apagarEmDe = (recebidaEm: Date, retencaoDias: number): Date => new Date(recebidaEm.getTime() + retencaoDias * DIA_MS);

export async function obterTextoRecebido(deps: DepsTextoRecebido, ator: AtorPessoa, demandaId: string): Promise<TextoRecebido> {
  autorizar(ator, 'ler_texto_bruto');
  // C-17: id fora do formato não chega ao banco.
  if (!RE_ID_DEMANDA.test(demandaId)) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);
  const [linha] = await deps.db
    .select({
      id: demanda.id,
      texto: entradaBruta.texto,
      origem: entradaBruta.origem,
      recebidaEm: entradaBruta.recebidaEm,
      expurgadaEm: entradaBruta.expurgadaEm,
    })
    .from(demanda)
    .leftJoin(entradaBruta, eq(entradaBruta.demandaId, demanda.id))
    .where(eq(demanda.id, demandaId));
  if (!linha) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);
  if (linha.expurgadaEm) return { situacao: 'expurgado', expurgadaEm: linha.expurgadaEm };
  if (linha.texto === null || linha.recebidaEm === null) return { situacao: 'sem_texto' };
  return {
    situacao: 'guardado',
    texto: linha.texto,
    origem: linha.origem ?? null,
    recebidaEm: linha.recebidaEm,
    apagarEm: apagarEmDe(linha.recebidaEm, deps.config.retencaoDias),
  };
}
