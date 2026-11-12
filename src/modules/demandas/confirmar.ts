// Confirmação por pessoa da demanda aberta pelo Awave (RF-06, D1, D-08, IN-07; P-01: qualquer pessoa com 2FA, sem
// diálogo). Numa transação, sob a trava da linha da demanda: outra origem → 409; já confirmada → sucesso sem gravar
// (idempotente, mesmo depois de a demanda fechar); status final → 409. Senão grava `demanda_confirmada` com a pessoa e,
// na mesma transação, dispara o insumo técnico como na criação (chave `demanda:<id>`). Não muda autoria, rascunho nem
// status (C-11, C-34): "confirmada" é o evento. A trava põe em fila as confirmações simultâneas: a segunda lê o evento
// da primeira e não grava de novo; a chave única da execução é a segunda barreira.
import type { AutorDemanda } from '../../db/schema/demandas';
import { comTransacao, type Transacao } from '../../db/transacao';
import { ErroDominio } from '../../lib/erros';
import type { Ator } from '../acesso/ator';
import { exigirAtorPessoa } from '../acesso/ator-pessoa';
import { autorizar } from '../acesso/matriz';
import { dispararSeLigado } from '../agentes/gatilhos';
import { registrarEvento } from '../historico/registrar';
import { travarDemanda } from '../versoes';
import { jaConfirmada } from './confirmacao';
import type { DepsComFila } from './servico';
import { ehStatusFinal } from './transicoes';

// Textos da 03, seção 9 (a tela acrescenta "Não foi possível concluir: ").
export const MENSAGENS_CONFIRMACAO = Object.freeze({
  outraOrigem: 'Só demanda aberta pelo Awave precisa de confirmação.',
  statusFinal: 'A demanda está em um status final e não pode mais ser confirmada.',
});

// G8 #24: só a autoria da integração awave pede confirmação; a origem vem da autoria, nunca do solicitante (RF-10).
function ehDoAwave(autorTipo: AutorDemanda, autorId: string): boolean {
  switch (autorTipo) {
    case 'pessoa':
    case 'agente':
      return false;
    case 'integracao':
      return autorId === 'awave';
    default: {
      const nunca: never = autorTipo;
      void nunca;
      return false;
    }
  }
}

export async function confirmarDemanda(deps: DepsComFila, ator: Ator, id: string, t?: Transacao): Promise<{ jaConfirmada: boolean }> {
  autorizar(ator, 'confirmar_demanda');
  const pessoa = exigirAtorPessoa(ator);
  const corpo = async (tr: Transacao): Promise<{ jaConfirmada: boolean }> => {
    const d = await travarDemanda(tr.tx, id);
    if (!ehDoAwave(d.autorTipo, d.autorId)) throw new ErroDominio('conflito', MENSAGENS_CONFIRMACAO.outraOrigem);
    if (await jaConfirmada(tr.tx, id)) return { jaConfirmada: true };
    if (ehStatusFinal(d.status)) throw new ErroDominio('conflito', MENSAGENS_CONFIRMACAO.statusFinal);
    // Evento antes do disparo, na mesma transação: o gatilho lê a confirmação que acabou de entrar (IN-06). C-30: só a
    // marca, sem texto livre.
    await registrarEvento(
      tr.tx,
      { ator: pessoa, demandaId: id, entidade: 'demanda', entidadeId: id, acao: 'demanda_confirmada', depois: { confirmada: true } },
      deps.relogio,
    );
    await dispararSeLigado(tr, deps, 'insumo_tecnico', `demanda:${id}`, id);
    return { jaConfirmada: false };
  };
  return t ? corpo(t) : comTransacao(deps.pool, corpo);
}
