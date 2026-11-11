'use client';

// T03 Fila de demandas, a parte que roda no navegador (03, T03):
//   - os filtros, num formulário GET para /demandas que só se aplica pelo botão "Filtrar" (WCAG 3.2.2) e escreve na URL
//     só os filtros escolhidos; sem script, o mesmo formulário funciona como GET comum;
//   - o foco no resultado (caption da tabela, ou o texto do estado vazio ou do erro) depois de filtrar, limpar ou trocar
//     de página. Na primeira carga e ao chegar de outra tela, não: ali vale a regra da moldura (03, 2.7);
//   - a Região de aviso da página, com "N demandas encontradas.".
//
// Nada aqui lê dado: a página (servidor) passa o filtro já conferido pelo schema.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useSyncExternalStore, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { Botao } from '../../../components/Botao';
import { Recolhivel } from '../../../components/Recolhivel';
import { RegiaoAviso } from '../../../components/RegiaoAviso';
import { ROTULO_LINHA, ROTULO_TIPO } from '../../../components/rotulos';
import { Selecao, type OpcaoSelecao } from '../../../components/Selecao';
import type { FiltroDemandas } from '../../../modules/demandas/schemas';

// --- foco no resultado ---

// O endereço (caminho e consulta) para onde a fila vai depois de um filtro, de "Limpar filtros" ou da paginação. O
// resultado novo só toma o foco se a navegação terminou nele; um pedido que ficou para trás (um clique com Ctrl, que
// abre outra aba) é descartado no próximo resultado.
let focoPedidoPara: string | null = null;

const enderecoAtual = (): string => `${window.location.pathname}${window.location.search}`;
const enderecoDe = (href: string): string => {
  const u = new URL(href, window.location.origin);
  return `${u.pathname}${u.search}`;
};

function focar(id: string): void {
  document.getElementById(id)?.focus();
}

// Antes de navegar a `href`: pede o foco no resultado que vai chegar. Se o destino é o próprio endereço, nada recarrega,
// e o foco vai já ao resultado da tela. Devolve se o destino é o endereço atual. T09: os contadores (ContadoresDaFila)
// usam o mesmo pedido.
export function pedirFocoNoResultado(href: string, idFoco: string): boolean {
  const destino = enderecoDe(href);
  if (destino === enderecoAtual()) {
    focoPedidoPara = null;
    focar(idFoco);
    return true;
  }
  focoPedidoPara = destino;
  return false;
}

// --- região de aviso ---

let textoDoAviso = '';
const ouvintes = new Set<() => void>();
function assinar(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}
function definirAviso(texto: string): void {
  if (texto === textoDoAviso) return;
  textoDoAviso = texto;
  for (const o of ouvintes) o();
}

// A Região de aviso da página (03, 2.3: uma por página, montada desde o início). Fica fora da parte que recarrega a
// cada filtro, para o leitor de tela anunciar a troca do texto.
export function AvisoDaFila() {
  const texto = useSyncExternalStore(
    assinar,
    () => textoDoAviso,
    () => '',
  );
  useEffect(() => () => definirAviso(''), []);
  return <RegiaoAviso>{texto}</RegiaoAviso>;
}

// Montado com cada resultado novo: anuncia o texto na Região de aviso e, se este resultado é o destino pedido, leva o
// foco a ele. O texto é limpo antes e escrito depois de um instante, para o mesmo "12 demandas encontradas." ser
// anunciado de novo depois de outro filtro.
export function ResultadoAnunciado({ texto, idFoco }: { texto: string; idFoco: string }) {
  useEffect(() => {
    const pedido = focoPedidoPara;
    focoPedidoPara = null;
    if (pedido !== null && pedido === enderecoAtual()) focar(idFoco);
    definirAviso('');
    if (!texto) return;
    const t = window.setTimeout(() => definirAviso(texto), 100);
    return () => window.clearTimeout(t);
  }, [texto, idFoco]);
  return null;
}

// Em volta dos links que trocam o resultado ("Limpar filtros", "Anterior", "Próxima"): o clique comum pede o foco no
// resultado. O link continua sendo o `Link` do Next, que navega.
export function NavegacaoDaFila({ idFoco, children }: { idFoco: string; children: ReactNode }) {
  function aoClicar(e: MouseEvent<HTMLDivElement>) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target instanceof Element ? e.target.closest('a[href]') : null;
    const href = link?.getAttribute('href');
    if (href) pedirFocoNoResultado(href, idFoco);
  }
  return (
    <div onClickCapture={aoClicar} className="flex flex-wrap items-center gap-4">
      {children}
    </div>
  );
}

// "Tentar de novo" do erro de carga (03, T03, Erro): lê a fila de novo no servidor, sem perder os filtros da URL.
export function BotaoTentarDeNovo() {
  const router = useRouter();
  return (
    <Botao variante="secundario" onClick={() => router.refresh()}>
      Tentar de novo
    </Botao>
  );
}

// --- filtros ---

// T09 (03, 4.2): o status sai do formulário (os contadores o escolhem) e vai num campo oculto, com o valor da URL já
// validado, para "Filtrar" mantê-lo. O endereço continua com os nomes de hoje, na mesma ordem.
const CAMPOS = ['status', 'tipo', 'linhaServicoProvavel'] as const;

const opcoes = (primeira: string, rotulos: Readonly<Record<string, string>>): OpcaoSelecao[] => [
  { valor: '', rotulo: primeira },
  ...Object.entries(rotulos).map(([valor, rotulo]) => ({ valor, rotulo })),
];

const OPCOES_TIPO = opcoes('Todos', ROTULO_TIPO);
const OPCOES_LINHA = opcoes('Todas', ROTULO_LINHA);

// "Mais filtros" do celular (03, 4.3 e seção 9), com quantos de Tipo e Linha de serviço estão na URL.
export function rotuloMaisFiltros(ativos: number): string {
  if (ativos === 0) return 'Mais filtros';
  return ativos === 1 ? 'Mais filtros (1 ativo)' : `Mais filtros (${ativos} ativos)`;
}

type Props = { filtro: Pick<FiltroDemandas, 'status' | 'tipo' | 'linhaServicoProvavel'>; idFoco: string };

export function FiltrosFila({ filtro, idFoco }: Props) {
  const router = useRouter();
  const ativos = (filtro.tipo ? 1 : 0) + (filtro.linhaServicoProvavel ? 1 : 0);

  // O endereço leva só os filtros escolhidos ("Todos" não entra) e volta à página 1.
  function aoEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    const consulta = new URLSearchParams();
    for (const campo of CAMPOS) {
      const valor = dados.get(campo);
      if (typeof valor === 'string' && valor !== '') consulta.set(campo, valor);
    }
    const destino = consulta.size > 0 ? `/demandas?${consulta.toString()}` : '/demandas';
    if (!pedirFocoNoResultado(destino, idFoco)) router.push(destino);
  }

  return (
    <form action="/demandas" method="get" onSubmit={aoEnviar}>
      <input type="hidden" name="status" value={filtro.status ?? ''} />
      {/* Abaixo de 768 px, Tipo, Linha de serviço, "Filtrar" e "Limpar filtros" ficam em "Mais filtros" (03, 4.3). */}
      <Recolhivel id="mais-filtros" rotulo={rotuloMaisFiltros(ativos)}>
        <fieldset className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
          <legend className="px-1 font-semibold">Filtros</legend>
          <div className="flex flex-col gap-4 md:flex-row md:flex-wrap">
            <Selecao id="filtro-tipo" name="tipo" rotulo="Tipo" opcoes={OPCOES_TIPO} defaultValue={filtro.tipo ?? ''} />
            <Selecao
              id="filtro-linha"
              name="linhaServicoProvavel"
              rotulo="Linha de serviço"
              opcoes={OPCOES_LINHA}
              defaultValue={filtro.linhaServicoProvavel ?? ''}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Botao type="submit">Filtrar</Botao>
            <NavegacaoDaFila idFoco={idFoco}>
              <Link href="/demandas" className="inline-flex min-h-11 items-center text-acao-escura underline underline-offset-2">
                Limpar filtros
              </Link>
            </NavegacaoDaFila>
          </div>
        </fieldset>
      </Recolhivel>
    </form>
  );
}
