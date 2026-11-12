// 06-T16-testes (qa-automacao) do DEC-DEM-20261111-0016-v1: bordas da origem na T03, além do fila-origem.test.ts do
// engenheiro (RF-10 na tela, CA-10.1, CA-04.7, IN-16 com o CV-07 em `origem`).
//   - os rótulos cobrem exatamente a enumeração do schema, na ordem das opções do seletor;
//   - cada uma das três seleções tem uma e só uma opção marcada, e a certa (Minor 2 da 06-T16-tech-lead);
//   - o GET sem script (todos os campos, vazios menos a origem), chave repetida e valor com espaço;
//   - a legenda com os quatro filtros;
//   - "Anterior" e "Próxima" mantêm a origem;
//   - cada linha e cada cartão dizem a origem da própria demanda (id a id), não só a contagem;
//   - a contagem que falha com a origem no filtro não leva a origem ao log (CV-08).
// Dados fictícios; o "agora" é fixo (sem relógio real); cada teste monta o próprio HTML (sem dependência de ordem).
import { createElement as h, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from '../../../db';
import { ROTULO_LINHA, ROTULO_ORIGEM, ROTULO_TIPO } from '../../../components/rotulos';
import { substituirDestinoDoLog } from '../../../lib/log';
import type { DemandaResumo } from '../../../modules/demandas/consultas';
import { contarDemandasPorStatus, type EtapasNaFila } from '../../../modules/demandas/resumo-da-fila';
import { filtroDemandasSchema, ORIGENS_DA_DEMANDA, type OrigemDaDemanda } from '../../../modules/demandas/schemas';
import { ID_RESULTADO, legendaDaFila, lerFiltroDaFila, ResultadoDaFila } from './fila';
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

const seletor = (s: string, id: string): string => new RegExp(`<select id="${id}"[\\s\\S]*?</select>`).exec(s)?.[0] ?? '';
const marcadas = (bloco: string) => [...bloco.matchAll(/<option value="([^"]*)" selected="">/g)].map((m) => m[1]);

describe('rótulos e opções da origem', () => {
  it('ROTULO_ORIGEM tem exatamente as chaves de ORIGENS_DA_DEMANDA, na mesma ordem (as opções do seletor seguem essa ordem)', () => {
    expect(Object.keys(ROTULO_ORIGEM)).toEqual([...ORIGENS_DA_DEMANDA]);
    const opcoes = [...seletor(html(h(FiltrosFila, { filtro: {}, idFoco: ID_RESULTADO })), 'filtro-origem').matchAll(/<option value="([^"]*)"/g)].map((m) => m[1]);
    expect(opcoes).toEqual(['', ...ORIGENS_DA_DEMANDA]);
  });

  it('nenhuma opção do seletor é de integração que não cria demanda (construir) nem de tipo de ator (integracao, sistema)', () => {
    const bloco = seletor(html(h(FiltrosFila, { filtro: {}, idFoco: ID_RESULTADO })), 'filtro-origem');
    for (const v of ['construir', 'integracao', 'sistema']) expect(bloco, v).not.toContain(`value="${v}"`);
  });
});

describe('FiltrosFila: uma opção marcada em cada seleção (Minor 2 da 06-T16-tech-lead)', () => {
  const ids = ['filtro-tipo', 'filtro-origem', 'filtro-linha'] as const;

  it('sem filtro: cada seleção tem exatamente uma marcada, a de valor vazio', () => {
    const s = html(h(FiltrosFila, { filtro: {}, idFoco: ID_RESULTADO }));
    for (const id of ids) expect(marcadas(seletor(s, id)), id).toEqual(['']);
  });

  it('com os três filtros: cada seleção marca só o seu valor', () => {
    const s = html(h(FiltrosFila, { filtro: { tipo: 'bug', linhaServicoProvavel: 'sob_medida', origem: 'agente' }, idFoco: ID_RESULTADO }));
    expect(marcadas(seletor(s, 'filtro-tipo'))).toEqual(['bug']);
    expect(marcadas(seletor(s, 'filtro-origem'))).toEqual(['agente']);
    expect(marcadas(seletor(s, 'filtro-linha'))).toEqual(['sob_medida']);
  });

  it('para cada origem, só ela fica marcada no seletor e as outras duas seleções ficam no vazio', () => {
    for (const o of ORIGENS_DA_DEMANDA) {
      const s = html(h(FiltrosFila, { filtro: { origem: o }, idFoco: ID_RESULTADO }));
      expect(marcadas(seletor(s, 'filtro-origem')), o).toEqual([o]);
      expect(marcadas(seletor(s, 'filtro-tipo')), o).toEqual(['']);
      expect(marcadas(seletor(s, 'filtro-linha')), o).toEqual(['']);
    }
  });
});

describe('lerFiltroDaFila com a origem: bordas da URL (CV-07, IN-16)', () => {
  it('GET sem script com só a origem escolhida: os vazios não invalidam e a origem vale', () => {
    const r = lerFiltroDaFila({ status: '', tipo: '', origem: 'awave', linhaServicoProvavel: '' });
    expect(r.invalido).toBe(false);
    expect(r.filtro.origem).toBe('awave');
    expect(r.filtro.status).toBeUndefined();
    expect(r.filtro.tipo).toBeUndefined();
    expect(r.filtro.linhaServicoProvavel).toBeUndefined();
  });

  it('chave repetida (lista), valor com espaço ou com maiúscula: filtro inválido e sem origem', () => {
    for (const v of [['awave', 'pessoa'], ['awave', 'awave'], ' awave', 'awave ', 'Pessoa', 'agente_ia', 'null']) {
      const r = lerFiltroDaFila({ origem: v });
      expect(r.invalido, JSON.stringify(v)).toBe(true);
      expect(r.filtro.origem, JSON.stringify(v)).toBeUndefined();
    }
  });

  it('origem inválida derruba também os outros filtros válidos do endereço (o filtro inteiro cai)', () => {
    const r = lerFiltroDaFila({ status: 'nova', tipo: 'bug', origem: 'construir' });
    expect(r.invalido).toBe(true);
    expect(r.filtro).toEqual(filtro());
  });
});

describe('legenda com os quatro filtros', () => {
  it('status, tipo, linha de serviço e origem, nesta ordem, com vírgulas e "e" antes da origem', () => {
    expect(legendaDaFila(filtro({ status: 'nova', tipo: 'bug', linhaServicoProvavel: 'sob_medida', origem: 'awave' }))).toBe(
      `Demandas com status Nova, tipo ${ROTULO_TIPO.bug}, linha de serviço ${ROTULO_LINHA.sob_medida} e origem Awave, da mais nova para a mais antiga`,
    );
  });
});

describe('paginação com a origem', () => {
  it('"Anterior" e "Próxima" levam a origem; nenhum link da fila a perde', () => {
    const itens = Array.from({ length: 20 }, (_, i) => demanda(i + 21, { origem: 'agente', rascunhoAgente: true }));
    const s = html(h(ResultadoDaFila, { filtro: filtro({ origem: 'agente', offset: '20' }), itens, total: 65, etapas: new Map(), agora: AGORA }));
    expect(s).toContain('href="/demandas?origem=agente"');
    expect(s).toContain('href="/demandas?origem=agente&amp;offset=40"');
    const daFila = [...s.matchAll(/href="(\/demandas(?:\?[^"]*)?)"/g)].map((m) => m[1]!);
    expect(daFila.length).toBeGreaterThanOrEqual(2);
    for (const href of daFila) expect(href, href).toMatch(/[?&]origem=agente(&|$)/);
  });
});

describe('cada linha e cada cartão com a origem da própria demanda (CA-10.1)', () => {
  const origens: Record<string, OrigemDaDemanda> = {};
  const itens = [
    demanda(6, { origem: 'pessoa' }),
    demanda(5, { origem: 'awave', rascunhoAgente: true }),
    demanda(4, { origem: 'agente', rascunhoAgente: true }),
    demanda(3, { origem: 'awave', rascunhoAgente: true }),
    demanda(2, { origem: 'pessoa' }),
    demanda(1, { origem: 'agente', rascunhoAgente: true }),
  ];
  for (const d of itens) origens[d.id] = d.origem;
  const montar = () => html(h(ResultadoDaFila, { filtro: filtro(), itens, total: itens.length, etapas: new Map(itens.map((d) => [d.id, NADA] as const)), agora: AGORA }));

  it('tabela: a linha de cada id diz "Origem: <rótulo da origem dela>" uma vez só', () => {
    const tbody = /<tbody[\s\S]*?<\/tbody>/.exec(montar())?.[0] ?? '';
    const linhas = [...tbody.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((m) => m[0]);
    expect(linhas).toHaveLength(itens.length);
    for (const linha of linhas) {
      const id = /DEM-\d{8}-\d{4}/.exec(linha)?.[0] ?? '';
      expect(Object.keys(origens), linha).toContain(id);
      const ditas = [...linha.matchAll(/>Origem: ([^<]*)</g)].map((m) => m[1]);
      expect(ditas, id).toEqual([ROTULO_ORIGEM[origens[id]!]]);
    }
  });

  it('cartões: o dd de "Origem" de cada id é o rótulo da origem dela', () => {
    const lista = /<ul aria-labelledby="resultado-da-fila"[\s\S]*?<\/ul>/.exec(montar())?.[0] ?? '';
    const cartoes = [...lista.matchAll(/<li [\s\S]*?<\/li>/g)].map((m) => m[0]);
    expect(cartoes).toHaveLength(itens.length);
    for (const c of cartoes) {
      const id = /DEM-\d{8}-\d{4}/.exec(c)?.[0] ?? '';
      expect(Object.keys(origens), c).toContain(id);
      const dd = /<dt[^>]*>Origem<\/dt><dd>([^<]*)<\/dd>/.exec(c)?.[1];
      expect(dd, id).toBe(ROTULO_ORIGEM[origens[id]!]);
    }
  });

  it('CA-04.7: toda demanda do Awave tem o selo "Rascunho de agente" na linha e no cartão; a de pessoa sem rascunho, não', () => {
    const s = montar();
    const tbody = /<tbody[\s\S]*?<\/tbody>/.exec(s)?.[0] ?? '';
    const lista = /<ul aria-labelledby="resultado-da-fila"[\s\S]*?<\/ul>/.exec(s)?.[0] ?? '';
    const blocos = [...[...tbody.matchAll(/<tr[\s\S]*?<\/tr>/g)].map((m) => m[0]), ...[...lista.matchAll(/<li [\s\S]*?<\/li>/g)].map((m) => m[0])];
    for (const b of blocos) {
      const id = /DEM-\d{8}-\d{4}/.exec(b)?.[0] ?? '';
      const temSelo = />Rascunho de agente</.test(b);
      expect(temSelo, id).toBe(origens[id] !== 'pessoa');
    }
  });

  it('a origem vem da autoria (origem), e não do título nem do solicitante: título com "Awave" de demanda de pessoa diz "Pessoa"', () => {
    const d = demanda(9, { origem: 'pessoa', titulo: 'Relatório do Awave (fictício)' });
    const s = html(h(ResultadoDaFila, { filtro: filtro(), itens: [d], total: 1, etapas: new Map([[d.id, NADA]]), agora: AGORA }));
    expect(s).toContain('>Origem: Pessoa<');
    expect(s).not.toContain('>Origem: Awave<');
    expect(s).toContain('<dd>Pessoa</dd>');
  });
});

describe('contagemOuNada com a origem: falha sem vazar o filtro (CV-08)', () => {
  const mContar = vi.mocked(contarDemandasPorStatus);
  const dbFalso = {} as Db;
  let linhas: string[] = [];
  beforeEach(() => {
    linhas = [];
    substituirDestinoDoLog({ write: (l: string) => void linhas.push(l) });
    mContar.mockClear();
  });
  afterEach(() => {
    substituirDestinoDoLog(null);
  });

  it('a contagem que falha devolve null, e o log tem só o evento e o erro reduzido, sem a origem nem outro filtro', async () => {
    mContar.mockRejectedValueOnce(new Error('falha fictícia awave sob_medida'));
    await expect(contagemOuNada(dbFalso, filtro({ tipo: 'bug', linhaServicoProvavel: 'sob_medida', origem: 'awave' }))).resolves.toBeNull();
    expect(mContar).toHaveBeenCalledExactlyOnceWith(dbFalso, { tipo: 'bug', linhaServicoProvavel: 'sob_medida', origem: 'awave' });
    expect(linhas).toHaveLength(1);
    const l = JSON.parse(linhas[0]!) as Record<string, unknown>;
    expect(l.evento).toBe('painel_contadores_falhou');
    expect(l.rota).toBe('/demandas');
    for (const proibido of ['awave', 'sob_medida', 'bug', 'origem', 'fictícia']) expect(linhas[0], proibido).not.toContain(proibido);
  });

  it('para cada origem, a contagem recebe exatamente a origem do filtro', async () => {
    for (const o of ORIGENS_DA_DEMANDA) {
      mContar.mockResolvedValueOnce({ porStatus: {} as never, todas: 0 });
      await contagemOuNada(dbFalso, filtro({ origem: o }));
      expect(mContar).toHaveBeenLastCalledWith(dbFalso, { tipo: undefined, linhaServicoProvavel: undefined, origem: o });
    }
    expect(mContar).toHaveBeenCalledTimes(ORIGENS_DA_DEMANDA.length);
  });
});
