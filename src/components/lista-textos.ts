// Regra da Lista de textos (03, 2.4), sem tela: os textos, os ids dos itens e do "Adicionar item", os itens iniciais e o
// que vai ao servidor. Vai ao navegador (ListaTextos.tsx e os formulários de ESP e RSK); o limite é cópia do servidor
// (LIMITE_ITENS de demandas/schemas.ts, conferido no teste).
import { idDoCampo } from './formulario';

export const LIMITE_ITENS_LISTA = 50;

// `chave` é só da tela (chave do React); não vai ao servidor.
export type ItemDaLista = { chave: string; valor: string };

export const TEXTOS_LISTA = {
  item: (n: number) => `Item ${n}`,
  remover: 'Remover',
  removerNome: (n: number, nome: string) => `Remover item ${n} de ${nome}`,
  adicionar: 'Adicionar item',
  limite: 'Limite de 50 itens atingido.',
} as const;

export const idDoItem = (campo: string, i: number): string => idDoCampo(`${campo}.${i}`);
export const idDoAdicionar = (campo: string): string => `${idDoCampo(campo)}-adicionar`;

// O link do Resumo de erros leva ao primeiro item (03, T07); sem item na tela, ao "Adicionar item".
export const idDoAlvoDaLista = (campo: string, quantidade: number): string => (quantidade > 0 ? idDoItem(campo, 0) : idDoAdicionar(campo));

// Os itens com que a tela abre: um por valor, ou um item vazio quando não há nenhum (03, T07, Vazio). Chaves fixas, as
// mesmas no servidor e no navegador.
export function itensDe(campo: string, valores: readonly string[] | null | undefined): ItemDaLista[] {
  const v = valores && valores.length > 0 ? valores : [''];
  return v.map((valor, i) => ({ chave: `${campo}-${i}`, valor }));
}

// O que vai ao servidor: item vazio é descartado (03, 2.4) e o resto vai aparado; `indices` guarda a linha da tela de
// cada item enviado, para o erro da API (`campo.N`) voltar à linha certa.
export function valoresDaLista(itens: readonly ItemDaLista[]): { valores: string[]; indices: number[] } {
  const valores: string[] = [];
  const indices: number[] = [];
  itens.forEach((item, i) => {
    const v = item.valor.trim();
    if (v === '') return;
    valores.push(v);
    indices.push(i);
  });
  return { valores, indices };
}
