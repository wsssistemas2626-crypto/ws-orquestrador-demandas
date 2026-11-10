'use client';

// Gaveta do menu abaixo de 768 px (03, 3.3 e 3.4; ADR-15): <dialog id="gaveta-menu" aria-label="Menu"> aberto com
// showModal(), que deixa o resto da página inerte. Ordem: marca (sem link), "Fechar menu", nav "Principal" com os três
// itens, conta e "Sair". O conteúdo só existe enquanto a gaveta está aberta (D-09): no HTML do servidor há um só
// nav "Principal" e um só aria-current.
//
// Abre com o foco em "Fechar menu"; Tab e Shift+Tab dão a volta dentro dela (proximoIndiceCircular). Fecham: Esc,
// "Fechar menu", clique no véu e o item da tela atual, com o foco de volta em "Menu"; item de outra tela fecha sem
// devolver o foco (o FocoNaTrocaDeTela o põe no h1 da tela nova); a janela que passa a 768 px fecha e põe o foco no
// main. Enquanto aberta, a página atrás não rola (classe `gaveta-aberta` no html, por classList).
import { useEffect, useRef, type RefObject } from 'react';
import { Botao } from '../Botao';
import { MarcaWs } from '../marca/MarcaWs';
import { BotaoSair } from './BotaoSair';
import { focaveisEm, proximoIndiceCircular } from './foco';
import { ItensDoMenu } from './ItensDoMenu';

export const ID_GAVETA = 'gaveta-menu';
const ID_FECHAR = 'gaveta-menu-fechar';
const CLASSE_ABERTA = 'gaveta-aberta';
const LARGURA_DO_MENU_LATERAL = '(min-width: 768px)';

// Para onde vai o foco quando a gaveta fecha.
type Destino = 'menu' | 'conteudo' | 'nenhum';

type Props = {
  aberta: boolean;
  caminho: string | null;
  conta: string;
  botaoMenu: RefObject<HTMLButtonElement | null>;
  aoFechar: () => void;
};

export function GavetaMenu({ aberta, caminho, conta, botaoMenu, aoFechar }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const destino = useRef<Destino>('menu');
  // O aoFechar mais novo, sem refazer os ouvintes do <dialog> a cada renderização.
  const aoFecharAtual = useRef(aoFechar);
  useEffect(() => {
    aoFecharAtual.current = aoFechar;
  }, [aoFechar]);

  function fechar(d: Destino) {
    destino.current = d;
    if (ref.current?.open) ref.current.close();
  }

  // Abre quando o estado pede. O fechamento passa sempre pelo evento `close` do próprio <dialog> (Esc nativo incluído).
  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo || !aberta || dialogo.open) return;
    destino.current = 'menu';
    dialogo.showModal();
    document.documentElement.classList.add(CLASSE_ABERTA);
    document.getElementById(ID_FECHAR)?.focus();
  }, [aberta]);

  // Ouvintes do <dialog>: fechamento (com o destino do foco), clique no véu e a volta do Tab.
  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    const aoFecharDialogo = () => {
      document.documentElement.classList.remove(CLASSE_ABERTA);
      aoFecharAtual.current();
      if (destino.current === 'menu') botaoMenu.current?.focus();
      else if (destino.current === 'conteudo') document.getElementById('conteudo')?.focus();
      destino.current = 'menu';
    };
    // O véu é o próprio <dialog> (::backdrop): o conteúdo ocupa a caixa inteira, então clique nele tem outro alvo.
    const aoClicar = (e: MouseEvent) => {
      if (e.target !== e.currentTarget || !dialogo.open) return;
      destino.current = 'menu';
      dialogo.close();
    };
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const lista = focaveisEm(dialogo);
      const atual = lista.indexOf(document.activeElement as HTMLElement);
      const proximo = proximoIndiceCircular(atual, lista.length, e.shiftKey);
      if (proximo === null) return;
      e.preventDefault();
      lista[proximo]?.focus();
    };
    dialogo.addEventListener('close', aoFecharDialogo);
    dialogo.addEventListener('click', aoClicar);
    dialogo.addEventListener('keydown', aoTeclar);
    return () => {
      dialogo.removeEventListener('close', aoFecharDialogo);
      dialogo.removeEventListener('click', aoClicar);
      dialogo.removeEventListener('keydown', aoTeclar);
      // A casca sai da tela com a gaveta aberta (ex.: "Sair"): a página volta a rolar.
      document.documentElement.classList.remove(CLASSE_ABERTA);
    };
  }, [botaoMenu]);

  // Janela que passa a 768 px com a gaveta aberta: fecha, com o foco no main (o "Menu" some nessa largura).
  useEffect(() => {
    const dialogo = ref.current;
    if (!aberta || !dialogo) return;
    const mq = window.matchMedia(LARGURA_DO_MENU_LATERAL);
    const aoMudar = (e: MediaQueryListEvent) => {
      if (!e.matches || !dialogo.open) return;
      destino.current = 'conteudo';
      dialogo.close();
    };
    mq.addEventListener('change', aoMudar);
    return () => mq.removeEventListener('change', aoMudar);
  }, [aberta]);

  // Item da tela atual: fecha e devolve o foco a "Menu". Item de outra tela: fecha e deixa o foco para a tela nova.
  const aoEscolher = (href: string) => fechar(href === caminho ? 'menu' : 'nenhum');

  return (
    <dialog
      ref={ref}
      id={ID_GAVETA}
      aria-label="Menu"
      className="superficie-escura fixed inset-y-0 right-auto left-0 m-0 h-full max-h-none w-[min(320px,85%)] max-w-none bg-marinho p-0 text-texto-claro"
    >
      {aberta ? (
        <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
          <div className="flex items-start justify-between gap-3">
            <MarcaWs variante="escura" />
            <Botao id={ID_FECHAR} variante="sobre-escuro" className="shrink-0 px-3" onClick={() => fechar('menu')}>
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true" focusable="false">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
              Fechar menu
            </Botao>
          </div>
          <nav aria-label="Principal">
            <ItensDoMenu caminho={caminho} aoEscolher={aoEscolher} />
          </nav>
          <div className="mt-auto flex flex-col gap-3 border-t border-marinho-luz pt-4">
            <p className="text-sm text-texto-claro">{conta}</p>
            <BotaoSair className="w-full" />
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
