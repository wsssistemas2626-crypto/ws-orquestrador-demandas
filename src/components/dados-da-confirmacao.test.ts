// src/components/dados-da-confirmacao.test.ts — T17 do DEC-DEM-20261111-0016-v1: as regras de exibição da confirmação da
// demanda do Awave (03, 5.4 e seção 9; D-06). O estado sai só da origem, do status e do histórico que a página já lê;
// nada vem da resposta da Server Action (06-T08-tech-lead, parecer 3). Dados só fictícios.
import { describe, expect, it } from 'vitest';
import { ID_SECAO, TEXTOS_DETALHE } from '../app/(painel)/demandas/[id]/detalhe';
import { STATUS } from '../modules/demandas/schemas';
import { STATUS_FINAIS } from '../modules/demandas/transicoes';
import { estadoDaConfirmacao, STATUS_FINAIS_NA_TELA, TEXTOS_CONFIRMACAO, type EventoDaConfirmacao } from './dados-da-confirmacao';
import { ROTULO_STATUS, SELO_AGUARDANDO_CONFIRMACAO } from './rotulos';

const em = new Date('2026-11-11T17:32:00Z');
const confirmou = { acao: 'demanda_confirmada' as const, ocorridoEm: em, ator: { tipo: 'pessoa' as const, nome: 'Ana Ficticia', papel: 'cto' as const } };

describe('estadoDaConfirmacao', () => {
  it('não se aplica a pessoa nem a agente', () => {
    expect(estadoDaConfirmacao({ origem: 'pessoa', status: 'nova', historico: [] })).toEqual({ tipo: 'nao_se_aplica' });
    expect(estadoDaConfirmacao({ origem: 'agente', status: 'nova', historico: [] })).toEqual({ tipo: 'nao_se_aplica' });
  });
  it('Awave sem evento e fora de status final: aguardando', () => {
    expect(estadoDaConfirmacao({ origem: 'awave', status: 'em_analise', historico: [] })).toEqual({ tipo: 'aguardando' });
  });
  it('Awave com o evento: confirmada por quem e quando (o mais antigo, se houver mais de um)', () => {
    expect(estadoDaConfirmacao({ origem: 'awave', status: 'nova', historico: [confirmou] })).toEqual({ tipo: 'confirmada', ator: 'Ana Ficticia (CTO)', em });
  });
  it('Awave em status final sem confirmação', () => {
    expect(estadoDaConfirmacao({ origem: 'awave', status: 'encerrada', historico: [] })).toEqual({ tipo: 'final_sem_confirmacao', status: 'encerrada' });
  });
  it('textos da 03, seção 9', () => {
    expect(TEXTOS_CONFIRMACAO.botao).toBe('Confirmar demanda');
    expect(TEXTOS_CONFIRMACAO.enviando).toBe('Confirmando…');
    expect(TEXTOS_CONFIRMACAO.sucesso).toBe('Demanda confirmada.');
    expect(TEXTOS_CONFIRMACAO.finalSem('Encerrada')).toBe(
      'Esta demanda foi aberta pelo Awave e não foi confirmada. Ela está em Encerrada, um status final: não há confirmação a fazer.',
    );
  });
});

// --- além do trecho do plano (T17): bordas da regra e o resto dos textos da 03 ---

describe('estadoDaConfirmacao: bordas', () => {
  const outra = { acao: 'demanda_confirmada' as const, ocorridoEm: new Date('2026-11-11T18:05:00Z'), ator: { tipo: 'pessoa' as const, nome: 'Bia Ficticia', papel: 'administradora' as const } };
  const criou = { acao: 'demanda_criada' as const, ocorridoEm: new Date('2026-11-11T17:00:00Z'), ator: { tipo: 'integracao' as const, integracao: 'awave' as const, prefixo: 'ficticio' } };
  const mudou = { acao: 'status_alterado' as const, ocorridoEm: new Date('2026-11-11T19:00:00Z'), ator: { tipo: 'pessoa' as const, nome: 'Bia Ficticia', papel: 'administradora' as const } };

  it('histórico do mais novo para o mais antigo: vale a primeira confirmação, a do fim da lista', () => {
    expect(estadoDaConfirmacao({ origem: 'awave', status: 'em_analise', historico: [mudou, outra, confirmou, criou] })).toEqual({
      tipo: 'confirmada',
      ator: 'Ana Ficticia (CTO)',
      em,
    });
  });

  it('confirmada vale também em status final (o fato já aconteceu): sem o texto de "não foi confirmada"', () => {
    for (const status of ['entregue', 'encerrada'] as const) {
      expect(estadoDaConfirmacao({ origem: 'awave', status, historico: [mudou, confirmou, criou] })).toEqual({ tipo: 'confirmada', ator: 'Ana Ficticia (CTO)', em });
    }
  });

  it('só demanda_confirmada conta: criar, mudar status e outros eventos deixam aguardando', () => {
    const outros: EventoDaConfirmacao[] = (['demanda_criada', 'status_alterado', 'campo_alterado', 'agente_ignorado', 'especificacao_criada'] as const).map((acao) => ({
      ...criou,
      acao,
    }));
    expect(estadoDaConfirmacao({ origem: 'awave', status: 'nova', historico: outros })).toEqual({ tipo: 'aguardando' });
  });

  it('final sem confirmação nos dois status finais, com o status de cada um', () => {
    expect(estadoDaConfirmacao({ origem: 'awave', status: 'entregue', historico: [criou] })).toEqual({ tipo: 'final_sem_confirmacao', status: 'entregue' });
    expect(estadoDaConfirmacao({ origem: 'awave', status: 'encerrada', historico: [mudou, criou] })).toEqual({ tipo: 'final_sem_confirmacao', status: 'encerrada' });
  });

  it('aguardando em todo status que não é final', () => {
    for (const status of STATUS.filter((s) => s !== 'entregue' && s !== 'encerrada')) {
      expect(estadoDaConfirmacao({ origem: 'awave', status, historico: [criou] })).toEqual({ tipo: 'aguardando' });
    }
  });

  it('pessoa e agente: não se aplica em todo status, mesmo com um demanda_confirmada no histórico', () => {
    for (const origem of ['pessoa', 'agente'] as const) {
      for (const status of STATUS) expect(estadoDaConfirmacao({ origem, status, historico: [confirmou] })).toEqual({ tipo: 'nao_se_aplica' });
    }
  });

  it('o ator pelo rotuloAtor: pessoa sem papel, conta que não existe mais', () => {
    const semPapel = { ...confirmou, ator: { tipo: 'pessoa' as const, nome: 'Ana Ficticia', papel: null } };
    const semConta = { ...confirmou, ator: { tipo: 'pessoa' as const, nome: null, papel: null } };
    expect(estadoDaConfirmacao({ origem: 'awave', status: 'nova', historico: [semPapel] })).toMatchObject({ tipo: 'confirmada', ator: 'Ana Ficticia' });
    expect(estadoDaConfirmacao({ origem: 'awave', status: 'nova', historico: [semConta] })).toMatchObject({ tipo: 'confirmada', ator: 'Não informado' });
  });

  it('a saída tem só as chaves do estado (nada de id, texto ou depois do evento)', () => {
    const comDepois = { ...confirmou, depois: { confirmada: true, sentinela: 'SENTINELA-DEPOIS' }, entidadeId: 'DEM-20261111-0001' };
    const c = estadoDaConfirmacao({ origem: 'awave', status: 'nova', historico: [comDepois] });
    expect(Object.keys(c).sort()).toEqual(['ator', 'em', 'tipo']);
    expect(JSON.stringify(c)).not.toMatch(/SENTINELA/);
    expect(Object.keys(estadoDaConfirmacao({ origem: 'awave', status: 'encerrada', historico: [] })).sort()).toEqual(['status', 'tipo']);
  });

  it('não altera o histórico recebido (entrada congelada)', () => {
    const historico = Object.freeze([Object.freeze({ ...mudou }), Object.freeze({ ...outra }), Object.freeze({ ...confirmou })]);
    expect(() => estadoDaConfirmacao({ origem: 'awave', status: 'nova', historico })).not.toThrow();
    expect(historico.map((e) => e.ocorridoEm)).toEqual([mudou.ocorridoEm, outra.ocorridoEm, em]);
  });

  it('status finais da tela: cópia de STATUS_FINAIS do servidor (transicoes.ts), conferida aqui', () => {
    expect([...STATUS_FINAIS_NA_TELA].sort()).toEqual([...STATUS_FINAIS].sort());
  });
});

describe('textos da confirmação (03, seção 9, por inteiro)', () => {
  it('seção aguardando: três parágrafos e o botão', () => {
    expect(TEXTOS_CONFIRMACAO.aguardando).toBe(
      'Esta demanda foi aberta pelo Awave e ainda não foi confirmada. Até uma pessoa confirmar, nenhum agente de IA trabalha nela.',
    );
    expect(TEXTOS_CONFIRMACAO.consequencia).toBe(
      'Ao confirmar, a demanda segue o fluxo de qualquer outra: se o agente de insumo técnico estiver ligado, ele recebe o título, a descrição e o contexto e começa a especificação técnica.',
    );
    expect(TEXTOS_CONFIRMACAO.orientacao).toBe('Leia os dados antes. Se a demanda não deve seguir, não confirme: use Mudar status e escolha Encerrada.');
  });

  it('confirmada: quem e quando, e o apoio', () => {
    expect(TEXTOS_CONFIRMACAO.confirmada('Ana Ficticia (CTO)', '11/11/2026 às 14:32')).toBe('Confirmada por Ana Ficticia (CTO) em 11/11/2026 às 14:32.');
    expect(TEXTOS_CONFIRMACAO.depois).toBe('Desde a confirmação, a demanda segue o fluxo de qualquer outra.');
  });

  it('final sem confirmação com o rótulo de cada status final', () => {
    expect(TEXTOS_CONFIRMACAO.finalSem(ROTULO_STATUS.entregue)).toBe(
      'Esta demanda foi aberta pelo Awave e não foi confirmada. Ela está em Entregue, um status final: não há confirmação a fazer.',
    );
  });

  it('as chaves dos textos são as da 03 (nada a mais, nada a menos)', () => {
    expect(Object.keys(TEXTOS_CONFIRMACAO).sort()).toEqual(['aguardando', 'botao', 'confirmada', 'consequencia', 'depois', 'enviando', 'finalSem', 'orientacao', 'sucesso']);
  });

  it('nenhum texto diz que o agente de IA foi acionado (a resposta da Server Action não diz; parecer 3 da 06-T08)', () => {
    const fixos = [TEXTOS_CONFIRMACAO.sucesso, TEXTOS_CONFIRMACAO.depois, TEXTOS_CONFIRMACAO.confirmada('Ana Ficticia (CTO)', '11/11/2026 às 14:32')];
    for (const t of fixos) expect(t).not.toMatch(/acionad|começou|iniciad|está trabalhando/i);
  });

  it('o selo do cabeçalho: âmbar, sem tracejado (03, seção 2)', () => {
    expect(SELO_AGUARDANDO_CONFIRMACAO).toEqual({ texto: 'Aguardando confirmação', cor: 'ambar', tracejado: false });
  });

  it('detalhe da demanda: âncora, título da seção e item "Origem" dos Dados', () => {
    expect(ID_SECAO.confirmacao).toBe('confirmacao');
    expect(TEXTOS_DETALHE.secoes.confirmacao).toBe('Confirmação do Awave');
    expect(TEXTOS_DETALHE.dados.origem).toBe('Origem');
  });

  it('a âncora nova não repete a de outra seção', () => {
    const ids = Object.values(ID_SECAO);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
