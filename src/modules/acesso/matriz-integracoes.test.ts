// src/modules/acesso/matriz-integracoes.test.ts — IN-01: a matriz é fechada por integração (RF-03, T03).
import { describe, expect, it } from 'vitest';
import { INTEGRACOES, type Ator, type Integracao } from './ator';
import { ACOES, MATRIZ, atoresProibidos, autorizar, type Acao } from './matriz';

const integracao = (i: Integracao): Ator => ({ tipo: 'integracao', integracao: i, prefixoToken: 'ficticio' });
const permite = (ator: Ator, acao: Acao) => {
  try {
    autorizar(ator, acao);
    return true;
  } catch {
    return false;
  }
};
const DO_CONSTRUIR = ['listar_pedidos_pendentes', 'entregar_pedido', 'confirmar_recebimento_pedido', 'registrar_andamento', 'ler_situacao_pedido'] as const;

describe('IN-01', () => {
  it('(a) os pares (ação, integração) permitidos são exatamente os sete do RF-03, do RF-01 da 0.4.0 e do RF-01 da 0.4.1', () => {
    const pares = ACOES.flatMap((a) => MATRIZ[a].integracoes.map((i) => `${a}:${i}`)).sort();
    expect(pares).toEqual([
      'confirmar_recebimento_pedido:construir',
      'criar_demanda:awave',
      'entregar_pedido:construir',
      'ler_demanda:awave',
      'ler_situacao_pedido:construir',
      'listar_pedidos_pendentes:construir',
      'registrar_andamento:construir',
    ]);
  });
  it('autorizar segue os pares, para cada integração em cada ação', () => {
    for (const a of ACOES) for (const i of INTEGRACOES) expect(permite(integracao(i), a), `${i} em ${a}`).toBe(MATRIZ[a].integracoes.includes(i));
  });
  it('(b) atoresProibidos: awave fora de criar e ler demanda, construir fora das cinco dele', () => {
    for (const a of ACOES) {
      const proibidas = atoresProibidos(a).flatMap((x) => (x.tipo === 'integracao' ? [x.integracao] : []));
      expect(proibidas.includes('awave'), `awave em ${a}`).toBe(a !== 'criar_demanda' && a !== 'ler_demanda');
      expect(proibidas.includes('construir'), `construir em ${a}`).toBe(!(DO_CONSTRUIR as readonly string[]).includes(a));
    }
  });
  it('as cinco do /construir não têm pessoa nem agente; confirmar_demanda é só de pessoa', () => {
    for (const a of DO_CONSTRUIR) expect(MATRIZ[a]).toMatchObject({ pessoa: null, agentes: [] });
    expect(MATRIZ.confirmar_demanda).toMatchObject({ pessoa: 'qualquer', agentes: [], integracoes: [] });
  });
  it('(d) integração fora da lista é negada em toda ação', () => {
    for (const a of ACOES) expect(permite({ tipo: 'integracao', integracao: 'jarvis' as Integracao, prefixoToken: 'ficticio' }, a), a).toBe(false);
  });
  it('a lista de cada linha é congelada', () => {
    for (const a of ACOES) expect(Object.isFrozen(MATRIZ[a].integracoes), a).toBe(true);
  });
});
