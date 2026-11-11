// T08 Novo parecer de risco (03, T08; RF-09, RF-19). Server Component: a pessoa (C-04), a autorização de
// `criar_parecer_risco` (a mesma de POST /api/demandas/:id/pareceres-risco) e o id pela regex antes de tocar o banco
// (C-17). Id fora do formato ou que não existe: 404 (03, 2.8). A versão nova começa com o RSK mais novo da demanda, ou
// com `?base=<rskId>` vindo da T10, desde que seja um RSK desta demanda (outro, ou fora do formato, é ignorado); sem
// RSK, em branco e sem nível marcado. A versão de partida é lida com `ler_parecer_risco`. Sem ESP na demanda, o aviso da
// 03 e a gravação continua permitida (o pacote de decisão é que exige as duas).
// 0.2.0 (T14; 03, 8.2 do pedido 0015): a tela tem até 760 px de largura (`max-w-190`), com o formulário em cartões.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Alerta } from '../../../../../../components/Alerta';
import { RE_ID_RSK, TEXTOS_RSK, valoresDoParecer } from '../../../../../../components/dados-do-parecer';
import { obterDeps } from '../../../../../../lib/deps';
import type { AtorPessoa } from '../../../../../../modules/acesso/ator';
import { exigirPessoaNaPagina } from '../../../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../../../modules/acesso/matriz';
import type { DemandaVista } from '../../../../../../modules/demandas/consultas';
import { RE_ID_DEMANDA } from '../../../../../../modules/demandas/gerar-id';
import { obterParecerRisco } from '../../../../../../modules/pareceres-risco/consultas';
import { idVersao } from '../../../../../../modules/versoes';
import { lerDemandaDaPagina, metadadosDaDemanda } from '../../demanda-da-pagina';
import { FormularioParecer } from './FormularioParecer';

type Parametros = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ id: string }>; searchParams: Promise<Parametros> };

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  return metadadosDaDemanda((await params).id, TEXTOS_RSK.tituloNova);
}

// O RSK de partida: o de `?base=`, se for desta demanda; senão o mais novo; sem RSK, nenhum.
async function parecerDePartida(pessoa: AtorPessoa, d: DemandaVista, base: string | undefined) {
  const escolhido = base !== undefined && d.pareceresRisco.some((r) => r.id === base) ? base : d.pareceresRisco[0]?.id;
  if (!escolhido) return null;
  autorizar(pessoa, 'ler_parecer_risco');
  return obterParecerRisco((await obterDeps()).db, escolhido);
}

export default async function PaginaNovoParecer({ params, searchParams }: Props) {
  const { id } = await params;
  const b = (await searchParams).base;
  const base = typeof b === 'string' && RE_ID_RSK.test(b) ? b : undefined;
  const caminho = `/demandas/${id}/pareceres-risco/novo${base ? `?base=${base}` : ''}`;
  const pessoa = await exigirPessoaNaPagina(RE_ID_DEMANDA.test(id) ? caminho : '/demandas');
  autorizar(pessoa, 'criar_parecer_risco');
  const d = await lerDemandaDaPagina(id);
  if (!d) notFound();
  const partida = await parecerDePartida(pessoa, d, base);

  const versaoNova = (d.pareceresRisco[0]?.versao ?? 0) + 1;
  const idNovo = idVersao('RSK', d.id, versaoNova);
  const espMaisNova = d.especificacoes[0]?.id;

  return (
    <div className="flex max-w-190 flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="break-words">
          <span className="font-mono">{d.id}</span>
          {` — ${d.titulo}`}
        </p>
        <h1>{TEXTOS_RSK.tituloNova}</h1>
      </div>
      <Alerta tipo="informacao" className="flex flex-col gap-2">
        <p>{espMaisNova ? TEXTOS_RSK.infoProxima(idNovo, espMaisNova) : TEXTOS_RSK.semEspecificacao}</p>
        {partida?.rascunhoAgente ? <p>{TEXTOS_RSK.infoRascunho(partida.versao)}</p> : null}
      </Alerta>
      <FormularioParecer demandaId={d.id} versaoEsperada={versaoNova} idNovo={idNovo} inicial={valoresDoParecer(partida)} />
    </div>
  );
}
