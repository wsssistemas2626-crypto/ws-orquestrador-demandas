// Revogação de token de serviço pelo prefixo (RF-02, C-09, C-37).
//
//   pnpm tsx scripts/revogar-token-servico.ts --prefixo <8 caracteres depois de wsod_>
//
// O prefixo identifica o token sem revelá-lo: é o que o script de criação mostra e o que o histórico guarda. Numa
// transação: `revogado_em` = agora em todo token ativo com o prefixo e o evento `token_revogado` do sistema, com o
// prefixo. Rodar de novo, ou com prefixo sem token ativo, não muda nada nem grava evento.
//
// Vale para token de agente e de integração (`awave`, `construir`; 0.3.0, RF-02 do DEC-DEM-20261111-0016-v1), sem
// mudar de forma. Troca (a cada 12 meses, P-04, ou já, em suspeita de vazamento): emitir o novo por
// criar-token-servico.ts, trocar no cliente e só então revogar o antigo por aqui. Revogar um token não toca nos outros.
import { z } from 'zod';
import { comTransacao } from '../src/db/transacao';
import type { Deps } from '../src/lib/deps';
import { deZod } from '../src/lib/erros';
import { log } from '../src/lib/log';
import { revogarTokenServico } from '../src/modules/acesso/tokens-servico';
import { registrarEvento } from '../src/modules/historico/registrar';
import { lerArgumentos } from './lib/argumentos';
import { rodarScript, type Saida } from './lib/saida';
import { ehExecucaoDireta } from './migrate';

// O mesmo formato do prefixo gravado (tokens-servico.ts): 8 caracteres base64url.
export const argumentosRevogarToken = z.strictObject({ prefixo: z.string().regex(/^[A-Za-z0-9_-]{8}$/, 'O prefixo tem 8 caracteres: letras, números, - ou _.') });

const SISTEMA = { tipo: 'sistema' } as const;

// true quando revogou agora; false quando não há token ativo com o prefixo.
export async function revogarTokenPorScript(deps: Pick<Deps, 'pool' | 'relogio'>, prefixo: string): Promise<boolean> {
  const r = argumentosRevogarToken.safeParse({ prefixo });
  if (!r.success) throw deZod(r.error);

  const revogou = await comTransacao(deps.pool, async (t) => {
    if (!(await revogarTokenServico(t, r.data.prefixo, deps.relogio))) return false;
    await registrarEvento(
      t.tx,
      { ator: SISTEMA, entidade: 'token_servico', entidadeId: r.data.prefixo, acao: 'token_revogado', depois: { prefixo: r.data.prefixo } },
      deps.relogio,
    );
    return true;
  });

  if (revogou) log.info({ evento: 'token_revogado', atorTipo: 'sistema' });
  return revogou;
}

// O `main` do script, exportado para teste: 0 quando revogou, 1 quando não havia token ativo com o prefixo.
export async function executarRevogarToken(deps: Pick<Deps, 'pool' | 'relogio'>, argv: readonly string[], saida: Saida): Promise<number> {
  const { prefixo } = lerArgumentos(argumentosRevogarToken, argv);
  if (await revogarTokenPorScript(deps, prefixo)) {
    saida.write(`Token de prefixo ${prefixo} revogado. Ele deixa de valer agora.\n`);
    return 0;
  }
  saida.write('Nenhum token ativo com este prefixo. Nada foi alterado.\n');
  return 1;
}

if (ehExecucaoDireta(process.argv[1], import.meta.url, process.cwd())) {
  process.exitCode = await rodarScript(executarRevogarToken);
}
