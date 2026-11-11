// Barra das cinco etapas da T05 (RF-08; 03, 5.4 do pedido 0015): lista ordenada "Etapas da demanda" num cartão, com
// cinco colunas a partir de 1200 px e uma etapa por linha abaixo, com o fio entre as marcas. Cada etapa tem a marca
// (escondida do leitor de tela), o nome, o id da versão mais nova ou "Nenhuma" e o estado em texto. As marcas diferem por
// forma, além da cor: feita = círculo marinho com visto; atual = círculo de ação com o número e anel; por fazer = círculo
// tracejado com o número. A atual tem aria-current="step". As etapas chegam prontas de etapasDaDemanda, que só a página
// chama (CA-09.4): aqui só se desenha.
import { Cartao } from '../../../../components/Cartao';
import { TEXTOS_ETAPAS, type EtapaDaDemanda } from '../../../../components/dados-das-etapas';

type Marca = 'feita' | 'atual' | 'por-fazer';

const marcaDe = (e: EtapaDaDemanda): Marca => (e.feita ? 'feita' : e.atual ? 'atual' : 'por-fazer');

const MARCA = 'relative inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-bold';
const CLASSE_DA_MARCA: Readonly<Record<Marca, string>> = {
  feita: `${MARCA} bg-marinho text-branco`,
  atual: `${MARCA} bg-acao text-branco ring-2 ring-acao ring-offset-2 ring-offset-branco`,
  'por-fazer': `${MARCA} border-[1.5px] border-dashed border-tinta-suave bg-branco text-tinta-media`,
};
const COR_DO_ESTADO: Readonly<Record<Marca, string>> = { feita: 'text-selo-verde', atual: 'text-acao-escura', 'por-fazer': 'text-tinta-media' };

function Visto() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" focusable="false">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function BarraDeEtapas({ etapas }: { etapas: readonly EtapaDaDemanda[] }) {
  return (
    <Cartao>
      <ol aria-label={TEXTOS_ETAPAS.barra} className="flex flex-col xl:grid xl:grid-cols-5 xl:gap-4">
        {etapas.map((e, i) => {
          const marca = marcaDe(e);
          return (
            <li key={e.numero} aria-current={e.atual ? 'step' : undefined} className="relative flex gap-3 pb-5 last:pb-0 xl:flex-col xl:gap-2 xl:pb-0">
              {/* Fio vertical entre as marcas, só na lista vertical (abaixo de 1200 px). */}
              {i < etapas.length - 1 ? <span aria-hidden="true" className="absolute top-9 bottom-1 left-3.5 w-px bg-linha xl:hidden" /> : null}
              <span aria-hidden="true" data-marca={marca} className={CLASSE_DA_MARCA[marca]}>
                {marca === 'feita' ? <Visto /> : e.numero}
              </span>
              <span className="flex min-w-0 flex-col">
                <strong className="text-sm">{e.nome}</strong>
                <span className="font-mono text-xs text-tinta-media [overflow-wrap:anywhere]">{e.idVersao ?? TEXTOS_ETAPAS.semVersao}</span>
                <span className={`text-xs font-semibold ${COR_DO_ESTADO[marca]}`}>{e.estado}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </Cartao>
  );
}
