// Desativação de conta (T-04, LGPD D6): quando a pessoa deixa a função, a conta para de entrar e perde o que a
// autenticava.
//
//   pnpm tsx scripts/desativar-conta.ts --email <e-mail>
//
// Numa transação só: `desativado_em` = agora e 2FA desligado na conta; sessões, segredo TOTP com os códigos de
// recuperação (two_factor) e a conta de senha (credential) apagados; evento `conta_desativada` do sistema. A linha da
// pessoa fica, porque o histórico e as decisões apontam para ela. Rodar de novo não muda nada nem grava outro evento.
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { account, session, twoFactor, user } from '../src/db/schema';
import { comTransacao } from '../src/db/transacao';
import { deZod } from '../src/lib/erros';
import { log } from '../src/lib/log';
import { registrarEvento } from '../src/modules/historico/registrar';
import { lerArgumentos } from './lib/argumentos';
import { rodarScript, type DepsDoScript } from './lib/saida';
import { ehExecucaoDireta } from './migrate';

export const argumentosDesativarConta = z.strictObject({ email: z.email() });

const SISTEMA = { tipo: 'sistema' } as const;

// true quando a conta foi desativada agora; false quando não há conta com o e-mail ou ela já estava desativada.
export async function desativarConta(deps: Pick<DepsDoScript, 'pool' | 'relogio'>, email: string): Promise<boolean> {
  const r = argumentosDesativarConta.safeParse({ email });
  if (!r.success) throw deZod(r.error);
  const alvo = r.data.email.toLowerCase();

  const desativada = await comTransacao(deps.pool, async ({ tx }) => {
    // FOR UPDATE: duas desativações ao mesmo tempo gravam um evento só.
    const [u] = await tx.select({ id: user.id, desativadoEm: user.desativadoEm }).from(user).where(eq(user.email, alvo)).for('update');
    if (!u || u.desativadoEm) return null;
    const agora = deps.relogio.agora();
    await tx.update(user).set({ desativadoEm: agora, twoFactorEnabled: false, updatedAt: agora }).where(eq(user.id, u.id));
    const sessoes = await tx.delete(session).where(eq(session.userId, u.id)).returning({ id: session.id });
    await tx.delete(twoFactor).where(eq(twoFactor.userId, u.id));
    await tx.delete(account).where(and(eq(account.userId, u.id), eq(account.providerId, 'credential')));
    await registrarEvento(
      tx,
      { ator: SISTEMA, entidade: 'usuario', entidadeId: u.id, acao: 'conta_desativada', antes: { ativa: true }, depois: { ativa: false } },
      deps.relogio,
    );
    return { sessoes: sessoes.length };
  });

  if (!desativada) return false;
  log.info({ evento: 'conta_desativada', atorTipo: 'sistema', quantidade: desativada.sessoes });
  return true;
}

if (ehExecucaoDireta(process.argv[1], import.meta.url, process.cwd())) {
  process.exitCode = await rodarScript(async (deps, argv, saida) => {
    const { email } = lerArgumentos(argumentosDesativarConta, argv);
    if (await desativarConta(deps, email)) {
      saida.write('Conta desativada: as sessões foram encerradas, e a senha e o 2FA foram apagados.\n');
      return 0;
    }
    saida.write('Nenhuma conta ativa com este e-mail. Nada foi alterado.\n');
    return 1;
  });
}
