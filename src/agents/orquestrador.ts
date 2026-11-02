// Prompt do agente orquestrador (RF-05, RF-15, RF-16). Fonte: o Orquestrador Central da estrutura (CLAUDE.md da
// estruturaAutonoma): interpretar a demanda, classificá-la e sinalizar o que exige decisão humana. Entrada: só o texto
// recebido, minimizado (T24). Saída: `saidaOrquestradorSchema`, a demanda sem os campos do solicitante.
import { LINHAS_SERVICO, TIPOS_DEMANDA, URGENCIAS, type LinhaServico, type TipoDemanda } from '../db/schema/demandas';
import { LIMITE_FLAG, LIMITE_FLAGS, type SaidaOrquestrador } from '../modules/agentes/schemas';
import { montarPrompt } from './comum';

const SIGNIFICADO_DO_TIPO: Record<TipoDemanda, string> = {
  bug: 'algo que já existe e parou de funcionar ou funciona errado',
  melhoria: 'mudança ou acréscimo em algo que já existe',
  novo_projeto: 'sistema ou automação nova para um cliente',
  estudo: 'análise, diagnóstico ou levantamento, sem construção',
  produto_proprio: 'produto da própria WS Sistemas',
};

const SIGNIFICADO_DA_LINHA: Record<LinhaServico, string> = {
  sob_medida: 'sistema feito sob medida',
  automacao_integracao: 'automação ou integração entre sistemas',
  ia_controle_humano: 'solução com IA e controle humano',
  diagnostico_sustentacao: 'diagnóstico ou sustentação de algo em operação',
  indefinida: 'não dá para saber pelo texto',
};

const lista = <T extends string>(valores: readonly T[], significado?: Record<T, string>): string =>
  valores.map((v) => (significado ? `${v} (${significado[v]})` : v)).join('; ');

const exemploSaida: SaidaOrquestrador = {
  titulo: 'Pedidos do marketplace duplicados no ERP',
  tipo: 'bug',
  linhaServicoProvavel: 'automacao_integracao',
  urgencia: 'alta',
  justificativaUrgencia: 'O texto diz que a duplicação já afeta o faturamento do dia.',
  contexto: 'A integração entre o marketplace e o ERP do cliente roda a cada hora.',
  descricaoProblema: 'Desde a semana passada, parte dos pedidos aparece duas vezes no ERP.',
  impactoPercebido: 'Notas fiscais emitidas em dobro e retrabalho da equipe de operações.',
  perguntasParaSolicitante: ['Todos os marketplaces integrados apresentam a duplicação, ou só um deles?'],
  flags: ['A linha de serviço pode ser diagnostico_sustentacao, se a integração já estiver em sustentação.'],
};

export const PROMPT_ORQUESTRADOR = montarPrompt({
  papel: 'Orquestrador, a porta de entrada das demandas',
  tarefa:
    'Ler o texto recebido (e-mail, mensagem ou formulário que uma pessoa colou no painel) e transformá-lo numa demanda estruturada: título, tipo, linha de serviço provável, urgência e os textos de contexto, problema e impacto. Sinalize para quem revisa o que estiver incerto.',
  regras: [
    'titulo (obrigatório): uma frase curta, de até 120 caracteres, que diga o que se pede.',
    `tipo (obrigatório), um destes: ${lista(TIPOS_DEMANDA, SIGNIFICADO_DO_TIPO)}.`,
    `linhaServicoProvavel, uma destas: ${lista(LINHAS_SERVICO, SIGNIFICADO_DA_LINHA)}. Na dúvida, indefinida.`,
    `urgencia, uma destas: ${lista(URGENCIAS)}. Só com base no texto, e com justificativaUrgencia dizendo qual é essa base. Sem base no texto, deixe os dois de fora.`,
    'contexto, descricaoProblema e impactoPercebido: resuma com as suas palavras o que o texto diz, sem copiar o texto inteiro.',
    'Não inclua nome, papel, cargo ou contato do solicitante nem anexos: esses campos vêm da pessoa que registrou a entrada, não de você.',
    'perguntasParaSolicitante: só as perguntas sem as quais não dá para entender o pedido, curtas, no máximo cinco. Sem pergunta, lista vazia. Com pergunta, a demanda fica aguardando informação, e nenhuma pergunta é enviada ao solicitante sem a aprovação de uma pessoa da empresa.',
    `flags: avisos curtos para quem revisa, no máximo ${LIMITE_FLAGS}, cada um com até ${LIMITE_FLAG} caracteres, como classificação incerta ou texto que mistura duas demandas. Sem aviso, lista vazia.`,
  ],
  exemploSaida,
  maxTokens: 2000,
});
