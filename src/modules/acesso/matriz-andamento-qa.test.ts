// Escrito na 06-T02-testes do DEC-DEM-20261111-0017-v1 (qa-automacao), ao lado de matriz-andamento.test.ts, sem mudar
// nada nele. Cobre, na matriz e em `autorizar`, o que o roteiro da T02 não cobre para `registrar_andamento` (AN-01,
// RF-01, CA-01.6):
//   - o nome `construir` em outro tipo de ator (agente, papel, tipo) não abre a ação;
//   - integração com nome quase igual (quebra de linha, espaço de largura zero, largura total, String embrulhada);
//   - nome da ação quase igual falha fechado, até para o construir;
//   - a linha nova é a mesma linha congelada das outras três do /construir, e mexer nela em tempo de execução lança e
//     não abre a ação a ninguém;
//   - o 403 da ação nova não leva a ação, a integração nem o prefixo.
// Testes unitários, sem banco e sem relógio. Dados fictícios.
import { describe, expect, it } from 'vitest';
import { ErroDominio, mapearErro } from '../../lib/erros';
import { AGENTES, PAPEIS, type Agente, type Ator, type Integracao } from './ator';
import { MENSAGENS_ACESSO } from './mensagens';
import { MATRIZ, autorizar, type Acao } from './matriz';

const ACAO = 'registrar_andamento' as const;
const PREFIXO = 'ficticio';
const construir: Ator = { tipo: 'integracao', integracao: 'construir', prefixoToken: PREFIXO };
const awave: Ator = { tipo: 'integracao', integracao: 'awave', prefixoToken: PREFIXO };
const pessoa = (papel: (typeof PAPEIS)[number]): Ator => ({ tipo: 'pessoa', usuarioId: 'u-ficticio', nome: 'Pessoa Ficticia', papel });
const SEM_PERMISSAO = expect.objectContaining({ codigo: 'sem_permissao' });

const permite = (ator: Ator, acao: Acao): boolean => {
  try {
    autorizar(ator, acao);
    return true;
  } catch {
    return false;
  }
};
const erroDe = (ator: Ator, acao: Acao): unknown => {
  try {
    autorizar(ator, acao);
  } catch (e) {
    return e;
  }
  return undefined;
};

describe('AN-01: o nome construir fora do ator de integração não abre registrar_andamento', () => {
  it('agente chamado construir, pessoa com papel construir e tipo construir são negados', () => {
    const formas = [
      { tipo: 'agente', agente: 'construir', prefixoToken: PREFIXO },
      { tipo: 'agente', agente: 'construir', prefixoToken: null },
      { tipo: 'pessoa', usuarioId: 'u-ficticio', nome: 'Pessoa Ficticia', papel: 'construir' },
      { tipo: 'construir', integracao: 'construir', prefixoToken: PREFIXO },
      { tipo: 'construir' },
      { tipo: 'sistema', integracao: 'construir' },
    ];
    for (const f of formas) expect(() => autorizar(f as unknown as Ator, ACAO), JSON.stringify(f)).toThrow(SEM_PERMISSAO);
  });
});

describe('CA-01.6: integração com nome quase igual a construir é negada em registrar_andamento', () => {
  const QUASE: readonly unknown[] = [
    'construir\n',
    '\nconstruir',
    'construir\t',
    'construir​',
    '​construir',
    '﻿construir',
    'CONSTRUIR',
    'ｃｏｎｓｔｒｕｉｒ',
    'construír',
    'construir\u0000',
    'construir,awave',
    new String('construir'),
    { valueOf: () => 'construir', toString: () => 'construir' },
    ['construir'],
  ];
  it.each(QUASE.map((v, i) => [i, v] as const))('valor %i negado, e a integração exata passa', (_i, valor) => {
    const ator = { tipo: 'integracao', integracao: valor, prefixoToken: PREFIXO } as unknown as Ator;
    expect(() => autorizar(ator, ACAO)).toThrow(SEM_PERMISSAO);
    expect(permite(construir, ACAO)).toBe(true);
  });
});

describe('o nome da ação quase igual falha fechado, até para o construir', () => {
  it('caixa, espaço, hífen e sufixo não viram registrar_andamento', () => {
    for (const acao of ['Registrar_andamento', 'REGISTRAR_ANDAMENTO', 'registrar_andamento ', ' registrar_andamento', 'registrar-andamento', 'registrar_andamentos', 'registrarAndamento', 'andamento'])
      expect(permite(construir, acao as Acao), acao).toBe(false);
    expect(permite(construir, ACAO)).toBe(true);
  });
});

describe('a linha de registrar_andamento é a linha congelada do /construir', () => {
  it('é o mesmo objeto das outras três do /construir (uma fonte só, SO_CONSTRUIR)', () => {
    expect(MATRIZ.registrar_andamento).toBe(MATRIZ.listar_pedidos_pendentes);
    expect(MATRIZ.registrar_andamento).toBe(MATRIZ.entregar_pedido);
    expect(MATRIZ.registrar_andamento).toBe(MATRIZ.confirmar_recebimento_pedido);
  });
  it('a linha, os agentes e as integrações estão congelados', () => {
    const l = MATRIZ.registrar_andamento;
    expect([Object.isFrozen(MATRIZ), Object.isFrozen(l), Object.isFrozen(l.agentes), Object.isFrozen(l.integracoes)]).toEqual([true, true, true, true]);
  });
  it('acrescentar awave, agente ou pessoa, ou trocar a linha, lança TypeError, e a regra segue a mesma', () => {
    const l = MATRIZ.registrar_andamento as unknown as { pessoa: unknown; agentes: Agente[]; integracoes: Integracao[] };
    const m = MATRIZ as unknown as Record<string, unknown>;
    expect(() => l.integracoes.push('awave')).toThrow(TypeError);
    expect(() => l.integracoes.splice(0, 1)).toThrow(TypeError);
    expect(() => l.agentes.push('orquestrador')).toThrow(TypeError);
    expect(() => {
      l.pessoa = 'qualquer';
    }).toThrow(TypeError);
    expect(() => {
      m.registrar_andamento = { pessoa: 'qualquer', agentes: [...AGENTES], integracoes: ['awave', 'construir'] };
    }).toThrow(TypeError);
    expect(() => {
      delete m.registrar_andamento;
    }).toThrow(TypeError);
    // A linha é compartilhada: mexer pela entregar_pedido também não pode abrir o andamento.
    expect(() => (MATRIZ.entregar_pedido.integracoes as Integracao[]).push('awave')).toThrow(TypeError);

    expect(MATRIZ.registrar_andamento).toEqual({ pessoa: null, agentes: [], integracoes: ['construir'] });
    expect(() => autorizar(awave, ACAO)).toThrow(SEM_PERMISSAO);
    for (const a of AGENTES) expect(() => autorizar({ tipo: 'agente', agente: a, prefixoToken: null }, ACAO), a).toThrow(SEM_PERMISSAO);
    for (const p of PAPEIS) expect(() => autorizar(pessoa(p), ACAO), p).toThrow(SEM_PERMISSAO);
    expect(permite(construir, ACAO)).toBe(true);
  });
  it('uma linha registrar_andamento aberta, posta no protótipo de Object, não muda a regra', () => {
    const proto = Object.prototype as unknown as Record<string, unknown>;
    proto.registrar_andamento = { pessoa: 'qualquer', agentes: [...AGENTES], integracoes: ['awave', 'construir'] };
    try {
      expect(() => autorizar(awave, ACAO)).toThrow(SEM_PERMISSAO);
      expect(() => autorizar(pessoa('administradora'), ACAO)).toThrow(SEM_PERMISSAO);
      expect(permite(construir, ACAO)).toBe(true);
    } finally {
      delete proto.registrar_andamento;
    }
  });
});

describe('o 403 de registrar_andamento', () => {
  it('é o corpo de toda negação, para cada ator negado', () => {
    const negados: Ator[] = [
      awave,
      { tipo: 'sistema' },
      ...AGENTES.map((agente): Ator => ({ tipo: 'agente', agente, prefixoToken: PREFIXO })),
      ...PAPEIS.map(pessoa),
    ];
    const corpos = new Set(negados.map((a) => JSON.stringify(mapearErro(erroDe(a, ACAO)))));
    expect([...corpos]).toEqual([JSON.stringify({ status: 403, corpo: { erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao } })]);
  });
  it('é ErroDominio sem extras, e a message e a pilha não levam a ação, a integração nem o prefixo', () => {
    const e = erroDe({ tipo: 'integracao', integracao: 'awave', prefixoToken: 'Zq9-_xY1' }, ACAO);
    expect(e).toBeInstanceOf(ErroDominio);
    const erro = e as ErroDominio;
    expect(erro.message).toBe('sem_permissao');
    expect(erro.extras).toEqual({});
    const texto = `${erro.message}\n${erro.stack ?? ''}`;
    for (const proibido of ['registrar_andamento', 'awave', 'Zq9-_xY1']) expect(texto.includes(proibido), proibido).toBe(false);
  });
  it('a ação permitida ao construir não devolve nada nem muda o ator', () => {
    const ator = { ...construir };
    expect(autorizar(ator, ACAO)).toBeUndefined();
    expect(ator).toEqual(construir);
  });
});
