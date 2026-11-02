// exigirPessoa: o que a rota vai devolver (CA-01.2 e CA-01.3, pelo mapeador único de erro da T03), a ordem das regras
// quando mais de uma falha, a leitura estrita do 2FA e o erro sem dado da sessão. Sessão falsa e relógio fixo.
import { describe, expect, it, vi } from 'vitest';
import { SENTINELAS } from '../../../test/sentinelas';
import { mapearErro } from '../../lib/erros';
import { relogioFixo } from '../../lib/relogio';
import { exigirPessoa } from './exigir-pessoa';

// O módulo importa next/headers e next/navigation para os adaptadores do painel; aqui eles não são usados.
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECIONA:${url}`);
  },
}));

const ID = 'SENTINELA-ID-USUARIO-7f3a';
const relogio = relogioFixo('2026-10-22T12:05:00Z');

const sessao = (u: Record<string, unknown>, criadaEm: unknown = new Date('2026-10-22T12:00:00Z')) =>
  ({
    api: {
      getSession: async () => ({
        session: { createdAt: criadaEm },
        user: { id: ID, name: SENTINELAS.nome, twoFactorEnabled: true, papel: 'cto', desativadoEm: null, ...u },
      }),
    },
  }) as never;

const erroDe = (auth: never, r = relogio) => exigirPessoa({ auth, relogio: r }, new Headers()).catch((e: unknown) => e);

describe('exigirPessoa: o erro que a rota devolve', () => {
  it('CA-01.3: sem sessão → 401, só com o código e a mensagem', async () => {
    const e = await erroDe({ api: { getSession: async () => null } } as never);
    expect(mapearErro(e)).toEqual({
      status: 401,
      corpo: { erro: 'nao_autenticado', mensagem: 'Sua sessão terminou. Entre de novo para continuar.' },
    });
  });

  it('CA-01.2: senha certa e sem 2FA → 403 sem_2fa', async () => {
    const e = await erroDe(sessao({ twoFactorEnabled: false }));
    expect(mapearErro(e)).toEqual({
      status: 403,
      corpo: { erro: 'sem_2fa', mensagem: 'Para usar o painel, configure a verificação em duas etapas.' },
    });
  });

  it('C-02: papel fora da lista → 403 sem_permissao', async () => {
    const e = await erroDe(sessao({ papel: 'admin' }));
    expect(mapearErro(e)).toEqual({
      status: 403,
      corpo: { erro: 'sem_permissao', mensagem: 'Sua conta não pode fazer esta ação. Se precisar, fale com o CTO.' },
    });
  });

  it('C-08: sessão sem 2FA com mais de 15 min → 401', async () => {
    const e = await erroDe(sessao({ twoFactorEnabled: false }), relogioFixo('2026-10-22T12:15:00.001Z'));
    expect(mapearErro(e).status).toBe(401);
  });

  it.each([
    ['sem sessão', { api: { getSession: async () => null } } as never],
    ['sem 2FA', sessao({ twoFactorEnabled: false })],
    ['papel inválido', sessao({ papel: 'admin' })],
    ['conta desativada', sessao({ desativadoEm: new Date('2026-10-01T00:00:00Z') })],
  ])('%s: o erro e a resposta não levam id, nome, e-mail nem papel da sessão', async (_caso, auth) => {
    const e = await erroDe(auth);
    const saida = JSON.stringify(e) + JSON.stringify(mapearErro(e));
    expect(saida).not.toContain(ID);
    expect(saida).not.toContain(SENTINELAS.nome);
    expect(saida).not.toContain('admin');
  });
});

describe('exigirPessoa: ordem das regras', () => {
  it('conta desativada vence sem 2FA e papel inválido → nao_autenticado', async () => {
    const auth = sessao({ desativadoEm: new Date('2026-10-01T00:00:00Z'), twoFactorEnabled: false, papel: 'admin' });
    expect(await erroDe(auth)).toMatchObject({ codigo: 'nao_autenticado' });
  });

  it('sem 2FA vem antes do papel inválido → sem_2fa', async () => {
    expect(await erroDe(sessao({ twoFactorEnabled: false, papel: 'admin' }))).toMatchObject({ codigo: 'sem_2fa' });
  });

  it('sessão sem 2FA vencida vence o papel inválido → nao_autenticado', async () => {
    const auth = sessao({ twoFactorEnabled: false, papel: 'admin' });
    expect(await erroDe(auth, relogioFixo('2026-10-22T12:16:00Z'))).toMatchObject({ codigo: 'nao_autenticado' });
  });
});

describe('exigirPessoa: leitura estrita da sessão', () => {
  it.each([[undefined], [null], ['true'], [1]])('twoFactorEnabled %j não conta como 2FA ativo → sem_2fa', async (valor) => {
    expect(await erroDe(sessao({ twoFactorEnabled: valor }))).toMatchObject({ codigo: 'sem_2fa' });
  });

  it.each([[''], ['CTO'], ['Administradora'], [null], [undefined]])('papel %j → sem_permissao', async (papel) => {
    expect(await erroDe(sessao({ papel }))).toMatchObject({ codigo: 'sem_permissao' });
  });

  it('C-08: createdAt em texto ISO (sessão serializada) também conta os 15 min', async () => {
    const auth = sessao({ twoFactorEnabled: false }, '2026-10-22T12:00:00.000Z');
    expect(await erroDe(auth, relogioFixo('2026-10-22T12:15:00Z'))).toMatchObject({ codigo: 'sem_2fa' });
    expect(await erroDe(auth, relogioFixo('2026-10-22T12:15:00.001Z'))).toMatchObject({ codigo: 'nao_autenticado' });
  });

  it('o ator devolvido tem só tipo, id, nome e papel, sem outro campo da sessão', async () => {
    const auth = sessao({ email: SENTINELAS.email, twoFactorEnabled: true, papel: 'administradora' });
    expect(await exigirPessoa({ auth, relogio }, new Headers())).toStrictEqual({
      tipo: 'pessoa',
      usuarioId: ID,
      nome: SENTINELAS.nome,
      papel: 'administradora',
    });
  });
});
