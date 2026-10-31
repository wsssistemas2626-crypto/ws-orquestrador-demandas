// Regra da seção "Pedido de Construção" da T11 no painel (03, T11; RF-22; 04, C-16 e C-28), sem tela: os textos da 03,
// o aviso de C-28, quando a seção aparece, o link de baixar e o que a tela mostra para cada recusa da Server Action. Vai
// ao navegador: só tipos vêm dos módulos, e as mensagens que o servidor também usa são cópia das de gerar.ts (o teste
// confere). Quem gera e valida é o servidor (gerarPedido, T22): a tela só mostra o que ele devolve, byte a byte.
import type { ResultadoAcao } from '../lib/acao-painel';
import { MENSAGEM_ERRO_INTERNO } from '../lib/erros';
import type { PacoteDecisaoVista } from '../modules/pacotes-decisao/consultas';
import { errosDoResultado } from './formulario';

// MENSAGENS_PEDIDO de pedido-construcao/gerar.ts, as que a tela reconhece no 422.
export const MENSAGENS_PEDIDO_DO_SERVIDOR = {
  estudo: 'demanda do tipo estudo não gera Pedido de Construção',
  naoPassou: 'O pedido não passou na validação do /construir. Nada foi entregue.',
} as const;

export const TEXTOS_PEDIDO = {
  titulo: 'Pedido de Construção',
  texto: 'Gere o pedido, baixe ou copie o JSON e grave-o na pasta pedidos/ da estruturaAutonoma. O envio ao /construir é manual nesta versão.',
  // C-28 (04), com o texto do plano (T44): a 03 não o tem.
  avisoDadoPessoal: 'O pedido vai para o repositório git da estruturaAutonoma. Não deixe nome, e-mail ou telefone de cliente na ESP nem no parecer de risco.',
  gerar: 'Gerar Pedido de Construção',
  gerando: 'Gerando o pedido…',
  baixar: (nomeArquivo: string) => `Baixar ${nomeArquivo}`,
  copiar: 'Copiar JSON',
  rotuloBloco: 'Conteúdo do Pedido de Construção',
  nota: 'O mesmo pacote gera sempre o mesmo pedido.',
  estudo: 'Demanda do tipo Estudo não gera Pedido de Construção.',
  gerado: 'Pedido de Construção gerado.',
  copiado: 'JSON copiado para a área de transferência.',
  naoCopiou: 'Não foi possível copiar. Selecione o conteúdo abaixo e copie com Ctrl+C.',
  naoPassou: `${MENSAGENS_PEDIDO_DO_SERVIDOR.naoPassou} Erros:`,
  orientacao: 'Corrija criando uma versão nova da ESP e um pacote novo.',
} as const;

export type SecaoDoPedido = 'nenhuma' | 'estudo' | 'gerar';

// Só com a decisão aprovada completa (03, T11): a aprovação parcial ainda não tem linha em `decisao`. O tipo que conta
// é o copiado no pacote, o mesmo que gerarPedido usa (CA-22.3).
export function secaoDoPedido(p: Pick<PacoteDecisaoVista, 'statusDecisao' | 'decisao' | 'demandaTipo'>): SecaoDoPedido {
  if (p.statusDecisao !== 'aprovada' || !p.decisao) return 'nenhuma';
  return p.demandaTipo === 'estudo' ? 'estudo' : 'gerar';
}

// O link "Baixar" (03, T11, Acessibilidade: link com `download`) leva o conteúdo exato devolvido pela ação.
export const hrefDoPedido = (json: string): string => `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;

export type ErroDoPedido = { texto: string; erros: string[]; orientacao: string | null };

// 422 da validação: o texto da 03, a lista `erros` da API (campo e tipo, sem valor, C-28) e a orientação; 422 de
// Estudo: o texto da 03; o resto, o alerta da 2.8 (409 com "Não foi possível concluir: ", 403, 404 e erro interno).
export function erroDoPedido(r: Extract<ResultadoAcao<unknown>, { ok: false }>): ErroDoPedido {
  if (r.erro === 'nao_processavel' && r.mensagem === MENSAGENS_PEDIDO_DO_SERVIDOR.estudo) return { texto: TEXTOS_PEDIDO.estudo, erros: [], orientacao: null };
  if (r.erro === 'nao_processavel' && r.mensagem === MENSAGENS_PEDIDO_DO_SERVIDOR.naoPassou) {
    const erros = r.erros ?? [];
    return { texto: erros.length > 0 ? TEXTOS_PEDIDO.naoPassou : MENSAGENS_PEDIDO_DO_SERVIDOR.naoPassou, erros: [...erros], orientacao: TEXTOS_PEDIDO.orientacao };
  }
  // Erro de campo só viria de id fora do formato, que a página nunca manda: não há campo na tela para mostrar.
  return { texto: errosDoResultado(r).alerta ?? MENSAGEM_ERRO_INTERNO, erros: [], orientacao: null };
}
