// Cartão (03, 2.4 e 2.6 do pedido 0015): `section` com fundo branco, borda 1 px `linha` (decorativa: o cartão não é
// controle), raio de 16 px e preenchimento de 16 px no celular e 24 px a partir de 768 px, sem sombra. Com `rotuloPor`,
// a seção leva o nome do título que ela contém (aria-labelledby).
import type { ReactNode } from 'react';

type Props = { id?: string; rotuloPor?: string; className?: string; children: ReactNode };

const CLASSE = 'rounded-cartao border border-linha bg-branco p-4 md:p-6';

export function Cartao({ id, rotuloPor, className, children }: Props) {
  return (
    <section id={id} aria-labelledby={rotuloPor} className={className ? `${CLASSE} ${className}` : CLASSE}>
      {children}
    </section>
  );
}
