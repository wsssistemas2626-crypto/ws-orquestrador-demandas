// test/estatico/importacoes.ts — ajudante dos testes estáticos (D-T10-01 do DEC-DEM-20261110-0015-v1): o leitor de
// importações que `leituras-da-fila.test.ts` (T07, T09) e `dados-das-etapas.test.ts` (T10) usam. Fica fora de um
// `.test.ts` para que importar não rode outra suíte, e uma só cópia evita que uma correção feita numa deixe a outra
// mais fraca.
import ts from 'typescript';

export type Importacao = { origem: string; nomes: string[]; namespace: boolean; soTipo: boolean };

// A árvore do TypeScript do arquivo (TSX pela extensão), com os pais ligados.
export const fonteTs = (arquivo: string, fonte: string): ts.SourceFile =>
  ts.createSourceFile(arquivo, fonte, ts.ScriptTarget.Latest, true, arquivo.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);

// Importações e reexportações estáticas, `import()` e `require()`, lidas pela árvore do TypeScript (não por regex: a
// importação em várias linhas e o `type` por especificador contam certo).
export function importacoesDe(arquivo: string, fonte: string): Importacao[] {
  const raizDoArquivo = fonteTs(arquivo, fonte);
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
