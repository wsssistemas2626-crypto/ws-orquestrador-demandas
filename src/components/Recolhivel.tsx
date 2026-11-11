'use client';

// Recolhível (03, 2.6; D-02 do plano): abaixo de 768 px, um botão com aria-expanded e aria-controls recolhe o bloco, que
// começa recolhido; a partir de 768 px o botão não existe (display: none) e o bloco fica sempre visível. Um elemento só
// no DOM nas duas larguras, sem duplicar id. Estado visual só por classe.
import { useState, type ReactNode } from 'react';
import { classeDoBotao } from './Botao';

type Props = { id: string; rotulo: string; children: ReactNode };

export function Recolhivel({ id, rotulo, children }: Props) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="flex flex-col gap-4">
      <button type="button" aria-expanded={aberto} aria-controls={id} onClick={() => setAberto((a) => !a)} className={`${classeDoBotao('secundario')} md:hidden`}>
        {rotulo}
        <svg
          className={`size-4 shrink-0${aberto ? ' rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          focusable="false"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div id={id} className={aberto ? undefined : 'max-md:hidden'}>
        {children}
      </div>
    </div>
  );
}
