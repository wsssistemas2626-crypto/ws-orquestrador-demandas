// Escrito na 06-T02-testes (qa-automacao) do DEC-DEM-20261111-0016-v1. O que os testes do engenheiro deixam aberto no
// IN-02 da T02:
//   - matriz: integração com nome de agente e agente com nome de integração, montados à mão, nunca passam pelo ramo do
//     outro; para cada ação e cada integração, `autorizar` segue só a lista `integracoes` da linha; sistema negado em
//     toda ação; a lista de cada linha é congelada;
//   - D-05: o ator `sistema` recebe exatamente a vista mínima do agente na demanda, na ESP, no RSK e no DEC (o de hoje),
//     e a pessoa recebe o próprio objeto;
//   - a autoria de integração na vista mínima sai chave a chave, `{ tipo, integracao }`, sem nome de pessoa;
//   - tipo de ator desconhecido falha fechado em toda vista, na listagem (antes de ler o banco) e na autoria;
//   - o `construir` recusado nos mesmos ramos que o `awave`.
// Os casos valem também depois da T03 e da T06: nenhum espera "toda ação negada" à integração nem a recusa da vista da
// demanda para integração (a T06 troca essa recusa pela vista de seis chaves).
import { describe, expect, it } from 'vitest';
import { listarDemandasPara, responsavelDe, responsavelMinimo, vistaDaDemandaPara, type DemandaVista } from '../demandas/consultas';
import { autoriaDo } from '../demandas/servico';
import { vistaDaEspecificacaoPara, type EspecificacaoVista } from '../especificacoes/consultas';
import { colunasDoAtorParaTeste } from '../historico/registrar';
import { vistaDoPacotePara, type PacoteDecisaoVista } from '../pacotes-decisao/consultas';
import { vistaDoParecerPara, type ParecerRiscoVista } from '../pareceres-risco/consultas';
import { AGENTES, INTEGRACOES, type Ator, type AtorAgente, type AtorIntegracao, type AtorPessoa, type Integracao } from './ator';
import { ACOES, MATRIZ, autorizar, type Acao } from './matriz';

const SEM_PERMISSAO = expect.objectContaining({ codigo: 'sem_permissao' });
const NOME = 'Pessoa Ficticia Sentinela';
const QUANDO = new Date('2026-11-11T12:00:00Z');

const pessoa: AtorPessoa = { tipo: 'pessoa', usuarioId: 'usuario-ficticio', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const agente: AtorAgente = { tipo: 'agente', agente: 'risco', prefixoToken: 'ficticio' };
const sistema: Ator = { tipo: 'sistema' };
const integracao = (i: Integracao): AtorIntegracao => ({ tipo: 'integracao', integracao: i, prefixoToken: 'ficticio' });
const construir = integracao('construir');
const desconhecido = { tipo: 'robo' } as unknown as Ator;

// Devolve se a ação passou; recusa só por `sem_permissao` (outro erro quebra o teste).
function permite(ator: Ator, acao: Acao): boolean {
  try {
    autorizar(ator, acao);
    return true;
  } catch (e) {
    expect(e).toEqual(SEM_PERMISSAO);
    return false;
  }
}

// Qualquer leitura de propriedade do banco falha o teste: a recusa tem de vir antes de ler.
const bancoIntocado = new Proxy(
  {},
  {
    get() {
      throw new Error('leu o banco');
    },
  },
) as never;

describe('IN-02 na matriz: cada tipo de ator só pelo próprio ramo', () => {
  it('para cada ação e cada integração, autorizar segue só a lista `integracoes` da linha', () => {
    for (const acao of ACOES)
      for (const i of INTEGRACOES) expect(permite(integracao(i), acao), `${i} em ${acao}`).toBe(MATRIZ[acao].integracoes.includes(i));
  });

  it('integração com nome de agente, montada à mão, não herda a linha do agente', () => {
    let pares = 0;
    for (const nome of AGENTES)
      for (const acao of ACOES.filter((a) => MATRIZ[a].agentes.includes(nome))) {
        const falsa = { tipo: 'integracao', integracao: nome, prefixoToken: 'ficticio' } as unknown as Ator;
        expect(permite(falsa, acao), `${nome} como integração em ${acao}`).toBe(false);
        pares++;
      }
    // Sem par conferido, o laço passaria à toa: há ações abertas a cada agente (criar_demanda, leituras).
    expect(pares).toBeGreaterThan(AGENTES.length);
  });

  it('agente com nome de integração, montado à mão, não herda a linha da integração', () => {
    for (const nome of INTEGRACOES)
      for (const acao of ACOES) {
        const falso = { tipo: 'agente', agente: nome, prefixoToken: 'ficticio' } as unknown as Ator;
        expect(permite(falso, acao), `${nome} como agente em ${acao}`).toBe(false);
      }
  });

  it('leitura aberta a todo agente e a toda pessoa continua fechada à integração que não está na linha', () => {
    // listar_demandas fica fora de toda integração também depois da T03 (RF-03).
    expect(MATRIZ.listar_demandas.agentes).toEqual(AGENTES);
    expect(MATRIZ.listar_demandas.pessoa).toBe('qualquer');
    for (const i of INTEGRACOES) expect(permite(integracao(i), 'listar_demandas'), i).toBe(false);
  });

  it('sistema e tipo desconhecido são negados em toda ação', () => {
    for (const acao of ACOES) {
      expect(permite(sistema, acao), `sistema em ${acao}`).toBe(false);
      expect(permite(desconhecido, acao), `robo em ${acao}`).toBe(false);
    }
  });

  it('a lista de integrações de cada linha é congelada', () => {
    for (const acao of ACOES) {
      const lista = MATRIZ[acao].integracoes;
      expect(Object.isFrozen(lista), acao).toBe(true);
      const antes = [...lista];
      expect(() => (lista as Integracao[]).push('awave'), acao).toThrow(TypeError);
      expect([...lista], acao).toEqual(antes);
    }
  });
});

// --- D-05: a vista do sistema é a mínima do agente; a da pessoa é o próprio objeto ---

const demanda: DemandaVista = {
  id: 'DEM-20261111-0001',
  titulo: `Pedido de ${NOME} (fictício)`,
  tipo: 'melhoria',
  status: 'nova',
  solicitanteNome: NOME,
  solicitantePapel: 'outro',
  linhaServicoProvavel: null,
  urgencia: 'media',
  justificativaUrgencia: `Prazo combinado com ${NOME}`,
  contexto: `Contexto citando ${NOME}`,
  descricaoProblema: 'Problema (fictício)',
  impactoPercebido: null,
  anexos: [],
  duvidasEntrada: [`Confirmar com ${NOME}`],
  rascunhoAgente: true,
  responsavel: { tipo: 'integracao', integracao: 'awave' },
  criadaEm: QUANDO,
  atualizadaEm: QUANDO,
  especificacoes: [{ id: 'ESP-DEM-20261111-0001-v1', versao: 1, criadaEm: QUANDO, autor: { tipo: 'pessoa', nome: NOME }, rascunhoAgente: false }],
  pareceresRisco: [{ id: 'RSK-DEM-20261111-0001-v1', versao: 1, criadaEm: QUANDO, autor: { tipo: 'agente', agente: 'risco' }, rascunhoAgente: true }],
  pacotesDecisao: [
    {
      id: 'DEC-DEM-20261111-0001-v1',
      versao: 1,
      criadaEm: QUANDO,
      autor: { tipo: 'pessoa', nome: NOME },
      rascunhoAgente: false,
      statusDecisao: 'pendente',
      desatualizado: false,
      substituido: false,
      substituidoPor: null,
    },
  ],
  agentesEmAndamento: [{ agente: 'insumo_tecnico', status: 'pendente' }],
};

const especificacao: EspecificacaoVista = {
  id: 'ESP-DEM-20261111-0001-v1',
  demandaId: 'DEM-20261111-0001',
  versao: 1,
  descricaoObjetiva: `Objetivo pedido por ${NOME}`,
  situacaoAtual: `Hoje ${NOME} faz à mão`,
  situacaoDesejada: null,
  escopoInclui: [`Tela de ${NOME}`],
  escopoExclui: [],
  sistemasErp: null,
  sistemasEcommerceMarketplace: null,
  sistemasApisTerceiros: null,
  sistemasServicosInternos: null,
  dadosEntidades: null,
  dadosCamposCriticos: null,
  restricoesTecnicas: null,
  duvidasEmAberto: [],
  sistemaAlvo: 'ws-orquestrador-demandas',
  repositorioDestino: null,
  criteriosAceitePreliminares: [`Aceite por ${NOME}`],
  definicaoDePronto: null,
  autor: { tipo: 'pessoa', nome: NOME },
  rascunhoAgente: false,
  criadaEm: QUANDO,
};

const parecer: ParecerRiscoVista = {
  id: 'RSK-DEM-20261111-0001-v1',
  demandaId: 'DEM-20261111-0001',
  versao: 1,
  resumo: `Risco apontado por ${NOME}`,
  riscoTecnicoNivel: 'baixo',
  riscoTecnicoComentario: null,
  riscoOperacionalNivel: 'medio',
  riscoOperacionalComentario: `Depende de ${NOME}`,
  riscoJuridicoNivel: 'baixo',
  riscoJuridicoComentario: null,
  recomendacoesMitigacao: [],
  preCondicoes: [`Aval de ${NOME}`],
  envolverJuridicoOuAdministradoraQuando: null,
  autor: { tipo: 'agente', agente: 'risco' },
  rascunhoAgente: true,
  criadaEm: QUANDO,
};

const pacote: PacoteDecisaoVista = {
  id: 'DEC-DEM-20261111-0001-v1',
  demandaId: 'DEM-20261111-0001',
  versao: 1,
  especificacaoId: 'ESP-DEM-20261111-0001-v1',
  parecerRiscoId: 'RSK-DEM-20261111-0001-v1',
  demandaTipo: 'melhoria',
  demandaTitulo: `Pedido de ${NOME} (fictício)`,
  demandaDescricao: 'Problema (fictício)',
  resumoExecutivo: `Resumo para ${NOME}`,
  opcaoA: { descricao: `Opção de ${NOME}`, vantagens: 'Rápida (fictício)' },
  opcaoB: { descricao: 'Outra opção (fictício)' },
  recomendacao: null,
  nivelAprovacaoRequerido: 'cto',
  autor: { tipo: 'pessoa', nome: NOME },
  rascunhoAgente: false,
  criadaEm: QUANDO,
  statusDecisao: 'aprovada',
  aprovadores: [{ papel: 'cto', nome: NOME, opcao: 'A', registradaEm: QUANDO, referenciaDocumento: 'DOC-FICTICIO-1', dataDocumento: '2026-11-11' }],
  desatualizado: false,
  substituido: false,
  substituidoPor: null,
  decisao: { opcaoEscolhida: 'A', comentarios: `Decidido com ${NOME}`, decididaPor: NOME, decididaEm: QUANDO },
  rascunhosCitados: [],
  especificacaoCitada: { sistemaAlvo: 'ws-orquestrador-demandas', repositorioDestino: null, criteriosAceitePreliminares: [`Aceite por ${NOME}`], definicaoDePronto: null },
  niveisRisco: { tecnico: 'baixo', operacional: 'medio', juridico: 'baixo' },
};

const NOMES = [NOME];

describe('D-05: o sistema recebe a vista mínima do agente, sem mudança', () => {
  it('demanda: a mesma do agente, sem solicitanteNome, anexos nem o nome; a pessoa recebe o próprio objeto', () => {
    const doAgente = vistaDaDemandaPara(agente, demanda);
    const doSistema = vistaDaDemandaPara(sistema, demanda);
    expect(doSistema).toStrictEqual(doAgente);
    expect(doSistema).not.toHaveProperty('solicitanteNome');
    expect(doSistema).not.toHaveProperty('anexos');
    expect(JSON.stringify(doSistema)).not.toContain(NOME);
    expect(vistaDaDemandaPara(pessoa, demanda)).toBe(demanda);
  });

  it('ESP: a mesma do agente, sem o nome; a pessoa recebe o próprio objeto', () => {
    const doSistema = vistaDaEspecificacaoPara(sistema, especificacao, NOMES);
    expect(doSistema).toStrictEqual(vistaDaEspecificacaoPara(agente, especificacao, NOMES));
    expect(JSON.stringify(doSistema)).not.toContain(NOME);
    expect(doSistema.autor).toStrictEqual({ tipo: 'pessoa' });
    expect(vistaDaEspecificacaoPara(pessoa, especificacao, NOMES)).toBe(especificacao);
  });

  it('RSK: a mesma do agente, sem o nome; a pessoa recebe o próprio objeto', () => {
    const doSistema = vistaDoParecerPara(sistema, parecer, NOMES);
    expect(doSistema).toStrictEqual(vistaDoParecerPara(agente, parecer, NOMES));
    expect(JSON.stringify(doSistema)).not.toContain(NOME);
    expect(vistaDoParecerPara(pessoa, parecer, NOMES)).toBe(parecer);
  });

  it('DEC: a mesma do agente, sem nome de aprovador, documento nem quem decidiu; a pessoa recebe o próprio objeto', () => {
    const doSistema = vistaDoPacotePara(sistema, pacote, NOMES);
    expect(doSistema).toStrictEqual(vistaDoPacotePara(agente, pacote, NOMES));
    expect(JSON.stringify(doSistema)).not.toContain(NOME);
    expect(JSON.stringify(doSistema)).not.toContain('DOC-FICTICIO-1');
    expect(doSistema.decisao).not.toHaveProperty('decididaPor');
    expect(vistaDoPacotePara(pessoa, pacote, NOMES)).toBe(pacote);
  });
});

describe('autoria de integração nas vistas mínimas', () => {
  it('a demanda do Awave vista pelo agente identifica a integração, só com tipo e nome', () => {
    const v = vistaDaDemandaPara(agente, demanda);
    expect(v.responsavel).toStrictEqual({ tipo: 'integracao', integracao: 'awave' });
    // As versões de pessoa continuam só pelo tipo, as de agente iguais.
    expect(v.especificacoes[0]!.autor).toStrictEqual({ tipo: 'pessoa' });
    expect(v.pareceresRisco[0]!.autor).toStrictEqual({ tipo: 'agente', agente: 'risco' });
  });

  it('responsavelMinimo monta a integração chave a chave: chave a mais não passa', () => {
    expect(responsavelMinimo({ tipo: 'integracao', integracao: 'awave', nome: NOME } as never)).toStrictEqual({ tipo: 'integracao', integracao: 'awave' });
    expect(responsavelMinimo({ tipo: 'integracao', integracao: 'construir' })).toStrictEqual({ tipo: 'integracao', integracao: 'construir' });
    expect(responsavelMinimo({ tipo: 'pessoa', nome: NOME })).toStrictEqual({ tipo: 'pessoa' });
    expect(() => responsavelMinimo({ tipo: 'robo' } as never)).toThrow('ator desconhecido');
  });

  it('responsavelDe de integração não leva o nome da conta e só aceita a lista', () => {
    expect(responsavelDe('integracao', 'awave', NOME)).toStrictEqual({ tipo: 'integracao', integracao: 'awave' });
    expect(responsavelDe('integracao', 'construir', null)).toStrictEqual({ tipo: 'integracao', integracao: 'construir' });
    for (const id of ['toString', '__proto__', 'constructor', 'Awave', '', 'orquestrador'])
      expect(() => responsavelDe('integracao', id, null), id).toThrow('autoria desconhecida');
    expect(() => responsavelDe('sistema', 'sistema', null)).toThrow('autoria desconhecida');
  });
});

describe('falha fechada: construir e tipo desconhecido', () => {
  it('ESP, RSK e DEC recusam o construir com sem_permissao', () => {
    expect(() => vistaDaEspecificacaoPara(construir, especificacao, NOMES)).toThrow(SEM_PERMISSAO);
    expect(() => vistaDoParecerPara(construir, parecer, NOMES)).toThrow(SEM_PERMISSAO);
    expect(() => vistaDoPacotePara(construir, pacote, NOMES)).toThrow(SEM_PERMISSAO);
  });

  it('tipo de ator desconhecido lança em toda vista, e nunca recebe a vista mínima', () => {
    expect(() => vistaDaDemandaPara(desconhecido, demanda)).toThrow('ator desconhecido');
    expect(() => vistaDaEspecificacaoPara(desconhecido, especificacao, NOMES)).toThrow('ator desconhecido');
    expect(() => vistaDoParecerPara(desconhecido, parecer, NOMES)).toThrow('ator desconhecido');
    expect(() => vistaDoPacotePara(desconhecido, pacote, NOMES)).toThrow('ator desconhecido');
  });

  it('a listagem recusa construir e tipo desconhecido antes de ler o banco', async () => {
    await expect(listarDemandasPara(bancoIntocado, { limit: 20, offset: 0 }, construir)).rejects.toEqual(SEM_PERMISSAO);
    await expect(listarDemandasPara(bancoIntocado, { limit: 20, offset: 0 }, integracao('awave'))).rejects.toEqual(SEM_PERMISSAO);
    await expect(listarDemandasPara(bancoIntocado, { limit: 20, offset: 0 }, desconhecido)).rejects.toThrow('ator desconhecido');
  });

  it('autoria das versões: construir recusado, tipo desconhecido lança; pessoa e agente como antes', () => {
    expect(() => autoriaDo(construir)).toThrow(SEM_PERMISSAO);
    expect(() => autoriaDo(desconhecido)).toThrow('ator desconhecido');
    expect(autoriaDo(pessoa)).toStrictEqual({ autorTipo: 'pessoa', autorId: 'usuario-ficticio' });
    expect(autoriaDo(agente)).toStrictEqual({ autorTipo: 'agente', autorId: 'risco' });
  });

  it('colunas do evento de pessoa, agente e sistema continuam as de antes', () => {
    expect(colunasDoAtorParaTeste(pessoa)).toStrictEqual({ atorTipo: 'pessoa', atorId: 'usuario-ficticio', atorTokenPrefixo: null });
    expect(colunasDoAtorParaTeste(agente)).toStrictEqual({ atorTipo: 'agente', atorId: 'risco', atorTokenPrefixo: 'ficticio' });
    expect(colunasDoAtorParaTeste({ tipo: 'agente', agente: 'risco', prefixoToken: null })).toStrictEqual({ atorTipo: 'agente', atorId: 'risco', atorTokenPrefixo: null });
    expect(colunasDoAtorParaTeste(sistema)).toStrictEqual({ atorTipo: 'sistema', atorId: 'sistema', atorTokenPrefixo: null });
  });
});
