// Sem permissão (03, 2.8): para onde exigirPessoaNaPagina leva a conta cujo papel não abre o painel. Por isso fica fora
// do grupo (painel) e não chama exigirPessoaNaPagina (seria um redirecionamento sem fim). Texto fixo, sem sessão nem
// dado: nada aqui depende de quem abre.
import type { Metadata } from 'next';
import Link from 'next/link';
import { classeDoBotao } from '../../components/Botao';
import { MENSAGENS_ACESSO } from '../../modules/acesso/mensagens';

export const metadata: Metadata = { title: 'Sem permissão — WS Orquestrador de Demandas' };

// A CSP leva um nonce novo a cada requisição (src/proxy.ts, C-19): página pré-renderizada sairia com scripts sem ele.
export const dynamic = 'force-dynamic';

export default function SemPermissao() {
  return (
    <main id="conteudo" tabIndex={-1} className="mx-auto flex max-w-3xl flex-col items-start gap-4 px-4 py-10">
      <h1>Sem permissão</h1>
      <p>{MENSAGENS_ACESSO.sem_permissao}</p>
      <Link href="/demandas" className={`${classeDoBotao('primario')} no-underline`}>
        Voltar para a fila
      </Link>
    </main>
  );
}
