// test/estatico/caminhos-da-criacao-qa.test.ts — 06-T04-testes do DEC-DEM-20261111-0018-v1 (qa-automacao; SB-07). Guardas
// adversariais da marcação da criação, além de test/estatico/caminhos-da-criacao.test.ts (que deixa criar.ts inteiro
// citar a chave):
// (1) ExtrasDoPacote não tem a chave, e tem só os três campos de hoje (o SB-07 o põe entre os lugares proibidos; parecer
//     Minor da 06-T04-revisao);
// (2) em criar.ts, a chave aparece em exatamente três linhas: o import, o tipo da linha e o valor calculado. Um
//     `extras.caminhosComNomeNaCriacao ?? …` ou `entrada.caminhos…` faria uma quarta linha;
// (3) a linha do insert é campo a campo: o único espalhamento é `...autoria`, e de `extras` só sai o execucaoAgenteId;
// (4) a ordem dentro da transação: trava → ESP e RSK citados → textos e nome da linha travada → linha → insert; a ESP e o
//     RSK da marcação são os citados, lidos pela transação;
// (5) a marcação só é calculada em criar.ts, e textosDaCriacao só é chamada lá (uma fonte só);
// (6) o tipo da linha não compila sem a coluna nem com null (conferido pelo pnpm typecheck, com @ts-expect-error).
// Cada regra tem um caso plantado que a reprova. Não importa de outro *.test.ts.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { pacoteDecisao } from '../../src/db/schema';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');
const codigoQueRoda = globSync('{src,scripts}/**/*.{ts,tsx,mjs,js}', { cwd: raiz })
  .filter((a) => !/\.test\.tsx?$/.test(a))
  .sort();

const CRIAR = 'src/modules/pacotes-decisao/criar.ts';
const RE_CHAVE = /caminhos_?com_?nome/i;

// --- ajudantes puros (os casos plantados passam por eles) ---

function camposDeExtras(fonte: string): string[] | null {
  const m = /export type ExtrasDoPacote = \{([^}]*)\}/.exec(fonte);
  return m ? [...m[1]!.matchAll(/(\w+)\??\s*:/g)].map((x) => x[1]!) : null;
}
const extrasCitaAChave = (fonte: string): boolean => RE_CHAVE.test(/export type ExtrasDoPacote = \{([^}]*)\}/.exec(fonte)?.[1] ?? '');

const linhasQueCitamAChave = (fonte: string): string[] =>
  fonte
    .split('\n')
    .filter((l) => RE_CHAVE.test(l))
    .map((l) => l.trim());

// O literal da linha do insert: de `const linha:` até o `};` que fecha o objeto.
function blocoDaLinha(fonte: string): string | null {
  const inicio = fonte.indexOf('const linha:');
  if (inicio < 0) return null;
  const fim = fonte.indexOf('\n    };', inicio);
  return fim < 0 ? null : fonte.slice(inicio, fim);
}
const espalhamentos = (bloco: string): string[] => [...bloco.matchAll(/\.\.\.\s*([\w.]+)/g)].map((m) => m[1]!);
const usosDeExtras = (bloco: string): string[] => bloco.match(/extras\??\.\w+/g) ?? [];

// Posição de cada marco em criar.ts; -1 se não existe.
const MARCOS = [
  'const d = await travarDemanda(tx, demandaId);',
  'if (!esp || !rsk) {',
  'const textos = textosDaCriacao({',
  'esp: await obterEspecificacao(tx, esp.id),',
  'rsk: await obterParecerRisco(tx, rsk.id),',
  'const nomes = nomesDoSolicitante(d.solicitanteNome);',
  'const linha: typeof pacoteDecisao.$inferInsert & { caminhosComNomeNaCriacao: string[] } = {',
  'caminhosComNomeNaCriacao: caminhosComNomeNaCriacao(textos, nomes),',
  'await tx.insert(pacoteDecisao).values(linha);',
] as const;
const posicoes = (fonte: string): number[] => MARCOS.map((m) => fonte.indexOf(m));
const emOrdem = (p: readonly number[]): boolean => p.every((x, i) => x >= 0 && (i === 0 || x > p[i - 1]!));

// Chamada (e não a declaração) de uma função.
const chamaA = (nome: string, fonte: string): boolean => new RegExp(`(?<!function )\\b${nome}\\(`).test(fonte);

describe('SB-07 (qa): ExtrasDoPacote fica sem a chave da coluna', () => {
  const f = ler(CRIAR);

  it('ExtrasDoPacote tem só execucaoAgenteId, especificacaoId e parecerRiscoId, e não cita a chave', () => {
    expect(camposDeExtras(f)).toEqual(['execucaoAgenteId', 'especificacaoId', 'parecerRiscoId']);
    expect(extrasCitaAChave(f)).toBe(false);
  });

  it('ExtrasDoPacote só é declarado em criar.ts, e ninguém o estende com &', () => {
    const fontes = codigoQueRoda.map((a) => [a, ler(a)] as const);
    expect(fontes.filter(([, s]) => /type ExtrasDoPacote\b/.test(s)).map(([a]) => a)).toEqual([CRIAR]);
    expect(fontes.filter(([, s]) => /ExtrasDoPacote\s*&|&\s*ExtrasDoPacote/.test(s)).map(([a]) => a)).toEqual([]);
  });

  it('as regras pegam o caso plantado', () => {
    const plantado = 'export type ExtrasDoPacote = { execucaoAgenteId?: string; caminhosComNomeNaCriacao?: string[] };';
    expect(extrasCitaAChave(plantado)).toBe(true);
    expect(camposDeExtras(plantado)).toEqual(['execucaoAgenteId', 'caminhosComNomeNaCriacao']);
    expect(extrasCitaAChave('export type ExtrasDoPacote = { execucaoAgenteId?: string };')).toBe(false);
    expect(camposDeExtras('export type Outro = { a: string };')).toBeNull();
  });
});

describe('SB-07 (qa): em criar.ts, a chave só no import, no tipo da linha e no valor calculado', () => {
  const f = ler(CRIAR);

  it('exatamente três linhas citam a chave, e são estas', () => {
    expect(linhasQueCitamAChave(f)).toEqual([
      "import { caminhosComNomeNaCriacao } from '../pedido-construcao/caminhos-da-criacao';",
      'const linha: typeof pacoteDecisao.$inferInsert & { caminhosComNomeNaCriacao: string[] } = {',
      'caminhosComNomeNaCriacao: caminhosComNomeNaCriacao(textos, nomes),',
    ]);
  });

  it('a linha do insert é campo a campo: só ...autoria espalhado, e de extras só o execucaoAgenteId', () => {
    const bloco = blocoDaLinha(f);
    expect(bloco).not.toBeNull();
    expect(espalhamentos(bloco!)).toEqual(['autoria']);
    expect(usosDeExtras(bloco!)).toEqual(['extras.execucaoAgenteId']);
    expect(bloco).not.toMatch(/entrada\??\.\s*caminhos/i);
    expect(linhasQueCitamAChave(bloco!)).toHaveLength(2);
  });

  it('as regras pegam o caso plantado', () => {
    expect(linhasQueCitamAChave(`${f}\n    const c = extras.caminhosComNomeNaCriacao ?? [];`)).toHaveLength(4);
    expect(linhasQueCitamAChave('// caminhos_com_nome_na_criacao em comentário também conta')).toHaveLength(1);
    expect(espalhamentos('const linha: X = {\n  ...entrada,\n  ...autoria,')).toEqual(['entrada', 'autoria']);
    expect(espalhamentos('const linha: X = {\n  ...extras.x,')).toEqual(['extras.x']);
    expect(usosDeExtras('execucaoAgenteId: extras.execucaoAgenteId ?? null,\n  c: extras?.caminhosComNomeNaCriacao,')).toEqual([
      'extras.execucaoAgenteId',
      'extras?.caminhosComNomeNaCriacao',
    ]);
    expect(blocoDaLinha('sem a linha')).toBeNull();
  });
});

describe('SB-07 (qa): a ordem na transação e a fonte dos textos e do nome', () => {
  const f = ler(CRIAR);

  it('trava → ESP e RSK citados → textos (pela transação) → nome da linha travada → linha → insert', () => {
    const p = posicoes(f);
    expect(p.map((x, i) => [MARCOS[i], x >= 0])).toEqual(MARCOS.map((m) => [m, true]));
    expect(emOrdem(p)).toBe(true);
  });

  it('a marcação só é calculada em criar.ts, e textosDaCriacao só é chamada lá', () => {
    const fontes = codigoQueRoda.map((a) => [a, ler(a)] as const);
    expect(fontes.filter(([, s]) => chamaA('caminhosComNomeNaCriacao', s)).map(([a]) => a)).toEqual([CRIAR]);
    expect(fontes.filter(([, s]) => chamaA('textosDaCriacao', s)).map(([a]) => a)).toEqual([CRIAR]);
  });

  it('as regras pegam o caso plantado', () => {
    // O nome lido antes da trava, ou a ESP mais nova lida fora da transação.
    const nomeAntes = f.replace('const nomes = nomesDoSolicitante(d.solicitanteNome);', '').replace('const d = await travarDemanda(tx, demandaId);', 'const nomes = nomesDoSolicitante(d.solicitanteNome);\n    const d = await travarDemanda(tx, demandaId);');
    expect(emOrdem(posicoes(nomeAntes))).toBe(false);
    expect(emOrdem(posicoes(f.replace('obterEspecificacao(tx, esp.id)', 'obterEspecificacao(deps.db, esp.id)')))).toBe(false);
    expect(emOrdem(posicoes(f.replace('caminhosComNomeNaCriacao(textos, nomes)', '[]')))).toBe(false);
    expect(chamaA('caminhosComNomeNaCriacao', 'export function caminhosComNomeNaCriacao(textos, nomes) {}')).toBe(false);
    expect(chamaA('caminhosComNomeNaCriacao', 'const c = caminhosComNomeNaCriacao(t, []);')).toBe(true);
    expect(chamaA('textosDaCriacao', 'return textosDaCriacao({ dec, esp, rsk });')).toBe(true);
  });
});

// O tipo da linha que criar.ts usa (conferido como texto acima): sem a coluna ou com null, não compila.
type LinhaDoInsert = typeof pacoteDecisao.$inferInsert & { caminhosComNomeNaCriacao: string[] };

describe('SB-07 (qa): o tipo da linha do insert torna a coluna obrigatória e não nula', () => {
  it('sem a coluna e com null não compilam (pnpm typecheck); com a lista, compila', () => {
    const coluna = (l: LinhaDoInsert): unknown => l.caminhosComNomeNaCriacao;
    const semColuna = { id: 'DEC-DEM-20261114-0001-v1' } as Omit<LinhaDoInsert, 'caminhosComNomeNaCriacao'>;
    // @ts-expect-error SB-07: a linha sem a coluna não compila
    expect(coluna(semColuna)).toBeUndefined();
    // @ts-expect-error SB-07: a coluna nula não compila
    expect(coluna({ ...semColuna, caminhosComNomeNaCriacao: null })).toBeNull();
    expect(coluna({ ...semColuna, caminhosComNomeNaCriacao: ['demanda.titulo'] })).toEqual(['demanda.titulo']);
  });
});
