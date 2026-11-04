// B-1 do 0009 (DEC-DEM-20261104-0010-v1, C-21): reduzirErro só deixa sair a classe terminada em Error ou Exception, ou
// uma das CLASSES_DO_PROJETO. Toda string que o código do projeto põe em `name` de um erro tem de passar em classeAceita;
// senão o log e o Sentry mostram só 'Error', calados. Classe nova fora do sufixo entra na lista; este teste avisa.
// Lê pela AST do TypeScript: `this.name = '...'`, `name = '...'` (campo da classe, com ou sem override ou readonly) e
// `Object.defineProperty(X.prototype, 'name', { value: '...' })`. Cresce sozinho: todo arquivo novo de src/ entra.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { classeAceita } from '../../src/lib/reduzir-erro';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const arquivos = globSync('src/**/*.{ts,tsx}', { cwd: raiz })
  .filter((a) => !/\.test\.tsx?$/.test(a))
  .sort();

const literal = (n: ts.Node | undefined): string | null => (n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null);

const nomeDaPropriedade = (n: ts.PropertyName): string | null => (ts.isIdentifier(n) || ts.isStringLiteral(n) ? n.text : null);

// Os nomes de classe de erro que a fonte atribui a `name`.
function nomesDeClasse(fonte: string, arquivo = 'exemplo.ts'): string[] {
  const sf = ts.createSourceFile(arquivo, fonte, ts.ScriptTarget.Latest, true, arquivo.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const achados: string[] = [];
  const visitar = (n: ts.Node): void => {
    // this.name = '...'
    if (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(n.left) &&
      n.left.expression.kind === ts.SyntaxKind.ThisKeyword &&
      n.left.name.text === 'name'
    ) {
      const v = literal(n.right);
      if (v !== null) achados.push(v);
    }
    // class X extends Error { override name = '...' }
    if (ts.isPropertyDeclaration(n) && nomeDaPropriedade(n.name) === 'name') {
      const v = literal(n.initializer);
      if (v !== null) achados.push(v);
    }
    // Object.defineProperty(X.prototype, 'name', { value: '...' })
    if (
      ts.isCallExpression(n) &&
      ts.isPropertyAccessExpression(n.expression) &&
      ts.isIdentifier(n.expression.expression) &&
      n.expression.expression.text === 'Object' &&
      n.expression.name.text === 'defineProperty' &&
      literal(n.arguments[1]) === 'name'
    ) {
      const descritor = n.arguments[2];
      if (descritor && ts.isObjectLiteralExpression(descritor)) {
        for (const p of descritor.properties) {
          if (ts.isPropertyAssignment(p) && nomeDaPropriedade(p.name) === 'value') {
            const v = literal(p.initializer);
            if (v !== null) achados.push(v);
          }
        }
      }
    }
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
  return achados;
}

describe('B-1 do 0009: a leitura dos nomes de classe pela AST', () => {
  it('acha this.name, campo name (override, readonly) e defineProperty no protótipo', () => {
    const fonte = `
      class A extends Error { constructor() { super('x'); this.name = 'ClasseA'; } }
      class B extends Error { override name = 'ClasseB'; }
      class C extends Error { readonly name = \`ClasseC\`; }
      class D extends Error {}
      Object.defineProperty(D.prototype, 'name', { value: 'ClasseD', enumerable: false });
    `;
    expect(nomesDeClasse(fonte)).toEqual(['ClasseA', 'ClasseB', 'ClasseC', 'ClasseD']);
  });

  it('não confunde com outra atribuição, variável ou name que não é texto fixo', () => {
    const fonte = `
      const name = 'variavel';
      usuario.name = 'outro objeto';
      class E extends Error { constructor(n: string) { super('x'); this.name = n; } }
      Object.defineProperty(E.prototype, 'message', { value: 'mensagem' });
    `;
    expect(nomesDeClasse(fonte)).toEqual([]);
  });
});

describe('B-1 do 0009: toda classe de erro do projeto passa em classeAceita', () => {
  const porArquivo = arquivos.map((a) => ({ arquivo: a, nomes: nomesDeClasse(readFileSync(`${raiz}${a}`, 'utf8'), a) }));
  const todos = porArquivo.flatMap((x) => x.nomes);

  it('a varredura enxerga as classes conhecidas (falha se o glob ou a leitura quebrarem)', () => {
    expect(todos).toEqual(expect.arrayContaining(['ErroEnvioEmail', 'ErroDominio', 'ErroLeituraSessao', 'TempoEsgotado', 'AvisoNaoEnviado']));
  });

  it('nenhum nome atribuído fica fora da regra', () => {
    const fora = porArquivo.flatMap(({ arquivo, nomes }) => nomes.filter((n) => !classeAceita(n)).map((n) => `${arquivo}: ${n}`));
    expect(fora).toEqual([]);
  });
});
