// Leitura do parecer de risco (RF-09, RF-11). A autoria aparece como na demanda: pessoa pelo nome da conta, agente pelo
// nome do agente, nunca pelo id interno da conta.
import { desc, eq, max, type SQL } from 'drizzle-orm';
import type { Db } from '../../db';
import { demanda, especificacaoTecnica, parecerRisco, user } from '../../db/schema';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { atorDesconhecido, type Ator } from '../acesso/ator';
import {
  contaDoAutor,
  listaMinima,
  responsavelDe,
  responsavelMinimo,
  semPermissao,
  textoMinimoOuNulo,
  type Responsavel,
  type ResponsavelMinimo,
} from '../demandas/consultas';
import { idVersao } from '../versoes';
import type { Nivel } from './schemas';

export type ParecerRiscoVista = {
  id: string;
  demandaId: string;
  versao: number;
  resumo: string | null;
  riscoTecnicoNivel: Nivel;
  riscoTecnicoComentario: string | null;
  riscoOperacionalNivel: Nivel;
  riscoOperacionalComentario: string | null;
  riscoJuridicoNivel: Nivel;
  riscoJuridicoComentario: string | null;
  recomendacoesMitigacao: string[];
  preCondicoes: string[];
  envolverJuridicoOuAdministradoraQuando: string | null;
  autor: Responsavel;
  rascunhoAgente: boolean;
  criadaEm: Date;
};

type Linha = { r: typeof parecerRisco.$inferSelect; nome: string | null };

const naoEncontrado = () => new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);

// Campo a campo: autor_id e execucao_agente_id ficam fora da vista.
function vistaDe({ r, nome }: Linha): ParecerRiscoVista {
  return {
    id: r.id,
    demandaId: r.demandaId,
    versao: r.versao,
    resumo: r.resumo,
    riscoTecnicoNivel: r.riscoTecnicoNivel,
    riscoTecnicoComentario: r.riscoTecnicoComentario,
    riscoOperacionalNivel: r.riscoOperacionalNivel,
    riscoOperacionalComentario: r.riscoOperacionalComentario,
    riscoJuridicoNivel: r.riscoJuridicoNivel,
    riscoJuridicoComentario: r.riscoJuridicoComentario,
    recomendacoesMitigacao: r.recomendacoesMitigacao,
    preCondicoes: r.preCondicoes,
    envolverJuridicoOuAdministradoraQuando: r.envolverJuridicoOuAdministradoraQuando,
    autor: responsavelDe(r.autorTipo, r.autorId, nome),
    rascunhoAgente: r.rascunhoAgente,
    criadaEm: r.criadaEm,
  };
}

// M-2 do 0008 (C-10, RF-20): a vista para quem não é pessoa, aplicada na rota. Lista de permissão: só pessoa vê a vista
// inteira; para qualquer outro ator o objeto é montado chave a chave, com a autoria de pessoa só pelo tipo.
type Extras = { versaoMaisNova?: string; especificacaoMaisNova?: string | null };
export type ParecerRiscoVistaMinima = Omit<ParecerRiscoVista, 'autor'> & { autor: ResponsavelMinimo } & Extras;

// M-a do 0009 (RF-20): o texto livre e as listas de texto passam pelo mesmo `minimizar` da entrada do agente, com
// `nomes`, o nome do solicitante da demanda (nomesDosSolicitantes). Os níveis e os ids citados ficam iguais.
export function vistaDoParecerPara(ator: Ator, v: ParecerRiscoVista & Extras, nomes: readonly string[]): ParecerRiscoVista | ParecerRiscoVistaMinima {
  // IN-02: agente e sistema (D-05), a mínima de hoje; integração não lê RSK (RF-03) e nunca recebe a vista do agente.
  switch (ator.tipo) {
    case 'pessoa':
      return v;
    case 'agente':
    case 'sistema':
      return vistaMinimaDoParecer(v, nomes);
    case 'integracao':
      throw semPermissao();
    default:
      return atorDesconhecido(ator);
  }
}

function vistaMinimaDoParecer(v: ParecerRiscoVista & Extras, nomes: readonly string[]): ParecerRiscoVistaMinima {
  return {
    id: v.id,
    demandaId: v.demandaId,
    versao: v.versao,
    resumo: textoMinimoOuNulo(v.resumo, nomes),
    riscoTecnicoNivel: v.riscoTecnicoNivel,
    riscoTecnicoComentario: textoMinimoOuNulo(v.riscoTecnicoComentario, nomes),
    riscoOperacionalNivel: v.riscoOperacionalNivel,
    riscoOperacionalComentario: textoMinimoOuNulo(v.riscoOperacionalComentario, nomes),
    riscoJuridicoNivel: v.riscoJuridicoNivel,
    riscoJuridicoComentario: textoMinimoOuNulo(v.riscoJuridicoComentario, nomes),
    recomendacoesMitigacao: listaMinima(v.recomendacoesMitigacao, nomes),
    preCondicoes: listaMinima(v.preCondicoes, nomes),
    envolverJuridicoOuAdministradoraQuando: textoMinimoOuNulo(v.envolverJuridicoOuAdministradoraQuando, nomes),
    autor: responsavelMinimo(v.autor),
    rascunhoAgente: v.rascunhoAgente,
    criadaEm: v.criadaEm,
    ...(v.versaoMaisNova === undefined ? {} : { versaoMaisNova: v.versaoMaisNova }),
    ...(v.especificacaoMaisNova === undefined ? {} : { especificacaoMaisNova: v.especificacaoMaisNova }),
  };
}

const linhas = (db: Db, onde: SQL): Promise<Linha[]> =>
  db
    .select({ r: parecerRisco, nome: user.name })
    .from(parecerRisco)
    .leftJoin(user, contaDoAutor(parecerRisco))
    .where(onde)
    .orderBy(desc(parecerRisco.versao));

// Da mais nova para a mais antiga. Demanda que não existe responde 404, e não lista vazia.
export async function listarPareceresRisco(db: Db, demandaId: string): Promise<ParecerRiscoVista[]> {
  const [d] = await db.select({ id: demanda.id }).from(demanda).where(eq(demanda.id, demandaId));
  if (!d) throw naoEncontrado();
  return (await linhas(db, eq(parecerRisco.demandaId, demandaId))).map(vistaDe);
}

// A versão pedida, o id do RSK mais novo da mesma demanda e o da ESP mais nova (a T10 avisa quando a versão aberta não
// é a mais nova; a T08 mostra em que ESP o parecer novo se baseia). Sem ESP, `especificacaoMaisNova` é nulo.
export async function obterParecerRisco(
  db: Db,
  rskId: string,
): Promise<ParecerRiscoVista & { versaoMaisNova: string; especificacaoMaisNova: string | null }> {
  const [l] = await linhas(db, eq(parecerRisco.id, rskId));
  if (!l) throw naoEncontrado();
  const demandaId = l.r.demandaId;
  // Em sequência: `db` pode ser a transação de quem chama, que tem uma conexão só.
  const [m] = await db.select({ maior: max(parecerRisco.versao) }).from(parecerRisco).where(eq(parecerRisco.demandaId, demandaId));
  const [e] = await db.select({ maior: max(especificacaoTecnica.versao) }).from(especificacaoTecnica).where(eq(especificacaoTecnica.demandaId, demandaId));
  return {
    ...vistaDe(l),
    versaoMaisNova: idVersao('RSK', demandaId, m?.maior ?? l.r.versao),
    especificacaoMaisNova: e?.maior ? idVersao('ESP', demandaId, e.maior) : null,
  };
}
