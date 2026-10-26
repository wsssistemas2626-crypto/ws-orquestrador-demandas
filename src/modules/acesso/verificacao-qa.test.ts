// T09 pela rota do Better Auth real (Testcontainers), nos pontos que o roteiro do engenheiro não cobre: o passo da
// senha sozinho não dá sessão (CA-01.1), `trustDevice` no código de recuperação (C-05), o bloqueio de C-06 na ativação
// do 2FA, por conta e sem somar o 429 do plugin, o limite do login por IP, os eventos de 2FA que não devem nascer (C-08)
// e o log das falhas de código (C-21). Só o `Date` é falso, preso ao relógio injetado e reposto antes de cada teste;
// cada teste cria as próprias contas.
import { and, eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { contemSentinela } from '../../../test/sentinelas';
import { codigoErrado, codigoTotp, criarPessoa, getAuth, PoteDeCookies, postAuth } from '../../../test/sessao';
import { bloqueioVerificacao, evento, twoFactor, user } from '../../db/schema';
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
  substituirDestinoDoLog(null);
});

const avancar = (ms: number) => {
  relogio.avancar(ms);
  vi.setSystemTime(relogio.agora());
};
const post = (caminho: string, corpo: unknown, cabecalhos: Record<string, string> = {}) =>
  postAuth(deps.auth, caminho, corpo, cabecalhos);

async function entrarComSenha(p: { email: string; senha: string }, pote = new PoteDeCookies()) {
  const r = await post('/sign-in/email', { email: p.email, password: p.senha }, { cookie: pote.cabecalho() });
  expect(r.status).toBe(200);
  pote.guardar(r);
  return { corpo: (await r.json()) as { twoFactorRedirect?: boolean; token?: string }, pote };
}
const verificar = (pote: PoteDeCookies, code: string) => post('/two-factor/verify-totp', { code }, { cookie: pote.cabecalho() });
const eventosDe = (usuarioId: string, acao: string) =>
  b.db
    .select()
    .from(evento)
    .where(and(eq(evento.entidadeId, usuarioId), eq(evento.acao, acao)));
const linhaC06 = async (usuarioId: string) =>
  (await b.db.select().from(bloqueioVerificacao).where(eq(bloqueioVerificacao.usuarioId, usuarioId)))[0];
const doisFatoresLigado = async (usuarioId: string) =>
  (await b.db.select({ ativo: user.twoFactorEnabled }).from(user).where(eq(user.id, usuarioId)))[0]!.ativo;

// Ativação do 2FA por quem só tem a senha: `enable` devolve o segredo; a sessão é a do login.
async function comecarAtivacao(p: { senha: string; cookie: string }) {
  const ativar = await post('/two-factor/enable', { password: p.senha }, { cookie: p.cookie });
  expect(ativar.status).toBe(200);
  const pote = new PoteDeCookies().guardar(ativar);
  const { totpURI } = (await ativar.json()) as { totpURI: string };
  return {
    segredo: new URL(totpURI).searchParams.get('secret')!,
    cookie: [p.cookie, pote.cabecalho()].filter(Boolean).join('; '),
  };
}

describe('T09, verificação em duas etapas: casos da qa-automacao', () => {
  it('CA-01.1: com 2FA ativo, só a senha não abre sessão e exigirPessoa recusa', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: true });
    const { corpo, pote } = await entrarComSenha(p);
    expect(corpo.twoFactorRedirect).toBe(true);
    expect(await (await getAuth(deps.auth, '/get-session', { cookie: pote.cabecalho() })).json()).toBeNull();
    await expect(exigirPessoa(deps, new Headers({ cookie: pote.cabecalho() }))).rejects.toMatchObject({ codigo: 'nao_autenticado' });
  });

  it('C-05: no código de recuperação, trustDevice: true também é ignorado', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: true });
    const gerar = await post('/two-factor/generate-backup-codes', { password: p.senha }, { cookie: p.cookie });
    expect(gerar.status).toBe(200);
    const { backupCodes } = (await gerar.json()) as { backupCodes: string[] };

    const { pote } = await entrarComSenha(p);
    const r = await post('/two-factor/verify-backup-code', { code: backupCodes[0], trustDevice: true }, { cookie: pote.cabecalho() });
    expect(r.status).toBe(200);
    pote.guardar(r);
    expect(pote.nomes().filter((n) => n.includes('trust_device'))).toEqual([]);

    pote.guardar(await post('/sign-out', {}, { cookie: pote.cabecalho() }));
    avancar(MIN);
    const { corpo } = await entrarComSenha(p, pote);
    expect(corpo.twoFactorRedirect).toBe(true);
    expect(corpo.token).toBeUndefined();
  });

  it('C-06 na ativação: 5 códigos errados bloqueiam por 15 min, e o 2FA não liga nem gera evento', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: false });
    const { segredo, cookie } = await comecarAtivacao(p);
    for (let i = 0; i < 5; i++) {
      if (i > 0) avancar(MIN);
      expect((await post('/two-factor/verify-totp', { code: codigoErrado(segredo, relogio.agora()) }, { cookie })).status).toBe(401);
    }
    const bloqueada = await post('/two-factor/verify-totp', { code: codigoTotp(segredo, relogio.agora()) }, { cookie });
    expect(bloqueada.status).toBe(429);
    expect(await bloqueada.json()).toMatchObject({ code: 'VERIFICACAO_BLOQUEADA' });
    expect(await doisFatoresLigado(p.usuarioId)).toBe(false);
    expect(await eventosDe(p.usuarioId, '2fa_ativado')).toEqual([]);

    avancar(15 * MIN);
    expect((await post('/two-factor/verify-totp', { code: codigoTotp(segredo, relogio.agora()) }, { cookie })).status).toBe(200);
    expect(await doisFatoresLigado(p.usuarioId)).toBe(true);
    expect(await eventosDe(p.usuarioId, '2fa_ativado')).toHaveLength(1);
  });

  it('C-06: o bloqueio de uma conta não atinge outra no mesmo instante', async () => {
    const bloqueada = await criarPessoa(deps, { papel: 'cto', com2fa: true });
    const livre = await criarPessoa(deps, { papel: 'administradora', com2fa: true });
    const { pote } = await entrarComSenha(bloqueada);
    for (let i = 0; i < 5; i++) expect((await verificar(pote, codigoErrado(bloqueada.segredoTotp!, relogio.agora()))).status).toBe(401);

    const outra = await entrarComSenha(livre);
    expect((await verificar(outra.pote, codigoTotp(livre.segredoTotp!, relogio.agora()))).status).toBe(200);
    const deNovo = await entrarComSenha(bloqueada);
    expect((await verificar(deNovo.pote, codigoTotp(bloqueada.segredoTotp!, relogio.agora()))).status).toBe(429);
  });

  it('C-06: o 429 do bloqueio do plugin não soma falha no bloqueio por conta', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: true });
    // 4 + 4 + 2 erros, com 16 min entre os grupos: o plugin bloqueia no 10º, e C-06 fica com 2 na janela atual.
    for (const erros of [4, 4, 2]) {
      const { pote } = await entrarComSenha(p);
      for (let i = 0; i < erros; i++) expect((await verificar(pote, codigoErrado(p.segredoTotp!, relogio.agora()))).status).toBe(401);
      if (erros === 4) avancar(16 * MIN);
    }
    const [doPlugin] = await b.db.select().from(twoFactor).where(eq(twoFactor.userId, p.usuarioId));
    expect(doPlugin!.lockedUntil).not.toBeNull();
    expect(await linhaC06(p.usuarioId)).toMatchObject({ falhas: 2, bloqueadoAte: null });

    // Três tentativas com código errado durante o bloqueio do plugin: todas 429, e nenhuma conta para C-06 (somadas às
    // 2 da janela, fariam 5 e bloqueariam).
    for (let i = 0; i < 3; i++) {
      const { pote } = await entrarComSenha(p);
      expect((await verificar(pote, codigoErrado(p.segredoTotp!, relogio.agora()))).status).toBe(429);
    }
    expect(await linhaC06(p.usuarioId)).toMatchObject({ falhas: 2, bloqueadoAte: null });
  });

  it('C-06: o limite do login é por IP; outro IP entra com a senha certa', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: false });
    const ipA = { 'x-real-ip': '198.51.100.240' };
    for (let i = 0; i < 10; i++) {
      expect((await post('/sign-in/email', { email: p.email, password: 'senha-ficticia-errada-0000' }, ipA)).status).toBe(401);
    }
    // No IP barrado, nem a senha certa passa; de outro IP, passa.
    expect((await post('/sign-in/email', { email: p.email, password: p.senha }, ipA)).status).toBe(429);
    const ipB = await post('/sign-in/email', { email: p.email, password: p.senha }, { 'x-real-ip': '198.51.100.241' });
    expect(ipB.status).toBe(200);
  });

  it('C-08: verificar o código no login não grava 2fa_ativado', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: true });
    expect(await eventosDe(p.usuarioId, '2fa_ativado')).toHaveLength(1);
    avancar(MIN);
    const { pote } = await entrarComSenha(p);
    expect((await verificar(pote, codigoTotp(p.segredoTotp!, relogio.agora()))).status).toBe(200);
    const todos = await b.db.select().from(evento).where(eq(evento.entidadeId, p.usuarioId));
    expect(todos.map((e) => e.acao)).toEqual(['2fa_ativado']);
  });

  it('C-08: desativar com a senha errada não desliga o 2FA nem grava evento', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: true });
    const r = await post('/two-factor/disable', { password: 'senha-ficticia-errada-000000000' }, { cookie: p.cookie });
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.status).toBeLessThan(500);
    expect(await doisFatoresLigado(p.usuarioId)).toBe(true);
    expect(await eventosDe(p.usuarioId, '2fa_desativado')).toEqual([]);
  });

  it('C-21: códigos errados e o bloqueio não levam e-mail nem id da conta ao log', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: true });
    const { pote } = await entrarComSenha(p);
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => linhas.push(l) });
    for (let i = 0; i < 5; i++) await verificar(pote, codigoErrado(p.segredoTotp!, relogio.agora()));
    expect((await verificar(pote, codigoTotp(p.segredoTotp!, relogio.agora()))).status).toBe(429);
    substituirDestinoDoLog(null);

    const saida = linhas.join('');
    expect(saida).not.toContain(p.email);
    expect(saida).not.toContain(p.usuarioId);
    expect(saida).not.toContain(p.segredoTotp!);
    expect(contemSentinela(saida)).toBe(false);
  });
});
