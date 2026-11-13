// T18 do DEC-DEM-20261111-0016-v1: a seção "Confirmação do Awave" da T05 e o que a página liga a ela (RF-06 na tela,
// CA-06.7; RF-10 no detalhe, CA-10.1 e CA-10.4; 03, 5.1 a 5.5 e seção 10; C-18). O HTML do servidor do componente e da
// página, com a sessão, o banco e as leituras em dublê e a matriz real. Selo, seção, "Nesta página" e Próxima ação são
// conferidos juntos nos três estados (Pendência da 06-T17-revisao). Envio, foco, rede e axe ficam no e2e
// (e2e/confirmacao-awave.spec.ts e o IN-07 em e2e/seguranca.spec.ts). Datas fixas; dados só fictícios.
import { createElement as h, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AtorPessoa } from '../../../../modules/acesso/ator';
import { exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { obterDemanda, type DemandaVista } from '../../../../modules/demandas/consultas';
import { obterTextoRecebido } from '../../../../modules/demandas/texto-recebido';
import { listarHistorico, type EventoVisivel } from '../../../../modules/historico/consultas';
import { ConfirmarDemanda, ID_CONSEQUENCIA } from './ConfirmarDemanda';
import { ID_SECAO } from './detalhe';
import PaginaDemanda from './page';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/demandas/DEM-20261111-0021',
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
// As Server Actions não rodam aqui: o HTML do primeiro estado não envia nada.
vi.mock('./acoes', () => ({
  mudarStatusNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }),
  confirmarDemandaNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }),
}));

const html = (el: ReactElement) => renderToStaticMarkup(el);

const P1 = 'Esta demanda foi aberta pelo Awave e ainda não foi confirmada. Até uma pessoa confirmar, nenhum agente de IA trabalha nela.';
const P2 =
  'Ao confirmar, a demanda segue o fluxo de qualquer outra: se o agente de insumo técnico estiver ligado, ele recebe o título, a descrição e o contexto e começa a especificação técnica.';
const P3 = 'Leia os dados antes. Se a demanda não deve seguir, não confirme: use Mudar status e escolha Encerrada.';
const FINAL_ENCERRADA = 'Esta demanda foi aberta pelo Awave e não foi confirmada. Ela está em Encerrada, um status final: não há confirmação a fazer.';
const ID = 'DEM-20261111-0021';

describe('ConfirmarDemanda.tsx (03, 5.4)', () => {
  it('aguardando: três parágrafos, o segundo com o id da consequência; botão primário de 44 px ligado a ele; região de aviso montada; sem diálogo', () => {
    const p = html(h(ConfirmarDemanda, { id: ID, estado: { tipo: 'aguardando' } }));
    expect(ID_CONSEQUENCIA).toBe('confirmacao-consequencia');
    const paragrafos = [...p.matchAll(/<p( id="[^"]+")?[^>]*>([^<]*)<\/p>/g)].map((m) => [m[1] ?? '', m[2]]);
    expect(paragrafos).toEqual([
      ['', P1],
      [' id="confirmacao-consequencia"', P2],
      ['', P3],
    ]);
    expect(p).toMatch(/<button type="button"[^>]*aria-describedby="confirmacao-consequencia"[^>]*>Confirmar demanda<\/button>/);
    const botao = /<button[^>]*class="([^"]*)"/.exec(p)?.[1] ?? '';
    for (const c of ['min-h-11', 'bg-acao', 'text-branco', 'max-md:w-full']) expect(botao.split(' ')).toContain(c);
    expect(p).toContain('<div role="status" class="sr-only"></div>');
    expect(p).toContain('aria-busy="false"');
    expect(p).not.toContain('role="alert"');
    expect(p).not.toContain('<dialog');
    expect(p).not.toContain('Cancelar');
    // A tela não diz se o agente de insumo foi acionado (parecer 3 da 06-T08-revisao).
    expect(p).not.toMatch(/acionad|começou a|iniciad/);
  });

  it('o parágrafo da consequência vem antes do botão (a pessoa lê antes de agir)', () => {
    const p = html(h(ConfirmarDemanda, { id: ID, estado: { tipo: 'aguardando' } }));
    expect(p.indexOf(`id="${ID_CONSEQUENCIA}"`)).toBeLessThan(p.indexOf('<button'));
  });

  it('confirmada: "Confirmada por <ator> em <time>." e o apoio; sem botão; a região de aviso continua montada', () => {
    const p = html(h(ConfirmarDemanda, { id: ID, estado: { tipo: 'confirmada', ator: 'Ana Ficticia (CTO)', data: '11/11/2026 às 14:32', iso: '2026-11-11T17:32:00.000Z' } }));
    expect(p).toContain('<p>Confirmada por Ana Ficticia (CTO) em <time dateTime="2026-11-11T17:32:00.000Z">11/11/2026 às 14:32</time>.</p>');
    expect(p).toContain('<p>Desde a confirmação, a demanda segue o fluxo de qualquer outra.</p>');
    expect(p).not.toContain('<button');
    expect(p).toContain('<div role="status"');
  });

  it('C-18: o nome da pessoa em "Confirmada por" sai como texto', () => {
    const p = html(h(ConfirmarDemanda, { id: ID, estado: { tipo: 'confirmada', ator: '<img src=x onerror=alert(1)> (CTO)', data: '11/11/2026 às 14:32', iso: '2026-11-11T17:32:00.000Z' } }));
    expect(p).toContain('Confirmada por &lt;img src=x onerror=alert(1)&gt; (CTO) em <time');
    expect(p).not.toContain('<img');
  });

  it('o nome que contém o texto da data não desloca o <time>: a data é a do fim da frase', () => {
    const p = html(h(ConfirmarDemanda, { id: ID, estado: { tipo: 'confirmada', ator: 'Ana 11/11/2026 às 14:32 Ficticia', data: '11/11/2026 às 14:32', iso: '2026-11-11T17:32:00.000Z' } }));
    expect(p).toContain('<p>Confirmada por Ana 11/11/2026 às 14:32 Ficticia em <time dateTime="2026-11-11T17:32:00.000Z">11/11/2026 às 14:32</time>.</p>');
  });

  it('final sem confirmação: um parágrafo com o status, sem botão', () => {
    const p = html(h(ConfirmarDemanda, { id: ID, estado: { tipo: 'final_sem_confirmacao', status: 'Encerrada' } }));
    expect(p).toContain(`<p>${FINAL_ENCERRADA}</p>`);
    expect(p).not.toContain('<button');
    expect(p).toContain('<div role="status"');
  });
});

describe('page.tsx: a demanda do Awave na T05 (03, 5.1 a 5.5)', () => {
  const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'usuario-ficticio-1', nome: 'Pessoa Ficticia', papel: 'cto' };
  const CRIADA = new Date('2026-11-11T13:05:00Z');
  const CONFIRMADA = new Date('2026-11-11T17:32:00Z');
  const mExigir = vi.mocked(exigirPessoaNaPagina);
  const mObter = vi.mocked(obterDemanda);
  const mTexto = vi.mocked(obterTextoRecebido);
  const mHistorico = vi.mocked(listarHistorico);

  const demanda = (extra: Partial<DemandaVista> = {}): DemandaVista => ({
    id: ID,
    titulo: 'Relatório semanal (fictício)',
    tipo: 'melhoria',
    status: 'nova',
    solicitanteNome: 'Awave',
    solicitantePapel: 'outro',
    linhaServicoProvavel: null,
    urgencia: null,
    justificativaUrgencia: null,
    contexto: 'Contexto fictício',
    descricaoProblema: 'Descrição fictícia',
    impactoPercebido: null,
    anexos: [],
    duvidasEntrada: [],
    rascunhoAgente: true,
    responsavel: { tipo: 'integracao', integracao: 'awave' },
    criadaEm: CRIADA,
    atualizadaEm: CRIADA,
    especificacoes: [],
    pareceresRisco: [],
    pacotesDecisao: [],
    agentesEmAndamento: [],
    andamento: null,
    ...extra,
  });
  let n = 1;
  const evento = (acao: EventoVisivel['acao'], extra: Partial<EventoVisivel> = {}): EventoVisivel => ({
    id: n++,
    ocorridoEm: CRIADA,
    ator: { tipo: 'integracao', integracao: 'awave', prefixo: 'ficticio' },
    entidade: 'demanda',
    entidadeId: ID,
    acao,
    antes: null,
    depois: null,
    ...extra,
  });
  const criada = evento('demanda_criada');
  const confirmada = evento('demanda_confirmada', { ocorridoEm: CONFIRMADA, ator: { tipo: 'pessoa', nome: 'Ana Ficticia', papel: 'cto' }, depois: { confirmada: true } });

  const detalhe = async () => html(await PaginaDemanda({ params: Promise.resolve({ id: ID }), searchParams: Promise.resolve({}) }));
  const cabecalho = (p: string) => p.slice(0, p.indexOf('</h1>'));
  const nav = (p: string) => {
    const i = p.indexOf('<nav aria-label="Nesta página"');
    return [...p.slice(i, p.indexOf('</nav>', i)).matchAll(/<a href="#([a-z-]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => [m[1], m[2]]);
  };
  const h2 = (p: string) => [...p.matchAll(/<h2 id="([a-z-]+)" tabindex="-1"[^>]*>([^<]+)<\/h2>/gi)].map((m) => m[2]);
  const proxima = (p: string) => {
    const i = p.indexOf('<section aria-labelledby="proxima-acao"');
    return p.slice(i, p.indexOf('</section>', i));
  };
  const valorDe = (p: string, termo: string) => new RegExp(`<dt[^>]*>${termo}</dt><dd[^>]*>([^<]*)</dd>`).exec(p)?.[1];
  const COM_CONFIRMACAO = [
    [ID_SECAO.dados, 'Dados'],
    [ID_SECAO.confirmacao, 'Confirmação do Awave'],
    [ID_SECAO.versoes, 'Versões'],
    [ID_SECAO.status, 'Mudar status'],
    [ID_SECAO.texto, 'Texto recebido'],
    [ID_SECAO.historico, 'Histórico'],
  ];

  beforeEach(() => {
    mExigir.mockReset().mockResolvedValue(CTO);
    mObter.mockReset().mockResolvedValue(demanda());
    mTexto.mockReset().mockResolvedValue({ situacao: 'sem_texto' });
    mHistorico.mockReset().mockResolvedValue([criada]);
  });

  it('aguardando: selo depois do de rascunho; seção depois de Dados, também em "Nesta página"; linha 14 na Próxima ação; o botão', async () => {
    const p = await detalhe();
    const c = cabecalho(p);
    expect(c.indexOf('Rascunho de agente')).toBeGreaterThan(0);
    expect(c.indexOf('Aguardando confirmação')).toBeGreaterThan(c.indexOf('Rascunho de agente'));
    expect(nav(p)).toEqual(COM_CONFIRMACAO);
    expect(h2(p)).toEqual(['Dados', 'Confirmação do Awave', 'Versões', 'Mudar status', 'Texto recebido', 'Histórico']);
    expect(p).toMatch(/<section aria-labelledby="confirmacao"[^>]*><h2 id="confirmacao" tabindex="-1"/i);
    expect(proxima(p)).toContain('Confirmar a demanda aberta pelo Awave.');
    expect(proxima(p)).toMatch(/<a href="#confirmacao"[^>]*>Ir para a confirmação<\/a>/);
    expect(p).toContain(`<p id="confirmacao-consequencia">${P2}</p>`);
    expect(p).toMatch(/>Confirmar demanda<\/button>/);
  });

  it('confirmada: sem selo nem linha 14; a seção fica, com quem e quando em <time>; sem botão', async () => {
    mHistorico.mockResolvedValue([confirmada, criada]);
    const p = await detalhe();
    expect(cabecalho(p)).not.toContain('Aguardando confirmação');
    expect(nav(p)).toEqual(COM_CONFIRMACAO);
    expect(proxima(p)).not.toContain('Confirmar a demanda aberta pelo Awave.');
    expect(p).toContain('<p>Confirmada por Ana Ficticia (CTO) em <time dateTime="2026-11-11T17:32:00.000Z">11/11/2026 às 14:32</time>.</p>');
    expect(p).not.toContain('>Confirmar demanda</button>');
  });

  it('encerrada sem confirmação: sem selo, linha 1, a seção com o texto do status final, sem botão', async () => {
    mObter.mockResolvedValue(demanda({ status: 'encerrada' }));
    const p = await detalhe();
    expect(cabecalho(p)).not.toContain('Aguardando confirmação');
    expect(nav(p)).toEqual(COM_CONFIRMACAO);
    expect(proxima(p)).toContain('Nada. A demanda está em Encerrada.');
    expect(p).toContain(`<p>${FINAL_ENCERRADA}</p>`);
    expect(p).not.toContain('>Confirmar demanda</button>');
  });

  it('com agente trabalhando, a linha 2 vence a 14, e o selo e a seção continuam', async () => {
    mObter.mockResolvedValue(demanda({ agentesEmAndamento: [{ agente: 'insumo_tecnico', status: 'em_andamento' }] as DemandaVista['agentesEmAndamento'] }));
    const p = await detalhe();
    expect(proxima(p)).not.toContain('Confirmar a demanda aberta pelo Awave.');
    expect(cabecalho(p)).toContain('Aguardando confirmação');
    expect(p).toMatch(/>Confirmar demanda<\/button>/);
  });

  it('Dados: "Origem" antes de "Criada por", da autoria (CA-10.4: nunca do solicitanteNome)', async () => {
    mObter.mockResolvedValue(demanda({ solicitanteNome: 'Pessoa Ficticia Editada' }));
    const p = await detalhe();
    const termos = [...p.matchAll(/<dt[^>]*>([^<]+)<\/dt>/g)].map((m) => m[1]);
    expect(termos.slice(-3)).toEqual(['Criada em', 'Origem', 'Criada por']);
    expect(valorDe(p, 'Origem')).toBe('Awave');
    expect(valorDe(p, 'Criada por')).toBe('Awave');
  });

  it('demanda de pessoa e de agente: "Origem" certa; sem seção, sem item em "Nesta página", sem selo e sem linha 14 (CA-10.1)', async () => {
    for (const [responsavel, rotulo] of [
      [{ tipo: 'pessoa', nome: 'Pessoa Ficticia' }, 'Pessoa'],
      [{ tipo: 'agente', agente: 'orquestrador' }, 'Agente de IA'],
    ] as const) {
      mObter.mockResolvedValue(demanda({ responsavel, rascunhoAgente: false }));
      mHistorico.mockResolvedValue([evento('demanda_criada', { ator: { tipo: 'pessoa', nome: 'Pessoa Ficticia', papel: 'cto' } })]);
      const p = await detalhe();
      expect(valorDe(p, 'Origem'), rotulo).toBe(rotulo);
      expect(p, rotulo).not.toContain('Confirmação do Awave');
      expect(p, rotulo).not.toContain('Aguardando confirmação');
      expect(proxima(p), rotulo).not.toContain('Confirmar a demanda aberta pelo Awave.');
      expect(nav(p).map(([a]) => a), rotulo).not.toContain(ID_SECAO.confirmacao);
    }
  });

  it('grade a partir de 1200 px com seis linhas antes da flexível (03, 5.1 item 6)', async () => {
    const p = await detalhe();
    expect(p).toContain('xl:grid-rows-[repeat(6,auto)_1fr]');
    expect(p).not.toContain('xl:grid-rows-[repeat(5,auto)_1fr]');
  });

  it('histórico: o ator de integração com o prefixo (RF-15)', async () => {
    const p = await detalhe();
    expect(p).toContain('<span>Awave (prefixo ficticio)</span>');
  });
});
