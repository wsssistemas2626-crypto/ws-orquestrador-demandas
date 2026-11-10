// Leitura do pacote de decisão (RF-10, RF-12, RF-23). `statusDecisao`, `aprovadores` e `decisao` são derivados das
// tabelas `decisao` e `aprovacao` (pendente = sem linha em decisao); `desatualizado` é a mesma expressão que a transição
// para `aprovada` usa (RF-07, RF-12); `substituido` e `substituidoPor` (0.1.13) vêm de expressaoSubstituidoPor. A autoria aparece como nas outras versões: pessoa pelo nome da conta, agente pelo
// nome do agente, nunca pelo id interno da conta. `especificacaoCitada` e `niveisRisco` existem para a revisão visível
// na tela de decisão (C-14); são os da ESP e do RSK citados, e não os mais novos.
import { asc, count, desc, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { Db } from '../../db';
import { aprovacao, decisao, demanda, especificacaoTecnica, pacoteDecisao, parecerRisco, user } from '../../db/schema';
import type { NivelAprovacao, Opcao, OpcaoDecisao, PapelAprovacao } from '../../db/schema/decisao';
import type { TipoDemanda } from '../../db/schema/demandas';
import type { NivelRisco } from '../../db/schema/versoes';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import type { Ator } from '../acesso/ator';
import {
  contaDoAutor,
  listaMinimaOuNula,
  responsavelDe,
  responsavelMinimo,
  textoMinimo,
  textoMinimoOuNulo,
  type Responsavel,
  type ResponsavelMinimo,
  type StatusDecisao,
} from '../demandas/consultas';
import { expressaoDesatualizado } from './desatualizado';
import type { FiltroPacotes } from './schemas';
import { expressaoSubstituidoPor } from './substituido';

export type Aprovador = {
  papel: PapelAprovacao;
  nome: string;
  opcao: OpcaoDecisao;
  registradaEm: Date;
  referenciaDocumento: string | null;
  dataDocumento: string | null;
};

// `decididaPor` é o nome da conta de quem registrou; nulo só se a conta não existir mais.
export type DecisaoVista = { opcaoEscolhida: OpcaoDecisao | null; comentarios: string | null; decididaPor: string | null; decididaEm: Date };

export type PacoteDecisaoVista = {
  id: string;
  demandaId: string;
  versao: number;
  especificacaoId: string;
  parecerRiscoId: string;
  demandaTipo: TipoDemanda;
  demandaTitulo: string;
  demandaDescricao: string;
  resumoExecutivo: string;
  opcaoA: Opcao;
  opcaoB: Opcao;
  recomendacao: string | null;
  nivelAprovacaoRequerido: NivelAprovacao;
  autor: Responsavel;
  rascunhoAgente: boolean;
  criadaEm: Date;
  statusDecisao: StatusDecisao;
  aprovadores: Aprovador[];
  desatualizado: boolean;
  // 0.1.13: aprovado e substituído por um aprovado mais novo da demanda (substituido.ts); `substituidoPor` é o id do
  // aprovado mais novo atual. Fora de `aprovada`, `false` e `null`.
  substituido: boolean;
  substituidoPor: string | null;
  decisao: DecisaoVista | null;
  rascunhosCitados: string[];
  especificacaoCitada: {
    sistemaAlvo: string | null;
    repositorioDestino: string | null;
    criteriosAceitePreliminares: string[] | null;
    definicaoDePronto: string[] | null;
  };
  niveisRisco: { tecnico: NivelRisco; operacional: NivelRisco; juridico: NivelRisco };
};

// Nomes próprios para a ESP e o RSK citados e para a conta de quem decidiu: as subconsultas de `expressaoDesatualizado`
// leem as tabelas pelo nome, e a junção não pode se confundir com elas.
const espCitada = alias(especificacaoTecnica, 'esp_citada');
const rskCitado = alias(parecerRisco, 'rsk_citado');
const decisor = alias(user, 'decisor');

const naoEncontrado = () => new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);

function selecao(db: Db) {
  return db
    .select({
      p: pacoteDecisao,
      autorNome: user.name,
      d: { statusDecisao: decisao.statusDecisao, opcaoEscolhida: decisao.opcaoEscolhida, comentarios: decisao.comentarios, decididaEm: decisao.decididaEm },
      decisorNome: decisor.name,
      esp: {
        rascunhoAgente: espCitada.rascunhoAgente,
        sistemaAlvo: espCitada.sistemaAlvo,
        repositorioDestino: espCitada.repositorioDestino,
        criteriosAceitePreliminares: espCitada.criteriosAceitePreliminares,
        definicaoDePronto: espCitada.definicaoDePronto,
      },
      rsk: {
        rascunhoAgente: rskCitado.rascunhoAgente,
        tecnico: rskCitado.riscoTecnicoNivel,
        operacional: rskCitado.riscoOperacionalNivel,
        juridico: rskCitado.riscoJuridicoNivel,
      },
      desatualizado: sql<boolean>`${expressaoDesatualizado()}`,
      substituidoPor: sql<string | null>`${expressaoSubstituidoPor()}`,
    })
    .from(pacoteDecisao)
    .innerJoin(espCitada, eq(espCitada.id, pacoteDecisao.especificacaoId))
    .innerJoin(rskCitado, eq(rskCitado.id, pacoteDecisao.parecerRiscoId))
    .leftJoin(user, contaDoAutor(pacoteDecisao))
    .leftJoin(decisao, eq(decisao.pacoteDecisaoId, pacoteDecisao.id))
    .leftJoin(decisor, eq(decisor.id, decisao.decididaPor));
}

type Linha = Awaited<ReturnType<typeof selecao>>[number];

// Em ordem de registro; com o mesmo instante, pela ordem do papel, para a leitura não depender do plano do banco.
async function aprovadoresDe(db: Db, ids: string[]): Promise<Map<string, Aprovador[]>> {
  const mapa = new Map<string, Aprovador[]>();
  if (ids.length === 0) return mapa;
  const linhas = await db
    .select()
    .from(aprovacao)
    .where(inArray(aprovacao.pacoteDecisaoId, ids))
    .orderBy(asc(aprovacao.registradaEm), asc(aprovacao.papelAprovacao));
  for (const a of linhas) {
    const lista = mapa.get(a.pacoteDecisaoId) ?? [];
    // Campo a campo: registrada_por (o id da conta) fica fora da vista.
    lista.push({
      papel: a.papelAprovacao,
      nome: a.nomeAprovador,
      opcao: a.opcao,
      registradaEm: a.registradaEm,
      referenciaDocumento: a.referenciaDocumento,
      dataDocumento: a.dataDocumento,
    });
    mapa.set(a.pacoteDecisaoId, lista);
  }
  return mapa;
}

// Campo a campo: autor_id, execucao_agente_id e as versões numéricas citadas ficam fora da vista.
function vistaDe(l: Linha, aprovadores: Aprovador[]): PacoteDecisaoVista {
  const { p } = l;
  const statusDecisao = l.d?.statusDecisao ?? 'pendente';
  const substituidoPor = statusDecisao === 'aprovada' ? (l.substituidoPor ?? null) : null;
  const rascunhosCitados = [
    ...(p.rascunhoAgente ? [p.id] : []),
    ...(l.esp.rascunhoAgente ? [p.especificacaoId] : []),
    ...(l.rsk.rascunhoAgente ? [p.parecerRiscoId] : []),
  ];
  return {
    id: p.id,
    demandaId: p.demandaId,
    versao: p.versao,
    especificacaoId: p.especificacaoId,
    parecerRiscoId: p.parecerRiscoId,
    demandaTipo: p.demandaTipo,
    demandaTitulo: p.demandaTitulo,
    demandaDescricao: p.demandaDescricao,
    resumoExecutivo: p.resumoExecutivo,
    opcaoA: p.opcaoA,
    opcaoB: p.opcaoB,
    recomendacao: p.recomendacao,
    nivelAprovacaoRequerido: p.nivelAprovacaoRequerido,
    autor: responsavelDe(p.autorTipo, p.autorId, l.autorNome),
    rascunhoAgente: p.rascunhoAgente,
    criadaEm: p.criadaEm,
    statusDecisao,
    aprovadores,
    desatualizado: l.desatualizado === true,
    substituido: substituidoPor !== null,
    substituidoPor,
    decisao: l.d
      ? { opcaoEscolhida: l.d.opcaoEscolhida, comentarios: l.d.comentarios, decididaPor: l.decisorNome, decididaEm: l.d.decididaEm }
      : null,
    rascunhosCitados,
    especificacaoCitada: {
      sistemaAlvo: l.esp.sistemaAlvo,
      repositorioDestino: l.esp.repositorioDestino,
      criteriosAceitePreliminares: l.esp.criteriosAceitePreliminares,
      definicaoDePronto: l.esp.definicaoDePronto,
    },
    niveisRisco: { tecnico: l.rsk.tecnico, operacional: l.rsk.operacional, juridico: l.rsk.juridico },
  };
}

// M-2 do 0008 (C-10, RF-20): a vista para quem não é pessoa, aplicada na rota. Lista de permissão: só pessoa vê a vista
// inteira; para qualquer outro ator o objeto é montado chave a chave: autoria de pessoa só pelo tipo, aprovador sem
// `nome` e `referenciaDocumento`, decisão sem `decididaPor`. Campo novo da vista não sai sem entrar aqui.
export type AprovadorMinimo = Omit<Aprovador, 'nome' | 'referenciaDocumento'>;
export type DecisaoMinima = Omit<DecisaoVista, 'decididaPor'>;
export type PacoteDecisaoVistaMinima = Omit<PacoteDecisaoVista, 'autor' | 'aprovadores' | 'decisao'> & {
  autor: ResponsavelMinimo;
  aprovadores: AprovadorMinimo[];
  decisao: DecisaoMinima | null;
};

// M-a do 0009 (RF-20): cada subcampo da opção passa pelo `minimizar`; subcampo opcional ausente continua ausente.
function opcaoMinima(o: Opcao, nomes: readonly string[]): Opcao {
  return {
    descricao: textoMinimo(o.descricao, nomes),
    ...(o.vantagens === undefined ? {} : { vantagens: textoMinimo(o.vantagens, nomes) }),
    ...(o.desvantagens === undefined ? {} : { desvantagens: textoMinimo(o.desvantagens, nomes) }),
    ...(o.quandoEscolher === undefined ? {} : { quandoEscolher: textoMinimo(o.quandoEscolher, nomes) }),
  };
}

// M-a do 0009 (RF-20): o texto livre (cópia da demanda, resumo, opções, recomendação, comentário da decisão e as listas
// da ESP citada) passa pelo mesmo `minimizar` da entrada do agente, com `nomes`, o nome do solicitante da demanda do DEC
// (nomesDosSolicitantes). Ids, sistema alvo, repositório, níveis e status ficam iguais. A pessoa não usa `nomes`.
export function vistaDoPacotePara(ator: Ator, v: PacoteDecisaoVista, nomes: readonly string[]): PacoteDecisaoVista | PacoteDecisaoVistaMinima {
  if (ator.tipo === 'pessoa') return v;
  return {
    id: v.id,
    demandaId: v.demandaId,
    versao: v.versao,
    especificacaoId: v.especificacaoId,
    parecerRiscoId: v.parecerRiscoId,
    demandaTipo: v.demandaTipo,
    demandaTitulo: textoMinimo(v.demandaTitulo, nomes),
    demandaDescricao: textoMinimo(v.demandaDescricao, nomes),
    resumoExecutivo: textoMinimo(v.resumoExecutivo, nomes),
    opcaoA: opcaoMinima(v.opcaoA, nomes),
    opcaoB: opcaoMinima(v.opcaoB, nomes),
    recomendacao: textoMinimoOuNulo(v.recomendacao, nomes),
    nivelAprovacaoRequerido: v.nivelAprovacaoRequerido,
    autor: responsavelMinimo(v.autor),
    rascunhoAgente: v.rascunhoAgente,
    criadaEm: v.criadaEm,
    statusDecisao: v.statusDecisao,
    aprovadores: v.aprovadores.map((a) => ({ papel: a.papel, opcao: a.opcao, registradaEm: a.registradaEm, dataDocumento: a.dataDocumento })),
    desatualizado: v.desatualizado,
    // 0.1.13 (E6): booleano e id, sem texto livre.
    substituido: v.substituido,
    substituidoPor: v.substituidoPor,
    decisao: v.decisao
      ? { opcaoEscolhida: v.decisao.opcaoEscolhida, comentarios: textoMinimoOuNulo(v.decisao.comentarios, nomes), decididaEm: v.decisao.decididaEm }
      : null,
    rascunhosCitados: v.rascunhosCitados,
    especificacaoCitada: {
      sistemaAlvo: v.especificacaoCitada.sistemaAlvo,
      repositorioDestino: v.especificacaoCitada.repositorioDestino,
      criteriosAceitePreliminares: listaMinimaOuNula(v.especificacaoCitada.criteriosAceitePreliminares, nomes),
      definicaoDePronto: listaMinimaOuNula(v.especificacaoCitada.definicaoDePronto, nomes),
    },
    niveisRisco: { tecnico: v.niveisRisco.tecnico, operacional: v.niveisRisco.operacional, juridico: v.niveisRisco.juridico },
  };
}

// Em sequência: `db` pode ser a transação de quem chama, que tem uma conexão só.
async function vistas(db: Db, linhas: Linha[]): Promise<PacoteDecisaoVista[]> {
  const aprovadores = await aprovadoresDe(
    db,
    linhas.map((l) => l.p.id),
  );
  return linhas.map((l) => vistaDe(l, aprovadores.get(l.p.id) ?? []));
}

export async function obterPacoteDecisao(db: Db, decId: string): Promise<PacoteDecisaoVista> {
  const linhas = await selecao(db).where(eq(pacoteDecisao.id, decId));
  if (linhas.length === 0) throw naoEncontrado();
  return (await vistas(db, linhas))[0]!;
}

// Os DEC de uma demanda, do mais novo para o mais antigo. Demanda que não existe responde 404, e não lista vazia.
export async function listarPacotesDaDemanda(db: Db, demandaId: string): Promise<PacoteDecisaoVista[]> {
  const [d] = await db.select({ id: demanda.id }).from(demanda).where(eq(demanda.id, demandaId));
  if (!d) throw naoEncontrado();
  return vistas(db, await selecao(db).where(eq(pacoteDecisao.demandaId, demandaId)).orderBy(desc(pacoteDecisao.versao)));
}

function condicaoDoStatus(status: StatusDecisao | undefined): SQL | undefined {
  if (status === undefined) return undefined;
  if (status === 'pendente') return isNull(decisao.pacoteDecisaoId);
  return eq(decisao.statusDecisao, status);
}

// Todos os DEC, do mais novo para o mais antigo, com o filtro por status de decisão (RF-23) e a paginação da fila.
export async function listarPacotes(
  db: Db,
  filtro: FiltroPacotes,
): Promise<{ itens: PacoteDecisaoVista[]; total: number; limit: number; offset: number }> {
  const onde = condicaoDoStatus(filtro.statusDecisao);
  const linhas = await selecao(db)
    .where(onde)
    .orderBy(desc(pacoteDecisao.criadaEm), desc(pacoteDecisao.demandaId), desc(pacoteDecisao.versao))
    .limit(filtro.limit)
    .offset(filtro.offset);
  const itens = await vistas(db, linhas);
  const [contagem] = await db.select({ n: count() }).from(pacoteDecisao).leftJoin(decisao, eq(decisao.pacoteDecisaoId, pacoteDecisao.id)).where(onde);
  return { itens, total: contagem?.n ?? 0, limit: filtro.limit, offset: filtro.offset };
}
