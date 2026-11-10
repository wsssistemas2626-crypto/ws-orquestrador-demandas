// T11 Decisão do pacote (03, T11; RF-12, RF-13, RF-14; 04, C-14; P1-a, P1-b, P1-d). Server Component: a pessoa (C-04),
// `ler_pacote_decisao` (a mesma de GET /api/pacotes-decisao/:decId) e o id pela regex de DEC antes de tocar o banco
// (C-17); depois `ler_demanda`, para as versões mais novas (alerta de desatualizado) e o status (lembrete de P1-d). Id
// fora do formato ou que não existe: 404 (03, 2.8). O conteúdo é o copiado no pacote; a revisão de C-14 vem antes do
// formulário; quem vê o formulário segue a 03 (formularioDaConta), e a regra que vale é a do servidor. Tudo é texto: o
// React escapa título, opções e comentários (C-18). A seção do Pedido de Construção (T44) vem depois de "Registrar
// decisão", só com a decisão aprovada completa (secaoDoPedido); Estudo mostra só a frase da 03, sem botão. O DEC
// substituído por um aprovado mais novo (0.1.13) mostra o selo, o aviso com o link para o substituto e não tem a seção.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Alerta } from '../../../../components/Alerta';
import {
  alertaDeDesatualizado,
  alertaDeSubstituido,
  chegadaNaDecisao,
  formularioDaConta,
  itensDaRevisao,
  linhasDeAprovacao,
  opcoesDaDecisao,
  opcoesDaEscolha,
  rascunhosEmTexto,
  secoesDasOpcoes,
  textoDaDecisaoRegistrada,
  TEXTOS_DECISAO,
} from '../../../../components/dados-da-decisao';
import { RE_ID_DEC } from '../../../../components/dados-do-pacote';
import { secaoDoPedido, TEXTOS_PEDIDO } from '../../../../components/dados-do-pedido';
import { COR_DECISAO, ROTULO_DECISAO, ROTULO_NIVEL_APROVACAO, SELO_DESATUALIZADO, SELO_RASCUNHO, SELO_SUBSTITUIDO } from '../../../../components/rotulos';
import { Selo } from '../../../../components/Selo';
import { formatarDataHora } from '../../../../lib/fuso';
import { exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../modules/acesso/matriz';
import { lerDemandaDaPagina } from '../../demandas/[id]/demanda-da-pagina';
import { caminhos, rotuloResponsavel } from '../../demandas/[id]/detalhe';
import { AlertaDeResultado, FormularioDecisao } from './FormularioDecisao';
import { lerPacoteDaPagina, metadadosDoPacote } from './pacote-da-pagina';
import { RevisaoDoPacote } from './RevisaoDoPacote';
import { SecaoPedido } from './SecaoPedido';

type Parametros = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ decId: string }>; searchParams: Promise<Parametros> };

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  return metadadosDoPacote((await params).decId, TEXTOS_DECISAO.tituloAba);
}

const CLASSE_LINK = 'text-primaria underline underline-offset-2';

function Secao({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-xl font-semibold">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

export default async function PaginaDecisao({ params, searchParams }: Props) {
  const { decId } = await params;
  const pessoa = await exigirPessoaNaPagina(RE_ID_DEC.test(decId) ? `/pacotes-decisao/${decId}` : '/demandas');
  autorizar(pessoa, 'ler_pacote_decisao');
  const p = await lerPacoteDaPagina(decId);
  if (!p) notFound();
  autorizar(pessoa, 'ler_demanda');
  const d = await lerDemandaDaPagina(p.demandaId);
  if (!d) notFound();

  const t = TEXTOS_DECISAO;
  const chegada = chegadaNaDecisao(await searchParams, p);
  const substituido = alertaDeSubstituido(p);
  const desatualizado = alertaDeDesatualizado(p, d);
  const aprovacoes = linhasDeAprovacao(p);
  const formulario = formularioDaConta(p, pessoa);
  const decidida = textoDaDecisaoRegistrada(p);
  // P1-d: o lembrete de levar a demanda a Aprovada é do DEC que vale; o substituído não o mostra (0.1.13).
  const lembrete = p.statusDecisao === 'aprovada' && !p.substituido && d.status === 'pronta_para_decisao';
  const pedido = secaoDoPedido(p);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <p className="flex flex-wrap items-center gap-3">
          <span className="font-mono">{p.id}</span>
          <Selo cor={COR_DECISAO[p.statusDecisao]}>{ROTULO_DECISAO[p.statusDecisao]}</Selo>
          {p.substituido ? <Selo cor={SELO_SUBSTITUIDO.cor}>{SELO_SUBSTITUIDO.texto}</Selo> : null}
          {p.desatualizado ? <Selo cor={SELO_DESATUALIZADO.cor}>{SELO_DESATUALIZADO.texto}</Selo> : null}
          {p.rascunhoAgente ? (
            <Selo cor={SELO_RASCUNHO.cor} tracejado={SELO_RASCUNHO.tracejado}>
              {SELO_RASCUNHO.texto}
            </Selo>
          ) : null}
        </p>
        <h1 className="break-words">{t.titulo(p.demandaTitulo)}</h1>
        <p>
          {t.demanda}
          <Link href={`/demandas/${p.demandaId}`} className={`font-mono ${CLASSE_LINK}`}>
            {p.demandaId}
          </Link>
          {t.nivelNaLinha(ROTULO_NIVEL_APROVACAO[p.nivelAprovacaoRequerido])}
          <time dateTime={p.criadaEm.toISOString()}>{formatarDataHora(p.criadaEm)}</time>
          {t.por(rotuloResponsavel(p.autor))}
        </p>
        <p>
          {t.cita}
          <span className="font-mono">{p.especificacaoId}</span>{' '}
          (
          <Link href={caminhos.esp(p.especificacaoId)} aria-label={`${t.ver} ${p.especificacaoId}`} className={CLASSE_LINK}>
            {t.ver}
          </Link>
          ) · <span className="font-mono">{p.parecerRiscoId}</span>{' '}
          (
          <Link href={caminhos.rsk(p.parecerRiscoId)} aria-label={`${t.ver} ${p.parecerRiscoId}`} className={CLASSE_LINK}>
            {t.ver}
          </Link>
          )
        </p>
      </div>

      {chegada ? <AlertaDeResultado key={chegada}>{chegada}</AlertaDeResultado> : null}
      {lembrete ? (
        <Alerta tipo="informacao" className="flex flex-col items-start gap-2">
          <p>{t.lembrete}</p>
          <Link href={`/demandas/${p.demandaId}`} className={CLASSE_LINK}>
            {t.irParaDemanda}
          </Link>
        </Alerta>
      ) : null}
      {substituido ? (
        <Alerta tipo="atencao" className="flex flex-col items-start gap-2">
          <p>{substituido.texto}</p>
          <Link href={substituido.link.href} className={CLASSE_LINK}>
            {substituido.link.rotulo}
          </Link>
        </Alerta>
      ) : null}
      {desatualizado ? (
        <Alerta tipo="erro" className="flex flex-col items-start gap-2">
          <p>{desatualizado.texto}</p>
          <Link href={desatualizado.link.href} className={CLASSE_LINK}>
            {desatualizado.link.rotulo}
          </Link>
        </Alerta>
      ) : null}
      {p.rascunhosCitados.length > 0 ? (
        <Alerta tipo="atencao">
          <p>{t.alertaRascunho(rascunhosEmTexto(p.rascunhosCitados))}</p>
        </Alerta>
      ) : null}

      <RevisaoDoPacote itens={itensDaRevisao(p)} />

      <Secao id="resumo-executivo" titulo={t.resumoExecutivo}>
        <p className="break-words whitespace-pre-wrap">{p.resumoExecutivo}</p>
      </Secao>

      <Secao id="opcoes" titulo={t.opcoes}>
        <div className="grid gap-6 lg:grid-cols-2">
          {secoesDasOpcoes(p).map((s, n) => (
            <section key={s.titulo} aria-labelledby={`opcao-${n}`} className="flex min-w-0 flex-col gap-3">
              <h3 id={`opcao-${n}`} className="text-lg font-semibold">
                {s.titulo}
              </h3>
              <dl className="flex flex-col gap-2">
                {s.itens.map((i) => (
                  <div key={i.termo}>
                    <dt className="font-medium">{i.termo}</dt>
                    <dd className="break-words whitespace-pre-wrap">{i.valor}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </Secao>

      <Secao id="recomendacao" titulo={p.rascunhoAgente ? t.recomendacaoAgente : t.recomendacao}>
        <p className="break-words whitespace-pre-wrap">{p.recomendacao ?? t.naoInformado}</p>
      </Secao>

      {aprovacoes ? (
        <Secao id="aprovacoes" titulo={t.aprovacoes}>
          <ul className="flex flex-col gap-1">
            {aprovacoes.map((linha) => (
              <li key={linha} className="break-words">
                {linha}
              </li>
            ))}
          </ul>
          <p className="text-sm text-texto-suave">{t.notaAprovacoes}</p>
        </Secao>
      ) : null}

      <Secao id="registrar-decisao-titulo" titulo={t.registrar}>
        {formulario.tipo === 'formulario' ? (
          <FormularioDecisao
            decId={p.id}
            contexto={{
              opcaoFixada: formulario.opcaoFixada,
              pedeDocumento: formulario.pedeDocumento,
              exigeRevisao: p.rascunhosCitados.length > 0,
              aprovarIndisponivel: p.desatualizado,
            }}
            opcoesDecisao={opcoesDaDecisao(p.desatualizado)}
            opcoesEscolha={opcoesDaEscolha(p)}
            repositorioDestino={p.especificacaoCitada.repositorioDestino}
            nivelAprovacaoRequerido={p.nivelAprovacaoRequerido}
          />
        ) : formulario.tipo === 'sem_formulario' ? (
          <p>{formulario.texto}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <p>{decidida}</p>
            {p.decisao?.comentarios ? (
              <dl>
                <dt className="font-medium">{t.comentariosDaDecisao}</dt>
                <dd className="break-words whitespace-pre-wrap">{p.decisao.comentarios}</dd>
              </dl>
            ) : null}
          </div>
        )}
      </Secao>

      {pedido !== 'nenhuma' ? (
        <Secao id="pedido-construcao" titulo={TEXTOS_PEDIDO.titulo}>
          {pedido === 'estudo' ? <p>{TEXTOS_PEDIDO.estudo}</p> : <SecaoPedido decId={p.id} />}
        </Secao>
      ) : null}
    </div>
  );
}
