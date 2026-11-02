'use client';

// Falha ao carregar uma tela (03, 2.8): o texto fixo e "Tentar de novo", que renderiza o trecho de novo. Nunca mostra a
// mensagem, a pilha nem o digest do erro (RNF-10); o registro do erro é do servidor (log e Sentry).
import { useEffect } from 'react';
import { Botao } from '../components/Botao';

const TITULO = 'Não foi possível carregar esta página.';

export default function ErroAoCarregar({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    document.title = 'Não foi possível carregar esta página — WS Orquestrador de Demandas';
  }, []);
  return (
    <main id="conteudo" tabIndex={-1} className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-4 py-10">
      <h1>{TITULO}</h1>
      <p>Tente de novo em instantes.</p>
      <Botao onClick={() => reset()}>Tentar de novo</Botao>
    </main>
  );
}
