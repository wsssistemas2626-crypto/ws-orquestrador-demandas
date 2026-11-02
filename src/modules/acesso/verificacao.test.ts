// Verificação em duas etapas com o Better Auth real, pelas rotas (RF-01, C-05, C-06, C-07, C-08, C-21, C-33).
// Só o `Date` é falso, preso ao relógio injetado dos Deps (o Better Auth confere o TOTP e data a sessão pelo `Date`; o
// bloqueio da verificação usa o Relogio). Os timers continuam reais, para o driver do Postgres e o pg-boss. Cada
// requisição sai de um IP fictício novo (`novoIp`), salvo onde o teste fixa o IP de propósito.
import { and, eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { contemSentinela, SENTINELAS } from '../../../test/sentinelas';
import { codigoErrado, codigoTotp, criarPessoa, getAuth, PoteDeCookies, postAuth } from '../../../test/sessao';
import { bloqueioVerificacao, evento, session, twoFactor } from '../../db/schema';
import type { Deps } from '../../lib/deps';
import { substituirDestinoDoLog } from '../../lib/log';
import { relogioFixo } from '../../lib/relogio';
import { exigirPessoa } from './exigir-pessoa';

const INICIO = '2026-10-22T12:00:00Z';
const MIN = 60_000;
const relogio = relogioFixo(INICIO);
let b: BancoDeTeste;
let deps: Deps;

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
});
afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  relogio.definir(INICIO);
  vi.setSystemTime(relogio.agora());
});
afterEach(() => {
  vi.useRealTimers();
});

const avancar = (ms: number) => {
  relogio.avancar(ms);
  vi.setSystemTime(relogio.agora());
};
const post = (caminho: string, corpo: unknown, cabecalhos: Record<string, string> = {}) =>
  postAuth(deps.auth, caminho, corpo, cabecalhos);

// Login de quem já tem 2FA: a senha certa devolve só o pedido do código e o cookie de dois fatores.
async function entrarComSenha(p: { email: string; senha: string }, pote = new PoteDeCookies()) {
  const r = await post('/sign-in/email', { email: p.email, password: p.senha }, { cookie: pote.cabecalho() });
  expect(r.status).toBe(200);
  pote.guardar(r);
  return { corpo: (await r.json()) as { twoFactorRedirect?: boolean; token?: string }, pote };
}
const verificar = (pote: PoteDeCookies, code: string, extra: Record<string, unknown> = {}) =>
  post('/two-factor/verify-totp', { code, ...extra }, { cookie: pote.cabecalho() });

describe('verificação em duas etapas', () => {
  it('CA-01.1: senha e código válidos dão sessão com 2FA', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: true });
    const s = await getAuth(deps.auth, '/get-session', { cookie: p.cookie });
    expect(await s.json()).toMatchObject({ user: { id: p.usuarioId, twoFactorEnabled: true } });

    // Login novo, do zero: senha → código → sessão que exigirPessoa aceita.
    const { corpo, pote } = await entrarComSenha(p);
    expect(corpo.twoFactorRedirect).toBe(true);
    expect(pote.nomes().some((n) => n.endsWith('session_token'))).toBe(false);
    const v = await verificar(pote, codigoTotp(p.segredoTotp!, relogio.agora()));
    expect(v.status).toBe(200);
    pote.guardar(v);
    expect(await exigirPessoa(deps, new Headers({ cookie: pote.cabecalho() }))).toEqual({
      tipo: 'pessoa',
      usuarioId: p.usuarioId,
      nome: 'Pessoa Ficticia',
      papel: 'cto',
    });
  });

  it('C-05: trustDevice: true no corpo é ignorado; novo login pede o código de novo', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: true });
    const pote = new PoteDeCookies();
    await entrarComSenha(p, pote);
    const v = await verificar(pote, codigoTotp(p.segredoTotp!, relogio.agora()), { trustDevice: true });
    expect(v.status).toBe(200);
    pote.guardar(v);
    expect(pote.nomes().filter((n) => n.includes('trust_device'))).toEqual([]);

    // Sair e entrar de novo no mesmo "navegador" (mesmo pote de cookies): o código é pedido outra vez.
    pote.guardar(await post('/sign-out', {}, { cookie: pote.cabecalho() }));
    avancar(MIN);
    const { corpo } = await entrarComSenha(p, pote);
    expect(corpo.twoFactorRedirect).toBe(true);
    expect(corpo.token).toBeUndefined();
  });

  it('C-06: 11ª tentativa de login no minuto responde 429 mesmo trocando o X-Forwarded-For', async () => {
    const status: number[] = [];
    for (let i = 1; i <= 11; i++) {
      const r = await post(
        '/sign-in/email',
        { email: 'ninguem@exemplo.test', password: 'senha-ficticia-errada-0000' },
        { 'x-real-ip': '198.51.100.250', 'x-forwarded-for': `203.0.113.${i}` },
      );
      status.push(r.status);
    }
    // RNF-12: 10 por minuto. As 10 primeiras chegam à conferência da senha (401); só a 11ª é barrada pelo limite.
    expect(status.slice(0, 10)).toEqual(Array(10).fill(401));
    expect(status[10]).toBe(429);
  });

  it('C-06: em pares a cada 11 s, a 11ª tentativa dentro do minuto também responde 429', async () => {
    // A regra própria do Better Auth para /sign-in (3 em 10 s, zerada quando passam 10 s sem pedido) deixaria passar
    // 12 tentativas em 56 s neste ritmo. A regra de RNF-12 (10 por 60 s) não deixa.
    const status: number[] = [];
    for (let i = 0; i < 11; i++) {
      if (i > 0 && i % 2 === 0) avancar(11_000);
      const r = await post(
        '/sign-in/email',
        { email: 'ninguem@exemplo.test', password: 'senha-ficticia-errada-0000' },
        { 'x-real-ip': '198.51.100.252' },
      );
      status.push(r.status);
    }
    expect(status.slice(0, 10)).toEqual(Array(10).fill(401));
    expect(status[10]).toBe(429);
  });

  it('C-06: passado o minuto, o mesmo IP volta a tentar', async () => {
    const tentar = () =>
      post('/sign-in/email', { email: 'ninguem@exemplo.test', password: 'senha-ficticia-errada-0000' }, { 'x-real-ip': '198.51.100.251' });
    for (let i = 0; i < 10; i++) await tentar();
    expect((await tentar()).status).toBe(429);
    avancar(61_000);
    expect((await tentar()).status).toBe(401);
  });

  it('C-06: 5 códigos errados em 15 min, de IPs diferentes, bloqueiam a verificação da conta por 15 min', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: true });
    const { pote } = await entrarComSenha(p);
    // Um erro por minuto, cada um de um IP: o 5º, aos 4 min, bloqueia.
    for (let i = 0; i < 5; i++) {
      if (i > 0) avancar(MIN);
      const r = await verificar(pote, codigoErrado(p.segredoTotp!, relogio.agora()));
      expect(r.status).toBe(401);
    }
    const [linha] = await b.db.select().from(bloqueioVerificacao).where(eq(bloqueioVerificacao.usuarioId, p.usuarioId));
    expect(linha!.bloqueadoAte!.getTime() - relogio.agora().getTime()).toBe(15 * MIN);

    // A 6ª, com o código certo, é recusada, sem sessão e sem nada no console (C-21).
    const consoleCapturado: unknown[] = [];
    const espioes = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation((...a: unknown[]) => {
        consoleCapturado.push(a);
      }),
    );
    let sexta: Response;
    try {
      sexta = await verificar(pote, codigoTotp(p.segredoTotp!, relogio.agora()));
    } finally {
      for (const e of espioes) e.mockRestore();
    }
    expect(sexta.status).toBe(429);
    expect(await sexta.json()).toMatchObject({ code: 'VERIFICACAO_BLOQUEADA' });
    expect(sexta.headers.getSetCookie().some((c) => c.includes('session_token='))).toBe(false);
    expect(consoleCapturado).toEqual([]);

    // O bloqueio é da conta: um login novo, de outro IP, também não passa do código.
    const outra = await entrarComSenha(p);
    expect((await verificar(outra.pote, codigoTotp(p.segredoTotp!, relogio.agora()))).status).toBe(429);

    // 14 min depois do bloqueio, continua; aos 15, o código certo é aceito.
    avancar(14 * MIN);
    const aos14 = await entrarComSenha(p);
    expect((await verificar(aos14.pote, codigoTotp(p.segredoTotp!, relogio.agora()))).status).toBe(429);
    avancar(MIN);
    const aos15 = await entrarComSenha(p);
    const v = await verificar(aos15.pote, codigoTotp(p.segredoTotp!, relogio.agora()));
    expect(v.status).toBe(200);
    expect(v.headers.getSetCookie().some((c) => c.includes('session_token='))).toBe(true);
  });

  it('C-06: 4 erros não bloqueiam; um acerto zera a contagem', async () => {
    const p = await criarPessoa(deps, { papel: 'administradora', com2fa: true });
    const { pote } = await entrarComSenha(p);
    for (let i = 0; i < 4; i++) expect((await verificar(pote, codigoErrado(p.segredoTotp!, relogio.agora()))).status).toBe(401);
    avancar(MIN);
    expect((await verificar(pote, codigoTotp(p.segredoTotp!, relogio.agora()))).status).toBe(200);
    const [linha] = await b.db.select().from(bloqueioVerificacao).where(eq(bloqueioVerificacao.usuarioId, p.usuarioId));
    expect(linha).toMatchObject({ falhas: 0, bloqueadoAte: null });

    avancar(MIN);
    const depois = await entrarComSenha(p);
    for (let i = 0; i < 4; i++) {
      expect((await verificar(depois.pote, codigoErrado(p.segredoTotp!, relogio.agora()))).status).toBe(401);
    }
    expect((await verificar(depois.pote, codigoTotp(p.segredoTotp!, relogio.agora()))).status).toBe(200);
  });

  it('C-06: erros fora da janela de 15 min não somam', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: true });
    let { pote } = await entrarComSenha(p);
    for (let i = 0; i < 4; i++) expect((await verificar(pote, codigoErrado(p.segredoTotp!, relogio.agora()))).status).toBe(401);
    avancar(16 * MIN);
    ({ pote } = await entrarComSenha(p));
    expect((await verificar(pote, codigoErrado(p.segredoTotp!, relogio.agora()))).status).toBe(401);
    expect((await verificar(pote, codigoTotp(p.segredoTotp!, relogio.agora()))).status).toBe(200);
  });

  it('C-06 e o bloqueio próprio do plugin: 10 erros seguidos, mesmo fora da janela, também bloqueiam por 15 min', async () => {
    // O plugin twoFactor do Better Auth 1.7.6 conta erros seguidos na conta (failed_verification_count, zerado só no
    // acerto) e, no 10º, bloqueia por 15 min (locked_until). É uma camada a mais, que não afrouxa C-06: dentro de
    // 15 min, o bloqueio de C-06 (5 erros) vem antes; fora da janela, o do plugin pega o que C-06 deixaria passar.
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: true });
    for (const erros of [4, 4, 2]) {
      const { pote } = await entrarComSenha(p);
      for (let i = 0; i < erros; i++) {
        expect((await verificar(pote, codigoErrado(p.segredoTotp!, relogio.agora()))).status).toBe(401);
      }
      if (erros === 4) avancar(16 * MIN);
    }
    const [linha] = await b.db.select().from(twoFactor).where(eq(twoFactor.userId, p.usuarioId));
    expect(linha!.failedVerificationCount).toBe(10);
    expect(linha!.lockedUntil!.getTime() - relogio.agora().getTime()).toBe(15 * MIN);
    // O bloqueio de C-06 não chegou a valer: nenhuma janela de 15 min teve 5 erros.
    const [proprio] = await b.db.select().from(bloqueioVerificacao).where(eq(bloqueioVerificacao.usuarioId, p.usuarioId));
    expect(proprio!.bloqueadoAte).toBeNull();

    const bloqueado = await entrarComSenha(p);
    const r = await verificar(bloqueado.pote, codigoTotp(p.segredoTotp!, relogio.agora()));
    expect(r.status).toBe(429);
    avancar(15 * MIN + 1_000);
    const livre = await entrarComSenha(p);
    expect((await verificar(livre.pote, codigoTotp(p.segredoTotp!, relogio.agora()))).status).toBe(200);
  });

  it('C-06: código de recuperação errado conta para o mesmo bloqueio', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: true });
    const { pote } = await entrarComSenha(p);
    for (let i = 0; i < 5; i++) {
      const r = await post('/two-factor/verify-backup-code', { code: `ERRADO-${i}0000` }, { cookie: pote.cabecalho() });
      expect(r.status).toBeGreaterThanOrEqual(400);
      expect(r.status).toBeLessThan(500);
    }
    expect((await verificar(pote, codigoTotp(p.segredoTotp!, relogio.agora()))).status).toBe(429);
  });

  it('C-33: código de recuperação vale uma vez', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: true });
    const gerar = await post('/two-factor/generate-backup-codes', { password: p.senha }, { cookie: p.cookie });
    expect(gerar.status).toBe(200);
    const { backupCodes } = (await gerar.json()) as { backupCodes: string[] };
    const codigo = backupCodes[0]!;

    const primeira = await entrarComSenha(p);
    const r1 = await post('/two-factor/verify-backup-code', { code: codigo }, { cookie: primeira.pote.cabecalho() });
    expect(r1.status).toBe(200);
    primeira.pote.guardar(r1);
    expect(await exigirPessoa(deps, new Headers({ cookie: primeira.pote.cabecalho() }))).toMatchObject({ usuarioId: p.usuarioId });

    const segunda = await entrarComSenha(p);
    const r2 = await post('/two-factor/verify-backup-code', { code: codigo }, { cookie: segunda.pote.cabecalho() });
    expect(r2.status).toBe(401);
    expect(r2.headers.getSetCookie().some((c) => c.includes('session_token='))).toBe(false);
  });

  it('C-33: o segredo TOTP não fica em claro em two_factor', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: true });
    const [linha] = await b.db.select().from(twoFactor).where(eq(twoFactor.userId, p.usuarioId));
    expect(p.segredoTotp).toMatch(/^[A-Z2-7]+=*$/);
    expect(linha!.secret).not.toContain(p.segredoTotp!);
  });

  it('C-07: depois de sair, o cookie antigo não tem sessão', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: true });
    expect(await exigirPessoa(deps, new Headers({ cookie: p.cookie }))).toMatchObject({ usuarioId: p.usuarioId });
    expect(await b.db.select().from(session).where(eq(session.userId, p.usuarioId))).toHaveLength(1);

    expect((await post('/sign-out', {}, { cookie: p.cookie })).status).toBe(200);
    expect(await b.db.select().from(session).where(eq(session.userId, p.usuarioId))).toEqual([]);
    expect(await (await getAuth(deps.auth, '/get-session', { cookie: p.cookie })).json()).toBeNull();
    await expect(exigirPessoa(deps, new Headers({ cookie: p.cookie }))).rejects.toMatchObject({ codigo: 'nao_autenticado' });
  });

  it('C-08: sessão sem 2FA vale 15 min e só para configurar o 2FA', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: false });
    const h = new Headers({ cookie: p.cookie });
    await expect(exigirPessoa(deps, h)).rejects.toMatchObject({ codigo: 'sem_2fa' });
    avancar(15 * MIN);
    await expect(exigirPessoa(deps, h)).rejects.toMatchObject({ codigo: 'sem_2fa' });
    avancar(MIN);
    await expect(exigirPessoa(deps, h)).rejects.toMatchObject({ codigo: 'nao_autenticado' });
  });

  it('C-08: ativar 2FA grava evento com ator pessoa e sem segredo', async () => {
    const p = await criarPessoa(deps, { papel: 'administradora', com2fa: true });
    const eventos = await b.db
      .select()
      .from(evento)
      .where(and(eq(evento.entidadeId, p.usuarioId), eq(evento.acao, '2fa_ativado')));
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      atorTipo: 'pessoa',
      atorId: p.usuarioId,
      atorTokenPrefixo: null,
      demandaId: null,
      entidade: 'usuario',
      antes: { twoFactorEnabled: false },
      depois: { twoFactorEnabled: true },
      ocorridoEm: relogio.agora(),
    });
    const [linha] = await b.db.select().from(twoFactor).where(eq(twoFactor.userId, p.usuarioId));
    const gravado = JSON.stringify(eventos);
    expect(gravado).not.toContain(p.segredoTotp!);
    expect(gravado).not.toContain(linha!.secret);
    expect(gravado).not.toContain(p.email);
  });

  it('C-08: código errado na ativação não grava evento; desativar grava', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: false });
    const pote = new PoteDeCookies();
    const ativar = await post('/two-factor/enable', { password: p.senha }, { cookie: p.cookie });
    pote.guardar(ativar);
    const { totpURI } = (await ativar.json()) as { totpURI: string };
    const segredo = new URL(totpURI).searchParams.get('secret')!;
    const cookie = [p.cookie, pote.cabecalho()].filter(Boolean).join('; ');
    expect((await post('/two-factor/verify-totp', { code: codigoErrado(segredo, relogio.agora()) }, { cookie })).status).toBe(401);
    const doUsuario = () => b.db.select().from(evento).where(eq(evento.entidadeId, p.usuarioId));
    expect(await doUsuario()).toEqual([]);

    const ok = await post('/two-factor/verify-totp', { code: codigoTotp(segredo, relogio.agora()) }, { cookie });
    expect(ok.status).toBe(200);
    const sessao = new PoteDeCookies().guardar(ok).cabecalho();
    avancar(MIN);
    expect((await post('/two-factor/disable', { password: p.senha }, { cookie: sessao })).status).toBe(200);
    const eventos = await doUsuario();
    expect(eventos.map((e) => e.acao)).toEqual(['2fa_ativado', '2fa_desativado']);
    expect(eventos[1]).toMatchObject({
      atorTipo: 'pessoa',
      atorId: p.usuarioId,
      entidade: 'usuario',
      antes: { twoFactorEnabled: true },
      depois: { twoFactorEnabled: false },
      ocorridoEm: relogio.agora(),
    });
    expect(JSON.stringify(eventos)).not.toContain(segredo);
  });

  it('C-21: login que falhou é registrado sem o e-mail', async () => {
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => linhas.push(l) });
    try {
      const r = await post('/sign-in/email', { email: SENTINELAS.email, password: `${SENTINELAS.senha}-0000000000` });
      expect(r.status).toBe(401);
    } finally {
      substituirDestinoDoLog(null);
    }
    expect(contemSentinela(linhas.join(''))).toBe(false);
    const registros = linhas.map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(registros).toContainEqual(expect.objectContaining({ evento: 'login_falhou', atorTipo: 'anonimo' }));
  });

  it('C-21: login certo não registra login_falhou', async () => {
    const linhas: string[] = [];
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: false });
    substituirDestinoDoLog({ write: (l) => linhas.push(l) });
    try {
      expect((await post('/sign-in/email', { email: p.email, password: p.senha })).status).toBe(200);
    } finally {
      substituirDestinoDoLog(null);
    }
    expect(linhas.join('')).not.toContain('login_falhou');
  });
});
