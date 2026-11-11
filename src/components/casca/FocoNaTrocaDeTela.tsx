'use client';

// Foco no h1 ao trocar de tela pelo painel, e não na primeira carga (03, 3.2; a regra da 0.1.13 sem mudança): na
// primeira carga, o primeiro Tab é o "Pular para o conteúdo". Um componente só, para a regra não rodar duas vezes (menu
// lateral e gaveta); ao ativar um item da gaveta, este foco vem depois do fechamento e prevalece (ADR-15).
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

export function FocoNaTrocaDeTela() {
  const caminho = usePathname();
  // O caminho da última tela focada. Comparar o caminho, e não "já rodou uma vez", porque o efeito roda duas vezes na
  // mesma tela em modo estrito do React.
  const caminhoAnterior = useRef(caminho);

  useEffect(() => {
    if (caminhoAnterior.current === caminho) return;
    caminhoAnterior.current = caminho;
    const h1 = document.querySelector<HTMLElement>('main h1');
    if (!h1) return;
    if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
    h1.focus();
  }, [caminho]);

  return null;
}
