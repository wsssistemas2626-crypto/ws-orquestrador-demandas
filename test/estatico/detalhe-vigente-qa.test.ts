// test/estatico/detalhe-vigente-qa.test.ts — 06-T13-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; CV-09, G9, D-14;
// Minor M1 da 06-T13-revisao). Guarda adversarial da leitura do aprovado vigente na T05, além da regra 2 ampliada de
// detalhe-dec.test.ts (que reconhece a constante pelo texto `vigenteDe(d)` e olha só o corpo de `PaginaDemanda`). Aqui,
// sobre o page.tsx real, o que aquela regra não fecha:
//   1) `vigenteDe` é a importada de components/dados-das-etapas, e nada na página declara outro `vigenteDe`;
//   2) `d` é declarada uma vez só no corpo, `const`, como `await lerDemandaDaPagina(id)` (importada de
//      ./demanda-da-pagina): sem sombra, a vista é a da demanda pedida;
//   3) toda chamada de `obterPacoteDecisao` do arquivo está no corpo de `PaginaDemanda` e recebe o `.id` de uma constante
//      `const`, declarada uma vez, nunca reatribuída, criada como `d.pacotesDecisao[0]` ou `vigenteDe(d)`; são duas, uma de
//      cada (nada de helper fora do corpo, `let` reatribuído ou terceira leitura);
//   4) a leitura do vigente é o ramo verdadeiro de `decMaisNovo?.statusDecisao === 'arquivada' && <vigente> ? … : …`, e
//      `decMaisNovo` é a posição do `Promise.all` que lê o mais novo; a leitura vem depois dele e da autorização;
//   5) da página, nada que leia DEC ou pedido além de `obterPacoteDecisao` (de pacotes-decisao/consultas).
// Lido pela árvore do TypeScript; cada regra tem um caso plantado que a faz reprovar. Não importa de outro *.test.ts.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const PAGINA = 'src/app/(painel)/demandas/[id]/page.tsx';
const ETAPAS = '../../../../components/dados-das-etapas';
const CONSULTAS_DEC = '../../../../modules/pacotes-decisao/consultas';

const semEspacos = (n: ts.Node): string => n.getText().replace(/\s/g, '');
const ehConst = (v: ts.VariableDeclaration): boolean => (ts.getCombinedNodeFlags(v) & ts.NodeFlags.Const) !== 0;
const nomeChamado = (c: ts.CallExpression): string | null =>
  ts.isIdentifier(c.expression) ? c.expression.text : ts.isPropertyAccessExpression(c.expression) ? c.expression.name.text : null;
const ehAtribuicao = (k: ts.SyntaxKind): boolean => k >= ts.SyntaxKind.FirstAssignment && k <= ts.SyntaxKind.LastAssignment;

// Nome declarado por um nó (variável, parâmetro, elemento de desestruturação, função ou classe), ou null.
function nomeDeclarado(no: ts.Node): string | null {
  if ((ts.isVariableDeclaration(no) || ts.isParameter(no) || ts.isBindingElement(no)) && ts.isIdentifier(no.name)) return no.name.text;
  if ((ts.isFunctionDeclaration(no) || ts.isClassDeclaration(no)) && no.name) return no.name.text;
  return null;
}

function todos(no: ts.Node, f: (n: ts.Node) => void): void {
  f(no);
  ts.forEachChild(no, (filho) => todos(filho, f));
}

// O que reprova; lista vazia = a página segue as cinco regras.
export function achadosDoVigente(fonte: string): string[] {
  const arq = ts.createSourceFile(PAGINA, fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const achados: string[] = [];

  // Regras 1, 2 e 5: importações.
  let vigenteImportado = false;
  let lerImportado = false;
  for (const s of arq.statements) {
    if (!ts.isImportDeclaration(s) || !ts.isStringLiteral(s.moduleSpecifier)) continue;
    const mod = s.moduleSpecifier.text;
    const clausula = s.importClause;
    if (!clausula) continue;
    const deDec = /pacotes-decisao|pedido-construcao/.test(mod);
    if (deDec && !clausula.isTypeOnly && (clausula.name || (clausula.namedBindings && ts.isNamespaceImport(clausula.namedBindings))))
      achados.push(`importação inteira de ${mod}`);
    const elementos = clausula.namedBindings && ts.isNamedImports(clausula.namedBindings) ? clausula.namedBindings.elements : [];
    for (const e of elementos) {
      const local = e.name.text;
      const original = (e.propertyName ?? e.name).text;
      const soTipo = clausula.isTypeOnly || e.isTypeOnly;
      if (local === 'vigenteDe') {
        if (mod === ETAPAS && original === 'vigenteDe' && !soTipo) vigenteImportado = true;
        else achados.push(`vigenteDe importada de ${mod} (${original})`);
      }
      if (local === 'lerDemandaDaPagina') {
        if (mod === './demanda-da-pagina' && original === 'lerDemandaDaPagina') lerImportado = true;
        else achados.push(`lerDemandaDaPagina importada de ${mod}`);
      }
      if (local === 'obterPacoteDecisao' && (mod !== CONSULTAS_DEC || original !== 'obterPacoteDecisao')) achados.push(`obterPacoteDecisao importada de ${mod} (${original})`);
      if (deDec && !soTipo && local !== 'obterPacoteDecisao') achados.push(`leitura de DEC além de obterPacoteDecisao: ${original} de ${mod}`);
    }
  }
  if (!vigenteImportado) achados.push(`sem vigenteDe importada de ${ETAPAS}`);
  if (!lerImportado) achados.push('sem lerDemandaDaPagina importada de ./demanda-da-pagina');
  todos(arq, (n) => {
    if (nomeDeclarado(n) === 'vigenteDe') achados.push('vigenteDe declarada na página');
  });

  // O corpo de PaginaDemanda.
  let corpo: ts.Block | null = null;
  ts.forEachChild(arq, (no) => {
    if (ts.isFunctionDeclaration(no) && no.name?.text === 'PaginaDemanda' && no.body) corpo = no.body;
  });
  if (!corpo) return [...achados, 'sem PaginaDemanda'];
  const c: ts.Block = corpo;
  const dentro = (n: ts.Node): boolean => n.getStart() >= c.getStart() && n.getEnd() <= c.getEnd();
  const declaracoes = new Map<string, ts.Node[]>();
  const atribuidos = new Set<string>();
  let autorizacao = -1;
  todos(c, (n) => {
    const nome = nomeDeclarado(n);
    if (nome) declaracoes.set(nome, [...(declaracoes.get(nome) ?? []), n]);
    if (ts.isBinaryExpression(n) && ehAtribuicao(n.operatorToken.kind) && ts.isIdentifier(n.left)) atribuidos.add(n.left.text);
    const incremento = (k: ts.SyntaxKind) => k === ts.SyntaxKind.PlusPlusToken || k === ts.SyntaxKind.MinusMinusToken;
    if ((ts.isPrefixUnaryExpression(n) || ts.isPostfixUnaryExpression(n)) && incremento(n.operator) && ts.isIdentifier(n.operand)) atribuidos.add(n.operand.text);
    if (ts.isCallExpression(n) && nomeChamado(n) === 'autorizar' && autorizacao < 0) {
      const acao = n.arguments[1];
      if (acao && ts.isStringLiteralLike(acao) && acao.text === 'ler_pacote_decisao') autorizacao = n.getStart();
    }
  });
  // A única declaração `const` de um nome no corpo, sem reatribuição; senão, null.
  const constanteUnica = (nome: string): ts.VariableDeclaration | null => {
    const ds = declaracoes.get(nome) ?? [];
    const [v] = ds;
    return ds.length === 1 && v && ts.isVariableDeclaration(v) && ehConst(v) && !atribuidos.has(nome) ? v : null;
  };

  // Regra 2: a vista da demanda.
  const d = constanteUnica('d');
  if (!d || !d.initializer || semEspacos(d.initializer) !== 'awaitlerDemandaDaPagina(id)') achados.push('d não é a única const await lerDemandaDaPagina(id) do corpo');

  // Regra 3: cada leitura de DEC do arquivo.
  const leituras: ts.CallExpression[] = [];
  todos(arq, (n) => {
    if (ts.isCallExpression(n) && nomeChamado(n) === 'obterPacoteDecisao') leituras.push(n);
  });
  const origens: Array<'mais novo' | 'vigente'> = [];
  const doMaisNovo = new Set<ts.CallExpression>();
  const doVigente: Array<{ leitura: ts.CallExpression; nome: string }> = [];
  for (const l of leituras) {
    if (!dentro(l)) {
      achados.push(`obterPacoteDecisao fora de PaginaDemanda: ${l.getText()}`);
      continue;
    }
    const id = l.arguments[1];
    const nome = id && ts.isPropertyAccessExpression(id) && id.name.text === 'id' && ts.isIdentifier(id.expression) ? id.expression.text : null;
    const v = nome ? constanteUnica(nome) : null;
    const origem = v?.initializer ? semEspacos(v.initializer) : null;
    if (!nome || !v) achados.push(`id do DEC sem const única e não reatribuída: ${id ? id.getText() : '(nenhum)'}`);
    else if (origem === 'd.pacotesDecisao[0]') {
      origens.push('mais novo');
      doMaisNovo.add(l);
    } else if (origem === 'vigenteDe(d)') {
      origens.push('vigente');
      doVigente.push({ leitura: l, nome });
    } else achados.push(`id do DEC de origem fora da vista: ${nome} = ${origem}`);
  }
  if (origens.length !== 2 || origens.filter((o) => o === 'mais novo').length !== 1) achados.push(`leituras de DEC: ${origens.length}, esperadas 2 (mais novo e vigente)`);

  // Regra 4: o mais novo vem do Promise.all; o vigente, só no ramo do mais novo arquivado, depois dele e da autorização.
  const dm = constanteUnica('decMaisNovo');
  const dmLista = declaracoes.get('decMaisNovo') ?? [];
  const elemento = dmLista.length === 1 && !atribuidos.has('decMaisNovo') ? dmLista[0]! : null;
  let decMaisNovoOk = false;
  let fimDoPromiseAll = -1;
  if (!dm && elemento && ts.isBindingElement(elemento) && ts.isArrayBindingPattern(elemento.parent) && ts.isVariableDeclaration(elemento.parent.parent)) {
    const decl = elemento.parent.parent;
    const i = elemento.parent.elements.indexOf(elemento);
    const ini = decl.initializer;
    const chamada = ini && ts.isAwaitExpression(ini) && ts.isCallExpression(ini.expression) ? ini.expression : null;
    const lista = chamada && semEspacos(chamada.expression) === 'Promise.all' ? chamada.arguments[0] : undefined;
    const item = lista && ts.isArrayLiteralExpression(lista) ? lista.elements[i] : undefined;
    let leMaisNovo = false;
    if (item) todos(item, (n) => (leMaisNovo ||= ts.isCallExpression(n) && doMaisNovo.has(n)));
    decMaisNovoOk = ehConst(decl) && leMaisNovo;
    fimDoPromiseAll = decl.getEnd();
  }
  if (!decMaisNovoOk) achados.push('decMaisNovo não é a posição do Promise.all que lê o mais novo');
  for (const { leitura, nome } of doVigente) {
    const aguardada = ts.isAwaitExpression(leitura.parent) ? leitura.parent : leitura;
    const cond = aguardada.parent;
    const noRamo = ts.isConditionalExpression(cond) && cond.whenTrue === aguardada && semEspacos(cond.condition) === `decMaisNovo?.statusDecisao==='arquivada'&&${nome}`;
    if (!noRamo) achados.push(`leitura do vigente fora do ramo do mais novo arquivado: ${nome}`);
    if (fimDoPromiseAll < 0 || leitura.getStart() < fimDoPromiseAll) achados.push('leitura do vigente antes da leitura do mais novo');
    if (autorizacao < 0 || leitura.getStart() < autorizacao) achados.push('leitura do vigente antes de autorizar');
  }
  return achados;
}

describe('CV-09 (06-T13-testes): a leitura do aprovado vigente na página da T05, pela página real e por casos plantados', () => {
  it('a página real segue as cinco regras', () => {
    expect(achadosDoVigente(readFileSync(`${raiz}${PAGINA}`, 'utf8'))).toEqual([]);
  });

  const IMPORTA = [
    `import { etapasDaDemanda, proximaAcao, vigenteDe, type DadosDasEtapas } from '${ETAPAS}';`,
    `import { obterPacoteDecisao } from '${CONSULTAS_DEC}';`,
    "import { lerDemandaDaPagina, metadadosDaDemanda } from './demanda-da-pagina';",
  ];
  const D = 'const d = await lerDemandaDaPagina(id);';
  const DEC = 'const decResumo = d.pacotesDecisao[0];';
  const AUTORIZA = "if (decResumo) autorizar(pessoa, 'ler_pacote_decisao');";
  const TODOS = 'const [historico, decMaisNovo] = await Promise.all([\n  listarHistorico(deps.db, d.id),\n  decResumo ? obterPacoteDecisao(deps.db, decResumo.id) : Promise.resolve(null),\n]);';
  const V = 'const vigenteResumo = vigenteDe(d);';
  const LE_V = "const decVigente = decMaisNovo?.statusDecisao === 'arquivada' && vigenteResumo ? await obterPacoteDecisao(deps.db, vigenteResumo.id) : null;";
  const fonte = (o: { importa?: string[]; antes?: string[]; corpo?: string[]; depois?: string[] } = {}) =>
    [
      ...(o.importa ?? IMPORTA),
      ...(o.antes ?? []),
      'export default async function PaginaDemanda({ params, searchParams }) {',
      'const { id } = await params;',
      ...(o.corpo ?? [D, DEC, AUTORIZA, TODOS, V, LE_V]),
      'return null;',
      '}',
      ...(o.depois ?? []),
    ].join('\n');

  it('aceita a forma certa', () => {
    expect(achadosDoVigente(fonte())).toEqual([]);
  });

  it('regra 1: reprova vigenteDe local, importada de outro módulo, renomeada ou só como tipo', () => {
    expect(achadosDoVigente(fonte({ depois: ['function vigenteDe(x) { return { id: x.dec }; }'] }))).toEqual(['vigenteDe declarada na página']);
    expect(achadosDoVigente(fonte({ antes: ['const vigenteDe = (x) => x;'] }))).toEqual(['vigenteDe declarada na página']);
    const outra = [`import { etapasDaDemanda, proximaAcao } from '${ETAPAS}';`, "import { vigenteDe } from './vigente-falso';", ...IMPORTA.slice(1)];
    expect(achadosDoVigente(fonte({ importa: outra }))).toEqual(['vigenteDe importada de ./vigente-falso (vigenteDe)', `sem vigenteDe importada de ${ETAPAS}`]);
    const renomeada = [`import { etapasDaDemanda, proximaAcao, decDaUrl as vigenteDe } from '${ETAPAS}';`, ...IMPORTA.slice(1)];
    expect(achadosDoVigente(fonte({ importa: renomeada }))).toEqual([`vigenteDe importada de ${ETAPAS} (decDaUrl)`, `sem vigenteDe importada de ${ETAPAS}`]);
    const soTipo = [`import { etapasDaDemanda, proximaAcao, type vigenteDe } from '${ETAPAS}';`, ...IMPORTA.slice(1)];
    expect(achadosDoVigente(fonte({ importa: soTipo }))).toEqual([`vigenteDe importada de ${ETAPAS} (vigenteDe)`, `sem vigenteDe importada de ${ETAPAS}`]);
  });

  it('regra 2: reprova d em sombra (outra demanda num bloco), d reatribuída, let, ou d de outra leitura', () => {
    const sombra = [D, DEC, AUTORIZA, TODOS, '{', 'const d = await lerDemandaDaPagina(outraId);', V, LE_V, '}'];
    expect(achadosDoVigente(fonte({ corpo: sombra }))).toEqual(['d não é a única const await lerDemandaDaPagina(id) do corpo']);
    expect(achadosDoVigente(fonte({ corpo: ['let d = await lerDemandaDaPagina(id);', DEC, AUTORIZA, TODOS, V, LE_V] }))).toEqual(['d não é a única const await lerDemandaDaPagina(id) do corpo']);
    expect(achadosDoVigente(fonte({ corpo: [D, DEC, AUTORIZA, TODOS, 'd = await lerDemandaDaPagina(sp.outra);', V, LE_V] }))).toEqual(['d não é a única const await lerDemandaDaPagina(id) do corpo']);
    expect(achadosDoVigente(fonte({ corpo: ['const d = await lerDemandaDaPagina((await searchParams).demanda);', DEC, AUTORIZA, TODOS, V, LE_V] }))).toEqual([
      'd não é a única const await lerDemandaDaPagina(id) do corpo',
    ]);
    const outraLeitura = ["import { lerDemandaDaPagina } from './outra-leitura';", ...IMPORTA.slice(0, 2)];
    expect(achadosDoVigente(fonte({ importa: outraLeitura }))).toEqual(['lerDemandaDaPagina importada de ./outra-leitura', 'sem lerDemandaDaPagina importada de ./demanda-da-pagina']);
  });

  it('regra 3: reprova let reatribuído, id da URL, helper fora do corpo e uma terceira leitura', () => {
    const letReatribuido = [D, DEC, AUTORIZA, TODOS, 'let vigenteResumo = vigenteDe(d);', 'vigenteResumo = { id: (await searchParams).dec };', LE_V];
    expect(achadosDoVigente(fonte({ corpo: letReatribuido }))).toEqual([
      'id do DEC sem const única e não reatribuída: vigenteResumo.id',
      'leituras de DEC: 1, esperadas 2 (mais novo e vigente)',
    ]);
    const daUrl = "const decVigente = decMaisNovo?.statusDecisao === 'arquivada' && vigenteResumo ? await obterPacoteDecisao(deps.db, (await searchParams).dec) : null;";
    expect(achadosDoVigente(fonte({ corpo: [D, DEC, AUTORIZA, TODOS, V, daUrl] }))).toEqual([
      'id do DEC sem const única e não reatribuída: (await searchParams).dec',
      'leituras de DEC: 1, esperadas 2 (mais novo e vigente)',
    ]);
    const helper = ['async function lerOutro(deps, sp) { return obterPacoteDecisao(deps.db, sp.dec); }'];
    expect(achadosDoVigente(fonte({ depois: helper }))).toEqual(['obterPacoteDecisao fora de PaginaDemanda: obterPacoteDecisao(deps.db, sp.dec)']);
    const terceira = [D, DEC, AUTORIZA, TODOS, V, LE_V, 'const deNovo = await obterPacoteDecisao(deps.db, vigenteResumo.id);'];
    expect(achadosDoVigente(fonte({ corpo: terceira }))).toEqual(['leituras de DEC: 3, esperadas 2 (mais novo e vigente)', 'leitura do vigente fora do ramo do mais novo arquivado: vigenteResumo']);
    const antigo = [D, DEC, AUTORIZA, TODOS, 'const vigenteResumo = d.pacotesDecisao[1];', LE_V];
    expect(achadosDoVigente(fonte({ corpo: antigo }))).toEqual(['id do DEC de origem fora da vista: vigenteResumo = d.pacotesDecisao[1]', 'leituras de DEC: 1, esperadas 2 (mais novo e vigente)']);
  });

  it('regra 4: reprova o vigente lido sem a condição do mais novo arquivado, com outra condição, antes do mais novo ou antes de autorizar', () => {
    const sempre = 'const decVigente = vigenteResumo ? await obterPacoteDecisao(deps.db, vigenteResumo.id) : null;';
    expect(achadosDoVigente(fonte({ corpo: [D, DEC, AUTORIZA, TODOS, V, sempre] }))).toEqual(['leitura do vigente fora do ramo do mais novo arquivado: vigenteResumo']);
    const pendente = "const decVigente = decMaisNovo?.statusDecisao === 'pendente' && vigenteResumo ? await obterPacoteDecisao(deps.db, vigenteResumo.id) : null;";
    expect(achadosDoVigente(fonte({ corpo: [D, DEC, AUTORIZA, TODOS, V, pendente] }))).toEqual(['leitura do vigente fora do ramo do mais novo arquivado: vigenteResumo']);
    const noRamoFalso = "const decVigente = decMaisNovo?.statusDecisao === 'arquivada' && vigenteResumo ? null : await obterPacoteDecisao(deps.db, vigenteResumo.id);";
    expect(achadosDoVigente(fonte({ corpo: [D, DEC, AUTORIZA, TODOS, V, noRamoFalso] }))).toEqual(['leitura do vigente fora do ramo do mais novo arquivado: vigenteResumo']);
    const antesDoMaisNovo = [D, DEC, AUTORIZA, V, 'const decMaisNovo = null;', "const x = decMaisNovo?.statusDecisao === 'arquivada' && vigenteResumo ? await obterPacoteDecisao(deps.db, vigenteResumo.id) : null;", TODOS];
    expect(achadosDoVigente(fonte({ corpo: antesDoMaisNovo }))).toEqual(['decMaisNovo não é a posição do Promise.all que lê o mais novo', 'leitura do vigente antes da leitura do mais novo']);
    const trocado = 'const [decMaisNovo, historico] = await Promise.all([\n  listarHistorico(deps.db, d.id),\n  decResumo ? obterPacoteDecisao(deps.db, decResumo.id) : Promise.resolve(null),\n]);';
    expect(achadosDoVigente(fonte({ corpo: [D, DEC, AUTORIZA, trocado, V, LE_V] }))).toEqual(['decMaisNovo não é a posição do Promise.all que lê o mais novo']);
    expect(achadosDoVigente(fonte({ corpo: [D, DEC, TODOS, V, LE_V, AUTORIZA] }))).toEqual(['leitura do vigente antes de autorizar']);
  });

  it('regra 5: reprova outra leitura de DEC ou de pedido importada na página', () => {
    const extra = [...IMPORTA, "import { lerPacoteDaPagina } from '../../pacotes-decisao/[decId]/pacote-da-pagina';"];
    expect(achadosDoVigente(fonte({ importa: extra }))).toEqual(['leitura de DEC além de obterPacoteDecisao: lerPacoteDaPagina de ../../pacotes-decisao/[decId]/pacote-da-pagina']);
    const vigenteDoModulo = [...IMPORTA, "import { vigenteDaDemanda } from '../../../../modules/pacotes-decisao/substituido';"];
    expect(achadosDoVigente(fonte({ importa: vigenteDoModulo }))).toEqual(['leitura de DEC além de obterPacoteDecisao: vigenteDaDemanda de ../../../../modules/pacotes-decisao/substituido']);
    const inteira = [...IMPORTA, "import * as dec from '../../../../modules/pacotes-decisao/consultas';"];
    expect(achadosDoVigente(fonte({ importa: inteira }))).toEqual([`importação inteira de ${CONSULTAS_DEC}`]);
    const deOutro = [IMPORTA[0]!, "import { obterPacoteDecisao } from '../../../../modules/pedido-construcao/obter';", IMPORTA[2]!];
    expect(achadosDoVigente(fonte({ importa: deOutro }))).toEqual(['obterPacoteDecisao importada de ../../../../modules/pedido-construcao/obter (obterPacoteDecisao)']);
    const soTipos = [...IMPORTA, "import type { PacoteDecisaoVista } from '../../../../modules/pacotes-decisao/consultas';"];
    expect(achadosDoVigente(fonte({ importa: soTipos }))).toEqual([]);
  });
});
