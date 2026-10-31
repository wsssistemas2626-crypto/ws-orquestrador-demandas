// Better Auth fechado (ADR-11): só e-mail e senha, sem cadastro aberto (C-01), com 2FA por TOTP e mais nada (C-03).
// O papel é campo do servidor, nunca de entrada (C-02). Sessão de 8 h fixa, cookie HttpOnly e SameSite=Lax, com
// Secure e prefixo __Secure- sempre que o BETTER_AUTH_URL é https (C-07; a produção só sobe com https, ou http no
// loopback, por lerConfigApp). O segredo TOTP e os códigos de recuperação são cifrados pelo plugin
// com o BETTER_AUTH_SECRET, conferido no boot por lerConfigApp (C-33).
//
// Ganchos (T09): a verificação do código nunca "confia neste dispositivo" (C-05) e respeita o bloqueio por conta de
// C-06; login que falha vai ao log sem o e-mail (C-21); ativar e desativar o 2FA gravam evento (C-08).
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { nextCookies } from 'better-auth/next-js';
import { twoFactor } from 'better-auth/plugins';
import type { Db } from '../../db';
import { account, session, twoFactor as tabelaTwoFactor, user, verification } from '../../db/schema';
import type { ConfigApp } from '../../lib/env';
import { log } from '../../lib/log';
import { relogioDoSistema, type Relogio } from '../../lib/relogio';
import { registrarEvento } from '../historico/registrar';
import { ehPapel, type AtorPessoa } from './ator';
import { registrarFalhaDeVerificacao, verificacaoBloqueada, zerarFalhasDeVerificacao } from './bloqueio-verificacao';

export const EMISSOR_TOTP = 'WS Orquestrador de Demandas';
export const DURACAO_SESSAO_S = 60 * 60 * 8;

// 08-correcao: Secure pelo protocolo da URL do app, e não pelo NODE_ENV. Cookie Secure só volta por https: com o NODE_ENV,
// o build de produção em http://127.0.0.1 (o e2e com `next start`) não mantinha sessão. Com https, nada muda.
export const usarCookiesSeguros = (urlBase: string): boolean => new URL(urlBase).protocol === 'https:';

// Rotas do plugin twoFactor que conferem um código. `verify-otp` (código por e-mail) não está configurada, mas entra na
// lista para nunca ficar fora do bloqueio nem do `trustDevice` falso.
const CAMINHOS_VERIFICACAO = new Set([
  '/two-factor/verify-totp',
  '/two-factor/verify-backup-code',
  '/two-factor/verify-otp',
]);
const MENSAGEM_BLOQUEIO = 'Muitas tentativas de código. A verificação desta conta está bloqueada por 15 minutos.';

// `pessoa` só existe quando há sessão (na ativação); no login, a verificação não grava evento.
type AlvoDaVerificacao = { usuarioId: string; ativando: boolean; pessoa: AtorPessoa | null };
type ContextoDoGancho = Parameters<Parameters<typeof createAuthMiddleware>[0]>[0];

// A pessoa da sessão como ator do histórico. O papel é NOT NULL com CHECK no banco; fora de PAPEIS, não há ator.
const pessoaDaSessao = (u: { id: string; name: string; papel?: unknown }): AtorPessoa | null =>
  ehPapel(u.papel) ? { tipo: 'pessoa', usuarioId: u.id, nome: u.name, papel: u.papel } : null;

// Evento de ativação ou desativação do 2FA (C-08): a própria pessoa como ator, e em `antes` e `depois` só o booleano,
// nunca o segredo.
async function registrarEventoDe2fa(db: Db, relogio: Relogio, pessoa: AtorPessoa, ativo: boolean): Promise<void> {
  await registrarEvento(
    db,
    {
      ator: pessoa,
      entidade: 'usuario',
      entidadeId: pessoa.usuarioId,
      acao: ativo ? '2fa_ativado' : '2fa_desativado',
      antes: { twoFactorEnabled: !ativo },
      depois: { twoFactorEnabled: ativo },
    },
    relogio,
  );
}

const falhou = (devolvido: unknown): devolvido is APIError | Response =>
  devolvido instanceof APIError || (devolvido instanceof Response && !devolvido.ok);
const statusDe = (devolvido: APIError | Response): number =>
  devolvido instanceof APIError ? devolvido.statusCode : devolvido.status;

export function criarAuth(op: { db: Db; config: ConfigApp; relogio?: Relogio }) {
  const { db, config } = op;
  const relogio = op.relogio ?? relogioDoSistema;
  // Quem está verificando, apurado no `before` e usado no `after` da mesma requisição.
  const alvos = new WeakMap<object, AlvoDaVerificacao>();

  // Na ativação, a pessoa tem sessão e ainda não tem 2FA. No login, ainda não tem sessão: o usuário pendente vem do
  // cookie assinado de dois fatores, pelo mesmo caminho do plugin (cookie → verification → id do usuário).
  const apurarAlvo = async (ctx: ContextoDoGancho): Promise<AlvoDaVerificacao | null> => {
    const sessao = await getSessionFromCtx(ctx).catch(() => null);
    if (sessao) {
      return { usuarioId: sessao.user.id, ativando: sessao.user.twoFactorEnabled !== true, pessoa: pessoaDaSessao(sessao.user) };
    }
    const nomeDoCookie = ctx.context.createAuthCookie('two_factor').name;
    const identificador = await ctx.getSignedCookie(nomeDoCookie, ctx.context.secret);
    if (!identificador) return null;
    const pendente = await ctx.context.internalAdapter.findVerificationValue(identificador);
    return pendente ? { usuarioId: pendente.value, ativando: false, pessoa: null } : null;
  };

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
    // Ligado também no desenvolvimento e no teste (o padrão do Better Auth só liga em produção). O login tem regra
    // própria explícita: a padrão do Better Auth para /sign-in (3 em 10 s, zerada a cada 10 s sem pedido) deixa passar
    // mais de 10 tentativas por minuto em ritmo espaçado (RNF-12, C-06).
    rateLimit: {
      enabled: true,
      window: 60,
      max: 10,
      storage: 'memory',
      customRules: { '/sign-in/email': { window: 60, max: 10 } },
    },
    advanced: {
      // Explícitos: sem eles, o Better Auth desliga a conferência de origem quando NODE_ENV=test, e o teste deixaria
      // de provar o que vale em produção.
      disableOriginCheck: false,
      disableCSRFCheck: false,
      ipAddress: { ipAddressHeaders: [config.cabecalhoIp] },
      useSecureCookies: usarCookiesSeguros(config.urlBase),
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
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (!CAMINHOS_VERIFICACAO.has(ctx.path)) return;
        const alvo = await apurarAlvo(ctx);
        if (alvo) {
          if (await verificacaoBloqueada(db, alvo.usuarioId, relogio.agora())) {
            // Resposta pronta, e não `throw`: o erro lançado num gancho é escrito no console pelo logger padrão do
            // Better Auth, fora do `log` (C-21). Devolvida aqui, a requisição para antes do plugin e do `after`.
            return Response.json({ message: MENSAGEM_BLOQUEIO, code: 'VERIFICACAO_BLOQUEADA' }, { status: 429 });
          }
          const chave = ctx.request ?? ctx.headers;
          if (chave) alvos.set(chave, alvo);
        }
        // C-05: "confiar neste dispositivo" não existe; o que vier no corpo é trocado por false.
        return { context: { body: { ...(ctx.body as Record<string, unknown> | undefined), trustDevice: false } } };
      }),
      after: createAuthMiddleware(async (ctx) => {
        const devolvido = ctx.context.returned;
        if (ctx.path === '/sign-in/email') {
          // C-21: só o evento e o tipo de ator; nada do corpo (e-mail, senha) nem da mensagem do erro.
          if (falhou(devolvido)) log.warn({ evento: 'login_falhou', atorTipo: 'anonimo' });
          return;
        }
        if (ctx.path === '/two-factor/disable') {
          if (falhou(devolvido)) return;
          const sessao = await getSessionFromCtx(ctx).catch(() => null);
          const pessoa = sessao ? pessoaDaSessao(sessao.user) : null;
          if (pessoa) await registrarEventoDe2fa(db, relogio, pessoa, false);
          return;
        }
        if (!CAMINHOS_VERIFICACAO.has(ctx.path)) return;
        const chave = ctx.request ?? ctx.headers;
        const alvo = chave ? alvos.get(chave) : undefined;
        if (chave) alvos.delete(chave);
        if (!alvo) return;
        if (falhou(devolvido)) {
          // 429 é bloqueio (o do plugin): não é código conferido, não soma.
          if (statusDe(devolvido) !== 429) await registrarFalhaDeVerificacao(db, alvo.usuarioId, relogio.agora());
          return;
        }
        await zerarFalhasDeVerificacao(db, alvo.usuarioId);
        if (alvo.ativando && alvo.pessoa) await registrarEventoDe2fa(db, relogio, alvo.pessoa, true);
      }),
    },
    plugins: [twoFactor({ issuer: EMISSOR_TOTP, skipVerificationOnEnable: false }), nextCookies()],
  });
}

export type Auth = ReturnType<typeof criarAuth>;
