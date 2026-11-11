// T10 Ver versão de ESP (03, T10; RF-08, RF-11). Server Component, somente leitura: a pessoa (C-04), `ler_especificacao`
// (a mesma de GET /api/especificacoes/:espId) e o id pela regex de ESP antes de tocar o banco (C-17); depois
// `ler_demanda`, para o título da demanda. Id fora do formato ou que não existe: 404 "Versão não encontrada". Não há
// botão de editar nem de excluir (RF-11): a correção é uma versão nova, a partir desta. Tudo é texto: o React escapa
// os campos (C-18). Falha de leitura sobe para a tela de erro (03, 2.8).
// 0.2.0 (T15; 03, 8.2 do pedido 0015): cada seção é um Cartao, com o mesmo `aria-labelledby`, `h2` e `dl`.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Alerta } from '../../../../components/Alerta';
import { classeDoBotao } from '../../../../components/Botao';
import { Cartao } from '../../../../components/Cartao';
import { RE_ID_ESP, secoesDaVista, TEXTOS_ESP } from '../../../../components/dados-da-especificacao';
import { SELO_RASCUNHO } from '../../../../components/rotulos';
import { Selo } from '../../../../components/Selo';
import { formatarDataHora } from '../../../../lib/fuso';
import { exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../modules/acesso/matriz';
import { lerDemandaDaPagina } from '../../demandas/[id]/demanda-da-pagina';
import { caminhos, rotuloResponsavel } from '../../demandas/[id]/detalhe';
import { lerEspecificacaoDaPagina, metadadosDaEspecificacao } from './especificacao-da-pagina';

type Props = { params: Promise<{ espId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadadosDaEspecificacao((await params).espId, TEXTOS_ESP.tituloAba);
}

const CLASSE_LINK = 'text-acao-escura underline underline-offset-2';

export default async function PaginaEspecificacao({ params }: Props) {
  const { espId } = await params;
  const pessoa = await exigirPessoaNaPagina(RE_ID_ESP.test(espId) ? `/especificacoes/${espId}` : '/demandas');
  autorizar(pessoa, 'ler_especificacao');
  const e = await lerEspecificacaoDaPagina(espId);
  if (!e) notFound();
  autorizar(pessoa, 'ler_demanda');
  const d = await lerDemandaDaPagina(e.demandaId);
  if (!d) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="flex flex-wrap items-center gap-3">
          <span className="font-mono">{e.id}</span>
          {e.rascunhoAgente ? (
            <Selo cor={SELO_RASCUNHO.cor} tracejado={SELO_RASCUNHO.tracejado}>
              {SELO_RASCUNHO.texto}
            </Selo>
          ) : null}
        </p>
        <h1 className="break-words">{TEXTOS_ESP.tituloVer(e.versao, d.titulo)}</h1>
        <p>
          {TEXTOS_ESP.criadaEm}
          <time dateTime={e.criadaEm.toISOString()}>{formatarDataHora(e.criadaEm)}</time>
          {TEXTOS_ESP.por(rotuloResponsavel(e.autor))}
        </p>
      </div>

      <Alerta tipo="informacao">
        <p>{TEXTOS_ESP.naoMuda}</p>
      </Alerta>
      {e.rascunhoAgente ? (
        <Alerta tipo="atencao">
          <p>{TEXTOS_ESP.rascunhoVer}</p>
        </Alerta>
      ) : null}
      {e.versaoMaisNova !== e.id ? (
        <Alerta tipo="atencao">
          <p>
            {TEXTOS_ESP.maisNova}
            <Link href={caminhos.esp(e.versaoMaisNova)} className={`font-mono ${CLASSE_LINK}`}>
              {e.versaoMaisNova}
            </Link>
            .
          </p>
        </Alerta>
      ) : null}

      {secoesDaVista(e).map((s, n) => (
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
                      {i.valor.map((x, n) => (
                        <li key={n}>{x}</li>
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
        <Link href={`${caminhos.novaEsp(d.id)}?base=${e.id}`} className={`${classeDoBotao('primario')} no-underline`}>
          {TEXTOS_ESP.criarAPartir}
        </Link>
        <Link href={`/demandas/${d.id}`} className={classeDoBotao('link')}>
          {TEXTOS_ESP.voltar}
        </Link>
      </div>
    </div>
  );
}
