// T02 Configurar verificação em duas etapas (03, T02). Fora do grupo (painel): abre só com a sessão curta de conta sem
// 2FA (exigirSessaoParaConfigurar2fa, T09). Sem sessão → /entrar; conta com 2FA → /demandas; papel inválido →
// /sem-permissao. Nenhuma outra tela do painel abre antes de concluir (C-04 c, C-08).
import type { Metadata } from 'next';
import { exigirSessaoParaConfigurar2fa } from '../../modules/acesso/exigir-pessoa';
import { AssistenteDoisFatores } from './AssistenteDoisFatores';

export const metadata: Metadata = { title: 'Configurar verificação em duas etapas — WS Orquestrador de Demandas' };

export const dynamic = 'force-dynamic';

export default async function PaginaConfigurar2fa() {
  await exigirSessaoParaConfigurar2fa();
  return (
    <>
      <header className="border-b border-borda bg-fundo">
        <p className="mx-auto max-w-3xl px-4 py-3 font-semibold">WS Orquestrador de Demandas</p>
      </header>
      <main id="conteudo" tabIndex={-1} className="mx-auto max-w-3xl px-4 py-8">
        <AssistenteDoisFatores />
      </main>
    </>
  );
}
