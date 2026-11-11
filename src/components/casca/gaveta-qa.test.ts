// Escrito na 06-T05-testes (qa-automacao), pedido 0015. Fecha o que os testes da construção deixam aberto na gaveta e
// nos itens do menu, sem DOM (HTML do servidor e chamada direta dos manipuladores):
//   - a gaveta aberta (03, 3.3): a ordem marca, "Fechar menu", nav "Principal", conta e "Sair"; a marca SEM link
//     (o único `href="/demandas"` é o item "Demandas"); ícones fora da leitura; um item atual só;
//   - ItensDoMenu: `aoEscolher` recebe o `href` do item ativado (é por ele que a gaveta decide para onde vai o foco), e
//     o menu lateral, sem `aoEscolher`, não intercepta o clique.
import { createElement as h, isValidElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { GavetaMenu } from './GavetaMenu';
import { ItensDoMenu } from './ItensDoMenu';
import { LINKS } from './navegacao';

vi.mock('next/navigation', () => ({
  usePathname: () => '/demandas',
  useRouter: () => ({ replace: () => undefined, refresh: () => undefined, push: () => undefined }),
}));

const CONTA = 'Pessoa Ficticia CTO (CTO)';

const gavetaAberta = (caminho: string | null) =>
  renderToStaticMarkup(h(GavetaMenu, { aberta: true, caminho, conta: CONTA, botaoMenu: { current: null }, aoFechar: () => undefined }));

type Elemento = ReactElement<Record<string, unknown> & { children?: unknown }>;

// Os elementos da árvore com a prop `href` (os `Link` dos itens), sem renderizar.
function comHref(raiz: unknown): Elemento[] {
  const achados: Elemento[] = [];
  const visitar = (n: unknown): void => {
    if (Array.isArray(n)) {
      for (const x of n) visitar(x);
      return;
    }
    if (!isValidElement(n)) return;
    const el = n as Elemento;
    if (typeof el.props.href === 'string') achados.push(el);
    visitar(el.props.children);
  };
  visitar(raiz);
  return achados;
}

describe('gaveta aberta (03, 3.3; D-09): conteúdo, ordem e marca sem link', () => {
  it('na ordem: marca sem link, "Fechar menu", nav "Principal" com os três itens, conta e "Sair"', () => {
    const s = gavetaAberta('/demandas/nova');
    expect(s).toMatch(/^<dialog id="gaveta-menu" aria-label="Menu"/);
    const posicoes = [
      s.indexOf('>WS</span>'),
      s.indexOf('id="gaveta-menu-fechar"'),
      s.indexOf('aria-label="Principal"'),
      s.indexOf('href="/demandas"'),
      s.indexOf('href="/demandas/nova"'),
      s.indexOf('href="/configuracao/agentes"'),
      s.indexOf(CONTA),
      s.indexOf('>Sair</button>'),
    ];
    expect(posicoes.every((p) => p >= 0), `posições ${posicoes.join(', ')}`).toBe(true);
    expect([...posicoes].sort((a, b) => a - b)).toEqual(posicoes);
  });

  it('a marca da gaveta não é link: o único href para /demandas é o item "Demandas" (CV-19)', () => {
    const s = gavetaAberta('/demandas');
    expect(s.match(/href="\/demandas"/g)).toHaveLength(1);
    expect(s).toMatch(/href="\/demandas"[^>]*>(?:<svg[\s\S]*?<\/svg>)?Demandas<\/a>/);
    expect(s).toMatch(/<p class="[^"]*"><span[^>]*>WS<\/span>/);
    expect(s.match(/<a\b/g)).toHaveLength(LINKS.length);
  });

  it('"Fechar menu" é botão com texto visível e ícone fora da leitura; todo SVG da gaveta é aria-hidden', () => {
    const s = gavetaAberta('/demandas');
    expect(s).toMatch(/<button type="button"[^>]*id="gaveta-menu-fechar"[^>]*><svg[^>]*aria-hidden="true"[\s\S]*?<\/svg>Fechar menu<\/button>/);
    expect(s.match(/<svg\b/g)?.length).toBe(LINKS.length + 1);
    expect(s.match(/<svg\b(?![^>]*aria-hidden="true")/g)).toBeNull();
  });

  it.each([
    ['/demandas', 'Demandas'],
    ['/demandas/nova', 'Nova demanda'],
    ['/configuracao/agentes', 'Agentes e teto'],
    ['/pacotes-decisao/DEC-DEM-20261110-0001-v1', 'Demandas'],
  ])('em %s, um item atual só, o "%s"', (caminho, atual) => {
    const s = gavetaAberta(caminho);
    expect(s.match(/aria-current="page"/g)).toHaveLength(1);
    expect(s).toMatch(new RegExp(`<a aria-current="page"[^>]*>(?:<svg[\\s\\S]*?</svg>)?${atual}</a>`));
  });

  it('fora do painel (caminho nulo), nenhum item atual, e a conta e "Sair" continuam', () => {
    const s = gavetaAberta(null);
    expect(s).not.toContain('aria-current');
    expect(s).toContain(CONTA);
    expect(s.match(/>Sair<\/button>/g)).toHaveLength(1);
  });

  it('o texto da conta chega por prop e sai escapado (nada de HTML vindo do nome)', () => {
    const s = renderToStaticMarkup(
      h(GavetaMenu, { aberta: true, caminho: '/demandas', conta: '<img src=x onerror=alert(1)> (CTO)', botaoMenu: { current: null }, aoFechar: () => undefined }),
    );
    expect(s).not.toContain('<img');
    expect(s).toContain('&lt;img src=x onerror=alert(1)&gt; (CTO)');
  });
});

describe('ItensDoMenu: quem decide o foco recebe o href ativado', () => {
  it('com aoEscolher (gaveta), cada item avisa o próprio href', () => {
    const escolhidos: string[] = [];
    const itens = comHref(ItensDoMenu({ caminho: '/demandas', aoEscolher: (href) => escolhidos.push(href) }));
    expect(itens.map((i) => i.props.href)).toEqual(LINKS.map((l) => l.href));
    for (const i of itens) (i.props.onClick as () => void)();
    expect(escolhidos).toEqual(['/demandas', '/demandas/nova', '/configuracao/agentes']);
  });

  it('sem aoEscolher (menu lateral), nenhum item intercepta o clique', () => {
    const itens = comHref(ItensDoMenu({ caminho: '/demandas' }));
    expect(itens).toHaveLength(LINKS.length);
    expect(itens.map((i) => i.props.onClick)).toEqual([undefined, undefined, undefined]);
  });
});
