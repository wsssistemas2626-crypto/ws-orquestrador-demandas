// T11 Decisão do pacote (03, T11; RF-12, RF-13, RF-14; 04, C-14; P1-a, P1-b, P1-d). Server Component: a pessoa (C-04),
// `ler_pacote_decisao` (a mesma de GET /api/pacotes-decisao/:decId) e o id pela regex de DEC antes de tocar o banco
// (C-17); depois `ler_demanda`, para as versões mais novas (alerta de desatualizado) e o status (lembrete de P1-d). Id
// fora do formato ou que não existe: 404 (03, 2.8). O conteúdo é o copiado no pacote; a revisão de C-14 vem antes do
// formulário; quem vê o formulário segue a 03 (formularioDaConta), e a regra que vale é a do servidor. Tudo é texto: o
// React escapa título, opções e comentários (C-18). A seção do Pedido de Construção (T44) vem depois de "Registrar
// decisão", só com a decisão aprovada completa (secaoDoPedido); Estudo mostra só a frase da 03, sem botão. O DEC
// substituído por um aprovado mais novo (0.1.13) mostra o selo, o aviso com o link para o substituto e não tem a seção.
//
// 0.2.0 (T13 do DEC-DEM-20261110-0015-v1; RF-12; 03, 6.2 e 6.3; D-02, D-16): uma ordem de DOM só, em toda largura:
// cabeçalho ("Voltar para a demanda" só abaixo de 768 px, id, selos, h1 com o título isolado por <bdi>, a linha da
// demanda, a do repositório destino e as citações); alertas de hoje; Aprovações; Resumo executivo; Recomendação;
// revisão de C-14, a parte sempre visível; o recolhível (só abaixo de 768 px) com a parte de detalhe da revisão e as
// opções completas; "Registrar decisão"; Pedido de Construção. A partir de 1200 px, o conteúdo fica em 3/5 e o cartão
// "Registrar decisão" em 2/5, não fixo; abaixo, uma coluna, e abaixo de 768 px o rodapé fixo da C2 (FormularioDecisao).
// Nada sai do que a T11 mostra hoje, e as condições de cada parte são as de hoje.
//
// 0.3.0 (T19 do DEC-DEM-20261111-0016-v1; RF-15, CA-15.1 e CA-15.2; 03, 6.1 e 6.3): depois de autorizar e de achar o
// pacote, a página lê o primeiro pedido_recebido do DEC no histórico (recebimentoDoPedido, T10). Com ele, a linha
// "Recebido pelo /construir em …" entra no cabeçalho, depois do repositório destino e antes das citações, em toda
// situação do DEC; sem ele, nada. Falha na leitura sobe para a tela de erro de hoje.
//
// 0.4.1 (T12 do DEC-DEM-20261111-0018-v1; RF-03, RF-06; ADR-40; 03, 4.2 a 4.7; SB-12; D-10 a D-12): depois de autorizar
// e de achar o pacote, a página lê o aprovado vigente da demanda e, só quando o aberto é o vigente e o mais novo é outro
// DEC pendente e atualizado, o mais novo (o nível dele). Com isso, um dos avisos (a), (b) ou (c) entra entre o aviso do
// substituído e o alerta de desatualizado, a dica do Arquivar diz o destino da tabela do servidor
// (destinoDoArquivamento) e a chegada depois de arquivar diz o status gravado. Os avisos só informam: os botões não
// mudam. Falha na leitura sobe para a tela de erro de hoje.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Alerta } from '../../../../components/Alerta';
import { Cartao } from '../../../../components/Cartao';
import {
  alertaDeDesatualizado,
  alertaDeSubstituido,
  avisoDeVigencia,
  chegadaNaDecisao,
  dicaDoArquivar,
  formularioDaConta,
  itensDaRevisao,
  linhaDoRecebimento,
  linhasDeAprovacao,
  opcoesDaEscolha,
  rascunhosEmTexto,
  secoesDasOpcoes,
  separarRevisao,
  textoDaDecisaoRegistrada,
  TEXTOS_DECISAO,
} from '../../../../components/dados-da-decisao';
import { RE_ID_DEC } from '../../../../components/dados-do-pacote';
import { secaoDoPedido, TEXTOS_PEDIDO } from '../../../../components/dados-do-pedido';
import { Recolhivel } from '../../../../components/Recolhivel';
import { COR_DECISAO, ROTULO_DECISAO, ROTULO_NIVEL_APROVACAO, SELO_DESATUALIZADO, SELO_RASCUNHO, SELO_SUBSTITUIDO } from '../../../../components/rotulos';
import { Selo } from '../../../../components/Selo';
import { obterDeps } from '../../../../lib/deps';
import { formatarDataHora } from '../../../../lib/fuso';
import { exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../modules/acesso/matriz';
import { destinoDoArquivamento, estadoDoVigente } from '../../../../modules/demandas/arquivamento';
import { RE_ID_DEMANDA } from '../../../../modules/demandas/gerar-id';
import { vigenteDaDemanda } from '../../../../modules/pacotes-decisao/substituido';
import { recebimentoDoPedido } from '../../../../modules/pedido-construcao/pendentes';
import { lerDemandaDaPagina } from '../../demandas/[id]/demanda-da-pagina';
import { caminhos, rotuloResponsavel } from '../../demandas/[id]/detalhe';
import { AlertaDeResultado, FormularioDecisao } from './FormularioDecisao';
import { lerPacoteDaPagina, metadadosDoPacote } from './pacote-da-pagina';
import { DetalheDaRevisao, RevisaoDoPacote } from './RevisaoDoPacote';
import { SecaoPedido } from './SecaoPedido';

type Parametros = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ decId: string }>; searchParams: Promise<Parametros> };

export async function generateMetadata({ params }: Pick<Props, 'params'>): Promise<Metadata> {
  return metadadosDoPacote((await params).decId, TEXTOS_DECISAO.tituloAba);
}

const CLASSE_LINK = 'text-acao-escura underline underline-offset-2';
// Link solto (03, 2.4): o dos alertas, fora do <p>, sem texto solto ao lado. 44 px de alvo abaixo de 768 px (RNF-03);
// sem `inline-flex`, o `min-height` não vale num <a>. O link dentro de frase fica com CLASSE_LINK.
const CLASSE_LINK_SOLTO = `inline-flex min-h-11 items-center md:min-h-6 ${CLASSE_LINK}`;
// O bloco do recolhível (D-02): abaixo de 768 px começa fechado; a partir de 768 px fica sempre aberto, sem botão.
const ID_DOS_DETALHES = 'detalhes-do-pacote';

// Seção da T11 num cartão (03, 2.4 e 6.2), com o h2 que dá o nome à região.
function Secao({ id, titulo, className, children }: { id: string; titulo: string; className?: string; children: ReactNode }) {
  return (
    <Cartao rotuloPor={id} className={`flex min-w-0 flex-col gap-3${className ? ` ${className}` : ''}`}>
      <h2 id={id}>{titulo}</h2>
      {children}
    </Cartao>
  );
}

// "‹ Voltar para a demanda" (03, 6.3): só abaixo de 768 px, com 44 px de alvo; no computador, o link da demanda já está
// na linha do cabeçalho. CV-19: rota fixa mais o id da demanda do pacote, só quando ele casa a regex de hoje.
function VoltarParaDemanda({ demandaId }: { demandaId: string }) {
  if (!RE_ID_DEMANDA.test(demandaId)) return null;
  return (
    <Link href={`/demandas/${demandaId}`} className={`inline-flex min-h-11 items-center gap-1 self-start md:hidden ${CLASSE_LINK}`}>
      <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="m15 18-6-6 6-6" />
      </svg>
      {TEXTOS_DECISAO.voltarParaDemanda}
    </Link>
  );
}

// "Recebido pelo /construir em <data e hora>." (03, 6.1 e seção 10): o visto do contador pressionado, decorativo e na
// cor `positivo`; o texto em `tinta`, com a data em <time> (a do fim da frase, por lastIndexOf). Conteúdo estático: sem
// role, sem foco. O texto fica num <span> próprio, para o espaço do flex não cair entre as partes da frase.
function LinhaDoRecebimento({ em }: { em: Date }) {
  const linha = linhaDoRecebimento(em);
  if (!linha) return null;
  const data = formatarDataHora(em);
  const i = linha.texto.lastIndexOf(data);
  return (
    <p className="flex items-start gap-2 text-tinta">
      <svg className="mt-1 size-4 shrink-0 text-positivo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        <path d="m5 12 5 5 9-10" />
      </svg>
      <span>
        {linha.texto.slice(0, i)}
        <time dateTime={linha.iso}>{data}</time>
        {linha.texto.slice(i + data.length)}
      </span>
    </p>
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
  const db = (await obterDeps()).db;
  // RF-15: só depois de autorizar e de achar o pacote; a leitura é do histórico, sem ação nova na matriz.
  const recebidoEm = await recebimentoDoPedido(db, p.id);
  // 0.4.1 (RF-06, ADR-40): o vigente, só depois de autorizar e de achar o pacote (SB-12, oráculo); o mais novo, só com o
  // aberto vigente e o mais novo outro, pendente e atualizado (D-12), pelo id da vista da demanda, já lida com ler_demanda.
  const vigente = await vigenteDaDemanda(db, p.demandaId);
  const maisNovo = d.pacotesDecisao[0] ?? null;
  const pendente =
    vigente?.id === p.id && maisNovo && maisNovo.id !== p.id && maisNovo.statusDecisao === 'pendente' && !maisNovo.desatualizado
      ? await lerPacoteDaPagina(maisNovo.id)
      : null;

  const t = TEXTOS_DECISAO;
  const chegada = chegadaNaDecisao(await searchParams, p, { statusDaDemanda: d.status, vigente });
  const substituido = alertaDeSubstituido(p);
  const aviso = avisoDeVigencia(p, {
    statusDaDemanda: d.status,
    maisNovoId: maisNovo?.id ?? null,
    vigente,
    // O mais novo lido de novo pode já não estar pendente (decidido entre as duas leituras): sem aviso.
    pendenteMaisNovo:
      pendente && pendente.statusDecisao === 'pendente' ? { id: pendente.id, nivel: pendente.nivelAprovacaoRequerido, desatualizado: pendente.desatualizado } : null,
  });
  const dicaArquivar = dicaDoArquivar(destinoDoArquivamento(d.status, estadoDoVigente(vigente)), d.status, vigente?.id ?? null);
  const desatualizado = alertaDeDesatualizado(p, d);
  const aprovacoes = linhasDeAprovacao(p);
  const formulario = formularioDaConta(p, pessoa);
  const decidida = textoDaDecisaoRegistrada(p);
  // P1-d: o lembrete de levar a demanda a Aprovada é do DEC que vale; o substituído não o mostra (0.1.13).
  const lembrete = p.statusDecisao === 'aprovada' && !p.substituido && d.status === 'pronta_para_decisao';
  const pedido = secaoDoPedido(p);
  const revisao = separarRevisao(itensDaRevisao(p));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <VoltarParaDemanda demandaId={p.demandaId} />
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
        {/* CV-18: o título copiado no pacote é texto de terceiro, isolado por <bdi>; o prefixo é o de hoje. */}
        <h1 className="break-words">
          {t.titulo('')}
          <bdi>{p.demandaTitulo}</bdi>
        </h1>
        <p>
          {t.demanda}
          <Link href={`/demandas/${p.demandaId}`} className={`font-mono ${CLASSE_LINK}`}>
            {p.demandaId}
          </Link>
          {t.nivelNaLinha(ROTULO_NIVEL_APROVACAO[p.nivelAprovacaoRequerido])}
          <time dateTime={p.criadaEm.toISOString()}>{formatarDataHora(p.criadaEm)}</time>
          {t.por(rotuloResponsavel(p.autor))}
        </p>
        {/* RF-12 e CV-12: o repositório destino visível sem abrir nada, em toda largura. */}
        <p className="[overflow-wrap:anywhere]">{t.repositorioNaLinha(p.especificacaoCitada.repositorioDestino)}</p>
        {recebidoEm ? <LinhaDoRecebimento em={recebidoEm} /> : null}
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
          <Link href={`/demandas/${p.demandaId}`} className={CLASSE_LINK_SOLTO}>
            {t.irParaDemanda}
          </Link>
        </Alerta>
      ) : null}
      {substituido ? (
        <Alerta tipo="atencao" className="flex flex-col items-start gap-2">
          <p>{substituido.texto}</p>
          <Link href={substituido.link.href} className={CLASSE_LINK_SOLTO}>
            {substituido.link.rotulo}
          </Link>
        </Alerta>
      ) : null}
      {/* 0.4.1 (03, 4.2 e seção 9): estático, sem role; o id em texto corrido quebra sem rolagem lateral. */}
      {aviso ? (
        <Alerta tipo="atencao" className="flex flex-col items-start gap-2">
          <p className="[overflow-wrap:anywhere]">{aviso.texto}</p>
          <Link href={aviso.link.href} className={CLASSE_LINK_SOLTO}>
            {aviso.link.rotulo}
          </Link>
        </Alerta>
      ) : null}
      {desatualizado ? (
        <Alerta tipo="erro" className="flex flex-col items-start gap-2">
          <p>{desatualizado.texto}</p>
          <Link href={desatualizado.link.href} className={CLASSE_LINK_SOLTO}>
            {desatualizado.link.rotulo}
          </Link>
        </Alerta>
      ) : null}
      {p.rascunhosCitados.length > 0 ? (
        <Alerta tipo="atencao">
          <p>{t.alertaRascunho(rascunhosEmTexto(p.rascunhosCitados))}</p>
        </Alerta>
      ) : null}

      {/* A partir de 1200 px, conteúdo (3/5) e "Registrar decisão" (2/5) lado a lado, no topo; o pedido na linha toda. */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-5 xl:items-start">
        <div className="flex min-w-0 flex-col gap-5 xl:col-span-3">
          {aprovacoes ? (
            <Secao id="aprovacoes" titulo={t.aprovacoes}>
              <ul className="flex flex-col gap-1">
                {aprovacoes.map((linha) => (
                  <li key={linha} className="break-words">
                    {linha}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-tinta-media">{t.notaAprovacoes}</p>
            </Secao>
          ) : null}

          <Secao id="resumo-executivo" titulo={t.resumoExecutivo}>
            <p className="break-words whitespace-pre-wrap">{p.resumoExecutivo}</p>
          </Secao>

          <Secao id="recomendacao" titulo={p.rascunhoAgente ? t.recomendacaoAgente : t.recomendacao}>
            <p className="break-words whitespace-pre-wrap">{p.recomendacao ?? t.naoInformado}</p>
          </Secao>

          {/* C-14 e CV-12: a revisão antes do formulário; só critérios e definição de pronto vão para o recolhível. */}
          <RevisaoDoPacote itens={revisao.sempre} />

          <Recolhivel id={ID_DOS_DETALHES} rotulo={t.verDetalhes}>
            <div className="flex flex-col gap-5">
              <DetalheDaRevisao itens={revisao.detalhe} />
              <Secao id="opcoes" titulo={t.opcoes}>
                <div className="grid gap-6 lg:grid-cols-2">
                  {secoesDasOpcoes(p).map((s, n) => (
                    <section key={s.titulo} aria-labelledby={`opcao-${n}`} className="flex min-w-0 flex-col gap-3">
                      <h3 id={`opcao-${n}`}>{s.titulo}</h3>
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
            </div>
          </Recolhivel>
        </div>

        <Secao id="registrar-decisao-titulo" titulo={t.registrar} className="xl:col-span-2">
          {formulario.tipo === 'formulario' ? (
            <FormularioDecisao
              decId={p.id}
              contexto={{
                opcaoFixada: formulario.opcaoFixada,
                pedeDocumento: formulario.pedeDocumento,
                exigeRevisao: p.rascunhosCitados.length > 0,
                aprovarIndisponivel: p.desatualizado,
              }}
              opcoesEscolha={opcoesDaEscolha(p)}
              repositorioDestino={p.especificacaoCitada.repositorioDestino}
              nivelAprovacaoRequerido={p.nivelAprovacaoRequerido}
              dicaArquivar={dicaArquivar}
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
          <Secao id="pedido-construcao" titulo={TEXTOS_PEDIDO.titulo} className="xl:col-span-5">
            {pedido === 'estudo' ? <p>{TEXTOS_PEDIDO.estudo}</p> : <SecaoPedido decId={p.id} nivelAprovacaoRequerido={p.nivelAprovacaoRequerido} />}
          </Secao>
        ) : null}
      </div>
    </div>
  );
}
