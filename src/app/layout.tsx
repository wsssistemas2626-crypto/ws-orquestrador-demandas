// Layout raiz: pt-BR, os tokens do design system (globals.css) e o título do sistema. O título de cada tela do painel
// ("<tela> — WS Orquestrador de Demandas", 03, 2.7) vem do modelo em src/app/(painel)/layout.tsx.
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'WS Orquestrador de Demandas',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
