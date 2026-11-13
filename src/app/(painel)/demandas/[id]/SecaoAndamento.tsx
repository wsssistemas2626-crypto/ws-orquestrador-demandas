// Seção "Andamento da construção" da T05 (0.4.0, T13 do DEC-DEM-20261111-0017-v1; RF-09; 03, 5.2, 5.3 e 9). Server
// Component: recebe o SecaoDoAndamento já pronto (secaoDoAndamento, dados-do-andamento.ts, que confere cada valor de
// novo; AN-12) e monta o conteúdo dentro da `Secao` da página (o `h2` focável é dela). Só informa: nenhum controle, nada
// focável além do link do DEC. Tudo é texto escapado pelo React; a barra é o <progress> nativo, com as cores por classe
// de token nos pseudo-elementos e sem `style=` (CV-02: a CSP recusa estilo em linha), sem animação.
import Link from 'next/link';
import { Alerta } from '../../../../components/Alerta';
import { TEXTOS_ANDAMENTO, type SecaoDoAndamento } from '../../../../components/dados-do-andamento';
import { CLASSE_DA_ETIQUETA } from '../CartoesDaFila';
import { TEXTOS_DETALHE } from './detalhe';

// O `dt` "Tarefas prontas" dá o nome acessível à barra (aria-labelledby; 03, 5.3).
export const ID_TAREFAS_PRONTAS = 'andamento-tarefas-prontas';

const ITEM = 'flex min-w-0 flex-col gap-1';
const ITEM_LARGO = `${ITEM} col-span-2`;
const BARRA =
  'h-2 w-full appearance-none overflow-hidden rounded-full border-0 bg-linha [&::-webkit-progress-bar]:bg-linha [&::-webkit-progress-value]:bg-acao [&::-moz-progress-bar]:bg-acao';

type Props = {
  secao: SecaoDoAndamento;
  // A classe do link solto da página (CLASSE_ACAO_DA_VERSAO de page.tsx: 44 px abaixo de 768 px e 24 px a partir dele).
  classeDoLink: string;
};

export function SecaoAndamento({ secao, classeDoLink }: Props) {
  const t = TEXTOS_ANDAMENTO.termos;
  const tarefas = secao.tarefas;
  return (
    <>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        <div className={ITEM_LARGO}>
          <dt className={CLASSE_DA_ETIQUETA}>{t.pedido}</dt>
          <dd className="min-w-0">
            {secao.dec ? (
              secao.dec.href ? (
                <Link href={secao.dec.href} className={`${classeDoLink} max-w-full font-mono [overflow-wrap:anywhere]`}>
                  {secao.dec.id}
                </Link>
              ) : (
                <span className="font-mono [overflow-wrap:anywhere]">{secao.dec.id}</span>
              )
            ) : (
              TEXTOS_DETALHE.naoInformado
            )}
          </dd>
        </div>
        <div className={ITEM}>
          <dt className={CLASSE_DA_ETIQUETA}>{t.fase}</dt>
          <dd className="break-words">{secao.fase}</dd>
        </div>
        <div className={ITEM}>
          <dt className={CLASSE_DA_ETIQUETA}>{t.situacao}</dt>
          <dd className="break-words">{secao.situacao}</dd>
        </div>
        <div className={ITEM_LARGO}>
          <dt id={ID_TAREFAS_PRONTAS} className={CLASSE_DA_ETIQUETA}>
            {t.tarefas}
          </dt>
          {tarefas.tipo === 'barra' ? (
            <dd className="flex flex-col gap-2">
              <span>{tarefas.texto}</span>
              <progress value={tarefas.valor} max={tarefas.maximo} aria-labelledby={ID_TAREFAS_PRONTAS} aria-valuetext={tarefas.valorTexto} className={BARRA}>
                {tarefas.recurso}
              </progress>
            </dd>
          ) : (
            <dd>{tarefas.texto}</dd>
          )}
        </div>
      </dl>
      {secao.alertas.map((a) => (
        <Alerta key={a} tipo="atencao">
          {a}
        </Alerta>
      ))}
      <p className="text-sm text-tinta">
        {TEXTOS_ANDAMENTO.ultimaMudanca}
        <time dateTime={secao.ultimaMudanca.iso}>{secao.ultimaMudanca.data}</time>.
      </p>
      <p className="text-[0.8125rem] text-tinta-media">{secao.nota}</p>
    </>
  );
}
