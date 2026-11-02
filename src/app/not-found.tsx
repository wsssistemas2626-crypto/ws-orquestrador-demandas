// Não encontrado (03, 2.8): endereço que não existe e id que não existe, com o mesmo texto da API. Sem dado nenhum: a
// página não lê sessão nem banco.
import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { classeDoBotao } from '../components/Botao';
import { MENSAGEM_NAO_ENCONTRADO } from '../lib/erros';

export const metadata: Metadata = { title: 'Página não encontrada — WS Orquestrador de Demandas' };

// `connection()`: renderizada a cada requisição, como o resto, para os scripts levarem o nonce da CSP (src/proxy.ts,
// C-19); pré-renderizada no build, sairia sem ele.
export default async function NaoEncontrada() {
  await connection();
  return (
    <main id="conteudo" tabIndex={-1} className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-4 py-10">
      <h1>Página não encontrada</h1>
      <p>{MENSAGEM_NAO_ENCONTRADO}</p>
      <Link href="/demandas" className={`${classeDoBotao('primario')} no-underline`}>
        Voltar para a fila
      </Link>
    </main>
  );
}
