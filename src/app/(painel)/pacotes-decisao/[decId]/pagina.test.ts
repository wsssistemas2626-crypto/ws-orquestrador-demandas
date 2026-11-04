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

const mExigir = vi.mocked(exigirPessoaNaPagina);
const mAutorizar = vi.mocked(autorizar);
const mDemanda = vi.mocked(obterDemanda);
const mPacote = vi.mocked(obterPacoteDecisao);

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

describe('T11: cabeçalho, revisão e conteúdo', () => {
  it('id, selo da decisão, h1 com o título copiado no pacote, linha da demanda e as versões citadas', async () => {
    const s = await pagina();
    expect(s).toContain(`<span class="font-mono">${DEC}</span>`);
    expect(s).toContain('>Decisão pendente</span>');
    expect(s).toContain('<h1 class="break-words">Decisão: Pedidos duplicados no ERP (fictício)</h1>');
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
    const aprovar = /<input type="radio" id="campo-statusDecisao-aprovada"[^>]*>/.exec(s)![0];
    expect(aprovar).toContain('aria-disabled="true"');
    expect(aprovar).toContain('aria-describedby="campo-statusDecisao-aprovada-dica"');
    expect(s).toContain('id="campo-statusDecisao-aprovada-dica" class="ml-7 text-sm text-texto-suave">Indisponível: pacote desatualizado.</p>');
  });

  it('C-18: título copiado e opções como texto', async () => {
    mPacote.mockResolvedValue(pacote({ demandaTitulo: '<script>window.__x=1</script>', opcaoA: { descricao: '<img src=x onerror="window.__x=2">' } }));
    const s = await pagina();
    expect(s).not.toContain('<script>');
    expect(s).not.toContain('<img');
  });
});

describe('T11: quem vê o formulário (P1-a, P1-b)', () => {
  it('nível cto, conta cto: o formulário sem documento; os grupos e o botão', async () => {
    const s = await pagina();
    expect(s).toMatch(/<h2[^>]*>Registrar decisão<\/h2>/);
    expect(s).toContain('>Decisão (obrigatório)</legend>');
    for (const r of ['Aprovar', 'Devolver para nova análise', 'Arquivar']) expect(s).toContain(`>${r}</label>`);
    expect(s).toContain('Devolver para nova análise: a demanda volta para Em análise.');
    expect(s).toContain('Arquivar: a demanda vai para Encerrada.');
    expect(s).toContain('class="font-medium">Comentários (opcional)</label>');
    expect(s).not.toContain('Identificador do documento assinado');
    expect(s).not.toContain('Revisei os rascunhos');
    expect(s).toMatch(/<button type="submit"[^>]*>Registrar decisão<\/button>/);
    expect(s).not.toContain(`id="${idDoCampo('opcaoEscolhida')}-A"`);
    expect(s).not.toContain('Aprovações');
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
    expect(secao).toContain('Gere o pedido, baixe ou copie o JSON e grave-o na pasta pedidos/ da estruturaAutonoma. O envio ao /construir é manual nesta versão.');
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
    expect(secao).toContain('<div role="status" class="text-texto"></div>');
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
