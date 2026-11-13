// Rótulos de enumeração e de selo do painel (03, seções 2.2 e 2.6) e os textos do histórico (03, T05): a única fonte do
// texto que cada valor gravado mostra na tela (G3.11). Só tipos são importados dos módulos: este arquivo também vai ao
// navegador, nos componentes de cliente.
import type { FaseAndamento, StatusConstrucao } from '../db/schema/andamento';
import type { NivelAprovacao } from '../db/schema/decisao';
import type { Anexo, LinhaServico, Origem, PapelSolicitante, StatusDemanda, TipoDemanda, Urgencia } from '../db/schema/demandas';
import type { NivelRisco } from '../db/schema/versoes';
import type { Agente, Integracao, Papel } from '../modules/acesso/ator';
import type { StatusDecisao } from '../modules/demandas/consultas';
import type { OrigemDaDemanda } from '../modules/demandas/schemas';
import type { EventoVisivel } from '../modules/historico/consultas';
import { RE_ID_DEC } from './dados-do-pacote';

// Cores dos selos (0.2.0: 03, 2.5 do pedido 0015, D-03): nomes de token; o par texto/fundo de cada uma está no Selo.tsx.
export type CorSelo = 'azul' | 'violeta' | 'ambar' | 'petroleo' | 'verde' | 'marinho' | 'verde-cheio' | 'laranja' | 'cinza' | 'vermelho';

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
  nova: 'azul',
  em_analise: 'violeta',
  aguardando_informacao: 'ambar',
  pronta_para_decisao: 'petroleo',
  aprovada: 'verde',
  em_construcao: 'marinho',
  entregue: 'verde-cheio',
  devolvida: 'laranja',
  encerrada: 'cinza',
};

export const ROTULO_DECISAO: Readonly<Record<StatusDecisao, string>> = {
  pendente: 'Decisão pendente',
  aprovada: 'Aprovada',
  devolvida: 'Devolvida para nova análise',
  arquivada: 'Arquivada',
};

export const COR_DECISAO: Readonly<Record<StatusDecisao, CorSelo>> = {
  pendente: 'petroleo',
  aprovada: 'verde',
  devolvida: 'laranja',
  arquivada: 'cinza',
};

export const ROTULO_NIVEL: Readonly<Record<NivelRisco, string>> = { baixo: 'Baixo', medio: 'Médio', alto: 'Alto' };
export const COR_NIVEL: Readonly<Record<NivelRisco, CorSelo>> = { baixo: 'verde', medio: 'ambar', alto: 'vermelho' };

export type SeloFixo = { texto: string; cor: CorSelo; tracejado: boolean };
export const SELO_RASCUNHO: SeloFixo = { texto: 'Rascunho de agente', cor: 'violeta', tracejado: true };
export const SELO_DESATUALIZADO: SeloFixo = { texto: 'Desatualizado', cor: 'vermelho', tracejado: false };
// 0.1.13: o DEC aprovado que um aprovado mais novo da demanda substituiu. Texto da triagem, para revisão da ux-ui-design.
export const SELO_SUBSTITUIDO: SeloFixo = { texto: 'Substituído', cor: 'cinza', tracejado: false };
// 0.3.0 (03, seções 2 e 9; 5.1 item 2): no cabeçalho da T05, só com a demanda do Awave aguardando confirmação
// (estadoDaConfirmacao). Âmbar (`atencao` / `atencao-fundo`), a cor de selo que já existe; a fila não o mostra.
export const SELO_AGUARDANDO_CONFIRMACAO: SeloFixo = { texto: 'Aguardando confirmação', cor: 'ambar', tracejado: false };

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

// 0.3.0 (03, seções 2 e 9; RF-10): a origem da demanda, lida da autoria, na fila (filtro, linha e cartão) e nos Dados da
// T05. A ordem é a das opções do filtro "Origem".
export const ROTULO_ORIGEM: Readonly<Record<OrigemDaDemanda, string>> = { pessoa: 'Pessoa', agente: 'Agente de IA', awave: 'Awave' };

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

// 0.3.0 (03, 5.6): o nome da integração no histórico e em "Criada por". Cópia de NOME_DA_INTEGRACAO do servidor
// (acesso/ator.ts), porque este arquivo só importa tipos dos módulos; um teste confere que são iguais (D-14).
export const NOME_INTEGRACAO: Readonly<Record<Integracao, string>> = Object.freeze({ awave: 'Awave', construir: '/construir' });

export const ROTULO_PAPEL: Readonly<Record<Papel, string>> = { cto: 'CTO', administradora: 'Administradora' };

// 0.4.0 (03, seção 8): as fases e a situação da construção. A situação não usa os rótulos de status da demanda.
export const ROTULO_FASE: Readonly<Record<FaseAndamento, string>> = Object.freeze({
  entendendo_o_pedido: 'Entendendo o pedido',
  planejando: 'Planejando',
  construindo: 'Construindo',
  testando: 'Testando',
  revisando_e_entregando: 'Revisando e entregando',
  documentando: 'Documentando',
});
export const ROTULO_SITUACAO_CONSTRUCAO: Readonly<Record<StatusConstrucao, string>> = Object.freeze({
  em_construcao: 'Em andamento',
  construido: 'Concluída',
  cancelado: 'Cancelada',
});

// AN-12: só valor da lista vira texto (Object.hasOwn, para chave herdada do protótipo não passar), e só inteiro de 0 a
// 999 vira número. Fora disso, null, e a tela usa a frase genérica ou não mostra nada. O 999 é cópia de
// MAXIMO_DE_TAREFAS (db/schema/andamento.ts), que aqui só entra por tipo; o teste confere que os dois não se afastam.
export const MAXIMO_DE_TAREFAS_NA_TELA = 999;
export const faseNaTela = (v: unknown): string | null => (typeof v === 'string' && Object.hasOwn(ROTULO_FASE, v) ? ROTULO_FASE[v as FaseAndamento] : null);
export const situacaoNaTela = (v: unknown): StatusConstrucao | null =>
  typeof v === 'string' && Object.hasOwn(ROTULO_SITUACAO_CONSTRUCAO, v) ? (v as StatusConstrucao) : null;
export const tarefaNaTela = (v: unknown): number | null => (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= MAXIMO_DE_TAREFAS_NA_TELA ? v : null);
// "9 de 17 tarefas"; total 1, "0 de 1 tarefa" (03, seção 8).
export const tarefasEmTexto = (p: number, t: number): string => `${p} de ${t} ${t === 1 ? 'tarefa' : 'tarefas'}`;

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

// O formato do prefixo do token (tokens-servico.ts): só ele aparece na tela, nunca o token, o hash ou o sha256. Cópia
// (o arquivo vai ao navegador), conferida por teste (tokens-integracao.test.ts).
export const RE_PREFIXO = /^[A-Za-z0-9_-]{8}$/;
const prefixoValido = (v: unknown): string | null => (typeof v === 'string' && RE_PREFIXO.test(v) ? v : null);
const ehIntegracaoNaTela = (v: unknown): v is Integracao => typeof v === 'string' && Object.prototype.hasOwnProperty.call(NOME_INTEGRACAO, v);

export function rotuloAtor(a: EventoVisivel['ator']): string {
  switch (a.tipo) {
    case 'agente':
      return NOME_AGENTE[a.agente];
    case 'sistema':
      return 'Sistema';
    // 03, 5.6: "<nome> (prefixo <p>)"; sem prefixo no formato, só o nome; integração fora da lista, "Integração".
    case 'integracao': {
      if (!ehIntegracaoNaTela(a.integracao)) return 'Integração';
      const prefixo = prefixoValido(a.prefixo);
      return prefixo ? `${NOME_INTEGRACAO[a.integracao]} (prefixo ${prefixo})` : NOME_INTEGRACAO[a.integracao];
    }
    case 'pessoa': {
      // Nome ou papel nulos só se a conta não existir mais (o app não apaga conta): a linha continua legível.
      const papel = a.papel ? ROTULO_PAPEL[a.papel] : null;
      if (a.nome && papel) return `${a.nome} (${papel})`;
      return a.nome ?? papel ?? NAO_INFORMADO;
    }
    default: {
      // Tipo fora da lista (montado à mão): a linha continua legível, sem dado do ator.
      const nunca: never = a;
      void nunca;
      return NAO_INFORMADO;
    }
  }
}

// --- textos do histórico ---

const ehAgente = (v: unknown): v is Agente => typeof v === 'string' && v in NOME_AGENTE;

// O DEC citado nos eventos do pedido (03, 5.6): só com o formato de id de DEC; senão, a frase genérica.
const doPacote = (id: string): string => (RE_ID_DEC.test(id) ? id : 'um pacote de decisão');

// " (prefixo <p>)" dos eventos de token, só com prefixo no formato.
const comPrefixo = (p: string | null): string => (p ? ` (prefixo ${p})` : '');

// O nome do agente no meio da frase: "O agente de risco …".
export const agenteNaFrase = (a: Agente): string => NOME_AGENTE[a].charAt(0).toLowerCase() + NOME_AGENTE[a].slice(1);

// O que cada agente gera, para a falha (03, T05: "trocando o nome e o artefato").
export const ARTEFATO_DO_AGENTE: Readonly<Record<Agente, string>> = {
  orquestrador: 'os campos da demanda',
  insumo_tecnico: 'a especificação técnica',
  risco: 'o parecer',
  consolidacao: 'o pacote de decisão',
};

// Motivo de `agente_ignorado` (T27), que a 03 não descreve. B-5 do 0006: `demanda_final` (executar.ts) vale para os
// dois status finais, entregue e encerrada. 0.3.0 (D-18): `sem_confirmacao`, o passo 3c do worker (IN-06).
const MOTIVO_IGNORADO: Readonly<Record<string, string>> = {
  desligado: 'agente desligado',
  sem_preco: 'modelo sem preço vigente',
  sem_provedor: 'provedor de IA não configurado',
  demanda_final: 'demanda já entregue ou encerrada',
  sem_confirmacao: 'demanda aberta pelo Awave ainda não confirmada',
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

// 0.4.0 (03, 5.7): o começo da frase do andamento_registrado, pela situação da construção gravada no evento.
const INICIO_DO_ANDAMENTO: Readonly<Record<StatusConstrucao, string>> = Object.freeze({
  em_construcao: 'Registrou o andamento de',
  construido: 'Registrou o fim da construção de',
  cancelado: 'Registrou o cancelamento da construção de',
});

// "<início> <DEC>: <Fase>[, p de t tarefas]"; com qualquer valor fora da lista ou número fora do formato, só a frase
// genérica (nada gravado de fora chega à tela; AN-12).
function textoDoAndamento(entidadeId: string, d: Record<string, unknown>): string {
  const dec = doPacote(entidadeId);
  const fase = faseNaTela(d.fase);
  const sc = situacaoNaTela(d.statusConstrucao);
  const p = tarefaNaTela(d.tarefasProntas);
  const t = tarefaNaTela(d.tarefasTotal);
  if (fase === null || sc === null || p === null || t === null || p > t) return `Registrou o andamento de ${dec}`;
  return `${INICIO_DO_ANDAMENTO[sc]} ${dec}: ${fase}${t > 0 ? `, ${tarefasEmTexto(p, t)}` : ''}`;
}

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
    // 0.1.13: frase fixa com os dois ids (C-30). O substituto só aparece se tiver o formato de id de DEC.
    case 'pacote_decisao_substituido': {
      const por = texto(d.substituidoPor);
      return por && RE_ID_DEC.test(por)
        ? `${e.entidadeId} foi substituído por ${por}, aprovado depois`
        : `${e.entidadeId} foi substituído por um pacote aprovado depois`;
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
    // D3 do 0013: o evento grava a confirmação de que o texto não tem dado pessoal; o evento antigo, sem ela, não a cita.
    case 'pedido_gerado':
      return d.confirmaSemDadoPessoal === true
        ? `Gerou o Pedido de Construção de ${e.entidadeId}, com a confirmação de que o texto não tem dado pessoal`
        : `Gerou o Pedido de Construção de ${e.entidadeId}`;
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
    // 0.3.0 (03, 5.6): com integração da lista, o nome dela; com prefixo no formato, o prefixo. Agente ou nada: o texto
    // de antes. Nunca o token, o hash ou o sha256.
    case 'token_criado': {
      const integracao = ehIntegracaoNaTela(d.integracao) ? d.integracao : null;
      if (!integracao) return 'Criou um token de serviço';
      return `Criou um token de serviço para o ${NOME_INTEGRACAO[integracao]}${comPrefixo(prefixoValido(d.prefixo))}`;
    }
    case 'token_revogado': {
      const integracao = ehIntegracaoNaTela(d.integracao) ? d.integracao : null;
      const prefixo = prefixoValido(d.prefixo);
      if (integracao) return `Revogou o token de serviço do ${NOME_INTEGRACAO[integracao]}${comPrefixo(prefixo)}`;
      return prefixo ? `Revogou o token de serviço de prefixo ${prefixo}` : 'Revogou um token de serviço';
    }
    case 'demanda_confirmada':
      return 'Confirmou a demanda aberta pelo Awave';
    case 'pedido_entregue':
      return `Buscou o Pedido de Construção de ${doPacote(e.entidadeId)}`;
    case 'pedido_recebido':
      return `Confirmou o recebimento do Pedido de Construção de ${doPacote(e.entidadeId)}`;
    // 0.4.0 (03, 5.7): fase, situação e tarefas, cada valor conferido; sem "Antes/Depois" (valoresDoEvento não muda).
    case 'andamento_registrado':
      return textoDoAndamento(e.entidadeId, d);
  }
}
