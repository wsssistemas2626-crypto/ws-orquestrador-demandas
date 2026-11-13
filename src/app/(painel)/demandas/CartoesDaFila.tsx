// T03 abaixo de 768 px (RF-07; 03, 4.3 e 4.4): a lista de cartões, um por demanda, com os mesmos dados e textos
// acessíveis da linha da tabela. A lista leva o nome do título do resultado (o h2 com o id de foco, um só no DOM) e
// some a partir de 768 px, quando a tabela aparece: só uma das duas formas fica na árvore de acessibilidade. O cartão não
// é link; só o id é. O título é texto de terceiro: só por expressão JSX e isolado por <bdi> (CV-18).
//
// Também ficam aqui as células que a tabela e o cartão dividem (idade, urgência e etapas), para os dois mostrarem o mesmo.
//
// 0.4.0 (T12 do DEC-DEM-20261111-0017-v1; 03, 4.1): o selo de fase (SeloDaFase), um pedaço só para a célula Status da
// tabela e o topo do cartão, abaixo do selo de status. Recebe só o AndamentoVista já conferido (D-16).
import Link from 'next/link';
import { seloDeFase, type SeloDeFase } from '../../../components/dados-do-andamento';
import { idadeDaDemanda } from '../../../components/dados-da-fila';
import { MarcasDeEtapa } from '../../../components/MarcasDeEtapa';
import { COR_STATUS, ROTULO_LINHA, ROTULO_ORIGEM, ROTULO_STATUS, ROTULO_TIPO, ROTULO_URGENCIA, SELO_RASCUNHO } from '../../../components/rotulos';
import { Selo } from '../../../components/Selo';
import type { AndamentoVista } from '../../../modules/andamento/schemas';
import type { DemandaResumo } from '../../../modules/demandas/consultas';
import type { EtapasNaFila } from '../../../modules/demandas/resumo-da-fila';

type Urgencia = NonNullable<DemandaResumo['urgencia']>;

// O id do título do resultado (o h2 que recebe o foco depois de filtrar ou paginar), que dá o nome da lista. fila.tsx o
// reexporta como antes; fica aqui para fila.tsx importar este arquivo sem ciclo.
export const ID_RESULTADO = 'resultado-da-fila';
// Também o `TEXTOS_FILA.naoInformada` da tabela (fila.tsx), para as duas formas não divergirem.
export const NAO_INFORMADA = 'Não informada';

// 0.3.0 (03, 4.1 item 7, e seção 9): entra "Origem", depois de Urgência e antes de Linha de serviço.
export const ROTULOS_DO_CARTAO = { tipo: 'Tipo', urgencia: 'Urgência', origem: 'Origem', linha: 'Linha de serviço', etapas: 'Etapas', idade: 'Idade' } as const;

// Sem a entrada no mapa (a demanda sumiu entre as duas leituras), as marcas ficam "por fazer": a tela nunca diz que uma
// etapa está feita sem a leitura dizer.
const SEM_ETAPAS: EtapasNaFila = { esp: false, rsk: false, dec: false };
export const etapasDe = (etapas: ReadonlyMap<string, EtapasNaFila>, id: string): EtapasNaFila => etapas.get(id) ?? SEM_ETAPAS;

// "Hoje", "1 dia" ou "N dias" no <time> da criação e, embaixo, "criada em dd/mm/aaaa" (03, 4.4; CA-06.2).
export function IdadeDaDemanda({ criadaEm, agora }: { criadaEm: Date; agora: Date }) {
  const i = idadeDaDemanda(criadaEm, agora);
  return (
    <span className="flex flex-col">
      <time dateTime={i.iso}>{i.texto}</time>
      <span className="text-[0.8125rem] text-tinta-media">
        <span className="sr-only">criada em </span>
        {i.data}
      </span>
    </span>
  );
}

// Também o ponto da urgência no cabeçalho da T05 (T11).
export const COR_DA_URGENCIA: Readonly<Record<Urgencia, string>> = { alta: 'bg-erro', media: 'bg-atencao', baixa: 'bg-tinta-suave' };

// Ponto de 8 px escondido e o rótulo; sem urgência, "Não informada", sem ponto (03, 4.4).
export function UrgenciaDaDemanda({ urgencia }: { urgencia: Urgencia | null }) {
  if (!urgencia) return NAO_INFORMADA;
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className={`inline-block size-2 shrink-0 rounded-full ${COR_DA_URGENCIA[urgencia]}`} />
      {ROTULO_URGENCIA[urgencia]}
    </span>
  );
}

// O andamento de uma demanda da página; sem a entrada no mapa (sem andamento, fora do esquema ou leitura que falhou),
// null: sem selo.
export const andamentoDe = (andamentos: ReadonlyMap<string, AndamentoVista> | null, id: string): AndamentoVista | null => andamentos?.get(id) ?? null;

// A cor por mapa fixo de classes escritas por inteiro (o Tailwind as encontra), sem style= (CV-02).
const COR_DA_FASE: Readonly<Record<SeloDeFase['cor'], string>> = { marinho: 'text-marinho', positivo: 'text-positivo', 'tinta-media': 'text-tinta-media' };

// O selo de fase (03, 4.1): o texto visível escondido do leitor de tela e, logo depois, o texto do leitor em sr-only.
// Só com a demanda em Em construção e andamento válido (seloDeFase); fora disso, nada.
export function SeloDaFase({ status, andamento }: { status: DemandaResumo['status']; andamento: AndamentoVista | null }) {
  const selo = seloDeFase(status, andamento);
  if (selo === null) return null;
  return (
    <span className="flex flex-col">
      <span aria-hidden="true" className={`text-[0.8125rem] font-semibold ${COR_DA_FASE[selo.cor]}`}>
        {selo.visivel}
      </span>
      <span className="sr-only">{selo.leitor}</span>
    </span>
  );
}

// A etiqueta da 03, 2.3 (Mono 12 / 600, caixa alta por CSS, +0,08 em), num lugar só: o cartão daqui, a etiqueta "Fila"
// acima do h1 da T03 e os termos dos dados da T05 (Minor 2 da 06-T09-tech-lead).
export const CLASSE_DA_ETIQUETA = 'font-mono text-xs font-semibold uppercase tracking-[0.08em] text-tinta-media';
const ETIQUETA = CLASSE_DA_ETIQUETA;

function CartaoDeDemanda({ d, etapas, agora, andamento }: { d: DemandaResumo; etapas: EtapasNaFila; agora: Date; andamento: AndamentoVista | null }) {
  return (
    <li className="flex flex-col gap-2 rounded-cartao border border-linha bg-branco p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link className="inline-flex min-h-11 items-center font-mono text-[0.8125rem] font-semibold text-acao-escura underline underline-offset-2 [overflow-wrap:anywhere]" href={`/demandas/${d.id}`}>
          {d.id}
        </Link>
        {/* 0.4.0 (03, 4.1 item 5): selo de status e, abaixo, o de fase, empilhados à direita; sem espaço (320 px), o bloco
            quebra para a linha de baixo, à esquerda. */}
        <span className="flex flex-col items-end gap-1 text-right">
          <Selo cor={COR_STATUS[d.status]}>{ROTULO_STATUS[d.status]}</Selo>
          <SeloDaFase status={d.status} andamento={andamento} />
        </span>
      </div>
      <h3 className="[overflow-wrap:anywhere]">
        <bdi>{d.titulo}</bdi>
      </h3>
      {d.rascunhoAgente ? (
        <span>
          <Selo cor={SELO_RASCUNHO.cor} tracejado={SELO_RASCUNHO.tracejado}>
            {SELO_RASCUNHO.texto}
          </Selo>
        </span>
      ) : null}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        <div>
          <dt className={ETIQUETA}>{ROTULOS_DO_CARTAO.tipo}</dt>
          <dd>{ROTULO_TIPO[d.tipo]}</dd>
        </div>
        <div>
          <dt className={ETIQUETA}>{ROTULOS_DO_CARTAO.urgencia}</dt>
          <dd>
            <UrgenciaDaDemanda urgencia={d.urgencia} />
          </dd>
        </div>
        <div className="col-span-2">
          <dt className={ETIQUETA}>{ROTULOS_DO_CARTAO.origem}</dt>
          <dd>{ROTULO_ORIGEM[d.origem]}</dd>
        </div>
        <div className="col-span-2">
          <dt className={ETIQUETA}>{ROTULOS_DO_CARTAO.linha}</dt>
          <dd>{d.linhaServicoProvavel ? ROTULO_LINHA[d.linhaServicoProvavel] : NAO_INFORMADA}</dd>
        </div>
        <div>
          <dt className={ETIQUETA}>{ROTULOS_DO_CARTAO.etapas}</dt>
          <dd>
            <MarcasDeEtapa etapas={etapas} />
          </dd>
        </div>
        <div>
          <dt className={ETIQUETA}>{ROTULOS_DO_CARTAO.idade}</dt>
          <dd>
            <IdadeDaDemanda criadaEm={d.criadaEm} agora={agora} />
          </dd>
        </div>
      </dl>
    </li>
  );
}

// 0.4.0: `andamentos` é o mapa de andamentosDaPagina; ausente ou null, nenhum selo de fase.
type Props = { itens: readonly DemandaResumo[]; etapas: ReadonlyMap<string, EtapasNaFila>; agora: Date; andamentos?: ReadonlyMap<string, AndamentoVista> | null };

export function CartoesDaFila({ itens, etapas, agora, andamentos = null }: Props) {
  return (
    <ul aria-labelledby={ID_RESULTADO} className="flex flex-col gap-3 md:hidden">
      {itens.map((d) => (
        <CartaoDeDemanda key={d.id} d={d} etapas={etapasDe(etapas, d.id)} agora={agora} andamento={andamentoDe(andamentos, d.id)} />
      ))}
    </ul>
  );
}
