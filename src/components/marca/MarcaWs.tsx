// Marca do WS Orquestrador de Demandas (03, 3.2 e 3.3 do pedido 0015; C03 do 02): o bloco "WS" e o nome em HTML e CSS,
// sem imagem, SVG nem script (CV-02). O nome acessível sai do próprio texto, "WS Orquestrador de Demandas", sem
// aria-label (WCAG 2.5.3). Os espaços entre os blocos estão no DOM para o nome não sair colado ("WSOrquestrador").
//
// - `clara`: sobre `superficie` ou `branco` (moldura pública): quadrado `marinho` com "WS" `branco`, "Orquestrador"
//   `marinho` e "de Demandas" `tinta-media`.
// - `escura`: sobre `marinho` (casca e gaveta): quadrado `superficie` com "WS" `marinho`, "Orquestrador" `branco` e
//   "de Demandas" `texto-claro-apoio`.
// - `compacta`: barra do celular, quadrado de 32 px e "Orquestrador de Demandas" numa linha.
// - `comLink`: link só para a constante DESTINO_DA_MARCA (CV-19). T01 e T02 usam sem link (C-40).
import Link from 'next/link';

export const DESTINO_DA_MARCA = '/demandas';

type Variante = 'clara' | 'escura';
type Props = { variante: Variante; compacta?: boolean; comLink?: boolean };

const QUADRADO: Readonly<Record<Variante, string>> = {
  clara: 'bg-marinho text-branco',
  escura: 'bg-superficie text-marinho',
};
const NOME: Readonly<Record<Variante, string>> = { clara: 'text-marinho', escura: 'text-branco' };
const APOIO: Readonly<Record<Variante, string>> = { clara: 'text-tinta-media', escura: 'text-texto-claro-apoio' };

const BLOCO = 'inline-flex items-center gap-3';

export function MarcaWs({ variante, compacta = false, comLink = false }: Props) {
  const conteudo = (
    <>
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-campo text-[0.9375rem] leading-none font-extrabold ${compacta ? 'size-8' : 'size-9'} ${QUADRADO[variante]}`}
      >
        WS
      </span>{' '}
      {compacta ? (
        <span className={`text-[0.9375rem] leading-tight font-bold ${NOME[variante]}`}>Orquestrador de Demandas</span>
      ) : (
        <span className="flex flex-col leading-tight">
          <span className={`text-[0.9375rem] font-bold ${NOME[variante]}`}>Orquestrador</span>{' '}
          <span className={`text-[0.8125rem] ${APOIO[variante]}`}>de Demandas</span>
        </span>
      )}
    </>
  );
  if (!comLink) return <p className={BLOCO}>{conteudo}</p>;
  return (
    <Link href={DESTINO_DA_MARCA} className={`${BLOCO} min-h-11 rounded-campo no-underline`}>
      {conteudo}
    </Link>
  );
}
