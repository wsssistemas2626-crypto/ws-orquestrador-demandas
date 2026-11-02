// Selo (03, 2.2): texto escuro 800 sobre fundo claro 100 da mesma cor, sempre com texto (nada só por cor). O rascunho de
// agente tem borda tracejada. As classes estão escritas por inteiro para o Tailwind encontrá-las.
import type { ReactNode } from 'react';
import type { CorSelo } from './rotulos';

const CORES: Readonly<Record<CorSelo, string>> = {
  slate: 'bg-slate-100 text-slate-800 border-slate-800',
  blue: 'bg-blue-100 text-blue-800 border-blue-800',
  amber: 'bg-amber-100 text-amber-800 border-amber-800',
  violet: 'bg-violet-100 text-violet-800 border-violet-800',
  green: 'bg-green-100 text-green-800 border-green-800',
  cyan: 'bg-cyan-100 text-cyan-800 border-cyan-800',
  emerald: 'bg-emerald-100 text-emerald-800 border-emerald-800',
  orange: 'bg-orange-100 text-orange-800 border-orange-800',
  gray: 'bg-gray-100 text-gray-800 border-gray-800',
  red: 'bg-red-100 text-red-800 border-red-800',
};

export function Selo({ cor, tracejado = false, children }: { cor: CorSelo; tracejado?: boolean; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${CORES[cor]}${tracejado ? ' border border-dashed' : ''}`}>
      {children}
    </span>
  );
}
