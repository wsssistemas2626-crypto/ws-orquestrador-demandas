// Escrito na 06-T04-testes (qa-automacao), pedido DEC-DEM-20261110-0015-v1. O que a construção da T04 não travava:
//   - CV-19: o destino do link da marca é uma constante do próprio arquivo, igual ao destino padrão do C-40, e nenhuma
//     prop pode trocá-lo;
//   - a exceção de C-04 do painel-qa.test.ts (Sem permissão, erro e 404 não leem sessão nem banco) só olha o arquivo da
//     página; agora as três páginas importam a moldura, então a moldura e a marca também não podem ler nada;
//   - C-40: um callbackURL hostil na T01 não vira link nem texto na tela;
//   - cada tela da moldura tem um só banner, um só main e um só h1 (o axe com as tags wcag não pega banner repetido);
//   - a tela de erro não mostra a causa nem a pilha (o teste da construção cobre a mensagem e o digest).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import PaginaConfigurar2fa from '../../app/configurar-2fa/page';
import PaginaEntrar from '../../app/entrar/page';
import ErroAoCarregar from '../../app/error';
import NaoEncontrada from '../../app/not-found';
import SemPermissao from '../../app/sem-permissao/page';
import { DESTINO_PADRAO } from '../../modules/acesso/destino-seguro';
import { DESTINO_DA_MARCA } from '../marca/MarcaWs';

vi.mock('next/server', () => ({ connection: async () => undefined }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: () => undefined }) }));
vi.mock('../../modules/acesso/exigir-pessoa', () => ({
  exigirSessaoParaConfigurar2fa: async () => ({ usuarioId: 'usuario-ficticio', nome: 'Pessoa Ficticia' }),
}));

const raiz = fileURLToPath(new URL('../../../', import.meta.url));
// O código sem comentários: o comentário pode citar o que o código não faz.
const codigo = (arquivo: string) =>
  readFileSync(`${raiz}${arquivo}`, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
const importacoes = (fonte: string) => [...fonte.matchAll(/^import\s[^;]*?from\s+'([^']+)';/gm)].map((m) => m[1]!).sort();
const hrefs = (s: string) => [...s.matchAll(/<a\b[^>]*href="([^"]*)"/g)].map((m) => m[1]!);
const contar = (s: string, re: RegExp) => s.match(re)?.length ?? 0;

describe('CV-19: o link da marca só leva à fila', () => {
  it('o destino é a constante /demandas, a mesma do destino padrão do C-40', () => {
    expect(DESTINO_DA_MARCA).toBe('/demandas');
    expect(DESTINO_DA_MARCA).toBe(DESTINO_PADRAO);
  });

  it('MarcaWs tem um só href, e ele é a constante; as props não aceitam destino', () => {
    const fonte = codigo('src/components/marca/MarcaWs.tsx');
    expect(fonte.match(/\bhref=/g)).toEqual(['href=']);
    expect(fonte).toMatch(/\bhref=\{DESTINO_DA_MARCA\}/);
    const props = /type Props = \{([^}]*)\}/.exec(fonte)?.[1];
    expect(props).toBeDefined();
    expect(props).not.toMatch(/\b(?:href|destino|para|url)\??\s*:/i);
  });

  it('MolduraPublica não passa destino à marca nem tem link próprio', () => {
    const fonte = codigo('src/components/casca/MolduraPublica.tsx');
    expect(fonte).not.toMatch(/\bhref\b/);
    expect(fonte).toMatch(/<MarcaWs variante="clara" comLink=\{comLinkNaMarca\} \/>/);
  });
});

describe('a moldura e a marca não leem sessão nem banco (painel-qa.test.ts só olha o arquivo da página)', () => {
  it('importações fechadas: só React, next/link, o Cartao e a marca', () => {
    expect(importacoes(codigo('src/components/casca/MolduraPublica.tsx'))).toEqual(['../Cartao', '../marca/MarcaWs', 'react']);
    expect(importacoes(codigo('src/components/marca/MarcaWs.tsx'))).toEqual(['next/link']);
  });

  it('sem leitura de cabeçalho, cookie, sessão ou estado, e sem "use client"', () => {
    for (const a of ['src/components/casca/MolduraPublica.tsx', 'src/components/marca/MarcaWs.tsx']) {
      const fonte = codigo(a);
      expect(fonte, a).not.toMatch(/\b(?:headers|cookies|obterDeps|exigir\w*|useState|useEffect|fetch)\s*\(/);
      expect(fonte, a).not.toMatch(/^['"]use client['"]/m);
    }
  });

  it('a regra das importações reprova uma leitura plantada', () => {
    const plantado = "import type { ReactNode } from 'react';\nimport { cookies } from 'next/headers';\nimport { Cartao } from '../Cartao';";
    expect(importacoes(plantado)).toEqual(['../Cartao', 'next/headers', 'react']);
  });
});

describe('C-40: callbackURL hostil na T01 não vira link nem texto', () => {
  it.each([
    'https://exemplo.test/roubo',
    '//exemplo.test/roubo',
    '/\\exemplo.test/roubo',
    'javascript:alert(1)',
    '/demandas?x=<script>',
  ])('callbackURL=%s: nenhum link e nada do valor no HTML', async (callbackURL) => {
    const s = renderToStaticMarkup(await PaginaEntrar({ searchParams: Promise.resolve({ callbackURL, motivo: 'sessao' }) }));
    expect(hrefs(s)).toEqual([]);
    expect(s).not.toContain('exemplo.test');
    expect(s).not.toContain('javascript:');
    expect(s).not.toContain('<script>');
    // O resto da tela é o de hoje: o aviso de sessão e o título.
    expect(s).toContain('Sua sessão terminou. Entre de novo para continuar.');
    expect(s).toMatch(/<h1[^>]*>Entrar<\/h1>/);
  });
});

describe('landmarks únicos nas cinco telas da moldura', () => {
  const telas = async (): Promise<[string, string][]> => [
    ['T01 Entrar', renderToStaticMarkup(await PaginaEntrar({ searchParams: Promise.resolve({}) }))],
    ['T02 2FA', renderToStaticMarkup(await PaginaConfigurar2fa())],
    ['Sem permissão', renderToStaticMarkup(h(SemPermissao))],
    ['404', renderToStaticMarkup(await NaoEncontrada())],
    ['erro', renderToStaticMarkup(h(ErroAoCarregar, { error: new Error('x'), reset: () => undefined }))],
  ];

  it('um header, um main#conteudo, um h1 e nenhum nav', async () => {
    for (const [nome, s] of await telas()) {
      expect({ nome, header: contar(s, /<header\b/g), main: contar(s, /<main\b/g), h1: contar(s, /<h1\b/g), nav: contar(s, /<nav\b/g) }).toEqual({
        nome,
        header: 1,
        main: 1,
        h1: 1,
        nav: 0,
      });
      expect(s, nome).toMatch(/<main id="conteudo" tabindex="-1"/);
    }
  });

  it('o h1 fica dentro do main, e a marca fora dele (header antes do main)', async () => {
    for (const [nome, s] of await telas()) {
      const main = /<main\b[\s\S]*<\/main>/.exec(s)?.[0] ?? '';
      expect(main, nome).toMatch(/<h1\b/);
      expect(main, nome).not.toMatch(/>WS</);
      expect(s.indexOf('<header'), nome).toBeLessThan(s.indexOf('<main'));
    }
  });
});

describe('erro: nada do conteúdo do erro na tela (RNF-10)', () => {
  it('nem a causa, nem a pilha, nem a mensagem, nem o digest', () => {
    const erro = Object.assign(new Error('SENTINELA-mensagem', { cause: 'SENTINELA-causa' }), { digest: 'SENTINELA-digest' });
    erro.stack = 'SENTINELA-pilha\n    at lugar (arquivo-ficticio.ts:1:1)';
    const s = renderToStaticMarkup(h(ErroAoCarregar, { error: erro, reset: () => undefined }));
    expect(s).not.toContain('SENTINELA');
    expect(s).not.toContain('arquivo-ficticio');
    expect(hrefs(s)).toEqual(['/demandas']);
  });
});
