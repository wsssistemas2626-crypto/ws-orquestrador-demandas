// Escrito na 06-T03-testes (qa-automacao), ao lado de matriz-integracoes.test.ts, sem mudar nada nele. Cobre, na
// matriz e em `autorizar`, o que o roteiro do engenheiro não cobre para o ator de integração (IN-01, RF-03):
//   - CA-03.6 com valores de borda: caixa, espaço, vazio, nome do protótipo, nome de agente, valor que não é texto;
//   - ator de integração com forma misturada (campo de agente ou de papel) não herda a linha de agente nem de pessoa;
//   - CA-03.3 e CA-03.4 no nível da ação: as três ações do /construir negam cada agente (com token e do worker), cada
//     papel, o awave e o sistema; `confirmar_demanda` é de toda pessoa e de nenhum agente nem integração;
//   - a lista de integrações não muda em tempo de execução (push, troca de linha, protótipo);
//   - o 403 da integração é o mesmo de toda negação e não leva o nome da integração nem o prefixo;
//   - `atoresProibidos` põe as integrações no fim, na ordem de INTEGRACOES (G8 #2).
// Testes unitários, sem banco e sem relógio.
import { describe, expect, it } from 'vitest';
import { ErroDominio, mapearErro } from '../../lib/erros';
import { AGENTES, INTEGRACOES, PAPEIS, type Agente, type Ator, type Integracao } from './ator';
import { MENSAGENS_ACESSO } from './mensagens';
import { ACOES, MATRIZ, atoresProibidos, autorizar, type Acao } from './matriz';

const PREFIXO = 'ficticio';
const integracao = (i: Integracao): Ator => ({ tipo: 'integracao', integracao: i, prefixoToken: PREFIXO });
const pessoa = (papel: (typeof PAPEIS)[number]): Ator => ({ tipo: 'pessoa', usuarioId: 'ID-FICTICIO', nome: 'Pessoa Ficticia', papel });
const agenteComToken = (agente: Agente): Ator => ({ tipo: 'agente', agente, prefixoToken: PREFIXO });
const agenteDoWorker = (agente: Agente): Ator => ({ tipo: 'agente', agente, prefixoToken: null });
const sistema: Ator = { tipo: 'sistema' };
const SEM_PERMISSAO = expect.objectContaining({ codigo: 'sem_permissao' });

const DO_CONSTRUIR = ['listar_pedidos_pendentes', 'entregar_pedido', 'confirmar_recebimento_pedido'] as const;
const DO_AWAVE = ['criar_demanda', 'ler_demanda'] as const;
const PERMITIDAS: Record<Integracao, readonly Acao[]> = { awave: DO_AWAVE, construir: DO_CONSTRUIR };

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

describe('CA-03.6: integração fora da lista, em qualquer forma, é negada em toda ação', () => {
  const VALORES: readonly unknown[] = [
    'jarvis',
    'Awave',
    'AWAVE',
    'awave ',
    ' construir',
    'Construir',
    '',
    '__proto__',
    'toString',
    'constructor',
    'hasOwnProperty',
    ...AGENTES,
    null,
    undefined,
    0,
    ['awave'],
    { toString: () => 'awave' },
  ];
  it.each(VALORES.map((v, i) => [i, v] as const))('valor %i negado nas 23 ações', (_i, valor) => {
    const ator = { tipo: 'integracao', integracao: valor, prefixoToken: PREFIXO } as unknown as Ator;
    for (const acao of ACOES) expect(() => autorizar(ator, acao), acao).toThrow(SEM_PERMISSAO);
  });
  it('tipo "integracao" em outra caixa ou com espaço é negado, mesmo com integração da lista', () => {
    for (const tipo of ['Integracao', 'INTEGRACAO', 'integracao ', 'integração'])
      for (const i of INTEGRACOES)
        for (const acao of PERMITIDAS[i])
          expect(() => autorizar({ tipo, integracao: i, prefixoToken: PREFIXO } as unknown as Ator, acao), `${tipo} ${i} ${acao}`).toThrow(
            SEM_PERMISSAO,
          );
  });
});

describe('ator de integração com forma misturada', () => {
  it('awave com campo de agente orquestrador e papel cto só passa nas duas ações dele', () => {
    const misturado = { tipo: 'integracao', integracao: 'awave', prefixoToken: PREFIXO, agente: 'orquestrador', papel: 'cto' } as unknown as Ator;
    for (const acao of ACOES) expect(permite(misturado, acao), acao).toBe((DO_AWAVE as readonly string[]).includes(acao));
  });
  it('construir com campo de agente e papel cto só passa nas três ações dele', () => {
    const misturado = { tipo: 'integracao', integracao: 'construir', prefixoToken: PREFIXO, agente: 'consolidacao', papel: 'cto' } as unknown as Ator;
    for (const acao of ACOES) expect(permite(misturado, acao), acao).toBe((DO_CONSTRUIR as readonly string[]).includes(acao));
  });
  it('agente com campo integracao não ganha ação de integração; pessoa com campo integracao continua só pessoa', () => {
    for (const a of AGENTES) {
      const agente = { ...agenteComToken(a), integracao: 'construir' } as unknown as Ator;
      for (const acao of DO_CONSTRUIR) expect(() => autorizar(agente, acao), `${a} ${acao}`).toThrow(SEM_PERMISSAO);
    }
    for (const papel of PAPEIS) {
      const p = { ...pessoa(papel), integracao: 'construir' } as unknown as Ator;
      for (const acao of DO_CONSTRUIR) expect(() => autorizar(p, acao), `${papel} ${acao}`).toThrow(SEM_PERMISSAO);
    }
  });
  it('o prefixo do token não muda a decisão: com prefixo vazio ou nulo, a integração da lista segue a mesma linha', () => {
    for (const prefixoToken of ['', null, 'x'.repeat(200)])
      for (const i of INTEGRACOES) {
        const ator = { tipo: 'integracao', integracao: i, prefixoToken } as unknown as Ator;
        for (const acao of ACOES) expect(permite(ator, acao), `${i} ${String(prefixoToken)} ${acao}`).toBe(PERMITIDAS[i].includes(acao));
      }
  });
});

describe('CA-03.3 e CA-03.4 no nível da ação: as três do /construir', () => {
  it.each(DO_CONSTRUIR)('%s nega cada agente (com token e do worker), cada papel, o awave e o sistema', (acao) => {
    for (const a of AGENTES) {
      expect(() => autorizar(agenteComToken(a), acao), `${a} com token`).toThrow(SEM_PERMISSAO);
      expect(() => autorizar(agenteDoWorker(a), acao), `${a} do worker`).toThrow(SEM_PERMISSAO);
    }
    for (const papel of PAPEIS) expect(() => autorizar(pessoa(papel), acao), papel).toThrow(SEM_PERMISSAO);
    expect(() => autorizar(integracao('awave'), acao), 'awave').toThrow(SEM_PERMISSAO);
    expect(() => autorizar(sistema, acao), 'sistema').toThrow(SEM_PERMISSAO);
    expect(() => autorizar(integracao('construir'), acao), 'construir').not.toThrow();
  });
  it('atoresProibidos das três é exatamente: os quatro agentes, todos os papéis e o awave', () => {
    for (const acao of DO_CONSTRUIR)
      expect(atoresProibidos(acao), acao).toEqual([
        ...AGENTES.map((agente) => ({ tipo: 'agente', agente })),
        ...PAPEIS.map((papel) => ({ tipo: 'pessoa', papel })),
        { tipo: 'integracao', integracao: 'awave' },
      ]);
  });
});

describe('confirmar_demanda (RF-06): toda pessoa, nenhum agente, nenhuma integração', () => {
  it('cada papel passa; cada agente, cada integração e o sistema são negados', () => {
    for (const papel of PAPEIS) expect(() => autorizar(pessoa(papel), 'confirmar_demanda'), papel).not.toThrow();
    for (const a of AGENTES) {
      expect(() => autorizar(agenteComToken(a), 'confirmar_demanda'), a).toThrow(SEM_PERMISSAO);
      expect(() => autorizar(agenteDoWorker(a), 'confirmar_demanda'), `${a} do worker`).toThrow(SEM_PERMISSAO);
    }
    for (const i of INTEGRACOES) expect(() => autorizar(integracao(i), 'confirmar_demanda'), i).toThrow(SEM_PERMISSAO);
    expect(() => autorizar(sistema, 'confirmar_demanda')).toThrow(SEM_PERMISSAO);
  });
});

describe('RF-03: abrir as integrações não mudou o dono das duas ações do awave para pessoa ou agente', () => {
  it('criar_demanda continua de toda pessoa e só do orquestrador; ler_demanda, de toda pessoa e dos quatro agentes', () => {
    expect(MATRIZ.criar_demanda).toEqual({ pessoa: 'qualquer', agentes: ['orquestrador'], integracoes: ['awave'] });
    expect(MATRIZ.ler_demanda).toEqual({ pessoa: 'qualquer', agentes: [...AGENTES], integracoes: ['awave'] });
  });
  it('as linhas de leitura dos agentes (listar_demandas e as de ESP, RSK e DEC) não têm integração', () => {
    for (const acao of ACOES)
      if (acao !== 'ler_demanda' && MATRIZ[acao].agentes.length === AGENTES.length)
        expect(MATRIZ[acao].integracoes, acao).toEqual([]);
  });
});

describe('a lista de integrações não muda em tempo de execução', () => {
  it('acrescentar, apagar ou trocar a lista de uma linha lança, e a regra continua a mesma', () => {
    expect(() => (MATRIZ.listar_demandas.integracoes as Integracao[]).push('awave')).toThrow(TypeError);
    expect(() => (MATRIZ.registrar_decisao.integracoes as Integracao[]).push('construir')).toThrow(TypeError);
    expect(() => (MATRIZ.criar_demanda.integracoes as Integracao[]).splice(0, 1)).toThrow(TypeError);
    expect(() => (MATRIZ.entregar_pedido.integracoes as Integracao[]).push('awave')).toThrow(TypeError);
    expect(() => {
      (MATRIZ.ler_historico as unknown as { integracoes: readonly string[] }).integracoes = ['awave'];
    }).toThrow(TypeError);
    expect(() => autorizar(integracao('awave'), 'listar_demandas')).toThrow(SEM_PERMISSAO);
    expect(() => autorizar(integracao('construir'), 'registrar_decisao')).toThrow(SEM_PERMISSAO);
    expect(() => autorizar(integracao('awave'), 'entregar_pedido')).toThrow(SEM_PERMISSAO);
    expect(() => autorizar(integracao('awave'), 'ler_historico')).toThrow(SEM_PERMISSAO);
    expect(() => autorizar(integracao('awave'), 'criar_demanda')).not.toThrow();
  });
  it('linha posta no protótipo de Object, aberta às integrações, não abre ação desconhecida', () => {
    const proto = Object.prototype as unknown as Record<string, unknown>;
    proto.acao_injetada_integracao = { pessoa: null, agentes: [], integracoes: [...INTEGRACOES] };
    try {
      for (const i of INTEGRACOES)
        expect(() => autorizar(integracao(i), 'acao_injetada_integracao' as Acao), i).toThrow(SEM_PERMISSAO);
    } finally {
      delete proto.acao_injetada_integracao;
    }
  });
  it('a lista integracoes posta no protótipo de Object não abre ação a integração', () => {
    const proto = Object.prototype as unknown as Record<string, unknown>;
    proto.integracoes = [...INTEGRACOES];
    try {
      for (const i of INTEGRACOES)
        for (const acao of ACOES) expect(permite(integracao(i), acao), `${i} ${acao}`).toBe(PERMITIDAS[i].includes(acao));
    } finally {
      delete proto.integracoes;
    }
  });
});

describe('CA-03.1: o 403 da integração', () => {
  it('é o mesmo corpo de toda negação, para cada par (ação, integração) negado', () => {
    const corpos = new Set<string>();
    let negados = 0;
    for (const acao of ACOES)
      for (const i of INTEGRACOES) {
        const e = erroDe(integracao(i), acao);
        if (e) {
          negados++;
          corpos.add(JSON.stringify(mapearErro(e)));
        }
      }
    // 23 ações × 2 integrações, menos os cinco pares do RF-03.
    expect(negados).toBe(ACOES.length * INTEGRACOES.length - 5);
    expect([...corpos]).toEqual([
      JSON.stringify({ status: 403, corpo: { erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao } }),
    ]);
  });
  it('é ErroDominio sem extras, e a message e a pilha não levam a integração, o prefixo nem a ação', () => {
    const e = erroDe({ tipo: 'integracao', integracao: 'construir', prefixoToken: 'Zq9-_xY1' }, 'listar_demandas');
    expect(e).toBeInstanceOf(ErroDominio);
    const erro = e as ErroDominio;
    expect(erro.message).toBe('sem_permissao');
    expect(erro.extras).toEqual({});
    const texto = `${erro.message}\n${erro.stack ?? ''}`;
    for (const proibido of ['construir', 'Zq9-_xY1', 'listar_demandas']) expect(texto.includes(proibido), proibido).toBe(false);
  });
  it('a ação permitida não devolve nada nem muda o ator', () => {
    for (const i of INTEGRACOES)
      for (const acao of PERMITIDAS[i]) {
        const ator = integracao(i);
        const copia = { ...ator };
        expect(autorizar(ator, acao)).toBeUndefined();
        expect(ator).toEqual(copia);
      }
  });
});

describe('G8 #2: atoresProibidos põe as integrações no fim, na ordem de INTEGRACOES', () => {
  it('em cada ação, as integrações proibidas são as últimas da lista e seguem a ordem da lista fechada', () => {
    for (const acao of ACOES) {
      const lista = atoresProibidos(acao);
      const esperadas = INTEGRACOES.filter((i) => !MATRIZ[acao].integracoes.includes(i)).map((i) => ({ tipo: 'integracao', integracao: i }));
      expect(lista.slice(lista.length - esperadas.length), acao).toEqual(esperadas);
      expect(lista.slice(0, lista.length - esperadas.length).every((x) => x.tipo !== 'integracao'), acao).toBe(true);
    }
  });
  it('nenhum ator proibido é permitido por autorizar, e nenhum permitido aparece como proibido', () => {
    for (const acao of ACOES)
      for (const i of INTEGRACOES) {
        const proibida = atoresProibidos(acao).some((x) => x.tipo === 'integracao' && x.integracao === i);
        expect(proibida, `${i} em ${acao}`).toBe(!permite(integracao(i), acao));
      }
  });
});
