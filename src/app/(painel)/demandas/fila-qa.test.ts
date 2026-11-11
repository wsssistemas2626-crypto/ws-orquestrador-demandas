// T38 (06-T38-testes, qa-automacao): o que o fila.test.ts do engenheiro não alcança.
//   - A página inteira (page.tsx), com a sessão, o banco e as leituras trocados por dublês: a autorização pela matriz
//     real, o filtro inválido que chega à leitura como "sem filtro", o total da leitura (T-03) que decide a paginação,
//     o alerta da T37 só com o valor fixo, as duas falhas de leitura (tela e log sem detalhe) e as chaves que remontam
//     os filtros e a lista.
//   - Bordas das funções puras de fila.tsx e dos estados da lista.
// Nada aqui usa relógio: as datas são fixas, dentro do dado de teste.
import { cloneElement, createElement as h, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COR_STATUS, ROTULO_LINHA, ROTULO_PAPEL_SOLICITANTE, ROTULO_STATUS, ROTULO_TIPO, ROTULO_URGENCIA } from '../../../components/rotulos';
import { substituirDestinoDoLog } from '../../../lib/log';
import type { AtorPessoa } from '../../../modules/acesso/ator';
import { autorizar } from '../../../modules/acesso/matriz';
import { exigirPessoaNaPagina } from '../../../modules/acesso/exigir-pessoa';
import { listarDemandas, type DemandaResumo } from '../../../modules/demandas/consultas';
import { listarEntradasPendentes, type EntradaPendenteResumo } from '../../../modules/demandas/entradas-pendentes';
import { filtroDemandasSchema, LINHAS, PAPEIS_SOLICITANTE, STATUS, TIPOS, URGENCIAS, type FiltroDemandas } from '../../../modules/demandas/schemas';
import { contadoresDaFila } from '../../../components/dados-da-fila';
import { ContadoresDaFila } from './ContadoresDaFila';
import { EntradasAguardando } from './EntradasAguardando';
import { CarregandoFila, hrefDaFila, ID_RESULTADO, legendaDaFila, lerFiltroDaFila, ResultadoDaFila, TEXTOS_FILA } from './fila';
import { FiltrosFila } from './FiltrosFila';
import { contagemOuNada, etapasDaPagina } from './leituras-da-fila';
import PaginaDemandas from './page';

vi.mock('next/navigation', () => ({
  usePathname: () => '/demandas',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));
// T09 do DEC-DEM-20261110-0015-v1: a página passou a ler o "agora" do relógio injetado (coluna Idade) e as duas
// leituras novas de leituras-da-fila.ts (contadores e etapas). Os dublês entram aqui, como os de listarDemandas.
vi.mock('../../../lib/deps', () => ({ obterDeps: async () => ({ db: { dubleDoBanco: true }, relogio: { agora: () => new Date('2026-11-10T15:00:00Z') } }) }));
vi.mock('./leituras-da-fila', () => ({
  contagemOuNada: vi.fn(),
  etapasDaPagina: vi.fn(),
}));
vi.mock('../../../modules/acesso/exigir-pessoa', () => ({ exigirPessoaNaPagina: vi.fn() }));
vi.mock('../../../modules/acesso/matriz', async (original) => {
  const real = await original<typeof import('../../../modules/acesso/matriz')>();
  return { ...real, autorizar: vi.fn(real.autorizar) };
});
vi.mock('../../../modules/demandas/consultas', async (original) => {
  const real = await original<typeof import('../../../modules/demandas/consultas')>();
  return { ...real, listarDemandas: vi.fn() };
});
vi.mock('../../../modules/demandas/entradas-pendentes', async (original) => {
  const real = await original<typeof import('../../../modules/demandas/entradas-pendentes')>();
  return { ...real, listarEntradasPendentes: vi.fn() };
});

const mExigir = vi.mocked(exigirPessoaNaPagina);
const mAutorizar = vi.mocked(autorizar);
const mListar = vi.mocked(listarDemandas);
const mEntradas = vi.mocked(listarEntradasPendentes);
const mContagem = vi.mocked(contagemOuNada);
const mEtapas = vi.mocked(etapasDaPagina);

const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'usuario-ficticio-1', nome: 'Pessoa Ficticia', papel: 'cto' };
const ADMINISTRADORA: AtorPessoa = { tipo: 'pessoa', usuarioId: 'usuario-ficticio-2', nome: 'Pessoa Ficticia Dois', papel: 'administradora' };
const SEM_FILTRO = filtroDemandasSchema.parse({});
const filtro = (f: Record<string, unknown>) => filtroDemandasSchema.parse(f);

const demanda = (n: number, extra: Partial<DemandaResumo> = {}): DemandaResumo => ({
  id: `DEM-20261022-${String(n).padStart(4, '0')}`,
  titulo: `Demanda da fila (fictício ${n})`,
  tipo: 'bug',
  status: 'nova',
  urgencia: 'media',
  linhaServicoProvavel: 'sob_medida',
  rascunhoAgente: false,
  criadaEm: new Date('2026-10-22T17:05:00Z'),
  ...extra,
});

// O retorno de listarDemandas; a página só usa `itens` e `total`.
const lista = (itens: DemandaResumo[], total: number) => ({ itens, total, limit: 20, offset: 0 });

// T09: o que o resultado recebe além da lista (as etapas de cada demanda e o "agora" da página), e a tabela isolada da
// lista de cartões, que estão as duas no HTML (uma por largura).
const leituras = (itens: readonly DemandaResumo[]) => ({ etapas: new Map(itens.map((d) => [d.id, { esp: false, rsk: false, dec: false }] as const)), agora: new Date('2026-11-10T15:00:00Z') });
const tabelaDe = (s: string): string => /<table[\s\S]*?<\/table>/.exec(s)?.[0] ?? '';

// Saída do log capturada por teste (o log real, com a lista de permissão e o redact).
let linhasDoLog: string[] = [];
beforeEach(() => {
  linhasDoLog = [];
  substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  mExigir.mockReset().mockResolvedValue(CTO);
  mAutorizar.mockClear();
  mListar.mockReset().mockResolvedValue(lista([demanda(1)], 1));
  mEntradas.mockReset().mockResolvedValue([]);
  mContagem.mockReset().mockResolvedValue({ porStatus: Object.fromEntries(STATUS.map((s) => [s, 1])) as Record<(typeof STATUS)[number], number>, todas: STATUS.length });
  mEtapas.mockReset().mockImplementation(async (_db, ids) => new Map(ids.map((id) => [id, { esp: false, rsk: false, dec: false }] as const)));
});
afterEach(() => {
  substituirDestinoDoLog(null);
});

// A página devolve uma árvore com dois componentes assíncronos do servidor dentro de Suspense. Aqui eles são resolvidos
// (chamados e esperados) antes do HTML, como o Next faria; o resto da árvore fica como está.
// T09: mais os contadores, que leem a contagem dentro do próprio Suspense.
const ASSINCRONOS = new Set(['ListaDaFila', 'ListaDeEntradas', 'ContadoresDaPagina']);

async function resolver(no: ReactNode): Promise<ReactNode> {
  if (Array.isArray(no)) return Promise.all(no.map((x: ReactNode) => resolver(x)));
  if (!isValidElement(no)) return no;
  const el = no as ReactElement<{ children?: ReactNode }>;
  if (typeof el.type === 'function' && ASSINCRONOS.has(el.type.name)) {
    const componente = el.type as (p: unknown) => Promise<ReactNode>;
    return resolver(await componente(el.props));
  }
  if (el.props.children === undefined) return el;
  const filhos = await resolver(el.props.children);
  return Array.isArray(filhos) ? cloneElement(el, undefined, ...(filhos as ReactNode[])) : cloneElement(el, undefined, filhos);
}

async function paginaEmHtml(parametros: Record<string, string | string[] | undefined>): Promise<string> {
  const arvore = await PaginaDemandas({ searchParams: Promise.resolve(parametros) });
  return renderToStaticMarkup((await resolver(arvore)) as ReactElement);
}

// As chaves de cada elemento da árvore, com o nome do componente (sem resolver os assíncronos).
function chavesDaArvore(no: ReactNode, saida: Array<{ tipo: string; chave: string }> = []): Array<{ tipo: string; chave: string }> {
  if (Array.isArray(no)) {
    for (const x of no as ReactNode[]) chavesDaArvore(x, saida);
    return saida;
  }
  if (!isValidElement(no)) return saida;
  const el = no as ReactElement<{ children?: ReactNode }>;
  const tipoBruto: unknown = el.type;
  const tipo = typeof tipoBruto === 'function' ? tipoBruto.name : typeof tipoBruto === 'symbol' ? String(tipoBruto.description) : String(tipoBruto);
  if (el.key !== null) saida.push({ tipo, chave: el.key });
  chavesDaArvore(el.props.children, saida);
  return saida;
}

const chavesDaPagina = async (p: Record<string, string>) => chavesDaArvore(await PaginaDemandas({ searchParams: Promise.resolve(p) }));

describe('página da fila: acesso (C-04)', () => {
  it('pede a pessoa com o caminho /demandas e só depois autoriza "listar_demandas", a ação de GET /api/demandas', async () => {
    await paginaEmHtml({});
    expect(mExigir).toHaveBeenCalledExactlyOnceWith('/demandas');
    expect(mAutorizar).toHaveBeenCalledExactlyOnceWith(CTO, 'listar_demandas');
    expect(mExigir.mock.invocationCallOrder[0]).toBeLessThan(mAutorizar.mock.invocationCallOrder[0] ?? 0);
  });

  it('a administradora também vê a fila (a matriz real libera qualquer pessoa)', async () => {
    mExigir.mockResolvedValue(ADMINISTRADORA);
    const s = await paginaEmHtml({});
    expect(s).toContain('<h1>Demandas</h1>');
    expect(mListar).toHaveBeenCalledOnce();
  });

  it('pessoa com papel fora da matriz: a página recusa e não lê demandas nem entradas', async () => {
    mExigir.mockResolvedValue({ ...CTO, papel: 'visitante' } as unknown as AtorPessoa);
    await expect(PaginaDemandas({ searchParams: Promise.resolve({}) })).rejects.toMatchObject({ name: 'ErroDominio', codigo: 'sem_permissao' });
    expect(mListar).not.toHaveBeenCalled();
    expect(mEntradas).not.toHaveBeenCalled();
    // T09 (CV-06): nem as leituras novas.
    expect(mContagem).not.toHaveBeenCalled();
    expect(mEtapas).not.toHaveBeenCalled();
  });

  it('sem sessão, o erro de exigirPessoaNaPagina sobe antes de qualquer leitura', async () => {
    mExigir.mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(PaginaDemandas({ searchParams: Promise.resolve({}) })).rejects.toThrow('NEXT_REDIRECT');
    expect(mAutorizar).not.toHaveBeenCalled();
    expect(mListar).not.toHaveBeenCalled();
    expect(mContagem).not.toHaveBeenCalled();
    expect(mEtapas).not.toHaveBeenCalled();
  });
});

describe('página da fila: as leituras novas da T09 (CV-06, CV-08, D-08)', () => {
  it('os contadores leem a contagem com o filtro validado e aparecem com o total; as etapas, com os ids da página', async () => {
    mListar.mockResolvedValue(lista([demanda(3), demanda(2)], 2));
    const s = await paginaEmHtml({ status: 'nova', tipo: 'bug' });
    expect(mContagem).toHaveBeenCalledExactlyOnceWith({ dubleDoBanco: true }, filtro({ status: 'nova', tipo: 'bug' }));
    expect(mEtapas).toHaveBeenCalledExactlyOnceWith({ dubleDoBanco: true }, ['DEM-20261022-0003', 'DEM-20261022-0002']);
    expect(s).toContain('<div role="group" aria-label="Filtrar por status"');
    expect(s).toMatch(/Todas<\/span><\/span> <span class="[^"]*font-mono[^"]*">9<\/span>/);
    expect(s).toContain('Etapas: ESP por fazer, RSK por fazer, DEC por fazer');
  });

  it('a contagem que falhou (null): os contadores sem número e o texto da 03; a lista continua', async () => {
    mContagem.mockResolvedValue(null);
    const s = await paginaEmHtml({});
    expect(s).toContain('Não foi possível contar as demandas por status. Os filtros por status continuam funcionando.');
    expect(s.match(/<button type="submit"[^>]*name="status">/g)).toHaveLength(10);
    expect(s).toContain('DEM-20261022-0001');
  });

  it('a leitura das etapas falha: o erro da lista (03, 4.6), um log painel_fila_falhou sem o erro, e o resto da tela de pé', async () => {
    mEtapas.mockRejectedValue(new Error('SENTINELA-ERRO etapas'));
    const s = await paginaEmHtml({});
    expect(s).toContain(`<p id="${ID_RESULTADO}" tabindex="-1">${TEXTOS_FILA.erro}</p>`);
    expect(s).not.toContain('<table');
    expect(s).toContain('<h1>Demandas</h1>');
    expect(s).not.toContain('SENTINELA');
    const doPainel = linhasDoLog.map((l) => JSON.parse(l) as Record<string, unknown>).filter((r) => r.evento === 'painel_fila_falhou');
    expect(doPainel).toHaveLength(1);
    expect(linhasDoLog.join('\n')).not.toContain('SENTINELA');
  });
});

describe('página da fila: o filtro da URL chega à leitura (RF-06)', () => {
  it('filtro válido vai inteiro a listarDemandas, com o banco das dependências', async () => {
    await paginaEmHtml({ status: 'aguardando_informacao', tipo: 'bug', linhaServicoProvavel: 'indefinida', offset: '40', limit: '10' });
    expect(mListar).toHaveBeenCalledExactlyOnceWith(
      { dubleDoBanco: true },
      { status: 'aguardando_informacao', tipo: 'bug', linhaServicoProvavel: 'indefinida', limit: 10, offset: 40 },
    );
  });

  it('filtro inválido: o alerta da 03 e a leitura sem nenhum filtro, nem a parte válida do endereço', async () => {
    const s = await paginaEmHtml({ status: 'qualquer-coisa', tipo: 'bug', offset: '40' });
    expect(s).toContain(TEXTOS_FILA.filtroInvalido);
    expect(mListar).toHaveBeenCalledExactlyOnceWith({ dubleDoBanco: true }, SEM_FILTRO);
    expect(s).toContain(`>${legendaDaFila(SEM_FILTRO)}</caption>`);
    expect(s).not.toContain('qualquer-coisa');
    // As seleções voltam a "Todos".
    expect(s).toMatch(/<select id="filtro-tipo"[^>]*><option value="" selected="">Todos<\/option>/);
  });

  it('filtro válido não mostra o alerta de filtro inválido', async () => {
    const s = await paginaEmHtml({ status: 'nova' });
    expect(s).not.toContain(TEXTOS_FILA.filtroInvalido);
    // T09 (G5): o status escolhido aparece no contador pressionado (o seletor "Status" saiu).
    expect(s).toMatch(/<button type="submit" value="" aria-pressed="true"[^>]*name="status">[\s\S]*?Nova<\/span>/);
  });

  it('o texto da URL nunca vai para a tela, nem quando o filtro é recusado', async () => {
    const s = await paginaEmHtml({ status: '<script>alert(1)</script>', tipo: 'SENTINELA-TIPO' });
    expect(s).not.toContain('<script>alert(1)</script>');
    expect(s).not.toContain('&lt;script&gt;');
    expect(s).not.toContain('SENTINELA');
  });
});

describe('página da fila: o total da leitura decide a paginação (T-03)', () => {
  const cheia = Array.from({ length: 20 }, (_, i) => demanda(100 - i));

  it('página cheia com total maior: "Próxima" ativa, com o mesmo filtro', async () => {
    mListar.mockResolvedValue(lista(cheia, 37));
    const s = await paginaEmHtml({ tipo: 'bug' });
    expect(s).toMatch(/href="\/demandas\?tipo=bug&amp;offset=20">Próxima<\/a>/);
  });

  it('página cheia com o total igual: "Próxima" indisponível', async () => {
    mListar.mockResolvedValue(lista(cheia, 20));
    const s = await paginaEmHtml({ tipo: 'bug' });
    expect(s).toMatch(/<a role="link" aria-disabled="true"[^>]*>Próxima<\/a>/);
  });

  it('total 0 sem filtro: o vazio da 03 com "Nova demanda"; total 0 com filtro: "Limpar filtros"', async () => {
    mListar.mockResolvedValue(lista([], 0));
    const vazio = await paginaEmHtml({});
    expect(vazio).toContain(TEXTOS_FILA.vazio);
    expect(vazio).not.toContain(TEXTOS_FILA.vazioComFiltro);
    const comFiltro = await paginaEmHtml({ status: 'encerrada' });
    expect(comFiltro).toContain(TEXTOS_FILA.vazioComFiltro);
    expect(comFiltro).not.toContain(TEXTOS_FILA.vazio);
  });
});

describe('página da fila: alerta da T37 só com o valor fixo', () => {
  const ATIVADA = 'Verificação em duas etapas ativada.';

  it('aviso=2fa-ativado mostra o alerta de sucesso', async () => {
    expect(await paginaEmHtml({ aviso: '2fa-ativado' })).toContain(ATIVADA);
  });

  it.each([
    ['sem aviso', {}],
    ['outro valor', { aviso: '2fa' }],
    ['caixa diferente', { aviso: '2FA-ATIVADO' }],
    ['chave repetida', { aviso: ['2fa-ativado', '2fa-ativado'] }],
    ['texto com HTML', { aviso: '<b>2fa-ativado</b>' }],
  ])('%s: nenhum alerta de sucesso', async (_, p) => {
    const s = await paginaEmHtml(p);
    expect(s).not.toContain(ATIVADA);
    expect(s).not.toContain('<b>');
  });
});

describe('página da fila: falhas de leitura (03, T03, Erro; RNF-10, C-21)', () => {
  const SEGREDO = 'SENTINELA-ERRO select * from demanda where titulo = Pessoa Ficticia';

  it('a leitura da fila falha: o texto da 03 e "Tentar de novo"; o resto da tela continua; nada do erro na tela', async () => {
    mListar.mockRejectedValue(new Error(SEGREDO));
    const s = await paginaEmHtml({ status: 'nova' });
    expect(s).toContain(`<p id="${ID_RESULTADO}" tabindex="-1">${TEXTOS_FILA.erro}</p>`);
    expect(s).toMatch(/<button type="button"[^>]*>Tentar de novo<\/button>/);
    expect(s).toContain('<h1>Demandas</h1>');
    expect(s).toContain('<legend class="px-1 font-semibold">Filtros</legend>');
    expect(s).not.toContain('<table');
    expect(s).not.toContain('SENTINELA');
  });

  it('a leitura da fila falha: um log "painel_fila_falhou" com a rota, sem a mensagem do erro', async () => {
    mListar.mockRejectedValue(new Error(SEGREDO));
    await paginaEmHtml({});
    const registros = linhasDoLog.map((l) => JSON.parse(l) as Record<string, unknown>);
    const doPainel = registros.filter((r) => r.evento === 'painel_fila_falhou');
    expect(doPainel).toHaveLength(1);
    expect(doPainel[0]).toMatchObject({ evento: 'painel_fila_falhou', rota: '/demandas' });
    expect(linhasDoLog.join('\n')).not.toContain('SENTINELA');
    expect(linhasDoLog.join('\n')).not.toContain('Pessoa Ficticia');
  });

  it('a leitura das entradas falha: a fila continua, sem a lista de entradas, e o log não leva o erro', async () => {
    mEntradas.mockRejectedValue(new Error(SEGREDO));
    mListar.mockResolvedValue(lista([demanda(7)], 1));
    const s = await paginaEmHtml({});
    expect(s).not.toContain('Entradas aguardando');
    expect(s).toContain('DEM-20261022-0007');
    expect(s).not.toContain(TEXTOS_FILA.erro);
    const doPainel = linhasDoLog.map((l) => JSON.parse(l) as Record<string, unknown>).filter((r) => r.evento === 'painel_entradas_falhou');
    expect(doPainel).toHaveLength(1);
    expect(doPainel[0]).toMatchObject({ rota: '/demandas' });
    expect(linhasDoLog.join('\n')).not.toContain('SENTINELA');
  });

  it('as duas leituras falham juntas: a tela segue de pé, com o erro da fila só uma vez', async () => {
    mEntradas.mockRejectedValue(new Error(SEGREDO));
    mListar.mockRejectedValue(new Error(SEGREDO));
    const s = await paginaEmHtml({});
    expect(s.split(TEXTOS_FILA.erro)).toHaveLength(2);
    expect(s).not.toContain('SENTINELA');
  });

  it('com entradas pendentes, a lista aparece na página junto com a fila', async () => {
    mEntradas.mockResolvedValue([{ id: '00000000-0000-4000-8000-000000000009', recebidaEm: new Date('2026-10-22T17:05:00Z'), solicitantePapel: 'produto', status: 'falhou' }]);
    const s = await paginaEmHtml({});
    expect(s).toContain('Entradas aguardando o agente orquestrador (1)');
    expect(s).toContain('href="/demandas/nova?entrada=00000000-0000-4000-8000-000000000009"');
    expect(s).toContain('<table');
  });
});

describe('página da fila: chaves que remontam os filtros e a lista', () => {
  it('os filtros e a lista têm chaves distintas, as duas com o endereço do filtro', async () => {
    const chaves = await chavesDaPagina({ status: 'nova', offset: '20' });
    const filtros = chaves.find((c) => c.tipo === 'FiltrosFila');
    const listas = chaves.filter((c) => c.chave.includes('/demandas') && c.tipo !== 'FiltrosFila');
    expect(filtros?.chave).toContain('/demandas?status=nova&offset=20');
    expect(listas).toHaveLength(1);
    expect(listas[0]?.chave).toContain('/demandas?status=nova&offset=20');
    expect(listas[0]?.chave).not.toBe(filtros?.chave);
    const todas = chaves.map((c) => c.chave);
    expect(new Set(todas).size).toBe(todas.length);
  });

  it('outro filtro ou outra página trocam as duas chaves; o mesmo endereço repete as mesmas', async () => {
    const chavesDe = async (p: Record<string, string>) => (await chavesDaPagina(p)).filter((c) => c.chave.includes('/demandas')).map((c) => c.chave);
    const a = await chavesDe({ status: 'nova' });
    const b = await chavesDe({ status: 'nova', offset: '20' });
    const c = await chavesDe({ tipo: 'bug' });
    const a2 = await chavesDe({ status: 'nova' });
    expect(a).toHaveLength(2);
    for (const k of a) {
      expect(b).not.toContain(k);
      expect(c).not.toContain(k);
    }
    expect(a2).toEqual(a);
  });

  it('o filtro inválido usa as chaves da lista sem filtro', async () => {
    const chavesDe = async (p: Record<string, string>) => (await chavesDaPagina(p)).filter((c) => c.chave.includes('/demandas')).map((c) => c.chave);
    expect(await chavesDe({ status: 'qualquer-coisa' })).toEqual(await chavesDe({}));
  });
});

describe('lerFiltroDaFila e hrefDaFila: bordas', () => {
  it.each([
    ['limit no máximo (100)', { limit: '100' }, { limit: 100, offset: 0 }],
    ['limit no mínimo (1)', { limit: '1' }, { limit: 1, offset: 0 }],
    ['offset no máximo (1.000.000)', { offset: '1000000' }, { limit: 20, offset: 1_000_000 }],
    ['cada linha de serviço', { linhaServicoProvavel: 'diagnostico_sustentacao' }, { linhaServicoProvavel: 'diagnostico_sustentacao', limit: 20, offset: 0 }],
  ])('%s: válido', (_, p, esperado) => {
    expect(lerFiltroDaFila(p)).toEqual({ filtro: esperado, invalido: false });
  });

  it.each([
    ['limit 0', { limit: '0' }],
    ['limit fracionado', { limit: '2.5' }],
    ['offset acima do máximo', { offset: '1000001' }],
    ['offset que não é número', { offset: 'abc' }],
    ['linha de serviço fora da lista', { linhaServicoProvavel: 'outra' }],
    ['status com espaço', { status: ' nova' }],
    ['status com o rótulo em vez do valor', { status: 'Nova' }],
    ['tipo repetido', { tipo: ['bug', 'bug'] }],
  ])('%s: inválido, e a lista volta sem filtro', (_, p) => {
    expect(lerFiltroDaFila(p)).toEqual({ filtro: SEM_FILTRO, invalido: true });
  });

  it('ida e volta: o endereço de hrefDaFila, lido de novo, devolve o mesmo filtro', () => {
    const casos: FiltroDemandas[] = [
      SEM_FILTRO,
      filtro({ status: 'aguardando_informacao' }),
      filtro({ tipo: 'produto_proprio', offset: '40' }),
      filtro({ status: 'devolvida', tipo: 'novo_projeto', linhaServicoProvavel: 'ia_controle_humano', limit: '50', offset: '100' }),
      ...STATUS.map((s) => filtro({ status: s })),
      ...TIPOS.map((t) => filtro({ tipo: t })),
      ...LINHAS.map((l) => filtro({ linhaServicoProvavel: l })),
    ];
    for (const f of casos) {
      const href = hrefDaFila(f, f.offset);
      const consulta = href.includes('?') ? href.slice(href.indexOf('?') + 1) : '';
      expect(lerFiltroDaFila(Object.fromEntries(new URLSearchParams(consulta))), href).toEqual({ filtro: f, invalido: false });
    }
  });

  it('legenda com dois filtros quaisquer liga as partes por "e", sem vírgula', () => {
    expect(legendaDaFila(filtro({ status: 'nova', linhaServicoProvavel: 'indefinida' }))).toBe(
      'Demandas com status Nova e linha de serviço Indefinida, da mais nova para a mais antiga',
    );
    expect(legendaDaFila(filtro({ linhaServicoProvavel: 'sob_medida' }))).toBe('Demandas com linha de serviço Sistema sob medida, da mais nova para a mais antiga');
  });
});

describe('ResultadoDaFila e CarregandoFila: bordas', () => {
  it('cada status aparece com o seu rótulo e a cor de 2.2', () => {
    const itens = STATUS.map((s, i) => demanda(i + 1, { status: s }));
    const s = renderToStaticMarkup(h(ResultadoDaFila, { filtro: SEM_FILTRO, itens, total: itens.length, ...leituras(itens) }));
    for (const st of STATUS) expect(s).toMatch(new RegExp(`data-cor="${COR_STATUS[st]}"[^>]*>${ROTULO_STATUS[st]}</span>`));
    expect(s.match(/<tbody[\s\S]*?<\/tbody>/)?.[0].match(/<tr/g)).toHaveLength(STATUS.length);
  });

  it('cada tipo, urgência e linha de serviço aparecem com o rótulo de 2.6, nunca com o valor gravado', () => {
    const itens = [
      ...TIPOS.map((t, i) => demanda(i + 1, { tipo: t })),
      ...URGENCIAS.map((u, i) => demanda(i + 10, { urgencia: u })),
      ...LINHAS.map((l, i) => demanda(i + 20, { linhaServicoProvavel: l })),
    ];
    const s = renderToStaticMarkup(h(ResultadoDaFila, { filtro: SEM_FILTRO, itens, total: itens.length, ...leituras(itens) }));
    for (const t of TIPOS) expect(s).toContain(`<td class="px-3 py-2 align-top">${ROTULO_TIPO[t]}</td>`);
    // T09: a urgência ganhou o ponto escondido antes do rótulo (03, 4.4).
    for (const u of URGENCIAS) expect(s).toMatch(new RegExp(`<td class="px-3 py-2 align-top"><span [^>]*><span aria-hidden="true" class="[^"]*"></span>${ROTULO_URGENCIA[u]}</span></td>`));
    for (const l of LINHAS) expect(s).toContain(`<td class="px-3 py-2 align-top">${ROTULO_LINHA[l]}</td>`);
    for (const valor of ['novo_projeto', 'produto_proprio', 'automacao_integracao', 'ia_controle_humano', 'diagnostico_sustentacao']) {
      expect(s).not.toContain(`>${valor}<`);
    }
  });

  it('as linhas saem na ordem em que a leitura as devolve (da mais nova para a mais antiga, RF-06)', () => {
    const itens = [demanda(30), demanda(12), demanda(5)];
    const s = renderToStaticMarkup(h(ResultadoDaFila, { filtro: SEM_FILTRO, itens, total: 3, ...leituras(itens) }));
    // T09: a lista de cartões repete os ids (uma forma por largura); a ordem é conferida na tabela, e a da lista é igual.
    const ids = [...tabelaDe(s).matchAll(/>(DEM-20261022-\d{4})<\/a>/g)].map((m) => m[1]);
    expect(ids).toEqual(['DEM-20261022-0030', 'DEM-20261022-0012', 'DEM-20261022-0005']);
    const daLista = [...s.slice(s.indexOf('<ul aria-labelledby')).matchAll(/>(DEM-20261022-\d{4})<\/a>/g)].map((m) => m[1]);
    expect(daLista).toEqual(ids);
  });

  it('título com aspas, & e < sai escapado, e o selo de rascunho não aparece sem rascunho', () => {
    const itens = [demanda(1, { titulo: 'A & B "C" <D>' })];
    const s = renderToStaticMarkup(h(ResultadoDaFila, { filtro: SEM_FILTRO, itens, total: 1, ...leituras(itens) }));
    expect(s).toContain('A &amp; B &quot;C&quot; &lt;D&gt;');
    expect(s).not.toContain('Rascunho de agente');
  });

  it('deslocamento fora do múltiplo da página: "Anterior" nunca vai a offset negativo', () => {
    const p5 = renderToStaticMarkup(h(ResultadoDaFila, { filtro: filtro({ offset: '5' }), itens: [demanda(1)], total: 6, ...leituras([demanda(1)]) }));
    expect(p5).toMatch(/href="\/demandas">Anterior<\/a>/);
    expect(p5).not.toContain('offset=-');
    const p25 = renderToStaticMarkup(h(ResultadoDaFila, { filtro: filtro({ status: 'nova', offset: '25' }), itens: [demanda(1)], total: 26, ...leituras([demanda(1)]) }));
    expect(p25).toMatch(/href="\/demandas\?status=nova&amp;offset=5">Anterior<\/a>/);
  });

  it('limite fora do padrão vai junto nos links de paginação', () => {
    const cheia = Array.from({ length: 10 }, (_, i) => demanda(50 - i));
    const s = renderToStaticMarkup(h(ResultadoDaFila, { filtro: filtro({ limit: '10', offset: '10' }), itens: cheia, total: 35, ...leituras(cheia) }));
    expect(s).toMatch(/href="\/demandas\?limit=10">Anterior<\/a>/);
    expect(s).toMatch(/href="\/demandas\?limit=10&amp;offset=20">Próxima<\/a>/);
    expect(s).toContain('>Página 2</span>');
  });

  it('vazio com filtro numa página além do fim: "Limpar filtros" e "Anterior" com o mesmo filtro', () => {
    const s = renderToStaticMarkup(h(ResultadoDaFila, { filtro: filtro({ tipo: 'estudo', offset: '40' }), itens: [], total: 3, ...leituras([]) }));
    expect(s).toContain(TEXTOS_FILA.vazioComFiltro);
    expect(s).toMatch(/href="\/demandas\?tipo=estudo&amp;offset=20">Anterior<\/a>/);
    expect(s).toMatch(/<a [^>]*href="\/demandas"[^>]*>Limpar filtros<\/a>/);
  });

  it('carregando com filtro: a legenda do filtro, sem o id do foco, e ocupado', () => {
    const s = renderToStaticMarkup(h(CarregandoFila, { filtro: filtro({ status: 'nova', tipo: 'bug' }) }));
    expect(s).toContain('>Demandas com status Nova e tipo Bug, da mais nova para a mais antiga</caption>');
    expect(s).toContain('aria-busy="true"');
    expect(s).not.toContain(`id="${ID_RESULTADO}"`);
  });
});

describe('FiltrosFila: bordas', () => {
  // T09 (G5): o status saiu do formulário para os contadores ("Todas" e um botão por status, com o valor do enum); as
  // opções de status passam a ser os valores dos botões, conferidas do mesmo jeito.
  it('as opções de cada seleção são todas as do schema, na ordem dos rótulos de 2.2 e 2.6, depois de "Todos" ou "Todas"', () => {
    const s = renderToStaticMarkup(h(FiltrosFila, { filtro: {}, idFoco: ID_RESULTADO }));
    const c = renderToStaticMarkup(h(ContadoresDaFila, { contadores: contadoresDaFila(null, SEM_FILTRO, hrefDaFila), filtro: {}, idFoco: ID_RESULTADO }));
    const opcoesDe = (id: string) => [...(s.match(new RegExp(`<select id="${id}"[\\s\\S]*?</select>`))?.[0] ?? '').matchAll(/<option value="([^"]*)"/g)].map((m) => m[1]);
    const valoresDosContadores = [...c.matchAll(/<button type="submit" value="([^"]*)"[^>]*name="status">/g)].map((m) => m[1]);
    expect(valoresDosContadores).toEqual(['', ...Object.keys(ROTULO_STATUS)]);
    expect(opcoesDe('filtro-tipo')).toEqual(['', ...Object.keys(ROTULO_TIPO)]);
    expect(opcoesDe('filtro-linha')).toEqual(['', ...Object.keys(ROTULO_LINHA)]);
    // Nenhum valor do schema fica sem opção, e nenhuma opção fica fora do schema.
    expect(new Set(valoresDosContadores)).toEqual(new Set(['', ...STATUS]));
    expect(new Set(opcoesDe('filtro-tipo'))).toEqual(new Set(['', ...TIPOS]));
    expect(new Set(opcoesDe('filtro-linha'))).toEqual(new Set(['', ...LINHAS]));
    expect(s).toMatch(/<select id="filtro-linha"[^>]*><option value="" selected="">Todas<\/option>/);
  });

  it('sem filtro, as três seleções ficam em "Todos" ou "Todas", e só uma opção marcada em cada', () => {
    const s = renderToStaticMarkup(h(FiltrosFila, { filtro: {}, idFoco: ID_RESULTADO }));
    // T09: as duas seleções que ficaram (Tipo e Linha de serviço); o status vai oculto, vazio, e "Todas" é o pressionado.
    expect(s.match(/selected=""/g)).toHaveLength(2);
    expect(s).toContain('<input type="hidden" name="status" value=""/>');
    const c = renderToStaticMarkup(h(ContadoresDaFila, { contadores: contadoresDaFila(null, SEM_FILTRO, hrefDaFila), filtro: {}, idFoco: ID_RESULTADO }));
    expect(c.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(c).toMatch(/aria-pressed="true"[^>]*>[\s\S]*?Todas<\/span>/);
  });

  it('o formulário não tem campo de limit nem de offset: filtrar volta à página 1', () => {
    const s = renderToStaticMarkup(h(FiltrosFila, { filtro: { status: 'nova' }, idFoco: ID_RESULTADO }));
    expect(s).not.toMatch(/name="(limit|offset)"/);
    expect(s.match(/name="/g)).toHaveLength(3);
  });
});

describe('EntradasAguardando: bordas', () => {
  const entrada = (n: number, extra: Partial<EntradaPendenteResumo> = {}): EntradaPendenteResumo => ({
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    recebidaEm: new Date('2026-10-22T17:05:00Z'),
    solicitantePapel: 'operacoes',
    status: 'aguardando',
    ...extra,
  });

  it('uma entrada: "(1)" no título', () => {
    const s = renderToStaticMarkup(h(EntradasAguardando, { entradas: [entrada(1)] }));
    expect(s).toContain('>Entradas aguardando o agente orquestrador (1)</h2>');
  });

  it('todas aguardando: nenhum "Preencher à mão"', () => {
    const s = renderToStaticMarkup(h(EntradasAguardando, { entradas: [entrada(1), entrada(2), entrada(3)] }));
    expect(s).toContain('(3)');
    expect(s).not.toContain('Preencher à mão');
    expect(s.match(/O agente está preparando os campos\./g)).toHaveLength(3);
  });

  it('todas falharam: um "Preencher à mão" por entrada, cada um com a sua descrição e o seu endereço', () => {
    const entradas = [entrada(1, { status: 'falhou' }), entrada(2, { status: 'falhou' })];
    const s = renderToStaticMarkup(h(EntradasAguardando, { entradas }));
    expect(s.match(/Preencher à mão/g)).toHaveLength(2);
    for (const e of entradas) {
      expect(s).toContain(`aria-describedby="entrada-${e.id}" href="/demandas/nova?entrada=${e.id}"`);
      expect(s).toContain(`<p id="entrada-${e.id}">`);
    }
  });

  it('cada papel do solicitante aparece com o rótulo de 2.6', () => {
    const entradas = PAPEIS_SOLICITANTE.map((p, i) => entrada(i + 1, { solicitantePapel: p }));
    const s = renderToStaticMarkup(h(EntradasAguardando, { entradas }));
    for (const p of PAPEIS_SOLICITANTE) expect(s).toContain(`</time> — ${ROTULO_PAPEL_SOLICITANTE[p]}</p>`);
  });

  it('o id vai codificado no endereço de "Preencher à mão"', () => {
    const s = renderToStaticMarkup(h(EntradasAguardando, { entradas: [entrada(1, { id: 'a&b c/d', status: 'falhou' })] }));
    expect(s).toContain('href="/demandas/nova?entrada=a%26b%20c%2Fd"');
  });
});
