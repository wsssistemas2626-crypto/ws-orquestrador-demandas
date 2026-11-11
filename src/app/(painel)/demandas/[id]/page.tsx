// T05 Detalhe da demanda (03, T05; RF-06, RF-07, RF-12, RF-15, RF-16, RF-21, RF-24, RF-26). Server Component: a pessoa
// (C-04), `ler_demanda` (a mesma de GET /api/demandas/:id) e o id pela regex antes de tocar o banco (C-17). Id fora do
// formato ou que não existe: 404 (03, 2.8). Depois, com `ler_historico` autorizado, o histórico; o texto recebido pela
// leitura própria de pessoa (obterTextoRecebido, `ler_texto_bruto`, T17); e, quando há ESP, a mais nova, para as dúvidas
// em aberto (`ler_especificacao`). A vista da demanda nunca traz o texto bruto (RF-06). Tudo é texto: o React escapa
// título, campos, anexos, texto recebido e histórico (C-18). Falha de leitura sobe para a tela de erro (03, 2.8).
//
// T39: o alerta de chegada da T04 e da T06 sai só dos valores fixos de `?aviso=`. T41: o da T07 também, com a versão e o
// pacote conferidos contra os desta demanda.
//
// 0.2.0 (T11 do DEC-DEM-20261110-0015-v1; 03, seção 5, arranjo A2): trilha, cabeçalho (id, selos, urgência, título
// isolado por <bdi>, "Editar dados" e "Mudar status"), "Nesta página", alertas, barra das cinco etapas (RF-08), cartão
// "Próxima ação" (RF-09) e as seções de hoje em cartões, com o histórico em lista (RF-10). A partir de 1200 px, a
// Próxima ação e o Histórico vão para a coluna lateral só pela grade, sem mudar a ordem do DOM. Para a barra e o
// cartão, a página lê também o DEC mais novo da própria demanda (d.pacotesDecisao[0], nunca um id da URL), com
// `ler_pacote_decisao` autorizado antes (CV-09); as duas regras de exibição recebem só o que a página já leu.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Alerta } from '../../../../components/Alerta';
import { classeDoBotao } from '../../../../components/Botao';
import { Cartao } from '../../../../components/Cartao';
import { AVISO_DEMANDA, TEXTOS_DEMANDA } from '../../../../components/dados-da-demanda';
import { etapasDaDemanda, proximaAcao, type DadosDasEtapas } from '../../../../components/dados-das-etapas';
import { chegadaDaEspecificacao } from '../../../../components/dados-da-especificacao';
import { chegadaDoParecer } from '../../../../components/dados-do-parecer';
import {
  COR_DECISAO,
  COR_STATUS,
  ROTULO_DECISAO,
  ROTULO_LINHA,
  ROTULO_PAPEL_SOLICITANTE,
  ROTULO_STATUS,
  ROTULO_TIPO,
  ROTULO_TIPO_ANEXO,
  ROTULO_URGENCIA,
  SELO_DESATUALIZADO,
  SELO_RASCUNHO,
  SELO_SUBSTITUIDO,
} from '../../../../components/rotulos';
import { Selo } from '../../../../components/Selo';
import { Tabela } from '../../../../components/Tabela';
import { obterDeps } from '../../../../lib/deps';
import { formatarDataHora } from '../../../../lib/fuso';
import { exigirPessoaNaPagina } from '../../../../modules/acesso/exigir-pessoa';
import { autorizar } from '../../../../modules/acesso/matriz';
import type { DemandaVista, PacoteResumo, VersaoResumo } from '../../../../modules/demandas/consultas';
import { RE_ID_DEMANDA } from '../../../../modules/demandas/gerar-id';
import { obterTextoRecebido } from '../../../../modules/demandas/texto-recebido';
import { transicoesManuaisDe } from '../../../../modules/demandas/transicoes';
import { obterEspecificacao } from '../../../../modules/especificacoes/consultas';
import { listarHistorico } from '../../../../modules/historico/consultas';
import { obterPacoteDecisao } from '../../../../modules/pacotes-decisao/consultas';
import { COR_DA_URGENCIA } from '../CartoesDaFila';
import { BarraDeEtapas } from './BarraDeEtapas';
import { CartaoProximaAcao } from './CartaoProximaAcao';
import { lerDemandaDaPagina, metadadosDaDemanda } from './demanda-da-pagina';
import {
  alertasDoTopo,
  caminhos,
  duvidasEmAberto,
  faltaParaPacote,
  ID_SECAO,
  opcoesDeStatus,
  rotuloResponsavel,
  TEXTOS_DETALHE,
  textoFinalDeStatus,
  type AlertaDoTopo,
} from './detalhe';
import { Historico } from './Historico';
import { LinkNestaPagina } from './LinkNestaPagina';
import { MudarStatus } from './MudarStatus';
import { TextoRecebido } from './TextoRecebido';

type Parametros = Record<string, string | string[] | undefined>;
type Props = { params: Promise<{ id: string }>; searchParams: Promise<Parametros> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadadosDaDemanda((await params).id, TEXTOS_DETALHE.titulo);
}

// T41: a chegada da T07 (ESP gravada ou conflito de versão) só mostra versão e pacote desta demanda (chegadaDaEspecificacao).
// T42: a da T08 (RSK gravado ou conflito), pela mesma regra (chegadaDoParecer).
function alertaDeChegada(p: Parametros, d: DemandaVista, esp: { id: string; duvidasEmAberto: readonly string[] } | null): { tipo: 'sucesso' | 'erro'; texto: string } | null {
  if (p.aviso === AVISO_DEMANDA.criada) return { tipo: 'sucesso', texto: TEXTOS_DEMANDA.sucessoCriada(d.id, ROTULO_STATUS[d.status]) };
  if (p.aviso === AVISO_DEMANDA.alteracoesSalvas) return { tipo: 'sucesso', texto: TEXTOS_DEMANDA.sucessoAlteracoes };
  return chegadaDaEspecificacao(p, d, esp) ?? chegadaDoParecer(p, d);
}

const CLASSE_LINK = 'text-acao-escura underline underline-offset-2';
const ETIQUETA = 'font-mono text-xs font-semibold uppercase tracking-[0.08em] text-tinta-media';

// Grade da A2 a partir de 1200 px (03, 5.2): coluna principal (2/3) e lateral (1/3). A Próxima ação fica na primeira
// linha da lateral; o Histórico, da segunda até a última, que é flexível e absorve a altura dele. Abaixo de 1200 px,
// uma coluna na ordem do DOM. `grid-cols-1` (minmax(0, 1fr)): sem ele, a coluna implícita é `auto` e cresce com a largura
// das tabelas das versões, que têm rolagem própria, e a página rolaria de lado no celular.
const GRADE = 'grid grid-cols-1 gap-5 xl:grid-cols-3 xl:grid-rows-[repeat(5,auto)_1fr] xl:items-start';
const PRINCIPAL = 'xl:col-span-2 xl:col-start-1';

// Seção com `h2` focável, alvo da navegação "Nesta página" (03, T05, Acessibilidade). 0.2.0 (T11): cada seção num
// cartão (03, 5.2).
function Secao({ id, titulo, className, children }: { id: string; titulo: string; className?: string; children: ReactNode }) {
  return (
    <Cartao rotuloPor={id} className={`flex flex-col gap-4 ${className ?? PRINCIPAL}`}>
      <h2 id={id} tabIndex={-1}>
        {titulo}
      </h2>
      {children}
    </Cartao>
  );
}

// Trilha da T05 (03, 5.2): "Demandas" e o id atual, sem link.
function Trilha({ id }: { id: string }) {
  return (
    <nav aria-label={TEXTOS_DETALHE.trilha}>
      <ol className="flex flex-wrap items-center gap-x-2 text-sm">
        <li className="flex items-center">
          <Link href="/demandas" className="inline-flex min-h-11 items-center md:min-h-6">
            {TEXTOS_DETALHE.trilhaDemandas}
          </Link>
        </li>
        <li className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="text-tinta-media">
            /
          </span>
          <span aria-current="page" className="font-mono text-tinta-media [overflow-wrap:anywhere]">
            {id}
          </span>
        </li>
      </ol>
    </nav>
  );
}

// "Urgência: <rótulo>" com o ponto da cor da fila, escondido do leitor de tela; sem urgência informada, nada (03, 5.2).
function UrgenciaNoCabecalho({ urgencia }: { urgencia: DemandaVista['urgencia'] }) {
  if (!urgencia) return null;
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span aria-hidden="true" className={`inline-block size-2 shrink-0 rounded-full ${COR_DA_URGENCIA[urgencia]}`} />
      {TEXTOS_DETALHE.urgenciaNoCabecalho(ROTULO_URGENCIA[urgencia])}
    </span>
  );
}

function AlertaDeTopo({ a }: { a: AlertaDoTopo }) {
  return (
    <Alerta tipo={a.tipo} className="flex flex-col items-start gap-3">
      <p>
        {a.texto}
        {a.link ? (
          <>
            {' '}
            <LinkNestaPagina alvo={a.link.href.slice(1)} className={CLASSE_LINK}>
              {a.link.rotulo}
            </LinkNestaPagina>
          </>
        ) : null}
      </p>
      {a.acao ? (
        <Link href={a.acao.href} className={classeDoBotao('secundario')}>
          {a.acao.rotulo}
        </Link>
      ) : null}
    </Alerta>
  );
}

const naoInformado = (v: string | null | undefined): string => (v ? v : TEXTOS_DETALHE.naoInformado);

// 0.2.0 (T11; 03, 5.2): lista de descrição em grade de 2 colunas a partir de 768 px, com o termo como etiqueta; os
// campos longos ocupam a linha toda. Os 12 itens e os textos são os de hoje.
function Dados({ d }: { d: DemandaVista }) {
  const t = TEXTOS_DETALHE.dados;
  const largos: ReadonlySet<string> = new Set([t.justificativa, t.contexto, t.descricao, t.impacto, t.anexos]);
  const itens: ReadonlyArray<[string, ReactNode]> = [
    [t.tipo, ROTULO_TIPO[d.tipo]],
    [t.linha, naoInformado(d.linhaServicoProvavel ? ROTULO_LINHA[d.linhaServicoProvavel] : null)],
    [t.urgencia, naoInformado(d.urgencia ? ROTULO_URGENCIA[d.urgencia] : null)],
    [t.justificativa, naoInformado(d.justificativaUrgencia)],
    [t.solicitante, d.solicitanteNome],
    [t.papel, naoInformado(d.solicitantePapel ? ROTULO_PAPEL_SOLICITANTE[d.solicitantePapel] : null)],
    [t.contexto, naoInformado(d.contexto)],
    [t.descricao, naoInformado(d.descricaoProblema)],
    [t.impacto, naoInformado(d.impactoPercebido)],
    [
      t.anexos,
      d.anexos.length === 0 ? (
        TEXTOS_DETALHE.nenhumAnexo
      ) : (
        <ul className="flex list-disc flex-col gap-1 pl-6">
          {d.anexos.map((a, i) => (
            <li key={i}>{`${ROTULO_TIPO_ANEXO[a.tipo]}: ${a.referencia}${a.descricao ? ` — ${a.descricao}` : ''}`}</li>
          ))}
        </ul>
      ),
    ],
    [
      t.criadaEm,
      <time key="criada" dateTime={d.criadaEm.toISOString()}>
        {formatarDataHora(d.criadaEm)}
      </time>,
    ],
    [t.criadaPor, rotuloResponsavel(d.responsavel)],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-4 md:grid-cols-2">
      {itens.map(([termo, valor]) => (
        <div key={termo} className={largos.has(termo) ? 'flex min-w-0 flex-col gap-1 md:col-span-2' : 'flex min-w-0 flex-col gap-1'}>
          <dt className={ETIQUETA}>{termo}</dt>
          <dd className="break-words whitespace-pre-wrap">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

const versaoNaCelula = (id: string) => <span className="font-mono">{id}</span>;
const dataNaCelula = (d: Date) => <time dateTime={d.toISOString()}>{formatarDataHora(d)}</time>;
const selosNaCelula = (selos: ReactNode[]) => <span className="inline-flex flex-wrap gap-2">{selos}</span>;

const seloRascunho = (v: VersaoResumo) =>
  v.rascunhoAgente ? (
    <Selo key="rascunho" cor={SELO_RASCUNHO.cor} tracejado={SELO_RASCUNHO.tracejado}>
      {SELO_RASCUNHO.texto}
    </Selo>
  ) : null;

function acaoDaVersao(href: string, rotulo: string, id: string) {
  return (
    <Link href={href} aria-label={`${rotulo} ${id}`} className={`inline-flex min-h-6 min-w-6 items-center ${CLASSE_LINK}`}>
      {rotulo}
    </Link>
  );
}

function TabelaDeVersoes({ legenda, regiao, linhas, chaves }: { legenda: string; regiao: string; linhas: ReactNode[][]; chaves: string[] }) {
  return (
    <Tabela legenda={<span className="sr-only">{legenda}</span>} rotuloRegiao={regiao} colunas={TEXTOS_DETALHE.versoes.colunas} linhas={linhas} chaves={chaves} />
  );
}

function ListaDeVersoes({ titulo, botao, vazio, children }: { titulo: string; botao: ReactNode; vazio: string | null; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{titulo}</h3>
        {botao}
      </div>
      {vazio ? <p>{vazio}</p> : children}
    </div>
  );
}

function Versoes({ d }: { d: DemandaVista }) {
  const t = TEXTOS_DETALHE.versoes;
  const linhaSimples = (v: VersaoResumo, href: string) => [
    versaoNaCelula(v.id),
    dataNaCelula(v.criadaEm),
    rotuloResponsavel(v.autor),
    selosNaCelula([seloRascunho(v)]),
    acaoDaVersao(href, t.ver, v.id),
  ];
  const linhaDoPacote = (p: PacoteResumo) => [
    versaoNaCelula(p.id),
    dataNaCelula(p.criadaEm),
    rotuloResponsavel(p.autor),
    selosNaCelula([
      <Selo key="decisao" cor={COR_DECISAO[p.statusDecisao]}>
        {ROTULO_DECISAO[p.statusDecisao]}
      </Selo>,
      // 0.1.13: o aprovado que um aprovado mais novo da demanda substituiu.
      p.substituido ? (
        <Selo key="substituido" cor={SELO_SUBSTITUIDO.cor}>
          {SELO_SUBSTITUIDO.texto}
        </Selo>
      ) : null,
      p.desatualizado ? (
        <Selo key="desatualizado" cor={SELO_DESATUALIZADO.cor}>
          {SELO_DESATUALIZADO.texto}
        </Selo>
      ) : null,
      seloRascunho(p),
    ]),
    acaoDaVersao(caminhos.dec(p.id), t.abrirDecisao, p.id),
  ];
  const falta = faltaParaPacote(d);
  return (
    <>
      <ListaDeVersoes
        titulo={t.especificacoes}
        botao={
          <Link href={caminhos.novaEsp(d.id)} className={classeDoBotao('secundario')}>
            {t.novaEsp}
          </Link>
        }
        vazio={d.especificacoes.length === 0 ? t.nenhumaEsp : null}
      >
        <TabelaDeVersoes
          legenda={t.especificacoes}
          regiao={t.regiaoEsp}
          linhas={d.especificacoes.map((v) => linhaSimples(v, caminhos.esp(v.id)))}
          chaves={d.especificacoes.map((v) => v.id)}
        />
      </ListaDeVersoes>
      <ListaDeVersoes
        titulo={t.pareceres}
        botao={
          <Link href={caminhos.novoRsk(d.id)} className={classeDoBotao('secundario')}>
            {t.novoRsk}
          </Link>
        }
        vazio={d.pareceresRisco.length === 0 ? t.nenhumRsk : null}
      >
        <TabelaDeVersoes
          legenda={t.pareceres}
          regiao={t.regiaoRsk}
          linhas={d.pareceresRisco.map((v) => linhaSimples(v, caminhos.rsk(v.id)))}
          chaves={d.pareceresRisco.map((v) => v.id)}
        />
      </ListaDeVersoes>
      <ListaDeVersoes
        titulo={t.pacotes}
        botao={
          falta ? null : (
            <Link href={caminhos.novoDec(d.id)} className={classeDoBotao('secundario')}>
              {t.novoDec}
            </Link>
          )
        }
        vazio={d.pacotesDecisao.length === 0 ? t.nenhumDec : null}
      >
        <TabelaDeVersoes legenda={t.pacotes} regiao={t.regiaoDec} linhas={d.pacotesDecisao.map(linhaDoPacote)} chaves={d.pacotesDecisao.map((p) => p.id)} />
      </ListaDeVersoes>
      {falta ? <p className="text-tinta-media">{falta}</p> : null}
    </>
  );
}

export default async function PaginaDemanda({ params, searchParams }: Props) {
  const { id } = await params;
  const pessoa = await exigirPessoaNaPagina(RE_ID_DEMANDA.test(id) ? `/demandas/${id}` : '/demandas');
  autorizar(pessoa, 'ler_demanda');
  const d = await lerDemandaDaPagina(id);
  if (!d) notFound();
  autorizar(pessoa, 'ler_historico');
  const espMaisNova = d.especificacoes[0];
  if (espMaisNova) autorizar(pessoa, 'ler_especificacao');
  // T11 (CV-09): o DEC mais novo desta demanda, para a barra de etapas e a Próxima ação; autorizado antes de ler, como na
  // T11 Decisão. O id vem só da vista da demanda.
  const decResumo = d.pacotesDecisao[0];
  if (decResumo) autorizar(pessoa, 'ler_pacote_decisao');

  const deps = await obterDeps();
  const [historico, texto, esp, decMaisNovo] = await Promise.all([
    listarHistorico(deps.db, d.id),
    obterTextoRecebido(deps, pessoa, d.id),
    espMaisNova ? obterEspecificacao(deps.db, espMaisNova.id) : Promise.resolve(null),
    decResumo ? obterPacoteDecisao(deps.db, decResumo.id) : Promise.resolve(null),
  ]);
  const retencaoDias = deps.config.retencaoDias;
  const duvidas = duvidasEmAberto(d, esp);
  const alertas = alertasDoTopo(d, historico, duvidas !== null);
  const chegada = alertaDeChegada(await searchParams, d, esp);
  const transicoes = transicoesManuaisDe(d.status);
  // RF-08 e RF-09: só o que a página já leu; dado incoerente vira erro e a tela de erro de hoje (T10).
  const dadosDasEtapas: DadosDasEtapas = { demanda: d, espMaisNova: esp, decMaisNovo, historico, temSecaoDeDuvidas: duvidas !== null };
  const etapas = etapasDaDemanda(dadosDasEtapas);
  const acao = proximaAcao(dadosDasEtapas);
  const s = TEXTOS_DETALHE.secoes;
  const secoes = [
    [ID_SECAO.dados, s.dados],
    ...(duvidas ? [[ID_SECAO.duvidas, s.duvidas] as const] : []),
    [ID_SECAO.versoes, s.versoes],
    [ID_SECAO.status, s.status],
    [ID_SECAO.texto, s.texto],
    [ID_SECAO.historico, s.historico],
  ] as const;

  return (
    <div className="flex flex-col gap-5">
      <Trilha id={d.id} />
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="font-mono [overflow-wrap:anywhere]">{d.id}</span>
              <Selo cor={COR_STATUS[d.status]}>{ROTULO_STATUS[d.status]}</Selo>
              {d.rascunhoAgente ? (
                <Selo cor={SELO_RASCUNHO.cor} tracejado={SELO_RASCUNHO.tracejado}>
                  {SELO_RASCUNHO.texto}
                </Selo>
              ) : null}
              <UrgenciaNoCabecalho urgencia={d.urgencia} />
            </p>
            <h1 className="[overflow-wrap:anywhere]">
              <bdi>{d.titulo}</bdi>
            </h1>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link href={`/demandas/${d.id}/editar`} className={classeDoBotao('secundario')}>
              {TEXTOS_DETALHE.editar}
            </Link>
            <LinkNestaPagina alvo={ID_SECAO.status} className={classeDoBotao('secundario')}>
              {TEXTOS_DETALHE.mudarStatus}
            </LinkNestaPagina>
          </div>
        </div>
        <nav aria-label={TEXTOS_DETALHE.nestaPagina}>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {secoes.map(([alvo, rotulo]) => (
              <li key={alvo}>
                <LinkNestaPagina alvo={alvo} className={`inline-flex min-h-11 items-center md:min-h-6 ${CLASSE_LINK}`}>
                  {rotulo}
                </LinkNestaPagina>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {chegada ? (
        <Alerta tipo={chegada.tipo} envio>
          {chegada.texto}
        </Alerta>
      ) : null}
      {alertas.map((a) => (
        <AlertaDeTopo key={`${a.tipo} ${a.texto}`} a={a} />
      ))}

      <BarraDeEtapas etapas={etapas} />

      <div className={GRADE}>
        <CartaoProximaAcao acao={acao} className="xl:col-start-3 xl:row-start-1" />

        <Secao id={ID_SECAO.dados} titulo={s.dados} className={`${PRINCIPAL} xl:row-start-1`}>
          <Dados d={d} />
        </Secao>

        {duvidas ? (
          <Secao id={ID_SECAO.duvidas} titulo={s.duvidas} className={`${PRINCIPAL} border-l-4 border-l-atencao`}>
            <p className="text-tinta-media">{duvidas.origem}</p>
            <ol className="flex list-decimal flex-col gap-1 pl-6">
              {duvidas.itens.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ol>
            <p>{TEXTOS_DETALHE.notaDuvidas}</p>
          </Secao>
        ) : null}

        <Secao id={ID_SECAO.versoes} titulo={s.versoes}>
          <Versoes d={d} />
        </Secao>

        <Secao id={ID_SECAO.status} titulo={s.status}>
          <MudarStatus
            id={d.id}
            statusAtual={d.status}
            opcoes={opcoesDeStatus(d, transicoes)}
            final={textoFinalDeStatus(d.status, transicoes)}
            dicaFixa={d.status === 'aprovada' ? TEXTOS_DETALHE.dicaAprovada : null}
          />
        </Secao>

        <Secao id={ID_SECAO.texto} titulo={s.texto}>
          <TextoRecebido texto={texto} retencaoDias={retencaoDias} />
        </Secao>

        <Secao id={ID_SECAO.historico} titulo={s.historico} className="xl:col-start-3 xl:row-[2/-1]">
          <Historico eventos={historico} retencaoDias={retencaoDias} />
        </Secao>
      </div>
    </div>
  );
}
