// Deps reais sobre o banco do teste: pool e Drizzle do papel do app, fila do pg-boss sobre o mesmo banco, Better Auth
// com CONFIG_TESTE e relógio fixo (RNF-15: teste nunca usa o relógio real). Quem cria chama `deps.fila.parar()` no fim.
import type { Deps } from '../src/lib/deps';
import { criarFila } from '../src/lib/fila';
import { relogioFixo, type Relogio } from '../src/lib/relogio';
import { criarAuth } from '../src/modules/acesso/auth';
import { CONFIG_TESTE } from './auth';
import type { BancoDeTeste } from './banco';

export const AGORA_TESTE = '2026-10-22T12:00:00Z';

export async function criarDepsDeTeste(banco: BancoDeTeste, op: { relogio?: Relogio } = {}): Promise<Deps> {
  const relogio = op.relogio ?? relogioFixo(AGORA_TESTE);
  const config = { ...CONFIG_TESTE, databaseUrl: banco.urlApp };
  const fila = await criarFila(banco.urlApp);
  return {
    db: banco.db,
    pool: banco.poolApp,
    relogio,
    fila,
    auth: criarAuth({ db: banco.db, config, relogio }),
    config,
  };
}
