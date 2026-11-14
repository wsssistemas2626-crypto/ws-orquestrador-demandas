// 06-T19-testes (qa-automacao) do DEC-DEM-20261111-0016-v1: a linha "Recebido pelo /construir em …" no HTML do
// servidor da T11 (RF-15, CA-15.1; RF-16, CA-16.3 na tela; 03, 6.1 e 6.2), nos casos que o pagina.test.ts não cobre: a
// meia-noite no fuso do sistema, os segundos do evento, a conta da administradora e a linha junto com a seção do pedido
// de um DEC aprovado vigente. Mesmos dublês do pagina.test.ts (sessão e leituras); a matriz de acesso é a real. Datas
// fixas; nenhum relógio real.
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AtorPessoa } from '../../../../modules/acesso/ator';
import { exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { obterDemanda, type DemandaVista, type VersaoResumo } from '../../../../modules/demandas/consultas';
import { obterPacoteDecisao, type PacoteDecisaoVista } from '../../../../modules/pacotes-decisao/consultas';
import { recebimentoDoPedido } from '../../../../modules/pedido-construcao/pendentes';
import PaginaDecisao from './page';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/pacotes-decisao/DEC-DEM-20261022-0042-v1',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('../../../../lib/deps', () => ({ obterDeps: async () => ({ db: { dubleDoBanco: true } }) }));
vi.mock('../../../../modules/acesso/exigir-pessoa', () => ({ exigirPessoaNaPagina: vi.fn(), exigirPessoa: vi.fn() }));
vi.mock('../../../../modules/demandas/consultas', async (original) => {
  const real = await original<typeof import('../../../../modules/demandas/consultas')>();
  return { ...real, obterDemanda: vi.fn() };
});
vi.mock('../../../../modules/pacotes-decisao/consultas', async (original) => {
  const real = await original<typeof import('../../../../modules/pacotes-decisao/consultas')>();
  return { ...real, obterPacoteDecisao: vi.fn() };
});
vi.mock('./acoes', () => ({ registrarDecisaoNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));
vi.mock('./acoes-pedido', () => ({ gerarPedidoNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));
vi.mock('../../../../modules/pedido-construcao/pendentes', () => ({ recebimentoDoPedido: vi.fn() }));
// T12 do DEC-DEM-20261111-0018-v1 (ADR-40): a leitura do vigente é dublê, sem vigente (como em pagina.test.ts).
vi.mock('../../../../modules/pacotes-decisao/substituido', async (original) => {
  const real = await original<typeof import('../../../../modules/pacotes-decisao/substituido')>();
  return { ...real, vigenteDaDemanda: vi.fn(async () => null) };
});

const mExigir = vi.mocked(exigirPessoaNaPagina);
const mDemanda = vi.mocked(obterDemanda);
const mPacote = vi.mocked(obterPacoteDecisao);
const mRecebimento = vi.mocked(recebimentoDoPedido);

const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-cto-qa', nome: 'Pessoa Ficticia CTO QA', papel: 'cto' };
const ADM: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-adm-qa', nome: 'Pessoa Ficticia Administradora QA', papel: 'administradora' };
const ID = 'DEM-20261022-0042';
const DEC = `DEC-${ID}-v1`;
const ESP = `ESP-${ID}-v2`;
const RSK = `RSK-${ID}-v1`;
const CRIADO = new Date('2026-10-22T17:05:00Z');
const APROVADO = new Date('2026-10-22T18:00:00Z');

const TEXTO_NOVO_DA_SECAO =
  'Gere o pedido. Com a busca automática do /construir ligada, ele pega o pedido gerado na busca seguinte (a cada 5 minutos), e o recebimento aparece no topo desta página. Com a busca desligada, baixe ou copie o JSON e grave-o na pasta pedidos/ da estruturaAutonoma.';

const resumo = (id: string): VersaoResumo => ({ id, versao: Number(/-v(\d+)$/.exec(id)![1]), criadaEm: CRIADO, autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' }, rascunhoAgente: false });

function demanda(extra: Partial<DemandaVista> = {}): DemandaVista {
  return {
    id: ID,
    titulo: 'Título atual da demanda (fictício)',
    tipo: 'melhoria',
    status: 'aprovada',
    solicitanteNome: 'Pessoa Ficticia',
    solicitantePapel: null,
    linhaServicoProvavel: null,
    urgencia: null,
    justificativaUrgencia: null,
    contexto: null,
    descricaoProblema: null,
    impactoPercebido: null,
    anexos: [],
    duvidasEntrada: [],
    rascunhoAgente: false,
    responsavel: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
    criadaEm: CRIADO,
    atualizadaEm: CRIADO,
    especificacoes: [resumo(ESP)],
    pareceresRisco: [resumo(RSK)],
    pacotesDecisao: [],
    agentesEmAndamento: [],
    andamento: null,
    ...extra,
  };
}

// Um DEC aprovado pelo CTO, vigente (nem substituído nem desatualizado): o caso em que a seção do pedido aparece.
function aprovado(extra: Partial<PacoteDecisaoVista> = {}): PacoteDecisaoVista {
  return {
    id: DEC,
    demandaId: ID,
    versao: 1,
    especificacaoId: ESP,
    parecerRiscoId: RSK,
    demandaTipo: 'melhoria',
    demandaTitulo: 'Pedidos duplicados no ERP (fictício)',
    demandaDescricao: 'Problema: fictício',
    resumoExecutivo: 'Resumo executivo fictício.',
    opcaoA: { descricao: 'Construir tudo (fictício)', vantagens: 'Resolve a causa (fictício)' },
    opcaoB: { descricao: 'Construir em duas entregas (fictício)' },
    recomendacao: null,
    nivelAprovacaoRequerido: 'cto',
    autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia CTO QA' },
    rascunhoAgente: false,
    criadaEm: CRIADO,
    statusDecisao: 'aprovada',
    aprovadores: [{ papel: 'cto', nome: CTO.nome, opcao: 'A', registradaEm: APROVADO, referenciaDocumento: null, dataDocumento: null }],
    desatualizado: false,
    substituido: false,
    substituidoPor: null,
    decisao: { opcaoEscolhida: 'A', comentarios: null, decididaPor: CTO.nome, decididaEm: APROVADO },
    rascunhosCitados: [],
    especificacaoCitada: {
      sistemaAlvo: 'sistema-ficticio',
      repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
      criteriosAceitePreliminares: ['Critério (fictício)'],
      definicaoDePronto: ['Pronto (fictício)'],
    },
    niveisRisco: { tecnico: 'alto', operacional: 'medio', juridico: 'baixo' },
    ...extra,
  };
}

async function pagina(): Promise<string> {
  return renderToStaticMarkup(await PaginaDecisao({ params: Promise.resolve({ decId: DEC }), searchParams: Promise.resolve({}) }));
}

// O <p> inteiro da linha e o texto dele sem tags (o SVG não tem texto).
const paragrafo = (s: string) => /<p [^>]*><svg [\s\S]*?<\/svg><span>Recebido pelo \/construir em [\s\S]*?<\/span><\/p>/.exec(s)?.[0];
const semTags = (html: string) => html.replace(/<svg [\s\S]*?<\/svg>/, '').replace(/<[^>]+>/g, '');

beforeEach(() => {
  vi.clearAllMocks();
  mExigir.mockResolvedValue(CTO);
  mPacote.mockResolvedValue(aprovado());
  mDemanda.mockResolvedValue(demanda());
  mRecebimento.mockResolvedValue(null);
});

describe('T11: "Recebido pelo /construir em …" (QA da T19)', () => {
  it('CA-15.1: à meia-noite em São Paulo a linha diz 00:00 do dia novo, e a data sai uma vez só, dentro do <time>', async () => {
    mRecebimento.mockResolvedValue(new Date('2026-11-11T03:00:00.000Z'));
    const s = await pagina();
    const p = paragrafo(s);
    expect(p).toBeDefined();
    expect(semTags(p!)).toBe('Recebido pelo /construir em 11/11/2026 às 00:00.');
    expect(p).toMatch(/<span>Recebido pelo \/construir em <time date[tT]ime="2026-11-11T03:00:00\.000Z">11\/11\/2026 às 00:00<\/time>\.<\/span><\/p>$/);
    // A frase não repete a data fora do <time> (a página parte a frase pela data).
    expect(s.split('11/11/2026 às 00:00')).toHaveLength(2);
    expect(p!.split('<time ')).toHaveLength(2);
  });

  it('CA-15.1: o datetime leva o instante do evento com os segundos; o texto mostra só até o minuto, sem arredondar', async () => {
    mRecebimento.mockResolvedValue(new Date('2026-11-11T17:32:59.999Z'));
    const p = paragrafo(await pagina());
    expect(p).toMatch(/<time date[tT]ime="2026-11-11T17:32:59\.999Z">11\/11\/2026 às 14:32<\/time>\.<\/span><\/p>$/);
    expect(semTags(p!)).toBe('Recebido pelo /construir em 11/11/2026 às 14:32.');
  });

  it('CA-15.1: a administradora vê a mesma linha que o CTO (a linha não depende do papel)', async () => {
    mRecebimento.mockResolvedValue(new Date('2026-11-11T17:32:00.000Z'));
    const doCto = paragrafo(await pagina());
    mExigir.mockResolvedValue(ADM);
    const daAdm = paragrafo(await pagina());
    expect(doCto).toBeDefined();
    expect(daAdm).toBe(doCto);
    expect(mRecebimento).toHaveBeenCalledTimes(2);
    for (const c of mRecebimento.mock.calls) expect(c[1]).toBe(DEC);
  });

  it('CA-15.1 e CA-16.3: no DEC aprovado vigente, a linha no cabeçalho e a seção do pedido com o texto novo, sem o texto do envio só manual', async () => {
    mRecebimento.mockResolvedValue(new Date('2026-11-11T17:32:00.000Z'));
    const s = await pagina();
    const recebido = s.indexOf('Recebido pelo /construir em');
    const secao = s.search(/<h2 id="pedido-construcao"[^>]*>Pedido de Construção<\/h2>/);
    expect(recebido).toBeGreaterThan(0);
    expect(secao).toBeGreaterThan(recebido);
    expect(s.slice(secao)).toContain(TEXTO_NOVO_DA_SECAO);
    expect(s.split(TEXTO_NOVO_DA_SECAO)).toHaveLength(2);
    expect(s).not.toContain('manual nesta versão');
    expect(s).not.toContain('O envio ao /construir é manual');
  });

  it('CA-15.2 e CA-16.3: sem recebimento, a seção do pedido continua com o texto novo e nenhuma linha de recebimento', async () => {
    const s = await pagina();
    expect(s).not.toContain('Recebido pelo /construir');
    expect(paragrafo(s)).toBeUndefined();
    expect(s).toContain(TEXTO_NOVO_DA_SECAO);
    expect(s).not.toContain('manual nesta versão');
  });
});
