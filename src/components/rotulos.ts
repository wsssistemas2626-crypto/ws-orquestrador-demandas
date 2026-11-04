// Rótulos de enumeração e de selo do painel (03, seções 2.2 e 2.6) e os textos do histórico (03, T05): a única fonte do
// texto que cada valor gravado mostra na tela (G3.11). Só tipos são importados dos módulos: este arquivo também vai ao
// navegador, nos componentes de cliente.
import type { NivelAprovacao } from '../db/schema/decisao';
import type { Anexo, LinhaServico, Origem, PapelSolicitante, StatusDemanda, TipoDemanda, Urgencia } from '../db/schema/demandas';
import type { NivelRisco } from '../db/schema/versoes';
import type { Agente, Papel } from '../modules/acesso/ator';
import type { StatusDecisao } from '../modules/demandas/consultas';
import type { EventoVisivel } from '../modules/historico/consultas';

// Cores dos selos (03, 2.2): texto 800 sobre fundo 100 da mesma cor (Selo.tsx).
export type CorSelo = 'slate' | 'blue' | 'amber' | 'violet' | 'green' | 'cyan' | 'emerald' | 'orange' | 'gray' | 'red';

export const ROTULO_STATUS: Readonly<Record<StatusDemanda, string>> = {
  nova: 'Nova',
  em_analise: 'Em análise',
  aguardando_informacao: 'Aguardando informação',
  pronta_para_decisao: 'Pronta para decisão',
  aprovada: 'Aprovada',
  em_construcao: 'Em construção',
  entregue: 'Entregue',
  devolvida: 'Devolvida pela construção',
  encerrada: 'Encerrada',
};

export const COR_STATUS: Readonly<Record<StatusDemanda, CorSelo>> = {
  nova: 'slate',
  em_analise: 'blue',
  aguardando_informacao: 'amber',
  pronta_para_decisao: 'violet',
  aprovada: 'green',
  em_construcao: 'cyan',
  entregue: 'emerald',
  devolvida: 'orange',
  encerrada: 'gray',
};

export const ROTULO_DECISAO: Readonly<Record<StatusDecisao, string>> = {
  pendente: 'Decisão pendente',
  aprovada: 'Aprovada',
  devolvida: 'Devolvida para nova análise',
  arquivada: 'Arquivada',
};

export const COR_DECISAO: Readonly<Record<StatusDecisao, CorSelo>> = {
  pendente: 'amber',
  aprovada: 'green',
  devolvida: 'orange',
  arquivada: 'gray',
};

export const ROTULO_NIVEL: Readonly<Record<NivelRisco, string>> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' };
export const COR_NIVEL: Readonly<Record<NivelRisco, CorSelo>> = { baixo: 'green', medio: 'amber', alto: 'red' };

export type SeloFixo = { texto: string; cor: CorSelo; tracejado: boolean };
export const SELO_RASCUNHO: SeloFixo = { texto: 'Rascunho de agente', cor: 'violet', tracejado: true };
export const SELO_DESATUALIZADO: SeloFixo = { texto: 'Desatualizado', cor: 'red', tracejado: false };

export const ROTULO_TIPO: Readonly<Record<TipoDemanda, string>> = {
  bug: 'Bug',
  melhoria: 'Melhoria',
  novo_projeto: 'Novo projeto',
  estudo: 'Estudo',
  produto_proprio: 'Produto próprio',
};

export const ROTULO_PAPEL_SOLICITANTE: Readonly<Record<PapelSolicitante, string>> = {
  operacoes: 'Operações',
  financeiro: 'Financeiro',
  produto: 'Produto',
  outro: 'Outro',
};

export const ROTULO_LINHA: Readonly<Record<LinhaServico, string>> = {
  sob_medida: 'Sistema sob medida',
  automacao_integracao: 'Automação e integração',
  ia_controle_humano: 'IA com controle humano',
  diagnostico_sustentacao: 'Diagnóstico e sustentação',
  indefinida: 'Indefinida',
};

export const ROTULO_URGENCIA: Readonly<Record<Urgencia, string>> = { baixa: 'Baixa', media: 'Média', alta: 'Alta' };

// Canal de origem e tipo de anexo (03, T04): os mesmos textos das opções de T04, para o detalhe (T05).
export const ROTULO_CANAL_ORIGEM: Readonly<Record<NonNullable<Origem['canal']>, string>> = {
  email: 'E-mail',
  mensagem: 'Mensagem',
  formulario: 'Formulário',
  outro: 'Outro',
};
export const ROTULO_TIPO_ANEXO: Readonly<Record<Anexo['tipo'], string>> = { url: 'Link', arquivo: 'Arquivo' };

export const ROTULO_NIVEL_APROVACAO: Readonly<Record<NivelAprovacao, string>> = {
  cto: 'Só o CTO',
  cto_e_administradora: 'CTO e administradora',
};

// "Agentes" da 2.6: com o artefato entre parênteses (tela de agentes e teto).
export const ROTULO_AGENTE: Readonly<Record<Agente, string>> = {
  orquestrador: 'Agente orquestrador (entrada)',
  insumo_tecnico: 'Agente de insumo técnico (ESP)',
  risco: 'Agente de risco (RSK)',
  consolidacao: 'Agente de consolidação (DEC)',
};

// "Ator no histórico" da 2.6: o nome do agente, sem o artefato.
export const NOME_AGENTE: Readonly<Record<Agente, string>> = {
  orquestrador: 'Agente orquestrador',
  insumo_tecnico: 'Agente de insumo técnico',
  risco: 'Agente de risco',
  consolidacao: 'Agente de consolidação',
};

export const ROTULO_PAPEL: Readonly<Record<Papel, string>> = { cto: 'CTO', administradora: 'Administradora' };

// Rótulos dos campos da demanda, os de 03 T04, para "Alterou "<rótulo do campo>"" no histórico.
export const ROTULO_CAMPO_DEMANDA: Readonly<Record<string, string>> = {
  titulo: 'Título',
  tipo: 'Tipo',
  solicitanteNome: 'Nome do solicitante',
  solicitantePapel: 'Papel do solicitante',
  linhaServicoProvavel: 'Linha de serviço provável',
  urgencia: 'Urgência',
  justificativaUrgencia: 'Justificativa da urgência',
  contexto: 'Contexto',
  descricaoProblema: 'Descrição do problema',
  impactoPercebido: 'Impacto percebido',
  anexos: 'Anexos',
};

const NAO_INFORMADO = 'Não informado';

// "US$ 3,20" (03, 2.6 e P1-f): duas casas, vírgula decimal e ponto no milhar.
export function formatarDinheiro(v: number): string {
  return `US$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function rotuloAtor(a: EventoVisivel['ator']): string {
  if (a.tipo === 'agente') return NOME_AGENTE[a.agente];
  if (a.tipo === 'sistema') return 'Sistema';
  // Nome ou papel nulos só se a conta não existir mais (o app não apaga conta): a linha continua legível.
  const papel = a.papel ? ROTULO_PAPEL[a.papel] : null;
  if (a.nome && papel) return `${a.nome} (${papel})`;
  return a.nome ?? papel ?? NAO_INFORMADO;
}

// --- textos do histórico ---

const ehAgente = (v: unknown): v is Agente => typeof v === 'string' && v in NOME_AGENTE;

// O nome do agente no meio da frase: "O agente de risco …".
const agenteNaFrase = (a: Agente): string => NOME_AGENTE[a].charAt(0).toLowerCase() + NOME_AGENTE[a].slice(1);

// O que cada agente gera, para a falha (03, T05: "trocando o nome e o artefato").
const ARTEFATO_DO_AGENTE: Readonly<Record<Agente, string>> = {
  orquestrador: 'os campos da demanda',
  insumo_tecnico: 'a especificação técnica',
  risco: 'o parecer',
  consolidacao: 'o pacote de decisão',
};

// Motivo de `agente_ignorado` (T27), que a 03 não descreve. B-5 do 0006: `demanda_final` (executar.ts) vale para os
// dois status finais, entregue e encerrada.
const MOTIVO_IGNORADO: Readonly<Record<string, string>> = {
  desligado: 'agente desligado',
  sem_preco: 'modelo sem preço vigente',
  sem_provedor: 'provedor de IA não configurado',
  demanda_final: 'demanda já entregue ou encerrada',
};

const ROTULO_DECISAO_NO_HISTORICO: Readonly<Record<string, string>> = {
  aprovada: 'Aprovada',
  devolvida: 'Devolvida para nova análise',
  arquivada: 'Arquivada',
};

// 'AAAA-MM-DD' → 'DD/MM/AAAA', sem fuso (é data civil, a da assinatura). Outro formato fica como veio.
function dataCivil(v: unknown): string {
  const m = typeof v === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(v) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(v ?? '');
}

const texto = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

export function textoDoEvento(e: EventoVisivel, op: { retencaoDias?: number } = {}): string {
  const d = e.depois ?? {};
  const agente = ehAgente(d.agente) ? d.agente : null;
  switch (e.acao) {
    case 'demanda_criada':
      return 'Criou a demanda';
    case 'status_alterado':
      return 'Mudou o status';
    case 'campo_alterado': {
      const campo = Object.keys(e.depois ?? e.antes ?? {})[0];
      const rotulo = campo ? ROTULO_CAMPO_DEMANDA[campo] : undefined;
      return rotulo ? `Alterou "${rotulo}"` : 'Alterou um campo';
    }
    case 'especificacao_criada':
    case 'parecer_risco_criado':
    case 'pacote_decisao_criado':
      return `Criou ${e.entidadeId}`;
    case 'decisao_registrada': {
      const status = ROTULO_DECISAO_NO_HISTORICO[String(d.statusDecisao)] ?? NAO_INFORMADO;
      const opcao = texto(d.opcaoEscolhida);
      return `Registrou a decisão: ${status}${opcao ? `, opção ${opcao}` : ''}`;
    }
    case 'aprovacao_registrada': {
      const opcao = texto(d.opcao) ?? '';
      if (d.papel === 'administradora') {
        const doc = texto(d.referenciaDocumento);
        const documento = doc ? `, documento ${doc} de ${dataCivil(d.dataDocumento)}` : '';
        return `Registrou a aprovação como administradora (opção ${opcao})${documento}`;
      }
      return `Registrou a aprovação como CTO (opção ${opcao})`;
    }
    case 'falha_agente': {
      if (!agente) return 'Um agente não conseguiu gerar o rascunho';
      const n = typeof d.tentativas === 'number' ? d.tentativas : 3;
      return `O ${agenteNaFrase(agente)} não conseguiu gerar ${ARTEFATO_DO_AGENTE[agente]} depois de ${n} ${n === 1 ? 'tentativa' : 'tentativas'}`;
    }
    case 'suspensao_por_teto':
      return `${agente ? NOME_AGENTE[agente] : 'Agente'} não rodou: agentes suspensos pelo teto de gasto`;
    case 'agente_ignorado': {
      const motivo = MOTIVO_IGNORADO[String(d.motivo)];
      return `${agente ? NOME_AGENTE[agente] : 'Agente'} não rodou${motivo ? `: ${motivo}` : ''}`;
    }
    case 'pedido_gerado':
      return `Gerou o Pedido de Construção de ${e.entidadeId}`;
    case 'texto_expurgado':
      return `Apagou o texto recebido (retenção de ${op.retencaoDias ?? 90} dias)`;
    // Os eventos abaixo não são de uma demanda (demanda_id nulo) e não aparecem no histórico dela; os textos ficam
    // para a leitura não quebrar se um dia aparecerem.
    case 'agente_ligado':
      return agente ? `Ligou o ${agenteNaFrase(agente)}` : 'Ligou um agente';
    case 'agente_desligado':
      return agente ? `Desligou o ${agenteNaFrase(agente)}` : 'Desligou um agente';
    case 'teto_alterado':
      return 'Alterou o teto de gasto';
    case 'entrada_pendente_expurgada':
      return `Apagou uma entrada aguardando o agente orquestrador (retenção de ${op.retencaoDias ?? 90} dias)`;
    case '2fa_ativado':
      return 'Ativou a verificação em duas etapas';
    case '2fa_desativado':
      return 'Desativou a verificação em duas etapas';
    case 'conta_criada':
      return 'Criou a conta';
    case 'conta_desativada':
      return 'Desativou a conta';
    case 'token_criado':
      return 'Criou um token de serviço';
    case 'token_revogado':
      return 'Revogou um token de serviço';
  }
}
