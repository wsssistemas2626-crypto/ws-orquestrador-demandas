// Alerta (03, 2.3): informação, atenção, erro e sucesso. Só o resultado de um envio (erro ou sucesso, `envio`) vai em
// role="alert"; os demais são estáticos, lidos na ordem da página.
import type { ReactNode } from 'react';

export type TipoAlerta = 'informacao' | 'atencao' | 'erro' | 'sucesso';

const ESTILOS: Readonly<Record<TipoAlerta, string>> = {
  informacao: 'border-primaria bg-blue-50 text-texto',
  atencao: 'border-atencao-texto bg-atencao-fundo text-atencao-texto',
  erro: 'border-perigo bg-red-50 text-perigo',
  sucesso: 'border-sucesso bg-green-50 text-sucesso',
};

type Props = { tipo: TipoAlerta; envio?: boolean; titulo?: string; children: ReactNode; className?: string };

export function Alerta({ tipo, envio = false, titulo, children, className }: Props) {
  const anuncia = envio && (tipo === 'erro' || tipo === 'sucesso');
  return (
    <div role={anuncia ? 'alert' : undefined} className={`rounded-campo border-l-4 px-4 py-3 ${ESTILOS[tipo]}${className ? ` ${className}` : ''}`}>
      {titulo ? <p className="font-semibold">{titulo}</p> : null}
      {children}
    </div>
  );
}
