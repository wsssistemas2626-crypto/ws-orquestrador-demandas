// Alerta (03, 2.3): informação, atenção, erro e sucesso. Só o resultado de um envio (erro ou sucesso, `envio`) vai em
// role="alert"; os demais são estáticos, lidos na ordem da página. Cores da 0.2.0 (03, 2.1 e 2.6 do pedido 0015): cada
// tipo com o par de tokens de texto e fundo e a borda esquerda de 4 px.
import type { ReactNode } from 'react';

export type TipoAlerta = 'informacao' | 'atencao' | 'erro' | 'sucesso';

const ESTILOS: Readonly<Record<TipoAlerta, string>> = {
  informacao: 'border-acao-escura bg-nevoa text-tinta',
  atencao: 'border-atencao bg-atencao-fundo text-atencao',
  erro: 'border-erro bg-erro-fundo text-erro',
  sucesso: 'border-positivo bg-positivo-fundo text-positivo',
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
