// test/estatico/detalhe-dec.test.ts — T11 do DEC-DEM-20261110-0015-v1: CV-09 na página da T05. A leitura nova do DEC
// mais novo (para a barra de etapas e a Próxima ação) segue a ordem de hoje das outras leituras da página:
//   1) `autorizar(pessoa, 'ler_pacote_decisao')` vem antes de toda chamada de `obterPacoteDecisao(`;
//   2) o id que `obterPacoteDecisao` recebe é o `.id` de uma constante tirada de `d.pacotesDecisao[0]`, nunca de
//      `params` nem de `searchParams` (a página não lê DEC pedido pela URL);
//   3) `etapasDaDemanda(` e `proximaAcao(` são chamadas aqui (CA-09.4: só página as chama).
// Lido pela árvore do TypeScript, no corpo de `PaginaDemanda`. Cada regra tem um caso plantado que a faz reprovar.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const PAGINA = 'src/app/(painel)/demandas/[id]/page.tsx';

// O corpo da função `PaginaDemanda` (a exportação padrão da T05).
function corpoDaPagina(fonte: string): ts.Block | null {
  const arquivo = ts.createSourceFile(PAGINA, fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let corpo: ts.Block | null = null;
  ts.forEachChild(arquivo, (no) => {
    if (ts.isFunctionDeclaration(no) && no.name?.text === 'PaginaDemanda' && no.body) corpo = no.body;
  });
  return corpo;
}

const nomeDaChamada = (no: ts.CallExpression): string | null => (ts.isIdentifier(no.expression) ? no.expression.text : null);

// O que reprova; lista vazia = a página segue as três regras.
export function achadosDoDec(fonte: string): string[] {
  const corpo = corpoDaPagina(fonte);
  if (!corpo) return ['sem PaginaDemanda'];
  let autorizacao = -1;
  const leituras: ts.CallExpression[] = [];
  const chamadas = new Set<string>();
  // Constantes do corpo tiradas de `d.pacotesDecisao[0]`.
  const doPacoteMaisNovo = new Set<string>();
  const visitar = (no: ts.Node): void => {
    if (ts.isVariableDeclaration(no) && ts.isIdentifier(no.name) && no.initializer && no.initializer.getText().replace(/\s/g, '') === 'd.pacotesDecisao[0]')
      doPacoteMaisNovo.add(no.name.text);
    if (ts.isCallExpression(no)) {
      const nome = nomeDaChamada(no);
      if (nome) chamadas.add(nome);
      const [, acao] = no.arguments;
      if (nome === 'autorizar' && acao && ts.isStringLiteralLike(acao) && acao.text === 'ler_pacote_decisao' && autorizacao < 0) autorizacao = no.getStart();
      if (nome === 'obterPacoteDecisao') leituras.push(no);
    }
    ts.forEachChild(no, visitar);
  };
  visitar(corpo);

  const achados: string[] = [];
  if (autorizacao < 0) achados.push("sem autorizar(pessoa, 'ler_pacote_decisao')");
  if (leituras.length === 0) achados.push('sem obterPacoteDecisao(');
  for (const l of leituras) {
    if (autorizacao >= 0 && l.getStart() < autorizacao) achados.push('obterPacoteDecisao antes de autorizar');
    const id = l.arguments[1];
    const certo = id && ts.isPropertyAccessExpression(id) && id.name.text === 'id' && ts.isIdentifier(id.expression) && doPacoteMaisNovo.has(id.expression.text);
    if (!certo) achados.push(`id do DEC fora de d.pacotesDecisao[0]: ${id ? id.getText() : '(nenhum)'}`);
  }
  for (const f of ['etapasDaDemanda', 'proximaAcao']) if (!chamadas.has(f)) achados.push(`sem ${f}(`);
  return achados;
}

describe('CV-09 (T11): a leitura do DEC mais novo na página da T05', () => {
  it('a página autoriza antes de ler, lê o DEC de d.pacotesDecisao[0] e chama as duas regras de exibição', () => {
    expect(achadosDoDec(readFileSync(`${raiz}${PAGINA}`, 'utf8'))).toEqual([]);
  });

  const pagina = (corpo: string) => `export default async function PaginaDemanda({ params, searchParams }) {\n${corpo}\n}`;
  const DEC = 'const decResumo = d.pacotesDecisao[0];';
  const AUTORIZA = "if (decResumo) autorizar(pessoa, 'ler_pacote_decisao');";
  const LE = 'const dec = decResumo ? await obterPacoteDecisao(deps.db, decResumo.id) : null;';
  const REGRAS = 'const etapas = etapasDaDemanda(x);\nconst acao = proximaAcao(x);';

  it('aceita a forma certa', () => {
    expect(achadosDoDec(pagina([DEC, AUTORIZA, LE, REGRAS].join('\n')))).toEqual([]);
  });

  it('reprova a leitura antes da autorização, e a autorização que falta ou é de outra ação', () => {
    expect(achadosDoDec(pagina([DEC, LE, AUTORIZA, REGRAS].join('\n')))).toEqual(['obterPacoteDecisao antes de autorizar']);
    expect(achadosDoDec(pagina([DEC, LE, REGRAS].join('\n')))).toEqual(["sem autorizar(pessoa, 'ler_pacote_decisao')"]);
    expect(achadosDoDec(pagina([DEC, "autorizar(pessoa, 'ler_demanda');", LE, REGRAS].join('\n')))).toEqual(["sem autorizar(pessoa, 'ler_pacote_decisao')"]);
  });

  it('reprova o id do DEC vindo de params, de searchParams, literal ou de outra versão', () => {
    const com = (le: string) => achadosDoDec(pagina([DEC, AUTORIZA, le, REGRAS].join('\n')));
    expect(com('const { decId } = await params;\nconst dec = await obterPacoteDecisao(deps.db, decId);')).toEqual(['id do DEC fora de d.pacotesDecisao[0]: decId']);
    expect(com('const p = await searchParams;\nconst dec = await obterPacoteDecisao(deps.db, p.dec);')).toEqual(['id do DEC fora de d.pacotesDecisao[0]: p.dec']);
    expect(com("const dec = await obterPacoteDecisao(deps.db, 'DEC-DEM-20261110-0001-v1');")).toEqual(["id do DEC fora de d.pacotesDecisao[0]: 'DEC-DEM-20261110-0001-v1'"]);
    expect(com('const antigo = d.pacotesDecisao[1];\nconst dec = await obterPacoteDecisao(deps.db, antigo.id);')).toEqual(['id do DEC fora de d.pacotesDecisao[0]: antigo.id']);
    expect(com('const dec = await obterPacoteDecisao(deps.db);')).toEqual(['id do DEC fora de d.pacotesDecisao[0]: (nenhum)']);
  });

  it('reprova a página que não lê o DEC ou não chama as regras de exibição', () => {
    expect(achadosDoDec(pagina([DEC, AUTORIZA, REGRAS].join('\n')))).toEqual(['sem obterPacoteDecisao(']);
    expect(achadosDoDec(pagina([DEC, AUTORIZA, LE, 'const etapas = etapasDaDemanda(x);'].join('\n')))).toEqual(['sem proximaAcao(']);
    expect(achadosDoDec(pagina([DEC, AUTORIZA, LE, 'const acao = proximaAcao(x);'].join('\n')))).toEqual(['sem etapasDaDemanda(']);
    expect(achadosDoDec('export default async function OutraPagina() { return null; }')).toEqual(['sem PaginaDemanda']);
  });
});
