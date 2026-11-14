// Escrito na 06-T01-testes do DEC-DEM-20261111-0018-v1 (qa-automacao), ao lado de matriz-situacao.test.ts, sem mudar
// nada nele. Cobre, na matriz e em `autorizar`, o que o roteiro da T01 não cobre para `ler_situacao_pedido` (SB-01,
// RF-01, RNF-07), com o olhar de quem tenta abrir a ação nova a outro ator:
//   - o nome `construir` em outro tipo de ator (agente, papel, tipo, sistema) não abre a ação;
//   - integração com nome quase igual (controle, espaço de largura zero, BOM, largura total, Cirílico, String embrulhada);
//   - nome da ação quase igual falha fechado, até para o construir, e `atoresProibidos` dele proíbe todos;
//   - a linha nova é a mesma linha congelada das outras quatro do /construir; mexer nela, ou no protótipo de Object, em
//     tempo de execução não abre a ação a ninguém;
//   - as 24 ações da 0.4.0 continuam na mesma ordem e a nova é a última (nenhuma outra linha muda);
//   - `atoresProibidos` da ação nova, escrito por extenso (não só igual ao de registrar_andamento);
//   - o 403 da ação nova é o de toda negação e não leva a ação, a integração nem o prefixo.
// Testes unitários, sem banco e sem relógio. Dados fictícios. Cada caso monta o próprio ator; o que mexe no protótipo
// desfaz no finally, então a ordem dos casos não importa.
import { describe, expect, it } from 'vitest';
import { ErroDominio, mapearErro } from '../../lib/erros';
import { AGENTES, INTEGRACOES, PAPEIS, type Agente, type Ator, type Integracao } from './ator';
import { MENSAGENS_ACESSO } from './mensagens';
import { ACOES, MATRIZ, atoresProibidos, autorizar, type Acao } from './matriz';

const ACAO = 'ler_situacao_pedido' as const;
const PREFIXO = 'ficticio';
const construir = (): Ator => ({ tipo: 'integracao', integracao: 'construir', prefixoToken: PREFIXO });
const awave = (): Ator => ({ tipo: 'integracao', integracao: 'awave', prefixoToken: PREFIXO });
const pessoa = (papel: (typeof PAPEIS)[number]): Ator => ({ tipo: 'pessoa', usuarioId: 'u-ficticio', nome: 'Pessoa Ficticia', papel });
const SEM_PERMISSAO = expect.objectContaining({ codigo: 'sem_permissao' });
const ch = (c: number): string => String.fromCodePoint(c);

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

// As 24 ações da 0.4.0 (41108ee), na ordem de ACOES, escritas de novo aqui.
const ACOES_DA_040 = [
  'criar_demanda',
  'listar_demandas',
  'ler_demanda',
  'alterar_demanda',
  'registrar_entrada',
  'ler_texto_bruto',
  'ler_historico',
  'criar_especificacao',
  'ler_especificacao',
  'criar_parecer_risco',
  'ler_parecer_risco',
  'criar_pacote_decisao',
  'ler_pacote_decisao',
  'registrar_decisao',
  'gerar_pedido_construcao',
  'ler_configuracao_agentes',
  'alterar_agente',
  'ler_teto',
  'alterar_teto',
  'confirmar_demanda',
  'listar_pedidos_pendentes',
  'entregar_pedido',
  'confirmar_recebimento_pedido',
  'registrar_andamento',
] as const;

describe('SB-01: o nome construir fora do ator de integração não abre ler_situacao_pedido', () => {
  it('agente chamado construir, pessoa com papel construir, tipo construir e sistema com integração são negados', () => {
    const formas = [
      { tipo: 'agente', agente: 'construir', prefixoToken: PREFIXO },
      { tipo: 'agente', agente: 'construir', prefixoToken: null },
      { tipo: 'pessoa', usuarioId: 'u-ficticio', nome: 'Pessoa Ficticia', papel: 'construir' },
      { tipo: 'pessoa', usuarioId: 'u-ficticio', nome: 'Pessoa Ficticia', papel: 'cto', integracao: 'construir' },
      { tipo: 'construir', integracao: 'construir', prefixoToken: PREFIXO },
      { tipo: 'construir' },
      { tipo: 'sistema', integracao: 'construir' },
      { tipo: 'sistema', integracao: 'construir', prefixoToken: PREFIXO, papel: 'cto', agente: 'orquestrador' },
      { integracao: 'construir', prefixoToken: PREFIXO },
    ];
    for (const f of formas) expect(() => autorizar(f as unknown as Ator, ACAO), JSON.stringify(f)).toThrow(SEM_PERMISSAO);
    expect(permite(construir(), ACAO)).toBe(true);
  });
});

describe('SB-01 (e): integração com nome quase igual a construir é negada em ler_situacao_pedido', () => {
  const QUASE: readonly unknown[] = [
    'construir\n',
    '\nconstruir',
    'construir\t',
    `construir${ch(0x200b)}`,
    `${ch(0x200b)}construir`,
    `${ch(0xfeff)}construir`,
    `construir${ch(0x00a0)}`,
    'CONSTRUIR',
    'Construir',
    // largura total
    [...'construir'].map((c) => ch((c.codePointAt(0) ?? 0) + 0xfee0)).join(''),
    // "о" Cirílico (U+043E) no lugar do "o" latino
    `c${ch(0x043e)}nstruir`,
    // "í" composto e decomposto
    'construír',
    `construi${ch(0x0301)}r`,
    'construir\u0000',
    'construir,awave',
    'awave',
    'construi',
    'construirr',
    new String('construir'),
    { valueOf: () => 'construir', toString: () => 'construir' },
    ['construir'],
    Symbol('construir'),
  ];
  it.each(QUASE.map((v, i) => [i, v] as const))('valor %i negado, e a integração exata passa', (_i, valor) => {
    const ator = { tipo: 'integracao', integracao: valor, prefixoToken: PREFIXO } as unknown as Ator;
    expect(() => autorizar(ator, ACAO)).toThrow(SEM_PERMISSAO);
    expect(permite(construir(), ACAO)).toBe(true);
  });
});

describe('o nome da ação quase igual falha fechado, até para o construir', () => {
  const QUASE_ACAO = [
    'Ler_situacao_pedido',
    'LER_SITUACAO_PEDIDO',
    'ler_situacao_pedido ',
    ' ler_situacao_pedido',
    'ler-situacao-pedido',
    'ler_situacao_pedidos',
    'lerSituacaoPedido',
    'ler_situacao',
    'situacao_pedido',
    'ler_situação_pedido',
    `ler_situacao_pedido${ch(0x200b)}`,
  ];
  it('caixa, espaço, hífen, acento, sufixo e pedaço não viram ler_situacao_pedido', () => {
    for (const acao of QUASE_ACAO) expect(permite(construir(), acao as Acao), acao).toBe(false);
    expect(permite(construir(), ACAO)).toBe(true);
  });
  it('atoresProibidos de cada nome quase igual proíbe todos os agentes, papéis e integrações (falha fechada)', () => {
    const todos = [
      ...AGENTES.map((agente) => ({ tipo: 'agente', agente })),
      ...PAPEIS.map((papel) => ({ tipo: 'pessoa', papel })),
      ...INTEGRACOES.map((integracao) => ({ tipo: 'integracao', integracao })),
    ];
    for (const acao of QUASE_ACAO) expect(atoresProibidos(acao as Acao), acao).toEqual(todos);
  });
});

describe('RNF-07: a ação nova entra no fim e nenhuma outra muda de lugar', () => {
  it('as 24 ações da 0.4.0 continuam na mesma ordem e ler_situacao_pedido é a 25ª e última', () => {
    expect(ACOES.slice(0, 24)).toEqual([...ACOES_DA_040]);
    expect(ACOES[24]).toBe(ACAO);
    expect(ACOES.indexOf(ACAO)).toBe(ACOES.lastIndexOf(ACAO));
  });
  it('a ação nova não estava na 0.4.0 e nenhuma das 24 é ação de integração além das seis de antes', () => {
    expect((ACOES_DA_040 as readonly string[]).includes(ACAO)).toBe(false);
    const paresDa040 = ACOES_DA_040.flatMap((a) => MATRIZ[a].integracoes.map((i) => `${a}:${i}`)).sort();
    expect(paresDa040).toEqual([
      'confirmar_recebimento_pedido:construir',
      'criar_demanda:awave',
      'entregar_pedido:construir',
      'ler_demanda:awave',
      'listar_pedidos_pendentes:construir',
      'registrar_andamento:construir',
    ]);
  });
});

describe('a linha de ler_situacao_pedido é a linha congelada do /construir', () => {
  it('é o mesmo objeto das outras quatro do /construir (uma fonte só, SO_CONSTRUIR), e nenhuma linha de leitura', () => {
    for (const outra of ['listar_pedidos_pendentes', 'entregar_pedido', 'confirmar_recebimento_pedido', 'registrar_andamento'] as const)
      expect(MATRIZ[ACAO], outra).toBe(MATRIZ[outra]);
    for (const leitura of ['listar_demandas', 'ler_demanda', 'ler_especificacao', 'ler_parecer_risco', 'ler_pacote_decisao', 'ler_historico'] as const)
      expect(MATRIZ[ACAO] === MATRIZ[leitura], leitura).toBe(false);
  });
  it('a linha, os agentes e as integrações estão congelados', () => {
    const l = MATRIZ[ACAO];
    expect([Object.isFrozen(MATRIZ), Object.isFrozen(l), Object.isFrozen(l.agentes), Object.isFrozen(l.integracoes)]).toEqual([true, true, true, true]);
  });
  it('acrescentar awave, agente ou pessoa, trocar, apagar ou redefinir a linha lança TypeError, e a regra segue a mesma', () => {
    const l = MATRIZ[ACAO] as unknown as { pessoa: unknown; agentes: Agente[]; integracoes: Integracao[] };
    const m = MATRIZ as unknown as Record<string, unknown>;
    expect(() => l.integracoes.push('awave')).toThrow(TypeError);
    expect(() => l.integracoes.unshift('awave')).toThrow(TypeError);
    expect(() => l.integracoes.splice(0, 1, 'awave')).toThrow(TypeError);
    expect(() => l.agentes.push('orquestrador')).toThrow(TypeError);
    expect(() => {
      l.pessoa = 'qualquer';
    }).toThrow(TypeError);
    expect(() => {
      m[ACAO] = MATRIZ.ler_pacote_decisao;
    }).toThrow(TypeError);
    expect(() => {
      delete m[ACAO];
    }).toThrow(TypeError);
    expect(() => Object.defineProperty(MATRIZ, ACAO, { value: MATRIZ.ler_demanda })).toThrow(TypeError);
    expect(() => Object.setPrototypeOf(MATRIZ[ACAO], { pessoa: 'qualquer' })).toThrow(TypeError);
    // A linha é compartilhada: mexer pela registrar_andamento também não pode abrir a situação.
    expect(() => (MATRIZ.registrar_andamento.integracoes as Integracao[]).push('awave')).toThrow(TypeError);

    expect(MATRIZ[ACAO]).toEqual({ pessoa: null, agentes: [], integracoes: ['construir'] });
    expect(() => autorizar(awave(), ACAO)).toThrow(SEM_PERMISSAO);
    for (const a of AGENTES) expect(() => autorizar({ tipo: 'agente', agente: a, prefixoToken: null }, ACAO), a).toThrow(SEM_PERMISSAO);
    for (const p of PAPEIS) expect(() => autorizar(pessoa(p), ACAO), p).toThrow(SEM_PERMISSAO);
    expect(permite(construir(), ACAO)).toBe(true);
  });
  it('uma linha ler_situacao_pedido aberta, ou pessoa, agentes e integracoes postos no protótipo de Object, não mudam a regra', () => {
    const proto = Object.prototype as unknown as Record<string, unknown>;
    const CHAVES = [ACAO, 'pessoa', 'agentes', 'integracoes'] as const;
    proto[ACAO] = { pessoa: 'qualquer', agentes: [...AGENTES], integracoes: [...INTEGRACOES] };
    proto.pessoa = 'qualquer';
    proto.agentes = [...AGENTES];
    proto.integracoes = [...INTEGRACOES];
    try {
      expect(() => autorizar(awave(), ACAO)).toThrow(SEM_PERMISSAO);
      for (const p of PAPEIS) expect(() => autorizar(pessoa(p), ACAO), p).toThrow(SEM_PERMISSAO);
      for (const a of AGENTES) expect(() => autorizar({ tipo: 'agente', agente: a, prefixoToken: PREFIXO }, ACAO), a).toThrow(SEM_PERMISSAO);
      expect(permite(construir(), ACAO)).toBe(true);
    } finally {
      for (const k of CHAVES) delete proto[k];
    }
    expect(CHAVES.filter((k) => k in {})).toEqual([]);
  });
});

describe('atoresProibidos de ler_situacao_pedido, por extenso', () => {
  it('são os quatro agentes, os dois papéis e o awave, nessa ordem; o construir não está na lista', () => {
    expect(atoresProibidos(ACAO)).toEqual([
      { tipo: 'agente', agente: 'orquestrador' },
      { tipo: 'agente', agente: 'insumo_tecnico' },
      { tipo: 'agente', agente: 'risco' },
      { tipo: 'agente', agente: 'consolidacao' },
      { tipo: 'pessoa', papel: 'cto' },
      { tipo: 'pessoa', papel: 'administradora' },
      { tipo: 'integracao', integracao: 'awave' },
    ]);
    expect(atoresProibidos(ACAO).some((x) => x.tipo === 'integracao' && x.integracao === 'construir')).toBe(false);
  });
  it('cada ator da lista é de fato negado por autorizar', () => {
    for (const x of atoresProibidos(ACAO)) {
      const ator: Ator =
        x.tipo === 'agente'
          ? { tipo: 'agente', agente: x.agente, prefixoToken: PREFIXO }
          : x.tipo === 'pessoa'
            ? pessoa(x.papel)
            : { tipo: 'integracao', integracao: x.integracao, prefixoToken: PREFIXO };
      expect(permite(ator, ACAO), JSON.stringify(x)).toBe(false);
    }
  });
});

describe('o 403 de ler_situacao_pedido', () => {
  it('é o corpo de toda negação, para cada ator negado, e igual ao de registrar_andamento', () => {
    const negados: Ator[] = [
      awave(),
      { tipo: 'sistema' },
      ...AGENTES.map((agente): Ator => ({ tipo: 'agente', agente, prefixoToken: PREFIXO })),
      ...AGENTES.map((agente): Ator => ({ tipo: 'agente', agente, prefixoToken: null })),
      ...PAPEIS.map(pessoa),
    ];
    const corpos = new Set(negados.map((a) => JSON.stringify(mapearErro(erroDe(a, ACAO)))));
    expect([...corpos]).toEqual([JSON.stringify({ status: 403, corpo: { erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao } })]);
    expect(JSON.stringify(mapearErro(erroDe(awave(), ACAO)))).toBe(JSON.stringify(mapearErro(erroDe(awave(), 'registrar_andamento'))));
  });
  it('é ErroDominio sem extras, e a message e a pilha não levam a ação, a integração nem o prefixo', () => {
    const e = erroDe({ tipo: 'integracao', integracao: 'awave', prefixoToken: 'Zq9-_xY1' }, ACAO);
    expect(e).toBeInstanceOf(ErroDominio);
    const erro = e as ErroDominio;
    expect(erro.message).toBe('sem_permissao');
    expect(erro.extras).toEqual({});
    const texto = `${erro.message}\n${erro.stack ?? ''}\n${JSON.stringify(mapearErro(erro))}`;
    for (const proibido of [ACAO, 'awave', 'Zq9-_xY1']) expect(texto.includes(proibido), proibido).toBe(false);
  });
  it('a ação permitida ao construir não devolve nada nem muda o ator', () => {
    const ator = construir();
    expect(autorizar(ator, ACAO)).toBeUndefined();
    expect(ator).toEqual(construir());
  });
});
