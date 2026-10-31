// T05 Detalhe da demanda (03, T05; RF-06, RF-07, RF-12, RF-15, RF-16, RF-21, RF-24, RF-26). Server Component: a pessoa
// (C-04), `ler_demanda` (a mesma de GET /api/demandas/:id) e o id pela regex antes de tocar o banco (C-17). Id fora do
// formato ou que não existe: 404 (03, 2.8). Depois, com `ler_historico` autorizado, o histórico; o texto recebido pela
// leitura própria de pessoa (obterTextoRecebido, `ler_texto_bruto`, T17); e, quando há ESP, a mais nova, para as dúvidas
// em aberto (`ler_especificacao`). A vista da demanda nunca traz o texto bruto (RF-06). Tudo é texto: o React escapa
// título, campos, anexos, texto recebido e histórico (C-18). Falha de leitura sobe para a tela de erro (03, 2.8).
//
// T39: o alerta de chegada da T04 e da T06 sai só dos valores fixos de `?aviso=`. T41: o da T07 também, com a versão e o
// pacote conferidos contra os desta demanda.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { Alerta } from '../../../../components/Alerta';
import { classeDoBotao } from '../../../../components/Botao';
import { AVISO_DEMANDA, TEXTOS_DEMANDA } from '../../../../components/dados-da-demanda';
import { chegadaDaEspecificacao } from '../../../../components/dados-da-especificacao';
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
function alertaDeChegada(p: Parametros, d: DemandaVista, esp: { id: string; duvidasEmAberto: readonly string[] } | null): { tipo: 'sucesso' | 'erro'; texto: string } | null {
  if (p.aviso === AVISO_DEMANDA.criada) return { tipo: 'sucesso', texto: TEXTOS_DEMANDA.sucessoCriada(d.id, ROTULO_STATUS[d.status]) };
  if (p.aviso === AVISO_DEMANDA.alteracoesSalvas) return { tipo: 'sucesso', texto: TEXTOS_DEMANDA.sucessoAlteracoes };
  return chegadaDaEspecificacao(p, d, esp);
}

const CLASSE_LINK = 'text-primaria underline underline-offset-2';

// Seção com `h2` focável, alvo da navegação "Nesta página" (03, T05, Acessibilidade).
function Secao({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <h2 id={id} tabIndex={-1} className="text-xl font-semibold">
        {titulo}
      </h2>
      {children}
    </section>
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

function Dados({ d }: { d: DemandaVista }) {
  const t = TEXTOS_DETALHE.dados;
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
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(10rem,auto)_1fr]">
      {itens.map(([termo, valor]) => (
        <div key={termo} className="contents">
          <dt className="font-medium">{termo}</dt>
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
      {falta ? <p className="text-texto-suave">{falta}</p> : null}
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

  const deps = await obterDeps();
  const [historico, texto, esp] = await Promise.all([
    listarHistorico(deps.db, d.id),
    obterTextoRecebido(deps, pessoa, d.id),
    espMaisNova ? obterEspecificacao(deps.db, espMaisNova.id) : Promise.resolve(null),
  ]);
  const retencaoDias = deps.config.retencaoDias;
  const duvidas = duvidasEmAberto(d, esp);
  const alertas = alertasDoTopo(d, historico, duvidas !== null);
  const chegada = alertaDeChegada(await searchParams, d, esp);
  const transicoes = transicoesManuaisDe(d.status);
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
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
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
        <div>
          <Link href={`/demandas/${d.id}/editar`} className={classeDoBotao('secundario')}>
            {TEXTOS_DETALHE.editar}
          </Link>
        </div>
        <nav aria-label={TEXTOS_DETALHE.nestaPagina}>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {secoes.map(([alvo, rotulo]) => (
              <li key={alvo}>
                <LinkNestaPagina alvo={alvo} className={`inline-flex min-h-6 items-center ${CLASSE_LINK}`}>
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

      <Secao id={ID_SECAO.dados} titulo={s.dados}>
        <Dados d={d} />
      </Secao>

      {duvidas ? (
        <Secao id={ID_SECAO.duvidas} titulo={s.duvidas}>
          <p className="text-texto-suave">{duvidas.origem}</p>
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

      <Secao id={ID_SECAO.historico} titulo={s.historico}>
        <Historico eventos={historico} retencaoDias={retencaoDias} />
      </Secao>
    </div>
  );
}
