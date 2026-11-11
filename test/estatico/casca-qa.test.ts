// Escrito na 06-T05-testes (qa-automacao), pedido 0015. Fecha, por leitura do código, o que os testes da construção da
// T05 deixam aberto na casca do painel:
//   - CA-03.2 e CA-03.3: no layout do painel, "Pular para o conteúdo" vem antes da casca, e os avisos da moldura
//     (agentes suspensos e capacidade de ids) ficam na coluna do conteúdo, acima do `main#conteudo`, com as mesmas três
//     props de hoje; sem sessão, só o conteúdo;
//   - G3.4 do plano: a trava de rolagem e o estado da gaveta são classe (`classList`), nunca `element.style`;
//   - RNF-11: a única animação do painel tem até 200 ms, e o bloco de prefers-reduced-motion zera animação e transição;
//   - a gaveta é modal (`showModal()`, que deixa a página atrás inerte), e o id dela é um só no header, no CSS e no
//     `aria-controls`;
//   - a regra do foco no h1 roda uma vez só (um `FocoNaTrocaDeTela` em todo o app), e "Sair" é um componente só, usado
//     pelo menu lateral e pela gaveta.
import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const ler = (a: string) => readFileSync(`${raiz}${a}`, 'utf8');
const semComentario = (fonte: string) => fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const CASCA = [...globSync('src/components/casca/**/*.{ts,tsx}', { cwd: raiz }), 'src/components/CabecalhoPainel.tsx']
  .filter((a) => !/\.test\.tsx?$/.test(a))
  .sort();
const APP = globSync('src/**/*.tsx', { cwd: raiz })
  .filter((a) => !/\.test\.tsx?$/.test(a))
  .sort();

// G3.4: estado visual por classe, nunca por `element.style` (nem atribuição, nem setProperty, nem cssText).
export function mexeEmStyle(fonte: string): boolean {
  return /\.style\b/.test(semComentario(fonte));
}

describe('layout do painel: ordem da moldura (CA-03.2, CA-03.3)', () => {
  const layout = semComentario(ler('src/app/(painel)/layout.tsx'));

  it('"Pular para o conteúdo" antes da casca; avisos na coluna do conteúdo, acima do main#conteudo', () => {
    const pular = layout.indexOf('href="#conteudo"');
    const casca = layout.indexOf('<CabecalhoPainel ');
    const avisos = layout.indexOf(
      '<AvisosDaMoldura tetoMensal={moldura.tetoMensal} suspenso={moldura.suspenso} totalDemandas={moldura.totalDemandas} />',
    );
    const main = layout.indexOf('<main id="conteudo" tabIndex={-1}');
    const conteudo = layout.indexOf('{children}', main);
    expect([pular, casca, avisos, main, conteudo].every((p) => p >= 0), `${pular} ${casca} ${avisos} ${main} ${conteudo}`).toBe(true);
    expect(pular).toBeLessThan(casca);
    expect(casca).toBeLessThan(avisos);
    expect(avisos).toBeLessThan(main);
    expect(main).toBeLessThan(conteudo);
    expect(layout.match(/<AvisosDaMoldura\b/g)).toHaveLength(1);
    expect(layout.match(/<main\b/g)).toHaveLength(1);
  });

  it('sem sessão, só o conteúdo: nem casca, nem avisos (a página redireciona, C-04)', () => {
    expect(layout).toMatch(/if \(!moldura\) return <>\{children\}<\/>;/);
  });
});

describe('gaveta: estado por classe, modal e um id só (G3.4, ADR-15)', () => {
  it('a regra reprova `element.style` plantado e deixa passar classList e comentário', () => {
    expect(mexeEmStyle("document.documentElement.style.overflow = 'hidden';")).toBe(true);
    expect(mexeEmStyle("el.style.setProperty('overflow', 'hidden');")).toBe(true);
    expect(mexeEmStyle("document.documentElement.classList.add('gaveta-aberta');")).toBe(false);
    expect(mexeEmStyle('// nunca element.style\nconst a = 1;')).toBe(false);
  });

  it('nenhum arquivo da casca mexe em `.style` nem usa `style=`', () => {
    expect(CASCA.filter((a) => mexeEmStyle(ler(a)))).toEqual([]);
    expect(CASCA.filter((a) => /\bstyle\s*=/.test(semComentario(ler(a))))).toEqual([]);
  });

  it('a trava de rolagem é a classe do CSS: posta ao abrir e tirada ao fechar e ao sair da tela', () => {
    const gaveta = semComentario(ler('src/components/casca/GavetaMenu.tsx'));
    const classe = gaveta.match(/const CLASSE_ABERTA = '([^']+)';/)?.[1];
    expect(classe).toBe('gaveta-aberta');
    expect(gaveta.match(/document\.documentElement\.classList\.add\(CLASSE_ABERTA\)/g)).toHaveLength(1);
    expect(gaveta.match(/document\.documentElement\.classList\.remove\(CLASSE_ABERTA\)/g)).toHaveLength(2);
    const css = ler('src/app/globals.css');
    expect(css).toMatch(new RegExp(`html\\.${classe}\\s*\\{\\s*overflow:\\s*hidden;\\s*\\}`));
  });

  it('a gaveta abre como modal (showModal), nunca com show() nem com o atributo open no JSX', () => {
    const gaveta = semComentario(ler('src/components/casca/GavetaMenu.tsx'));
    expect(gaveta).toMatch(/\.showModal\(\)/);
    expect(gaveta).not.toMatch(/\.show\(\)/);
    expect(gaveta).not.toMatch(/<dialog[^>]*\bopen\b/);
  });

  it('o id da gaveta é um só: o do <dialog>, o do aria-controls do "Menu" e o do CSS', () => {
    const gaveta = semComentario(ler('src/components/casca/GavetaMenu.tsx'));
    const id = gaveta.match(/export const ID_GAVETA = '([^']+)';/)?.[1];
    expect(id).toBe('gaveta-menu');
    expect(gaveta).toMatch(/<dialog[\s\S]*?id=\{ID_GAVETA\}/);
    expect(semComentario(ler('src/components/CabecalhoPainel.tsx'))).toMatch(/aria-controls=\{ID_GAVETA\}/);
    const css = ler('src/app/globals.css');
    expect(css).toMatch(new RegExp(`dialog#${id}\\[open\\]\\s*\\{`));
    expect(css).toMatch(new RegExp(`dialog#${id}::backdrop\\s*\\{`));
  });

  it('a gaveta fecha a partir do mesmo ponto de quebra do menu lateral (md: = 768 px)', () => {
    const gaveta = semComentario(ler('src/components/casca/GavetaMenu.tsx'));
    expect(gaveta).toMatch(/const LARGURA_DO_MENU_LATERAL = '\(min-width: 768px\)';/);
    // O `md:` do Tailwind 4 é o padrão (48rem): o @theme não o redefine.
    expect(ler('src/app/globals.css')).not.toMatch(/--breakpoint-md\s*:/);
  });
});

describe('movimento (RNF-11): até 200 ms, e nada com prefers-reduced-motion', () => {
  const css = ler('src/app/globals.css');

  it('cada animação do CSS dura no máximo 200 ms', () => {
    const duracoes = [...css.matchAll(/\banimation:\s*[\w-]+\s+(\d+(?:\.\d+)?)(ms|s)\b/g)].map((m) => Number(m[1]) * (m[2] === 's' ? 1000 : 1));
    expect(duracoes.length).toBeGreaterThanOrEqual(1);
    for (const d of duracoes) expect(d).toBeLessThanOrEqual(200);
  });

  it('o bloco prefers-reduced-motion zera animação e transição de todo elemento', () => {
    const bloco = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n {2}\}/)?.[1] ?? '';
    expect(bloco).toMatch(/\*,\s*\*::before,\s*\*::after\s*\{/);
    expect(bloco).toMatch(/animation-duration:\s*0\.01ms !important;/);
    expect(bloco).toMatch(/animation-iteration-count:\s*1 !important;/);
    expect(bloco).toMatch(/transition-duration:\s*0\.01ms !important;/);
  });

  it('o véu da gaveta usa token, não hexadecimal (RF-01)', () => {
    const veu = css.match(/dialog#gaveta-menu::backdrop\s*\{([^}]*)\}/)?.[1] ?? '';
    expect(veu).toMatch(/color-mix\(in srgb, var\(--color-tinta\) 50%, transparent\)/);
    expect(veu).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});

describe('uma regra de foco e um "Sair" para toda a casca', () => {
  const quemUsa = (componente: string) =>
    APP.flatMap((a) => {
      const n = semComentario(ler(a)).match(new RegExp(`<${componente}\\b`, 'g'))?.length ?? 0;
      return n > 0 ? [`${a}: ${n}`] : [];
    });

  it('o FocoNaTrocaDeTela aparece uma vez só no app, no header da casca (a regra não roda duas vezes)', () => {
    expect(quemUsa('FocoNaTrocaDeTela')).toEqual(['src/components/CabecalhoPainel.tsx: 1']);
  });

  it('o BotaoSair é usado só pelo menu lateral e pela gaveta, uma vez em cada', () => {
    expect(quemUsa('BotaoSair')).toEqual(['src/components/CabecalhoPainel.tsx: 1', 'src/components/casca/GavetaMenu.tsx: 1']);
  });

  it('a gaveta é montada uma vez só, logo depois do header', () => {
    expect(quemUsa('GavetaMenu')).toEqual(['src/components/CabecalhoPainel.tsx: 1']);
    const cab = semComentario(ler('src/components/CabecalhoPainel.tsx'));
    expect(cab.indexOf('</header>')).toBeLessThan(cab.indexOf('<GavetaMenu '));
  });
});
