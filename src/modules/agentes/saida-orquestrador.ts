// Destino do agente orquestrador (RF-05 CA-05.2, RF-15, T-01). A saída validada pelo schema vira a demanda, numa
// transação só com a execução (T27):
// - trava a entrada pendente da chave; se ela não existe mais (a pessoa já preencheu à mão), nao_encontrado e nada grava;
// - cria a demanda pelo serviço da API com o ator agente (passa por `autorizar` e pelo limite C-36): os campos vêm do
//   modelo, mas o nome e o papel do solicitante vêm da pendente, gravados pela pessoa, e os anexos começam vazios;
// - copia o texto original (não o minimizado), a origem e a data da entrada para `entrada_bruta` e apaga a pendente;
// - as perguntas ao solicitante vão para `duvidas_entrada` e levam a demanda a aguardando_informacao pelo ator sistema.
//   Nenhuma pergunta sai para o solicitante: quem decide se e como perguntar é uma pessoa (RF-15).
// Os avisos (`flags`) não são gravados nesta versão: a demanda não tem campo para eles.
import type { Transacao } from '../../db/transacao';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import type { AtorAgente } from '../acesso/ator';
import { converterEntradaPendente, pendenteDaChave, travarEntradaPendente } from '../demandas/entradas-pendentes';
import { criarDemanda } from '../demandas/servico';
import { mudarStatusPeloSistema } from '../demandas/transicoes';
import type { ExecucaoAgente } from './execucoes';
import type { DepsAgente } from './executar';
import type { SaidaOrquestrador } from './schemas';

export async function gravarSaidaOrquestrador(t: Transacao, deps: DepsAgente, ator: AtorAgente, exec: ExecucaoAgente, saida: SaidaOrquestrador): Promise<string> {
  const pendenteId = pendenteDaChave(exec.chaveEntrada);
  if (!pendenteId) throw new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);
  const pendente = await travarEntradaPendente(t.tx, pendenteId);
  // Campo a campo: nada da saída além destes chega à demanda (C-11, C-25).
  const demanda = await criarDemanda(
    deps,
    ator,
    {
      titulo: saida.titulo,
      tipo: saida.tipo,
      solicitanteNome: pendente.solicitanteNome,
      solicitantePapel: pendente.solicitantePapel ?? undefined,
      linhaServicoProvavel: saida.linhaServicoProvavel,
      urgencia: saida.urgencia,
      justificativaUrgencia: saida.justificativaUrgencia,
      contexto: saida.contexto,
      descricaoProblema: saida.descricaoProblema,
      impactoPercebido: saida.impactoPercebido,
      anexos: [],
    },
    t,
    { duvidasEntrada: saida.perguntasParaSolicitante },
  );
  await converterEntradaPendente(t.tx, pendente, demanda.id);
  if (saida.perguntasParaSolicitante.length > 0) await mudarStatusPeloSistema(t, deps, demanda.id, 'duvida_em_aberto');
  return demanda.id;
}
