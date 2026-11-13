// T42: T08 Novo parecer de risco (03, T08), o HTML do servidor da página: a ordem de autorização e leitura (C-04, C-17),
// a versão de partida (o RSK mais novo ou `?base=` da T10, só da mesma demanda), os textos da 03 e o formulário no
// primeiro estado. Envio, foco e axe ficam no e2e (e2e/parecer-risco.spec.ts). A sessão e as leituras são dublês; a
// matriz de acesso é a real. Datas fixas, sem relógio.
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { idDoCampo } from '../../../../../../components/formulario';
import { idDoItem } from '../../../../../../components/lista-textos';
import type { AtorPessoa } from '../../../../../../modules/acesso/ator';
import { exigirPessoaNaPagina } from '../../../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../../../modules/acesso/matriz';
import { obterDemanda, type DemandaVista, type VersaoResumo } from '../../../../../../modules/demandas/consultas';
import { obterParecerRisco, type ParecerRiscoVista } from '../../../../../../modules/pareceres-risco/consultas';
import PaginaNovoParecer, { generateMetadata } from './page';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/demandas/DEM-20261022-0042/pareceres-risco/novo',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('../../../../../../lib/deps', () => ({ obterDeps: async () => ({ db: { dubleDoBanco: true } }) }));
vi.mock('../../../../../../modules/acesso/exigir-pessoa', () => ({ exigirPessoaNaPagina: vi.fn(), exigirPessoa: vi.fn() }));
vi.mock('../../../../../../modules/acesso/matriz', async (original) => {
  const real = await original<typeof import('../../../../../../modules/acesso/matriz')>();
  return { ...real, autorizar: vi.fn(real.autorizar) };
});
vi.mock('../../../../../../modules/demandas/consultas', async (original) => {
  const real = await original<typeof import('../../../../../../modules/demandas/consultas')>();
  return { ...real, obterDemanda: vi.fn() };
});
vi.mock('../../../../../../modules/pareceres-risco/consultas', async (original) => {
  const real = await original<typeof import('../../../../../../modules/pareceres-risco/consultas')>();
  return { ...real, obterParecerRisco: vi.fn() };
});
// A Server Action não roda aqui: o HTML do primeiro estado não envia nada.
vi.mock('./acoes', () => ({ gravarParecerNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));

const mExigir = vi.mocked(exigirPessoaNaPagina);
const mAutorizar = vi.mocked(autorizar);
const mObter = vi.mocked(obterDemanda);
const mRsk = vi.mocked(obterParecerRisco);

const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'usuario-ficticio-1', nome: 'Pessoa Ficticia', papel: 'cto' };
const ID = 'DEM-20261022-0042';
const OUTRA = 'DEM-20261022-0001';
const DB = { dubleDoBanco: true };
const CRIADA = new Date('2026-10-22T17:05:00Z');

const resumo = (prefixo: 'ESP' | 'RSK', v: number, demanda = ID): VersaoResumo => ({
  id: `${prefixo}-${demanda}-v${v}`,
  versao: v,
  criadaEm: CRIADA,
  autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
  rascunhoAgente: false,
});

function demanda(extra: Partial<DemandaVista> = {}): DemandaVista {
  return {
    id: ID,
    titulo: 'Pedidos duplicados (fictício)',
    tipo: 'melhoria',
    status: 'em_analise',
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
    criadaEm: CRIADA,
    atualizadaEm: CRIADA,
    especificacoes: [resumo('ESP', 3), resumo('ESP', 2), resumo('ESP', 1)],
    pareceresRisco: [],
    pacotesDecisao: [],
    agentesEmAndamento: [],
    andamento: null,
    ...extra,
  };
}

type Rsk = ParecerRiscoVista & { versaoMaisNova: string; especificacaoMaisNova: string | null };
function rsk(v: number, extra: Partial<Rsk> = {}): Rsk {
  return {
    id: `RSK-${ID}-v${v}`,
    demandaId: ID,
    versao: v,
    resumo: `Resumo da v${v} (fictício)`,
    riscoTecnicoNivel: 'alto',
    riscoTecnicoComentario: null,
    riscoOperacionalNivel: 'medio',
    riscoOperacionalComentario: null,
    riscoJuridicoNivel: 'baixo',
    riscoJuridicoComentario: null,
    recomendacoesMitigacao: [`Mitigação da v${v} (fictício)`],
    preCondicoes: [],
    envolverJuridicoOuAdministradoraQuando: null,
    autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
    rascunhoAgente: false,
    criadaEm: CRIADA,
    versaoMaisNova: `RSK-${ID}-v2`,
    especificacaoMaisNova: `ESP-${ID}-v3`,
    ...extra,
  };
}

async function pagina(id = ID, busca: Record<string, string | string[] | undefined> = {}): Promise<string> {
  return renderToStaticMarkup(await PaginaNovoParecer({ params: Promise.resolve({ id }), searchParams: Promise.resolve(busca) }));
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function etiqueta(s: string, elemento: string, atributo: string): string {
  const m = new RegExp(`<${elemento}\\b[^>]*\\s${escapar(atributo)}[^>]*>`).exec(s);
  if (!m) throw new Error(`sem <${elemento}> com ${atributo}`);
  return m[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  mExigir.mockResolvedValue(CTO);
  mObter.mockResolvedValue(demanda());
  mRsk.mockImplementation(async (_db, rskId) => rsk(Number(/-v(\d+)$/.exec(rskId)![1])));
});

describe('T08: acesso e leitura', () => {
  it('pessoa (C-04) → criar_parecer_risco → a demanda; com RSK, ler_parecer_risco antes de ler a versão de partida', async () => {
    mObter.mockResolvedValue(demanda({ pareceresRisco: [resumo('RSK', 2), resumo('RSK', 1)] }));
    await pagina();
    expect(mExigir).toHaveBeenCalledWith(`/demandas/${ID}/pareceres-risco/novo`);
    expect(mAutorizar.mock.calls.map((c) => c[1])).toEqual(['criar_parecer_risco', 'ler_parecer_risco']);
    expect(mObter).toHaveBeenCalledWith(DB, ID);
    expect(mRsk).toHaveBeenCalledWith(DB, `RSK-${ID}-v2`);
    expect(mAutorizar.mock.invocationCallOrder[1]!).toBeLessThan(mRsk.mock.invocationCallOrder[0]!);
  });

  it('sem RSK: não lê versão nenhuma', async () => {
    await pagina();
    expect(mRsk).not.toHaveBeenCalled();
    expect(mAutorizar.mock.calls.map((c) => c[1])).toEqual(['criar_parecer_risco']);
  });

  it('C-17: id fora do formato dá 404 sem tocar o banco, e o retorno do login é a fila', async () => {
    await expect(pagina('qualquer-coisa')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mExigir).toHaveBeenCalledWith('/demandas');
    expect(mObter).not.toHaveBeenCalled();
  });

  it('demanda que não existe: 404', async () => {
    const { ErroDominio } = await import('../../../../../../lib/erros');
    mObter.mockRejectedValue(new ErroDominio('nao_encontrado', 'x'));
    await expect(pagina()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('sem permissão: a matriz nega antes de ler a demanda', async () => {
    mExigir.mockResolvedValue({ ...CTO, papel: 'outro' as AtorPessoa['papel'] });
    await expect(pagina()).rejects.toThrow();
    expect(mObter).not.toHaveBeenCalled();
  });

  it('?base= da mesma demanda: parte dele; base de outra demanda, que não existe, repetida ou fora do formato: parte do mais novo, sem ler o outro', async () => {
    mObter.mockResolvedValue(demanda({ pareceresRisco: [resumo('RSK', 2), resumo('RSK', 1)] }));
    await pagina(ID, { base: `RSK-${ID}-v1` });
    expect(mRsk).toHaveBeenLastCalledWith(DB, `RSK-${ID}-v1`);
    expect(mExigir).toHaveBeenLastCalledWith(`/demandas/${ID}/pareceres-risco/novo?base=RSK-${ID}-v1`);
    for (const base of [`RSK-${OUTRA}-v1`, `RSK-${ID}-v9`, `ESP-${ID}-v1`, [`RSK-${ID}-v1`, `RSK-${ID}-v2`], '<script>']) {
      mRsk.mockClear();
      await pagina(ID, { base });
      expect(mRsk.mock.calls).toEqual([[DB, `RSK-${ID}-v2`]]);
    }
  });

  it('título da aba: o da tela', async () => {
    const { exigirPessoa } = await import('../../../../../../modules/acesso/exigir-pessoa');
    vi.mocked(exigirPessoa).mockResolvedValue(CTO);
    await expect(generateMetadata({ params: Promise.resolve({ id: ID }) })).resolves.toEqual({ title: 'Novo parecer de risco' });
  });
});

describe('T08: HTML', () => {
  it('primeiro RSK com ESP: cabeçalho, h1, a informação da 03, nenhum nível marcado, um item vazio em cada lista, "Gravar RSK-…-v1"', async () => {
    const s = await pagina();
    expect(s).toContain(`<span class="font-mono">${ID}</span> — Pedidos duplicados (fictício)`);
    expect(s).toContain('<h1>Novo parecer de risco</h1>');
    expect(s).toContain(`Este será o RSK-${ID}-v1. A especificação mais nova desta demanda é a ESP-${ID}-v3.`);
    expect(s).not.toContain('ainda não tem especificação técnica');
    for (const legenda of [
      'Risco técnico',
      'Nível do risco técnico (obrigatório)',
      'Risco operacional',
      'Nível do risco operacional (obrigatório)',
      'Risco jurídico',
      'Nível do risco jurídico (obrigatório)',
      'Recomendações de mitigação',
      'Pré-condições',
    ])
      expect(s).toContain(`>${legenda}</legend>`);
    for (const nivel of ['riscoTecnicoNivel', 'riscoOperacionalNivel', 'riscoJuridicoNivel']) {
      const nome = idDoCampo(nivel);
      expect([...s.matchAll(new RegExp(`<input type="radio" id="${nome}-(baixo|medio|alto)"`, 'g'))].map((m) => m[1])).toEqual(['baixo', 'medio', 'alto']);
      for (const v of ['baixo', 'medio', 'alto']) expect(etiqueta(s, 'input', `id="${nome}-${v}"`)).not.toContain('checked');
    }
    for (const rotulo of ['Baixo', 'Médio', 'Alto']) expect(s.match(new RegExp(`>${rotulo}</label>`, 'g'))).toHaveLength(3);
    expect(s.match(/class="font-medium">Comentário<\/label>/g)).toHaveLength(3);
    for (const rotulo of ['Resumo', 'Quando envolver o jurídico ou a administradora']) expect(s).toContain(`class="font-medium">${rotulo}</label>`);
    expect(s).toContain('Um item por pré-condição. O que precisa estar resolvido antes de construir.');
    expect(s).toContain('Situações em que a decisão precisa passar pelo jurídico ou pela administradora.');
    for (const campo of ['recomendacoesMitigacao', 'preCondicoes']) {
      expect(etiqueta(s, 'input', `id="${idDoItem(campo, 0)}"`)).toContain('value=""');
      expect(s).not.toContain(`id="${idDoItem(campo, 1)}"`);
    }
    expect(s).toMatch(new RegExp(`<button type="submit"[^>]*>Gravar RSK-${ID}-v1</button>`));
    expect(s).toContain(`href="/demandas/${ID}">Cancelar</a>`);
    expect(s).toMatch(/<form\b[^>]*\snovalidate=""/i);
  });

  it('sem ESP: o aviso da 03 no lugar da informação, e o formulário continua (a gravação é permitida)', async () => {
    mObter.mockResolvedValue(demanda({ especificacoes: [] }));
    const s = await pagina();
    expect(s).toContain('Esta demanda ainda não tem especificação técnica. Você pode gravar o parecer, mas o pacote de decisão vai exigir as duas.');
    expect(s).not.toContain('A especificação mais nova');
    expect(s).toMatch(new RegExp(`>Gravar RSK-${ID}-v1</button>`));
  });

  it('v3 a partir da v2 (a mais nova): a informação, os níveis marcados, os campos preenchidos e "Gravar RSK-…-v3"', async () => {
    mObter.mockResolvedValue(demanda({ pareceresRisco: [resumo('RSK', 2), resumo('RSK', 1)] }));
    const s = await pagina();
    expect(s).toContain(`Este será o RSK-${ID}-v3. A especificação mais nova desta demanda é a ESP-${ID}-v3.`);
    expect(s).toContain('>Resumo da v2 (fictício)</textarea>');
    expect(etiqueta(s, 'input', `id="${idDoCampo('riscoTecnicoNivel')}-alto"`)).toContain('checked=""');
    expect(etiqueta(s, 'input', `id="${idDoCampo('riscoOperacionalNivel')}-medio"`)).toContain('checked=""');
    expect(etiqueta(s, 'input', `id="${idDoCampo('riscoJuridicoNivel')}-baixo"`)).toContain('checked=""');
    expect(etiqueta(s, 'input', `id="${idDoCampo('riscoTecnicoNivel')}-baixo"`)).not.toContain('checked');
    expect(etiqueta(s, 'input', `id="${idDoItem('recomendacoesMitigacao', 0)}"`)).toContain('value="Mitigação da v2 (fictício)"');
    expect(s).toMatch(new RegExp(`>Gravar RSK-${ID}-v3</button>`));
    expect(s).not.toContain('rascunho do agente');
  });

  it('base da T10 (v1) de rascunho de agente: parte dela e avisa para revisar', async () => {
    mObter.mockResolvedValue(demanda({ pareceresRisco: [resumo('RSK', 2), resumo('RSK', 1)] }));
    mRsk.mockResolvedValue(rsk(1, { rascunhoAgente: true, autor: { tipo: 'agente', agente: 'risco' } }));
    const s = await pagina(ID, { base: `RSK-${ID}-v1` });
    expect(s).toContain(`Este será o RSK-${ID}-v3.`);
    expect(s).toContain('Os campos vieram da v1, um rascunho do agente de risco. Revise antes de gravar.');
    expect(s).toContain('>Resumo da v1 (fictício)</textarea>');
  });

  it('C-18: título da demanda e campos da versão aparecem como texto', async () => {
    mObter.mockResolvedValue(demanda({ titulo: '<script>window.__x=1</script>', pareceresRisco: [resumo('RSK', 1)] }));
    mRsk.mockResolvedValue(rsk(1, { resumo: '<img src=x onerror="window.__x=2">' }));
    const s = await pagina();
    expect(s).not.toContain('<script>');
    expect(s).not.toContain('<img');
    expect(s).toContain('&lt;script&gt;window.__x=1&lt;/script&gt;');
  });
});
