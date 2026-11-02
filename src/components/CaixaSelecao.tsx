// Caixa de seleção (03, 2.3): checkbox nativo com rótulo em texto ao lado ("Mostrar senha", "Guardei os códigos…"),
// nunca só um ícone. Dica e erro ligados por aria-describedby.
import type { InputHTMLAttributes } from 'react';
import { descritores, Dica, MensagemDeErro } from './CampoTexto';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type' | 'required'> & {
  id: string;
  rotulo: string;
  obrigatorio?: boolean;
  dica?: string;
  erro?: string;
};

export function CaixaSelecao({ id, rotulo, obrigatorio, dica, erro, className, ...resto }: Props) {
  return (
    <div className={className ? `flex flex-col gap-1 ${className}` : 'flex flex-col gap-1'}>
      <div className="flex min-h-11 items-center gap-2">
        <input
          type="checkbox"
          id={id}
          aria-required={obrigatorio ? true : undefined}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descritores(id, dica, erro)}
          className="h-5 w-5 accent-primaria"
          {...resto}
        />
        <label htmlFor={id}>{rotulo}</label>
      </div>
      {dica ? <Dica id={id}>{dica}</Dica> : null}
      {erro ? <MensagemDeErro id={id}>{erro}</MensagemDeErro> : null}
    </div>
  );
}
