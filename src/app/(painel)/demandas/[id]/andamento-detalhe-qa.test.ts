// Escrito na 06-T13-testes (qa-automacao), T13 do DEC-DEM-20261111-0017-v1 (RF-07, RF-09, CA-07.1 a CA-07.3, CA-09.1 a
// CA-09.4, CA-05.11 na tela, CA-04.6 no detalhe; 03, 5.1 a 5.8). O que os testes da construção não alcançam sem
// navegador: o HTML do servidor de SecaoAndamento.tsx (que nenhum Vitest renderiza) e a ligação real da página com
// secaoDoAndamento e proximaAcao (o e2e lê só o seed, e o seed não tem andamento fora do esquema, DEC substituído nem
// demanda Entregue com andamento). A sessão, o banco e as leituras são dublês, como em detalhe.test.ts; a matriz de
// acesso é a real. Datas fixas, sem relógio; dados só fictícios.
import { createElement as h, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { secaoDoAndamento, TEXTOS_ANDAMENTO, type SecaoDoAndamento } from '../../../../components/dados-do-andamento';
import { formatarDataHora } from '../../../../lib/fuso';
import type { AtorPessoa } from '../../../../modules/acesso/ator';
import { exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import type { AndamentoVista } from '../../../../modules/andamento/schemas';
import { obterDemanda, type DemandaVista, type PacoteResumo, type VersaoResumo } from '../../../../modules/demandas/consultas';
import { obterTextoRecebido } from '../../../../modules/demandas/texto-recebido';
import { obterEspecificacao } from '../../../../modules/especificacoes/consultas';
import { listarHistorico } from '../../../../modules/historico/consultas';
import { obterPacoteDecisao, type PacoteDecisaoVista } from '../../../../modules/pacotes-decisao/consultas';
import { ID_SECAO } from './detalhe';
import PaginaDemanda from './page';
import { ID_TAREFAS_PRONTAS, SecaoAndamento } from './SecaoAndamento';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/demandas/DEM-20991231-0042',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('../../../../lib/deps', () => ({
  obterDeps: async () => ({ db: { dubleDoBanco: true }, relogio: { dubleDoRelogio: true }, config: { retencaoDias: 90 } }),
}));
vi.mock('../../../../modules/acesso/exigir-pessoa', () => ({ exigirPessoaNaPagina: vi.fn(), exigirPessoa: vi.fn() }));
vi.mock('../../../../modules/demandas/consultas', async (original) => {
  const real = await original<typeof import('../../../../modules/demandas/consultas')>();
  return { ...real, obterDemanda: vi.fn() };
});
vi.mock('../../../../modules/demandas/texto-recebido', async (original) => {
  const real = await original<typeof import('../../../../modules/demandas/texto-recebido')>();
  return { ...real, obterTextoRecebido: vi.fn() };
});
vi.mock('../../../../modules/historico/consultas', async (original) => {
  const real = await original<typeof import('../../../../modules/historico/consultas')>();
  return { ...real, listarHistorico: vi.fn() };
});
vi.mock('../../../../modules/especificacoes/consultas', async (original) => {
  const real = await original<typeof import('../../../../modules/especificacoes/consultas')>();
  return { ...real, obterEspecificacao: vi.fn() };
});
vi.mock('../../../../modules/pacotes-decisao/consultas', async (original) => {
  const real = await original<typeof import('../../../../modules/pacotes-decisao/consultas')>();
  return { ...real, obterPacoteDecisao: vi.fn() };
});
// A Server Action não roda aqui: o HTML do primeiro estado não envia nada.
vi.mock('./acoes', () => ({ mudarStatusNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));

const mExigirNaPagina = vi.mocked(exigirPessoaNaPagina);
const mObter = vi.mocked(obterDemanda);
const mTexto = vi.mocked(obterTextoRecebido);
const mHistorico = vi.mocked(listarHistorico);
const mEsp = vi.mocked(obterEspecificacao);
const mDec = vi.mocked(obterPacoteDecisao);

const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'usuario-ficticio-1', nome: 'Pessoa Ficticia', papel: 'cto' };
const ID = 'DEM-20991231-0042';
const CRIADA = new Date('2099-12-30T12:00:00Z');
// 17:32 UTC = 14:32 no fuso do sistema (America/Sao_Paulo).
const ATUALIZADO = new Date('2099-12-31T17:32:00Z');
const ATUALIZADO_NA_TELA = '31/12/2099 às 14:32';
const idDec = (v: number) => `DEC-${ID}-v${v}`;

const LINHA_11 = 'Acompanhar a construção. Quando terminar, mudar o status para Entregue ou Devolvida pela construção.';
const LINHA_12 = 'Ler o motivo da devolução no histórico e voltar a demanda para Em construção ou Em análise.';
const LINHA_15 = 'Construção concluída: confira e marque como Entregue.';
const DETALHE_15 = 'O /construir não marca Entregue: quem confere a entrega é uma pessoa.';

const versao = (prefixo: 'ESP' | 'RSK'): VersaoResumo => ({
  id: `${prefixo}-${ID}-v1`,
  versao: 1,
  criadaEm: CRIADA,
  autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
  rascunhoAgente: false,
});
const pacote = (v: number, extra: Partial<PacoteResumo> = {}): PacoteResumo => ({
  id: idDec(v),
  versao: v,
  criadaEm: CRIADA,
  autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
  rascunhoAgente: false,
  statusDecisao: 'aprovada',
  desatualizado: false,
  substituido: false,
  substituidoPor: null,
  ...extra,
});
const vistaDoDec = (v: number): PacoteDecisaoVista =>
  ({
    id: idDec(v),
    demandaId: ID,
    versao: v,
    statusDecisao: 'aprovada',
    desatualizado: false,
    substituido: false,
    substituidoPor: null,
    nivelAprovacaoRequerido: 'cto',
    aprovadores: [],
    decisao: { opcaoEscolhida: 'A', comentarios: null, decididaPor: 'Pessoa Ficticia CTO', decididaEm: CRIADA },
  }) as unknown as PacoteDecisaoVista;

const andamento = (a: Partial<AndamentoVista> = {}): AndamentoVista => ({
  decId: idDec(1),
  fase: 'construindo',
  tarefasProntas: 9,
  tarefasTotal: 17,
  statusConstrucao: 'em_construcao',
  atualizadoEm: ATUALIZADO,
  ...a,
});

// Demanda com ESP, RSK e o DEC v1 aprovado (o vigente, salvo quando `pacotes` diz outra coisa): a Próxima ação chega à
// linha do status, como no seed da T10.
function comDemanda(status: DemandaVista['status'], a: AndamentoVista | null | undefined, pacotes: PacoteResumo[] = [pacote(1)]): void {
  const d = {
    id: ID,
    titulo: 'Construção em curso (fictício)',
    tipo: 'melhoria',
    status,
    solicitanteNome: 'Pessoa Ficticia Solicitante',
    solicitantePapel: 'produto',
    linhaServicoProvavel: null,
    urgencia: 'media',
    justificativaUrgencia: null,
    contexto: 'Contexto fictício',
    descricaoProblema: null,
    impactoPercebido: null,
    anexos: [],
    duvidasEntrada: [],
    rascunhoAgente: false,
    responsavel: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
    criadaEm: CRIADA,
    atualizadaEm: CRIADA,
    especificacoes: [versao('ESP')],
    pareceresRisco: [versao('RSK')],
    pacotesDecisao: pacotes,
    agentesEmAndamento: [],
    ...(a === undefined ? {} : { andamento: a }),
  } as DemandaVista;
  mObter.mockResolvedValue(d);
  mEsp.mockResolvedValue({ id: `ESP-${ID}-v1`, duvidasEmAberto: [] } as unknown as Awaited<ReturnType<typeof obterEspecificacao>>);
  mDec.mockResolvedValue(vistaDoDec(pacotes[0]!.versao));
}

const html = (el: ReactElement) => renderToStaticMarkup(el);
const detalhe = async () => html(await PaginaDemanda({ params: Promise.resolve({ id: ID }), searchParams: Promise.resolve({}) }));

// O trecho de uma `section` pelo aria-labelledby, até o fim dela (as seções não se aninham).
function secaoDe(p: string, rotuloPor: string): string {
  const inicio = p.indexOf(`<section aria-labelledby="${rotuloPor}"`);
  return inicio < 0 ? '' : p.slice(inicio, p.indexOf('</section>', inicio));
}
const linksDaNav = (p: string) => {
  const inicio = p.indexOf('<nav aria-label="Nesta página"');
  const nav = p.slice(inicio, p.indexOf('</nav>', inicio));
  return [...nav.matchAll(/<a href="#([a-z-]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => [m[1], m[2]]);
};
const termos = (trecho: string) => [...trecho.matchAll(/<dt[^>]*>([^<]+)<\/dt>/g)].map((m) => m[1]);
// O valor (dd) logo depois do termo (dt).
const valor = (trecho: string, termo: string) => new RegExp(`<dt[^>]*>${termo}</dt><dd[^>]*>([\\s\\S]*?)</dd>`).exec(trecho)?.[1] ?? null;

const CLASSE_DO_LINK = 'inline-flex min-h-11 min-w-11 items-center md:min-h-6 md:min-w-6 text-acao-escura underline underline-offset-2';

describe('SecaoAndamento.tsx: o HTML do servidor (03, 5.2 e 5.3)', () => {
  const montar = (s: SecaoDoAndamento) => html(h(SecaoAndamento, { secao: s, classeDoLink: CLASSE_DO_LINK }));
  const real = (a: AndamentoVista, pacotes: Pick<PacoteResumo, 'id' | 'substituido'>[] = []) => secaoDoAndamento(a, pacotes, formatarDataHora)!;

  it('CA-09.1: os quatro termos na ordem da 03, o link do DEC com a classe recebida, a barra nativa com nome pelo dt, a data em <time> e a nota', () => {
    const p = montar(real(andamento()));
    expect(termos(p)).toEqual(['Pedido de Construção', 'Fase', 'Situação', 'Tarefas prontas']);
    expect(p).toContain(`<dt id="${ID_TAREFAS_PRONTAS}" class=`);
    expect(valor(p, 'Fase')).toBe('Construindo');
    expect(valor(p, 'Situação')).toBe('Em andamento');
    // O link do DEC: a classe da página (44 px abaixo de 768 px), em Mono e quebrando em qualquer ponto.
    expect(p).toMatch(
      new RegExp(`<a (?=[^>]*href="/pacotes-decisao/${idDec(1)}")(?=[^>]*class="${CLASSE_DO_LINK} max-w-full font-mono \\[overflow-wrap:anywhere\\]")[^>]*>${idDec(1)}</a>`),
    );
    // A barra: <progress> nativo com valor, máximo, nome pelo dt, texto do valor e o recurso como conteúdo.
    expect(p).toMatch(
      new RegExp(
        `<progress (?=[^>]*value="9")(?=[^>]*max="17")(?=[^>]*aria-labelledby="${ID_TAREFAS_PRONTAS}")(?=[^>]*aria-valuetext="9 de 17 tarefas")[^>]*>9 de 17</progress>`,
      ),
    );
    expect(p).toContain('<span>9 de 17 tarefas</span>');
    expect(p).toContain(`<p class="text-sm text-tinta">${TEXTOS_ANDAMENTO.ultimaMudanca}<time dateTime="${ATUALIZADO.toISOString()}">${ATUALIZADO_NA_TELA}</time>.</p>`);
    expect(p).toContain(`<p class="text-[0.8125rem] text-tinta-media">${TEXTOS_ANDAMENTO.nota}</p>`);
  });

  it('só informa: o único elemento focável é o link do DEC; nenhum style=, role="alert", animação nem transição (CV-02; 03, 5.3)', () => {
    const p = montar(real(andamento({ statusConstrucao: 'cancelado' }), [{ id: idDec(1), substituido: true }]));
    expect(p.match(/<a /g)).toHaveLength(1);
    expect(p).not.toMatch(/<(?:button|input|select|textarea|details|summary)\b/);
    expect(p).not.toMatch(/tabindex=/i);
    expect(p).not.toMatch(/\sstyle=/);
    expect(p).not.toContain('role="alert"');
    expect(p).not.toMatch(/\banimate-|\btransition\b|\btransition-/);
  });

  it('CA-09.2: total 0 → só o texto da 03 no dd, sem <progress> e sem o id do dt referenciado', () => {
    const p = montar(real(andamento({ fase: 'entendendo_o_pedido', tarefasProntas: 0, tarefasTotal: 0 })));
    expect(valor(p, 'Tarefas prontas')).toBe(TEXTOS_ANDAMENTO.semPlano);
    expect(p).not.toContain('<progress');
    expect(p).not.toContain('aria-labelledby');
  });

  it('CA-09.3 e 5.2 item 3: cancelada e substituído → os dois Alerta atencao estáticos, nessa ordem, cada um uma vez', () => {
    const p = montar(real(andamento({ statusConstrucao: 'cancelado' }), [{ id: idDec(1), substituido: true }]));
    expect(valor(p, 'Situação')).toBe('Cancelada');
    const alertas = [...p.matchAll(/<div class="rounded-campo border-l-4 px-4 py-3 border-atencao bg-atencao-fundo text-atencao">([^<]*)<\/div>/g)].map((m) => m[1]);
    expect(alertas).toEqual([TEXTOS_ANDAMENTO.cancelada, TEXTOS_ANDAMENTO.substituido(idDec(1))]);
  });

  it('decId fora do formato (CV-19): "Não informado" no dd, sem link nenhum', () => {
    const p = montar(real(andamento({ decId: 'DEC-xyz' })));
    expect(valor(p, 'Pedido de Construção')).toBe('Não informado');
    expect(p).not.toContain('<a ');
    expect(p).not.toContain('DEC-xyz');
  });

  it('C-18: todo valor da seção sai como texto escapado pelo React, mesmo montado à mão fora de secaoDoAndamento', () => {
    const forjada: SecaoDoAndamento = {
      dec: null,
      fase: '<img src=x onerror=alert(1)>',
      situacao: '<script>alert(2)</script>',
      tarefas: { tipo: 'sem_plano', texto: '<b>texto</b>' },
      alertas: ['<i>alerta</i>'],
      ultimaMudanca: { data: '<u>data</u>', iso: '"><svg onload=alert(3)>' },
      nota: '<s>nota</s>',
    };
    const p = montar(forjada);
    for (const cru of ['<img', '<script', '<b>', '<i>', '<u>', '<s>', '<svg']) expect(p).not.toContain(cru);
    expect(p).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(p).toContain('dateTime="&quot;&gt;&lt;svg onload=alert(3)&gt;"');
  });
});

describe('page.tsx com o andamento (RF-07, RF-09; 03, 5.1)', () => {
  beforeEach(() => {
    mExigirNaPagina.mockReset().mockResolvedValue(CTO);
    mTexto.mockReset().mockResolvedValue({ situacao: 'sem_texto' });
    mHistorico.mockReset().mockResolvedValue([]);
    mEsp.mockReset();
    mDec.mockReset();
    mObter.mockReset();
  });

  it('CA-09.1 (HTML): a seção logo depois da Próxima ação e antes de Dados, h2 focável, primeiro item de "Nesta página", link do DEC com 44 px; o Histórico desce uma linha', async () => {
    comDemanda('em_construcao', andamento());
    const p = await detalhe();
    expect(linksDaNav(p)[0]).toEqual([ID_SECAO.andamento, 'Andamento da construção']);
    expect(linksDaNav(p).slice(1).map(([alvo]) => alvo)).toEqual([ID_SECAO.dados, ID_SECAO.versoes, ID_SECAO.status, ID_SECAO.texto, ID_SECAO.historico]);
    expect(p).toMatch(/<section aria-labelledby="andamento-da-construcao" class="[^"]*\bxl:col-start-3 xl:row-start-2"><h2 id="andamento-da-construcao" tabindex="-1">Andamento da construção<\/h2>/);
    const posProxima = p.indexOf('<section aria-labelledby="proxima-acao"');
    const posAndamento = p.indexOf('<section aria-labelledby="andamento-da-construcao"');
    const posDados = p.indexOf('<section aria-labelledby="dados"');
    expect(posProxima).toBeGreaterThan(-1);
    expect(posAndamento).toBeGreaterThan(posProxima);
    expect(posDados).toBeGreaterThan(posAndamento);
    expect(p.match(/aria-labelledby="andamento-da-construcao"/g)).toHaveLength(1);
    expect(p).toMatch(/<section aria-labelledby="historico" class="[^"]*\bxl:col-start-3 xl:row-\[3\/-1\]"/);

    const s = secaoDe(p, ID_SECAO.andamento);
    expect(s).toMatch(new RegExp(`<a (?=[^>]*href="/pacotes-decisao/${idDec(1)}")(?=[^>]*class="${CLASSE_DO_LINK} max-w-full font-mono [^"]*")[^>]*>${idDec(1)}</a>`));
    expect(s).toMatch(/<progress (?=[^>]*value="9")(?=[^>]*max="17")[^>]*>/);
    expect(s).toContain(`<time dateTime="${ATUALIZADO.toISOString()}">${ATUALIZADO_NA_TELA}</time>`);
    // Em construção, com o andamento em curso: a Próxima ação é a linha 11 de hoje (CA-07.2).
    expect(secaoDe(p, 'proxima-acao')).toContain(LINHA_11);
  });

  it.each([
    ['null', null],
    ['chave ausente', undefined],
  ] as const)('CA-09.4 e CA-07.2 (HTML): andamento %s → nem seção nem item em "Nesta página"; o Histórico na linha 2; linha 11', async (_, a) => {
    comDemanda('em_construcao', a);
    const p = await detalhe();
    expect(p).not.toContain('andamento-da-construcao');
    expect(p).not.toContain('Andamento da construção');
    expect(p).not.toContain('<progress');
    expect(linksDaNav(p)[0]).toEqual([ID_SECAO.dados, 'Dados']);
    expect(p).toMatch(/<section aria-labelledby="historico" class="[^"]*\bxl:col-start-3 xl:row-\[2\/-1\]"/);
    expect(secaoDe(p, 'proxima-acao')).toContain(LINHA_11);
  });

  it('CA-04.6 (detalhe): andamento fora do esquema montado à mão → a página abre, sem seção, sem item e sem o valor no HTML', async () => {
    const forjados: Record<string, unknown>[] = [
      { fase: '<img src=x onerror=alert(1)>' },
      { fase: '__proto__' },
      { tarefasProntas: 18 },
      { tarefasTotal: 1000 },
      { statusConstrucao: 'entregue' },
      { atualizadoEm: new Date('x') },
    ];
    for (const forjado of forjados) {
      comDemanda('em_construcao', andamento(forjado as Partial<AndamentoVista>));
      const p = await detalhe();
      expect(p, JSON.stringify(forjado)).not.toContain('andamento-da-construcao');
      expect(p, JSON.stringify(forjado)).not.toContain('<progress');
      expect(p, JSON.stringify(forjado)).not.toContain('<img src=x');
      expect(p, JSON.stringify(forjado)).not.toContain('onerror=alert(1)');
      expect(secaoDe(p, 'proxima-acao'), JSON.stringify(forjado)).toContain(LINHA_11);
    }
  });

  it('CA-07.1 (HTML): construido do DEC vigente → linha 15, o detalhe, "Uma pessoa" e o link para #mudar-status; a seção diz "Concluída"', async () => {
    comDemanda('em_construcao', andamento({ fase: 'documentando', tarefasProntas: 17, statusConstrucao: 'construido' }));
    const p = await detalhe();
    const cartao = secaoDe(p, 'proxima-acao');
    expect(cartao).toContain(`>${LINHA_15}</p>`);
    expect(cartao).toContain(`>${DETALHE_15}</p>`);
    expect(cartao).toMatch(/Quem age:<\/span> Uma pessoa \(CTO ou administradora\)</);
    expect(cartao).toMatch(new RegExp(`<a href="#${ID_SECAO.status}"[^>]*>Mudar o status</a>`));
    expect(cartao).not.toContain(LINHA_11);
    expect(valor(secaoDe(p, ID_SECAO.andamento), 'Situação')).toBe('Concluída');
    // O alvo do link existe na página, com o h2 focável.
    expect(p).toContain(`<h2 id="${ID_SECAO.status}" tabindex="-1">Mudar status</h2>`);
  });

  it('CA-07.3 (HTML): a mesma demanda marcada Entregue → linha 1; a seção continua (o RF-09 não restringe o status)', async () => {
    comDemanda('entregue', andamento({ fase: 'documentando', tarefasProntas: 17, statusConstrucao: 'construido' }));
    const p = await detalhe();
    const cartao = secaoDe(p, 'proxima-acao');
    expect(cartao).toContain('Nada. A demanda está em Entregue.');
    expect(cartao).toMatch(/Quem age:<\/span> Ninguém</);
    expect(cartao).not.toContain(LINHA_15);
    expect(cartao).not.toContain('<a ');
    expect(valor(secaoDe(p, ID_SECAO.andamento), 'Situação')).toBe('Concluída');
  });

  it('CA-05.11 (tela): devolvida pelo cancelado → a seção com "Cancelada" e o alerta, a linha 12 e as opções de hoje em Mudar status', async () => {
    comDemanda('devolvida', andamento({ tarefasProntas: 3, tarefasTotal: 8, statusConstrucao: 'cancelado' }));
    const p = await detalhe();
    const s = secaoDe(p, ID_SECAO.andamento);
    expect(valor(s, 'Situação')).toBe('Cancelada');
    expect(s).toContain(TEXTOS_ANDAMENTO.cancelada);
    expect(secaoDe(p, 'proxima-acao')).toContain(LINHA_12);
    const opcoes = [...secaoDe(p, ID_SECAO.status).matchAll(/<input type="radio" id="campo-novoStatus-([a-z_]+)"/g)].map((m) => m[1]).sort();
    expect(opcoes).toEqual(['em_analise', 'em_construcao']);
  });

  it('DEC substituído (03, 5.2 item 3; CA-07.2): andamento construido do v1 com o v2 vigente → a seção com o link do v1 e o alerta; a Próxima ação fica na linha 11', async () => {
    const pacotes = [pacote(2), pacote(1, { substituido: true, substituidoPor: idDec(2) })];
    comDemanda('em_construcao', andamento({ statusConstrucao: 'construido' }), pacotes);
    const p = await detalhe();
    const s = secaoDe(p, ID_SECAO.andamento);
    expect(s).toMatch(new RegExp(`<a (?=[^>]*href="/pacotes-decisao/${idDec(1)}")[^>]*>${idDec(1)}</a>`));
    expect(s).toContain(TEXTOS_ANDAMENTO.substituido(idDec(1)));
    const cartao = secaoDe(p, 'proxima-acao');
    expect(cartao).toContain(LINHA_11);
    expect(cartao).not.toContain(LINHA_15);
  });
});
