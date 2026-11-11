// Ajudantes dos testes das integrações (T03): ator montado à mão, com o prefixo fictício `ficticio` (G3.3), e token de
// integração real, só gerado em tempo de teste, nunca escrito em arquivo, em log nem em mensagem de expect.
import { comTransacao } from '../src/db/transacao';
import type { Deps } from '../src/lib/deps';
import type { AtorIntegracao, Integracao } from '../src/modules/acesso/ator';
import { criarTokenDeIntegracao } from '../src/modules/acesso/tokens-servico';

export const atorDeIntegracao = (integracao: Integracao, prefixoToken = 'ficticio'): AtorIntegracao => ({ tipo: 'integracao', integracao, prefixoToken });

export async function tokenDeIntegracao(deps: Deps, integracao: Integracao): Promise<string> {
  return (await comTransacao(deps.pool, (t) => criarTokenDeIntegracao(t, integracao, deps.relogio))).token;
}
