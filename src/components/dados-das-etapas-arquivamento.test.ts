// T13 do DEC-DEM-20261111-0018-v1 (7.2, itens 3 e 4; D-14; 03, 6.2): a barra de etapas e a Próxima ação da T05 com o DEC
// mais novo arquivado. Com um aprovado vigente que a página leu (decVigente), a etapa 4 mostra o vigente, "Aprovada,
// opção X", feita, e a atual passa à 5; sem ele, a etapa 4 de hoje. A linha 6 da Próxima ação vale com o mais novo
// arquivado e a demanda em `nova` ou `em_analise` (com ou sem vigente; opção (a) da volta de 14/11); nos outros status, a
// linha de hoje. Mesmo molde de fixture de dados-das-etapas-andamento.test.ts; dados só fictícios.
import { describe, expect, it } from 'vitest';
import type { Aprovador } from '../modules/pacotes-decisao/consultas';
import { etapasDaDemanda, proximaAcao, vigenteDe, type DadosDasEtapas, type ProximaAcao } from './dados-das-etapas';

const ID = 'DEM-20991231-0043';
const QUANDO = new Date('2099-12-31T09:00:00Z');
const AUTOR = { tipo: 'pessoa', nome: 'Pessoa Ficticia CTO' } as const;
const PESSOA = 'Uma pessoa (CTO ou administradora)';

type Demanda = DadosDasEtapas['demanda'];
type Pacote = Demanda['pacotesDecisao'][number];
type Status = Demanda['status'];
type DecVigente = NonNullable<DadosDasEtapas['decVigente']>;

const idDec = (v: number) => `DEC-${ID}-v${v}`;
const versao = (sigla: 'ESP' | 'RSK') => ({ id: `${sigla}-${ID}-v1`, versao: 1, criadaEm: QUANDO, autor: AUTOR, rascunhoAgente: false });

function pacote(v: number, statusDecisao: Pacote['statusDecisao'], extra: Partial<Pacote> = {}): Pacote {
  return { id: idDec(v), versao: v, criadaEm: QUANDO, autor: AUTOR, rascunhoAgente: false, statusDecisao, desatualizado: false, substituido: false, substituidoPor: null, ...extra };
}

const aprovacao = (opcao: Aprovador['opcao']): Aprovador => ({
  papel: 'cto',
  nome: 'Pessoa Ficticia CTO',
  opcao,
  registradaEm: QUANDO,
  referenciaDocumento: null,
  dataDocumento: null,
});

// A vista do v1 aprovado que a página lê com obterPacoteDecisao (só o que a etapa 4 usa).
const vigenteV1 = (opcao: Aprovador['opcao'] = 'A', extra: Partial<DecVigente> = {}): DecVigente => ({
  id: idDec(1),
  decisao: { opcaoEscolhida: opcao, comentarios: null, decididaPor: 'Pessoa Ficticia CTO', decididaEm: QUANDO },
  aprovadores: [aprovacao(opcao)],
  ...extra,
});

// ESP v1, RSK v1 e os pacotes dados (o mais novo primeiro, como em obterDemanda); o DEC mais novo é o pacotes[0], com a
// vista lida pela página. `decVigente` ausente quando não é passado.
function dados(status: Status, pacotes: Pacote[], decVigente?: DecVigente | null): DadosDasEtapas {
  const maisNovo = pacotes[0]!;
  return {
    demanda: { id: ID, status, especificacoes: [versao('ESP')], pareceresRisco: [versao('RSK')], pacotesDecisao: pacotes, agentesEmAndamento: [] },
    espMaisNova: { id: `ESP-${ID}-v1`, duvidasEmAberto: [] },
    decMaisNovo: { id: maisNovo.id, statusDecisao: maisNovo.statusDecisao, desatualizado: maisNovo.desatualizado, nivelAprovacaoRequerido: 'cto', aprovadores: [], decisao: null },
    historico: [],
    temSecaoDeDuvidas: false,
    ...(decVigente === undefined ? {} : { decVigente }),
  };
}

// v2 arquivado sobre o v1 aprovado vigente (o caso do S-04).
const V2_ARQUIVADO_V1_VIGENTE = (desatualizado = false) => [pacote(2, 'arquivada'), pacote(1, 'aprovada', { desatualizado })];

const LINHA_6: ProximaAcao = {
  linha: 6,
  oQueFalta: 'Montar o pacote de decisão.',
  detalhe: null,
  quemAge: 'Agente de consolidação ou uma pessoa',
  link: { rotulo: 'Montar o pacote de decisão', destino: { tipo: 'pagina', href: `/demandas/${ID}/pacotes-decisao/novo` } },
};

const LINHA_13: ProximaAcao = { linha: 13, oQueFalta: 'Acompanhar a demanda.', detalhe: null, quemAge: 'Sem responsável definido', link: null };

describe('vigenteDe (exportada na 0.4.1)', () => {
  it('o primeiro aprovado não substituído, do mais novo para o mais antigo; sem nenhum, null', () => {
    expect(vigenteDe(dados('aprovada', V2_ARQUIVADO_V1_VIGENTE()).demanda)?.id).toBe(idDec(1));
    expect(vigenteDe(dados('em_analise', [pacote(1, 'arquivada')]).demanda)).toBeNull();
    expect(vigenteDe(dados('aprovada', [pacote(2, 'arquivada'), pacote(1, 'aprovada', { substituido: true, substituidoPor: idDec(9) })]).demanda)).toBeNull();
  });
});

describe('etapa 4 com o DEC mais novo arquivado (7.2, item 3)', () => {
  it('em Aprovada, v2 arquivado e o v1 vigente lido com a opção A → etapa 4 do v1, "Aprovada, opção A", feita; atual = 5; Próxima ação linha 10 com o link do v1', () => {
    const x = dados('aprovada', V2_ARQUIVADO_V1_VIGENTE(), vigenteV1('A'));
    const etapas = etapasDaDemanda(x);
    expect(etapas[3]).toEqual({ numero: 4, nome: 'Decisão', idVersao: idDec(1), estado: 'Aprovada, opção A', feita: true, atual: false });
    expect(etapas.filter((e) => e.atual).map((e) => e.numero)).toEqual([5]);
    expect(etapas[4]).toMatchObject({ numero: 5, estado: 'Ainda não gerado', feita: false, atual: true });
    expect(proximaAcao(x)).toEqual({
      linha: 10,
      oQueFalta: 'Gerar o Pedido de Construção e, quando a construção começar, mudar o status para Em construção.',
      detalhe: null,
      quemAge: PESSOA,
      link: { rotulo: 'Abrir a decisão aprovada', destino: { tipo: 'pagina', href: `/pacotes-decisao/${idDec(1)}` } },
    });
  });

  it('a opção do vigente vem da decisão; sem decisão, da primeira aprovação', () => {
    expect(etapasDaDemanda(dados('aprovada', V2_ARQUIVADO_V1_VIGENTE(), vigenteV1('B')))[3]!.estado).toBe('Aprovada, opção B');
    const soAprovacao = vigenteV1('A', { decisao: null, aprovadores: [aprovacao('B')] });
    expect(etapasDaDemanda(dados('aprovada', V2_ARQUIVADO_V1_VIGENTE(), soAprovacao))[3]!.estado).toBe('Aprovada, opção B');
    // Vigente sem decisão e sem aprovação: dado incoerente, erro (como o DEC aprovado sem opção de hoje).
    expect(() => etapasDaDemanda(dados('aprovada', V2_ARQUIVADO_V1_VIGENTE(), vigenteV1('A', { decisao: null, aprovadores: [] })))).toThrow('etapas: DEC aprovado sem opção');
  });

  it.each([
    ['ausente', undefined],
    ['null', null],
  ] as const)('sem decVigente (%s) e o v2 arquivado → a etapa 4 de hoje: v2, "Arquivada", não feita', (_, decVigente) => {
    const etapas = etapasDaDemanda(dados('aprovada', V2_ARQUIVADO_V1_VIGENTE(), decVigente));
    expect(etapas[3]).toEqual({ numero: 4, nome: 'Decisão', idVersao: idDec(2), estado: 'Arquivada', feita: false, atual: true });
  });

  it('com o DEC mais novo que não é arquivado, o decVigente não muda a etapa 4 (ela é a do mais novo)', () => {
    const x = dados('aprovada', [pacote(2, 'devolvida'), pacote(1, 'aprovada')], vigenteV1('A'));
    expect(etapasDaDemanda(x)[3]).toMatchObject({ idVersao: idDec(2), estado: 'Devolvida', feita: false });
  });

  it('decVigente com id diferente do de vigenteDe(d) → lança (dado incoerente, como o DEC mais novo)', () => {
    const outro = vigenteV1('A', { id: idDec(3) });
    expect(() => etapasDaDemanda(dados('aprovada', V2_ARQUIVADO_V1_VIGENTE(), outro))).toThrow('etapas: DEC vigente incoerente');
    expect(() => proximaAcao(dados('aprovada', V2_ARQUIVADO_V1_VIGENTE(), outro))).toThrow('etapas: DEC vigente incoerente');
    // decVigente sem vigente na demanda também é incoerente.
    expect(() => etapasDaDemanda(dados('em_analise', [pacote(1, 'arquivada')], vigenteV1('A')))).toThrow('etapas: DEC vigente incoerente');
  });
});

describe('Próxima ação com o DEC mais novo arquivado (7.2, item 4; D-14)', () => {
  it.each(['em_analise', 'nova'] as const)('v2 arquivado e v1 vigente desatualizado, em %s → linha 6, com o link de hoje', (status) => {
    expect(proximaAcao(dados(status, V2_ARQUIVADO_V1_VIGENTE(true), vigenteV1('A')))).toEqual(LINHA_6);
    expect(proximaAcao(dados(status, V2_ARQUIVADO_V1_VIGENTE(true)))).toEqual(LINHA_6);
  });

  it('o mesmo caso em Aprovada → linha 10 (sem mudança); em Encerrada → linha 1', () => {
    expect(proximaAcao(dados('aprovada', V2_ARQUIVADO_V1_VIGENTE(true), vigenteV1('A'))).linha).toBe(10);
    expect(proximaAcao(dados('encerrada', V2_ARQUIVADO_V1_VIGENTE(true), vigenteV1('A')))).toEqual({
      linha: 1,
      oQueFalta: 'Nada. A demanda está em Encerrada.',
      detalhe: null,
      quemAge: 'Ninguém',
      link: null,
    });
  });

  it.each(['nova', 'em_analise'] as const)('sem vigente (só o v1, arquivado), em %s → também a linha 6, com o link de hoje', (status) => {
    expect(proximaAcao(dados(status, [pacote(1, 'arquivada')]))).toEqual(LINHA_6);
  });

  it('sem vigente (só o v1, arquivado), nos outros status → a linha de hoje (13 em Pronta para decisão)', () => {
    const linha = (status: Status) => proximaAcao(dados(status, [pacote(1, 'arquivada')])).linha;
    expect(proximaAcao(dados('pronta_para_decisao', [pacote(1, 'arquivada')]))).toEqual(LINHA_13);
    expect(linha('aprovada')).toBe(10);
    expect(linha('em_construcao')).toBe(11);
    expect(linha('devolvida')).toBe(12);
    expect(linha('aguardando_informacao')).toBe(3);
    expect(linha('entregue')).toBe(1);
    expect(linha('encerrada')).toBe(1);
  });

  it('a linha 2 (agente trabalhando) continua vencendo a 6', () => {
    const x = dados('em_analise', [pacote(1, 'arquivada')]);
    expect(proximaAcao({ ...x, demanda: { ...x.demanda, agentesEmAndamento: [{ agente: 'consolidacao', status: 'pendente' }] } }).linha).toBe(2);
  });

  it('CV-19: id da demanda fora do formato não gera link na linha 6', () => {
    const x = dados('em_analise', [pacote(1, 'arquivada')]);
    expect(proximaAcao({ ...x, demanda: { ...x.demanda, id: 'DEM-1/../x' } })).toMatchObject({ linha: 6, link: null });
  });
});
