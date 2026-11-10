// Itens do menu do painel (03, 3.2 e 3.3): os três de hoje, com ícone de traço simples (SVG no próprio código,
// aria-hidden) e o item da tela atual em aria-current="page". Sobre marinho: texto `texto-claro`; com mouse, fundo
// `marinho-luz` e texto `branco`; o atual tem o fundo, uma barra de 4 px `azul-claro` à esquerda e peso 700 (forma além
// da cor). Usado pelo menu lateral e pela gaveta; `aoEscolher` avisa a gaveta de qual item foi ativado.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ehPaginaAtual, LINKS, type LinkDoMenu } from './navegacao';

const ICONE = 'size-5 shrink-0';

function Icone({ children }: { children: ReactNode }) {
  return (
    <svg className={ICONE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

const ICONES: Readonly<Record<LinkDoMenu['href'], ReactNode>> = {
  // Linhas: a fila.
  '/demandas': (
    <Icone>
      <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
    </Icone>
  ),
  // Mais: nova demanda.
  '/demandas/nova': (
    <Icone>
      <path d="M12 5v14M5 12h14" />
    </Icone>
  ),
  // Engrenagem: agentes e teto.
  '/configuracao/agentes': (
    <Icone>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </Icone>
  ),
};

const ITEM =
  'flex min-h-11 items-center gap-3 rounded-campo px-3 text-[0.9375rem] text-texto-claro no-underline hover:bg-marinho-luz hover:text-branco aria-[current=page]:border-l-4 aria-[current=page]:border-azul-claro aria-[current=page]:bg-marinho-luz aria-[current=page]:pl-2 aria-[current=page]:font-bold aria-[current=page]:text-branco';

type Props = { caminho: string | null; aoEscolher?: (href: string) => void };

export function ItensDoMenu({ caminho, aoEscolher }: Props) {
  return (
    <ul className="flex flex-col gap-1">
      {LINKS.map((l) => (
        <li key={l.href}>
          <Link
            href={l.href}
            aria-current={ehPaginaAtual(l.href, caminho) ? 'page' : undefined}
            onClick={aoEscolher ? () => aoEscolher(l.href) : undefined}
            className={ITEM}
          >
            {ICONES[l.href]}
            {l.texto}
          </Link>
        </li>
      ))}
    </ul>
  );
}
