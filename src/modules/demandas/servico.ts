// Serviço de demanda (RF-03, RF-06, RF-07): criar e alterar, com autoria só do ator (C-11), histórico sem dado de
// terceiro (C-30) e limite por ator (C-36). Toda função que grava aceita a transação de quem chama (G3.8); sem ela,
// abre a própria. A entrada já chega validada pelo Zod (rota, Server Action ou job).
import { isDeepStrictEqual } from 'node:util';
import { eq } from 'drizzle-orm';
import { demanda } from '../../db/schema';
import { comTransacao, type Transacao } from '../../db/transacao';
import type { Deps } from '../../lib/deps';
import { ErroDominio } from '../../lib/erros';
import type { Ator, AtorPessoa } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import { MENSAGENS_ACESSO } from '../acesso/mensagens';
import { dispararSeLigado } from '../agentes/gatilhos';
import { mudancaDeCampo, registrarEvento } from '../historico/registrar';
import { conferirLimite } from '../limites';
import { temPacoteAprovadoAtualizado } from '../pacotes-decisao/desatualizado';
import { travarDemanda } from '../versoes';
import { obterDemanda, type DemandaVista } from './consultas';
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

// Exportada para os serviços de ESP, RSK e DEC (T18 a T20): a mesma autoria gravada em todo artefato (C-11).
export function autoriaDo(ator: Ator): { autorTipo: 'pessoa' | 'agente'; autorId: string } {
  if (ator.tipo === 'agente') return { autorTipo: 'agente', autorId: ator.agente };
  if (ator.tipo === 'pessoa') return { autorTipo: 'pessoa', autorId: ator.usuarioId };
  // autorizar já negou o sistema; isto só protege contra uso sem autorizar.
  throw new ErroDominio('sem_permissao', MENSAGENS_ACESSO.sem_permissao);
}

const executar = <T>(deps: DepsDemanda, t: Transacao | undefined, corpo: (t: Transacao) => Promise<T>): Promise<T> =>
  t ? corpo(t) : comTransacao(deps.pool, corpo);

export async function criarDemanda(
  deps: DepsComFila,
  ator: Ator,
  entrada: CriarDemanda,
  t?: Transacao,
  extras: { duvidasEntrada?: string[] } = {},
): Promise<DemandaVista> {
  autorizar(ator, 'criar_demanda');
  const autoria = autoriaDo(ator);
  const id = await executar(deps, t, async (tr) => {
    const { tx } = tr;
    // C-36: limite antes do id. O nextval só roda aqui, depois do Zod (na entrada) e do limite, dentro da transação.
    await conferirLimite(tx, ator, 'demanda', deps.relogio);
    const novoId = await proximoIdDemanda(tx, deps.relogio);
    const agora = deps.relogio.agora();
    // Campo a campo, e não `...entrada`: nada que o chamador tenha a mais chega ao banco (C-11).
    await tx.insert(demanda).values({
      id: novoId,
      titulo: entrada.titulo,
      tipo: entrada.tipo,
      status: 'nova',
      solicitanteNome: entrada.solicitanteNome,
      solicitantePapel: entrada.solicitantePapel ?? null,
      linhaServicoProvavel: entrada.linhaServicoProvavel ?? null,
      urgencia: entrada.urgencia ?? null,
      justificativaUrgencia: entrada.justificativaUrgencia ?? null,
      contexto: entrada.contexto ?? null,
      descricaoProblema: entrada.descricaoProblema ?? null,
      impactoPercebido: entrada.impactoPercebido ?? null,
      anexos: entrada.anexos,
      duvidasEntrada: extras.duvidasEntrada ?? [],
      ...autoria,
      rascunhoAgente: autoria.autorTipo === 'agente',
      criadaEm: agora,
      atualizadaEm: agora,
    });
    // C-30: só enumerações no evento; nada do solicitante nem de texto livre.
    await registrarEvento(
      tx,
      { ator, demandaId: novoId, entidade: 'demanda', entidadeId: novoId, acao: 'demanda_criada', depois: { status: 'nova', tipo: entrada.tipo } },
      deps.relogio,
    );
    // T28: com o insumo técnico ligado e sem suspensão, a execução e o job entram nesta transação (ADR-06).
    await dispararSeLigado(tr, deps, 'insumo_tecnico', `demanda:${novoId}`, novoId);
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
