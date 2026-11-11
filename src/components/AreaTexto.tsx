'use client';

// Área de texto (03, 2.3 e T04): com `limite`, mostra o contador "0 de 100.000 caracteres", ligado à área por
// aria-describedby. O contador visível não é anunciado a cada tecla; uma região à parte avisa, com atraso, só a partir de
// 90 % do limite e ao passar dele.
import { useEffect, useState, type ChangeEvent, type TextareaHTMLAttributes } from 'react';
import { classeDoCampo, descritores, Dica, MensagemDeErro } from './CampoTexto';

const ATRASO_DO_ANUNCIO_MS = 1_000;
const fmt = (n: number) => n.toLocaleString('pt-BR');

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id' | 'required'> & {
  id: string;
  rotulo: string;
  obrigatorio?: boolean;
  dica?: string;
  erro?: string;
  limite?: number;
};

export function AreaTexto({ id, rotulo, obrigatorio, dica, erro, limite, value, defaultValue, onChange, rows = 6, className, ...resto }: Props) {
  const [digitados, setDigitados] = useState(() => String(defaultValue ?? '').length);
  const tamanho = value !== undefined ? String(value).length : digitados;
  const [anuncio, setAnuncio] = useState('');

  useEffect(() => {
    if (!limite) return;
    const t = setTimeout(() => {
      if (tamanho > limite) setAnuncio(`O texto tem ${fmt(tamanho)} caracteres. O limite é ${fmt(limite)}.`);
      else if (tamanho >= limite * 0.9) setAnuncio(`${fmt(tamanho)} de ${fmt(limite)} caracteres`);
      else setAnuncio('');
    }, ATRASO_DO_ANUNCIO_MS);
    return () => clearTimeout(t);
  }, [tamanho, limite]);

  const aoMudar = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setDigitados(e.target.value.length);
    onChange?.(e);
  };

  const idContador = limite ? `${id}-contador` : undefined;
  return (
    <div className={className ? `flex flex-col gap-1 ${className}` : 'flex flex-col gap-1'}>
      <label htmlFor={id} className="font-medium">
        {rotulo}
      </label>
      {dica ? <Dica id={id}>{dica}</Dica> : null}
      <textarea
        id={id}
        rows={rows}
        value={value}
        defaultValue={defaultValue}
        onChange={aoMudar}
        aria-required={obrigatorio ? true : undefined}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descritores(id, dica, erro, idContador)}
        className={classeDoCampo(Boolean(erro))}
        {...resto}
      />
      {limite ? (
        <p id={idContador} className={`text-sm ${tamanho > limite ? 'font-medium text-erro' : 'text-tinta-media'}`}>
          {`${fmt(tamanho)} de ${fmt(limite)} caracteres`}
        </p>
      ) : null}
      {limite ? (
        <p className="sr-only" aria-live="polite">
          {anuncio}
        </p>
      ) : null}
      {erro ? <MensagemDeErro id={id}>{erro}</MensagemDeErro> : null}
    </div>
  );
}
