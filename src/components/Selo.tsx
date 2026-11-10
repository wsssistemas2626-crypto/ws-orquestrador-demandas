// Selo (03, 2.5 do pedido 0015): texto sempre presente (nada só por cor), 13 px, peso 700, pílula; o par texto/fundo
// de cada cor sai dos tokens da 03, 2.1. O rascunho de agente tem borda tracejada. `data-cor` diz a cor sem depender de
// nome de classe (D-15). As classes estão escritas por inteiro para o Tailwind encontrá-las.
import type { ReactNode } from 'react';
import type { CorSelo } from './rotulos';

const CORES: Readonly<Record<CorSelo, string>> = {
  azul: 'bg-nevoa text-acao-escura border-acao-escura',
  violeta: 'bg-selo-violeta-fundo text-selo-violeta border-selo-violeta',
  ambar: 'bg-atencao-fundo text-atencao border-atencao',
  petroleo: 'bg-selo-petroleo-fundo text-selo-petroleo border-selo-petroleo',
  verde: 'bg-selo-verde-fundo text-selo-verde border-selo-verde',
  marinho: 'bg-selo-marinho-fundo text-marinho border-marinho',
  'verde-cheio': 'bg-selo-verde text-branco border-selo-verde',
  laranja: 'bg-selo-laranja-fundo text-selo-laranja border-selo-laranja',
  cinza: 'bg-selo-cinza-fundo text-tinta-media border-tinta-media',
  vermelho: 'bg-erro-fundo text-erro border-erro',
};

export function Selo({ cor, tracejado = false, children }: { cor: CorSelo; tracejado?: boolean; children: ReactNode }) {
  return (
    <span data-cor={cor} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.8125rem] font-bold ${CORES[cor]}${tracejado ? ' border border-dashed' : ''}`}>
      {children}
    </span>
  );
}
