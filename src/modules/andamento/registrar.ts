// src/modules/andamento/registrar.ts — o /construir informa o andamento de um Pedido de Construção (0.4.0; RF-02 a
// RF-06; ADR-30 a ADR-34; AN-01 a AN-08, AN-11). Só a integração `construir`, pela matriz, antes de abrir transação.
// Numa transação com o orçamento `padrao` e prazo total (AN-06): sem transação de quem chama e sem SET no corpo. Nesta
// ordem (RF-05):
//   1. trava do pedido (`pedido:<decId>`, a mesma da entrega e do recebimento, pendentes.ts);
//   2. só DEC com pedido gerado por pessoa, na demanda do próprio DEC (AN-03): senão, o mesmo 404 de DEC inexistente,
//      sem travar a demanda nem gravar;
//   3. trava da demanda; tudo o que decide é lido depois dela (ADR-32);
//   4. mesmo estado (os cinco campos): nada, 204 (vem antes dos 409, CA-05.9);
//   5. DEC não vigente: 409 (P-01);
//   6. contradição com status final: 409 (P-02), com status e tipo da linha travada (AN-04);
//   7. limite (60 por DEC, 600 no total), sob a última trava (ADR-31, AN-08);
//   8. a linha nova, com o prefixo do ator resolvido; a transição, se a tabela mandar; o evento, se mudou o marco.
// Nada enfileira job, dispara agente, manda aviso nem grava log (a linha de rota() basta, AN-11).
import { eq } from 'drizzle-orm';
import { andamentoConstrucao, pacoteDecisao } from '../../db/schema';
import type { Deps } from '../../lib/deps';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { atorDesconhecido, type Ator } from '../acesso/ator';
import { autorizar } from '../acesso/matriz';
import { MENSAGENS_ACESSO } from '../acesso/mensagens';
import { mudarStatusPeloConstruir } from '../demandas/transicoes';
import { registrarEvento } from '../historico/registrar';
import { executarComOrcamento } from '../integracoes/tempo-limite';
import { conferirLimiteDeAndamento } from '../limites';
import { aprovadoVigente } from '../pacotes-decisao/substituido';
import { pedidoGeradoPorPessoa, travarPedido } from '../pedido-construcao/pendentes';
import { travarDemanda } from '../versoes';
import { ultimoAndamento } from './consultas';
import { decidirPorStatus, lerAndamento, marcoDoEvento, mesmoEstado, mudancaDeMarco, type EstadoDoAndamento } from './regras';
import { MENSAGENS_ANDAMENTO, type CorpoAndamento } from './schemas';

export type DepsAndamento = Pick<Deps, 'pool' | 'relogio'>;

const naoEncontrado = () => new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);

// O prefixo só do ator resolvido; segunda barreira depois de autorizar (IN-02).
function prefixoDoConstruir(ator: Ator): string {
  switch (ator.tipo) {
    case 'integracao':
      if (ator.integracao === 'construir') return ator.prefixoToken;
      throw new ErroDominio('sem_permissao', MENSAGENS_ACESSO.sem_permissao);
    case 'pessoa':
    case 'agente':
    case 'sistema':
      throw new ErroDominio('sem_permissao', MENSAGENS_ACESSO.sem_permissao);
    default:
      return atorDesconhecido(ator);
  }
}

export async function registrarAndamento(deps: DepsAndamento, ator: Ator, decId: string, corpo: CorpoAndamento): Promise<void> {
  autorizar(ator, 'registrar_andamento');
  const prefixo = prefixoDoConstruir(ator);
  await executarComOrcamento(deps.pool, ator, 'padrao', undefined, async (t) => {
    const { tx } = t;
    await travarPedido(tx, decId);
    const gerado = await pedidoGeradoPorPessoa(tx, decId);
    if (!gerado) throw naoEncontrado();
    const [dec] = await tx.select({ demandaId: pacoteDecisao.demandaId }).from(pacoteDecisao).where(eq(pacoteDecisao.id, decId));
    if (!dec || dec.demandaId !== gerado.demandaId) throw naoEncontrado();
    const linha = await travarDemanda(tx, dec.demandaId);

    const anterior = lerAndamento(await ultimoAndamento(tx, linha.id));
    const novo: EstadoDoAndamento = { decId, fase: corpo.fase, tarefasProntas: corpo.tarefasProntas, tarefasTotal: corpo.tarefasTotal, statusConstrucao: corpo.status };
    if (mesmoEstado(anterior, novo)) return;
    if ((await aprovadoVigente(tx, linha.id))?.id !== decId) throw new ErroDominio('conflito', MENSAGENS_ANDAMENTO.decSubstituido);
    const decisao = decidirPorStatus({ status: linha.status, tipo: linha.tipo }, novo.statusConstrucao);
    if (decisao.tipo === 'recusa') throw new ErroDominio('conflito', MENSAGENS_ANDAMENTO.statusFinal);
    await conferirLimiteDeAndamento(tx, ator, decId, deps.relogio);

    await tx.insert(andamentoConstrucao).values({
      demandaId: linha.id,
      decId,
      fase: novo.fase,
      tarefasProntas: novo.tarefasProntas,
      tarefasTotal: novo.tarefasTotal,
      statusConstrucao: novo.statusConstrucao,
      atorTokenPrefixo: prefixo,
      gravadoEm: deps.relogio.agora(),
    });
    if (decisao.para !== null) await mudarStatusPeloConstruir(t, deps, ator, linha, novo.statusConstrucao);
    if (mudancaDeMarco(anterior, novo))
      await registrarEvento(
        tx,
        {
          ator,
          demandaId: linha.id,
          entidade: 'pacote_decisao',
          entidadeId: decId,
          acao: 'andamento_registrado',
          antes: anterior ? marcoDoEvento(anterior) : null,
          depois: marcoDoEvento(novo),
        },
        deps.relogio,
      );
  });
}
