// Regra da seção "Pedido de Construção" da T11 no painel (03, T11; RF-22; 04, C-16 e C-28), sem tela: os textos da 03,
// o aviso de C-28, a caixa de confirmação (D3 do 0013), quando a seção aparece, o link de baixar e o que a tela mostra
// para cada recusa da Server Action. Vai ao navegador: só tipos vêm dos módulos, e as mensagens que o servidor também
// usa são cópia das de gerar.ts (o teste confere). Quem gera e valida é o servidor (gerarPedido, T22): a tela só mostra o
// que ele devolve, byte a byte.
import type { ResultadoAcao } from '../lib/acao-painel';
import { MENSAGEM_ERRO_INTERNO } from '../lib/erros';
import type { PacoteDecisaoVista } from '../modules/pacotes-decisao/consultas';
import { errosDoResultado } from './formulario';

// MENSAGENS_PEDIDO de pedido-construcao/gerar.ts, as que a tela reconhece no 422.
export const MENSAGENS_PEDIDO_DO_SERVIDOR = {
  estudo: 'demanda do tipo estudo não gera Pedido de Construção',
  naoPassou: 'O pedido não passou na validação do /construir. Nada foi entregue.',
  semConfirmacao: 'Confirme que o título, a descrição, a ESP e o parecer de risco não têm dado pessoal de ninguém. Nada foi entregue.',
} as const;

export const TEXTOS_PEDIDO = {
  titulo: 'Pedido de Construção',
  texto: 'Gere o pedido, baixe ou copie o JSON e grave-o na pasta pedidos/ da estruturaAutonoma. O envio ao /construir é manual nesta versão.',
  // C-28 (04), com o texto da 02-triagem do 0013 (D3), para revisão da ux-ui-design.
  avisoDadoPessoal:
    'O pedido vai para o repositório git da estruturaAutonoma. Não deixe nome, e-mail, telefone ou CPF de qualquer pessoa ou do cliente no título, na descrição, na ESP nem no parecer de risco.',
  // D3 do 0013: o rótulo da caixa e o erro dela quando o botão é usado com a caixa desmarcada.
  confirmacao: 'Confirmo que o título, a descrição, a ESP e o parecer de risco deste pacote não têm dado pessoal de ninguém: nome, e-mail, telefone ou CPF.',
  semConfirmacao: 'Marque a confirmação para gerar o pedido.',
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
  // A orientação de antes, que fica quando nenhuma linha por campo de orientacaoDoPedido vale.
  orientacao: 'Corrija criando uma versão nova da ESP e um pacote novo.',
} as const;

// D1 do 0013 (E5): uma linha por situação, textos da 02-triagem para revisão da ux-ui-design. Nenhuma traz valor do
// pedido: só os caminhos fixos do pedido aparecem nelas.
const ORIENTACAO = {
  nome: 'O nome do solicitante, inteiro ou em parte com inicial maiúscula, está nos campos da lista. Tire o nome e gere de novo.',
  demanda: 'Título e descrição (demanda.titulo, demanda.descricao): corrija na demanda, em "Editar dados".',
  esp: 'ESP, critérios de aceite, definição de pronto, sistema e repositório: corrija numa versão nova da ESP.',
  risco: 'Parecer de risco (risco.conteudo): corrija num parecer de risco novo.',
  decisao: 'Opção escolhida (decisao.opcaoEscolhida): corrija num pacote novo.',
  // 0.1.13: texto da 02-triagem do DEC-DEM-20261104-0014-v1, para revisão da ux-ui-design.
  aviso: 'Depois de corrigir, crie um pacote novo e aprove-o: o pacote aprovado mais novo substitui este, e só ele gera o Pedido de Construção.',
} as const;

// Os começos de caminho de cada linha por campo (2 a 5), na ordem em que as linhas saem.
const CAMPOS_DA_ORIENTACAO: ReadonlyArray<readonly [string, readonly string[]]> = [
  [ORIENTACAO.demanda, ['demanda.titulo', 'demanda.descricao']],
  [ORIENTACAO.esp, ['especificacao.', 'criterios_aceite_preliminares', 'definicao_de_pronto', 'sistema_alvo', 'repositorio_destino']],
  [ORIENTACAO.risco, ['risco.']],
  [ORIENTACAO.decisao, ['decisao.']],
];

// A orientação do 422 de validação, uma linha por parágrafo: (1) a do nome, se algum erro é `: nome`; (2 a 5) onde
// corrigir cada campo da lista; (6) que o pacote novo, aprovado, substitui este e passa a ser o único que gera (0.1.13),
// sempre que houver linha de 2 a 5; (7) sem nenhuma de 2 a 5, a frase de antes.
export function orientacaoDoPedido(erros: readonly string[]): string[] {
  const linhas: string[] = [];
  if (erros.some((e) => e.endsWith(': nome'))) linhas.push(ORIENTACAO.nome);
  const porCampo = CAMPOS_DA_ORIENTACAO.filter(([, prefixos]) => erros.some((e) => prefixos.some((p) => e.startsWith(p)))).map(([linha]) => linha);
  if (porCampo.length === 0) return [...linhas, TEXTOS_PEDIDO.orientacao];
  return [...linhas, ...porCampo, ORIENTACAO.aviso];
}

export type SecaoDoPedido = 'nenhuma' | 'estudo' | 'gerar';

// Só com a decisão aprovada completa (03, T11): a aprovação parcial ainda não tem linha em `decisao`. O tipo que conta
// é o copiado no pacote, o mesmo que gerarPedido usa (CA-22.3). DEC desatualizado (ESP ou RSK mais nova depois da
// aprovação) não mostra a seção: gerarPedido o recusa com 409 (08-correcao, A-03). DEC substituído por um aprovado mais
// novo da demanda também não (0.1.13): só o aprovado mais novo gera, e a T11 mostra o aviso com o link para ele.
export function secaoDoPedido(p: Pick<PacoteDecisaoVista, 'statusDecisao' | 'decisao' | 'demandaTipo' | 'desatualizado' | 'substituidoPor'>): SecaoDoPedido {
  if (p.statusDecisao !== 'aprovada' || !p.decisao || p.desatualizado || p.substituidoPor !== null) return 'nenhuma';
  return p.demandaTipo === 'estudo' ? 'estudo' : 'gerar';
}

// D3 do 0013: a entrada da Server Action, só com a caixa marcada. Desmarcada (null), a tela não chama a ação e mostra
// TEXTOS_PEDIDO.semConfirmacao como erro da caixa. A regra que vale é a do servidor (gerarPedido recusa sem a
// confirmação).
export function entradaDoPedido(decId: string, confirmado: boolean): { decId: string; confirmaSemDadoPessoal: true } | null {
  return confirmado ? { decId, confirmaSemDadoPessoal: true } : null;
}

// O link "Baixar" (03, T11, Acessibilidade: link com `download`) leva o conteúdo exato devolvido pela ação.
export const hrefDoPedido = (json: string): string => `data:application/json;charset=utf-8,${encodeURIComponent(json)}`;

// `orientacao`: um parágrafo por linha; vazia quando não há orientação.
export type ErroDoPedido = { texto: string; erros: string[]; orientacao: string[] };

// 422 da validação: o texto da 03, a lista `erros` da API (campo e tipo, sem valor, C-28 e D1 do 0013) e a orientação
// por campo; 422 de Estudo: o texto da 03; 422 sem a confirmação (D3 do 0013): o texto do servidor; o resto, o alerta da
// 2.8 (409 com "Não foi possível concluir: ", 403, 404 e erro interno).
export function erroDoPedido(r: Extract<ResultadoAcao<unknown>, { ok: false }>): ErroDoPedido {
  if (r.erro === 'nao_processavel' && r.mensagem === MENSAGENS_PEDIDO_DO_SERVIDOR.estudo) return { texto: TEXTOS_PEDIDO.estudo, erros: [], orientacao: [] };
  if (r.erro === 'nao_processavel' && r.mensagem === MENSAGENS_PEDIDO_DO_SERVIDOR.semConfirmacao)
    return { texto: MENSAGENS_PEDIDO_DO_SERVIDOR.semConfirmacao, erros: [], orientacao: [] };
  if (r.erro === 'nao_processavel' && r.mensagem === MENSAGENS_PEDIDO_DO_SERVIDOR.naoPassou) {
    const erros = r.erros ?? [];
    return {
      texto: erros.length > 0 ? TEXTOS_PEDIDO.naoPassou : MENSAGENS_PEDIDO_DO_SERVIDOR.naoPassou,
      erros: [...erros],
      orientacao: orientacaoDoPedido(erros),
    };
  }
  // Erro de campo só viria de id fora do formato, que a página nunca manda: não há campo na tela para mostrar.
  return { texto: errosDoResultado(r).alerta ?? MENSAGEM_ERRO_INTERNO, erros: [], orientacao: [] };
}
