// T07 Nova versão da especificação técnica (03, T07; RF-08, RF-15, RF-19). Server Component: a pessoa (C-04), a
// autorização de `criar_especificacao` (a mesma de POST /api/demandas/:id/especificacoes) e o id pela regex antes de
// tocar o banco (C-17). Id fora do formato ou que não existe: 404 (03, 2.8). A versão nova começa com a ESP mais nova da
// demanda, ou com `?base=<espId>` vindo da T10, desde que seja uma ESP desta demanda (outra, ou fora do formato, é
// ignorada); sem ESP, em branco. A versão de partida é lida com `ler_especificacao`.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Alerta } from '../../../../../../components/Alerta';
import { RE_ID_ESP, rotulosDaConstrucao, TEXTOS_ESP, valoresDaEspecificacao } from '../../../../../../components/dados-da-especificacao';
import { obterDeps } from '../../../../../../lib/deps';
import type { AtorPessoa } from '../../../../../../modules/acesso/ator';
import { exigirPessoaNaPagina } from '../../../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../../../modules/acesso/matriz';
import type { DemandaVista } from '../../../../../../modules/demandas/consultas';
import { RE_ID_DEMANDA } from '../../../../../../modules/demandas/gerar-id';
import { obterEspecificacao } from '../../../../../../modules/especificacoes/consultas';
import { idVersao } from '../../../../../../modules/versoes';
import { lerDemandaDaPagina, metadadosDaDemanda } from '../../demanda-da-pagina';
import { FormularioEspecificacao } from './FormularioEspecificacao';

type Parametros = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ id: string }>; searchParams: Promise<Parametros> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadadosDaDemanda((await params).id, TEXTOS_ESP.tituloNova);
}

// A ESP de partida: a de `?base=`, se for desta demanda; senão a mais nova; sem ESP, nenhuma.
async function especificacaoDePartida(pessoa: AtorPessoa, d: DemandaVista, base: string | undefined) {
  const escolhida = base !== undefined && d.especificacoes.some((e) => e.id === base) ? base : d.especificacoes[0]?.id;
  if (!escolhida) return null;
  autorizar(pessoa, 'ler_especificacao');
  return obterEspecificacao((await obterDeps()).db, escolhida);
}

export default async function PaginaNovaEspecificacao({ params, searchParams }: Props) {
  const { id } = await params;
  const b = (await searchParams).base;
  const base = typeof b === 'string' && RE_ID_ESP.test(b) ? b : undefined;
  const caminho = `/demandas/${id}/especificacoes/nova${base ? `?base=${base}` : ''}`;
  const pessoa = await exigirPessoaNaPagina(RE_ID_DEMANDA.test(id) ? caminho : '/demandas');
  autorizar(pessoa, 'criar_especificacao');
  const d = await lerDemandaDaPagina(id);
  if (!d) notFound();
  const partida = await especificacaoDePartida(pessoa, d, base);

  const versaoNova = (d.especificacoes[0]?.versao ?? 0) + 1;
  const idNovo = idVersao('ESP', d.id, versaoNova);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <p className="break-words">
          <span className="font-mono">{d.id}</span>
          {` — ${d.titulo}`}
        </p>
        <h1>{TEXTOS_ESP.tituloNova}</h1>
      </div>
      <Alerta tipo="informacao" className="flex flex-col gap-2">
        <p>{partida ? TEXTOS_ESP.infoProxima(idNovo, partida.versao) : TEXTOS_ESP.infoPrimeira}</p>
        {partida?.rascunhoAgente ? <p>{TEXTOS_ESP.infoRascunho(partida.versao)}</p> : null}
      </Alerta>
      <FormularioEspecificacao
        demandaId={d.id}
        tipo={d.tipo}
        versaoEsperada={versaoNova}
        idNovo={idNovo}
        rotulos={rotulosDaConstrucao(d.tipo)}
        inicial={valoresDaEspecificacao(partida)}
      />
    </div>
  );
}
