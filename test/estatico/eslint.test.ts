// C-18 (`react/no-danger`) e G3.7 (`no-console`): a configuração do ESLint do projeto recusa os dois em `src/`.
// Roda o ESLint de verdade sobre trechos em memória; nenhum arquivo é gravado. Escrito na 06-T01-testes (qa-automacao).
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));

let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint({ cwd: raiz });
});

async function regrasComErro(codigo: string, arquivo: string): Promise<string[]> {
  const [resultado] = await eslint.lintText(codigo, { filePath: `${raiz}${arquivo}` });
  return (resultado?.messages ?? []).filter((m) => m.severity === 2).map((m) => m.ruleId ?? '(sem regra)');
}

describe('eslint.config.mjs', () => {
  it('react/no-danger é erro: dangerouslySetInnerHTML não passa (C-18)', async () => {
    const codigo = [
      'export default function Pagina({ html }: { html: string }) {',
      '  return <div dangerouslySetInnerHTML={{ __html: html }} />;',
      '}',
      '',
    ].join('\n');
    expect(await regrasComErro(codigo, 'src/app/sentinela-no-danger.tsx')).toContain('react/no-danger');
  });

  it('no-console é erro em src/ (G3.7)', async () => {
    const codigo = ["export function f(): void {", "  console.log('SENTINELA-LOG');", '}', ''].join('\n');
    expect(await regrasComErro(codigo, 'src/lib/sentinela-console.ts')).toContain('no-console');
  });

  it('código limpo equivalente não tem erro (o teste não passa por qualquer motivo)', async () => {
    const codigo = [
      'export default function Pagina({ texto }: { texto: string }) {',
      '  return <div>{texto}</div>;',
      '}',
      '',
    ].join('\n');
    expect(await regrasComErro(codigo, 'src/app/sentinela-limpo.tsx')).toEqual([]);
  });

  it('as pastas geradas ficam fora do lint', async () => {
    for (const pasta of ['.next/x.js', 'drizzle/x.ts', 'src/vendor/x.ts', 'playwright-report/x.js', 'test-results/x.js']) {
      expect({ pasta, ignorada: await eslint.isPathIgnored(`${raiz}${pasta}`) }).toEqual({ pasta, ignorada: true });
    }
    expect(await eslint.isPathIgnored(`${raiz}src/lib/relogio.ts`)).toBe(false);
  });
});
