'use client';

// Cabeçalho do painel (03, 2.7): nome do sistema (link para a fila), navegação "Principal" com a página atual em
// aria-current, a conta ("<Nome> (CTO)") e "Sair". Em tela estreita, a navegação vira o botão "Menu" com aria-expanded.
// Ao trocar de tela pelo painel, o foco vai ao h1 da tela nova; na primeira carga, não (o primeiro Tab é o "Pular para
// o conteúdo").
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Papel } from '../modules/acesso/ator';
import { Botao } from './Botao';
import { ROTULO_PAPEL } from './rotulos';

const LINKS = [
  { href: '/demandas', texto: 'Demandas' },
  { href: '/demandas/nova', texto: 'Nova demanda' },
  { href: '/configuracao/agentes', texto: 'Agentes e teto' },
] as const;

// Telas que pertencem à fila: detalhe, edição e as versões de ESP, RSK e DEC. "Nova demanda" tem item próprio.
const DA_FILA = /^\/(demandas|especificacoes|pareceres-risco|pacotes-decisao)(\/|$)/;

export function ehPaginaAtual(href: string, caminho: string | null): boolean {
  if (!caminho) return false;
  if (href === '/demandas') return DA_FILA.test(caminho) && caminho !== '/demandas/nova';
  return caminho === href || caminho.startsWith(`${href}/`);
}

type Props = { nome: string; papel: Papel };

export function CabecalhoPainel({ nome, papel }: Props) {
  const caminho = usePathname();
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  // O caminho da última tela focada. Comparar o caminho, e não "já rodou uma vez", porque o efeito roda duas vezes na
  // mesma tela em modo estrito do React.
  const caminhoAnterior = useRef(caminho);

  useEffect(() => {
    if (caminhoAnterior.current === caminho) return;
    caminhoAnterior.current = caminho;
    const h1 = document.querySelector<HTMLElement>('main h1');
    if (!h1) return;
    if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1');
    h1.focus();
  }, [caminho]);

  async function sair() {
    setSaindo(true);
    try {
      await fetch('/api/auth/sign-out', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    } finally {
      router.replace('/entrar');
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-10 border-b border-borda bg-fundo">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-1">
        <Link href="/demandas" className="inline-flex min-h-11 items-center font-semibold text-texto no-underline">
          WS Orquestrador de Demandas
        </Link>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center rounded-campo border border-borda px-3 md:hidden"
          aria-expanded={menuAberto}
          aria-controls="navegacao-principal"
          onClick={() => setMenuAberto((v) => !v)}
        >
          Menu
        </button>
        <nav id="navegacao-principal" aria-label="Principal" className={`${menuAberto ? 'block' : 'hidden'} w-full md:block md:w-auto`}>
          <ul className="flex flex-col gap-1 md:flex-row md:gap-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={ehPaginaAtual(l.href, caminho) ? 'page' : undefined}
                  onClick={() => setMenuAberto(false)}
                  className="inline-flex min-h-11 items-center rounded-campo px-2 text-primaria underline-offset-4 hover:underline aria-[current=page]:font-semibold aria-[current=page]:underline aria-[current=page]:decoration-2"
                >
                  {l.texto}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-3 md:ml-auto">
          <span>{`${nome} (${ROTULO_PAPEL[papel]})`}</span>
          <Botao variante="secundario" onClick={sair} disabled={saindo}>
            Sair
          </Botao>
        </div>
      </div>
    </header>
  );
}
