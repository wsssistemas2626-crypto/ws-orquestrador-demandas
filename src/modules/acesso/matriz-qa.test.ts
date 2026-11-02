// T10, matriz e `autorizar` nos pontos que o roteiro do engenheiro não cobre: o ator agente do worker (sem prefixo de
// token, C-12 fora do HTTP), ator com forma misturada, poluição do protótipo, tentativa de reescrever a matriz em tempo
// de execução, ação desconhecida em `atoresProibidos` (falha fechada) e o erro de negação, que é um só para toda
// combinação e não leva dado do ator nem na `message` do Error. Testes unitários, sem banco e sem relógio.
import { describe, expect, it } from 'vitest';
import { ErroDominio, mapearErro } from '../../lib/erros';
import { AGENTES, PAPEIS, type Agente, type Ator } from './ator';
import { ACOES, MATRIZ, atoresProibidos, autorizar, type Acao } from './matriz';

const cto = { tipo: 'pessoa', usuarioId: 'SENTINELA-ID-cto', nome: 'Pessoa Ficticia', papel: 'cto' } as const;
const adm = { ...cto, usuarioId: 'SENTINELA-ID-adm', papel: 'administradora' } as const;
// O worker age como agente sem token: `prefixoToken` nulo (G5).
const agenteDoWorker = (agente: Agente): Ator => ({ tipo: 'agente', agente, prefixoToken: null });
const sistema = { tipo: 'sistema' } as const;
const SEM_PERMISSAO = expect.objectContaining({ codigo: 'sem_permissao' });

const SO_PESSOA = [
  'alterar_demanda',
  'registrar_entrada',
  'ler_texto_bruto',
  'ler_historico',
  'registrar_decisao',
  'gerar_pedido_construcao',
  'ler_configuracao_agentes',
  'ler_teto',
] as const;
const SO_CTO = ['alterar_agente', 'alterar_teto'] as const;
const CRIACAO_DO_AGENTE: Record<Agente, Acao> = {
  orquestrador: 'criar_demanda',
  insumo_tecnico: 'criar_especificacao',
  risco: 'criar_parecer_risco',
  consolidacao: 'criar_pacote_decisao',
};

const erroDe = (ator: Ator, acao: Acao): unknown => {
  try {
    autorizar(ator, acao);
  } catch (e) {
    return e;
  }
  return undefined;
};

describe('C-12 fora do HTTP: o agente do worker, sem prefixo de token', () => {
  it('não registra decisão, não muda configuração, status, pedido nem lê dado só de pessoa', () => {
    for (const a of AGENTES)
      for (const acao of [...SO_PESSOA, ...SO_CTO])
        expect(() => autorizar(agenteDoWorker(a), acao), `${a} em ${acao}`).toThrow(SEM_PERMISSAO);
  });
  it('cria só o seu artefato, como o agente com token', () => {
    for (const a of AGENTES)
      for (const acao of Object.values(CRIACAO_DO_AGENTE))
        if (acao === CRIACAO_DO_AGENTE[a]) expect(() => autorizar(agenteDoWorker(a), acao), `${a} em ${acao}`).not.toThrow();
        else expect(() => autorizar(agenteDoWorker(a), acao), `${a} em ${acao}`).toThrow(SEM_PERMISSAO);
  });
});

describe('ator com forma misturada', () => {
  it('agente com campo papel cto não ganha ação de cto nem de pessoa', () => {
    const misturado = { tipo: 'agente', agente: 'consolidacao', prefixoToken: 'abcd1234', papel: 'cto' } as unknown as Ator;
    for (const acao of [...SO_PESSOA, ...SO_CTO]) expect(() => autorizar(misturado, acao), acao).toThrow(SEM_PERMISSAO);
  });
  it('administradora com campo agente não vira agente nem cto', () => {
    const misturado = { ...adm, agente: 'consolidacao' } as unknown as Ator;
    for (const acao of SO_CTO) expect(() => autorizar(misturado, acao), acao).toThrow(SEM_PERMISSAO);
  });
  it('sistema com campo papel cto ou agente continua negado em toda ação', () => {
    const comPapel = { tipo: 'sistema', papel: 'cto' } as unknown as Ator;
    const comAgente = { tipo: 'sistema', agente: 'orquestrador' } as unknown as Ator;
    for (const acao of ACOES) {
      expect(() => autorizar(comPapel, acao), acao).toThrow(SEM_PERMISSAO);
      expect(() => autorizar(comAgente, acao), acao).toThrow(SEM_PERMISSAO);
    }
  });
  it('agente com nome em outra caixa, com espaço ou com nome do protótipo é negado', () => {
    for (const nome of ['Risco', 'risco ', 'RISCO', '__proto__', 'toString', 'constructor', ''])
      expect(() => autorizar({ tipo: 'agente', agente: nome as Agente, prefixoToken: null }, 'ler_demanda'), nome).toThrow(
        SEM_PERMISSAO,
      );
  });
  it('papel com espaço, vazio ou do protótipo é negado mesmo em ação de qualquer pessoa', () => {
    for (const papel of ['cto ', ' cto', '', 'toString', '__proto__'])
      expect(() => autorizar({ ...cto, papel: papel as 'cto' }, 'ler_demanda'), papel).toThrow(SEM_PERMISSAO);
  });
  it('tipo de ator em outra caixa é negado', () => {
    expect(() => autorizar({ ...cto, tipo: 'Pessoa' } as unknown as Ator, 'ler_demanda')).toThrow(SEM_PERMISSAO);
    expect(() =>
      autorizar({ tipo: 'Agente', agente: 'risco', prefixoToken: null } as unknown as Ator, 'ler_demanda'),
    ).toThrow(SEM_PERMISSAO);
  });
});

describe('a matriz resiste a mudança em tempo de execução', () => {
  it('linha nova posta no protótipo de Object não abre ação desconhecida', () => {
    const proto = Object.prototype as unknown as Record<string, unknown>;
    proto.acao_injetada = { pessoa: 'qualquer', agentes: [...AGENTES] };
    try {
      expect(() => autorizar(cto, 'acao_injetada' as Acao)).toThrow(SEM_PERMISSAO);
      for (const a of AGENTES) expect(() => autorizar(agenteDoWorker(a), 'acao_injetada' as Acao), a).toThrow(SEM_PERMISSAO);
    } finally {
      delete proto.acao_injetada;
    }
  });
  it('trocar, apagar ou acrescentar linha lança erro, e a regra continua a mesma', () => {
    const m = MATRIZ as unknown as Record<string, unknown>;
    const aberta = { pessoa: 'qualquer', agentes: [...AGENTES] };
    expect(() => {
      m.alterar_teto = aberta;
    }).toThrow(TypeError);
    expect(() => {
      delete m.registrar_decisao;
    }).toThrow(TypeError);
    expect(() => {
      m.acao_nova = aberta;
    }).toThrow(TypeError);
    expect(() => Object.defineProperty(MATRIZ, 'alterar_agente', { value: aberta })).toThrow(TypeError);
    expect(() => autorizar(adm, 'alterar_teto')).toThrow(SEM_PERMISSAO);
    expect(() => autorizar(adm, 'alterar_agente')).toThrow(SEM_PERMISSAO);
    expect(() => autorizar(cto, 'registrar_decisao')).not.toThrow();
    expect(() => autorizar(cto, 'acao_nova' as Acao)).toThrow(SEM_PERMISSAO);
  });
  it('trocar a regra de pessoa de uma linha lança erro, e a administradora segue negada', () => {
    expect(() => {
      (MATRIZ.alterar_teto as unknown as { pessoa: string }).pessoa = 'qualquer';
    }).toThrow(TypeError);
    expect(MATRIZ.alterar_teto.pessoa).toBe('cto');
    expect(() => autorizar(adm, 'alterar_teto')).toThrow(SEM_PERMISSAO);
  });
  it('mexer na lista de leitura compartilhada não abre criação nem leitura de histórico', () => {
    const agentes = MATRIZ.ler_demanda.agentes as Agente[];
    expect(() => agentes.splice(0, agentes.length)).toThrow(TypeError);
    expect(() => (MATRIZ.ler_historico.agentes as Agente[]).push('orquestrador')).toThrow(TypeError);
    for (const a of AGENTES) {
      expect(() => autorizar(agenteDoWorker(a), 'ler_demanda'), a).not.toThrow();
      expect(() => autorizar(agenteDoWorker(a), 'ler_historico'), a).toThrow(SEM_PERMISSAO);
    }
  });
});

describe('atoresProibidos falha fechada', () => {
  it('ação desconhecida proíbe todos os agentes e todos os papéis', () => {
    const todos = [
      ...AGENTES.map((agente) => ({ tipo: 'agente', agente })),
      ...PAPEIS.map((papel) => ({ tipo: 'pessoa', papel })),
    ];
    for (const acao of ['acao_inexistente', 'toString', '__proto__', 'constructor'])
      expect(atoresProibidos(acao as Acao), acao).toEqual(todos);
  });
  it('ações só de pessoa proíbem os quatro agentes e nenhum papel', () => {
    for (const acao of SO_PESSOA)
      expect(atoresProibidos(acao), acao).toEqual(AGENTES.map((agente) => ({ tipo: 'agente', agente })));
  });
});

describe('o erro de negação', () => {
  it('é o mesmo para toda combinação negada, sem dizer o ator nem a ação', () => {
    const corpos = new Set<string>();
    for (const acao of ACOES) {
      for (const a of AGENTES) {
        const e = erroDe(agenteDoWorker(a), acao);
        if (e) corpos.add(JSON.stringify(mapearErro(e)));
      }
      corpos.add(JSON.stringify(mapearErro(erroDe(sistema, acao))));
      const e = erroDe(adm, acao);
      if (e) corpos.add(JSON.stringify(mapearErro(e)));
    }
    corpos.add(JSON.stringify(mapearErro(erroDe(cto, 'acao_inexistente' as Acao))));
    expect([...corpos]).toEqual([
      JSON.stringify({
        status: 403,
        corpo: { erro: 'sem_permissao', mensagem: 'Sua conta não pode fazer esta ação. Se precisar, fale com o CTO.' },
      }),
    ]);
  });
  it('é ErroDominio, sem extras, e a message e a pilha não levam id, nome, papel nem ação', () => {
    const e = erroDe(adm, 'alterar_teto');
    expect(e).toBeInstanceOf(ErroDominio);
    const erro = e as ErroDominio;
    expect(erro.message).toBe('sem_permissao');
    expect(erro.extras).toEqual({});
    const texto = `${erro.message}\n${erro.stack ?? ''}`;
    for (const proibido of ['SENTINELA', 'Pessoa Ficticia', 'administradora', 'alterar_teto']) expect(texto).not.toContain(proibido);
  });
  it('a ação permitida não devolve nada nem muda o ator', () => {
    const ator = { ...cto };
    expect(autorizar(ator, 'registrar_decisao')).toBeUndefined();
    expect(ator).toEqual(cto);
  });
});
