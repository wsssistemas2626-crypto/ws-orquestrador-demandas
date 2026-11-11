// T10 Ver versão de RSK (03, T10; RF-09, RF-11). Server Component, somente leitura: a pessoa (C-04), `ler_parecer_risco`
// (a mesma de GET /api/pareceres-risco/:rskId) e o id pela regex de RSK antes de tocar o banco (C-17); depois
// `ler_demanda`, para o título da demanda. Id fora do formato ou que não existe: 404 "Versão não encontrada". Não há
// botão de editar nem de excluir (RF-11): a correção é uma versão nova, a partir desta. Os níveis aparecem em texto
// ("Risco técnico: Alto"). Tudo é texto: o React escapa os campos (C-18). Falha de leitura sobe para a tela de erro (2.8).
// 0.2.0 (T15; 03, 8.2 do pedido 0015): cada seção é um Cartao, com o mesmo `aria-labelledby`, `h2` e `dl`.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Alerta } from '../../../../components/Alerta';
import { classeDoBotao } from '../../../../components/Botao';
import { Cartao } from '../../../../components/Cartao';
import { RE_ID_RSK, secoesDoParecer, TEXTOS_RSK } from '../../../../components/dados-do-parecer';
import { SELO_RASCUNHO } from '../../../../components/rotulos';
import { Selo } from '../../../../components/Selo';
import { formatarDataHora } from '../../../../lib/fuso';
import { exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../modules/acesso/matriz';
import { lerDemandaDaPagina } from '../../demandas/[id]/demanda-da-pagina';
import { caminhos, rotuloResponsavel } from '../../demandas/[id]/detalhe';
import { lerParecerDaPagina, metadadosDoParecer } from './parecer-da-pagina';

type Props = { params: Promise<{ rskId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadadosDoParecer((await params).rskId, TEXTOS_RSK.tituloAba);
}

const CLASSE_LINK = 'text-acao-escura underline underline-offset-2';

export default async function PaginaParecer({ params }: Props) {
  const { rskId } = await params;
  const pessoa = await exigirPessoaNaPagina(RE_ID_RSK.test(rskId) ? `/pareceres-risco/${rskId}` : '/demandas');
  autorizar(pessoa, 'ler_parecer_risco');
  const r = await lerParecerDaPagina(rskId);
  if (!r) notFound();
  autorizar(pessoa, 'ler_demanda');
  const d = await lerDemandaDaPagina(r.demandaId);
  if (!d) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="flex flex-wrap items-center gap-3">
          <span className="font-mono">{r.id}</span>
          {r.rascunhoAgente ? (
            <Selo cor={SELO_RASCUNHO.cor} tracejado={SELO_RASCUNHO.tracejado}>
              {SELO_RASCUNHO.texto}
            </Selo>
          ) : null}
        </p>
        <h1 className="break-words">{TEXTOS_RSK.tituloVer(r.versao, d.titulo)}</h1>
        <p>
          {TEXTOS_RSK.criadaEm}
          <time dateTime={r.criadaEm.toISOString()}>{formatarDataHora(r.criadaEm)}</time>
          {TEXTOS_RSK.por(rotuloResponsavel(r.autor))}
        </p>
      </div>

      <Alerta tipo="informacao">
        <p>{TEXTOS_RSK.naoMuda}</p>
      </Alerta>
      {r.rascunhoAgente ? (
        <Alerta tipo="atencao">
          <p>{TEXTOS_RSK.rascunhoVer}</p>
        </Alerta>
      ) : null}
      {r.versaoMaisNova !== r.id ? (
        <Alerta tipo="atencao">
          <p>
            {TEXTOS_RSK.maisNova}
            <Link href={caminhos.rsk(r.versaoMaisNova)} className={`font-mono ${CLASSE_LINK}`}>
              {r.versaoMaisNova}
            </Link>
            .
          </p>
        </Alerta>
      ) : null}

      {secoesDoParecer(r).map((s, n) => (
        <Cartao key={s.titulo} rotuloPor={`secao-${n}`} className="flex flex-col gap-3">
          <h2 id={`secao-${n}`} className="text-xl font-semibold">
            {s.titulo}
          </h2>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(10rem,auto)_1fr]">
            {s.itens.map((i) => (
              <div key={i.termo} className="contents">
                <dt className="font-medium">{i.termo}</dt>
                <dd className="break-words whitespace-pre-wrap">
                  {Array.isArray(i.valor) ? (
                    <ul className="flex list-disc flex-col gap-1 pl-6">
                      {i.valor.map((x, k) => (
                        <li key={k}>{x}</li>
                      ))}
                    </ul>
                  ) : (
                    i.valor
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Cartao>
      ))}

      <div className="flex flex-wrap items-center gap-4">
        <Link href={`${caminhos.novoRsk(d.id)}?base=${r.id}`} className={`${classeDoBotao('primario')} no-underline`}>
          {TEXTOS_RSK.criarAPartir}
        </Link>
        <Link href={`/demandas/${d.id}`} className={classeDoBotao('link')}>
          {TEXTOS_RSK.voltar}
        </Link>
      </div>
    </div>
  );
}
