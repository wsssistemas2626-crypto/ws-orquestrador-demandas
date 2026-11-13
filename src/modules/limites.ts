// Limite por ator (C-36): no máximo 30 demandas e 60 artefatos (ESP, RSK e DEC somados) na última hora, com 429 acima
// disso. Conta pela autoria gravada (autor_tipo, autor_id), a mesma que vem do ator resolvido (C-11).
//
// Quem chama confere dentro da transação que vai gravar, antes de gerar id ou versão. A trava consultiva por ator e
// por tipo segura até o fim dessa transação: duas criações simultâneas do mesmo ator são contadas uma depois da outra,
// e o limite não é ultrapassado por corrida. Atores diferentes não esperam um pelo outro.
//
// IN-09 (0.3.0): integração sempre conta, pela autoria (integracao, <nome>), com o limite próprio da tabela abaixo.
// Integração sem limite definido para o tipo lança (nunca "sem limite"); só o sistema sai sem contar.
import { and, count, eq, gt, sql } from 'drizzle-orm';
import type { Db } from '../db';
import { andamentoConstrucao, demanda, especificacaoTecnica, pacoteDecisao, parecerRisco } from '../db/schema';
import type { AutorDemanda } from '../db/schema/demandas';
import { ErroDominio } from '../lib/erros';
import type { Relogio } from '../lib/relogio';
import { atorDesconhecido, type Ator, type AtorSistema, type Integracao } from './acesso/ator';

export type TipoLimite = 'demanda' | 'artefato';

export const LIMITE_POR_HORA: Readonly<Record<TipoLimite, number>> = Object.freeze({ demanda: 30, artefato: 60 });

export const MENSAGEM_LIMITE: Readonly<Record<TipoLimite, string>> = Object.freeze({
  demanda: 'Limite de 30 demandas por hora atingido. Tente de novo mais tarde.',
  artefato: 'Limite de 60 versões por hora atingido (especificações, pareceres de risco e pacotes de decisão somados). Tente de novo mais tarde.',
});

// D2 e ADR-24: o Awave cria no máximo 10 demandas por hora.
export const MENSAGEM_LIMITE_AWAVE = 'Limite de 10 demandas por hora do Awave atingido. Tente de novo mais tarde.';

const JANELA_MS = 3_600_000;

type Limite = Readonly<{ maximo: number; mensagem: string }>;

// Mudar o número é decisão de Fabiano, por pedido (ADR-24). Tipo que a integração não tem fica de fora e lança.
const LIMITE_DA_INTEGRACAO: Readonly<Record<Integracao, Readonly<Partial<Record<TipoLimite, Limite>>>>> = Object.freeze({
  awave: Object.freeze({ demanda: Object.freeze({ maximo: 10, mensagem: MENSAGEM_LIMITE_AWAVE }) }),
  construir: Object.freeze({}),
});

const semLimiteDefinido = () => new Error('limite: integração sem limite definido para este tipo');

export function limiteDe(ator: Ator, tipo: TipoLimite): Limite | null {
  switch (ator.tipo) {
    case 'pessoa':
    case 'agente':
      return { maximo: LIMITE_POR_HORA[tipo], mensagem: MENSAGEM_LIMITE[tipo] };
    case 'integracao': {
      // Só chave própria da tabela: integração fora da lista ou chave herdada de objeto ('toString', '__proto__') lança.
      if (!Object.hasOwn(LIMITE_DA_INTEGRACAO, ator.integracao)) throw semLimiteDefinido();
      const daIntegracao = LIMITE_DA_INTEGRACAO[ator.integracao];
      if (!Object.hasOwn(daIntegracao, tipo)) throw semLimiteDefinido();
      const l = daIntegracao[tipo];
      if (!l) throw semLimiteDefinido();
      return l;
    }
    case 'sistema':
      return null;
    default:
      return atorDesconhecido(ator);
  }
}

type Autoria = { autorTipo: AutorDemanda; autorId: string };

// A mesma regra de autoria de quem grava: pessoa pelo id da conta, agente pelo nome do agente, integração pelo nome da
// integração (nunca pelo token nem pelo prefixo).
function autoriaDoLimite(ator: Exclude<Ator, AtorSistema>): Autoria {
  switch (ator.tipo) {
    case 'pessoa':
      return { autorTipo: 'pessoa', autorId: ator.usuarioId };
    case 'agente':
      return { autorTipo: 'agente', autorId: ator.agente };
    case 'integracao':
      return { autorTipo: 'integracao', autorId: ator.integracao };
    default:
      return atorDesconhecido(ator);
  }
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
  const limite = limiteDe(ator, tipo);
  // O ator sistema não cria demanda nem artefato (autorizar nega); não há o que contar.
  if (limite === null || ator.tipo === 'sistema') return;
  const a = autoriaDoLimite(ator);
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`limite:${tipo}:${a.autorTipo}:${a.autorId}`}, 0))`);
  const desde = new Date(relogio.agora().getTime() - JANELA_MS);
  const tabelas: TabelaComAutoria[] = tipo === 'demanda' ? [demanda] : [especificacaoTecnica, parecerRisco, pacoteDecisao];
  let total = 0;
  for (const tabela of tabelas) total += await contar(tx, tabela, a, desde);
  if (total >= limite.maximo) throw new ErroDominio('limite_excedido', limite.mensagem);
}

// 0.4.0 (RF-12, ADR-31, AN-07): limite próprio do /construir para registrar andamento, contado nas linhas de
// andamento_construcao (só gravação conta; o envio no mesmo estado não grava e não chega aqui). Mudar os números é
// decisão de Fabiano, por pedido (ADR-24; P-03 de 12/11/2026). Fora da tabela de limiteDe de propósito: aqui não há
// ramo que saia sem contar (todo ator que não é o construir lança antes da trava, AN-08 c).
export const LIMITE_ANDAMENTO = Object.freeze({
  porDec: Object.freeze({ maximo: 60, mensagem: 'Limite de 60 registros de andamento por hora deste pedido atingido. Tente de novo mais tarde.' }),
  total: Object.freeze({ maximo: 600, mensagem: 'Limite de 600 registros de andamento por hora do /construir atingido. Tente de novo mais tarde.' }),
});

// Uma trava só para as gravações de andamento: o total de 600 só é exato com elas em fila (04, seção 4). Chave literal,
// por parâmetro (G3.6). Última da ordem pedido → demanda → limite (ADR-32).
export const TRAVA_DO_LIMITE_DE_ANDAMENTO = 'limite:andamento:integracao:construir';

const semLimiteDeAndamento = () => new Error('limite: só o /construir registra andamento');

export async function conferirLimiteDeAndamento(tx: Db, ator: Ator, decId: string, relogio: Relogio): Promise<void> {
  switch (ator.tipo) {
    case 'integracao':
      if (ator.integracao !== 'construir') throw semLimiteDeAndamento();
      break;
    case 'pessoa':
    case 'agente':
    case 'sistema':
      throw semLimiteDeAndamento();
    default:
      return atorDesconhecido(ator);
  }
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${TRAVA_DO_LIMITE_DE_ANDAMENTO}, 0))`);
  const desde = new Date(relogio.agora().getTime() - JANELA_MS);
  const [doDec] = await tx
    .select({ n: count() })
    .from(andamentoConstrucao)
    .where(and(eq(andamentoConstrucao.decId, decId), gt(andamentoConstrucao.gravadoEm, desde)));
  if ((doDec?.n ?? 0) >= LIMITE_ANDAMENTO.porDec.maximo) throw new ErroDominio('limite_excedido', LIMITE_ANDAMENTO.porDec.mensagem);
  const [todos] = await tx.select({ n: count() }).from(andamentoConstrucao).where(gt(andamentoConstrucao.gravadoEm, desde));
  if ((todos?.n ?? 0) >= LIMITE_ANDAMENTO.total.maximo) throw new ErroDominio('limite_excedido', LIMITE_ANDAMENTO.total.mensagem);
}
