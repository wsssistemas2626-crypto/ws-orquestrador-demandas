// T03 Fila de demandas (03, T03; RF-06, RF-26, T-03). Server Component: o filtro da URL passa por
// filtroDemandasSchema; inválido, a tela avisa e mostra a lista sem filtro. Os filtros se aplicam só pelo botão
// "Filtrar" (FiltrosFila.tsx). A tabela carrega dentro de um Suspense com a chave do filtro: a cada filtro ou página, o
// esqueleto aparece até a lista nova chegar. O aviso de capacidade (RNF-09) fica na moldura (layout do painel).
//
// T37: ao concluir a T02, a fila mostra "Verificação em duas etapas ativada." (03, T02, Sucesso), pelo parâmetro fixo
// `aviso=2fa-ativado`. Só esse valor mostra o alerta; o texto é fixo e nada da URL vai para a tela.
// T39: do mesmo jeito, `aviso=entrada-enviada` mostra o sucesso do modo agente da T04 (03, T04, Sucesso).
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Alerta } from '../../../components/Alerta';
import { classeDoBotao } from '../../../components/Botao';
import { AVISO_DEMANDA, TEXTOS_DEMANDA } from '../../../components/dados-da-demanda';
import { MENSAGENS_2FA } from '../../../lib/auth-cliente';
import { obterDeps } from '../../../lib/deps';
import { log } from '../../../lib/log';
import { exigirPessoaNaPagina } from '../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../modules/acesso/matriz';
import { listarDemandas } from '../../../modules/demandas/consultas';
import { listarEntradasPendentes, type EntradaPendenteResumo } from '../../../modules/demandas/entradas-pendentes';
import type { FiltroDemandas } from '../../../modules/demandas/schemas';
import { EntradasAguardando } from './EntradasAguardando';
import { CarregandoFila, ErroDaFila, hrefDaFila, ID_RESULTADO, lerFiltroDaFila, ResultadoDaFila, TEXTOS_FILA } from './fila';
import { AvisoDaFila, FiltrosFila } from './FiltrosFila';

export const metadata: Metadata = { title: 'Demandas' };

type Parametros = Record<string, string | string[] | undefined>;

async function ListaDaFila({ filtro }: { filtro: FiltroDemandas }) {
  const deps = await obterDeps();
  let lista: Awaited<ReturnType<typeof listarDemandas>>;
  try {
    lista = await listarDemandas(deps.db, filtro);
  } catch (e) {
    log.error({ evento: 'painel_fila_falhou', rota: '/demandas', erro: e });
    return <ErroDaFila />;
  }
  return <ResultadoDaFila filtro={filtro} itens={lista.itens} total={lista.total} />;
}

// A lista de entradas é complementar: se a leitura falhar, a fila continua, sem ela.
async function ListaDeEntradas() {
  const deps = await obterDeps();
  let entradas: EntradaPendenteResumo[];
  try {
    entradas = await listarEntradasPendentes(deps.db);
  } catch (e) {
    log.error({ evento: 'painel_entradas_falhou', rota: '/demandas', erro: e });
    return null;
  }
  return <EntradasAguardando entradas={entradas} />;
}

export default async function PaginaDemandas({ searchParams }: { searchParams: Promise<Parametros> }) {
  const pessoa = await exigirPessoaNaPagina('/demandas');
  autorizar(pessoa, 'listar_demandas');
  const parametros = await searchParams;
  const { filtro, invalido } = lerFiltroDaFila(parametros);
  const chave = hrefDaFila(filtro, filtro.offset);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1>Demandas</h1>
        <Link href="/demandas/nova" className={classeDoBotao('primario')}>
          Nova demanda
        </Link>
      </div>
      {parametros.aviso === '2fa-ativado' ? (
        <Alerta tipo="sucesso" envio>
          {MENSAGENS_2FA.ativada}
        </Alerta>
      ) : null}
      {parametros.aviso === AVISO_DEMANDA.enviada ? (
        <Alerta tipo="sucesso" envio>
          {TEXTOS_DEMANDA.sucessoEnviada}
        </Alerta>
      ) : null}
      {invalido ? <Alerta tipo="atencao">{TEXTOS_FILA.filtroInvalido}</Alerta> : null}
      <Suspense fallback={null}>
        <ListaDeEntradas />
      </Suspense>
      {/* A chave remonta os filtros a cada endereço: as seleções voltam ao filtro da URL (Limpar, Voltar). */}
      <FiltrosFila key={`filtros ${chave}`} filtro={filtro} idFoco={ID_RESULTADO} />
      <AvisoDaFila />
      <Suspense key={`lista ${chave}`} fallback={<CarregandoFila filtro={filtro} />}>
        <ListaDaFila filtro={filtro} />
      </Suspense>
    </div>
  );
}
