// T13 do DEC-DEM-20261111-0018-v1 (7.2, itens 3 e 4; D-14; G3.8 e G9; CV-09): a leitura nova da T05, o aprovado vigente
// para a etapa 4 quando o DEC mais novo está arquivado. Oráculo da visibilidade: a página lê o vigente **só** com o mais
// novo arquivado e um vigente na vista da demanda, **depois** de `autorizar(pessoa, 'ler_pacote_decisao')`, pelo id da
// vista (nunca da URL); com a demanda inexistente (404) ou a autorização negada, não lê nada do DEC. Molde de
// detalhe.test.ts: sessão, banco e leituras são dublês; a matriz de acesso é a real. Dados só fictícios.
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroDominio } from '../../../../lib/erros';
import type { AtorPessoa } from '../../../../modules/acesso/ator';
import { exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../modules/acesso/matriz';
import { obterDemanda, type DemandaVista, type PacoteResumo, type VersaoResumo } from '../../../../modules/demandas/consultas';
import { obterTextoRecebido } from '../../../../modules/demandas/texto-recebido';
import { obterEspecificacao } from '../../../../modules/especificacoes/consultas';
import { listarHistorico, type EventoVisivel } from '../../../../modules/historico/consultas';
import { obterPacoteDecisao, type PacoteDecisaoVista } from '../../../../modules/pacotes-decisao/consultas';
import PaginaDemanda from './page';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/demandas/DEM-20991231-0044',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('../../../../lib/deps', () => ({
  obterDeps: async () => ({ db: { dubleDoBanco: true }, relogio: { dubleDoRelogio: true }, config: { retencaoDias: 90 } }),
}));
vi.mock('../../../../modules/acesso/exigir-pessoa', () => ({ exigirPessoaNaPagina: vi.fn(), exigirPessoa: vi.fn() }));
vi.mock('../../../../modules/acesso/matriz', async (original) => {
  const real = await original<typeof import('../../../../modules/acesso/matriz')>();
  return { ...real, autorizar: vi.fn(real.autorizar) };
});
vi.mock('../../../../modules/demandas/consultas', async (original) => {
  const real = await original<typeof import('../../../../modules/demandas/consultas')>();
  return { ...real, obterDemanda: vi.fn() };
});
vi.mock('../../../../modules/demandas/texto-recebido', async (original) => {
  const real = await original<typeof import('../../../../modules/demandas/texto-recebido')>();
  return { ...real, obterTextoRecebido: vi.fn() };
});
vi.mock('../../../../modules/historico/consultas', async (original) => {
  const real = await original<typeof import('../../../../modules/historico/consultas')>();
  return { ...real, listarHistorico: vi.fn() };
});
vi.mock('../../../../modules/especificacoes/consultas', async (original) => {
  const real = await original<typeof import('../../../../modules/especificacoes/consultas')>();
  return { ...real, obterEspecificacao: vi.fn() };
});
vi.mock('../../../../modules/pacotes-decisao/consultas', async (original) => {
  const real = await original<typeof import('../../../../modules/pacotes-decisao/consultas')>();
  return { ...real, obterPacoteDecisao: vi.fn() };
});
vi.mock('./acoes', () => ({ mudarStatusNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));

const mExigirNaPagina = vi.mocked(exigirPessoaNaPagina);
const mAutorizar = vi.mocked(autorizar);
const mObter = vi.mocked(obterDemanda);
const mTexto = vi.mocked(obterTextoRecebido);
const mHistorico = vi.mocked(listarHistorico);
const mEsp = vi.mocked(obterEspecificacao);
const mDec = vi.mocked(obterPacoteDecisao);

const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'usuario-ficticio-1', nome: 'Pessoa Ficticia', papel: 'cto' };
const ID = 'DEM-20991231-0044';
const DB = { dubleDoBanco: true };
const CRIADA = new Date('2099-12-31T09:00:00Z');
const V1 = `DEC-${ID}-v1`;
const V2 = `DEC-${ID}-v2`;
const DA_URL = 'DEC-DEM-20990101-0001-v1';

const versao = (prefixo: 'ESP' | 'RSK'): VersaoResumo => ({
  id: `${prefixo}-${ID}-v1`,
  versao: 1,
  criadaEm: CRIADA,
  autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
  rascunhoAgente: false,
});
const pacote = (v: number, statusDecisao: PacoteResumo['statusDecisao'], extra: Partial<PacoteResumo> = {}): PacoteResumo => ({
  id: `DEC-${ID}-v${v}`,
  versao: v,
  criadaEm: CRIADA,
  autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
  rascunhoAgente: false,
  statusDecisao,
  desatualizado: false,
  substituido: false,
  substituidoPor: null,
  ...extra,
});

const demanda = (status: DemandaVista['status'], pacotesDecisao: PacoteResumo[]): DemandaVista => ({
  id: ID,
  titulo: 'Arquivamento com vigente (fictício)',
  tipo: 'melhoria',
  status,
  solicitanteNome: 'Pessoa Ficticia Solicitante',
  solicitantePapel: 'produto',
  linhaServicoProvavel: null,
  urgencia: 'media',
  justificativaUrgencia: null,
  contexto: 'Contexto fictício',
  descricaoProblema: null,
  impactoPercebido: null,
  anexos: [],
  duvidasEntrada: [],
  rascunhoAgente: false,
  responsavel: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
  criadaEm: CRIADA,
  atualizadaEm: CRIADA,
  especificacoes: [versao('ESP')],
  pareceresRisco: [versao('RSK')],
  pacotesDecisao,
  agentesEmAndamento: [],
  andamento: null,
});

// A vista de cada DEC, com sentinelas no que não pode chegar à tela (nome de quem aprovou, documento, comentário e quem
// decidiu).
const vistaDoDec = (id: string, statusDecisao: PacoteResumo['statusDecisao'], opcao: 'A' | 'B' | null = null): PacoteDecisaoVista =>
  ({
    id,
    demandaId: ID,
    statusDecisao,
    desatualizado: false,
    substituido: false,
    substituidoPor: null,
    nivelAprovacaoRequerido: 'cto',
    aprovadores: opcao ? [{ papel: 'cto', nome: 'SENTINELA-NOME', opcao, registradaEm: CRIADA, referenciaDocumento: 'SENTINELA-DOC', dataDocumento: null }] : [],
    decisao: opcao ? { opcaoEscolhida: opcao, comentarios: 'SENTINELA-COMENTARIO', decididaPor: 'SENTINELA-QUEM-DECIDIU', decididaEm: CRIADA } : null,
  }) as unknown as PacoteDecisaoVista;

// O dublê atende os dois ids: o v2 arquivado (o mais novo) e o v1 aprovado na opção B (o vigente).
const dublePorId = (outros: Record<string, PacoteDecisaoVista> = {}) =>
  mDec.mockImplementation(async (_db, id) => {
    const vistas: Record<string, PacoteDecisaoVista> = { [V2]: vistaDoDec(V2, 'arquivada'), [V1]: vistaDoDec(V1, 'aprovada', 'B'), ...outros };
    const v = vistas[id];
    if (!v) throw new Error(`dublê: id não esperado ${id}`);
    return v;
  });

const detalhe = async (id: string, p: Record<string, string | string[] | undefined> = {}) =>
  renderToStaticMarkup(await PaginaDemanda({ params: Promise.resolve({ id }), searchParams: Promise.resolve(p) }));

const itensDaBarra = (p: string) => {
  const i = p.indexOf('<ol aria-label="Etapas da demanda"');
  return [...p.slice(i, p.indexOf('</ol>', i)).matchAll(/<li\b([^>]*)>([\s\S]*?)<\/li>/g)].map((m) => ({ atributos: m[1]!, corpo: m[2]! }));
};
const cartao = (p: string) => {
  const i = p.indexOf('<section aria-labelledby="proxima-acao"');
  return p.slice(i, p.indexOf('</section>', i));
};
// Ordem da 1ª autorização de ler_pacote_decisao entre todas as chamadas dos dublês.
const ordemDaAutorizacao = () => mAutorizar.mock.invocationCallOrder[mAutorizar.mock.calls.findIndex(([, acao]) => acao === 'ler_pacote_decisao')]!;

beforeEach(() => {
  mExigirNaPagina.mockReset().mockResolvedValue(CTO);
  mAutorizar.mockClear();
  mObter.mockReset();
  mTexto.mockReset().mockResolvedValue({ situacao: 'sem_texto' });
  mHistorico.mockReset().mockResolvedValue([{ id: 1, ocorridoEm: CRIADA, ator: { tipo: 'sistema' }, entidade: 'demanda', entidadeId: ID, acao: 'demanda_criada', antes: null, depois: null } as EventoVisivel]);
  mEsp.mockReset().mockResolvedValue({ id: `ESP-${ID}-v1`, duvidasEmAberto: [] } as unknown as Awaited<ReturnType<typeof obterEspecificacao>>);
  mDec.mockReset();
});

describe('T05 com o DEC mais novo arquivado: leitura do vigente (G9; CV-09)', () => {
  it('v2 arquivado e v1 vigente: lê o v2 e depois o v1, ambos depois de autorizar ler_pacote_decisao, pelo id da vista e nunca o da URL', async () => {
    mObter.mockResolvedValue(demanda('aprovada', [pacote(2, 'arquivada'), pacote(1, 'aprovada')]));
    dublePorId();
    const p = await detalhe(ID, { dec: DA_URL, decId: DA_URL });
    expect(mDec.mock.calls).toEqual([
      [DB, V2],
      [DB, V1],
    ]);
    for (const ordem of mDec.mock.invocationCallOrder) expect(ordem).toBeGreaterThan(ordemDaAutorizacao());
    expect(p).not.toContain(DA_URL);
    expect(p).not.toContain('SENTINELA');
  });

  it('o HTML da barra mostra o v1 na etapa 4, "Aprovada, opção B", feita; a atual é a 5; a Próxima ação é a linha 10 com o link do v1', async () => {
    mObter.mockResolvedValue(demanda('aprovada', [pacote(2, 'arquivada'), pacote(1, 'aprovada')]));
    dublePorId();
    const p = await detalhe(ID);
    const [, , , decisao, pedido] = itensDaBarra(p);
    expect(decisao!.corpo).toContain(`>${V1}</span>`);
    expect(decisao!.corpo).not.toContain(V2);
    expect(decisao!.corpo).toContain('>Aprovada, opção B</span>');
    expect(decisao!.corpo).toContain('data-marca="feita"');
    expect(decisao!.atributos).not.toContain('aria-current');
    expect(pedido!.atributos).toContain('aria-current="step"');
    expect(p.match(/aria-current="step"/g)).toHaveLength(1);
    expect(cartao(p)).toContain('Gerar o Pedido de Construção e, quando a construção começar, mudar o status para Em construção.');
    expect(cartao(p)).toMatch(new RegExp(`<a [^>]*href="/pacotes-decisao/${V1}"[^>]*>Abrir a decisão aprovada</a>`));
  });

  it('em Em análise com o v2 arquivado e o v1 vigente: a Próxima ação é a linha 6, com o link de hoje', async () => {
    mObter.mockResolvedValue(demanda('em_analise', [pacote(2, 'arquivada'), pacote(1, 'aprovada', { desatualizado: true })]));
    dublePorId();
    const p = await detalhe(ID);
    expect(cartao(p)).toContain('Montar o pacote de decisão.');
    expect(cartao(p)).toMatch(new RegExp(`<a [^>]*href="/demandas/${ID}/pacotes-decisao/novo"[^>]*>Montar o pacote de decisão</a>`));
    expect(mDec.mock.calls).toEqual([
      [DB, V2],
      [DB, V1],
    ]);
  });

  it.each([
    ['o mais novo arquivado sem vigente', () => demanda('em_analise', [pacote(2, 'arquivada'), pacote(1, 'devolvida')]), V2],
    ['o mais novo arquivado com o único aprovado substituído', () => demanda('em_analise', [pacote(2, 'arquivada'), pacote(1, 'aprovada', { substituido: true, substituidoPor: `DEC-${ID}-v9` })]), V2],
    ['o mais novo pendente com um vigente', () => demanda('pronta_para_decisao', [pacote(3, 'pendente'), pacote(2, 'arquivada'), pacote(1, 'aprovada')]), `DEC-${ID}-v3`],
    ['o mais novo aprovado (é o próprio vigente)', () => demanda('aprovada', [pacote(1, 'aprovada')]), V1],
    ['o mais novo devolvido com um vigente', () => demanda('em_analise', [pacote(2, 'devolvida'), pacote(1, 'aprovada')]), V2],
  ] as const)('%s: só o DEC mais novo é lido, uma vez', async (_nome, preparar, maisNovo) => {
    const d = preparar();
    const m = d.pacotesDecisao[0]!;
    mObter.mockResolvedValue(d);
    // A vista do mais novo para qualquer id: uma leitura a mais aparece na contagem de chamadas.
    mDec.mockResolvedValue(vistaDoDec(m.id, m.statusDecisao, m.statusDecisao === 'aprovada' ? 'A' : null));
    await detalhe(ID);
    expect(mDec).toHaveBeenCalledExactlyOnceWith(DB, maisNovo);
  });

  it('demanda inexistente: 404 sem nenhuma leitura de DEC nem autorização de ler_pacote_decisao', async () => {
    mObter.mockRejectedValue(new ErroDominio('nao_encontrado', 'Confira o endereço ou o id.'));
    await expect(detalhe(ID)).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mDec).not.toHaveBeenCalled();
    expect(mAutorizar).not.toHaveBeenCalledWith(CTO, 'ler_pacote_decisao');
  });

  it('ler_pacote_decisao negado: a página falha com o erro da autorização e não lê nem o mais novo nem o vigente', async () => {
    const { autorizar: autorizarReal } = await vi.importActual<typeof import('../../../../modules/acesso/matriz')>('../../../../modules/acesso/matriz');
    mObter.mockResolvedValue(demanda('aprovada', [pacote(2, 'arquivada'), pacote(1, 'aprovada')]));
    dublePorId();
    mAutorizar.mockImplementation((ator, acao) => {
      if (acao === 'ler_pacote_decisao') throw new Error('SENTINELA-NEGADO');
      autorizarReal(ator, acao);
    });
    try {
      await expect(detalhe(ID)).rejects.toThrow('SENTINELA-NEGADO');
    } finally {
      mAutorizar.mockImplementation(autorizarReal);
    }
    expect(mDec).not.toHaveBeenCalled();
  });

  it('falha na leitura do vigente sobe para a tela de erro de hoje (a página rejeita, sem HTML parcial)', async () => {
    mObter.mockResolvedValue(demanda('aprovada', [pacote(2, 'arquivada'), pacote(1, 'aprovada')]));
    dublePorId();
    const lerMaisNovo = mDec.getMockImplementation()!;
    mDec.mockImplementation(async (db, id) => {
      if (id === V1) throw new Error('SENTINELA-ERRO do vigente');
      return lerMaisNovo(db, id);
    });
    await expect(detalhe(ID)).rejects.toThrow('SENTINELA-ERRO do vigente');
  });

  it('vigente lido com outro id (vista incoerente) vira erro, e não uma barra com estado errado', async () => {
    mObter.mockResolvedValue(demanda('aprovada', [pacote(2, 'arquivada'), pacote(1, 'aprovada')]));
    dublePorId({ [V1]: vistaDoDec(`DEC-${ID}-v7`, 'aprovada', 'A') });
    await expect(detalhe(ID)).rejects.toThrow('etapas: DEC vigente incoerente');
  });
});
