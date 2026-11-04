// Criação do pacote de decisão (DEC, RF-10, RF-11). Cada gravação é uma versão nova e imutável: o papel do app só tem
// SELECT e INSERT na tabela (C-34). Numa transação: autorizar → trava da demanda (CA-04.3; fecha também a corrida com
// ESP ou RSK nova) → recusa em status final (409, M-02) → limite por ator (C-36) → a ESP e o RSK citados (os que o worker
// leu, M-01; senão os de maior versão), ou 400 com o que falta → próxima versão →
// insert com a cópia da demanda (RF-22) e a autoria só do ator (C-11) → evento sem texto livre (C-30) → a demanda vai a
// pronta_para_decisao pelo ator sistema (RF-07) → aviso por e-mail pendente e o job dele (RF-25, T30). Aceita a
// transação de quem chama (G3.8): o worker grava a versão, a execução e o job juntos (ADR-02, ADR-06). A entrada já
// chega validada pelo Zod (rota, Server Action ou job). B-3 do 0010: os nomes do solicitante da vista do 201 saem da
// linha travada, no fim da mesma transação; a rota usa criarPacoteDecisaoComNomes e não lê mais os nomes fora da trava.
// Se essa conta falhar, a transação inteira volta (nem versão, nem status, nem aviso).
import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../../db';
import { especificacaoTecnica, pacoteDecisao, parecerRisco } from '../../db/schema';
import type { NivelAprovacao, Opcao } from '../../db/schema/decisao';
import { comTransacao, type Transacao } from '../../db/transacao';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import type { Ator } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import { agendarAviso } from '../avisos/aviso-dec';
import { nomesDoSolicitante } from '../demandas/consultas';
import { autoriaDo, type DepsComFila } from '../demandas/servico';
import { mudarStatusPeloSistema, recusarSeDemandaFinal } from '../demandas/transicoes';
import { registrarEvento } from '../historico/registrar';
import { conferirLimite } from '../limites';
import { idVersao, proximaVersao, travarDemanda } from '../versoes';
import { obterPacoteDecisao, type PacoteDecisaoVista } from './consultas';
import type { CriarPacoteDecisao } from './schemas';

export const MENSAGEM_FALTAM_ITENS = 'Faltam itens para o pacote.';

// 08-correcao, A-04: o nível de aprovação nunca vem do modelo. O DEC de agente (pelo worker ou pela rota com token de
// agente) nasce sempre no nível mais exigente, com a dupla aprovação e o documento assinado (RF-14); o campo que o
// agente mandar é ignorado. Rebaixar para cto é decisão de pessoa, criando uma versão nova do DEC pelo painel ou pela API.
export const NIVEL_DO_DEC_DE_AGENTE: NivelAprovacao = 'cto_e_administradora';

// Texto opcional que, aparado, ficou vazio não é gravado: a versão é imutável, e quem lê não precisa tratar '' e null
// como iguais (mesma regra do RSK).
const preenchido = (v: string | null | undefined): v is string => typeof v === 'string' && v.trim() !== '';

const PARTES_DA_DESCRICAO = [
  ['contexto', 'Contexto'],
  ['descricaoProblema', 'Problema'],
  ['impactoPercebido', 'Impacto percebido'],
] as const;

// "Contexto: ...\n\nProblema: ...\n\nImpacto percebido: ...", só com as partes preenchidas. É a `descricao` do Pedido de
// Construção (RF-22), copiada no DEC para não mudar quando a demanda for editada.
export function descricaoDaDemanda(d: { contexto?: string | null; descricaoProblema?: string | null; impactoPercebido?: string | null }): string {
  return PARTES_DA_DESCRICAO.flatMap(([campo, rotulo]) => {
    const v = d[campo];
    return preenchido(v) ? [`${rotulo}: ${v}`] : [];
  }).join('\n\n');
}

// Campo a campo, e só o que veio preenchido: nada a mais chega ao jsonb.
function opcaoGravada(o: CriarPacoteDecisao['opcaoA']): Opcao {
  return {
    descricao: o.descricao,
    ...(preenchido(o.vantagens) ? { vantagens: o.vantagens } : {}),
    ...(preenchido(o.desvantagens) ? { desvantagens: o.desvantagens } : {}),
    ...(preenchido(o.quandoEscolher) ? { quandoEscolher: o.quandoEscolher } : {}),
  };
}

type TabelaCitada = typeof especificacaoTecnica | typeof parecerRisco;

async function maisNova(tx: Db, tabela: TabelaCitada, demandaId: string) {
  const [linha] = await tx.select({ id: tabela.id, versao: tabela.versao }).from(tabela).where(eq(tabela.demandaId, demandaId)).orderBy(desc(tabela.versao)).limit(1);
  return linha;
}

// M-01: a versão que o worker leu, pelo id e pela demanda. Id que não existe ou é de outra demanda: 404, sem gravar.
async function citada(tx: Db, tabela: TabelaCitada, id: string, demandaId: string) {
  const [linha] = await tx
    .select({ id: tabela.id, versao: tabela.versao })
    .from(tabela)
    .where(and(eq(tabela.id, id), eq(tabela.demandaId, demandaId)));
  if (!linha) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);
  return linha;
}

// `especificacaoId` e `parecerRiscoId` só vêm do worker (a ESP e o RSK que a entrada da consolidação leu, M-01). Rota e
// Server Action nunca os passam: não vêm do corpo da requisição nem da saída do modelo (C-11, C-25).
export type ExtrasDoPacote = { execucaoAgenteId?: string; especificacaoId?: string; parecerRiscoId?: string };

export async function criarPacoteDecisao(
  deps: DepsComFila,
  ator: Ator,
  demandaId: string,
  entrada: CriarPacoteDecisao,
  t?: Transacao,
  extras: ExtrasDoPacote = {},
): Promise<PacoteDecisaoVista> {
  return (await criarComNomes(deps, ator, demandaId, entrada, t, extras)).vista;
}

// B-3 do 0010: para a rota. Quatro argumentos, sem `t` nem `extras` (C-11, C-25): a rota não tem como citar ESP ou RSK
// nem passar transação. A guarda test/estatico/pacote-sem-extras.test.ts cobre esta função também.
export async function criarPacoteDecisaoComNomes(
  deps: DepsComFila,
  ator: Ator,
  demandaId: string,
  entrada: CriarPacoteDecisao,
): Promise<{ vista: PacoteDecisaoVista; nomes: string[] }> {
  return criarComNomes(deps, ator, demandaId, entrada);
}

async function criarComNomes(
  deps: DepsComFila,
  ator: Ator,
  demandaId: string,
  entrada: CriarPacoteDecisao,
  t?: Transacao,
  extras: ExtrasDoPacote = {},
): Promise<{ vista: PacoteDecisaoVista; nomes: string[] }> {
  autorizar(ator, 'criar_pacote_decisao');
  const autoria = autoriaDo(ator);
  const rascunhoAgente = autoria.autorTipo === 'agente';
  const nivelAprovacaoRequerido = rascunhoAgente ? NIVEL_DO_DEC_DE_AGENTE : entrada.nivelAprovacaoRequerido;
  const corpo = async (tr: Transacao): Promise<{ id: string; nomes: string[] }> => {
    const { tx } = tr;
    const d = await travarDemanda(tx, demandaId);
    recusarSeDemandaFinal(d.status);
    await conferirLimite(tx, ator, 'artefato', deps.relogio);
    // O worker cita a ESP e o RSK que a entrada leu (M-01): se entrou versão mais nova depois, o DEC nasce desatualizado.
    // Pessoa e rota citam os mais novos, sob a trava: nenhuma ESP ou RSK nova entra entre esta leitura e o insert.
    const esp = extras.especificacaoId
      ? await citada(tx, especificacaoTecnica, extras.especificacaoId, demandaId)
      : await maisNova(tx, especificacaoTecnica, demandaId);
    const rsk = extras.parecerRiscoId ? await citada(tx, parecerRisco, extras.parecerRiscoId, demandaId) : await maisNova(tx, parecerRisco, demandaId);
    if (!esp || !rsk) {
      const faltando = [...(esp ? [] : ['especificacao']), ...(rsk ? [] : ['parecer_risco'])];
      throw new ErroDominio('entrada_invalida', MENSAGEM_FALTAM_ITENS, { faltando });
    }
    const versao = await proximaVersao(tx, pacoteDecisao, demandaId);
    const id = idVersao('DEC', demandaId, versao);
    // Campo a campo, e não `...entrada`: nada que o chamador tenha a mais chega ao banco (C-11).
    await tx.insert(pacoteDecisao).values({
      id,
      demandaId,
      versao,
      especificacaoId: esp.id,
      especificacaoVersao: esp.versao,
      parecerRiscoId: rsk.id,
      parecerRiscoVersao: rsk.versao,
      demandaTipo: d.tipo,
      demandaTitulo: d.titulo,
      demandaDescricao: descricaoDaDemanda(d),
      resumoExecutivo: entrada.resumoExecutivo,
      opcaoA: opcaoGravada(entrada.opcaoA),
      opcaoB: opcaoGravada(entrada.opcaoB),
      recomendacao: preenchido(entrada.recomendacao) ? entrada.recomendacao : null,
      nivelAprovacaoRequerido,
      ...autoria,
      rascunhoAgente,
      execucaoAgenteId: extras.execucaoAgenteId ?? null,
      criadaEm: deps.relogio.agora(),
    });
    // C-30: só ids, números e enumerações; nada do resumo, das opções nem da recomendação, que podem trazer dado de
    // terceiro.
    await registrarEvento(
      tx,
      {
        ator,
        demandaId,
        entidade: 'pacote_decisao',
        entidadeId: id,
        acao: 'pacote_decisao_criado',
        depois: { versao, rascunhoAgente, especificacaoId: esp.id, parecerRiscoId: rsk.id, nivelAprovacaoRequerido },
      },
      deps.relogio,
    );
    await mudarStatusPeloSistema(tr, deps, demandaId, 'dec_criado');
    // RF-25: um aviso por DEC, na mesma transação; o rollback leva o aviso e o job junto.
    await agendarAviso(tr, deps, id);
    // B-3 do 0010: o nome da linha travada, que nenhuma renomeação muda até o commit.
    return { id, nomes: nomesDoSolicitante(d.solicitanteNome) };
  };
  const { id, nomes } = t ? await corpo(t) : await comTransacao(deps.pool, corpo);
  return { vista: await obterPacoteDecisao(t?.tx ?? deps.db, id), nomes };
}
