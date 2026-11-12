// 04-regressao (qa-automacao) do DEC-DEM-20261112-0019-v1, B-1 da revisão da 0.3.0 (IN-04): o token de integração do
// e2e local não pode parar num trace. O playwright.config.ts grava trace com `retain-on-failure`, e um contexto de API
// com `authorization: Bearer <token>` em `extraHTTPHeaders` levaria o cabeçalho para o `trace.zip` de um teste que
// falha. A regra:
//   - todo `e2e/*.spec.ts` cujo código monta credencial no cabeçalho (`authorization`, `Bearer` ou `extraHTTPHeaders`)
//     declara `test.use({ trace: 'off' })` no nível do arquivo (coluna 0, fora de `describe`), e nenhum outro `trace:`
//     no código liga o trace de novo;
//   - fora dos `*.spec.ts`, nenhum arquivo de e2e/ monta essa credencial: o ajudante não tem `test.use` próprio, e a
//     spec que o chamasse escaparia da varredura.
// A regra reprova a forma da 0.3.0 (e2e/integracoes.spec.ts sem o `test.use`) e deixa passar a do irmão
// e2e/integracoes-qa.spec.ts. Teste só de leitura de arquivo: não depende de ordem nem de relógio.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (arquivo: string) => readFileSync(`${raiz}${arquivo}`, 'utf8');
// O código sem os comentários de bloco e de linha inteira: o comentário pode citar o que o código não faz.
const codigo = (fonte: string) => fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const CREDENCIAL = /\bauthorization\b|\bbearer\b|\bextraHTTPHeaders\b/i;
const TRACE_DESLIGADO = /^test\.use\(\{ trace: 'off' \}\);$/m;
const QUALQUER_TRACE = /\btrace\s*:\s*([^,}\s]+)/g;

function problemasDoTrace(arquivo: string, fonte: string): string[] {
  const c = codigo(fonte);
  if (!CREDENCIAL.test(c)) return [];
  if (!arquivo.endsWith('.spec.ts')) return [`${arquivo}: credencial no cabeçalho fora de um *.spec.ts`];
  const problemas: string[] = [];
  if (!TRACE_DESLIGADO.test(c)) problemas.push(`${arquivo}: sem test.use({ trace: 'off' }) no nível do arquivo`);
  for (const [, valor] of c.matchAll(QUALQUER_TRACE)) if (valor !== "'off'") problemas.push(`${arquivo}: trace ${valor}`);
  return problemas;
}

const arquivos = globSync('e2e/**/*.ts', { cwd: raiz }).sort();
const comCredencial = arquivos.filter((a) => CREDENCIAL.test(codigo(ler(a))));

// Trecho de e2e/integracoes.spec.ts na 0.3.0 (main d49de53, linhas 17 a 30, com o corpo encurtado), sem o `test.use`.
const SPEC_DA_0_3_0 = [
  'const tokens = tokensDoE2e();',
  '',
  'function exigirTokens(): TokensDoE2e {',
  '  test.skip(HOMOLOGACAO, MOTIVO_SEM_TOKENS);',
  '  return tokens!;',
  '}',
  '',
  'const contextoDe = (baseURL: string | undefined, token: string) =>',
  "  novoContexto.newContext({ baseURL, extraHTTPHeaders: { authorization: `Bearer ${token}`, accept: 'application/json' } });",
  '',
  "test('CA-09.1: o Awave cria e lê a própria demanda, sem Origin', async ({ baseURL }) => {});",
].join('\n');

describe('B-1 da 0019: spec com Bearer no cabeçalho não grava trace', () => {
  it('a varredura enxerga e2e/ e acha as duas specs das integrações (falha se o glob ou a busca quebrar)', () => {
    expect(arquivos).toEqual(expect.arrayContaining(['e2e/apoio.ts', 'e2e/integracoes.spec.ts', 'e2e/integracoes-qa.spec.ts']));
    expect(comCredencial).toEqual(expect.arrayContaining(['e2e/integracoes.spec.ts', 'e2e/integracoes-qa.spec.ts']));
  });

  it("toda spec que monta credencial no cabeçalho declara test.use({ trace: 'off' }) e não religa o trace", () => {
    expect(comCredencial.flatMap((a) => problemasDoTrace(a, ler(a)))).toEqual([]);
  });

  it("e2e/integracoes.spec.ts tem o test.use({ trace: 'off' }) uma vez, no nível do arquivo", () => {
    const c = codigo(ler('e2e/integracoes.spec.ts'));
    expect(c.match(/^test\.use\(\{ trace: 'off' \}\);$/gm)).toEqual(["test.use({ trace: 'off' });"]);
  });

  it('a regra reprova a forma da 0.3.0, o trace religado e o ajudante com credencial', () => {
    expect(problemasDoTrace('e2e/integracoes.spec.ts', SPEC_DA_0_3_0)).toEqual([
      "e2e/integracoes.spec.ts: sem test.use({ trace: 'off' }) no nível do arquivo",
    ]);
    // Dentro de describe (recuado) não vale para o arquivo inteiro.
    expect(problemasDoTrace('e2e/x.spec.ts', `test.describe('d', () => {\n  test.use({ trace: 'off' });\n});\n${SPEC_DA_0_3_0}`)).toEqual([
      "e2e/x.spec.ts: sem test.use({ trace: 'off' }) no nível do arquivo",
    ]);
    // Só no comentário também não vale.
    expect(problemasDoTrace('e2e/x.spec.ts', `// test.use({ trace: 'off' });\n${SPEC_DA_0_3_0}`)).toEqual([
      "e2e/x.spec.ts: sem test.use({ trace: 'off' }) no nível do arquivo",
    ]);
    expect(problemasDoTrace('e2e/x.spec.ts', `test.use({ trace: 'off' });\n${SPEC_DA_0_3_0}\ntest.use({ trace: 'retain-on-failure' });`)).toEqual([
      "e2e/x.spec.ts: trace 'retain-on-failure'",
    ]);
    expect(problemasDoTrace('e2e/x.spec.ts', `test.use({ trace: 'off' });\ntest.describe('d', () => {\n  test.use({ trace: 'on' });\n});\n${SPEC_DA_0_3_0}`)).toEqual([
      "e2e/x.spec.ts: trace 'on'",
    ]);
    expect(problemasDoTrace('e2e/ajudante.ts', SPEC_DA_0_3_0)).toEqual(['e2e/ajudante.ts: credencial no cabeçalho fora de um *.spec.ts']);
    // Caixa diferente também é credencial.
    expect(problemasDoTrace('e2e/x.spec.ts', "const h = { Authorization: 'x' };")).toEqual(["e2e/x.spec.ts: sem test.use({ trace: 'off' }) no nível do arquivo"]);
  });

  it('a regra deixa passar a forma do irmão e a spec sem credencial', () => {
    expect(problemasDoTrace('e2e/integracoes-qa.spec.ts', ler('e2e/integracoes-qa.spec.ts'))).toEqual([]);
    expect(problemasDoTrace('e2e/x.spec.ts', `test.use({ trace: 'off' });\n${SPEC_DA_0_3_0}`)).toEqual([]);
    expect(problemasDoTrace('e2e/fila.spec.ts', "test('fila', async ({ page }) => { await page.goto('/'); });")).toEqual([]);
  });
});
