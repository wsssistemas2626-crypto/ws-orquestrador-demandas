// Serviço de demanda (RF-03, RF-06, RF-07): criar e alterar, com autoria só do ator (C-11), histórico sem dado de
// terceiro (C-30) e limite por ator (C-36). Toda função que grava aceita a transação de quem chama (G3.8); sem ela,
// abre a própria. A entrada já chega validada pelo Zod (rota, Server Action ou job).
import { isDeepStrictEqual } from 'node:util';
import { eq } from 'drizzle-orm';
import { demanda } from '../../db/schema';
import type { AutorDemanda } from '../../db/schema/demandas';
import { comTransacao, type Transacao } from '../../db/transacao';
import type { Deps } from '../../lib/deps';
import { ErroDominio } from '../../lib/erros';
import { NOME_DA_INTEGRACAO, atorDesconhecido, type Ator, type AtorPessoa } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import { dispararSeLigado } from '../agentes/gatilhos';
import { mudancaDeCampo, registrarEvento } from '../historico/registrar';
import { executarComOrcamento } from '../integracoes/tempo-limite';
import { conferirLimite } from '../limites';
import { temPacoteAprovadoAtualizado } from '../pacotes-decisao/desatualizado';
import { travarDemanda } from '../versoes';
import { obterDemanda, semPermissao, type DemandaVista } from './consultas';
import { proximoIdDemanda } from './gerar-id';
import type { AlterarDemanda, CriarDemanda } from './schemas';
import { conferirTransicaoManual } from './transicoes';

// O que o serviço usa das dependências: o worker (T27, T28) pode chamar com as dele, sem Better Auth nem fila.
export type DepsDemanda = Pick<Deps, 'db' | 'pool' | 'relogio'>;
// Quem grava demanda, ESP ou RSK também dispara o agente seguinte (T28), na mesma transação, e para isso usa a fila.
// Rota, Server Action e worker sempre a têm. Ela é opcional no tipo porque só faz falta com o agente ligado: sem ela,
// dispararSeLigado falha alto em vez de deixar de disparar.
export type DepsComFila = DepsDemanda & Partial<Pick<Deps, 'fila'>>;

export const MENSAGEM_NADA_ALTERADO = 'Nada foi alterado.';

// Os campos que a pessoa edita (T06), na ordem em que os eventos são gravados. Status fica à parte (RF-07).
const CAMPOS_EDITAVEIS = [
  'titulo',
  'tipo',
  'solicitanteNome',
  'solicitantePapel',
  'linhaServicoProvavel',
  'urgencia',
  'justificativaUrgencia',
  'contexto',
  'descricaoProblema',
  'impactoPercebido',
  'anexos',
] as const satisfies ReadonlyArray<keyof AlterarDemanda & keyof typeof demanda.$inferSelect>;

type CampoEditavel = (typeof CAMPOS_EDITAVEIS)[number];

// Exportada para os serviços de ESP, RSK e DEC (T18 a T20): a mesma autoria gravada em todo artefato (C-11). As versões
// continuam só com pessoa e agente (ADR-24): integração e sistema lançam. autorizar já os negou; isto só protege contra
// uso sem autorizar.
export function autoriaDo(ator: Ator): { autorTipo: 'pessoa' | 'agente'; autorId: string } {
  switch (ator.tipo) {
    case 'agente':
      return { autorTipo: 'agente', autorId: ator.agente };
    case 'pessoa':
      return { autorTipo: 'pessoa', autorId: ator.usuarioId };
    case 'integracao':
    case 'sistema':
      throw semPermissao();
    default:
      return atorDesconhecido(ator);
  }
}

// ADR-24 e G8 #6: a autoria da demanda. Pessoa e agente como nas versões; da integração, só o awave cria demanda (RF-03 e
// CHECK demanda_autor_integracao_check). autorizar já negou o construir e o sistema; isto só protege contra uso sem
// autorizar.
export function autoriaDaDemanda(ator: Ator): { autorTipo: AutorDemanda; autorId: string } {
  switch (ator.tipo) {
    case 'pessoa':
    case 'agente':
      return autoriaDo(ator);
    case 'integracao':
      if (ator.integracao === 'awave') return { autorTipo: 'integracao', autorId: 'awave' };
      throw semPermissao();
    case 'sistema':
      throw semPermissao();
    default:
      return atorDesconhecido(ator);
  }
}

type CamposDaDemanda = Pick<
  typeof demanda.$inferInsert,
  | 'titulo'
  | 'tipo'
  | 'solicitanteNome'
  | 'solicitantePapel'
  | 'linhaServicoProvavel'
  | 'urgencia'
  | 'justificativaUrgencia'
  | 'contexto'
  | 'descricaoProblema'
  | 'impactoPercebido'
  | 'anexos'
  | 'duvidasEntrada'
>;

// IN-05 e G8 #7: campo a campo, e não `...entrada`, para todo ator: nada que o chamador tenha a mais chega ao banco
// (C-11). Da integração, só cinco campos do corpo (lista de permissão); o resto é fixo, seja o que for enviado, sem 400
// (o contrato do Awave não muda) e sem nome de pessoa no solicitante.
function camposDaEntrada(ator: Ator, e: CriarDemanda, extras: { duvidasEntrada?: string[] }): CamposDaDemanda {
  switch (ator.tipo) {
    case 'integracao':
      return {
        titulo: e.titulo,
        tipo: e.tipo,
        solicitanteNome: NOME_DA_INTEGRACAO[ator.integracao],
        solicitantePapel: e.solicitantePapel ?? null,
        linhaServicoProvavel: null,
        urgencia: null,
        justificativaUrgencia: null,
        contexto: e.contexto ?? null,
        descricaoProblema: e.descricaoProblema ?? null,
        impactoPercebido: null,
        anexos: [],
        duvidasEntrada: [],
      };
    case 'pessoa':
    case 'agente':
      return {
        titulo: e.titulo,
        tipo: e.tipo,
        solicitanteNome: e.solicitanteNome,
        solicitantePapel: e.solicitantePapel ?? null,
        linhaServicoProvavel: e.linhaServicoProvavel ?? null,
        urgencia: e.urgencia ?? null,
        justificativaUrgencia: e.justificativaUrgencia ?? null,
        contexto: e.contexto ?? null,
        descricaoProblema: e.descricaoProblema ?? null,
        impactoPercebido: e.impactoPercebido ?? null,
        anexos: e.anexos,
        duvidasEntrada: extras.duvidasEntrada ?? [],
      };
    case 'sistema':
      throw semPermissao();
    default:
      return atorDesconhecido(ator);
  }
}

// IN-06 e D1: só pessoa e agente disparam o insumo técnico ao criar (lista de permissão, não "todos menos integração").
// A demanda do Awave espera a confirmação por pessoa, que dispara (T08).
async function dispararAoCriar(tr: Transacao, deps: DepsComFila, ator: Ator, id: string): Promise<void> {
  switch (ator.tipo) {
    case 'pessoa':
    case 'agente':
      // T28: com o insumo técnico ligado e sem suspensão, a execução e o job entram nesta transação (ADR-06).
      await dispararSeLigado(tr, deps, 'insumo_tecnico', `demanda:${id}`, id);
      return;
    case 'integracao':
      return;
    case 'sistema':
      throw semPermissao();
    default:
      return atorDesconhecido(ator);
  }
}

const executar = <T>(deps: DepsDemanda, t: Transacao | undefined, corpo: (t: Transacao) => Promise<T>): Promise<T> =>
  t ? corpo(t) : comTransacao(deps.pool, corpo);

// ADR-28 e IN-14: a integração cria sob o orçamento de tempo dela (lock_timeout e statement_timeout, 503 fixo). Pessoa,
// agente e sistema seguem com a transação de hoje, sem tradução nova de erro (RNF-09).
function naTransacaoDaCriacao<T>(deps: DepsDemanda, ator: Ator, t: Transacao | undefined, corpo: (t: Transacao) => Promise<T>): Promise<T> {
  switch (ator.tipo) {
    case 'integracao':
      return executarComOrcamento(deps.pool, ator, 'padrao', t, corpo);
    case 'pessoa':
    case 'agente':
    case 'sistema':
      return executar(deps, t, corpo);
    default:
      return atorDesconhecido(ator);
  }
}

export async function criarDemanda(
  deps: DepsComFila,
  ator: Ator,
  entrada: CriarDemanda,
  t?: Transacao,
  extras: { duvidasEntrada?: string[] } = {},
): Promise<DemandaVista> {
  autorizar(ator, 'criar_demanda');
  const autoria = autoriaDaDemanda(ator);
  const campos = camposDaEntrada(ator, entrada, extras);
  const id = await naTransacaoDaCriacao(deps, ator, t, async (tr) => {
    const { tx } = tr;
    // C-36 e IN-09: limite antes do id. O nextval só roda aqui, depois do Zod (na entrada) e do limite, dentro da
    // transação.
    await conferirLimite(tx, ator, 'demanda', deps.relogio);
    const novoId = await proximoIdDemanda(tx, deps.relogio);
    const agora = deps.relogio.agora();
    await tx.insert(demanda).values({
      id: novoId,
      titulo: campos.titulo,
      tipo: campos.tipo,
      status: 'nova',
      solicitanteNome: campos.solicitanteNome,
      solicitantePapel: campos.solicitantePapel,
      linhaServicoProvavel: campos.linhaServicoProvavel,
      urgencia: campos.urgencia,
      justificativaUrgencia: campos.justificativaUrgencia,
      contexto: campos.contexto,
      descricaoProblema: campos.descricaoProblema,
      impactoPercebido: campos.impactoPercebido,
      anexos: campos.anexos,
      duvidasEntrada: campos.duvidasEntrada,
      autorTipo: autoria.autorTipo,
      autorId: autoria.autorId,
      // ADR-24: só a pessoa cria fora de rascunho; agente e integração sempre em rascunho.
      rascunhoAgente: autoria.autorTipo !== 'pessoa',
      criadaEm: agora,
      atualizadaEm: agora,
    });
    // C-30 e IN-12: só enumerações no evento; nada do solicitante nem de texto livre. O ator leva o prefixo do token.
    await registrarEvento(
      tx,
      { ator, demandaId: novoId, entidade: 'demanda', entidadeId: novoId, acao: 'demanda_criada', depois: { status: 'nova', tipo: entrada.tipo } },
      deps.relogio,
    );
    await dispararAoCriar(tr, deps, ator, novoId);
    return novoId;
  });
  return obterDemanda(t?.tx ?? deps.db, id);
}

type Mudanca = { campo: CampoEditavel; antes: unknown; depois: unknown };

// Ausente = não muda. Comparação profunda para os anexos: o jsonb devolve as chaves em outra ordem.
function camposAlterados(atual: typeof demanda.$inferSelect, mudancas: AlterarDemanda): Mudanca[] {
  const saida: Mudanca[] = [];
  for (const campo of CAMPOS_EDITAVEIS) {
    const depois = mudancas[campo];
    if (depois === undefined) continue;
    const antes = atual[campo];
    if (!isDeepStrictEqual(antes, depois)) saida.push({ campo, antes, depois });
  }
  return saida;
}

export async function alterarDemanda(
  deps: DepsDemanda,
  ator: AtorPessoa,
  id: string,
  mudancas: AlterarDemanda,
  t?: Transacao,
): Promise<DemandaVista> {
  autorizar(ator, 'alterar_demanda');
  await executar(deps, t, async ({ tx }) => {
    const atual = await travarDemanda(tx, id);
    const alterados = camposAlterados(atual, mudancas);
    const novoStatus = mudancas.status !== undefined && mudancas.status !== atual.status ? mudancas.status : undefined;
    if (alterados.length === 0 && novoStatus === undefined) throw new ErroDominio('entrada_invalida', MENSAGEM_NADA_ALTERADO);

    // Tudo é conferido antes de gravar: uma recusa não deixa meia alteração, nem na transação de quem chama.
    if (novoStatus !== undefined) {
      const r = conferirTransicaoManual(atual.status, novoStatus, {
        tipo: mudancas.tipo ?? atual.tipo,
        temPacoteAprovadoAtualizado: novoStatus === 'aprovada' ? await temPacoteAprovadoAtualizado(tx, id) : false,
      });
      if (!r.ok) throw new ErroDominio('conflito', r.motivo);
    }

    const valores: Partial<typeof demanda.$inferInsert> = Object.fromEntries(alterados.map((m) => [m.campo, m.depois]));
    if (novoStatus !== undefined) valores.status = novoStatus;
    valores.atualizadaEm = deps.relogio.agora();
    await tx.update(demanda).set(valores).where(eq(demanda.id, id));

    for (const m of alterados)
      await registrarEvento(
        tx,
        { ator, demandaId: id, entidade: 'demanda', entidadeId: id, acao: 'campo_alterado', ...mudancaDeCampo(m.campo, m.antes, m.depois) },
        deps.relogio,
      );
    if (novoStatus !== undefined)
      await registrarEvento(
        tx,
        { ator, demandaId: id, entidade: 'demanda', entidadeId: id, acao: 'status_alterado', ...mudancaDeCampo('status', atual.status, novoStatus) },
        deps.relogio,
      );
  });
  return obterDemanda(t?.tx ?? deps.db, id);
}
