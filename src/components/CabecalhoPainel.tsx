'use client';

// Casca do painel (03, seção 3; ADR-15; pedido 0015, T05): o `header` (banner) marinho, com o foco branco
// (`superficie-escura`). A partir de 768 px é o menu lateral fixo na altura da janela (216 px até 1199 px, 248 px a
// partir de 1200 px): marca com link para a fila, nav "Principal" com os três itens, a conta "<Nome> (<Papel>)" e
// "Sair". Abaixo de 768 px, o mesmo `header` é a barra de 56 px com "Menu" e a marca compacta, e o menu vira a gaveta
// (GavetaMenu). Um só banner e um só nav "Principal" expostos em cada largura.
//
// A casca não decide acesso (CV-16): nome e papel chegam por prop do layout do servidor (exigirPessoa), e quem decide é
// a página (C-04). Mantém o nome de hoje (os testes de hoje importam este arquivo) e reexporta ehPaginaAtual.
import { usePathname } from 'next/navigation';
import { useRef, useState } from 'react';
import type { Papel } from '../modules/acesso/ator';
import { classeDoBotao } from './Botao';
import { BotaoSair } from './casca/BotaoSair';
import { FocoNaTrocaDeTela } from './casca/FocoNaTrocaDeTela';
import { GavetaMenu, ID_GAVETA } from './casca/GavetaMenu';
import { Icone, ItensDoMenu } from './casca/ItensDoMenu';
import { MarcaWs } from './marca/MarcaWs';
import { ROTULO_PAPEL } from './rotulos';

export { ehPaginaAtual } from './casca/navegacao';

type Props = { nome: string; papel: Papel };

export function CabecalhoPainel({ nome, papel }: Props) {
  const caminho = usePathname();
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const botaoMenu = useRef<HTMLButtonElement>(null);
  const conta = `${nome} (${ROTULO_PAPEL[papel]})`;

  return (
    <>
      <FocoNaTrocaDeTela />
      <header className="superficie-escura sticky top-0 z-20 bg-marinho text-texto-claro md:flex md:h-screen md:w-54 md:shrink-0 md:flex-col md:overflow-y-auto xl:w-62">
        <div className="flex h-14 items-center gap-3 px-4 md:hidden">
          <button
            ref={botaoMenu}
            type="button"
            aria-expanded={gavetaAberta}
            aria-controls={ID_GAVETA}
            onClick={() => setGavetaAberta(true)}
            className={`${classeDoBotao('sobre-escuro')} shrink-0 px-3`}
          >
            <Icone>
              <path d="M4 6h16M4 12h16M4 18h16" />
            </Icone>
            Menu
          </button>
          <MarcaWs variante="escura" compacta comLink />
        </div>
        <div className="hidden flex-1 flex-col gap-6 px-4 py-6 md:flex">
          <MarcaWs variante="escura" comLink />
          <nav aria-label="Principal">
            <ItensDoMenu caminho={caminho} />
          </nav>
          <div className="mt-auto flex flex-col gap-3 border-t border-marinho-luz pt-4">
            <p className="text-sm text-texto-claro">{conta}</p>
            <BotaoSair className="w-full" />
          </div>
        </div>
      </header>
      <GavetaMenu aberta={gavetaAberta} caminho={caminho} conta={conta} botaoMenu={botaoMenu} aoFechar={() => setGavetaAberta(false)} />
    </>
  );
}
