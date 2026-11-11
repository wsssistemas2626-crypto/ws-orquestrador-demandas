// Tabela (03, 2.3 e T03): `caption` que recebe o foco depois de filtrar ou paginar (tabindex="-1"), cabeçalhos com
// `th scope="col"` e rolagem horizontal própria em tela estreita (região rolável pelo teclado, com rótulo), sem rolar a
// página inteira em 320 px. Carregando, aria-busy.
//
// `legendaOculta` (0.2.0: 03, 2.6 do pedido 0015, T03): a legenda fica fora da tabela, num título com o id de foco, e o
// `caption` vira só para leitor de tela, com o mesmo texto, sem id nem foco (um id só no DOM, nas duas larguras).
import type { ReactNode } from 'react';

type Props = {
  legenda: ReactNode;
  idLegenda?: string;
  legendaOculta?: boolean;
  rotuloRegiao: string;
  colunas: readonly string[];
  linhas: ReadonlyArray<ReadonlyArray<ReactNode>>;
  // Chave estável de cada linha (o id da demanda, da versão); sem ela, a posição.
  chaves?: readonly string[];
  ocupado?: boolean;
};

export function Tabela({ legenda, idLegenda, legendaOculta = false, rotuloRegiao, colunas, linhas, chaves, ocupado = false }: Props) {
  return (
    <div role="region" aria-label={rotuloRegiao} tabIndex={0} className="max-w-full overflow-x-auto">
      <table aria-busy={ocupado ? true : undefined} className="w-full border-collapse bg-branco text-left">
        {legendaOculta ? (
          <caption className="sr-only">{legenda}</caption>
        ) : (
          <caption id={idLegenda} tabIndex={-1} className="mb-2 text-left text-lg font-semibold">
            {legenda}
          </caption>
        )}
        <thead className="bg-superficie text-tinta-media">
          <tr>
            {colunas.map((c) => (
              <th key={c} scope="col" className="px-3 py-2 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((linha, i) => (
            <tr key={chaves?.[i] ?? i} className="border-t border-linha">
              {linha.map((celula, j) => (
                <td key={j} className="px-3 py-2 align-top">
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
