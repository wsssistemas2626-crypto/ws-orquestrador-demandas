// Campo de texto (03, 2.3 e 2.5): rótulo visível acima, dica abaixo do rótulo e mensagem de erro abaixo do campo, as
// duas ligadas por aria-describedby; aria-invalid só com erro. O rótulo chega inteiro, com "(obrigatório)" quando for
// o caso (texto da 03); `obrigatorio` só marca aria-required, sem a validação nativa do navegador (a validação é ao
// enviar, pelo servidor).
import type { InputHTMLAttributes } from 'react';

// Classes comuns dos campos: borda tinta-suave com contraste ≥ 3:1 (03, 2.2 do pedido 0015: 4,5 sobre branco), erro em
// erro, 16 px (nunca menor no celular) e alvo de 44 px.
export const classeDoCampo = (comErro: boolean): string =>
  `min-h-11 w-full rounded-campo border bg-branco px-3 py-2 text-base text-tinta ${comErro ? 'border-2 border-erro' : 'border-tinta-suave'}`;

// Os ids da dica e do erro, na ordem em que o leitor de tela os lê.
export function descritores(id: string, dica?: string, erro?: string, extra?: string): string | undefined {
  const ids = [dica ? `${id}-dica` : null, extra ?? null, erro ? `${id}-erro` : null].filter((x): x is string => x !== null);
  return ids.length > 0 ? ids.join(' ') : undefined;
}

export function Dica({ id, children }: { id: string; children: string }) {
  return (
    <p id={`${id}-dica`} className="text-sm text-tinta-media">
      {children}
    </p>
  );
}

export function MensagemDeErro({ id, children }: { id: string; children: string }) {
  return (
    <p id={`${id}-erro`} className="text-sm font-medium text-erro">
      {children}
    </p>
  );
}

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'required'> & {
  id: string;
  rotulo: string;
  obrigatorio?: boolean;
  dica?: string;
  erro?: string;
};

export function CampoTexto({ id, rotulo, obrigatorio, dica, erro, type = 'text', className, ...resto }: Props) {
  return (
    <div className={className ? `flex flex-col gap-1 ${className}` : 'flex flex-col gap-1'}>
      <label htmlFor={id} className="font-medium">
        {rotulo}
      </label>
      {dica ? <Dica id={id}>{dica}</Dica> : null}
      <input
        id={id}
        type={type}
        aria-required={obrigatorio ? true : undefined}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores(id, dica, erro)}
        className={classeDoCampo(Boolean(erro))}
        {...resto}
      />
      {erro ? <MensagemDeErro id={id}>{erro}</MensagemDeErro> : null}
    </div>
  );
}
