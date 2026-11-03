// Teste estático do esqueleto do projeto (T01): RNF-01 (stack do padrão técnico), RNF-02 (porta 3101, nunca 3000),
// parte de C-39 (`packageManager` fixo e `audit:prod`), `tsconfig` estrito e `.gitignore` do padrão (seção 10).
// Escrito na 06-T01-testes (qa-automacao).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (arquivo: string) => readFileSync(`${raiz}${arquivo}`, 'utf8');

type PackageJson = {
  name: string;
  version: string;
  private: boolean;
  type: string;
  packageManager: string;
  engines: { node: string };
  scripts: Record<string, string>;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

const pkg = JSON.parse(ler('package.json')) as PackageJson;

describe('package.json', () => {
  // 0.1.5: DEC-DEM-20261103-0006-v1 (M-01, M-02 e M-03 do DEC-DEM-20261022-0001-v1: citação da consolidação, demanda em status final e aviso).
  it('versão 0.1.5, privado, ESM, Node 24 e pnpm 12.6.0 fixo (C-39)', () => {
    expect(pkg.name).toBe('ws-orquestrador-demandas');
    expect(pkg.version).toBe('0.1.5');
    expect(pkg.private).toBe(true);
    expect(pkg.type).toBe('module');
    expect(pkg.packageManager).toBe('pnpm@12.6.0');
    expect(pkg.engines.node).toBe('>=24');
  });

  it('porta de desenvolvimento 3101 no dev e no start, com PORT opcional (RNF-02)', () => {
    expect(pkg.scripts.dev).toBe('next dev -p 3101');
    expect(pkg.scripts.start).toBe('next start -p ${PORT:-3101}');
  });

  it('nenhum script usa a porta 3000 do Easypanel (RNF-02)', () => {
    for (const [nome, comando] of Object.entries(pkg.scripts)) {
      expect({ nome, usa3000: /(^|\D)3000(\D|$)/.test(comando) }).toEqual({ nome, usa3000: false });
    }
  });

  it('scripts do padrão técnico (seção 3) e do plano', () => {
    expect(pkg.scripts).toMatchObject({
      build: 'next build',
      lint: 'eslint .',
      typecheck: 'tsc --noEmit',
      format: 'prettier --write .',
      test: 'vitest run',
      'test:e2e': 'playwright test',
      'db:generate': 'drizzle-kit generate',
      'db:migrate': 'tsx --env-file-if-exists=.env.local scripts/migrate.ts',
      worker: 'tsx src/worker/index.ts',
      'audit:prod': 'pnpm audit --prod --audit-level high',
    });
  });

  // next, zod e better-auth subiram na 08-correcao (S-01): next ≤16.4.0, zod 4.6.5 e better-auth 1.7.6 têm
  // vulnerabilidade conhecida no `pnpm audit --prod`.
  it('dependências de produção nas versões exatas do padrão técnico (RNF-01)', () => {
    expect(pkg.dependencies).toMatchObject({
      next: '16.4.1',
      react: '19.2.8',
      'react-dom': '19.2.8',
      'drizzle-orm': '0.45.3',
      zod: '4.6.6',
      'better-auth': '1.7.7',
      'pg-boss': '12.34.0',
      pino: '10.3.1',
      '@sentry/node': '11.4.0',
      resend: '6.30.0',
      '@anthropic-ai/sdk': '0.131.0',
    });
    expect(pkg.dependencies.pg).toBeDefined();
  });

  it('dependências de desenvolvimento nas versões do padrão técnico (RNF-01)', () => {
    expect(pkg.devDependencies).toMatchObject({
      'drizzle-kit': '0.31.11',
      vitest: '5.0.2',
      testcontainers: '12.1.0',
      '@testcontainers/postgresql': '12.1.0',
      '@playwright/test': '1.63.0',
      '@axe-core/playwright': '4.13.0',
      'eslint-config-next': '16.4.1',
    });
    // next e eslint-config-next andam juntos, na mesma versão exata (padrão técnico, seção 1)
    expect(pkg.devDependencies['eslint-config-next']).toBe(pkg.dependencies.next);
    expect(pkg.devDependencies.typescript).toMatch(/^\^?5\./);
    expect(pkg.devDependencies.eslint).toMatch(/^\^?9\./);
    expect(pkg.devDependencies.tailwindcss).toMatch(/^\^?4\./);
  });

  it('nenhuma dependência de produção fica solta (latest, * ou intervalo aberto) nas fixadas pelo padrão', () => {
    const fixadas = ['next', 'react', 'react-dom', 'drizzle-orm', 'zod', 'better-auth', 'pg-boss', 'pino'];
    for (const nome of fixadas) expect(pkg.dependencies[nome]).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('tsconfig.json', () => {
  type TsConfig = { compilerOptions: Record<string, unknown> & { paths: Record<string, string[]> } };
  const ts = JSON.parse(ler('tsconfig.json')) as TsConfig;

  it('TypeScript estrito, com índice verificado, JSON e alias @/* para src/*', () => {
    expect(ts.compilerOptions.strict).toBe(true);
    expect(ts.compilerOptions.noUncheckedIndexedAccess).toBe(true);
    expect(ts.compilerOptions.resolveJsonModule).toBe(true);
    expect(ts.compilerOptions.noEmit).toBe(true);
    expect(ts.compilerOptions.paths['@/*']).toEqual(['./src/*']);
  });
});

describe('next.config.ts', () => {
  it('sem cabeçalho X-Powered-By e com pg, pg-boss e pino fora do bundle', () => {
    expect(nextConfig.poweredByHeader).toBe(false);
    expect(nextConfig.serverExternalPackages).toEqual(expect.arrayContaining(['pg', 'pg-boss', 'pino']));
  });
});

describe('.gitignore', () => {
  const linhas = ler('.gitignore')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('#'));

  it('tem todas as entradas mínimas do padrão técnico (seção 10)', () => {
    const minimas = [
      'node_modules/',
      '.next/',
      'coverage/',
      'playwright-report/',
      'test-results/',
      '.env',
      '.env.*',
      '!.env.example',
    ];
    expect(linhas).toEqual(expect.arrayContaining(minimas));
  });

  it('libera o .env.example depois de ignorar .env.* (a ordem importa no git)', () => {
    expect(linhas.indexOf('!.env.example')).toBeGreaterThan(linhas.indexOf('.env.*'));
  });
});
