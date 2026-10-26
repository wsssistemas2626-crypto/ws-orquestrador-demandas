// Better Auth fechado (ADR-11): só e-mail e senha, sem cadastro aberto (C-01), com 2FA por TOTP e mais nada (C-03).
// O papel é campo do servidor, nunca de entrada (C-02). Sessão de 8 h fixa, cookie HttpOnly e SameSite=Lax, com
// Secure e prefixo __Secure- em produção (C-07). O segredo TOTP e os códigos de recuperação são cifrados pelo plugin
// com o BETTER_AUTH_SECRET, conferido no boot por lerConfigApp (C-33).
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { twoFactor } from 'better-auth/plugins';
import type { Db } from '../../db';
import { account, session, twoFactor as tabelaTwoFactor, user, verification } from '../../db/schema';
import type { ConfigApp } from '../../lib/env';
import { log } from '../../lib/log';
import type { Relogio } from '../../lib/relogio';

export const EMISSOR_TOTP = 'WS Orquestrador de Demandas';
export const DURACAO_SESSAO_S = 60 * 60 * 8;

// `relogio` entra na assinatura para os ganchos da T09 (sessão sem 2FA, bloqueio da verificação); a configuração
// desta tarefa não lê hora.
export function criarAuth(op: { db: Db; config: ConfigApp; relogio?: Relogio }) {
  const { db, config } = op;
  return betterAuth({
    baseURL: config.urlBase,
    secret: config.segredoAuth,
    trustedOrigins: [new URL(config.urlBase).origin],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { user, session, account, verification, twoFactor: tabelaTwoFactor },
    }),
    // Sem sendResetPassword: a redefinição por e-mail não existe (C-03); a senha inicial vem do script da T32.
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 20 },
    user: {
      additionalFields: {
        papel: { type: 'string', input: false, required: true },
        desativadoEm: { type: 'date', input: false, required: false },
      },
      changeEmail: { enabled: false },
      deleteUser: { enabled: false },
    },
    session: { expiresIn: DURACAO_SESSAO_S, disableSessionRefresh: true },
    // Ligado também no desenvolvimento e no teste (o padrão do Better Auth só liga em produção).
    rateLimit: { enabled: true, window: 60, max: 10, storage: 'memory' },
    advanced: {
      // Explícitos: sem eles, o Better Auth desliga a conferência de origem quando NODE_ENV=test, e o teste deixaria
      // de provar o que vale em produção.
      disableOriginCheck: false,
      disableCSRFCheck: false,
      ipAddress: { ipAddressHeaders: [config.cabecalhoIp] },
      useSecureCookies: config.producao,
      cookiePrefix: 'wsod',
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax' },
    },
    // C-21: o logger padrão do Better Auth escreve no console a mensagem e os argumentos (num erro de banco, a
    // consulta com os parâmetros). Aqui vai só um evento fixo ao `log`, com o erro reduzido a { classe, code };
    // mensagem e argumentos são descartados. Abaixo de `warn`, nada sai.
    logger: {
      level: 'warn',
      log: (nivel, _mensagem, ...args: unknown[]) => {
        if (nivel !== 'error' && nivel !== 'warn') return;
        const erro = args.find((a) => a instanceof Error);
        log[nivel](erro ? { evento: 'better_auth', erro } : { evento: 'better_auth' });
      },
    },
    plugins: [twoFactor({ issuer: EMISSOR_TOTP, skipVerificationOnEnable: false }), nextCookies()],
  });
}

export type Auth = ReturnType<typeof criarAuth>;
