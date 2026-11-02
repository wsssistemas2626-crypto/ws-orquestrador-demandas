// T42: T10 Ver versão de RSK (03, T10; RF-09, RF-11), o HTML do servidor: a ordem de autorização e leitura (C-04, C-17),
// os textos da 03, o conteúdo em `dl` por seção com os níveis em texto ("Risco técnico: Alto"), o aviso de versão mais
// nova e de rascunho, e nenhum botão de editar nem de excluir (RF-11). O axe fica no e2e. A sessão e as leituras são
// dublês; a matriz de acesso é a real.
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErroDominio } from '../../../../lib/erros';
import type { AtorPessoa } from '../../../../modules/acesso/ator';
import { exigirPessoa, exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../modules/acesso/matriz';
import { obterDemanda, type DemandaVista } from '../../../../modules/demandas/consultas';
import { obterParecerRisco, type ParecerRiscoVista } from '../../../../modules/pareceres-risco/consultas';
import NaoEncontrada, { metadata as metadadosDoNaoEncontrado } from './not-found';
import PaginaParecer, { generateMetadata } from './page';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('../../../../lib/deps', () => ({ obterDeps: async () => ({ db: { dubleDoBanco: true } }) }));
vi.mock('../../../../modules/acesso/exigir-pessoa', () => ({ exigirPessoaNaPagina: vi.fn(), exigirPessoa: vi.fn() }));
vi.mock('../../../../modules/acesso/matriz', async (original) => {
  const real = await original<typeof import('../../../../modules/acesso/matriz')>();
  return { ...real, autorizar: vi.fn(real.autorizar) };
});
vi.mock('../../../../modules/demandas/consultas', async (original) => {
  const real = await original<typeof import('../../../../modules/demandas/consultas')>();
  return { ...real, obterDemanda: vi.fn() };
});
vi.mock('../../../../modules/pareceres-risco/consultas', async (original) => {
  const real = await original<typeof import('../../../../modules/pareceres-risco/consultas')>();
  return { ...real, obterParecerRisco: vi.fn() };
});

const mExigirNaPagina = vi.mocked(exigirPessoaNaPagina);
const mExigir = vi.mocked(exigirPessoa);
const mAutorizar = vi.mocked(autorizar);
const mObter = vi.mocked(obterDemanda);
const mRsk = vi.mocked(obterParecerRisco);

const ADM: AtorPessoa = { tipo: 'pessoa', usuarioId: 'usuario-ficticio-2', nome: 'Pessoa Ficticia', papel: 'administradora' };
const ID = 'DEM-20261022-0042';
const RSK = `RSK-${ID}-v1`;
const DB = { dubleDoBanco: true };
const CRIADA = new Date('2026-10-22T17:10:00Z');

type Rsk = ParecerRiscoVista & { versaoMaisNova: string; especificacaoMaisNova: string | null };
function rsk(extra: Partial<Rsk> = {}): Rsk {
  return {
    id: RSK,
    demandaId: ID,
    versao: 1,
    resumo: 'Resumo fictício\ncom duas linhas',
    riscoTecnicoNivel: 'alto',
    riscoTecnicoComentario: 'Integração frágil (fictício)',
    riscoOperacionalNivel: 'medio',
    riscoOperacionalComentario: null,
    riscoJuridicoNivel: 'baixo',
    riscoJuridicoComentario: null,
    recomendacoesMitigacao: ['Mitigação A (fictício)', 'Mitigação B (fictício)'],
    preCondicoes: [],
    envolverJuridicoOuAdministradoraQuando: null,
    autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
    rascunhoAgente: false,
    criadaEm: CRIADA,
    versaoMaisNova: RSK,
    especificacaoMaisNova: `ESP-${ID}-v2`,
    ...extra,
  };
}

const demanda = (extra: Partial<DemandaVista> = {}) => ({ id: ID, titulo: 'Pedidos duplicados (fictício)', ...extra }) as DemandaVista;

async function pagina(rskId = RSK): Promise<string> {
  return renderToStaticMarkup(await PaginaParecer({ params: Promise.resolve({ rskId }) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mExigirNaPagina.mockResolvedValue(ADM);
  mExigir.mockResolvedValue(ADM);
  mRsk.mockResolvedValue(rsk());
  mObter.mockResolvedValue(demanda());
});

describe('T10 RSK: acesso e leitura', () => {
  it('pessoa (C-04) → ler_parecer_risco → a versão → ler_demanda → a demanda dela (para o título)', async () => {
    await pagina();
    expect(mExigirNaPagina).toHaveBeenCalledWith(`/pareceres-risco/${RSK}`);
    expect(mAutorizar.mock.calls.map((c) => c[1])).toEqual(['ler_parecer_risco', 'ler_demanda']);
    expect(mRsk).toHaveBeenCalledWith(DB, RSK);
    expect(mObter).toHaveBeenCalledWith(DB, ID);
    expect(mAutorizar.mock.invocationCallOrder[0]!).toBeLessThan(mRsk.mock.invocationCallOrder[0]!);
  });

  it('C-17: id fora do formato, ou de ESP/DEC, dá 404 sem ler nada; retorno do login é a fila', async () => {
    for (const id of ['qualquer-coisa', `ESP-${ID}-v1`, `DEC-${ID}-v1`, `RSK-${ID}-v12345`, `rsk-${ID}-v1`]) {
      await expect(pagina(id)).rejects.toThrow('NEXT_NOT_FOUND');
      expect(mExigirNaPagina).toHaveBeenLastCalledWith('/demandas');
    }
    expect(mRsk).not.toHaveBeenCalled();
  });

  it('versão que não existe: 404; outra falha sobe para a tela de erro (2.8)', async () => {
    mRsk.mockRejectedValueOnce(new ErroDominio('nao_encontrado', 'x'));
    await expect(pagina()).rejects.toThrow('NEXT_NOT_FOUND');
    mRsk.mockRejectedValueOnce(new Error('banco fora'));
    await expect(pagina()).rejects.toThrow('banco fora');
  });

  it('título da aba: o da tela; sem sessão, o mesmo título sem dizer se a versão existe; com pessoa e versão inexistente, 404', async () => {
    await expect(generateMetadata({ params: Promise.resolve({ rskId: RSK }) })).resolves.toEqual({ title: 'Parecer de risco' });
    mExigir.mockRejectedValueOnce(new ErroDominio('nao_autenticado', 'x'));
    mRsk.mockClear();
    await expect(generateMetadata({ params: Promise.resolve({ rskId: `RSK-${ID}-v9` }) })).resolves.toEqual({ title: 'Parecer de risco' });
    expect(mRsk).not.toHaveBeenCalled();
    await expect(generateMetadata({ params: Promise.resolve({ rskId: 'qualquer' }) })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('404 da versão: "Versão não encontrada", o texto da 2.8 e "Voltar para a fila", sem dado nenhum', () => {
    const s = renderToStaticMarkup(NaoEncontrada());
    expect(s).toContain('<h1>Versão não encontrada</h1>');
    expect(s).toContain('Confira o endereço ou o id. A demanda, a versão ou o pacote podem não existir.');
    expect(s).toMatch(/<a [^>]*href="\/demandas"[^>]*>Voltar para a fila<\/a>/);
    expect(metadadosDoNaoEncontrado).toEqual({ title: 'Versão não encontrada' });
  });
});

describe('T10 RSK: HTML', () => {
  it('cabeçalho, h1, autoria, "não muda" e as ações; nada de editar nem de excluir (RF-11)', async () => {
    const s = await pagina();
    expect(s).toContain(`<span class="font-mono">${RSK}</span>`);
    expect(s).toMatch(/<h1[^>]*>Parecer de risco v1 — Pedidos duplicados \(fictício\)<\/h1>/);
    expect(s).toMatch(/Criada em <time date[tT]ime="2026-10-22T17:10:00.000Z">22\/10\/2026 às 14:10<\/time> por Pessoa Ficticia</);
    expect(s).toContain('Esta versão não muda. Para corrigir, crie uma nova versão a partir dela.');
    expect(s).toMatch(new RegExp(`<a [^>]*href="/demandas/${ID}/pareceres-risco/novo\\?base=${RSK}"[^>]*>Criar nova versão a partir desta</a>`));
    expect(s).toMatch(new RegExp(`<a [^>]*href="/demandas/${ID}"[^>]*>Voltar para a demanda</a>`));
    expect(s).not.toMatch(/Editar|Excluir|Apagar|<form|<button/);
    expect(s).not.toContain('Rascunho');
    expect(s).not.toContain('Existe uma versão mais nova');
  });

  it('conteúdo em dl por seção, com h2 por grupo; níveis em texto, nunca só a cor; vazio "Não informado.", lista vazia "Nenhum item."', async () => {
    const s = await pagina();
    const h2 = [...s.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1]);
    expect(h2).toEqual(['Resumo', 'Risco técnico', 'Risco operacional', 'Risco jurídico', 'Recomendações de mitigação', 'Pré-condições', 'Quando envolver o jurídico ou a administradora']);
    expect(s.match(/<dl\b/g)).toHaveLength(7);
    expect(s).toMatch(/<dt[^>]*>Resumo<\/dt><dd[^>]*>Resumo fictício\ncom duas linhas<\/dd>/);
    expect(s).toMatch(/<dt[^>]*>Nível<\/dt><dd[^>]*>Risco técnico: Alto<\/dd>/);
    expect(s).toMatch(/<dt[^>]*>Nível<\/dt><dd[^>]*>Risco operacional: Médio<\/dd>/);
    expect(s).toMatch(/<dt[^>]*>Nível<\/dt><dd[^>]*>Risco jurídico: Baixo<\/dd>/);
    expect(s).toMatch(/<dt[^>]*>Comentário<\/dt><dd[^>]*>Integração frágil \(fictício\)<\/dd>/);
    expect(s).toMatch(/<dt[^>]*>Comentário<\/dt><dd[^>]*>Não informado\.<\/dd>/);
    expect(s).toMatch(/<dt[^>]*>Recomendações de mitigação<\/dt><dd[^>]*><ul[^>]*><li>Mitigação A \(fictício\)<\/li><li>Mitigação B \(fictício\)<\/li><\/ul><\/dd>/);
    expect(s).toMatch(/<dt[^>]*>Pré-condições<\/dt><dd[^>]*>Nenhum item\.<\/dd>/);
  });

  it('rascunho de agente: o selo, a autoria pelo agente e o aviso', async () => {
    mRsk.mockResolvedValue(rsk({ rascunhoAgente: true, autor: { tipo: 'agente', agente: 'risco' } }));
    const s = await pagina();
    expect(s).toContain('>Rascunho de agente</span>');
    expect(s).toContain('por Agente de risco');
    expect(s).toContain('Rascunho do agente de risco. Leia com atenção: o conteúdo foi gerado por IA a partir do texto do pedido.');
  });

  it('versão mais nova existe: "Existe uma versão mais nova: RSK-…-v2." com link', async () => {
    mRsk.mockResolvedValue(rsk({ versaoMaisNova: `RSK-${ID}-v2` }));
    const s = await pagina();
    expect(s).toMatch(new RegExp(`Existe uma versão mais nova: <a [^>]*href="/pareceres-risco/RSK-${ID}-v2"[^>]*>RSK-${ID}-v2</a>\\.`));
  });

  it('C-18: o conteúdo é texto', async () => {
    mRsk.mockResolvedValue(rsk({ resumo: '<img src=x onerror="window.__x=1">', preCondicoes: ['<script>window.__x=2</script>'] }));
    mObter.mockResolvedValue(demanda({ titulo: '<b>Título</b>' }));
    const s = await pagina();
    expect(s).not.toMatch(/<img|<script|<b>/);
    expect(s).toContain('&lt;img src=x onerror=&quot;window.__x=1&quot;&gt;');
  });
});
