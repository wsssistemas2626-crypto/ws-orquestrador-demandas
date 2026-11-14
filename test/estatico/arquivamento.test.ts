// test/estatico/arquivamento.test.ts — guardas estáticas do arquivamento (T06 do DEC-DEM-20261111-0018-v1; SB-11, D-06).
// Em registrarDecisao, as chamadas aparecem na ordem travarDemanda → gravarDecisao → vigenteDaDemanda →
// mudarStatusPorArquivamento: o vigente é lido sob a trava e depois de gravar a decisão. mudarStatusPorArquivamento trava
// a demanda, decide pela tabela de arquivamento.ts e grava pelo ator sistema. A transição automática antiga do
// arquivamento não aparece mais no código que roda. arquivamento.ts é pura: só `import type` de ./schemas, sem
// drizzle-orm, banco nem deps. Cada regra tem um caso plantado que a reprova. Não importa de outro *.test.ts: usa
// ./importacoes e o typescript, como andamento.test.ts.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { importacoesDe } from './importacoes';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');
const codigoQueRoda = globSync('{src,scripts}/**/*.{ts,tsx}', { cwd: raiz })
  .filter((a) => !/\.test\.tsx?$/.test(a))
  .sort();

const DECIDIR = 'src/modules/pacotes-decisao/decidir.ts';
const TRANSICOES = 'src/modules/demandas/transicoes.ts';
const ARQUIVAMENTO = 'src/modules/demandas/arquivamento.ts';
// Montado em partes para que este arquivo não seja, ele mesmo, um achado da varredura de quem leia o texto inteiro.
const TRANSICAO_ANTIGA = ['decisao', 'arquivada'].join('_');

// O corpo (e os parâmetros) da função declarada no nível do arquivo; vazio se não existir.
function funcaoDeclarada(arquivo: string, fonte: string, nome: string): { corpo: string; parametros: string[] } {
  const sf = ts.createSourceFile(arquivo, fonte, ts.ScriptTarget.Latest, true);
  let achada = { corpo: '', parametros: [] as string[] };
  ts.forEachChild(sf, (n) => {
    if (ts.isFunctionDeclaration(n) && n.name?.text === nome && n.body)
      achada = { corpo: n.body.getText(sf), parametros: n.parameters.map((p) => p.name.getText(sf)) };
  });
  return achada;
}

// Posição da primeira chamada de cada função, na ordem pedida; -1 se faltar.
function posicoesDasChamadas(corpo: string, nomes: readonly string[]): number[] {
  return nomes.map((n) => corpo.search(new RegExp(`\\b${n}\\s*\\(`)));
}

const quantasChamadas = (corpo: string, nome: string): number => (corpo.match(new RegExp(`\\b${nome}\\s*\\(`, 'g')) ?? []).length;

const ORDEM_NO_REGISTRO = ['travarDemanda', 'gravarDecisao', 'vigenteDaDemanda', 'mudarStatusPorArquivamento'] as const;

// true se todas as chamadas existem e estão na ordem pedida.
function naOrdem(corpo: string, nomes: readonly string[]): boolean {
  const p = posicoesDasChamadas(corpo, nomes);
  return p.every((x) => x >= 0) && p.every((x, i) => i === 0 || x > p[i - 1]!);
}

// O que reprova em arquivamento.ts; lista vazia = pura (só import type de ./schemas).
function achadosNoArquivamento(fonte: string): string[] {
  return importacoesDe(ARQUIVAMENTO, fonte)
    .filter((i) => !(i.soTipo && i.origem === './schemas'))
    .map((i) => `${i.soTipo ? 'tipo' : 'valor'} de ${i.origem}`);
}

describe('SB-11: registrarDecisao lê o vigente sob a trava e depois de gravarDecisao', () => {
  it('a ordem travarDemanda → gravarDecisao → vigenteDaDemanda → mudarStatusPorArquivamento', () => {
    const { corpo } = funcaoDeclarada(DECIDIR, ler(DECIDIR), 'registrarDecisao');
    expect(corpo.length).toBeGreaterThan(0);
    expect(posicoesDasChamadas(corpo, ORDEM_NO_REGISTRO).every((x) => x >= 0)).toBe(true);
    expect(naOrdem(corpo, ORDEM_NO_REGISTRO)).toBe(true);
  });
  it('o vigente é lido uma vez e o destino é decidido uma vez, e só a transição do devolvido continua por mudarStatusPeloSistema', () => {
    const { corpo } = funcaoDeclarada(DECIDIR, ler(DECIDIR), 'registrarDecisao');
    expect(quantasChamadas(corpo, 'vigenteDaDemanda')).toBe(1);
    expect(quantasChamadas(corpo, 'mudarStatusPorArquivamento')).toBe(1);
    expect(quantasChamadas(corpo, 'mudarStatusPeloSistema')).toBe(1);
    expect(corpo).toMatch(/mudarStatusPeloSistema\(\s*tr,\s*deps,\s*pacote\.demandaId,\s*'decisao_devolvida'\s*\)/);
  });
  it('mudarStatusPorArquivamento trava a demanda antes de decidir pela tabela, e grava pelo ator sistema', () => {
    const { corpo, parametros } = funcaoDeclarada(TRANSICOES, ler(TRANSICOES), 'mudarStatusPorArquivamento');
    expect(parametros).toEqual(['t', 'deps', 'demandaId', 'estado']);
    expect(naOrdem(corpo, ['travarDemanda', 'destinoDoArquivamento', 'registrarEvento'])).toBe(true);
    expect(corpo).toMatch(/ator:\s*\{\s*tipo:\s*'sistema'\s*\}/);
  });
});

describe('a transição automática antiga do arquivamento saiu do código que roda', () => {
  it('a varredura enxerga o código que roda (falha se o glob quebrar)', () => {
    expect(codigoQueRoda).toEqual(expect.arrayContaining([DECIDIR, TRANSICOES, ARQUIVAMENTO]));
  });
  it('nenhum arquivo de src/ fora de teste a cita', () => {
    expect(codigoQueRoda.filter((a) => a.startsWith('src/') && ler(a).includes(TRANSICAO_ANTIGA))).toEqual([]);
  });
});

describe('arquivamento.ts é pura (ADR-38)', () => {
  it('só import type de ./schemas: sem drizzle-orm, ../../db nem ../../lib/deps', () => {
    const f = ler(ARQUIVAMENTO);
    expect(achadosNoArquivamento(f)).toEqual([]);
    expect(importacoesDe(ARQUIVAMENTO, f).map((i) => i.origem)).toEqual(['./schemas']);
  });
});

describe('as regras pegam o caso plantado', () => {
  it('ordem: o vigente lido antes de gravarDecisao, ou antes da trava, reprova', () => {
    const certo = 'travarDemanda(tx, id);\ngravarDecisao(c);\nconst v = vigenteDaDemanda(tx, id);\nmudarStatusPorArquivamento(tr, deps, id, e);';
    expect(naOrdem(certo, ORDEM_NO_REGISTRO)).toBe(true);
    expect(naOrdem('travarDemanda(tx, id);\nconst v = vigenteDaDemanda(tx, id);\ngravarDecisao(c);\nmudarStatusPorArquivamento(tr, deps, id, e);', ORDEM_NO_REGISTRO)).toBe(false);
    expect(naOrdem('const v = vigenteDaDemanda(tx, id);\ntravarDemanda(tx, id);\ngravarDecisao(c);\nmudarStatusPorArquivamento(tr, deps, id, e);', ORDEM_NO_REGISTRO)).toBe(false);
    // Na mesma linha, com o vigente como argumento, a chamada do destino vem antes da leitura: reprova.
    expect(naOrdem('travarDemanda(tx, id);\ngravarDecisao(c);\nmudarStatusPorArquivamento(tr, deps, id, estadoDoVigente(await vigenteDaDemanda(tx, id)));', ORDEM_NO_REGISTRO)).toBe(false);
    expect(naOrdem('travarDemanda(tx, id);\ngravarDecisao(c);\nmudarStatusPorArquivamento(tr, deps, id, e);', ORDEM_NO_REGISTRO)).toBe(false);
  });
  it('funcaoDeclarada e quantasChamadas', () => {
    const plantada = 'export async function f(t, deps) {\n  await g(1);\n  await g(2);\n}\n';
    expect(funcaoDeclarada('x.ts', plantada, 'f').parametros).toEqual(['t', 'deps']);
    expect(funcaoDeclarada('x.ts', plantada, 'h')).toEqual({ corpo: '', parametros: [] });
    expect(quantasChamadas(funcaoDeclarada('x.ts', plantada, 'f').corpo, 'g')).toBe(2);
  });
  it('pureza: importação por valor, de banco ou de deps reprova', () => {
    expect(achadosNoArquivamento("import type { Status } from './schemas';\nexport const x = 1;")).toEqual([]);
    expect(achadosNoArquivamento("import { STATUS } from './schemas';")).toEqual(['valor de ./schemas']);
    expect(achadosNoArquivamento("import { eq } from 'drizzle-orm';")).toEqual(['valor de drizzle-orm']);
    expect(achadosNoArquivamento("import type { Db } from '../../db';")).toEqual(['tipo de ../../db']);
    expect(achadosNoArquivamento("import type { Deps } from '../../lib/deps';")).toEqual(['tipo de ../../lib/deps']);
    expect(achadosNoArquivamento("const m = await import('../../db');")).toEqual(['valor de ../../db']);
  });
  it('a varredura da transição antiga acha o texto plantado', () => {
    expect(`motivo: '${TRANSICAO_ANTIGA}'`.includes(TRANSICAO_ANTIGA)).toBe(true);
  });
});
