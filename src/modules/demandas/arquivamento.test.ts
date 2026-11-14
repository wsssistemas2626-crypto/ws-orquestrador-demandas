// src/modules/demandas/arquivamento.test.ts — T06 do DEC-DEM-20261111-0018-v1 (SB-11 a, ADR-38): a tabela do
// arquivamento, 9 status × 3 estados, com o resultado de cada célula. Nenhuma termina em em_construcao, entregue ou
// devolvida; aprovada só com o vigente atualizado. Teste unitário, sem banco.
import { describe, expect, it } from 'vitest';
import { STATUS, type Status } from './schemas';
import { destinoDoArquivamento, estadoDoVigente, ESTADOS_DO_VIGENTE, type EstadoDoVigente } from './arquivamento';

const ESPERADO: Readonly<Record<Status, Readonly<Record<EstadoDoVigente, Status | null>>>> = {
  nova: { nenhum: 'encerrada', atualizado: 'aprovada', desatualizado: 'em_analise' },
  em_analise: { nenhum: 'encerrada', atualizado: 'aprovada', desatualizado: null },
  aguardando_informacao: { nenhum: 'encerrada', atualizado: 'aprovada', desatualizado: 'em_analise' },
  pronta_para_decisao: { nenhum: 'encerrada', atualizado: 'aprovada', desatualizado: 'em_analise' },
  aprovada: { nenhum: null, atualizado: null, desatualizado: null },
  em_construcao: { nenhum: null, atualizado: null, desatualizado: null },
  devolvida: { nenhum: null, atualizado: null, desatualizado: null },
  entregue: { nenhum: null, atualizado: null, desatualizado: null },
  encerrada: { nenhum: null, atualizado: null, desatualizado: null },
};

describe('destinoDoArquivamento (SB-11 a)', () => {
  it('a tabela cobre os nove status e os três estados', () => {
    expect(Object.keys(ESPERADO).sort()).toEqual([...STATUS].sort());
    expect([...ESTADOS_DO_VIGENTE]).toEqual(['nenhum', 'atualizado', 'desatualizado']);
  });
  it.each(STATUS.flatMap((s) => ESTADOS_DO_VIGENTE.map((e) => [s, e] as const)))('%s com vigente %s', (status, estado) => {
    expect(destinoDoArquivamento(status, estado)).toBe(ESPERADO[status][estado]);
  });
  it('os únicos destinos são encerrada, aprovada, em_analise e null; aprovada só com atualizado', () => {
    const todos = STATUS.flatMap((s) => ESTADOS_DO_VIGENTE.map((e) => [e, destinoDoArquivamento(s, e)] as const));
    expect(new Set(todos.map(([, d]) => d))).toEqual(new Set(['encerrada', 'aprovada', 'em_analise', null]));
    expect(todos.filter(([, d]) => d === 'aprovada').every(([e]) => e === 'atualizado')).toBe(true);
  });
  it('status ou estado fora da lista lança (switch com never)', () => {
    expect(() => destinoDoArquivamento('robo' as Status, 'nenhum')).toThrow();
    expect(() => destinoDoArquivamento('nova', 'meio' as EstadoDoVigente)).toThrow();
  });
  it('estadoDoVigente: null → nenhum; desatualizado → desatualizado; senão atualizado', () => {
    expect(estadoDoVigente(null)).toBe('nenhum');
    expect(estadoDoVigente({ desatualizado: true })).toBe('desatualizado');
    expect(estadoDoVigente({ desatualizado: false })).toBe('atualizado');
  });
});
