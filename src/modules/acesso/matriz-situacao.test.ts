// src/modules/acesso/matriz-situacao.test.ts — SB-01 e RF-01 (0.4.1): ler_situacao_pedido só do construir, e o
// construir não ganha outra ação. Testes unitários, sem banco.
import { describe, expect, it } from 'vitest';
import { AGENTES, PAPEIS, type Ator, type Integracao } from './ator';
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

describe('SB-01: ler_situacao_pedido', () => {
  it('(a) os pares (ação, integração) montados de MATRIZ são exatamente os seis da 0.4.0 e o novo', () => {
    const pares = new Set(ACOES.flatMap((a) => MATRIZ[a].integracoes.map((i) => `${a}:${i}`)));
    expect(pares).toEqual(
      new Set([
        'criar_demanda:awave',
        'ler_demanda:awave',
        'listar_pedidos_pendentes:construir',
        'entregar_pedido:construir',
        'confirmar_recebimento_pedido:construir',
        'registrar_andamento:construir',
        'ler_situacao_pedido:construir',
      ]),
    );
  });
  it('(b) o construir tem exatamente cinco ações e o awave exatamente duas; a matriz tem 25 ações', () => {
    const de = (i: Integracao) => ACOES.filter((a) => permite(integracao(i), a)).sort();
    expect(de('construir')).toEqual(['confirmar_recebimento_pedido', 'entregar_pedido', 'ler_situacao_pedido', 'listar_pedidos_pendentes', 'registrar_andamento']);
    expect(de('awave')).toEqual(['criar_demanda', 'ler_demanda']);
    expect(ACOES).toHaveLength(25);
  });
  it('a linha é SO_CONSTRUIR (a mesma das outras quatro do /construir): sem pessoa, sem agente, congelada', () => {
    expect(MATRIZ.ler_situacao_pedido).toEqual({ pessoa: null, agentes: [], integracoes: ['construir'] });
    expect(MATRIZ.ler_situacao_pedido).toBe(MATRIZ.registrar_andamento);
    expect(Object.isFrozen(MATRIZ.ler_situacao_pedido.integracoes)).toBe(true);
  });
  it('awave, os quatro agentes (com e sem token), cto, administradora e sistema são negados', () => {
    expect(() => autorizar(integracao('awave'), 'ler_situacao_pedido')).toThrow(SEM_PERMISSAO);
    for (const agente of AGENTES)
      for (const prefixoToken of ['ficticio', null]) expect(() => autorizar({ tipo: 'agente', agente, prefixoToken }, 'ler_situacao_pedido')).toThrow(SEM_PERMISSAO);
    for (const papel of PAPEIS) expect(() => autorizar({ tipo: 'pessoa', usuarioId: 'u-ficticio', nome: 'Pessoa Ficticia', papel }, 'ler_situacao_pedido')).toThrow(SEM_PERMISSAO);
    expect(() => autorizar({ tipo: 'sistema' }, 'ler_situacao_pedido')).toThrow(SEM_PERMISSAO);
    expect(atoresProibidos('ler_situacao_pedido')).toEqual(atoresProibidos('registrar_andamento'));
  });
  it('(e) integração fora da lista ou com nome parecido é negada; o construir passa', () => {
    for (const i of ['jarvis', 'Construir', 'construir ', '', '__proto__', 'toString']) expect(permite(integracao(i), 'ler_situacao_pedido'), i).toBe(false);
    expect(permite(integracao('construir'), 'ler_situacao_pedido')).toBe(true);
  });
  it('o construir continua negado nas leituras de pessoa e de agente (não ganha outra ação)', () => {
    for (const acao of ['ler_demanda', 'ler_pacote_decisao', 'listar_demandas', 'ler_historico', 'gerar_pedido_construcao'] as const)
      expect(permite(integracao('construir'), acao), acao).toBe(false);
  });
});
