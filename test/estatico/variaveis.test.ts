// C-27: `ANTHROPIC_API_KEY` e `RESEND_API_KEY` só no worker e nas fábricas que ele usa; `DATABASE_URL_MIGRATOR` só em
// scripts/migrate.ts e no start:hml. O nome da variável em qualquer outro arquivo de src/ ou scripts/ quebra o teste,
// inclusive em comentário: quem precisa citar a variável fora desses arquivos cita a regra, não o nome.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));

const PERMITIDOS: Record<string, RegExp> = {
  ANTHROPIC_API_KEY: /^src\/(worker\/|modules\/agentes\/provedor\.ts$|lib\/env-worker\.ts$)/,
  RESEND_API_KEY: /^src\/(worker\/|modules\/avisos\/enviador\.ts$|lib\/env-worker\.ts$)/,
  DATABASE_URL_MIGRATOR: /^scripts\/(migrate|start-hml)\.ts$/,
};

const arquivos = globSync('{src,scripts}/**/*.{ts,tsx}', { cwd: raiz })
  .filter((x) => !x.endsWith('.test.ts'))
  .sort();

it('a varredura enxerga src/ e scripts/ (falha se o glob quebrar)', () => {
  expect(arquivos).toEqual(expect.arrayContaining(['scripts/migrate.ts', 'src/lib/env.ts', 'src/lib/deps.ts']));
});

it('variáveis de segredo só nos arquivos permitidos', () => {
  const foraDoLugar: string[] = [];
  for (const a of arquivos) {
    const texto = readFileSync(`${raiz}${a}`, 'utf8');
    for (const [nome, onde] of Object.entries(PERMITIDOS)) if (texto.includes(nome) && !onde.test(a)) foraDoLugar.push(`${nome} em ${a}`);
  }
  expect(foraDoLugar).toEqual([]);
});

it('a regra recusa os lugares errados (o teste não passa por qualquer motivo)', () => {
  expect('src/lib/deps.ts').not.toMatch(PERMITIDOS.ANTHROPIC_API_KEY!);
  expect('src/modules/agentes/provedor.ts.bak').not.toMatch(PERMITIDOS.ANTHROPIC_API_KEY!);
  expect('src/app/api/saude/route.ts').not.toMatch(PERMITIDOS.RESEND_API_KEY!);
  expect('src/lib/env.ts').not.toMatch(PERMITIDOS.DATABASE_URL_MIGRATOR!);
  expect('src/worker/index.ts').toMatch(PERMITIDOS.ANTHROPIC_API_KEY!);
  expect('scripts/start-hml.ts').toMatch(PERMITIDOS.DATABASE_URL_MIGRATOR!);
});
