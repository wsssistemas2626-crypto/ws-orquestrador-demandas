// 06-T12-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; RF-03, RF-06; CA-03.6, CA-06.1 a CA-06.4; SB-12; D-12; 03,
// 4.2, 4.6, 4.7 e seção 8). Prova adversarial pela T11 inteira (o HTML do servidor): em todo estado de uma demanda com um
// ou dois DECs (nível, decisão e desatualizado de cada um), com a demanda em Pronta para decisão, Aprovada, Entregue e
// Encerrada, e com cada DEC aberto, a página mostra o aviso (a), (b) ou (c) só quando o que ele diz é verdade, com o texto
// da 03, seção 8, por inteiro, e o link certo dentro do próprio aviso; o DEC mais novo só é lido quando a D-12 manda; a
// dica do Arquivar, quando o formulário aparece, é a da tabela da 4.6. O oráculo é a tabela da 4.2 escrita aqui, sobre o
// modelo da demanda (vigente = aprovado mais novo), e não a função da página. Também: as corridas entre a leitura da
// demanda e a do mais novo (já decidido, desatualizado, outro nível), o v1 substituído com o v3 pendente, e o id fora do
// formato vindo do banco (SB-12 d), que nunca vira texto. Molde de pagina-vigencia.test.ts (sessão e leituras são dublês;
// a matriz de acesso é a real). Ids e nomes fictícios; sem relógio e sem ordem entre os testes.
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AtorPessoa } from '../../../../modules/acesso/ator';
import { exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { NIVEIS_APROVACAO, type NivelAprovacao } from '../../../../db/schema/decisao';
import { obterDemanda, type DemandaVista, type PacoteResumo, type VersaoResumo } from '../../../../modules/demandas/consultas';
import { obterPacoteDecisao, type PacoteDecisaoVista } from '../../../../modules/pacotes-decisao/consultas';
import { vigenteDaDemanda, type VigenteDaDemanda } from '../../../../modules/pacotes-decisao/substituido';
import { recebimentoDoPedido } from '../../../../modules/pedido-construcao/pendentes';
import PaginaDecisao from './page';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  usePathname: () => '/pacotes-decisao/DEC-DEM-20991231-0008-v2',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('../../../../lib/deps', () => ({ obterDeps: async () => ({ db: { dubleDoBanco: true } }) }));
vi.mock('../../../../modules/acesso/exigir-pessoa', () => ({ exigirPessoaNaPagina: vi.fn(), exigirPessoa: vi.fn() }));
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
const mDemanda = vi.mocked(obterDemanda);
const mPacote = vi.mocked(obterPacoteDecisao);
const mVigente = vi.mocked(vigenteDaDemanda);
const mRecebimento = vi.mocked(recebimentoDoPedido);

const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-cto', nome: 'Pessoa Ficticia CTO', papel: 'cto' };
const ADM_NOME = 'Pessoa Ficticia Administradora';
const DEM = 'DEM-20991231-0008';
const id = (v: number) => `DEC-${DEM}-v${v}`;
const ESP = `ESP-${DEM}-v1`;
const RSK = `RSK-${DEM}-v1`;
const CRIADO = new Date('2099-12-30T17:05:00Z');
const APROVADO = new Date('2099-12-30T18:00:00Z');

// Os textos da 03, seção 8, por inteiro (não vêm de TEXTOS_DECISAO).
const TEXTO_A = (v: string) =>
  `Esta demanda já tem um pacote aprovado em vigor: ${v}. Quando a aprovação deste pacote ficar completa, ele passa a valer no lugar de ${v}, e um pedido já gerado de ${v} deixa de valer.`;
const TEXTO_B = (p: string) =>
  `Há um pacote mais novo pendente nesta demanda: ${p}. Quando a aprovação dele ficar completa, ele passa a valer no lugar deste, e um pedido já gerado deste pacote deixa de valer.`;
const TEXTO_C = (v: string) =>
  `A aprovação deste pacote será recusada: o pacote em vigor nesta demanda, ${v}, exigiu a aprovação do CTO e da administradora, e um pacote só do CTO não pode substituí-lo. Você pode devolver ou arquivar este pacote. Para substituir ${v}, crie um pacote novo com aprovação do CTO e da administradora.`;
// O começo de cada aviso: nenhum pode aparecer quando o aviso seria falso.
const INICIOS = ['Esta demanda já tem um pacote aprovado em vigor', 'Há um pacote mais novo pendente nesta demanda', 'A aprovação deste pacote será recusada'];
const CLASSE_LINK_SOLTO = 'inline-flex min-h-11 items-center md:min-h-6 text-acao-escura underline underline-offset-2';

// --- o modelo da demanda ---

type Estado = PacoteDecisaoVista['statusDecisao'];
const ESTADOS: readonly Estado[] = ['pendente', 'aprovada', 'devolvida', 'arquivada'];
type Dec = { id: string; versao: number; nivel: NivelAprovacao; estado: Estado; desatualizado: boolean };

function listas(n: number): Dec[][] {
  const um: Array<Omit<Dec, 'id' | 'versao'>> = [];
  for (const nivel of NIVEIS_APROVACAO) for (const estado of ESTADOS) for (const desatualizado of [false, true]) um.push({ nivel, estado, desatualizado });
  let acc: Dec[][] = [[]];
  for (let v = 1; v <= n; v++) acc = acc.flatMap((l) => um.map((d) => [...l, { id: id(v), versao: v, ...d }]));
  return acc;
}
const vigenteDe = (l: readonly Dec[]): Dec | null => [...l].reverse().find((d) => d.estado === 'aprovada') ?? null;
const soCtoSobreDupla = (novo: NivelAprovacao, emVigor: NivelAprovacao) => novo === 'cto' && emVigor === 'cto_e_administradora';

type Esperado = { texto: string; rotulo: string; href: string } | null;
// A tabela da 4.2 sobre o modelo (o mesmo oráculo do teste unitário, escrito de novo aqui: teste não importa teste).
function esperado(l: readonly Dec[], aberto: Dec, status: DemandaVista['status']): Esperado {
  if (status === 'entregue' || status === 'encerrada') return null;
  const maisNovo = l[l.length - 1]!;
  const v = vigenteDe(l);
  if (aberto.estado === 'pendente' && aberto === maisNovo && !aberto.desatualizado && v && v !== aberto) {
    if (soCtoSobreDupla(aberto.nivel, v.nivel)) return { texto: TEXTO_C(v.id), rotulo: 'Criar pacote novo', href: `/demandas/${DEM}/pacotes-decisao/novo` };
    return { texto: TEXTO_A(v.id), rotulo: `Abrir o pacote ${v.id}`, href: `/pacotes-decisao/${v.id}` };
  }
  if (v === aberto && maisNovo !== aberto && maisNovo.estado === 'pendente' && !maisNovo.desatualizado && !soCtoSobreDupla(maisNovo.nivel, aberto.nivel)) {
    return { texto: TEXTO_B(maisNovo.id), rotulo: `Abrir o pacote ${maisNovo.id}`, href: `/pacotes-decisao/${maisNovo.id}` };
  }
  return null;
}

// A dica da 4.6, escrita aqui (com a Pendência 1 em Em análise, como a T06).
const ROTULO: Readonly<Record<DemandaVista['status'], string>> = {
  nova: 'Nova',
  em_analise: 'Em análise',
  aguardando_informacao: 'Aguardando informação',
  pronta_para_decisao: 'Pronta para decisão',
  aprovada: 'Aprovada',
  em_construcao: 'Em construção',
  entregue: 'Entregue',
  devolvida: 'Devolvida pela construção',
  encerrada: 'Encerrada',
};
function dicaEsperada(status: DemandaVista['status'], v: Dec | null): string {
  if (['nova', 'aguardando_informacao', 'pronta_para_decisao', 'em_analise'].includes(status)) {
    if (!v) return 'Arquivar: a demanda vai para Encerrada.';
    if (!v.desatualizado) return `Arquivar: a demanda vai para Aprovada, e ${v.id} continua em vigor.`;
    if (status !== 'em_analise') return `Arquivar: a demanda vai para Em análise, porque ${v.id}, o pacote em vigor, está desatualizado.`;
  }
  return `Arquivar: a demanda continua em ${ROTULO[status]}.`;
}

// --- as vistas que os dublês devolvem ---

const resumo = (rid: string, versao: number): VersaoResumo => ({ id: rid, versao, criadaEm: CRIADO, autor: { tipo: 'pessoa', nome: 'Pessoa Ficticia' }, rascunhoAgente: false });
const aprovacao = (papel: 'cto' | 'administradora') => ({
  papel,
  nome: papel === 'cto' ? CTO.nome : ADM_NOME,
  opcao: 'A' as const,
  registradaEm: APROVADO,
  referenciaDocumento: papel === 'cto' ? null : 'DOC-FICTICIO-1',
  dataDocumento: papel === 'cto' ? null : '2099-12-29',
});

function vistaDoPacote(d: Dec, l: readonly Dec[], extra: Partial<PacoteDecisaoVista> = {}): PacoteDecisaoVista {
  const v = vigenteDe(l);
  const substituido = d.estado === 'aprovada' && v !== d;
  const decidido = d.estado !== 'pendente';
  return {
    id: d.id,
    demandaId: DEM,
    versao: d.versao,
    especificacaoId: ESP,
    parecerRiscoId: RSK,
    demandaTipo: 'melhoria',
    demandaTitulo: 'Relatório semanal (fictício)',
    demandaDescricao: 'Problema: fictício',
    resumoExecutivo: 'Resumo executivo fictício.',
    opcaoA: { descricao: 'Construir tudo (fictício)' },
    opcaoB: { descricao: 'Construir em duas entregas (fictício)' },
    recomendacao: null,
    nivelAprovacaoRequerido: d.nivel,
    autor: { tipo: 'pessoa', nome: CTO.nome },
    rascunhoAgente: false,
    criadaEm: CRIADO,
    statusDecisao: d.estado,
    aprovadores: d.estado !== 'aprovada' ? [] : d.nivel === 'cto' ? [aprovacao('cto')] : [aprovacao('cto'), aprovacao('administradora')],
    desatualizado: d.desatualizado,
    substituido,
    substituidoPor: substituido ? v!.id : null,
    decisao: decidido
      ? { opcaoEscolhida: d.estado === 'aprovada' ? 'A' : null, comentarios: null, decididaPor: d.estado === 'aprovada' && d.nivel !== 'cto' ? ADM_NOME : CTO.nome, decididaEm: APROVADO }
      : null,
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

function vistaDaDemanda(l: readonly Dec[], status: DemandaVista['status'], pacotesDecisao?: PacoteResumo[]): DemandaVista {
  const v = vigenteDe(l);
  return {
    id: DEM,
    titulo: 'Relatório semanal (fictício)',
    tipo: 'melhoria',
    status,
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
    especificacoes: [resumo(ESP, 1)],
    pareceresRisco: [resumo(RSK, 1)],
    // O mais novo primeiro, como a vista devolve.
    pacotesDecisao:
      pacotesDecisao ??
      [...l].reverse().map((d) => ({
        ...resumo(d.id, d.versao),
        statusDecisao: d.estado,
        desatualizado: d.desatualizado,
        substituido: d.estado === 'aprovada' && v !== d,
        substituidoPor: d.estado === 'aprovada' && v !== d ? v!.id : null,
      })),
    agentesEmAndamento: [],
    andamento: null,
  };
}

// Prepara os dublês para a lista; `releitura` troca a vista de um DEC só na segunda leitura dele (a corrida da D-12).
function preparar(l: readonly Dec[], status: DemandaVista['status'], releitura?: { id: string; vista: PacoteDecisaoVista }): void {
  const lidos = new Set<string>();
  mPacote.mockImplementation(async (_db, pid) => {
    const d = l.find((x) => x.id === pid);
    if (!d) throw new Error(`pacote não preparado no teste: ${pid}`);
    const segunda = lidos.has(pid) || (releitura?.id === pid && lidos.size > 0);
    lidos.add(pid);
    return segunda && releitura?.id === pid ? releitura.vista : vistaDoPacote(d, l);
  });
  mDemanda.mockResolvedValue(vistaDaDemanda(l, status));
  const v = vigenteDe(l);
  mVigente.mockResolvedValue(v ? ({ id: v.id, nivel: v.nivel, desatualizado: v.desatualizado } satisfies VigenteDaDemanda) : null);
}

async function pagina(decId: string): Promise<string> {
  return renderToStaticMarkup(await PaginaDecisao({ params: Promise.resolve({ decId }), searchParams: Promise.resolve({}) }));
}

// O <div> do Alerta que contém o texto, inteiro (sem alerta aninhado).
function alertaCom(s: string, trecho: string): string | undefined {
  const fim = s.indexOf(trecho);
  if (fim < 0) return undefined;
  const inicio = s.lastIndexOf('<div', fim);
  return s.slice(inicio, s.indexOf('</div>', fim) + '</div>'.length);
}
// Os <a> do trecho: [href, classe, texto].
const links = (trecho: string): Array<[string | undefined, string | undefined, string]> =>
  [...trecho.matchAll(/<a ([^>]*)>([^<]*)<\/a>/g)].map((m) => [/\bhref="([^"]*)"/.exec(m[1]!)?.[1], /\bclass="([^"]*)"/.exec(m[1]!)?.[1], m[2]!]);
const dicaNaPagina = (s: string) => /<p id="decisao-consequencia-arquivar"[^>]*>([^<]*)<\/p>/.exec(s)?.[1];

// Confere a página de um estado; devolve as divergências (vazio quando tudo bate).
// `vigenteForcado`: só nos casos plantados, o dublê do banco devolve outro vigente que não o do modelo.
async function conferir(l: readonly Dec[], aberto: Dec, status: DemandaVista['status'], vigenteForcado?: VigenteDaDemanda | null): Promise<string[]> {
  preparar(l, status);
  if (vigenteForcado !== undefined) mVigente.mockResolvedValue(vigenteForcado);
  mPacote.mockClear();
  const s = await pagina(aberto.id);
  const desc = `[${l.map((d) => `v${d.versao}:${d.nivel === 'cto' ? 'cto' : 'dupla'}/${d.estado}${d.desatualizado ? '/desat' : ''}`).join(' ')}] aberto v${aberto.versao}, ${status}`;
  const erros: string[] = [];
  const e = esperado(l, aberto, status);
  const presentes = INICIOS.filter((i) => s.includes(i));
  if (!e) {
    if (presentes.length > 0) erros.push(`${desc}: aviso falso na página (${presentes.join(' | ')})`);
  } else {
    if (presentes.length !== 1) erros.push(`${desc}: ${presentes.length} avisos na página`);
    const bloco = alertaCom(s, e.texto);
    if (!bloco) erros.push(`${desc}: sem o texto exato esperado`);
    else {
      if (!bloco.includes(`<p class="[overflow-wrap:anywhere]">${e.texto}</p>`)) erros.push(`${desc}: o <p> do aviso não é o da 03`);
      if (bloco.includes('role=')) erros.push(`${desc}: aviso com role`);
      if (!/^<div class="[^"]*\bbg-atencao-fundo\b/.test(bloco)) erros.push(`${desc}: aviso fora do Alerta atencao`);
      const ls = links(bloco);
      if (ls.length !== 1 || ls[0]![0] !== e.href || ls[0]![1] !== CLASSE_LINK_SOLTO || ls[0]![2] !== e.rotulo) erros.push(`${desc}: link do aviso ${JSON.stringify(ls)}`);
    }
  }
  // D-12: o mais novo só é lido com o aberto vigente e o mais novo outro, pendente e atualizado.
  const maisNovo = l[l.length - 1]!;
  const v = vigenteDe(l);
  const lerMaisNovo = v === aberto && maisNovo !== aberto && maisNovo.estado === 'pendente' && !maisNovo.desatualizado;
  const lidos = mPacote.mock.calls.map((c) => c[1]);
  const lidosEsperados = lerMaisNovo ? [aberto.id, maisNovo.id] : [aberto.id];
  if (JSON.stringify(lidos) !== JSON.stringify(lidosEsperados)) erros.push(`${desc}: leituras ${JSON.stringify(lidos)}`);
  // A dica do Arquivar, quando o formulário aparece, é a da 4.6.
  const dica = dicaNaPagina(s);
  if (dica !== undefined && dica !== dicaEsperada(status, v)) erros.push(`${desc}: dica "${dica}"`);
  if (aberto.estado === 'pendente' && aberto === maisNovo && dica === undefined) erros.push(`${desc}: sem o formulário no pendente mais novo`);
  return erros;
}

beforeEach(() => {
  vi.clearAllMocks();
  mExigir.mockResolvedValue(CTO);
  mRecebimento.mockResolvedValue(null);
  mVigente.mockResolvedValue(null);
});

describe('T11 em todo estado de uma demanda com um ou dois DECs: o aviso só quando é verdade (03, 4.2; CA-06.1 a CA-06.4)', () => {
  const ESTADOS_DA_DEMANDA: Array<DemandaVista['status']> = ['pronta_para_decisao', 'aprovada', 'entregue', 'encerrada'];

  it.each(ESTADOS_DA_DEMANDA)('demanda em %s', async (status) => {
    const erros: string[] = [];
    let paginas = 0;
    const vistos = { a: 0, b: 0, c: 0 };
    for (const l of [...listas(1), ...listas(2)]) {
      for (const aberto of l) {
        erros.push(...(await conferir(l, aberto, status)));
        paginas++;
        const e = esperado(l, aberto, status);
        if (e?.texto.startsWith('Esta demanda')) vistos.a++;
        else if (e?.texto.startsWith('Há um pacote')) vistos.b++;
        else if (e) vistos.c++;
      }
    }
    expect(paginas).toBe(16 + 2 * 256);
    expect(erros.length, erros.slice(0, 8).join('\n')).toBe(0);
    // Fora do status final, com dois DECs: (a) no v2 pendente atualizado sobre o v1 aprovado (3 pares de nível × o v1
    // atualizado ou não); (c) no par só do CTO sobre dupla (× 2); (b) no v1 vigente com o v2 pendente atualizado (3 × 2).
    if (status === 'entregue' || status === 'encerrada') expect(vistos).toEqual({ a: 0, b: 0, c: 0 });
    else expect(vistos).toEqual({ a: 6, b: 6, c: 2 });
  });

  // A conferência lê a página de verdade: com o banco dublê mentindo sobre o vigente, ela acusa o aviso falso, o aviso
  // que falta e a dica errada.
  it('casos plantados: a conferência acusa o aviso falso, o aviso que falta e a dica errada', async () => {
    const pend: Dec = { id: id(2), versao: 2, nivel: 'cto', estado: 'pendente', desatualizado: false };
    const semVigente = [{ id: id(1), versao: 1, nivel: 'cto', estado: 'devolvida', desatualizado: false } satisfies Dec, pend];
    const falso = await conferir(semVigente, pend, 'pronta_para_decisao', { id: id(1), nivel: 'cto', desatualizado: false });
    expect(falso.some((e) => e.includes('aviso falso'))).toBe(true);
    expect(falso.some((e) => e.includes('dica'))).toBe(true);
    const comVigente = [{ id: id(1), versao: 1, nivel: 'cto', estado: 'aprovada', desatualizado: false } satisfies Dec, pend];
    const falta = await conferir(comVigente, pend, 'pronta_para_decisao', null);
    expect(falta.some((e) => e.includes('sem o texto exato'))).toBe(true);
    expect(falta.some((e) => e.includes('dica'))).toBe(true);
    expect(await conferir(comVigente, pend, 'pronta_para_decisao')).toEqual([]);
  });
});

describe('corridas e estados de três DECs (o aviso que seria falso não aparece)', () => {
  const dec = (versao: number, nivel: NivelAprovacao, estado: Estado, desatualizado = false): Dec => ({ id: id(versao), versao, nivel, estado, desatualizado });

  it('o v1 substituído pelo v2, com o v3 pendente: no v1, só o aviso do substituído (sem o (b)); no v2, o (b) cita o v3', async () => {
    const l = [dec(1, 'cto', 'aprovada'), dec(2, 'cto', 'aprovada'), dec(3, 'cto', 'pendente')];
    preparar(l, 'aprovada');
    const v1 = await pagina(id(1));
    expect(v1).toContain(`Este pacote foi substituído por ${id(2)}`);
    for (const i of INICIOS) expect(v1).not.toContain(i);
    expect(mPacote.mock.calls.map((c) => c[1])).toEqual([id(1)]);
    mPacote.mockClear();
    const v2 = await pagina(id(2));
    expect(alertaCom(v2, TEXTO_B(id(3)))).toContain(`<p class="[overflow-wrap:anywhere]">${TEXTO_B(id(3))}</p>`);
    expect(mPacote.mock.calls.map((c) => c[1])).toEqual([id(2), id(3)]);
  });

  it('o v3 pendente com o v2 pendente mais velho e o v1 vigente: (a) só no v3; o v2 (que não pode ser decidido) nada', async () => {
    const l = [dec(1, 'cto', 'aprovada'), dec(2, 'cto', 'pendente'), dec(3, 'cto_e_administradora', 'pendente')];
    preparar(l, 'pronta_para_decisao');
    expect(await pagina(id(3))).toContain(TEXTO_A(id(1)));
    const v2 = await pagina(id(2));
    for (const i of INICIOS) expect(v2).not.toContain(i);
  });

  it('corrida: o mais novo, pendente e atualizado na vista da demanda, já está decidido na releitura → nenhum (b)', async () => {
    for (const estado of ['aprovada', 'devolvida', 'arquivada'] as const) {
      const l = [dec(1, 'cto', 'aprovada'), dec(2, 'cto', 'pendente')];
      const decidido = vistaDoPacote(dec(2, 'cto', estado), [dec(1, 'cto', 'aprovada'), dec(2, 'cto', estado)]);
      preparar(l, 'pronta_para_decisao', { id: id(2), vista: decidido });
      const s = await pagina(id(1));
      expect(mPacote.mock.calls.map((c) => c[1]), estado).toEqual([id(1), id(2)]);
      for (const i of INICIOS) expect(s, estado).not.toContain(i);
      mPacote.mockClear();
    }
  });

  it('corrida: o mais novo ficou desatualizado entre a vista da demanda e a releitura → nenhum (b)', async () => {
    const l = [dec(1, 'cto', 'aprovada'), dec(2, 'cto', 'pendente')];
    preparar(l, 'pronta_para_decisao', { id: id(2), vista: vistaDoPacote(dec(2, 'cto', 'pendente', true), l) });
    const s = await pagina(id(1));
    expect(mPacote.mock.calls.map((c) => c[1])).toEqual([id(1), id(2)]);
    for (const i of INICIOS) expect(s).not.toContain(i);
  });

  it('o nível do mais novo vem da releitura (a vista da demanda não o tem): só do CTO sobre o v1 de dupla → nenhum (b)', async () => {
    const l = [dec(1, 'cto_e_administradora', 'aprovada'), dec(2, 'cto', 'pendente')];
    preparar(l, 'pronta_para_decisao');
    const s = await pagina(id(1));
    expect(mPacote.mock.calls.map((c) => c[1])).toEqual([id(1), id(2)]);
    for (const i of INICIOS) expect(s).not.toContain(i);
  });
});

describe('SB-12 (d) na página: id fora do formato vindo do banco nunca vira texto nem link', () => {
  const dec = (versao: number, nivel: NivelAprovacao, estado: Estado): Dec => ({ id: id(versao), versao, nivel, estado, desatualizado: false });
  const RUINS = ['DEC-DEM-1-v1<script>', `${id(1)}/../../demandas`, 'javascript:alert(1)', `${id(1)}?x=1`];

  it('vigente com id fora do formato e a demanda em Aprovada (a dica não cita o vigente): nenhum aviso, e o valor fora do HTML', async () => {
    for (const ruim of RUINS) {
      const l = [dec(1, 'cto', 'aprovada'), dec(2, 'cto_e_administradora', 'pendente')];
      preparar(l, 'aprovada');
      mVigente.mockResolvedValue({ id: ruim, nivel: 'cto', desatualizado: false });
      const s = await pagina(id(2));
      for (const i of INICIOS) expect(s, ruim).not.toContain(i);
      expect(s, ruim).not.toContain(ruim);
      expect(s, ruim).not.toContain(ruim.replace('<', '&lt;'));
      expect(dicaNaPagina(s), ruim).toBe('Arquivar: a demanda continua em Aprovada.');
    }
  });

  it('vigente com id fora do formato e a dica que o citaria (Pronta para decisão): a página falha sem o valor na mensagem (D-13)', async () => {
    for (const ruim of RUINS) {
      const l = [dec(1, 'cto', 'aprovada'), dec(2, 'cto', 'pendente')];
      preparar(l, 'pronta_para_decisao');
      mVigente.mockResolvedValue({ id: ruim, nivel: 'cto', desatualizado: false });
      const erro = await pagina(id(2)).then(
        () => null,
        (e: unknown) => e as Error,
      );
      expect(erro, ruim).toBeInstanceOf(Error);
      expect(erro!.message, ruim).not.toContain(ruim);
    }
  });

  it('o mais novo da vista da demanda com id fora do formato: não é lido e não vira (b)', async () => {
    for (const ruim of RUINS) {
      const l = [dec(1, 'cto', 'aprovada')];
      preparar(l, 'aprovada');
      const lista = vistaDaDemanda(l, 'aprovada').pacotesDecisao;
      mDemanda.mockResolvedValue(vistaDaDemanda(l, 'aprovada', [{ ...resumo(ruim, 2), statusDecisao: 'pendente', desatualizado: false, substituido: false, substituidoPor: null }, ...lista]));
      const s = await pagina(id(1));
      for (const i of INICIOS) expect(s, ruim).not.toContain(i);
      expect(s, ruim).not.toContain(ruim);
      // lerPacoteDaPagina recusa o id pela regex antes do banco: só o aberto foi lido.
      expect(mPacote.mock.calls.map((c) => c[1]), ruim).toEqual([id(1)]);
      mPacote.mockClear();
    }
  });
});
