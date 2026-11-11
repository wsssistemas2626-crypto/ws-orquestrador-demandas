// T03 Fila de demandas (03, T03; RF-06, RF-26, T-03). Server Component: o filtro da URL passa por
// filtroDemandasSchema; inválido, a tela avisa e mostra a lista sem filtro. Os filtros se aplicam só pelo botão
// "Filtrar" (FiltrosFila.tsx). A tabela carrega dentro de um Suspense com a chave do filtro: a cada filtro ou página, o
// esqueleto aparece até a lista nova chegar. O aviso de capacidade (RNF-09) fica na moldura (layout do painel).
//
// T37: ao concluir a T02, a fila mostra "Verificação em duas etapas ativada." (03, T02, Sucesso), pelo parâmetro fixo
// `aviso=2fa-ativado`. Só esse valor mostra o alerta; o texto é fixo e nada da URL vai para a tela.
// T39: do mesmo jeito, `aviso=entrada-enviada` mostra o sucesso do modo agente da T04 (03, T04, Sucesso).
//
// 0.2.0 (T09 do DEC-DEM-20261110-0015-v1; 03, seção 4, arranjo A1): etiqueta "Fila", contadores por status num Suspense
// próprio (chave do tipo e da linha: o status não remonta o grupo), e o cartão do resultado com os filtros, o título, a
// tabela (ou a lista de cartões abaixo de 768 px) e a paginação. As duas leituras novas (contagem e etapas) vêm de
// leituras-da-fila.ts, só por esta página, e rodam dentro dos componentes que ela devolve, depois da guarda C-04 (CV-06).
// O "agora" da coluna Idade é o do relógio injetado.
import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Alerta } from '../../../components/Alerta';
import { classeDoBotao } from '../../../components/Botao';
import { Cartao } from '../../../components/Cartao';
import { AVISO_DEMANDA, TEXTOS_DEMANDA } from '../../../components/dados-da-demanda';
import { contadoresDaFila } from '../../../components/dados-da-fila';
import { MENSAGENS_2FA } from '../../../lib/auth-cliente';
import { obterDeps } from '../../../lib/deps';
import { log } from '../../../lib/log';
import { exigirPessoaNaPagina } from '../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../modules/acesso/matriz';
import { listarDemandas } from '../../../modules/demandas/consultas';
import { listarEntradasPendentes, type EntradaPendenteResumo } from '../../../modules/demandas/entradas-pendentes';
import type { EtapasNaFila } from '../../../modules/demandas/resumo-da-fila';
import type { FiltroDemandas } from '../../../modules/demandas/schemas';
import { ContadoresDaFila } from './ContadoresDaFila';
import { EntradasAguardando } from './EntradasAguardando';
import { CarregandoFila, ErroDaFila, hrefDaFila, ID_RESULTADO, lerFiltroDaFila, ResultadoDaFila, TEXTOS_FILA } from './fila';
import { AvisoDaFila, FiltrosFila } from './FiltrosFila';
import { contagemOuNada, etapasDaPagina } from './leituras-da-fila';

export const metadata: Metadata = { title: 'Demandas' };

type Parametros = Record<string, string | string[] | undefined>;

// A lista e as etapas das demandas dela, no mesmo `try`: a falha de qualquer das duas é o erro da lista (03, 4.6).
async function ListaDaFila({ filtro }: { filtro: FiltroDemandas }) {
  const deps = await obterDeps();
  const agora = deps.relogio.agora();
  let lista: Awaited<ReturnType<typeof listarDemandas>>;
  let etapas: Map<string, EtapasNaFila>;
  try {
    lista = await listarDemandas(deps.db, filtro);
    etapas = await etapasDaPagina(deps.db, lista.itens.map((d) => d.id));
  } catch (e) {
    log.error({ evento: 'painel_fila_falhou', rota: '/demandas', erro: e });
    return <ErroDaFila />;
  }
  return <ResultadoDaFila filtro={filtro} itens={lista.itens} total={lista.total} etapas={etapas} agora={agora} />;
}

// Os contadores com a contagem do tipo e da linha da URL; contagem que falhou (null) deixa os botões sem número e mostra
// o texto da 03 (CV-08: o log é o de contagemOuNada).
async function ContadoresDaPagina({ filtro }: { filtro: FiltroDemandas }) {
  const deps = await obterDeps();
  const contagem = await contagemOuNada(deps.db, filtro);
  return (
    <ContadoresDaFila
      contadores={contadoresDaFila(contagem, filtro, hrefDaFila)}
      filtro={{ tipo: filtro.tipo, linhaServicoProvavel: filtro.linhaServicoProvavel }}
      idFoco={ID_RESULTADO}
      erro={contagem === null}
    />
  );
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
  const chaveDosContadores = `contadores ${filtro.tipo ?? ''} ${filtro.linhaServicoProvavel ?? ''}`;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.08em] text-tinta-media">{TEXTOS_FILA.etiqueta}</p>
          <h1>Demandas</h1>
        </div>
        <Link href="/demandas/nova" className={classeDoBotao('primario')}>
          <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <path d="M12 5v14M5 12h14" />
          </svg>
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
      <Suspense
        key={chaveDosContadores}
        fallback={
          <ContadoresDaFila
            contadores={contadoresDaFila(null, filtro, hrefDaFila)}
            filtro={{ tipo: filtro.tipo, linhaServicoProvavel: filtro.linhaServicoProvavel }}
            idFoco={ID_RESULTADO}
            carregando
          />
        }
      >
        <ContadoresDaPagina filtro={filtro} />
      </Suspense>
      <Suspense fallback={null}>
        <ListaDeEntradas />
      </Suspense>
      <Cartao className="flex flex-col gap-4">
        {/* A chave remonta os filtros a cada endereço: as seleções voltam ao filtro da URL (Limpar, Voltar). */}
        <FiltrosFila key={`filtros ${chave}`} filtro={filtro} idFoco={ID_RESULTADO} />
        <div className="text-sm">
          <AvisoDaFila />
        </div>
        <Suspense key={`lista ${chave}`} fallback={<CarregandoFila filtro={filtro} />}>
          <ListaDaFila filtro={filtro} />
        </Suspense>
      </Cartao>
    </div>
  );
}
