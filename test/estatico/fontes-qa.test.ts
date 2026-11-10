// test/estatico/fontes-qa.test.ts — RF-02, RNF-06, RNF-10, CV-05 e ADR-13 (DEC-DEM-20261110-0015-v1, T02), complemento
// do qa-automacao na 06-T02-testes. O fontes.test.ts confere os seis arquivos e o texto de fontes.ts; aqui ficam:
//   - o que fontes.ts de fato passa ao next/font/local (capturado por vi.mock): cada caminho resolvido a partir de
//     src/app/ chega ao arquivo do pacote certo, o peso declarado é o do nome do arquivo, só `latin` e `normal`;
//   - as variáveis das fontes batem com as do @theme inline de globals.css, declaradas uma vez só;
//   - nenhum arquivo de src/ usa o @fontsource fora dos caminhos .woff2 de fontes.ts, e o app não importa o substituto
//     de teste (test/next-font-local.ts) — o fontes.test.ts só lê três arquivos;
//   - a licença OFL 1.1 viaja no pacote (arquivo LICENSE, ADR-13) e o subconjunto `latin` cobre o pt-BR (RNF-06);
//   - lockfile sem tarball, sem script e sem dependência; pnpm-workspace.yaml sem allowBuilds novo (CV-05);
//   - nenhuma dependência nova além das duas fontes (RNF-10);
//   - piso de asserções dos testes da T02 (CV-20).
import { existsSync, globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');

type Arquivo = { path: string; weight: string; style: string };
type Opcoes = { src: Arquivo[]; variable: string; display: string; adjustFontFallback: string | false; fallback: string[] };

// O next/font/local de verdade só existe no compilador do Next; aqui ele só guarda o que fontes.ts lhe passa.
const chamadas = vi.hoisted(() => [] as unknown[]);
vi.mock('next/font/local', () => ({
  default: (o: unknown) => {
    chamadas.push(o);
    return { className: 'x', variable: 'x', style: { fontFamily: 'x' } };
  },
}));

async function opcoesDasFontes(): Promise<{ sans: Opcoes; mono: Opcoes }> {
  await import('../../src/app/fontes');
  expect(chamadas).toHaveLength(2);
  const [sans, mono] = chamadas as [Opcoes, Opcoes];
  return { sans, mono };
}

const PASTA_DE_FONTES = resolve(raiz, 'src/app');
const NOME_DO_ARQUIVO = /^(noto-sans(?:-mono)?)-latin-(\d{3})-normal\.woff2$/;

function conferirArquivos(o: Opcoes, pacote: string, pesos: string[]) {
  for (const a of o.src) {
    const absoluto = resolve(PASTA_DE_FONTES, a.path);
    expect(absoluto.startsWith(`${raiz}node_modules/@fontsource/${pacote}/files/`), a.path).toBe(true);
    expect(existsSync(absoluto), a.path).toBe(true);
    const nome = NOME_DO_ARQUIVO.exec(absoluto.split('/').pop() ?? '');
    expect({ caminho: a.path, pacote: nome?.[1], peso: nome?.[2], estilo: a.style }).toEqual({ caminho: a.path, pacote, peso: a.weight, estilo: 'normal' });
  }
  expect(o.src.map((a) => a.weight).sort()).toEqual(pesos);
}

describe('fontes.ts: o que chega ao next/font/local (ADR-13, RF-02, RNF-06)', () => {
  it('Noto Sans: 400, 600, 700 e 800 do pacote noto-sans, latin normal, swap, fallback ajustado sobre Arial', async () => {
    const { sans } = await opcoesDasFontes();
    conferirArquivos(sans, 'noto-sans', ['400', '600', '700', '800']);
    expect({ variable: sans.variable, display: sans.display, ajuste: sans.adjustFontFallback, fallback: sans.fallback }).toEqual({
      variable: '--font-noto-sans',
      display: 'swap',
      ajuste: 'Arial',
      fallback: ['system-ui', 'sans-serif'],
    });
  });

  it('Noto Sans Mono: 400 e 600 do pacote noto-sans-mono, latin normal, swap, fallback monoespaçado', async () => {
    const { mono } = await opcoesDasFontes();
    conferirArquivos(mono, 'noto-sans-mono', ['400', '600']);
    expect({ variable: mono.variable, display: mono.display, ajuste: mono.adjustFontFallback, fallback: mono.fallback }).toEqual({
      variable: '--font-noto-sans-mono',
      display: 'swap',
      ajuste: false,
      fallback: ['ui-monospace', 'monospace'],
    });
  });

  it('a conferência reprova peso trocado, outro subconjunto e caminho que não chega ao pacote', () => {
    const base = (path: string, weight = '400'): Opcoes => ({ src: [{ path, weight, style: 'normal' }], variable: '', display: '', adjustFontFallback: false, fallback: [] });
    expect(() => conferirArquivos(base('../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2', '700'), 'noto-sans', ['700'])).toThrow();
    expect(() => conferirArquivos(base('../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff2'), 'noto-sans', ['400'])).toThrow();
    expect(() => conferirArquivos(base('../node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2'), 'noto-sans', ['400'])).toThrow();
    expect(() => conferirArquivos(base('../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2'), 'noto-sans', ['400'])).not.toThrow();
  });
});

describe('globals.css: as famílias pelo @theme inline (ADR-13, CA-02.2)', () => {
  const css = ler('src/app/globals.css');

  it('--font-sans e --font-mono declaradas uma vez só, dentro do @theme inline, com as variáveis de fontes.ts', async () => {
    const { sans, mono } = await opcoesDasFontes();
    expect(css.match(/--font-sans\s*:/g)).toHaveLength(1);
    expect(css.match(/--font-mono\s*:/g)).toHaveLength(1);
    const bloco = /@theme\s+inline\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(bloco).toContain(`--font-sans: var(${sans.variable}), system-ui, sans-serif;`);
    expect(bloco).toContain(`--font-mono: var(${mono.variable}), ui-monospace, monospace;`);
  });
});

// Usos do @fontsource em src/: só o caminho literal de um .woff2 do pacote, e só em fontes.ts (CV-05: nenhum .js, .mjs
// nem .cjs dos pacotes importado pelo app; nenhuma folha .css do pacote, que traria outro @font-face).
const CAMINHO_PERMITIDO = /path:\s*'(?:\.\.\/)+node_modules\/@fontsource\/noto-sans(?:-mono)?\/files\/[a-z0-9-]+\.woff2'/g;
// Comentário não carrega nada: sai antes da conferência (fontes.ts cita os pacotes no cabeçalho). Só o comentário que
// abre a linha: um "/*" dentro de texto (ex.: 'src/**/*.ts') não pode apagar o código que vem depois dele.
const semComentarios = (fonte: string) => fonte.replace(/^\s*\/\*[\s\S]*?\*\//gm, '').replace(/^\s*\/\/.*$/gm, '');
function usosProibidosDoFontsource(arquivo: string, fonte: string): string[] {
  const codigo = semComentarios(fonte);
  const resto = arquivo === 'src/app/fontes.ts' ? codigo.replace(CAMINHO_PERMITIDO, '') : codigo;
  return resto.includes('@fontsource') ? [arquivo] : [];
}

describe('@fontsource só como caminho de .woff2 em fontes.ts (CV-05)', () => {
  const arquivosDeSrc = globSync('src/**/*.{ts,tsx,js,jsx,mjs,cjs,css}', { cwd: raiz }).sort();

  it('a varredura enxerga src/ (falha se o glob quebrar)', () => {
    expect(arquivosDeSrc).toEqual(expect.arrayContaining(['src/app/fontes.ts', 'src/app/layout.tsx', 'src/app/globals.css']));
    expect(arquivosDeSrc.length).toBeGreaterThan(50);
  });

  it('reprova import, @import, require e caminho que não é .woff2; deixa passar o caminho do arquivo em fontes.ts', () => {
    expect(usosProibidosDoFontsource('src/app/layout.tsx', "import '@fontsource/noto-sans';")).toEqual(['src/app/layout.tsx']);
    expect(usosProibidosDoFontsource('src/app/globals.css', "@import '@fontsource/noto-sans/400.css';")).toEqual(['src/app/globals.css']);
    expect(usosProibidosDoFontsource('src/components/X.tsx', "const f = require('@fontsource/noto-sans-mono');")).toEqual(['src/components/X.tsx']);
    expect(usosProibidosDoFontsource('src/app/fontes.ts', "{ path: '../../node_modules/@fontsource/noto-sans/index.css', weight: '400' }")).toEqual([
      'src/app/fontes.ts',
    ]);
    expect(usosProibidosDoFontsource('src/app/fontes.ts', "import x from '../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2';")).toEqual([
      'src/app/fontes.ts',
    ]);
    expect(usosProibidosDoFontsource('src/app/fontes.ts', "{ path: '../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2' }")).toEqual([]);
    expect(usosProibidosDoFontsource('src/app/layout.tsx', '// as fontes vêm do @fontsource\n/* @fontsource, ADR-13 */\nexport {};')).toEqual([]);
    expect(usosProibidosDoFontsource('src/app/layout.tsx', "import '@fontsource/noto-sans'; // ADR-13")).toEqual(['src/app/layout.tsx']);
    expect(usosProibidosDoFontsource('src/app/x.test.ts', "const g = 'src/**/*.ts';\nimport '@fontsource/noto-sans';\n// fim */")).toEqual(['src/app/x.test.ts']);
    expect(usosProibidosDoFontsource('src/app/outra.ts', "{ path: '../../node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2' }")).toEqual([
      'src/app/outra.ts',
    ]);
  });

  it('nenhum arquivo de src/ usa o @fontsource fora dos seis caminhos de fontes.ts', () => {
    expect(arquivosDeSrc.flatMap((a) => usosProibidosDoFontsource(a, ler(a)))).toEqual([]);
  });

  it('o substituto de next/font/local fica só nos testes: nem src/ nem a configuração do Next o citam', () => {
    const app = [...arquivosDeSrc.filter((a) => !/\.test\.tsx?$/.test(a)), ...globSync('next.config.*', { cwd: raiz })];
    expect(app.filter((a) => ler(a).includes('next-font-local'))).toEqual([]);
  });
});

// Faixa de unicode-range ("U+0000-00FF,U+0131,...") como pares de início e fim.
function faixas(unicodeRange: string): [number, number][] {
  return unicodeRange.split(',').map((p) => {
    const [ini, fim] = p.trim().replace(/^U\+/i, '').split('-');
    return [parseInt(ini!, 16), parseInt(fim ?? ini!, 16)];
  });
}
const PT_BR = 'ÁÀÂÃÉÊÍÓÔÕÚÜÇáàâãéêíóôõúüçªº°§“”‘’–—…€';

describe('pacotes das fontes (RNF-06, ADR-13)', () => {
  for (const p of ['noto-sans', 'noto-sans-mono'] as const) {
    it(`@fontsource/${p}: a licença OFL 1.1 viaja no pacote (LICENSE)`, () => {
      const licenca = ler(`node_modules/@fontsource/${p}/LICENSE`);
      expect(licenca).toMatch(/SIL OPEN FONT LICENSE/i);
      expect(licenca).toMatch(/Version 1\.1/i);
    });

    it(`@fontsource/${p}: o subconjunto latin cobre os caracteres do pt-BR, aspas, travessão e reticências`, () => {
      // 400.css declara um @font-face por subconjunto; vale o do arquivo latin-400 que fontes.ts usa.
      const blocos = ler(`node_modules/@fontsource/${p}/400.css`).split('@font-face');
      const latin = blocos.find((b) => b.includes(`/${p}-latin-400-normal.woff2`));
      const faixa = latin ? /unicode-range:\s*([^;]+);/.exec(latin)?.[1] : undefined;
      expect(faixa, `unicode-range do latin-400 em @fontsource/${p}/400.css`).toBeDefined();
      const cobre = (c: string) => faixas(faixa!).some(([ini, fim]) => c.codePointAt(0)! >= ini && c.codePointAt(0)! <= fim);
      expect([...PT_BR].filter((c) => !cobre(c))).toEqual([]);
    });
  }

  it('a leitura do unicode-range reprova caractere de fora (falha se a conta quebrar)', () => {
    const f = faixas('U+0000-00FF,U+0131');
    expect(f).toEqual([
      [0, 0xff],
      [0x131, 0x131],
    ]);
    expect(f.some(([ini, fim]) => 0x3b1 >= ini && 0x3b1 <= fim)).toBe(false);
  });
});

describe('cadeia de suprimento e dependências (CV-05, RNF-10)', () => {
  const pkg = JSON.parse(ler('package.json')) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
  const lock = ler('pnpm-lock.yaml');

  it('lockfile: versão igual à do package.json, só integrity (sem tarball nem git), sem script e sem dependência', () => {
    for (const p of ['@fontsource/noto-sans', '@fontsource/noto-sans-mono']) {
      const v = pkg.devDependencies[p]!;
      expect(lock, `${p} em importers`).toContain(`'${p}':\n        specifier: ${v}\n        version: ${v}\n`);
      expect(lock, `${p} em packages`).toMatch(new RegExp(`\\n  '${p}@${v.replace(/\./g, '\\.')}':\\n    resolution: \\{integrity: sha512-[A-Za-z0-9+/=]+\\}\\n\\n`));
      expect(lock, `${p} em snapshots`).toContain(`\n  '${p}@${v}': {}\n`);
    }
  });

  it('pnpm-workspace.yaml sem o @fontsource e sem allowBuilds novo', () => {
    const ws = ler('pnpm-workspace.yaml');
    expect(ws).not.toMatch(/fontsource/);
    const bloco = /allowBuilds:\n((?: {2}.+\n)+)/.exec(ws)?.[1] ?? '';
    expect(bloco.split('\n').filter(Boolean).map((l) => l.trim().split(':')[0])).toEqual(['cpu-features', 'esbuild', 'protobufjs', 'ssh2', 'unrs-resolver']);
  });

  it('RNF-10: dependências de produção iguais às de 198e97d; de desenvolvimento, só as duas fontes a mais', () => {
    expect(Object.keys(pkg.dependencies).sort()).toEqual([
      '@anthropic-ai/sdk',
      '@sentry/node',
      'better-auth',
      'drizzle-orm',
      'next',
      'pg',
      'pg-boss',
      'pino',
      'react',
      'react-dom',
      'resend',
      'zod',
    ]);
    expect(Object.keys(pkg.devDependencies).sort()).toEqual([
      '@axe-core/playwright',
      '@fontsource/noto-sans',
      '@fontsource/noto-sans-mono',
      '@playwright/test',
      '@tailwindcss/postcss',
      '@testcontainers/postgresql',
      '@types/node',
      '@types/pg',
      '@types/react',
      '@types/react-dom',
      'drizzle-kit',
      'eslint',
      'eslint-config-next',
      'prettier',
      'tailwindcss',
      'testcontainers',
      'tsx',
      'typescript',
      'vitest',
    ]);
  });
});

// CV-20: os testes da T02 também não podem perder asserção nas tarefas seguintes. Piso = linhas com "expect(", contadas
// como no git grep -c, em 10/11/2026. Só sobe.
const linhasComExpect = (fonte: string): number => fonte.split('\n').filter((l) => l.includes('expect(')).length;
const PISO_DA_T02: Readonly<Record<string, number>> = {
  'test/estatico/fontes.test.ts': 15,
  'src/app/layout.test.ts': 4,
  'e2e/fontes.spec.ts': 7,
  'e2e/fontes-qa.spec.ts': 8,
};

describe('CV-20: piso de asserções dos testes da T02', () => {
  it.each(Object.entries(PISO_DA_T02))('%s tem ao menos %i linhas com expect(', (arquivo, piso) => {
    expect(linhasComExpect(ler(arquivo))).toBeGreaterThanOrEqual(piso);
  });

  it('este arquivo também tem piso', () => {
    expect(linhasComExpect(ler('test/estatico/fontes-qa.test.ts'))).toBeGreaterThanOrEqual(30);
  });
});
