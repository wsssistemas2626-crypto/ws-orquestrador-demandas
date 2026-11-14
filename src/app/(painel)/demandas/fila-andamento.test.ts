// T12 do DEC-DEM-20261111-0017-v1 (RF-08, CA-08.1 a CA-08.4; 03, seção 4, inclusive 4.4; AN-12; D-16): o selo de fase
// na célula Status da tabela e no topo do cartão, no HTML do servidor (molde de fila.test.ts), e a leitura do andamento
// por página (andamentosDaPagina), cuja falha vira null, um log sem SQL nem ids e o aviso da 03, 4.4. Dados fictícios.
import { createElement as h, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TEXTOS_ANDAMENTO } from '../../../components/dados-do-andamento';
import type { Db } from '../../../db';
import { substituirDestinoDoLog } from '../../../lib/log';
import type { AndamentoVista } from '../../../modules/andamento/schemas';
import type { DemandaResumo } from '../../../modules/demandas/consultas';
import { filtroDemandasSchema } from '../../../modules/demandas/schemas';
import { ID_RESULTADO, ResultadoDaFila } from './fila';
import { andamentosDaPagina } from './leituras-da-fila';

// Fora do Next não há roteador montado; o HTML do primeiro estado não navega.
vi.mock('next/navigation', () => ({
  usePathname: () => '/demandas',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));

const html = (el: ReactElement) => renderToStaticMarkup(el);
const SEM_FILTRO = filtroDemandasSchema.parse({});
const AGORA = new Date('2026-11-12T15:00:00Z');
const DEC = 'DEC-DEM-20991231-0001-v1';
// A tabela (a partir de 768 px) e a lista de cartões (abaixo) estão as duas no HTML: cada conferência olha a sua.
const tabelaDe = (s: string): string => /<table[\s\S]*?<\/table>/.exec(s)?.[0] ?? '';
const listaDe = (s: string): string => /<ul aria-labelledby="resultado-da-fila"[\s\S]*?<\/ul>/.exec(s)?.[0] ?? '';
// A linha da tabela e o cartão de uma demanda, pelo id.
const linhaDe = (s: string, id: string): string => new RegExp(`<tr[^>]*>(?:(?!</tr>)[\\s\\S])*?${id}[\\s\\S]*?</tr>`).exec(tabelaDe(s))?.[0] ?? '';
const cartaoDe = (s: string, id: string): string => new RegExp(`<li[^>]*>(?:(?!</li>)[\\s\\S])*?${id}[\\s\\S]*?</li>`).exec(listaDe(s))?.[0] ?? '';

const demanda = (n: number, extra: Partial<DemandaResumo> = {}): DemandaResumo => ({
  id: `DEM-20991231-${String(n).padStart(4, '0')}`,
  titulo: `Relatório semanal (fictício ${n})`,
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

const resultado = (itens: readonly DemandaResumo[], andamentos: ReadonlyMap<string, AndamentoVista> | null) =>
  html(
    h(ResultadoDaFila, {
      filtro: SEM_FILTRO,
      itens,
      total: itens.length,
      etapas: new Map(itens.map((d) => [d.id, { esp: true, rsk: true, dec: true }] as const)),
      agora: AGORA,
      andamentos,
    }),
  );

const SELO_CONSTRUINDO =
  '<span class="flex flex-col"><span aria-hidden="true" class="text-[0.8125rem] font-semibold text-marinho">Construindo · 9/17</span><span class="sr-only">Andamento: Construindo, 9 de 17 tarefas prontas.</span></span>';

describe('selo de fase na fila (03, 4.1; CA-08.1 a CA-08.4)', () => {
  const construindo = demanda(1);
  const concluida = demanda(2);
  const semPlano = demanda(3);
  const semAndamento = demanda(4);
  const devolvida = demanda(5, { status: 'devolvida' });
  const itens = [construindo, concluida, semPlano, semAndamento, devolvida];
  const s = resultado(
    itens,
    new Map([
      [construindo.id, andamento()],
      [concluida.id, andamento({ fase: 'documentando', tarefasProntas: 12, tarefasTotal: 12, statusConstrucao: 'construido' })],
      [semPlano.id, andamento({ fase: 'entendendo_o_pedido', tarefasProntas: 0, tarefasTotal: 0 })],
      [devolvida.id, andamento({ tarefasProntas: 3, tarefasTotal: 8, statusConstrucao: 'cancelado' })],
    ]),
  );

  it('tabela: a célula Status tem o selo de status e, abaixo, o texto visível escondido do leitor e o texto do leitor', () => {
    const linha = linhaDe(s, construindo.id);
    expect(linha).toMatch(/<span class="flex flex-col items-start gap-1"><span data-cor="marinho"[^>]*>Em construção<\/span><span class="flex flex-col">/);
    expect(linha).toContain(SELO_CONSTRUINDO);
  });

  it('cartão: o mesmo pedaço, logo abaixo do selo de status, no topo do cartão', () => {
    const cartao = cartaoDe(s, construindo.id);
    expect(cartao).toMatch(/<span data-cor="marinho"[^>]*>Em construção<\/span><span class="flex flex-col">/);
    expect(cartao).toContain(SELO_CONSTRUINDO);
    // Antes do título (h3): no topo, ao lado do id.
    expect(cartao.indexOf(SELO_CONSTRUINDO)).toBeLessThan(cartao.indexOf('<h3'));
    // Sem item novo na dl (03, 4.1 item 5).
    expect(cartao.match(/<dt/g)).toHaveLength(6);
  });

  it('um selo por forma: a tabela e o cartão mostram o mesmo texto, uma vez cada', () => {
    expect(tabelaDe(s).match(/Construindo · 9\/17/g)).toHaveLength(1);
    expect(listaDe(s).match(/Construindo · 9\/17/g)).toHaveLength(1);
  });

  it('construção concluída, em positivo; total 0, só a fase', () => {
    for (const forma of [linhaDe(s, concluida.id), cartaoDe(s, concluida.id)]) {
      expect(forma).toContain('<span aria-hidden="true" class="text-[0.8125rem] font-semibold text-positivo">Construção concluída</span><span class="sr-only">Andamento: construção concluída.</span>');
    }
    for (const forma of [linhaDe(s, semPlano.id), cartaoDe(s, semPlano.id)]) {
      expect(forma).toContain('<span aria-hidden="true" class="text-[0.8125rem] font-semibold text-marinho">Entendendo o pedido</span><span class="sr-only">Andamento: Entendendo o pedido.</span>');
    }
  });

  it('em construção sem andamento e devolvida com andamento: sem selo de fase (CA-08.3, CA-08.4)', () => {
    for (const d of [semAndamento, devolvida]) {
      for (const forma of [linhaDe(s, d.id), cartaoDe(s, d.id)]) {
        expect(forma.length).toBeGreaterThan(0);
        expect(forma).not.toContain('Andamento:');
        expect(forma).not.toContain('aria-hidden="true" class="text-[0.8125rem] font-semibold');
      }
    }
  });

  it('cancelada com a demanda de volta a Em construção: "Construção cancelada", em tinta-media', () => {
    const volta = demanda(6);
    const r = resultado([volta], new Map([[volta.id, andamento({ statusConstrucao: 'cancelado' })]]));
    expect(linhaDe(r, volta.id)).toContain('<span aria-hidden="true" class="text-[0.8125rem] font-semibold text-tinta-media">Construção cancelada</span><span class="sr-only">Andamento: construção cancelada.</span>');
  });

  it('sem o aviso de erro quando a leitura do andamento deu certo; nenhum style= no HTML (CV-02)', () => {
    expect(s).not.toContain(TEXTOS_ANDAMENTO.erroNaFila);
    expect(s).not.toMatch(/\sstyle=/);
  });

  it('sem andamentos (props de antes): nenhum selo e nenhum aviso', () => {
    const r = html(h(ResultadoDaFila, { filtro: SEM_FILTRO, itens: [construindo], total: 1, etapas: new Map(), agora: AGORA }));
    expect(r).not.toContain('Andamento:');
    expect(r).not.toContain(TEXTOS_ANDAMENTO.erroNaFila);
  });
});

describe('erro só da leitura do andamento (03, 4.4)', () => {
  const itens = [demanda(1), demanda(2)];
  const s = resultado(itens, null);

  it('Alerta atencao estático com o texto da 03, acima do título do resultado', () => {
    expect(s).toMatch(new RegExp(`<div class="rounded-campo border-l-4 px-4 py-3 border-atencao bg-atencao-fundo text-atencao">${TEXTOS_ANDAMENTO.erroNaFila}</div>`));
    expect(s.indexOf(TEXTOS_ANDAMENTO.erroNaFila)).toBeLessThan(s.indexOf(`<h2 id="${ID_RESULTADO}"`));
    expect(s.match(new RegExp(TEXTOS_ANDAMENTO.erroNaFila, 'g'))).toHaveLength(1);
    expect(s).not.toContain('role="alert"');
  });

  it('a fila aparece com as linhas e os cartões, sem nenhum selo de fase', () => {
    expect(tabelaDe(s).match(/<tr/g)).toHaveLength(3);
    expect(listaDe(s).match(/<li/g)).toHaveLength(2);
    expect(s).not.toContain('Andamento:');
    expect(s).not.toMatch(/\sstyle=/);
  });

  it('lista vazia: o estado vazio de hoje, sem o aviso (não há linha para o selo)', () => {
    const vazio = html(h(ResultadoDaFila, { filtro: SEM_FILTRO, itens: [], total: 0, etapas: new Map(), agora: AGORA, andamentos: null }));
    expect(vazio).toContain('Nenhuma demanda ainda.');
    expect(vazio).not.toContain(TEXTOS_ANDAMENTO.erroNaFila);
  });
});

describe('andamentosDaPagina (RF-08; ADR-35; AN-12; D-16)', () => {
  const SENTINELA = 'SENTINELA-SQL-ANDAMENTO demanda_id = $1';
  const IDS = ['DEM-20991231-0001', 'DEM-20991231-0002', 'DEM-20991231-0003', 'DEM-20991231-0004'];
  let linhasDoLog: string[] = [];
  beforeEach(() => {
    linhasDoLog = [];
    substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  });
  afterEach(() => {
    substituirDestinoDoLog(null);
  });

  // Banco falso: a consulta do último andamento por demanda lança, como uma consulta que falhou no driver.
  const dbQueFalha = {
    select: () => {
      throw new Error(SENTINELA);
    },
    selectDistinctOn: () => {
      throw new Error(SENTINELA);
    },
  } as unknown as Db;

  // Banco falso que devolve as linhas dadas à consulta da página: a 1ª chamada de select monta a subconsulta lateral
  // (select … from … where … orderBy … limit … as), a 2ª é a página (select … from(demanda) … crossJoinLateral … where).
  const dbCom = (linhas: unknown[]) => {
    const sub = { from: () => ({ where: () => ({ orderBy: () => ({ limit: () => ({ as: () => ({}) }) }) }) }) };
    const pagina = { from: () => ({ crossJoinLateral: () => ({ where: async () => linhas }) }) };
    let chamadas = 0;
    return { select: () => (chamadas++ === 0 ? sub : pagina) } as unknown as Db;
  };

  it('banco que falha: devolve null e um log painel_andamento_falhou com a rota, sem SQL nem ids', async () => {
    await expect(andamentosDaPagina(dbQueFalha, IDS)).resolves.toBeNull();
    const registros = linhasDoLog.map((l) => JSON.parse(l) as Record<string, unknown>);
    const doPainel = registros.filter((r) => r.evento === 'painel_andamento_falhou');
    expect(doPainel).toHaveLength(1);
    expect(doPainel[0]).toMatchObject({ evento: 'painel_andamento_falhou', rota: '/demandas' });
    const tudo = linhasDoLog.join('\n');
    expect(tudo).not.toContain('SENTINELA');
    expect(tudo).not.toContain('demanda_id = $1');
    for (const id of IDS) expect(tudo).not.toContain(id);
  });

  it('com linhas: só as que passam em lerAndamento entram no mapa, já como AndamentoVista; sem log', async () => {
    const gravadoEm = new Date('2026-11-12T12:00:00Z');
    const valida = { demandaId: IDS[0], decId: DEC, fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, statusConstrucao: 'em_construcao', gravadoEm };
    const linhas = [
      valida,
      { ...valida, demandaId: IDS[1], fase: '<b>Fase</b>' },
      { ...valida, demandaId: IDS[2], tarefasProntas: 18 },
      { ...valida, demandaId: IDS[3], decId: 'DEC-<script>' },
    ];
    const mapa = await andamentosDaPagina(dbCom(linhas), IDS);
    expect(mapa).not.toBeNull();
    expect([...mapa!.keys()]).toEqual([IDS[0]]);
    expect(mapa!.get(IDS[0]!)).toEqual({ decId: DEC, fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, statusConstrucao: 'em_construcao', atualizadoEm: gravadoEm });
    expect(linhasDoLog).toEqual([]);
  });

  it('página sem demandas: mapa vazio, sem consultar o banco', async () => {
    const mapa = await andamentosDaPagina(dbQueFalha, []);
    expect(mapa).toEqual(new Map());
    expect(linhasDoLog).toEqual([]);
  });
});
