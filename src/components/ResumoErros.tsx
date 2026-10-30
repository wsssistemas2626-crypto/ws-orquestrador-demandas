'use client';

// Resumo de erros (03, 2.5): no topo do formulário, com "Corrija os campos abaixo para continuar." e um link por campo.
// Recebe o foco quando aparece ou muda; o link leva o foco ao campo (no caso de lista, ao primeiro item).
import { useEffect, useId, useRef, type MouseEvent } from 'react';
import { TITULO_RESUMO_ERROS, type ErroDeCampo } from './formulario';

type Props = { erros: ReadonlyArray<Pick<ErroDeCampo, 'idCampo' | 'mensagem'> & { rotulo?: string | null }>; titulo?: string };

function irAoCampo(e: MouseEvent<HTMLAnchorElement>, idCampo: string) {
  const alvo = document.getElementById(idCampo);
  if (!alvo) return;
  e.preventDefault();
  alvo.focus();
  alvo.scrollIntoView({ block: 'center' });
}

export function ResumoErros({ erros, titulo = TITULO_RESUMO_ERROS }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const idTitulo = useId();
  useEffect(() => {
    if (erros.length > 0) ref.current?.focus();
  }, [erros]);
  if (erros.length === 0) return null;
  return (
    <div ref={ref} tabIndex={-1} role="alert" aria-labelledby={idTitulo} className="rounded-campo border-2 border-perigo bg-red-50 px-4 py-3 text-texto">
      <h2 id={idTitulo} className="text-lg font-semibold text-perigo">
        {titulo}
      </h2>
      <ul className="mt-2 list-disc pl-6">
        {erros.map((e) => (
          <li key={e.idCampo}>
            <a href={`#${e.idCampo}`} onClick={(ev) => irAoCampo(ev, e.idCampo)} className="text-perigo underline">
              {e.rotulo ? `${e.rotulo}: ${e.mensagem}` : e.mensagem}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
