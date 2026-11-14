// T12 do DEC-DEM-20261111-0018-v1 (RF-03, RF-06; CA-03.6, CA-06.1 a CA-06.4; SB-12; ADR-40; D-10 a D-12; G9): os três
// avisos da vigência, a dica do Arquivar e a chegada depois de arquivar na T11, pelo HTML do servidor. A leitura nova
// (vigenteDaDemanda) só acontece depois da pessoa, de `ler_pacote_decisao` e de achar o pacote (oráculo); o DEC mais
// novo pendente só é lido quando o aberto é o vigente (D-12). Os avisos só informam: os botões e o `disabled` não mudam.
// Molde de pagina.test.ts: sessão e leituras são dublês; a matriz de acesso é a real. Ids e nomes fictícios.
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dicaDoArquivar } from '../../../../components/dados-da-decisao';
import type { AtorPessoa } from '../../../../modules/acesso/ator';
import { exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../modules/acesso/matriz';
import { destinoDoArquivamento, estadoDoVigente } from '../../../../modules/demandas/arquivamento';
import { obterDemanda, type DemandaVista, type PacoteResumo, type VersaoResumo } from '../../../../modules/demandas/consultas';
import { obterPacoteDecisao, type PacoteDecisaoVista } from '../../../../modules/pacotes-decisao/consultas';
import { vigenteDaDemanda, type VigenteDaDemanda } from '../../../../modules/pacotes-decisao/substituido';
import { recebimentoDoPedido } from '../../../../modules/pedido-construcao/pendentes';
import PaginaDecisao from './page';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/pacotes-decisao/DEC-DEM-20991231-0001-v2',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('../../../../lib/deps', () => ({ obterDeps: async () => ({ db: { dubleDoBanco: true } }) }));
vi.mock('../../../../modules/acesso/exigir-pessoa', () => ({ exigirPessoaNaPagina: vi.fn(), exigirPessoa: vi.fn() }));
vi.mock('../../../../modules/acesso/matriz', async (original) => {
  const real = await original<typeof import('../../../../modules/acesso/matriz')>();
  return { ...real, autorizar: vi.fn(real.autorizar) };
});
vi.mock('../../../../modules/demandas/consultas', async (original) => {
  const real = await original<typeof import('../../../../modules/demandas/consultas')>();
  return { ...real, obterDemanda: vi.fn() };
});
vi.mock('../../../../modules/pacotes-decisao/consultas', async (original) => {
  const real = await original<typeof import('../../../../modules/pacotes-decisao/consultas')>();
  return { ...real, obterPacoteDecisao: vi.fn() };
});
vi.mock('../../../../modules/pacotes-decisao/substituido', async (original) => {
  const real = await original<typeof import('../../../../modules/pacotes-decisao/substituido')>();
  return { ...real, vigenteDaDemanda: vi.fn(async () => null) };
});
vi.mock('./acoes', () => ({ registrarDecisaoNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));
vi.mock('./acoes-pedido', () => ({ gerarPedidoNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));
vi.mock('../../../../modules/pedido-construcao/pendentes', () => ({ recebimentoDoPedido: vi.fn() }));

const mExigir = vi.mocked(exigirPessoaNaPagina);
const mAutorizar = vi.mocked(autorizar);
const mDemanda = vi.mocked(obterDemanda);
const mPacote = vi.mocked(obterPacoteDecisao);
const mVigente = vi.mocked(vigenteDaDemanda);
const mRecebimento = vi.mocked(recebimentoDoPedido);

const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const DEM = 'DEM-20991231-0001';
const V1 = `DEC-${DEM}-v1`;
const V2 = `DEC-${DEM}-v2`;
const ESP = `ESP-${DEM}-v1`;
const RSK = `RSK-${DEM}-v1`;
const DB = { dubleDoBanco: true };
const CRIADO = new Date('2099-12-30T17:05:00Z');
const APROVADO = new Date('2099-12-30T18:00:00Z');

const AVISO_A = `Esta demanda já tem um pacote aprovado em vigor: ${V1}.`;
const AVISO_B = `Há um pacote mais novo pendente nesta demanda: ${V2}.`;
const AVISO_C = 'A aprovação deste pacote será recusada:';

const resumo = (id: string): VersaoResumo => ({ id, versao: Number(/-v(\d+)$/.exec(id)![1]), criadaEm: CRIADO, autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' }, rascunhoAgente: false });
const resumoDec = (id: string, extra: Partial<PacoteResumo> = {}): PacoteResumo => ({
  ...resumo(id),
  statusDecisao: 'pendente',
  desatualizado: false,
  substituido: false,
  substituidoPor: null,
  ...extra,
});

function demanda(extra: Partial<DemandaVista> = {}): DemandaVista {
  return {
    id: DEM,
    titulo: 'Relatório semanal (fictício)',
    tipo: 'melhoria',
    status: 'pronta_para_decisao',
    solicitanteNome: 'Pessoa Ficticia',
    solicitantePapel: null,
    linhaServicoProvavel: null,
    urgencia: null,
    justificativaUrgencia: null,
    contexto: null,
    descricaoProblema: null,
    impactoPercebido: null,
    anexos: [],
    duvidasEntrada: [],
    rascunhoAgente: false,
    responsavel: { tipo: 'pessoa', nome: 'Pessoa Ficticia' },
    criadaEm: CRIADO,
    atualizadaEm: CRIADO,
    especificacoes: [resumo(ESP)],
    pareceresRisco: [resumo(RSK)],
    // O mais novo primeiro, como a vista devolve.
    pacotesDecisao: [resumoDec(V2), resumoDec(V1, { statusDecisao: 'aprovada' })],
    agentesEmAndamento: [],
    andamento: null,
    ...extra,
  };
}

function pacote(extra: Partial<PacoteDecisaoVista> = {}): PacoteDecisaoVista {
  return {
    id: V2,
    demandaId: DEM,
    versao: 2,
    especificacaoId: ESP,
    parecerRiscoId: RSK,
    demandaTipo: 'melhoria',
    demandaTitulo: 'Relatório semanal (fictício)',
    demandaDescricao: 'Problema: fictício',
    resumoExecutivo: 'Resumo executivo fictício.',
    opcaoA: { descricao: 'Construir tudo (fictício)' },
    opcaoB: { descricao: 'Construir em duas entregas (fictício)' },
    recomendacao: null,
    nivelAprovacaoRequerido: 'cto',
    autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia CTO' },
    rascunhoAgente: false,
    criadaEm: CRIADO,
    statusDecisao: 'pendente',
    aprovadores: [],
    desatualizado: false,
    substituido: false,
    substituidoPor: null,
    decisao: null,
    rascunhosCitados: [],
    especificacaoCitada: {
      sistemaAlvo: 'sistema-ficticio',
      repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
      criteriosAceitePreliminares: ['Critério (fictício)'],
      definicaoDePronto: ['Pronto (fictício)'],
    },
    niveisRisco: { tecnico: 'baixo', operacional: 'baixo', juridico: 'baixo' },
    ...extra,
  };
}

const aprovacaoCto = { papel: 'cto' as const, nome: CTO.nome, opcao: 'A' as const, registradaEm: APROVADO, referenciaDocumento: null, dataDocumento: null };
// O v1 aprovado (nível cto por padrão), lido como a vista do pacote.
const v1Aprovado = (extra: Partial<PacoteDecisaoVista> = {}) =>
  pacote({
    id: V1,
    versao: 1,
    statusDecisao: 'aprovada',
    aprovadores: [aprovacaoCto],
    decisao: { opcaoEscolhida: 'A', comentarios: null, decididaPor: CTO.nome, decididaEm: APROVADO },
    ...extra,
  });
const vigente = (extra: Partial<VigenteDaDemanda> = {}): VigenteDaDemanda => ({ id: V1, nivel: 'cto', desatualizado: false, ...extra });

// A T11 aberta no `decId`, com cada leitura do pacote respondida pelo id pedido.
function pacotes(...ps: PacoteDecisaoVista[]): void {
  mPacote.mockImplementation(async (_db, id) => {
    const p = ps.find((x) => x.id === id);
    if (!p) throw new Error(`pacote não preparado no teste: ${id}`);
    return p;
  });
}

async function pagina(decId = V2, busca: Record<string, string | string[] | undefined> = {}): Promise<string> {
  return renderToStaticMarkup(await PaginaDecisao({ params: Promise.resolve({ decId }), searchParams: Promise.resolve(busca) }));
}

// O <div> do Alerta que contém o texto, inteiro (sem alerta aninhado).
function alertaCom(s: string, trecho: string): string | undefined {
  const fim = s.indexOf(trecho);
  if (fim < 0) return undefined;
  const inicio = s.lastIndexOf('<div', fim);
  return s.slice(inicio, s.indexOf('</div>', fim) + '</div>'.length);
}

// O link solto da 03, 2.4 (44 px de alvo abaixo de 768 px), como o do aviso do substituído.
const CLASSE_LINK_SOLTO = 'inline-flex min-h-11 items-center md:min-h-6 text-acao-escura underline underline-offset-2';

// O href e a classe do único <a> com o texto dado, dentro do alerta.
function linkSolto(alerta: string, texto: string): { href: string | undefined; classe: string | undefined } | null {
  const links = [...alerta.matchAll(/<a ([^>]*)>([^<]*)<\/a>/g)].filter((m) => m[2] === texto);
  if (links.length !== 1) return null;
  const atributos = links[0]![1]!;
  return { href: /\bhref="([^"]*)"/.exec(atributos)?.[1], classe: /\bclass="([^"]*)"/.exec(atributos)?.[1] };
}

// Os botões da página, com os atributos e o texto: o que não pode mudar com o aviso (SB-12 c).
const botoes = (s: string): string[] => [...s.matchAll(/<button[^>]*>[\s\S]*?<\/button>/g)].map((m) => m[0]);

beforeEach(() => {
  vi.clearAllMocks();
  mExigir.mockResolvedValue(CTO);
  pacotes(pacote(), v1Aprovado());
  mDemanda.mockResolvedValue(demanda());
  mVigente.mockResolvedValue(null);
  mRecebimento.mockResolvedValue(null);
});

describe('G9 (oráculo): a leitura do vigente e a do mais novo só depois de autorizar e de achar o pacote', () => {
  it('sessão negada: nenhuma das duas leituras', async () => {
    mExigir.mockRejectedValue(new Error('NEXT_REDIRECT'));
    await expect(pagina()).rejects.toThrow('NEXT_REDIRECT');
    expect(mVigente).not.toHaveBeenCalled();
    expect(mPacote).not.toHaveBeenCalled();
  });

  it('ler_pacote_decisao negado: nenhuma das duas leituras', async () => {
    mAutorizar.mockImplementationOnce(() => {
      throw new Error('negado (fictício)');
    });
    await expect(pagina()).rejects.toThrow('negado (fictício)');
    expect(mAutorizar.mock.calls.map((c) => c[1])).toEqual(['ler_pacote_decisao']);
    expect(mVigente).not.toHaveBeenCalled();
    expect(mPacote).not.toHaveBeenCalled();
  });

  it('DEC inexistente ou fora do formato: 404 sem a leitura do vigente', async () => {
    const { ErroDominio } = await import('../../../../lib/erros');
    mPacote.mockRejectedValue(new ErroDominio('nao_encontrado', 'x'));
    await expect(pagina()).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(pagina('qualquer-coisa')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mVigente).not.toHaveBeenCalled();
  });

  it('com o pacote achado: o vigente da demanda do pacote, uma vez, depois de autorizar e de ler o pacote', async () => {
    await pagina();
    expect(mVigente).toHaveBeenCalledTimes(1);
    expect(mVigente).toHaveBeenCalledWith(DB, DEM);
    expect(mAutorizar.mock.invocationCallOrder[0]!).toBeLessThan(mVigente.mock.invocationCallOrder[0]!);
    expect(mPacote.mock.invocationCallOrder[0]!).toBeLessThan(mVigente.mock.invocationCallOrder[0]!);
    // Nenhuma ação nova na matriz.
    expect(mAutorizar.mock.calls.map((c) => c[1])).toEqual(['ler_pacote_decisao', 'ler_demanda']);
  });
});

describe('os três avisos na página (CA-06.1 a CA-06.4)', () => {
  it('(a) no v2 pendente com o v1 em vigor: o Alerta atencao estático, o texto e o link solto para o v1', async () => {
    pacotes(pacote({ nivelAprovacaoRequerido: 'cto_e_administradora' }), v1Aprovado());
    mVigente.mockResolvedValue(vigente());
    const s = await pagina();
    const a = alertaCom(s, AVISO_A);
    expect(a).toBeDefined();
    expect(a).toMatch(/^<div class="[^"]*\bbg-atencao-fundo\b/);
    expect(a).not.toContain('role=');
    expect(a).toContain(
      `<p class="[overflow-wrap:anywhere]">Esta demanda já tem um pacote aprovado em vigor: ${V1}. Quando a aprovação deste pacote ficar completa, ele passa a valer no lugar de ${V1}, e um pedido já gerado de ${V1} deixa de valer.</p>`,
    );
    expect(linkSolto(a!, `Abrir o pacote ${V1}`)).toEqual({ href: `/pacotes-decisao/${V1}`, classe: CLASSE_LINK_SOLTO });
    expect(s).not.toContain(AVISO_C);
    expect(s).not.toContain(AVISO_B);
  });

  it('(a) também com a primeira das duas aprovações registrada', async () => {
    pacotes(pacote({ nivelAprovacaoRequerido: 'cto_e_administradora', aprovadores: [aprovacaoCto] }), v1Aprovado());
    mVigente.mockResolvedValue(vigente());
    expect(await pagina()).toContain(AVISO_A);
  });

  it('(b) no v1 vigente com o v2 de dupla aprovação pendente: o texto e o link para o v2', async () => {
    pacotes(pacote({ nivelAprovacaoRequerido: 'cto_e_administradora' }), v1Aprovado());
    mVigente.mockResolvedValue(vigente());
    const s = await pagina(V1);
    const b = alertaCom(s, AVISO_B);
    expect(b).toBeDefined();
    expect(b).toMatch(/^<div class="[^"]*\bbg-atencao-fundo\b/);
    expect(b).not.toContain('role=');
    expect(b).toContain(
      `<p class="[overflow-wrap:anywhere]">Há um pacote mais novo pendente nesta demanda: ${V2}. Quando a aprovação dele ficar completa, ele passa a valer no lugar deste, e um pedido já gerado deste pacote deixa de valer.</p>`,
    );
    expect(linkSolto(b!, `Abrir o pacote ${V2}`)).toEqual({ href: `/pacotes-decisao/${V2}`, classe: CLASSE_LINK_SOLTO });
    expect(s).not.toContain(AVISO_A);
  });

  it('(c) no v2 cto com o v1 de dupla aprovação em vigor: o texto e "Criar pacote novo"; no v1, nenhum (b)', async () => {
    pacotes(pacote({ nivelAprovacaoRequerido: 'cto' }), v1Aprovado({ nivelAprovacaoRequerido: 'cto_e_administradora' }));
    mVigente.mockResolvedValue(vigente({ nivel: 'cto_e_administradora' }));
    const s = await pagina();
    const c = alertaCom(s, AVISO_C);
    expect(c).toBeDefined();
    expect(c).not.toContain('role=');
    expect(c).toContain(`o pacote em vigor nesta demanda, ${V1}, exigiu a aprovação do CTO e da administradora`);
    expect(linkSolto(c!, 'Criar pacote novo')).toEqual({ href: `/demandas/${DEM}/pacotes-decisao/novo`, classe: CLASSE_LINK_SOLTO });
    expect(s).not.toContain(AVISO_A);
    const v1 = await pagina(V1);
    expect(v1).not.toContain(AVISO_B);
    expect(v1).not.toContain(AVISO_A);
  });

  it('CA-06.4: nenhum aviso sem vigente, no desatualizado, no pendente que não é o mais novo e em status final', async () => {
    const semAviso = async (rotulo: string) => {
      const s = await pagina();
      for (const t of [AVISO_A, AVISO_B, AVISO_C]) expect(s, rotulo).not.toContain(t);
    };
    await semAviso('sem vigente');
    mVigente.mockResolvedValue(vigente());
    pacotes(pacote({ desatualizado: true }), v1Aprovado());
    await semAviso('desatualizado');
    pacotes(pacote(), v1Aprovado());
    mDemanda.mockResolvedValue(demanda({ pacotesDecisao: [resumoDec(`DEC-${DEM}-v3`), resumoDec(V2), resumoDec(V1, { statusDecisao: 'aprovada' })] }));
    await semAviso('não é o mais novo');
    for (const status of ['entregue', 'encerrada'] as const) {
      mDemanda.mockResolvedValue(demanda({ status }));
      await semAviso(status);
    }
  });

  it('o v1 substituído mostra só o aviso do substituído', async () => {
    pacotes(v1Aprovado({ substituido: true, substituidoPor: V2 }));
    mVigente.mockResolvedValue(vigente({ id: V2 }));
    mDemanda.mockResolvedValue(demanda({ status: 'aprovada', pacotesDecisao: [resumoDec(V2, { statusDecisao: 'aprovada' }), resumoDec(V1, { statusDecisao: 'aprovada', substituido: true, substituidoPor: V2 })] }));
    const s = await pagina(V1);
    expect(s).toContain(`Este pacote foi substituído por ${V2}`);
    for (const t of [AVISO_A, AVISO_B, AVISO_C]) expect(s).not.toContain(t);
  });
});

describe('ordem da faixa de alertas (03, 4.2)', () => {
  it('resultado, lembrete, (b), desatualizado, rascunho, quando valem juntos', async () => {
    // O v1 aprovado, vigente e desatualizado (ESP mais nova), com rascunho citado; o v2 pendente cita a ESP nova.
    const ESP2 = `ESP-${DEM}-v2`;
    pacotes(pacote({ especificacaoId: ESP2 }), v1Aprovado({ desatualizado: true, rascunhoAgente: true, rascunhosCitados: [ESP] }));
    mVigente.mockResolvedValue(vigente({ desatualizado: true }));
    mDemanda.mockResolvedValue(demanda({ especificacoes: [resumo(ESP2), resumo(ESP)] }));
    const s = await pagina(V1, { aviso: 'decisao-registrada' });
    const posicoes = [
      s.indexOf('Decisão registrada: Aprovada, opção A.'),
      s.indexOf('A demanda continua em Pronta para decisão'),
      s.indexOf(AVISO_B),
      s.indexOf('Este pacote está desatualizado.'),
      s.indexOf('Este pacote cita conteúdo gerado por agente de IA'),
    ];
    expect(posicoes.every((x) => x > 0)).toBe(true);
    expect([...posicoes].sort((x, y) => x - y)).toEqual(posicoes);
  });

  it('resultado, (a), rascunho; e o (c) no mesmo lugar do (a)', async () => {
    pacotes(pacote({ nivelAprovacaoRequerido: 'cto_e_administradora', rascunhoAgente: true, rascunhosCitados: [ESP] }), v1Aprovado());
    mVigente.mockResolvedValue(vigente());
    const s = await pagina(V2, { aviso: 'pacote-criado' });
    const a = [s.indexOf(`${V2} criado.`), s.indexOf(AVISO_A), s.indexOf('Este pacote cita conteúdo gerado por agente de IA')];
    expect(a.every((x) => x > 0)).toBe(true);
    expect([...a].sort((x, y) => x - y)).toEqual(a);

    pacotes(pacote({ rascunhoAgente: true, rascunhosCitados: [ESP] }), v1Aprovado({ nivelAprovacaoRequerido: 'cto_e_administradora' }));
    mVigente.mockResolvedValue(vigente({ nivel: 'cto_e_administradora' }));
    const c = await pagina(V2, { aviso: 'pacote-criado' });
    const pc = [c.indexOf(`${V2} criado.`), c.indexOf(AVISO_C), c.indexOf('Este pacote cita conteúdo gerado por agente de IA')];
    expect(pc.every((x) => x > 0)).toBe(true);
    expect([...pc].sort((x, y) => x - y)).toEqual(pc);
  });

  it('o aviso vem depois do lembrete e antes do formulário e das seções', async () => {
    pacotes(pacote({ nivelAprovacaoRequerido: 'cto_e_administradora' }), v1Aprovado());
    mVigente.mockResolvedValue(vigente());
    const s = await pagina();
    expect(s.indexOf(AVISO_A)).toBeLessThan(s.search(/<h2/));
    expect(s.indexOf(AVISO_A)).toBeLessThan(s.indexOf('<form'));
  });
});

describe('SB-12 (c): os avisos só informam, os botões e o disabled não mudam', () => {
  it('(a): o v2 com e sem o vigente', async () => {
    pacotes(pacote({ nivelAprovacaoRequerido: 'cto_e_administradora' }), v1Aprovado());
    const sem = await pagina();
    mVigente.mockResolvedValue(vigente());
    const com = await pagina();
    expect(com).toContain(AVISO_A);
    expect(sem).not.toContain(AVISO_A);
    expect(botoes(com).length).toBeGreaterThanOrEqual(3);
    expect(botoes(com)).toEqual(botoes(sem));
  });

  it('(c): o v2 cto com e sem o vigente de dupla aprovação (Aprovar continua ativo)', async () => {
    pacotes(pacote({ nivelAprovacaoRequerido: 'cto' }), v1Aprovado({ nivelAprovacaoRequerido: 'cto_e_administradora' }));
    const sem = await pagina();
    mVigente.mockResolvedValue(vigente({ nivel: 'cto_e_administradora' }));
    const com = await pagina();
    expect(com).toContain(AVISO_C);
    expect(botoes(com)).toEqual(botoes(sem));
    // Só os atributos (a classe tem as variantes disabled: e aria-disabled: do Botao).
    expect(/<button [^>]*id="decisao-aprovar"[^>]*>/.exec(com)![0]).not.toMatch(/\s(?:disabled|aria-disabled)(?:=|\s|>)/);
  });

  it('(b): o v1 com e sem o v2 pendente', async () => {
    pacotes(pacote({ nivelAprovacaoRequerido: 'cto_e_administradora' }), v1Aprovado());
    mVigente.mockResolvedValue(vigente());
    const com = await pagina(V1);
    mDemanda.mockResolvedValue(demanda({ pacotesDecisao: [resumoDec(V1, { statusDecisao: 'aprovada' })] }));
    const sem = await pagina(V1);
    expect(com).toContain(AVISO_B);
    expect(sem).not.toContain(AVISO_B);
    expect(botoes(com)).toEqual(botoes(sem));
  });
});

describe('D-12: o DEC mais novo só é lido quando o aberto é o vigente e o mais novo é outro, pendente e atualizado', () => {
  it('lido: o v1 vigente e o v2 pendente atualizado', async () => {
    mVigente.mockResolvedValue(vigente());
    await pagina(V1);
    expect(mPacote.mock.calls.map((c) => c[1])).toEqual([V1, V2]);
    expect(mVigente.mock.invocationCallOrder[0]!).toBeLessThan(mPacote.mock.invocationCallOrder[1]!);
  });

  it('não lido: aberto não é o vigente, sem vigente, mais novo é o próprio, arquivado, aprovado ou desatualizado', async () => {
    const casos: Array<[string, string, VigenteDaDemanda | null, PacoteResumo[]]> = [
      ['aberto não é o vigente', V2, vigente(), demanda().pacotesDecisao],
      ['sem vigente', V1, null, demanda().pacotesDecisao],
      ['mais novo é o próprio', V1, vigente(), [resumoDec(V1, { statusDecisao: 'aprovada' })]],
      ['mais novo arquivado', V1, vigente(), [resumoDec(V2, { statusDecisao: 'arquivada' }), resumoDec(V1, { statusDecisao: 'aprovada' })]],
      ['mais novo devolvido', V1, vigente(), [resumoDec(V2, { statusDecisao: 'devolvida' }), resumoDec(V1, { statusDecisao: 'aprovada' })]],
      ['mais novo desatualizado', V1, vigente(), [resumoDec(V2, { desatualizado: true }), resumoDec(V1, { statusDecisao: 'aprovada' })]],
    ];
    for (const [rotulo, aberto, v, lista] of casos) {
      mPacote.mockClear();
      mVigente.mockResolvedValue(v);
      mDemanda.mockResolvedValue(demanda({ pacotesDecisao: lista }));
      await pagina(aberto);
      expect(mPacote.mock.calls.map((c) => c[1]), rotulo).toEqual([aberto]);
    }
  });

  it('o mais novo lido que já não está pendente (corrida) não dá aviso', async () => {
    pacotes(pacote({ statusDecisao: 'arquivada', decisao: { opcaoEscolhida: null, comentarios: null, decididaPor: CTO.nome, decididaEm: APROVADO } }), v1Aprovado());
    mVigente.mockResolvedValue(vigente());
    expect(await pagina(V1)).not.toContain(AVISO_B);
  });
});

describe('dica do Arquivar e chegada depois de arquivar (CA-03.6; 03, 4.6 e 4.7; D-10)', () => {
  const dicaNaPagina = (s: string) => /<p id="decisao-consequencia-arquivar" class="text-sm text-tinta-media">([^<]*)<\/p>/.exec(s)?.[1];

  it('a dica é a de dicaDoArquivar para o destino lido, ligada ao botão Arquivar', async () => {
    const casos: Array<[DemandaVista['status'], VigenteDaDemanda | null, string]> = [
      ['pronta_para_decisao', vigente(), `Arquivar: a demanda vai para Aprovada, e ${V1} continua em vigor.`],
      ['pronta_para_decisao', vigente({ desatualizado: true }), `Arquivar: a demanda vai para Em análise, porque ${V1}, o pacote em vigor, está desatualizado.`],
      ['pronta_para_decisao', null, 'Arquivar: a demanda vai para Encerrada.'],
      ['aprovada', vigente(), 'Arquivar: a demanda continua em Aprovada.'],
      ['em_analise', vigente({ desatualizado: true }), 'Arquivar: a demanda continua em Em análise.'],
      ['em_analise', vigente(), `Arquivar: a demanda vai para Aprovada, e ${V1} continua em vigor.`],
    ];
    for (const [status, v, texto] of casos) {
      mVigente.mockResolvedValue(v);
      mDemanda.mockResolvedValue(demanda({ status }));
      const s = await pagina();
      const rotulo = `${status} ${v ? (v.desatualizado ? 'desatualizado' : 'atualizado') : 'sem vigente'}`;
      expect(dicaNaPagina(s), rotulo).toBe(texto);
      expect(dicaNaPagina(s), rotulo).toBe(dicaDoArquivar(destinoDoArquivamento(status, estadoDoVigente(v)), status, v?.id ?? null));
      expect(/<button [^>]*id="decisao-arquivar"[^>]*>/.exec(s)![0], rotulo).toContain('aria-describedby="decisao-consequencia-arquivar"');
    }
  });

  it('a chegada sai do status da demanda lido, com o ?aviso= de hoje', async () => {
    const arquivado = pacote({ statusDecisao: 'arquivada', decisao: { opcaoEscolhida: null, comentarios: null, decididaPor: CTO.nome, decididaEm: APROVADO } });
    pacotes(arquivado, v1Aprovado());
    const casos: Array<[DemandaVista['status'], VigenteDaDemanda | null, string]> = [
      ['aprovada', vigente(), `Pacote arquivado. A demanda está em Aprovada, e ${V1} continua em vigor.`],
      ['em_analise', vigente({ desatualizado: true }), 'Pacote arquivado. A demanda está em Em análise.'],
      ['encerrada', null, 'Pacote arquivado. A demanda foi para Encerrada.'],
    ];
    for (const [status, v, texto] of casos) {
      mVigente.mockResolvedValue(v);
      mDemanda.mockResolvedValue(demanda({ status }));
      const s = await pagina(V2, { aviso: 'decisao-registrada' });
      expect(alertaCom(s, 'Pacote arquivado'), status).toContain(`>${texto}</div>`);
      expect(s, status).toMatch(/role="alert"/);
      // Sem ?aviso=, nada.
      expect(await pagina(V2), status).not.toContain('Pacote arquivado');
    }
  });

  it('a chegada não usa texto da URL', async () => {
    pacotes(pacote({ statusDecisao: 'arquivada', decisao: { opcaoEscolhida: null, comentarios: null, decididaPor: CTO.nome, decididaEm: APROVADO } }), v1Aprovado());
    mVigente.mockResolvedValue(vigente());
    mDemanda.mockResolvedValue(demanda({ status: 'aprovada' }));
    const s = await pagina(V2, { aviso: 'Pacote arquivado. A demanda <b>x</b>' });
    expect(s).not.toContain('Pacote arquivado');
    expect(s).not.toContain('<b>x</b>');
  });
});
