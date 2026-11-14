// test/estatico/caminhos-da-criacao.test.ts — guardas estáticas da marcação da criação (T04 do
// DEC-DEM-20261111-0018-v1, D-06; SB-07). No código que roda: (1) o insert em pacote_decisao só existe em
// src/modules/pacotes-decisao/criar.ts; (2) a chave da coluna (`caminhosComNomeNaCriacao` ou
// `caminhos_com_nome_na_criacao`) só aparece no esquema, em criar.ts, em conferir.ts (T05) e em caminhos-da-criacao.ts:
// nunca num schemas.ts, numa route.ts, num arquivo 'use server', em src/jobs/ nem em src/worker/; (3) criar.ts grava a
// coluna com o tipo obrigatório e o nome da linha travada, uma vez. Cada regra tem um caso plantado que a reprova. Não
// importa de outro *.test.ts.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');
const codigoQueRoda = globSync('{src,scripts}/**/*.{ts,tsx,mjs,js}', { cwd: raiz })
  .filter((a) => !/\.test\.tsx?$/.test(a))
  .sort();

const CRIAR = 'src/modules/pacotes-decisao/criar.ts';
const PODEM_CITAR_A_COLUNA: readonly string[] = [
  'src/db/schema/decisao.ts',
  CRIAR,
  'src/modules/pedido-construcao/conferir.ts',
  'src/modules/pedido-construcao/caminhos-da-criacao.ts',
];

type Fonte = readonly [arquivo: string, fonte: string];

// O insert pelo Drizzle (com ou sem namespace) ou por SQL escrito.
const RE_INSERT = [/\.insert\(\s*(?:[\w$]+\.)?pacoteDecisao\b/, /insert\s+into\s+"?pacote_decisao"?/i] as const;
const RE_CHAVE = /caminhos_?com_?nome/i;

const quemInsere = (fontes: readonly Fonte[]) => fontes.filter(([, f]) => RE_INSERT.some((re) => re.test(f))).map(([a]) => a);
const quemCitaAChave = (fontes: readonly Fonte[]) => fontes.filter(([, f]) => RE_CHAVE.test(f)).map(([a]) => a);
const ehServerAction = (f: string) => /^\s*['"]use server['"]/m.test(f);
const lugarProibido = (a: string, f: string) =>
  /(^|\/)schemas\.ts$/.test(a) || /^src\/app\/.*\/route\.ts$/.test(a) || /^src\/(jobs|worker)\//.test(a) || ehServerAction(f);

describe('SB-07: onde pacote_decisao é inserido e onde a chave da coluna aparece', () => {
  const fontes = codigoQueRoda.map((a) => [a, ler(a)] as const);

  it('a varredura enxerga o código que roda (falha se o glob quebrar)', () => {
    expect(codigoQueRoda).toEqual(expect.arrayContaining([CRIAR, 'src/db/schema/decisao.ts', 'src/app/api/demandas/[id]/pacotes-decisao/route.ts', 'scripts/seed-ficticio.ts']));
  });

  it('o insert em pacote_decisao só existe em criar.ts', () => {
    expect(quemInsere(fontes)).toEqual([CRIAR]);
  });

  it('a chave da coluna só aparece no esquema, em criar.ts, em conferir.ts e em caminhos-da-criacao.ts', () => {
    const citam = quemCitaAChave(fontes);
    expect(citam.filter((a) => !PODEM_CITAR_A_COLUNA.includes(a))).toEqual([]);
    expect(citam).toEqual(expect.arrayContaining(['src/db/schema/decisao.ts', CRIAR, 'src/modules/pedido-construcao/caminhos-da-criacao.ts']));
  });

  it("nenhum schemas.ts, route.ts, arquivo 'use server', job ou worker cita a chave", () => {
    expect(fontes.filter(([a, f]) => RE_CHAVE.test(f) && lugarProibido(a, f)).map(([a]) => a)).toEqual([]);
  });

  it('as regras pegam o caso plantado', () => {
    expect(quemInsere([['src/modules/x/outro.ts', 'await tx.insert(pacoteDecisao).values(linha);']])).toEqual(['src/modules/x/outro.ts']);
    expect(quemInsere([['src/modules/x/outro.ts', 'await db.insert( schema.pacoteDecisao ).values(l);']])).toEqual(['src/modules/x/outro.ts']);
    expect(quemInsere([['scripts/x.ts', 'await c.query(`INSERT INTO "pacote_decisao" (id) values ($1)`, [id]);']])).toEqual(['scripts/x.ts']);
    expect(quemInsere([['src/modules/x/outro.ts', 'await tx.insert(pacoteDecisaoOutra).values(l);']])).toEqual([]);
    expect(quemCitaAChave([['src/modules/x/schemas.ts', 'caminhosComNomeNaCriacao: z.array(z.string())']])).toEqual(['src/modules/x/schemas.ts']);
    expect(quemCitaAChave([['src/app/x/route.ts', "body.caminhos_com_nome_na_criacao"]])).toEqual(['src/app/x/route.ts']);
    expect(lugarProibido('src/modules/pacotes-decisao/schemas.ts', '')).toBe(true);
    expect(lugarProibido('src/app/api/x/route.ts', '')).toBe(true);
    expect(lugarProibido('src/jobs/x.ts', '')).toBe(true);
    expect(lugarProibido('src/worker/index.ts', '')).toBe(true);
    expect(lugarProibido('src/app/(painel)/x/acoes.ts', "'use server';\nexport async function f() {}")).toBe(true);
    expect(lugarProibido(CRIAR, 'export async function criar() {}')).toBe(false);
  });
});

describe('SB-07: criar.ts grava a coluna com o tipo obrigatório e o nome da linha travada', () => {
  const f = ler(CRIAR);

  it('o insert usa uma linha tipada com a coluna obrigatória, calculada por caminhosComNomeNaCriacao(textos, nomes)', () => {
    expect(f).toMatch(/typeof pacoteDecisao\.\$inferInsert\s*&\s*\{\s*caminhosComNomeNaCriacao:\s*string\[\]\s*\}/);
    expect(f).toMatch(/caminhosComNomeNaCriacao:\s*caminhosComNomeNaCriacao\(textos,\s*nomes\)/);
    expect(f).toMatch(/\.insert\(pacoteDecisao\)\.values\(linha\)/);
    expect(f.match(/\.insert\(/g)).toHaveLength(1);
  });

  it('o nome vem só da linha devolvida por travarDemanda, numa chamada só', () => {
    expect(f).toMatch(/const d = await travarDemanda\(tx, demandaId\)/);
    expect(f.match(/nomesDoSolicitante\(/g)).toHaveLength(1);
    expect(f).toMatch(/nomesDoSolicitante\(d\.solicitanteNome\)/);
    expect(f).toMatch(/textosDaCriacao\(/);
  });

  it('as regras pegam o caso plantado', () => {
    expect('const linha: typeof pacoteDecisao.$inferInsert = { id };').not.toMatch(/typeof pacoteDecisao\.\$inferInsert\s*&\s*\{\s*caminhosComNomeNaCriacao:\s*string\[\]\s*\}/);
    expect('caminhosComNomeNaCriacao: entrada.caminhosComNomeNaCriacao,').not.toMatch(/caminhosComNomeNaCriacao:\s*caminhosComNomeNaCriacao\(textos,\s*nomes\)/);
    expect('nomesDoSolicitante(await nomeAtual(db, id))').not.toMatch(/nomesDoSolicitante\(d\.solicitanteNome\)/);
  });
});
