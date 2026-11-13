// T13 do DEC-DEM-20261111-0017-v1 (RF-07; 03, 5.6; CA-07.1 a CA-07.3): a linha 15 da Próxima ação, "Construção
// concluída: confira e marque como Entregue.", só com a demanda em Em construção e o andamento do DEC **vigente** em
// `construido`. Fora disso, as linhas de hoje: 11 em Em construção, 12 em Devolvida, 1 em Entregue. Mesmo molde de
// fixture de dados-das-etapas.test.ts (DEC v1 aprovado vigente); dados só fictícios.
//
// E o M1 da 06-T11-tech-lead: a seção do andamento só leva ao link e ao texto um decId que é texto no formato de DEC.
import { describe, expect, it } from 'vitest';
import type { AndamentoVista } from '../modules/andamento/schemas';
import { proximaAcao, type DadosDasEtapas, type ProximaAcao } from './dados-das-etapas';
import { secaoDoAndamento } from './dados-do-andamento';

const ID = 'DEM-20991231-0042';
const QUANDO = new Date('2099-12-31T09:00:00Z');
const AUTOR = { tipo: 'pessoa', nome: 'Pessoa Ficticia CTO' } as const;

type Demanda = DadosDasEtapas['demanda'];
type Pacote = Demanda['pacotesDecisao'][number];
type Andamento = Pick<AndamentoVista, 'decId' | 'statusConstrucao'>;

const idDec = (v: number) => `DEC-${ID}-v${v}`;
const versao = (sigla: 'ESP' | 'RSK') => ({ id: `${sigla}-${ID}-v1`, versao: 1, criadaEm: QUANDO, autor: AUTOR, rascunhoAgente: false });

function pacote(v: number, extra: Partial<Pacote> = {}): Pacote {
  return { id: idDec(v), versao: v, criadaEm: QUANDO, autor: AUTOR, rascunhoAgente: false, statusDecisao: 'aprovada', desatualizado: false, substituido: false, substituidoPor: null, ...extra };
}

// ESP v1, RSK v1 e o DEC mais novo aprovado (o vigente, salvo quando `pacotes` diz outra coisa); a Próxima ação chega a
// linhaDoStatus, como na linha 11 de dados-das-etapas.test.ts.
function dados(status: Demanda['status'], andamento?: Andamento | null, pacotes: Pacote[] = [pacote(1)]): DadosDasEtapas {
  const maisNovo = pacotes[0]!;
  return {
    demanda: { id: ID, status, especificacoes: [versao('ESP')], pareceresRisco: [versao('RSK')], pacotesDecisao: pacotes, agentesEmAndamento: [] },
    espMaisNova: { id: `ESP-${ID}-v1`, duvidasEmAberto: [] },
    decMaisNovo: {
      id: maisNovo.id,
      statusDecisao: maisNovo.statusDecisao,
      desatualizado: false,
      nivelAprovacaoRequerido: 'cto',
      aprovadores: [],
      decisao: { opcaoEscolhida: 'A', comentarios: null, decididaPor: 'Pessoa Ficticia CTO', decididaEm: QUANDO },
    },
    historico: [],
    temSecaoDeDuvidas: false,
    ...(andamento === undefined ? {} : { andamento }),
  };
}

const LINHA_15: ProximaAcao = {
  linha: 15,
  oQueFalta: 'Construção concluída: confira e marque como Entregue.',
  detalhe: 'O /construir não marca Entregue: quem confere a entrega é uma pessoa.',
  quemAge: 'Uma pessoa (CTO ou administradora)',
  link: { rotulo: 'Mudar o status', destino: { tipo: 'secao', secao: 'status' } },
};

const LINHA_11: ProximaAcao = {
  linha: 11,
  oQueFalta: 'Acompanhar a construção. Quando terminar, mudar o status para Entregue ou Devolvida pela construção.',
  detalhe: null,
  quemAge: 'Uma pessoa (CTO ou administradora)',
  link: { rotulo: 'Mudar o status', destino: { tipo: 'secao', secao: 'status' } },
};

describe('Próxima ação, linha 15 (RF-07; 03, 5.6)', () => {
  it('CA-07.1: em Em construção, com o andamento do DEC vigente em construido → linha 15, com o texto da 03 e o link para Mudar status', () => {
    expect(proximaAcao(dados('em_construcao', { decId: idDec(1), statusConstrucao: 'construido' }))).toEqual(LINHA_15);
  });

  it('CA-07.1: o vigente é o aprovado mais novo não substituído (v2), e não o substituído (v1)', () => {
    const pacotes = [pacote(2), pacote(1, { substituido: true, substituidoPor: idDec(2) })];
    expect(proximaAcao(dados('em_construcao', { decId: idDec(2), statusConstrucao: 'construido' }, pacotes))).toEqual(LINHA_15);
  });

  it.each([
    ['em_construcao', { decId: idDec(1), statusConstrucao: 'em_construcao' }],
    ['cancelado', { decId: idDec(1), statusConstrucao: 'cancelado' }],
    ['null', null],
    ['ausente', undefined],
  ] as const)('CA-07.2: andamento %s → linha 11 de hoje', (_, andamento) => {
    expect(proximaAcao(dados('em_construcao', andamento))).toEqual(LINHA_11);
  });

  it('CA-07.2: andamento construido de um DEC que não é o vigente (substituído, ou de outra demanda) → linha 11', () => {
    const pacotes = [pacote(2), pacote(1, { substituido: true, substituidoPor: idDec(2) })];
    expect(proximaAcao(dados('em_construcao', { decId: idDec(1), statusConstrucao: 'construido' }, pacotes))).toEqual(LINHA_11);
    expect(proximaAcao(dados('em_construcao', { decId: 'DEC-DEM-20991231-0001-v1', statusConstrucao: 'construido' }))).toEqual(LINHA_11);
  });

  it('CA-07.2: sem DEC vigente (o único aprovado foi substituído), andamento construido dele → linha 11', () => {
    const pacotes = [pacote(1, { substituido: true, substituidoPor: idDec(9) })];
    expect(proximaAcao(dados('em_construcao', { decId: idDec(1), statusConstrucao: 'construido' }, pacotes))).toEqual(LINHA_11);
  });

  it('CA-07.3: a mesma demanda depois de marcada Entregue → linha 1, "Nada. A demanda está em Entregue."', () => {
    expect(proximaAcao(dados('entregue', { decId: idDec(1), statusConstrucao: 'construido' }))).toEqual({
      linha: 1,
      oQueFalta: 'Nada. A demanda está em Entregue.',
      detalhe: null,
      quemAge: 'Ninguém',
      link: null,
    });
  });

  it('a linha 15 só existe em Em construção: em Devolvida, Aprovada e Encerrada, as linhas de hoje', () => {
    const concluido = { decId: idDec(1), statusConstrucao: 'construido' } as const;
    expect(proximaAcao(dados('devolvida', concluido)).linha).toBe(12);
    expect(proximaAcao(dados('aprovada', concluido)).linha).toBe(10);
    expect(proximaAcao(dados('encerrada', concluido)).linha).toBe(1);
  });

  it('a linha 2 (agente trabalhando) continua vencendo a 15', () => {
    const x = dados('em_construcao', { decId: idDec(1), statusConstrucao: 'construido' });
    expect(proximaAcao({ ...x, demanda: { ...x.demanda, agentesEmAndamento: [{ agente: 'risco', status: 'em_andamento' }] } }).linha).toBe(2);
  });
});

describe('M1 da 06-T11-tech-lead: o decId da seção só como texto no formato de DEC', () => {
  const formatar = (d: Date) => d.toISOString();
  const andamento = (decId: unknown): AndamentoVista =>
    ({ decId, fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, statusConstrucao: 'em_construcao', atualizadoEm: QUANDO }) as unknown as AndamentoVista;

  it('um objeto cujo texto casa o formato de DEC não vira link nem entra no alerta de substituído', () => {
    const disfarce = { toString: () => idDec(1) };
    const s = secaoDoAndamento(andamento(disfarce), [{ id: idDec(1), substituido: true }], formatar);
    expect(s).not.toBeNull();
    expect(s!.dec).toBeNull();
    expect(s!.alertas).toEqual([]);
  });

  it('número, nulo e indefinido no decId: "Não informado" (dec null), sem alerta', () => {
    for (const decId of [42, null, undefined]) {
      const s = secaoDoAndamento(andamento(decId), [], formatar);
      expect(s!.dec).toBeNull();
      expect(s!.alertas).toEqual([]);
    }
  });

  it('andamento ausente (vista montada sem a chave, como numa fixture de antes da 0.4.0) ou que não é objeto: sem seção, sem lançar', () => {
    for (const a of [undefined, 'construindo', 42]) expect(secaoDoAndamento(a as unknown as AndamentoVista, [], formatar)).toBeNull();
  });

  it('o texto no formato continua com o link', () => {
    expect(secaoDoAndamento(andamento(idDec(1)), [], formatar)!.dec).toEqual({ id: idDec(1), href: `/pacotes-decisao/${idDec(1)}` });
  });
});
