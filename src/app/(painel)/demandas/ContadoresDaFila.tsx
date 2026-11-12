'use client';

// Contadores por status da T03 (RF-05; 03, 4.5): um form GET para /demandas com "Todas" e um botão de envio por status
// (name="status", value do enum ou vazio, aria-pressed). Ativar (clique, Enter ou Espaço) leva ao endereço do contador,
// já montado no servidor por contadoresDaFila (CV-07: só do filtro validado e do enum), com o mesmo pedido de foco no
// resultado da fila de hoje; sem script, o GET comum filtra do mesmo jeito. O tipo, a linha de serviço e (0.3.0, 03, 4.1
// item 3) a origem da URL vão ocultos, depois do grupo (o endereço sai na ordem status, tipo, linha, origem); nenhum
// outro campo vai junto.
//
// Estados: com número; sem número quando a contagem falhou (os botões filtram, e o texto da 03 aparece abaixo); e
// carregando (aria-busy, barra escondida no lugar do número, botões desabilitados). Nada aqui lê dado.
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { TEXTOS_CONTADORES, type ContadorDaFila } from '../../../components/dados-da-fila';
import type { CorSelo } from '../../../components/rotulos';
import type { FiltroDemandas } from '../../../modules/demandas/schemas';
import { pedirFocoNoResultado } from './FiltrosFila';

// O ponto de 10 px com a cor do texto do selo do status (03, 2.5), só decorativo.
const COR_DO_PONTO: Readonly<Record<CorSelo, string>> = {
  azul: 'bg-acao-escura',
  violeta: 'bg-selo-violeta',
  ambar: 'bg-atencao',
  petroleo: 'bg-selo-petroleo',
  verde: 'bg-selo-verde',
  marinho: 'bg-marinho',
  'verde-cheio': 'bg-selo-verde',
  laranja: 'bg-selo-laranja',
  cinza: 'bg-tinta-media',
  vermelho: 'bg-erro',
};

// Cartão de 5 colunas (computador) e 3 (tablete); pílula de 44 px abaixo de 768 px. Pressionado: borda 2 px `acao`,
// fundo `nevoa` e o visto (forma além da cor).
const BOTAO =
  'flex min-h-11 min-w-11 flex-col items-start justify-center gap-1 rounded-campo border border-tinta-suave bg-branco px-4 py-3.5 text-left hover:bg-superficie disabled:cursor-progress aria-pressed:border-2 aria-pressed:border-acao aria-pressed:bg-nevoa max-md:flex-row max-md:items-center max-md:gap-2 max-md:rounded-full max-md:px-3 max-md:py-1';

type Props = {
  contadores: readonly ContadorDaFila[];
  filtro: Pick<FiltroDemandas, 'tipo' | 'linhaServicoProvavel' | 'origem'>;
  idFoco: string;
  erro?: boolean;
  carregando?: boolean;
};

function Visto() {
  return (
    <svg className="size-4 shrink-0 text-acao-escura" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}

export function ContadoresDaFila({ contadores, filtro, idFoco, erro = false, carregando = false }: Props) {
  const router = useRouter();

  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    const quem = (e.nativeEvent as SubmitEvent).submitter;
    const valor = quem instanceof HTMLButtonElement ? quem.value : null;
    const destino = contadores.find((c) => c.valor === valor)?.href;
    // Sem o botão (envio por outro caminho), o GET comum do formulário segue.
    if (!destino) return;
    e.preventDefault();
    if (!pedirFocoNoResultado(destino, idFoco)) router.push(destino);
  }

  return (
    <form action="/demandas" method="get" onSubmit={aoEnviar}>
      <div
        role="group"
        aria-label={TEXTOS_CONTADORES.grupo}
        aria-busy={carregando ? true : undefined}
        className="flex flex-wrap gap-2 md:grid md:grid-cols-3 md:gap-3 xl:grid-cols-5"
      >
        {contadores.map((c) => (
          <button key={c.status ?? 'todas'} type="submit" name="status" value={c.valor} aria-pressed={c.pressionado} disabled={carregando} className={BOTAO}>
            <span className="inline-flex items-center gap-2">
              {c.pressionado ? <Visto /> : null}
              {c.cor ? <span aria-hidden="true" data-cor={c.cor} className={`inline-block size-2.5 shrink-0 rounded-full ${COR_DO_PONTO[c.cor]}`} /> : null}
              <span className="text-[0.8125rem] text-tinta-media">{c.rotulo}</span>
            </span>{' '}
            {carregando ? (
              <span aria-hidden="true" className="inline-block h-6 w-8 rounded-campo bg-linha motion-safe:animate-pulse" />
            ) : c.total !== null ? (
              <>
                <span className="font-mono text-xl font-semibold text-marinho md:text-[1.75rem] md:leading-tight">{c.total.toLocaleString('pt-BR')}</span>
                <span className="sr-only">{TEXTOS_CONTADORES.demandas(c.total)}</span>
              </>
            ) : null}
          </button>
        ))}
      </div>
      {erro ? <p className="mt-2 text-[0.8125rem] text-tinta-media">{TEXTOS_CONTADORES.erro}</p> : null}
      {filtro.tipo ? <input type="hidden" name="tipo" value={filtro.tipo} /> : null}
      {filtro.linhaServicoProvavel ? <input type="hidden" name="linhaServicoProvavel" value={filtro.linhaServicoProvavel} /> : null}
      {filtro.origem ? <input type="hidden" name="origem" value={filtro.origem} /> : null}
    </form>
  );
}
