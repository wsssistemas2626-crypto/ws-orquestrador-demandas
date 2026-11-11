// T04 (RF-13; C03 e C05 do 02): a marca e a moldura pública no HTML do servidor. A marca é texto ("WS", "Orquestrador",
// "de Demandas"), sem imagem nem script; como link, só leva à constante '/demandas' (CV-19). Na moldura, T01 e T02 têm a
// marca sem link (C-40: nada novo para onde voltar depois do login) e Sem permissão, erro e 404 têm a marca como link.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import PaginaConfigurar2fa from '../../app/configurar-2fa/page';
import PaginaEntrar from '../../app/entrar/page';
import ErroAoCarregar from '../../app/error';
import NaoEncontrada from '../../app/not-found';
import SemPermissao from '../../app/sem-permissao/page';
import { MarcaWs } from '../marca/MarcaWs';
import { MolduraPublica } from './MolduraPublica';

// O 404 da raiz chama `connection()` para ser renderizado a cada requisição; fora do Next não há requisição.
vi.mock('next/server', () => ({ connection: async () => undefined }));
// Fora do Next não há roteador montado; o HTML do primeiro estado não navega.
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: () => undefined }) }));
// A guarda da T02 é provada em configurar-2fa/pagina-qa.test.ts; aqui só interessa a moldura.
vi.mock('../../modules/acesso/exigir-pessoa', () => ({
  exigirSessaoParaConfigurar2fa: async () => ({ usuarioId: 'usuario-ficticio', nome: 'Pessoa Ficticia' }),
}));

const marca = (p: Parameters<typeof MarcaWs>[0]) => renderToStaticMarkup(h(MarcaWs, p));
// O texto visível, sem as marcas: é dele que sai o nome acessível do link.
const texto = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const links = (s: string) => [...s.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ href: m[1]!, texto: texto(m[2]!) }));
const LINK_DA_MARCA = { href: '/demandas', texto: 'WS Orquestrador de Demandas' };

describe('MarcaWs (C03)', () => {
  it('o texto da marca é "WS Orquestrador de Demandas", com "WS" num bloco próprio', () => {
    for (const variante of ['clara', 'escura'] as const) {
      const s = marca({ variante });
      expect(texto(s)).toBe('WS Orquestrador de Demandas');
      expect(s).toMatch(/>WS<\/span>/);
      expect(s).toMatch(/>Orquestrador<\/span>/);
      expect(s).toMatch(/>de Demandas<\/span>/);
    }
  });

  it('sem link por padrão; com link, só para /demandas e com o nome do próprio texto', () => {
    expect(marca({ variante: 'clara' })).not.toContain('<a');
    expect(links(marca({ variante: 'clara', comLink: true }))).toEqual([LINK_DA_MARCA]);
    expect(links(marca({ variante: 'escura', comLink: true }))).toEqual([LINK_DA_MARCA]);
    expect(links(marca({ variante: 'escura', compacta: true, comLink: true }))).toEqual([LINK_DA_MARCA]);
  });

  it('o link tem alvo de 44 px e não leva aria-label (o nome é o texto visível, WCAG 2.5.3)', () => {
    const s = marca({ variante: 'clara', comLink: true });
    expect(s).toMatch(/<a [^>]*class="[^"]*\bmin-h-11\b/);
    expect(s).not.toContain('aria-label');
  });

  it('cores por token (03, 3.2): clara com quadrado marinho; escura com quadrado superficie e texto claro', () => {
    const clara = marca({ variante: 'clara' });
    expect(clara).toMatch(/class="[^"]*\bbg-marinho\b[^"]*\btext-branco\b[^"]*"[^>]*>WS</);
    expect(clara).toMatch(/class="[^"]*\btext-marinho\b[^"]*"[^>]*>Orquestrador</);
    expect(clara).toMatch(/class="[^"]*\btext-tinta-media\b[^"]*"[^>]*>de Demandas</);
    const escura = marca({ variante: 'escura' });
    expect(escura).toMatch(/class="[^"]*\bbg-superficie\b[^"]*\btext-marinho\b[^"]*"[^>]*>WS</);
    expect(escura).toMatch(/class="[^"]*\btext-branco\b[^"]*"[^>]*>Orquestrador</);
    expect(escura).toMatch(/class="[^"]*\btext-texto-claro-apoio\b[^"]*"[^>]*>de Demandas</);
  });

  it('compacta (barra do celular, 03, 3.3): quadrado de 32 px e "Orquestrador de Demandas" numa linha', () => {
    const s = marca({ variante: 'escura', compacta: true });
    expect(texto(s)).toBe('WS Orquestrador de Demandas');
    expect(s).toMatch(/class="[^"]*\bsize-8\b[^"]*"[^>]*>WS</);
    expect(s).toMatch(/class="[^"]*\btext-branco\b[^"]*"[^>]*>Orquestrador de Demandas</);
  });

  it('só marcação: sem imagem, svg, estilo em linha nem nome antigo de token', () => {
    for (const s of [marca({ variante: 'clara', comLink: true }), marca({ variante: 'escura', compacta: true })]) {
      expect(s).not.toMatch(/<img|<svg|style=/);
      expect(s).not.toMatch(/\b(?:bg|text|border)-(?:texto|texto-suave|fundo|fundo-suave|borda|primaria|perigo|sucesso)\b/);
    }
  });
});

describe('MolduraPublica (C05)', () => {
  const moldura = (comLinkNaMarca: boolean) =>
    renderToStaticMarkup(h(MolduraPublica, { comLinkNaMarca, children: h('h1', null, 'Título fictício') }));

  it('a marca num header, acima do main#conteudo; o conteúdo dentro de um cartão', () => {
    const s = moldura(false);
    expect(s).toMatch(/<header[^>]*>[\s\S]*>WS<[\s\S]*<\/header>[\s\S]*<main id="conteudo" tabindex="-1"[^>]*>/);
    expect(s).toMatch(/<main id="conteudo"[^>]*><section class="[^"]*\brounded-cartao\b[^"]*"><h1>Título fictício<\/h1><\/section><\/main>/);
    expect(s.match(/<main/g)).toHaveLength(1);
  });

  it('largura máxima de 440 px e nada do painel (menu, conta, Sair)', () => {
    const s = moldura(true);
    expect(s).toMatch(/class="[^"]*\bmax-w-110\b/);
    expect(s).not.toContain('aria-label="Principal"');
    expect(s).not.toContain('>Sair<');
  });

  it('marca com link só quando pedido', () => {
    expect(links(moldura(false))).toEqual([]);
    expect(links(moldura(true))).toEqual([LINK_DA_MARCA]);
  });
});

describe('telas da moldura pública (RF-13)', () => {
  it('Sem permissão: marca como link, título, texto e "Voltar para a fila" de hoje', () => {
    const s = renderToStaticMarkup(h(SemPermissao));
    expect(links(s)).toEqual([LINK_DA_MARCA, { href: '/demandas', texto: 'Voltar para a fila' }]);
    expect(s).toMatch(/<main id="conteudo"[^>]*>[\s\S]*<h1>Sem permissão<\/h1>/);
  });

  it('404 da raiz: marca como link, "Página não encontrada" e "Voltar para a fila"', async () => {
    const s = renderToStaticMarkup(await NaoEncontrada());
    expect(links(s)).toEqual([LINK_DA_MARCA, { href: '/demandas', texto: 'Voltar para a fila' }]);
    expect(s).toMatch(/<main id="conteudo"[^>]*>[\s\S]*<h1>Página não encontrada<\/h1>/);
  });

  it('erro: marca como link, o texto fixo de hoje e "Tentar de novo"', () => {
    const s = renderToStaticMarkup(h(ErroAoCarregar, { error: Object.assign(new Error('SENTINELA-ficticia'), { digest: 'SENTINELA-digest' }), reset: () => undefined }));
    expect(links(s)).toEqual([LINK_DA_MARCA]);
    expect(s).toMatch(/<main id="conteudo"[^>]*>[\s\S]*<h1>Não foi possível carregar esta página\.<\/h1>/);
    expect(s).toContain('Tente de novo em instantes.');
    expect(s).toMatch(/<button[^>]*>Tentar de novo<\/button>/);
    expect(s).not.toContain('SENTINELA');
  });

  it('T01 e T02: a marca sem link (C-40), num header acima do main, e o conteúdo de hoje no cartão', async () => {
    const entrar = renderToStaticMarkup(await PaginaEntrar({ searchParams: Promise.resolve({}) }));
    const doisFatores = renderToStaticMarkup(await PaginaConfigurar2fa());
    for (const s of [entrar, doisFatores]) {
      expect(links(s)).toEqual([]);
      expect(s).toMatch(/<header[^>]*>[\s\S]*>WS<[\s\S]*<\/header>[\s\S]*<main id="conteudo"[^>]*><section class="[^"]*\brounded-cartao\b/);
    }
    expect(entrar).toMatch(/<h1[^>]*>Entrar<\/h1>/);
    expect(doisFatores).toMatch(/<h1[^>]*>Configurar verificação em duas etapas<\/h1>/);
  });

  it('T01 e T02: o botão principal ocupa a largura do cartão (03, 7.2)', async () => {
    expect(renderToStaticMarkup(await PaginaEntrar({ searchParams: Promise.resolve({}) }))).toMatch(
      /<button type="submit"[^>]*class="[^"]*\bw-full\b[^"]*"[^>]*>Continuar<\/button>/,
    );
    expect(renderToStaticMarkup(await PaginaConfigurar2fa())).toMatch(/<button type="submit"[^>]*class="[^"]*\bw-full\b[^"]*"[^>]*>Continuar<\/button>/);
  });

  it('os botões e o link principal ocupam a largura do cartão (03, 7.2)', async () => {
    const telas = [renderToStaticMarkup(h(SemPermissao)), renderToStaticMarkup(await NaoEncontrada())];
    for (const s of telas) expect(s).toMatch(/<a [^>]*class="[^"]*\bw-full\b[^"]*"[^>]*>Voltar para a fila<\/a>/);
    const erro = renderToStaticMarkup(h(ErroAoCarregar, { error: new Error('x'), reset: () => undefined }));
    expect(erro).toMatch(/<button[^>]*class="[^"]*\bw-full\b[^"]*"[^>]*>Tentar de novo<\/button>/);
  });
});
