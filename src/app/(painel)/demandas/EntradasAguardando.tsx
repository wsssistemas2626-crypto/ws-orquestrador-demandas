// T03 Fila de demandas: "Entradas aguardando o agente orquestrador" (03, T03; T-01, RF-05). Só aparece quando há alguma.
// Cada linha mostra só a data e o papel do solicitante: o texto, a origem e o nome são dado pessoal de terceiro e não
// saem de `listarEntradasPendentes` (nem são lidos aqui, se vierem). "Preencher à mão" aparece na entrada que o agente
// não conseguiu preparar e abre a T04 com o texto já colado.
import Link from 'next/link';
import { classeDoBotao } from '../../../components/Botao';
import { ROTULO_PAPEL_SOLICITANTE } from '../../../components/rotulos';
import { formatarDataHora } from '../../../lib/fuso';
import type { EntradaPendenteResumo } from '../../../modules/demandas/entradas-pendentes';

const ID_TITULO = 'entradas-aguardando';

const ESTADO: Readonly<Record<EntradaPendenteResumo['status'], string>> = {
  aguardando: 'O agente está preparando os campos.',
  falhou: 'O agente não conseguiu preparar os campos.',
};

export function EntradasAguardando({ entradas }: { entradas: readonly EntradaPendenteResumo[] }) {
  if (entradas.length === 0) return null;
  return (
    <section aria-labelledby={ID_TITULO} className="flex flex-col gap-3 rounded-cartao border border-linha bg-branco p-4">
      <h2 id={ID_TITULO}>
        {`Entradas aguardando o agente orquestrador (${entradas.length})`}
      </h2>
      <ul className="flex flex-col gap-3">
        {entradas.map(({ id, recebidaEm, solicitantePapel, status }) => {
          const idLinha = `entrada-${id}`;
          return (
            <li key={id} className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex flex-col">
                <p id={idLinha}>
                  Recebida em <time dateTime={recebidaEm.toISOString()}>{formatarDataHora(recebidaEm)}</time>
                  {` — ${solicitantePapel ? ROTULO_PAPEL_SOLICITANTE[solicitantePapel] : 'Não informado'}`}
                </p>
                <p className="text-tinta-media">{ESTADO[status]}</p>
              </div>
              {status === 'falhou' ? (
                <Link className={classeDoBotao('secundario')} aria-describedby={idLinha} href={`/demandas/nova?entrada=${encodeURIComponent(id)}`}>
                  Preencher à mão
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
