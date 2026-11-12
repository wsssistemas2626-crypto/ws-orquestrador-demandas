// src/components/dados-da-confirmacao-qa.test.ts — 06-T17-testes do DEC-DEM-20261111-0016-v1 (qa-automacao). Liga as
// duas regras puras da T17 do jeito que o plano manda a página (T18) ligá-las: `aguardaConfirmacaoDoAwave` é
// `estadoDaConfirmacao(...).tipo === 'aguardando'`. Confere que a seção (03, 5.4) e a Próxima ação (03, 5.5) não
// discordam em nenhuma combinação de origem, status e histórico, e que as duas noções de "status final" do lado da tela
// (STATUS_FINAIS_NA_TELA e a linha 1 da Próxima ação) dão o mesmo resultado (pendências 1 e 2 da 06-T17-tech-lead).
// Funções puras, sem relógio real (datas fixas) e sem ordem entre os testes. Dados só fictícios.
import { describe, expect, it } from 'vitest';
import { ID_SECAO, TEXTOS_DETALHE } from '../app/(painel)/demandas/[id]/detalhe';
import { STATUS, type OrigemDaDemanda, type Status } from '../modules/demandas/schemas';
import { estadoDaConfirmacao, STATUS_FINAIS_NA_TELA, type EventoDaConfirmacao } from './dados-da-confirmacao';
import { proximaAcao, type DadosDasEtapas } from './dados-das-etapas';

const ID = 'DEM-20261111-0021';
const em = new Date('2026-11-11T17:32:00Z');
const confirmou: EventoDaConfirmacao = { acao: 'demanda_confirmada', ocorridoEm: em, ator: { tipo: 'pessoa', nome: 'Ana Ficticia', papel: 'cto' } };
const criou: EventoDaConfirmacao = {
  acao: 'demanda_criada',
  ocorridoEm: new Date('2026-11-11T17:00:00Z'),
  ator: { tipo: 'integracao', integracao: 'awave', prefixo: 'ficticio' },
};

const ORIGENS: readonly OrigemDaDemanda[] = ['pessoa', 'agente', 'awave'];
const HISTORICOS: ReadonlyArray<readonly EventoDaConfirmacao[]> = [[], [criou], [confirmou, criou]];

// A demanda sem versões, como a página lê; a marca vem do estado, como na T18.
function dados(status: Status, aguardaConfirmacaoDoAwave: boolean, agentes: DadosDasEtapas['demanda']['agentesEmAndamento'] = []): DadosDasEtapas {
  return {
    demanda: { id: ID, status, especificacoes: [], pareceresRisco: [], pacotesDecisao: [], agentesEmAndamento: agentes },
    espMaisNova: null,
    decMaisNovo: null,
    historico: [],
    temSecaoDeDuvidas: false,
    aguardaConfirmacaoDoAwave,
  };
}

function ligadas(origem: OrigemDaDemanda, status: Status, historico: readonly EventoDaConfirmacao[], agentes: DadosDasEtapas['demanda']['agentesEmAndamento'] = []) {
  const estado = estadoDaConfirmacao({ origem, status, historico });
  return { estado, acao: proximaAcao(dados(status, estado.tipo === 'aguardando', agentes)) };
}

describe('seção e Próxima ação ligadas como na T18 (03, 5.4 e 5.5)', () => {
  it('a linha 14 aparece se, e só se, a seção está em "aguardando", em toda origem, status e histórico', () => {
    let aguardando = 0;
    for (const origem of ORIGENS)
      for (const status of STATUS)
        for (const historico of HISTORICOS) {
          const { estado, acao } = ligadas(origem, status, historico);
          expect(acao.linha === 14, `${origem}/${status}/${historico.length} eventos`).toBe(estado.tipo === 'aguardando');
          if (estado.tipo === 'aguardando') aguardando += 1;
        }
    // Só a demanda do Awave sem confirmação, nos 7 status que não são finais, com histórico vazio ou só com a criação.
    expect(aguardando).toBe(14);
  });

  it('final sem confirmação na seção é sempre a linha 1 da Próxima ação, com o mesmo status', () => {
    for (const status of STATUS)
      for (const historico of [[], [criou]] as const) {
        const { estado, acao } = ligadas('awave', status, historico);
        if (estado.tipo === 'final_sem_confirmacao') {
          expect(estado.status).toBe(status);
          expect(acao.linha).toBe(1);
        } else {
          expect(acao.linha).toBe(14);
        }
      }
  });

  it('confirmada: a Próxima ação é a de uma demanda de pessoa no mesmo status (a demanda segue o fluxo de qualquer outra)', () => {
    for (const status of STATUS) {
      const { estado, acao } = ligadas('awave', status, [confirmou, criou]);
      expect(estado).toEqual({ tipo: 'confirmada', ator: 'Ana Ficticia (CTO)', em });
      expect(acao).toEqual(ligadas('pessoa', status, []).acao);
      expect(acao.linha).not.toBe(14);
    }
  });

  it('com o agente trabalhando, a linha 2 vence a 14 mesmo com a seção em "aguardando"', () => {
    const { estado, acao } = ligadas('awave', 'nova', [criou], [{ agente: 'insumo_tecnico', status: 'em_andamento' }]);
    expect(estado.tipo).toBe('aguardando');
    expect(acao.linha).toBe(2);
  });

  it('o link da linha 14 cai na âncora da seção "Confirmação do Awave" do detalhe', () => {
    const { acao } = ligadas('awave', 'nova', []);
    expect(acao.link?.destino).toEqual({ tipo: 'secao', secao: 'confirmacao' });
    if (acao.link?.destino.tipo !== 'secao') throw new Error('a linha 14 deveria apontar uma seção');
    expect(ID_SECAO[acao.link.destino.secao]).toBe('confirmacao');
    expect(TEXTOS_DETALHE.secoes[acao.link.destino.secao]).toBe('Confirmação do Awave');
  });
});

describe('uma só noção de status final do lado da tela (pendência 1 da 06-T17-tech-lead)', () => {
  it('STATUS_FINAIS_NA_TELA e a linha 1 da Próxima ação concordam em todo status', () => {
    for (const status of STATUS) {
      expect(proximaAcao(dados(status, false)).linha === 1, status).toBe(STATUS_FINAIS_NA_TELA.includes(status));
    }
  });

  it('STATUS_FINAIS_NA_TELA só tem status que existem', () => {
    for (const s of STATUS_FINAIS_NA_TELA) expect(STATUS).toContain(s);
    expect(new Set(STATUS_FINAIS_NA_TELA).size).toBe(STATUS_FINAIS_NA_TELA.length);
  });
});

describe('estadoDaConfirmacao: origem fora da lista', () => {
  it('origem montada à mão (ex.: a integração construir) não ganha seção, nem com demanda_confirmada no histórico', () => {
    for (const origem of ['construir', 'integracao', ''] as const) {
      const forjada = origem as unknown as OrigemDaDemanda;
      for (const historico of HISTORICOS) {
        expect(estadoDaConfirmacao({ origem: forjada, status: 'nova', historico })).toEqual({ tipo: 'nao_se_aplica' });
      }
    }
  });

  it('a regra é estável: chamar duas vezes com a mesma entrada dá o mesmo estado', () => {
    const entrada = { origem: 'awave' as const, status: 'em_analise' as const, historico: [confirmou, criou] };
    expect(estadoDaConfirmacao(entrada)).toEqual(estadoDaConfirmacao(entrada));
  });
});
