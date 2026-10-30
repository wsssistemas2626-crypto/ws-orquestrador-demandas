// Moldura do painel (03, 2.7): "Pular para o conteúdo" como primeiro elemento focável, cabeçalho com a navegação e a
// conta, os avisos de agentes suspensos (RF-18) e de capacidade de ids (RNF-09) e o `main` da tela.
//
// Quem decide acesso é a página, com exigirPessoaNaPagina (C-04), que leva a /entrar com o caminho certo. A moldura só
// lê a pessoa para mostrar o nome: sem sessão válida, não mostra nada além do conteúdo, e a página redireciona.
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Alerta } from '../../components/Alerta';
import { CabecalhoPainel } from '../../components/CabecalhoPainel';
import { obterDeps } from '../../lib/deps';
import { ErroDominio } from '../../lib/erros';
import type { AtorPessoa } from '../../modules/acesso/ator';
import { exigirPessoa } from '../../modules/acesso/exigir-pessoa';
import { situacaoDoTeto } from '../../modules/agentes/teto';
import { listarDemandas } from '../../modules/demandas/consultas';
import { filtroDemandasSchema } from '../../modules/demandas/schemas';

export const metadata: Metadata = {
  title: { template: '%s — WS Orquestrador de Demandas', default: 'WS Orquestrador de Demandas' },
};

// Toda tela do painel depende da sessão: nada é pré-renderizado no `next build`, que também não tem as variáveis do app
// (C-33: a configuração só é lida na primeira requisição).
export const dynamic = 'force-dynamic';

// RNF-09: o id comporta 9.999 demandas; o aviso aparece acima de 9.000.
const LIMITE_AVISO_CAPACIDADE = 9_000;

type Moldura = { pessoa: AtorPessoa; agentesSuspensos: boolean; totalDemandas: number };

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
  const { total } = await listarDemandas(deps.db, filtroDemandasSchema.parse({ limit: 1 }));
  // Teto 0 (o de fábrica) é "teto não definido", tratado na tela de agentes e teto (03, T12); o aviso da moldura é o da
  // suspensão por gasto, com um teto definido.
  return { pessoa, agentesSuspensos: teto.tetoMensal > 0 && teto.suspenso, totalDemandas: total };
}

export default async function LayoutPainel({ children }: Readonly<{ children: ReactNode }>) {
  const moldura = await lerMoldura();
  if (!moldura) return <>{children}</>;
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-campo focus:bg-fundo focus:px-4 focus:py-2"
      >
        Pular para o conteúdo
      </a>
      <CabecalhoPainel nome={moldura.pessoa.nome} papel={moldura.pessoa.papel} />
      {moldura.agentesSuspensos || moldura.totalDemandas > LIMITE_AVISO_CAPACIDADE ? (
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 pt-4">
          {moldura.agentesSuspensos ? (
            <Alerta tipo="atencao">
              <p>
                Agentes de IA suspensos: o gasto do mês atingiu o teto. Nenhum agente chama o provedor até o teto subir ou o mês virar.
                Preencha os campos à mão.
              </p>
              <Link href="/configuracao/agentes" className="text-atencao-texto">
                Ver agentes e teto
              </Link>
            </Alerta>
          ) : null}
          {moldura.totalDemandas > LIMITE_AVISO_CAPACIDADE ? (
            <Alerta tipo="atencao">
              <p>
                {`Atenção: já existem ${moldura.totalDemandas.toLocaleString('pt-BR')} demandas. O formato do id comporta até 9.999. Avise o time técnico para planejar a mudança.`}
              </p>
            </Alerta>
          ) : null}
        </div>
      ) : null}
      <main id="conteudo" tabIndex={-1} className="mx-auto max-w-6xl px-4 py-6">
        {children}
      </main>
    </>
  );
}
