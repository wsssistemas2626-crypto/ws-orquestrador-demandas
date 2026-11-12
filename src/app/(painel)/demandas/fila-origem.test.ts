// T16 do DEC-DEM-20261111-0016-v1: a origem da demanda na T03 (03, seção 4; RF-10 na tela, CA-04.7, CA-10.1 a CA-10.3,
// IN-16 com o CV-07 em `origem`). O servidor já filtra pela origem desde a T07; aqui, o resto da tela passa a conhecê-la
// (Pendência da 06-T07-tech-lead): o seletor "Origem", o endereço, a legenda, o "Mais filtros", os contadores (oculto,
// href e contagem) e a origem em cada linha e cartão. Dados fictícios; o "agora" é fixo (sem relógio real). Foco, teclado
// e largura de verdade ficam no navegador (e2e/fila-origem.spec.ts).
import { createElement as h, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../db';
import { contadoresDaFila } from '../../../components/dados-da-fila';
import { ROTULO_ORIGEM } from '../../../components/rotulos';
import { substituirDestinoDoLog } from '../../../lib/log';
import type { DemandaResumo } from '../../../modules/demandas/consultas';
import { contarDemandasPorStatus, type EtapasNaFila } from '../../../modules/demandas/resumo-da-fila';
import { filtroDemandasSchema } from '../../../modules/demandas/schemas';
import { ROTULOS_DO_CARTAO } from './CartoesDaFila';
import { ContadoresDaFila } from './ContadoresDaFila';
import { chaveDosContadores, filtroDosContadores, hrefDaFila, ID_RESULTADO, legendaDaFila, lerFiltroDaFila, ResultadoDaFila, temFiltro, TEXTOS_FILA } from './fila';
import { FiltrosFila } from './FiltrosFila';
import { contagemOuNada } from './leituras-da-fila';

vi.mock('next/navigation', () => ({
  usePathname: () => '/demandas',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));

vi.mock('../../../modules/demandas/resumo-da-fila', async (original) => {
  const real = await original<typeof import('../../../modules/demandas/resumo-da-fila')>();
  return { ...real, contarDemandasPorStatus: vi.fn(real.contarDemandasPorStatus) };
});

const html = (el: ReactElement) => renderToStaticMarkup(el);
const filtro = (f: Record<string, unknown> = {}) => filtroDemandasSchema.parse(f);
const base = { limit: 20, offset: 0 } as const;
// "Agora" da página: 10/11/2026 às 12:00 em São Paulo.
const AGORA = new Date('2026-11-10T15:00:00Z');
const NADA: EtapasNaFila = { esp: false, rsk: false, dec: false };

const demanda = (n: number, extra: Partial<DemandaResumo> = {}): DemandaResumo => ({
  id: `DEM-20261110-${String(n).padStart(4, '0')}`,
  titulo: `Relatório semanal (fictício ${n})`,
  tipo: 'melhoria',
  status: 'nova',
  urgencia: null,
  linhaServicoProvavel: null,
  rascunhoAgente: false,
  origem: 'pessoa',
  criadaEm: new Date('2026-11-10T13:00:00Z'),
  ...extra,
});

const tabelaDe = (s: string): string => /<table[\s\S]*?<\/table>/.exec(s)?.[0] ?? '';
const listaDe = (s: string): string => /<ul aria-labelledby="resultado-da-fila"[\s\S]*?<\/ul>/.exec(s)?.[0] ?? '';
const ocultos = (s: string) => [...s.matchAll(/<input type="hidden" name="([^"]+)" value="([^"]*)"\/>/g)].map((m) => [m[1], m[2]]);

describe('fila com origem', () => {
  it('rótulos', () => expect(ROTULO_ORIGEM).toEqual({ pessoa: 'Pessoa', agente: 'Agente de IA', awave: 'Awave' }));

  it('legenda: "origem <rótulo>" por último', () => {
    expect(legendaDaFila({ ...base, origem: 'awave' })).toBe('Demandas com origem Awave, da mais nova para a mais antiga');
    expect(legendaDaFila({ ...base, status: 'nova', origem: 'awave' })).toBe('Demandas com status Nova e origem Awave, da mais nova para a mais antiga');
    expect(legendaDaFila({ ...base, status: 'nova', tipo: 'melhoria', origem: 'pessoa' })).toBe(
      'Demandas com status Nova, tipo Melhoria e origem Pessoa, da mais nova para a mais antiga',
    );
    expect(legendaDaFila({ ...base, linhaServicoProvavel: 'sob_medida', origem: 'agente' })).toBe(
      'Demandas com linha de serviço Sistema sob medida e origem Agente de IA, da mais nova para a mais antiga',
    );
  });

  it('endereço: origem depois da linha de serviço', () => {
    expect(hrefDaFila({ ...base, status: 'nova', tipo: 'bug', linhaServicoProvavel: 'sob_medida', origem: 'awave' }, 0)).toBe(
      '/demandas?status=nova&tipo=bug&linhaServicoProvavel=sob_medida&origem=awave',
    );
    expect(hrefDaFila({ ...base, origem: 'pessoa' }, 0)).toBe('/demandas?origem=pessoa');
  });

  it('a paginação não perde a origem (Pendência da 06-T07-tech-lead)', () => {
    expect(hrefDaFila({ ...base, origem: 'awave' }, 20)).toBe('/demandas?origem=awave&offset=20');
    expect(hrefDaFila({ limit: 50, offset: 0, origem: 'agente' }, 50)).toBe('/demandas?origem=agente&limit=50&offset=50');
    const s = html(h(ResultadoDaFila, { filtro: filtro({ origem: 'awave' }), itens: Array.from({ length: 20 }, (_, i) => demanda(i + 1, { origem: 'awave' })), total: 25, etapas: new Map(), agora: AGORA }));
    expect(s).toContain('href="/demandas?origem=awave&amp;offset=20"');
  });

  it('origem conta como filtro; valor fora da lista invalida (CV-07)', () => {
    expect(temFiltro({ ...base, origem: 'agente' })).toBe(true);
    expect(temFiltro({ ...base })).toBe(false);
    expect(lerFiltroDaFila({ origem: '<script>' })).toEqual({ filtro: expect.not.objectContaining({ origem: expect.anything() }), invalido: true });
    expect(lerFiltroDaFila({ origem: 'awave', status: 'nova' })).toEqual({ filtro: expect.objectContaining({ origem: 'awave', status: 'nova' }), invalido: false });
    // "Todas" do seletor: valor vazio não é filtro nem filtro inválido.
    expect(lerFiltroDaFila({ origem: '' })).toEqual({ filtro: expect.not.objectContaining({ origem: expect.anything() }), invalido: false });
    for (const v of ['AWAVE', 'construir', 'integracao', 'pessoa,agente']) expect(lerFiltroDaFila({ origem: v }).invalido, v).toBe(true);
  });

  it('origem com resultado vazio: o estado "vazio com filtro" (03, 4.4), e não o "nenhuma demanda ainda"', () => {
    const s = html(h(ResultadoDaFila, { filtro: filtro({ origem: 'agente' }), itens: [], total: 0, etapas: new Map(), agora: AGORA }));
    expect(s).toContain(TEXTOS_FILA.vazioComFiltro);
    expect(s).not.toContain(TEXTOS_FILA.vazio);
  });
});

describe('FiltrosFila: o seletor "Origem" (03, 4.1 itens 1 e 4)', () => {
  it('Selecao id="filtro-origem" name="origem", rótulo "Origem", entre Tipo e Linha de serviço', () => {
    const s = html(h(FiltrosFila, { filtro: {}, idFoco: ID_RESULTADO }));
    expect(s).toContain('<label for="filtro-origem" class="font-medium">Origem</label>');
    expect(s).toMatch(/<select id="filtro-origem"[^>]*name="origem"/);
    const ordem = [s.indexOf('id="filtro-tipo"'), s.indexOf('id="filtro-origem"'), s.indexOf('id="filtro-linha"')];
    expect(ordem.every((p) => p > 0)).toBe(true);
    expect([...ordem].sort((a, b) => a - b)).toEqual(ordem);
  });

  it('opções "Todas", "Pessoa", "Agente de IA", "Awave", com os valores do enum', () => {
    const s = html(h(FiltrosFila, { filtro: {}, idFoco: ID_RESULTADO }));
    const bloco = /<select id="filtro-origem"[\s\S]*?<\/select>/.exec(s)?.[0] ?? '';
    expect([...bloco.matchAll(/<option value="([^"]*)"[^>]*>([^<]*)<\/option>/g)].map((m) => [m[1], m[2]])).toEqual([
      ['', 'Todas'],
      ['pessoa', 'Pessoa'],
      ['agente', 'Agente de IA'],
      ['awave', 'Awave'],
    ]);
  });

  it('a origem da URL vem escolhida; sem ela, "Todas"', () => {
    const com = /<select id="filtro-origem"[\s\S]*?<\/select>/.exec(html(h(FiltrosFila, { filtro: { origem: 'awave' }, idFoco: ID_RESULTADO })))?.[0] ?? '';
    expect(com).toMatch(/<option value="awave" selected="">Awave<\/option>/);
    const sem = /<select id="filtro-origem"[\s\S]*?<\/select>/.exec(html(h(FiltrosFila, { filtro: {}, idFoco: ID_RESULTADO })))?.[0] ?? '';
    expect(sem).toMatch(/<option value="" selected="">Todas<\/option>/);
  });

  it('"Mais filtros" soma tipo, linha e origem', () => {
    expect(html(h(FiltrosFila, { filtro: { origem: 'awave' }, idFoco: ID_RESULTADO }))).toContain('>Mais filtros (1 ativo)');
    expect(html(h(FiltrosFila, { filtro: { tipo: 'bug', origem: 'pessoa' }, idFoco: ID_RESULTADO }))).toContain('>Mais filtros (2 ativos)');
    expect(html(h(FiltrosFila, { filtro: { tipo: 'bug', linhaServicoProvavel: 'sob_medida', origem: 'agente' }, idFoco: ID_RESULTADO }))).toContain(
      '>Mais filtros (3 ativos)',
    );
    // O status não conta: ele é dos contadores.
    expect(html(h(FiltrosFila, { filtro: { status: 'nova' }, idFoco: ID_RESULTADO }))).toMatch(/>Mais filtros<svg/);
  });

  it('o seletor fica no Recolhivel "Mais filtros", com os outros campos', () => {
    const s = html(h(FiltrosFila, { filtro: {}, idFoco: ID_RESULTADO }));
    const bloco = /<div id="mais-filtros"[\s\S]*?<\/fieldset><\/div>/.exec(s)?.[0] ?? '';
    expect(bloco).toContain('id="filtro-origem"');
  });
});

describe('contadores com a origem (03, 4.1 item 3)', () => {
  it('o href de cada contador leva a origem (e o contador troca só o status)', () => {
    const cs = contadoresDaFila(null, filtro({ origem: 'awave', tipo: 'melhoria', offset: '20' }), hrefDaFila);
    expect(cs).toHaveLength(10);
    expect(cs[0]!.href).toBe('/demandas?tipo=melhoria&origem=awave');
    expect(cs.find((c) => c.status === 'nova')!.href).toBe('/demandas?status=nova&tipo=melhoria&origem=awave');
    for (const c of cs) expect(c.href).toMatch(/origem=awave/);
    const pressionado = contadoresDaFila(null, filtro({ origem: 'pessoa', status: 'nova' }), hrefDaFila).find((c) => c.pressionado)!;
    expect(pressionado.href).toBe('/demandas?origem=pessoa');
  });

  it('CV-07: a origem vai oculta depois de tipo e linha (ordem do endereço), só com o valor do enum', () => {
    const f = filtro({ tipo: 'estudo', linhaServicoProvavel: 'ia_controle_humano', origem: 'agente' });
    const s = html(h(ContadoresDaFila, { contadores: contadoresDaFila(null, f, hrefDaFila), filtro: filtroDosContadores(f), idFoco: ID_RESULTADO }));
    expect(ocultos(s)).toEqual([
      ['tipo', 'estudo'],
      ['linhaServicoProvavel', 'ia_controle_humano'],
      ['origem', 'agente'],
    ]);
    const so = html(h(ContadoresDaFila, { contadores: contadoresDaFila(null, filtro({ origem: 'awave' }), hrefDaFila), filtro: { origem: 'awave' }, idFoco: ID_RESULTADO }));
    expect(ocultos(so)).toEqual([['origem', 'awave']]);
    // Origem inválida na URL derruba o filtro inteiro: nada vai oculto.
    const invalido = lerFiltroDaFila({ origem: '<script>', tipo: 'bug' }).filtro;
    const s2 = html(h(ContadoresDaFila, { contadores: contadoresDaFila(null, invalido, hrefDaFila), filtro: filtroDosContadores(invalido), idFoco: ID_RESULTADO }));
    expect(ocultos(s2)).toEqual([]);
    expect(s2).not.toContain('script');
  });

  it('filtroDosContadores: tipo, linha e origem; nem status, nem página', () => {
    expect(filtroDosContadores(filtro({ status: 'nova', tipo: 'bug', linhaServicoProvavel: 'sob_medida', origem: 'awave', offset: '40', limit: '50' }))).toEqual({
      tipo: 'bug',
      linhaServicoProvavel: 'sob_medida',
      origem: 'awave',
    });
  });

  it('a chave do Suspense dos contadores muda com a origem e não com o status', () => {
    expect(chaveDosContadores(filtro({ origem: 'awave' }))).not.toBe(chaveDosContadores(filtro()));
    expect(chaveDosContadores(filtro({ origem: 'awave' }))).not.toBe(chaveDosContadores(filtro({ origem: 'pessoa' })));
    expect(chaveDosContadores(filtro({ origem: 'awave', status: 'nova' }))).toBe(chaveDosContadores(filtro({ origem: 'awave' })));
    expect(chaveDosContadores(filtro({ tipo: 'bug' }))).not.toBe(chaveDosContadores(filtro()));
  });
});

describe('contagemOuNada com a origem', () => {
  const mContar = vi.mocked(contarDemandasPorStatus);
  const dbFalso = {} as Db;
  beforeEach(() => {
    substituirDestinoDoLog({ write: () => undefined });
    mContar.mockClear();
  });
  afterEach(() => {
    substituirDestinoDoLog(null);
  });

  it('a contagem recebe a origem com o tipo e a linha; o status, o offset e o limit não entram', async () => {
    mContar.mockResolvedValueOnce({ porStatus: {} as never, todas: 0 });
    await contagemOuNada(dbFalso, filtro({ status: 'nova', tipo: 'bug', origem: 'awave', offset: '20' }));
    expect(mContar).toHaveBeenCalledExactlyOnceWith(dbFalso, { tipo: 'bug', linhaServicoProvavel: undefined, origem: 'awave' });
  });
});

describe('origem na linha da tabela e no cartão (03, 4.1 itens 6 a 8; CA-10.1, CA-04.7)', () => {
  const itens = [demanda(3, { origem: 'awave', rascunhoAgente: true }), demanda(2, { origem: 'agente', rascunhoAgente: true }), demanda(1)];
  const s = html(h(ResultadoDaFila, { filtro: filtro(), itens, total: 3, etapas: new Map(itens.map((d) => [d.id, NADA] as const)), agora: AGORA }));
  const tabela = tabelaDe(s);
  const lista = listaDe(s);

  it('tabela: sem coluna nova; a célula Título ganha "Origem: <rótulo>" em 13 px tinta-media, depois do título e do selo', () => {
    expect([...tabela.matchAll(/<th scope="col"[^>]*>([^<]*)<\/th>/g)].map((m) => m[1])).toEqual(['Id', 'Título', 'Tipo', 'Status', 'Etapas', 'Urgência', 'Linha de serviço', 'Idade']);
    for (const r of ['Awave', 'Agente de IA', 'Pessoa']) expect(tabela).toContain(`<span class="text-[0.8125rem] text-tinta-media">Origem: ${r}</span>`);
    expect(tabela.match(/>Origem: /g)).toHaveLength(3);
    const linhaAwave = /<tr[^>]*>(?:(?!<\/tr>)[\s\S])*DEM-20261110-0003(?:(?!<\/tr>)[\s\S])*<\/tr>/.exec(tabela)?.[0] ?? '';
    const titulo = linhaAwave.indexOf('<bdi>Relatório semanal (fictício 3)</bdi>');
    const selo = linhaAwave.indexOf('>Rascunho de agente<');
    const origem = linhaAwave.indexOf('>Origem: Awave<');
    expect(titulo).toBeGreaterThan(0);
    expect(selo).toBeGreaterThan(titulo);
    expect(origem).toBeGreaterThan(selo);
  });

  it('cartão: "Origem" em linha inteira, depois de Urgência e antes de Linha de serviço', () => {
    expect(ROTULOS_DO_CARTAO.origem).toBe('Origem');
    const primeiro = /<li [\s\S]*?<\/li>/.exec(lista)?.[0] ?? '';
    expect([...primeiro.matchAll(/<dt[^>]*>([^<]*)<\/dt>/g)].map((m) => m[1])).toEqual(['Tipo', 'Urgência', 'Origem', 'Linha de serviço', 'Etapas', 'Idade']);
    expect(primeiro).toMatch(/<div class="col-span-2"><dt class="[^"]*">Origem<\/dt><dd>Awave<\/dd><\/div>/);
    expect(lista.match(/<dd>Awave<\/dd>/g)).toHaveLength(1);
    expect(lista.match(/<dd>Agente de IA<\/dd>/g)).toHaveLength(1);
    expect(lista.match(/<dd>Pessoa<\/dd>/g)).toHaveLength(1);
  });

  it('CA-04.7: a do Awave mostra o selo "Rascunho de agente"; a fila não mostra "Aguardando confirmação"', () => {
    const primeiro = /<li [\s\S]*?<\/li>/.exec(lista)?.[0] ?? '';
    expect(primeiro).toMatch(/border-dashed[^>]*>Rascunho de agente<\/span>/);
    expect(s).not.toContain('Aguardando confirmação');
  });
});
