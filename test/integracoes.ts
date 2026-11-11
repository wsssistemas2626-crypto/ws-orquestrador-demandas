// Ajudantes dos testes das integrações (T03, T04): ator montado à mão, com o prefixo fictício `ficticio` (G3.3), token
// de integração real, só gerado em tempo de teste, nunca escrito em arquivo, em log nem em mensagem de expect, e demanda
// do Awave gravada direto no banco (pelo migrator), como o POST do Awave gravaria (IN-05).
import { criarDb } from '../src/db';
import { demanda } from '../src/db/schema';
import type { StatusDemanda } from '../src/db/schema/demandas';
import { comTransacao } from '../src/db/transacao';
import type { Deps } from '../src/lib/deps';
import { NOME_DA_INTEGRACAO, type AtorIntegracao, type Integracao } from '../src/modules/acesso/ator';
import { criarTokenDeIntegracao } from '../src/modules/acesso/tokens-servico';
import type { BancoDeTeste } from './banco';

export const atorDeIntegracao = (integracao: Integracao, prefixoToken = 'ficticio'): AtorIntegracao => ({ tipo: 'integracao', integracao, prefixoToken });

export async function tokenDeIntegracao(deps: Deps, integracao: Integracao): Promise<string> {
  return (await comTransacao(deps.pool, (t) => criarTokenDeIntegracao(t, integracao, deps.relogio))).token;
}

// Demanda com autoria do awave (integracao, awave), sempre rascunho, solicitante "Awave" e papel "outro" (IN-05).
export async function inserirDemandaDeIntegracao(
  b: BancoDeTeste,
  d: { id: string; titulo?: string; criadaEm: Date; status?: StatusDemanda; contexto?: string; descricaoProblema?: string },
): Promise<void> {
  await criarDb(b.poolMigrator)
    .insert(demanda)
    .values({
      id: d.id,
      titulo: d.titulo ?? 'Demanda do Awave (fictício)',
      tipo: 'melhoria',
      status: d.status ?? 'nova',
      solicitanteNome: NOME_DA_INTEGRACAO.awave,
      solicitantePapel: 'outro',
      contexto: d.contexto ?? null,
      descricaoProblema: d.descricaoProblema ?? null,
      autorTipo: 'integracao',
      autorId: 'awave',
      rascunhoAgente: true,
      criadaEm: d.criadaEm,
      atualizadaEm: d.criadaEm,
    });
}
