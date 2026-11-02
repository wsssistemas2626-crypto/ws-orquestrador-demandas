// T41: T07 Nova versão da especificação técnica (03, T07), o HTML do servidor da página: a ordem de autorização e
// leitura (C-04, C-17), a versão de partida (a mais nova ou `?base=` da T10, só da mesma demanda), os textos da 03 e o
// formulário no primeiro estado. Envio, foco, diálogo e axe ficam no e2e (e2e/especificacao.spec.ts). A sessão e as
// leituras são dublês; a matriz de acesso é a real. Datas fixas, sem relógio.
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ID_REPOSITORIO_DESTINO } from '../../../../../../components/dados-da-especificacao';
import { idDoCampo } from '../../../../../../components/formulario';
import { idDoItem } from '../../../../../../components/lista-textos';
import type { AtorPessoa } from '../../../../../../modules/acesso/ator';
import { exigirPessoaNaPagina } from '../../../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../../../modules/acesso/matriz';
import { obterDemanda, type DemandaVista, type VersaoResumo } from '../../../../../../modules/demandas/consultas';
import { obterEspecificacao, type EspecificacaoVista } from '../../../../../../modules/especificacoes/consultas';
import PaginaNovaEspecificacao from './page';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/demandas/DEM-20261022-0042/especificacoes/nova',
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
vi.mock('../../../../../../modules/especificacoes/consultas', async (original) => {
  const real = await original<typeof import('../../../../../../modules/especificacoes/consultas')>();
  return { ...real, obterEspecificacao: vi.fn() };
});
// A Server Action não roda aqui: o HTML do primeiro estado não envia nada.
vi.mock('./acoes', () => ({ gravarEspecificacaoNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));

const mExigir = vi.mocked(exigirPessoaNaPagina);
const mAutorizar = vi.mocked(autorizar);
const mObter = vi.mocked(obterDemanda);
const mEsp = vi.mocked(obterEspecificacao);

const ADM: AtorPessoa = { tipo: 'pessoa', usuarioId: 'usuario-ficticio-2', nome: 'Pessoa Ficticia', papel: 'administradora' };
const ID = 'DEM-20261022-0042';
const OUTRA = 'DEM-20261022-0001';
const DB = { dubleDoBanco: true };
const CRIADA = new Date('2026-10-22T17:05:00Z');

const resumo = (v: number, demanda = ID): VersaoResumo => ({ id: `ESP-${demanda}-v${v}`, versao: v, criadaEm: CRIADA, autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' }, rascunhoAgente: false });

function demanda(extra: Partial<DemandaVista> = {}): DemandaVista {
  return {
    id: ID,
    titulo: 'Pedidos duplicados (fictício)',
    tipo: 'melhoria',
    status: 'nova',
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
    especificacoes: [],
    pareceresRisco: [],
    pacotesDecisao: [],
    agentesEmAndamento: [],
    ...extra,
  };
}

function esp(v: number, extra: Partial<EspecificacaoVista> = {}): EspecificacaoVista & { versaoMaisNova: string } {
  return {
    id: `ESP-${ID}-v${v}`,
    demandaId: ID,
    versao: v,
    descricaoObjetiva: `Descrição da v${v} (fictício)`,
    situacaoAtual: null,
    situacaoDesejada: null,
    escopoInclui: [`Inclui da v${v} (fictício)`],
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
    repositorioDestino: 'fabianojp06/sistema-ficticio',
    criteriosAceitePreliminares: ['Critério (fictício)'],
    definicaoDePronto: ['Pronto (fictício)'],
    autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
    rascunhoAgente: false,
    criadaEm: CRIADA,
    versaoMaisNova: `ESP-${ID}-v2`,
    ...extra,
  };
}

async function pagina(id = ID, busca: Record<string, string | string[] | undefined> = {}): Promise<string> {
  return renderToStaticMarkup(await PaginaNovaEspecificacao({ params: Promise.resolve({ id }), searchParams: Promise.resolve(busca) }));
}

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function etiqueta(s: string, elemento: string, atributo: string): string {
  const m = new RegExp(`<${elemento}\\b[^>]*\\s${escapar(atributo)}[^>]*>`).exec(s);
  if (!m) throw new Error(`sem <${elemento}> com ${atributo}`);
  return m[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  mExigir.mockResolvedValue(ADM);
  mObter.mockResolvedValue(demanda());
  mEsp.mockImplementation(async (_db, espId) => esp(Number(/-v(\d+)$/.exec(espId)![1])));
});

describe('T07: acesso e leitura', () => {
  it('pessoa (C-04) → criar_especificacao → a demanda; com ESP, ler_especificacao antes de ler a versão de partida', async () => {
    mObter.mockResolvedValue(demanda({ especificacoes: [resumo(2), resumo(1)] }));
    await pagina();
    expect(mExigir).toHaveBeenCalledWith(`/demandas/${ID}/especificacoes/nova`);
    expect(mAutorizar.mock.calls.map((c) => c[1])).toEqual(['criar_especificacao', 'ler_especificacao']);
    expect(mObter).toHaveBeenCalledWith(DB, ID);
    expect(mEsp).toHaveBeenCalledWith(DB, `ESP-${ID}-v2`);
    expect(mAutorizar.mock.invocationCallOrder[1]!).toBeLessThan(mEsp.mock.invocationCallOrder[0]!);
  });

  it('sem ESP: não lê versão nenhuma', async () => {
    await pagina();
    expect(mEsp).not.toHaveBeenCalled();
    expect(mAutorizar.mock.calls.map((c) => c[1])).toEqual(['criar_especificacao']);
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
    mExigir.mockResolvedValue({ ...ADM, papel: 'outro' as AtorPessoa['papel'] });
    await expect(pagina()).rejects.toThrow();
    expect(mObter).not.toHaveBeenCalled();
  });

  it('?base= da mesma demanda: parte dela; base de outra demanda, repetida ou fora do formato: parte da mais nova, sem ler a outra', async () => {
    mObter.mockResolvedValue(demanda({ especificacoes: [resumo(2), resumo(1)] }));
    await pagina(ID, { base: `ESP-${ID}-v1` });
    expect(mEsp).toHaveBeenLastCalledWith(DB, `ESP-${ID}-v1`);
    expect(mExigir).toHaveBeenLastCalledWith(`/demandas/${ID}/especificacoes/nova?base=ESP-${ID}-v1`);
    for (const base of [`ESP-${OUTRA}-v1`, `ESP-${ID}-v9`, `RSK-${ID}-v1`, [`ESP-${ID}-v1`, `ESP-${ID}-v2`], '<script>']) {
      mEsp.mockClear();
      await pagina(ID, { base });
      expect(mEsp.mock.calls).toEqual([[DB, `ESP-${ID}-v2`]]);
    }
  });
});

describe('T07: HTML', () => {
  it('primeira ESP: cabeçalho, h1, informação da v1, um item vazio em cada lista, botão "Gravar ESP-…-v1" e "Cancelar"', async () => {
    const s = await pagina();
    expect(s).toContain(`<span class="font-mono">${ID}</span> — Pedidos duplicados (fictício)`);
    expect(s).toContain('<h1>Nova versão da especificação técnica</h1>');
    expect(s).toContain('Esta será a primeira especificação técnica desta demanda, a v1.');
    for (const legenda of ['Problema', 'Escopo', 'Sistemas envolvidos', 'Dados', 'Escopo inclui', 'Escopo exclui', 'Dúvidas em aberto', 'Construção (obrigatório, exceto para Estudo)'])
      expect(s).toContain(`>${legenda}</legend>`);
    for (const campo of ['escopoInclui', 'escopoExclui', 'duvidasEmAberto', 'criteriosAceitePreliminares', 'definicaoDePronto']) {
      expect(etiqueta(s, 'input', `id="${idDoItem(campo, 0)}"`)).toContain('value=""');
      expect(s).not.toContain(`id="${idDoItem(campo, 1)}"`);
    }
    for (const rotulo of [
      'Descrição objetiva (obrigatório)',
      'Situação atual',
      'Situação desejada',
      'ERP',
      'E-commerce e marketplace',
      'APIs de terceiros',
      'Serviços internos da WS',
      'Entidades',
      'Campos críticos',
      'Restrições técnicas',
      'Sistema alvo (obrigatório)',
      'Conta do repositório (obrigatório)',
    ])
      expect(s).toContain(`class="font-medium">${rotulo}</label>`);
    expect(s).toContain('>Critérios de aceite preliminares (obrigatório)</legend>');
    expect(s).toContain('>Definição de pronto (obrigatório)</legend>');
    expect(s).toContain('Um item por linha de escopo.');
    expect(s).toContain(
      'Com qualquer dúvida aqui, a demanda vai para Aguardando informação e o agente de risco não roda. Nenhuma mensagem é enviada ao solicitante.',
    );
    expect(s).toContain('Só letras minúsculas, números e hífen. Exemplo: ws-orquestrador-demandas.');
    expect(s).toMatch(new RegExp(`<button type="submit"[^>]*>Gravar ESP-${ID}-v1</button>`));
    expect(etiqueta(s, 'a', `href="/demandas/${ID}"`)).toBeTruthy();
    expect(s).toContain(`href="/demandas/${ID}">Cancelar</a>`);
    expect(s).toMatch(/<form\b[^>]*\snovalidate=""/i);
  });

  it('repositório destino: texto calculado, ligado ao sistema alvo por aria-describedby; contas na ordem da 03', async () => {
    const s = await pagina();
    expect(s).toContain(`<p id="${ID_REPOSITORIO_DESTINO}"`);
    expect(s).toContain('Repositório destino: wsssistemas2626-crypto/</p>');
    const sistema = etiqueta(s, 'input', `id="${idDoCampo('sistemaAlvo')}"`);
    expect(sistema).toMatch(new RegExp(`aria-describedby="[^"]*\\b${ID_REPOSITORIO_DESTINO}\\b`));
    const select = new RegExp(`<select[^>]*id="${idDoCampo('contaRepositorio')}"[^>]*>(.*?)</select>`).exec(s)?.[1] ?? '';
    expect([...select.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1])).toEqual(['wsssistemas2626-crypto', 'fabianojp06']);
  });

  it('v3 a partir da v2 (a mais nova): a informação, os campos preenchidos e o botão "Gravar ESP-…-v3"', async () => {
    mObter.mockResolvedValue(demanda({ especificacoes: [resumo(2), resumo(1)] }));
    const s = await pagina();
    expect(s).toContain(`Esta será a ESP-${ID}-v3. A v2 continua guardada e não muda.`);
    expect(s).toContain('>Descrição da v2 (fictício)</textarea>');
    expect(etiqueta(s, 'input', `id="${idDoItem('escopoInclui', 0)}"`)).toContain('value="Inclui da v2 (fictício)"');
    expect(etiqueta(s, 'input', `id="${idDoCampo('sistemaAlvo')}"`)).toContain('value="sistema-ficticio"');
    expect(s).toContain('Repositório destino: fabianojp06/sistema-ficticio</p>');
    expect(s).toMatch(new RegExp(`>Gravar ESP-${ID}-v3</button>`));
    expect(s).not.toContain('rascunho do agente');
  });

  it('base da T10 (v1): "A v1 continua guardada"; de rascunho de agente: o aviso para revisar', async () => {
    mObter.mockResolvedValue(demanda({ especificacoes: [resumo(2), resumo(1)] }));
    mEsp.mockResolvedValue(esp(1, { rascunhoAgente: true, autor: { tipo: 'agente', agente: 'insumo_tecnico' } }));
    const s = await pagina(ID, { base: `ESP-${ID}-v1` });
    expect(s).toContain(`Esta será a ESP-${ID}-v3. A v1 continua guardada e não muda.`);
    expect(s).toContain('Os campos vieram da v1, um rascunho do agente de insumo técnico. Revise antes de gravar.');
    expect(s).toContain('>Descrição da v1 (fictício)</textarea>');
  });

  it('Estudo: a Construção é opcional, sem "(obrigatório)"', async () => {
    mObter.mockResolvedValue(demanda({ tipo: 'estudo' }));
    const s = await pagina();
    expect(s).toContain('>Construção (opcional: demanda do tipo Estudo não gera Pedido de Construção)</legend>');
    expect(s).toContain('class="font-medium">Sistema alvo</label>');
    expect(s).toContain('>Critérios de aceite preliminares</legend>');
    expect(s).not.toContain('Ao menos um item.');
  });

  it('C-18: título da demanda e campos da versão aparecem como texto', async () => {
    mObter.mockResolvedValue(demanda({ titulo: '<script>window.__x=1</script>', especificacoes: [resumo(1)] }));
    mEsp.mockResolvedValue(esp(1, { descricaoObjetiva: '<img src=x onerror="window.__x=2">' }));
    const s = await pagina();
    expect(s).not.toContain('<script>');
    expect(s).not.toContain('<img');
    expect(s).toContain('&lt;script&gt;window.__x=1&lt;/script&gt;');
  });
});
