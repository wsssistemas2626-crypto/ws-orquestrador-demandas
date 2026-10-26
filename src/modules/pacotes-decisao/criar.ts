// Criação do pacote de decisão (DEC, RF-10, RF-11). Cada gravação é uma versão nova e imutável: o papel do app só tem
// SELECT e INSERT na tabela (C-34). Numa transação: autorizar → trava da demanda (CA-04.3; fecha também a corrida com
// ESP ou RSK nova) → limite por ator (C-36) → a ESP e o RSK de maior versão, ou 400 com o que falta → próxima versão →
// insert com a cópia da demanda (RF-22) e a autoria só do ator (C-11) → evento sem texto livre (C-30) → a demanda vai a
// pronta_para_decisao pelo ator sistema (RF-07). Aceita a transação de quem chama (G3.8): o worker grava a versão, a
// execução e o job juntos (ADR-02, ADR-06). A entrada já chega validada pelo Zod (rota, Server Action ou job).
import { desc, eq } from 'drizzle-orm';
import type { Db } from '../../db';
import { especificacaoTecnica, pacoteDecisao, parecerRisco } from '../../db/schema';
import type { Opcao } from '../../db/schema/decisao';
import { comTransacao, type Transacao } from '../../db/transacao';
import { ErroDominio } from '../../lib/erros';
import type { Ator } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import { autoriaDo, type DepsDemanda } from '../demandas/servico';
import { mudarStatusPeloSistema } from '../demandas/transicoes';
import { registrarEvento } from '../historico/registrar';
import { conferirLimite } from '../limites';
import { idVersao, proximaVersao, travarDemanda } from '../versoes';
import { obterPacoteDecisao, type PacoteDecisaoVista } from './consultas';
import type { CriarPacoteDecisao } from './schemas';

export const MENSAGEM_FALTAM_ITENS = 'Faltam itens para o pacote.';

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

async function maisNova(tx: Db, tabela: typeof especificacaoTecnica | typeof parecerRisco, demandaId: string) {
  const [linha] = await tx.select({ id: tabela.id, versao: tabela.versao }).from(tabela).where(eq(tabela.demandaId, demandaId)).orderBy(desc(tabela.versao)).limit(1);
  return linha;
}

export async function criarPacoteDecisao(
  deps: DepsDemanda,
  ator: Ator,
  demandaId: string,
  entrada: CriarPacoteDecisao,
  t?: Transacao,
  extras: { execucaoAgenteId?: string } = {},
): Promise<PacoteDecisaoVista> {
  autorizar(ator, 'criar_pacote_decisao');
  const autoria = autoriaDo(ator);
  const rascunhoAgente = autoria.autorTipo === 'agente';
  const corpo = async (tr: Transacao): Promise<string> => {
    const { tx } = tr;
    const d = await travarDemanda(tx, demandaId);
    await conferirLimite(tx, ator, 'artefato', deps.relogio);
    // Com a trava, nenhuma ESP ou RSK nova entra entre esta leitura e o insert.
    const esp = await maisNova(tx, especificacaoTecnica, demandaId);
    const rsk = await maisNova(tx, parecerRisco, demandaId);
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
      nivelAprovacaoRequerido: entrada.nivelAprovacaoRequerido,
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
        depois: { versao, rascunhoAgente, especificacaoId: esp.id, parecerRiscoId: rsk.id, nivelAprovacaoRequerido: entrada.nivelAprovacaoRequerido },
      },
      deps.relogio,
    );
    await mudarStatusPeloSistema(tr, deps, demandaId, 'dec_criado');
    return id;
  };
  const id = t ? await corpo(t) : await comTransacao(deps.pool, corpo);
  return obterPacoteDecisao(t?.tx ?? deps.db, id);
}
