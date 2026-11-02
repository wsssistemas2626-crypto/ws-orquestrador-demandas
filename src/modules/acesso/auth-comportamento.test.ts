// T08 pelo comportamento das rotas do Better Auth, além da leitura das opções: o papel e a desativação não entram por
// `update-user` (C-02), as rotas de troca de e-mail, exclusão e de plugins não previstos não fazem nada (C-03), a
// senha tem 20 caracteres ou mais (configuração do plano), a sessão vale 8 h fixas (C-07, RNF-12) e o segredo TOTP e
// os códigos de recuperação ficam cifrados com o BETTER_AUTH_SECRET (C-33). Testes da etapa 06-T08-testes
// (qa-automacao). Dados só fictícios; só `Date` é falso (os timers do driver do Postgres continuam reais), e cada
// requisição de login usa um IP fictício próprio, para o limite por IP não ligar um teste ao outro.
import { symmetricDecrypt } from 'better-auth/crypto';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIG_TESTE, criarContaDeTeste } from '../../../test/auth';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { session, twoFactor, user } from '../../db/schema';
import { criarAuth, type Auth } from './auth';

const AGORA = new Date('2026-10-22T12:00:00Z');
const OITO_HORAS_MS = 8 * 60 * 60 * 1000;

let b: BancoDeTeste;
let auth: Auth;
beforeAll(async () => {
  b = await novoBanco();
  auth = criarAuth({ db: b.db, config: CONFIG_TESTE });
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(AGORA);
});
afterEach(() => {
  vi.useRealTimers();
});

// IPs da faixa de documentação 198.51.100.0/24, de .100 em diante (os outros arquivos usam até .43).
let proximoIp = 100;
const novoIp = () => ({ 'x-real-ip': `198.51.100.${proximoIp++}` });

const post = (caminho: string, corpo: unknown, cabecalhos: Record<string, string>) =>
  auth.handler(
    new Request(`${CONFIG_TESTE.urlBase}/api/auth${caminho}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: CONFIG_TESTE.urlBase, ...cabecalhos },
      body: JSON.stringify(corpo),
    }),
  );
const get = (caminho: string, cabecalhos: Record<string, string>) =>
  auth.handler(new Request(`${CONFIG_TESTE.urlBase}/api/auth${caminho}`, { headers: cabecalhos }));
const cookieDe = (r: Response) =>
  r.headers
    .getSetCookie()
    .map((s) => s.split(';')[0])
    .join('; ');

async function entrar(op: { papel: 'cto' | 'administradora' }) {
  const c = await criarContaDeTeste(auth, op);
  const login = await post('/sign-in/email', { email: c.email, password: c.senha }, novoIp());
  expect(login.status).toBe(200);
  return { c, login, cookie: cookieDe(login) };
}
const usuario = async (id: string) => (await b.db.select().from(user).where(eq(user.id, id)))[0]!;

function base32(texto: string): Buffer {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of texto.replace(/=+$/, '')) bits += alfabeto.indexOf(c).toString(2).padStart(5, '0');
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

describe('C-02: papel e desativação não entram por update-user', () => {
  it('a mesma sessão troca o nome, mas o pedido com papel é recusado inteiro e nada muda', async () => {
    const { c, cookie } = await entrar({ papel: 'administradora' });
    const ip = novoIp();
    // Controle positivo: a sessão vale e a rota grava o que é permitido.
    expect((await post('/update-user', { name: 'Pessoa Ficticia Renomeada' }, { ...ip, cookie })).status).toBe(200);
    expect((await usuario(c.usuarioId)).name).toBe('Pessoa Ficticia Renomeada');

    const r = await post('/update-user', { papel: 'cto', name: 'Pessoa Ficticia Promovida' }, { ...ip, cookie });
    expect(r.status).toBe(400);
    expect(await usuario(c.usuarioId)).toMatchObject({ papel: 'administradora', name: 'Pessoa Ficticia Renomeada' });
  });

  it('desativadoEm com data no corpo não desativa a conta', async () => {
    const { c, cookie } = await entrar({ papel: 'cto' });
    const r = await post('/update-user', { desativadoEm: '2026-10-01T00:00:00.000Z' }, { ...novoIp(), cookie });
    expect(r.status).toBe(400);
    expect(await usuario(c.usuarioId)).toMatchObject({ desativadoEm: null, papel: 'cto' });
  });
});

describe('C-03: rotas fechadas não fazem nada, mesmo com sessão válida', () => {
  it('troca de e-mail é recusada e o e-mail continua o mesmo', async () => {
    const { c, cookie } = await entrar({ papel: 'cto' });
    const r = await post('/change-email', { newEmail: 'trocado@exemplo.test' }, { ...novoIp(), cookie });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.status).toBeLessThan(500);
    expect((await usuario(c.usuarioId)).email).toBe(c.email);
    expect(await b.db.select().from(user).where(eq(user.email, 'trocado@exemplo.test'))).toEqual([]);
  });

  it('exclusão da própria conta é recusada e a conta continua', async () => {
    const { c, cookie } = await entrar({ papel: 'cto' });
    const r = await post('/delete-user', { password: c.senha }, { ...novoIp(), cookie });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.status).toBeLessThan(500);
    expect(await b.db.select().from(user).where(eq(user.id, c.usuarioId))).toHaveLength(1);
  });

  it.each([
    ['/sign-in/magic-link', { email: 'pessoa@exemplo.test' }],
    ['/email-otp/send-verification-otp', { email: 'pessoa@exemplo.test', type: 'sign-in' }],
    ['/sign-in/anonymous', {}],
    ['/admin/set-role', { userId: 'u-ficticio', role: 'admin' }],
    ['/admin/create-user', { email: 'admin@exemplo.test', password: 'senha-ficticia-com-20-caracteres', name: 'Pessoa Ficticia' }],
  ])('rota de plugin não previsto %s não existe (404)', async (caminho, corpo) => {
    const { cookie } = await entrar({ papel: 'cto' });
    expect((await post(caminho, corpo, { ...novoIp(), cookie })).status).toBe(404);
  });

  it('login social não existe: nenhum provedor é aceito e nenhum usuário nasce', async () => {
    const antes = (await b.db.select().from(user)).length;
    const r = await post('/sign-in/social', { provider: 'google', callbackURL: '/demandas' }, novoIp());
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.status).toBeLessThan(500);
    expect((await b.db.select().from(user)).length).toBe(antes);
  });
});

describe('senha com 20 caracteres ou mais (minPasswordLength)', () => {
  it('troca para senha de 19 caracteres é recusada e a antiga continua valendo; com 20 é aceita', async () => {
    const { c, cookie } = await entrar({ papel: 'cto' });
    const curta = 'senha-ficticia-19ch';
    const certa = 'senha-ficticia-20chr';
    expect(curta).toHaveLength(19);
    expect(certa).toHaveLength(20);

    const r19 = await post('/change-password', { currentPassword: c.senha, newPassword: curta }, { ...novoIp(), cookie });
    expect(r19.status).toBe(400);
    expect((await post('/sign-in/email', { email: c.email, password: curta }, novoIp())).status).toBe(401);
    expect((await post('/sign-in/email', { email: c.email, password: c.senha }, novoIp())).status).toBe(200);

    const r20 = await post('/change-password', { currentPassword: c.senha, newPassword: certa }, { ...novoIp(), cookie });
    expect(r20.status).toBe(200);
    expect((await post('/sign-in/email', { email: c.email, password: certa }, novoIp())).status).toBe(200);
  });
});

describe('C-07 e RNF-12: sessão de 8 h fixa, sem renovação', () => {
  it('o cookie e a linha da sessão valem 8 h a partir do login', async () => {
    const { c, login } = await entrar({ papel: 'cto' });
    const sessao = login.headers.getSetCookie().find((s) => s.includes('session_token'))!;
    expect(sessao).toMatch(/Max-Age=28800(;|$)/i);
    const [linha] = await b.db.select().from(session).where(eq(session.userId, c.usuarioId));
    expect(linha!.createdAt).toEqual(AGORA);
    expect(linha!.expiresAt.getTime() - linha!.createdAt.getTime()).toBe(OITO_HORAS_MS);
  });

  it('usada aos 7h59, a sessão não é renovada; passadas as 8 h, não vale mais', async () => {
    const { c, cookie } = await entrar({ papel: 'cto' });
    const expiraEm = new Date(AGORA.getTime() + OITO_HORAS_MS);

    vi.setSystemTime(new Date(AGORA.getTime() + OITO_HORAS_MS - 60_000));
    const quase = await get('/get-session', { ...novoIp(), cookie });
    expect(quase.status).toBe(200);
    expect(await quase.json()).toMatchObject({ user: { id: c.usuarioId } });
    const [linha] = await b.db.select().from(session).where(eq(session.userId, c.usuarioId));
    expect(linha!.expiresAt).toEqual(expiraEm);

    vi.setSystemTime(new Date(AGORA.getTime() + OITO_HORAS_MS + 1_000));
    const depois = await get('/get-session', { ...novoIp(), cookie });
    expect(await depois.json()).toBeNull();
  });
});

describe('C-33: segredo TOTP e códigos de recuperação cifrados com o BETTER_AUTH_SECRET', () => {
  it('a coluna não tem o segredo em claro em nenhuma forma, e só abre com o segredo da configuração', async () => {
    const { c, cookie } = await entrar({ papel: 'cto' });
    const r = await post('/two-factor/enable', { password: c.senha }, { ...novoIp(), cookie });
    expect(r.status).toBe(200);
    const { totpURI, backupCodes } = (await r.json()) as { totpURI: string; backupCodes: string[] };
    const segredoBase32 = new URL(totpURI).searchParams.get('secret')!;
    const bruto = base32(segredoBase32);
    const [linha] = await b.db.select().from(twoFactor).where(eq(twoFactor.userId, c.usuarioId));

    for (const forma of [segredoBase32, bruto.toString('utf8'), bruto.toString('hex'), bruto.toString('base64')]) {
      expect(linha!.secret).not.toContain(forma);
    }
    expect(await symmetricDecrypt({ key: CONFIG_TESTE.segredoAuth, data: linha!.secret })).toBe(bruto.toString('utf8'));
    const outraChave = 'OUTRO-SEGREDO-FICTICIO-'.padEnd(48, '1');
    const comOutraChave = await symmetricDecrypt({ key: outraChave, data: linha!.secret }).catch(() => null);
    expect(comOutraChave).not.toBe(bruto.toString('utf8'));

    for (const codigo of backupCodes) expect(linha!.backupCodes).not.toContain(codigo);
    const codigosAbertos = await symmetricDecrypt({ key: CONFIG_TESTE.segredoAuth, data: linha!.backupCodes });
    expect(JSON.parse(codigosAbertos)).toEqual(backupCodes);
  });
});
