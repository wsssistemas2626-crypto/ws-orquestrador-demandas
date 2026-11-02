// Expurgo diário (RF-24, RNF-08, C-31, C-32; D1, D2 e D7), rodado pelo job retencao.expurgo do worker:
// - texto bruto e origem recebidos antes de `agora - prazo`: ficam nulos, com a data do expurgo; um evento
//   `texto_expurgado` por demanda, com ator sistema e sem o conteúdo apagado;
// - entrada pendente recebida antes de `agora - prazo`: apagada, com o evento `entrada_pendente_expurgada` (sem demanda);
// - sessão vencida há mais de 30 dias (IP e user agent) e verificação vencida: apagadas;
// - `rotina_execucao('retencao.expurgo')` guarda a hora e a soma, para o painel mostrar o último expurgo.
// Tudo numa transação: ou o expurgo inteiro fica, com os eventos e o registro da rotina, ou nada muda. A condição
// `expurgada_em is null` e o DELETE fazem a nova execução não repetir evento (CA-24.4); duas ao mesmo tempo ficam em
// fila pela trava de transação. Os campos estruturados da demanda ficam.
import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import type { Db } from '../../db';
import { entradaBruta, entradaPendente, rotinaExecucao, session, verification } from '../../db/schema';
import { comTransacao } from '../../db/transacao';
import type { Deps } from '../../lib/deps';
import { ErroDominio } from '../../lib/erros';
import { log } from '../../lib/log';
import { registrarEvento } from '../historico/registrar';

export const ROTINA_EXPURGO = 'retencao.expurgo';
// C-31: o mesmo intervalo da configuração (RETENCAO_TEXTO_BRUTO_DIAS). Fora dele, nada é apagado.
export const PRAZO_MINIMO_DIAS = 1;
export const PRAZO_MAXIMO_DIAS = 365;
// C-32, D7: a sessão vale 8 h e fica mais 30 dias depois de vencer.
export const GUARDA_SESSAO_DIAS = 30;

const DIA_MS = 86_400_000;
// Chave da trava de transação do expurgo (pg_advisory_xact_lock). Fixa, sem relação com outra trava do sistema.
const TRAVA_EXPURGO = 731_031;
const SISTEMA = { tipo: 'sistema' } as const;

export type DepsExpurgar = Pick<Deps, 'pool' | 'relogio'>;
export type ResultadoExpurgo = { textos: number; pendentes: number; sessoes: number; verificacoes: number };

export async function expurgar(deps: DepsExpurgar, prazoDias: number): Promise<ResultadoExpurgo> {
  // Um prazo 0 ou negativo apagaria todo texto recebido até agora: confere antes de abrir a transação.
  if (!Number.isInteger(prazoDias) || prazoDias < PRAZO_MINIMO_DIAS || prazoDias > PRAZO_MAXIMO_DIAS) {
    throw new ErroDominio('entrada_invalida', 'O prazo de retenção deve ser um número inteiro de 1 a 365 dias.');
  }
  const r = await comTransacao(deps.pool, async ({ tx }) => {
    // Uma execução por vez: a segunda espera a primeira terminar e já não acha o que ela expurgou. Sem isso, duas
    // execuções travando as mesmas linhas em ordens diferentes poderiam se bloquear.
    await tx.execute(sql`select pg_advisory_xact_lock(${TRAVA_EXPURGO})`);
    const agora = deps.relogio.agora();
    const limiteTexto = new Date(agora.getTime() - prazoDias * DIA_MS);
    const limiteSessao = new Date(agora.getTime() - GUARDA_SESSAO_DIAS * DIA_MS);

    const textos = await tx
      .update(entradaBruta)
      .set({ texto: null, origem: null, expurgadaEm: agora })
      .where(and(isNull(entradaBruta.expurgadaEm), lt(entradaBruta.recebidaEm, limiteTexto)))
      .returning({ demandaId: entradaBruta.demandaId });
    // Ordem fixa dos eventos: o RETURNING não garante a ordem das linhas.
    for (const demandaId of textos.map((t) => t.demandaId).sort()) {
      await registrarEvento(tx, { ator: SISTEMA, demandaId, entidade: 'entrada_bruta', entidadeId: demandaId, acao: 'texto_expurgado' }, deps.relogio);
    }

    const pendentes = await tx.delete(entradaPendente).where(lt(entradaPendente.recebidaEm, limiteTexto)).returning({ id: entradaPendente.id });
    for (const id of pendentes.map((p) => p.id).sort()) {
      await registrarEvento(tx, { ator: SISTEMA, demandaId: null, entidade: 'entrada_pendente', entidadeId: id, acao: 'entrada_pendente_expurgada' }, deps.relogio);
    }

    const sessoes = await tx.delete(session).where(lt(session.expiresAt, limiteSessao)).returning({ id: session.id });
    const verificacoes = await tx.delete(verification).where(lt(verification.expiresAt, agora)).returning({ id: verification.id });

    const resultado = { textos: textos.length, pendentes: pendentes.length, sessoes: sessoes.length, verificacoes: verificacoes.length };
    const quantidade = resultado.textos + resultado.pendentes + resultado.sessoes + resultado.verificacoes;
    await tx
      .insert(rotinaExecucao)
      .values({ rotina: ROTINA_EXPURGO, ultimaExecucaoEm: agora, quantidade })
      .onConflictDoUpdate({ target: rotinaExecucao.rotina, set: { ultimaExecucaoEm: agora, quantidade } });
    return { resultado, quantidade };
  });
  // Só a soma (C-21): nenhum id de demanda, nenhum conteúdo.
  log.info({ evento: 'retencao_expurgo', quantidade: r.quantidade });
  return r.resultado;
}

// Para a tela de agentes e teto (T12 do painel, C-31): a hora e a soma do último expurgo; null se ainda não rodou.
export async function ultimoExpurgo(db: Db): Promise<{ em: Date; quantidade: number } | null> {
  const [l] = await db
    .select({ em: rotinaExecucao.ultimaExecucaoEm, quantidade: rotinaExecucao.quantidade })
    .from(rotinaExecucao)
    .where(eq(rotinaExecucao.rotina, ROTINA_EXPURGO));
  return l ?? null;
}
