// T37: T02 Configurar verificação em duas etapas no HTML do servidor (passo 1, antes de qualquer script). Os passos 2 e
// 3, a chave, o QR code e os códigos de recuperação são conferidos no navegador (e2e/configurar-2fa.spec.ts).
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { AssistenteDoisFatores } from './AssistenteDoisFatores';

// Fora do Next não há roteador montado; o HTML do primeiro estado não navega.
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: () => undefined }) }));

describe('T02: passo 1', () => {
  const s = renderToStaticMarkup(h(AssistenteDoisFatores));

  it('título, introdução e o alerta de quem chega sem 2FA (03, 2.8)', () => {
    expect(s).toMatch(/<h1[^>]*tabindex="-1"[^>]*>Configurar verificação em duas etapas<\/h1>/);
    expect(s.match(/<h1/g)).toHaveLength(1);
    expect(s).toContain(
      'Para proteger as decisões registradas aqui, toda conta usa senha e um código do aplicativo autenticador (por exemplo, Google Authenticator ou Microsoft Authenticator).',
    );
    expect(s).toContain('Para usar o painel, configure a verificação em duas etapas.');
  });

  it('"Passo 1 de 3 — Confirme sua senha" em h2, a senha com current-password e "Continuar"', () => {
    expect(s).toMatch(/<h2[^>]*tabindex="-1"[^>]*>Passo 1 de 3 — Confirme sua senha<\/h2>/);
    expect(s).toMatch(/<label for="dois-fatores-senha"[^>]*>Senha \(obrigatório\)<\/label>/);
    expect(s).toMatch(/<input[^>]*id="dois-fatores-senha"[^>]*type="password"[^>]*autoComplete="current-password"/);
    expect(s).toMatch(/<button type="submit"[^>]*>Continuar<\/button>/);
  });

  it('a região de aviso (role="status") existe desde o início, para anunciar "Chave copiada."', () => {
    expect(s.match(/role="status"/g)).toHaveLength(1);
  });
});
