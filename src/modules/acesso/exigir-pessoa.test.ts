// exigirPessoa (C-04, a função; C-02; C-08) e os dois adaptadores do painel, com sessão falsa e relógio fixo.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { relogioFixo } from '../../lib/relogio';
import { exigirPessoa, exigirPessoaNaPagina, exigirSessaoParaConfigurar2fa } from './exigir-pessoa';

const cabecalhosDaPagina = vi.hoisted(() => ({ atual: new Headers({ cookie: 'wsod.session_token=ficticio' }) }));
vi.mock('next/headers', () => ({ headers: async () => cabecalhosDaPagina.atual }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECIONA:${url}`);
  },
}));

type UsuarioFalso = Partial<{ twoFactorEnabled: boolean; papel: string; desativadoEm: Date | null }>;

const sessaoFalsa = (u: UsuarioFalso, criadaEm = '2026-10-22T12:00:00Z') =>
  ({
    api: {
      getSession: async () => ({
        session: { createdAt: new Date(criadaEm) },
        user: { id: 'u1', name: 'Pessoa Ficticia', twoFactorEnabled: true, papel: 'cto', desativadoEm: null, ...u },
      }),
    },
  }) as never;
const semSessao = { api: { getSession: async () => null } } as never;

describe('exigirPessoa', () => {
  const relogio = relogioFixo('2026-10-22T12:05:00Z');
  it('com sessão, 2FA e papel válido devolve o ator pessoa', async () => {
    expect(await exigirPessoa({ auth: sessaoFalsa({}), relogio }, new Headers())).toEqual({
      tipo: 'pessoa',
      usuarioId: 'u1',
      nome: 'Pessoa Ficticia',
      papel: 'cto',
    });
  });
  it('a administradora também é pessoa válida', async () => {
    expect(await exigirPessoa({ auth: sessaoFalsa({ papel: 'administradora' }), relogio }, new Headers())).toMatchObject({
      papel: 'administradora',
    });
  });
  it('CA-01.2: sem 2FA ativo → sem_2fa (403)', async () => {
    await expect(exigirPessoa({ auth: sessaoFalsa({ twoFactorEnabled: false }), relogio }, new Headers())).rejects.toMatchObject({
      codigo: 'sem_2fa',
    });
  });
  it('C-08: sessão sem 2FA com 16 min deixa de valer', async () => {
    const r16 = relogioFixo('2026-10-22T12:16:00Z');
    await expect(exigirPessoa({ auth: sessaoFalsa({ twoFactorEnabled: false }), relogio: r16 }, new Headers())).rejects.toMatchObject({
      codigo: 'nao_autenticado',
    });
  });
  it('C-08: a sessão sem 2FA vale até 15 min exatos', async () => {
    const r15 = relogioFixo('2026-10-22T12:15:00Z');
    await expect(exigirPessoa({ auth: sessaoFalsa({ twoFactorEnabled: false }), relogio: r15 }, new Headers())).rejects.toMatchObject({
      codigo: 'sem_2fa',
    });
  });
  it('C-08: o limite de 15 min não vale para sessão com 2FA', async () => {
    const r7h = relogioFixo('2026-10-22T19:00:00Z');
    expect(await exigirPessoa({ auth: sessaoFalsa({}), relogio: r7h }, new Headers())).toMatchObject({ usuarioId: 'u1' });
  });
  it('C-02: papel fora da lista → sem_permissao', async () => {
    await expect(exigirPessoa({ auth: sessaoFalsa({ papel: 'admin' }), relogio }, new Headers())).rejects.toMatchObject({
      codigo: 'sem_permissao',
    });
  });
  it('conta desativada → nao_autenticado', async () => {
    await expect(
      exigirPessoa({ auth: sessaoFalsa({ desativadoEm: new Date('2026-10-01T00:00:00Z') }), relogio }, new Headers()),
    ).rejects.toMatchObject({ codigo: 'nao_autenticado' });
  });
  it('CA-01.3: sem sessão → nao_autenticado', async () => {
    await expect(exigirPessoa({ auth: semSessao, relogio }, new Headers())).rejects.toMatchObject({ codigo: 'nao_autenticado' });
  });
  it('passa os cabeçalhos recebidos ao Better Auth', async () => {
    const getSession = vi.fn(async () => null);
    const h = new Headers({ cookie: 'wsod.session_token=ficticio' });
    await expect(exigirPessoa({ auth: { api: { getSession } } as never, relogio }, h)).rejects.toMatchObject({ codigo: 'nao_autenticado' });
    expect(getSession).toHaveBeenCalledWith({ headers: h });
  });
  it('o erro é ErroDominio com mensagem pt-BR, sem dado da sessão', async () => {
    const e = await exigirPessoa({ auth: sessaoFalsa({ papel: 'admin' }), relogio }, new Headers()).catch((x: unknown) => x);
    expect(e).toMatchObject({ name: 'ErroDominio', mensagem: 'Sua conta não pode fazer esta ação. Se precisar, fale com o CTO.' });
    expect(JSON.stringify(e)).not.toContain('Pessoa Ficticia');
  });
});

describe('exigirPessoaNaPagina', () => {
  const relogio = relogioFixo('2026-10-22T12:05:00Z');
  beforeEach(() => {
    cabecalhosDaPagina.atual = new Headers({ cookie: 'wsod.session_token=ficticio' });
  });

  it('com sessão válida devolve o ator e lê os cabeçalhos da requisição', async () => {
    const getSession = vi.fn((sessaoFalsa({}) as { api: { getSession: () => Promise<unknown> } }).api.getSession);
    const ator = await exigirPessoaNaPagina('/demandas', { auth: { api: { getSession } } as never, relogio });
    expect(ator).toMatchObject({ tipo: 'pessoa', usuarioId: 'u1' });
    expect(getSession).toHaveBeenCalledWith({ headers: cabecalhosDaPagina.atual });
  });
  it('sem sessão vai para /entrar com a volta e o motivo', async () => {
    await expect(exigirPessoaNaPagina('/demandas/DEM-20261022-0042', { auth: semSessao, relogio })).rejects.toThrow(
      'REDIRECIONA:/entrar?callbackURL=%2Fdemandas%2FDEM-20261022-0042&motivo=sessao',
    );
  });
  it('C-40: a volta para /entrar passa por destinoSeguro', async () => {
    await expect(exigirPessoaNaPagina('//atacante.test', { auth: semSessao, relogio })).rejects.toThrow(
      'REDIRECIONA:/entrar?callbackURL=%2Fdemandas&motivo=sessao',
    );
  });
  it('C-04: sem 2FA vai para /configurar-2fa', async () => {
    await expect(exigirPessoaNaPagina('/demandas', { auth: sessaoFalsa({ twoFactorEnabled: false }), relogio })).rejects.toThrow(
      'REDIRECIONA:/configurar-2fa',
    );
  });
  it('C-08: sem 2FA e sessão de 16 min vai para /entrar', async () => {
    await expect(
      exigirPessoaNaPagina('/demandas', { auth: sessaoFalsa({ twoFactorEnabled: false }), relogio: relogioFixo('2026-10-22T12:16:00Z') }),
    ).rejects.toThrow('REDIRECIONA:/entrar?callbackURL=%2Fdemandas&motivo=sessao');
  });
  it('C-02: papel inválido vai para /sem-permissao', async () => {
    await expect(exigirPessoaNaPagina('/demandas', { auth: sessaoFalsa({ papel: 'admin' }), relogio })).rejects.toThrow(
      'REDIRECIONA:/sem-permissao',
    );
  });
  it('erro que não é de acesso não vira redirecionamento', async () => {
    const quebrado = { api: { getSession: async () => Promise.reject(new Error('banco fora')) } } as never;
    await expect(exigirPessoaNaPagina('/demandas', { auth: quebrado, relogio })).rejects.toThrow('banco fora');
  });
});

describe('exigirSessaoParaConfigurar2fa', () => {
  const relogio = relogioFixo('2026-10-22T12:05:00Z');
  it('sessão válida sem 2FA devolve id e nome', async () => {
    expect(await exigirSessaoParaConfigurar2fa({ auth: sessaoFalsa({ twoFactorEnabled: false }), relogio })).toEqual({
      usuarioId: 'u1',
      nome: 'Pessoa Ficticia',
    });
  });
  it('sem sessão vai para /entrar', async () => {
    await expect(exigirSessaoParaConfigurar2fa({ auth: semSessao, relogio })).rejects.toThrow('REDIRECIONA:/entrar?motivo=sessao');
  });
  it('C-08: sessão sem 2FA de 16 min vai para /entrar', async () => {
    await expect(
      exigirSessaoParaConfigurar2fa({ auth: sessaoFalsa({ twoFactorEnabled: false }), relogio: relogioFixo('2026-10-22T12:16:00Z') }),
    ).rejects.toThrow('REDIRECIONA:/entrar?motivo=sessao');
  });
  it('conta desativada vai para /entrar', async () => {
    await expect(
      exigirSessaoParaConfigurar2fa({ auth: sessaoFalsa({ twoFactorEnabled: false, desativadoEm: new Date('2026-10-01T00:00:00Z') }), relogio }),
    ).rejects.toThrow('REDIRECIONA:/entrar?motivo=sessao');
  });
  it('com 2FA já ativo vai para a fila', async () => {
    await expect(exigirSessaoParaConfigurar2fa({ auth: sessaoFalsa({}), relogio })).rejects.toThrow('REDIRECIONA:/demandas');
  });
  it('papel inválido vai para /sem-permissao', async () => {
    await expect(exigirSessaoParaConfigurar2fa({ auth: sessaoFalsa({ twoFactorEnabled: false, papel: 'admin' }), relogio })).rejects.toThrow(
      'REDIRECIONA:/sem-permissao',
    );
  });
});
