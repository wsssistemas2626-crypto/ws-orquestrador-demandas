// test/estatico/leituras-da-fila.test.ts — T07 do DEC-DEM-20261110-0015-v1: CV-06 (parte estática) e CA-15.2.
// 1) `src/modules/demandas/resumo-da-fila.ts` só lê: usa `select` e não tem chamada de escrita nem de SQL livre
//    (insert, update, delete, execute, transaction, raw), nem traz o `sql` do drizzle-orm, por nome, por apelido ou por
//    importação de namespace (que daria o `sql` com outro nome).
// 2) Quem importa o módulo em código que roda (src/ e scripts/, fora os *.test.ts e *.test.tsx) cabe em
//    IMPORTADORES_PERMITIDOS (D-08 do plano). `import type` não conta: some na compilação e não leva a leitura a lugar
//    nenhum (a T08 lê só os tipos em dados-da-fila.ts). A T09 acrescenta as regras da cadeia até a página.
// Cada regra tem um caso plantado que a faz reprovar (padrão técnico, seção 7).
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (arquivo: string) => readFileSync(`${raiz}${arquivo}`, 'utf8');

const MODULO = 'src/modules/demandas/resumo-da-fila.ts';
export const IMPORTADORES_PERMITIDOS: readonly string[] = ['src/app/(painel)/demandas/leituras-da-fila.ts'];

type Importacao = { origem: string; nomes: string[]; namespace: boolean; soTipo: boolean };

// Importações e reexportações estáticas, `import()` e `require()`, lidas pela árvore do TypeScript (não por regex: a
// importação em várias linhas e o `type` por especificador contam certo).
export function importacoesDe(arquivo: string, fonte: string): Importacao[] {
  const tipo = arquivo.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const raizDoArquivo = ts.createSourceFile(arquivo, fonte, ts.ScriptTarget.Latest, false, tipo);
  const r: Importacao[] = [];
  const visitar = (no: ts.Node): void => {
    if (ts.isImportDeclaration(no) && ts.isStringLiteral(no.moduleSpecifier)) {
      const clausula = no.importClause;
      const ligacoes = clausula?.namedBindings;
      const nomeados = ligacoes && ts.isNamedImports(ligacoes) ? [...ligacoes.elements] : [];
      const todosTipo = !clausula?.name && nomeados.length > 0 && nomeados.every((x) => x.isTypeOnly);
      r.push({
        origem: no.moduleSpecifier.text,
        nomes: nomeados.filter((x) => !x.isTypeOnly).map((x) => (x.propertyName ?? x.name).text),
        namespace: !!ligacoes && ts.isNamespaceImport(ligacoes),
        soTipo: !!clausula?.isTypeOnly || todosTipo,
      });
    } else if (ts.isExportDeclaration(no) && no.moduleSpecifier && ts.isStringLiteral(no.moduleSpecifier)) {
      const nomeados = no.exportClause && ts.isNamedExports(no.exportClause) ? [...no.exportClause.elements] : [];
      r.push({
        origem: no.moduleSpecifier.text,
        nomes: nomeados.filter((x) => !x.isTypeOnly).map((x) => (x.propertyName ?? x.name).text),
        namespace: !no.exportClause || ts.isNamespaceExport(no.exportClause),
        soTipo: no.isTypeOnly || (nomeados.length > 0 && nomeados.every((x) => x.isTypeOnly)),
      });
    } else if (
      ts.isCallExpression(no) &&
      (no.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(no.expression) && no.expression.text === 'require'))
    ) {
      const [arg] = no.arguments;
      // Caminho que não é literal não dá para conferir: entra como importação de tudo, com a origem crua.
      r.push({ origem: arg && ts.isStringLiteralLike(arg) ? arg.text : (arg?.getText(raizDoArquivo) ?? ''), nomes: [], namespace: true, soTipo: false });
    }
    ts.forEachChild(no, visitar);
  };
  visitar(raizDoArquivo);
  return r;
}

const ESCRITAS: ReadonlyArray<[string, RegExp]> = [
  ['insert(', /\binsert\s*\(/],
  ['update(', /\bupdate\s*\(/],
  ['delete(', /\bdelete\s*\(/],
  ['execute(', /\bexecute\s*\(/],
  ['transaction(', /\btransaction\s*\(/],
  ['.raw(', /\.raw\s*\(/],
];

// O que reprova no módulo de leitura; lista vazia = só leitura.
export function achadosDeEscrita(fonte: string): string[] {
  const achados = ESCRITAS.flatMap(([nome, re]) => (re.test(fonte) ? [nome] : []));
  if (!/\.select\s*\(/.test(fonte)) achados.push('sem select(');
  for (const i of importacoesDe(MODULO, fonte)) {
    if (i.origem !== 'drizzle-orm' && !i.origem.startsWith('drizzle-orm/')) continue;
    if (i.namespace) achados.push(`namespace de ${i.origem}`);
    if (i.nomes.includes('sql')) achados.push(`sql de ${i.origem}`);
  }
  return achados;
}

// A origem aponta para o módulo (relativa, pelo apelido @/ ou com extensão), e não para um nome parecido.
const apontaParaOModulo = (origem: string): boolean => /(^|\/)resumo-da-fila(\.[cm]?[jt]sx?)?$/.test(origem);

// Arquivos que importam o módulo por valor (o `import type` fica de fora).
export function importadoresDe(arquivos: ReadonlyArray<readonly [string, string]>): string[] {
  return arquivos.filter(([nome, fonte]) => importacoesDe(nome, fonte).some((i) => !i.soTipo && apontaParaOModulo(i.origem))).map(([nome]) => nome);
}

const codigoQueRoda = globSync('{src,scripts}/**/*.{ts,tsx}', { cwd: raiz })
  .filter((a) => !/\.test\.tsx?$/.test(a) && a !== MODULO)
  .sort();

describe('CV-06: resumo-da-fila.ts só lê', () => {
  it('o módulo existe e não tem achado', () => {
    expect(achadosDeEscrita(ler(MODULO))).toEqual([]);
  });

  it('reprova cada escrita plantada', () => {
    const base = "import { eq } from 'drizzle-orm';\nexport const f = (db) => db.select().from(t);\n";
    expect(achadosDeEscrita(`${base}db.insert(demanda).values({});`)).toEqual(['insert(']);
    expect(achadosDeEscrita(`${base}db.update(demanda).set({});`)).toEqual(['update(']);
    expect(achadosDeEscrita(`${base}db.delete(demanda);`)).toEqual(['delete(']);
    expect(achadosDeEscrita(`${base}db.execute(consulta);`)).toEqual(['execute(']);
    expect(achadosDeEscrita(`${base}db.transaction(async (tx) => tx);`)).toEqual(['transaction(']);
    expect(achadosDeEscrita(`${base}const x = sql.raw(texto);`)).toEqual(['.raw(']);
  });

  it('reprova o sql do drizzle-orm por nome, por apelido, em várias linhas e por namespace', () => {
    const select = '\nexport const f = (db) => db.select().from(t);\n';
    expect(achadosDeEscrita(`import { and, sql } from 'drizzle-orm';${select}`)).toEqual(['sql de drizzle-orm']);
    expect(achadosDeEscrita(`import { sql as s } from 'drizzle-orm';${select}`)).toEqual(['sql de drizzle-orm']);
    expect(achadosDeEscrita(`import {\n  eq,\n  sql,\n} from 'drizzle-orm';${select}`)).toEqual(['sql de drizzle-orm']);
    expect(achadosDeEscrita(`import { sql } from 'drizzle-orm/sql';${select}`)).toEqual(['sql de drizzle-orm/sql']);
    expect(achadosDeEscrita(`import * as d from 'drizzle-orm';${select}`)).toEqual(['namespace de drizzle-orm']);
  });

  it('reprova módulo sem select e aceita o que só lê', () => {
    expect(achadosDeEscrita("import { eq } from 'drizzle-orm';\nexport const n = 1;\n")).toEqual(['sem select(']);
    expect(achadosDeEscrita("import { and, count, eq, inArray, type SQL } from 'drizzle-orm';\nexport const f = (db) => db.select({ n: count() }).from(t);\n")).toEqual([]);
  });
});

describe('CV-06 e CA-15.2: quem importa resumo-da-fila', () => {
  it('a varredura enxerga o código que roda e deixa os testes de fora (falha se o glob quebrar)', () => {
    expect(codigoQueRoda).toEqual(expect.arrayContaining(['src/app/(painel)/demandas/page.tsx', 'src/modules/demandas/consultas.ts', 'scripts/seed-ficticio.ts']));
    expect(codigoQueRoda.filter((a) => a.includes('.test.'))).toEqual([]);
    expect(codigoQueRoda).not.toContain(MODULO);
  });

  it('só os importadores permitidos importam o módulo por valor', () => {
    const importadores = importadoresDe(codigoQueRoda.map((a) => [a, ler(a)] as const));
    expect(importadores.filter((a) => !IMPORTADORES_PERMITIDOS.includes(a))).toEqual([]);
  });

  it('acha cada forma de importação plantada, e não conta tipo nem nome parecido', () => {
    const plantados = [
      ['src/app/a.tsx', "import { contarDemandasPorStatus } from '@/modules/demandas/resumo-da-fila';"],
      ['src/app/b.ts', "import {\n  etapasDasDemandas,\n} from '../../modules/demandas/resumo-da-fila';"],
      ['src/app/c.ts', "export { contarDemandasPorStatus } from '../modules/demandas/resumo-da-fila';"],
      ['src/app/d.ts', "export * from './resumo-da-fila';"],
      ['src/app/e.ts', "const m = await import('../modules/demandas/resumo-da-fila.ts');"],
      ['src/app/f.ts', "import { type EtapasNaFila, etapasDasDemandas } from './resumo-da-fila';"],
      ['src/app/g.ts', "import './resumo-da-fila';"],
      ['src/app/h.ts', "const m = require('./resumo-da-fila.js');"],
      ['src/app/tipo.ts', "import type { ContagemPorStatus } from '../modules/demandas/resumo-da-fila';"],
      ['src/app/tipo2.ts', "import { type ContagemPorStatus, type EtapasNaFila } from '../modules/demandas/resumo-da-fila';"],
      ['src/app/tipo3.ts', "export type { EtapasNaFila } from '../modules/demandas/resumo-da-fila';"],
      ['src/app/outro.ts', "import { x } from './resumo-da-fila-antigo';\nimport { y } from './resumo-da-fila/outro';"],
    ] as const;
    expect(importadoresDe(plantados)).toEqual(['src/app/a.tsx', 'src/app/b.ts', 'src/app/c.ts', 'src/app/d.ts', 'src/app/e.ts', 'src/app/f.ts', 'src/app/g.ts', 'src/app/h.ts']);
  });
});
