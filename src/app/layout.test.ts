// T01: layout raiz em pt-BR com o título do sistema. Escrito na 06-T01-testes (qa-automacao).
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import RootLayout, { metadata } from './layout';

describe('layout raiz', () => {
  it('declara o idioma pt-BR no <html> (RNF-16)', () => {
    const html = renderToStaticMarkup(createElement(RootLayout, null, createElement('p', null, 'conteudo')));
    // o React 19 injeta <head></head> sozinho; o que importa é o lang e o conteúdo dentro do <body>
    // DEC-DEM-20261110-0015-v1, T02: o <html> ganha a classe das variáveis das fontes (substituto de next/font/local
    // em test/next-font-local.ts); o lang continua o primeiro atributo.
    expect(html).toMatch(/^<html lang="pt-BR" class="fonte-teste-font-noto-sans fonte-teste-font-noto-sans-mono">/);
    expect(html).toContain('<body><p>conteudo</p></body>');
    expect(html.match(/lang=/g)).toHaveLength(1);
  });

  it('tem o título "WS Orquestrador de Demandas"', () => {
    expect(metadata.title).toBe('WS Orquestrador de Demandas');
  });
});
