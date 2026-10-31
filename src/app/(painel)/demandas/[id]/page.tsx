// T05 Detalhe da demanda — PROVISÓRIA (T39). Só o que a T04 e a T06 precisam do destino: o cabeçalho (id, selo de
// status, "Rascunho de agente", título em `h1`, "Editar dados") e o alerta de sucesso da tela de origem (03, T05,
// Sucesso: "ao chegar de T04 … o alerta de sucesso da tela de origem"). A T40 completa a tela (dados, dúvidas, versões,
// mudar status, texto recebido e histórico).
//
// Server Component: a pessoa (C-04), `ler_demanda` (a mesma de GET /api/demandas/:id) e o id pela regex antes de tocar o
// banco (C-17). Id fora do formato ou que não existe: 404 (03, 2.8). O alerta só sai dos valores fixos de `?aviso=`.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Alerta } from '../../../../components/Alerta';
import { classeDoBotao } from '../../../../components/Botao';
import { AVISO_DEMANDA, TEXTOS_DEMANDA } from '../../../../components/dados-da-demanda';
import { COR_STATUS, ROTULO_STATUS, SELO_RASCUNHO } from '../../../../components/rotulos';
import { Selo } from '../../../../components/Selo';
import { exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../modules/acesso/matriz';
import type { DemandaVista } from '../../../../modules/demandas/consultas';
import { RE_ID_DEMANDA } from '../../../../modules/demandas/gerar-id';
import { lerDemandaDaPagina, metadadosDaDemanda } from './demanda-da-pagina';

type Parametros = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ id: string }>; searchParams: Promise<Parametros> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadadosDaDemanda((await params).id, 'Detalhe da demanda');
}

function alertaDeChegada(aviso: unknown, d: DemandaVista): string | null {
  if (aviso === AVISO_DEMANDA.criada) return TEXTOS_DEMANDA.sucessoCriada(d.id, ROTULO_STATUS[d.status]);
  if (aviso === AVISO_DEMANDA.alteracoesSalvas) return TEXTOS_DEMANDA.sucessoAlteracoes;
  return null;
}

export default async function PaginaDemanda({ params, searchParams }: Props) {
  const { id } = await params;
  const pessoa = await exigirPessoaNaPagina(RE_ID_DEMANDA.test(id) ? `/demandas/${id}` : '/demandas');
  autorizar(pessoa, 'ler_demanda');
  const d = await lerDemandaDaPagina(id);
  if (!d) notFound();
  const alerta = alertaDeChegada((await searchParams).aviso, d);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <p className="flex flex-wrap items-center gap-3">
          <span className="font-mono">{d.id}</span>
          <Selo cor={COR_STATUS[d.status]}>{ROTULO_STATUS[d.status]}</Selo>
          {d.rascunhoAgente ? (
            <Selo cor={SELO_RASCUNHO.cor} tracejado={SELO_RASCUNHO.tracejado}>
              {SELO_RASCUNHO.texto}
            </Selo>
          ) : null}
        </p>
        <h1>{d.titulo}</h1>
      </div>
      {alerta ? (
        <Alerta tipo="sucesso" envio>
          {alerta}
        </Alerta>
      ) : null}
      <div>
        <Link href={`/demandas/${d.id}/editar`} className={classeDoBotao('secundario')}>
          Editar dados
        </Link>
      </div>
    </div>
  );
}
