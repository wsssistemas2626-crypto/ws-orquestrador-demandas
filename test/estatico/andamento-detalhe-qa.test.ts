// Escrito na 06-T13-testes (qa-automacao), T13 do DEC-DEM-20261111-0017-v1 (M3 da 06-T13-tech-lead; plano, T13, passo 1):
// a varredura de `style=` do CV-02 é a de test/estatico/sem-recurso-externo.test.ts (regra "style={", em todo
// src/**/*.tsx pelo glob, sem lista). Este arquivo prende que ela enxerga SecaoAndamento.tsx sozinha e confere, no
// próprio arquivo, o que a regra de lá não pega: `style="…"` em texto e a barra sem animação nem transição (03, 5.3).
// Cada regra tem um teste que prova que ela pega a forma proibida e deixa passar a permitida.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const SECAO = 'src/app/(painel)/demandas/[id]/SecaoAndamento.tsx';
// O código sem os comentários de bloco e de linha inteira: o comentário pode citar o que o código não faz.
const codigo = (arquivo: string) =>
  readFileSync(`${raiz}${arquivo}`, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const ESTILO_EM_LINHA = /\bstyle\s*=/;
const ANIMACAO = /\banimate-|\btransition\b|\btransition-|\bduration-/;

describe('CV-02: a seção "Andamento da construção" sem estilo em linha', () => {
  it('a varredura de sem-recurso-externo.test.ts enxerga SecaoAndamento.tsx pelo glob, e a regra "style={" vale para ela', () => {
    const arquivos = globSync('src/**/*.{ts,tsx,css}', { cwd: raiz }).filter((a) => !/\.test\.tsx?$/.test(a));
    expect(arquivos).toContain(SECAO);
    // O filtro de arquivos da regra "style={" de lá.
    expect(SECAO).toMatch(/^src\/.*\.tsx$/);
  });

  it('SecaoAndamento.tsx: nenhum style= (objeto ou texto) e nenhuma animação ou transição na barra', () => {
    const fonte = codigo(SECAO);
    expect(fonte).toContain('<progress');
    expect(fonte).not.toMatch(ESTILO_EM_LINHA);
    expect(fonte).not.toMatch(ANIMACAO);
    expect(fonte).not.toContain('dangerouslySetInnerHTML');
  });

  it('as regras pegam o que dizem pegar', () => {
    for (const t of ['<progress style={{ width: "50%" }} />', '<div style="width: 50%">', '<p style = {x}>']) expect(t).toMatch(ESTILO_EM_LINHA);
    for (const t of ['className="animate-pulse"', 'className="transition-all"', 'className="transition"', 'className="duration-300"']) expect(t).toMatch(ANIMACAO);
    const barra = 'h-2 w-full appearance-none overflow-hidden rounded-full border-0 bg-linha [&::-webkit-progress-bar]:bg-linha [&::-webkit-progress-value]:bg-acao [&::-moz-progress-bar]:bg-acao';
    expect(barra).not.toMatch(ANIMACAO);
    expect(`<progress className="${barra}">`).not.toMatch(ESTILO_EM_LINHA);
  });
});
