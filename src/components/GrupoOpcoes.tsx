'use client';

// Grupo de opções (03, 2.3): rádios dentro de `fieldset` com `legend`. Opção indisponível continua no grupo, com
// aria-disabled e o motivo ligado por aria-describedby (03, T05 e T11: encontrável e explicada), e não pode ser marcada.
import type { ChangeEvent, MouseEvent } from 'react';
import { Dica, MensagemDeErro } from './CampoTexto';

export type OpcaoDoGrupo = { valor: string; rotulo: string; desabilitada?: boolean; dica?: string };

type Props = {
  nome: string;
  legenda: string;
  opcoes: readonly OpcaoDoGrupo[];
  dica?: string;
  erro?: string;
  // Controlado (com onMudar) ou não (valorPadrao).
  valor?: string;
  valorPadrao?: string;
  onMudar?: (valor: string) => void;
  className?: string;
};

const idDaOpcao = (nome: string, valor: string) => `${nome}-${valor === '' ? 'vazio' : valor}`;

const impedir = (e: MouseEvent<HTMLInputElement>) => e.preventDefault();

export function GrupoOpcoes({ nome, legenda, opcoes, dica, erro, valor, valorPadrao, onMudar, className }: Props) {
  const aoMudar = (e: ChangeEvent<HTMLInputElement>) => onMudar?.(e.target.value);
  const descricaoDoGrupo = [dica ? `${nome}-dica` : null, erro ? `${nome}-erro` : null].filter(Boolean).join(' ') || undefined;
  return (
    <fieldset aria-describedby={descricaoDoGrupo} className={className ? `flex flex-col gap-1 ${className}` : 'flex flex-col gap-1'}>
      <legend className="font-medium">{legenda}</legend>
      {dica ? <Dica id={nome}>{dica}</Dica> : null}
      {erro ? <MensagemDeErro id={nome}>{erro}</MensagemDeErro> : null}
      {opcoes.map((o) => {
        const id = idDaOpcao(nome, o.valor);
        const idDica = o.dica ? `${id}-dica` : undefined;
        return (
          <div key={o.valor} className="flex flex-col">
            <div className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                id={id}
                name={nome}
                value={o.valor}
                aria-disabled={o.desabilitada ? true : undefined}
                aria-describedby={idDica}
                {...(valor !== undefined ? { checked: valor === o.valor, onChange: aoMudar } : { defaultChecked: valorPadrao === o.valor, onChange: aoMudar })}
                onClick={o.desabilitada ? impedir : undefined}
                className="h-5 w-5 accent-primaria"
              />
              <label htmlFor={id} className={o.desabilitada ? 'text-texto-suave' : undefined}>
                {o.rotulo}
              </label>
            </div>
            {o.dica ? (
              <p id={idDica} className="ml-7 text-sm text-texto-suave">
                {o.dica}
              </p>
            ) : null}
          </div>
        );
      })}
    </fieldset>
  );
}
