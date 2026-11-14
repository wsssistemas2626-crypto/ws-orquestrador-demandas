// T43: T11 Decisão do pacote (03, T11; 04, C-14; P1-a, P1-b, P1-d), o HTML do servidor da página: a ordem de autorização
// e leitura (C-04, C-17), o cabeçalho, os alertas de topo, a revisão antes de decidir, as opções, as aprovações, quem vê o
// formulário, a decisão registrada, o lembrete e a chegada. Envio, diálogo, foco e axe ficam no e2e (e2e/decisao.spec.ts).
// A sessão e as leituras são dublês; a matriz de acesso é a real. Datas fixas.
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { idDoCampo } from '../../../../components/formulario';
import type { AtorPessoa } from '../../../../modules/acesso/ator';
import { exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../modules/acesso/matriz';
import { obterDemanda, type DemandaVista, type VersaoResumo } from '../../../../modules/demandas/consultas';
import { obterPacoteDecisao, type PacoteDecisaoVista } from '../../../../modules/pacotes-decisao/consultas';
import { recebimentoDoPedido } from '../../../../modules/pedido-construcao/pendentes';
import PaginaDecisao, { generateMetadata } from './page';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/pacotes-decisao/DEC-DEM-20261022-0042-v1',
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
vi.mock('./acoes', () => ({ registrarDecisaoNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));
vi.mock('./acoes-pedido', () => ({ gerarPedidoNoPainel: async () => ({ ok: false, erro: 'erro_interno', mensagem: '' }) }));
// T19 do DEC-DEM-20261111-0016-v1: a leitura do recebimento (T10) é dublê; sem pedido_recebido por padrão.
vi.mock('../../../../modules/pedido-construcao/pendentes', () => ({ recebimentoDoPedido: vi.fn() }));
// T12 do DEC-DEM-20261111-0018-v1 (ADR-40): a leitura do vigente é dublê; sem vigente por padrão (os avisos e a dica pelo
// destino ficam em pagina-vigencia.test.ts).
vi.mock('../../../../modules/pacotes-decisao/substituido', async (original) => {
  const real = await original<typeof import('../../../../modules/pacotes-decisao/substituido')>();
  return { ...real, vigenteDaDemanda: vi.fn(async () => null) };
});

const mExigir = vi.mocked(exigirPessoaNaPagina);
const mAutorizar = vi.mocked(autorizar);
const mDemanda = vi.mocked(obterDemanda);
const mPacote = vi.mocked(obterPacoteDecisao);
const mRecebimento = vi.mocked(recebimentoDoPedido);

const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const ADM: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-adm', nome: 'Pessoa Ficticia Administradora', papel: 'administradora' };
const ID = 'DEM-20261022-0042';
const DEC = `DEC-${ID}-v1`;
const ESP = `ESP-${ID}-v2`;
const RSK = `RSK-${ID}-v1`;
const DB = { dubleDoBanco: true };
const CRIADO = new Date('2026-10-22T17:05:00Z');
const APROVADO = new Date('2026-10-22T18:00:00Z');

const resumo = (id: string): VersaoResumo => ({ id, versao: Number(/-v(\d+)$/.exec(id)![1]), criadaEm: CRIADO, autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' }, rascunhoAgente: false });

function demanda(extra: Partial<DemandaVista> = {}): DemandaVista {
  return {
    id: ID,
    titulo: 'Título atual da demanda (fictício)',
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
    pacotesDecisao: [],
    agentesEmAndamento: [],
    andamento: null,
    ...extra,
  };
}

function pacote(extra: Partial<PacoteDecisaoVista> = {}): PacoteDecisaoVista {
  return {
    id: DEC,
    demandaId: ID,
    versao: 1,
    especificacaoId: ESP,
    parecerRiscoId: RSK,
    demandaTipo: 'melhoria',
    demandaTitulo: 'Pedidos duplicados no ERP (fictício)',
    demandaDescricao: 'Problema: fictício',
    resumoExecutivo: 'Resumo executivo fictício.',
    opcaoA: { descricao: 'Construir tudo (fictício)', vantagens: 'Resolve a causa (fictício)' },
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
    niveisRisco: { tecnico: 'alto', operacional: 'medio', juridico: 'baixo' },
    ...extra,
  };
}

async function pagina(decId = DEC, busca: Record<string, string | string[] | undefined> = {}): Promise<string> {
  return renderToStaticMarkup(await PaginaDecisao({ params: Promise.resolve({ decId }), searchParams: Promise.resolve(busca) }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mExigir.mockResolvedValue(CTO);
  mPacote.mockResolvedValue(pacote());
  mDemanda.mockResolvedValue(demanda());
  mRecebimento.mockResolvedValue(null);
});

describe('T11: acesso e leitura', () => {
  it('pessoa (C-04) → ler_pacote_decisao → o pacote → ler_demanda → a demanda dele', async () => {
    await pagina();
    expect(mExigir).toHaveBeenCalledWith(`/pacotes-decisao/${DEC}`);
    expect(mAutorizar.mock.calls.map((c) => c[1])).toEqual(['ler_pacote_decisao', 'ler_demanda']);
    expect(mPacote).toHaveBeenCalledWith(DB, DEC);
    expect(mDemanda).toHaveBeenCalledWith(DB, ID);
    expect(mAutorizar.mock.invocationCallOrder[0]!).toBeLessThan(mPacote.mock.invocationCallOrder[0]!);
    expect(mAutorizar.mock.invocationCallOrder[1]!).toBeLessThan(mDemanda.mock.invocationCallOrder[0]!);
  });

  it('C-17: id fora do formato, de ESP ou de RSK dá 404 sem tocar o banco', async () => {
    for (const id of ['qualquer-coisa', ESP, RSK, ID]) {
      await expect(pagina(id)).rejects.toThrow('NEXT_NOT_FOUND');
      expect(mExigir).toHaveBeenLastCalledWith('/demandas');
    }
    expect(mPacote).not.toHaveBeenCalled();
  });

  it('pacote que não existe: 404; outra falha sobe para a tela de erro', async () => {
    const { ErroDominio } = await import('../../../../lib/erros');
    mPacote.mockRejectedValue(new ErroDominio('nao_encontrado', 'x'));
    await expect(pagina()).rejects.toThrow('NEXT_NOT_FOUND');
    mPacote.mockRejectedValue(new Error('falha fictícia'));
    await expect(pagina()).rejects.toThrow('falha fictícia');
  });

  it('título da aba: o da tela', async () => {
    const { exigirPessoa } = await import('../../../../modules/acesso/exigir-pessoa');
    vi.mocked(exigirPessoa).mockResolvedValue(CTO);
    await expect(generateMetadata({ params: Promise.resolve({ decId: DEC }) })).resolves.toEqual({ title: 'Decisão do pacote' });
  });
});

// 0.1.13 (DEC-DEM-20261104-0014-v1, S5): o DEC aprovado que um aprovado mais novo substituiu. O axe desta tela fica no
// e2e da 04-regressao.
describe('T11: DEC substituído (0.1.13)', () => {
  const V2 = `DEC-${ID}-v2`;
  const aprovado = (extra: Partial<PacoteDecisaoVista> = {}) =>
    pacote({
      statusDecisao: 'aprovada',
      aprovadores: [{ papel: 'cto', nome: CTO.nome, opcao: 'A', registradaEm: APROVADO, referenciaDocumento: null, dataDocumento: null }],
      decisao: { opcaoEscolhida: 'A', comentarios: null, decididaPor: CTO.nome, decididaEm: APROVADO },
      ...extra,
    });

  it('selo "Substituído", o aviso com o link para o substituto, sem a seção do Pedido de Construção e sem o lembrete de P1-d', async () => {
    mPacote.mockResolvedValue(aprovado({ substituido: true, substituidoPor: V2 }));
    const s = await pagina();
    expect(s).toContain('>Substituído</span>');
    expect(s).toContain(
      `Este pacote foi substituído por ${V2}, aprovado depois dele, e não gera mais o Pedido de Construção. Se um pedido deste pacote já foi gerado, não o use. O pedido que vale é o de ${V2}.`,
    );
    expect(s).toMatch(new RegExp(`<a [^>]*href="/pacotes-decisao/${V2}"[^>]*>Abrir o pacote ${V2}</a>`));
    expect(s).not.toMatch(/<h2[^>]*>Pedido de Construção<\/h2>/);
    expect(s).not.toContain('Gerar Pedido de Construção');
    expect(s).not.toContain('A demanda continua em Pronta para decisão');
    // O aviso vem antes do alerta de desatualizado, e os dois aparecem quando os dois valem.
    mPacote.mockResolvedValue(aprovado({ substituido: true, substituidoPor: V2, desatualizado: true }));
    const ambos = await pagina();
    expect(ambos.indexOf(`Abrir o pacote ${V2}`)).toBeGreaterThan(0);
    expect(ambos.indexOf(`Abrir o pacote ${V2}`)).toBeLessThan(ambos.indexOf('Este pacote está desatualizado'));
  });

  it('controle: o aprovado mais novo não tem selo nem aviso, e mostra a seção do pedido e o lembrete', async () => {
    mPacote.mockResolvedValue(aprovado());
    const s = await pagina();
    expect(s).not.toContain('Substituído');
    expect(s).not.toContain('Abrir o pacote DEC-');
    expect(s).toMatch(/<h2[^>]*>Pedido de Construção<\/h2>/);
    expect(s).toContain('A demanda continua em Pronta para decisão');
  });
});

describe('T11: cabeçalho, revisão e conteúdo', () => {
  it('id, selo da decisão, h1 com o título copiado no pacote, linha da demanda e as versões citadas', async () => {
    const s = await pagina();
    expect(s).toContain(`<span class="font-mono">${DEC}</span>`);
    expect(s).toContain('>Decisão pendente</span>');
    // 0.2.0 (T13, CV-18): o título copiado fica isolado por <bdi>; o texto do h1 é o mesmo.
    expect(s).toContain('<h1 class="break-words">Decisão: <bdi>Pedidos duplicados no ERP (fictício)</bdi></h1>');
    expect(s).not.toContain('Título atual da demanda');
    expect(s).toMatch(/Demanda <a [^>]*href="\/demandas\/DEM-20261022-0042"[^>]*>DEM-20261022-0042<\/a> · Nível de aprovação: Só o CTO · Criado em <time[^>]*>22\/10\/2026 às 14:05<\/time> por Pessoa Ficticia CTO/);
    expect(s).toContain(`href="/especificacoes/${ESP}"`);
    expect(s).toContain(`href="/pareceres-risco/${RSK}"`);
    expect(s).not.toContain('desatualizado');
    expect(s).not.toContain('Rascunho de agente');
  });

  it('C-14: a revisão antes de decidir vem antes do formulário, com repositório, critérios, níveis em texto e o nível', async () => {
    const s = await pagina();
    const revisao = s.indexOf('Revisão antes de decidir');
    expect(revisao).toBeGreaterThan(0);
    expect(revisao).toBeLessThan(s.indexOf('<form'));
    for (const t of [
      'wsssistemas2626-crypto/sistema-ficticio',
      'sistema-ficticio',
      'Critério (fictício)',
      'Pronto (fictício)',
      'Risco técnico: Alto',
      'Risco operacional: Médio',
      'Risco jurídico: Baixo',
      'Nível de aprovação: Só o CTO',
    ])
      expect(s.slice(revisao, s.indexOf('<form'))).toContain(t);
  });

  it('opções com os subtítulos e "Não informado."; recomendação de pessoa e de agente', async () => {
    let s = await pagina();
    for (const h of ['Resumo executivo', 'Opções', 'Recomendação']) expect(s).toMatch(new RegExp(`<h2[^>]*>${h}</h2>`));
    for (const h of ['Opção A', 'Opção B']) expect(s).toMatch(new RegExp(`<h3[^>]*>${h}</h3>`));
    for (const dt of ['Descrição', 'Vantagens', 'Desvantagens', 'Quando escolher']) expect(s.match(new RegExp(`<dt[^>]*>${dt}</dt>`, 'g'))).toHaveLength(2);
    expect(s).toContain('Não informado.');
    mPacote.mockResolvedValue(pacote({ rascunhoAgente: true, recomendacao: 'Opção B (fictício)', rascunhosCitados: [DEC] }));
    s = await pagina();
    expect(s).toMatch(/<h2[^>]*>Recomendação do agente de consolidação<\/h2>/);
    expect(s).toContain('Opção B (fictício)');
  });

  it('rascunho citado: selo, alerta com os ids e a caixa "Revisei…" no formulário', async () => {
    mPacote.mockResolvedValue(pacote({ rascunhoAgente: true, rascunhosCitados: [DEC, ESP, RSK] }));
    const s = await pagina();
    expect(s).toContain('Rascunho de agente');
    expect(s).toContain(`Este pacote cita conteúdo gerado por agente de IA: ${DEC}, ${ESP} e ${RSK}. Leia cada um antes de decidir.`);
    expect(s).toContain('Revisei os rascunhos de agente citados neste pacote (obrigatório)');
  });

  it('desatualizado: selo, alerta com a versão mais nova e o link, e Aprovar indisponível e explicado (CA-12.4)', async () => {
    mPacote.mockResolvedValue(pacote({ desatualizado: true }));
    mDemanda.mockResolvedValue(demanda({ especificacoes: [resumo(`ESP-${ID}-v3`), resumo(ESP)] }));
    const s = await pagina();
    expect(s).toContain('>Desatualizado</span>');
    expect(s).toContain(`Este pacote está desatualizado. A demanda já tem ESP-${ID}-v3, mais nova que a citada aqui.`);
    expect(s).toContain(`href="/demandas/${ID}/pacotes-decisao/novo"`);
    // 0.2.0 (T12): "Aprovar" é o botão principal, e não mais o rádio; continua indisponível e explicado (CA-11.3).
    const aprovar = /<button [^>]*id="decisao-aprovar"[^>]*>[^<]*<\/button>/.exec(s)![0];
    expect(aprovar).toContain('aria-disabled="true"');
    expect(aprovar).toContain('aria-describedby="decisao-aprovar-indisponivel"');
    expect(aprovar).not.toMatch(/\sdisabled=/);
    expect(aprovar).toMatch(/>Aprovar<\/button>$/);
    expect(s).toMatch(/<p id="decisao-aprovar-indisponivel"[^>]*>Indisponível: pacote desatualizado\.<\/p>/);
    // Com o pacote desatualizado, as opções e o documento, que só servem para aprovar, não aparecem (03, 6.4).
    expect(s).not.toContain(`id="${idDoCampo('opcaoEscolhida')}-A"`);
    // Devolver e Arquivar continuam disponíveis.
    for (const id of ['decisao-devolver', 'decisao-arquivar']) expect(new RegExp(`<button [^>]*id="${id}"[^>]*>`).exec(s)![0], id).not.toMatch(/\saria-disabled=/);
  });

  it('C-18: título copiado e opções como texto', async () => {
    mPacote.mockResolvedValue(pacote({ demandaTitulo: '<script>window.__x=1</script>', opcaoA: { descricao: '<img src=x onerror="window.__x=2">' } }));
    const s = await pagina();
    expect(s).not.toContain('<script>');
    expect(s).not.toContain('<img');
  });
});

describe('T11: quem vê o formulário (P1-a, P1-b)', () => {
  it('nível cto, conta cto: o formulário sem documento; as opções e os três botões', async () => {
    const s = await pagina();
    expect(s).toMatch(/<h2[^>]*>Registrar decisão<\/h2>/);
    // 0.2.0 (T12, RF-11): o grupo "Decisão" deu lugar aos três botões de envio, no fim do formulário, nesta ordem; o
    // principal é o primeiro submit (o Enter num campo envia por ele).
    expect(s).not.toContain('>Decisão (obrigatório)</legend>');
    const form = s.slice(s.indexOf('<form'), s.indexOf('</form>'));
    const atributo = (tag: string, nome: string) => new RegExp(`\\s${nome}="([^"]*)"`).exec(tag)?.[1];
    expect(
      [...form.matchAll(/(<button type="submit"[^>]*>)([^<]+)<\/button>/g)].map(([, tag, texto]) => [atributo(tag!, 'id'), atributo(tag!, 'name'), atributo(tag!, 'value'), texto]),
    ).toEqual([
      ['decisao-aprovar', 'acao', 'aprovada', 'Aprovar'],
      ['decisao-devolver', 'acao', 'devolvida', 'Devolver'],
      ['decisao-arquivar', 'acao', 'arquivada', 'Arquivar'],
    ]);
    expect(form.match(/<button type="submit"/g)).toHaveLength(3);
    expect(form).toMatch(/<div id="rodape-da-decisao" role="group" aria-label="Ações da decisão"[^>]*>/);
    // A consequência de cada ação em texto visível, ligada ao botão (aria-describedby), acima do grupo.
    expect(s).toContain('<p id="decisao-consequencia-devolver" class="text-sm text-tinta-media">Devolver: a demanda volta para Em análise.</p>');
    expect(s).toContain('<p id="decisao-consequencia-arquivar" class="text-sm text-tinta-media">Arquivar: a demanda vai para Encerrada.</p>');
    expect(/<button [^>]*id="decisao-devolver"[^>]*>/.exec(s)![0]).toContain('aria-describedby="decisao-consequencia-devolver"');
    expect(/<button [^>]*id="decisao-arquivar"[^>]*>/.exec(s)![0]).toContain('aria-describedby="decisao-consequencia-arquivar"');
    expect(form.indexOf('decisao-consequencia-arquivar')).toBeLessThan(form.indexOf('id="rodape-da-decisao"'));
    expect(s).toContain('class="font-medium">Comentários (opcional)</label>');
    expect(s).not.toContain('Identificador do documento assinado');
    expect(s).not.toContain('Revisei os rascunhos');
    expect(s).not.toMatch(/<button[^>]*>Registrar decisão<\/button>/);
    // As opções aparecem desde o início (03, 6.4), e nenhuma vem marcada (CV-13, P-01).
    expect(s).toContain('>Opção escolhida (obrigatório)</legend>');
    expect(s).toContain(`id="${idDoCampo('opcaoEscolhida')}-A"`);
    expect(s).toContain(`id="${idDoCampo('opcaoEscolhida')}-B"`);
    expect(s).not.toMatch(/<input type="radio"[^>]*checked/);
    expect(s).not.toContain('Recomendada');
    expect(s).not.toContain('Aprovações');
  });

  it('CV-15: o formulário não tem action nem method; identificador, data, comentários e revisão não têm name', async () => {
    mPacote.mockResolvedValue(pacote({ nivelAprovacaoRequerido: 'cto_e_administradora', rascunhoAgente: true, rascunhosCitados: [DEC] }));
    mExigir.mockResolvedValue(ADM);
    const s = await pagina();
    const abertura = /<form[^>]*>/.exec(s)![0];
    expect(abertura).not.toMatch(/\saction=|\smethod=/);
    for (const campo of ['referenciaDocumento', 'dataDocumento', 'comentarios', 'revisouRascunhosDeAgente']) {
      const el = new RegExp(`<(?:input|textarea)[^>]*\\sid="${idDoCampo(campo)}"[^>]*>`).exec(s)![0];
      expect(el, campo).not.toMatch(/\sname=/);
    }
    // name só nos rádios de opção e nos três botões, com valores de enumeração.
    const nomes = [...s.slice(s.indexOf('<form'), s.indexOf('</form>')).matchAll(/\sname="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(nomes)).toEqual(new Set([idDoCampo('opcaoEscolhida'), 'acao']));
  });

  it('administradora sem aprovação: documento visível desde o início, "obrigatório para aprovar", sem aria-required; revisão com aria-required', async () => {
    mPacote.mockResolvedValue(pacote({ nivelAprovacaoRequerido: 'cto_e_administradora', rascunhoAgente: true, rascunhosCitados: [DEC] }));
    mExigir.mockResolvedValue(ADM);
    const s = await pagina();
    expect(s).toContain('>Identificador do documento assinado (obrigatório para aprovar)</label>');
    expect(s).toContain('>Data da assinatura (obrigatório para aprovar)</label>');
    for (const campo of ['referenciaDocumento', 'dataDocumento'])
      expect(new RegExp(`<input[^>]*\\sid="${idDoCampo(campo)}"[^>]*>`).exec(s)![0], campo).not.toContain('aria-required');
    expect(new RegExp(`<input[^>]*\\sid="${idDoCampo('revisouRascunhosDeAgente')}"[^>]*>`).exec(s)![0]).toContain('aria-required="true"');
    expect(/<button [^>]*id="decisao-aprovar"[^>]*>[^<]*<\/button>/.exec(s)![0]).toMatch(/>Aprovar<\/button>$/);
  });

  it('P1-b: nível cto, conta administradora: só "Este pacote exige só a aprovação do CTO." e nenhum formulário', async () => {
    mExigir.mockResolvedValue(ADM);
    const s = await pagina();
    expect(s).toContain('Este pacote exige só a aprovação do CTO.');
    expect(s).not.toContain('<form');
  });

  it('dupla aprovação, depois do CTO: aprovações, opção fixada e documento para a administradora; aviso para o CTO', async () => {
    const aprovacao = { papel: 'cto' as const, nome: 'Pessoa Ficticia CTO', opcao: 'A' as const, registradaEm: APROVADO, referenciaDocumento: null, dataDocumento: null };
    mPacote.mockResolvedValue(pacote({ nivelAprovacaoRequerido: 'cto_e_administradora', aprovadores: [aprovacao] }));
    mExigir.mockResolvedValue(ADM);
    let s = await pagina();
    expect(s).toMatch(/<h2[^>]*>Aprovações<\/h2>/);
    expect(s).toContain('CTO: Pessoa Ficticia CTO aprovou a opção A em');
    expect(s).toContain('Administradora: pendente.');
    expect(s).toContain('O sistema guarda a referência ao documento assinado; ela não substitui a assinatura.');
    expect(s).toContain('<form');
    expect(s).not.toContain(`id="${idDoCampo('opcaoEscolhida')}-A"`);
    // 0.2.0 (T12): a frase da opção fixada aparece desde o início, e o principal já diz a opção.
    expect(s).toContain('O CTO aprovou a opção A. A sua aprovação vale para a mesma opção. Para discordar, escolha devolver ou arquivar.');
    expect(/<button [^>]*id="decisao-aprovar"[^>]*>[^<]*<\/button>/.exec(s)![0]).toMatch(/>Aprovar a opção A<\/button>$/);
    expect(s).toContain('>Identificador do documento assinado (obrigatório para aprovar)</label>');
    mExigir.mockResolvedValue(CTO);
    s = await pagina();
    expect(s).toContain('Sua aprovação está registrada. Falta a aprovação da administradora, com a referência ao documento assinado. O pacote só vale depois dela.');
    expect(s).not.toContain('<form');
  });

  it('já decidido: a decisão com os comentários, sem formulário; aprovado com a demanda em Pronta para decisão: o lembrete (P1-d)', async () => {
    mPacote.mockResolvedValue(
      pacote({
        statusDecisao: 'aprovada',
        decisao: { opcaoEscolhida: 'A', comentarios: 'Comentário fictício.', decididaPor: 'Pessoa Ficticia CTO', decididaEm: APROVADO },
        aprovadores: [{ papel: 'cto', nome: 'Pessoa Ficticia CTO', opcao: 'A', registradaEm: APROVADO, referenciaDocumento: null, dataDocumento: null }],
      }),
    );
    let s = await pagina();
    expect(s).toContain('>Aprovada</span>');
    expect(s).toContain('Decisão registrada: Aprovada, opção A, por Pessoa Ficticia CTO em 22/10/2026 às 15:00.');
    expect(s).toContain('Comentário fictício.');
    expect(s).not.toContain('<form');
    expect(s).toContain('A demanda continua em Pronta para decisão até alguém mudar o status para Aprovada no detalhe da demanda.');
    expect(s).toMatch(new RegExp(`href="/demandas/${ID}"[^>]*>Ir para a demanda</a>`));
    mDemanda.mockResolvedValue(demanda({ status: 'aprovada' }));
    s = await pagina();
    expect(s).not.toContain('A demanda continua em Pronta para decisão');
  });

  // 06-T43-testes (qa-automacao).
  it('P1-d (qa-automacao): o lembrete só aparece com o pacote aprovado; aprovação parcial, devolvido ou arquivado, não', async () => {
    const aprovacaoCto = { papel: 'cto' as const, nome: 'Pessoa Ficticia CTO', opcao: 'A' as const, registradaEm: APROVADO, referenciaDocumento: null, dataDocumento: null };
    const decidida = (statusDecisao: 'devolvida' | 'arquivada') =>
      pacote({ statusDecisao, decisao: { opcaoEscolhida: null, comentarios: null, decididaPor: 'Pessoa Ficticia CTO', decididaEm: APROVADO } });
    for (const p of [pacote({ nivelAprovacaoRequerido: 'cto_e_administradora', aprovadores: [aprovacaoCto] }), decidida('devolvida'), decidida('arquivada')]) {
      mPacote.mockResolvedValue(p);
      const s = await pagina();
      expect(s, p.statusDecisao).not.toContain('A demanda continua em Pronta para decisão');
      expect(s, p.statusDecisao).not.toContain('>Ir para a demanda</a>');
    }
  });

  it('decidido (qa-automacao): pacote devolvido não mostra formulário nem a opção, e o selo diz o resultado', async () => {
    mPacote.mockResolvedValue(pacote({ statusDecisao: 'devolvida', decisao: { opcaoEscolhida: null, comentarios: null, decididaPor: 'Pessoa Ficticia CTO', decididaEm: APROVADO } }));
    for (const conta of [CTO, ADM]) {
      mExigir.mockResolvedValue(conta);
      const s = await pagina();
      expect(s, conta.papel).not.toContain('<form');
      expect(s, conta.papel).toContain('>Devolvida para nova análise</span>');
      expect(s, conta.papel).not.toContain('>Decisão pendente</span>');
      expect(s, conta.papel).toContain('Decisão registrada: Devolvida, por Pessoa Ficticia CTO em 22/10/2026 às 15:00.');
      expect(s, conta.papel).not.toContain('Comentários</dt>');
    }
  });

  it('chegada: só valores fixos de ?aviso=, com o texto tirado do pacote', async () => {
    let s = await pagina(DEC, { aviso: 'pacote-criado' });
    expect(s).toContain(`${DEC} criado. A demanda está pronta para decisão e o aviso por e-mail entrou na fila de envio.`);
    expect(s).toMatch(/role="alert"/);
    s = await pagina(DEC, { aviso: '<b>x</b>' });
    expect(s).not.toContain('criado.');
    expect(s).not.toContain('<b>x</b>');
  });
});

// 06-T12-testes (qa-automacao), DEC-DEM-20261110-0015-v1: com os três botões, cada conta que decide, em cada estado do
// pacote (com e sem rascunho citado, atual e desatualizado), ainda vê todas as exigências de hoje, e nenhuma opção vem
// marcada (P-01, CV-13).
describe('T11 com três botões: as exigências de hoje em cada conta e estado (06-T12-testes, qa-automacao)', () => {
  type Caso = {
    nome: string;
    conta: AtorPessoa;
    nivel: PacoteDecisaoVista['nivelAprovacaoRequerido'];
    aprovadores: PacoteDecisaoVista['aprovadores'];
    fixada: string | null;
    documento: boolean;
  };
  const aprovacao = (papel: 'cto' | 'administradora', opcao: 'A' | 'B'): PacoteDecisaoVista['aprovadores'][number] => ({
    papel,
    nome: papel === 'cto' ? CTO.nome : ADM.nome,
    opcao,
    registradaEm: APROVADO,
    referenciaDocumento: papel === 'cto' ? null : 'DOC-FICTICIO-1',
    dataDocumento: papel === 'cto' ? null : '2026-10-23',
  });
  const CASOS: readonly Caso[] = [
    { nome: 'nível cto, conta cto', conta: CTO, nivel: 'cto', aprovadores: [], fixada: null, documento: false },
    { nome: 'dupla, o CTO aprova primeiro', conta: CTO, nivel: 'cto_e_administradora', aprovadores: [], fixada: null, documento: false },
    { nome: 'dupla, a administradora aprova primeiro', conta: ADM, nivel: 'cto_e_administradora', aprovadores: [], fixada: null, documento: true },
    {
      nome: 'dupla, a administradora depois do CTO na B',
      conta: ADM,
      nivel: 'cto_e_administradora',
      aprovadores: [aprovacao('cto', 'B')],
      fixada: 'O CTO aprovou a opção B. A sua aprovação vale para a mesma opção. Para discordar, escolha devolver ou arquivar.',
      documento: true,
    },
    {
      nome: 'dupla, o CTO depois da administradora na A',
      conta: CTO,
      nivel: 'cto_e_administradora',
      aprovadores: [aprovacao('administradora', 'A')],
      fixada: 'A administradora aprovou a opção A. A sua aprovação vale para a mesma opção. Para discordar, escolha devolver ou arquivar.',
      documento: false,
    },
  ];
  const tag = (s: string, re: RegExp) => re.exec(s)?.[0];
  const campo = (s: string, nome: string) => tag(s, new RegExp(`<input[^>]*\\sid="${idDoCampo(nome)}"[^>]*>`));
  const MARCADO = /\schecked(?=[\s=/>])/;
  const DESABILITADO = /\sdisabled(?=[\s=/>])/;

  it.each(CASOS)('$nome: revisão, recomendação, opções sem marca, documento, caixa de revisão e os três botões', async (caso) => {
    mExigir.mockResolvedValue(caso.conta);
    for (const rascunho of [false, true])
      for (const desatualizado of [false, true]) {
        const r = `${caso.nome}, rascunho ${rascunho}, desatualizado ${desatualizado}`;
        mPacote.mockResolvedValue(
          pacote({
            nivelAprovacaoRequerido: caso.nivel,
            aprovadores: caso.aprovadores,
            desatualizado,
            rascunhoAgente: rascunho,
            rascunhosCitados: rascunho ? [DEC] : [],
            recomendacao: 'Opção B, pela entrega menor (fictício).',
          }),
        );
        mDemanda.mockResolvedValue(desatualizado ? demanda({ especificacoes: [resumo(`ESP-${ID}-v3`), resumo(ESP)] }) : demanda());
        const s = await pagina();
        const inicio = s.indexOf('<form');
        expect(inicio, r).toBeGreaterThan(0);
        const form = s.slice(inicio, s.indexOf('</form>'));
        const antes = s.slice(0, inicio);

        // C-14 e P-01: a revisão, o repositório, o nível e a recomendação em texto vêm antes do formulário.
        const nivel = caso.nivel === 'cto' ? 'Só o CTO' : 'CTO e administradora';
        for (const t of ['Revisão antes de decidir', 'wsssistemas2626-crypto/sistema-ficticio', `Nível de aprovação: ${nivel}`, 'Opção B, pela entrega menor (fictício).'])
          expect(antes, `${r}: ${t}`).toContain(t);
        expect(antes, r).toMatch(rascunho ? /<h2[^>]*>Recomendação do agente de consolidação<\/h2>/ : /<h2[^>]*>Recomendação<\/h2>/);
        expect(s, r).not.toContain('Recomendada');
        if (caso.nivel !== 'cto') expect(antes, r).toMatch(/<h2[^>]*>Aprovações<\/h2>/);
        // Os alertas de hoje continuam no topo.
        expect(antes.includes('Este pacote cita conteúdo gerado por agente de IA'), r).toBe(rascunho);
        expect(antes.includes('Este pacote está desatualizado.'), r).toBe(desatualizado);

        // As opções: nenhuma marcada; a frase da fixada no lugar delas; nada para escolher com o pacote desatualizado.
        const radios = [...form.matchAll(/<input[^>]*type="radio"[^>]*>/g)].map((m) => m[0]);
        for (const radio of radios) expect(radio, r).not.toMatch(MARCADO);
        if (desatualizado || caso.fixada) expect(radios, r).toEqual([]);
        else expect(radios.map((x) => /\sid="([^"]+)"/.exec(x)![1]), r).toEqual([`${idDoCampo('opcaoEscolhida')}-A`, `${idDoCampo('opcaoEscolhida')}-B`]);
        if (caso.fixada && !desatualizado) expect(form, r).toContain(caso.fixada);

        // O documento assinado: só na conta da administradora, com o rótulo de obrigatório para aprovar.
        const comDocumento = caso.documento && !desatualizado;
        for (const [nome, rotulo] of [
          ['referenciaDocumento', 'Identificador do documento assinado (obrigatório para aprovar)'],
          ['dataDocumento', 'Data da assinatura (obrigatório para aprovar)'],
        ] as const) {
          expect(campo(form, nome) !== undefined, `${r}: ${nome}`).toBe(comDocumento);
          expect(form.includes(`>${rotulo}</label>`), `${r}: ${rotulo}`).toBe(comDocumento);
        }

        // A caixa de revisão: sempre que o pacote cita rascunho, obrigatória (aria-required) e desmarcada.
        const caixa = campo(form, 'revisouRascunhosDeAgente');
        expect(caixa !== undefined, r).toBe(rascunho);
        if (caixa) {
          expect(caixa, r).toContain('type="checkbox"');
          expect(caixa, r).toContain('aria-required="true"');
          expect(caixa, r).not.toMatch(MARCADO);
          expect(form, r).toContain('>Revisei os rascunhos de agente citados neste pacote (obrigatório)</label>');
        }
        expect(form, r).toContain('>Comentários (opcional)</label>');

        // Os três botões, nesta ordem, nenhum com `disabled` em repouso; "Aprovar" indisponível só no desatualizado.
        const botoes = [...form.matchAll(/(<button type="submit"[^>]*>)([^<]*)<\/button>/g)].map(([, abertura, texto]) => ({
          id: /\sid="([^"]+)"/.exec(abertura!)?.[1],
          texto,
          abertura: abertura!,
        }));
        const principal = desatualizado ? 'Aprovar' : caso.fixada ? `Aprovar a opção ${caso.fixada.includes('opção B') ? 'B' : 'A'}` : 'Aprovar';
        expect(
          botoes.map((b) => [b.id, b.texto]),
          r,
        ).toEqual([
          ['decisao-aprovar', principal],
          ['decisao-devolver', 'Devolver'],
          ['decisao-arquivar', 'Arquivar'],
        ]);
        for (const b of botoes) expect(b.abertura, `${r}: ${b.id}`).not.toMatch(DESABILITADO);
        expect(/\saria-disabled="true"/.test(botoes[0]!.abertura), r).toBe(desatualizado);
        // O atributo, e não a variante `aria-disabled:` das classes do Botao.
        for (const b of botoes.slice(1)) expect(b.abertura, `${r}: ${b.id}`).not.toMatch(/\saria-disabled=/);
        expect(botoes[1]!.abertura, r).toContain('aria-describedby="decisao-consequencia-devolver"');
        expect(botoes[2]!.abertura, r).toContain('aria-describedby="decisao-consequencia-arquivar"');
        expect(form.includes('>Indisponível: pacote desatualizado.</p>'), r).toBe(desatualizado);
      }
  });
});

// T44: a seção "Pedido de Construção" (03, T11; RF-22; 04, C-16 e C-28). Gerar, baixar e copiar ficam no e2e
// (e2e/pedido-construcao.spec.ts); aqui, quando a seção aparece e o que ela traz antes de gerar.
describe('T11: Pedido de Construção (T44)', () => {
  const aprovacaoCto = { papel: 'cto' as const, nome: 'Pessoa Ficticia CTO', opcao: 'A' as const, registradaEm: APROVADO, referenciaDocumento: null, dataDocumento: null };
  const aprovado = (extra: Partial<PacoteDecisaoVista> = {}) =>
    pacote({
      statusDecisao: 'aprovada',
      decisao: { opcaoEscolhida: 'A', comentarios: null, decididaPor: 'Pessoa Ficticia CTO', decididaEm: APROVADO },
      aprovadores: [aprovacaoCto],
      ...extra,
    });
  const TITULO_DA_SECAO = /<h2 id="pedido-construcao"[^>]*>Pedido de Construção<\/h2>/;

  it('pendente, aprovação parcial, devolvido e arquivado: sem a seção', async () => {
    const decidida = (statusDecisao: 'devolvida' | 'arquivada') =>
      pacote({ statusDecisao, decisao: { opcaoEscolhida: null, comentarios: null, decididaPor: 'Pessoa Ficticia CTO', decididaEm: APROVADO } });
    for (const p of [pacote(), pacote({ nivelAprovacaoRequerido: 'cto_e_administradora', aprovadores: [aprovacaoCto] }), decidida('devolvida'), decidida('arquivada')]) {
      mPacote.mockResolvedValue(p);
      const s = await pagina();
      expect(s, p.statusDecisao).not.toMatch(TITULO_DA_SECAO);
      expect(s, p.statusDecisao).not.toContain('Gerar Pedido de Construção');
      expect(s, p.statusDecisao).not.toContain('Demanda do tipo Estudo');
    }
  });

  it('aprovado: a seção vem depois de "Registrar decisão", com o texto da 03, o aviso de C-28, a caixa de confirmação e o botão; nada gerado ainda', async () => {
    mPacote.mockResolvedValue(aprovado());
    const s = await pagina();
    expect(s).toMatch(/<section aria-labelledby="pedido-construcao"[^>]*><h2 id="pedido-construcao"[^>]*>Pedido de Construção<\/h2>/);
    expect(s.search(TITULO_DA_SECAO)).toBeGreaterThan(s.search(/<h2[^>]*>Registrar decisão<\/h2>/));
    const secao = s.slice(s.search(TITULO_DA_SECAO));
    // 0.3.0 (T19, CA-16.3): o texto da 03, 6.2, que não diz mais que o envio é só manual.
    expect(secao).toContain(
      'Gere o pedido. Com a busca automática do /construir ligada, ele pega o pedido gerado na busca seguinte (a cada 5 minutos), e o recebimento aparece no topo desta página. Com a busca desligada, baixe ou copie o JSON e grave-o na pasta pedidos/ da estruturaAutonoma.',
    );
    // D3 do 0013: o aviso novo e, entre ele e o botão, a caixa desmarcada com rótulo associado e obrigatória; o botão
    // continua habilitado (validação no envio).
    expect(secao).toContain(
      'O pedido vai para o repositório git da estruturaAutonoma. Não deixe nome, e-mail, telefone ou CPF de qualquer pessoa ou do cliente no título, na descrição, na ESP nem no parecer de risco.',
    );
    expect(secao).toMatch(
      /<input type="checkbox" id="confirma-sem-dado-pessoal" aria-required="true"[^>]*\/><label for="confirma-sem-dado-pessoal">Confirmo que o título, a descrição, a ESP e o parecer de risco deste pacote não têm dado pessoal de ninguém: nome, e-mail, telefone ou CPF\.<\/label>/,
    );
    expect(secao).not.toMatch(/id="confirma-sem-dado-pessoal"[^>]*checked/);
    expect(secao.search('id="confirma-sem-dado-pessoal"')).toBeGreaterThan(secao.search('O pedido vai para o repositório git'));
    expect(secao.search('id="gerar-pedido-construcao"')).toBeGreaterThan(secao.search('id="confirma-sem-dado-pessoal"'));
    expect(secao).toMatch(/<button type="button"[^>]*>Gerar Pedido de Construção<\/button>/);
    expect(secao).not.toMatch(/<button[^>]*\sdisabled[=\s>][^>]*>Gerar Pedido de Construção/);
    // C-16: nada é gerado ao abrir a página; sem link de baixar, sem bloco e sem formulário (o botão chama a ação).
    expect(secao).not.toContain('Baixar ');
    expect(secao).not.toContain('Conteúdo do Pedido de Construção');
    expect(secao).not.toContain('data:application/json');
    expect(s).not.toContain('<form');
    // A região de aviso fica montada desde o início, vazia (03, 2.3).
    expect(secao).toContain('<div role="status" class="text-tinta"></div>');
  });

  it('aprovado de Estudo (tipo copiado no pacote): só "Demanda do tipo Estudo não gera Pedido de Construção.", sem botão', async () => {
    mPacote.mockResolvedValue(aprovado({ demandaTipo: 'estudo' }));
    mDemanda.mockResolvedValue(demanda({ tipo: 'melhoria' }));
    const s = await pagina();
    expect(s).toMatch(TITULO_DA_SECAO);
    const secao = s.slice(s.search(TITULO_DA_SECAO));
    expect(secao).toContain('<p>Demanda do tipo Estudo não gera Pedido de Construção.</p>');
    expect(secao).not.toContain('<button');
    expect(secao).not.toContain('Gere o pedido');
  });

  it('a administradora também vê a seção num pacote aprovado de nível cto', async () => {
    mPacote.mockResolvedValue(aprovado());
    mExigir.mockResolvedValue(ADM);
    expect(await pagina()).toContain('>Gerar Pedido de Construção</button>');
  });
});

// 0.2.0 (T13 do DEC-DEM-20261110-0015-v1; RF-12; 03, 6.2 e 6.3; D-02, D-16): a T11 no arranjo A (computador) e C2
// (celular), com uma ordem de DOM só para todas as larguras. O que muda por largura é só classe (md: e xl:); o rodapé
// fixo, o recolhível fechado e o foco ficam no e2e (e2e/decisao-celular.spec.ts).
describe('T13: arranjo A e C2 (RF-12; CV-12, CV-18, CV-19)', () => {
  const ID_DO_RECOLHIVEL = 'detalhes-do-pacote';
  const REPOSITORIO = 'Repositório destino: wsssistemas2626-crypto/sistema-ficticio';
  const aprovacaoCto = { papel: 'cto' as const, nome: 'Pessoa Ficticia CTO', opcao: 'A' as const, registradaEm: APROVADO, referenciaDocumento: null, dataDocumento: null };
  const posicao = (s: string, alvo: RegExp | string): number => {
    const i = typeof alvo === 'string' ? s.indexOf(alvo) : s.search(alvo);
    expect(i, String(alvo)).toBeGreaterThan(-1);
    return i;
  };
  const classes = (tag: string): string[] => (/\sclass="([^"]*)"/.exec(tag)?.[1] ?? '').split(' ');

  it('cabeçalho: "Voltar para a demanda" só abaixo de 768 px e antes do h1; título em <bdi>; linha do repositório destino antes dos alertas', async () => {
    mPacote.mockResolvedValue(pacote({ desatualizado: true, rascunhoAgente: true, rascunhosCitados: [DEC] }));
    mDemanda.mockResolvedValue(demanda({ especificacoes: [resumo(`ESP-${ID}-v3`), resumo(ESP)] }));
    const s = await pagina();
    const voltar = /<a [^>]*>(?:<svg[\s\S]*?<\/svg>)?Voltar para a demanda<\/a>/.exec(s)?.[0] ?? '';
    // CV-19: constante de rota mais o id da demanda do pacote, que casa a regex de id.
    expect(voltar).toContain(`href="/demandas/${ID}"`);
    expect(classes(/<a [^>]*>/.exec(voltar)?.[0] ?? '')).toEqual(expect.arrayContaining(['md:hidden', 'min-h-11']));
    expect(voltar.match(/<svg\b/g)).toHaveLength(1);
    expect(voltar.match(/<svg\b(?![^>]*aria-hidden="true")/g)).toBeNull();
    expect(posicao(s, 'Voltar para a demanda')).toBeLessThan(posicao(s, '<h1'));
    expect(s).toMatch(/<h1 [^>]*>Decisão: <bdi>Pedidos duplicados no ERP \(fictício\)<\/bdi><\/h1>/);
    // RF-12 e CV-12: o repositório destino no cabeçalho, sem abrir nada, antes dos alertas e do conteúdo.
    expect(s).toMatch(new RegExp(`<p[^>]*>${REPOSITORIO}</p>`));
    expect(posicao(s, REPOSITORIO)).toBeGreaterThan(posicao(s, '<h1'));
    expect(posicao(s, REPOSITORIO)).toBeLessThan(posicao(s, 'Este pacote está desatualizado.'));
    expect(posicao(s, REPOSITORIO)).toBeLessThan(posicao(s, 'Este pacote cita conteúdo gerado por agente de IA'));
    mPacote.mockResolvedValue(pacote({ especificacaoCitada: { sistemaAlvo: null, repositorioDestino: null, criteriosAceitePreliminares: null, definicaoDePronto: null } }));
    mDemanda.mockResolvedValue(demanda());
    expect(await pagina()).toMatch(/<p[^>]*>Repositório destino: Não informado<\/p>/);
  });

  it('ordem do DOM: aprovações, resumo, recomendação, revisão sempre visível, recolhível com opções e detalhe, e o formulário', async () => {
    mPacote.mockResolvedValue(pacote({ nivelAprovacaoRequerido: 'cto_e_administradora', aprovadores: [aprovacaoCto], recomendacao: 'Recomendo a opção A (fictício).' }));
    mExigir.mockResolvedValue(ADM);
    const s = await pagina();
    const marcos = [
      /<h2[^>]*>Aprovações<\/h2>/,
      /<h2[^>]*>Resumo executivo<\/h2>/,
      /<h2[^>]*>Recomendação<\/h2>/,
      /<h2[^>]*>Revisão antes de decidir<\/h2>/,
      new RegExp(`<button [^>]*aria-controls="${ID_DO_RECOLHIVEL}"`),
      new RegExp(`<div id="${ID_DO_RECOLHIVEL}"`),
      /<h2[^>]*>Registrar decisão<\/h2>/,
      /<form/,
    ];
    const posicoes = marcos.map((m) => posicao(s, m));
    expect(posicoes).toEqual([...posicoes].sort((a, b) => a - b));
    // O recolhível (D-02): botão com o texto fixo, fechado ao abrir, ligado ao bloco; o bloco some só abaixo de 768 px.
    const botao = new RegExp(`<button [^>]*aria-controls="${ID_DO_RECOLHIVEL}"[^>]*>`).exec(s)![0];
    expect(botao).toContain('aria-expanded="false"');
    expect(botao).toContain('type="button"');
    expect(classes(botao)).toContain('md:hidden');
    expect(s.slice(s.indexOf(botao))).toMatch(/^<button [^>]*>Ver vantagens, desvantagens e a revisão do pacote<svg[^>]*aria-hidden="true"/);
    expect(classes(new RegExp(`<div id="${ID_DO_RECOLHIVEL}"[^>]*>`).exec(s)![0])).toEqual(['max-md:hidden']);
    // A partir de 1200 px: conteúdo em 3/5 e o cartão "Registrar decisão" em 2/5, não fixo.
    expect(s).toMatch(/<div class="[^"]*\bxl:grid-cols-5\b[^"]*">/);
    const registrar = /<section aria-labelledby="registrar-decisao-titulo"[^>]*>/.exec(s)![0];
    expect(classes(registrar)).toEqual(expect.arrayContaining(['xl:col-span-2', 'rounded-cartao', 'border-linha', 'bg-branco']));
    expect(registrar).not.toMatch(/\b(?:fixed|sticky)\b/);
    expect(s).toMatch(/<div class="[^"]*\bxl:col-span-3\b[^"]*"><section aria-labelledby="aprovacoes"/);
  });

  it('CV-12 e D-16: sem abrir nada, a revisão mostra ESP e RSK com o selo, sistema alvo, repositório, os três níveis e o nível; no recolhível só critérios, definição de pronto e as opções completas', async () => {
    mPacote.mockResolvedValue(pacote({ nivelAprovacaoRequerido: 'cto_e_administradora', rascunhoAgente: true, rascunhosCitados: [DEC, ESP, RSK] }));
    const s = await pagina();
    const sempre = s.slice(posicao(s, /<h2[^>]*>Revisão antes de decidir<\/h2>/), posicao(s, new RegExp(`<button [^>]*aria-controls="${ID_DO_RECOLHIVEL}"`)));
    for (const t of [
      'Especificação técnica citada',
      `href="/especificacoes/${ESP}"`,
      'Sistema alvo',
      '>sistema-ficticio<',
      'Repositório destino',
      'wsssistemas2626-crypto/sistema-ficticio',
      'Parecer de risco citado',
      `href="/pareceres-risco/${RSK}"`,
      'Risco técnico: Alto',
      'Risco operacional: Médio',
      'Risco jurídico: Baixo',
      'Nível de aprovação: CTO e administradora',
    ])
      expect(sempre, t).toContain(t);
    expect(sempre.match(/>Rascunho de agente<\/span>/g)).toHaveLength(2);
    for (const t of ['Critérios de aceite preliminares', 'Critério (fictício)', 'Definição de pronto', 'Pronto (fictício)']) expect(sempre, t).not.toContain(t);

    const recolhivel = s.slice(posicao(s, new RegExp(`<div id="${ID_DO_RECOLHIVEL}"`)), posicao(s, /<section aria-labelledby="registrar-decisao-titulo"/));
    for (const t of ['Critérios de aceite preliminares', 'Critério (fictício)', 'Definição de pronto', 'Pronto (fictício)', '>Opções</h2>', '>Opção A</h3>', '>Opção B</h3>', '>Vantagens</dt>', '>Quando escolher</dt>'])
      expect(recolhivel, t).toContain(t);
    // Fora do recolhível: o nível, o repositório, os níveis de risco, os alertas, as aprovações, o resumo e a recomendação.
    for (const t of ['Nível de aprovação', 'Repositório destino', 'Risco técnico', 'Este pacote cita conteúdo', 'Aprovações', 'Resumo executivo', 'Recomendação', 'Rascunho de agente'])
      expect(recolhivel, t).not.toContain(t);
  });

  it('rodapé (03, 6.3): fixo embaixo só abaixo de 768 px, branco, borda superior linha, com a área segura; principal de 48 px na largura toda; Devolver e Arquivar lado a lado', async () => {
    mPacote.mockResolvedValue(pacote({ desatualizado: true }));
    mDemanda.mockResolvedValue(demanda({ especificacoes: [resumo(`ESP-${ID}-v3`), resumo(ESP)] }));
    const s = await pagina();
    const rodape = /<div id="rodape-da-decisao" role="group" aria-label="Ações da decisão"[^>]*>/.exec(s)![0];
    expect(classes(rodape)).toEqual(
      expect.arrayContaining([
        'max-md:fixed',
        'max-md:inset-x-0',
        'max-md:bottom-0',
        'max-md:z-20',
        'max-md:border-t',
        'max-md:border-linha',
        'max-md:bg-branco',
        'max-md:px-4',
        'max-md:pt-3',
        'max-md:pb-[calc(0.75rem_+_env(safe-area-inset-bottom))]',
        'max-md:gap-2',
      ]),
    );
    // A partir de 768 px o grupo fica no fluxo, no fim do cartão (sem fixed fora do max-md:).
    expect(classes(rodape).filter((c) => /(?:^|:)(?:fixed|sticky|absolute)$/.test(c) && !c.startsWith('max-md:'))).toEqual([]);
    const principal = /<button [^>]*id="decisao-aprovar"[^>]*>/.exec(s)![0];
    expect(classes(principal)).toEqual(expect.arrayContaining(['max-md:min-h-12', 'max-md:w-full']));
    const linha = s.slice(s.indexOf(principal) + principal.length);
    expect(linha).toMatch(/<div class="[^"]*\bmax-md:grid\b[^"]*\bmax-md:grid-cols-2\b[^"]*"><button [^>]*id="decisao-devolver"/);
    // A explicação do "Aprovar" indisponível fica no rodapé, logo acima dele, em 13 px no celular.
    const explicacao = /<p id="decisao-aprovar-indisponivel"[^>]*>/.exec(s)![0];
    expect(classes(explicacao)).toEqual(expect.arrayContaining(['max-md:text-[0.8125rem]', 'max-md:leading-[1.125rem]']));
    expect(posicao(s, rodape)).toBeLessThan(posicao(s, explicacao));
    expect(posicao(s, explicacao)).toBeLessThan(posicao(s, principal));
  });

  it('CA-12.5: sem formulário (decidido, ou a conta não decide) não há rodapé', async () => {
    mPacote.mockResolvedValue(
      pacote({ statusDecisao: 'aprovada', aprovadores: [aprovacaoCto], decisao: { opcaoEscolhida: 'A', comentarios: null, decididaPor: 'Pessoa Ficticia CTO', decididaEm: APROVADO } }),
    );
    let s = await pagina();
    expect(s).toContain('Decisão registrada: Aprovada, opção A, por Pessoa Ficticia CTO em 22/10/2026 às 15:00.');
    expect(s).not.toContain('rodape-da-decisao');
    mPacote.mockResolvedValue(pacote());
    mExigir.mockResolvedValue(ADM);
    s = await pagina();
    expect(s).toContain('Este pacote exige só a aprovação do CTO.');
    expect(s).not.toContain('rodape-da-decisao');
  });
});

// 06-T16-construcao (volta da 06-T16-testes), DEC-DEM-20261110-0015-v1: RNF-03 e 03, 2.4. Link solto (o valor inteiro
// de um termo, ou o link fora do <p> de um alerta, sem texto solto ao lado) tem 44 px de altura abaixo de 768 px e 24 px
// a partir dele; sem `inline-flex`, o `min-height` não vale num <a>. O e2e (alvo-de-toque.spec.ts) mede a ESP e o RSK
// da revisão em 390 px; os três alertas ficam aqui, porque o e2e só lê e não cria esses estados.
describe('T16: links soltos da T11 com alvo de toque de 44 px abaixo de 768 px (RNF-03; 03, 2.4)', () => {
  const V2 = `DEC-${ID}-v2`;
  const ALVO = ['inline-flex', 'items-center', 'min-h-11', 'md:min-h-6'];
  const aprovacaoCto = { papel: 'cto' as const, nome: 'Pessoa Ficticia CTO', opcao: 'A' as const, registradaEm: APROVADO, referenciaDocumento: null, dataDocumento: null };
  const aprovado = (extra: Partial<PacoteDecisaoVista> = {}) =>
    pacote({
      statusDecisao: 'aprovada',
      aprovadores: [aprovacaoCto],
      decisao: { opcaoEscolhida: 'A', comentarios: null, decididaPor: CTO.nome, decididaEm: APROVADO },
      ...extra,
    });
  const escapar = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // A abertura do <a> com o href e o texto dados; falha se não houver exatamente um.
  function link(s: string, href: string, texto: string): string {
    const achados = [...s.matchAll(new RegExp(`(<a [^>]*href="${escapar(href)}"[^>]*>)${escapar(texto)}</a>`, 'g'))].map((m) => m[1]!);
    expect(achados, `${href} ${texto}`).toHaveLength(1);
    return achados[0]!;
  }
  const classes = (tag: string): string[] => (/\sclass="([^"]*)"/.exec(tag)?.[1] ?? '').split(' ');

  it('revisão antes de decidir: os links da ESP e do RSK citados', async () => {
    mPacote.mockResolvedValue(pacote({ rascunhoAgente: true, rascunhosCitados: [DEC, ESP, RSK] }));
    const s = await pagina();
    const revisao = s.slice(s.search(/<h2[^>]*>Revisão antes de decidir<\/h2>/));
    for (const [href, texto] of [
      [`/especificacoes/${ESP}`, ESP],
      [`/pareceres-risco/${RSK}`, RSK],
    ] as const)
      expect(classes(link(revisao, href, texto)), texto).toEqual(expect.arrayContaining([...ALVO, 'font-mono', 'text-acao-escura', 'underline']));
  });

  it('alertas: "Ir para a demanda" do lembrete, o link do substituído e o do desatualizado', async () => {
    mPacote.mockResolvedValue(aprovado());
    let s = await pagina();
    expect(classes(link(s, `/demandas/${ID}`, 'Ir para a demanda'))).toEqual(expect.arrayContaining([...ALVO, 'text-acao-escura', 'underline']));

    mPacote.mockResolvedValue(aprovado({ substituido: true, substituidoPor: V2 }));
    s = await pagina();
    expect(classes(link(s, `/pacotes-decisao/${V2}`, `Abrir o pacote ${V2}`))).toEqual(expect.arrayContaining([...ALVO, 'text-acao-escura', 'underline']));

    mPacote.mockResolvedValue(pacote({ desatualizado: true }));
    mDemanda.mockResolvedValue(demanda({ especificacoes: [resumo(`ESP-${ID}-v3`), resumo(ESP)] }));
    s = await pagina();
    const desatualizado = s.slice(s.indexOf('Este pacote está desatualizado.'));
    // T17 (Minor 1 da 06-T16-tech-lead, volta 2): o mesmo auxiliar `link()` dos outros dois casos, com o `ID` do fixture.
    expect(classes(link(desatualizado, `/demandas/${ID}/pacotes-decisao/novo`, 'Criar pacote novo'))).toEqual(
      expect.arrayContaining([...ALVO, 'text-acao-escura', 'underline']),
    );
  });

  it('controle: os links dentro de frase do cabeçalho (a demanda e os "Ver" entre parênteses) não ganham o alvo de 44 px', async () => {
    const s = await pagina();
    const cabecalho = s.slice(0, s.search(/<h2/));
    for (const [href, texto] of [
      [`/demandas/${ID}`, ID],
      [`/especificacoes/${ESP}`, 'Ver'],
      [`/pareceres-risco/${RSK}`, 'Ver'],
    ] as const)
      expect(classes(link(cabecalho, href, texto)), `${href} ${texto}`).not.toContain('min-h-11');
  });
});

// 06-T13-testes (qa-automacao), DEC-DEM-20261110-0015-v1: a T13 muda só classe por largura (md:, max-md:, xl:) sobre
// um DOM só. Então, se nenhuma exigência de aprovação está dentro de algo que uma classe esconde em alguma largura
// (hidden, md:hidden, max-md:hidden, xl:hidden, sr-only, invisible) nem atrás de `hidden`, `inert` ou `aria-hidden`, ela
// está à vista no computador e no celular. Vale para cada conta que decide, com e sem rascunho citado, atual e
// desatualizado. O e2e (decisao-celular-qa.spec.ts) confere no navegador que elas continuam obrigatórias.
describe('T13: nenhuma exigência de aprovação escondida em alguma largura (06-T13-testes, qa-automacao)', () => {
  const VAZIOS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
  const ESCONDE = /^(?:hidden|invisible|sr-only|collapse)$/;
  const nomeDa = (tag: string) => /^<\/?([a-zA-Z][a-zA-Z0-9-]*)/.exec(tag)![1]!.toLowerCase();

  // As tags abertas em `pos` (ancestrais), mais a própria tag quando `pos` cai dentro de uma.
  function envoltorio(html: string, pos: number): string[] {
    const inicio = html.lastIndexOf('<', pos);
    const dentroDeTag = inicio >= 0 && html.indexOf('>', inicio) >= pos && !html.startsWith('</', inicio);
    const corte = dentroDeTag ? inicio : pos;
    const pilha: string[] = [];
    for (const [tag] of html.slice(0, corte).matchAll(/<\/?[a-zA-Z][a-zA-Z0-9-]*\b[^>]*>/g)) {
      const nome = nomeDa(tag);
      if (tag.startsWith('</')) {
        const i = pilha.map(nomeDa).lastIndexOf(nome);
        if (i >= 0) pilha.length = i;
      } else if (!tag.endsWith('/>') && !VAZIOS.has(nome)) pilha.push(tag);
    }
    if (dentroDeTag) pilha.push(html.slice(inicio, html.indexOf('>', inicio) + 1));
    return pilha;
  }

  // O que, numa tag, esconde o conteúdo em alguma largura; null quando nada esconde.
  function oQueEsconde(tag: string): string | null {
    const classes = (/\sclass="([^"]*)"/.exec(tag)?.[1] ?? '').split(/\s+/).filter(Boolean);
    const classe = classes.find((c) => ESCONDE.test(c.split(':').at(-1)!));
    if (classe) return `classe ${classe}`;
    const semClasse = tag.replace(/\sclass="[^"]*"/, '');
    if (/\s(?:hidden|inert)(?=[\s=/>])/.test(semClasse)) return 'atributo hidden ou inert';
    if (/\saria-hidden="true"/.test(semClasse)) return 'aria-hidden';
    return null;
  }

  function escondido(html: string, marca: string): string | null {
    const pos = html.indexOf(marca);
    expect(pos, `${marca}: está na página`).toBeGreaterThanOrEqual(0);
    for (const tag of envoltorio(html, pos)) {
      const motivo = oQueEsconde(tag);
      if (motivo) return `${motivo} em ${tag.slice(0, 120)}`;
    }
    return null;
  }

  it('casos plantados: a conferência acusa o "Voltar" (md:hidden), o recolhível (max-md:hidden), sr-only, hidden, inert e aria-hidden', async () => {
    mPacote.mockResolvedValue(pacote({ rascunhoAgente: true, rascunhosCitados: [DEC] }));
    const s = await pagina();
    expect(escondido(s, 'Voltar para a demanda')).toMatch(/^classe md:hidden em <a /);
    expect(escondido(s, 'Critérios de aceite preliminares')).toMatch(/^classe max-md:hidden em <div id="detalhes-do-pacote"/);
    expect(escondido(s, '>Opções</h2>')).toMatch(/^classe max-md:hidden/);
    for (const [html, motivo] of [
      ['<div class="flex xl:sr-only"><p>alvo</p></div>', /^classe xl:sr-only/],
      ['<section hidden=""><p>alvo</p></section>', /^atributo hidden ou inert/],
      ['<div inert=""><input id="alvo"/></div>', /^atributo hidden ou inert/],
      ['<div aria-hidden="true"><span>alvo</span></div>', /^aria-hidden/],
      ['<input class="max-md:invisible" id="alvo"/>', /^classe max-md:invisible/],
    ] as const)
      expect(escondido(html, 'alvo'), html).toMatch(motivo);
    // Controle: irmão escondido e fechado antes não conta; overflow-hidden não esconde o conteúdo.
    expect(escondido('<div class="hidden"><p>x</p></div><div class="overflow-hidden md:block"><p>alvo</p></div>', 'alvo')).toBeNull();
  });

  type Caso = { nome: string; conta: AtorPessoa; nivel: PacoteDecisaoVista['nivelAprovacaoRequerido']; aprovadores: PacoteDecisaoVista['aprovadores']; fixada: string | null; documento: boolean };
  const aprovacao = (papel: 'cto' | 'administradora', opcao: 'A' | 'B'): PacoteDecisaoVista['aprovadores'][number] => ({
    papel,
    nome: papel === 'cto' ? CTO.nome : ADM.nome,
    opcao,
    registradaEm: APROVADO,
    referenciaDocumento: papel === 'cto' ? null : 'DOC-FICTICIO-1',
    dataDocumento: papel === 'cto' ? null : '2026-10-23',
  });
  const CASOS: readonly Caso[] = [
    { nome: 'nível cto, conta cto', conta: CTO, nivel: 'cto', aprovadores: [], fixada: null, documento: false },
    { nome: 'dupla, o CTO aprova primeiro', conta: CTO, nivel: 'cto_e_administradora', aprovadores: [], fixada: null, documento: false },
    { nome: 'dupla, a administradora aprova primeiro', conta: ADM, nivel: 'cto_e_administradora', aprovadores: [], fixada: null, documento: true },
    {
      nome: 'dupla, a administradora depois do CTO na A',
      conta: ADM,
      nivel: 'cto_e_administradora',
      aprovadores: [aprovacao('cto', 'A')],
      fixada: 'O CTO aprovou a opção A. A sua aprovação vale para a mesma opção. Para discordar, escolha devolver ou arquivar.',
      documento: true,
    },
    {
      nome: 'dupla, o CTO depois da administradora na B',
      conta: CTO,
      nivel: 'cto_e_administradora',
      aprovadores: [aprovacao('administradora', 'B')],
      fixada: 'A administradora aprovou a opção B. A sua aprovação vale para a mesma opção. Para discordar, escolha devolver ou arquivar.',
      documento: false,
    },
  ];

  it.each(CASOS)('$nome: revisão, alertas, aprovações, opções ou frase fixada, documento, caixa de revisão e os três botões à vista nas duas larguras', async (caso) => {
    mExigir.mockResolvedValue(caso.conta);
    for (const rascunho of [false, true])
      for (const desatualizado of [false, true]) {
        const r = `${caso.nome}, rascunho ${rascunho}, desatualizado ${desatualizado}`;
        mPacote.mockResolvedValue(
          pacote({
            nivelAprovacaoRequerido: caso.nivel,
            aprovadores: caso.aprovadores,
            desatualizado,
            rascunhoAgente: rascunho,
            rascunhosCitados: rascunho ? [DEC] : [],
            recomendacao: 'Opção B, pela entrega menor (fictício).',
          }),
        );
        mDemanda.mockResolvedValue(desatualizado ? demanda({ especificacoes: [resumo(`ESP-${ID}-v3`), resumo(ESP)] }) : demanda());
        const s = await pagina();
        const nivel = caso.nivel === 'cto' ? 'Só o CTO' : 'CTO e administradora';
        const marcas = [
          // C-14 e CV-12: a revisão sempre visível, o repositório (cabeçalho e revisão), os níveis e o nível de aprovação.
          '>Revisão antes de decidir<',
          'Repositório destino: wsssistemas2626-crypto/sistema-ficticio<',
          '>wsssistemas2626-crypto/sistema-ficticio<',
          'Risco técnico: Alto',
          'Risco operacional: Médio',
          'Risco jurídico: Baixo',
          `>Nível de aprovação: ${nivel}<`,
          '>Resumo executivo<',
          // P-01: a recomendação em texto.
          'Opção B, pela entrega menor (fictício).',
          // O formulário e o que vale para as três ações.
          '<form',
          `id="${idDoCampo('comentarios')}"`,
          'id="decisao-consequencia-devolver"',
          'id="decisao-consequencia-arquivar"',
          'id="rodape-da-decisao"',
          'id="decisao-aprovar"',
          'id="decisao-devolver"',
          'id="decisao-arquivar"',
          ...(caso.nivel === 'cto' ? [] : ['>Aprovações<', caso.conta.papel === 'cto' ? 'CTO: pendente.' : 'Administradora: pendente.']),
          ...(rascunho ? ['Este pacote cita conteúdo gerado por agente de IA', '>Rascunho de agente<', `id="${idDoCampo('revisouRascunhosDeAgente')}"`] : []),
          ...(desatualizado ? ['Este pacote está desatualizado.', '>Desatualizado<', 'id="decisao-aprovar-indisponivel"'] : []),
          ...(!desatualizado && caso.fixada ? [caso.fixada] : []),
          ...(!desatualizado && !caso.fixada ? [`id="${idDoCampo('opcaoEscolhida')}-A"`, `id="${idDoCampo('opcaoEscolhida')}-B"`] : []),
          ...(!desatualizado && caso.documento ? [`id="${idDoCampo('referenciaDocumento')}"`, `id="${idDoCampo('dataDocumento')}"`] : []),
        ];
        for (const m of marcas) expect(escondido(s, m), `${r}: ${m}`).toBeNull();
      }
  });
});

// T19 do DEC-DEM-20261111-0016-v1 (RF-15; CA-15.1, CA-15.2; 03, 6.1, 6.3 e seção 10; D-11): a linha "Recebido pelo
// /construir em …" no cabeçalho, depois de "Repositório destino" e antes das citações. A leitura é a do histórico
// (recebimentoDoPedido, T10), feita depois de autorizar a leitura do pacote; o axe e o <time> no navegador ficam no e2e
// (e2e/recebido-construir.spec.ts).
describe('T19: "Recebido pelo /construir em …" (RF-15)', () => {
  const RECEBIDO = new Date('2026-11-11T17:32:00Z');
  const LINHA = 'Recebido pelo /construir em';
  const V2 = `DEC-${ID}-v2`;
  const aprovacaoCto = { papel: 'cto' as const, nome: CTO.nome, opcao: 'A' as const, registradaEm: APROVADO, referenciaDocumento: null, dataDocumento: null };
  const aprovado = (extra: Partial<PacoteDecisaoVista> = {}) =>
    pacote({
      statusDecisao: 'aprovada',
      aprovadores: [aprovacaoCto],
      decisao: { opcaoEscolhida: 'A', comentarios: null, decididaPor: CTO.nome, decididaEm: APROVADO },
      ...extra,
    });
  // O <p> inteiro da linha: o visto decorativo e o texto, com a data em <time>.
  const paragrafo = (s: string) => /<p [^>]*><svg [\s\S]*?<\/svg><span>Recebido pelo \/construir em [\s\S]*?<\/span><\/p>/.exec(s)?.[0];

  it('lê o recebimento do DEC depois de autorizar e de achar o pacote; id fora do formato e pacote inexistente não leem', async () => {
    await pagina();
    expect(mRecebimento).toHaveBeenCalledTimes(1);
    expect(mRecebimento).toHaveBeenCalledWith(DB, DEC);
    expect(mAutorizar.mock.invocationCallOrder[0]!).toBeLessThan(mRecebimento.mock.invocationCallOrder[0]!);
    expect(mPacote.mock.invocationCallOrder[0]!).toBeLessThan(mRecebimento.mock.invocationCallOrder[0]!);
    // A autorização continua a de hoje: nenhuma ação nova.
    expect(mAutorizar.mock.calls.map((c) => c[1])).toEqual(['ler_pacote_decisao', 'ler_demanda']);

    mRecebimento.mockClear();
    await expect(pagina('qualquer-coisa')).rejects.toThrow('NEXT_NOT_FOUND');
    const { ErroDominio } = await import('../../../../lib/erros');
    mPacote.mockRejectedValue(new ErroDominio('nao_encontrado', 'x'));
    await expect(pagina()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mRecebimento).not.toHaveBeenCalled();
  });

  it('CA-15.2: sem pedido_recebido, a linha não existe e o cabeçalho é o de hoje', async () => {
    mPacote.mockResolvedValue(aprovado());
    const s = await pagina();
    expect(s).not.toContain(LINHA);
    expect(s).not.toContain('text-positivo');
    expect(s).not.toContain('aguardando o /construir');
  });

  it('CA-15.1: a linha depois de "Repositório destino" e antes das citações, com o visto decorativo e a data em <time>', async () => {
    mPacote.mockResolvedValue(aprovado());
    mRecebimento.mockResolvedValue(RECEBIDO);
    const s = await pagina();
    const p = paragrafo(s);
    expect(p).toBeDefined();
    // O texto da 03, 6.1, com a data no fuso do sistema; a mesma frase que linhaDoRecebimento monta.
    expect(p!.replace(/<svg [\s\S]*?<\/svg>/, '').replace(/<[^>]+>/g, '')).toBe('Recebido pelo /construir em 11/11/2026 às 14:32.');
    expect(p).toMatch(/<time date[tT]ime="2026-11-11T17:32:00\.000Z">11\/11\/2026 às 14:32<\/time>\.<\/span><\/p>$/);
    // O ícone não carrega a informação: aria-hidden, sem foco, cor positivo; o texto fica em tinta.
    const svg = /<svg [^>]*>/.exec(p!)![0];
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain('focusable="false"');
    expect(svg).toMatch(/class="[^"]*\btext-positivo\b/);
    expect(/^<p [^>]*>/.exec(p!)![0]).toMatch(/class="[^"]*\btext-tinta\b/);
    // Conteúdo estático: sem role, sem tabindex, sem link nem botão.
    expect(p).not.toMatch(/\srole=|\stabindex=|<a\s|<button/i);
    // Ordem do cabeçalho: repositório, recebido, citações, e tudo antes do primeiro h2.
    const repositorio = s.indexOf('Repositório destino: wsssistemas2626-crypto/sistema-ficticio');
    const recebido = s.indexOf(LINHA);
    const cita = s.indexOf('Cita: ');
    expect(repositorio).toBeGreaterThan(0);
    expect(repositorio).toBeLessThan(recebido);
    expect(recebido).toBeLessThan(cita);
    expect(recebido).toBeLessThan(s.search(/<h2/));
    expect(s.split(LINHA)).toHaveLength(2);
  });

  it('CA-15.1: aparece em toda situação do DEC: substituído, desatualizado e com a demanda em status final, mesmo sem a seção do pedido', async () => {
    mRecebimento.mockResolvedValue(RECEBIDO);
    const casos: Array<[string, PacoteDecisaoVista, DemandaVista]> = [
      ['substituído', aprovado({ substituido: true, substituidoPor: V2 }), demanda({ status: 'aprovada' })],
      ['desatualizado', aprovado({ desatualizado: true }), demanda({ status: 'aprovada', especificacoes: [resumo(`ESP-${ID}-v3`), resumo(ESP)] })],
      ['demanda encerrada', aprovado(), demanda({ status: 'encerrada' })],
      ['demanda entregue', aprovado(), demanda({ status: 'entregue' })],
    ];
    for (const [nome, p, d] of casos) {
      mPacote.mockResolvedValue(p);
      mDemanda.mockResolvedValue(d);
      const s = await pagina();
      expect(paragrafo(s), nome).toContain('11/11/2026 às 14:32</time>.');
      if (nome !== 'demanda encerrada' && nome !== 'demanda entregue') expect(s, nome).not.toMatch(/<h2[^>]*>Pedido de Construção<\/h2>/);
    }
  });

  it('03, 6.3: falha ao ler o recebimento vai para a tela de erro de hoje, sem mostrar a linha pela metade', async () => {
    mPacote.mockResolvedValue(aprovado());
    mRecebimento.mockRejectedValue(new Error('falha fictícia do recebimento'));
    await expect(pagina()).rejects.toThrow('falha fictícia do recebimento');
  });
});
