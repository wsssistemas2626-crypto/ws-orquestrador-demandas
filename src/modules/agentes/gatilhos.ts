// Gatilhos dos agentes de IA (RF-16, RF-19 CA-19.2, ADR-06). Cada gatilho roda na transação do artefato que o dispara:
// a execução e o job entram ou saem junto com ele. Chaves de entrada (C-22: só o tipo e o id, nunca texto):
// - `entrada:<uuid da pendente>` → orquestrador (T-01);
// - `demanda:<DEM-id>` → insumo técnico, quando a demanda é criada;
// - `esp:<ESP-id>` → risco, quando a ESP não tem dúvida em aberto;
// - `rsk:<RSK-id>` → consolidação, quando a demanda já tem ESP.
// Demanda do Awave ainda não confirmada por pessoa (0.3.0, IN-06): nada é criado, para nenhum agente.
// Agente desligado ou suspenso pelo teto: nada é criado, e a pessoa preenche pelo painel (CA-19.2, CA-18.1). A execução
// confere de novo antes de chamar o provedor (T27): o agente pode ser desligado com o job já na fila (CA-19.4).
import type { Db } from '../../db';
import type { Transacao } from '../../db/transacao';
import type { Deps } from '../../lib/deps';
import type { Relogio } from '../../lib/relogio';
import type { Agente } from '../acesso/ator';
import { aguardaConfirmacao } from '../demandas/confirmacao';
import { obterConfiguracaoAgente } from './configuracao';
import { criarExecucao } from './execucoes';
import { situacaoDoTeto } from './teto';

export type EstadoDoAgente = 'desligado' | 'suspenso' | 'disponivel';

// Ligado e com o gasto do mês abaixo do teto. Preço vigente e chave do provedor são conferidos só na execução: o app não
// lê a chave (C-27), e o interruptor só liga com preço vigente (T23).
export async function estadoDoAgente(db: Db, agente: Agente, relogio: Relogio): Promise<EstadoDoAgente> {
  if (!(await obterConfiguracaoAgente(db, agente)).ligado) return 'desligado';
  if ((await situacaoDoTeto(db, relogio)).suspenso) return 'suspenso';
  return 'disponivel';
}

export async function orquestradorDisponivel(db: Db, relogio: Relogio): Promise<boolean> {
  return (await estadoDoAgente(db, 'orquestrador', relogio)) === 'disponivel';
}

// Erro de montagem, não de regra: quem grava com o agente ligado precisa mandar a fila nas dependências.
export const ERRO_SEM_FILA = 'dispararSeLigado: agente disponível e dependências sem fila';

// Cria a execução (e o job) só com o agente disponível. Devolve true quando criou; false quando o agente está desligado
// ou suspenso, quando a demanda do Awave ainda não foi confirmada por uma pessoa (IN-06, 0.3.0), ou quando a mesma
// entrada já tinha execução (idempotente). A fila só é exigida quando há o que enviar.
export async function dispararSeLigado(
  t: Transacao,
  deps: Pick<Deps, 'relogio'> & Partial<Pick<Deps, 'fila'>>,
  agente: Agente,
  chaveEntrada: string,
  demandaId: string | null,
): Promise<boolean> {
  // IN-06 e G8 #25: antes de tudo, para os quatro agentes. Texto vindo de fora só vai a um modelo de IA depois da
  // confirmação; a confirmação grava o evento antes de chamar aqui, na mesma transação.
  if (demandaId !== null && (await aguardaConfirmacao(t.tx, demandaId))) return false;
  if ((await estadoDoAgente(t.tx, agente, deps.relogio)) !== 'disponivel') return false;
  if (!deps.fila) throw new Error(ERRO_SEM_FILA);
  return (await criarExecucao(t, { fila: deps.fila, relogio: deps.relogio }, { agente, chaveEntrada, demandaId })) !== null;
}
