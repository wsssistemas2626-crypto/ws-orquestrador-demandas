// Entrada pendente (T-01, C-31): o texto enviado ao agente orquestrador antes de a demanda existir. Fica em
// `entrada_pendente` com status `aguardando` até o agente terminar, ou a pessoa preencher à mão a partir dela; nos dois
// casos a demanda nasce com o texto copiado para `entrada_bruta` e a linha pendente é apagada, na mesma transação.
// Quando o agente falha de vez (3 tentativas) ou a execução é ignorada (desligado, teto), a pendente fica `falhou`, e a
// lista deixa a pessoa achá-la para preencher à mão. O expurgo (T31) apaga a pendente vencida.
//
// O texto, a origem e o nome são dado pessoal de terceiro (D1, D2): a lista não os traz, e só a leitura de pessoa
// (`ler_texto_bruto`) os devolve. Nada disso vai ao histórico nem ao log.
import { desc, eq } from 'drizzle-orm';
import type { Db } from '../../db';
import { entradaBruta, entradaPendente, type Origem, type PapelSolicitante } from '../../db/schema/demandas';
import type { Deps } from '../../lib/deps';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import type { AtorPessoa } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';

export type EntradaPendenteResumo = { id: string; recebidaEm: Date; solicitantePapel: PapelSolicitante | null; status: 'aguardando' | 'falhou' };
export type EntradaPendenteCompleta = { texto: string; origem: Origem | null; solicitanteNome: string; solicitantePapel: PapelSolicitante | null };
export type EntradaPendenteTravada = EntradaPendenteCompleta & { id: string; recebidaEm: Date };

const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREFIXO_CHAVE = 'entrada:';

const naoEncontrado = () => new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);

export const chaveDaPendente = (id: string): string => `${PREFIXO_CHAVE}${id}`;

// O id da pendente a partir da chave de entrada do orquestrador; null se a chave não tiver o formato.
export function pendenteDaChave(chaveEntrada: string): string | null {
  if (!chaveEntrada.startsWith(PREFIXO_CHAVE)) return null;
  const id = chaveEntrada.slice(PREFIXO_CHAVE.length);
  return RE_UUID.test(id) ? id : null;
}

// Para a fila do painel (T38): sem texto, origem nem nome. Da mais nova para a mais antiga.
export async function listarEntradasPendentes(db: Db): Promise<EntradaPendenteResumo[]> {
  return db
    .select({ id: entradaPendente.id, recebidaEm: entradaPendente.recebidaEm, solicitantePapel: entradaPendente.solicitantePapel, status: entradaPendente.status })
    .from(entradaPendente)
    .orderBy(desc(entradaPendente.recebidaEm), desc(entradaPendente.id));
}

// Para a pessoa preencher à mão (03, T04: "abre T04 com o texto já colado"). Só pessoa (`ler_texto_bruto`).
export async function obterEntradaPendente(deps: Pick<Deps, 'db'>, ator: AtorPessoa, id: string): Promise<EntradaPendenteCompleta> {
  autorizar(ator, 'ler_texto_bruto');
  if (!RE_UUID.test(id)) throw naoEncontrado();
  const [p] = await deps.db
    .select({ texto: entradaPendente.texto, origem: entradaPendente.origem, solicitanteNome: entradaPendente.solicitanteNome, solicitantePapel: entradaPendente.solicitantePapel })
    .from(entradaPendente)
    .where(eq(entradaPendente.id, id));
  if (!p) throw naoEncontrado();
  return p;
}

// Trava a pendente até o fim da transação: o agente e a pessoa que preenche à mão não convertem a mesma duas vezes. Quem
// chega depois não a acha mais (nao_encontrado).
export async function travarEntradaPendente(tx: Db, id: string): Promise<EntradaPendenteTravada> {
  if (!RE_UUID.test(id)) throw naoEncontrado();
  const [p] = await tx
    .select({
      id: entradaPendente.id,
      texto: entradaPendente.texto,
      origem: entradaPendente.origem,
      solicitanteNome: entradaPendente.solicitanteNome,
      solicitantePapel: entradaPendente.solicitantePapel,
      recebidaEm: entradaPendente.recebidaEm,
    })
    .from(entradaPendente)
    .where(eq(entradaPendente.id, id))
    .for('update');
  if (!p) throw naoEncontrado();
  return p;
}

// A demanda já nasceu nesta transação: o texto vai para entrada_bruta como chegou, com a data da entrada (o prazo de
// retenção conta dali), e a pendente é apagada.
export async function converterEntradaPendente(tx: Db, p: EntradaPendenteTravada, demandaId: string): Promise<void> {
  await tx.insert(entradaBruta).values({ demandaId, texto: p.texto, origem: p.origem, recebidaEm: p.recebidaEm });
  await tx.delete(entradaPendente).where(eq(entradaPendente.id, p.id));
}

// O agente orquestrador não vai mais tratar esta entrada (falhou ou foi ignorado): a pendente fica `falhou`, para a
// pessoa preencher à mão. Se a pendente já foi convertida ou expurgada, não há o que marcar.
export async function marcarPendenteComoFalha(tx: Db, chaveEntrada: string): Promise<void> {
  const id = pendenteDaChave(chaveEntrada);
  if (!id) return;
  await tx.update(entradaPendente).set({ status: 'falhou' }).where(eq(entradaPendente.id, id));
}
