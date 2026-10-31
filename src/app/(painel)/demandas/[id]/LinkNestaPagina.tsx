'use client';

// Link para uma seção da própria página (03, T05: "Navegação interna por âncoras; ao seguir uma, o foco vai ao h2, com
// tabindex=-1"). O navegador só rola e move o ponto de partida do Tab; este link também leva o foco ao título. A
// navegação da âncora continua a do navegador (endereço com #, Voltar), e sem script o link funciona como âncora comum.
import type { MouseEvent, ReactNode } from 'react';

type Props = { alvo: string; className?: string; children: ReactNode };

export function LinkNestaPagina({ alvo, className, children }: Props) {
  function aoClicar(e: MouseEvent<HTMLAnchorElement>) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    document.getElementById(alvo)?.focus({ preventScroll: true });
  }
  return (
    <a href={`#${alvo}`} onClick={aoClicar} className={className}>
      {children}
    </a>
  );
}
