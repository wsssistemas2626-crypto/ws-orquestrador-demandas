// Escrito na 06-T36-testes (qa-automacao). As páginas comuns de erro da T36 (03, 2.8), conferidas no HTML do servidor:
// "Falha ao carregar uma tela" (error.tsx) não tinha teste nenhum, nem no e2e; 404 e "Sem permissão" ganham aqui a
// conferência do texto inteiro e do título da aba sem subir o navegador. error.tsx nunca mostra a mensagem, a pilha
// nem o digest do erro (RNF-10).
import { createElement as h, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ErroAoCarregar from './error';
import NaoEncontrada, { metadata as metadataNaoEncontrada } from './not-found';
import SemPermissao, { dynamic as dynamicSemPermissao, metadata as metadataSemPermissao } from './sem-permissao/page';

// `connection()` só existe dentro de uma requisição do Next: aqui, resolve na hora.
vi.mock('next/server', () => ({ connection: async () => undefined }));

const html = (el: ReactElement) => renderToStaticMarkup(el);

describe('Falha ao carregar uma tela (03, 2.8): error.tsx', () => {
  const erro = Object.assign(new Error('SENTINELA-mensagem-interna'), { digest: 'SENTINELA-digest' });
  erro.stack = 'SENTINELA-pilha\n    at consulta (src/modules/SENTINELA.ts:1:1)';

  it('o texto da 2.8, um h1 e o botão "Tentar de novo"', () => {
    const s = html(h(ErroAoCarregar, { error: erro, reset: () => undefined }));
    expect(s).toContain('<h1>Não foi possível carregar esta página.</h1>');
    expect(s).toContain('<p>Tente de novo em instantes.</p>');
    expect(s.match(/<h1/g)).toHaveLength(1);
    expect(s).toMatch(/<button type="button"[^>]*>Tentar de novo<\/button>/);
    expect(s).toContain('<main id="conteudo" tabindex="-1"');
  });

  it('nunca mostra a mensagem, a pilha nem o digest do erro (RNF-10)', () => {
    const s = html(h(ErroAoCarregar, { error: erro, reset: () => undefined }));
    expect(s).not.toContain('SENTINELA');
  });
});

describe('Não encontrado (03, 2.8): not-found.tsx', () => {
  it('título, texto e "Voltar para a fila" da 2.8; título da aba no modelo da 2.7', async () => {
    const s = html(await NaoEncontrada());
    expect(s).toContain('<h1>Página não encontrada</h1>');
    expect(s).toContain('<p>Confira o endereço ou o id. A demanda, a versão ou o pacote podem não existir.</p>');
    expect(s).toMatch(/<a[^>]*href="\/demandas"[^>]*>Voltar para a fila<\/a>/);
    expect(metadataNaoEncontrada.title).toBe('Página não encontrada — WS Orquestrador de Demandas');
  });
});

describe('Sem permissão (03, 2.8): sem-permissao/page.tsx', () => {
  it('título, texto e "Voltar para a fila" da 2.8; título da aba; renderizada a cada requisição (nonce da CSP)', () => {
    const s = html(h(SemPermissao));
    expect(s).toContain('<h1>Sem permissão</h1>');
    expect(s).toContain('<p>Sua conta não pode fazer esta ação. Se precisar, fale com o CTO.</p>');
    expect(s).toMatch(/<a[^>]*href="\/demandas"[^>]*>Voltar para a fila<\/a>/);
    expect(s.match(/<h1/g)).toHaveLength(1);
    expect(metadataSemPermissao.title).toBe('Sem permissão — WS Orquestrador de Demandas');
    expect(dynamicSemPermissao).toBe('force-dynamic');
  });
});
