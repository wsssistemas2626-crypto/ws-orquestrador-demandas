// Botão do design system (03, 2.3; 0.2.0: 03, 2.6 do pedido 0015): primário, secundário, perigo e link, mais
// `sobre-escuro` ("Sair" na casca) e `claro-sobre-escuro` (link do cartão Próxima ação). Alvo mínimo de 44 × 44 px
// (03, 2.4) e foco visível pela regra global de globals.css. Enquanto envia, mostra o texto da tela ("Salvando…") e
// fica desabilitado (03, 2.5). `type="button"` por padrão: só o botão de envio declara `submit`.
//
// Indisponível sem sair da ordem do Tab (03, 2.6): quem usa passa `aria-disabled` (sem `disabled`) e o motivo por
// `aria-describedby`; o visual vem das classes `aria-disabled:` da base. O que o clique faz nesse estado é de quem usa.
import type { ButtonHTMLAttributes } from 'react';

export type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'link' | 'sobre-escuro' | 'claro-sobre-escuro';

const BASE =
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-campo px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-70 aria-disabled:cursor-not-allowed aria-disabled:border aria-disabled:border-dashed aria-disabled:border-tinta-suave aria-disabled:bg-selo-cinza-fundo aria-disabled:text-tinta-media';

const VARIANTES: Readonly<Record<VarianteBotao, string>> = {
  primario: 'bg-acao text-branco hover:bg-acao-escura',
  secundario: 'border border-tinta-suave bg-branco text-tinta hover:bg-superficie',
  perigo: 'bg-erro text-branco',
  link: 'text-acao-escura underline underline-offset-2 hover:no-underline',
  'sobre-escuro': 'border border-azul-claro bg-transparent text-branco hover:bg-marinho-luz',
  'claro-sobre-escuro': 'bg-branco font-bold text-marinho',
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
