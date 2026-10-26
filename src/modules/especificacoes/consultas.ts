// Leitura da especificação técnica (RF-08, RF-11). A autoria aparece como na demanda: pessoa pelo nome da conta, agente
// pelo nome do agente, nunca pelo id interno da conta.
import { desc, eq, max, type SQL } from 'drizzle-orm';
import type { Db } from '../../db';
import { demanda, especificacaoTecnica, user } from '../../db/schema';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { contaDoAutor, responsavelDe, type Responsavel } from '../demandas/consultas';
import { idVersao } from '../versoes';

export type EspecificacaoVista = {
  id: string;
  demandaId: string;
  versao: number;
  descricaoObjetiva: string;
  situacaoAtual: string | null;
  situacaoDesejada: string | null;
  escopoInclui: string[];
  escopoExclui: string[];
  sistemasErp: string | null;
  sistemasEcommerceMarketplace: string | null;
  sistemasApisTerceiros: string | null;
  sistemasServicosInternos: string | null;
  dadosEntidades: string | null;
  dadosCamposCriticos: string | null;
  restricoesTecnicas: string | null;
  duvidasEmAberto: string[];
  sistemaAlvo: string | null;
  repositorioDestino: string | null;
  criteriosAceitePreliminares: string[] | null;
  definicaoDePronto: string[] | null;
  autor: Responsavel;
  rascunhoAgente: boolean;
  criadaEm: Date;
};

type Linha = { e: typeof especificacaoTecnica.$inferSelect; nome: string | null };

const naoEncontrado = () => new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);

// Campo a campo: autor_id e execucao_agente_id ficam fora da vista.
function vistaDe({ e, nome }: Linha): EspecificacaoVista {
  return {
    id: e.id,
    demandaId: e.demandaId,
    versao: e.versao,
    descricaoObjetiva: e.descricaoObjetiva,
    situacaoAtual: e.situacaoAtual,
    situacaoDesejada: e.situacaoDesejada,
    escopoInclui: e.escopoInclui,
    escopoExclui: e.escopoExclui,
    sistemasErp: e.sistemasErp,
    sistemasEcommerceMarketplace: e.sistemasEcommerceMarketplace,
    sistemasApisTerceiros: e.sistemasApisTerceiros,
    sistemasServicosInternos: e.sistemasServicosInternos,
    dadosEntidades: e.dadosEntidades,
    dadosCamposCriticos: e.dadosCamposCriticos,
    restricoesTecnicas: e.restricoesTecnicas,
    duvidasEmAberto: e.duvidasEmAberto,
    sistemaAlvo: e.sistemaAlvo,
    repositorioDestino: e.repositorioDestino,
    criteriosAceitePreliminares: e.criteriosAceitePreliminares,
    definicaoDePronto: e.definicaoDePronto,
    autor: responsavelDe(e.autorTipo, e.autorId, nome),
    rascunhoAgente: e.rascunhoAgente,
    criadaEm: e.criadaEm,
  };
}

const linhas = (db: Db, onde: SQL): Promise<Linha[]> =>
  db
    .select({ e: especificacaoTecnica, nome: user.name })
    .from(especificacaoTecnica)
    .leftJoin(user, contaDoAutor(especificacaoTecnica))
    .where(onde)
    .orderBy(desc(especificacaoTecnica.versao));

// Da mais nova para a mais antiga. Demanda que não existe responde 404, e não lista vazia.
export async function listarEspecificacoes(db: Db, demandaId: string): Promise<EspecificacaoVista[]> {
  const [d] = await db.select({ id: demanda.id }).from(demanda).where(eq(demanda.id, demandaId));
  if (!d) throw naoEncontrado();
  return (await linhas(db, eq(especificacaoTecnica.demandaId, demandaId))).map(vistaDe);
}

// A versão pedida e o id da mais nova da mesma demanda (a T10 avisa quando a versão aberta não é a mais nova).
export async function obterEspecificacao(db: Db, espId: string): Promise<EspecificacaoVista & { versaoMaisNova: string }> {
  const [l] = await linhas(db, eq(especificacaoTecnica.id, espId));
  if (!l) throw naoEncontrado();
  const [m] = await db
    .select({ maior: max(especificacaoTecnica.versao) })
    .from(especificacaoTecnica)
    .where(eq(especificacaoTecnica.demandaId, l.e.demandaId));
  return { ...vistaDe(l), versaoMaisNova: idVersao('ESP', l.e.demandaId, m?.maior ?? l.e.versao) };
}
