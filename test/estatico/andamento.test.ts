// test/estatico/andamento.test.ts — guardas estáticas do módulo de andamento (D-04).
// AN-01 (f): a ação `registrar_andamento` só aparece na matriz, na rota nova e no serviço (fora de teste); nenhum
// arquivo 'use server' nem job a cita. As tarefas seguintes acrescentam aqui o AN-06 (T07) e a cadeia de quem importa
// andamento/consultas.ts (T06, T12). Cada regra tem um caso plantado que a reprova.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');
export const codigoQueRoda = globSync('{src,scripts}/**/*.{ts,tsx}', { cwd: raiz })
  .filter((a) => !/\.test\.tsx?$/.test(a))
  .sort();

export const CITAM_A_ACAO: readonly string[] = [
  'src/modules/acesso/matriz.ts',
  'src/app/api/pedidos-construcao/[decId]/andamento/route.ts',
  'src/modules/andamento/registrar.ts',
];

export function quemCita(arquivos: ReadonlyArray<readonly [string, string]>): string[] {
  return arquivos.filter(([, f]) => f.includes('registrar_andamento')).map(([a]) => a);
}
const ehServerAction = (f: string) => /^\s*['"]use server['"]/m.test(f);

describe('AN-01 (f): onde a ação registrar_andamento aparece', () => {
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
      if (!f.includes('registrar_andamento')) continue;
      expect(ehServerAction(f), a).toBe(false);
      expect(/^src\/(jobs|worker)\//.test(a), a).toBe(false);
    }
  });
  it('as regras pegam o caso plantado', () => {
    expect(quemCita([['src/app/x/acoes.ts', "'use server';\nautorizar(p, 'registrar_andamento');"]])).toEqual(['src/app/x/acoes.ts']);
    expect(ehServerAction("'use server';\nexport async function f() {}")).toBe(true);
    expect(ehServerAction("export const x = 'use server';")).toBe(false);
  });
});
