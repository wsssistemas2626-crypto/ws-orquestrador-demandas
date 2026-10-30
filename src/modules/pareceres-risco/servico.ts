// Serviço do parecer de risco (RSK, RF-09, RF-11). Cada gravação é uma versão nova e imutável: o papel do app só tem
// SELECT e INSERT na tabela (C-34). Numa transação: autorizar → trava da demanda (CA-04.3) → limite por ator (C-36) →
// próxima versão → insert com a autoria só do ator (C-11) → evento sem texto livre (C-30). O RSK não exige ESP (o pacote
// de decisão é que exige as duas) e não muda o status da demanda; com ESP na demanda, dispara a consolidação (T28). Aceita a transação de quem chama (G3.8): o worker
// grava a versão, a execução e o job juntos (ADR-02, ADR-06). A entrada já chega validada pelo Zod (rota, Server Action
// ou job).
import { eq } from 'drizzle-orm';
import type { Db } from '../../db';
import { especificacaoTecnica, parecerRisco } from '../../db/schema';
import { comTransacao, type Transacao } from '../../db/transacao';
import type { Ator } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import { dispararSeLigado } from '../agentes/gatilhos';
import { autoriaDo, type DepsComFila } from '../demandas/servico';
import { registrarEvento } from '../historico/registrar';
import { conferirLimite } from '../limites';
import { idVersao, proximaVersao, travarDemanda } from '../versoes';
import { obterParecerRisco, type ParecerRiscoVista } from './consultas';
import type { CriarParecerRisco } from './schemas';

// Texto opcional que, aparado, ficou vazio é gravado como nulo: a versão é imutável, e quem lê não precisa tratar '' e
// null como iguais.
const textoOuNulo = (v: string | undefined): string | null => (v === undefined || v === '' ? null : v);

// A consolidação precisa de ESP e RSK (o DEC exige os dois): sem ESP na demanda, o RSK não a dispara.
async function temEspecificacao(tx: Db, demandaId: string): Promise<boolean> {
  const [linha] = await tx.select({ id: especificacaoTecnica.id }).from(especificacaoTecnica).where(eq(especificacaoTecnica.demandaId, demandaId)).limit(1);
  return linha !== undefined;
}

export async function criarParecerRisco(
  deps: DepsComFila,
  ator: Ator,
  demandaId: string,
  entrada: CriarParecerRisco,
  t?: Transacao,
  extras: { execucaoAgenteId?: string } = {},
): Promise<ParecerRiscoVista> {
  autorizar(ator, 'criar_parecer_risco');
  const autoria = autoriaDo(ator);
  const rascunhoAgente = autoria.autorTipo === 'agente';
  const corpo = async (tr: Transacao): Promise<string> => {
    const { tx } = tr;
    await travarDemanda(tx, demandaId);
    await conferirLimite(tx, ator, 'artefato', deps.relogio);
    const versao = await proximaVersao(tx, parecerRisco, demandaId);
    const id = idVersao('RSK', demandaId, versao);
    // Campo a campo, e não `...entrada`: nada que o chamador tenha a mais chega ao banco (C-11).
    await tx.insert(parecerRisco).values({
      id,
      demandaId,
      versao,
      resumo: textoOuNulo(entrada.resumo),
      riscoTecnicoNivel: entrada.riscoTecnicoNivel,
      riscoTecnicoComentario: textoOuNulo(entrada.riscoTecnicoComentario),
      riscoOperacionalNivel: entrada.riscoOperacionalNivel,
      riscoOperacionalComentario: textoOuNulo(entrada.riscoOperacionalComentario),
      riscoJuridicoNivel: entrada.riscoJuridicoNivel,
      riscoJuridicoComentario: textoOuNulo(entrada.riscoJuridicoComentario),
      recomendacoesMitigacao: entrada.recomendacoesMitigacao,
      preCondicoes: entrada.preCondicoes,
      envolverJuridicoOuAdministradoraQuando: textoOuNulo(entrada.envolverJuridicoOuAdministradoraQuando),
      ...autoria,
      rascunhoAgente,
      execucaoAgenteId: extras.execucaoAgenteId ?? null,
      criadaEm: deps.relogio.agora(),
    });
    // C-30: só a versão e se é rascunho; nada dos comentários nem das listas, que podem trazer dado de terceiro.
    await registrarEvento(
      tx,
      { ator, demandaId, entidade: 'parecer_risco', entidadeId: id, acao: 'parecer_risco_criado', depois: { versao, rascunhoAgente } },
      deps.relogio,
    );
    // T28: com ESP na demanda, o RSK dispara o agente de consolidação, se ligado e sem suspensão, nesta transação (ADR-06).
    if (await temEspecificacao(tx, demandaId)) await dispararSeLigado(tr, deps, 'consolidacao', `rsk:${id}`, demandaId);
    return id;
  };
  const id = t ? await corpo(t) : await comTransacao(deps.pool, corpo);
  return obterParecerRisco(t?.tx ?? deps.db, id);
}
