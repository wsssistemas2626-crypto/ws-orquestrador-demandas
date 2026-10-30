// T32: desativação de conta (T-04, LGPD D6). Banco real (Testcontainers), papel do app, relógio fixo (RNF-15).
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../test/banco';
import { criarDepsDeTeste } from '../test/deps';
import { criarPessoa, getAuth, postAuth } from '../test/sessao';
import type { Deps } from '../src/lib/deps';
import { relogioFixo } from '../src/lib/relogio';
import { argumentosDesativarConta, desativarConta } from './desativar-conta';
import { lerArgumentos } from './lib/argumentos';

const AGORA = '2026-10-22T12:00:00Z';

describe('desativarConta (T-04)', () => {
  let b: BancoDeTeste;
  let deps: Deps;

  beforeAll(async () => {
    b = await novoBanco();
    deps = await criarDepsDeTeste(b, { relogio: relogioFixo(AGORA) });
  });
  afterAll(async () => {
    await deps.fila.parar();
    await b.fechar();
  });

  const contar = async (tabela: string, usuarioId: string) =>
    (await b.poolMigrator.query(`select count(*)::int as n from ${tabela} where user_id = $1`, [usuarioId])).rows[0].n as number;
  const eventosDe = async (usuarioId: string) =>
    (await b.poolMigrator.query("select * from evento where entidade_id = $1 and acao = 'conta_desativada'", [usuarioId])).rows;

  it('T-04: conta desativada perde as sessões e não entra mais; evento gravado', async () => {
    const p = await criarPessoa(deps, { papel: 'cto' });
    const outra = await criarPessoa(deps, { papel: 'administradora' });
    expect(await contar('session', p.usuarioId)).toBeGreaterThan(0);
    expect(await contar('two_factor', p.usuarioId)).toBe(1);

    expect(await desativarConta(deps, p.email.toUpperCase())).toBe(true);

    expect(await contar('session', p.usuarioId)).toBe(0);
    expect(await contar('two_factor', p.usuarioId)).toBe(0);
    expect(await contar('account', p.usuarioId)).toBe(0);
    const u = (await b.poolMigrator.query('select desativado_em, two_factor_enabled from "user" where id = $1', [p.usuarioId])).rows[0];
    expect(u).toEqual({ desativado_em: new Date(AGORA), two_factor_enabled: false });

    // O cookie antigo não abre mais nada, e a senha não entra mais.
    const sessao = await (await getAuth(deps.auth, '/get-session', { cookie: p.cookie })).json();
    expect(sessao).toBeNull();
    const login = await postAuth(deps.auth, '/sign-in/email', { email: p.email, password: p.senha });
    expect(login.status).not.toBe(200);

    const eventos = await eventosDe(p.usuarioId);
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      ator_tipo: 'sistema',
      entidade: 'usuario',
      demanda_id: null,
      antes: { ativa: true },
      depois: { ativa: false },
      ocorrido_em: new Date(AGORA),
    });
    expect(JSON.stringify(eventos)).not.toContain(p.email);

    // A outra conta não foi tocada.
    expect(await contar('session', outra.usuarioId)).toBeGreaterThan(0);
    expect(await contar('two_factor', outra.usuarioId)).toBe(1);
  });

  it('rodar de novo na mesma conta não grava outro evento e devolve false', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: false });
    expect(await desativarConta(deps, p.email)).toBe(true);
    expect(await desativarConta(deps, p.email)).toBe(false);
    expect(await eventosDe(p.usuarioId)).toHaveLength(1);
  });

  it('e-mail sem conta → false, nada muda', async () => {
    const antes = (await b.poolMigrator.query("select count(*)::int as n from evento where acao = 'conta_desativada'")).rows[0].n;
    expect(await desativarConta(deps, 'ninguem@exemplo.test')).toBe(false);
    expect((await b.poolMigrator.query("select count(*)::int as n from evento where acao = 'conta_desativada'")).rows[0].n).toBe(antes);
  });

  it('e-mail fora do formato é recusado antes do banco', async () => {
    await expect(desativarConta(deps, 'nao-e-email')).rejects.toMatchObject({ codigo: 'entrada_invalida' });
  });

  it('argumentos: só --email', () => {
    expect(lerArgumentos(argumentosDesativarConta, ['--email', 'a@exemplo.test'])).toEqual({ email: 'a@exemplo.test' });
    expect(() => lerArgumentos(argumentosDesativarConta, ['--email', 'a@exemplo.test', '--forcar', 'sim'])).toThrow();
    expect(() => lerArgumentos(argumentosDesativarConta, [])).toThrow();
  });
});
