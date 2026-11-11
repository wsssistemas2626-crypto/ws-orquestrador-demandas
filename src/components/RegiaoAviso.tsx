// Região de aviso (03, 2.3): role="status", uma por página, para mensagens assíncronas ("12 demandas encontradas.",
// "Chave copiada."). Fica montada desde o início, para o leitor de tela anunciar a mudança do texto.
import type { ReactNode } from 'react';

export function RegiaoAviso({ children, visivel = true }: { children?: ReactNode; visivel?: boolean }) {
  return (
    <div role="status" className={visivel ? 'text-tinta' : 'sr-only'}>
      {children}
    </div>
  );
}
