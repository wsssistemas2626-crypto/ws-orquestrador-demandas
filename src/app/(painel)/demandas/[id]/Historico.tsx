// Histórico da demanda (03, T05; RF-21): tabela do mais novo para o mais antigo, com quem (pessoa pelo nome e papel,
// agente pelo nome, ou "Sistema"), o que aconteceu (textos de rotulos.ts) e o antes e depois só das enumerações (C-30).
// Tudo sai como texto: o React escapa cada célula (C-18).
import { rotuloAtor, textoDoEvento } from '../../../../components/rotulos';
import { Tabela } from '../../../../components/Tabela';
import { formatarDataHora } from '../../../../lib/fuso';
import type { EventoVisivel } from '../../../../modules/historico/consultas';
import { TEXTOS_DETALHE, valoresDoEvento } from './detalhe';

type Props = { eventos: readonly EventoVisivel[]; retencaoDias: number };

export function Historico({ eventos, retencaoDias }: Props) {
  const t = TEXTOS_DETALHE.historico;
  const linhas = eventos.map((e) => {
    const { antes, depois } = valoresDoEvento(e);
    return [
      <time key="data" dateTime={e.ocorridoEm.toISOString()}>
        {formatarDataHora(e.ocorridoEm)}
      </time>,
      rotuloAtor(e.ator),
      textoDoEvento(e, { retencaoDias }),
      antes,
      depois,
    ];
  });
  return <Tabela legenda={t.legenda} rotuloRegiao={t.regiao} colunas={t.colunas} linhas={linhas} chaves={eventos.map((e) => String(e.id))} />;
}
