// T05 Detalhe da demanda (03, T05), a regra da tela sem HTML: os textos da 03, os alertas de topo, as opções de "Mudar
// status", o que falta para o pacote de decisão, as dúvidas em aberto e o antes e depois do histórico. Vai também ao
// navegador (MudarStatus.tsx): só tipos vêm dos módulos, e as transições da tabela do RF-07 chegam como parâmetro, lidas
// no servidor por transicoesManuaisDe (T15). A regra que vale é a do servidor (alterarDemanda); aqui é só a tela.
import type { OpcaoDoGrupo } from '../../../../components/GrupoOpcoes';
import {
  NOME_AGENTE,
  NOME_INTEGRACAO,
  ROTULO_LINHA,
  ROTULO_PAPEL_SOLICITANTE,
  ROTULO_STATUS,
  ROTULO_TIPO,
  ROTULO_URGENCIA,
} from '../../../../components/rotulos';
import type { Agente } from '../../../../modules/acesso/ator';
import type { DemandaVista, Responsavel } from '../../../../modules/demandas/consultas';
import type { Status } from '../../../../modules/demandas/schemas';
import type { EventoVisivel } from '../../../../modules/historico/consultas';

// Âncoras da navegação "Nesta página" (03, T05): o id fica no `h2` de cada seção, com tabindex="-1".
export const ID_SECAO = {
  dados: 'dados',
  duvidas: 'duvidas-em-aberto',
  versoes: 'versoes',
  status: 'mudar-status',
  texto: 'texto-recebido',
  historico: 'historico',
} as const;

export const TEXTOS_DETALHE = {
  titulo: 'Detalhe da demanda',
  editar: 'Editar dados',
  nestaPagina: 'Nesta página',
  secoes: {
    dados: 'Dados',
    duvidas: 'Dúvidas em aberto',
    versoes: 'Versões',
    status: 'Mudar status',
    texto: 'Texto recebido',
    historico: 'Histórico',
  },
  naoInformado: 'Não informado',
  nenhumAnexo: 'Nenhum anexo.',
  dados: {
    tipo: 'Tipo',
    linha: 'Linha de serviço provável',
    urgencia: 'Urgência',
    justificativa: 'Justificativa da urgência',
    solicitante: 'Solicitante',
    papel: 'Papel do solicitante',
    contexto: 'Contexto',
    descricao: 'Descrição do problema',
    impacto: 'Impacto percebido',
    anexos: 'Anexos',
    criadaEm: 'Criada em',
    criadaPor: 'Criada por',
  },
  duvidasDaEsp: (id: string) => `Da ${id}.`,
  duvidasDaEntrada: 'Do agente orquestrador, na entrada.',
  notaDuvidas: 'O sistema não envia estas perguntas ao solicitante. Trate-as fora do sistema e, com a resposta, grave uma ESP nova sem dúvida.',
  versoes: {
    especificacoes: 'Especificações técnicas',
    pareceres: 'Pareceres de risco',
    pacotes: 'Pacotes de decisão',
    colunas: ['Versão', 'Criada em', 'Criada por', 'Situação', 'Ação'],
    ver: 'Ver',
    abrirDecisao: 'Abrir decisão',
    novaEsp: 'Nova versão da ESP',
    novoRsk: 'Novo parecer de risco',
    novoDec: 'Novo pacote de decisão',
    nenhumaEsp: 'Nenhuma especificação técnica ainda.',
    nenhumRsk: 'Nenhum parecer de risco ainda.',
    nenhumDec: 'Nenhum pacote de decisão ainda.',
    regiaoEsp: 'Tabela de especificações técnicas',
    regiaoRsk: 'Tabela de pareceres de risco',
    regiaoDec: 'Tabela de pacotes de decisão',
  },
  statusAtual: (rotulo: string) => `Status atual: ${rotulo}`,
  novoStatus: 'Novo status',
  mudarStatus: 'Mudar status',
  mudando: 'Salvando…',
  escolhaStatus: 'Escolha o novo status.',
  statusAlterado: (rotulo: string) => `Status alterado para ${rotulo}.`,
  dicaAprovadaIndisponivel: 'Aprovada: precisa de um pacote de decisão aprovado e atualizado.',
  dicaEstudo: 'Em construção: demanda do tipo Estudo não vai para construção.',
  statusFinal: (rotulo: string) => `${rotulo} é um status final. Não há próxima mudança.`,
  dicaAprovada: 'Mudar para Em construção, Entregue ou Devolvida é manual nesta versão: faça quando o /construir avançar.',
  texto: {
    mostrar: 'Mostrar texto recebido',
    aviso: (data: string) => `Contém dado pessoal de terceiro. Não copie para fora do sistema sem necessidade. Será apagado em ${data}.`,
    recebidoEm: 'Recebido em',
    canal: 'Canal de origem',
    referencia: 'Referência da origem',
    texto: 'Texto',
    expurgado: (data: string, dias: number) =>
      `O texto recebido foi apagado em ${data}, pela regra de retenção de ${dias} dias. Os dados da demanda continuam.`,
    semTexto: 'Esta demanda foi criada sem texto colado.',
  },
  // 0.2.0 (T11 do DEC-DEM-20261110-0015-v1; 03, seção 9): trilha e cabeçalho da A2. O histórico virou lista
  // (LinhaDoTempo, com os textos dela); a legenda e as colunas da tabela saíram.
  trilha: 'Trilha',
  trilhaDemandas: 'Demandas',
  urgenciaNoCabecalho: (rotulo: string) => `Urgência: ${rotulo}`,
  aguardando: 'Esta demanda está aguardando informação.',
  vejaDuvidas: 'Veja as dúvidas em aberto.',
} as const;

// --- caminhos das telas ligadas ao detalhe (03, seção 1; G4, "Rotas do painel") ---

export const caminhos = {
  novaEsp: (id: string) => `/demandas/${id}/especificacoes/nova`,
  novoRsk: (id: string) => `/demandas/${id}/pareceres-risco/novo`,
  novoDec: (id: string) => `/demandas/${id}/pacotes-decisao/novo`,
  esp: (espId: string) => `/especificacoes/${espId}`,
  rsk: (rskId: string) => `/pareceres-risco/${rskId}`,
  dec: (decId: string) => `/pacotes-decisao/${decId}`,
};

// --- alertas de topo ---

export type AlertaDoTopo = {
  tipo: 'erro' | 'atencao' | 'informacao';
  texto: string;
  acao?: { rotulo: string; href: string };
  link?: { rotulo: string; href: string };
};

// Os agentes que trabalham numa demanda que já existe; o orquestrador trabalha antes dela (T-01).
type AgenteDaDemanda = Exclude<Agente, 'orquestrador'>;
const AGENTES_DA_DEMANDA: readonly AgenteDaDemanda[] = ['insumo_tecnico', 'risco', 'consolidacao'];
const ehAgenteDaDemanda = (v: unknown): v is AgenteDaDemanda => typeof v === 'string' && (AGENTES_DA_DEMANDA as readonly string[]).includes(v);

const agenteNaFrase = (a: Agente): string => NOME_AGENTE[a].charAt(0).toLowerCase() + NOME_AGENTE[a].slice(1);

// O artefato de cada agente (03, T05: "trocando o nome e o artefato"), o evento que o cria e o botão que o preenche à mão.
const DO_AGENTE: Readonly<
  Record<AgenteDaDemanda, { artefato: string; curto: string; criado: EventoVisivel['acao']; botao: string; href: (id: string) => string }>
> = {
  insumo_tecnico: {
    artefato: 'a especificação técnica',
    curto: 'a especificação',
    criado: 'especificacao_criada',
    botao: TEXTOS_DETALHE.versoes.novaEsp,
    href: caminhos.novaEsp,
  },
  risco: { artefato: 'o parecer de risco', curto: 'o parecer', criado: 'parecer_risco_criado', botao: TEXTOS_DETALHE.versoes.novoRsk, href: caminhos.novoRsk },
  consolidacao: {
    artefato: 'o pacote de decisão',
    curto: 'o pacote',
    criado: 'pacote_decisao_criado',
    botao: TEXTOS_DETALHE.versoes.novoDec,
    href: caminhos.novoDec,
  },
};

// A falha que ainda vale: o último evento falha_agente de um agente da demanda, sem o artefato dele criado depois e sem
// o mesmo agente rodando de novo. O histórico chega do mais novo para o mais antigo (listarHistorico).
function falhaVigente(d: Pick<DemandaVista, 'agentesEmAndamento'>, historico: readonly EventoVisivel[]): { agente: AgenteDaDemanda; tentativas: number } | null {
  const i = historico.findIndex((e) => e.acao === 'falha_agente');
  if (i < 0) return null;
  const depois = historico[i]!.depois ?? {};
  const agente = depois.agente;
  if (!ehAgenteDaDemanda(agente)) return null;
  if (historico.slice(0, i).some((e) => e.acao === DO_AGENTE[agente].criado)) return null;
  if (d.agentesEmAndamento.some((x) => x.agente === agente)) return null;
  return { agente, tentativas: typeof depois.tentativas === 'number' ? depois.tentativas : 3 };
}

// No máximo um de cada, nesta ordem (03, T05): falha de agente, aguardando informação, pacote desatualizado e agente
// trabalhando (T-03, `agentesEmAndamento`).
export function alertasDoTopo(
  d: Pick<DemandaVista, 'id' | 'status' | 'pacotesDecisao' | 'agentesEmAndamento'>,
  historico: readonly EventoVisivel[],
  temDuvidas: boolean,
): AlertaDoTopo[] {
  const alertas: AlertaDoTopo[] = [];
  const falha = falhaVigente(d, historico);
  if (falha) {
    const x = DO_AGENTE[falha.agente];
    const n = falha.tentativas;
    alertas.push({
      tipo: 'erro',
      texto: `O ${agenteNaFrase(falha.agente)} não conseguiu gerar ${x.artefato} depois de ${n} ${n === 1 ? 'tentativa' : 'tentativas'}. Preencha ${x.curto} à mão.`,
      acao: { rotulo: x.botao, href: x.href(d.id) },
    });
  }
  if (d.status === 'aguardando_informacao')
    alertas.push(
      temDuvidas
        ? { tipo: 'atencao', texto: TEXTOS_DETALHE.aguardando, link: { rotulo: TEXTOS_DETALHE.vejaDuvidas, href: `#${ID_SECAO.duvidas}` } }
        : { tipo: 'atencao', texto: TEXTOS_DETALHE.aguardando },
    );
  const maisNovo = d.pacotesDecisao[0];
  if (maisNovo?.desatualizado)
    alertas.push({
      tipo: 'atencao',
      texto: `O pacote ${maisNovo.id} está desatualizado: a demanda já tem uma versão mais nova de ESP ou de parecer de risco. Crie um pacote novo para decidir.`,
    });
  const trabalhando = d.agentesEmAndamento.find((x) => ehAgenteDaDemanda(x.agente));
  if (trabalhando && ehAgenteDaDemanda(trabalhando.agente))
    alertas.push({
      tipo: 'informacao',
      texto: `O ${agenteNaFrase(trabalhando.agente)} está preparando ${DO_AGENTE[trabalhando.agente].artefato}. Esta página não se atualiza sozinha: recarregue em alguns minutos.`,
    });
  return alertas;
}

// --- mudar status ---

const temPacoteAprovadoAtualizado = (d: Pick<DemandaVista, 'pacotesDecisao'>): boolean =>
  d.pacotesDecisao.some((p) => p.statusDecisao === 'aprovada' && !p.desatualizado);

// As transições da tabela do RF-07 (transicoesManuaisDe, T15). A opção que a regra impede fica no grupo, indisponível e
// com o motivo da 03 (GrupoOpcoes: aria-disabled e aria-describedby).
export function opcoesDeStatus(d: Pick<DemandaVista, 'tipo' | 'pacotesDecisao'>, transicoes: readonly Status[]): OpcaoDoGrupo[] {
  return transicoes.map((s): OpcaoDoGrupo => {
    const rotulo = ROTULO_STATUS[s];
    if (s === 'aprovada' && !temPacoteAprovadoAtualizado(d)) return { valor: s, rotulo, desabilitada: true, dica: TEXTOS_DETALHE.dicaAprovadaIndisponivel };
    if (s === 'em_construcao' && d.tipo === 'estudo') return { valor: s, rotulo, desabilitada: true, dica: TEXTOS_DETALHE.dicaEstudo };
    return { valor: s, rotulo };
  });
}

// Status sem nenhuma transição manual (entregue, encerrada): "<Status> é um status final. Não há próxima mudança.".
export function textoFinalDeStatus(status: Status, transicoes: readonly Status[]): string | null {
  return transicoes.length === 0 ? TEXTOS_DETALHE.statusFinal(ROTULO_STATUS[status]) : null;
}

// --- versões e dúvidas ---

// "Para criar um pacote de decisão, … Falta: parecer de risco." (lista só o que falta); null quando nada falta.
export function faltaParaPacote(d: Pick<DemandaVista, 'especificacoes' | 'pareceresRisco'>): string | null {
  const falta = [d.especificacoes.length === 0 ? 'especificação técnica' : null, d.pareceresRisco.length === 0 ? 'parecer de risco' : null].filter(
    (x): x is string => x !== null,
  );
  if (falta.length === 0) return null;
  return `Para criar um pacote de decisão, a demanda precisa de especificação técnica e de parecer de risco. Falta: ${falta.join(' e ')}.`;
}

// As dúvidas da ESP mais nova; sem ESP, as da entrada (agente orquestrador). Uma ESP sem dúvida resolve as anteriores
// (03, seção 3: "grava ESP nova sem dúvida"). null quando não há nenhuma.
export function duvidasEmAberto(
  d: Pick<DemandaVista, 'duvidasEntrada'>,
  espMaisNova: { id: string; duvidasEmAberto: readonly string[] } | null,
): { origem: string; itens: readonly string[] } | null {
  if (espMaisNova) return espMaisNova.duvidasEmAberto.length > 0 ? { origem: TEXTOS_DETALHE.duvidasDaEsp(espMaisNova.id), itens: espMaisNova.duvidasEmAberto } : null;
  return d.duvidasEntrada.length > 0 ? { origem: TEXTOS_DETALHE.duvidasDaEntrada, itens: d.duvidasEntrada } : null;
}

// "Criada por": a pessoa pelo nome da conta, o agente pelo nome da 2.6, a integração pelo nome dela (0.3.0, 03, 5.1);
// conta que não existe mais, "Não informado".
export function rotuloResponsavel(r: Responsavel): string {
  switch (r.tipo) {
    case 'agente':
      return NOME_AGENTE[r.agente];
    case 'integracao':
      return NOME_INTEGRACAO[r.integracao];
    case 'pessoa':
      return r.nome ?? TEXTOS_DETALHE.naoInformado;
    default: {
      const nunca: never = r;
      void nunca;
      return TEXTOS_DETALHE.naoInformado;
    }
  }
}

// --- histórico ---

// Os campos que o histórico grava com valor (a lista de permissão de registrar.ts, C-30) e o rótulo de cada valor.
const ROTULOS_DO_VALOR: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  status: ROTULO_STATUS,
  tipo: ROTULO_TIPO,
  solicitantePapel: ROTULO_PAPEL_SOLICITANTE,
  linhaServicoProvavel: ROTULO_LINHA,
  urgencia: ROTULO_URGENCIA,
};

function rotuloDoValor(campo: string, v: unknown): string {
  const rotulos = ROTULOS_DO_VALOR[campo];
  if (!rotulos) return '';
  if (v === null) return TEXTOS_DETALHE.naoInformado;
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(rotulos, v) ? rotulos[v]! : '';
}

// "Antes" e "Depois" (03, T05): só na mudança de status e de campo de enumeração. Texto livre fica gravado só como
// "alterado" (C-30) e aparece vazio; valor fora da enumeração também, para nada gravado de fora chegar à tela.
export function valoresDoEvento(e: Pick<EventoVisivel, 'acao' | 'antes' | 'depois'>): { antes: string; depois: string } {
  if (e.acao !== 'status_alterado' && e.acao !== 'campo_alterado') return { antes: '', depois: '' };
  const campo = Object.keys(e.depois ?? e.antes ?? {})[0] ?? '';
  return { antes: rotuloDoValor(campo, e.antes?.[campo]), depois: rotuloDoValor(campo, e.depois?.[campo]) };
}
