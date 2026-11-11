// T03 Fila de demandas (03, T03): leitura do filtro da URL, textos da tabela e os estados da lista (com dados, vazio,
// erro e carregando). Só do servidor: importa o schema do filtro, que não vai ao navegador. O que precisa de script
// (aplicar o filtro, foco no resultado, anúncio da contagem) fica em FiltrosFila.tsx e ContadoresDaFila.tsx.
//
// 0.2.0 (T09 do DEC-DEM-20261110-0015-v1; 03, seção 4): o título do resultado é um h2 com o id de foco, e a tabela leva
// a mesma legenda num caption só para leitor de tela. A partir de 768 px, a tabela densa (com Etapas e Idade); abaixo, a
// lista de cartões (CartoesDaFila.tsx). As duas estão no DOM e uma fica escondida por largura.
import Link from 'next/link';
import { Alerta } from '../../../components/Alerta';
import { classeDoBotao } from '../../../components/Botao';
import { Esqueleto } from '../../../components/Esqueleto';
import { MarcasDeEtapa } from '../../../components/MarcasDeEtapa';
import { Paginacao } from '../../../components/Paginacao';
import { COR_STATUS, ROTULO_LINHA, ROTULO_STATUS, ROTULO_TIPO, SELO_RASCUNHO } from '../../../components/rotulos';
import { Selo } from '../../../components/Selo';
import { Tabela } from '../../../components/Tabela';
import type { DemandaResumo } from '../../../modules/demandas/consultas';
import type { EtapasNaFila } from '../../../modules/demandas/resumo-da-fila';
import { filtroDemandasSchema, type FiltroDemandas } from '../../../modules/demandas/schemas';
import { CartoesDaFila, etapasDe, ID_RESULTADO, IdadeDaDemanda, UrgenciaDaDemanda } from './CartoesDaFila';
import { BotaoTentarDeNovo, NavegacaoDaFila, ResultadoAnunciado } from './FiltrosFila';

// O elemento que recebe o foco depois de filtrar ou trocar de página: o título do resultado (h2), ou o texto do estado
// vazio ou do erro, quando não há resultado. Um só no DOM, nas duas larguras. Declarado em CartoesDaFila.tsx, cuja
// lista leva o nome desse título, e exportado daqui como antes.
export { ID_RESULTADO };

export const TEXTOS_FILA = {
  filtroInvalido: 'Algum filtro do endereço não é válido. Mostrando todas as demandas.',
  vazio: 'Nenhuma demanda ainda. Crie a primeira colando o texto do pedido.',
  vazioComFiltro: 'Nenhuma demanda com esses filtros.',
  erro: 'Não foi possível carregar as demandas. Tente de novo em instantes.',
  carregando: 'Carregando demandas…',
  naoInformada: 'Não informada',
  rotuloRegiao: 'Tabela de demandas',
  // 0.2.0 (03, seção 9): a etiqueta acima do h1.
  etiqueta: 'Fila',
} as const;

// 0.2.0 (03, seção 9): entra "Etapas"; "Criada em" vira "Idade".
const COLUNAS = ['Id', 'Título', 'Tipo', 'Status', 'Etapas', 'Urgência', 'Linha de serviço', 'Idade'] as const;
const PADRAO = filtroDemandasSchema.parse({});

type Parametros = Record<string, string | string[] | undefined>;

// Valor vazio é a opção "Todos": o formulário sem script envia `status=`, e isso não é filtro inválido. Qualquer outro
// valor fora do schema (inclusive chave repetida, que chega como lista) invalida o filtro inteiro, e a lista volta sem
// filtro (03, T03, Erro).
export function lerFiltroDaFila(p: Parametros): { filtro: FiltroDemandas; invalido: boolean } {
  const preenchidos = Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ''));
  const r = filtroDemandasSchema.safeParse(preenchidos);
  return r.success ? { filtro: r.data, invalido: false } : { filtro: PADRAO, invalido: true };
}

export const temFiltro = (f: FiltroDemandas): boolean => Boolean(f.status || f.tipo || f.linhaServicoProvavel);

// "Demandas com status Aguardando informação, da mais nova para a mais antiga" (03, T03). Com mais de um filtro, as
// partes vêm na ordem dos campos, ligadas por vírgula e "e".
export function legendaDaFila(f: FiltroDemandas): string {
  const partes = [
    f.status ? `status ${ROTULO_STATUS[f.status]}` : null,
    f.tipo ? `tipo ${ROTULO_TIPO[f.tipo]}` : null,
    f.linhaServicoProvavel ? `linha de serviço ${ROTULO_LINHA[f.linhaServicoProvavel]}` : null,
  ].filter((x): x is string => x !== null);
  if (partes.length === 0) return 'Demandas, da mais nova para a mais antiga';
  const ultima = partes.pop();
  const lista = partes.length > 0 ? `${partes.join(', ')} e ${ultima}` : ultima;
  return `Demandas com ${lista}, da mais nova para a mais antiga`;
}

// "12 demandas encontradas." com o total da API (T-03).
export function textoDemandasEncontradas(total: number): string {
  return total === 1 ? '1 demanda encontrada.' : `${total.toLocaleString('pt-BR')} demandas encontradas.`;
}

// O endereço da fila com os filtros ativos e o deslocamento pedido; o padrão (página 1, 20 por página) não aparece.
export function hrefDaFila(f: FiltroDemandas, offset: number): string {
  const q = new URLSearchParams();
  if (f.status) q.set('status', f.status);
  if (f.tipo) q.set('tipo', f.tipo);
  if (f.linhaServicoProvavel) q.set('linhaServicoProvavel', f.linhaServicoProvavel);
  if (f.limit !== PADRAO.limit) q.set('limit', String(f.limit));
  if (offset > 0) q.set('offset', String(offset));
  const consulta = q.toString();
  return consulta ? `/demandas?${consulta}` : '/demandas';
}

const textoOuNaoInformada = (v: string | undefined): string => v ?? TEXTOS_FILA.naoInformada;

// Uma linha da tabela (03, 4.4). O título é texto de terceiro, isolado por <bdi> ao lado do selo (CV-18). O id fica em
// Mono no peso regular, como na 0.1.13: o e2e/fontes-qa.spec.ts (T02) confere a Mono 400 carregada pelo id da T03.
function linhaDaDemanda(d: DemandaResumo, etapas: EtapasNaFila, agora: Date) {
  return [
    <Link key="id" className="font-mono text-[0.8125rem] text-acao-escura underline underline-offset-2" href={`/demandas/${d.id}`}>
      {d.id}
    </Link>,
    <span key="titulo" className="inline-flex flex-wrap items-center gap-2 text-sm font-semibold">
      <bdi>{d.titulo}</bdi>
      {d.rascunhoAgente ? (
        <Selo cor={SELO_RASCUNHO.cor} tracejado={SELO_RASCUNHO.tracejado}>
          {SELO_RASCUNHO.texto}
        </Selo>
      ) : null}
    </span>,
    ROTULO_TIPO[d.tipo],
    <Selo key="status" cor={COR_STATUS[d.status]}>
      {ROTULO_STATUS[d.status]}
    </Selo>,
    <MarcasDeEtapa key="etapas" etapas={etapas} />,
    <UrgenciaDaDemanda key="urgencia" urgencia={d.urgencia} />,
    textoOuNaoInformada(d.linhaServicoProvavel ? ROTULO_LINHA[d.linhaServicoProvavel] : undefined),
    <IdadeDaDemanda key="idade" criadaEm={d.criadaEm} agora={agora} />,
  ];
}

// O título do resultado (03, 4.2): h2 com a legenda; com `foco`, é o alvo do foco depois de filtrar ou paginar.
function TituloDoResultado({ filtro, foco }: { filtro: FiltroDemandas; foco: boolean }) {
  return (
    <h2 id={foco ? ID_RESULTADO : undefined} tabIndex={foco ? -1 : undefined}>
      {legendaDaFila(filtro)}
    </h2>
  );
}

type PropsResultado = {
  filtro: FiltroDemandas;
  itens: readonly DemandaResumo[];
  total: number;
  // As marcas ESP, RSK e DEC de cada demanda da página (etapasDaPagina) e o "agora" do relógio injetado (coluna Idade).
  etapas: ReadonlyMap<string, EtapasNaFila>;
  agora: Date;
};

export function ResultadoDaFila({ filtro, itens, total, etapas, agora }: PropsResultado) {
  const { limit, offset } = filtro;
  const hrefAnterior = offset > 0 ? hrefDaFila(filtro, Math.max(0, offset - limit)) : null;
  const temProxima = itens.length === limit && offset + itens.length < total;
  const hrefProxima = temProxima ? hrefDaFila(filtro, offset + limit) : null;
  const paginacao = <Paginacao pagina={Math.floor(offset / limit) + 1} hrefAnterior={hrefAnterior} hrefProxima={hrefProxima} />;

  if (total === 0 && !temFiltro(filtro)) {
    return (
      <div className="flex flex-col items-start gap-3">
        <ResultadoAnunciado texto="" idFoco={ID_RESULTADO} />
        <p id={ID_RESULTADO} tabIndex={-1}>
          {TEXTOS_FILA.vazio}
        </p>
        <Link href="/demandas/nova" className={classeDoBotao('primario')}>
          Nova demanda
        </Link>
      </div>
    );
  }

  if (itens.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <ResultadoAnunciado texto="" idFoco={ID_RESULTADO} />
        <p id={ID_RESULTADO} tabIndex={-1}>
          {TEXTOS_FILA.vazioComFiltro}
        </p>
        <NavegacaoDaFila idFoco={ID_RESULTADO}>
          <Link href="/demandas" className="inline-flex min-h-11 items-center text-acao-escura underline underline-offset-2">
            Limpar filtros
          </Link>
          {offset > 0 ? paginacao : null}
        </NavegacaoDaFila>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ResultadoAnunciado texto={textoDemandasEncontradas(total)} idFoco={ID_RESULTADO} />
      <TituloDoResultado filtro={filtro} foco />
      <div className="max-md:hidden">
        <Tabela
          legenda={legendaDaFila(filtro)}
          legendaOculta
          rotuloRegiao={TEXTOS_FILA.rotuloRegiao}
          colunas={COLUNAS}
          linhas={itens.map((d) => linhaDaDemanda(d, etapasDe(etapas, d.id), agora))}
          chaves={itens.map((d) => d.id)}
        />
      </div>
      <CartoesDaFila itens={itens} etapas={etapas} agora={agora} />
      <NavegacaoDaFila idFoco={ID_RESULTADO}>{paginacao}</NavegacaoDaFila>
    </div>
  );
}

// Falha ao ler a fila (03, T03, Erro). Nenhum detalhe do erro chega à tela (RNF-10).
export function ErroDaFila() {
  return (
    <Alerta tipo="erro" className="flex flex-col items-start gap-3">
      <ResultadoAnunciado texto="" idFoco={ID_RESULTADO} />
      <p id={ID_RESULTADO} tabIndex={-1}>
        {TEXTOS_FILA.erro}
      </p>
      <BotaoTentarDeNovo />
    </Alerta>
  );
}

// Enquanto a fila carrega (03, 4.6, Carregando): a partir de 768 px, a tabela com aria-busy e cinco linhas de esqueleto;
// abaixo, a lista com aria-busy e três cartões de esqueleto. O texto oculto "Carregando demandas…" aparece uma vez, antes
// das duas formas; as barras ficam escondidas do leitor de tela. O título do resultado vem sem o id do foco.
export function CarregandoFila({ filtro = PADRAO }: { filtro?: FiltroDemandas }) {
  const linhas = Array.from({ length: 5 }, () => COLUNAS.map((c) => <Esqueleto key={c} rotulo="" linhas={1} />));
  return (
    <div className="flex flex-col gap-4">
      <TituloDoResultado filtro={filtro} foco={false} />
      <span className="sr-only">{TEXTOS_FILA.carregando}</span>
      <div className="max-md:hidden">
        <Tabela legenda={legendaDaFila(filtro)} legendaOculta rotuloRegiao={TEXTOS_FILA.rotuloRegiao} colunas={COLUNAS} linhas={linhas} ocupado />
      </div>
      <ul aria-busy="true" className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="rounded-cartao border border-linha bg-branco p-4">
            <Esqueleto rotulo="" linhas={3} />
          </li>
        ))}
      </ul>
    </div>
  );
}
