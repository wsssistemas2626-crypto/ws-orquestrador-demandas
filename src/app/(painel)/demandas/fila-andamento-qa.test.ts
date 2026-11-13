// T12 do DEC-DEM-20261111-0017-v1 (06-T12-testes, qa-automacao): o que fila-andamento.test.ts e a guarda estática não
// alcançam.
//   - A página inteira (page.tsx), com a sessão, o banco e as leituras trocados por dublês (molde de fila-qa.test.ts): a
//     leitura do andamento com os ids da página e o banco das dependências, depois das etapas; a falha dela (leitura real,
//     banco que não responde) sem virar o erro da lista; e nenhuma leitura do andamento quando a guarda (C-04) ou a lista
//     falham.
//   - Bordas do selo na fila: todo status que não é Em construção (CA-08.4), as seis fases em pt-BR (RF-08), o singular,
//     e o andamento montado à mão fora do esquema (CA-04.6, AN-12), que fica sem selo e sem o valor no HTML.
// Nada aqui usa o relógio real nem depende de ordem: as datas são fixas e os dublês voltam ao estado inicial em cada teste.
import { cloneElement, createElement as h, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEXTOS_ANDAMENTO } from '../../../components/dados-do-andamento';
import { ROTULO_STATUS } from '../../../components/rotulos';
import { substituirDestinoDoLog } from '../../../lib/log';
import type { AtorPessoa } from '../../../modules/acesso/ator';
import { autorizar } from '../../../modules/acesso/matriz';
import { exigirPessoaNaPagina } from '../../../modules/acesso/exigir-pessoa';
import type { AndamentoVista } from '../../../modules/andamento/schemas';
import { listarDemandas, type DemandaResumo } from '../../../modules/demandas/consultas';
import { listarEntradasPendentes } from '../../../modules/demandas/entradas-pendentes';
import { filtroDemandasSchema, STATUS } from '../../../modules/demandas/schemas';
import { ID_RESULTADO, ResultadoDaFila, TEXTOS_FILA } from './fila';
import { andamentosDaPagina, contagemOuNada, etapasDaPagina } from './leituras-da-fila';
import PaginaDemandas from './page';

vi.mock('next/navigation', () => ({
  usePathname: () => '/demandas',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));
// O banco das dependências é um objeto que não responde a nenhuma consulta: a leitura real do andamento falha nele.
vi.mock('../../../lib/deps', () => ({ obterDeps: async () => ({ db: { dubleDoBanco: true }, relogio: { agora: () => new Date('2026-11-12T15:00:00Z') } }) }));
// contagemOuNada e etapasDaPagina por dublê; andamentosDaPagina é a real, observada (cada teste pode trocá-la).
vi.mock('./leituras-da-fila', async (original) => {
  const real = await original<typeof import('./leituras-da-fila')>();
  return { ...real, contagemOuNada: vi.fn(), etapasDaPagina: vi.fn(), andamentosDaPagina: vi.fn(real.andamentosDaPagina) };
});
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
const mAndamentos = vi.mocked(andamentosDaPagina);

const ADMINISTRADORA: AtorPessoa = { tipo: 'pessoa', usuarioId: 'usuario-ficticio-2', nome: 'Pessoa Ficticia Dois', papel: 'administradora' };
const SEM_FILTRO = filtroDemandasSchema.parse({});
const AGORA = new Date('2026-11-12T15:00:00Z');
const DEC = 'DEC-DEM-20991231-0001-v1';
const BANCO = { dubleDoBanco: true };

const demanda = (n: number, extra: Partial<DemandaResumo> = {}): DemandaResumo => ({
  id: `DEM-20991231-${String(n).padStart(4, '0')}`,
  titulo: `Painel de estoque (fictício ${n})`,
  tipo: 'melhoria',
  status: 'em_construcao',
  urgencia: 'media',
  linhaServicoProvavel: 'sob_medida',
  rascunhoAgente: false,
  origem: 'pessoa',
  criadaEm: new Date('2026-11-10T17:05:00Z'),
  ...extra,
});

const andamento = (a: Partial<AndamentoVista> = {}): AndamentoVista => ({
  decId: DEC,
  fase: 'construindo',
  tarefasProntas: 9,
  tarefasTotal: 17,
  statusConstrucao: 'em_construcao',
  atualizadoEm: new Date('2026-11-12T12:00:00Z'),
  ...a,
});

const lista = (itens: DemandaResumo[], total: number) => ({ itens, total, limit: 20, offset: 0 });
const tabelaDe = (s: string): string => /<table[\s\S]*?<\/table>/.exec(s)?.[0] ?? '';
const listaDe = (s: string): string => /<ul aria-labelledby="resultado-da-fila"[\s\S]*?<\/ul>/.exec(s)?.[0] ?? '';
const linhaDe = (s: string, id: string): string => new RegExp(`<tr[^>]*>(?:(?!</tr>)[\\s\\S])*?${id}[\\s\\S]*?</tr>`).exec(tabelaDe(s))?.[0] ?? '';
const cartaoDe = (s: string, id: string): string => new RegExp(`<li[^>]*>(?:(?!</li>)[\\s\\S])*?${id}[\\s\\S]*?</li>`).exec(listaDe(s))?.[0] ?? '';
const vezes = (s: string, trecho: string): number => s.split(trecho).length - 1;
// Qualquer selo de fase: o texto visível escondido do leitor (13 px, 600) ou o texto do leitor.
const SINAL_DE_SELO = 'aria-hidden="true" class="text-[0.8125rem] font-semibold';

let linhasDoLog: string[] = [];
const registros = () => linhasDoLog.map((l) => JSON.parse(l) as Record<string, unknown>);
beforeEach(() => {
  linhasDoLog = [];
  substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  mExigir.mockReset().mockResolvedValue(ADMINISTRADORA);
  mAutorizar.mockClear();
  mListar.mockReset().mockResolvedValue(lista([demanda(1)], 1));
  mEntradas.mockReset().mockResolvedValue([]);
  mContagem.mockReset().mockResolvedValue(null);
  mEtapas.mockReset().mockImplementation(async (_db, ids) => new Map(ids.map((id) => [id, { esp: true, rsk: true, dec: true }] as const)));
  mAndamentos.mockClear();
});
afterEach(() => {
  substituirDestinoDoLog(null);
});

// Os componentes assíncronos do servidor dentro de Suspense, resolvidos antes do HTML, como o Next faria.
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
async function paginaEmHtml(parametros: Record<string, string>): Promise<string> {
  const arvore = await PaginaDemandas({ searchParams: Promise.resolve(parametros) });
  return renderToStaticMarkup((await resolver(arvore)) as ReactElement);
}

describe('página da fila: a leitura do andamento (T12; 03, 4.4; C-04)', () => {
  it('lê o andamento uma vez, com o banco das dependências e os ids da página, depois das etapas; o selo chega à tabela e ao cartão', async () => {
    const [construindo, outra, nova] = [demanda(1), demanda(2), demanda(3, { status: 'nova' })];
    mListar.mockResolvedValue(lista([construindo, outra, nova], 3));
    mAndamentos.mockResolvedValueOnce(new Map([[construindo.id, andamento()], [nova.id, andamento()]]));
    const s = await paginaEmHtml({});
    expect(mAndamentos).toHaveBeenCalledExactlyOnceWith(BANCO, [construindo.id, outra.id, nova.id]);
    expect(mEtapas.mock.invocationCallOrder[0]).toBeLessThan(mAndamentos.mock.invocationCallOrder[0] ?? 0);
    // Só a demanda em construção com andamento: uma vez na tabela e uma no cartão; a "Nova" com andamento, sem selo.
    expect(vezes(s, 'Construindo · 9/17')).toBe(2);
    expect(linhaDe(s, construindo.id)).toContain('Construindo · 9/17');
    expect(cartaoDe(s, construindo.id)).toContain('Construindo · 9/17');
    expect(linhaDe(s, nova.id)).not.toContain(SINAL_DE_SELO);
    expect(s).not.toContain(TEXTOS_ANDAMENTO.erroNaFila);
  });

  it('banco do andamento que falha (leitura real): a lista aparece, o aviso atencao uma vez, nenhum selo, só o log painel_andamento_falhou, sem ids', async () => {
    const itens = [demanda(1), demanda(2)];
    mListar.mockResolvedValue(lista(itens, 2));
    const s = await paginaEmHtml({});
    await expect(mAndamentos.mock.results[0]?.value).resolves.toBeNull();
    expect(vezes(s, TEXTOS_ANDAMENTO.erroNaFila)).toBe(1);
    expect(s.indexOf(TEXTOS_ANDAMENTO.erroNaFila)).toBeLessThan(s.indexOf(`<h2 id="${ID_RESULTADO}"`));
    expect(s).not.toContain(TEXTOS_FILA.erro);
    expect(s).not.toContain('Andamento:');
    for (const d of itens) {
      expect(linhaDe(s, d.id)).toContain(ROTULO_STATUS.em_construcao);
      expect(cartaoDe(s, d.id).length).toBeGreaterThan(0);
    }
    const eventos = registros().map((r) => r.evento);
    expect(eventos).toEqual(['painel_andamento_falhou']);
    expect(registros()[0]).toMatchObject({ rota: '/demandas' });
    for (const d of itens) expect(linhasDoLog.join('\n')).not.toContain(d.id);
    expect(linhasDoLog.join('\n')).not.toContain('selectDistinctOn');
  });

  it('lista vazia: a leitura real não consulta o banco, sem aviso e sem log', async () => {
    mListar.mockResolvedValue(lista([], 0));
    const s = await paginaEmHtml({});
    expect(mAndamentos).toHaveBeenCalledExactlyOnceWith(BANCO, []);
    await expect(mAndamentos.mock.results[0]?.value).resolves.toEqual(new Map());
    expect(s).toContain(TEXTOS_FILA.vazio);
    expect(s).not.toContain(TEXTOS_ANDAMENTO.erroNaFila);
    expect(linhasDoLog).toEqual([]);
  });

  it.each([
    ['a lista', () => mListar.mockRejectedValue(new Error('SENTINELA-LISTA'))],
    ['as etapas', () => mEtapas.mockRejectedValue(new Error('SENTINELA-ETAPAS'))],
  ])('%s falha: o erro de hoje (03, 4.6), sem ler o andamento e sem o aviso do andamento', async (_nome, falhar) => {
    falhar();
    const s = await paginaEmHtml({});
    expect(s).toContain(`<p id="${ID_RESULTADO}" tabindex="-1">${TEXTOS_FILA.erro}</p>`);
    expect(mAndamentos).not.toHaveBeenCalled();
    expect(s).not.toContain(TEXTOS_ANDAMENTO.erroNaFila);
    expect(registros().map((r) => r.evento)).toEqual(['painel_fila_falhou']);
  });

  it('sem sessão (a guarda lança): nenhuma leitura do andamento', async () => {
    mExigir.mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(PaginaDemandas({ searchParams: Promise.resolve({}) })).rejects.toThrow('NEXT_REDIRECT');
    expect(mAndamentos).not.toHaveBeenCalled();
  });

  it('pessoa com papel fora da matriz: a página recusa antes de ler o andamento', async () => {
    mExigir.mockResolvedValue({ ...ADMINISTRADORA, papel: 'visitante' } as unknown as AtorPessoa);
    await expect(PaginaDemandas({ searchParams: Promise.resolve({}) })).rejects.toMatchObject({ name: 'ErroDominio', codigo: 'sem_permissao' });
    expect(mAndamentos).not.toHaveBeenCalled();
  });
});

const resultado = (itens: readonly DemandaResumo[], andamentos: ReadonlyMap<string, AndamentoVista> | null) =>
  renderToStaticMarkup(
    h(ResultadoDaFila, {
      filtro: SEM_FILTRO,
      itens,
      total: itens.length,
      etapas: new Map(itens.map((d) => [d.id, { esp: true, rsk: true, dec: true }] as const)),
      agora: AGORA,
      andamentos,
    }),
  );

describe('selo de fase: bordas (RF-08; CA-08.4; CA-04.6; AN-12)', () => {
  it('CA-08.4: em cada um dos outros oito status, com andamento válido, nem a linha nem o cartão têm selo', () => {
    const outros = STATUS.filter((st) => st !== 'em_construcao');
    expect(outros).toHaveLength(8);
    const itens = [demanda(1), ...outros.map((st, i) => demanda(i + 2, { status: st }))];
    const s = resultado(itens, new Map(itens.map((d) => [d.id, andamento()])));
    // O controle: a em construção tem o selo, uma vez em cada forma.
    expect(vezes(s, 'Andamento: Construindo, 9 de 17 tarefas prontas.')).toBe(2);
    for (const d of itens.slice(1)) {
      for (const forma of [linhaDe(s, d.id), cartaoDe(s, d.id)]) {
        expect(forma, d.status).toContain(ROTULO_STATUS[d.status]);
        expect(forma, d.status).not.toContain('Andamento:');
        expect(forma, d.status).not.toContain(SINAL_DE_SELO);
      }
    }
  });

  it.each([
    ['entendendo_o_pedido', 'Entendendo o pedido'],
    ['planejando', 'Planejando'],
    ['construindo', 'Construindo'],
    ['testando', 'Testando'],
    ['revisando_e_entregando', 'Revisando e entregando'],
    ['documentando', 'Documentando'],
  ] as const)('fase %s: o rótulo pt-BR "%s" na tabela e no cartão, nunca o valor gravado', (fase, rotulo) => {
    const d = demanda(1);
    const s = resultado([d], new Map([[d.id, andamento({ fase, tarefasProntas: 2, tarefasTotal: 5 })]]));
    for (const forma of [linhaDe(s, d.id), cartaoDe(s, d.id)]) {
      expect(forma).toContain(`>${rotulo} · 2/5</span><span class="sr-only">Andamento: ${rotulo}, 2 de 5 tarefas prontas.</span>`);
    }
    // O valor gravado (minúsculo, com sublinhado) nunca vira texto da tela.
    expect(s).not.toMatch(new RegExp(`>${fase}[ ·<]`));
    expect(s).not.toContain(`${fase} · `);
  });

  it('uma tarefa no total: o leitor diz "tarefa pronta", no singular', () => {
    const d = demanda(1);
    const s = resultado([d], new Map([[d.id, andamento({ fase: 'testando', tarefasProntas: 1, tarefasTotal: 1 })]]));
    expect(vezes(s, '>Testando · 1/1</span><span class="sr-only">Andamento: Testando, 1 de 1 tarefa pronta.</span>')).toBe(2);
  });

  it('CA-04.6: andamento montado à mão fora do esquema, sem selo, sem o valor no HTML e sem o aviso de erro', () => {
    const forjados: Array<Record<string, unknown>> = [
      { fase: '<img src=x onerror=alert(1)>' },
      { fase: 'toString' },
      { fase: '__proto__' },
      { tarefasProntas: 18, tarefasTotal: 17 },
      { tarefasProntas: 0, tarefasTotal: 1000 },
      { tarefasProntas: 1.5 },
      { tarefasProntas: '9' },
      { tarefasTotal: -1, tarefasProntas: 0 },
      { statusConstrucao: 'entregue' },
      { atualizadoEm: new Date(Number.NaN) },
      { atualizadoEm: '2026-11-12T12:00:00Z' },
    ];
    const itens = forjados.map((_, i) => demanda(i + 1));
    const mapa = new Map(itens.map((d, i) => [d.id, { ...andamento(), ...forjados[i] } as unknown as AndamentoVista]));
    const s = resultado(itens, mapa);
    expect(s).not.toContain('Andamento:');
    expect(s).not.toContain(SINAL_DE_SELO);
    expect(s).not.toContain('<img');
    expect(s).not.toContain('onerror');
    expect(s).not.toContain('toString');
    expect(s).not.toContain(TEXTOS_ANDAMENTO.erroNaFila);
    for (const d of itens) {
      expect(linhaDe(s, d.id)).toContain(ROTULO_STATUS.em_construcao);
      expect(cartaoDe(s, d.id)).toContain(ROTULO_STATUS.em_construcao);
    }
  });

  it('andamento de demanda que não está na página não aparece; mapa vazio não mostra o aviso', () => {
    const d = demanda(1);
    const s = resultado([d], new Map([['DEM-20991231-9999', andamento()]]));
    expect(s).not.toContain('Andamento:');
    expect(s).not.toContain(TEXTOS_ANDAMENTO.erroNaFila);
    expect(resultado([d], new Map())).not.toContain(TEXTOS_ANDAMENTO.erroNaFila);
  });
});
