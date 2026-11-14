// test/sessoes-do-banco-qa.test.ts — 06-T08-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; SB-14 adversarial). A
// verificação do C-27 tem de ficar vermelha sempre que o app, por qualquer metade, conecta como migrator:
//   - o app inteiro montado por obterDeps() sobre a URL do migrator (pool e fila);
//   - só a fila (pg-boss) montada sobre a URL do migrator, com o pool certo;
//   - o pool do migrator passado como argumento (forma literal do SB-14 a; Minor 2 da 06-T08-revisao).
// E a mensagem da falha forçada (SB-14 b) não leva URL, senha, texto de consulta, application_name nem endereço, mesmo
// com o diagnóstico lido por quem vê todas as colunas. Por fim, o porquê do observador: o papel do app não é
// superusuário nem lê as estatísticas de outro papel. Banco real; a ordem dos casos não importa.
import pg from 'pg';
import { afterAll, afterEach, beforeAll, describe, expect, inject, it, vi } from 'vitest';
import { CONFIG_TESTE } from './auth';
import { novoBanco, type BancoDeTeste } from './banco';
import { criarFila } from '../src/lib/fila';
import { diagnosticoDasSessoes, papeisDasSessoesDeCliente, sessoesDoBanco } from './sessoes-do-banco';

let b: BancoDeTeste;
let papelDoMigrator: string;

beforeAll(async () => {
  b = await novoBanco();
  papelDoMigrator = new URL(b.urlMigrator).username;
});
afterAll(async () => {
  await b.fechar();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

const ambienteDoApp = (databaseUrl: string) => {
  vi.stubEnv('BETTER_AUTH_SECRET', CONFIG_TESTE.segredoAuth);
  vi.stubEnv('BETTER_AUTH_URL', 'http://127.0.0.1:3101');
  vi.stubEnv('DATABASE_URL', databaseUrl);
  vi.stubEnv('DATABASE_URL_MIGRATOR', b.urlMigrator);
};

// A asserção do C-27, igual à de src/lib/deps-qa.test.ts. Devolve o erro dela, ou null se passou.
const assercaoDoC27 =(papeis: Array<string | null>, diagnostico: string): Error | null => {
  try {
    expect(papeis, diagnostico).toEqual(['orquestrador_app']);
    return null;
  } catch (e) {
    return e as Error;
  }
};

const SEGREDOS = () => [
  b.urlApp,
  b.urlMigrator,
  decodeURIComponent(new URL(b.urlApp).password),
  decodeURIComponent(new URL(b.urlMigrator).password),
];

describe('SB-14 adversarial: a verificação do C-27 fica vermelha com o app conectado como migrator', () => {
  it('obterDeps() com DATABASE_URL apontando para o migrator: o papel dele aparece e a asserção do C-27 falha', async () => {
    ambienteDoApp(b.urlMigrator);
    const { obterDeps } = await import('../src/lib/deps');
    const d = await obterDeps();
    try {
      await d.pool.query('select 1');
      const papeis = await papeisDasSessoesDeCliente(d.pool);
      expect(papeis).toContain(papelDoMigrator);
      const erro = assercaoDoC27(papeis, diagnosticoDasSessoes(await sessoesDoBanco(d.pool)));
      expect(erro).toBeInstanceOf(Error);
      expect(erro?.message).toContain(papelDoMigrator);
    } finally {
      await d.fila.parar();
      await d.pool.end();
    }
  });

  it('só a fila montada sobre o migrator, com o pool do app certo: a asserção do C-27 falha', async () => {
    ambienteDoApp(b.urlApp);
    const { obterDeps } = await import('../src/lib/deps');
    const d = await obterDeps();
    const filaErrada = await criarFila(b.urlMigrator);
    try {
      // Uma consulta pela fila errada logo antes de observar: a sessão dela está aberta na hora da leitura.
      await filaErrada.boss.getQueues();
      await d.pool.query('select 1');
      const papeis = await papeisDasSessoesDeCliente(d.pool);
      expect(papeis).toContain(papelDoMigrator);
      expect(papeis).toContain('orquestrador_app');
      expect(assercaoDoC27(papeis, diagnosticoDasSessoes(await sessoesDoBanco(d.pool)))).toBeInstanceOf(Error);
    } finally {
      await filaErrada.parar();
      await d.fila.parar();
      await d.pool.end();
    }
  });

  it('o pool do migrator passado como argumento (SB-14 a, forma literal): o papel dele aparece e a asserção falha', async () => {
    await b.poolMigrator.query('select 1');
    const papeis = await papeisDasSessoesDeCliente(b.poolMigrator);
    expect(papeis).toContain(papelDoMigrator);
    expect(papeis).not.toEqual(['orquestrador_app']);
    expect(assercaoDoC27(papeis, diagnosticoDasSessoes(await sessoesDoBanco(b.poolMigrator)))).toBeInstanceOf(Error);
  });

  it('a espera por tentativas não tira o papel do migrator: com uma tentativa ou com cinquenta, a lista é a mesma', async () => {
    const migrator = new pg.Pool({ connectionString: b.urlMigrator, max: 1 });
    try {
      await migrator.query('select 1');
      await b.poolApp.query('select 1');
      const umaTentativa = await papeisDasSessoesDeCliente(b.poolApp, 1);
      const cinquenta = await papeisDasSessoesDeCliente(b.poolApp);
      expect(umaTentativa).toContain(papelDoMigrator);
      expect(cinquenta).toContain(papelDoMigrator);
      expect(cinquenta).not.toContain(null);
    } finally {
      await migrator.end();
    }
  });
});

describe('SB-14 b: a mensagem da falha forçada não vaza nada além de backend_type, usename e state', () => {
  it('com o migrator conectado e o diagnóstico lido pelo superusuário, a mensagem não traz URL, senha, consulta, application_name nem endereço', async () => {
    const sentinelaApp = 'sentinela_app_c27_qa';
    const sentinelaConsulta = 'sentinela_consulta_c27_qa';
    const migrator = new pg.Pool({ connectionString: b.urlMigrator, application_name: sentinelaApp, max: 1 });
    const c = await migrator.connect();
    try {
      // A sessão do migrator fica com a sentinela em `query` (última consulta) e em `application_name`.
      await c.query("select 'sentinela_consulta_c27_qa' as s");
      await b.poolApp.query('select 1');
      const papeis = await papeisDasSessoesDeCliente(b.poolApp);
      // A sentinela está mesmo no pg_stat_activity: sem isso, o "não contém" abaixo passaria por vazio.
      const { rows: vistas } = await b.poolMigrator.query<{ n: number }>(
        'select count(*)::int as n from pg_stat_activity where datname = current_database() and application_name = $1 and query like $2',
        [sentinelaApp, `%${sentinelaConsulta}%`],
      );
      expect(vistas).toEqual([{ n: 1 }]);
      // Diagnóstico pela visão que vê todas as colunas: se o texto tivesse query ou application_name, apareceria aqui.
      const diagnostico = diagnosticoDasSessoes(await sessoesDoBanco(b.poolMigrator));
      const erro = assercaoDoC27(papeis, diagnostico);
      expect(erro).toBeInstanceOf(Error);
      expect(diagnostico).toContain(`client backend/${papelDoMigrator}/`);
      const curtos = [erro?.message ?? '', diagnostico];
      const textos = [...curtos, String(erro), JSON.stringify(erro, Object.getOwnPropertyNames(erro ?? {}))];
      for (const t of textos) {
        for (const s of SEGREDOS()) expect(t).not.toContain(s);
        expect(t).not.toContain(sentinelaApp);
        expect(t).not.toContain(sentinelaConsulta);
      }
      // client_addr: nenhum endereço IPv4 na mensagem nem no diagnóstico.
      for (const t of curtos) expect(t).not.toMatch(/\b\d{1,3}(?:\.\d{1,3}){3}\b/);
    } finally {
      c.release();
      await migrator.end();
    }
  });
});

describe('o porquê do observador: o papel do app não vê o backend_type de outro papel, e não pode passar a ver', () => {
  it('o papel do app não é superusuário nem membro de pg_read_all_stats ou pg_monitor', async () => {
    const { rows } = await b.poolMigrator.query<{ superusuario: boolean; estatisticas: boolean; monitor: boolean }>(
      `select rolsuper as superusuario,
              pg_has_role('orquestrador_app', 'pg_read_all_stats', 'member') as estatisticas,
              pg_has_role('orquestrador_app', 'pg_monitor', 'member') as monitor
         from pg_roles where rolname = 'orquestrador_app'`,
    );
    expect(rows).toEqual([{ superusuario: false, estatisticas: false, monitor: false }]);
  });

  it('pela visão do app, a sessão do migrator vem sem backend_type; pela do observador, como client backend', async () => {
    const migrator = new pg.Pool({ connectionString: b.urlMigrator, max: 1 });
    try {
      await migrator.query('select 1');
      const peloApp = await sessoesDoBanco(b.poolApp);
      const doMigratorPeloApp = peloApp.filter((s) => s.usename === papelDoMigrator);
      expect(doMigratorPeloApp.length).toBeGreaterThan(0);
      expect(doMigratorPeloApp.every((s) => s.backendType === null)).toBe(true);
      const peloObservador = await papeisDasSessoesDeCliente(b.poolApp);
      expect(peloObservador).toContain(papelDoMigrator);
    } finally {
      await migrator.end();
    }
  });

  it('o observador é o superusuário do contêiner de teste, conectado ao banco postgres, e não ao banco observado', async () => {
    const observador = new pg.Pool({ connectionString: inject('pgAdmin'), max: 1 });
    try {
      const { rows } = await observador.query<{ banco: string; superusuario: boolean }>(
        'select current_database() as banco, (select rolsuper from pg_roles where rolname = current_user) as superusuario',
      );
      expect(rows).toEqual([{ banco: 'postgres', superusuario: true }]);
      const { rows: observado } = await b.poolApp.query<{ banco: string }>('select current_database() as banco');
      expect(observado[0]?.banco).toMatch(/^t_[0-9a-f]{32}$/);
    } finally {
      await observador.end();
    }
  });
});
