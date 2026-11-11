'use client';

// Lista de textos (03, 2.4) para os campos JSONB em lista: `fieldset` com a `legend` do campo; cada item é um Campo de
// texto "Item N" com o botão "Remover" (nome acessível "Remover item N de <campo>"); "Adicionar item" ao fim. Ao
// adicionar, o foco vai ao campo novo; ao remover, ao item anterior (ou ao "Adicionar item"). Com 50 itens, "Adicionar
// item" fica desabilitado, com a dica do limite. Sem arrastar para reordenar. Os valores ficam na tela que usa a lista.
import { useEffect, useRef } from 'react';
import { Botao } from './Botao';
import { CampoTexto, descritores, Dica, MensagemDeErro } from './CampoTexto';
import { idDoCampo } from './formulario';
import { idDoAdicionar, idDoItem, LIMITE_ITENS_LISTA, TEXTOS_LISTA, type ItemDaLista } from './lista-textos';

type Props = {
  // Caminho do campo na API ('escopoInclui'): base dos ids e das mensagens de erro.
  campo: string;
  // Texto da `legend`, com "(obrigatório)" quando for o caso (texto da 03).
  legenda: string;
  // O nome do campo sem "(obrigatório)", para "Remover item 2 de Escopo inclui".
  nome: string;
  dica?: string;
  itens: readonly ItemDaLista[];
  mudar: (f: (itens: ItemDaLista[]) => ItemDaLista[]) => void;
  // Mensagem por caminho: `campo` (a lista) e `campo.N` (o item da linha N da tela).
  erros: Readonly<Record<string, string>>;
  // Avisa a tela dona dos erros que a linha `indice` saiu, para o erro dos itens de baixo subir junto
  // (errosDepoisDeRemover, T42).
  aoRemover?: (indice: number, restantes: number) => void;
};

let contadorDeItens = 0;
const novoItem = (): ItemDaLista => ({ chave: `novo-${++contadorDeItens}`, valor: '' });

export function ListaTextos({ campo, legenda, nome, dica, itens, mudar, erros, aoRemover }: Props) {
  // O id do elemento que recebe o foco depois de adicionar ou remover, já com a lista nova na tela.
  const focoPendente = useRef<string | null>(null);
  useEffect(() => {
    if (!focoPendente.current) return;
    document.getElementById(focoPendente.current)?.focus();
    focoPendente.current = null;
  });

  const id = idDoCampo(campo);
  const erroDaLista = erros[campo];
  const noLimite = itens.length >= LIMITE_ITENS_LISTA;
  const idAdicionar = idDoAdicionar(campo);

  function adicionar() {
    if (itens.length >= LIMITE_ITENS_LISTA) return;
    focoPendente.current = idDoItem(campo, itens.length);
    mudar((v) => (v.length >= LIMITE_ITENS_LISTA ? v : [...v, novoItem()]));
  }

  function remover(i: number) {
    focoPendente.current = i > 0 ? idDoItem(campo, i - 1) : idAdicionar;
    const chave = itens[i]?.chave;
    mudar((v) => v.filter((item) => item.chave !== chave));
    aoRemover?.(i, itens.length - 1);
  }

  const mudarItem = (chave: string, valor: string) => mudar((v) => v.map((item) => (item.chave === chave ? { ...item, valor } : item)));

  return (
    <fieldset aria-describedby={descritores(id, dica, erroDaLista)} className="flex min-w-0 flex-col gap-3">
      <legend className="font-medium">{legenda}</legend>
      {dica ? <Dica id={id}>{dica}</Dica> : null}
      {erroDaLista ? <MensagemDeErro id={id}>{erroDaLista}</MensagemDeErro> : null}
      {itens.map((item, i) => {
        const n = i + 1;
        const idItem = idDoItem(campo, i);
        const erroDoItem = erros[`${campo}.${i}`];
        // O erro da lista (ex.: "ao menos um item") marca o primeiro item, que é para onde o Resumo de erros leva.
        const marcaDaLista = i === 0 && erroDaLista && !erroDoItem ? { 'aria-invalid': true, 'aria-describedby': `${id}-erro` } : {};
        return (
          <div key={item.chave} className="flex flex-wrap items-end gap-3">
            <CampoTexto
              id={idItem}
              rotulo={TEXTOS_LISTA.item(n)}
              value={item.valor}
              erro={erroDoItem}
              autoComplete="off"
              onChange={(e) => mudarItem(item.chave, e.target.value)}
              className="min-w-0 flex-1 basis-48"
              {...marcaDaLista}
            />
            <Botao variante="secundario" aria-label={TEXTOS_LISTA.removerNome(n, nome)} onClick={() => remover(i)}>
              {TEXTOS_LISTA.remover}
            </Botao>
          </div>
        );
      })}
      <div className="flex flex-col items-start gap-1">
        <Botao id={idAdicionar} variante="secundario" onClick={adicionar} disabled={noLimite} aria-describedby={noLimite ? `${idAdicionar}-dica` : undefined}>
          {TEXTOS_LISTA.adicionar}
        </Botao>
        {noLimite ? (
          <p id={`${idAdicionar}-dica`} className="text-sm text-tinta-media">
            {TEXTOS_LISTA.limite}
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}
