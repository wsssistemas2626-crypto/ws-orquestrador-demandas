// Regra de exibição da confirmação da demanda do Awave na T05 (T17 do DEC-DEM-20261111-0016-v1; RF-06 na tela; 03, 5.4 e
// seção 9; D-06), sem HTML: os textos da seção "Confirmação do Awave" e o estado dela. O estado sai só do que a página já
// leu (a origem da autoria, o status e o histórico, do mais novo para o mais antigo): "confirmada" é a existência do
// evento `demanda_confirmada`, como no servidor (ADR-25). A resposta da Server Action não entra aqui: ela não diz se o
// agente de insumo técnico foi acionado (06-T08-tech-lead, parecer 3), e a tela não afirma isso. Quem confirma, e se
// pode, é o servidor (confirmarDemanda); aqui é só a tela. Vai ao navegador (ConfirmarDemanda.tsx): de src/modules/ só
// entram tipos.
import type { OrigemDaDemanda, Status } from '../modules/demandas/schemas';
import type { EventoVisivel } from '../modules/historico/consultas';
import { rotuloAtor } from './rotulos';

// 03, seção 9, por inteiro. `confirmada` recebe a data já formatada (formatarDataHora, na tela) e `finalSem`, o rótulo
// do status (ROTULO_STATUS).
export const TEXTOS_CONFIRMACAO = Object.freeze({
  aguardando: 'Esta demanda foi aberta pelo Awave e ainda não foi confirmada. Até uma pessoa confirmar, nenhum agente de IA trabalha nela.',
  consequencia:
    'Ao confirmar, a demanda segue o fluxo de qualquer outra: se o agente de insumo técnico estiver ligado, ele recebe o título, a descrição e o contexto e começa a especificação técnica.',
  orientacao: 'Leia os dados antes. Se a demanda não deve seguir, não confirme: use Mudar status e escolha Encerrada.',
  botao: 'Confirmar demanda',
  enviando: 'Confirmando…',
  sucesso: 'Demanda confirmada.',
  confirmada: (ator: string, data: string): string => `Confirmada por ${ator} em ${data}.`,
  depois: 'Desde a confirmação, a demanda segue o fluxo de qualquer outra.',
  finalSem: (status: string): string => `Esta demanda foi aberta pelo Awave e não foi confirmada. Ela está em ${status}, um status final: não há confirmação a fazer.`,
});

// Cópia de STATUS_FINAIS (src/modules/demandas/transicoes.ts), que aqui só entraria por valor; o teste confere que as
// duas não se afastam (padrão D-14).
export const STATUS_FINAIS_NA_TELA: readonly Status[] = Object.freeze(['entregue', 'encerrada'] as const);

export type EventoDaConfirmacao = Pick<EventoVisivel, 'acao' | 'ator' | 'ocorridoEm'>;

export type EstadoDaConfirmacao =
  | { tipo: 'nao_se_aplica' }
  | { tipo: 'aguardando' }
  | { tipo: 'confirmada'; ator: string; em: Date }
  | { tipo: 'final_sem_confirmacao'; status: Status };

// 03, 5.4: só a demanda do Awave tem a seção. Confirmada vale em qualquer status (é um fato que já aconteceu); sem
// confirmação, o status final tira o botão. A confirmação mostrada é a primeira: o histórico chega do mais novo para o
// mais antigo (listarHistorico), então é a última da lista. O servidor grava uma só (CA-06.3, IN-07); a regra só
// escolhe de forma estável se houver mais. M-d da 04-revisao da 0019: a mesma regra do servidor (jaConfirmada, B-3): só o
// evento de pessoa confirma; o de agente, sistema ou integração não conta.
export function estadoDaConfirmacao(x: { origem: OrigemDaDemanda; status: Status; historico: readonly EventoDaConfirmacao[] }): EstadoDaConfirmacao {
  switch (x.origem) {
    case 'pessoa':
    case 'agente':
      return { tipo: 'nao_se_aplica' };
    case 'awave': {
      const confirmacao = x.historico.findLast((e) => e.acao === 'demanda_confirmada' && e.ator.tipo === 'pessoa');
      if (confirmacao) return { tipo: 'confirmada', ator: rotuloAtor(confirmacao.ator), em: confirmacao.ocorridoEm };
      if (STATUS_FINAIS_NA_TELA.includes(x.status)) return { tipo: 'final_sem_confirmacao', status: x.status };
      return { tipo: 'aguardando' };
    }
    default: {
      // Origem fora da lista (montada à mão): sem seção, como a demanda de pessoa; quem barra a confirmação é o servidor.
      const nunca: never = x.origem;
      void nunca;
      return { tipo: 'nao_se_aplica' };
    }
  }
}
