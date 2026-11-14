// test/estatico/nivel-do-pedido.test.ts — 06-T11-testes (qa-automacao), DEC-DEM-20261111-0018-v1, D-09: a SecaoPedido
// repassa ao erroDoPedido o nível que recebeu da página. O `erroDoPedido(r, nivel = 'cto')` tem padrão, e por isso o
// typecheck aceitaria `erroDoPedido(r)`: um DEC de dupla aprovação mostraria a linha 6 do CTO sem nada quebrar. O
// ambiente do Vitest é `node` (sem DOM para clicar em "Gerar"); a regra é lida pela árvore do TypeScript, no corpo de
// `SecaoPedido`:
//   1) a função recebe a prop `nivelAprovacaoRequerido` na desestruturação do primeiro parâmetro, sem valor padrão;
//   2) há ao menos uma chamada de `erroDoPedido(`, e toda chamada passa dois argumentos, o segundo o identificador
//      `nivelAprovacaoRequerido`;
//   3) nenhuma declaração no corpo troca o valor dele (sombra com o mesmo nome).
// Que a página passa o nível do pacote à SecaoPedido está em src/app/(painel)/pacotes-decisao/[decId]/nivel-do-pedido.test.ts;
// o texto de cada nível, em src/components/textos-0018.test.ts. Cada regra tem um caso plantado que a faz reprovar.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const SECAO = 'src/app/(painel)/pacotes-decisao/[decId]/SecaoPedido.tsx';
const PROP = 'nivelAprovacaoRequerido';

function funcaoDaSecao(fonte: string): ts.FunctionDeclaration | null {
  const arquivo = ts.createSourceFile(SECAO, fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let achada: ts.FunctionDeclaration | null = null;
  ts.forEachChild(arquivo, (no) => {
    if (ts.isFunctionDeclaration(no) && no.name?.text === 'SecaoPedido' && no.body) achada = no;
  });
  return achada;
}

// O que reprova; lista vazia = a SecaoPedido segue as três regras.
export function achadosDoNivel(fonte: string): string[] {
  const f = funcaoDaSecao(fonte);
  if (!f || !f.body) return ['sem SecaoPedido'];
  const achados: string[] = [];

  const props = f.parameters[0]?.name;
  const daProp = props && ts.isObjectBindingPattern(props) ? props.elements.find((e) => ts.isIdentifier(e.name) && e.name.text === PROP) : undefined;
  if (!daProp) achados.push(`sem a prop ${PROP}`);
  else if (daProp.initializer) achados.push(`${PROP} com valor padrão: ${daProp.initializer.getText()}`);

  const chamadas: ts.CallExpression[] = [];
  const visitar = (no: ts.Node): void => {
    if (ts.isCallExpression(no) && ts.isIdentifier(no.expression) && no.expression.text === 'erroDoPedido') chamadas.push(no);
    if ((ts.isVariableDeclaration(no) || ts.isParameter(no) || ts.isBindingElement(no)) && ts.isIdentifier(no.name) && no.name.text === PROP) achados.push(`${PROP} declarado de novo no corpo`);
    ts.forEachChild(no, visitar);
  };
  visitar(f.body);

  if (chamadas.length === 0) achados.push('sem erroDoPedido(');
  for (const c of chamadas) {
    const nivel = c.arguments[1];
    if (c.arguments.length !== 2 || !nivel || !ts.isIdentifier(nivel) || nivel.text !== PROP) achados.push(`erroDoPedido sem o nível da prop: ${c.getText()}`);
  }
  return achados;
}

describe('D-09 (T11): a SecaoPedido repassa ao erroDoPedido o nível que recebeu', () => {
  it('o SecaoPedido.tsx de hoje segue as três regras', () => {
    expect(achadosDoNivel(readFileSync(`${raiz}${SECAO}`, 'utf8'))).toEqual([]);
  });

  const secao = (params: string, corpo: string) => `export function SecaoPedido(${params}) {\n${corpo}\n}`;
  const PARAMS = `{ decId, ${PROP} }: { decId: string; ${PROP}: NivelAprovacao }`;
  const CERTO = `async function gerar() { const r = await acao(); if (!r.ok) setErro(erroDoPedido(r, ${PROP})); }`;

  it('aceita a forma certa', () => {
    expect(achadosDoNivel(secao(PARAMS, CERTO))).toEqual([]);
  });

  it('reprova a chamada sem o nível, com um nível fixo ou com outro valor', () => {
    const com = (chamada: string) => achadosDoNivel(secao(PARAMS, `async function gerar() { const r = await acao(); if (!r.ok) setErro(${chamada}); }`));
    expect(com('erroDoPedido(r)')).toEqual(['erroDoPedido sem o nível da prop: erroDoPedido(r)']);
    expect(com("erroDoPedido(r, 'cto')")).toEqual(["erroDoPedido sem o nível da prop: erroDoPedido(r, 'cto')"]);
    expect(com("erroDoPedido(r, 'cto_e_administradora')")).toEqual(["erroDoPedido sem o nível da prop: erroDoPedido(r, 'cto_e_administradora')"]);
    expect(com('erroDoPedido(r, outroNivel)')).toEqual(['erroDoPedido sem o nível da prop: erroDoPedido(r, outroNivel)']);
    expect(com(`erroDoPedido(r, ${PROP}, extra)`)).toEqual([`erroDoPedido sem o nível da prop: erroDoPedido(r, ${PROP}, extra)`]);
  });

  it('reprova uma segunda chamada sem o nível, ao lado da certa', () => {
    expect(achadosDoNivel(secao(PARAMS, `${CERTO}\nfunction outra(r) { return erroDoPedido(r); }`))).toEqual(['erroDoPedido sem o nível da prop: erroDoPedido(r)']);
  });

  it('reprova a prop que falta, a prop com valor padrão e a sombra no corpo', () => {
    expect(achadosDoNivel(secao('{ decId }: { decId: string }', CERTO))).toEqual([`sem a prop ${PROP}`]);
    expect(achadosDoNivel(secao(`{ decId, ${PROP} = 'cto' }: { decId: string; ${PROP}?: NivelAprovacao }`, CERTO))).toEqual([`${PROP} com valor padrão: 'cto'`]);
    expect(achadosDoNivel(secao(PARAMS, `const ${PROP} = 'cto';\n${CERTO}`))).toEqual([`${PROP} declarado de novo no corpo`]);
  });

  it('reprova a SecaoPedido sem erroDoPedido, e o arquivo sem SecaoPedido', () => {
    expect(achadosDoNivel(secao(PARAMS, 'return null;'))).toEqual(['sem erroDoPedido(']);
    expect(achadosDoNivel('export function OutraSecao() { return null; }')).toEqual(['sem SecaoPedido']);
  });
});
