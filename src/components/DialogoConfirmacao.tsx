'use client';

// Diálogo de confirmação (03, 2.3): `<dialog>` nativo aberto como modal (prende o foco), foco no título ao abrir, Esc
// fecha (como "Voltar") e o foco volta ao elemento de origem ao fechar.
import { useEffect, useId, useRef, type ReactNode, type SyntheticEvent } from 'react';
import { Botao } from './Botao';

type Props = {
  aberto: boolean;
  titulo: string;
  children: ReactNode;
  rotuloConfirmar: string;
  rotuloCancelar: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  perigo?: boolean;
  ocupado?: boolean;
  textoOcupado?: string;
};

export function DialogoConfirmacao({
  aberto,
  titulo,
  children,
  rotuloConfirmar,
  rotuloCancelar,
  onConfirmar,
  onCancelar,
  perigo = false,
  ocupado = false,
  textoOcupado,
}: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const cabecalho = useRef<HTMLHeadingElement>(null);
  const origem = useRef<HTMLElement | null>(null);
  const idTitulo = useId();

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (aberto && !d.open) {
      origem.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      d.showModal();
      cabecalho.current?.focus();
    } else if (!aberto && d.open) {
      d.close();
    }
  }, [aberto]);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    const aoFechar = () => {
      origem.current?.focus();
      origem.current = null;
    };
    d.addEventListener('close', aoFechar);
    return () => d.removeEventListener('close', aoFechar);
  }, []);

  // Esc: quem fecha é o estado da tela, para ele não ficar dizendo "aberto" com o diálogo fechado.
  const aoCancelar = (e: SyntheticEvent<HTMLDialogElement>) => {
    e.preventDefault();
    onCancelar();
  };

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={idTitulo}
      onCancel={aoCancelar}
      className="m-auto max-w-lg rounded-cartao border border-linha bg-branco p-6 text-tinta backdrop:bg-tinta/50"
    >
      <h2 id={idTitulo} ref={cabecalho} tabIndex={-1} className="text-xl font-semibold">
        {titulo}
      </h2>
      <div className="mt-3">{children}</div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Botao variante={perigo ? 'perigo' : 'primario'} onClick={onConfirmar} carregando={ocupado} textoCarregando={textoOcupado}>
          {rotuloConfirmar}
        </Botao>
        <Botao variante="secundario" onClick={onCancelar} disabled={ocupado}>
          {rotuloCancelar}
        </Botao>
      </div>
    </dialog>
  );
}
