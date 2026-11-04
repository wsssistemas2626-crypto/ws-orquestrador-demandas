// B-1 do 0006 (DEC-DEM-20261104-0010-v1, C-11, C-25): o 5º (`t`) e o 6º (`extras`, com especificacaoId e
// parecerRiscoId) argumentos de criarPacoteDecisao só vêm do worker (criar.ts). Nenhum arquivo de src/app/ (rota, Server
// Action, página) chama a função com mais de 4 argumentos, com argumento espalhado ou por uma referência que não seja a
// chamada direta (variável, bind, call, apply). Lê pela AST do TypeScript: quebra de linha e vírgula dentro de objeto
// ou de chamada aninhada não contam, e o import renomeado ou por namespace é seguido. Cresce sozinho.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const arquivosDeApp = globSync('src/app/**/*.{ts,tsx}', { cwd: raiz })
  .filter((a) => !/\.test\.tsx?$/.test(a))
  .sort();

const FUNCAO = 'criarPacoteDecisao';
const MAX_ARGUMENTOS = 4;
const doModuloCriar = (especificador: string) => /(^|\/)pacotes-decisao\/criar(\.ts)?$/.test(especificador);

// As chamadas (ou referências) de criarPacoteDecisao que passariam os extras, como `arquivo:linha motivo`.
function chamadasComExtras(fonte: string, arquivo = 'exemplo.ts'): string[] {
  const sf = ts.createSourceFile(arquivo, fonte, ts.ScriptTarget.Latest, true, arquivo.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const nomesLocais = new Set<string>();
  const namespaces = new Set<string>();
  for (const d of sf.statements) {
    if (!ts.isImportDeclaration(d) || !ts.isStringLiteral(d.moduleSpecifier) || !doModuloCriar(d.moduleSpecifier.text)) continue;
    const ligacoes = d.importClause?.namedBindings;
    if (!ligacoes) continue;
    if (ts.isNamespaceImport(ligacoes)) namespaces.add(ligacoes.name.text);
    else for (const e of ligacoes.elements) if ((e.propertyName ?? e.name).text === FUNCAO) nomesLocais.add(e.name.text);
  }
  const acusados: string[] = [];
  const linha = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const ehReferencia = (n: ts.Node): boolean =>
    (ts.isIdentifier(n) && nomesLocais.has(n.text)) ||
    (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && namespaces.has(n.expression.text) && n.name.text === FUNCAO) ||
    (ts.isElementAccessExpression(n) && ts.isIdentifier(n.expression) && namespaces.has(n.expression.text));
  const visitar = (n: ts.Node): void => {
    if (ts.isImportDeclaration(n)) return;
    if (ts.isCallExpression(n) && ehReferencia(n.expression)) {
      if (n.arguments.length > MAX_ARGUMENTOS) acusados.push(`${arquivo}:${linha(n)} ${n.arguments.length} argumentos`);
      if (n.arguments.some(ts.isSpreadElement)) acusados.push(`${arquivo}:${linha(n)} argumento espalhado`);
      // A função chamada já foi conferida; seguem só os argumentos.
      n.arguments.forEach(visitar);
      return;
    }
    // O nome usado fora da chamada direta (const f = criar; criar.call(...); [criar]) escapa da contagem: acusado.
    if (ehReferencia(n) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)) {
      acusados.push(`${arquivo}:${linha(n)} referência fora da chamada direta`);
      return;
    }
    ts.forEachChild(n, visitar);
  };
  visitar(sf);
  return acusados;
}

describe('B-1 do 0006: a leitura das chamadas pela AST', () => {
  const IMPORT = "import { criarPacoteDecisao } from '../../../../../modules/pacotes-decisao/criar';\n";

  it('acusa 5 ou 6 argumentos, numa linha e em várias', () => {
    expect(chamadasComExtras(`${IMPORT}await criarPacoteDecisao(deps, ator, id, corpo, undefined, { especificacaoId: corpo.especificacaoId });`)).toEqual([
      'exemplo.ts:2 6 argumentos',
    ]);
    const varias = `${IMPORT}await criarPacoteDecisao(
      deps,
      ator,
      id,
      corpo,
      t,
    );`;
    expect(chamadasComExtras(varias)).toEqual(['exemplo.ts:2 5 argumentos']);
  });

  it('acusa import renomeado, namespace, argumento espalhado e referência fora da chamada', () => {
    expect(
      chamadasComExtras("import { criarPacoteDecisao as criar } from '@/modules/pacotes-decisao/criar';\ncriar(deps, ator, id, corpo, undefined, extras);"),
    ).toEqual(['exemplo.ts:2 6 argumentos']);
    expect(chamadasComExtras("import * as m from '../modules/pacotes-decisao/criar';\nm.criarPacoteDecisao(deps, ator, id, corpo, t);")).toEqual([
      'exemplo.ts:2 5 argumentos',
    ]);
    expect(chamadasComExtras(`${IMPORT}criarPacoteDecisao(...args);`)).toEqual(['exemplo.ts:2 argumento espalhado']);
    expect(chamadasComExtras(`${IMPORT}const f = criarPacoteDecisao;\nf(deps, ator, id, corpo, t, extras);`)).toEqual([
      'exemplo.ts:2 referência fora da chamada direta',
    ]);
    expect(chamadasComExtras(`${IMPORT}criarPacoteDecisao.call(null, deps, ator, id, corpo, t, extras);`)).toEqual([
      'exemplo.ts:2 referência fora da chamada direta',
    ]);
    expect(chamadasComExtras("import * as m from '../modules/pacotes-decisao/criar';\nm['criarPacoteDecisao'](deps, ator, id, corpo, t);")).toEqual([
      'exemplo.ts:2 5 argumentos',
    ]);
  });

  it('não acusa 4 argumentos com objeto, chamada aninhada e quebra de linha no 4º', () => {
    const fonte = `${IMPORT}const v = await criarPacoteDecisao(deps, ator, params.id, {
      ...corpo,
      opcaoA: { descricao: a, vantagens: b },
      resumo: montar(x, y, z),
    });`;
    expect(chamadasComExtras(fonte)).toEqual([]);
  });

  it('não acusa função de mesmo nome que não vem do módulo criar', () => {
    expect(chamadasComExtras("import { criarPacoteDecisao } from './outro';\ncriarPacoteDecisao(a, b, c, d, e, f);")).toEqual([]);
  });
});

describe('B-1 do 0006: nenhum arquivo de src/app/ passa extras a criarPacoteDecisao', () => {
  it('a varredura enxerga os dois chamadores de hoje (falha se o glob ou a leitura quebrarem)', () => {
    const chamadores = arquivosDeApp.filter((a) => readFileSync(`${raiz}${a}`, 'utf8').includes(`${FUNCAO}(`));
    expect(chamadores).toEqual(
      expect.arrayContaining(['src/app/api/demandas/[id]/pacotes-decisao/route.ts', 'src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts']),
    );
  });

  it('nenhuma chamada acusada', () => {
    expect(arquivosDeApp.flatMap((a) => chamadasComExtras(readFileSync(`${raiz}${a}`, 'utf8'), a))).toEqual([]);
  });
});
