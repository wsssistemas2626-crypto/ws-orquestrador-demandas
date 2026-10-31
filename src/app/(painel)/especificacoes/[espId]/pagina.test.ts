// T41: T10 Ver versão de ESP (03, T10; RF-08, RF-11), o HTML do servidor: a ordem de autorização e leitura (C-04, C-17),
// os textos da 03, o conteúdo em `dl` por seção, o aviso de versão mais nova e de rascunho, e nenhum botão de editar nem
// de excluir (RF-11). O axe fica no e2e. A sessão e as leituras são dublês; a matriz de acesso é a real.
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AtorPessoa } from '../../../../modules/acesso/ator';
import { exigirPessoa, exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../modules/acesso/matriz';
import { obterDemanda, type DemandaVista } from '../../../../modules/demandas/consultas';
import { obterEspecificacao, type EspecificacaoVista } from '../../../../modules/especificacoes/consultas';
import { ErroDominio } from '../../../../lib/erros';
import NaoEncontrada, { metadata as metadadosDoNaoEncontrado } from './not-found';
import PaginaEspecificacao, { generateMetadata } from './page';

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
vi.mock('../../../../modules/especificacoes/consultas', async (original) => {
  const real = await original<typeof import('../../../../modules/especificacoes/consultas')>();
  return { ...real, obterEspecificacao: vi.fn() };
});

const mExigirNaPagina = vi.mocked(exigirPessoaNaPagina);
const mExigir = vi.mocked(exigirPessoa);
const mAutorizar = vi.mocked(autorizar);
const mObter = vi.mocked(obterDemanda);
const mEsp = vi.mocked(obterEspecificacao);

const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'usuario-ficticio-1', nome: 'Pessoa Ficticia', papel: 'cto' };
const ID = 'DEM-20261022-0042';
const ESP = `ESP-${ID}-v2`;
const DB = { dubleDoBanco: true };
const CRIADA = new Date('2026-10-22T17:10:00Z');

function esp(extra: Partial<EspecificacaoVista & { versaoMaisNova: string }> = {}): EspecificacaoVista & { versaoMaisNova: string } {
  return {
    id: ESP,
    demandaId: ID,
    versao: 2,
    descricaoObjetiva: 'Descrição fictícia\ncom duas linhas',
    situacaoAtual: null,
    situacaoDesejada: 'Situação desejada fictícia',
    escopoInclui: ['Inclui A (fictício)', 'Inclui B (fictício)'],
    escopoExclui: [],
    sistemasErp: null,
    sistemasEcommerceMarketplace: null,
    sistemasApisTerceiros: null,
    sistemasServicosInternos: null,
    dadosEntidades: null,
    dadosCamposCriticos: null,
    restricoesTecnicas: null,
    duvidasEmAberto: [],
    sistemaAlvo: 'sistema-ficticio',
    repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
    criteriosAceitePreliminares: ['Critério fictício'],
    definicaoDePronto: null,
    autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
    rascunhoAgente: false,
    criadaEm: CRIADA,
    versaoMaisNova: ESP,
    ...extra,
  };
}

const demanda = (extra: Partial<DemandaVista> = {}) => ({ id: ID, titulo: 'Pedidos duplicados (fictício)', ...extra }) as DemandaVista;

async function pagina(espId = ESP): Promise<string> {
  return renderToStaticMarkup(await PaginaEspecificacao({ params: Promise.resolve({ espId }) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mExigirNaPagina.mockResolvedValue(CTO);
  mExigir.mockResolvedValue(CTO);
  mEsp.mockResolvedValue(esp());
  mObter.mockResolvedValue(demanda());
});

describe('T10 ESP: acesso e leitura', () => {
  it('pessoa (C-04) → ler_especificacao → a versão → ler_demanda → a demanda dela (para o título)', async () => {
    await pagina();
    expect(mExigirNaPagina).toHaveBeenCalledWith(`/especificacoes/${ESP}`);
    expect(mAutorizar.mock.calls.map((c) => c[1])).toEqual(['ler_especificacao', 'ler_demanda']);
    expect(mEsp).toHaveBeenCalledWith(DB, ESP);
    expect(mObter).toHaveBeenCalledWith(DB, ID);
    expect(mAutorizar.mock.invocationCallOrder[0]!).toBeLessThan(mEsp.mock.invocationCallOrder[0]!);
  });

  it('C-17: id fora do formato, ou de RSK/DEC, dá 404 sem ler nada; retorno do login é a fila', async () => {
    for (const id of ['qualquer-coisa', `RSK-${ID}-v1`, `DEC-${ID}-v1`, `ESP-${ID}-v12345`]) {
      await expect(pagina(id)).rejects.toThrow('NEXT_NOT_FOUND');
      expect(mExigirNaPagina).toHaveBeenLastCalledWith('/demandas');
    }
    expect(mEsp).not.toHaveBeenCalled();
  });

  it('versão que não existe: 404; outra falha sobe para a tela de erro (2.8)', async () => {
    mEsp.mockRejectedValueOnce(new ErroDominio('nao_encontrado', 'x'));
    await expect(pagina()).rejects.toThrow('NEXT_NOT_FOUND');
    mEsp.mockRejectedValueOnce(new Error('banco fora'));
    await expect(pagina()).rejects.toThrow('banco fora');
  });

  it('título da aba: o da tela; sem sessão, o mesmo título sem dizer se a versão existe; com pessoa e versão inexistente, 404', async () => {
    await expect(generateMetadata({ params: Promise.resolve({ espId: ESP }) })).resolves.toEqual({ title: 'Especificação técnica' });
    mExigir.mockRejectedValueOnce(new ErroDominio('nao_autenticado', 'x'));
    mEsp.mockClear();
    await expect(generateMetadata({ params: Promise.resolve({ espId: `ESP-${ID}-v9` }) })).resolves.toEqual({ title: 'Especificação técnica' });
    expect(mEsp).not.toHaveBeenCalled();
    await expect(generateMetadata({ params: Promise.resolve({ espId: 'qualquer' }) })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('404 da versão: "Versão não encontrada", o texto da 2.8 e "Voltar para a fila", sem dado nenhum', () => {
    const s = renderToStaticMarkup(NaoEncontrada());
    expect(s).toContain('<h1>Versão não encontrada</h1>');
    expect(s).toContain('Confira o endereço ou o id. A demanda, a versão ou o pacote podem não existir.');
    expect(s).toMatch(/<a [^>]*href="\/demandas"[^>]*>Voltar para a fila<\/a>/);
    expect(metadadosDoNaoEncontrado).toEqual({ title: 'Versão não encontrada' });
  });
});

describe('T10 ESP: HTML', () => {
  it('cabeçalho, h1, autoria, "não muda" e as ações; nada de editar nem de excluir (RF-11)', async () => {
    const s = await pagina();
    expect(s).toContain(`<span class="font-mono">${ESP}</span>`);
    expect(s).toMatch(/<h1[^>]*>Especificação técnica v2 — Pedidos duplicados \(fictício\)<\/h1>/);
    expect(s).toMatch(/Criada em <time date[tT]ime="2026-10-22T17:10:00.000Z">22\/10\/2026 às 14:10<\/time> por Pessoa Ficticia</);
    expect(s).toContain('Esta versão não muda. Para corrigir, crie uma nova versão a partir dela.');
    expect(s).toMatch(new RegExp(`<a [^>]*href="/demandas/${ID}/especificacoes/nova\\?base=${ESP}"[^>]*>Criar nova versão a partir desta</a>`));
    expect(s).toMatch(new RegExp(`<a [^>]*href="/demandas/${ID}"[^>]*>Voltar para a demanda</a>`));
    expect(s).not.toMatch(/Editar|Excluir|Apagar|<form|<button/);
    expect(s).not.toContain('Rascunho');
    expect(s).not.toContain('Existe uma versão mais nova');
  });

  it('conteúdo em dl por seção, com h2 por grupo; vazio "Não informado.", lista vazia "Nenhum item.", listas como listas', async () => {
    const s = await pagina();
    const h2 = [...s.matchAll(/<h2[^>]*>([^<]+)<\/h2>/g)].map((m) => m[1]);
    expect(h2).toEqual(['Problema', 'Escopo', 'Sistemas envolvidos', 'Dados', 'Restrições técnicas', 'Dúvidas em aberto', 'Construção']);
    expect(s.match(/<dl\b/g)).toHaveLength(7);
    expect(s).toMatch(/<dt[^>]*>Descrição objetiva<\/dt><dd[^>]*>Descrição fictícia\ncom duas linhas<\/dd>/);
    expect(s).toMatch(/<dt[^>]*>Situação atual<\/dt><dd[^>]*>Não informado\.<\/dd>/);
    expect(s).toMatch(/<dt[^>]*>Escopo inclui<\/dt><dd[^>]*><ul[^>]*><li>Inclui A \(fictício\)<\/li><li>Inclui B \(fictício\)<\/li><\/ul><\/dd>/);
    expect(s).toMatch(/<dt[^>]*>Escopo exclui<\/dt><dd[^>]*>Nenhum item\.<\/dd>/);
    expect(s).toMatch(/<dt[^>]*>Definição de pronto<\/dt><dd[^>]*>Nenhum item\.<\/dd>/);
    expect(s).toMatch(/<dt[^>]*>Repositório destino<\/dt><dd[^>]*>wsssistemas2626-crypto\/sistema-ficticio<\/dd>/);
  });

  it('rascunho de agente: o selo, a autoria pelo agente e o aviso da 03', async () => {
    mEsp.mockResolvedValue(esp({ rascunhoAgente: true, autor: { tipo: 'agente', agente: 'insumo_tecnico' } }));
    const s = await pagina();
    expect(s).toContain('>Rascunho de agente</span>');
    expect(s).toContain('por Agente de insumo técnico');
    expect(s).toContain('Rascunho do agente de insumo técnico. Leia com atenção: o conteúdo foi gerado por IA a partir do texto do pedido.');
  });

  it('versão mais nova existe: "Existe uma versão mais nova: ESP-…-v3." com link', async () => {
    mEsp.mockResolvedValue(esp({ versaoMaisNova: `ESP-${ID}-v3` }));
    const s = await pagina();
    expect(s).toMatch(new RegExp(`Existe uma versão mais nova: <a [^>]*href="/especificacoes/ESP-${ID}-v3"[^>]*>ESP-${ID}-v3</a>\\.`));
  });

  it('C-18: o conteúdo é texto', async () => {
    mEsp.mockResolvedValue(esp({ descricaoObjetiva: '<img src=x onerror="window.__x=1">', escopoInclui: ['<script>window.__x=2</script>'] }));
    mObter.mockResolvedValue(demanda({ titulo: '<b>Título</b>' }));
    const s = await pagina();
    expect(s).not.toMatch(/<img|<script|<b>/);
    expect(s).toContain('&lt;img src=x onerror=&quot;window.__x=1&quot;&gt;');
  });
});
