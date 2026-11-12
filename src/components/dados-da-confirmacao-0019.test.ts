// DEC-DEM-20261112-0019-v1, 04-correcao, M-d: a tela usa a mesma regra do servidor (B-3 da 0019, jaConfirmada): só o
// `demanda_confirmada` de uma pessoa confirma a demanda do Awave. O evento de agente, sistema ou integração não muda a
// seção nem a Próxima ação. Funções puras, datas fixas, dados fictícios.
import { describe, expect, it } from 'vitest';
import { estadoDaConfirmacao, type EventoDaConfirmacao } from './dados-da-confirmacao';

const em = new Date('2026-11-12T12:00:00Z');
const depois = new Date('2026-11-12T13:00:00Z');
const daPessoa: EventoDaConfirmacao = { acao: 'demanda_confirmada', ocorridoEm: em, ator: { tipo: 'pessoa', nome: 'Ana Ficticia', papel: 'cto' } };
const deOutros: readonly EventoDaConfirmacao[] = [
  { acao: 'demanda_confirmada', ocorridoEm: depois, ator: { tipo: 'agente', agente: 'insumo_tecnico' } },
  { acao: 'demanda_confirmada', ocorridoEm: depois, ator: { tipo: 'sistema' } },
  { acao: 'demanda_confirmada', ocorridoEm: depois, ator: { tipo: 'integracao', integracao: 'awave', prefixo: 'ficticio' } },
  { acao: 'demanda_confirmada', ocorridoEm: depois, ator: { tipo: 'integracao', integracao: null, prefixo: null } },
];

describe('M-d: só a confirmação de pessoa conta na tela', () => {
  it.each(deOutros.map((e) => [e.ator.tipo, e] as const))('demanda_confirmada de %s: a seção continua "aguardando"', (_tipo, e) => {
    expect(estadoDaConfirmacao({ origem: 'awave', status: 'nova', historico: [e] })).toEqual({ tipo: 'aguardando' });
  });

  it('em status final, o evento de outro ator não vira "confirmada": final sem confirmação', () => {
    for (const status of ['entregue', 'encerrada'] as const) {
      expect(estadoDaConfirmacao({ origem: 'awave', status, historico: [...deOutros] })).toEqual({ tipo: 'final_sem_confirmacao', status });
    }
  });

  it('a de outro ator, mais antiga ou mais nova, não toma o lugar da de pessoa', () => {
    // Do mais novo para o mais antigo, como listarHistorico entrega.
    const confirmada = { tipo: 'confirmada', ator: 'Ana Ficticia (CTO)', em };
    expect(estadoDaConfirmacao({ origem: 'awave', status: 'nova', historico: [...deOutros, daPessoa] })).toEqual(confirmada);
    const antigos = deOutros.map((e) => ({ ...e, ocorridoEm: new Date('2026-11-12T11:00:00Z') }));
    expect(estadoDaConfirmacao({ origem: 'awave', status: 'nova', historico: [daPessoa, ...antigos] })).toEqual(confirmada);
  });
});
