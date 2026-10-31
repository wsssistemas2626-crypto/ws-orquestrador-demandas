// Revisão antes de decidir (04, C-14), antes do formulário da T11: da ESP citada, o sistema alvo, o repositório destino,
// os critérios de aceite e a definição de pronto (o que vai para o Pedido de Construção); do RSK citado, os três níveis
// em texto; o nível de aprovação do DEC; e o selo "Rascunho de agente" em cada artefato de agente. São os citados pelo
// pacote, e não os mais novos da demanda. Tudo é texto: o React escapa (C-18).
import Link from 'next/link';
import { TEXTOS_DECISAO, type ItemDaRevisao } from '../../../../components/dados-da-decisao';
import { SELO_RASCUNHO } from '../../../../components/rotulos';
import { Selo } from '../../../../components/Selo';
import { caminhos } from '../../demandas/[id]/detalhe';

const ID_TITULO = 'revisao-antes-de-decidir';
const CLASSE_LINK = 'font-mono text-primaria underline underline-offset-2';

function Valor({ item }: { item: ItemDaRevisao }) {
  if (Array.isArray(item.valor))
    return (
      <ul className="flex list-disc flex-col gap-1 pl-6">
        {item.valor.map((x, k) => (
          <li key={k}>{x}</li>
        ))}
      </ul>
    );
  if (item.rascunho === undefined) return <>{item.valor}</>;
  // A ESP e o RSK citados: link para a T10 e o selo, quando for rascunho de agente.
  const href = item.valor.startsWith('ESP-') ? caminhos.esp(item.valor) : caminhos.rsk(item.valor);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Link href={href} className={CLASSE_LINK}>
        {item.valor}
      </Link>
      {item.rascunho ? (
        <Selo cor={SELO_RASCUNHO.cor} tracejado={SELO_RASCUNHO.tracejado}>
          {SELO_RASCUNHO.texto}
        </Selo>
      ) : null}
    </span>
  );
}

export function RevisaoDoPacote({ itens }: { itens: readonly ItemDaRevisao[] }) {
  return (
    <section aria-labelledby={ID_TITULO} className="flex flex-col gap-3 rounded-campo border border-borda px-4 py-4">
      <h2 id={ID_TITULO} className="text-xl font-semibold">
        {TEXTOS_DECISAO.revisao}
      </h2>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(12rem,auto)_1fr]">
        {itens.map((i) => (
          <div key={i.termo} className="contents">
            <dt className="font-medium">{i.termo}</dt>
            <dd className="break-words whitespace-pre-wrap">
              <Valor item={i} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
