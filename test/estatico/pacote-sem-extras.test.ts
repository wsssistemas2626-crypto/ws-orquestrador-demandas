// B-1 do 0006 (DEC-DEM-20261104-0010-v1, C-11, C-25): o 5º (`t`) e o 6º (`extras`, com especificacaoId e
// parecerRiscoId) argumentos de criarPacoteDecisao só vêm do worker (criar.ts). Nenhum arquivo de src/app/ (rota, Server
// Action, página) chama a função com mais de 4 argumentos, com argumento espalhado ou por uma referência que não seja a
// chamada direta (variável, bind, call, apply). Lê pela AST do TypeScript: quebra de linha e vírgula dentro de objeto
// ou de chamada aninhada não contam, e o import renomeado ou por namespace é seguido. Cresce sozinho.
// B-3 do 0010 (DEC-DEM-20261104-0011-v1): a rota passou a chamar criarPacoteDecisaoComNomes, com 4 argumentos e sem `t`
// nem `extras`. A varredura cobre as duas funções do módulo criar, com o mesmo máximo e as mesmas regras de referência.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const arquivosDeApp = globSync('src/app/**/*.{ts,tsx}', { cwd: raiz })
  .filter((a) => !/\.test\.tsx?$/.test(a))
  .sort();

const FUNCOES: ReadonlySet<string> = new Set(['criarPacoteDecisao', 'criarPacoteDecisaoComNomes']);
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
    else for (const e of ligacoes.elements) if (FUNCOES.has((e.propertyName ?? e.name).text)) nomesLocais.add(e.name.text);
  }
  const acusados: string[] = [];
  const linha = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const ehReferencia = (n: ts.Node): boolean =>
    (ts.isIdentifier(n) && nomesLocais.has(n.text)) ||
    (ts.isPropertyAccessExpression(n) && ts.isIdentifier(n.expression) && namespaces.has(n.expression.text) && FUNCOES.has(n.name.text)) ||
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
    expect(chamadasComExtras("import { criarPacoteDecisaoComNomes } from './outro';\ncriarPacoteDecisaoComNomes(a, b, c, d, e, f);")).toEqual([]);
  });

  // B-3 do 0010: as mesmas regras para criarPacoteDecisaoComNomes.
  it('acusa criarPacoteDecisaoComNomes com 5 argumentos, renomeada, por namespace, espalhada e fora da chamada', () => {
    const IMPORT_NOVA = "import { criarPacoteDecisaoComNomes } from '../../../../../modules/pacotes-decisao/criar';\n";
    expect(chamadasComExtras(`${IMPORT_NOVA}await criarPacoteDecisaoComNomes(deps, ator, id, corpo, t);`)).toEqual(['exemplo.ts:2 5 argumentos']);
    expect(chamadasComExtras("import { criarPacoteDecisaoComNomes as c } from '@/modules/pacotes-decisao/criar';\nc(deps, ator, id, corpo, t, extras);")).toEqual([
      'exemplo.ts:2 6 argumentos',
    ]);
    expect(chamadasComExtras("import * as m from '../modules/pacotes-decisao/criar';\nm.criarPacoteDecisaoComNomes(deps, ator, id, corpo, t);")).toEqual([
      'exemplo.ts:2 5 argumentos',
    ]);
    expect(chamadasComExtras(`${IMPORT_NOVA}criarPacoteDecisaoComNomes(...args);`)).toEqual(['exemplo.ts:2 argumento espalhado']);
    expect(chamadasComExtras(`${IMPORT_NOVA}const f = criarPacoteDecisaoComNomes;\nf(deps, ator, id, corpo, t, extras);`)).toEqual([
      'exemplo.ts:2 referência fora da chamada direta',
    ]);
    expect(chamadasComExtras(`${IMPORT_NOVA}criarPacoteDecisaoComNomes.apply(null, [deps, ator, id, corpo, t, extras]);`)).toEqual([
      'exemplo.ts:2 referência fora da chamada direta',
    ]);
    expect(chamadasComExtras(`${IMPORT_NOVA}const { vista, nomes } = await criarPacoteDecisaoComNomes(deps, ator, params.id, corpo);`)).toEqual([]);
  });
});

describe('B-1 do 0006: nenhum arquivo de src/app/ passa extras a criarPacoteDecisao', () => {
  // B-3 do 0010: a rota chama criarPacoteDecisaoComNomes; a Server Action segue com criarPacoteDecisao.
  it('a varredura enxerga os dois chamadores de hoje (falha se o glob ou a leitura quebrarem)', () => {
    const chama = (a: string, f: string) => readFileSync(`${raiz}${a}`, 'utf8').includes(`${f}(`);
    expect(arquivosDeApp.filter((a) => chama(a, 'criarPacoteDecisaoComNomes'))).toEqual(
      expect.arrayContaining(['src/app/api/demandas/[id]/pacotes-decisao/route.ts']),
    );
    expect(arquivosDeApp.filter((a) => chama(a, 'criarPacoteDecisao'))).toEqual(
      expect.arrayContaining(['src/app/(painel)/demandas/[id]/pacotes-decisao/novo/acoes.ts']),
    );
  });

  it('nenhuma chamada acusada', () => {
    expect(arquivosDeApp.flatMap((a) => chamadasComExtras(readFileSync(`${raiz}${a}`, 'utf8'), a))).toEqual([]);
  });
});
