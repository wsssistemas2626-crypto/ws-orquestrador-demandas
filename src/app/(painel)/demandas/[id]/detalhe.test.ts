// T40: T05 Detalhe da demanda (03, T05; RF-06, RF-07, RF-12, RF-15, RF-16, RF-21, RF-24, RF-26, C-18). A regra da tela
// sem navegador (alertas de topo, opções de status, o que falta para o pacote, dúvidas em aberto, antes e depois do
// histórico) e o HTML do servidor da página e das partes dela. Envio, foco e axe ficam no e2e
// (e2e/detalhe-demanda.spec.ts). A sessão, o banco e as leituras da página são dublês; a matriz de acesso é a real. Datas
// fixas, sem relógio.
import { createElement as h, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AtorPessoa } from '../../../../modules/acesso/ator';
import { exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../modules/acesso/matriz';
import { obterDemanda, type DemandaVista, type PacoteResumo, type VersaoResumo } from '../../../../modules/demandas/consultas';
import { obterTextoRecebido, type TextoRecebido as TextoDaDemanda } from '../../../../modules/demandas/texto-recebido';
import { transicoesManuaisDe } from '../../../../modules/demandas/transicoes';
import { obterEspecificacao } from '../../../../modules/especificacoes/consultas';
import { listarHistorico, type EventoVisivel } from '../../../../modules/historico/consultas';
import {
  alertasDoTopo,
  duvidasEmAberto,
  faltaParaPacote,
  ID_SECAO,
  opcoesDeStatus,
  rotuloResponsavel,
  TEXTOS_DETALHE,
  textoFinalDeStatus,
  valoresDoEvento,
} from './detalhe';
import { Historico } from './Historico';
import { MudarStatus } from './MudarStatus';
import PaginaDemanda from './page';
import { TextoRecebido } from './TextoRecebido';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/demandas/DEM-20261022-0042',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('../../../../lib/deps', () => ({
  obterDeps: async () => ({ db: { dubleDoBanco: true }, relogio: { dubleDoRelogio: true }, config: { retencaoDias: 90 } }),
}));
vi.mock('../../../../modules/acesso/exigir-pessoa', () => ({ exigirPessoaNaPagina: vi.fn(), exigirPessoa: vi.fn() }));
vi.mock('../../../../modules/acesso/matriz', async (original) => {
  const real = await original<typeof import('../../../../modules/acesso/matriz')>();
  return { ...real, autorizar: vi.fn(real.autorizar) };
});
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
// A Server Action não roda aqui: o HTML do primeiro estado não envia nada.
vi.mock('./acoes', () => ({ mudarStatusNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));

const mExigirNaPagina = vi.mocked(exigirPessoaNaPagina);
const mAutorizar = vi.mocked(autorizar);
const mObter = vi.mocked(obterDemanda);
const mTexto = vi.mocked(obterTextoRecebido);
const mHistorico = vi.mocked(listarHistorico);
const mEsp = vi.mocked(obterEspecificacao);

const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'usuario-ficticio-1', nome: 'Pessoa Ficticia', papel: 'cto' };
const ID = 'DEM-20261022-0042';
const DB = { dubleDoBanco: true };
const CRIADA = new Date('2026-10-22T17:05:00Z');

const versao = (prefixo: 'ESP' | 'RSK', v: number, extra: Partial<VersaoResumo> = {}): VersaoResumo => ({
  id: `${prefixo}-${ID}-v${v}`,
  versao: v,
  criadaEm: CRIADA,
  autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
  rascunhoAgente: false,
  ...extra,
});
const pacote = (v: number, extra: Partial<PacoteResumo> = {}): PacoteResumo => ({
  id: `DEC-${ID}-v${v}`,
  versao: v,
  criadaEm: CRIADA,
  autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
  rascunhoAgente: false,
  statusDecisao: 'pendente',
  desatualizado: false,
  ...extra,
});

const demanda = (extra: Partial<DemandaVista> = {}): DemandaVista => ({
  id: ID,
  titulo: 'Pedidos duplicados no ERP (fictício)',
  tipo: 'melhoria',
  status: 'nova',
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
  especificacoes: [],
  pareceresRisco: [],
  pacotesDecisao: [],
  agentesEmAndamento: [],
  ...extra,
});

let proximoId = 100;
const evento = (acao: EventoVisivel['acao'], extra: Partial<EventoVisivel> = {}): EventoVisivel => ({
  id: proximoId++,
  ocorridoEm: CRIADA,
  ator: { tipo: 'pessoa', nome: 'Pessoa Ficticia', papel: 'cto' },
  entidade: 'demanda',
  entidadeId: ID,
  acao,
  antes: null,
  depois: null,
  ...extra,
});
const falha = (agente: string, tentativas = 3) =>
  evento('falha_agente', { ator: { tipo: 'agente', agente: 'risco' }, entidade: 'execucao_agente', depois: { agente, tentativas, motivo: 'fora_do_schema' } });

const html = (el: ReactElement) => renderToStaticMarkup(el);

describe('alertas de topo (03, T05: no máximo um de cada, nesta ordem)', () => {
  it('demanda recém-criada: nenhum alerta', () => {
    expect(alertasDoTopo(demanda(), [evento('demanda_criada')], false)).toEqual([]);
  });

  it('falha de agente pelo último evento falha_agente: texto da 03, com o botão do artefato', () => {
    const [a] = alertasDoTopo(demanda(), [falha('risco'), evento('demanda_criada')], false);
    expect(a).toEqual({
      tipo: 'erro',
      texto: 'O agente de risco não conseguiu gerar o parecer de risco depois de 3 tentativas. Preencha o parecer à mão.',
      acao: { rotulo: 'Novo parecer de risco', href: `/demandas/${ID}/pareceres-risco/novo` },
    });
  });

  it('falha dos outros agentes: o nome e o artefato trocados', () => {
    expect(alertasDoTopo(demanda(), [falha('insumo_tecnico')], false)[0]).toEqual({
      tipo: 'erro',
      texto: 'O agente de insumo técnico não conseguiu gerar a especificação técnica depois de 3 tentativas. Preencha a especificação à mão.',
      acao: { rotulo: 'Nova versão da ESP', href: `/demandas/${ID}/especificacoes/nova` },
    });
    expect(alertasDoTopo(demanda(), [falha('consolidacao', 1)], false)[0]).toEqual({
      tipo: 'erro',
      texto: 'O agente de consolidação não conseguiu gerar o pacote de decisão depois de 1 tentativa. Preencha o pacote à mão.',
      acao: { rotulo: 'Novo pacote de decisão', href: `/demandas/${ID}/pacotes-decisao/novo` },
    });
  });

  it('falha resolvida (o artefato foi criado depois) ou agente rodando de novo: sem o alerta de falha', () => {
    const rsk = evento('parecer_risco_criado', { entidade: 'parecer_risco', entidadeId: `RSK-${ID}-v1` });
    expect(alertasDoTopo(demanda(), [rsk, falha('risco')], false)).toEqual([]);
    // O artefato criado antes da falha não resolve a falha.
    expect(alertasDoTopo(demanda(), [falha('risco'), rsk], false)).toHaveLength(1);
    const rodando = demanda({ agentesEmAndamento: [{ agente: 'risco', status: 'em_andamento' }] });
    expect(alertasDoTopo(rodando, [falha('risco')], false).map((a) => a.tipo)).toEqual(['informacao']);
  });

  it('falha sem agente conhecido ou do orquestrador: nenhum alerta (não há o que preencher nesta demanda)', () => {
    expect(alertasDoTopo(demanda(), [falha('orquestrador'), evento('falha_agente', { depois: { motivo: 'x' } })], false)).toEqual([]);
  });

  it('aguardando informação: atenção, com o link para as dúvidas só quando a seção existe', () => {
    const d = demanda({ status: 'aguardando_informacao' });
    expect(alertasDoTopo(d, [], true)).toEqual([
      { tipo: 'atencao', texto: 'Esta demanda está aguardando informação.', link: { rotulo: 'Veja as dúvidas em aberto.', href: `#${ID_SECAO.duvidas}` } },
    ]);
    expect(alertasDoTopo(d, [], false)).toEqual([{ tipo: 'atencao', texto: 'Esta demanda está aguardando informação.' }]);
  });

  it('pacote desatualizado: o mais novo, com o id na frase', () => {
    const d = demanda({ pacotesDecisao: [pacote(2, { desatualizado: true }), pacote(1, { desatualizado: true })] });
    expect(alertasDoTopo(d, [], false)).toEqual([
      {
        tipo: 'atencao',
        texto: `O pacote DEC-${ID}-v2 está desatualizado: a demanda já tem uma versão mais nova de ESP ou de parecer de risco. Crie um pacote novo para decidir.`,
      },
    ]);
    // Só o mais novo conta: um pacote antigo desatualizado com um novo em dia não gera alerta.
    expect(alertasDoTopo(demanda({ pacotesDecisao: [pacote(2), pacote(1, { desatualizado: true })] }), [], false)).toEqual([]);
  });

  it('agente trabalhando (T-03): informação, um só, e o orquestrador fica de fora', () => {
    const d = demanda({
      agentesEmAndamento: [
        { agente: 'orquestrador', status: 'pendente' },
        { agente: 'consolidacao', status: 'pendente' },
        { agente: 'risco', status: 'em_andamento' },
      ],
    });
    expect(alertasDoTopo(d, [], false)).toEqual([
      { tipo: 'informacao', texto: 'O agente de consolidação está preparando o pacote de decisão. Esta página não se atualiza sozinha: recarregue em alguns minutos.' },
    ]);
  });

  it('os quatro juntos, na ordem da 03: falha, aguardando, desatualizado, trabalhando', () => {
    const d = demanda({
      status: 'aguardando_informacao',
      pacotesDecisao: [pacote(1, { desatualizado: true })],
      agentesEmAndamento: [{ agente: 'insumo_tecnico', status: 'pendente' }],
    });
    expect(alertasDoTopo(d, [falha('risco')], true).map((a) => a.tipo)).toEqual(['erro', 'atencao', 'atencao', 'informacao']);
  });
});

describe('Mudar status (RF-07, 03, T05)', () => {
  it('as transições da tabela, com os rótulos da 2.2', () => {
    expect(opcoesDeStatus(demanda(), transicoesManuaisDe('nova'))).toEqual([
      { valor: 'em_analise', rotulo: 'Em análise' },
      { valor: 'encerrada', rotulo: 'Encerrada' },
    ]);
  });

  it('Aprovada sem pacote aprovado e atualizado: indisponível, com a dica da 03', () => {
    const d = demanda({ status: 'pronta_para_decisao', pacotesDecisao: [pacote(1, { statusDecisao: 'aprovada', desatualizado: true })] });
    expect(opcoesDeStatus(d, transicoesManuaisDe('pronta_para_decisao'))).toEqual([
      { valor: 'em_analise', rotulo: 'Em análise' },
      { valor: 'aprovada', rotulo: 'Aprovada', desabilitada: true, dica: 'Aprovada: precisa de um pacote de decisão aprovado e atualizado.' },
      { valor: 'encerrada', rotulo: 'Encerrada' },
    ]);
    const comPacote = demanda({ status: 'pronta_para_decisao', pacotesDecisao: [pacote(2, { statusDecisao: 'aprovada' })] });
    expect(opcoesDeStatus(comPacote, transicoesManuaisDe('pronta_para_decisao'))[1]).toEqual({ valor: 'aprovada', rotulo: 'Aprovada' });
  });

  it('Em construção num Estudo: indisponível, com a dica da 03', () => {
    const d = demanda({ tipo: 'estudo', status: 'devolvida' });
    expect(opcoesDeStatus(d, transicoesManuaisDe('devolvida'))).toEqual([
      { valor: 'em_construcao', rotulo: 'Em construção', desabilitada: true, dica: 'Em construção: demanda do tipo Estudo não vai para construção.' },
      { valor: 'em_analise', rotulo: 'Em análise' },
    ]);
  });

  it('status final: o texto da 03, e nenhum outro', () => {
    expect(textoFinalDeStatus('entregue', [])).toBe('Entregue é um status final. Não há próxima mudança.');
    expect(textoFinalDeStatus('encerrada', [])).toBe('Encerrada é um status final. Não há próxima mudança.');
    expect(textoFinalDeStatus('nova', transicoesManuaisDe('nova'))).toBeNull();
  });
});

describe('versões, dúvidas e autoria', () => {
  it('falta para o pacote: só o que falta', () => {
    expect(faltaParaPacote(demanda())).toBe(
      'Para criar um pacote de decisão, a demanda precisa de especificação técnica e de parecer de risco. Falta: especificação técnica e parecer de risco.',
    );
    expect(faltaParaPacote(demanda({ especificacoes: [versao('ESP', 1)] }))).toBe(
      'Para criar um pacote de decisão, a demanda precisa de especificação técnica e de parecer de risco. Falta: parecer de risco.',
    );
    expect(faltaParaPacote(demanda({ pareceresRisco: [versao('RSK', 1)] }))).toMatch(/Falta: especificação técnica\.$/);
    expect(faltaParaPacote(demanda({ especificacoes: [versao('ESP', 1)], pareceresRisco: [versao('RSK', 1)] }))).toBeNull();
  });

  it('dúvidas: as da ESP mais nova; sem ESP, as da entrada; ESP sem dúvida resolve as da entrada', () => {
    expect(duvidasEmAberto(demanda(), { id: `ESP-${ID}-v2`, duvidasEmAberto: ['Qual o volume?'] })).toEqual({
      origem: `Da ESP-${ID}-v2.`,
      itens: ['Qual o volume?'],
    });
    expect(duvidasEmAberto(demanda({ duvidasEntrada: ['Qual o ERP?'] }), null)).toEqual({ origem: 'Do agente orquestrador, na entrada.', itens: ['Qual o ERP?'] });
    expect(duvidasEmAberto(demanda({ duvidasEntrada: ['Qual o ERP?'] }), { id: `ESP-${ID}-v1`, duvidasEmAberto: [] })).toBeNull();
    expect(duvidasEmAberto(demanda(), null)).toBeNull();
  });

  it('autoria: a pessoa pelo nome, o agente pelo nome da 2.6, a conta que não existe mais como "Não informado"', () => {
    expect(rotuloResponsavel({ tipo: 'pessoa', nome: 'Pessoa Ficticia' })).toBe('Pessoa Ficticia');
    expect(rotuloResponsavel({ tipo: 'agente', agente: 'insumo_tecnico' })).toBe('Agente de insumo técnico');
    expect(rotuloResponsavel({ tipo: 'pessoa', nome: null })).toBe('Não informado');
  });
});

describe('histórico: Antes e Depois (C-30: só os valores de enumeração gravados)', () => {
  it('mudança de status com os rótulos da 2.2', () => {
    expect(valoresDoEvento(evento('status_alterado', { antes: { status: 'em_construcao' }, depois: { status: 'entregue' } }))).toEqual({
      antes: 'Em construção',
      depois: 'Entregue',
    });
  });

  it('mudança de campo de enumeração com o rótulo; valor nulo é "Não informado"', () => {
    expect(valoresDoEvento(evento('campo_alterado', { antes: { urgencia: 'media' }, depois: { urgencia: null } }))).toEqual({ antes: 'Média', depois: 'Não informado' });
    expect(valoresDoEvento(evento('campo_alterado', { antes: { tipo: 'bug' }, depois: { tipo: 'estudo' } }))).toEqual({ antes: 'Bug', depois: 'Estudo' });
    expect(valoresDoEvento(evento('campo_alterado', { antes: { solicitantePapel: null }, depois: { solicitantePapel: 'financeiro' } }))).toEqual({
      antes: 'Não informado',
      depois: 'Financeiro',
    });
    expect(valoresDoEvento(evento('campo_alterado', { antes: { linhaServicoProvavel: 'sob_medida' }, depois: { linhaServicoProvavel: 'indefinida' } }))).toEqual({
      antes: 'Sistema sob medida',
      depois: 'Indefinida',
    });
  });

  it('campo de texto livre (só "alterado"), valor fora da enumeração e outros eventos: células vazias', () => {
    expect(valoresDoEvento(evento('campo_alterado', { antes: { titulo: { alterado: true } }, depois: { titulo: { alterado: true } } }))).toEqual({ antes: '', depois: '' });
    expect(valoresDoEvento(evento('campo_alterado', { antes: { urgencia: 'SENTINELA-fora' }, depois: { urgencia: 'alta' } }))).toEqual({ antes: '', depois: 'Alta' });
    expect(valoresDoEvento(evento('demanda_criada', { depois: { status: 'nova', tipo: 'bug' } }))).toEqual({ antes: '', depois: '' });
  });
});

describe('Historico.tsx', () => {
  it('tabela com o caption e as colunas da 03; data em <time>; ator, texto e antes/depois', () => {
    const p = html(
      h(Historico, {
        eventos: [
          evento('status_alterado', { ocorridoEm: new Date('2026-10-23T13:10:00Z'), antes: { status: 'nova' }, depois: { status: 'em_analise' } }),
          evento('especificacao_criada', { ator: { tipo: 'agente', agente: 'insumo_tecnico' }, entidade: 'especificacao', entidadeId: `ESP-${ID}-v1` }),
          evento('demanda_criada', { ator: { tipo: 'sistema' } }),
        ],
        retencaoDias: 90,
      }),
    );
    expect(p).toContain('<caption');
    expect(p).toContain('Histórico da demanda, do mais novo para o mais antigo');
    for (const c of ['Data e hora', 'Quem', 'O que aconteceu', 'Antes', 'Depois']) expect(p).toContain(`<th scope="col" class="px-3 py-2 font-semibold">${c}</th>`);
    expect(p).toContain('<time dateTime="2026-10-23T13:10:00.000Z">23/10/2026 às 10:10</time>');
    expect(p).toContain('Pessoa Ficticia (CTO)');
    expect(p).toContain('Mudou o status');
    expect(p).toMatch(/<td[^>]*>Nova<\/td><td[^>]*>Em análise<\/td>/);
    expect(p).toContain(`Criou ESP-${ID}-v1`);
    expect(p).toContain('Agente de insumo técnico');
    expect(p).toContain('Sistema');
    expect(p).toContain('aria-label="Tabela do histórico"');
  });
});

describe('TextoRecebido.tsx (RF-24, C-18)', () => {
  const guardado: TextoDaDemanda = {
    situacao: 'guardado',
    texto: 'Linha 1 SENTINELA-TEXTO <script>alert(1)</script>\nLinha 2 <img src=x onerror=alert(1)>',
    origem: { canal: 'email', referencia: 'REF-FICTICIA-1 "><b>' },
    recebidaEm: new Date('2026-10-22T17:05:00Z'),
    apagarEm: new Date('2027-01-20T17:05:00Z'),
  };

  it('guardado: <details> fechado, aviso com a data, campos e o texto em <pre>, tudo escapado', () => {
    const p = html(h(TextoRecebido, { texto: guardado, retencaoDias: 90 }));
    expect(p).toMatch(/^<details[^>]*><summary[^>]*>Mostrar texto recebido<\/summary>/);
    expect(p).not.toMatch(/<details[^>]*\sopen/);
    expect(p).toContain('Contém dado pessoal de terceiro. Não copie para fora do sistema sem necessidade. Será apagado em 20/01/2027.');
    for (const r of ['Recebido em', 'Canal de origem', 'Referência da origem', 'Texto']) expect(p).toContain(`<dt class="font-medium">${r}</dt>`);
    expect(p).toContain('<time dateTime="2026-10-22T17:05:00.000Z">22/10/2026 às 14:05</time>');
    expect(p).toContain('E-mail');
    expect(p).toContain('REF-FICTICIA-1 &quot;&gt;&lt;b&gt;');
    expect(p).toMatch(/<pre[^>]*class="[^"]*whitespace-pre-wrap[^"]*"[^>]*>Linha 1 SENTINELA-TEXTO &lt;script&gt;alert\(1\)&lt;\/script&gt;\nLinha 2 &lt;img src=x onerror=alert\(1\)&gt;<\/pre>/);
    expect(p).not.toContain('<script>');
    expect(p).not.toContain('<img');
  });

  it('guardado sem origem: "Não informado" no canal e na referência', () => {
    const p = html(h(TextoRecebido, { texto: { ...guardado, origem: null }, retencaoDias: 90 }));
    expect(p.match(/Não informado/g)).toHaveLength(2);
  });

  it('expurgado e sem texto: os textos da 03, sem <details>', () => {
    const exp = html(h(TextoRecebido, { texto: { situacao: 'expurgado', expurgadaEm: new Date('2027-01-20T12:00:00Z') }, retencaoDias: 90 }));
    expect(exp).toBe('<p>O texto recebido foi apagado em 20/01/2027, pela regra de retenção de 90 dias. Os dados da demanda continuam.</p>');
    const comOutroPrazo = html(h(TextoRecebido, { texto: { situacao: 'expurgado', expurgadaEm: new Date('2027-01-20T12:00:00Z') }, retencaoDias: 30 }));
    expect(comOutroPrazo).toContain('retenção de 30 dias');
    expect(html(h(TextoRecebido, { texto: { situacao: 'sem_texto' }, retencaoDias: 90 }))).toBe('<p>Esta demanda foi criada sem texto colado.</p>');
  });
});

describe('MudarStatus.tsx', () => {
  const opcoes = opcoesDeStatus(demanda({ status: 'pronta_para_decisao' }), transicoesManuaisDe('pronta_para_decisao'));

  it('status atual, grupo "Novo status" com a opção indisponível explicada, e o botão; região de aviso montada', () => {
    const p = html(h(MudarStatus, { id: ID, statusAtual: 'pronta_para_decisao', opcoes, final: null, dicaFixa: null }));
    expect(p).toContain('Status atual: Pronta para decisão');
    expect(p).toContain('<legend class="font-medium">Novo status</legend>');
    expect(p).toMatch(/<input type="radio" id="campo-novoStatus-aprovada"[^>]*aria-disabled="true"[^>]*aria-describedby="campo-novoStatus-aprovada-dica"/);
    expect(p).toContain('<p id="campo-novoStatus-aprovada-dica" class="ml-7 text-sm text-texto-suave">Aprovada: precisa de um pacote de decisão aprovado e atualizado.</p>');
    expect(p).toMatch(/<input type="radio" id="campo-novoStatus-em_analise"(?![^>]*aria-disabled)[^>]*>/);
    expect(p).toMatch(/<button type="submit"[^>]*>Mudar status<\/button>/);
    expect(p).toContain('<div role="status"');
    expect(p).not.toContain('role="alert"');
  });

  it('status final: só o texto da 03, sem grupo nem botão (a região de aviso continua)', () => {
    const p = html(h(MudarStatus, { id: ID, statusAtual: 'entregue', opcoes: [], final: 'Entregue é um status final. Não há próxima mudança.', dicaFixa: null }));
    expect(p).toContain('Status atual: Entregue');
    expect(p).toContain('Entregue é um status final. Não há próxima mudança.');
    expect(p).not.toContain('<fieldset');
    expect(p).not.toContain('Mudar status</button>');
    expect(p).toContain('<div role="status"');
  });

  it('aprovada: a dica fixa da 03', () => {
    const p = html(
      h(MudarStatus, { id: ID, statusAtual: 'aprovada', opcoes: opcoesDeStatus(demanda({ status: 'aprovada' }), transicoesManuaisDe('aprovada')), final: null, dicaFixa: TEXTOS_DETALHE.dicaAprovada }),
    );
    expect(p).toContain('Mudar para Em construção, Entregue ou Devolvida é manual nesta versão: faça quando o /construir avançar.');
  });
});

describe('page.tsx: acesso, leituras e seções', () => {
  const detalhe = async (id: string, p: Record<string, string | string[] | undefined> = {}) =>
    html(await PaginaDemanda({ params: Promise.resolve({ id }), searchParams: Promise.resolve(p) }));

  beforeEach(() => {
    mExigirNaPagina.mockReset().mockResolvedValue(CTO);
    mAutorizar.mockClear();
    mObter.mockReset().mockResolvedValue(demanda());
    mTexto.mockReset().mockResolvedValue({ situacao: 'sem_texto' });
    mHistorico.mockReset().mockResolvedValue([evento('demanda_criada')]);
    mEsp.mockReset();
  });

  it('pessoa antes de autorizar; ler_demanda e ler_historico autorizados antes de ler; o texto recebido pela leitura própria de pessoa', async () => {
    await detalhe(ID);
    expect(mExigirNaPagina).toHaveBeenCalledExactlyOnceWith(`/demandas/${ID}`);
    expect(mAutorizar).toHaveBeenNthCalledWith(1, CTO, 'ler_demanda');
    expect(mAutorizar).toHaveBeenCalledWith(CTO, 'ler_historico');
    expect(mAutorizar.mock.invocationCallOrder.at(-1)!).toBeLessThan(mHistorico.mock.invocationCallOrder[0]!);
    expect(mHistorico).toHaveBeenCalledWith(DB, ID);
    expect(mTexto).toHaveBeenCalledWith(expect.objectContaining({ db: DB, config: { retencaoDias: 90 } }), CTO, ID);
    expect(mEsp).not.toHaveBeenCalled();
  });

  it('cabeçalho, navegação "Nesta página" e as seções com h2 focável, na ordem da 03', async () => {
    const p = await detalhe(ID);
    expect(p).toContain('<h1>Pedidos duplicados no ERP (fictício)</h1>');
    expect(p).toMatch(/<nav aria-label="Nesta página"/);
    const links = [...p.matchAll(/<a href="#([a-z-]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => [m[1], m[2]]);
    expect(links).toEqual([
      [ID_SECAO.dados, 'Dados'],
      [ID_SECAO.versoes, 'Versões'],
      [ID_SECAO.status, 'Mudar status'],
      [ID_SECAO.texto, 'Texto recebido'],
      [ID_SECAO.historico, 'Histórico'],
    ]);
    const h2 = [...p.matchAll(/<h2 id="([a-z-]+)" tabindex="-1"[^>]*>([^<]+)<\/h2>/gi)].map((m) => m[2]);
    expect(h2).toEqual(['Dados', 'Versões', 'Mudar status', 'Texto recebido', 'Histórico']);
    for (const h3 of ['Especificações técnicas', 'Pareceres de risco', 'Pacotes de decisão']) expect(p).toMatch(new RegExp(`<h3[^>]*>${h3}</h3>`));
  });

  it('Dados: lista de descrição com os rótulos da 03; ausente é "Não informado"; sem anexos, "Nenhum anexo."', async () => {
    const p = await detalhe(ID);
    const termos = [...p.matchAll(/<dt[^>]*>([^<]+)<\/dt>/g)].map((m) => m[1]);
    expect(termos).toEqual([
      'Tipo',
      'Linha de serviço provável',
      'Urgência',
      'Justificativa da urgência',
      'Solicitante',
      'Papel do solicitante',
      'Contexto',
      'Descrição do problema',
      'Impacto percebido',
      'Anexos',
      'Criada em',
      'Criada por',
    ]);
    expect(p).toMatch(/<dt[^>]*>Linha de serviço provável<\/dt><dd[^>]*>Não informado<\/dd>/);
    expect(p).toMatch(/<dt[^>]*>Urgência<\/dt><dd[^>]*>Média<\/dd>/);
    expect(p).toMatch(/<dt[^>]*>Papel do solicitante<\/dt><dd[^>]*>Produto<\/dd>/);
    expect(p).toContain('Nenhum anexo.');
    expect(p).toContain('<time dateTime="2026-10-22T17:05:00.000Z">22/10/2026 às 14:05</time>');
  });

  it('anexos como texto, nunca como link; título e campos livres escapados (C-18)', async () => {
    mObter.mockResolvedValue(
      demanda({
        titulo: 'Título <script>alert(1)</script>',
        contexto: '<img src=x onerror=alert(1)>',
        anexos: [
          { tipo: 'url', referencia: 'https://exemplo.test/a', descricao: 'Descrição <b>fictícia</b>' },
          { tipo: 'arquivo', referencia: 'b-ficticio.pdf' },
        ],
      }),
    );
    const p = await detalhe(ID);
    expect(p).toContain('<h1>Título &lt;script&gt;alert(1)&lt;/script&gt;</h1>');
    expect(p).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(p).toContain('<li>Link: https://exemplo.test/a — Descrição &lt;b&gt;fictícia&lt;/b&gt;</li>');
    expect(p).toContain('<li>Arquivo: b-ficticio.pdf</li>');
    expect(p).not.toContain('href="https://exemplo.test/a"');
    expect(p).not.toContain('<script>');
  });

  it('versões vazias: os textos da 03; sem ESP e RSK, o motivo no lugar do botão de pacote', async () => {
    const p = await detalhe(ID);
    for (const t of ['Nenhuma especificação técnica ainda.', 'Nenhum parecer de risco ainda.', 'Nenhum pacote de decisão ainda.']) expect(p).toContain(t);
    expect(p).toMatch(new RegExp(`<a [^>]*href="/demandas/${ID}/especificacoes/nova"[^>]*>Nova versão da ESP</a>`));
    expect(p).toMatch(new RegExp(`<a [^>]*href="/demandas/${ID}/pareceres-risco/novo"[^>]*>Novo parecer de risco</a>`));
    expect(p).not.toContain('>Novo pacote de decisão</a>');
    expect(p).toContain('Falta: especificação técnica e parecer de risco.');
  });

  it('CA-26.2 (HTML): ESP v1 e v2, RSK v1 e DEC v1 desatualizado; selos, autoria e as ações com o nome da versão', async () => {
    mObter.mockResolvedValue(
      demanda({
        status: 'pronta_para_decisao',
        especificacoes: [versao('ESP', 2, { autor: { tipo: 'agente', agente: 'insumo_tecnico' }, rascunhoAgente: true }), versao('ESP', 1)],
        pareceresRisco: [versao('RSK', 1)],
        pacotesDecisao: [pacote(1, { desatualizado: true })],
      }),
    );
    mEsp.mockResolvedValue({ id: `ESP-${ID}-v2`, duvidasEmAberto: [] } as unknown as Awaited<ReturnType<typeof obterEspecificacao>>);
    const p = await detalhe(ID);
    expect(mEsp).toHaveBeenCalledExactlyOnceWith(DB, `ESP-${ID}-v2`);
    expect(mAutorizar).toHaveBeenCalledWith(CTO, 'ler_especificacao');
    for (const v of [`ESP-${ID}-v2`, `ESP-${ID}-v1`, `RSK-${ID}-v1`, `DEC-${ID}-v1`]) expect(p).toContain(`<span class="font-mono">${v}</span>`);
    // A ordem dos atributos é a do React; o que importa é o par endereço e nome acessível.
    const link = (href: string, nome: string, texto: string) => new RegExp(`<a (?=[^>]*href="${href}")(?=[^>]*aria-label="${nome}")[^>]*>${texto}</a>`);
    expect(p).toMatch(link(`/especificacoes/ESP-${ID}-v2`, `Ver ESP-${ID}-v2`, 'Ver'));
    expect(p).toMatch(link(`/pareceres-risco/RSK-${ID}-v1`, `Ver RSK-${ID}-v1`, 'Ver'));
    expect(p).toMatch(link(`/pacotes-decisao/DEC-${ID}-v1`, `Abrir decisão DEC-${ID}-v1`, 'Abrir decisão'));
    expect(p).toContain('Agente de insumo técnico');
    expect(p).toContain('Rascunho de agente');
    expect(p).toContain('Decisão pendente');
    expect(p).toContain('>Desatualizado</span>');
    expect(p).toMatch(new RegExp(`<a [^>]*href="/demandas/${ID}/pacotes-decisao/novo"[^>]*>Novo pacote de decisão</a>`));
    expect(p).not.toContain('Para criar um pacote de decisão');
    expect(p).toContain(`O pacote DEC-${ID}-v1 está desatualizado`);
    for (const c of ['Versão', 'Criada em', 'Criada por', 'Situação', 'Ação']) expect(p).toContain(`>${c}</th>`);
  });

  it('CA-15.3 (HTML): aguardando informação lista as dúvidas da ESP mais nova, com a nota; nada é enviado', async () => {
    mObter.mockResolvedValue(demanda({ status: 'aguardando_informacao', especificacoes: [versao('ESP', 1)] }));
    mEsp.mockResolvedValue({ id: `ESP-${ID}-v1`, duvidasEmAberto: ['Qual o volume <b>diário</b>?', 'Há ambiente de teste?'] } as unknown as Awaited<
      ReturnType<typeof obterEspecificacao>
    >);
    const p = await detalhe(ID);
    expect(p).toMatch(new RegExp(`<h2 id="${ID_SECAO.duvidas}" tabindex="-1"[^>]*>Dúvidas em aberto</h2>`, 'i'));
    expect(p).toContain(`Da ESP-${ID}-v1.`);
    expect(p).toMatch(/<ol[^>]*><li>Qual o volume &lt;b&gt;diário&lt;\/b&gt;\?<\/li><li>Há ambiente de teste\?<\/li><\/ol>/);
    expect(p).toContain('O sistema não envia estas perguntas ao solicitante. Trate-as fora do sistema e, com a resposta, grave uma ESP nova sem dúvida.');
    expect(p).toContain('Esta demanda está aguardando informação.');
    expect(p).toMatch(new RegExp(`<a href="#${ID_SECAO.duvidas}"[^>]*>Veja as dúvidas em aberto\\.</a>`));
    expect(p).toMatch(new RegExp(`<a href="#${ID_SECAO.duvidas}"[^>]*>Dúvidas em aberto</a>`));
  });

  it('alerta de chegada: os valores fixos da T39 continuam', async () => {
    expect(await detalhe(ID, { aviso: 'demanda-criada' })).toMatch(new RegExp(`<div role="alert"[^>]*>Demanda ${ID} criada com status Nova\\.</div>`));
    expect(await detalhe(ID, { aviso: 'alteracoes-salvas' })).toContain('Alterações salvas. O histórico registra o antes e o depois.');
    expect(await detalhe(ID, { aviso: 'outro' })).not.toContain('role="alert"');
  });

  it('id fora do formato: 404 sem nenhuma leitura (C-17); falha de leitura sobe para a tela de erro', async () => {
    await expect(detalhe("DEM-1' or '1'='1")).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mObter).not.toHaveBeenCalled();
    expect(mHistorico).not.toHaveBeenCalled();
    expect(mTexto).not.toHaveBeenCalled();
    mHistorico.mockRejectedValue(new Error('SENTINELA-ERRO do banco'));
    await expect(detalhe(ID)).rejects.toThrow('SENTINELA-ERRO do banco');
  });
});
