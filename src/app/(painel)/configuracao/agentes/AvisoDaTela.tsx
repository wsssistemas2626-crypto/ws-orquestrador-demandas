'use client';

// A região de aviso da T12 (03, 2.3: uma por página, role="status"), dividida pelo formulário do teto e pela tabela de
// agentes: "Teto salvo: …", "Agente de risco ligado.", "Agente de risco desligado.". Fica montada desde o início, acima
// das duas seções, para o leitor de tela anunciar cada mudança. Cada ação limpa o aviso antes de ir ao servidor, e assim
// o mesmo texto de novo também é anunciado.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { RegiaoAviso } from '../../../../components/RegiaoAviso';

type Aviso = { avisar: (texto: string) => void; limpar: () => void };

const ContextoDoAviso = createContext<Aviso>({ avisar: () => undefined, limpar: () => undefined });

export const useAviso = (): Aviso => useContext(ContextoDoAviso);

export function ProvedorDeAviso({ children }: { children: ReactNode }) {
  const [texto, setTexto] = useState('');
  const avisar = useCallback((t: string) => setTexto(t), []);
  const limpar = useCallback(() => setTexto(''), []);
  const valor = useMemo(() => ({ avisar, limpar }), [avisar, limpar]);
  return (
    <ContextoDoAviso.Provider value={valor}>
      <div className="flex flex-col gap-5">
        {/* Vazia, fica fora do fluxo (sr-only), sem abrir espaço entre o topo e a primeira seção. */}
        <RegiaoAviso visivel={texto !== ''}>{texto}</RegiaoAviso>
        {children}
      </div>
    </ContextoDoAviso.Provider>
  );
}
