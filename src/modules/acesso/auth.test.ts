import type { BetterAuthOptions } from 'better-auth';
import { eq, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { CONFIG_TESTE, criarContaDeTeste } from '../../../test/auth';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { contemSentinela, SENTINELAS } from '../../../test/sentinelas';
import { substituirDestinoDoLog } from '../../lib/log';
import { account, twoFactor, user, verification } from '../../db/schema';
import { criarAuth, type Auth } from './auth';

let b: BancoDeTeste;
let auth: Auth;
beforeAll(async () => {
  b = await novoBanco();
  auth = criarAuth({ db: b.db, config: CONFIG_TESTE });
});
afterAll(async () => {
  await b.fechar();
});

// Cada teste usa um IP fictício próprio (faixa de documentação 198.51.100.0/24), para o limite por IP de um não
// interferir no outro.
const post = (caminho: string, corpo: unknown, cabecalhos: Record<string, string> = {}) =>
  auth.handler(
    new Request(`${CONFIG_TESTE.urlBase}/api/auth${caminho}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: CONFIG_TESTE.urlBase,
        'x-real-ip': '198.51.100.7',
        ...cabecalhos,
      },
      body: JSON.stringify(corpo),
    }),
  );
const cookieDe = (r: Response) =>
  r.headers
    .getSetCookie()
    .map((s) => s.split(';')[0])
    .join('; ');

describe('Better Auth fechado', () => {
  it('C-01: sign-up/email não cria usuário', async () => {
    const r = await post('/sign-up/email', {
      email: 'nova@exemplo.test',
      password: 'senha-ficticia-com-20-caracteres',
      name: 'Pessoa Ficticia',
    });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(await b.db.select().from(user).where(eq(user.email, 'nova@exemplo.test'))).toEqual([]);
  });

  it('C-02: ninguém promove o próprio papel por update-user', async () => {
    const c = await criarContaDeTeste(auth, { papel: 'administradora' });
    const login = await post('/sign-in/email', { email: c.email, password: c.senha }, { 'x-real-ip': '198.51.100.8' });
    expect(login.status).toBe(200);
    await post('/update-user', { papel: 'cto' }, { cookie: cookieDe(login), 'x-real-ip': '198.51.100.8' });
    const [u] = await b.db.select().from(user).where(eq(user.id, c.usuarioId));
    expect(u!.papel).toBe('administradora');
  });

  it('C-02: desativadoEm também não é campo de entrada', async () => {
    const c = await criarContaDeTeste(auth, { papel: 'cto' });
    const login = await post('/sign-in/email', { email: c.email, password: c.senha }, { 'x-real-ip': '198.51.100.9' });
    await post('/update-user', { desativadoEm: null, name: 'Pessoa Ficticia Dois' }, { cookie: cookieDe(login), 'x-real-ip': '198.51.100.9' });
    const [u] = await b.db.select().from(user).where(eq(user.id, c.usuarioId));
    expect(u!.desativadoEm).toBeNull();
    expect(u!.papel).toBe('cto');
  });

  it('C-03: só os plugins previstos e nada de troca de e-mail, exclusão ou redefinição por e-mail', () => {
    // Lido pelo tipo geral: o inferido de `auth.options` só tem as chaves que a configuração escreveu.
    const opcoes: BetterAuthOptions = auth.options;
    expect(opcoes.plugins!.map((p) => p.id).sort()).toEqual(['next-cookies', 'two-factor']);
    expect(opcoes.user?.changeEmail?.enabled).toBe(false);
    expect(opcoes.user?.deleteUser?.enabled).toBe(false);
    expect(opcoes.emailAndPassword?.sendResetPassword).toBeUndefined();
    expect(opcoes.emailAndPassword).toMatchObject({ enabled: true, disableSignUp: true, minPasswordLength: 20 });
    expect(opcoes.trustedOrigins).toEqual([CONFIG_TESTE.urlBase]);
    expect(opcoes.socialProviders ?? {}).toEqual({});
    expect(opcoes.user?.additionalFields).toMatchObject({ papel: { input: false }, desativadoEm: { input: false } });
  });

  it('C-03: pedir redefinição de senha por e-mail não gera token de redefinição', async () => {
    const c = await criarContaDeTeste(auth, { papel: 'cto' });
    const r = await post('/request-password-reset', { email: c.email, redirectTo: '/entrar' }, { 'x-real-ip': '198.51.100.10' });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(await b.db.select().from(verification).where(like(verification.identifier, 'reset-password:%'))).toEqual([]);
  });

  it('C-06 (base): limite ligado também fora de produção, 10 por minuto, IP só do cabeçalho configurado', () => {
    expect(auth.options.rateLimit).toMatchObject({ enabled: true, window: 60, max: 10, storage: 'memory' });
    expect(auth.options.advanced?.ipAddress?.ipAddressHeaders).toEqual([CONFIG_TESTE.cabecalhoIp]);
  });

  it('C-07: cookie de sessão HttpOnly, Secure e SameSite=Lax com prefixo __Secure- em produção; sessão de 8 h fixa', async () => {
    const authProd = criarAuth({
      db: b.db,
      config: { ...CONFIG_TESTE, producao: true, urlBase: 'https://orquestrador.exemplo.test' },
    });
    const c = await criarContaDeTeste(authProd, { papel: 'cto' });
    const r = await authProd.handler(
      new Request('https://orquestrador.exemplo.test/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://orquestrador.exemplo.test', 'x-real-ip': '198.51.100.11' },
        body: JSON.stringify({ email: c.email, password: c.senha }),
      }),
    );
    const sessao = r.headers.getSetCookie().find((s) => s.includes('session_token'))!;
    expect(sessao).toMatch(/^__Secure-wsod\.session_token=/);
    expect(sessao).toMatch(/HttpOnly/i);
    expect(sessao).toMatch(/Secure/i);
    expect(sessao).toMatch(/SameSite=Lax/i);
    expect(authProd.options.session).toMatchObject({ expiresIn: 28_800, disableSessionRefresh: true });
  });

  it('C-07: no desenvolvimento o cookie é wsod.session_token, HttpOnly e SameSite=Lax, sem Secure', async () => {
    const c = await criarContaDeTeste(auth, { papel: 'cto' });
    const r = await post('/sign-in/email', { email: c.email, password: c.senha }, { 'x-real-ip': '198.51.100.12' });
    const sessao = r.headers.getSetCookie().find((s) => s.includes('session_token'))!;
    expect(sessao).toMatch(/^wsod\.session_token=/);
    expect(sessao).toMatch(/HttpOnly/i);
    expect(sessao).toMatch(/SameSite=Lax/i);
    expect(sessao).not.toMatch(/;\s*Secure/i);
  });

  it('C-03 (trustedOrigins): com cookie de sessão, origem fora da lista é recusada e nada muda', async () => {
    const c = await criarContaDeTeste(auth, { papel: 'cto' });
    const ip = { 'x-real-ip': '198.51.100.13' };
    const login = await post('/sign-in/email', { email: c.email, password: c.senha }, ip);
    // Como o navegador manda num POST de outro site: Origin do atacante e Fetch Metadata cross-site.
    const r = await post(
      '/update-user',
      { name: 'Pessoa Ficticia Trocada' },
      { ...ip, cookie: cookieDe(login), origin: 'https://atacante.test', 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'cors' },
    );
    expect(r.status).toBe(403);
    const [u] = await b.db.select().from(user).where(eq(user.id, c.usuarioId));
    expect(u!.name).toBe('Pessoa Ficticia');
  });

  it('C-33: segredo TOTP e códigos de recuperação não ficam em claro em two_factor', async () => {
    const c = await criarContaDeTeste(auth, { papel: 'cto' });
    const ip = { 'x-real-ip': '198.51.100.14' };
    const login = await post('/sign-in/email', { email: c.email, password: c.senha }, ip);
    const r = await post('/two-factor/enable', { password: c.senha }, { ...ip, cookie: cookieDe(login) });
    expect(r.status).toBe(200);
    const { totpURI, backupCodes } = (await r.json()) as { totpURI: string; backupCodes: string[] };
    const uri = new URL(totpURI);
    const segredo = uri.searchParams.get('secret')!;
    expect(segredo).toMatch(/^[A-Z2-7]+=*$/);
    expect(uri.searchParams.get('issuer')).toBe('WS Orquestrador de Demandas');
    const [linha] = await b.db.select().from(twoFactor).where(eq(twoFactor.userId, c.usuarioId));
    expect(linha!.secret).not.toContain(segredo);
    expect(backupCodes.length).toBeGreaterThan(0);
    for (const codigo of backupCodes) expect(linha!.backupCodes).not.toContain(codigo);
    // Sem verificar o primeiro código, o 2FA não fica ativo (skipVerificationOnEnable: false).
    const [u] = await b.db.select().from(user).where(eq(user.id, c.usuarioId));
    expect(u!.twoFactorEnabled).toBe(false);
  });
});

describe('C-21: log do Better Auth pela lista de permissão', () => {
  it('o logger do Better Auth vai ao `log`, sem mensagem nem argumentos, e o erro vira { classe, code }', () => {
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => linhas.push(l) });
    try {
      const opcoes: BetterAuthOptions = auth.options;
      opcoes.logger!.log!('error', `falha com ${SENTINELAS.email}`, { email: SENTINELAS.email }, new Error(SENTINELAS.texto));
      opcoes.logger!.log!('warn', SENTINELAS.texto);
      opcoes.logger!.log!('info', SENTINELAS.texto);
    } finally {
      substituirDestinoDoLog(null);
    }
    expect(contemSentinela(linhas.join(''))).toBe(false);
    expect(linhas.map((l) => JSON.parse(l) as Record<string, unknown>)).toEqual([
      expect.objectContaining({ evento: 'better_auth', erro: { classe: 'Error' } }),
      expect.objectContaining({ evento: 'better_auth' }),
    ]);
  });

  it('login que falha não leva e-mail nem senha a nenhuma saída (log nem console)', async () => {
    const linhas: string[] = [];
    const consoleCapturado: unknown[] = [];
    const espioes = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation((...a: unknown[]) => {
        consoleCapturado.push(a);
      }),
    );
    substituirDestinoDoLog({ write: (l) => linhas.push(l) });
    try {
      const c = await criarContaDeTeste(auth, { papel: 'cto' });
      const ip = { 'x-real-ip': '198.51.100.15' };
      expect((await post('/sign-in/email', { email: SENTINELAS.email, password: `${SENTINELAS.senha}-0000000000` }, ip)).status).toBe(401);
      expect((await post('/sign-in/email', { email: c.email, password: `${SENTINELAS.senha}-0000000000` }, ip)).status).toBe(401);
    } finally {
      substituirDestinoDoLog(null);
      for (const e of espioes) e.mockRestore();
    }
    const tudo = linhas.join('') + consoleCapturado.map((a) => String(a)).join('');
    expect(contemSentinela(tudo)).toBe(false);
    expect(consoleCapturado).toEqual([]);
  });
});

describe('criarContaDeTeste', () => {
  it('cria usuário com o papel e conta de senha com hash, senha aleatória de 24 caracteres', async () => {
    const c1 = await criarContaDeTeste(auth, { papel: 'administradora' });
    const c2 = await criarContaDeTeste(auth, { papel: 'administradora' });
    expect(c1.senha).toHaveLength(24);
    expect(c1.senha).not.toBe(c2.senha);
    expect(c1.email).toMatch(/@exemplo\.test$/);
    const [u] = await b.db.select().from(user).where(eq(user.id, c1.usuarioId));
    expect(u).toMatchObject({ papel: 'administradora', name: 'Pessoa Ficticia', twoFactorEnabled: false });
    const [a] = await b.db.select().from(account).where(eq(account.userId, c1.usuarioId));
    expect(a!.providerId).toBe('credential');
    expect(a!.password).toBeTruthy();
    expect(a!.password).not.toContain(c1.senha);
  });

  it('aceita e-mail e nome fictícios dados', async () => {
    const c = await criarContaDeTeste(auth, { papel: 'cto', email: 'pessoa-dada@exemplo.test', nome: 'Pessoa Ficticia Dada' });
    expect(c.email).toBe('pessoa-dada@exemplo.test');
    const [u] = await b.db.select().from(user).where(eq(user.id, c.usuarioId));
    expect(u!.name).toBe('Pessoa Ficticia Dada');
  });
});
