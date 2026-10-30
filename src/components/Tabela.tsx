// Tabela (03, 2.3 e T03): `caption` que recebe o foco depois de filtrar ou paginar (tabindex="-1"), cabeçalhos com
// `th scope="col"` e rolagem horizontal própria em tela estreita (região rolável pelo teclado, com rótulo), sem rolar a
// página inteira em 320 px. Carregando, aria-busy.
import type { ReactNode } from 'react';

type Props = {
  legenda: ReactNode;
  idLegenda?: string;
  rotuloRegiao: string;
  colunas: readonly string[];
  linhas: ReadonlyArray<ReadonlyArray<ReactNode>>;
  // Chave estável de cada linha (o id da demanda, da versão); sem ela, a posição.
  chaves?: readonly string[];
  ocupado?: boolean;
};

export function Tabela({ legenda, idLegenda, rotuloRegiao, colunas, linhas, chaves, ocupado = false }: Props) {
  return (
    <div role="region" aria-label={rotuloRegiao} tabIndex={0} className="max-w-full overflow-x-auto">
      <table aria-busy={ocupado ? true : undefined} className="w-full border-collapse text-left">
        <caption id={idLegenda} tabIndex={-1} className="mb-2 text-left text-lg font-semibold">
          {legenda}
        </caption>
        <thead className="bg-fundo-suave">
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
            <tr key={chaves?.[i] ?? i} className="border-t border-borda">
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
