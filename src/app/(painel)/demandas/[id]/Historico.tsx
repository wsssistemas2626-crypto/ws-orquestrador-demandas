// Histórico da demanda (03, T05; RF-21): do mais novo para o mais antigo, com quem (pessoa pelo nome e papel, agente
// pelo nome, ou "Sistema"), o que aconteceu (textos de rotulos.ts) e o antes e depois só das enumerações (C-30). Tudo
// sai como texto: o React escapa cada item (C-18).
//
// 0.2.0 (T11 do DEC-DEM-20261110-0015-v1; 03, 5.6): em lista (LinhaDoTempo), e não mais em tabela, com todos os eventos.
import { LinhaDoTempo } from '../../../../components/LinhaDoTempo';
import { rotuloAtor, textoDoEvento } from '../../../../components/rotulos';
import type { EventoVisivel } from '../../../../modules/historico/consultas';
import { valoresDoEvento } from './detalhe';

type Props = { eventos: readonly EventoVisivel[]; retencaoDias: number };

export function Historico({ eventos, retencaoDias }: Props) {
  const itens = eventos.map((e) => {
    const { antes, depois } = valoresDoEvento(e);
    return { chave: String(e.id), texto: textoDoEvento(e, { retencaoDias }), antes, depois, ator: rotuloAtor(e.ator), ocorridoEm: e.ocorridoEm };
  });
  return <LinhaDoTempo itens={itens} />;
}
