// Serviço da especificação técnica (ESP, RF-08, RF-11, RF-15). Cada gravação é uma versão nova e imutável: o papel do
// app só tem SELECT e INSERT na tabela (C-34). Numa transação: autorizar → trava da demanda (CA-04.3) → limite por ator
// (C-36) → regra de construção com o tipo atual da demanda → próxima versão → insert com a autoria só do ator (C-11) →
// evento sem texto livre (C-30) → com dúvida em aberto, a demanda vai a aguardando_informacao pelo ator sistema, sem
// nenhuma mensagem ao solicitante (CA-15.1, CA-15.2); sem dúvida, dispara o agente de risco (T28). Aceita a transação de quem chama (G3.8): o worker grava a versão,
// a execução e o job juntos (ADR-02, ADR-06). A entrada já chega validada pelo Zod (rota, Server Action ou job).
import { especificacaoTecnica } from '../../db/schema';
import { comTransacao, type Transacao } from '../../db/transacao';
import { ErroDominio } from '../../lib/erros';
import type { Ator } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import { dispararSeLigado } from '../agentes/gatilhos';
import { registrarEvento } from '../historico/registrar';
import { autoriaDo, type DepsComFila } from '../demandas/servico';
import { mudarStatusPeloSistema } from '../demandas/transicoes';
import { conferirLimite } from '../limites';
import { idVersao, proximaVersao, travarDemanda } from '../versoes';
import { obterEspecificacao, type EspecificacaoVista } from './consultas';
import { validarCamposDeConstrucao, type CriarEspecificacao } from './schemas';

export const MENSAGEM_CAMPOS_INVALIDOS = 'Corrija os campos abaixo para continuar.';

export async function criarEspecificacao(
  deps: DepsComFila,
  ator: Ator,
  demandaId: string,
  entrada: CriarEspecificacao,
  t?: Transacao,
  extras: { execucaoAgenteId?: string } = {},
): Promise<EspecificacaoVista> {
  autorizar(ator, 'criar_especificacao');
  const autoria = autoriaDo(ator);
  const corpo = async (tr: Transacao): Promise<string> => {
    const { tx } = tr;
    const atual = await travarDemanda(tx, demandaId);
    await conferirLimite(tx, ator, 'artefato', deps.relogio);
    const campos = validarCamposDeConstrucao(atual.tipo, entrada);
    if (campos.length > 0) throw new ErroDominio('entrada_invalida', MENSAGEM_CAMPOS_INVALIDOS, { campos });
    const versao = await proximaVersao(tx, especificacaoTecnica, demandaId);
    const id = idVersao('ESP', demandaId, versao);
    // Campo a campo, e não `...entrada`: nada que o chamador tenha a mais chega ao banco (C-11).
    await tx.insert(especificacaoTecnica).values({
      id,
      demandaId,
      versao,
      descricaoObjetiva: entrada.descricaoObjetiva,
      situacaoAtual: entrada.situacaoAtual ?? null,
      situacaoDesejada: entrada.situacaoDesejada ?? null,
      escopoInclui: entrada.escopoInclui,
      escopoExclui: entrada.escopoExclui,
      sistemasErp: entrada.sistemasErp ?? null,
      sistemasEcommerceMarketplace: entrada.sistemasEcommerceMarketplace ?? null,
      sistemasApisTerceiros: entrada.sistemasApisTerceiros ?? null,
      sistemasServicosInternos: entrada.sistemasServicosInternos ?? null,
      dadosEntidades: entrada.dadosEntidades ?? null,
      dadosCamposCriticos: entrada.dadosCamposCriticos ?? null,
      restricoesTecnicas: entrada.restricoesTecnicas ?? null,
      duvidasEmAberto: entrada.duvidasEmAberto,
      sistemaAlvo: entrada.sistemaAlvo ?? null,
      repositorioDestino: entrada.repositorioDestino ?? null,
      criteriosAceitePreliminares: entrada.criteriosAceitePreliminares ?? null,
      definicaoDePronto: entrada.definicaoDePronto ?? null,
      ...autoria,
      rascunhoAgente: autoria.autorTipo === 'agente',
      execucaoAgenteId: extras.execucaoAgenteId ?? null,
      criadaEm: deps.relogio.agora(),
    });
    // C-30: só a versão e se é rascunho; nada dos campos de texto, que podem trazer dado de terceiro.
    await registrarEvento(
      tx,
      { ator, demandaId, entidade: 'especificacao', entidadeId: id, acao: 'especificacao_criada', depois: { versao, rascunhoAgente: autoria.autorTipo === 'agente' } },
      deps.relogio,
    );
    if (entrada.duvidasEmAberto.length > 0) await mudarStatusPeloSistema(tr, deps, demandaId, 'duvida_em_aberto');
    // T28: ESP sem dúvida dispara o agente de risco, se ligado e sem suspensão, nesta transação (ADR-06).
    else await dispararSeLigado(tr, deps, 'risco', `esp:${id}`, demandaId);
    return id;
  };
  const id = t ? await corpo(t) : await comTransacao(deps.pool, corpo);
  return obterEspecificacao(t?.tx ?? deps.db, id);
}
