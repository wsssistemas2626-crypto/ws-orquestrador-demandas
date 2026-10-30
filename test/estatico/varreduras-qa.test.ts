// Escrito na 06-T13-testes (qa-automacao). Fecha as brechas que os estáticos da T13 deixam abertas, sem mudar nenhum
// deles:
//   - C-04 b: Server Action fora de src/app, route.ts fora de src/app/api e page.tsx fora do grupo (painel) escapariam
//     da varredura do exigir-pessoa.test.ts e do teste da matriz;
//   - G3.4: `new Date` sem parênteses e `Date.now` passado como referência também tiram a hora do processo;
//   - C-17: `sql['raw']` e `const { raw } = sql` chegam ao mesmo SQL cru que `sql.raw(`;
//   - C-27: arquivos de configuração da raiz (o next.config.ts roda no processo do app) e .mjs/.js em src/ e scripts/.
// Cada regra tem um teste que prova que ela pega a forma proibida e deixa passar a permitida.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const listar = (padrao: string) => globSync(padrao, { cwd: raiz }).sort();
const ler = (arquivo: string) => readFileSync(`${raiz}${arquivo}`, 'utf8');
const semTeste = (x: string) => !/\.test\.tsx?$/.test(x);

describe('C-04 b: nenhum ponto de entrada fica fora das varreduras', () => {
  const USE_SERVER = /^\s*['"]use server['"]/m;
  const ADAPTADOR_DA_ACAO = /\bacaoDoPainel\(|\bexigirPessoa\(/;
  // Páginas sem exigirPessoaNaPagina: a raiz (só redireciona), as duas que C-04 deixa de fora e /sem-permissao (T36:
  // texto fixo da 03, 2.8, destino de exigirPessoaNaPagina para papel inválido; dentro do painel seria um laço), em
  // qualquer grupo.
  const PAGINA_PUBLICA = /^src\/app\/(?:\([^/]+\)\/)*(?:(?:entrar|configurar-2fa|sem-permissao)\/)?page\.tsx$/;

  it('a varredura enxerga src/ (falha se o glob quebrar)', () => {
    expect(listar('src/**/*.{ts,tsx}')).toEqual(expect.arrayContaining(['src/lib/acao-painel.ts', 'src/app/page.tsx']));
  });

  it('todo arquivo de src/ com "use server", e não só os de src/app, usa acaoDoPainel ou exigirPessoa', () => {
    const acoes = listar('src/**/*.{ts,tsx}').filter(semTeste).filter((a) => USE_SERVER.test(ler(a)));
    expect(acoes.filter((a) => !ADAPTADOR_DA_ACAO.test(ler(a)))).toEqual([]);
  });

  it('todo route.ts fica em src/app/api, onde a matriz e o estático de rota() o enxergam', () => {
    expect(listar('src/app/**/route.{ts,tsx,js,mjs}').filter((r) => !r.startsWith('src/app/api/'))).toEqual([]);
    expect(listar('src/app/api/**/route.{tsx,js,mjs}')).toEqual([]);
  });

  it('toda page.tsx fora do grupo (painel) é uma das públicas: raiz, entrar, configurar-2fa ou sem-permissao', () => {
    const fora = listar('src/app/**/page.{tsx,ts,jsx,js}').filter((p) => !p.startsWith('src/app/(painel)/'));
    expect(fora.filter((p) => !PAGINA_PUBLICA.test(p))).toEqual([]);
  });

  it('as regras pegam o que dizem pegar', () => {
    expect("'use server';\nexport async function f() {}").toMatch(USE_SERVER);
    expect('export async function f() {\n  "use server";\n}').toMatch(USE_SERVER);
    expect('// sem a diretiva').not.toMatch(USE_SERVER);
    for (const p of [
      'src/app/page.tsx',
      'src/app/entrar/page.tsx',
      'src/app/(publico)/entrar/page.tsx',
      'src/app/(publico)/configurar-2fa/page.tsx',
      'src/app/sem-permissao/page.tsx',
    ])
      expect(p).toMatch(PAGINA_PUBLICA);
    for (const p of [
      'src/app/demandas/page.tsx',
      'src/app/(publico)/demandas/page.tsx',
      'src/app/entrar/outra/page.tsx',
      'src/app/configuracao/page.tsx',
      'src/app/sem-permissao/outra/page.tsx',
    ])
      expect(p).not.toMatch(PAGINA_PUBLICA);
  });
});

describe('G3.4: nenhuma outra forma de tirar a hora do processo fora de src/lib/relogio.ts', () => {
  // `new Date` sem argumento, com ou sem parênteses, e `Date.now` chamado ou passado como referência.
  const PROIBIDO = /\bnew\s+Date\b(?!\s*\(\s*[^\s)])|\bDate\s*\.\s*now\b/;
  const arquivos = listar('src/**/*.{ts,tsx}').filter(semTeste).filter((x) => x !== 'src/lib/relogio.ts');

  it('a varredura enxerga src/ e deixa relogio.ts de fora', () => {
    expect(arquivos).toEqual(expect.arrayContaining(['src/lib/fuso.ts', 'src/lib/rota.ts']));
    expect(arquivos).not.toContain('src/lib/relogio.ts');
  });

  it('nenhum arquivo usa new Date sem argumento nem Date.now, em qualquer forma', () => {
    expect(arquivos.filter((a) => PROIBIDO.test(ler(a)))).toEqual([]);
  });

  it('a regra pega as formas proibidas e deixa passar a data com argumento', () => {
    for (const t of ['new Date()', 'new Date;', 'const d = new Date', 'new Date( )', 'Date.now()', 'const f = Date.now;', 'globalThis.Date.now()'])
      expect(t).toMatch(PROIBIDO);
    for (const t of ['new Date(ms)', 'new Date(\n  iso,\n)', 'new Date(Date.UTC(2026, 9, 22))', 'new Dates()', 'x instanceof Date', 'performance.now()'])
      expect(t).not.toMatch(PROIBIDO);
  });
});

describe('C-17: nenhum caminho para o SQL cru do Drizzle', () => {
  const PROIBIDO = /\bsql\s*(?:\.\s*raw\b|\[\s*['"`]raw['"`]\s*\])|\{[^}]*\braw\b[^}]*\}\s*=\s*sql\b/;
  const arquivos = listar('src/**/*.{ts,tsx}');

  it('a varredura enxerga src/', () => {
    expect(arquivos).toEqual(expect.arrayContaining(['src/db/transacao.ts', 'src/lib/rota.ts']));
  });

  it('nenhum sql.raw, sql["raw"] nem raw tirado de sql em src/', () => {
    expect(arquivos.filter((a) => PROIBIDO.test(ler(a)))).toEqual([]);
  });

  it('a regra pega as formas proibidas e deixa passar o template com parâmetros', () => {
    for (const t of ['sql.raw(x)', 'sql . raw (x)', 'const r = sql.raw;', "sql['raw'](x)", 'sql["raw"](x)', 'const { raw } = sql;', 'const { raw: cru } = sql'])
      expect(t).toMatch(PROIBIDO);
    for (const t of ['sql`select ${id}`', 'sql.identifier(nome)', 'sql.join(partes)', 'const bruto = texto.raw'])
      expect(t).not.toMatch(PROIBIDO);
  });
});

describe('C-27: os nomes das variáveis de segredo também fora de .ts e na raiz', () => {
  const NOMES = ['ANTHROPIC_API_KEY', 'RESEND_API_KEY', 'DATABASE_URL_MIGRATOR'] as const;
  const PERMITIDOS: Record<(typeof NOMES)[number], RegExp> = {
    ANTHROPIC_API_KEY: /^src\/(worker\/|modules\/agentes\/provedor\.ts$|lib\/env-worker\.ts$)/,
    RESEND_API_KEY: /^src\/(worker\/|modules\/avisos\/enviador\.ts$|lib\/env-worker\.ts$)/,
    DATABASE_URL_MIGRATOR: /^scripts\/(migrate|start-hml)\.ts$/,
  };

  it('os arquivos de configuração da raiz não citam nenhum dos três nomes', () => {
    const configs = listar('*.{ts,mts,cts,mjs,cjs,js}');
    expect(configs).toEqual(expect.arrayContaining(['next.config.ts', 'drizzle.config.ts', 'vitest.config.ts']));
    expect(configs.flatMap((a) => NOMES.filter((n) => ler(a).includes(n)).map((n) => `${n} em ${a}`))).toEqual([]);
  });

  it('os .js, .mjs, .cjs e .mts de src/ e scripts/ seguem a mesma lista de permissão', () => {
    const outros = listar('{src,scripts}/**/*.{js,jsx,mjs,cjs,mts,cts}').filter((x) => !/\.test\.[cm]?[jt]sx?$/.test(x));
    const fora = outros.flatMap((a) => NOMES.filter((n) => ler(a).includes(n) && !PERMITIDOS[n].test(a)).map((n) => `${n} em ${a}`));
    expect(fora).toEqual([]);
  });
});
