// Transições manuais de status da demanda (RF-07, CA-07.1, CA-07.2, CA-07.5): regra pura, sem banco. As automáticas
// (mudarStatusPeloSistema) gravam e são testadas em servico.test.ts, contra o Postgres real.
import { describe, expect, it } from 'vitest';
import { STATUS } from './schemas';
import { conferirTransicaoManual, transicoesManuaisDe } from './transicoes';

const ctx = { tipo: 'melhoria' as const, temPacoteAprovadoAtualizado: false };

describe('transições manuais', () => {
  it.each([
    ['nova', ['em_analise', 'encerrada']],
    ['em_analise', ['aguardando_informacao', 'encerrada']],
    ['aguardando_informacao', ['em_analise', 'encerrada']],
    ['pronta_para_decisao', ['em_analise', 'aprovada', 'encerrada']],
    ['aprovada', ['em_construcao', 'encerrada']],
    ['em_construcao', ['entregue', 'devolvida']],
    ['devolvida', ['em_construcao', 'em_analise']],
    ['entregue', []],
    ['encerrada', []],
  ] as const)('%s → %j', (de, para) => {
    expect(transicoesManuaisDe(de)).toEqual(para);
  });

  it('a tabela cobre os nove status, e nenhum vai para ele mesmo', () => {
    for (const s of STATUS) {
      expect(Array.isArray(transicoesManuaisDe(s))).toBe(true);
      expect(transicoesManuaisDe(s)).not.toContain(s);
    }
  });

  it('a lista devolvida não muda a tabela de quem a recebeu', () => {
    const lista = transicoesManuaisDe('nova') as string[];
    expect(() => lista.push('aprovada')).toThrow();
    expect(transicoesManuaisDe('nova')).toEqual(['em_analise', 'encerrada']);
  });

  it('CA-07.1: pronta_para_decisao → aprovada sem DEC aprovado e atualizado é recusada com motivo', () => {
    expect(conferirTransicaoManual('pronta_para_decisao', 'aprovada', ctx)).toEqual({
      ok: false,
      motivo: 'a demanda não tem pacote de decisão aprovado e atualizado.',
    });
    expect(conferirTransicaoManual('pronta_para_decisao', 'aprovada', { ...ctx, temPacoteAprovadoAtualizado: true })).toEqual({ ok: true });
  });

  it('CA-07.2: estudo não vai para em_construcao, nem a partir de aprovada nem de devolvida', () => {
    const motivo = 'demanda do tipo Estudo não vai para construção.';
    expect(conferirTransicaoManual('aprovada', 'em_construcao', { ...ctx, tipo: 'estudo' })).toEqual({ ok: false, motivo });
    expect(conferirTransicaoManual('devolvida', 'em_construcao', { ...ctx, tipo: 'estudo' })).toEqual({ ok: false, motivo });
    expect(conferirTransicaoManual('aprovada', 'em_construcao', ctx)).toEqual({ ok: true });
    // Estudo pode ser encerrado.
    expect(conferirTransicaoManual('aprovada', 'encerrada', { ...ctx, tipo: 'estudo' })).toEqual({ ok: true });
  });

  it('CA-07.5: entregue não muda; encerrada também é final', () => {
    expect(conferirTransicaoManual('entregue', 'em_analise', ctx)).toEqual({ ok: false, motivo: 'Entregue é um status final. Não há próxima mudança.' });
    expect(conferirTransicaoManual('encerrada', 'nova', ctx)).toEqual({ ok: false, motivo: 'Encerrada é um status final. Não há próxima mudança.' });
  });

  it('transição fora da tabela é recusada com motivo genérico, sem citar dado da demanda', () => {
    const motivo = 'esta mudança de status não é permitida a partir do status atual.';
    expect(conferirTransicaoManual('nova', 'aprovada', { ...ctx, temPacoteAprovadoAtualizado: true })).toEqual({ ok: false, motivo });
    expect(conferirTransicaoManual('nova', 'pronta_para_decisao', ctx)).toEqual({ ok: false, motivo });
    expect(conferirTransicaoManual('em_analise', 'em_construcao', ctx)).toEqual({ ok: false, motivo });
    expect(conferirTransicaoManual('nova', 'nova', ctx)).toEqual({ ok: false, motivo });
  });

  it('toda transição da tabela passa quando as condições valem', () => {
    for (const de of STATUS)
      for (const para of transicoesManuaisDe(de))
        expect(conferirTransicaoManual(de, para, { tipo: 'bug', temPacoteAprovadoAtualizado: true })).toEqual({ ok: true });
  });
});
