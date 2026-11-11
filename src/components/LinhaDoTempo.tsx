// Linha do tempo (03, 5.6 do pedido 0015): o histórico em lista, e não mais em tabela, para caber na coluna lateral da
// A2. Antes da lista, a ordem em texto; cada item tem um marcador escondido do leitor de tela, o que aconteceu, o antes e
// o depois só quando há valor ("Antes: … Depois: …", parte vazia omitida) e, embaixo, quem e quando, com o separador
// só visual e a data em <time>. Todos os itens, sem corte. Só apresenta: os textos chegam prontos de quem usa, e tudo
// sai como texto (o React escapa, C-18).
import { formatarDataHora } from '../lib/fuso';

export type ItemDaLinhaDoTempo = { chave: string; texto: string; antes: string; depois: string; ator: string; ocorridoEm: Date };

// Textos da 03, seção 9 (T05, histórico).
export const TEXTOS_LINHA_DO_TEMPO = {
  ordem: 'Do mais novo para o mais antigo.',
  antes: (v: string) => `Antes: ${v}.`,
  depois: (v: string) => `Depois: ${v}.`,
} as const;

// "Antes: <antes>. Depois: <depois>.", só com as partes que têm valor; vazio quando nenhuma tem.
export function antesEDepois(antes: string, depois: string): string {
  return [antes ? TEXTOS_LINHA_DO_TEMPO.antes(antes) : '', depois ? TEXTOS_LINHA_DO_TEMPO.depois(depois) : ''].filter(Boolean).join(' ');
}

export function LinhaDoTempo({ itens }: { itens: readonly ItemDaLinhaDoTempo[] }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[0.8125rem] text-tinta-media">{TEXTOS_LINHA_DO_TEMPO.ordem}</p>
      <ol className="flex flex-col gap-4">
        {itens.map((i) => {
          const valores = antesEDepois(i.antes, i.depois);
          return (
            <li key={i.chave} className="flex gap-3">
              <span aria-hidden="true" className="mt-1.5 inline-block size-2.5 shrink-0 rounded-full bg-acao" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-sm font-semibold [overflow-wrap:anywhere]">{i.texto}</p>
                {valores ? <p className="text-sm">{valores}</p> : null}
                <p className="text-[0.8125rem] text-tinta-media">
                  <span>{i.ator}</span>
                  <span aria-hidden="true"> · </span>
                  <time dateTime={i.ocorridoEm.toISOString()}>{formatarDataHora(i.ocorridoEm)}</time>
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
