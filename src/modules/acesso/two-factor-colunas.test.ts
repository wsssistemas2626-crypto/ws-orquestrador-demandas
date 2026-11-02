// T47 pelo caminho do próprio plugin twoFactor do Better Auth 1.7.6: as três colunas novas de `two_factor`
// (`verified`, `failed_verification_count`, `locked_until`) são gravadas e lidas pelo plugin, não só aceitas pelo banco.
// Testes da etapa 06-T47-testes (qa-automacao). Dados só fictícios; relógio fixo (só `Date` é falso, os timers
// continuam reais para o driver do Postgres); o código TOTP é calculado aqui pela RFC 6238 a partir do segredo que o
// próprio plugin devolve.
import { createHmac } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONFIG_TESTE, criarContaDeTeste } from '../../../test/auth';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { twoFactor, user } from '../../db/schema';
import { criarAuth, type Auth } from './auth';

const AGORA = new Date('2026-10-22T12:00:07Z');

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

const post = (caminho: string, corpo: unknown, cabecalhos: Record<string, string>) =>
  auth.handler(
    new Request(`${CONFIG_TESTE.urlBase}/api/auth${caminho}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: CONFIG_TESTE.urlBase, ...cabecalhos },
      body: JSON.stringify(corpo),
    }),
  );
const cookieDe = (r: Response) =>
  r.headers
    .getSetCookie()
    .map((s) => s.split(';')[0])
    .join('; ');

function base32(texto: string): Buffer {
  const alfabeto = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of texto.replace(/=+$/, '')) bits += alfabeto.indexOf(c).toString(2).padStart(5, '0');
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

// RFC 6238 com os padrões do plugin: HMAC-SHA1, passo de 30 s, 6 dígitos.
function totp(segredo: string, instante: Date, desloc = 0): string {
  const contador = Math.floor(instante.getTime() / 1000 / 30) + desloc;
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(contador));
  const h = createHmac('sha1', base32(segredo)).update(msg).digest();
  const o = h[h.length - 1]! & 0x0f;
  const n = (h.readUInt32BE(o) & 0x7fffffff) % 1_000_000;
  return String(n).padStart(6, '0');
}

// Código que não vale em nenhuma janela vizinha: o teste não depende de sorte.
function codigoErrado(segredo: string): string {
  const validos = new Set([-2, -1, 0, 1, 2].map((d) => totp(segredo, AGORA, d)));
  let n = (Number(totp(segredo, AGORA)) + 500_000) % 1_000_000;
  while (validos.has(String(n).padStart(6, '0'))) n = (n + 1) % 1_000_000;
  return String(n).padStart(6, '0');
}

async function ativarAte2FA(ip: string) {
  const c = await criarContaDeTeste(auth, { papel: 'cto' });
  const cab = { 'x-real-ip': ip };
  const login = await post('/sign-in/email', { email: c.email, password: c.senha }, cab);
  expect(login.status).toBe(200);
  const cookie = cookieDe(login);
  const r = await post('/two-factor/enable', { password: c.senha }, { ...cab, cookie });
  expect(r.status).toBe(200);
  const { totpURI } = (await r.json()) as { totpURI: string };
  const segredo = new URL(totpURI).searchParams.get('secret')!;
  return { c, cab, cookie, segredo };
}

const linhaDe = async (usuarioId: string) => {
  const linhas = await b.db.select().from(twoFactor).where(eq(twoFactor.userId, usuarioId));
  expect(linhas).toHaveLength(1);
  return linhas[0]!;
};

describe('T47: o plugin twoFactor grava e lê as colunas novas de two_factor', () => {
  it('ativar o 2FA cria a linha com verified = false, zero falhas e sem bloqueio', async () => {
    const { c } = await ativarAte2FA('198.51.100.40');
    const linha = await linhaDe(c.usuarioId);
    expect({ verified: linha.verified, failedVerificationCount: linha.failedVerificationCount, lockedUntil: linha.lockedUntil }).toEqual({
      verified: false,
      failedVerificationCount: 0,
      lockedUntil: null,
    });
  });

  it('o primeiro código TOTP válido marca verified = true e liga o 2FA da conta', async () => {
    const { c, cab, cookie, segredo } = await ativarAte2FA('198.51.100.41');
    const r = await post('/two-factor/verify-totp', { code: totp(segredo, AGORA) }, { ...cab, cookie });
    expect(r.status).toBe(200);
    const linha = await linhaDe(c.usuarioId);
    expect(linha.verified).toBe(true);
    expect(linha.lockedUntil).toBeNull();
    const [u] = await b.db.select().from(user).where(eq(user.id, c.usuarioId));
    expect(u!.twoFactorEnabled).toBe(true);
  });

  it('código errado na ativação é recusado, não conta falha, não liga o 2FA nem marca a linha como verificada', async () => {
    const { c, cab, cookie, segredo } = await ativarAte2FA('198.51.100.42');
    const r = await post('/two-factor/verify-totp', { code: codigoErrado(segredo) }, { ...cab, cookie });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.status).toBeLessThan(500);
    const linha = await linhaDe(c.usuarioId);
    expect(linha.verified).toBe(false);
    expect(linha.failedVerificationCount).toBe(0);
    const [u] = await b.db.select().from(user).where(eq(user.id, c.usuarioId));
    expect(u!.twoFactorEnabled).toBe(false);
  });

  it('no login com 2FA, código errado soma 1 em failed_verification_count pelo papel do app, e o certo zera e abre a sessão', async () => {
    const { c, cab, cookie, segredo } = await ativarAte2FA('198.51.100.43');
    expect((await post('/two-factor/verify-totp', { code: totp(segredo, AGORA) }, { ...cab, cookie })).status).toBe(200);

    const login = await post('/sign-in/email', { email: c.email, password: c.senha }, cab);
    expect(login.status).toBe(200);
    expect(await login.json()).toMatchObject({ twoFactorRedirect: true });
    const cookieDoisFatores = cookieDe(login);

    const errado = await post('/two-factor/verify-totp', { code: codigoErrado(segredo) }, { ...cab, cookie: cookieDoisFatores });
    expect(errado.status).toBe(401);
    expect(errado.headers.getSetCookie().some((s) => /session_token=[^;]+/.test(s))).toBe(false);
    let linha = await linhaDe(c.usuarioId);
    expect({ verified: linha.verified, failedVerificationCount: linha.failedVerificationCount, lockedUntil: linha.lockedUntil }).toEqual({
      verified: true,
      failedVerificationCount: 1,
      lockedUntil: null,
    });

    const certo = await post('/two-factor/verify-totp', { code: totp(segredo, AGORA) }, { ...cab, cookie: cookieDoisFatores });
    expect(certo.status).toBe(200);
    expect(certo.headers.getSetCookie().some((s) => /session_token=[^;]+/.test(s))).toBe(true);
    linha = await linhaDe(c.usuarioId);
    expect({ verified: linha.verified, failedVerificationCount: linha.failedVerificationCount, lockedUntil: linha.lockedUntil }).toEqual({
      verified: true,
      failedVerificationCount: 0,
      lockedUntil: null,
    });
  });
});
