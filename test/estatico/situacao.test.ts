// test/estatico/situacao.test.ts — guardas estáticas da leitura de situação (D-06). SB-01 (f): a ação
// `ler_situacao_pedido` só aparece na matriz, na rota nova e no serviço (fora de teste); nenhum arquivo 'use server',
// job ou worker a cita. A T02 acrescenta SB-03 (sem trava), SB-04 (prazo total) e SB-06 (só a rota importa o serviço).
// Cada regra tem um caso plantado que a reprova. Não importa de outro *.test.ts.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');
const codigoQueRoda = globSync('{src,scripts}/**/*.{ts,tsx}', { cwd: raiz })
  .filter((a) => !/\.test\.tsx?$/.test(a))
  .sort();

const ROTA = 'src/app/api/pedidos-construcao/[decId]/situacao/route.ts';
const SERVICO = 'src/modules/pedido-construcao/situacao.ts';
const CITAM_A_ACAO: readonly string[] = ['src/modules/acesso/matriz.ts', ROTA, SERVICO];

const quemCita = (arquivos: ReadonlyArray<readonly [string, string]>) => arquivos.filter(([, f]) => f.includes('ler_situacao_pedido')).map(([a]) => a);
const ehServerAction = (f: string) => /^\s*['"]use server['"]/m.test(f);

describe('SB-01 (f): onde a ação ler_situacao_pedido aparece', () => {
  it('a varredura enxerga o código que roda (falha se o glob quebrar)', () => {
    expect(codigoQueRoda).toEqual(expect.arrayContaining(['src/modules/acesso/matriz.ts', 'src/lib/rota.ts']));
  });
  it('fora de teste, só a matriz, a rota nova e o serviço citam a ação', () => {
    const citam = quemCita(codigoQueRoda.map((a) => [a, ler(a)] as const));
    expect(citam.filter((a) => !CITAM_A_ACAO.includes(a))).toEqual([]);
    expect(citam).toContain('src/modules/acesso/matriz.ts');
  });
  it("nenhum arquivo 'use server', job ou worker cita a ação", () => {
    for (const a of codigoQueRoda) {
      const f = ler(a);
      if (!f.includes('ler_situacao_pedido')) continue;
      expect(ehServerAction(f), a).toBe(false);
      expect(/^src\/(jobs|worker)\//.test(a), a).toBe(false);
    }
  });
  it('as regras pegam o caso plantado', () => {
    expect(quemCita([['src/app/x/acoes.ts', "'use server';\nautorizar(p, 'ler_situacao_pedido');"]])).toEqual(['src/app/x/acoes.ts']);
    expect(ehServerAction("'use server';\nexport async function f() {}")).toBe(true);
    expect(ehServerAction("export const x = 'use server';")).toBe(false);
  });
});
