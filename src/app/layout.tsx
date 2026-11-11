// Layout raiz: pt-BR, os tokens do design system (globals.css) e o título do sistema. O título de cada tela do painel
// ("<tela> — WS Orquestrador de Demandas", 03, 2.7) vem do modelo em src/app/(painel)/layout.tsx. As fontes Noto
// (fontes.ts, ADR-13) entram só pelas variáveis CSS na raiz, lidas pelo @theme de globals.css.
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { fonteMono, fonteSans } from './fontes';
import './globals.css';

export const metadata: Metadata = {
  title: 'WS Orquestrador de Demandas',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${fonteSans.variable} ${fonteMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
