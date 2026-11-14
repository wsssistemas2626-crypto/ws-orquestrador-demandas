// 0.4.1 (S-03, ADR-37, SB-07, SB-08): os caminhos de textosDaCriacao que o nome do solicitante em vigor na criação do DEC
// marcou. Só nomes de campo de uma lista fechada, sem o nome, sem hash dele e sem o valor do texto. criar.ts grava a lista
// uma vez, sob a trava da demanda; conferir.ts (T05) a lê e a traduz para os caminhos do pedido. A leitura falha fechada:
// valor fora do formato é erro interno com mensagem fixa, nunca tratado como null nem como lista vazia.
import { z } from 'zod';
import type { OpcaoDecisao } from '../../db/schema/decisao';
import { temNome } from '../dados-pessoais/minimizar';
import { LIMITE_ITENS } from '../demandas/schemas';
import { CAMINHO_DA_OPCAO, type TextoDoPedido } from './montar';

// Âncoras e nenhuma flag: `test` não guarda estado entre chamadas (SB-08 f). Índice de lista com até 4 dígitos (as listas
// têm no máximo LIMITE_ITENS itens).
export const RE_CAMINHO_DA_CRIACAO =
  /^(?:demanda\.titulo|demanda\.descricao|especificacao\.conteudo|risco\.conteudo|opcao[AB]\.descricao|sistema_alvo|repositorio_destino|criterios_aceite_preliminares\[\d{1,4}\]|definicao_de_pronto\[\d{1,4}\])$/;

// Quatro textos fixos, as duas opções, os dois opcionais e as duas listas cheias.
export const MAXIMO_DE_CAMINHOS = 8 + 2 * LIMITE_ITENS;

export const MENSAGEM_CAMINHOS_INVALIDOS = 'caminhos da criação do DEC fora do formato';

const caminhosSchema = z.array(z.string().regex(RE_CAMINHO_DA_CRIACAO)).max(MAXIMO_DE_CAMINHOS).nullable();

// Os caminhos dos textos em que o nome aparece (inteiro ou em parte, pela regra de temNome), na ordem dos textos. Sem
// nome (lista vazia), nenhum caminho.
export function caminhosComNomeNaCriacao(textos: readonly TextoDoPedido[], nomes: readonly string[]): string[] {
  return textos.filter((t) => t.valores.some((v) => temNome(v, nomes))).map((t) => t.caminho);
}

// O erro do Zod traria o valor nas `issues`: sai um Error com mensagem fixa (500 por mapearErro, Sentry reduzido).
export function lerCaminhosDaCriacao(valor: unknown): readonly string[] | null {
  const r = caminhosSchema.safeParse(valor);
  if (!r.success) throw new Error(MENSAGEM_CAMINHOS_INVALIDOS);
  return r.data;
}

// Os caminhos gravados na criação, no vocabulário do pedido: a opção escolhida vira decisao.opcaoEscolhida, e a outra
// sai (a opção não escolhida não vai ao pedido e não o recusa, SB-08 d).
export function caminhosDaCriacaoNoPedido(gravados: readonly string[], escolhida: OpcaoDecisao): ReadonlySet<string> {
  const saida = new Set<string>();
  for (const c of gravados) {
    if (c === CAMINHO_DA_OPCAO[escolhida]) saida.add('decisao.opcaoEscolhida');
    else if (c !== CAMINHO_DA_OPCAO.A && c !== CAMINHO_DA_OPCAO.B) saida.add(c);
  }
  return saida;
}
