// test/estatico/fontes.test.ts — RNF-06, CV-05 e ADR-13 (DEC-DEM-20261110-0015-v1, T02): seis woff2 do @fontsource,
// até 300 KB, licença OFL, sem script de instalação, versão exata e integrity sha512 no lockfile.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');
const PACOTES = ['@fontsource/noto-sans', '@fontsource/noto-sans-mono'] as const;
const ARQUIVOS = [
  'node_modules/@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2',
  'node_modules/@fontsource/noto-sans/files/noto-sans-latin-600-normal.woff2',
  'node_modules/@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff2',
  'node_modules/@fontsource/noto-sans/files/noto-sans-latin-800-normal.woff2',
  'node_modules/@fontsource/noto-sans-mono/files/noto-sans-mono-latin-400-normal.woff2',
  'node_modules/@fontsource/noto-sans-mono/files/noto-sans-mono-latin-600-normal.woff2',
] as const;

describe('fontes (ADR-13, RNF-06, CV-05)', () => {
  it('os seis arquivos existem, têm a assinatura wOF2 e somam até 300 KB', () => {
    let soma = 0;
    for (const a of ARQUIVOS) {
      expect(existsSync(`${raiz}${a}`), a).toBe(true);
      expect(readFileSync(`${raiz}${a}`).subarray(0, 4).toString('latin1'), a).toBe('wOF2');
      soma += statSync(`${raiz}${a}`).size;
    }
    expect(soma).toBeLessThanOrEqual(300 * 1024);
  });

  it('fontes.ts aponta exatamente os seis caminhos, só .woff2, com display swap e as duas variáveis', () => {
    const f = ler('src/app/fontes.ts');
    const caminhos = [...f.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]!.replace(/^(\.\.\/)+/, ''));
    expect(caminhos.sort()).toEqual([...ARQUIVOS].sort());
    expect(f).toMatch(/from 'next\/font\/local'/);
    expect(f.match(/display:\s*'swap'/g)).toHaveLength(2);
    expect(f).toContain("variable: '--font-noto-sans'");
    expect(f).toContain("variable: '--font-noto-sans-mono'");
  });

  it('os dois pacotes: devDependencies com versão exata, licença OFL-1.1, sem script de instalação', () => {
    const pkg = JSON.parse(ler('package.json')) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    for (const p of PACOTES) {
      expect(pkg.dependencies[p], p).toBeUndefined();
      expect(pkg.devDependencies[p], p).toMatch(/^\d+\.\d+\.\d+$/);
      const dele = JSON.parse(ler(`node_modules/${p}/package.json`)) as { name: string; license: string; scripts?: Record<string, string> };
      expect(dele.name).toBe(p);
      expect(dele.license).toBe('OFL-1.1');
      for (const s of ['preinstall', 'install', 'postinstall']) expect(dele.scripts?.[s], `${p} ${s}`).toBeUndefined();
    }
  });

  it('o lockfile tem integrity sha512 dos dois pacotes', () => {
    const lock = ler('pnpm-lock.yaml');
    for (const p of PACOTES) expect(lock).toMatch(new RegExp(`'?${p.replace('/', '\\/')}@[\\d.]+'?:\\s*\\n\\s*resolution:\\s*\\{integrity:\\s*sha512-`));
  });

  it('nenhum arquivo de src/ importa código dos pacotes (só o caminho do woff2 em fontes.ts)', () => {
    for (const a of ['src/app/layout.tsx', 'src/app/fontes.ts', 'src/app/globals.css']) expect(ler(a)).not.toMatch(/(?:import|from|@import)\s*['"]@fontsource/);
  });
});
