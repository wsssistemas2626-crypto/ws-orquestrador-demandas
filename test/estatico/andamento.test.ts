// test/estatico/andamento.test.ts — guardas estáticas do módulo de andamento (D-04).
// AN-01 (f): a ação `registrar_andamento` só aparece na matriz, na rota nova e no serviço (fora de teste); nenhum
// arquivo 'use server' nem job a cita. As tarefas seguintes acrescentam aqui o AN-06 (T07) e a cadeia de quem importa
// andamento/consultas.ts (T06, T12). Cada regra tem um caso plantado que a reprova.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { importacoesDe } from './importacoes';

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

// T06 (D-04): andamento/consultas.ts só lê (o mesmo critério de resumo-da-fila.ts: select, sem insert/update/delete/
// execute/transaction/raw, nem o `sql` do drizzle-orm por nome, apelido ou namespace), e só estes o importam por valor
// no código que roda. `import type` não conta.
const CONSULTAS = 'src/modules/andamento/consultas.ts';
export const IMPORTAM_CONSULTAS: readonly string[] = [
  'src/modules/andamento/registrar.ts', // T07
  'src/modules/demandas/consultas.ts', // T09
  'src/app/(painel)/demandas/leituras-da-fila.ts', // T12
];

const ESCRITAS_NAS_CONSULTAS: ReadonlyArray<[string, RegExp]> = [
  ['insert(', /\binsert\s*\(/],
  ['update(', /\bupdate\s*\(/],
  ['delete(', /\bdelete\s*\(/],
  ['execute(', /\bexecute\s*\(/],
  ['transaction(', /\btransaction\s*\(/],
  ['.raw(', /\.raw\s*\(/],
];

// O que reprova em consultas.ts; lista vazia = só leitura.
export function achadosNasConsultas(fonte: string): string[] {
  const achados = ESCRITAS_NAS_CONSULTAS.flatMap(([nome, re]) => (re.test(fonte) ? [nome] : []));
  if (!/\.select(DistinctOn)?\s*\(/.test(fonte)) achados.push('sem select(');
  for (const i of importacoesDe(CONSULTAS, fonte)) {
    if (i.origem !== 'drizzle-orm' && !i.origem.startsWith('drizzle-orm/')) continue;
    if (i.namespace) achados.push(`namespace de ${i.origem}`);
    if (i.nomes.includes('sql')) achados.push(`sql de ${i.origem}`);
  }
  return achados;
}

const apontaParaConsultas = (origem: string): boolean => /(^|\/)andamento\/consultas(\.[cm]?[jt]sx?)?$/.test(origem);

// Arquivos que importam andamento/consultas por valor (relativa, pelo apelido @/ ou com extensão).
export function importadoresDasConsultas(arquivos: ReadonlyArray<readonly [string, string]>): string[] {
  return arquivos
    .filter(([a, f]) => a !== CONSULTAS && importacoesDe(a, f).some((i) => !i.soTipo && apontaParaConsultas(i.origem)))
    .map(([a]) => a);
}

describe('andamento/consultas.ts (T06)', () => {
  it('existe, é código que roda e só lê', () => {
    expect(codigoQueRoda).toContain(CONSULTAS);
    expect(achadosNasConsultas(ler(CONSULTAS))).toEqual([]);
  });
  it('só os importadores da lista o importam por valor', () => {
    const importam = importadoresDasConsultas(codigoQueRoda.map((a) => [a, ler(a)] as const));
    expect(importam.filter((a) => !IMPORTAM_CONSULTAS.includes(a))).toEqual([]);
  });
  it('a regra de só leitura reprova cada escrita plantada e aceita o que só lê', () => {
    const base = "import { desc, eq } from 'drizzle-orm';\nexport const f = (db) => db.select().from(t);\n";
    expect(achadosNasConsultas(base)).toEqual([]);
    expect(achadosNasConsultas("import { eq } from 'drizzle-orm';\nexport const f = (db) => db.selectDistinctOn([t.a]).from(t);\n")).toEqual([]);
    expect(achadosNasConsultas(`${base}db.insert(andamentoConstrucao).values({});`)).toEqual(['insert(']);
    expect(achadosNasConsultas(`${base}db.update(andamentoConstrucao).set({});`)).toEqual(['update(']);
    expect(achadosNasConsultas(`${base}db.delete(andamentoConstrucao);`)).toEqual(['delete(']);
    expect(achadosNasConsultas(`${base}db.execute(consulta);`)).toEqual(['execute(']);
    expect(achadosNasConsultas(`${base}db.transaction(async (tx) => tx);`)).toEqual(['transaction(']);
    expect(achadosNasConsultas(`${base}const x = sql.raw(texto);`)).toEqual(['.raw(']);
    expect(achadosNasConsultas("import { eq } from 'drizzle-orm';\nexport const n = 1;\n")).toEqual(['sem select(']);
    const select = '\nexport const f = (db) => db.select().from(t);\n';
    expect(achadosNasConsultas(`import { eq, sql as s } from 'drizzle-orm';${select}`)).toEqual(['sql de drizzle-orm']);
    expect(achadosNasConsultas(`import * as d from 'drizzle-orm';${select}`)).toEqual(['namespace de drizzle-orm']);
  });
  it('a busca de importadores acha cada forma plantada e não conta tipo nem nome parecido', () => {
    const plantados = [
      ['src/app/x.ts', "import { ultimoAndamento } from '@/modules/andamento/consultas';"],
      ['src/app/y.ts', "import {\n  andamentosDasDemandas,\n} from '../../modules/andamento/consultas.ts';"],
      ['src/app/z.ts', "export * from '../modules/andamento/consultas';"],
      ['src/app/w.ts', "const c = await import('../modules/andamento/consultas');"],
      ['src/app/tipo.ts', "import type { LinhaDeAndamento } from '../modules/andamento/consultas';"],
      ['src/app/outro.ts', "import { x } from '../modules/demandas/consultas';\nimport { y } from './andamento/consultas-antigas';"],
      [CONSULTAS, "export * from './consultas';"],
    ] as const;
    expect(importadoresDasConsultas(plantados)).toEqual(['src/app/x.ts', 'src/app/y.ts', 'src/app/z.ts', 'src/app/w.ts']);
    expect(importadoresDasConsultas(plantados).filter((a) => !IMPORTAM_CONSULTAS.includes(a))).toEqual(['src/app/x.ts', 'src/app/y.ts', 'src/app/z.ts', 'src/app/w.ts']);
  });
});
