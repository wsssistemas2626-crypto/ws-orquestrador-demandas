'use client';

// Diálogo de confirmação (03, 2.3): `<dialog>` nativo aberto como modal (prende o foco), foco no título ao abrir, Esc
// fecha (como "Voltar") e o foco volta ao elemento de origem ao fechar.
//
// 0.2.0 (T13 do DEC-DEM-20261110-0015-v1; 03, 6.5): abaixo de 768 px, a largura toda menos 16 px de cada lado e os
// botões empilhados na largura toda, o de confirmar primeiro; a partir de 768 px, como antes. Textos sem mudança.
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
      className="m-auto max-w-lg rounded-cartao border border-linha bg-branco p-6 text-tinta backdrop:bg-tinta/50 max-md:w-[calc(100%_-_2rem)] max-md:max-w-none"
    >
      <h2 id={idTitulo} ref={cabecalho} tabIndex={-1} className="text-xl font-semibold">
        {titulo}
      </h2>
      <div className="mt-3">{children}</div>
      <div className="mt-6 flex gap-3 max-md:flex-col md:flex-wrap">
        <Botao variante={perigo ? 'perigo' : 'primario'} onClick={onConfirmar} carregando={ocupado} textoCarregando={textoOcupado} className="max-md:w-full">
          {rotuloConfirmar}
        </Botao>
        <Botao variante="secundario" onClick={onCancelar} disabled={ocupado} className="max-md:w-full">
          {rotuloCancelar}
        </Botao>
      </div>
    </dialog>
  );
}
