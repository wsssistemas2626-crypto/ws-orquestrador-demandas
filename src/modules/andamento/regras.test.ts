// src/modules/andamento/regras.test.ts — AN-04, AN-11, AN-12: as regras puras do registro. Unitário, sem banco.
import { describe, expect, it } from 'vitest';
import type { Status, Tipo } from '../demandas/schemas';
import { decidirPorStatus, lerAndamento, marcoDoEvento, mesmoEstado, mudancaDeMarco, type EstadoDoAndamento } from './regras';
import { paraIntegracao } from './schemas';

const DEC1 = 'DEC-DEM-20261112-0001-v1';
const DEC2 = 'DEC-DEM-20261112-0001-v2';
const E: EstadoDoAndamento = { decId: DEC1, fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, statusConstrucao: 'em_construcao' };
const QUANDO = new Date('2026-11-12T12:00:00Z');
const LINHA = { demandaId: 'DEM-20261112-0001', decId: DEC1, fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, statusConstrucao: 'em_construcao', gravadoEm: QUANDO };

describe('mesmoEstado e mudancaDeMarco', () => {
  it('mesmo estado só com os cinco campos iguais; cada campo diferente quebra', () => {
    expect(mesmoEstado(E, { ...E })).toBe(true);
    expect(mesmoEstado(null, E)).toBe(false);
    for (const d of [{ decId: DEC2 }, { fase: 'testando' }, { tarefasProntas: 10 }, { tarefasTotal: 18 }, { statusConstrucao: 'construido' }] as const)
      expect(mesmoEstado(E, { ...E, ...d }), JSON.stringify(d)).toBe(false);
  });
  it('marco: o primeiro, ou fase, statusConstrucao ou decId diferente; só os números não (A2)', () => {
    expect(mudancaDeMarco(null, E)).toBe(true);
    expect(mudancaDeMarco(E, { ...E, fase: 'testando' })).toBe(true);
    expect(mudancaDeMarco(E, { ...E, statusConstrucao: 'cancelado' })).toBe(true);
    expect(mudancaDeMarco(E, { ...E, decId: DEC2 })).toBe(true);
    expect(mudancaDeMarco(E, { ...E, tarefasProntas: 10, tarefasTotal: 19 })).toBe(false);
  });
  it('CA-06.6: um ciclo de 20 tarefas (seis fases, prontas de 0 a 20, construido no fim) dá no máximo 7 marcos', () => {
    const seq: EstadoDoAndamento[] = [];
    const s = (fase: EstadoDoAndamento['fase'], p: number, sc: EstadoDoAndamento['statusConstrucao'] = 'em_construcao') =>
      seq.push({ decId: DEC1, fase, tarefasProntas: p, tarefasTotal: 20, statusConstrucao: sc });
    s('entendendo_o_pedido', 0);
    s('planejando', 0);
    for (let p = 0; p <= 20; p++) s('construindo', p);
    s('testando', 20);
    s('revisando_e_entregando', 20);
    s('documentando', 20);
    s('documentando', 20, 'construido');
    let marcos = 0;
    let antes: EstadoDoAndamento | null = null;
    for (const e of seq) {
      if (!mesmoEstado(antes, e) && mudancaDeMarco(antes, e)) marcos++;
      antes = e;
    }
    expect(marcos).toBeLessThanOrEqual(7);
  });
  it('marcoDoEvento monta exatamente as quatro chaves', () => {
    const m = marcoDoEvento({ ...E, extra: 'x' } as unknown as EstadoDoAndamento);
    expect(Object.keys(m).sort()).toEqual(['fase', 'statusConstrucao', 'tarefasProntas', 'tarefasTotal']);
  });
});

const STATUS: readonly Status[] = ['nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao', 'aprovada', 'em_construcao', 'devolvida', 'entregue', 'encerrada'];
// A tabela da spec, seção 2.1 (P-02 de Fabiano). null = grava sem mudar; 'recusa' = 409.
const ESPERADO: Record<Status, Record<'em_construcao' | 'construido' | 'cancelado', Status | null | 'recusa'>> = {
  nova: { em_construcao: null, construido: null, cancelado: null },
  em_analise: { em_construcao: null, construido: null, cancelado: null },
  aguardando_informacao: { em_construcao: null, construido: null, cancelado: null },
  pronta_para_decisao: { em_construcao: null, construido: null, cancelado: null },
  aprovada: { em_construcao: 'em_construcao', construido: null, cancelado: null },
  em_construcao: { em_construcao: null, construido: null, cancelado: 'devolvida' },
  devolvida: { em_construcao: null, construido: null, cancelado: null },
  entregue: { em_construcao: 'recusa', construido: null, cancelado: 'recusa' },
  encerrada: { em_construcao: 'recusa', construido: 'recusa', cancelado: null },
};

describe('decidirPorStatus (AN-04, CA-05.10): 9 status × 3 × tipo', () => {
  for (const tipo of ['melhoria', 'estudo'] as const satisfies readonly Tipo[])
    for (const status of STATUS)
      for (const sc of ['em_construcao', 'construido', 'cancelado'] as const) {
        it(`${tipo} ${status} + ${sc}`, () => {
          let esperado = ESPERADO[status][sc];
          if (tipo === 'estudo' && esperado === 'em_construcao') esperado = null; // estudo só grava
          const d = decidirPorStatus({ status, tipo }, sc);
          if (esperado === 'recusa') expect(d).toEqual({ tipo: 'recusa' });
          else expect(d).toEqual({ tipo: 'grava', para: esperado });
          if (d.tipo === 'grava') expect(['entregue', 'encerrada']).not.toContain(d.para);
        });
      }
  it('status fora da lista lança, sem gravar', () => {
    expect(() => decidirPorStatus({ status: 'arquivada' as Status, tipo: 'melhoria' }, 'em_construcao')).toThrow();
  });
});

describe('lerAndamento e paraIntegracao (AN-12, CA-04.6)', () => {
  it('linha válida vira a vista de seis campos', () => {
    expect(lerAndamento(LINHA)).toEqual({ decId: DEC1, fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, statusConstrucao: 'em_construcao', atualizadoEm: QUANDO });
  });
  it.each([
    ['nulo', null],
    ['fase fora', { ...LINHA, fase: '<img src=x onerror=alert(1)>' }],
    ['status fora', { ...LINHA, statusConstrucao: 'entregue' }],
    ['número em texto', { ...LINHA, tarefasProntas: '9' }],
    ['prontas > total', { ...LINHA, tarefasProntas: 18 }],
    ['acima de 999', { ...LINHA, tarefasProntas: 0, tarefasTotal: 1000 }],
    ['DEC fora do formato', { ...LINHA, decId: 'DEC-x' }],
    ['data que não é Date', { ...LINHA, gravadoEm: '2026-11-12' }],
    ['tudo nulo (left join sem linha)', { decId: null, fase: null, tarefasProntas: null, tarefasTotal: null, statusConstrucao: null, gravadoEm: null }],
  ])('fora do esquema (%s) → null, sem lançar', (_n, l) => {
    expect(lerAndamento(l)).toBeNull();
  });
  it('a vista do Awave tem exatamente quatro chaves, sem decId nem statusConstrucao', () => {
    const v = paraIntegracao({ ...lerAndamento(LINHA)!, extra: 'x' } as never);
    expect(v).toEqual({ fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, atualizadoEm: QUANDO });
    expect(paraIntegracao(null)).toBeNull();
  });
});
