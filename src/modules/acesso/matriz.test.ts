// C-10 e C-12: a matriz de acesso é dado, e `autorizar` é a única porta. Ela nega o agente e o sistema também fora do
// HTTP (o worker chama a mesma função), e as ações de configuração dos agentes são só de `cto`.
import { describe, expect, it } from 'vitest';
import { mapearErro } from '../../lib/erros';
import { AGENTES, INTEGRACOES, PAPEIS, type Agente, type Ator, type Integracao } from './ator';
import { ACOES, MATRIZ, atoresProibidos, autorizar, type Acao } from './matriz';

const cto = { tipo: 'pessoa', usuarioId: 'u1', nome: 'Pessoa Ficticia', papel: 'cto' } as const;
const adm = { ...cto, usuarioId: 'u2', papel: 'administradora' } as const;
const agente = (a: (typeof AGENTES)[number]) => ({ tipo: 'agente', agente: a, prefixoToken: 'abcd1234' }) as const;
const integracao = (i: Integracao) => ({ tipo: 'integracao', integracao: i, prefixoToken: 'ficticio' }) as const;
const sistema = { tipo: 'sistema' } as const;
// O que atoresProibidos acrescenta no fim da lista (0.3.0, IN-01): as integrações que a linha não tem.
const integracoesProibidas = (...is: Integracao[]) => is.map((i) => ({ tipo: 'integracao', integracao: i }));
const SEM_PERMISSAO = expect.objectContaining({ codigo: 'sem_permissao' });

// A tabela "Matriz (C-10, C-12)" da T10 no plano, escrita de novo aqui para a matriz não poder mudar sem o teste.
const LEITURA = ['listar_demandas', 'ler_demanda', 'ler_especificacao', 'ler_parecer_risco', 'ler_pacote_decisao'] as const;
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
// 0.3.0 (RF-03, IN-01): as três ações do /construir, sem pessoa nem agente; 0.4.0 (RF-01, AN-01): e o andamento;
// 0.4.1 (RF-01, SB-01): e a situação do pedido.
const SO_CONSTRUIR = ['listar_pedidos_pendentes', 'entregar_pedido', 'confirmar_recebimento_pedido', 'registrar_andamento', 'ler_situacao_pedido'] as const;
type LinhaEsperada = { pessoa: 'qualquer' | 'cto' | null; agentes: Agente[]; integracoes: Integracao[] };
const linhas = <A extends Acao>(acoes: readonly A[], l: LinhaEsperada) =>
  Object.fromEntries(acoes.map((a) => [a, l])) as Record<A, LinhaEsperada>;
const ESPERADA: Record<Acao, LinhaEsperada> = {
  criar_demanda: { pessoa: 'qualquer', agentes: ['orquestrador'], integracoes: ['awave'] },
  criar_especificacao: { pessoa: 'qualquer', agentes: ['insumo_tecnico'], integracoes: [] },
  criar_parecer_risco: { pessoa: 'qualquer', agentes: ['risco'], integracoes: [] },
  criar_pacote_decisao: { pessoa: 'qualquer', agentes: ['consolidacao'], integracoes: [] },
  ...linhas(LEITURA, { pessoa: 'qualquer', agentes: [...AGENTES], integracoes: [] }),
  ler_demanda: { pessoa: 'qualquer', agentes: [...AGENTES], integracoes: ['awave'] },
  ...linhas(SO_PESSOA, { pessoa: 'qualquer', agentes: [], integracoes: [] }),
  confirmar_demanda: { pessoa: 'qualquer', agentes: [], integracoes: [] },
  ...linhas(SO_CTO, { pessoa: 'cto', agentes: [], integracoes: [] }),
  ...linhas(SO_CONSTRUIR, { pessoa: null, agentes: [], integracoes: ['construir'] }),
};

const permite = (ator: Ator, acao: Acao) => {
  try {
    autorizar(ator, acao);
    return true;
  } catch {
    return false;
  }
};

describe('autorizar', () => {
  it('toda ação tem linha na matriz', () => {
    for (const a of ACOES) expect(MATRIZ[a], a).toBeDefined();
  });
  it('C-12: registrar_decisao nega os quatro agentes e o sistema', () => {
    for (const a of AGENTES) expect(() => autorizar(agente(a), 'registrar_decisao')).toThrow(SEM_PERMISSAO);
    expect(() => autorizar(sistema, 'registrar_decisao')).toThrow(SEM_PERMISSAO);
    expect(() => autorizar(cto, 'registrar_decisao')).not.toThrow();
  });
  it('C-10: cada agente cria só o seu artefato', () => {
    expect(() => autorizar(agente('risco'), 'criar_especificacao')).toThrow();
    expect(() => autorizar(agente('insumo_tecnico'), 'criar_especificacao')).not.toThrow();
    expect(() => autorizar(agente('consolidacao'), 'criar_parecer_risco')).toThrow();
    expect(() => autorizar(agente('orquestrador'), 'criar_pacote_decisao')).toThrow();
    for (const a of AGENTES)
      for (const acao of ['ler_historico', 'ler_texto_bruto', 'ler_configuracao_agentes', 'ler_teto'] as const)
        expect(() => autorizar(agente(a), acao)).toThrow();
  });
  it('C-12: ligar agente e mudar teto só por cto', () => {
    expect(() => autorizar(adm, 'alterar_teto')).toThrow();
    expect(() => autorizar(adm, 'alterar_agente')).toThrow();
    expect(() => autorizar(cto, 'alterar_teto')).not.toThrow();
    expect(() => autorizar(cto, 'alterar_agente')).not.toThrow();
  });
});

describe('matriz como dado (C-10, C-12)', () => {
  it('as ações são as 25 do plano, sem repetição, e a matriz não tem linha a mais', () => {
    expect(new Set(ACOES).size).toBe(25);
    expect(Object.keys(MATRIZ).sort()).toEqual([...ACOES].sort());
    expect(Object.keys(ESPERADA).sort()).toEqual([...ACOES].sort());
  });
  it('cada linha é a da tabela do plano', () => {
    for (const a of ACOES) {
      expect(MATRIZ[a].pessoa, a).toBe(ESPERADA[a].pessoa);
      expect([...MATRIZ[a].agentes].sort(), a).toEqual([...ESPERADA[a].agentes].sort());
      expect([...MATRIZ[a].integracoes].sort(), a).toEqual([...ESPERADA[a].integracoes].sort());
    }
  });
  it('a matriz não muda em tempo de execução', () => {
    expect(Object.isFrozen(MATRIZ)).toBe(true);
    for (const a of ACOES) {
      expect(Object.isFrozen(MATRIZ[a]), a).toBe(true);
      expect(Object.isFrozen(MATRIZ[a].agentes), a).toBe(true);
    }
    expect(() => {
      (MATRIZ.registrar_decisao.agentes as Agente[]).push('consolidacao');
    }).toThrow();
    expect(permite(agente('consolidacao'), 'registrar_decisao')).toBe(false);
  });
  it('autorizar segue a matriz em cada ação, para cada agente e cada papel', () => {
    for (const acao of ACOES) {
      const linha = ESPERADA[acao];
      for (const a of AGENTES) expect(permite(agente(a), acao), `${a} em ${acao}`).toBe(linha.agentes.includes(a));
      expect(permite(cto, acao), `cto em ${acao}`).toBe(linha.pessoa !== null);
      expect(permite(adm, acao), `administradora em ${acao}`).toBe(linha.pessoa === 'qualquer');
      for (const i of INTEGRACOES) expect(permite(integracao(i), acao), `${i} em ${acao}`).toBe(linha.integracoes.includes(i));
    }
  });
  it('o ator sistema não passa em nenhuma ação', () => {
    for (const acao of ACOES) expect(() => autorizar(sistema, acao), acao).toThrow(SEM_PERMISSAO);
  });
  it('CA-02.2: agente não liga agente, não muda teto, não muda status nem gera pedido', () => {
    for (const a of AGENTES)
      for (const acao of ['alterar_agente', 'alterar_teto', 'alterar_demanda', 'gerar_pedido_construcao'] as const)
        expect(() => autorizar(agente(a), acao), `${a} em ${acao}`).toThrow(SEM_PERMISSAO);
  });
});

describe('autorizar nega o que não conhece', () => {
  it('ação fora da lista', () => {
    expect(() => autorizar(cto, 'apagar_tudo' as Acao)).toThrow(SEM_PERMISSAO);
    expect(() => autorizar(cto, 'toString' as Acao)).toThrow(SEM_PERMISSAO);
    expect(() => autorizar(cto, '__proto__' as Acao)).toThrow(SEM_PERMISSAO);
  });
  it('agente fora da lista', () => {
    expect(() => autorizar({ tipo: 'agente', agente: 'admin' as Agente, prefixoToken: null }, 'ler_demanda')).toThrow(SEM_PERMISSAO);
  });
  it('papel fora da lista, mesmo em ação de qualquer pessoa', () => {
    expect(() => autorizar({ ...cto, papel: 'admin' as 'cto' }, 'ler_demanda')).toThrow(SEM_PERMISSAO);
    expect(() => autorizar({ ...cto, papel: 'CTO' as 'cto' }, 'alterar_teto')).toThrow(SEM_PERMISSAO);
  });
  it('tipo de ator fora da lista', () => {
    expect(() => autorizar({ tipo: 'anonimo' } as unknown as Ator, 'ler_demanda')).toThrow(SEM_PERMISSAO);
  });
});

describe('o erro de autorizar', () => {
  it('vira 403 com a mensagem da 03, sem dado do ator', () => {
    let erro: unknown;
    try {
      autorizar({ ...adm, usuarioId: 'SENTINELA-ID-7f3a', nome: 'Pessoa Ficticia Sentinela' }, 'alterar_teto');
    } catch (e) {
      erro = e;
    }
    const { status, corpo } = mapearErro(erro);
    expect(status).toBe(403);
    expect(corpo).toEqual({ erro: 'sem_permissao', mensagem: 'Sua conta não pode fazer esta ação. Se precisar, fale com o CTO.' });
    expect(JSON.stringify(corpo)).not.toMatch(/SENTINELA|Sentinela|administradora|alterar_teto/);
  });
});

describe('atoresProibidos', () => {
  it('registrar_decisao: os quatro agentes, nenhuma pessoa, as duas integrações', () => {
    expect(atoresProibidos('registrar_decisao')).toEqual([
      ...AGENTES.map((a) => ({ tipo: 'agente', agente: a })),
      ...integracoesProibidas('awave', 'construir'),
    ]);
  });
  it('alterar_teto e alterar_agente: os quatro agentes, a administradora e as duas integrações', () => {
    for (const acao of SO_CTO)
      expect(atoresProibidos(acao)).toEqual([
        ...AGENTES.map((a) => ({ tipo: 'agente', agente: a })),
        { tipo: 'pessoa', papel: 'administradora' },
        ...integracoesProibidas('awave', 'construir'),
      ]);
  });
  it('criar_especificacao: os agentes que não são o insumo_tecnico e as duas integrações', () => {
    expect(atoresProibidos('criar_especificacao')).toEqual([
      ...AGENTES.filter((a) => a !== 'insumo_tecnico').map((a) => ({ tipo: 'agente', agente: a })),
      ...integracoesProibidas('awave', 'construir'),
    ]);
  });
  it('leitura de demanda, ESP, RSK e DEC: nenhum agente nem pessoa; só as integrações fora da linha', () => {
    for (const acao of LEITURA)
      expect(atoresProibidos(acao), acao).toEqual(
        acao === 'ler_demanda' ? integracoesProibidas('construir') : integracoesProibidas('awave', 'construir'),
      );
  });
  it('cada ator proibido é de fato negado, e cada um fora da lista passa', () => {
    for (const acao of ACOES) {
      const proibidos = atoresProibidos(acao);
      for (const a of AGENTES) {
        const proibido = proibidos.some((p) => p.tipo === 'agente' && p.agente === a);
        expect(permite(agente(a), acao), `${a} em ${acao}`).toBe(!proibido);
      }
      for (const papel of PAPEIS) {
        const proibido = proibidos.some((p) => p.tipo === 'pessoa' && p.papel === papel);
        expect(permite({ ...cto, papel }, acao), `${papel} em ${acao}`).toBe(!proibido);
      }
      for (const i of INTEGRACOES) {
        const proibido = proibidos.some((p) => p.tipo === 'integracao' && p.integracao === i);
        expect(permite(integracao(i), acao), `${i} em ${acao}`).toBe(!proibido);
      }
    }
  });
});
