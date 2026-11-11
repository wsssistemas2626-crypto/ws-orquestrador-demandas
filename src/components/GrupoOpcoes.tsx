'use client';

// Grupo de opções (03, 2.3): rádios dentro de `fieldset` com `legend`. Opção indisponível continua no grupo, com
// aria-disabled e o motivo ligado por aria-describedby (03, T05 e T11: encontrável e explicada), e não pode ser marcada.
import type { ChangeEvent, MouseEvent } from 'react';
import { Dica, MensagemDeErro } from './CampoTexto';

export type OpcaoDoGrupo = { valor: string; rotulo: string; desabilitada?: boolean; dica?: string };

type Props = {
  nome: string;
  legenda: string;
  opcoes: readonly OpcaoDoGrupo[];
  dica?: string;
  erro?: string;
  // Controlado (com onMudar) ou não (valorPadrao).
  valor?: string;
  valorPadrao?: string;
  onMudar?: (valor: string) => void;
  className?: string;
  // 0.2.0 (03, 2.6 do pedido 0015): `cartao` põe cada opção num cartão clicável inteiro, com os mesmos ids, `name` e
  // aria-* da lista; o rótulo estica a área de clique ao cartão todo (after:absolute).
  variante?: 'lista' | 'cartao';
};

const CLASSE_DA_OPCAO: Readonly<Record<'lista' | 'cartao', string>> = {
  lista: 'flex flex-col',
  cartao:
    'relative flex flex-col rounded-campo border border-tinta-suave bg-branco px-3 py-2 has-[:checked]:border-2 has-[:checked]:border-marinho has-[:checked]:bg-nevoa',
};
const CLASSE_DO_ROTULO: Readonly<Record<'lista' | 'cartao', string>> = {
  lista: '',
  cartao: 'flex-1 cursor-pointer after:absolute after:inset-0',
};
// 0.2.0 (T12): no cartão, o rádio fica acima da camada de clique do rótulo (after:absolute), para o clique no próprio
// rádio chegar a ele.
const CLASSE_DO_RADIO: Readonly<Record<'lista' | 'cartao', string>> = {
  lista: 'h-5 w-5 shrink-0 accent-acao-escura',
  cartao: 'relative z-10 h-5 w-5 shrink-0 accent-acao-escura',
};

const idDaOpcao = (nome: string, valor: string) => `${nome}-${valor === '' ? 'vazio' : valor}`;

const impedir = (e: MouseEvent<HTMLInputElement>) => e.preventDefault();

// Só uma opção do grupo e disponível pode chegar ao onMudar. O clique já é bloqueado; isto cobre a troca pelo teclado
// (setas) e qualquer outro caminho até o `change`. A regra que vale continua no servidor.
export function opcaoMarcavel(opcoes: readonly OpcaoDoGrupo[], valor: string): boolean {
  const opcao = opcoes.find((o) => o.valor === valor);
  return opcao !== undefined && !opcao.desabilitada;
}

export function GrupoOpcoes({ nome, legenda, opcoes, dica, erro, valor, valorPadrao, onMudar, className, variante = 'lista' }: Props) {
  const aoMudar = (e: ChangeEvent<HTMLInputElement>) => {
    if (opcaoMarcavel(opcoes, e.target.value)) onMudar?.(e.target.value);
  };
  const descricaoDoGrupo = [dica ? `${nome}-dica` : null, erro ? `${nome}-erro` : null].filter(Boolean).join(' ') || undefined;
  return (
    <fieldset
      aria-describedby={descricaoDoGrupo}
      className={`flex flex-col ${variante === 'cartao' ? 'gap-2' : 'gap-1'}${className ? ` ${className}` : ''}`}
    >
      <legend className="font-medium">{legenda}</legend>
      {dica ? <Dica id={nome}>{dica}</Dica> : null}
      {erro ? <MensagemDeErro id={nome}>{erro}</MensagemDeErro> : null}
      {opcoes.map((o) => {
        const id = idDaOpcao(nome, o.valor);
        const idDica = o.dica ? `${id}-dica` : undefined;
        const classeDoRotulo = [CLASSE_DO_ROTULO[variante], o.desabilitada ? 'text-texto-suave' : ''].filter(Boolean).join(' ');
        return (
          <div key={o.valor} className={CLASSE_DA_OPCAO[variante]}>
            <div className="flex min-h-11 items-center gap-2">
              <input
                type="radio"
                id={id}
                name={nome}
                value={o.valor}
                aria-disabled={o.desabilitada ? true : undefined}
                aria-describedby={idDica}
                {...(valor !== undefined ? { checked: valor === o.valor, onChange: aoMudar } : { defaultChecked: valorPadrao === o.valor, onChange: aoMudar })}
                onClick={o.desabilitada ? impedir : undefined}
                className={CLASSE_DO_RADIO[variante]}
              />
              <label htmlFor={id} className={classeDoRotulo || undefined}>
                {o.rotulo}
              </label>
            </div>
            {o.dica ? (
              <p id={idDica} className="ml-7 text-sm text-texto-suave">
                {o.dica}
              </p>
            ) : null}
          </div>
        );
      })}
    </fieldset>
  );
}
