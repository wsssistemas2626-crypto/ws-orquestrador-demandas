// T10 do DEC-DEM-20261110-0015-v1: regras de exibição da T05 (C11, ADR-17). Um caso por linha das duas tabelas da spec,
// seção 4.4 (CA-08.4 e CA-09.3), com os textos de 03, 5.4 e 5.5; a ordem de prioridade do RF-09; CV-09 (saída sem nome,
// documento nem comentário) e CV-19 (link só de id validado). Dados só fictícios.
import { describe, expect, it } from 'vitest';
import { RE_ID_DEMANDA } from '../modules/demandas/gerar-id';
import type { Aprovador } from '../modules/pacotes-decisao/consultas';
import { etapasDaDemanda, proximaAcao, RE_ID_DEMANDA_NA_TELA, TEXTOS_ETAPAS, type DadosDasEtapas, type ProximaAcao } from './dados-das-etapas';

const ID = 'DEM-20261110-0042';
const QUANDO = new Date('2026-11-10T09:00:00Z');
const AUTOR = { tipo: 'pessoa', nome: 'Pessoa Ficticia CTO' } as const;
const PESSOA = 'Uma pessoa (CTO ou administradora)';

type Demanda = DadosDasEtapas['demanda'];
type Pacote = Demanda['pacotesDecisao'][number];
type Dec = NonNullable<DadosDasEtapas['decMaisNovo']>;

const idDec = (v: number, demanda = ID) => `DEC-${demanda}-v${v}`;
const versoes = (sigla: 'ESP' | 'RSK', n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `${sigla}-${ID}-v${n - i}`, versao: n - i, criadaEm: QUANDO, autor: AUTOR, rascunhoAgente: false }));

function pacote(v: number, statusDecisao: Pacote['statusDecisao'] = 'pendente', extra: Partial<Pacote> = {}): Pacote {
  return { id: idDec(v), versao: v, criadaEm: QUANDO, autor: AUTOR, rascunhoAgente: false, statusDecisao, desatualizado: false, substituido: false, substituidoPor: null, ...extra };
}

function aprovacao(papel: Aprovador['papel'], opcao: Aprovador['opcao'], extra: Partial<Aprovador> = {}): Aprovador {
  const adm = papel === 'administradora';
  return {
    papel,
    nome: adm ? 'Pessoa Ficticia Administradora' : 'Pessoa Ficticia CTO',
    opcao,
    registradaEm: QUANDO,
    referenciaDocumento: adm ? 'DOC-FICTICIO-1' : null,
    dataDocumento: adm ? '2026-11-09' : null,
    ...extra,
  };
}

const decidida = (opcaoEscolhida: Aprovador['opcao'] | null, extra: Partial<NonNullable<Dec['decisao']>> = {}): NonNullable<Dec['decisao']> => ({
  opcaoEscolhida,
  comentarios: null,
  decididaPor: 'Pessoa Ficticia CTO',
  decididaEm: QUANDO,
  ...extra,
});

type Opcoes = {
  status?: Demanda['status'];
  esp?: number; // quantas versões de ESP (a mais nova primeiro)
  duvidas?: string[]; // dúvidas em aberto da ESP mais nova
  rsk?: number;
  pacotes?: Pacote[]; // a mais nova primeiro, como em obterDemanda
  dec?: Partial<Dec>; // o que muda na vista do DEC mais novo
  agentes?: Demanda['agentesEmAndamento'];
  historico?: DadosDasEtapas['historico'];
  temSecaoDeDuvidas?: boolean;
  id?: string;
};

// A demanda DEM-20261110-0042 em em_analise, sem versões e com o histórico vazio; o resto pelas opções. A ESP mais nova e
// o DEC mais novo saem das listas da demanda, como a página os lê.
function base(o: Opcoes = {}): DadosDasEtapas {
  const especificacoes = versoes('ESP', o.esp ?? 0);
  const pacotesDecisao = o.pacotes ?? [];
  const maisNovo = pacotesDecisao[0];
  return {
    demanda: {
      id: o.id ?? ID,
      status: o.status ?? 'em_analise',
      especificacoes,
      pareceresRisco: versoes('RSK', o.rsk ?? 0),
      pacotesDecisao,
      agentesEmAndamento: o.agentes ?? [],
    },
    espMaisNova: especificacoes[0] ? { id: especificacoes[0].id, duvidasEmAberto: o.duvidas ?? [] } : null,
    decMaisNovo: maisNovo
      ? { id: maisNovo.id, statusDecisao: maisNovo.statusDecisao, desatualizado: maisNovo.desatualizado, nivelAprovacaoRequerido: 'cto', aprovadores: [], decisao: null, ...o.dec }
      : null,
    historico: o.historico ?? [],
    temSecaoDeDuvidas: o.temSecaoDeDuvidas ?? false,
  };
}

const estados = (x: DadosDasEtapas) => etapasDaDemanda(x).map((e) => e.estado);
const atuais = (x: DadosDasEtapas) => etapasDaDemanda(x).filter((e) => e.atual).map((e) => e.numero);
const etapa = (x: DadosDasEtapas, n: 1 | 2 | 3 | 4 | 5) => etapasDaDemanda(x)[n - 1]!;

// O estado da CA-08.1 (o mesmo da `etapasDupla` do seed): ESP v2 sem dúvidas, RSK v1 e DEC v1 dupla com só o CTO.
const dupla = (aprovadores: Aprovador[], extra: Opcoes = {}) =>
  base({ status: 'pronta_para_decisao', esp: 2, rsk: 1, pacotes: [pacote(1)], dec: { nivelAprovacaoRequerido: 'cto_e_administradora', aprovadores }, ...extra });

describe('etapasDaDemanda (RF-08)', () => {
  it('cinco etapas, na ordem, com os nomes da 03 (5.4) e o id da demanda na primeira', () => {
    const e = etapasDaDemanda(base());
    expect(e.map((x) => [x.numero, x.nome])).toEqual([
      [1, 'Demanda'],
      [2, 'Especificação'],
      [3, 'Parecer de risco'],
      [4, 'Decisão'],
      [5, 'Pedido de Construção'],
    ]);
    expect(e[0]).toEqual({ numero: 1, nome: 'Demanda', idVersao: ID, estado: 'Registrada', feita: true, atual: false });
  });

  it('CA-08.1: ESP v2 sem dúvidas, RSK v1, DEC dupla com só o CTO → Registrada, Feita, Feito, 1 de 2 aprovações, Depois da aprovação; atual = 4', () => {
    const x = dupla([aprovacao('cto', 'A')]);
    expect(estados(x)).toEqual(['Registrada', 'Feita', 'Feito', '1 de 2 aprovações', 'Depois da aprovação']);
    expect(atuais(x)).toEqual([4]);
    expect(etapasDaDemanda(x).map((e) => e.idVersao)).toEqual([ID, `ESP-${ID}-v2`, `RSK-${ID}-v1`, idDec(1), null]);
    expect(etapasDaDemanda(x).map((e) => e.feita)).toEqual([true, true, true, false, false]);
  });

  it('CA-08.2: sem ESP → etapa 2 "Por fazer", id null, atual; o resto por fazer', () => {
    const x = base();
    expect(etapa(x, 2)).toEqual({ numero: 2, nome: 'Especificação', idVersao: null, estado: 'Por fazer', feita: false, atual: true });
    expect(estados(x)).toEqual(['Registrada', 'Por fazer', 'Por fazer', 'Por fazer', 'Depois da aprovação']);
    expect(atuais(x)).toEqual([2]);
  });

  it('CA-08.3: encerrada e entregue não têm atual, mesmo com etapa por fazer', () => {
    for (const status of ['encerrada', 'entregue'] as const) {
      expect(atuais(base({ status }))).toEqual([]);
      expect(atuais(dupla([aprovacao('cto', 'A')], { status }))).toEqual([]);
    }
  });

  it('ESP mais nova com dúvidas em aberto → "Com dúvidas em aberto", não feita e atual', () => {
    const x = base({ status: 'aguardando_informacao', esp: 1, duvidas: ['Qual o prazo? (fictício)'] });
    expect(etapa(x, 2)).toMatchObject({ idVersao: `ESP-${ID}-v1`, estado: 'Com dúvidas em aberto', feita: false, atual: true });
    expect(atuais(x)).toEqual([2]);
  });

  it('parecer de risco: sem RSK "Por fazer" (atual depois da ESP feita); com RSK "Feito", id do mais novo', () => {
    expect(etapa(base({ esp: 1 }), 3)).toMatchObject({ idVersao: null, estado: 'Por fazer', feita: false, atual: true });
    expect(etapa(base({ esp: 1, rsk: 3 }), 3)).toMatchObject({ idVersao: `RSK-${ID}-v3`, estado: 'Feito', feita: true, atual: false });
  });

  it('decisão: sem DEC "Por fazer"; com DEC, o id do mais novo', () => {
    expect(etapa(base({ esp: 1, rsk: 1 }), 4)).toMatchObject({ idVersao: null, estado: 'Por fazer', feita: false, atual: true });
    expect(etapa(base({ esp: 1, rsk: 1, pacotes: [pacote(2), pacote(1, 'devolvida')] }), 4).idVersao).toBe(idDec(2));
  });

  it('DEC pendente desatualizado → "Pacote desatualizado", antes de "1 de 2 aprovações"', () => {
    const x = dupla([aprovacao('cto', 'A')], { pacotes: [pacote(1, 'pendente', { desatualizado: true })] });
    expect(etapa(x, 4)).toMatchObject({ estado: 'Pacote desatualizado', feita: false, atual: true });
  });

  it('DEC pendente: "1 de 2 aprovações" só na dupla com uma aprovação; senão "Decisão pendente"', () => {
    expect(etapa(dupla([aprovacao('administradora', 'B')]), 4).estado).toBe('1 de 2 aprovações');
    expect(etapa(dupla([]), 4).estado).toBe('Decisão pendente');
    expect(etapa(base({ esp: 1, rsk: 1, pacotes: [pacote(1)] }), 4).estado).toBe('Decisão pendente');
  });

  it('DEC aprovado → "Aprovada, opção B" (feita), pela opção escolhida da decisão ou pela da primeira aprovação', () => {
    const pela = (dec: Partial<Dec>) => etapa(base({ status: 'aprovada', esp: 1, rsk: 1, pacotes: [pacote(1, 'aprovada')], dec }), 4);
    expect(pela({ decisao: decidida('B'), aprovadores: [aprovacao('cto', 'B')] })).toMatchObject({ estado: 'Aprovada, opção B', feita: true, atual: false });
    expect(pela({ decisao: decidida(null), aprovadores: [aprovacao('cto', 'B')] }).estado).toBe('Aprovada, opção B');
    expect(pela({ decisao: null, aprovadores: [aprovacao('cto', 'A')] }).estado).toBe('Aprovada, opção A');
  });

  it('DEC aprovado sem opção nenhuma lança erro: número errado não (02, seção 5)', () => {
    const x = base({ status: 'aprovada', esp: 1, rsk: 1, pacotes: [pacote(1, 'aprovada')], dec: { decisao: decidida(null), aprovadores: [] } });
    expect(() => etapasDaDemanda(x)).toThrow();
  });

  it('DEC devolvido → "Devolvida"; arquivado → "Arquivada"; os dois não feitos', () => {
    expect(etapa(base({ esp: 1, rsk: 1, pacotes: [pacote(1, 'devolvida')] }), 4)).toMatchObject({ estado: 'Devolvida', feita: false, atual: true });
    expect(etapa(base({ status: 'pronta_para_decisao', esp: 1, rsk: 1, pacotes: [pacote(1, 'arquivada')] }), 4)).toMatchObject({ estado: 'Arquivada', feita: false });
  });

  it('Pedido: "Gerado" com o id do vigente quando há pedido_gerado dele no histórico; todas feitas e nenhuma atual', () => {
    const x = base({
      status: 'aprovada',
      esp: 1,
      rsk: 1,
      pacotes: [pacote(1, 'aprovada')],
      dec: { decisao: decidida('A') },
      historico: [
        { acao: 'decisao_registrada', entidadeId: idDec(1) },
        { acao: 'pedido_gerado', entidadeId: idDec(1) },
      ],
    });
    expect(etapa(x, 5)).toEqual({ numero: 5, nome: 'Pedido de Construção', idVersao: idDec(1), estado: 'Gerado', feita: true, atual: false });
    expect(atuais(x)).toEqual([]);
  });

  it('Pedido: "Ainda não gerado" com vigente sem pedido dele (um pedido de outro DEC não conta); atual = 5', () => {
    const x = base({
      status: 'aprovada',
      esp: 1,
      rsk: 1,
      pacotes: [pacote(2, 'aprovada'), pacote(1, 'aprovada', { substituido: true, substituidoPor: idDec(2) })],
      dec: { decisao: decidida('B') },
      historico: [{ acao: 'pedido_gerado', entidadeId: idDec(1) }],
    });
    expect(etapa(x, 5)).toMatchObject({ idVersao: null, estado: 'Ainda não gerado', feita: false, atual: true });
    expect(atuais(x)).toEqual([5]);
  });

  it('Pedido: substituído não é vigente; sem vigente, "Depois da aprovação" mesmo com pedido_gerado antigo', () => {
    const x = base({
      status: 'em_analise',
      esp: 1,
      rsk: 1,
      pacotes: [pacote(2, 'devolvida'), pacote(1, 'aprovada', { substituido: true, substituidoPor: idDec(3) })],
      historico: [{ acao: 'pedido_gerado', entidadeId: idDec(1) }],
    });
    expect(etapa(x, 5)).toMatchObject({ idVersao: null, estado: 'Depois da aprovação', feita: false });
  });

  it('vigente é o primeiro aprovado não substituído, mesmo com DEC mais novo devolvido', () => {
    const x = base({
      status: 'em_analise',
      esp: 1,
      rsk: 1,
      pacotes: [pacote(3, 'devolvida'), pacote(2, 'aprovada'), pacote(1, 'aprovada', { substituido: true, substituidoPor: idDec(2) })],
      historico: [{ acao: 'pedido_gerado', entidadeId: idDec(2) }],
    });
    expect(etapa(x, 4).estado).toBe('Devolvida');
    expect(etapa(x, 5)).toMatchObject({ idVersao: idDec(2), estado: 'Gerado', feita: true });
    expect(atuais(x)).toEqual([4]);
  });

  it('dado incoerente (ESP ou DEC mais novo ausente ou de outro id) lança erro em vez de mostrar estado errado', () => {
    const semEsp = { ...base({ esp: 1 }), espMaisNova: null };
    const outraEsp = { ...base({ esp: 2 }), espMaisNova: { id: `ESP-${ID}-v1`, duvidasEmAberto: [] } };
    const semDec = { ...base({ esp: 1, rsk: 1, pacotes: [pacote(1)] }), decMaisNovo: null };
    const x = base({ esp: 1, rsk: 1, pacotes: [pacote(2), pacote(1)] });
    const outroDec = { ...x, decMaisNovo: { ...x.decMaisNovo!, id: idDec(1) } };
    const decSemPacote = { ...base({ esp: 1, rsk: 1 }), decMaisNovo: x.decMaisNovo };
    for (const y of [semEsp, outraEsp, semDec, outroDec, decSemPacote]) {
      expect(() => etapasDaDemanda(y)).toThrow();
      expect(() => proximaAcao(y)).toThrow();
    }
  });

  it('no máximo uma etapa atual, e nunca a 1', () => {
    const casos = [base(), base({ esp: 1 }), base({ esp: 1, rsk: 1 }), dupla([]), dupla([aprovacao('cto', 'A')]), base({ status: 'encerrada' })];
    for (const x of casos) {
      const a = atuais(x);
      expect(a.length).toBeLessThanOrEqual(1);
      expect(a).not.toContain(1);
    }
  });
});

describe('proximaAcao (RF-09)', () => {
  const pagina = (rotulo: string, href: string) => ({ rotulo, destino: { tipo: 'pagina' as const, href } });
  const secao = (rotulo: string, s: 'duvidas' | 'status') => ({ rotulo, destino: { tipo: 'secao' as const, secao: s } });
  const aprovado = { pacotes: [pacote(1, 'aprovada')], dec: { decisao: decidida('A') } };

  // Uma linha por linha da tabela da spec (4.4), cada uma com o estado mínimo que a faz casar e o texto da 03 (5.5).
  const LINHAS: ReadonlyArray<[number, Opcoes, Omit<ProximaAcao, 'linha'>]> = [
    [1, { status: 'entregue' }, { oQueFalta: 'Nada. A demanda está em Entregue.', detalhe: null, quemAge: 'Ninguém', link: null }],
    [
      2,
      { agentes: [{ agente: 'risco', status: 'em_andamento' }] },
      { oQueFalta: 'Esperar o agente de risco terminar o parecer.', detalhe: null, quemAge: 'Agente de risco', link: null },
    ],
    [
      3,
      { status: 'aguardando_informacao', esp: 1, duvidas: ['Qual o prazo? (fictício)'], temSecaoDeDuvidas: true },
      {
        oQueFalta: 'Responder às dúvidas em aberto e voltar a demanda para Em análise.',
        detalhe: null,
        quemAge: PESSOA,
        link: secao('Ver as dúvidas em aberto', 'duvidas'),
      },
    ],
    [
      4,
      {},
      {
        oQueFalta: 'Escrever a especificação técnica.',
        detalhe: null,
        quemAge: 'Agente de insumo técnico ou uma pessoa',
        link: pagina('Escrever a especificação', `/demandas/${ID}/especificacoes/nova`),
      },
    ],
    [
      5,
      { esp: 1 },
      {
        oQueFalta: 'Escrever o parecer de risco.',
        detalhe: null,
        quemAge: 'Agente de risco ou uma pessoa',
        link: pagina('Escrever o parecer de risco', `/demandas/${ID}/pareceres-risco/novo`),
      },
    ],
    [
      6,
      { esp: 1, rsk: 1 },
      {
        oQueFalta: 'Montar o pacote de decisão.',
        detalhe: null,
        quemAge: 'Agente de consolidação ou uma pessoa',
        link: pagina('Montar o pacote de decisão', `/demandas/${ID}/pacotes-decisao/novo`),
      },
    ],
    [
      7,
      { status: 'pronta_para_decisao', esp: 2, rsk: 1, pacotes: [pacote(1, 'pendente', { desatualizado: true })] },
      {
        oQueFalta: 'Montar um pacote novo. O pacote atual está desatualizado.',
        detalhe: null,
        quemAge: PESSOA,
        link: pagina('Montar um pacote novo', `/demandas/${ID}/pacotes-decisao/novo`),
      },
    ],
    [
      8,
      { status: 'pronta_para_decisao', esp: 1, rsk: 1, pacotes: [pacote(1)] },
      { oQueFalta: 'Decidir entre as opções A e B.', detalhe: null, quemAge: 'CTO', link: pagina('Abrir a decisão', `/pacotes-decisao/${idDec(1)}`) },
    ],
    [
      9,
      { status: 'pronta_para_decisao', esp: 1, rsk: 1, ...aprovado },
      {
        oQueFalta: 'Mudar o status para Aprovada e gerar o Pedido de Construção.',
        detalhe: null,
        quemAge: PESSOA,
        link: pagina('Abrir a decisão aprovada', `/pacotes-decisao/${idDec(1)}`),
      },
    ],
    [
      10,
      { status: 'aprovada', esp: 1, rsk: 1, ...aprovado },
      {
        oQueFalta: 'Gerar o Pedido de Construção e, quando a construção começar, mudar o status para Em construção.',
        detalhe: null,
        quemAge: PESSOA,
        link: pagina('Abrir a decisão aprovada', `/pacotes-decisao/${idDec(1)}`),
      },
    ],
    [
      11,
      { status: 'em_construcao', esp: 1, rsk: 1, ...aprovado },
      {
        oQueFalta: 'Acompanhar a construção. Quando terminar, mudar o status para Entregue ou Devolvida pela construção.',
        detalhe: null,
        quemAge: PESSOA,
        link: secao('Mudar o status', 'status'),
      },
    ],
    [
      12,
      { status: 'devolvida', esp: 1, rsk: 1, ...aprovado },
      {
        oQueFalta: 'Ler o motivo da devolução no histórico e voltar a demanda para Em construção ou Em análise.',
        detalhe: null,
        quemAge: PESSOA,
        link: secao('Mudar o status', 'status'),
      },
    ],
    [
      13,
      { status: 'pronta_para_decisao', esp: 1, rsk: 1, pacotes: [pacote(1, 'arquivada')] },
      { oQueFalta: 'Acompanhar a demanda.', detalhe: null, quemAge: 'Sem responsável definido', link: null },
    ],
  ];

  it('a tabela de casos cobre as 13 linhas, uma vez cada (CA-09.3)', () => {
    expect(LINHAS.map(([n]) => n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
  });

  it.each(LINHAS)('linha %i', (linha, opcoes, esperado) => {
    expect(proximaAcao(base(opcoes))).toEqual({ linha, ...esperado });
  });

  it('linha 1 também em Encerrada, e vence o agente em andamento', () => {
    expect(proximaAcao(base({ status: 'encerrada' }))).toMatchObject({ linha: 1, oQueFalta: 'Nada. A demanda está em Encerrada.', quemAge: 'Ninguém', link: null });
    expect(proximaAcao(base({ status: 'entregue', agentes: [{ agente: 'consolidacao', status: 'pendente' }] })).linha).toBe(1);
  });

  it('CA-09.2: aguardando_informacao com o agente de insumo técnico pendente → linha 2, não 3', () => {
    const x = base({ status: 'aguardando_informacao', esp: 1, duvidas: ['Qual o prazo? (fictício)'], temSecaoDeDuvidas: true, agentes: [{ agente: 'insumo_tecnico', status: 'pendente' }] });
    expect(proximaAcao(x)).toEqual({
      linha: 2,
      oQueFalta: 'Esperar o agente de insumo técnico terminar a especificação técnica.',
      detalhe: null,
      quemAge: 'Agente de insumo técnico',
      link: null,
    });
  });

  it('linha 2 usa o primeiro agente da lista (o mais antigo), com o artefato de cada agente', () => {
    const agentes = [
      { agente: 'consolidacao', status: 'pendente' },
      { agente: 'risco', status: 'em_andamento' },
    ] as const;
    expect(proximaAcao(base({ agentes: [...agentes] }))).toMatchObject({ oQueFalta: 'Esperar o agente de consolidação terminar o pacote de decisão.', quemAge: 'Agente de consolidação' });
    expect(proximaAcao(base({ agentes: [{ agente: 'orquestrador', status: 'pendente' }] }))).toMatchObject({
      oQueFalta: 'Esperar o agente orquestrador terminar os campos da demanda.',
      quemAge: 'Agente orquestrador',
    });
  });

  it('linha 3 sem a seção de dúvidas na página: "Mudar o status" para a seção Status', () => {
    expect(proximaAcao(base({ status: 'aguardando_informacao', esp: 1 })).link).toEqual(secao('Mudar o status', 'status'));
  });

  it('ordem: sem ESP, mesmo com RSK → 4; sem RSK, mesmo com DEC → 5; DEC mais novo devolvido, mesmo com aprovado mais antigo → 6', () => {
    expect(proximaAcao(base({ rsk: 1 })).linha).toBe(4);
    expect(proximaAcao(base({ esp: 1, pacotes: [pacote(1)] })).linha).toBe(5);
    expect(proximaAcao(base({ status: 'em_analise', esp: 1, rsk: 1, pacotes: [pacote(2, 'devolvida'), pacote(1, 'aprovada')] })).linha).toBe(6);
  });

  it('linha 7 vence a 8: pendente, desatualizado e dupla com uma aprovação', () => {
    expect(proximaAcao(dupla([aprovacao('cto', 'A')], { pacotes: [pacote(1, 'pendente', { desatualizado: true })] })).linha).toBe(7);
  });

  it('CA-09.1: dupla com a aprovação do CTO → "Decidir entre as opções A e B.", detalhe com o papel, quem age "Administradora", "Abrir a decisão"', () => {
    expect(proximaAcao(dupla([aprovacao('cto', 'A')]))).toEqual({
      linha: 8,
      oQueFalta: 'Decidir entre as opções A e B.',
      detalhe: 'O CTO já aprovou a opção A. Falta a aprovação da administradora, com o identificador do documento assinado.',
      quemAge: 'Administradora',
      link: pagina('Abrir a decisão', `/pacotes-decisao/${idDec(1)}`),
    });
  });

  it('linha 8: dupla com a da administradora → quem age "CTO", com o detalhe; dupla sem aprovação → "CTO e administradora", sem detalhe', () => {
    expect(proximaAcao(dupla([aprovacao('administradora', 'B')]))).toMatchObject({
      linha: 8,
      detalhe: 'A administradora já aprovou a opção B. Falta a aprovação do CTO.',
      quemAge: 'CTO',
    });
    expect(proximaAcao(dupla([]))).toMatchObject({ linha: 8, detalhe: null, quemAge: 'CTO e administradora' });
  });

  it('linha 10 sem aprovado vigente: sem link', () => {
    expect(proximaAcao(base({ status: 'aprovada', esp: 1, rsk: 1, pacotes: [pacote(1, 'arquivada')] }))).toMatchObject({ linha: 10, link: null });
  });

  it('linha 9 aponta o vigente, e não o substituído', () => {
    const x = base({
      status: 'pronta_para_decisao',
      esp: 1,
      rsk: 1,
      pacotes: [pacote(2, 'aprovada'), pacote(1, 'aprovada', { substituido: true, substituidoPor: idDec(2) })],
      dec: { decisao: decidida('B') },
    });
    expect(proximaAcao(x)).toMatchObject({ linha: 9, link: pagina('Abrir a decisão aprovada', `/pacotes-decisao/${idDec(2)}`) });
  });

  it('CV-09: sentinelas em nome do aprovador, referenciaDocumento, data e comentários da decisão não aparecem na saída', () => {
    const sentinela = (papel: Aprovador['papel'], opcao: Aprovador['opcao']) =>
      aprovacao(papel, opcao, { nome: `SENTINELA-NOME-${papel}`, referenciaDocumento: `SENTINELA-DOC-${papel}`, dataDocumento: `SENTINELA-DATA-${papel}` });
    const casos = [
      dupla([sentinela('cto', 'A')]),
      dupla([sentinela('administradora', 'B')]),
      base({
        status: 'aprovada',
        esp: 1,
        rsk: 1,
        pacotes: [pacote(1, 'aprovada')],
        dec: {
          nivelAprovacaoRequerido: 'cto_e_administradora',
          aprovadores: [sentinela('cto', 'B'), sentinela('administradora', 'B')],
          decisao: decidida('B', { comentarios: 'SENTINELA-COMENTARIO', decididaPor: 'SENTINELA-DECISOR' }),
        },
      }),
    ];
    for (const x of casos) {
      const saida = JSON.stringify([proximaAcao(x), etapasDaDemanda(x)]);
      expect(saida).toMatch(/opção [AB]/);
      expect(saida).not.toMatch(/SENTINELA/);
    }
  });

  it('CV-09: a saída tem só as chaves da interface (nada que habilite ou esconda controle)', () => {
    const x = dupla([aprovacao('cto', 'A')]);
    expect(Object.keys(proximaAcao(x)).sort()).toEqual(['detalhe', 'linha', 'link', 'oQueFalta', 'quemAge']);
    for (const e of etapasDaDemanda(x)) expect(Object.keys(e).sort()).toEqual(['atual', 'estado', 'feita', 'idVersao', 'nome', 'numero']);
  });

  it('CV-19: todo href de página casa ^/(demandas|pacotes-decisao)/', () => {
    const hrefs = LINHAS.flatMap(([, o]) => {
      const l = proximaAcao(base(o)).link;
      return l && l.destino.tipo === 'pagina' ? [l.destino.href] : [];
    });
    expect(hrefs).toHaveLength(7);
    for (const h of hrefs) expect(h).toMatch(/^\/(demandas|pacotes-decisao)\//);
  });

  it('CV-19: id de demanda ou de DEC fora do formato não gera link', () => {
    for (const id of ['DEM-1', `${ID}/../../sair`, `${ID}?x=1`, 'javascript:alert(1)', ` ${ID}`, `${ID}\n`]) {
      for (const o of [{}, { esp: 1 }, { esp: 1, rsk: 1 }] as Opcoes[]) expect(proximaAcao(base({ ...o, id })).link).toBeNull();
    }
    const decRuim = (id: string) => pacote(1, 'pendente', { id });
    for (const id of ['DEC-1', `${idDec(1)}/../x`, `//exemplo.test/${idDec(1)}`, `${idDec(1)}\n`]) {
      expect(proximaAcao(base({ status: 'pronta_para_decisao', esp: 1, rsk: 1, pacotes: [decRuim(id)] }))).toMatchObject({ linha: 8, link: null });
      const aprovadoRuim = base({ status: 'aprovada', esp: 1, rsk: 1, pacotes: [pacote(1, 'aprovada', { id })], dec: { decisao: decidida('A') } });
      expect(proximaAcao(aprovadoRuim)).toMatchObject({ linha: 10, link: null });
    }
  });

  it('D-11: a regex da tela é a de gerar-id.ts', () => {
    expect(RE_ID_DEMANDA_NA_TELA.source).toBe(RE_ID_DEMANDA.source);
    expect(RE_ID_DEMANDA_NA_TELA.flags).toBe(RE_ID_DEMANDA.flags);
  });

  it('textos fixos da barra e do cartão (03, seção 9)', () => {
    expect(TEXTOS_ETAPAS).toEqual({ barra: 'Etapas da demanda', semVersao: 'Nenhuma', titulo: 'Próxima ação', quemAge: 'Quem age:' });
  });
});
