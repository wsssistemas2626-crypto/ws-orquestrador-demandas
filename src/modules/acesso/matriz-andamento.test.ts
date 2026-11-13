// src/modules/acesso/matriz-andamento.test.ts — AN-01 e RF-01 (0.4.0): registrar_andamento só do construir, e o
// construir não ganha outra ação. Testes unitários, sem banco.
import { describe, expect, it } from 'vitest';
import { AGENTES, INTEGRACOES, PAPEIS, type Ator, type Integracao } from './ator';
import { ACOES, MATRIZ, atoresProibidos, autorizar, type Acao } from './matriz';

const permite = (ator: Ator, acao: Acao) => {
  try {
    autorizar(ator, acao);
    return true;
  } catch {
    return false;
  }
};
const integracao = (i: string): Ator => ({ tipo: 'integracao', integracao: i as Integracao, prefixoToken: 'ficticio' });
const SEM_PERMISSAO = expect.objectContaining({ codigo: 'sem_permissao' });

describe('AN-01: registrar_andamento', () => {
  it('(a) os pares (ação, integração) montados de MATRIZ são exatamente os seis', () => {
    const pares = new Set(ACOES.flatMap((a) => MATRIZ[a].integracoes.map((i) => `${a}:${i}`)));
    expect(pares).toEqual(
      new Set([
        'criar_demanda:awave',
        'ler_demanda:awave',
        'listar_pedidos_pendentes:construir',
        'entregar_pedido:construir',
        'confirmar_recebimento_pedido:construir',
        'registrar_andamento:construir',
      ]),
    );
  });
  it('(b) o construir tem exatamente quatro ações e o awave exatamente duas', () => {
    const de = (i: Integracao) => ACOES.filter((a) => permite(integracao(i), a)).sort();
    expect(de('construir')).toEqual(['confirmar_recebimento_pedido', 'entregar_pedido', 'listar_pedidos_pendentes', 'registrar_andamento']);
    expect(de('awave')).toEqual(['criar_demanda', 'ler_demanda']);
  });
  it('a linha é SO_CONSTRUIR: sem pessoa, sem agente, congelada', () => {
    expect(MATRIZ.registrar_andamento).toEqual({ pessoa: null, agentes: [], integracoes: ['construir'] });
    expect(Object.isFrozen(MATRIZ.registrar_andamento.integracoes)).toBe(true);
  });
  it('(d) awave, os quatro agentes (com e sem token), cto, administradora e sistema são negados', () => {
    expect(() => autorizar(integracao('awave'), 'registrar_andamento')).toThrow(SEM_PERMISSAO);
    for (const agente of AGENTES)
      for (const prefixoToken of ['ficticio', null]) expect(() => autorizar({ tipo: 'agente', agente, prefixoToken }, 'registrar_andamento')).toThrow(SEM_PERMISSAO);
    for (const papel of PAPEIS) expect(() => autorizar({ tipo: 'pessoa', usuarioId: 'u-ficticio', nome: 'Pessoa Ficticia', papel }, 'registrar_andamento')).toThrow(SEM_PERMISSAO);
    expect(() => autorizar({ tipo: 'sistema' }, 'registrar_andamento')).toThrow(SEM_PERMISSAO);
    expect(atoresProibidos('registrar_andamento')).toEqual([
      ...AGENTES.map((agente) => ({ tipo: 'agente', agente })),
      ...PAPEIS.map((papel) => ({ tipo: 'pessoa', papel })),
      { tipo: 'integracao', integracao: 'awave' },
    ]);
  });
  it('(e) integração fora da lista (jarvis, Construir, vazio) é negada; o construir passa', () => {
    for (const i of ['jarvis', 'Construir', 'construir ', '', '__proto__']) expect(permite(integracao(i), 'registrar_andamento'), i).toBe(false);
    expect(permite(integracao('construir'), 'registrar_andamento')).toBe(true);
    expect(INTEGRACOES).toEqual(['awave', 'construir']);
  });
});
