// Casca do painel (03, seção 3 do pedido 0015; ADR-15): "Pular para o conteúdo" como primeiro elemento focável; o
// menu (lateral a partir de 768 px, barra e gaveta abaixo) com a conta; e, na coluna do conteúdo, os avisos de agentes
// suspensos (RF-18) e de capacidade de ids (RNF-09) acima do `main` da tela.
//
// Quem decide acesso é a página, com exigirPessoaNaPagina (C-04), que leva a /entrar com o caminho certo. A moldura só
// lê a pessoa para mostrar o nome e o papel, que vão ao menu por prop (CV-16): sem sessão válida, não mostra nada além
// do conteúdo, e a página redireciona.
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { AvisosDaMoldura } from '../../components/AvisosDaMoldura';
import { CabecalhoPainel } from '../../components/CabecalhoPainel';
import { obterDeps } from '../../lib/deps';
import { ErroDominio } from '../../lib/erros';
import type { AtorPessoa } from '../../modules/acesso/ator';
import { exigirPessoa } from '../../modules/acesso/exigir-pessoa';
import { situacaoDoTeto } from '../../modules/agentes/teto';
import { totalDeDemandas } from '../../modules/demandas/gerar-id';

export const metadata: Metadata = {
  title: { template: '%s — WS Orquestrador de Demandas', default: 'WS Orquestrador de Demandas' },
};

// Toda tela do painel depende da sessão: nada é pré-renderizado no `next build`, que também não tem as variáveis do app
// (C-33: a configuração só é lida na primeira requisição).
export const dynamic = 'force-dynamic';

type Moldura = { pessoa: AtorPessoa; tetoMensal: number; suspenso: boolean; totalDemandas: number };

async function lerMoldura(): Promise<Moldura | null> {
  const cabecalhos = await headers();
  const deps = await obterDeps();
  let pessoa: AtorPessoa;
  try {
    pessoa = await exigirPessoa(deps, cabecalhos);
  } catch (e) {
    if (e instanceof ErroDominio) return null;
    throw e;
  }
  const teto = await situacaoDoTeto(deps.db, deps.relogio);
  const totalDemandas = await totalDeDemandas(deps.db);
  return { pessoa, tetoMensal: teto.tetoMensal, suspenso: teto.suspenso, totalDemandas };
}

export default async function LayoutPainel({ children }: Readonly<{ children: ReactNode }>) {
  const moldura = await lerMoldura();
  if (!moldura) return <>{children}</>;
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-campo focus:bg-branco focus:px-4 focus:py-2 focus:text-acao-escura"
      >
        Pular para o conteúdo
      </a>
      <div className="md:flex">
        <CabecalhoPainel nome={moldura.pessoa.nome} papel={moldura.pessoa.papel} />
        <div className="min-w-0 flex-1">
          <AvisosDaMoldura tetoMensal={moldura.tetoMensal} suspenso={moldura.suspenso} totalDemandas={moldura.totalDemandas} />
          <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-300 px-4 py-6 md:px-6 xl:px-8 xl:py-8">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
