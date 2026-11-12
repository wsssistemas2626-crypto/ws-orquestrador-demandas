// T38: T03 Fila de demandas no HTML do servidor. Leitura do filtro da URL, textos da 03 (T03), os estados vazio, com
// filtro, erro, carregando e com dados, a tabela acessível e a lista de entradas aguardando o agente orquestrador. Foco,
// anúncio da região de aviso e a aplicação dos filtros pelo botão são conferidos no navegador (e2e/fila.spec.ts).
import { createElement as h, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { DemandaResumo } from '../../../modules/demandas/consultas';
import type { EntradaPendenteResumo } from '../../../modules/demandas/entradas-pendentes';
import { filtroDemandasSchema } from '../../../modules/demandas/schemas';
import { contadoresDaFila } from '../../../components/dados-da-fila';
import { ContadoresDaFila } from './ContadoresDaFila';
import { EntradasAguardando } from './EntradasAguardando';
import {
  CarregandoFila,
  ErroDaFila,
  hrefDaFila,
  ID_RESULTADO,
  legendaDaFila,
  lerFiltroDaFila,
  ResultadoDaFila,
  textoDemandasEncontradas,
} from './fila';
import { FiltrosFila } from './FiltrosFila';

// Fora do Next não há roteador montado; o HTML do primeiro estado não navega.
vi.mock('next/navigation', () => ({
  usePathname: () => '/demandas',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));

const html = (el: ReactElement) => renderToStaticMarkup(el);
const SEM_FILTRO = filtroDemandasSchema.parse({});
const filtro = (f: Record<string, unknown>) => filtroDemandasSchema.parse(f);

// T09 do DEC-DEM-20261110-0015-v1: o resultado também recebe as etapas de cada demanda (leitura da página) e o "agora"
// do relógio injetado, para a coluna Idade. Aqui: 10/11/2026 às 12:00 em São Paulo, e nenhuma etapa feita.
const AGORA = new Date('2026-11-10T15:00:00Z');
const leituras = (itens: readonly DemandaResumo[]) => ({ etapas: new Map(itens.map((d) => [d.id, { esp: false, rsk: false, dec: false }] as const)), agora: AGORA });
// A tabela (a partir de 768 px) e a lista de cartões (abaixo) estão as duas no HTML: cada conferência olha a sua.
const tabelaDe = (s: string): string => /<table[\s\S]*?<\/table>/.exec(s)?.[0] ?? '';
const listaDe = (s: string): string => /<ul aria-labelledby="resultado-da-fila"[\s\S]*?<\/ul>/.exec(s)?.[0] ?? '';

const demanda = (n: number, extra: Partial<DemandaResumo> = {}): DemandaResumo => ({
  id: `DEM-20261022-${String(n).padStart(4, '0')}`,
  titulo: `Pedidos duplicados no ERP (fictício ${n})`,
  tipo: 'bug',
  status: 'em_analise',
  urgencia: 'alta',
  linhaServicoProvavel: 'automacao_integracao',
  rascunhoAgente: false,
  origem: 'pessoa',
  // 22/10/2026 às 14:05 em São Paulo
  criadaEm: new Date('2026-10-22T17:05:00Z'),
  ...extra,
});

describe('lerFiltroDaFila: o filtro da URL (RF-06)', () => {
  it('sem parâmetro: sem filtro, página 1 com 20 itens', () => {
    expect(lerFiltroDaFila({})).toEqual({ filtro: SEM_FILTRO, invalido: false });
    expect(SEM_FILTRO).toEqual({ limit: 20, offset: 0 });
  });

  it('filtros válidos passam; o aviso da T02 e chaves desconhecidas não atrapalham', () => {
    expect(lerFiltroDaFila({ status: 'aguardando_informacao', tipo: 'bug', linhaServicoProvavel: 'sob_medida', offset: '20', aviso: '2fa-ativado' })).toEqual({
      filtro: { status: 'aguardando_informacao', tipo: 'bug', linhaServicoProvavel: 'sob_medida', limit: 20, offset: 20 },
      invalido: false,
    });
  });

  it('valor vazio é "Todos" (o formulário sem script manda status=), e não filtro inválido', () => {
    expect(lerFiltroDaFila({ status: '', tipo: '', linhaServicoProvavel: 'indefinida' })).toEqual({
      filtro: { linhaServicoProvavel: 'indefinida', limit: 20, offset: 0 },
      invalido: false,
    });
  });

  it.each([
    ['status fora da lista', { status: 'qualquer' }],
    ['tipo fora da lista', { tipo: 'Bug' }],
    ['chave repetida', { status: ['nova', 'encerrada'] }],
    ['offset negativo', { offset: '-20' }],
    ['limite acima de 100', { limit: '101' }],
  ])('%s: inválido, e a lista volta sem nenhum filtro', (_, p) => {
    expect(lerFiltroDaFila(p)).toEqual({ filtro: SEM_FILTRO, invalido: true });
  });
});

describe('legenda da tabela, contagem e endereço (03, T03)', () => {
  it('caption sem filtro e com o filtro de status da 03', () => {
    expect(legendaDaFila(SEM_FILTRO)).toBe('Demandas, da mais nova para a mais antiga');
    expect(legendaDaFila(filtro({ status: 'aguardando_informacao' }))).toBe('Demandas com status Aguardando informação, da mais nova para a mais antiga');
  });

  it('caption com dois e com três filtros, pelos rótulos de 2.6', () => {
    expect(legendaDaFila(filtro({ tipo: 'novo_projeto', linhaServicoProvavel: 'sob_medida' }))).toBe(
      'Demandas com tipo Novo projeto e linha de serviço Sistema sob medida, da mais nova para a mais antiga',
    );
    expect(legendaDaFila(filtro({ status: 'nova', tipo: 'bug', linhaServicoProvavel: 'indefinida' }))).toBe(
      'Demandas com status Nova, tipo Bug e linha de serviço Indefinida, da mais nova para a mais antiga',
    );
  });

  it('"N demandas encontradas." com o total, no singular para uma e com ponto no milhar', () => {
    expect(textoDemandasEncontradas(12)).toBe('12 demandas encontradas.');
    expect(textoDemandasEncontradas(1)).toBe('1 demanda encontrada.');
    expect(textoDemandasEncontradas(9012)).toBe('9.012 demandas encontradas.');
  });

  it('endereço da fila: só os filtros ativos, o offset fora da página 1 e o limite fora do padrão', () => {
    expect(hrefDaFila(SEM_FILTRO, 0)).toBe('/demandas');
    expect(hrefDaFila(filtro({ status: 'aguardando_informacao' }), 20)).toBe('/demandas?status=aguardando_informacao&offset=20');
    expect(hrefDaFila(filtro({ tipo: 'bug', linhaServicoProvavel: 'sob_medida', limit: '50' }), 0)).toBe('/demandas?tipo=bug&linhaServicoProvavel=sob_medida&limit=50');
  });
});

describe('ResultadoDaFila: com dados', () => {
  const itens = [demanda(42, { rascunhoAgente: true }), demanda(41, { tipo: 'estudo', status: 'aguardando_informacao', urgencia: null, linhaServicoProvavel: null })];
  const s = html(h(ResultadoDaFila, { filtro: filtro({ status: 'aguardando_informacao' }), itens, total: 2, ...leituras(itens) }));

  // T09 (G5): o id de foco passou do caption ao h2 do resultado; o caption ficou só para leitor de tela, com o mesmo
  // texto; "Criada em" virou "Idade", e entrou "Etapas" depois de "Status" (03, 4.2 e seção 9).
  it('região rolável com rótulo, caption focável com a descrição do filtro e as colunas da 03', () => {
    expect(s).toMatch(/<div role="region" aria-label="Tabela de demandas" tabindex="0"/);
    expect(s).toContain(`<h2 id="${ID_RESULTADO}" tabindex="-1"`);
    expect(s).toContain('>Demandas com status Aguardando informação, da mais nova para a mais antiga</caption>');
    for (const c of ['Id', 'Título', 'Tipo', 'Status', 'Etapas', 'Urgência', 'Linha de serviço', 'Idade']) expect(s).toContain(`<th scope="col" class="px-3 py-2 font-semibold">${c}</th>`);
  });

  it('id como link para T05, em fonte monoespaçada; rascunho de agente ao lado do título', () => {
    expect(s).toMatch(/<a [^>]*href="\/demandas\/DEM-20261022-0042"[^>]*>DEM-20261022-0042<\/a>/);
    expect(s).toMatch(/<a class="[^"]*font-mono[^"]*" href="\/demandas\/DEM-20261022-0042"/);
    expect(s).toMatch(/Pedidos duplicados no ERP \(fictício 42\)[\s\S]*?border-dashed[^>]*>Rascunho de agente<\/span>/);
    // Uma vez em cada forma (a tabela e o cartão), e as duas nunca ficam expostas juntas.
    expect(tabelaDe(s).match(/Rascunho de agente/g)).toHaveLength(1);
    expect(listaDe(s).match(/Rascunho de agente/g)).toHaveLength(1);
  });

  it('rótulos de 2.6, selo de status com texto, "Não informada" e data com <time>', () => {
    expect(s).toContain('<td class="px-3 py-2 align-top">Bug</td>');
    expect(s).toContain('<td class="px-3 py-2 align-top">Estudo</td>');
    expect(s).toMatch(/data-cor="violeta"[^>]*>Em análise<\/span>/);
    expect(s).toMatch(/data-cor="ambar"[^>]*>Aguardando informação<\/span>/);
    // T09: a urgência ganhou o ponto escondido antes do rótulo (03, 4.4).
    expect(s).toMatch(/<td class="px-3 py-2 align-top"><span [^>]*><span aria-hidden="true" class="[^"]*"><\/span>Alta<\/span><\/td>/);
    expect(s).toContain('<td class="px-3 py-2 align-top">Automação e integração</td>');
    expect(s.match(/<td class="px-3 py-2 align-top">Não informada<\/td>/g)).toHaveLength(2);
    // T09: a data continua no <time> (dateTime) e como texto "criada em dd/mm/aaaa"; o texto do <time> é a idade.
    expect(s).toContain('<time dateTime="2026-10-22T17:05:00.000Z">19 dias</time>');
    expect(s).toContain('<span class="sr-only">criada em </span>22/10/2026');
  });

  it('paginação na página 1: "Anterior" indisponível; "Próxima" indisponível com a página incompleta', () => {
    expect(s).toContain('<nav aria-label="Paginação">');
    expect(s).toMatch(/<a role="link" aria-disabled="true"[^>]*>Anterior<\/a>/);
    expect(s).toContain('>Página 1</span>');
    expect(s).toMatch(/<a role="link" aria-disabled="true"[^>]*>Próxima<\/a>/);
  });

  it('página cheia com mais demandas: "Próxima" leva ao offset seguinte, com o mesmo filtro', () => {
    const cheia = Array.from({ length: 20 }, (_, i) => demanda(100 - i));
    const p1 = html(h(ResultadoDaFila, { filtro: filtro({ tipo: 'bug' }), itens: cheia, total: 45, ...leituras(cheia) }));
    expect(p1).toMatch(/<a class="[^"]*" href="\/demandas\?tipo=bug&amp;offset=20">Próxima<\/a>/);
    const p2 = html(h(ResultadoDaFila, { filtro: filtro({ tipo: 'bug', offset: '20' }), itens: cheia, total: 45, ...leituras(cheia) }));
    expect(p2).toMatch(/href="\/demandas\?tipo=bug">Anterior<\/a>/);
    expect(p2).toContain('>Página 2</span>');
    expect(p2).toMatch(/href="\/demandas\?tipo=bug&amp;offset=40">Próxima<\/a>/);
    const p3 = html(h(ResultadoDaFila, { filtro: filtro({ tipo: 'bug', offset: '40' }), itens: cheia.slice(0, 5), total: 45, ...leituras(cheia) }));
    expect(p3).toMatch(/<a role="link" aria-disabled="true"[^>]*>Próxima<\/a>/);
    // Página cheia que é a última: o total diz que não há próxima.
    const exata = html(h(ResultadoDaFila, { filtro: SEM_FILTRO, itens: cheia, total: 20, ...leituras(cheia) }));
    expect(exata).toMatch(/<a role="link" aria-disabled="true"[^>]*>Próxima<\/a>/);
  });

  it('o título da demanda é texto, nunca HTML (C-18)', () => {
    const r = html(h(ResultadoDaFila, { filtro: SEM_FILTRO, itens: [demanda(1, { titulo: '<img src=x onerror=alert(1)>' })], total: 1, ...leituras([demanda(1)]) }));
    expect(r).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(r).not.toContain('<img');
  });
});

describe('ResultadoDaFila: vazio', () => {
  it('sem nenhuma demanda: o texto da 03 e o botão "Nova demanda", sem tabela', () => {
    const s = html(h(ResultadoDaFila, { filtro: SEM_FILTRO, itens: [], total: 0, ...leituras([]) }));
    expect(s).toContain(`<p id="${ID_RESULTADO}" tabindex="-1">Nenhuma demanda ainda. Crie a primeira colando o texto do pedido.</p>`);
    expect(s).toMatch(/<a class="[^"]*min-h-11[^"]*" href="\/demandas\/nova">Nova demanda<\/a>/);
    expect(s).not.toContain('<table');
    expect(s).not.toContain('Paginação');
  });

  it('com filtro e sem resultado: o texto da 03 e o link "Limpar filtros"', () => {
    const s = html(h(ResultadoDaFila, { filtro: filtro({ status: 'encerrada' }), itens: [], total: 0, ...leituras([]) }));
    expect(s).toContain(`<p id="${ID_RESULTADO}" tabindex="-1">Nenhuma demanda com esses filtros.</p>`);
    expect(s).toMatch(/<a [^>]*href="\/demandas"[^>]*>Limpar filtros<\/a>/);
    expect(s).not.toContain('Nenhuma demanda ainda');
    expect(s).not.toContain('<table');
  });

  it('página além do fim, sem filtro: a mensagem de filtro e "Anterior" para voltar', () => {
    const s = html(h(ResultadoDaFila, { filtro: filtro({ offset: '200' }), itens: [], total: 3, ...leituras([]) }));
    expect(s).toContain('Nenhuma demanda com esses filtros.');
    expect(s).toMatch(/href="\/demandas\?offset=180">Anterior<\/a>/);
  });
});

describe('ErroDaFila e CarregandoFila', () => {
  it('erro: o texto da 03, focável, e o botão "Tentar de novo"; nada de detalhe interno', () => {
    const s = html(h(ErroDaFila));
    expect(s).toContain(`<p id="${ID_RESULTADO}" tabindex="-1">Não foi possível carregar as demandas. Tente de novo em instantes.</p>`);
    expect(s).toMatch(/<button type="button"[^>]*>Tentar de novo<\/button>/);
    expect(s).toContain('border-erro');
  });

  it('carregando: tabela com aria-busy, 5 linhas de esqueleto e o texto oculto "Carregando demandas…" uma vez', () => {
    const s = html(h(CarregandoFila));
    expect(s).toContain('<table aria-busy="true"');
    expect(s.match(/<tr class="border-t border-linha">/g)).toHaveLength(5);
    expect(s.match(/Carregando demandas…/g)).toHaveLength(1);
    expect(s).toContain('<span class="sr-only">Carregando demandas…</span>');
    expect(s).not.toContain(`id="${ID_RESULTADO}"`);
  });
});

describe('FiltrosFila: o formulário (03, T03; WCAG 3.2.2)', () => {
  const s = html(h(FiltrosFila, { filtro: filtro({ status: 'aguardando_informacao', tipo: 'bug' }), idFoco: ID_RESULTADO }));

  it('formulário GET para /demandas, num fieldset "Filtros", com "Filtrar" e "Limpar filtros"', () => {
    expect(s).toMatch(/<form[^>]*action="\/demandas"[^>]*method="get"/);
    expect(s).toMatch(/<fieldset[^>]*><legend[^>]*>Filtros<\/legend>/);
    expect(s).toMatch(/<button type="submit"[^>]*>Filtrar<\/button>/);
    expect(s).toMatch(/<a [^>]*href="\/demandas"[^>]*>Limpar filtros<\/a>/);
  });

  // T09 (G5; 03, 4.2): o seletor "Status" saiu do formulário (o status vai oculto, com o valor da URL já validado) e
  // passou para os contadores, que têm "Todas" e os nove status, com os mesmos rótulos de 2.2.
  const contadores = html(h(ContadoresDaFila, { contadores: contadoresDaFila(null, filtro({ status: 'aguardando_informacao', tipo: 'bug' }), hrefDaFila), filtro: { tipo: 'bug' }, idFoco: ID_RESULTADO }));

  it('"Status", "Tipo" e "Linha de serviço", com "Todos" ou "Todas" e os rótulos de 2.2 e 2.6', () => {
    expect(s).toMatch(/<input type="hidden" name="status" value="aguardando_informacao"\/>/);
    expect(contadores).toMatch(/<div role="group" aria-label="Filtrar por status"/);
    expect(s).toMatch(/<label for="filtro-tipo"[^>]*>Tipo<\/label>/);
    expect(s).toMatch(/<select id="filtro-tipo"[^>]*name="tipo"/);
    expect(s).toMatch(/<label for="filtro-linha"[^>]*>Linha de serviço<\/label>/);
    expect(s).toMatch(/<select id="filtro-linha"[^>]*name="linhaServicoProvavel"/);
    expect(contadores).toMatch(/<button type="submit" value=""[^>]*name="status">[\s\S]*?Todas<\/span>[\s\S]*?<button type="submit" value="nova"[^>]*name="status">[\s\S]*?Nova<\/span>/);
    expect(contadores).toMatch(/<button type="submit" value="devolvida"[^>]*name="status">[\s\S]*?Devolvida pela construção<\/span>/);
    expect(s).toMatch(/<select id="filtro-tipo"[^>]*><option value="">Todos<\/option><option value="bug" selected="">Bug<\/option>/);
    expect(s).toMatch(/<select id="filtro-linha"[^>]*><option value="" selected="">Todas<\/option><option value="sob_medida">Sistema sob medida<\/option>/);
    expect(contadores).toMatch(/<button type="submit" value="" aria-pressed="true"[^>]*name="status">[\s\S]*?Aguardando informação<\/span>/);
  });

  it('nenhuma seleção aplica o filtro sozinha (sem onchange no HTML)', () => {
    expect(s).not.toMatch(/onchange/i);
  });
});

describe('EntradasAguardando (T-01, RF-05)', () => {
  const entradas: EntradaPendenteResumo[] = [
    { id: '00000000-0000-4000-8000-000000000001', recebidaEm: new Date('2026-10-22T17:05:00Z'), solicitantePapel: 'operacoes', status: 'aguardando' },
    { id: '00000000-0000-4000-8000-000000000002', recebidaEm: new Date('2026-10-21T12:30:00Z'), solicitantePapel: null, status: 'falhou' },
  ];

  it('sem entrada: nada', () => {
    expect(html(h(EntradasAguardando, { entradas: [] }))).toBe('');
  });

  it('título com a quantidade, linha "Recebida em … — <papel>" e o estado de cada uma', () => {
    const s = html(h(EntradasAguardando, { entradas }));
    expect(s).toMatch(/<section aria-labelledby="entradas-aguardando"[^>]*><h2 id="entradas-aguardando"[^>]*>Entradas aguardando o agente orquestrador \(2\)<\/h2>/);
    expect(s).toContain('Recebida em <time dateTime="2026-10-22T17:05:00.000Z">22/10/2026 às 14:05</time> — Operações');
    expect(s).toContain('Recebida em <time dateTime="2026-10-21T12:30:00.000Z">21/10/2026 às 09:30</time> — Não informado');
    expect(s).toContain('O agente está preparando os campos.');
    expect(s).toContain('O agente não conseguiu preparar os campos.');
    expect(s.match(/<li/g)).toHaveLength(2);
  });

  it('"Preencher à mão" só na que falhou, levando a /demandas/nova?entrada=<id>, com a linha como descrição', () => {
    const s = html(h(EntradasAguardando, { entradas }));
    expect(s.match(/Preencher à mão/g)).toHaveLength(1);
    expect(s).toMatch(
      /<a class="[^"]*min-h-11[^"]*" aria-describedby="entrada-00000000-0000-4000-8000-000000000002" href="\/demandas\/nova\?entrada=00000000-0000-4000-8000-000000000002">Preencher à mão<\/a>/,
    );
    expect(s).toContain('id="entrada-00000000-0000-4000-8000-000000000002"');
  });

  it('mesmo que a linha traga texto, origem ou nome do solicitante (dado de terceiro), a tela não os mostra', () => {
    const comDadoDeTerceiro = entradas.map((e) => ({ ...e, texto: 'SENTINELA-TEXTO', origem: 'SENTINELA-ORIGEM', solicitanteNome: 'SENTINELA-NOME' }));
    const s = html(h(EntradasAguardando, { entradas: comDadoDeTerceiro }));
    expect(s).not.toContain('SENTINELA');
  });
});
