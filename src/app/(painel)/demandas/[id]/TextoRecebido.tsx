// Texto recebido (03, T05; RF-05, RF-24): dado pessoal de terceiro, lido só por pessoa (obterTextoRecebido, T17). Fica
// num `details` fechado, com o aviso e a data do expurgo; o texto vai num `pre` com quebra de linha e nunca vira HTML
// (C-18: o React escapa o conteúdo). Depois do expurgo (T31), só a data; sem texto colado, o aviso da 03.
import { formatarData, formatarDataHora } from '../../../../lib/fuso';
import { ROTULO_CANAL_ORIGEM } from '../../../../components/rotulos';
import type { TextoRecebido as TextoDaDemanda } from '../../../../modules/demandas/texto-recebido';
import { TEXTOS_DETALHE } from './detalhe';

type Props = { texto: TextoDaDemanda; retencaoDias: number };

export function TextoRecebido({ texto, retencaoDias }: Props) {
  const t = TEXTOS_DETALHE.texto;
  if (texto.situacao === 'sem_texto') return <p>{t.semTexto}</p>;
  if (texto.situacao === 'expurgado') return <p>{t.expurgado(formatarData(texto.expurgadaEm), retencaoDias)}</p>;

  const canal = texto.origem?.canal ? ROTULO_CANAL_ORIGEM[texto.origem.canal] : TEXTOS_DETALHE.naoInformado;
  const referencia = texto.origem?.referencia || TEXTOS_DETALHE.naoInformado;
  return (
    <details className="rounded-campo border border-tinta-suave">
      <summary className="min-h-11 cursor-pointer px-4 py-2 font-medium text-acao-escura">{t.mostrar}</summary>
      <div className="flex flex-col gap-4 border-t border-linha px-4 py-4">
        <p className="rounded-campo border-l-4 border-atencao bg-atencao-fundo px-4 py-3 text-atencao">{t.aviso(formatarData(texto.apagarEm))}</p>
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="font-medium">{t.recebidoEm}</dt>
            <dd>
              <time dateTime={texto.recebidaEm.toISOString()}>{formatarDataHora(texto.recebidaEm)}</time>
            </dd>
          </div>
          <div>
            <dt className="font-medium">{t.canal}</dt>
            <dd>{canal}</dd>
          </div>
          <div>
            <dt className="font-medium">{t.referencia}</dt>
            <dd className="break-words">{referencia}</dd>
          </div>
          <div>
            <dt className="font-medium">{t.texto}</dt>
            <dd>
              <pre className="font-sans whitespace-pre-wrap break-words">{texto.texto}</pre>
            </dd>
          </div>
        </dl>
      </div>
    </details>
  );
}
