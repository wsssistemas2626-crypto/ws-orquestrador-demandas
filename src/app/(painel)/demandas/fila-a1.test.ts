// T09 do DEC-DEM-20261110-0015-v1: a T03 no arranjo A1 (03, seção 4), no HTML do servidor. Contadores (RF-05), tabela
// densa com Etapas e Idade (RF-06), lista de cartões abaixo de 768 px (RF-07), "Mais filtros" (Recolhivel, D-02) e o
// título do resultado como h2 com o id de foco, um só nas duas larguras. Foco, anúncio, teclado e largura de verdade
// são conferidos no navegador (e2e/fila-contadores.spec.ts).
import { createElement as h, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Recolhivel } from '../../../components/Recolhivel';
import { contadoresDaFila, TEXTOS_CONTADORES } from '../../../components/dados-da-fila';
import { MarcasDeEtapa } from '../../../components/MarcasDeEtapa';
import type { DemandaResumo } from '../../../modules/demandas/consultas';
import type { ContagemPorStatus, EtapasNaFila } from '../../../modules/demandas/resumo-da-fila';
import { filtroDemandasSchema, STATUS } from '../../../modules/demandas/schemas';
import { CartoesDaFila } from './CartoesDaFila';
import { ContadoresDaFila } from './ContadoresDaFila';
import { ROTULO_STATUS } from '../../../components/rotulos';
import { CarregandoFila, hrefDaFila, ID_RESULTADO, ResultadoDaFila, TEXTOS_FILA } from './fila';
import { FiltrosFila, rotuloMaisFiltros } from './FiltrosFila';

vi.mock('next/navigation', () => ({
  usePathname: () => '/demandas',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));

const html = (el: ReactElement) => renderToStaticMarkup(el);
const filtro = (f: Record<string, unknown> = {}) => filtroDemandasSchema.parse(f);
// "Agora" da página: 10/11/2026 às 12:00 em São Paulo.
const AGORA = new Date('2026-11-10T15:00:00Z');

const contagem: ContagemPorStatus = {
  porStatus: { nova: 3, em_analise: 5, aguardando_informacao: 2, pronta_para_decisao: 2, aprovada: 1, em_construcao: 4, entregue: 1, devolvida: 0, encerrada: 1 },
  todas: 19,
};

const demanda = (n: number, extra: Partial<DemandaResumo> = {}): DemandaResumo => ({
  id: `DEM-20261110-${String(n).padStart(4, '0')}`,
  titulo: `Conciliação de pedidos (fictício ${n})`,
  tipo: 'bug',
  status: 'nova',
  urgencia: 'media',
  linhaServicoProvavel: 'automacao_integracao',
  rascunhoAgente: false,
  // 07/11/2026 às 10:00 em São Paulo: 3 dias antes do AGORA.
  criadaEm: new Date('2026-11-07T13:00:00Z'),
  ...extra,
});

const ESP_RSK: EtapasNaFila = { esp: true, rsk: true, dec: false };
const NADA: EtapasNaFila = { esp: false, rsk: false, dec: false };
const etapasDe = (itens: readonly DemandaResumo[], e: EtapasNaFila = ESP_RSK) => new Map(itens.map((d) => [d.id, e] as const));

// O pedaço do HTML entre a abertura de `tag` (com o atributo dado) e o fechamento dela, para separar tabela e lista.
const trecho = (s: string, abertura: RegExp, fechamento: string): string => {
  const m = abertura.exec(s);
  if (!m) return '';
  const fim = s.indexOf(fechamento, m.index);
  return s.slice(m.index, fim < 0 ? undefined : fim + fechamento.length);
};

describe('ContadoresDaFila (RF-05; 03, 4.5)', () => {
  const s = html(h(ContadoresDaFila, { contadores: contadoresDaFila(contagem, filtro({ tipo: 'bug' }), hrefDaFila), filtro: { tipo: 'bug' }, idFoco: ID_RESULTADO }));

  it('um form GET para /demandas, com o grupo "Filtrar por status"', () => {
    expect(s).toMatch(/^<form action="\/demandas" method="get"/);
    expect(s).toContain(`<div role="group" aria-label="${TEXTOS_CONTADORES.grupo}"`);
  });

  it('dez botões de envio name="status", na ordem: "Todas" e os nove status, com o valor do enum', () => {
    const botoes = [...s.matchAll(/<button type="submit" value="([^"]*)"[^>]*name="status">/g)].map((m) => m[1]);
    expect(botoes).toEqual(['', ...Object.keys(ROTULO_STATUS)]);
    expect(new Set(botoes)).toEqual(new Set(['', ...STATUS]));
    const rotulos = [...s.matchAll(/<span class="text-\[0\.8125rem\] text-tinta-media">([^<]*)<\/span>/g)].map((m) => m[1]);
    expect(rotulos).toEqual(['Todas', 'Nova', 'Em análise', 'Aguardando informação', 'Pronta para decisão', 'Aprovada', 'Em construção', 'Entregue', 'Devolvida pela construção', 'Encerrada']);
  });

  it('aria-pressed só no "Todas" sem status na URL; o número em Mono e o texto oculto no singular e no plural', () => {
    expect(s.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(s.match(/aria-pressed="false"/g)).toHaveLength(9);
    // O espaço entre o rótulo e o número separa os dois no nome acessível ("Todas 19 demandas").
    expect(s).toMatch(/aria-pressed="true"[^>]*>[\s\S]*?Todas<\/span><\/span> <span class="[^"]*font-mono[^"]*">19<\/span><span class="sr-only"> demandas<\/span><\/button>/);
    expect(s).toMatch(/Aprovada<\/span><\/span> <span class="[^"]*font-mono[^"]*">1<\/span><span class="sr-only"> demanda<\/span>/);
    expect(s).toMatch(/Devolvida pela construção<\/span><\/span> <span class="[^"]*font-mono[^"]*">0<\/span><span class="sr-only"> demandas<\/span>/);
  });

  it('o pressionado tem o visto (forma além da cor), escondido do leitor de tela; os outros não', () => {
    const pressionado = trecho(s, /<button [^>]*aria-pressed="true"/, '</button>');
    expect(pressionado).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(s.match(/<svg/g)).toHaveLength(1);
  });

  it('cada status tem o ponto da cor do selo, escondido; "Todas" não', () => {
    expect(s.match(/<span aria-hidden="true" data-cor="[a-z-]+" class="[^"]*rounded-full/g)).toHaveLength(9);
  });

  it('CV-07: só tipo e linha de serviço vão ocultos, depois do grupo, e só os do filtro validado', () => {
    expect([...s.matchAll(/<input type="hidden" name="([^"]+)" value="([^"]*)"\/>/g)].map((m) => [m[1], m[2]])).toEqual([['tipo', 'bug']]);
    expect(s.indexOf('<input type="hidden"')).toBeGreaterThan(s.indexOf('role="group"'));
    expect([...new Set([...s.matchAll(/ name="([^"]+)"/g)].map((m) => m[1]))].sort()).toEqual(['status', 'tipo']);
    const comLinha = html(
      h(ContadoresDaFila, { contadores: contadoresDaFila(contagem, filtro({ linhaServicoProvavel: 'sob_medida' }), hrefDaFila), filtro: { linhaServicoProvavel: 'sob_medida' }, idFoco: ID_RESULTADO }),
    );
    expect([...comLinha.matchAll(/<input type="hidden" name="([^"]+)" value="([^"]*)"\/>/g)].map((m) => [m[1], m[2]])).toEqual([['linhaServicoProvavel', 'sob_medida']]);
  });

  it('com status na URL, só o dele fica pressionado e vai com valor vazio (ativar tira o status)', () => {
    const t = html(h(ContadoresDaFila, { contadores: contadoresDaFila(contagem, filtro({ status: 'nova' }), hrefDaFila), filtro: {}, idFoco: ID_RESULTADO }));
    expect(t).toMatch(/<button type="submit" value="" aria-pressed="false"[^>]*name="status">[\s\S]*?Todas</);
    expect(t).toMatch(/<button type="submit" value="" aria-pressed="true"[^>]*name="status">[\s\S]*?Nova</);
  });

  it('contagem que falhou: os botões continuam, sem número, e o texto da 03 aparece abaixo do grupo', () => {
    const t = html(h(ContadoresDaFila, { contadores: contadoresDaFila(null, filtro(), hrefDaFila), filtro: {}, idFoco: ID_RESULTADO, erro: true }));
    expect(t.match(/<button type="submit"[^>]*name="status">/g)).toHaveLength(10);
    expect(t).not.toContain('font-mono');
    expect(t).not.toMatch(/ disabled=""/);
    expect(t).toContain(`>${TEXTOS_CONTADORES.erro}</p>`);
    expect(t.indexOf(TEXTOS_CONTADORES.erro)).toBeGreaterThan(t.indexOf('role="group"'));
    expect(html(h(ContadoresDaFila, { contadores: contadoresDaFila(contagem, filtro(), hrefDaFila), filtro: {}, idFoco: ID_RESULTADO }))).not.toContain(TEXTOS_CONTADORES.erro);
  });

  it('carregando: grupo com aria-busy, os dez rótulos sem número, barra escondida no lugar e nenhum botão ativo', () => {
    const t = html(h(ContadoresDaFila, { contadores: contadoresDaFila(null, filtro(), hrefDaFila), filtro: {}, idFoco: ID_RESULTADO, carregando: true }));
    expect(t).toContain('aria-busy="true"');
    expect(t.match(/ disabled=""/g)).toHaveLength(10);
    expect(t.match(/<span aria-hidden="true" class="[^"]*animate-pulse/g)).toHaveLength(10);
    expect(t).not.toContain('font-mono');
    expect(t).not.toContain(TEXTOS_CONTADORES.erro);
  });

  it('alvo de 44 px em toda largura (min-h-11) e pílula abaixo de 768 px', () => {
    const botoes = [...s.matchAll(/<button type="submit"[^>]*class="([^"]*)"/g)].map((m) => m[1] ?? '');
    expect(botoes).toHaveLength(10);
    for (const c of botoes) expect(c).toMatch(/\bmin-h-11\b/);
    for (const c of botoes) expect(c).toMatch(/\bmax-md:rounded-full\b/);
  });
});

describe('MarcasDeEtapa (RF-06; 03, 4.4)', () => {
  it('o texto fixo para o leitor de tela e as três marcas escondidas, feita cheia e por fazer tracejada', () => {
    const s = html(h(MarcasDeEtapa, { etapas: ESP_RSK }));
    expect(s).toContain('<span class="sr-only">Etapas: ESP feita, RSK feita, DEC por fazer</span>');
    const marcas = trecho(s, /<span aria-hidden="true"/, '</span></span>');
    expect([...marcas.matchAll(/>(ESP|RSK|DEC)</g)].map((m) => m[1])).toEqual(['ESP', 'RSK', 'DEC']);
    expect(marcas.match(/bg-marinho/g)).toHaveLength(2);
    expect(marcas.match(/border-dashed/g)).toHaveLength(1);
  });

  it('nenhuma feita: as três tracejadas', () => {
    const s = html(h(MarcasDeEtapa, { etapas: NADA }));
    expect(s).toContain('>Etapas: ESP por fazer, RSK por fazer, DEC por fazer<');
    expect(s.match(/border-dashed/g)).toHaveLength(3);
    expect(s).not.toContain('bg-marinho');
  });
});

describe('Recolhivel (D-02; 03, 2.6)', () => {
  const s = html(h(Recolhivel, { id: 'bloco-ficticio', rotulo: 'Mais filtros (1 ativo)', children: h('p', null, 'Conteúdo fictício') }));

  it('botão só abaixo de 768 px, recolhido, com aria-expanded e aria-controls', () => {
    expect(s).toMatch(/<button type="button" aria-expanded="false" aria-controls="bloco-ficticio" class="[^"]*\bmd:hidden\b[^"]*">Mais filtros \(1 ativo\)/);
  });

  it('o bloco tem o id, fica escondido só abaixo de 768 px enquanto recolhido, e está no DOM uma vez', () => {
    expect(s).toMatch(/<div id="bloco-ficticio" class="max-md:hidden"><p>Conteúdo fictício<\/p><\/div>/);
    expect(s.match(/id="bloco-ficticio"/g)).toHaveLength(1);
  });
});

describe('FiltrosFila: só Tipo e Linha de serviço, com o status da URL oculto (03, 4.2 e 4.3)', () => {
  it('"Mais filtros", "Mais filtros (1 ativo)" e "Mais filtros (2 ativos)"', () => {
    expect(rotuloMaisFiltros(0)).toBe('Mais filtros');
    expect(rotuloMaisFiltros(1)).toBe('Mais filtros (1 ativo)');
    expect(rotuloMaisFiltros(2)).toBe('Mais filtros (2 ativos)');
  });

  it('o status validado vai oculto, como primeiro campo do form; nenhum seletor de status', () => {
    const s = html(h(FiltrosFila, { filtro: { status: 'pronta_para_decisao', tipo: 'bug' }, idFoco: ID_RESULTADO }));
    expect(s).toMatch(/^<form action="\/demandas" method="get"><input type="hidden" name="status" value="pronta_para_decisao"\/>/);
    expect(s).not.toContain('id="filtro-status"');
    expect(s).toContain('>Mais filtros (1 ativo)');
    const sem = html(h(FiltrosFila, { filtro: {}, idFoco: ID_RESULTADO }));
    expect(sem).toMatch(/^<form action="\/demandas" method="get"><input type="hidden" name="status" value=""\/>/);
    expect(sem).toMatch(/>Mais filtros<svg/);
    const dois = html(h(FiltrosFila, { filtro: { tipo: 'bug', linhaServicoProvavel: 'sob_medida' }, idFoco: ID_RESULTADO }));
    expect(dois).toContain('>Mais filtros (2 ativos)');
  });

  it('o Recolhivel guarda os campos, "Filtrar" e "Limpar filtros"', () => {
    const s = html(h(FiltrosFila, { filtro: {}, idFoco: ID_RESULTADO }));
    const bloco = trecho(s, /<div id="mais-filtros"/, '</fieldset></div>');
    for (const parte of ['id="filtro-tipo"', 'id="filtro-linha"', '>Filtrar</button>', '>Limpar filtros</a>']) expect(bloco).toContain(parte);
  });
});

describe('ResultadoDaFila no arranjo A1 (RF-06, RF-07)', () => {
  const itens = [demanda(42, { rascunhoAgente: true }), demanda(41, { tipo: 'estudo', status: 'aguardando_informacao', urgencia: null, linhaServicoProvavel: null })];
  const etapas = new Map<string, EtapasNaFila>([
    ['DEM-20261110-0042', ESP_RSK],
    ['DEM-20261110-0041', NADA],
  ]);
  const s = html(h(ResultadoDaFila, { filtro: filtro({ status: 'aguardando_informacao' }), itens, total: 2, etapas, agora: AGORA }));
  const tabela = trecho(s, /<table/, '</table>');
  const lista = trecho(s, /<ul aria-labelledby="resultado-da-fila"/, '</ul>');

  it('um só id de foco: o h2 do resultado, focável, com a legenda; a tabela tem caption só para leitor de tela, sem id', () => {
    expect(s.match(new RegExp(`id="${ID_RESULTADO}"`, 'g'))).toHaveLength(1);
    expect(s).toContain(`<h2 id="${ID_RESULTADO}" tabindex="-1"`);
    expect(s).toMatch(/<h2 [^>]*>Demandas com status Aguardando informação, da mais nova para a mais antiga<\/h2>/);
    expect(tabela).toContain('<caption class="sr-only">Demandas com status Aguardando informação, da mais nova para a mais antiga</caption>');
  });

  it('as oito colunas da 03, na ordem, sem "Criada em"', () => {
    expect([...tabela.matchAll(/<th scope="col"[^>]*>([^<]*)<\/th>/g)].map((m) => m[1])).toEqual(['Id', 'Título', 'Tipo', 'Status', 'Etapas', 'Urgência', 'Linha de serviço', 'Idade']);
    expect(s).not.toContain('Criada em');
  });

  it('a tabela some abaixo de 768 px e a lista some a partir de 768 px (uma forma por largura)', () => {
    expect(s).toMatch(/<div class="max-md:hidden"><div role="region" aria-label="Tabela de demandas" tabindex="0"/);
    expect(lista).toMatch(/^<ul aria-labelledby="resultado-da-fila" class="[^"]*\bmd:hidden\b/);
  });

  it('CA-06.1 na tabela: a célula de etapas tem o texto fixo; CA-06.2: idade em dias com <time> e a data oculta "criada em"', () => {
    expect(tabela).toContain('<span class="sr-only">Etapas: ESP feita, RSK feita, DEC por fazer</span>');
    expect(tabela).toContain('<span class="sr-only">Etapas: ESP por fazer, RSK por fazer, DEC por fazer</span>');
    expect(tabela).toContain('<time dateTime="2026-11-07T13:00:00.000Z">3 dias</time>');
    expect(tabela).toContain('<span class="sr-only">criada em </span>07/11/2026');
  });

  it('urgência com ponto escondido e o rótulo; sem urgência, "Não informada" sem ponto', () => {
    expect(tabela).toMatch(/<span aria-hidden="true" class="[^"]*bg-atencao[^"]*"><\/span>Média/);
    expect(tabela).toContain(`<td class="px-3 py-2 align-top">${TEXTOS_FILA.naoInformada}</td>`);
  });

  it('o título fica isolado por <bdi> (CV-18), na tabela e no cartão', () => {
    expect(tabela).toContain('<bdi>Conciliação de pedidos (fictício 42)</bdi>');
    expect(lista).toContain('<bdi>Conciliação de pedidos (fictício 42)</bdi>');
  });

  it('CA-07.1: um item por demanda, com id-link, status, título em h3, tipo, urgência, linha, etapas e idade', () => {
    expect(lista.match(/<li /g)).toHaveLength(2);
    const primeiro = trecho(lista, /<li /, '</li>');
    expect(primeiro).toMatch(/<a [^>]*href="\/demandas\/DEM-20261110-0042"[^>]*>DEM-20261110-0042<\/a>/);
    expect(primeiro).toMatch(/data-cor="azul"[^>]*>Nova<\/span>/);
    expect(primeiro).toMatch(/<h3[^>]*><bdi>Conciliação de pedidos \(fictício 42\)<\/bdi><\/h3>/);
    expect(primeiro).toMatch(/border-dashed[^>]*>Rascunho de agente<\/span>/);
    expect([...primeiro.matchAll(/<dt[^>]*>([^<]*)<\/dt>/g)].map((m) => m[1])).toEqual(['Tipo', 'Urgência', 'Linha de serviço', 'Etapas', 'Idade']);
    expect(primeiro).toContain('>Bug</dd>');
    expect(primeiro).toContain('>Automação e integração</dd>');
    expect(primeiro).toContain('Etapas: ESP feita, RSK feita, DEC por fazer');
    expect(primeiro).toContain('<time dateTime="2026-11-07T13:00:00.000Z">3 dias</time>');
    const segundo = lista.slice(lista.indexOf('</li>') + 5);
    expect(segundo.match(new RegExp(`>${TEXTOS_FILA.naoInformada}</dd>`, 'g'))).toHaveLength(2);
  });

  it('o cartão não é link: só o id é; o id tem alvo de 44 px', () => {
    const primeiro = trecho(lista, /<li /, '</li>');
    expect(primeiro.match(/<a /g)).toHaveLength(1);
    expect(primeiro).toMatch(/<a class="[^"]*\bmin-h-11\b[^"]*" href="\/demandas\/DEM-20261110-0042"/);
  });

  it('C-18: o título com marcação sai como texto nas duas formas', () => {
    const t = html(h(ResultadoDaFila, { filtro: filtro(), itens: [demanda(1, { titulo: '<img src=x onerror=alert(1)>' })], total: 1, etapas: etapasDe([demanda(1)]), agora: AGORA }));
    expect(t.match(/&lt;img src=x onerror=alert\(1\)&gt;/g)).toHaveLength(2);
    expect(t).not.toContain('<img');
  });

  it('demanda sem entrada no mapa de etapas: as marcas ficam "por fazer" (nunca diz feita sem a leitura)', () => {
    const t = html(h(ResultadoDaFila, { filtro: filtro(), itens: [demanda(9)], total: 1, etapas: new Map(), agora: AGORA }));
    expect(t).toContain('Etapas: ESP por fazer, RSK por fazer, DEC por fazer');
    expect(t).not.toContain('ESP feita');
  });
});

describe('CarregandoFila nas duas larguras (03, 4.6)', () => {
  const s = html(h(CarregandoFila));

  it('no celular, lista com aria-busy e três cartões de esqueleto; o texto oculto continua uma vez só', () => {
    const lista = trecho(s, /<ul aria-busy="true"/, '</ul>');
    expect(lista).toMatch(/class="[^"]*\bmd:hidden\b/);
    expect(lista.match(/<li /g)).toHaveLength(3);
    expect(s.match(/Carregando demandas…/g)).toHaveLength(1);
  });

  it('a tabela de esqueleto fica só a partir de 768 px e sem o id do foco', () => {
    expect(s).toMatch(/<div class="max-md:hidden"><div role="region"/);
    expect(s).not.toContain(`id="${ID_RESULTADO}"`);
  });
});

describe('CartoesDaFila sozinho', () => {
  it('sem itens: lista vazia, ainda ligada ao título do resultado', () => {
    expect(html(h(CartoesDaFila, { itens: [], etapas: new Map(), agora: AGORA }))).toMatch(/^<ul aria-labelledby="resultado-da-fila"[^>]*><\/ul>$/);
  });
});
