// test/estatico/situacao-qa.test.ts — escrito na 06-T01-testes do DEC-DEM-20261111-0018-v1 (qa-automacao), ao lado de
// test/estatico/situacao.test.ts, sem mudar nada nele. Fecha, para o SB-01 (f), o que a varredura da T01 deixa passar:
//   - arquivo de código em outra extensão (.js, .jsx, .mjs, .cjs, .mts, .cts) e os arquivos de configuração da raiz;
//   - diretiva 'use server' dentro da função, na mesma linha do código (Server Action inline);
//   - nome da ação montado por pedaços ('ler_situacao' + '_pedido') fora da matriz, da rota e do serviço;
//   - na matriz, a ação aparece só duas vezes: uma em ACOES e uma em MATRIZ, apontando para SO_CONSTRUIR, que continua
//     sem pessoa e sem agente (o diff permitido pelo SB-01 e pela G4).
// Cada regra tem um caso plantado que a reprova. Não importa de outro *.test.ts (D-06).
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');
const ehTeste = (a: string) => /\.test\.[cm]?[jt]sx?$/.test(a);
const codigoQueRoda = [
  ...globSync('{src,scripts}/**/*.{ts,tsx,js,jsx,mjs,cjs,mts,cts}', { cwd: raiz }),
  ...globSync('*.{ts,js,mjs,cjs,mts,cts}', { cwd: raiz }),
]
  .filter((a) => !ehTeste(a))
  .sort();

const MATRIZ_TS = 'src/modules/acesso/matriz.ts';
const ROTA = 'src/app/api/pedidos-construcao/[decId]/situacao/route.ts';
const SERVICO = 'src/modules/pedido-construcao/situacao.ts';
const CITAM_A_ACAO: readonly string[] = [MATRIZ_TS, ROTA, SERVICO];

const citaAAcao = (f: string) => f.includes('ler_situacao_pedido');
// Pedaços do nome que só servem para montá-lo: quem os tem fora da lista monta a ação por concatenação.
const citaPedaco = (f: string) => /ler_situac|situacao_ped/.test(f);
const temUseServer = (f: string) => /['"]use server['"]/.test(f);
const ocorrencias = (f: string) => f.split('ler_situacao_pedido').length - 1;

describe('SB-01 (f), varredura ampliada: onde ler_situacao_pedido pode aparecer', () => {
  it('a varredura enxerga o código que roda e a configuração da raiz (falha se o glob quebrar)', () => {
    expect(codigoQueRoda).toEqual(expect.arrayContaining([MATRIZ_TS, 'src/lib/rota.ts', 'next.config.ts', 'vitest.config.ts']));
    expect(codigoQueRoda.filter(ehTeste)).toEqual([]);
  });
  it('em qualquer extensão, fora de teste, só a matriz, a rota nova e o serviço citam a ação ou pedaços do nome', () => {
    const citam = codigoQueRoda.filter((a) => {
      const f = ler(a);
      return citaAAcao(f) || citaPedaco(f);
    });
    expect(citam.filter((a) => !CITAM_A_ACAO.includes(a))).toEqual([]);
    expect(citam).toContain(MATRIZ_TS);
  });
  it("nenhum arquivo que cita a ação tem 'use server' em lugar nenhum (nem inline, dentro da função)", () => {
    for (const a of codigoQueRoda) {
      const f = ler(a);
      if (citaAAcao(f) || citaPedaco(f)) expect(temUseServer(f), a).toBe(false);
    }
  });
  it('as regras pegam os casos plantados', () => {
    // Server Action inline: a diretiva na mesma linha da função.
    expect(temUseServer("export async function f() { 'use server'; return autorizar(p, 'ler_situacao_pedido'); }")).toBe(true);
    expect(temUseServer('async function f() {\n  "use server";\n}')).toBe(true);
    expect(temUseServer("export const x = 'use client';")).toBe(false);
    // Nome montado por pedaços.
    expect(citaPedaco("autorizar(ator, ('ler_situac' + 'ao_pedido') as Acao);")).toBe(true);
    expect(citaPedaco("const a = 'ler_situacao' + '_pedido';")).toBe(true);
    expect(citaPedaco("const a = ['situacao_pedido'].join('');")).toBe(true);
    // O nome camelCase do serviço e a pasta da rota não são pedaços do nome da ação.
    expect(citaPedaco("import { situacaoDoPedido } from './situacao';")).toBe(false);
    expect(citaPedaco("'/api/pedidos-construcao/[decId]/situacao'")).toBe(false);
    // Arquivo .mjs e .cts entram na varredura pelo filtro de teste.
    expect(['src/x.mjs', 'scripts/y.cts', 'src/z.test.mts'].filter((a) => !ehTeste(a))).toEqual(['src/x.mjs', 'scripts/y.cts']);
  });
});

describe('SB-01: em matriz.ts, uma linha em ACOES e uma em MATRIZ, apontando para SO_CONSTRUIR', () => {
  const fonte = ler(MATRIZ_TS);
  it('a ação aparece exatamente duas vezes: o item de ACOES e a linha de MATRIZ', () => {
    expect(ocorrencias(fonte)).toBe(2);
    expect(fonte).toMatch(/^\s*'ler_situacao_pedido',\s*$/m);
    expect(fonte).toMatch(/^\s*ler_situacao_pedido:\s*SO_CONSTRUIR,?\s*$/m);
  });
  it('SO_CONSTRUIR é declarada uma vez, sem pessoa, sem agente e só com o construir', () => {
    const declaracoes = fonte.match(/^\s*const SO_CONSTRUIR\s*=.*$/gm) ?? [];
    expect(declaracoes.map((d) => d.trim())).toEqual(["const SO_CONSTRUIR = linha(null, [], ['construir']);"]);
  });
  it('as regras pegam os casos plantados', () => {
    expect(ocorrencias("  'ler_situacao_pedido',\n  ler_situacao_pedido: SO_CONSTRUIR,\n  // ler_situacao_pedido")).toBe(3);
    expect('  ler_situacao_pedido: LEITURA,').not.toMatch(/^\s*ler_situacao_pedido:\s*SO_CONSTRUIR,?\s*$/m);
    expect("  ler_situacao_pedido: linha(null, [], ['construir', 'awave']),").not.toMatch(/^\s*ler_situacao_pedido:\s*SO_CONSTRUIR,?\s*$/m);
  });
});
