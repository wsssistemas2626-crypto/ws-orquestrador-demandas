// T37: T01 Entrar no HTML do servidor (o primeiro estado, antes de qualquer script): textos da 03, atributos de
// preenchimento automático (WCAG 2.2, 3.3.8), nada de cadastro nem de "esqueci minha senha". Os passos seguintes e os
// erros são conferidos no navegador (e2e/entrar.spec.ts).
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FormularioEntrar } from './FormularioEntrar';
import PaginaEntrar, { dynamic, metadata } from './page';

// Fora do Next não há roteador montado; o HTML do primeiro estado não navega.
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: () => undefined }) }));

const html = (sessaoTerminou = false) => renderToStaticMarkup(h(FormularioEntrar, { destino: '/demandas', sessaoTerminou }));

describe('T01 Entrar: passo 1', () => {
  it('título "Entrar" focável pelo script, e-mail, senha, "Mostrar senha" e "Continuar"', () => {
    const s = html();
    expect(s).toMatch(/<h1[^>]*tabindex="-1"[^>]*>Entrar<\/h1>/);
    expect(s.match(/<h1/g)).toHaveLength(1);
    expect(s).toMatch(/<label for="entrar-email"[^>]*>E-mail \(obrigatório\)<\/label>/);
    expect(s).toMatch(/<input[^>]*id="entrar-email"[^>]*type="email"[^>]*autoComplete="username"/);
    expect(s).toMatch(/<label for="entrar-senha"[^>]*>Senha \(obrigatório\)<\/label>/);
    expect(s).toMatch(/<input[^>]*id="entrar-senha"[^>]*type="password"[^>]*autoComplete="current-password"/);
    expect(s).toMatch(/<input type="checkbox" id="entrar-mostrar-senha"/);
    expect(s).toMatch(/<label for="entrar-mostrar-senha">Mostrar senha<\/label>/);
    expect(s).toMatch(/<button type="submit"[^>]*>Continuar<\/button>/);
    expect(s).toMatch(/<form[^>]*noValidate=""/);
  });

  it('sem cadastro nem "esqueci minha senha" (CA-01.4, C-03)', () => {
    const s = html().toLowerCase();
    expect(s).not.toMatch(/cadastr|esqueci|criar conta|redefinir/);
  });

  it('com o motivo da sessão: o alerta da 03, 2.8', () => {
    expect(html(true)).toContain('Sua sessão terminou. Entre de novo para continuar.');
    expect(html(false)).not.toContain('Sua sessão terminou.');
  });
});

describe('T01 Entrar: a página', () => {
  it('título da aba, renderizada a cada requisição (nonce da CSP) e o nome do sistema no cabeçalho', async () => {
    expect(metadata.title).toBe('Entrar — WS Orquestrador de Demandas');
    expect(dynamic).toBe('force-dynamic');
    const s = renderToStaticMarkup(await PaginaEntrar({ searchParams: Promise.resolve({ motivo: 'sessao' }) }));
    expect(s).toMatch(/<header[^>]*>[\s\S]*WS Orquestrador de Demandas[\s\S]*<\/header>/);
    expect(s).toContain('<main id="conteudo"');
    expect(s).toContain('Sua sessão terminou. Entre de novo para continuar.');
  });
});
