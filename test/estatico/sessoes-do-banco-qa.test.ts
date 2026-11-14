// test/estatico/sessoes-do-banco-qa.test.ts — 06-T08-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; SB-14). A leitura
// das sessões pelo superusuário só existe no banco de teste:
//   - `pgAdmin` (a URL do superusuário) só é fornecido pelo setup global, que sobe o contêiner descartável, e só é lido
//     em arquivo de teste; o Testcontainers é dependência de desenvolvimento, e a imagem não leva test/;
//   - código de produção (src/ e scripts/, fora dos .test.ts) não lê pg_stat_activity, não cita pgAdmin, não importa o
//     auxiliar nem o vitest;
//   - o auxiliar não lê variável de ambiente nem a URL do migrator, e o único pool dele é o do superusuário de teste.
// E a consulta do C-27 continua sem esconder papel: distinct, sem filtro por usename, sem filtro no JS, espera só por
// null; o caso do C-27 mantém as três asserções e nada que o pule ou repita.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importacoesDe } from './importacoes';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');
const AUXILIAR = 'test/sessoes-do-banco.ts';
const CASO = 'src/lib/deps-qa.test.ts';
const ESTE = 'test/estatico/sessoes-do-banco-qa.test.ts';

const todos = globSync('{src,scripts,test,e2e}/**/*.{ts,tsx,mts,mjs,js}', { cwd: raiz }).sort();
const ehTeste = (a: string) => /\.(?:test|spec)\.tsx?$/.test(a) || a.startsWith('test/') || a.startsWith('e2e/');
const producao = todos.filter((a) => (a.startsWith('src/') || a.startsWith('scripts/')) && !ehTeste(a));

// Tira comentários de linha e de bloco, para a regra olhar só o código.
const semComentario = (f: string) => f.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const NA_PRODUCAO: ReadonlyArray<readonly [string, RegExp]> = [
  ['pg_stat_activity', /pg_stat_activity/],
  ['pgAdmin', /pgAdmin/],
  ['sessoes-do-banco', /sessoes-do-banco/],
  ['testcontainers', /testcontainers/],
  ['vitest', /['"]vitest(?:\/[^'"]*)?['"]/],
];
const achadosNaProducao = (arquivo: string, fonte: string): string[] =>
  NA_PRODUCAO.filter(([, re]) => re.test(fonte)).map(([nome]) => `${arquivo}: ${nome}`);

describe('SB-14: a leitura pelo superusuário só existe no banco de teste', () => {
  it('a varredura enxerga produção e teste (falha se o glob quebrar)', () => {
    expect(todos).toEqual(expect.arrayContaining([AUXILIAR, CASO, 'test/setup-global.ts', 'test/banco.ts', ESTE]));
    expect(producao).toEqual(expect.arrayContaining(['src/lib/deps.ts', 'src/db/index.ts', 'scripts/migrate.ts']));
    expect(producao).not.toContain(CASO);
    expect(producao).not.toContain(AUXILIAR);
  });

  it('a regra pega as formas plantadas e deixa passar o que não é dela', () => {
    expect(achadosNaProducao('src/x.ts', "select usename from pg_stat_activity")).toEqual(['src/x.ts: pg_stat_activity']);
    expect(achadosNaProducao('src/x.ts', "const u = inject('pgAdmin');")).toEqual(['src/x.ts: pgAdmin']);
    expect(achadosNaProducao('src/x.ts', "import { x } from '../../test/sessoes-do-banco';")).toEqual(['src/x.ts: sessoes-do-banco']);
    expect(achadosNaProducao('scripts/x.ts', "import { PostgreSqlContainer } from '@testcontainers/postgresql';")).toEqual(['scripts/x.ts: testcontainers']);
    expect(achadosNaProducao('src/x.ts', "import { inject } from 'vitest';")).toEqual(['src/x.ts: vitest']);
    expect(achadosNaProducao('src/x.ts', "import { x } from 'vitest/node';")).toEqual(['src/x.ts: vitest']);
    expect(achadosNaProducao('src/x.ts', "const pool = criarPool(config.databaseUrl);")).toEqual([]);
  });

  it('código de produção (src/ e scripts/ fora dos testes) não lê pg_stat_activity, pgAdmin, o auxiliar, o Testcontainers nem o vitest', () => {
    expect(producao.flatMap((a) => achadosNaProducao(a, ler(a)))).toEqual([]);
  });

  it('pgAdmin só é fornecido por test/setup-global.ts e só é lido em arquivo de teste', () => {
    const fornecem = todos.filter((a) => /\.provide\(\s*['"]pgAdmin['"]/.test(ler(a)));
    expect(fornecem).toEqual(['test/setup-global.ts']);
    const leem = todos.filter((a) => /inject\(\s*['"]pgAdmin['"]\s*\)/.test(ler(a)));
    expect(leem).toContain(AUXILIAR);
    expect(leem.filter((a) => !ehTeste(a))).toEqual([]);
  });

  it('o setup global sobe o contêiner descartável e o derruba; é o único globalSetup do vitest', () => {
    const setup = semComentario(ler('test/setup-global.ts'));
    expect(setup).toMatch(/from '@testcontainers\/postgresql'/);
    expect(setup).toMatch(/new PostgreSqlContainer\('postgres:16-alpine'\)/);
    expect(setup).toMatch(/projeto\.provide\('pgAdmin', admin\)/);
    expect(setup).toMatch(/const admin = c\.getConnectionUri\(\)/);
    expect(setup).toMatch(/await c\.stop\(\)/);
    expect(setup).not.toMatch(/process\.env/);
    expect(semComentario(ler('vitest.config.ts'))).toMatch(/globalSetup:\s*\['test\/setup-global\.ts'\]/);
  });

  it('o Testcontainers é dependência de desenvolvimento, e a imagem final não leva test/', () => {
    const pacote = JSON.parse(ler('package.json')) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    for (const nome of ['@testcontainers/postgresql', 'testcontainers']) {
      expect(pacote.devDependencies).toHaveProperty([nome]);
      expect(pacote.dependencies).not.toHaveProperty([nome]);
    }
    const dockerfile = readFileSync(`${raiz}Dockerfile`, 'utf8');
    const final = dockerfile.slice(dockerfile.indexOf('FROM base AS final'));
    expect(final.length).toBeLessThan(dockerfile.length);
    const copias = final.split('\n').filter((l) => /^\s*COPY\b/.test(l));
    expect(copias.length).toBeGreaterThan(0);
    expect(copias.filter((l) => /(?:^|\s)\.?\/?test\b|\s\.\s/.test(l.replace(/^\s*COPY\s+(?:--\S+\s+)*/, ' ')))).toEqual([]);
  });

  it('o auxiliar só é importado por arquivo de teste', () => {
    const importadores = todos.filter((a) =>
      a !== ESTE && importacoesDe(a, ler(a)).some((i) => /(?:^|\/)sessoes-do-banco$/.test(i.origem)),
    );
    expect(importadores).toEqual(expect.arrayContaining([CASO, 'test/sessoes-do-banco.test.ts', 'test/sessoes-do-banco-qa.test.ts']));
    expect(importadores.filter((a) => !/\.test\.ts$/.test(a))).toEqual([]);
  });

  it('o auxiliar não lê variável de ambiente nem a URL do migrator, e o único pool dele é o do superusuário de teste', () => {
    const codigo = semComentario(ler(AUXILIAR));
    for (const proibido of ['process.env', 'DATABASE_URL', 'urlMigrator', 'MIGRATOR', 'connectionString: pool', 'import.meta.env']) {
      expect(codigo).not.toContain(proibido);
    }
    expect(codigo.match(/new\s+pg\.Pool\s*\(/g)).toHaveLength(1);
    expect(codigo).toMatch(/new pg\.Pool\(\{ connectionString: inject\('pgAdmin'\), max: 1 \}\)/);
    expect(codigo).toMatch(/finally\s*\{\s*await observador\.end\(\);/);
  });
});

// As consultas SQL do auxiliar que leem pg_stat_activity, em aspas simples, duplas ou crase (o SQL pode ter a outra aspa
// dentro, como em 'client backend').
const consultas = (fonte: string) =>
  [...fonte.matchAll(/"(select[^"]*pg_stat_activity[^"]*)"|'(select[^']*pg_stat_activity[^']*)'|`(select[^`]*pg_stat_activity[^`]*)`/gi)].map(
    (m) => m[1] ?? m[2] ?? m[3] ?? '',
  );
const corpoDe = (fonte: string, inicio: string) => {
  const i = fonte.indexOf(inicio);
  const j = fonte.indexOf('\nexport ', i + 1);
  return i < 0 ? '' : fonte.slice(i, j < 0 ? undefined : j);
};

describe('SB-14: a consulta do C-27 não esconde papel', () => {
  const codigo = semComentario(ler(AUXILIAR));
  const papeis = corpoDe(codigo, 'export async function papeisDasSessoesDeCliente');
  const sqlPapeis = consultas(papeis);

  it('há uma consulta só, com distinct usename, o banco observado e só client backend', () => {
    expect(sqlPapeis).toHaveLength(1);
    const sql = sqlPapeis[0]!;
    expect(sql).toMatch(/^select distinct usename from pg_stat_activity where /);
    expect(sql).toContain('datname = $1');
    expect(sql).toContain("backend_type = 'client backend'");
  });

  it('nenhum filtro por usename, por papel ou por pid, nem limite', () => {
    const sql = sqlPapeis[0] ?? '';
    const where = sql.slice(sql.indexOf(' where '));
    expect(where).not.toMatch(/usename|usesysid|rolname|pg_backend_pid|\bpid\b|application_name|client_addr|\blimit\b|\boffset\b|\bnot\b|<>|!=/i);
    expect(where.match(/\band\b/gi)).toHaveLength(1);
  });

  it('o pool recebido só dá o nome do banco; quem lê pg_stat_activity é o observador', () => {
    expect(papeis.match(/\bpool\.query\b/g)).toHaveLength(1);
    expect(papeis).toContain("await pool.query<{ banco: string }>('select current_database() as banco')");
    expect(papeis).toMatch(/await observador\.query<\{ usename: string \| null \}>\(\s*"select distinct usename from pg_stat_activity/);
    expect(papeis).not.toMatch(/\bpool\.(?:connect|options)\b/);
  });

  it('o JS não filtra a lista: só mapeia o usename, e a espera repete só enquanto houver null', () => {
    expect(papeis).not.toMatch(/\.filter\s*\(|\.splice\s*\(|\.slice\s*\(|\.pop\s*\(|\.shift\s*\(|new Set\s*\(|\.delete\s*\(/);
    expect(papeis).toContain('.rows.map((r) => r.usename)');
    expect(papeis).toMatch(/for \(let i = 1; i < tentativas && papeis\.includes\(null\); i\+\+\)/);
    expect(papeis).toMatch(/return papeis;\s*\}\s*finally/);
    expect(papeis).toContain("select pg_sleep(0.05)");
  });

  it('o diagnóstico seleciona só backend_type, usename e state', () => {
    const sqlDiag = consultas(corpoDe(codigo, 'export async function sessoesDoBanco'));
    expect(sqlDiag).toHaveLength(1);
    const colunas = sqlDiag[0]!.slice('select '.length, sqlDiag[0]!.indexOf(' from ')).split(',').map((c) => c.trim());
    expect(colunas).toEqual(['backend_type as "backendType"', 'usename', 'state']);
  });
});

describe('SB-14: o caso do C-27 mantém as três asserções, sem nada que o pule ou repita', () => {
  const fonte = ler(CASO);
  const inicio = fonte.indexOf("it('C-27:");
  const fim = fonte.indexOf('\n  it(', inicio + 1);
  const caso = fonte.slice(inicio, fim);

  it('o caso existe e é um it simples', () => {
    expect(inicio).toBeGreaterThan(0);
    expect(fim).toBeGreaterThan(inicio);
  });

  it('as três asserções, com os matchers de antes', () => {
    expect(caso).toContain('const papeis = await papeisDasSessoesDeCliente(d.pool);');
    expect(caso).toContain("expect(papeis, diagnostico).toEqual(['orquestrador_app']);");
    expect(caso).toContain('expect(d.config.databaseUrl).toBe(b.urlApp);');
    expect(caso).toContain('expect(Object.values(d.config)).not.toContain(b.urlMigrator);');
    expect(caso).not.toMatch(/toContain\(\s*['"]orquestrador_app['"]\s*\)|arrayContaining|toBeDefined|toBeTruthy/);
  });

  it('nem o caso, nem os arquivos do C-27, nem o vitest.config pulam, isolam ou repetem teste', () => {
    const modificadores = ['skip', 'only', 'todo', 'fails', 'skipIf', 'runIf', 'concurrent'];
    const re = new RegExp(`\\b(?:it|test|describe)\\s*\\.\\s*(?:${modificadores.join('|')})\\b`);
    for (const a of [CASO, 'test/sessoes-do-banco.test.ts', 'test/sessoes-do-banco-qa.test.ts', AUXILIAR]) {
      const codigo = semComentario(ler(a));
      expect(codigo, a).not.toMatch(re);
      expect(codigo, a).not.toMatch(/\bretry\b|\brepeats\b/);
    }
    expect(semComentario(ler('vitest.config.ts'))).not.toMatch(/\bretry\b|\brepeats\b|\bbail\b/);
  });

  it('o extrator de SQL pega as três aspas, inclusive com a outra aspa dentro', () => {
    expect(consultas(`x("select a from pg_stat_activity where b = 'c'")`)).toEqual(["select a from pg_stat_activity where b = 'c'"]);
    expect(consultas(`x('select a as "A" from pg_stat_activity')`)).toEqual(['select a as "A" from pg_stat_activity']);
    expect(consultas('x(`select a from pg_stat_activity`)')).toEqual(['select a from pg_stat_activity']);
    expect(consultas("x('select 1')")).toEqual([]);
  });

  it('a regra dos modificadores pega a forma plantada', () => {
    const re = /\b(?:it|test|describe)\s*\.\s*(?:skip|only|todo|fails|skipIf|runIf|concurrent)\b/;
    for (const t of ['it.skip(', 'it . fails(', 'describe.only(', 'test.skipIf(x)(']) expect(t).toMatch(re);
    expect("it('C-27: com DATABASE_URL_MIGRATOR', async () => {").not.toMatch(re);
  });
});
