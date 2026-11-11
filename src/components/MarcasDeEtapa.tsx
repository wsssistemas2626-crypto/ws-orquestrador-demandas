// Marcas de etapa da fila (03, 4.4; RF-06): ESP, RSK e DEC lado a lado, em Mono 600. Feita: fundo `marinho` e texto
// `branco`; por fazer: fundo `branco`, borda tracejada `tinta-suave` e texto `tinta-media` (diferença de forma, além da
// cor). As três ficam escondidas do leitor de tela, que lê antes delas o texto fixo do RF-06 ("Etapas: ESP feita, RSK
// feita, DEC por fazer"): na tabela ele dá o nome da célula; no cartão, o do `dd`. Só tipos de src/modules/.
import type { EtapasNaFila } from '../modules/demandas/resumo-da-fila';
import { textoDasEtapas } from './dados-da-fila';

const MARCA = 'inline-flex items-center rounded-[4px] border px-1.5 py-px font-mono text-xs font-semibold leading-4';
const FEITA = `${MARCA} border-marinho bg-marinho text-branco`;
const POR_FAZER = `${MARCA} border-dashed border-tinta-suave bg-branco text-tinta-media`;

export function MarcasDeEtapa({ etapas }: { etapas: EtapasNaFila }) {
  const marcas = [
    ['ESP', etapas.esp],
    ['RSK', etapas.rsk],
    ['DEC', etapas.dec],
  ] as const;
  return (
    <span className="inline-flex">
      <span className="sr-only">{textoDasEtapas(etapas)}</span>
      <span aria-hidden="true" className="inline-flex gap-1">
        {marcas.map(([nome, feita]) => (
          <span key={nome} className={feita ? FEITA : POR_FAZER}>
            {nome}
          </span>
        ))}
      </span>
    </span>
  );
}
