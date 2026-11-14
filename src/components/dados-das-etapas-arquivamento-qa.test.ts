// 06-T13-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; 7.2, itens 3 e 4; D-14; opção (a) da volta de 14/11). Prova
// adversarial da barra de etapas e da Próxima ação da T05 com o DEC mais novo **arquivado**, além dos casos do engenheiro
// (dados-das-etapas-arquivamento.test.ts): varredura dos nove status × cada estado do aprovado vigente (atualizado,
// desatualizado, nenhum, aprovado substituído, dois arquivados por cima) × pedido gerado ou não × andamento, contra um
// oráculo escrito aqui, a partir da regra (não do código testado):
//   - etapa 4: com vigente lido (decVigente), o vigente, "Aprovada, opção X", feita; sem ele, o mais novo, "Arquivada";
//   - etapa 5: "Gerado" só com pedido_gerado do próprio vigente (o pedido do arquivado não conta);
//   - atual: nenhuma em status final; sem vigente, a 4; com vigente sem pedido, a 5; com pedido, nenhuma;
//   - Próxima ação: 1 em final, 3 em aguardando, 6 em nova e em_analise (com ou sem vigente), 9 ou 13 em pronta, 10 em
//     aprovada (link do vigente quando há), 11 ou 15 em construção, 12 em devolvida.
// E o que o dado incoerente faz: decVigente com o id do arquivado, do aprovado substituído ou de outra demanda lança.
// Funções puras, sem relógio nem ordem entre os testes; dados só fictícios.
import { describe, expect, it } from 'vitest';
import type { Aprovador } from '../modules/pacotes-decisao/consultas';
import { etapasDaDemanda, proximaAcao, type DadosDasEtapas, type ProximaAcao } from './dados-das-etapas';

const ID = 'DEM-20991231-0061';
const OUTRA = 'DEM-20991231-0062';
const QUANDO = new Date('2099-12-31T09:00:00Z');
const AUTOR = { tipo: 'pessoa', nome: 'Pessoa Ficticia QA' } as const;

type Demanda = DadosDasEtapas['demanda'];
type Pacote = Demanda['pacotesDecisao'][number];
type Status = Demanda['status'];
type DecVigente = NonNullable<DadosDasEtapas['decVigente']>;
type Opcao = Aprovador['opcao'];

const STATUS: readonly Status[] = ['nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao', 'aprovada', 'em_construcao', 'entregue', 'devolvida', 'encerrada'];
const ROTULO_FINAL: Partial<Record<Status, string>> = { entregue: 'Entregue', encerrada: 'Encerrada' };

const idDec = (v: number, demanda = ID) => `DEC-${demanda}-v${v}`;
const versao = (sigla: 'ESP' | 'RSK') => ({ id: `${sigla}-${ID}-v1`, versao: 1, criadaEm: QUANDO, autor: AUTOR, rascunhoAgente: false });
const pacote = (v: number, statusDecisao: Pacote['statusDecisao'], extra: Partial<Pacote> = {}): Pacote => ({
  id: idDec(v),
  versao: v,
  criadaEm: QUANDO,
  autor: AUTOR,
  rascunhoAgente: false,
  statusDecisao,
  desatualizado: false,
  substituido: false,
  substituidoPor: null,
  ...extra,
});
const vistaDoVigente = (id: string, opcao: Opcao): DecVigente => ({
  id,
  decisao: { opcaoEscolhida: opcao, comentarios: null, decididaPor: 'Pessoa Ficticia QA', decididaEm: QUANDO },
  aprovadores: [{ papel: 'cto', nome: 'Pessoa Ficticia QA', opcao, registradaEm: QUANDO, referenciaDocumento: null, dataDocumento: null }],
});

// Cada estado do vigente com o DEC mais novo arquivado: os pacotes (o mais novo primeiro) e o vigente que a página lê
// (`null` quando vigenteDe não acha nenhum, como a página passa).
type Cenario = { nome: string; pacotes: Pacote[]; vigente: { id: string; opcao: Opcao } | null };
const CENARIOS: readonly Cenario[] = [
  { nome: 'vigente atualizado', pacotes: [pacote(2, 'arquivada'), pacote(1, 'aprovada')], vigente: { id: idDec(1), opcao: 'A' } },
  { nome: 'vigente desatualizado', pacotes: [pacote(2, 'arquivada'), pacote(1, 'aprovada', { desatualizado: true })], vigente: { id: idDec(1), opcao: 'B' } },
  { nome: 'sem vigente (anterior devolvido)', pacotes: [pacote(2, 'arquivada'), pacote(1, 'devolvida')], vigente: null },
  { nome: 'sem vigente (só o arquivado)', pacotes: [pacote(1, 'arquivada')], vigente: null },
  { nome: 'sem vigente (o aprovado está substituído)', pacotes: [pacote(2, 'arquivada'), pacote(1, 'aprovada', { substituido: true, substituidoPor: idDec(9) })], vigente: null },
  {
    nome: 'dois arquivados sobre o vigente',
    pacotes: [pacote(3, 'arquivada'), pacote(2, 'arquivada'), pacote(1, 'aprovada', { desatualizado: true })],
    vigente: { id: idDec(1), opcao: 'A' },
  },
  {
    nome: 'vigente v2 que substituiu o v1, com o v3 arquivado',
    pacotes: [pacote(3, 'arquivada'), pacote(2, 'aprovada'), pacote(1, 'aprovada', { substituido: true, substituidoPor: idDec(2) })],
    vigente: { id: idDec(2), opcao: 'B' },
  },
];
// Pedido: nenhum; o do vigente; o do arquivado mais novo (não conta); o de um aprovado substituído (não conta).
type Pedido = 'nenhum' | 'do vigente' | 'do arquivado' | 'do v1 substituído';
const PEDIDOS: readonly Pedido[] = ['nenhum', 'do vigente', 'do arquivado', 'do v1 substituído'];
type Andamento = 'nenhum' | 'construído do vigente' | 'construído do arquivado';
const ANDAMENTOS: readonly Andamento[] = ['nenhum', 'construído do vigente', 'construído do arquivado'];

function dados(status: Status, c: Cenario, pedido: Pedido, andamento: Andamento): DadosDasEtapas {
  const maisNovo = c.pacotes[0]!;
  const historico =
    pedido === 'nenhum'
      ? []
      : [{ acao: 'pedido_gerado' as const, entidadeId: pedido === 'do vigente' ? (c.vigente?.id ?? idDec(1)) : pedido === 'do arquivado' ? maisNovo.id : idDec(1) }];
  const decId = andamento === 'construído do vigente' ? (c.vigente?.id ?? idDec(1)) : maisNovo.id;
  return {
    demanda: { id: ID, status, especificacoes: [versao('ESP')], pareceresRisco: [versao('RSK')], pacotesDecisao: c.pacotes, agentesEmAndamento: [] },
    espMaisNova: { id: `ESP-${ID}-v1`, duvidasEmAberto: [] },
    decMaisNovo: { id: maisNovo.id, statusDecisao: 'arquivada', desatualizado: false, nivelAprovacaoRequerido: 'cto', aprovadores: [], decisao: null },
    historico,
    temSecaoDeDuvidas: false,
    aguardaConfirmacaoDoAwave: false,
    andamento: andamento === 'nenhum' ? null : { decId, statusConstrucao: 'construido' },
    decVigente: c.vigente ? vistaDoVigente(c.vigente.id, c.vigente.opcao) : null,
  };
}

// --- o oráculo (a regra, escrita de novo) ---

type Esperado = { etapa4: { idVersao: string; estado: string; feita: boolean }; etapa5: { idVersao: string | null; estado: string; feita: boolean }; atual: number | null; linha: number; href: string | null };

function esperado(status: Status, c: Cenario, pedido: Pedido, andamento: Andamento): Esperado {
  const v = c.vigente;
  const maisNovo = c.pacotes[0]!;
  // O pedido só conta se é do vigente. No cenário em que o v1 é o próprio vigente, "do v1 substituído" é o pedido dele.
  const gerado = v !== null && (pedido === 'do vigente' || (pedido === 'do v1 substituído' && v.id === idDec(1)));
  const final = status === 'entregue' || status === 'encerrada';
  const etapa4 = v ? { idVersao: v.id, estado: `Aprovada, opção ${v.opcao}`, feita: true } : { idVersao: maisNovo.id, estado: 'Arquivada', feita: false };
  const etapa5 = gerado ? { idVersao: v.id, estado: 'Gerado', feita: true } : { idVersao: null, estado: v ? 'Ainda não gerado' : 'Depois da aprovação', feita: false };
  const atual = final ? null : !v ? 4 : !gerado ? 5 : null;
  const aprovada = v ? `/pacotes-decisao/${v.id}` : null;
  const montar = `/demandas/${ID}/pacotes-decisao/novo`;
  const [linha, href]: [number, string | null] = final
    ? [1, null]
    : status === 'aguardando_informacao'
      ? [3, null]
      : status === 'nova' || status === 'em_analise'
        ? [6, montar]
        : status === 'pronta_para_decisao'
          ? v
            ? [9, aprovada]
            : [13, null]
          : status === 'aprovada'
            ? [10, aprovada]
            : status === 'em_construcao'
              ? [v && andamento === 'construído do vigente' ? 15 : 11, null]
              : [12, null];
  return { etapa4, etapa5, atual, linha, href };
}

const hrefDe = (a: ProximaAcao): string | null => (a.link?.destino.tipo === 'pagina' ? a.link.destino.href : null);

const COMBINACOES = STATUS.flatMap((status) =>
  CENARIOS.flatMap((c) => PEDIDOS.flatMap((pedido) => ANDAMENTOS.map((andamento) => [status, c.nome, pedido, andamento, c] as const))),
);

describe('T05 com o DEC mais novo arquivado: varredura de status × vigente × pedido × andamento (7.2, itens 3 e 4)', () => {
  it('a varredura cobre os nove status, os sete cenários do vigente, os quatro pedidos e os três andamentos', () => {
    expect(COMBINACOES).toHaveLength(9 * 7 * 4 * 3);
    expect(new Set(COMBINACOES.map(([s]) => s)).size).toBe(9);
  });

  it.each(COMBINACOES)('%s, %s, pedido %s, andamento %s: barra e Próxima ação pelo oráculo', (status, _nome, pedido, andamento, c) => {
    const x = dados(status, c, pedido, andamento);
    const e = esperado(status, c, pedido, andamento);
    const etapas = etapasDaDemanda(x);
    expect(etapas[3]).toMatchObject({ numero: 4, nome: 'Decisão', ...e.etapa4 });
    expect(etapas[4]).toMatchObject({ numero: 5, nome: 'Pedido de Construção', ...e.etapa5 });
    expect(etapas.filter((t) => t.atual).map((t) => t.numero)).toEqual(e.atual === null ? [] : [e.atual]);
    const a = proximaAcao(x);
    expect([a.linha, hrefDe(a)]).toEqual([e.linha, e.href]);
    if (e.linha === 1) expect(a.oQueFalta).toBe(`Nada. A demanda está em ${ROTULO_FINAL[status]}.`);
    if (e.linha === 6) expect(a).toMatchObject({ oQueFalta: 'Montar o pacote de decisão.', link: { rotulo: 'Montar o pacote de decisão' } });
    // Nenhum id de DEC além dos da própria demanda chega à barra ou ao link.
    for (const t of etapas) if (t.idVersao) expect(t.idVersao.startsWith(`DEC-${ID}-`) || t.idVersao.startsWith(`ESP-${ID}-`) || t.idVersao.startsWith(`RSK-${ID}-`) || t.idVersao === ID).toBe(true);
  });

  it('o vigente desatualizado não muda a barra nem a Próxima ação em relação ao atualizado (a regra não olha o desatualizado)', () => {
    const [atualizado, desatualizado] = CENARIOS;
    for (const status of STATUS) {
      const a = dados(status, atualizado!, 'nenhum', 'nenhum');
      const d = dados(status, desatualizado!, 'nenhum', 'nenhum');
      const semOpcao = (t: ReturnType<typeof etapasDaDemanda>) => t.map((x) => ({ ...x, estado: x.estado.replace(/opção [AB]$/, 'opção ?') }));
      expect(semOpcao(etapasDaDemanda(d))).toEqual(semOpcao(etapasDaDemanda(a)));
      expect(proximaAcao(d)).toEqual(proximaAcao(a));
    }
  });
});

describe('decVigente incoerente com a vista da demanda (CV-09: o id só pode ser o de vigenteDe)', () => {
  const v3SobreV2 = CENARIOS[6]!;
  it.each([
    ['o id do próprio arquivado mais novo', CENARIOS[0]!, idDec(2)],
    ['o id do aprovado substituído (v1), com o v2 vigente', v3SobreV2, idDec(1)],
    ['o id de outra demanda', CENARIOS[0]!, idDec(1, OUTRA)],
    ['um id com a vista sem vigente', CENARIOS[2]!, idDec(1)],
    ['um id fora do formato', CENARIOS[0]!, '../DEC-x'],
  ] as const)('decVigente com %s → etapas e Próxima ação lançam "etapas: DEC vigente incoerente"', (_nome, c, id) => {
    for (const status of STATUS) {
      const x = { ...dados(status, c, 'nenhum', 'nenhum'), decVigente: vistaDoVigente(id, 'A') };
      expect(() => etapasDaDemanda(x)).toThrow('etapas: DEC vigente incoerente');
      expect(() => proximaAcao(x)).toThrow('etapas: DEC vigente incoerente');
    }
  });

  it('com o mais novo pendente sobre o vigente, o decVigente coerente não muda a etapa 4 (é a do pendente) nem a linha 8', () => {
    const pacotes = [pacote(3, 'pendente'), pacote(2, 'arquivada'), pacote(1, 'aprovada')];
    const x: DadosDasEtapas = {
      ...dados('pronta_para_decisao', { nome: 'pendente', pacotes, vigente: { id: idDec(1), opcao: 'A' } }, 'nenhum', 'nenhum'),
      decMaisNovo: { id: idDec(3), statusDecisao: 'pendente', desatualizado: false, nivelAprovacaoRequerido: 'cto', aprovadores: [], decisao: null },
    };
    expect(etapasDaDemanda(x)[3]).toMatchObject({ idVersao: idDec(3), estado: 'Decisão pendente', feita: false, atual: true });
    expect(proximaAcao(x)).toMatchObject({ linha: 8, link: { destino: { tipo: 'pagina', href: `/pacotes-decisao/${idDec(3)}` } } });
  });
});
