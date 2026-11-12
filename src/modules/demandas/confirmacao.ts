// Confirmação da demanda do Awave (RF-06, IN-06, ADR-25): "confirmada" é a existência do evento `demanda_confirmada` da
// própria demanda, gravado por uma pessoa, sem coluna nem UPDATE (C-34). Lê só `demanda` e `evento`, nunca o esquema do
// pg-boss (D-07). Usada pelo gatilho (dispararSeLigado, para os quatro agentes), pelo worker (passo 3c), pela própria
// confirmação e, desde a 0.3.1 (M-1 da 0019), pelas leituras e gravações de agente e sistema (exigirVisivelPara) e pelas
// listagens deles (condicaoVisivelAoAgente, demandaVisivelAoAgente).
import { and, eq, inArray, not, or, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import type { Db } from '../../db';
import { demanda, evento } from '../../db/schema';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { atorDesconhecido, type Ator } from '../acesso/ator';

// B-3 da 0019: só o evento de pessoa confirma. O de agente, sistema ou integração não conta, venha de onde vier.
const confirmadaPorPessoa = (demandaId: string | AnyPgColumn): SQL =>
  and(eq(evento.acao, 'demanda_confirmada'), eq(evento.entidade, 'demanda'), eq(evento.entidadeId, demandaId), eq(evento.atorTipo, 'pessoa'))!;

export async function jaConfirmada(db: Db, demandaId: string): Promise<boolean> {
  const [l] = await db.select({ id: evento.id }).from(evento).where(confirmadaPorPessoa(demandaId)).limit(1);
  return l !== undefined;
}

// IN-06 e G8 #23: demanda de integração sem a confirmação de uma pessoa não vai a nenhum agente de IA. Demanda que não
// existe: false (a montagem da entrada segue dando "não encontrado"). Autoria fora da lista: true (falha fechada).
export async function aguardaConfirmacao(db: Db, demandaId: string): Promise<boolean> {
  const [d] = await db.select({ autorTipo: demanda.autorTipo }).from(demanda).where(eq(demanda.id, demandaId));
  if (!d) return false;
  switch (d.autorTipo) {
    case 'pessoa':
    case 'agente':
      return false;
    case 'integracao':
      return !(await jaConfirmada(db, demandaId));
    default: {
      const nunca: never = d.autorTipo;
      void nunca;
      return true;
    }
  }
}

// M-1 da 0019 (P3 e P4): o helper único. Para agente e sistema, a demanda que aguarda confirmação (qualquer integração,
// pela falha fechada de aguardaConfirmacao) não existe: o mesmo erro de travarDemanda e obterDemanda para o id
// inexistente. Pessoa vê tudo; a integração tem filtros próprios (matriz e autoria no WHERE). Id inexistente passa, e
// quem chama responde o 404 de sempre.
export async function exigirVisivelPara(db: Db, ator: Ator, demandaId: string): Promise<void> {
  switch (ator.tipo) {
    case 'pessoa':
    case 'integracao':
      return;
    case 'agente':
    case 'sistema':
      if (await aguardaConfirmacao(db, demandaId)) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);
      return;
    default:
      return atorDesconhecido(ator);
  }
}

// As autorias que não pedem confirmação (lista de permissão, como em aguardaConfirmacao).
const AUTORIAS_SEM_CONFIRMACAO = ['pessoa', 'agente'] as const;

// M-1 da 0019: a mesma regra de aguardaConfirmacao em SQL, sobre a linha de `demanda` da consulta (a listagem filtra no
// banco, para o `total` sair certo). O teste confirmacao-0019 confere uma contra a outra. Só valores fixos. M-c da
// 04-revisao: a confirmação de pessoa só abre a demanda de integração; autoria fora da lista nunca é visível, como em
// aguardaConfirmacao (autor-desconhecido-0019).
export function condicaoVisivelAoAgente(): SQL {
  return or(
    inArray(demanda.autorTipo, [...AUTORIAS_SEM_CONFIRMACAO]),
    and(eq(demanda.autorTipo, 'integracao'), sql`exists (select 1 from ${evento} where ${confirmadaPorPessoa(demanda.id)})`),
  )!;
}

// A-1 da 04-revisao: a regra para quem não lê `demanda` na consulta (a listagem de DEC). A linha entra se a demanda dela
// existe e é visível ao agente; sem demanda, não entra (falha fechada).
export function demandaVisivelAoAgente(demandaId: AnyPgColumn): SQL {
  return sql`exists (select 1 from ${demanda} where ${and(eq(demanda.id, demandaId), condicaoVisivelAoAgente())})`;
}

// M-5 da 0019: a execução cuja demanda aguarda confirmação não é reenfileirada pelo batimento (ela espera a confirmação,
// que a reenfileira). Demanda nula ou inexistente não aguarda.
export function semEsperaDeConfirmacao(demandaId: AnyPgColumn): SQL {
  return sql`not exists (select 1 from ${demanda} where ${and(eq(demanda.id, demandaId), not(condicaoVisivelAoAgente()))})`;
}
