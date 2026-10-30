// Botão do design system (03, 2.3): primário, secundário, perigo e link. Alvo mínimo de 44 × 44 px (03, 2.1) e foco
// visível pela regra global de globals.css. Enquanto envia, mostra o texto da tela ("Salvando…") e fica desabilitado
// (03, 2.5). `type="button"` por padrão: só o botão de envio declara `submit`.
import type { ButtonHTMLAttributes } from 'react';

export type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'link';

const BASE =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-campo px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-70';

const VARIANTES: Readonly<Record<VarianteBotao, string>> = {
  primario: 'bg-primaria text-white hover:bg-blue-800',
  secundario: 'border border-borda bg-fundo text-texto hover:bg-fundo-suave',
  perigo: 'bg-perigo text-white hover:bg-red-800',
  link: 'text-primaria underline underline-offset-2 hover:no-underline',
};

// Também para link com cara de botão ("Voltar para a fila", "Nova demanda").
export const classeDoBotao = (variante: VarianteBotao = 'primario'): string => `${BASE} ${VARIANTES[variante]}`;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBotao;
  carregando?: boolean;
  textoCarregando?: string;
};

export function Botao({ type = 'button', variante = 'primario', carregando = false, textoCarregando, disabled, className, children, ...resto }: Props) {
  return (
    <button
      type={type}
      disabled={disabled || carregando}
      className={className ? `${classeDoBotao(variante)} ${className}` : classeDoBotao(variante)}
      {...resto}
    >
      {carregando && textoCarregando ? textoCarregando : children}
    </button>
  );
}
