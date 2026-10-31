// Não encontrado (03, 2.8) dentro do painel: o notFound() de uma página do painel (id que não existe em /demandas/[id],
// T39) cai aqui, dentro da moldura, que já tem o `main` e o modelo de título "<tela> — WS Orquestrador de Demandas".
// Endereço que não casa com nenhuma rota continua no not-found.tsx da raiz. Mesmo texto da API; sem dado nenhum.
import type { Metadata } from 'next';
import Link from 'next/link';
import { classeDoBotao } from '../../components/Botao';
import { MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';

export const metadata: Metadata = { title: 'Página não encontrada' };

export default function NaoEncontradaNoPainel() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1>Página não encontrada</h1>
      <p>{MENSAGEM_NAO_ENCONTRADO}</p>
      <Link href="/demandas" className={`${classeDoBotao('primario')} no-underline`}>
        Voltar para a fila
      </Link>
    </div>
  );
}
