// 06-T18-testes (qa-automacao), DEC-DEM-20261111-0016-v1: casos de borda da T05 da demanda do Awave que o
// confirmar-demanda.test.ts não cobre (RF-06, CA-06.7; RF-10, CA-10.1 e CA-10.4; 03, 5.1 e 5.4). O HTML do servidor da
// página, com a sessão, o banco e as leituras em dublê e a matriz real, como no teste do engenheiro.
//   - Confirmada e depois levada a status final: a seção continua "Confirmada por", nunca o texto de "não foi confirmada".
//   - Entregue sem confirmação: o texto final com o rótulo do status, sem botão.
//   - Com a seção de dúvidas: a confirmação vem logo depois de Dados e antes de Dúvidas (h2 e "Nesta página").
//   - O contrário do CA-10.4: demanda de pessoa com solicitanteNome "Awave" não ganha seção, selo nem origem Awave.
//   - Demanda de agente com um demanda_confirmada no histórico (dado incoerente): sem seção; a origem manda.
// Datas fixas; dados só fictícios.
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TEXTOS_CONFIRMACAO } from '../../../../components/dados-da-confirmacao';
import { ROTULO_STATUS } from '../../../../components/rotulos';
import type { AtorPessoa } from '../../../../modules/acesso/ator';
import { exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { obterDemanda, type DemandaVista } from '../../../../modules/demandas/consultas';
import { obterTextoRecebido } from '../../../../modules/demandas/texto-recebido';
import { listarHistorico, type EventoVisivel } from '../../../../modules/historico/consultas';
import { ID_SECAO, TEXTOS_DETALHE } from './detalhe';
import PaginaDemanda from './page';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/demandas/DEM-20261111-0031',
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
vi.mock('./acoes', () => ({
  mudarStatusNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }),
  confirmarDemandaNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }),
}));

const ID = 'DEM-20261111-0031';
const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'usuario-ficticio-qa', nome: 'Pessoa Ficticia QA', papel: 'cto' };
const CRIADA = new Date('2026-11-11T13:05:00Z');
const CONFIRMADA = new Date('2026-11-11T17:32:00Z');
const SELO = 'Aguardando confirmação';
const LINHA_14 = 'Confirmar a demanda aberta pelo Awave.';
const BOTAO = '>Confirmar demanda</button>';
const NAO_CONFIRMADA = 'não foi confirmada';

const mExigir = vi.mocked(exigirPessoaNaPagina);
const mObter = vi.mocked(obterDemanda);
const mTexto = vi.mocked(obterTextoRecebido);
const mHistorico = vi.mocked(listarHistorico);

const demanda = (extra: Partial<DemandaVista> = {}): DemandaVista => ({
  id: ID,
  titulo: 'Painel de horas (fictício)',
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
  ...extra,
});
const evento = (id: number, acao: EventoVisivel['acao'], extra: Partial<EventoVisivel> = {}): EventoVisivel => ({
  id,
  ocorridoEm: CRIADA,
  ator: { tipo: 'integracao', integracao: 'awave', prefixo: 'ficticio' },
  entidade: 'demanda',
  entidadeId: ID,
  acao,
  antes: null,
  depois: null,
  ...extra,
});
const criada = evento(1, 'demanda_criada');
const confirmada = evento(2, 'demanda_confirmada', {
  ocorridoEm: CONFIRMADA,
  ator: { tipo: 'pessoa', nome: 'Bia Ficticia', papel: 'cto' },
  depois: { confirmada: true },
});

const detalhe = async () => renderToStaticMarkup(await PaginaDemanda({ params: Promise.resolve({ id: ID }), searchParams: Promise.resolve({}) }));
const cabecalho = (p: string) => p.slice(0, p.indexOf('</h1>'));
const proxima = (p: string) => {
  const i = p.indexOf('<section aria-labelledby="proxima-acao"');
  return p.slice(i, p.indexOf('</section>', i));
};
const secaoConfirmacao = (p: string) => {
  const i = p.indexOf('<section aria-labelledby="confirmacao"');
  return i < 0 ? '' : p.slice(i, p.indexOf('</section>', i));
};
const nav = (p: string) => {
  const i = p.indexOf('<nav aria-label="Nesta página"');
  return [...p.slice(i, p.indexOf('</nav>', i)).matchAll(/<a href="#([a-z-]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => m[1]);
};
const h2 = (p: string) => [...p.matchAll(/<h2 id="([a-z-]+)" tabindex="-1"[^>]*>([^<]+)<\/h2>/gi)].map((m) => m[2]);
const valorDe = (p: string, termo: string) => new RegExp(`<dt[^>]*>${termo}</dt><dd[^>]*>([^<]*)</dd>`).exec(p)?.[1];

describe('page.tsx: bordas da demanda do Awave na T05 (06-T18-testes)', () => {
  beforeEach(() => {
    mExigir.mockReset().mockResolvedValue(CTO);
    mObter.mockReset().mockResolvedValue(demanda());
    mTexto.mockReset().mockResolvedValue({ situacao: 'sem_texto' });
    mHistorico.mockReset().mockResolvedValue([criada]);
  });

  it('confirmada e depois encerrada: a seção diz quem e quando, nunca "não foi confirmada"; sem selo, sem botão, sem linha 14', async () => {
    mObter.mockResolvedValue(demanda({ status: 'encerrada' }));
    mHistorico.mockResolvedValue([confirmada, criada]);
    const p = await detalhe();
    const s = secaoConfirmacao(p);
    expect(s).toContain('<p>Confirmada por Bia Ficticia (CTO) em <time dateTime="2026-11-11T17:32:00.000Z">11/11/2026 às 14:32</time>.</p>');
    expect(s).toContain(`<p>${TEXTOS_CONFIRMACAO.depois}</p>`);
    expect(p).not.toContain(NAO_CONFIRMADA);
    expect(cabecalho(p)).not.toContain(SELO);
    expect(p).not.toContain(BOTAO);
    expect(proxima(p)).not.toContain(LINHA_14);
    expect(nav(p)).toContain(ID_SECAO.confirmacao);
  });

  it('entregue sem confirmação: o texto final com o rótulo de Entregue, sem botão nem selo', async () => {
    mObter.mockResolvedValue(demanda({ status: 'entregue' }));
    const p = await detalhe();
    const s = secaoConfirmacao(p);
    expect(s).toContain(`<p>${TEXTOS_CONFIRMACAO.finalSem(ROTULO_STATUS.entregue)}</p>`);
    expect(s).toContain(`Ela está em ${ROTULO_STATUS.entregue}, um status final`);
    expect(s).not.toContain('Confirmada por');
    expect(p).not.toContain(BOTAO);
    expect(cabecalho(p)).not.toContain(SELO);
    expect(proxima(p)).not.toContain(LINHA_14);
  });

  it('com dúvidas da entrada: Confirmação logo depois de Dados e antes de Dúvidas, nos h2 e em "Nesta página"; a grade cobre as seis da coluna principal', async () => {
    mObter.mockResolvedValue(demanda({ duvidasEntrada: ['Qual é o prazo? (fictício)'] }));
    const p = await detalhe();
    const s = TEXTOS_DETALHE.secoes;
    expect(h2(p)).toEqual([s.dados, s.confirmacao, s.duvidas, s.versoes, s.status, s.texto, s.historico]);
    expect(nav(p)).toEqual([ID_SECAO.dados, ID_SECAO.confirmacao, ID_SECAO.duvidas, ID_SECAO.versoes, ID_SECAO.status, ID_SECAO.texto, ID_SECAO.historico]);
    expect(p).toContain('xl:grid-rows-[repeat(6,auto)_1fr]');
    expect(cabecalho(p)).toContain(SELO);
    expect(secaoConfirmacao(p)).toContain(BOTAO);
  });

  it('o contrário do CA-10.4: demanda de pessoa com solicitanteNome "Awave" é "Pessoa", sem seção, selo nem linha 14', async () => {
    mObter.mockResolvedValue(demanda({ responsavel: { tipo: 'pessoa', nome: 'Pessoa Ficticia QA' }, rascunhoAgente: false, solicitanteNome: 'Awave' }));
    mHistorico.mockResolvedValue([evento(1, 'demanda_criada', { ator: { tipo: 'pessoa', nome: 'Pessoa Ficticia QA', papel: 'cto' } })]);
    const p = await detalhe();
    expect(valorDe(p, 'Origem')).toBe('Pessoa');
    expect(valorDe(p, 'Criada por')).toBe('Pessoa Ficticia QA');
    expect(secaoConfirmacao(p)).toBe('');
    expect(p).not.toContain(TEXTOS_DETALHE.secoes.confirmacao);
    expect(cabecalho(p)).not.toContain(SELO);
    expect(proxima(p)).not.toContain(LINHA_14);
    expect(nav(p)).not.toContain(ID_SECAO.confirmacao);
  });

  it('demanda de agente com demanda_confirmada no histórico (dado incoerente): a origem manda, sem seção nem "Confirmada por"', async () => {
    mObter.mockResolvedValue(demanda({ responsavel: { tipo: 'agente', agente: 'orquestrador' }, rascunhoAgente: true }));
    mHistorico.mockResolvedValue([confirmada, evento(1, 'demanda_criada', { ator: { tipo: 'agente', agente: 'orquestrador' } })]);
    const p = await detalhe();
    expect(valorDe(p, 'Origem')).toBe('Agente de IA');
    expect(secaoConfirmacao(p)).toBe('');
    expect(p).not.toContain('Confirmada por');
    expect(cabecalho(p)).not.toContain(SELO);
    expect(nav(p)).not.toContain(ID_SECAO.confirmacao);
  });
});
