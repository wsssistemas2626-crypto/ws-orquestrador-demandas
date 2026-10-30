// Seleção (03, 2.3): `<select>` nativo com rótulo visível, dica e erro como no Campo de texto. A primeira opção é a da
// tela ("Todos", "Não informado"); mudar a seleção não aplica nada sozinho (WCAG 3.2.2).
import type { SelectHTMLAttributes } from 'react';
import { classeDoCampo, descritores, Dica, MensagemDeErro } from './CampoTexto';

export type OpcaoSelecao = { valor: string; rotulo: string };

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'required'> & {
  id: string;
  rotulo: string;
  opcoes: readonly OpcaoSelecao[];
  obrigatorio?: boolean;
  dica?: string;
  erro?: string;
};

export function Selecao({ id, rotulo, opcoes, obrigatorio, dica, erro, className, ...resto }: Props) {
  return (
    <div className={className ? `flex flex-col gap-1 ${className}` : 'flex flex-col gap-1'}>
      <label htmlFor={id} className="font-medium">
        {rotulo}
      </label>
      {dica ? <Dica id={id}>{dica}</Dica> : null}
      <select
        id={id}
        aria-required={obrigatorio ? true : undefined}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores(id, dica, erro)}
        className={classeDoCampo(Boolean(erro))}
        {...resto}
      >
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      {erro ? <MensagemDeErro id={id}>{erro}</MensagemDeErro> : null}
    </div>
  );
}
