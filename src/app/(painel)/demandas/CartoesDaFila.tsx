// T03 abaixo de 768 px (RF-07; 03, 4.3 e 4.4): a lista de cartões, um por demanda, com os mesmos dados e textos
// acessíveis da linha da tabela. A lista leva o nome do título do resultado (o h2 com o id de foco, um só no DOM) e
// some a partir de 768 px, quando a tabela aparece: só uma das duas formas fica na árvore de acessibilidade. O cartão não
// é link; só o id é. O título é texto de terceiro: só por expressão JSX e isolado por <bdi> (CV-18).
//
// Também ficam aqui as células que a tabela e o cartão dividem (idade, urgência e etapas), para os dois mostrarem o mesmo.
import Link from 'next/link';
import { idadeDaDemanda } from '../../../components/dados-da-fila';
import { MarcasDeEtapa } from '../../../components/MarcasDeEtapa';
import { COR_STATUS, ROTULO_LINHA, ROTULO_STATUS, ROTULO_TIPO, ROTULO_URGENCIA, SELO_RASCUNHO } from '../../../components/rotulos';
import { Selo } from '../../../components/Selo';
import type { DemandaResumo } from '../../../modules/demandas/consultas';
import type { EtapasNaFila } from '../../../modules/demandas/resumo-da-fila';

type Urgencia = NonNullable<DemandaResumo['urgencia']>;

// O id do título do resultado (o h2 que recebe o foco depois de filtrar ou paginar), que dá o nome da lista. fila.tsx o
// reexporta como antes; fica aqui para fila.tsx importar este arquivo sem ciclo.
export const ID_RESULTADO = 'resultado-da-fila';
const NAO_INFORMADA = 'Não informada';

export const ROTULOS_DO_CARTAO = { tipo: 'Tipo', urgencia: 'Urgência', linha: 'Linha de serviço', etapas: 'Etapas', idade: 'Idade' } as const;

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

const COR_DA_URGENCIA: Readonly<Record<Urgencia, string>> = { alta: 'bg-erro', media: 'bg-atencao', baixa: 'bg-tinta-suave' };

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

const ETIQUETA = 'font-mono text-xs font-semibold uppercase tracking-[0.08em] text-tinta-media';

function CartaoDeDemanda({ d, etapas, agora }: { d: DemandaResumo; etapas: EtapasNaFila; agora: Date }) {
  return (
    <li className="flex flex-col gap-2 rounded-cartao border border-linha bg-branco p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link className="inline-flex min-h-11 items-center font-mono text-[0.8125rem] text-acao-escura underline underline-offset-2 [overflow-wrap:anywhere]" href={`/demandas/${d.id}`}>
          {d.id}
        </Link>
        <Selo cor={COR_STATUS[d.status]}>{ROTULO_STATUS[d.status]}</Selo>
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

type Props = { itens: readonly DemandaResumo[]; etapas: ReadonlyMap<string, EtapasNaFila>; agora: Date };

export function CartoesDaFila({ itens, etapas, agora }: Props) {
  return (
    <ul aria-labelledby={ID_RESULTADO} className="flex flex-col gap-3 md:hidden">
      {itens.map((d) => (
        <CartaoDeDemanda key={d.id} d={d} etapas={etapasDe(etapas, d.id)} agora={agora} />
      ))}
    </ul>
  );
}
