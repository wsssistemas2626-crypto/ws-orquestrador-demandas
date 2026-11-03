// Leitura de demandas (RF-06). Nenhuma leitura daqui toca `entrada_bruta`: o texto bruto e a origem só saem pela
// leitura própria de pessoa (T17), nunca na vista da demanda. A autoria aparece como `responsavel` (pessoa pelo nome da
// conta, agente pelo nome do agente), nunca pelo id interno da conta.
import { and, asc, count, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import type { Db } from '../../db';
import { decisao, demanda, especificacaoTecnica, execucaoAgente, pacoteDecisao, parecerRisco, user } from '../../db/schema';
import type { Anexo, LinhaServico, PapelSolicitante, Urgencia } from '../../db/schema/demandas';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { AGENTES, type Agente, type Ator } from '../acesso/ator';
import { expressaoDesatualizado } from '../pacotes-decisao/desatualizado';
import type { FiltroDemandas, Status, Tipo } from './schemas';

// `nome` nulo só quando a conta não existe mais (o app não apaga conta; a desativação mantém a linha).
export type Responsavel = { tipo: 'pessoa'; nome: string | null } | { tipo: 'agente'; agente: Agente };
export type StatusDecisao = 'pendente' | 'aprovada' | 'devolvida' | 'arquivada';

export type VersaoResumo = { id: string; versao: number; criadaEm: Date; autor: Responsavel; rascunhoAgente: boolean };
export type PacoteResumo = VersaoResumo & { statusDecisao: StatusDecisao; desatualizado: boolean };
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

export type DemandaResumo = {
  id: string;
  titulo: string;
  tipo: Tipo;
  status: Status;
  urgencia: Urgencia | null;
  linhaServicoProvavel: LinhaServico | null;
  rascunhoAgente: boolean;
  criadaEm: Date;
};

const ehAgente = (v: string): v is Agente => (AGENTES as readonly string[]).includes(v);

// Exportada para as leituras de ESP, RSK e DEC (T18 a T20): a mesma autoria visível em toda vista.
export function responsavelDe(autorTipo: string, autorId: string, nome: string | null): Responsavel {
  if (autorTipo === 'pessoa') return { tipo: 'pessoa', nome };
  // O id do agente só é gravado a partir de um ator resolvido (C-11); fora da lista é linha corrompida, e vira 500.
  if (autorTipo === 'agente' && ehAgente(autorId)) return { tipo: 'agente', agente: autorId };
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
    })
    .from(pacoteDecisao)
    .leftJoin(user, contaDoAutor(pacoteDecisao))
    .leftJoin(decisao, eq(decisao.pacoteDecisaoId, pacoteDecisao.id))
    .where(eq(pacoteDecisao.demandaId, demandaId))
    .orderBy(desc(pacoteDecisao.versao));
  return linhas.map((l) => ({
    id: l.id,
    versao: l.versao,
    criadaEm: l.criadaEm,
    autor: responsavelDe(l.autorTipo, l.autorId, l.nome),
    rascunhoAgente: l.rascunhoAgente,
    statusDecisao: l.statusDecisao ?? 'pendente',
    desatualizado: l.desatualizado === true,
  }));
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
export type ResponsavelMinimo = { tipo: 'pessoa' } | { tipo: 'agente'; agente: Agente };
export type VersaoResumoMinima = Omit<VersaoResumo, 'autor'> & { autor: ResponsavelMinimo };
export type PacoteResumoMinimo = Omit<PacoteResumo, 'autor'> & { autor: ResponsavelMinimo };
export type DemandaVistaMinima = Omit<DemandaVista, 'solicitanteNome' | 'anexos' | 'responsavel' | 'especificacoes' | 'pareceresRisco' | 'pacotesDecisao'> & {
  responsavel: ResponsavelMinimo;
  especificacoes: VersaoResumoMinima[];
  pareceresRisco: VersaoResumoMinima[];
  pacotesDecisao: PacoteResumoMinimo[];
};

const responsavelMinimo = (r: Responsavel): ResponsavelMinimo => (r.tipo === 'pessoa' ? { tipo: 'pessoa' } : { tipo: 'agente', agente: r.agente });

const versaoMinima = (v: VersaoResumo): VersaoResumoMinima => ({
  id: v.id,
  versao: v.versao,
  criadaEm: v.criadaEm,
  autor: responsavelMinimo(v.autor),
  rascunhoAgente: v.rascunhoAgente,
});

// Lista de permissão: só pessoa vê a vista inteira. Para qualquer outro ator, o objeto é montado chave a chave, e um campo
// novo da vista não sai para o agente sem entrar aqui.
export function vistaDaDemandaPara(ator: Ator, d: DemandaVista): DemandaVista | DemandaVistaMinima {
  if (ator.tipo === 'pessoa') return d;
  return {
    id: d.id,
    titulo: d.titulo,
    tipo: d.tipo,
    status: d.status,
    solicitantePapel: d.solicitantePapel,
    linhaServicoProvavel: d.linhaServicoProvavel,
    urgencia: d.urgencia,
    justificativaUrgencia: d.justificativaUrgencia,
    contexto: d.contexto,
    descricaoProblema: d.descricaoProblema,
    impactoPercebido: d.impactoPercebido,
    duvidasEntrada: d.duvidasEntrada,
    rascunhoAgente: d.rascunhoAgente,
    responsavel: responsavelMinimo(d.responsavel),
    criadaEm: d.criadaEm,
    atualizadaEm: d.atualizadaEm,
    especificacoes: d.especificacoes.map(versaoMinima),
    pareceresRisco: d.pareceresRisco.map(versaoMinima),
    pacotesDecisao: d.pacotesDecisao.map((p) => ({ ...versaoMinima(p), statusDecisao: p.statusDecisao, desatualizado: p.desatualizado })),
    agentesEmAndamento: d.agentesEmAndamento.map((a) => ({ agente: a.agente, status: a.status })),
  };
}

export async function listarDemandas(
  db: Db,
  filtro: FiltroDemandas,
): Promise<{ itens: DemandaResumo[]; total: number; limit: number; offset: number }> {
  const onde = and(
    filtro.status ? eq(demanda.status, filtro.status) : undefined,
    filtro.tipo ? eq(demanda.tipo, filtro.tipo) : undefined,
    filtro.linhaServicoProvavel ? eq(demanda.linhaServicoProvavel, filtro.linhaServicoProvavel) : undefined,
  );
  const itens = await db
    .select({
      id: demanda.id,
      titulo: demanda.titulo,
      tipo: demanda.tipo,
      status: demanda.status,
      urgencia: demanda.urgencia,
      linhaServicoProvavel: demanda.linhaServicoProvavel,
      rascunhoAgente: demanda.rascunhoAgente,
      criadaEm: demanda.criadaEm,
    })
    .from(demanda)
    .where(onde)
    .orderBy(desc(demanda.criadaEm), desc(demanda.id))
    .limit(filtro.limit)
    .offset(filtro.offset);
  const [contagem] = await db.select({ n: count() }).from(demanda).where(onde);
  return { itens, total: contagem?.n ?? 0, limit: filtro.limit, offset: filtro.offset };
}
