// Escrito na 06-T37-testes (qa-automacao). /configurar-2fa fica fora do grupo (painel), e por isso fora da varredura
// estática de exigirPessoaNaPagina (test/estatico/exigir-pessoa.test.ts). Aqui se prova, sem navegador, que a página
// chama exigirSessaoParaConfigurar2fa antes de montar o assistente, e que o desvio dela (sem sessão, papel inválido ou
// conta que já tem 2FA, C-04 c e C-08) para a página sem montar nada.
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PaginaConfigurar2fa, { dynamic, metadata } from './page';

const guarda = vi.hoisted(() => vi.fn<() => Promise<{ usuarioId: string; nome: string }>>());
vi.mock('../../modules/acesso/exigir-pessoa', () => ({ exigirSessaoParaConfigurar2fa: guarda }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: () => undefined }) }));

beforeEach(() => {
  guarda.mockReset();
});

describe('/configurar-2fa: a guarda vem antes de tudo', () => {
  it('quando a guarda desvia (o redirect do Next lança), a página não devolve nada', async () => {
    const desvio = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/entrar?motivo=sessao;307;' });
    guarda.mockRejectedValueOnce(desvio);
    await expect(PaginaConfigurar2fa()).rejects.toBe(desvio);
    expect(guarda).toHaveBeenCalledTimes(1);
  });

  it('com a sessão curta de conta sem 2FA, monta o assistente no passo 1, dentro de main', async () => {
    guarda.mockResolvedValueOnce({ usuarioId: 'usuario-ficticio', nome: 'Pessoa Ficticia' });
    const s = renderToStaticMarkup(await PaginaConfigurar2fa());
    expect(guarda).toHaveBeenCalledTimes(1);
    expect(s).toMatch(/<header[^>]*>[\s\S]*WS Orquestrador de Demandas[\s\S]*<\/header>/);
    expect(s).toMatch(/<main id="conteudo" tabindex="-1"[^>]*>[\s\S]*<h1[^>]*>Configurar verificação em duas etapas<\/h1>/);
    expect(s).toContain('Passo 1 de 3 — Confirme sua senha');
    // Nada do painel: nem navegação, nem "Sair" (C-04 c).
    expect(s).not.toContain('aria-label="Principal"');
    expect(s).not.toContain('>Sair<');
  });

  it('título da aba e renderização a cada requisição (nonce da CSP)', () => {
    expect(metadata.title).toBe('Configurar verificação em duas etapas — WS Orquestrador de Demandas');
    expect(dynamic).toBe('force-dynamic');
  });
});
