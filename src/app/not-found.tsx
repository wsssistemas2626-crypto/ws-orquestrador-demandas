// Não encontrado (03, 2.8): endereço que não existe e id que não existe, com o mesmo texto da API. Sem dado nenhum: a
// página não lê sessão nem banco. 0.2.0 (RF-13): moldura pública, com a marca como link para a fila.
import type { Metadata } from 'next';
import Link from 'next/link';
import { connection } from 'next/server';
import { classeDoBotao } from '../components/Botao';
import { MolduraPublica } from '../components/casca/MolduraPublica';
import { MENSAGEM_NAO_ENCONTRADO } from '../lib/erros';

export const metadata: Metadata = { title: 'Página não encontrada — WS Orquestrador de Demandas' };

// `connection()`: renderizada a cada requisição, como o resto, para os scripts levarem o nonce da CSP (src/proxy.ts,
// C-19); pré-renderizada no build, sairia sem ele.
export default async function NaoEncontrada() {
  await connection();
  return (
    <MolduraPublica comLinkNaMarca>
      <div className="flex flex-col gap-4">
        <h1>Página não encontrada</h1>
        <p>{MENSAGEM_NAO_ENCONTRADO}</p>
        <Link href="/demandas" className={`${classeDoBotao('primario')} w-full no-underline`}>
          Voltar para a fila
        </Link>
      </div>
    </MolduraPublica>
  );
}
