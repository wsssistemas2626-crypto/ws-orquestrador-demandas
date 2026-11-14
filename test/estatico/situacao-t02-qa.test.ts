// test/estatico/situacao-t02-qa.test.ts — escrito na 06-T02-testes do DEC-DEM-20261111-0018-v1 (qa-automacao), ao
// lado de test/estatico/situacao.test.ts, sem mudar nada nele. Fecha o M1 da 06-T02-revisao para o SB-06 ("a situação
// informa, não autoriza"): a guarda de situacao.test.ts procura o texto `pedido-construcao/situacao` e não vê a
// importação relativa da mesma pasta (`./situacao`, justamente onde ficam conferir.ts, entregar.ts e receber.ts).
// Aqui, fora de teste e fora da rota nova e do próprio serviço:
//   1. nenhum arquivo importa situacao.ts por caminho nenhum (relativo, apelido @/, com extensão, index, reexportação,
//      `import()` ou `require()`, inclusive só de tipo). O caminho é resolvido, e não comparado por texto;
//   2. nenhum arquivo cita os nomes que o serviço exporta (situacaoDoPedido, SITUACOES_DO_PEDIDO, SituacaoDoPedido,
//      DepsSituacao);
//   3. nenhum `import()` ou `require()` com caminho que não é literal: um caminho montado escaparia da regra 1.
// Varre .ts, .tsx, .js, .jsx, .mjs, .cjs, .mts e .cts de src/ e scripts/ e a configuração da raiz, como
// situacao-qa.test.ts. Cada regra tem caso plantado que a reprova e caso parecido que ela deixa passar. Não importa de
// outro *.test.ts (D-06): o leitor de importações é o ./importacoes.
import { globSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { fonteTs, importacoesDe } from './importacoes';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');
const ehTeste = (a: string) => /\.test\.[cm]?[jt]sx?$/.test(a);
const codigoQueRoda = [
  ...globSync('{src,scripts}/**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts}', { cwd: raiz }),
  ...globSync('*.{ts,js,mjs,cjs,mts,cts}', { cwd: raiz }),
]
  .filter((a) => !ehTeste(a))
  .sort();

const ROTA = 'src/app/api/pedidos-construcao/[decId]/situacao/route.ts';
const SERVICO = 'src/modules/pedido-construcao/situacao.ts';
const MODULO_DO_SERVICO = 'src/modules/pedido-construcao/situacao';
const PODEM: readonly string[] = [ROTA, SERVICO];

// O módulo para onde a importação aponta, sem extensão e sem /index; pacote volta cru.
function moduloDe(arquivo: string, origem: string): string {
  let alvo: string;
  if (origem.startsWith('./') || origem.startsWith('../')) alvo = posix.normalize(posix.join(posix.dirname(arquivo), origem));
  else if (origem.startsWith('@/')) alvo = `src/${origem.slice(2)}`;
  else return origem;
  return alvo.replace(/\.[cm]?[jt]sx?$/, '').replace(/\/index$/, '');
}

// Regra 1: qualquer importação, de valor ou de tipo, que chegue a situacao.ts.
const importaOServico = (arquivo: string, fonte: string) => importacoesDe(arquivo, fonte).some((i) => moduloDe(arquivo, i.origem) === MODULO_DO_SERVICO);
const importadores = (arquivos: ReadonlyArray<readonly [string, string]>) => arquivos.filter(([a, f]) => importaOServico(a, f)).map(([a]) => a);

// Regra 2: os nomes exportados pelo serviço, como palavra inteira.
const RE_NOMES_DO_SERVICO = /\b(?:situacaoDoPedido|SITUACOES_DO_PEDIDO|SituacaoDoPedido|DepsSituacao)\b/;

// Regra 3: `import()` e `require()` cujo argumento não é texto literal (nem template sem substituição).
function importacoesSemLiteral(arquivo: string, fonte: string): string[] {
  const arvore = fonteTs(arquivo, fonte);
  const achados: string[] = [];
  const visitar = (no: ts.Node): void => {
    if (
      ts.isCallExpression(no) &&
      (no.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(no.expression) && no.expression.text === 'require'))
    ) {
      const [arg] = no.arguments;
      if (!arg || !ts.isStringLiteralLike(arg)) achados.push(no.getText(arvore));
    }
    ts.forEachChild(no, visitar);
  };
  visitar(arvore);
  return achados;
}

describe('SB-06 (M1 da 06-T02-revisao): fora da rota nova, ninguém chega ao serviço da situação', () => {
  it('a varredura enxerga o código que roda, inclusive a pasta do serviço e quem decide entrega, recebimento e andamento', () => {
    expect(codigoQueRoda).toEqual(
      expect.arrayContaining([
        ROTA,
        SERVICO,
        'src/modules/pedido-construcao/conferir.ts',
        'src/modules/pedido-construcao/entregar.ts',
        'src/modules/pedido-construcao/receber.ts',
        'src/modules/andamento/registrar.ts',
        'src/modules/agentes/situacao-worker.ts',
        'next.config.ts',
      ]),
    );
    expect(codigoQueRoda.filter(ehTeste)).toEqual([]);
  });

  it('1. só a rota nova importa situacao.ts, por qualquer caminho, de valor ou de tipo', () => {
    const importam = importadores(codigoQueRoda.map((a) => [a, ler(a)] as const));
    expect(importam).toEqual([ROTA]);
  });

  it('2. fora da rota e do serviço, ninguém cita situacaoDoPedido, SITUACOES_DO_PEDIDO, SituacaoDoPedido nem DepsSituacao', () => {
    const citam = codigoQueRoda.filter((a) => RE_NOMES_DO_SERVICO.test(ler(a)));
    expect(citam.filter((a) => !PODEM.includes(a))).toEqual([]);
    expect(citam).toEqual(expect.arrayContaining([ROTA, SERVICO]));
  });

  it('3. nenhum import() nem require() com caminho montado no código que roda', () => {
    const achados = codigoQueRoda.flatMap((a) => importacoesSemLiteral(a, ler(a)).map((x) => `${a}: ${x}`));
    expect(achados).toEqual([]);
  });

  it('o caminho é resolvido: relativo da mesma pasta, de outra pasta, apelido @/, extensão e index', () => {
    expect(moduloDe('src/modules/pedido-construcao/conferir.ts', './situacao')).toBe(MODULO_DO_SERVICO);
    expect(moduloDe('src/modules/andamento/registrar.ts', '../pedido-construcao/situacao')).toBe(MODULO_DO_SERVICO);
    expect(moduloDe('src/modules/pedido-construcao/entregar.ts', './situacao.ts')).toBe(MODULO_DO_SERVICO);
    expect(moduloDe('src/jobs/x.ts', '@/modules/pedido-construcao/situacao/index')).toBe(MODULO_DO_SERVICO);
    expect(moduloDe('scripts/x.ts', '../src/modules/pedido-construcao/situacao.js')).toBe(MODULO_DO_SERVICO);
    expect(moduloDe(ROTA, '../../../../../modules/pedido-construcao/situacao')).toBe(MODULO_DO_SERVICO);
    expect(moduloDe('src/modules/agentes/x.ts', './situacao')).toBe('src/modules/agentes/situacao');
    expect(moduloDe('src/modules/agentes/x.ts', './situacao-worker')).toBe('src/modules/agentes/situacao-worker');
  });

  it('regra 1: acha cada forma plantada, inclusive o caso do M1 em conferir.ts, e não conta módulo de nome parecido', () => {
    const plantados = [
      ['src/modules/pedido-construcao/conferir.ts', "import { situacaoDoPedido } from './situacao';"],
      ['src/modules/pedido-construcao/receber.ts', "import * as s from './situacao.ts';"],
      ['src/modules/pedido-construcao/entregar.ts', "import type { SituacaoDoPedido } from './situacao';"],
      ['src/modules/andamento/registrar.ts', "import { situacaoDoPedido as ler } from '../pedido-construcao/situacao';"],
      ['src/modules/pedido-construcao/indice.ts', "export * from './situacao';"],
      ['src/app/(painel)/x/acoes.ts', "'use server';\nimport { situacaoDoPedido } from '@/modules/pedido-construcao/situacao';"],
      ['src/worker/x.ts', "const m = await import('../modules/pedido-construcao/situacao.js');"],
      ['scripts/x.ts', "const { situacaoDoPedido } = require('../src/modules/pedido-construcao/situacao');"],
      ['src/jobs/y.mjs', 'const m = await import(`../modules/pedido-construcao/situacao`);'],
      ['src/modules/agentes/x.ts', "import { situacaoDoWorker } from './situacao-worker';\nimport { y } from './situacao';"],
      ['src/modules/pedido-construcao/z.ts', "import { situacao } from '../andamento/situacao';\nimport { w } from './situacao-antiga';"],
    ] as const;
    expect(importadores(plantados)).toEqual([
      'src/modules/pedido-construcao/conferir.ts',
      'src/modules/pedido-construcao/receber.ts',
      'src/modules/pedido-construcao/entregar.ts',
      'src/modules/andamento/registrar.ts',
      'src/modules/pedido-construcao/indice.ts',
      'src/app/(painel)/x/acoes.ts',
      'src/worker/x.ts',
      'scripts/x.ts',
      'src/jobs/y.mjs',
    ]);
  });

  it('regra 2: pega os nomes como palavra inteira, e não o nome parecido', () => {
    expect(RE_NOMES_DO_SERVICO.test('if ((await situacaoDoPedido(deps, ator, id)) === "vigente") return;')).toBe(true);
    expect(RE_NOMES_DO_SERVICO.test('const v: SituacaoDoPedido = "vigente";')).toBe(true);
    expect(RE_NOMES_DO_SERVICO.test('for (const s of SITUACOES_DO_PEDIDO) {}')).toBe(true);
    expect(RE_NOMES_DO_SERVICO.test('type D = DepsSituacao;')).toBe(true);
    expect(RE_NOMES_DO_SERVICO.test('const situacaoDoPedidoAntiga = 1; const lerSituacaoDoPedidoX = 2;')).toBe(false);
    expect(RE_NOMES_DO_SERVICO.test("import { situacaoDoWorker } from './situacao-worker';")).toBe(false);
  });

  it('regra 3: pega o caminho montado, e deixa passar o literal', () => {
    expect(importacoesSemLiteral('src/x.ts', "const m = await import('./situ' + 'acao');")).toHaveLength(1);
    expect(importacoesSemLiteral('src/x.ts', 'const m = await import(`./${nome}`);')).toHaveLength(1);
    expect(importacoesSemLiteral('scripts/x.ts', 'const m = require(caminho);')).toHaveLength(1);
    expect(importacoesSemLiteral('src/x.ts', 'const m = await import();')).toHaveLength(1);
    expect(importacoesSemLiteral('src/instrumentation.ts', "const { log } = await import('./lib/log');\nconst x = require('node:fs');")).toEqual([]);
    expect(importacoesSemLiteral('src/x.ts', 'const m = await import(`./lib/log`);')).toEqual([]);
  });
});
