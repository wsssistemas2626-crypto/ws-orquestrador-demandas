// Prompt do agente de insumo técnico (RF-08, RF-16). Fonte: o agente operacional-desenvolvimento-sistemas da estrutura
// (levantamento de requisitos, especificação técnica, integrações; sinaliza o que falta em vez de presumir). Entrada: a
// demanda, minimizada (T24). Saída: `criarEspecificacaoSchema`, o mesmo da rota da ESP; os campos de construção seguem
// a regra de `validarCamposDeConstrucao` (CA-08.2 a CA-08.4), que o serviço confere ao gravar.
import type { CriarEspecificacao } from '../modules/especificacoes/schemas';
import { DONOS_REPOSITORIO, TIPOS_CONSTRUIDOS } from '../vendor/construir/pedido.mjs';
import { montarPrompt } from './comum';

const exemploSaida: CriarEspecificacao = {
  descricaoObjetiva: 'Evitar que um pedido do marketplace gere mais de um pedido no ERP.',
  situacaoAtual: 'A integração cria um pedido no ERP a cada leitura, sem conferir se o pedido já foi criado antes.',
  situacaoDesejada: 'Cada pedido do marketplace gera exatamente um pedido no ERP, mesmo quando a leitura se repete.',
  escopoInclui: ['Conferência do código do pedido antes de criar no ERP', 'Relatório dos pedidos já duplicados'],
  escopoExclui: ['Correção dos pedidos duplicados já faturados'],
  sistemasErp: 'ERP do cliente, pela API de pedidos.',
  sistemasEcommerceMarketplace: 'Marketplace citado na demanda.',
  sistemasApisTerceiros: 'API de pedidos do marketplace.',
  sistemasServicosInternos: 'Serviço de integração que hoje faz a leitura a cada hora.',
  dadosEntidades: 'Pedido, item do pedido e nota fiscal.',
  dadosCamposCriticos: 'Código do pedido no marketplace e situação do pedido no ERP.',
  restricoesTecnicas: 'A API do marketplace limita o número de consultas por minuto.',
  duvidasEmAberto: [],
  sistemaAlvo: 'integracao-pedidos',
  repositorioDestino: 'wsssistemas2626-crypto/integracao-pedidos',
  criteriosAceitePreliminares: [
    'O mesmo pedido lido duas vezes gera um único pedido no ERP',
    'O relatório lista os pedidos duplicados do período informado',
  ],
  definicaoDePronto: ['Testes automatizados da conferência verdes', 'Manual de operação atualizado'],
};

export const PROMPT_INSUMO_TECNICO = montarPrompt({
  papel: 'Insumo Técnico, com o olhar do Operacional e Desenvolvimento de Sistemas',
  tarefa:
    'Ler a demanda e escrever a especificação técnica (ESP) preliminar: o problema, o escopo, os sistemas envolvidos, os dados, as restrições, as dúvidas que impedem a construção e os campos que o Pedido de Construção usa.',
  regras: [
    'descricaoObjetiva (obrigatória): o problema ou objetivo em uma ou duas frases. situacaoAtual e situacaoDesejada: como é hoje e como deve ficar.',
    'escopoInclui (obrigatório, ao menos um item): o que a construção entrega, um item por entrega. escopoExclui: o que fica de fora, para não haver dúvida.',
    'sistemasErp, sistemasEcommerceMarketplace, sistemasApisTerceiros e sistemasServicosInternos: só os sistemas que a demanda cita. Não presuma sistema que o texto não cita.',
    'dadosEntidades e dadosCamposCriticos: as entidades e os campos de dados envolvidos, pelo nome do campo, nunca com valor real.',
    'restricoesTecnicas: limites que a construção precisa respeitar (desempenho, volume, integração, segurança).',
    'duvidasEmAberto: o que falta saber para construir, uma pergunta por item. Qualquer item aqui leva a demanda a aguardar informação e segura o parecer de risco; por isso, liste só o que de fato impede a construção. Não invente a resposta.',
    `sistemaAlvo, repositorioDestino, criteriosAceitePreliminares e definicaoDePronto são obrigatórios quando o tipo da demanda é ${TIPOS_CONSTRUIDOS.join(', ')}; no tipo estudo, podem ficar de fora.`,
    'sistemaAlvo: nome curto do sistema, só com letras minúsculas, números e hífen, começando por letra ou número. Se a demanda não disser, proponha um a partir do título; quem revisa confirma.',
    `repositorioDestino: <conta>/<sistemaAlvo>, com a conta ${DONOS_REPOSITORIO.join(' ou ')}. Sistema novo fica em wsssistemas2626-crypto.`,
    'criteriosAceitePreliminares: condições verificáveis de que a entrega funciona, uma por item. definicaoDePronto: o que precisa estar feito para a entrega ser dada como pronta, um item por linha.',
  ],
  exemploSaida,
  maxTokens: 6000,
});
