// Moldura pública (03, seção 7 do pedido 0015; C05 do 02): T01 Entrar, T02 2FA, Sem permissão, a tela de erro e o 404
// da raiz, sem a casca do painel (não há menu para quem ainda não entrou). Fundo `superficie`, conteúdo centralizado até
// 440 px (16 px de margem no celular), a marca clara num `header` acima do `main#conteudo` e o conteúdo da tela num
// `Cartao`. Só marcação: sem leitura de sessão ou banco e sem estado, porque Sem permissão, erro e 404 não podem ler
// nada (test/estatico/painel-qa.test.ts) e a tela de erro é componente de navegador.
//
// `comLinkNaMarca`: a marca vira link para a fila em Sem permissão, erro e 404; em T01 e T02 fica sem link, para a
// moldura não criar outro caminho de volta depois do login (C-40).
import type { ReactNode } from 'react';
import { Cartao } from '../Cartao';
import { MarcaWs } from '../marca/MarcaWs';

type Props = { comLinkNaMarca: boolean; children: ReactNode };

export function MolduraPublica({ comLinkNaMarca, children }: Props) {
  return (
    <div className="px-4 py-10 md:py-16">
      <div className="mx-auto flex w-full max-w-110 flex-col gap-6">
        <header className="flex justify-center">
          <MarcaWs variante="clara" comLink={comLinkNaMarca} />
        </header>
        <main id="conteudo" tabIndex={-1}>
          <Cartao>{children}</Cartao>
        </main>
      </div>
    </div>
  );
}
