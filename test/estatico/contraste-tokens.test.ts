// test/estatico/contraste-tokens.test.ts — RNF-01 (texto ≥ 4,5:1) e RNF-02 (não textual ≥ 3:1) sobre os tokens do
// @theme. É a fonte final das razões da 03, 2.2 (P-03 da 03): par abaixo do mínimo volta à ux-ui-design, sem trocar
// cor aqui.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const css = readFileSync(fileURLToPath(new URL('../../src/app/globals.css', import.meta.url)), 'utf8');
const TOKENS = Object.fromEntries([...css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6});/gi)].map((m) => [m[1]!, m[2]!.toLowerCase()]));

const canal = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminancia = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
};
export const razao = (a: string, b: string) => {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p) as [number, number];
  return (x + 0.05) / (y + 0.05);
};
const cor = (t: string) => {
  const v = TOKENS[t];
  if (!v) throw new Error(`token --color-${t} ausente no @theme`);
  return v;
};

// 03, 2.2: [texto, fundo]
const TEXTO: ReadonlyArray<readonly [string, string]> = [
  ['tinta', 'branco'], ['tinta', 'superficie'], ['tinta', 'nevoa'],
  ['tinta-media', 'branco'], ['tinta-media', 'superficie'], ['tinta-media', 'nevoa'], ['tinta-media', 'selo-cinza-fundo'],
  ['marinho', 'branco'], ['marinho', 'superficie'], ['marinho', 'nevoa'], ['marinho', 'selo-marinho-fundo'],
  ['acao-escura', 'branco'], ['acao-escura', 'superficie'], ['acao-escura', 'nevoa'],
  ['branco', 'acao'], ['branco', 'acao-escura'], ['branco', 'marinho'], ['branco', 'marinho-luz'], ['branco', 'selo-verde'],
  ['texto-claro', 'marinho'], ['texto-claro', 'marinho-luz'], ['texto-claro-apoio', 'marinho'], ['azul-claro', 'marinho'],
  ['erro', 'branco'], ['erro', 'erro-fundo'], ['atencao', 'atencao-fundo'], ['atencao', 'branco'],
  ['positivo', 'positivo-fundo'], ['positivo', 'branco'],
  ['selo-violeta', 'selo-violeta-fundo'], ['selo-petroleo', 'selo-petroleo-fundo'], ['selo-verde', 'selo-verde-fundo'],
  ['selo-verde', 'branco'], ['selo-laranja', 'selo-laranja-fundo'],
];
// 03, 2.2: [elemento, fundo vizinho]
const NAO_TEXTUAL: ReadonlyArray<readonly [string, string]> = [
  ['tinta-suave', 'branco'], ['tinta-suave', 'superficie'], ['acao', 'branco'], ['marinho', 'branco'],
  ['acao-escura', 'branco'], ['acao-escura', 'superficie'], ['acao-escura', 'nevoa'],
  ['branco', 'marinho'], ['branco', 'marinho-luz'], ['azul-claro', 'marinho-luz'], ['azul-claro', 'marinho'],
];
// 03, 2.2: pares vetados — o teste prova que continuam abaixo (e por isso nunca podem ser usados como texto).
const VETADOS: ReadonlyArray<readonly [string, string, number]> = [
  ['acao', 'marinho', 4.5], ['acao', 'tinta', 4.5], ['azul-claro', 'marinho-luz', 4.5], ['tinta-suave', 'superficie', 4.5], ['linha', 'branco', 3],
];

describe('contraste dos tokens (RNF-01, RNF-02)', () => {
  it('a fórmula: preto sobre branco dá 21', () => expect(razao('#000000', '#ffffff')).toBeCloseTo(21, 5));
  it.each(TEXTO)('texto %s sobre %s ≥ 4,5:1', (a, b) => expect(razao(cor(a), cor(b))).toBeGreaterThanOrEqual(4.5));
  it.each(NAO_TEXTUAL)('elemento %s sobre %s ≥ 3:1', (a, b) => expect(razao(cor(a), cor(b))).toBeGreaterThanOrEqual(3));
  it.each(VETADOS)('vetado %s sobre %s fica abaixo de %d', (a, b, minimo) => expect(razao(cor(a), cor(b))).toBeLessThan(minimo));
});
