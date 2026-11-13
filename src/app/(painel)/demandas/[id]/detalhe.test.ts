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
import { obterPacoteDecisao, type PacoteDecisaoVista } from '../../../../modules/pacotes-decisao/consultas';
import type { EtapaDaDemanda, ProximaAcao } from '../../../../components/dados-das-etapas';
import { agenteNaFrase, ARTEFATO_DO_AGENTE, NOME_AGENTE } from '../../../../components/rotulos';
import { BarraDeEtapas } from './BarraDeEtapas';
import { CartaoProximaAcao } from './CartaoProximaAcao';
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
// T11 (DEC-DEM-20261110-0015-v1): a página lê o DEC mais novo para a barra de etapas e a Próxima ação.
vi.mock('../../../../modules/pacotes-decisao/consultas', async (original) => {
  const real = await original<typeof import('../../../../modules/pacotes-decisao/consultas')>();
  return { ...real, obterPacoteDecisao: vi.fn() };
});
// A Server Action não roda aqui: o HTML do primeiro estado não envia nada.
vi.mock('./acoes', () => ({ mudarStatusNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));

const mExigirNaPagina = vi.mocked(exigirPessoaNaPagina);
const mAutorizar = vi.mocked(autorizar);
const mObter = vi.mocked(obterDemanda);
const mTexto = vi.mocked(obterTextoRecebido);
const mHistorico = vi.mocked(listarHistorico);
const mEsp = vi.mocked(obterEspecificacao);
const mDec = vi.mocked(obterPacoteDecisao);

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
  substituido: false,
  substituidoPor: null,
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
  andamento: null,
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

// A vista do DEC mais novo que a página lê (T11): só os campos que a barra e a Próxima ação usam, mais os que não podem
// chegar à tela (nome de quem aprovou, documento assinado, comentário e quem decidiu), com sentinelas.
const vistaDoDec = (v: number, extra: Partial<PacoteDecisaoVista> = {}): PacoteDecisaoVista =>
  ({
    id: `DEC-${ID}-v${v}`,
    demandaId: ID,
    versao: v,
    statusDecisao: 'pendente',
    desatualizado: false,
    substituido: false,
    substituidoPor: null,
    nivelAprovacaoRequerido: 'cto',
    aprovadores: [],
    decisao: null,
    ...extra,
  }) as unknown as PacoteDecisaoVista;

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

  it('autoria de integração (0.3.0, 03, 5.1): o nome da integração', () => {
    expect(rotuloResponsavel({ tipo: 'integracao', integracao: 'awave' })).toBe('Awave');
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

// T11 (03, 5.6): o histórico deixa de ser tabela e vira lista (LinhaDoTempo). O que a tabela dizia continua, item a item:
// a ordem (era o caption, agora o texto antes da lista), a data em <time>, quem, o que aconteceu e o antes e depois.
const itensDaLista = (p: string) => [...p.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((m) => m[1]!);

describe('Historico.tsx (LinhaDoTempo, 03, 5.6)', () => {
  it('lista do mais novo para o mais antigo: o texto da ordem, um item por evento; data em <time>; ator, texto e antes/depois', () => {
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
    expect(p).toMatch(/<p[^>]*>Do mais novo para o mais antigo\.<\/p><ol\b/);
    expect(p).not.toContain('<table');
    const itens = itensDaLista(p);
    expect(itens).toHaveLength(3);
    expect(p).toContain('<time dateTime="2026-10-23T13:10:00.000Z">23/10/2026 às 10:10</time>');
    expect(itens[0]).toContain('Pessoa Ficticia (CTO)');
    expect(itens[0]).toContain('Mudou o status');
    expect(itens[0]).toMatch(/<p[^>]*>Antes: Nova\. Depois: Em análise\.<\/p>/);
    expect(itens[1]).toContain(`Criou ESP-${ID}-v1`);
    expect(itens[1]).toContain('Agente de insumo técnico');
    expect(itens[2]).toContain('Sistema');
    // O separador entre quem e quando é só visual.
    expect(itens[0]).toContain('<span aria-hidden="true"> · </span>');
  });

  it('antes vazio: só "Depois: …"; sem antes nem depois: sem a linha (texto livre, C-30)', () => {
    const p = html(
      h(Historico, {
        eventos: [
          evento('campo_alterado', { antes: { urgencia: 'SENTINELA-fora' }, depois: { urgencia: 'alta' } }),
          evento('campo_alterado', { antes: { titulo: { alterado: true } }, depois: { titulo: { alterado: true } } }),
        ],
        retencaoDias: 90,
      }),
    );
    const [comDepois, semValores] = itensDaLista(p) as [string, string];
    expect(comDepois).toMatch(/<p[^>]*>Depois: Alta\.<\/p>/);
    expect(comDepois).not.toContain('Antes:');
    expect(semValores).not.toContain('Antes:');
    expect(semValores).not.toContain('Depois:');
    expect(semValores.match(/<p\b/g)).toHaveLength(2);
    expect(p).not.toContain('SENTINELA');
  });

  it('CA-10.2: com 30 eventos, os 30 aparecem, na ordem recebida (do mais novo para o mais antigo), sem corte', () => {
    const base = Date.parse('2026-10-23T13:00:00Z');
    const eventos = Array.from({ length: 30 }, (_, i) => evento('campo_alterado', { ocorridoEm: new Date(base - i * 60_000), antes: { urgencia: 'baixa' }, depois: { urgencia: 'media' } }));
    const p = html(h(Historico, { eventos, retencaoDias: 90 }));
    const datas = [...p.matchAll(/<time dateTime="([^"]+)">/g)].map((m) => m[1]);
    expect(datas).toHaveLength(30);
    expect(datas).toEqual(eventos.map((e) => e.ocorridoEm.toISOString()));
    expect(p).not.toContain('Ver histórico completo');
  });
});

// T11 (03, 5.4): a barra das cinco etapas recebe o resultado de etapasDaDemanda (chamada só pela página, CA-09.4).
describe('BarraDeEtapas.tsx (RF-08; 03, 5.4)', () => {
  const etapa = (numero: EtapaDaDemanda['numero'], nome: string, idVersao: string | null, estado: EtapaDaDemanda['estado'], feita: boolean, atual = false): EtapaDaDemanda => ({
    numero,
    nome,
    idVersao,
    estado,
    feita,
    atual,
  });
  const CA_08_1: EtapaDaDemanda[] = [
    etapa(1, 'Demanda', ID, 'Registrada', true),
    etapa(2, 'Especificação', `ESP-${ID}-v2`, 'Feita', true),
    etapa(3, 'Parecer de risco', `RSK-${ID}-v1`, 'Feito', true),
    etapa(4, 'Decisão', `DEC-${ID}-v1`, '1 de 2 aprovações', false, true),
    etapa(5, 'Pedido de Construção', null, 'Depois da aprovação', false),
  ];

  it('CA-08.1: lista ordenada "Etapas da demanda" com cinco itens; nome, id ou "Nenhuma" e estado em texto; só a atual com aria-current="step"', () => {
    const p = html(h(BarraDeEtapas, { etapas: CA_08_1 }));
    expect(p).toMatch(/^<section[^>]*><ol aria-label="Etapas da demanda"/);
    const itens = itensDaLista(p);
    expect(itens).toHaveLength(5);
    expect(p.match(/aria-current="step"/g)).toHaveLength(1);
    expect(p).toMatch(/<li aria-current="step"[^>]*>(?:(?!<\/li>)[\s\S])*Decisão(?:(?!<\/li>)[\s\S])*1 de 2 aprovações/);
    for (const [i, nome, id, estado] of [
      [0, 'Demanda', ID, 'Registrada'],
      [1, 'Especificação', `ESP-${ID}-v2`, 'Feita'],
      [2, 'Parecer de risco', `RSK-${ID}-v1`, 'Feito'],
      [3, 'Decisão', `DEC-${ID}-v1`, '1 de 2 aprovações'],
      [4, 'Pedido de Construção', 'Nenhuma', 'Depois da aprovação'],
    ] as const) {
      expect(itens[i]).toContain(`>${nome}</strong>`);
      expect(itens[i]).toContain(`>${id}</span>`);
      expect(itens[i]).toContain(`>${estado}</span>`);
    }
  });

  it('marcas por forma, escondidas do leitor de tela: feita com visto, atual com o número e anel, por fazer tracejada com o número', () => {
    const p = html(h(BarraDeEtapas, { etapas: CA_08_1 }));
    const marcas = [...p.matchAll(/<span aria-hidden="true" data-marca="([a-z-]+)"[^>]*>([\s\S]*?)<\/span>/g)].map((m) => [m[1], m[2]]);
    expect(marcas.map(([m]) => m)).toEqual(['feita', 'feita', 'feita', 'atual', 'por-fazer']);
    expect(marcas[0]![1]).toContain('<svg');
    expect(marcas[3]![1]).toBe('4');
    expect(marcas[4]![1]).toBe('5');
    expect(p).toMatch(/data-marca="atual" class="[^"]*\bring-2\b[^"]*"/);
    expect(p).toMatch(/data-marca="por-fazer" class="[^"]*\bborder-dashed\b[^"]*"/);
  });

  it('CA-08.3: sem etapa atual (encerrada ou entregue), nenhum aria-current', () => {
    const p = html(h(BarraDeEtapas, { etapas: CA_08_1.map((e) => ({ ...e, atual: false })) }));
    expect(p).not.toContain('aria-current');
    expect(p).not.toContain('data-marca="atual"');
  });
});

// T11 (03, 5.5): o cartão recebe o resultado de proximaAcao; só informa.
describe('CartaoProximaAcao.tsx (RF-09; 03, 5.5)', () => {
  const acao = (extra: Partial<ProximaAcao> = {}): ProximaAcao => ({
    linha: 8,
    oQueFalta: 'Decidir entre as opções A e B.',
    detalhe: null,
    quemAge: 'CTO',
    link: { rotulo: 'Abrir a decisão', destino: { tipo: 'pagina', href: `/pacotes-decisao/DEC-${ID}-v1` } },
    ...extra,
  });

  it('section "Próxima ação" (h2) em superfície escura; o que falta, "Quem age:" e o link para a página', () => {
    const p = html(h(CartaoProximaAcao, { acao: acao() }));
    expect(p).toMatch(/^<section aria-labelledby="proxima-acao" class="[^"]*\bsuperficie-escura\b[^"]*\bbg-marinho\b[^"]*">/);
    expect(p).toMatch(/<h2 id="proxima-acao"[^>]*>Próxima ação<\/h2>/);
    expect(p).toMatch(/<p[^>]*>Decidir entre as opções A e B\.<\/p>/);
    expect(p).toMatch(/<p[^>]*><span class="font-semibold">Quem age:<\/span> CTO<\/p>/);
    expect(p).toMatch(new RegExp(`<a [^>]*href="/pacotes-decisao/DEC-${ID}-v1"[^>]*>Abrir a decisão</a>`));
    // Sem detalhe, só dois parágrafos: o que falta e quem age.
    expect(p.match(/<p\b/g)).toHaveLength(2);
  });

  it('detalhe da linha 8 quando há; destino na própria página vira link para o h2 da seção', () => {
    const comDetalhe = html(h(CartaoProximaAcao, { acao: acao({ detalhe: 'O CTO já aprovou a opção A. Falta a aprovação da administradora, com o identificador do documento assinado.', quemAge: 'Administradora' }) }));
    expect(comDetalhe).toContain('O CTO já aprovou a opção A. Falta a aprovação da administradora, com o identificador do documento assinado.');
    const duvidas = html(h(CartaoProximaAcao, { acao: acao({ linha: 3, link: { rotulo: 'Ver as dúvidas em aberto', destino: { tipo: 'secao', secao: 'duvidas' } } }) }));
    expect(duvidas).toMatch(new RegExp(`<a href="#${ID_SECAO.duvidas}"[^>]*>Ver as dúvidas em aberto</a>`));
    const status = html(h(CartaoProximaAcao, { acao: acao({ linha: 11, link: { rotulo: 'Mudar o status', destino: { tipo: 'secao', secao: 'status' } } }) }));
    expect(status).toMatch(new RegExp(`<a href="#${ID_SECAO.status}"[^>]*>Mudar o status</a>`));
  });

  it('sem link (linhas 1, 2 e 13): nenhum <a>', () => {
    const p = html(h(CartaoProximaAcao, { acao: acao({ linha: 13, oQueFalta: 'Acompanhar a demanda.', quemAge: 'Sem responsável definido', link: null }) }));
    expect(p).not.toContain('<a ');
    expect(p).toContain('Sem responsável definido');
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
    expect(p).toContain('<p id="campo-novoStatus-aprovada-dica" class="ml-7 text-sm text-tinta-media">Aprovada: precisa de um pacote de decisão aprovado e atualizado.</p>');
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
    mDec.mockReset();
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
    // T11: sem DEC, nem a autorização nem a leitura do pacote.
    expect(mAutorizar).not.toHaveBeenCalledWith(CTO, 'ler_pacote_decisao');
    expect(mDec).not.toHaveBeenCalled();
  });

  it('cabeçalho, navegação "Nesta página" e as seções com h2 focável, na ordem da 03', async () => {
    const p = await detalhe(ID);
    // T11: o título isolado por <bdi> (CV-18).
    expect(p).toMatch(/<h1[^>]*><bdi>Pedidos duplicados no ERP \(fictício\)<\/bdi><\/h1>/);
    expect(p).toMatch(/<nav aria-label="Nesta página"/);
    // T11: "Mudar status" também no cabeçalho; os links da navegação "Nesta página" são conferidos dentro dela.
    const inicioDaNav = p.indexOf('<nav aria-label="Nesta página"');
    const nav = p.slice(inicioDaNav, p.indexOf('</nav>', inicioDaNav));
    const links = [...nav.matchAll(/<a href="#([a-z-]+)"[^>]*>([^<]+)<\/a>/g)].map((m) => [m[1], m[2]]);
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
      'Origem',
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
    expect(p).toMatch(/<h1[^>]*><bdi>Título &lt;script&gt;alert\(1\)&lt;\/script&gt;<\/bdi><\/h1>/);
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
    mDec.mockResolvedValue(vistaDoDec(1, { desatualizado: true }));
    const p = await detalhe(ID);
    expect(mEsp).toHaveBeenCalledExactlyOnceWith(DB, `ESP-${ID}-v2`);
    expect(mDec).toHaveBeenCalledExactlyOnceWith(DB, `DEC-${ID}-v1`);
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

  // --- T11 do DEC-DEM-20261110-0015-v1: T05 no arranjo A2 ---

  const comDecDuplo = () => {
    mObter.mockResolvedValue(
      demanda({ status: 'pronta_para_decisao', especificacoes: [versao('ESP', 1)], pareceresRisco: [versao('RSK', 1)], pacotesDecisao: [pacote(1)] }),
    );
    mEsp.mockResolvedValue({ id: `ESP-${ID}-v1`, duvidasEmAberto: [] } as unknown as Awaited<ReturnType<typeof obterEspecificacao>>);
    mDec.mockResolvedValue(
      vistaDoDec(1, {
        nivelAprovacaoRequerido: 'cto_e_administradora',
        aprovadores: [{ papel: 'cto', nome: 'SENTINELA-NOME', opcao: 'A', registradaEm: CRIADA, referenciaDocumento: 'SENTINELA-DOC', dataDocumento: '2026-10-21' }],
      }),
    );
  };

  it('CV-09: ler_pacote_decisao autorizado antes de ler o DEC; o id é o de d.pacotesDecisao[0], nunca o da URL; nada do aprovador na tela', async () => {
    comDecDuplo();
    const p = await detalhe(ID, { dec: 'DEC-DEM-20990101-0001-v1', decId: 'DEC-DEM-20990101-0001-v1' });
    expect(mAutorizar).toHaveBeenCalledWith(CTO, 'ler_pacote_decisao');
    const ordemDaAutorizacao = mAutorizar.mock.calls.findIndex(([, acao]) => acao === 'ler_pacote_decisao');
    expect(mAutorizar.mock.invocationCallOrder[ordemDaAutorizacao]!).toBeLessThan(mDec.mock.invocationCallOrder[0]!);
    expect(mDec).toHaveBeenCalledExactlyOnceWith(DB, `DEC-${ID}-v1`);
    expect(p).not.toContain('SENTINELA');
    expect(p).not.toContain('DEC-DEM-20990101-0001-v1');
  });

  it('CA-08.1 e CA-09.1 (HTML): dupla com a aprovação do CTO → "1 de 2 aprovações" atual; Próxima ação para a administradora com o link da T11', async () => {
    comDecDuplo();
    const p = await detalhe(ID);
    expect(p).toMatch(/<li aria-current="step"[^>]*>(?:(?!<\/li>)[\s\S])*>Decisão<\/strong>(?:(?!<\/li>)[\s\S])*>1 de 2 aprovações<\/span>/);
    expect(p.match(/aria-current="step"/g)).toHaveLength(1);
    for (const estado of ['Registrada', 'Feita', 'Feito', 'Depois da aprovação']) expect(p).toContain(`>${estado}</span>`);
    const cartao = p.slice(p.indexOf('<section aria-labelledby="proxima-acao"'), p.indexOf('</section>', p.indexOf('<section aria-labelledby="proxima-acao"')));
    expect(cartao).toContain('Decidir entre as opções A e B.');
    expect(cartao).toContain('O CTO já aprovou a opção A. Falta a aprovação da administradora, com o identificador do documento assinado.');
    expect(cartao).toMatch(/Quem age:<\/span> Administradora</);
    expect(cartao).toMatch(new RegExp(`<a [^>]*href="/pacotes-decisao/DEC-${ID}-v1"[^>]*>Abrir a decisão</a>`));
  });

  it('CA-08.2 (HTML): sem versões → Especificação "Por fazer", "Nenhuma" e atual; Próxima ação linha 4 com o link para a T07', async () => {
    const p = await detalhe(ID);
    expect(p).toMatch(/<li aria-current="step"[^>]*>(?:(?!<\/li>)[\s\S])*>Especificação<\/strong>(?:(?!<\/li>)[\s\S])*>Nenhuma<\/span>(?:(?!<\/li>)[\s\S])*>Por fazer<\/span>/);
    expect(p).toContain('Escrever a especificação técnica.');
    expect(p).toMatch(/Quem age:<\/span> Agente de insumo técnico ou uma pessoa</);
    expect(p).toMatch(new RegExp(`<a [^>]*href="/demandas/${ID}/especificacoes/nova"[^>]*>Escrever a especificação</a>`));
  });

  it('CA-08.3 (HTML): encerrada → nenhuma etapa com aria-current; Próxima ação "Nada. A demanda está em Encerrada."', async () => {
    mObter.mockResolvedValue(demanda({ status: 'encerrada' }));
    const p = await detalhe(ID);
    expect(p).toContain('<ol aria-label="Etapas da demanda"');
    expect(p).not.toContain('aria-current="step"');
    expect(p).toContain('Nada. A demanda está em Encerrada.');
    expect(p).toMatch(/Quem age:<\/span> Ninguém</);
  });

  it('arranjo A2 (03, 5.2): trilha, cabeçalho, "Nesta página", barra, Próxima ação, seções em cartão e Histórico por último no DOM', async () => {
    const p = await detalhe(ID);
    const posicoes = [
      '<nav aria-label="Trilha">',
      '<h1',
      '<nav aria-label="Nesta página"',
      '<ol aria-label="Etapas da demanda"',
      '<section aria-labelledby="proxima-acao"',
      `<h2 id="${ID_SECAO.dados}"`,
      `<h2 id="${ID_SECAO.versoes}"`,
      `<h2 id="${ID_SECAO.status}"`,
      `<h2 id="${ID_SECAO.texto}"`,
      `<h2 id="${ID_SECAO.historico}"`,
    ].map((t) => p.indexOf(t));
    expect(posicoes.every((x) => x >= 0)).toBe(true);
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
    // Trilha: "Demandas" e o id atual, sem link.
    expect(p).toMatch(/<nav aria-label="Trilha"><ol[^>]*><li[^>]*><a [^>]*href="\/demandas"[^>]*>Demandas<\/a><\/li>/);
    expect(p).toMatch(new RegExp(`<span aria-current="page"[^>]*>${ID}</span>`));
    // Cabeçalho: urgência em texto e "Mudar status" para o h2 Status, antes da navegação "Nesta página".
    expect(p).toContain('Urgência: Média');
    const mudar = p.search(new RegExp(`<a href="#${ID_SECAO.status}"[^>]*>Mudar status</a>`));
    expect(mudar).toBeGreaterThan(p.indexOf('<h1'));
    expect(mudar).toBeLessThan(p.indexOf('<nav aria-label="Nesta página"'));
    // Seções em cartão; a partir de 1200 px, Próxima ação e Histórico na coluna lateral (só CSS, sem mudar o DOM).
    for (const id of [ID_SECAO.dados, ID_SECAO.versoes, ID_SECAO.status, ID_SECAO.texto, ID_SECAO.historico])
      expect(p).toMatch(new RegExp(`<section aria-labelledby="${id}" class="[^"]*\\brounded-cartao\\b[^"]*">`));
    expect(p).toMatch(/<section aria-labelledby="proxima-acao" class="[^"]*\bxl:col-start-3\b/);
    expect(p).toMatch(new RegExp(`<section aria-labelledby="${ID_SECAO.historico}" class="[^"]*\\bxl:col-start-3\\b`));
  });

  it('sem urgência informada: o cabeçalho não mostra "Urgência:"', async () => {
    mObter.mockResolvedValue(demanda({ urgencia: null }));
    expect(await detalhe(ID)).not.toContain('Urgência:');
  });
});

// 06-T11-testes (qa-automacao): bordas da T05 no arranjo A2 que a construção não cobria. A ligação da página com as
// regras da T10 (o que ela passa a etapasDaDemanda e a proximaAcao), a leitura do DEC (CV-09) quando é negada, falha ou
// vem incoerente, e a integridade das âncoras da página em cada linha do cartão que aponta para uma seção.
describe('page.tsx no arranjo A2: bordas (06-T11-testes)', () => {
  const detalhe = async (id: string, p: Record<string, string | string[] | undefined> = {}) =>
    html(await PaginaDemanda({ params: Promise.resolve({ id }), searchParams: Promise.resolve(p) }));
  const ESP_SEM_DUVIDA = { id: `ESP-${ID}-v1`, duvidasEmAberto: [] } as unknown as Awaited<ReturnType<typeof obterEspecificacao>>;
  const ESP_COM_DUVIDAS = { id: `ESP-${ID}-v1`, duvidasEmAberto: ['Qual o volume diário? (fictício)'] } as unknown as Awaited<ReturnType<typeof obterEspecificacao>>;
  const decidida = (opcaoEscolhida: 'A' | 'B') => ({ opcaoEscolhida, comentarios: 'SENTINELA-COMENTARIO', decididaPor: 'SENTINELA-QUEM-DECIDIU', decididaEm: CRIADA });
  const cartao = (p: string) => {
    const i = p.indexOf('<section aria-labelledby="proxima-acao"');
    return p.slice(i, p.indexOf('</section>', i));
  };
  const itensDaBarra = (p: string) => {
    const i = p.indexOf('<ol aria-label="Etapas da demanda"');
    return [...p.slice(i, p.indexOf('</ol>', i)).matchAll(/<li\b([^>]*)>([\s\S]*?)<\/li>/g)].map((m) => ({ atributos: m[1]!, corpo: m[2]! }));
  };
  // Toda âncora da página (href="#x") tem um elemento com id="x": nenhum link leva a uma seção que não existe.
  const ancorasSemAlvo = (p: string) => [...new Set([...p.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]!))].filter((a) => !p.includes(`id="${a}"`));

  // ESP v1, RSK v1 e DEC v1 aprovado na opção dada, com a vista lida pela página.
  const comAprovado = (status: DemandaVista['status'], opcao: 'A' | 'B' = 'B') => {
    mObter.mockResolvedValue(
      demanda({ status, especificacoes: [versao('ESP', 1)], pareceresRisco: [versao('RSK', 1)], pacotesDecisao: [pacote(1, { statusDecisao: 'aprovada' })] }),
    );
    mEsp.mockResolvedValue(ESP_SEM_DUVIDA);
    mDec.mockResolvedValue(vistaDoDec(1, { statusDecisao: 'aprovada', decisao: decidida(opcao) } as unknown as Partial<PacoteDecisaoVista>));
  };

  beforeEach(() => {
    mExigirNaPagina.mockReset().mockResolvedValue(CTO);
    mAutorizar.mockClear();
    mObter.mockReset().mockResolvedValue(demanda());
    mTexto.mockReset().mockResolvedValue({ situacao: 'sem_texto' });
    mHistorico.mockReset().mockResolvedValue([evento('demanda_criada')]);
    mEsp.mockReset();
    mDec.mockReset();
  });

  it('CV-09: ler_pacote_decisao negado → a página falha com o erro da autorização, sem ler DEC, histórico, texto nem ESP', async () => {
    const { autorizar: autorizarReal } = await vi.importActual<typeof import('../../../../modules/acesso/matriz')>('../../../../modules/acesso/matriz');
    mObter.mockResolvedValue(demanda({ especificacoes: [versao('ESP', 1)], pareceresRisco: [versao('RSK', 1)], pacotesDecisao: [pacote(1)] }));
    mAutorizar.mockImplementation((ator, acao) => {
      if (acao === 'ler_pacote_decisao') throw new Error('SENTINELA-NEGADO');
      autorizarReal(ator, acao);
    });
    try {
      await expect(detalhe(ID)).rejects.toThrow('SENTINELA-NEGADO');
    } finally {
      mAutorizar.mockImplementation(autorizarReal);
    }
    expect(mAutorizar).toHaveBeenCalledWith(CTO, 'ler_pacote_decisao');
    expect(mDec).not.toHaveBeenCalled();
    expect(mHistorico).not.toHaveBeenCalled();
    expect(mTexto).not.toHaveBeenCalled();
    expect(mEsp).not.toHaveBeenCalled();
  });

  it('CV-09: com três DECs, só o mais novo (d.pacotesDecisao[0]) é lido, uma vez, e é ele que a barra mostra', async () => {
    mObter.mockResolvedValue(
      demanda({ pacotesDecisao: [pacote(3), pacote(2, { statusDecisao: 'devolvida' }), pacote(1, { statusDecisao: 'arquivada' })] }),
    );
    mDec.mockResolvedValue(vistaDoDec(3));
    const p = await detalhe(ID);
    expect(mDec).toHaveBeenCalledExactlyOnceWith(DB, `DEC-${ID}-v3`);
    const decisao = itensDaBarra(p)[3]!.corpo;
    expect(decisao).toContain(`>DEC-${ID}-v3</span>`);
    expect(decisao).toContain('>Decisão pendente</span>');
  });

  it('falha na leitura do DEC sobe para a tela de erro de hoje (a página rejeita, sem HTML parcial)', async () => {
    mObter.mockResolvedValue(demanda({ pacotesDecisao: [pacote(1)] }));
    mDec.mockRejectedValue(new Error('SENTINELA-ERRO do DEC'));
    await expect(detalhe(ID)).rejects.toThrow('SENTINELA-ERRO do DEC');
  });

  it('DEC lido incoerente com a vista da demanda (outro id) vira erro, e não uma barra com estado errado', async () => {
    mObter.mockResolvedValue(demanda({ pacotesDecisao: [pacote(1)] }));
    mDec.mockResolvedValue(vistaDoDec(2));
    await expect(detalhe(ID)).rejects.toThrow('etapas: DEC mais novo incoerente');
  });

  it('a barra usa a vista lida do DEC: aprovado na opção B → "Aprovada, opção B" feita e o Pedido "Ainda não gerado" atual; nada da decisão a mais na tela', async () => {
    comAprovado('aprovada', 'B');
    const p = await detalhe(ID);
    const [, , , decisao, pedido] = itensDaBarra(p);
    expect(decisao!.corpo).toContain('>Aprovada, opção B</span>');
    expect(decisao!.corpo).toContain('data-marca="feita"');
    expect(decisao!.atributos).not.toContain('aria-current');
    expect(pedido!.corpo).toContain('>Ainda não gerado</span>');
    expect(pedido!.atributos).toContain('aria-current="step"');
    // Linha 10 do RF-09, com o link para a decisão aprovada.
    expect(cartao(p)).toContain('Gerar o Pedido de Construção e, quando a construção começar, mudar o status para Em construção.');
    expect(cartao(p)).toMatch(new RegExp(`<a [^>]*href="/pacotes-decisao/DEC-${ID}-v1"[^>]*>Abrir a decisão aprovada</a>`));
    // CV-09: comentário e quem decidiu ficam fora da T05.
    expect(p).not.toContain('SENTINELA');
  });

  it('a barra usa o histórico lido: pedido_gerado do aprovado vigente → Pedido "Gerado" com o id do DEC; com tudo feito, nenhuma etapa atual', async () => {
    comAprovado('aprovada', 'A');
    mHistorico.mockResolvedValue([
      evento('pedido_gerado', { entidade: 'pacote_decisao', entidadeId: `DEC-${ID}-v1` } as unknown as Partial<EventoVisivel>),
      evento('demanda_criada'),
    ]);
    const p = await detalhe(ID);
    const pedido = itensDaBarra(p)[4]!;
    expect(pedido.corpo).toContain('>Gerado</span>');
    expect(pedido.corpo).toContain(`>DEC-${ID}-v1</span>`);
    expect(pedido.corpo).toContain('data-marca="feita"');
    expect(p).not.toContain('aria-current="step"');
  });

  it('agente trabalhando (linha 2): o cartão diz o que esperar e quem age, sem link; o aviso de agente trabalhando continua no topo', async () => {
    const d = demanda({ agentesEmAndamento: [{ agente: 'risco', status: 'em_andamento' }] });
    mObter.mockResolvedValue(d);
    const p = await detalhe(ID);
    const c = cartao(p);
    expect(c).toContain(`Esperar o ${agenteNaFrase('risco')} terminar ${ARTEFATO_DO_AGENTE.risco}.`);
    expect(c).toMatch(new RegExp(`Quem age:</span> ${NOME_AGENTE.risco}<`));
    expect(c).not.toContain('<a ');
    const [aviso] = alertasDoTopo(d, [evento('demanda_criada')], false);
    expect(aviso?.tipo).toBe('informacao');
    expect(p).toContain(aviso!.texto);
  });

  it('aguardando informação com a seção de dúvidas: barra "Com dúvidas em aberto" atual; o cartão leva à seção de dúvidas', async () => {
    mObter.mockResolvedValue(demanda({ status: 'aguardando_informacao', especificacoes: [versao('ESP', 1)] }));
    mEsp.mockResolvedValue(ESP_COM_DUVIDAS);
    const p = await detalhe(ID);
    const especificacao = itensDaBarra(p)[1]!;
    expect(especificacao.corpo).toContain('>Com dúvidas em aberto</span>');
    expect(especificacao.atributos).toContain('aria-current="step"');
    expect(cartao(p)).toMatch(new RegExp(`<a href="#${ID_SECAO.duvidas}"[^>]*>Ver as dúvidas em aberto</a>`));
    expect(p).toContain(`id="${ID_SECAO.duvidas}"`);
  });

  it('aguardando informação sem a seção de dúvidas (temSecaoDeDuvidas = false): o cartão leva a Mudar status, nunca a uma âncora que não existe', async () => {
    mObter.mockResolvedValue(demanda({ status: 'aguardando_informacao', especificacoes: [versao('ESP', 1)] }));
    mEsp.mockResolvedValue(ESP_SEM_DUVIDA);
    const p = await detalhe(ID);
    expect(p).not.toContain(`id="${ID_SECAO.duvidas}"`);
    expect(cartao(p)).not.toContain(`href="#${ID_SECAO.duvidas}"`);
    expect(cartao(p)).toMatch(new RegExp(`<a href="#${ID_SECAO.status}"[^>]*>Mudar o status</a>`));
  });

  it.each([
    ['nova, sem versões', () => undefined],
    [
      'aguardando informação com dúvidas',
      () => {
        mObter.mockResolvedValue(demanda({ status: 'aguardando_informacao', especificacoes: [versao('ESP', 1)] }));
        mEsp.mockResolvedValue(ESP_COM_DUVIDAS);
      },
    ],
    [
      'aguardando informação sem dúvidas',
      () => {
        mObter.mockResolvedValue(demanda({ status: 'aguardando_informacao', especificacoes: [versao('ESP', 1)] }));
        mEsp.mockResolvedValue(ESP_SEM_DUVIDA);
      },
    ],
    ['em construção (linha 11)', () => comAprovado('em_construcao')],
    ['devolvida (linha 12)', () => comAprovado('devolvida')],
    [
      'encerrada (linha 1)',
      () => {
        mObter.mockResolvedValue(demanda({ status: 'encerrada' }));
      },
    ],
  ] satisfies ReadonlyArray<readonly [string, () => void]>)('%s: toda âncora da página (cabeçalho, "Nesta página", alertas e Próxima ação) tem alvo', async (_nome, preparar) => {
    preparar();
    const p = await detalhe(ID);
    expect(p).toContain('<section aria-labelledby="proxima-acao"');
    expect(ancorasSemAlvo(p)).toEqual([]);
  });

  it('linhas 11 e 12 na página: o link do cartão vai ao h2 focável de Mudar status', async () => {
    for (const status of ['em_construcao', 'devolvida'] as const) {
      comAprovado(status);
      const p = await detalhe(ID);
      expect(cartao(p), status).toMatch(new RegExp(`<a href="#${ID_SECAO.status}"[^>]*>Mudar o status</a>`));
      expect(p, status).toMatch(new RegExp(`<h2 id="${ID_SECAO.status}" tabindex="-1"`));
    }
  });
});
