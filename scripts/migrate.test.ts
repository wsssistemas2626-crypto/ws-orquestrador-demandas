import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../test/banco';
import { ehExecucaoDireta, migrar } from './migrate';

const URL_SCRIPT = pathToFileURL('/srv/app/scripts/migrate.ts').href;

it('roda quando o arquivo é o chamado pela linha de comando, com caminho absoluto ou relativo', () => {
  expect(ehExecucaoDireta('/srv/app/scripts/migrate.ts', URL_SCRIPT, '/srv/app')).toBe(true);
  expect(ehExecucaoDireta('scripts/migrate.ts', URL_SCRIPT, '/srv/app')).toBe(true);
});

it('não roda quando é importado (ajudante de teste, worker)', () => {
  expect(ehExecucaoDireta('/srv/app/node_modules/vitest/vitest.mjs', URL_SCRIPT, '/srv/app')).toBe(false);
  expect(ehExecucaoDireta(undefined, URL_SCRIPT, '/srv/app')).toBe(false);
});

// Testes da etapa 06-T04-testes (qa-automacao).

describe('ehExecucaoDireta: casos de borda do caminho', () => {
  it.each([
    ['./scripts/migrate.ts', '/srv/app'],
    ['scripts/../scripts/migrate.ts', '/srv/app'],
    ['../app/scripts/migrate.ts', '/srv/app'],
    ['migrate.ts', '/srv/app/scripts'],
  ])('reconhece %j a partir de %j', (argv1, cwd) => {
    expect(ehExecucaoDireta(argv1, URL_SCRIPT, cwd)).toBe(true);
  });

  it.each([
    ['outro script de mesmo nome em outra pasta', '/srv/outro/scripts/migrate.ts', '/srv/app'],
    ['o mesmo caminho relativo a partir de outra pasta', 'scripts/migrate.ts', '/srv/outro'],
    ['outro arquivo da mesma pasta', '/srv/app/scripts/criar-usuario.ts', '/srv/app'],
    ['o .js de mesmo nome', '/srv/app/scripts/migrate.js', '/srv/app'],
    ['argumento vazio', '', '/srv/app'],
  ])('não roda com %s', (_caso, argv1, cwd) => {
    expect(ehExecucaoDireta(argv1, URL_SCRIPT, cwd)).toBe(false);
  });

  it('caminho com espaço e acento: a URL do módulo e o argv batem', () => {
    const url = pathToFileURL('/srv/minha pasta/ação/scripts/migrate.ts').href;
    expect(ehExecucaoDireta('/srv/minha pasta/ação/scripts/migrate.ts', url, '/')).toBe(true);
    expect(ehExecucaoDireta('scripts/migrate.ts', url, '/srv/minha pasta/ação')).toBe(true);
  });
});

describe('migrar (ADR-12)', () => {
  let b: BancoDeTeste;
  beforeAll(async () => {
    b = await novoBanco();
  });
  afterAll(async () => {
    await b.fechar();
  });

  const journal = JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8')) as { entries: Array<{ tag: string; when: number }> };
  const registradas = async () =>
    (await b.poolMigrator.query('select created_at from drizzle.__drizzle_migrations order by id')).rows.map((r) => Number(r.created_at));
  const codigo = (e: unknown) => (e as { code?: string; cause?: { code?: string } }).code ?? (e as { cause?: { code?: string } }).cause?.code;

  it('o registro de migrations tem exatamente as entradas do journal, na ordem', async () => {
    expect(journal.entries.length).toBeGreaterThanOrEqual(2);
    expect(await registradas()).toEqual(journal.entries.map((e) => e.when));
  });

  it('rodar de novo num banco já migrado não aplica nada nem duplica o registro', async () => {
    const antes = await registradas();
    await migrar(b.urlMigrator);
    expect(await registradas()).toEqual(antes);
    // Os GRANTs continuam os mesmos: o app ainda lê o registro e ainda não altera evento.
    await expect(b.poolApp.query('select count(*) from drizzle.__drizzle_migrations')).resolves.toBeDefined();
    await expect(b.poolApp.query('delete from evento')).rejects.toMatchObject({ code: '42501' });
  });

  it('com o papel do app, a migração é recusada pelo banco (o app não tem DDL)', async () => {
    const falha = await migrar(b.urlApp).then(() => null, codigo);
    expect(falha).toBe('42501');
  });

  it('com senha errada, o erro sai do migrar (não é engolido)', async () => {
    const u = new URL(b.urlMigrator);
    u.password = 'senha_errada_ficticia';
    const falha = await migrar(u.toString()).then(() => null, codigo);
    expect(falha).toBe('28P01');
  });
});
