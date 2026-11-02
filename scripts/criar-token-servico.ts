// Criação de token de serviço de um agente (RF-02, C-09, C-37).
//
//   pnpm tsx scripts/criar-token-servico.ts --agente orquestrador|insumo_tecnico|risco|consolidacao
//
// O token é gerado aqui (32 bytes aleatórios com o prefixo `wsod_`, src/modules/acesso/tokens-servico.ts) e escrito uma
// vez na saída padrão, depois do commit. Ele nunca entra por argumento nem por variável de ambiente, nunca vai ao log e
// nunca vai ao histórico: o banco guarda só o SHA-256, e o evento `token_criado` leva só o agente e o prefixo.
import { z } from 'zod';
import { comTransacao } from '../src/db/transacao';
import type { Deps } from '../src/lib/deps';
import { deZod } from '../src/lib/erros';
import { log } from '../src/lib/log';
import { AGENTES, type Agente } from '../src/modules/acesso/ator';
import { criarTokenServico } from '../src/modules/acesso/tokens-servico';
import { registrarEvento } from '../src/modules/historico/registrar';
import { lerArgumentos } from './lib/argumentos';
import { rodarScript, type Saida } from './lib/saida';
import { ehExecucaoDireta } from './migrate';

// `--token` não existe: o strictObject recusa qualquer argumento fora deste (C-37).
export const argumentosCriarToken = z.strictObject({ agente: z.enum(AGENTES) });

const SISTEMA = { tipo: 'sistema' } as const;

export async function criarTokenPorScript(deps: Pick<Deps, 'pool' | 'relogio'>, agente: Agente, saida: Saida): Promise<{ prefixo: string }> {
  const r = argumentosCriarToken.safeParse({ agente });
  if (!r.success) throw deZod(r.error);

  const { token, prefixo } = await comTransacao(deps.pool, async (t) => {
    const criado = await criarTokenServico(t, r.data.agente, deps.relogio);
    await registrarEvento(
      t.tx,
      { ator: SISTEMA, entidade: 'token_servico', entidadeId: criado.prefixo, acao: 'token_criado', depois: { agente: r.data.agente, prefixo: criado.prefixo } },
      deps.relogio,
    );
    return criado;
  });

  log.info({ evento: 'token_criado', atorTipo: 'sistema', agente: r.data.agente });
  saida.write(
    `Token criado para o agente ${r.data.agente} (prefixo ${prefixo}).\n` +
      `Token, mostrado só esta vez: ${token}\n` +
      'Guarde o token agora, só no cofre de segredos de quem o usa. Para revogar, use o prefixo.\n',
  );
  return { prefixo };
}

// O `main` do script, exportado para teste: lê os argumentos, cria e sai com 0.
export async function executarCriarToken(deps: Pick<Deps, 'pool' | 'relogio'>, argv: readonly string[], saida: Saida): Promise<number> {
  const { agente } = lerArgumentos(argumentosCriarToken, argv);
  await criarTokenPorScript(deps, agente, saida);
  return 0;
}

if (ehExecucaoDireta(process.argv[1], import.meta.url, process.cwd())) {
  process.exitCode = await rodarScript(executarCriarToken);
}
