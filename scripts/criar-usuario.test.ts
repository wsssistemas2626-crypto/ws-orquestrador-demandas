// T32: script de criação de conta (RF-01, C-08, C-37). Banco real (Testcontainers), papel do app, relógio fixo
// (RNF-15). Dados só fictícios (domínio .test, sentinelas).
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../test/banco';
import { criarDepsDeTeste } from '../test/deps';
import { SENTINELAS, contemSentinela } from '../test/sentinelas';
import { getAuth, postAuth } from '../test/sessao';
import type { Deps } from '../src/lib/deps';
import { ErroDominio } from '../src/lib/erros';
import { substituirDestinoDoLog } from '../src/lib/log';
import { relogioFixo } from '../src/lib/relogio';
import { exigirPessoa } from '../src/modules/acesso/exigir-pessoa';
import { argumentosCriarUsuario, criarUsuario, TAMANHO_SENHA } from './criar-usuario';
import { lerArgumentos } from './lib/argumentos';
import { mensagemDeErro, rodarScript } from './lib/saida';
import { CONFIG_TESTE } from '../test/auth';

const ARGV_VALIDO = ['--email', 'nova.pessoa@exemplo.test', '--nome', 'Pessoa Ficticia Nova', '--papel', 'cto'];

// Saída padrão de mentira: guarda tudo o que o script escreveu.
function saidaDeTeste() {
  const partes: string[] = [];
  return { write: (s: string) => void partes.push(s), texto: () => partes.join('') };
}

// A senha é a única sequência de 24 caracteres base64url depois de "mostrada só esta vez: ".
const senhaDaSaida = (texto: string) => /mostrada só esta vez: (\S+)/.exec(texto)?.[1] ?? '';

describe('argumentos do criar-usuario (C-37)', () => {
  it('aceita --email, --nome e --papel, inclusive na forma --nome=valor', () => {
    expect(lerArgumentos(argumentosCriarUsuario, ARGV_VALIDO)).toEqual({
      email: 'nova.pessoa@exemplo.test',
      nome: 'Pessoa Ficticia Nova',
      papel: 'cto',
    });
    expect(lerArgumentos(argumentosCriarUsuario, ['--email=a@exemplo.test', '--nome=Pessoa Ficticia', '--papel=administradora'])).toMatchObject({
      papel: 'administradora',
    });
  });

  it('C-37: --senha é recusado, nas duas formas, sem repetir o valor no erro', () => {
    for (const argv of [
      [...ARGV_VALIDO, '--senha', SENTINELAS.senha],
      [...ARGV_VALIDO, `--senha=${SENTINELAS.senha}`],
    ]) {
      let erro: unknown;
      try {
        lerArgumentos(argumentosCriarUsuario, argv);
      } catch (e) {
        erro = e;
      }
      expect(erro).toBeInstanceOf(ErroDominio);
      expect((erro as ErroDominio).codigo).toBe('entrada_invalida');
      expect((erro as ErroDominio).mensagem).toContain('--senha');
      expect(contemSentinela(JSON.stringify(erro) + (erro as ErroDominio).mensagem + mensagemDeErro(erro))).toBe(false);
    }
  });

  it('C-37: papel fora de cto/administradora é recusado', () => {
    for (const papel of ['admin', 'agente', 'CTO', '']) {
      expect(() => lerArgumentos(argumentosCriarUsuario, ['--email', 'a@exemplo.test', '--nome', 'Pessoa Ficticia', '--papel', papel])).toThrow(
        ErroDominio,
      );
    }
  });

  it('argumento solto, repetido ou sem valor é recusado; faltar argumento obrigatório também', () => {
    expect(() => lerArgumentos(argumentosCriarUsuario, [...ARGV_VALIDO, 'solto'])).toThrow(ErroDominio);
    expect(() => lerArgumentos(argumentosCriarUsuario, [...ARGV_VALIDO, '--papel', 'cto'])).toThrow(ErroDominio);
    expect(() => lerArgumentos(argumentosCriarUsuario, ['--email', 'a@exemplo.test', '--nome', 'Pessoa Ficticia', '--papel'])).toThrow(ErroDominio);
    expect(() => lerArgumentos(argumentosCriarUsuario, ['--email', 'a@exemplo.test', '--papel', 'cto'])).toThrow(ErroDominio);
    expect(() => lerArgumentos(argumentosCriarUsuario, ['--email', 'nao-e-email', '--nome', 'Pessoa Ficticia', '--papel', 'cto'])).toThrow(ErroDominio);
  });

  it('o erro de banco vira só classe e código na saída de erro (C-21)', () => {
    const erroDoBanco = Object.assign(new Error(`duplicate key ${SENTINELAS.email}`), { code: '23505', detail: SENTINELAS.email });
    const texto = mensagemDeErro(erroDoBanco);
    expect(texto).toContain('23505');
    expect(contemSentinela(texto)).toBe(false);
    expect(mensagemDeErro(new ErroDominio('conflito', 'Já existe uma conta com este e-mail.'))).toBe('Já existe uma conta com este e-mail.');
  });
});

describe('criarUsuario (RF-01, C-08)', () => {
  let b: BancoDeTeste;
  let deps: Deps;
  const linhasDoLog: string[] = [];

  beforeAll(async () => {
    b = await novoBanco();
    deps = await criarDepsDeTeste(b, { relogio: relogioFixo('2026-10-22T12:00:00Z') });
    substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
  });
  afterAll(async () => {
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('C-08: senha gerada com 20+ caracteres sai uma vez na saída padrão e nunca no log', async () => {
    const saida = saidaDeTeste();
    const { usuarioId } = await criarUsuario(deps, { email: 'c08@exemplo.test', nome: 'Pessoa Ficticia C08', papel: 'cto' }, saida);
    const senha = senhaDaSaida(saida.texto());
    expect(senha).toHaveLength(TAMANHO_SENHA);
    expect(TAMANHO_SENHA).toBeGreaterThanOrEqual(20);
    expect(saida.texto().split(senha)).toHaveLength(2); // uma ocorrência
    expect(linhasDoLog.join('')).not.toContain(senha);
    // O banco guarda o hash, nunca a senha; o evento não leva senha, e-mail nem nome.
    const conta = (await b.poolMigrator.query('select password from account where user_id = $1', [usuarioId])).rows[0];
    expect(conta.password).not.toContain(senha);
    const eventos = (await b.poolMigrator.query("select * from evento where entidade_id = $1 and acao = 'conta_criada'", [usuarioId])).rows;
    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({ ator_tipo: 'sistema', entidade: 'usuario', demanda_id: null, depois: { papel: 'cto' } });
    const textoEventos = JSON.stringify(eventos);
    for (const proibido of [senha, 'c08@exemplo.test', 'Pessoa Ficticia C08']) expect(textoEventos).not.toContain(proibido);
  });

  it('duas contas seguidas recebem senhas diferentes', async () => {
    const s1 = saidaDeTeste();
    const s2 = saidaDeTeste();
    await criarUsuario(deps, { email: 'dif1@exemplo.test', nome: 'Pessoa Ficticia', papel: 'cto' }, s1);
    await criarUsuario(deps, { email: 'dif2@exemplo.test', nome: 'Pessoa Ficticia', papel: 'administradora' }, s2);
    expect(senhaDaSaida(s1.texto())).not.toBe(senhaDaSaida(s2.texto()));
  });

  it('C-37: SENHA no ambiente é ignorada', async () => {
    vi.stubEnv('SENHA', SENTINELAS.senha);
    vi.stubEnv('PASSWORD', SENTINELAS.senha);
    const saida = saidaDeTeste();
    await criarUsuario(deps, { email: 'ambiente@exemplo.test', nome: 'Pessoa Ficticia', papel: 'cto' }, saida);
    expect(saida.texto()).not.toContain(SENTINELAS.senha);
    const login = await postAuth(deps.auth, '/sign-in/email', { email: 'ambiente@exemplo.test', password: SENTINELAS.senha });
    expect(login.status).toBe(401);
  });

  it('a conta criada entra com a senha gerada e é levada a configurar o 2FA', async () => {
    const saida = saidaDeTeste();
    const { usuarioId } = await criarUsuario(deps, { email: 'Primeiro.Acesso@Exemplo.test', nome: 'Pessoa Ficticia', papel: 'administradora' }, saida);
    const login = await postAuth(deps.auth, '/sign-in/email', { email: 'primeiro.acesso@exemplo.test', password: senhaDaSaida(saida.texto()) });
    expect(login.status).toBe(200);
    const corpo = (await login.json()) as { twoFactorRedirect?: boolean; user?: { id: string } };
    expect(corpo.twoFactorRedirect).toBeUndefined();
    expect(corpo.user?.id).toBe(usuarioId);
    const cookie = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
    const sessao = (await (await getAuth(deps.auth, '/get-session', { cookie })).json()) as {
      user: { twoFactorEnabled: boolean; papel: string };
      session: { createdAt: string };
    };
    expect(sessao.user).toMatchObject({ twoFactorEnabled: false, papel: 'administradora' });
    // Um minuto depois do login: a sessão sem 2FA ainda vale, e só para configurar o 2FA (C-08).
    const umMinutoDepois = relogioFixo(new Date(new Date(sessao.session.createdAt).getTime() + 60_000).toISOString());
    await expect(exigirPessoa({ auth: deps.auth, relogio: umMinutoDepois }, new Headers({ cookie }))).rejects.toMatchObject({ codigo: 'sem_2fa' });
  });

  it('e-mail que já tem conta → conflito, sem senha na saída e sem segunda conta', async () => {
    await criarUsuario(deps, { email: 'repetido@exemplo.test', nome: 'Pessoa Ficticia', papel: 'cto' }, saidaDeTeste());
    const saida = saidaDeTeste();
    await expect(criarUsuario(deps, { email: 'REPETIDO@exemplo.test', nome: 'Pessoa Ficticia', papel: 'cto' }, saida)).rejects.toMatchObject({
      codigo: 'conflito',
    });
    expect(saida.texto()).toBe('');
    const n = (await b.poolMigrator.query("select count(*)::int as n from \"user\" where email = 'repetido@exemplo.test'")).rows[0].n;
    expect(n).toBe(1);
  });

  it('main (rodarScript): monta as dependências da configuração, cria a conta e sai com 0', async () => {
    const env = { DATABASE_URL: b.urlApp, BETTER_AUTH_SECRET: CONFIG_TESTE.segredoAuth, BETTER_AUTH_URL: CONFIG_TESTE.urlBase };
    const saida = saidaDeTeste();
    const erro = saidaDeTeste();
    const codigo = await rodarScript(
      async (d, argv, s) => {
        await criarUsuario(d, lerArgumentos(argumentosCriarUsuario, argv), s);
        return 0;
      },
      { env, argv: ['--email', 'pelo.main@exemplo.test', '--nome', 'Pessoa Ficticia', '--papel', 'cto'], saida, erro },
    );
    expect({ codigo, erro: erro.texto() }).toEqual({ codigo: 0, erro: '' });
    expect(senhaDaSaida(saida.texto())).toHaveLength(TAMANHO_SENHA);
    expect((await b.poolMigrator.query("select count(*)::int as n from \"user\" where email = 'pelo.main@exemplo.test'")).rows[0].n).toBe(1);
  });

  it('main (rodarScript): --senha sai com 1, sem o valor e sem conta; configuração ausente cita só os nomes', async () => {
    const env = { DATABASE_URL: b.urlApp, BETTER_AUTH_SECRET: CONFIG_TESTE.segredoAuth, BETTER_AUTH_URL: CONFIG_TESTE.urlBase };
    const executar = async (d: Parameters<typeof criarUsuario>[0], argv: readonly string[], s: { write(t: string): void }) => {
      await criarUsuario(d, lerArgumentos(argumentosCriarUsuario, argv), s);
      return 0;
    };
    const saida = saidaDeTeste();
    const erro = saidaDeTeste();
    const argv = ['--email', 'com.senha@exemplo.test', '--nome', 'Pessoa Ficticia', '--papel', 'cto', '--senha', SENTINELAS.senha];
    expect(await rodarScript(executar, { env, argv, saida, erro })).toBe(1);
    expect(erro.texto()).toContain('--senha');
    expect(contemSentinela(saida.texto() + erro.texto())).toBe(false);
    expect((await b.poolMigrator.query("select count(*)::int as n from \"user\" where email = 'com.senha@exemplo.test'")).rows[0].n).toBe(0);

    const erroConfig = saidaDeTeste();
    expect(await rodarScript(executar, { env: { DATABASE_URL: b.urlApp }, argv: ARGV_VALIDO, saida, erro: erroConfig })).toBe(1);
    expect(erroConfig.texto()).toContain('BETTER_AUTH_SECRET');
    expect(erroConfig.texto()).not.toContain(b.urlApp);
  });

  it('entrada fora do schema não grava nada (a função valida de novo)', async () => {
    const saida = saidaDeTeste();
    await expect(criarUsuario(deps, { email: 'x@exemplo.test', nome: ' ', papel: 'cto' }, saida)).rejects.toMatchObject({ codigo: 'entrada_invalida' });
    await expect(criarUsuario(deps, { email: 'x@exemplo.test', nome: 'Pessoa Ficticia', papel: 'agente' as never }, saida)).rejects.toMatchObject({
      codigo: 'entrada_invalida',
    });
    expect(saida.texto()).toBe('');
    expect((await b.poolMigrator.query("select count(*)::int as n from \"user\" where email = 'x@exemplo.test'")).rows[0].n).toBe(0);
  });
});
