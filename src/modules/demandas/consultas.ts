// Leitura de demandas (RF-06). Nenhuma leitura daqui toca `entrada_bruta`: o texto bruto e a origem só saem pela
// leitura própria de pessoa (T17), nunca na vista da demanda. A autoria aparece como `responsavel` (pessoa pelo nome da
// conta, agente pelo nome do agente), nunca pelo id interno da conta.
import { and, asc, count, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import type pg from 'pg';
import type { Db } from '../../db';
import { decisao, demanda, especificacaoTecnica, execucaoAgente, pacoteDecisao, parecerRisco, user } from '../../db/schema';
import type { Anexo, LinhaServico, PapelSolicitante, Urgencia } from '../../db/schema/demandas';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { AGENTES, atorDesconhecido, ehIntegracao, type Agente, type Ator, type AtorIntegracao, type Integracao } from '../acesso/ator';
import { MENSAGENS_ACESSO } from '../acesso/mensagens';
import { minimizarValor } from '../dados-pessoais/minimizar';
import { executarComOrcamento } from '../integracoes/tempo-limite';
import { condicaoVisivelAoAgente, exigirVisivelPara } from './confirmacao';
import { expressaoDesatualizado } from '../pacotes-decisao/desatualizado';
import { expressaoSubstituidoPor } from '../pacotes-decisao/substituido';
import type { FiltroDemandas, OrigemDaDemanda, Status, Tipo } from './schemas';

// `nome` nulo só quando a conta não existe mais (o app não apaga conta; a desativação mantém a linha). A integração
// (0.3.0) aparece pelo nome da lista.
export type Responsavel = { tipo: 'pessoa'; nome: string | null } | { tipo: 'agente'; agente: Agente } | { tipo: 'integracao'; integracao: Integracao };
export type StatusDecisao = 'pendente' | 'aprovada' | 'devolvida' | 'arquivada';

export type VersaoResumo = { id: string; versao: number; criadaEm: Date; autor: Responsavel; rascunhoAgente: boolean };
// `substituido` e `substituidoPor` (0.1.13): os mesmos da vista do DEC (pacotes-decisao/substituido.ts).
export type PacoteResumo = VersaoResumo & { statusDecisao: StatusDecisao; desatualizado: boolean; substituido: boolean; substituidoPor: string | null };
// T-03: o aviso "agente trabalhando" da T05, lido da execução, sem ler o esquema do pg-boss.
export type AgenteEmAndamento = { agente: Agente; status: 'pendente' | 'em_andamento' };

export type DemandaVista = {
  id: string;
  titulo: string;
  tipo: Tipo;
  status: Status;
  solicitanteNome: string;
  solicitantePapel: PapelSolicitante | null;
  linhaServicoProvavel: LinhaServico | null;
  urgencia: Urgencia | null;
  justificativaUrgencia: string | null;
  contexto: string | null;
  descricaoProblema: string | null;
  impactoPercebido: string | null;
  anexos: Anexo[];
  duvidasEntrada: string[];
  rascunhoAgente: boolean;
  responsavel: Responsavel;
  criadaEm: Date;
  atualizadaEm: Date;
  especificacoes: VersaoResumo[];
  pareceresRisco: VersaoResumo[];
  pacotesDecisao: PacoteResumo[];
  agentesEmAndamento: AgenteEmAndamento[];
};

// `origem` (RF-10 do 0016): enumeração sem dado pessoal, a mesma para pessoa e agente (04, C06). O id do autor nunca sai.
export type DemandaResumo = {
  id: string;
  titulo: string;
  tipo: Tipo;
  status: Status;
  urgencia: Urgencia | null;
  linhaServicoProvavel: LinhaServico | null;
  rascunhoAgente: boolean;
  origem: OrigemDaDemanda;
  criadaEm: Date;
};

const ehAgente = (v: string): v is Agente => (AGENTES as readonly string[]).includes(v);

// RF-10 do 0016: a origem vem da autoria gravada, nunca do solicitanteNome (que a pessoa edita). Pessoa e agente pelo
// tipo; integração só o awave, que é a única que cria demanda (CHECK demanda_autor_integracao_check). Fora disso é linha
// corrompida, como em responsavelDe, e vira 500.
export function origemDaAutoria(autorTipo: string, autorId: string): OrigemDaDemanda {
  switch (autorTipo) {
    case 'pessoa':
      return 'pessoa';
    case 'agente':
      return 'agente';
    case 'integracao':
      if (autorId === 'awave') return 'awave';
      break;
  }
  throw new Error('autoria desconhecida');
}

// A mesma regra a partir do responsável da vista (o detalhe da demanda, que já carrega `responsavel`).
export function origemDoResponsavel(r: Responsavel): OrigemDaDemanda {
  switch (r.tipo) {
    case 'pessoa':
      return 'pessoa';
    case 'agente':
      return 'agente';
    case 'integracao':
      if (r.integracao === 'awave') return 'awave';
      throw new Error('autoria desconhecida');
    default:
      return atorDesconhecido(r);
  }
}

function origemDesconhecida(nunca: never): never {
  void nunca;
  throw new Error('origem desconhecida');
}

// O filtro por origem (C-17): a origem já passou pelo enum do Zod, e o SQL só recebe os valores fixos daqui, por
// parâmetro (`eq`). O awave usa o índice demanda_autor_criada_idx (autor_tipo, autor_id, criada_em) inteiro.
export function condicaoDaOrigem(o: OrigemDaDemanda): SQL {
  switch (o) {
    case 'pessoa':
      return eq(demanda.autorTipo, 'pessoa');
    case 'agente':
      return eq(demanda.autorTipo, 'agente');
    case 'awave':
      return and(eq(demanda.autorTipo, 'integracao'), eq(demanda.autorId, 'awave'))!;
    default:
      return origemDesconhecida(o);
  }
}

// Exportada para as leituras de ESP, RSK e DEC (T18 a T20): a mesma autoria visível em toda vista.
export function responsavelDe(autorTipo: string, autorId: string, nome: string | null): Responsavel {
  switch (autorTipo) {
    case 'pessoa':
      return { tipo: 'pessoa', nome };
    case 'agente':
      if (ehAgente(autorId)) return { tipo: 'agente', agente: autorId };
      break;
    case 'integracao':
      if (ehIntegracao(autorId)) return { tipo: 'integracao', integracao: autorId };
      break;
  }
  // Gravado só a partir de um ator resolvido (C-11) e dos CHECK; fora da lista é linha corrompida, e vira 500.
  throw new Error('autoria desconhecida');
}

type TabelaVersionada = typeof especificacaoTecnica | typeof parecerRisco | typeof pacoteDecisao;

// A junção com `user` só vale para autor pessoa: um agente nunca casa com uma conta.
export const contaDoAutor = (t: typeof demanda | TabelaVersionada): SQL => and(eq(t.autorTipo, 'pessoa'), eq(user.id, t.autorId))!;

async function versoesDe(db: Db, tabela: typeof especificacaoTecnica | typeof parecerRisco, demandaId: string): Promise<VersaoResumo[]> {
  const linhas = await db
    .select({
      id: tabela.id,
      versao: tabela.versao,
      criadaEm: tabela.criadaEm,
      autorTipo: tabela.autorTipo,
      autorId: tabela.autorId,
      rascunhoAgente: tabela.rascunhoAgente,
      nome: user.name,
    })
    .from(tabela)
    .leftJoin(user, contaDoAutor(tabela))
    .where(eq(tabela.demandaId, demandaId))
    .orderBy(desc(tabela.versao));
  return linhas.map((l) => ({
    id: l.id,
    versao: l.versao,
    criadaEm: l.criadaEm,
    autor: responsavelDe(l.autorTipo, l.autorId, l.nome),
    rascunhoAgente: l.rascunhoAgente,
  }));
}

async function pacotesDe(db: Db, demandaId: string): Promise<PacoteResumo[]> {
  const linhas = await db
    .select({
      id: pacoteDecisao.id,
      versao: pacoteDecisao.versao,
      criadaEm: pacoteDecisao.criadaEm,
      autorTipo: pacoteDecisao.autorTipo,
      autorId: pacoteDecisao.autorId,
      rascunhoAgente: pacoteDecisao.rascunhoAgente,
      nome: user.name,
      statusDecisao: decisao.statusDecisao,
      desatualizado: sql<boolean>`${expressaoDesatualizado()}`,
      substituidoPor: sql<string | null>`${expressaoSubstituidoPor()}`,
    })
    .from(pacoteDecisao)
    .leftJoin(user, contaDoAutor(pacoteDecisao))
    .leftJoin(decisao, eq(decisao.pacoteDecisaoId, pacoteDecisao.id))
    .where(eq(pacoteDecisao.demandaId, demandaId))
    .orderBy(desc(pacoteDecisao.versao));
  return linhas.map((l) => {
    const statusDecisao = l.statusDecisao ?? 'pendente';
    // Só o DEC aprovado é substituído, como na vista do DEC.
    const substituidoPor = statusDecisao === 'aprovada' ? (l.substituidoPor ?? null) : null;
    return {
      id: l.id,
      versao: l.versao,
      criadaEm: l.criadaEm,
      autor: responsavelDe(l.autorTipo, l.autorId, l.nome),
      rascunhoAgente: l.rascunhoAgente,
      statusDecisao,
      desatualizado: l.desatualizado === true,
      substituido: substituidoPor !== null,
      substituidoPor,
    };
  });
}

const EM_ANDAMENTO = ['pendente', 'em_andamento'] as const;
const estaEmAndamento = (s: string): s is AgenteEmAndamento['status'] => (EM_ANDAMENTO as readonly string[]).includes(s);

// Execuções pendentes ou em andamento da demanda, da mais antiga para a mais nova (índice execucao_agente_demanda_status_idx).
async function agentesEmAndamentoDe(db: Db, demandaId: string): Promise<AgenteEmAndamento[]> {
  const linhas = await db
    .select({ agente: execucaoAgente.agente, status: execucaoAgente.status })
    .from(execucaoAgente)
    .where(and(eq(execucaoAgente.demandaId, demandaId), inArray(execucaoAgente.status, [...EM_ANDAMENTO])))
    .orderBy(asc(execucaoAgente.criadaEm), asc(execucaoAgente.id));
  return linhas.flatMap((l) => (estaEmAndamento(l.status) ? [{ agente: l.agente, status: l.status }] : []));
}

export async function obterDemanda(db: Db, id: string): Promise<DemandaVista> {
  const [linha] = await db.select({ d: demanda, nome: user.name }).from(demanda).leftJoin(user, contaDoAutor(demanda)).where(eq(demanda.id, id));
  if (!linha) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);
  const { d, nome } = linha;
  // Em sequência: `db` pode ser a transação de quem chama, que tem uma conexão só.
  const especificacoes = await versoesDe(db, especificacaoTecnica, id);
  const pareceresRisco = await versoesDe(db, parecerRisco, id);
  const pacotesDecisao = await pacotesDe(db, id);
  const agentesEmAndamento = await agentesEmAndamentoDe(db, id);
  return {
    id: d.id,
    titulo: d.titulo,
    tipo: d.tipo,
    status: d.status,
    solicitanteNome: d.solicitanteNome,
    solicitantePapel: d.solicitantePapel,
    linhaServicoProvavel: d.linhaServicoProvavel,
    urgencia: d.urgencia,
    justificativaUrgencia: d.justificativaUrgencia,
    contexto: d.contexto,
    descricaoProblema: d.descricaoProblema,
    impactoPercebido: d.impactoPercebido,
    anexos: d.anexos,
    duvidasEntrada: d.duvidasEntrada,
    rascunhoAgente: d.rascunhoAgente,
    responsavel: responsavelDe(d.autorTipo, d.autorId, nome),
    criadaEm: d.criadaEm,
    atualizadaEm: d.atualizadaEm,
    especificacoes,
    pareceresRisco,
    pacotesDecisao,
    agentesEmAndamento,
  };
}

// M-06 (C-10, RF-20): a vista para quem não é pessoa. Sem solicitanteNome e anexos (as chaves somem), e a autoria de
// pessoa sem o nome da conta, na demanda e nas versões; a autoria de agente fica igual. O mesmo critério da entrada do
// agente (entrada-agente.ts).
export type ResponsavelMinimo = { tipo: 'pessoa' } | { tipo: 'agente'; agente: Agente } | { tipo: 'integracao'; integracao: Integracao };
export type VersaoResumoMinima = Omit<VersaoResumo, 'autor'> & { autor: ResponsavelMinimo };
export type PacoteResumoMinimo = Omit<PacoteResumo, 'autor'> & { autor: ResponsavelMinimo };
export type DemandaVistaMinima = Omit<DemandaVista, 'solicitanteNome' | 'anexos' | 'responsavel' | 'especificacoes' | 'pareceresRisco' | 'pacotesDecisao'> & {
  responsavel: ResponsavelMinimo;
  especificacoes: VersaoResumoMinima[];
  pareceresRisco: VersaoResumoMinima[];
  pacotesDecisao: PacoteResumoMinimo[];
};

// Exportada para as vistas mínimas de ESP, RSK e DEC (M-2 do 0008): uma regra só de autoria para quem não é pessoa.
// Montado chave a chave por tipo (IN-02): a integração não vira agente, e o nome da conta da pessoa não sai.
export function responsavelMinimo(r: Responsavel): ResponsavelMinimo {
  switch (r.tipo) {
    case 'pessoa':
      return { tipo: 'pessoa' };
    case 'agente':
      return { tipo: 'agente', agente: r.agente };
    case 'integracao':
      return { tipo: 'integracao', integracao: r.integracao };
    default:
      return atorDesconhecido(r);
  }
}

// Integração em vista ou listagem que ela não tem (IN-02, D-01): a mesma recusa da matriz.
export const semPermissao = (): ErroDominio => new ErroDominio('sem_permissao', MENSAGENS_ACESSO.sem_permissao);

// M-1 do 0008 (RF-20): o texto livre passa pelo mesmo `minimizar` da entrada do agente, com o nome do solicitante da
// própria demanda. Nulo continua nulo. Exportados para as vistas mínimas de ESP, RSK e DEC (M-a do 0009): uma regra só.
export const nomesDoSolicitante = (nome: string | null): string[] => (nome === null ? [] : [nome]);
export const textoMinimo = (s: string, nomes: readonly string[]): string => minimizarValor(s, nomes) as string;
export const textoMinimoOuNulo = (s: string | null, nomes: readonly string[]): string | null => (s === null ? null : textoMinimo(s, nomes));
export const listaMinima = (xs: readonly string[], nomes: readonly string[]): string[] => xs.map((x) => textoMinimo(x, nomes));
export const listaMinimaOuNula = (xs: readonly string[] | null, nomes: readonly string[]): string[] | null => (xs === null ? null : listaMinima(xs, nomes));

// M-a do 0009: os nomes do solicitante de cada demanda, numa consulta só, para a vista mínima de ESP, RSK e DEC (que
// não carregam o `solicitanteNome`). Demanda que não existe fica fora do mapa; quem lê usa lista vazia.
export async function nomesDosSolicitantes(db: Db, demandaIds: readonly string[]): Promise<Map<string, string[]>> {
  const mapa = new Map<string, string[]>();
  const ids = [...new Set(demandaIds)];
  if (ids.length === 0) return mapa;
  const linhas = await db.select({ id: demanda.id, nome: demanda.solicitanteNome }).from(demanda).where(inArray(demanda.id, ids));
  for (const l of linhas) mapa.set(l.id, nomesDoSolicitante(l.nome));
  return mapa;
}

// Os nomes do solicitante de uma demanda só (as rotas de uma demanda ou de um artefato).
export async function nomesDaDemanda(db: Db, demandaId: string): Promise<string[]> {
  return (await nomesDosSolicitantes(db, [demandaId])).get(demandaId) ?? [];
}

const versaoMinima = (v: VersaoResumo): VersaoResumoMinima => ({
  id: v.id,
  versao: v.versao,
  criadaEm: v.criadaEm,
  autor: responsavelMinimo(v.autor),
  rascunhoAgente: v.rascunhoAgente,
});

// A integração é autora da demanda pela autoria gravada (nunca pelo solicitanteNome, que a pessoa edita).
const ehAutoraDa = (ator: AtorIntegracao, d: Pick<DemandaVista, 'responsavel'>): boolean =>
  d.responsavel.tipo === 'integracao' && d.responsavel.integracao === ator.integracao;

// Lista de permissão: só pessoa vê a vista inteira. Agente e sistema (D-05, o de hoje) recebem o objeto montado chave a
// chave, e um campo novo da vista não sai para o agente sem entrar aqui. Integração (IN-02, IN-08, D-16): só a vista de
// seis chaves (o 201 do POST do Awave), e só da demanda que ela criou; nunca recebe a do agente. O GET por id da
// integração não passa por aqui (lerDemandaPara); a conferência da autoria é defesa em profundidade.
export function vistaDaDemandaPara(ator: AtorIntegracao, d: DemandaVista): DemandaVistaDaIntegracao;
export function vistaDaDemandaPara(ator: Exclude<Ator, AtorIntegracao>, d: DemandaVista): DemandaVista | DemandaVistaMinima;
export function vistaDaDemandaPara(ator: Ator, d: DemandaVista): DemandaVista | DemandaVistaMinima | DemandaVistaDaIntegracao;
export function vistaDaDemandaPara(ator: Ator, d: DemandaVista): DemandaVista | DemandaVistaMinima | DemandaVistaDaIntegracao {
  switch (ator.tipo) {
    case 'pessoa':
      return d;
    case 'agente':
    case 'sistema':
      return vistaMinimaDaDemanda(d);
    case 'integracao':
      if (ehAutoraDa(ator, d)) return vistaDaIntegracao(d);
      throw semPermissao();
    default:
      return atorDesconhecido(ator);
  }
}

// IN-08 e ADR-23: o que a integração vê da demanda que ela criou. Seis chaves, sem texto livre, solicitante, autoria,
// versões nem execuções.
export type DemandaVistaDaIntegracao = { id: string; titulo: string; tipo: Tipo; status: Status; criadaEm: Date; atualizadaEm: Date };

// Lista de permissão, chave a chave: campo novo da demanda não sai para a integração sem entrar aqui (IN-08). O título
// passa pelo M-1, com o nome do solicitante atual.
export const vistaDaIntegracao = (
  d: Pick<DemandaVista, 'id' | 'titulo' | 'tipo' | 'status' | 'solicitanteNome' | 'criadaEm' | 'atualizadaEm'>,
): DemandaVistaDaIntegracao => ({
  id: d.id,
  titulo: textoMinimo(d.titulo, nomesDoSolicitante(d.solicitanteNome)),
  tipo: d.tipo,
  status: d.status,
  criadaEm: d.criadaEm,
  atualizadaEm: d.atualizadaEm,
});

// ADR-23 e D-16: a autoria entra no mesmo WHERE do id. Demanda de outro autor e id que não existe dão o mesmo
// "não encontrado", da mesma consulta, sem nenhuma leitura a mais num caso que no outro (sem oráculo de existência).
export async function obterDemandaDaIntegracao(db: Db, ator: AtorIntegracao, id: string): Promise<DemandaVistaDaIntegracao> {
  const [l] = await db
    .select({
      id: demanda.id,
      titulo: demanda.titulo,
      tipo: demanda.tipo,
      status: demanda.status,
      solicitanteNome: demanda.solicitanteNome,
      criadaEm: demanda.criadaEm,
      atualizadaEm: demanda.atualizadaEm,
    })
    .from(demanda)
    .where(and(eq(demanda.id, id), eq(demanda.autorTipo, 'integracao'), eq(demanda.autorId, ator.integracao)));
  if (!l) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);
  return vistaDaIntegracao(l);
}

// O GET por id decide pelo tipo do ator antes de qualquer leitura: integração nunca passa por obterDemanda (D-16) e lê
// na transação com o orçamento de tempo dela (ADR-28, IN-14). Pessoa segue como hoje. Agente e sistema (M-1 da 0019):
// a demanda que aguarda a confirmação de uma pessoa dá o mesmo 404 do id inexistente.
export async function lerDemandaPara(
  deps: { db: Db; pool: pg.Pool },
  ator: Ator,
  id: string,
): Promise<DemandaVista | DemandaVistaMinima | DemandaVistaDaIntegracao> {
  switch (ator.tipo) {
    case 'integracao':
      return executarComOrcamento(deps.pool, ator, 'padrao', undefined, ({ tx }) => obterDemandaDaIntegracao(tx, ator, id));
    case 'pessoa':
      return vistaDaDemandaPara(ator, await obterDemanda(deps.db, id));
    case 'agente':
    case 'sistema':
      await exigirVisivelPara(deps.db, ator, id);
      return vistaDaDemandaPara(ator, await obterDemanda(deps.db, id));
    default:
      return atorDesconhecido(ator);
  }
}

function vistaMinimaDaDemanda(d: DemandaVista): DemandaVistaMinima {
  const nomes = nomesDoSolicitante(d.solicitanteNome);
  return {
    id: d.id,
    titulo: textoMinimo(d.titulo, nomes),
    tipo: d.tipo,
    status: d.status,
    solicitantePapel: d.solicitantePapel,
    linhaServicoProvavel: d.linhaServicoProvavel,
    urgencia: d.urgencia,
    justificativaUrgencia: textoMinimoOuNulo(d.justificativaUrgencia, nomes),
    contexto: textoMinimoOuNulo(d.contexto, nomes),
    descricaoProblema: textoMinimoOuNulo(d.descricaoProblema, nomes),
    impactoPercebido: textoMinimoOuNulo(d.impactoPercebido, nomes),
    duvidasEntrada: listaMinima(d.duvidasEntrada, nomes),
    rascunhoAgente: d.rascunhoAgente,
    responsavel: responsavelMinimo(d.responsavel),
    criadaEm: d.criadaEm,
    atualizadaEm: d.atualizadaEm,
    especificacoes: d.especificacoes.map(versaoMinima),
    pareceresRisco: d.pareceresRisco.map(versaoMinima),
    pacotesDecisao: d.pacotesDecisao.map((p) => ({
      ...versaoMinima(p),
      statusDecisao: p.statusDecisao,
      desatualizado: p.desatualizado,
      substituido: p.substituido,
      substituidoPor: p.substituidoPor,
    })),
    agentesEmAndamento: d.agentesEmAndamento.map((a) => ({ agente: a.agente, status: a.status })),
  };
}

type PaginaDeDemandas = { itens: DemandaResumo[]; total: number; limit: number; offset: number };

// Uma consulta só para o painel e para a API. O `solicitanteNome` é lido só para a troca do M-1 e nunca sai no item; a
// autoria é lida só para a origem (RF-10 do 0016), e o `autorId` também nunca sai. `soVisiveisAoAgente` (M-1 da 0019):
// o mesmo `onde` dos itens e do total deixa de fora a demanda que aguarda confirmação.
async function paginaDeDemandas(db: Db, filtro: FiltroDemandas, op: { soVisiveisAoAgente: boolean } = { soVisiveisAoAgente: false }) {
  const onde = and(
    filtro.status ? eq(demanda.status, filtro.status) : undefined,
    filtro.tipo ? eq(demanda.tipo, filtro.tipo) : undefined,
    filtro.linhaServicoProvavel ? eq(demanda.linhaServicoProvavel, filtro.linhaServicoProvavel) : undefined,
    filtro.origem ? condicaoDaOrigem(filtro.origem) : undefined,
    op.soVisiveisAoAgente ? condicaoVisivelAoAgente() : undefined,
  );
  const linhas = await db
    .select({
      id: demanda.id,
      titulo: demanda.titulo,
      tipo: demanda.tipo,
      status: demanda.status,
      urgencia: demanda.urgencia,
      linhaServicoProvavel: demanda.linhaServicoProvavel,
      rascunhoAgente: demanda.rascunhoAgente,
      criadaEm: demanda.criadaEm,
      solicitanteNome: demanda.solicitanteNome,
      autorTipo: demanda.autorTipo,
      autorId: demanda.autorId,
    })
    .from(demanda)
    .where(onde)
    .orderBy(desc(demanda.criadaEm), desc(demanda.id))
    .limit(filtro.limit)
    .offset(filtro.offset);
  const [contagem] = await db.select({ n: count() }).from(demanda).where(onde);
  return { linhas, total: contagem?.n ?? 0, limit: filtro.limit, offset: filtro.offset };
}

type LinhaDaPagina = Awaited<ReturnType<typeof paginaDeDemandas>>['linhas'][number];

// O item é montado chave a chave: o `solicitanteNome` e o `autorId` da linha não saem para nenhum ator.
const resumoDe = (l: LinhaDaPagina, titulo: string): DemandaResumo => ({
  id: l.id,
  titulo,
  tipo: l.tipo,
  status: l.status,
  urgencia: l.urgencia,
  linhaServicoProvavel: l.linhaServicoProvavel,
  rascunhoAgente: l.rascunhoAgente,
  origem: origemDaAutoria(l.autorTipo, l.autorId),
  criadaEm: l.criadaEm,
});

export async function listarDemandas(db: Db, filtro: FiltroDemandas): Promise<PaginaDeDemandas> {
  const { linhas, ...resto } = await paginaDeDemandas(db, filtro);
  return { itens: linhas.map((l) => resumoDe(l, l.titulo)), ...resto };
}

// M-1 do 0008: a listagem da API. Lista de permissão: só pessoa vê o título original; qualquer outro ator recebe o
// título minimizado com o nome do solicitante do próprio item. Integração (IN-02): recusada antes de qualquer leitura (a
// matriz nega listar_demandas a toda integração; isto protege contra uso sem autorizar). M-1 da 0019: agente e sistema
// não veem a demanda que aguarda confirmação, nem nos itens nem no total.
export async function listarDemandasPara(db: Db, filtro: FiltroDemandas, ator: Ator): Promise<PaginaDeDemandas> {
  let soVisiveisAoAgente: boolean;
  switch (ator.tipo) {
    case 'pessoa':
      soVisiveisAoAgente = false;
      break;
    case 'agente':
    case 'sistema':
      soVisiveisAoAgente = true;
      break;
    case 'integracao':
      throw semPermissao();
    default:
      return atorDesconhecido(ator);
  }
  const { linhas, ...resto } = await paginaDeDemandas(db, filtro, { soVisiveisAoAgente });
  const ehPessoa = ator.tipo === 'pessoa';
  return { itens: linhas.map((l) => resumoDe(l, ehPessoa ? l.titulo : textoMinimo(l.titulo, nomesDoSolicitante(l.solicitanteNome)))), ...resto };
}
