'use client';

// Falha ao carregar uma tela (03, 2.8): o texto fixo e "Tentar de novo", que renderiza o trecho de novo. Nunca mostra a
// mensagem, a pilha nem o digest do erro (RNF-10); o registro do erro é do servidor (log e Sentry). 0.2.0 (RF-13):
// moldura pública, com a marca como link para a fila.
import { useEffect } from 'react';
import { Botao } from '../components/Botao';
import { MolduraPublica } from '../components/casca/MolduraPublica';

const TITULO = 'Não foi possível carregar esta página.';

export default function ErroAoCarregar({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    document.title = 'Não foi possível carregar esta página — WS Orquestrador de Demandas';
  }, []);
  return (
    <MolduraPublica comLinkNaMarca>
      <div className="flex flex-col gap-4">
        <h1>{TITULO}</h1>
        <p>Tente de novo em instantes.</p>
        <Botao className="w-full" onClick={() => reset()}>
          Tentar de novo
        </Botao>
      </div>
    </MolduraPublica>
  );
}
