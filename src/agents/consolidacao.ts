// Prompt do agente de consolidação (RF-10, RF-16). Fonte: o Orquestrador Central da estrutura (CLAUDE.md da
// estruturaAutonoma): consolidar o que os departamentos entregaram numa resposta coerente e sinalizar o que exige decisão
// humana. Entrada: a demanda, a ESP mais nova e o RSK, minimizados (T24). Saída: `criarPacoteDecisaoSchema`, o mesmo da
// rota do DEC; a decisão (A, B, devolver ou arquivar) é só de pessoa (RF-13, C-12).
import { NIVEIS_APROVACAO } from '../db/schema/decisao';
import type { CriarPacoteDecisao } from '../modules/pacotes-decisao/schemas';
import { montarPrompt } from './comum';

const exemploSaida: CriarPacoteDecisao = {
  resumoExecutivo:
    'O cliente tem pedidos do marketplace duplicados no ERP. A ESP propõe conferir o código do pedido antes de criar no ERP e listar os duplicados. O principal risco é operacional: a duplicação segue enquanto a correção não entra.',
  opcaoA: {
    descricao: 'Construir a conferência e o relatório dos duplicados numa entrega só.',
    vantagens: 'Resolve a causa e dá ao cliente a lista do que precisa ser cancelado.',
    desvantagens: 'A conferência demora mais a entrar, porque espera o relatório.',
    quandoEscolher: 'Quando o cliente já tiver contornado a duplicação por enquanto.',
  },
  opcaoB: {
    descricao: 'Publicar primeiro só a conferência e fazer o relatório numa segunda entrega.',
    vantagens: 'Para a duplicação mais cedo.',
    desvantagens: 'Duas entregas e duas homologações.',
    quandoEscolher: 'Quando a duplicação ainda estiver afetando o faturamento.',
  },
  recomendacao: 'Opção B: o parecer de risco aponta risco operacional alto enquanto a duplicação continua.',
  nivelAprovacaoRequerido: 'cto',
};

export const PROMPT_CONSOLIDACAO = montarPrompt({
  papel: 'Consolidação, com o olhar do Orquestrador Central',
  tarefa:
    'Ler a demanda, a especificação técnica (ESP) e o parecer de risco (RSK) e montar o pacote de decisão (DEC) preliminar: um resumo executivo e duas opções, A e B, para uma pessoa decidir.',
  regras: [
    'resumoExecutivo (obrigatório): o que se pede, o que a ESP propõe e o principal risco do RSK, em um parágrafo.',
    'opcaoA e opcaoB (as duas obrigatórias): cada uma com descricao (obrigatória), vantagens, desvantagens e quandoEscolher. As duas opções precisam ser caminhos reais e diferentes, como escopo completo ou escopo reduzido, ou construir agora ou depois.',
    'Recusar as duas opções é decisão de quem decide (devolver ou arquivar); não use uma das opções para isso.',
    'recomendacao: qual opção você recomenda e por quê, em poucas frases, com base na ESP e no RSK. A recomendação não é decisão: quem decide é uma pessoa, no painel.',
    `nivelAprovacaoRequerido (obrigatório), um destes: ${NIVEIS_APROVACAO.join(', ')}. Use cto_e_administradora quando a decisão gerar compromisso contratual ou financeiro relevante, envolver dado pessoal de terceiro, o RSK tiver risco jurídico alto ou o RSK disser que o caso deve ir à administradora. Nos outros casos, cto. Na dúvida, cto_e_administradora.`,
    'Não acrescente fato que não esteja na demanda, na ESP ou no RSK.',
  ],
  exemploSaida,
  maxTokens: 4000,
});
