// Contraprova dos testes de `auth-comportamento.test.ts` (etapa 06-T08-testes, qa-automacao): com a configuração de
// `criarAuth` afrouxada num ponto, o comportamento que aquele arquivo exige deixa de acontecer. Prova que cada
// asserção depende da configuração da T08, e não de um padrão do Better Auth 1.7.6. Se uma versão nova do Better Auth
// mudar o padrão, este arquivo quebra e avisa que o teste principal perdeu a força. Dados só fictícios; cada
// requisição usa um IP fictício próprio (198.51.100.200 em diante).
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { symmetricDecrypt } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CONFIG_TESTE, criarContaDeTeste } from '../../../test/auth';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { twoFactor, user } from '../../db/schema';
import { criarAuth, type Auth } from './auth';

let b: BancoDeTeste;
let base: Auth;
beforeAll(async () => {
  b = await novoBanco();
  base = criarAuth({ db: b.db, config: CONFIG_TESTE });
});
afterAll(async () => {
  await b.fechar();
});

let proximoIp = 200;
const post = (a: Auth, caminho: string, corpo: unknown, cabecalhos: Record<string, string> = {}) =>
  a.handler(
    new Request(`${CONFIG_TESTE.urlBase}/api/auth${caminho}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: CONFIG_TESTE.urlBase,
        'x-real-ip': `198.51.100.${proximoIp++}`,
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
// A mesma configuração da T08 com um único ponto trocado.
const afrouxada = (trocar: (o: BetterAuthOptions) => BetterAuthOptions) =>
  betterAuth(trocar({ ...(base.options as BetterAuthOptions) })) as unknown as Auth;

function base32(texto: string): Buffer {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of texto.replace(/=+$/, '')) bits += alfabeto.indexOf(c).toString(2).padStart(5, '0');
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

async function entrar(a: Auth) {
  const c = await criarContaDeTeste(a, { papel: 'administradora' });
  const login = await post(a, '/sign-in/email', { email: c.email, password: c.senha });
  expect(login.status).toBe(200);
  return { c, login, cookie: cookieDe(login) };
}

describe('contraprova: com a configuração afrouxada, o comportamento exigido não acontece', () => {
  it('C-02: papel com input: true deixaria a administradora virar cto por update-user', async () => {
    const campos = (base.options as BetterAuthOptions).user!.additionalFields!;
    const a = afrouxada((o) => ({
      ...o,
      user: { ...o.user, additionalFields: { ...campos, papel: { type: 'string', input: true, required: true } } },
    }));
    const { c, cookie } = await entrar(a);
    const r = await post(a, '/update-user', { papel: 'cto' }, { cookie });
    const [u] = await b.db.select().from(user).where(eq(user.id, c.usuarioId));
    expect({ status: r.status, papel: u!.papel }).toEqual({ status: 200, papel: 'cto' });
  });

  it('senha: com minPasswordLength 8, a troca para 19 caracteres passaria', async () => {
    const a = afrouxada((o) => ({ ...o, emailAndPassword: { ...o.emailAndPassword!, minPasswordLength: 8 } }));
    const { c, cookie } = await entrar(a);
    const r = await post(a, '/change-password', { currentPassword: c.senha, newPassword: 'senha-ficticia-19ch' }, { cookie });
    expect(r.status).toBe(200);
  });

  it('C-07: com a sessão padrão do Better Auth, o cookie não teria Max-Age de 8 h', async () => {
    const a = afrouxada((o) => ({ ...o, session: {} }));
    const { login } = await entrar(a);
    const sessao = login.headers.getSetCookie().find((s) => s.includes('session_token'))!;
    expect(sessao).toMatch(/Max-Age=\d+/i);
    expect(sessao).not.toMatch(/Max-Age=28800(;|$)/i);
  });

  it('C-33: cifrado com outro segredo, o conteúdo da coluna não abre com o segredo do CONFIG_TESTE', async () => {
    const outroSegredo = 'OUTRO-SEGREDO-FICTICIO-'.padEnd(48, '2');
    const a = criarAuth({ db: b.db, config: { ...CONFIG_TESTE, segredoAuth: outroSegredo } });
    const { c, cookie } = await entrar(a);
    const r = await post(a, '/two-factor/enable', { password: c.senha }, { cookie });
    expect(r.status).toBe(200);
    const { totpURI } = (await r.json()) as { totpURI: string };
    const bruto = base32(new URL(totpURI).searchParams.get('secret')!).toString('utf8');
    const [linha] = await b.db.select().from(twoFactor).where(eq(twoFactor.userId, c.usuarioId));
    // Com o segredo de quem cifrou, abre; com o do CONFIG_TESTE, não dá o segredo (falha ou devolve outra coisa).
    expect(await symmetricDecrypt({ key: outroSegredo, data: linha!.secret })).toBe(bruto);
    const comOutraChave = await symmetricDecrypt({ key: CONFIG_TESTE.segredoAuth, data: linha!.secret }).catch(() => null);
    expect(comOutraChave).not.toBe(bruto);
  });
});
