// Regra da T11 Decisão do pacote no painel (03, T11; 04, C-14; P1-a, P1-b, P1-d), sem tela: os textos da 03, quem vê o
// formulário, as opções dos grupos, a validação no envio, a entrada que vai à Server Action, os erros da API campo a
// campo, o diálogo, os alertas de topo, a revisão antes de decidir, as opções e as aprovações em texto, e a chegada
// depois de criar o pacote ou de decidir. Vai ao navegador: só tipos vêm dos módulos, e as mensagens que o servidor
// também usa são cópia das de decidir.ts (o teste confere). Quem decide é o servidor (registrarDecisao, T21): a regra
// daqui só evita o erro previsível, como a opção fixada na segunda aprovação, que evita o 409 do CA-14.4.
import type { NivelAprovacao, OpcaoDecisao, PapelAprovacao, StatusDecisaoGravado } from '../db/schema/decisao';
import type { ResultadoAcao } from '../lib/acao-painel';
import { formatarDataHora } from '../lib/fuso';
import type { AtorPessoa } from '../modules/acesso/ator';
import type { Aprovador, PacoteDecisaoVista } from '../modules/pacotes-decisao/consultas';
import { AVISO_PACOTE, LETRAS, LIMITE_CAMPO_DEC, TEXTOS_DEC, type LetraOpcao } from './dados-do-pacote';
import { errosDoResultado, idDoCampo, type ErroDeCampo, type ErrosDoFormulario } from './formulario';
import type { OpcaoDoGrupo } from './GrupoOpcoes';
import { ROTULO_NIVEL, ROTULO_NIVEL_APROVACAO } from './rotulos';

// LIMITE_REFERENCIA_DOCUMENTO de pacotes-decisao/schemas.ts.
export const LIMITE_REFERENCIA = 200;
const LIMITE_DO_TRECHO = 80;

const fmt = (n: number) => n.toLocaleString('pt-BR');
const DO_PAPEL: Readonly<Record<PapelAprovacao, { artigo: string; nome: string }>> = {
  cto: { artigo: 'O', nome: 'CTO' },
  administradora: { artigo: 'A', nome: 'administradora' },
};

export const TEXTOS_DECISAO = {
  tituloAba: 'Decisão do pacote',
  titulo: (titulo: string) => `Decisão: ${titulo}`,
  demanda: 'Demanda ',
  nivelNaLinha: (rotulo: string) => ` · Nível de aprovação: ${rotulo} · Criado em `,
  por: (autor: string) => ` por ${autor}`,
  cita: 'Cita: ',
  ver: 'Ver',
  desatualizadoEsp: (id: string) =>
    `Este pacote está desatualizado. A demanda já tem ${id}, mais nova que a citada aqui. Ele não pode ser aprovado; você pode devolvê-lo ou arquivá-lo. Para aprovar, crie um pacote novo.`,
  // Variação da frase da 03 para o RSK (masculino): ver Pendências da 06-T43.
  desatualizadoRsk: (id: string) =>
    `Este pacote está desatualizado. A demanda já tem ${id}, mais novo que o citado aqui. Ele não pode ser aprovado; você pode devolvê-lo ou arquivá-lo. Para aprovar, crie um pacote novo.`,
  criarPacoteNovo: 'Criar pacote novo',
  alertaRascunho: (ids: string) => `Este pacote cita conteúdo gerado por agente de IA: ${ids}. Leia cada um antes de decidir.`,
  // Revisão de C-14 (04): a 03 não a desenha; os rótulos são os de T07, T08 e T11.
  revisao: 'Revisão antes de decidir',
  espCitada: 'Especificação técnica citada',
  sistemaAlvo: 'Sistema alvo',
  repositorioDestino: 'Repositório destino',
  criterios: 'Critérios de aceite preliminares',
  definicao: 'Definição de pronto',
  rskCitado: 'Parecer de risco citado',
  niveisRisco: 'Níveis de risco',
  nivelAprovacao: 'Nível de aprovação',
  nivelEmTexto: (rotulo: string) => `Nível de aprovação: ${rotulo}`,
  riscoEmTexto: (titulo: string, rotulo: string) => `${titulo}: ${rotulo}`,
  resumoExecutivo: 'Resumo executivo',
  opcoes: 'Opções',
  descricao: 'Descrição',
  vantagens: 'Vantagens',
  desvantagens: 'Desvantagens',
  quandoEscolher: 'Quando escolher',
  recomendacao: 'Recomendação',
  recomendacaoAgente: 'Recomendação do agente de consolidação',
  naoInformado: 'Não informado.',
  nenhumItem: 'Nenhum item.',
  aprovacoes: 'Aprovações',
  pendente: (papel: PapelAprovacao) => `${papel === 'cto' ? 'CTO' : 'Administradora'}: pendente.`,
  ctoAprovou: (nome: string, opcao: string, data: string) => `CTO: ${nome} aprovou a opção ${opcao} em ${data}.`,
  admAprovou: (nome: string, opcao: string, data: string, documento: string, dataDocumento: string) =>
    `Administradora: ${nome} aprovou a opção ${opcao} em ${data}, com o documento ${documento} assinado em ${dataDocumento}.`,
  notaAprovacoes: 'O sistema guarda a referência ao documento assinado; ela não substitui a assinatura.',
  registrar: 'Registrar decisão',
  legendaDecisao: 'Decisão (obrigatório)',
  aprovar: 'Aprovar',
  devolver: 'Devolver para nova análise',
  arquivar: 'Arquivar',
  dicaAprovarIndisponivel: 'Indisponível: pacote desatualizado.',
  dicaDevolver: 'Devolver para nova análise: a demanda volta para Em análise.',
  dicaArquivar: 'Arquivar: a demanda vai para Encerrada.',
  legendaOpcao: 'Opção escolhida (obrigatório)',
  rotuloOpcao: (l: LetraOpcao, trecho: string) => `Opção ${l} — ${trecho}`,
  // A 03 escreve a frase do CTO aprovando primeiro; a da administradora aprovando primeiro troca só o papel.
  fixada: (papel: PapelAprovacao, opcao: OpcaoDecisao) =>
    `${DO_PAPEL[papel].artigo} ${DO_PAPEL[papel].nome} aprovou a opção ${opcao}. A sua aprovação vale para a mesma opção. Para discordar, escolha devolver ou arquivar.`,
  referencia: 'Identificador do documento assinado (obrigatório)',
  dicaReferencia: 'Exemplo: número do documento no sistema de assinatura.',
  dataAssinatura: 'Data da assinatura (obrigatório)',
  comentarios: 'Comentários (opcional)',
  revisei: 'Revisei os rascunhos de agente citados neste pacote (obrigatório)',
  registrando: 'Registrando…',
  dialogoTitulo: 'Confirmar a decisão?',
  dialogoTexto: (acao: string) =>
    `Você vai registrar: ${acao} Depois de registrada, a decisão deste pacote não muda. Para decidir de outro jeito, será preciso um pacote novo.`,
  dialogoRepositorio: (r: string | null) => (r ? `Repositório destino: ${r}.` : 'Repositório destino: Não informado.'),
  dialogoNivel: (rotulo: string) => `Nível de aprovação: ${rotulo}.`,
  dialogoConfirmar: 'Confirmar e registrar',
  dialogoVoltar: 'Voltar',
  acaoAprovar: (opcao: string) => `Aprovar a opção ${opcao}.`,
  acaoDevolver: 'Devolver para nova análise.',
  acaoArquivar: 'Arquivar.',
  soCto: 'Este pacote exige só a aprovação do CTO.',
  ctoRegistrada: 'Sua aprovação está registrada. Falta a aprovação da administradora, com a referência ao documento assinado. O pacote só vale depois dela.',
  // Simétrica à do CTO, para a administradora que aprova primeiro: ver Pendências da 06-T43.
  admRegistrada: 'Sua aprovação está registrada. Falta a aprovação do CTO. O pacote só vale depois dela.',
  decidida: (rotulo: string, opcao: OpcaoDecisao | null, nome: string, data: string) =>
    `Decisão registrada: ${rotulo}${opcao ? `, opção ${opcao}` : ''}, por ${nome} em ${data}.`,
  comentariosDaDecisao: 'Comentários',
  lembrete: 'A demanda continua em Pronta para decisão até alguém mudar o status para Aprovada no detalhe da demanda.',
  irParaDemanda: 'Ir para a demanda',
  erros: {
    decisao: 'Escolha a decisão.',
    opcao: 'Escolha a opção A ou a opção B.',
    revisar: 'Marque que revisou os rascunhos de agente para registrar a decisão.',
    referencia: 'Informe o identificador do documento assinado.',
    data: 'Informe a data da assinatura.',
    campoLongo: (limite: number) => `Este campo aceita até ${fmt(limite)} caracteres.`,
  },
  sucesso: {
    aprovada: (opcao: OpcaoDecisao) => `Decisão registrada: Aprovada, opção ${opcao}.`,
    parcial: {
      cto: 'Aprovação do CTO registrada. Falta a aprovação da administradora.',
      administradora: 'Aprovação da administradora registrada. Falta a aprovação do CTO.',
    },
    completa: {
      cto: 'Aprovação do CTO registrada. O pacote está aprovado.',
      administradora: 'Aprovação da administradora registrada. O pacote está aprovado.',
    },
    devolvida: 'Pacote devolvido para nova análise. A demanda voltou para Em análise.',
    arquivada: 'Pacote arquivado. A demanda foi para Encerrada.',
  },
} as const;

// "Decisão registrada: <rótulo>…" do pacote já decidido (03, T11: "Aprovada, opção A", "ou Devolvida/Arquivada").
const ROTULO_DECIDIDA: Readonly<Record<StatusDecisaoGravado, string>> = { aprovada: 'Aprovada', devolvida: 'Devolvida', arquivada: 'Arquivada' };

const NAO_INFORMADO_NOME = 'Não informado';

// --- quem vê o formulário ---

export type OpcaoFixada = { papel: PapelAprovacao; opcao: OpcaoDecisao };
export type FormularioDaConta =
  | { tipo: 'decidido' }
  | { tipo: 'sem_formulario'; texto: string }
  | { tipo: 'formulario'; opcaoFixada: OpcaoFixada | null; pedeDocumento: boolean };

// 03, T11 (fluxo): decidido, sem formulário nenhum; nível "Só o CTO", só a conta cto (P1-b); nível "CTO e
// administradora", cada conta registra a própria aprovação (P1-a), uma vez, e a segunda fica com a opção da primeira.
export function formularioDaConta(p: Pick<PacoteDecisaoVista, 'decisao' | 'nivelAprovacaoRequerido' | 'aprovadores'>, pessoa: Pick<AtorPessoa, 'papel'>): FormularioDaConta {
  if (p.decisao) return { tipo: 'decidido' };
  if (p.nivelAprovacaoRequerido === 'cto') {
    return pessoa.papel === 'cto' ? { tipo: 'formulario', opcaoFixada: null, pedeDocumento: false } : { tipo: 'sem_formulario', texto: TEXTOS_DECISAO.soCto };
  }
  if (p.aprovadores.some((a) => a.papel === pessoa.papel)) {
    return { tipo: 'sem_formulario', texto: pessoa.papel === 'cto' ? TEXTOS_DECISAO.ctoRegistrada : TEXTOS_DECISAO.admRegistrada };
  }
  const outra = p.aprovadores.find((a) => a.papel !== pessoa.papel);
  return { tipo: 'formulario', opcaoFixada: outra ? { papel: outra.papel, opcao: outra.opcao } : null, pedeDocumento: pessoa.papel === 'administradora' };
}

export function textoDaDecisaoRegistrada(p: Pick<PacoteDecisaoVista, 'statusDecisao' | 'decisao'>): string | null {
  if (!p.decisao || p.statusDecisao === 'pendente') return null;
  return TEXTOS_DECISAO.decidida(ROTULO_DECIDIDA[p.statusDecisao], p.decisao.opcaoEscolhida, p.decisao.decididaPor ?? NAO_INFORMADO_NOME, formatarDataHora(p.decisao.decididaEm));
}

// --- grupos do formulário ---

// "Aprovar" desatualizado fica no grupo, indisponível e explicado (CA-12.4; GrupoOpcoes: aria-disabled e aria-describedby).
export function opcoesDaDecisao(aprovarIndisponivel: boolean): OpcaoDoGrupo[] {
  const t = TEXTOS_DECISAO;
  return [
    aprovarIndisponivel ? { valor: 'aprovada', rotulo: t.aprovar, desabilitada: true, dica: t.dicaAprovarIndisponivel } : { valor: 'aprovada', rotulo: t.aprovar },
    { valor: 'devolvida', rotulo: t.devolver, dica: t.dicaDevolver },
    { valor: 'arquivada', rotulo: t.arquivar, dica: t.dicaArquivar },
  ];
}

// As primeiras 80 letras da descrição; o resto vira "…".
function trecho(texto: string): string {
  const letras = [...texto];
  return letras.length > LIMITE_DO_TRECHO ? `${letras.slice(0, LIMITE_DO_TRECHO).join('')}…` : texto;
}

export function opcoesDaEscolha(p: Pick<PacoteDecisaoVista, 'opcaoA' | 'opcaoB'>): OpcaoDoGrupo[] {
  return LETRAS.map((l) => ({ valor: l, rotulo: TEXTOS_DECISAO.rotuloOpcao(l, trecho((l === 'A' ? p.opcaoA : p.opcaoB).descricao)) }));
}

// --- valores e validação no envio ---

export type ValoresDaDecisao = {
  statusDecisao: StatusDecisaoGravado | '';
  opcaoEscolhida: OpcaoDecisao | '';
  referenciaDocumento: string;
  dataDocumento: string;
  comentarios: string;
  revisouRascunhosDeAgente: boolean;
};

export type ContextoDoFormulario = { opcaoFixada: OpcaoFixada | null; pedeDocumento: boolean; exigeRevisao: boolean; aprovarIndisponivel: boolean };

export const valoresDaDecisao = (): ValoresDaDecisao => ({
  statusDecisao: '',
  opcaoEscolhida: '',
  referenciaDocumento: '',
  dataDocumento: '',
  comentarios: '',
  revisouRascunhosDeAgente: false,
});

export const decisaoSuja = (v: ValoresDaDecisao): boolean => JSON.stringify(v) !== JSON.stringify(valoresDaDecisao());

// Rótulos do Resumo de erros, sem "(obrigatório)" nem "(opcional)".
export const ROTULOS_DECISAO: Readonly<Record<string, string>> = {
  statusDecisao: 'Decisão',
  opcaoEscolhida: 'Opção escolhida',
  referenciaDocumento: 'Identificador do documento assinado',
  dataDocumento: 'Data da assinatura',
  comentarios: 'Comentários',
  revisouRascunhosDeAgente: 'Revisei os rascunhos de agente citados neste pacote',
};

// O elemento que o link do resumo foca: no grupo de decisão, a primeira opção disponível; no de opção, a primeira.
function idDoAlvo(campo: string, ctx: ContextoDoFormulario): string {
  if (campo === 'statusDecisao') return `${idDoCampo('statusDecisao')}-${ctx.aprovarIndisponivel ? 'devolvida' : 'aprovada'}`;
  if (campo === 'opcaoEscolhida') return `${idDoCampo('opcaoEscolhida')}-${LETRAS[0]}`;
  return idDoCampo(campo);
}

const erro = (campo: string, mensagem: string, ctx: ContextoDoFormulario): ErroDeCampo => ({
  campo,
  idCampo: idDoAlvo(campo, ctx),
  rotulo: ROTULOS_DECISAO[campo] ?? null,
  mensagem,
});

const vazio = (s: string) => s.trim() === '';

// Na ordem da tela (03, T11): decisão, opção, documento e data, comentários e a confirmação de revisão.
export function validarDecisao(v: ValoresDaDecisao, ctx: ContextoDoFormulario): ErroDeCampo[] {
  const t = TEXTOS_DECISAO.erros;
  const erros: ErroDeCampo[] = [];
  if (v.statusDecisao === '') erros.push(erro('statusDecisao', t.decisao, ctx));
  const aprovando = v.statusDecisao === 'aprovada';
  if (aprovando && !ctx.opcaoFixada && v.opcaoEscolhida === '') erros.push(erro('opcaoEscolhida', t.opcao, ctx));
  if (aprovando && ctx.pedeDocumento) {
    if (vazio(v.referenciaDocumento)) erros.push(erro('referenciaDocumento', t.referencia, ctx));
    else if (v.referenciaDocumento.trim().length > LIMITE_REFERENCIA) erros.push(erro('referenciaDocumento', t.campoLongo(LIMITE_REFERENCIA), ctx));
    if (vazio(v.dataDocumento)) erros.push(erro('dataDocumento', t.data, ctx));
  }
  if (v.comentarios.trim().length > LIMITE_CAMPO_DEC) erros.push(erro('comentarios', t.campoLongo(LIMITE_CAMPO_DEC), ctx));
  if (ctx.exigeRevisao && !v.revisouRascunhosDeAgente) erros.push(erro('revisouRascunhosDeAgente', t.revisar, ctx));
  return erros;
}

// --- entrada da Server Action ---

export type EntradaDaDecisao = {
  statusDecisao?: StatusDecisaoGravado;
  opcaoEscolhida?: OpcaoDecisao;
  referenciaDocumento?: string;
  dataDocumento?: string;
  comentarios?: string;
  revisouRascunhosDeAgente: boolean;
};

// A entrada do jeito que registrarDecisaoSchema espera. Nenhum campo de autoria nem `registrarComo` (C-11, P1-a): o
// papel da aprovação é o da conta. Na segunda aprovação, a opção é a fixada; o documento só vai na conta da
// administradora, e opção e documento só na aprovação.
export function entradaDaDecisao(v: ValoresDaDecisao, ctx: ContextoDoFormulario): EntradaDaDecisao {
  const comuns = { ...(vazio(v.comentarios) ? {} : { comentarios: v.comentarios.trim() }), revisouRascunhosDeAgente: v.revisouRascunhosDeAgente };
  if (v.statusDecisao === '') return comuns;
  if (v.statusDecisao !== 'aprovada') return { statusDecisao: v.statusDecisao, ...comuns };
  const opcao = ctx.opcaoFixada?.opcao ?? (v.opcaoEscolhida === '' ? undefined : v.opcaoEscolhida);
  const documento = ctx.pedeDocumento
    ? {
        ...(vazio(v.referenciaDocumento) ? {} : { referenciaDocumento: v.referenciaDocumento.trim() }),
        ...(vazio(v.dataDocumento) ? {} : { dataDocumento: v.dataDocumento.trim() }),
      }
    : {};
  return { statusDecisao: 'aprovada', ...(opcao ? { opcaoEscolhida: opcao } : {}), ...documento, ...comuns };
}

// --- erros da API ---

const OBRIGATORIO = 'Campo obrigatório.';
const INVALIDO = 'Valor inválido.';

// O campo sem o caminho da Server Action ("decisao.") e a mensagem da 03 para o que o servidor diz de forma genérica.
function naTela(campoDaApi: string, mensagem: string): { campo: string; mensagem: string } {
  const campo = campoDaApi.replace(/^decisao(?:\.|$)/, '') || 'statusDecisao';
  const t = TEXTOS_DECISAO.erros;
  switch (campo) {
    case 'statusDecisao':
      return { campo, mensagem: t.decisao };
    case 'opcaoEscolhida':
      return { campo, mensagem: t.opcao };
    case 'referenciaDocumento':
      return { campo, mensagem: mensagem === OBRIGATORIO ? t.referencia : mensagem };
    case 'dataDocumento':
      return { campo, mensagem: mensagem === OBRIGATORIO || mensagem === INVALIDO ? t.data : mensagem };
    case 'revisouRascunhosDeAgente':
      return { campo, mensagem: t.revisar };
    default:
      return { campo, mensagem };
  }
}

// Erros que a API devolve (400) no mesmo resumo, campo a campo; 409 e 403 viram o alerta da 2.8 ("Não foi possível
// concluir: " e o motivo do servidor).
export function errosDaApiDecisao(r: Extract<ResultadoAcao<unknown>, { ok: false }>, ctx: ContextoDoFormulario): ErrosDoFormulario {
  const base = errosDoResultado(r, ROTULOS_DECISAO);
  if (base.campos.length === 0) return base;
  const vistos = new Set<string>();
  const campos = base.campos.flatMap((c) => {
    const x = naTela(c.campo, c.mensagem);
    if (vistos.has(x.campo)) return [];
    vistos.add(x.campo);
    return [erro(x.campo, x.mensagem, ctx)];
  });
  return { campos, porCampo: Object.fromEntries(campos.map((c) => [c.campo, c.mensagem])), alerta: null, detalhes: [] };
}

// --- diálogo ---

// O resumo da decisão antes de confirmar (WCAG 3.3.4) e, por C-14, o repositório destino e o nível de novo.
export function textoDoDialogo(
  v: ValoresDaDecisao,
  ctx: Pick<ContextoDoFormulario, 'opcaoFixada'>,
  p: { especificacaoCitada: Pick<PacoteDecisaoVista['especificacaoCitada'], 'repositorioDestino'>; nivelAprovacaoRequerido: NivelAprovacao },
): string[] {
  const t = TEXTOS_DECISAO;
  const acao =
    v.statusDecisao === 'aprovada' ? t.acaoAprovar(ctx.opcaoFixada?.opcao ?? v.opcaoEscolhida) : v.statusDecisao === 'devolvida' ? t.acaoDevolver : t.acaoArquivar;
  return [t.dialogoTexto(acao), t.dialogoRepositorio(p.especificacaoCitada.repositorioDestino), t.dialogoNivel(ROTULO_NIVEL_APROVACAO[p.nivelAprovacaoRequerido])];
}

// --- topo ---

// "A", "A e B", "A, B e C".
export function rascunhosEmTexto(ids: readonly string[]): string {
  if (ids.length <= 1) return ids.join('');
  return `${ids.slice(0, -1).join(', ')} e ${ids[ids.length - 1]}`;
}

type VersoesDaDemanda = { id: string; especificacoes: readonly { id: string }[]; pareceresRisco: readonly { id: string }[] };

// Alerta de erro do pacote desatualizado (03, T11): cita a versão mais nova da demanda, a ESP se for ela, senão o RSK.
export function alertaDeDesatualizado(
  p: Pick<PacoteDecisaoVista, 'desatualizado' | 'especificacaoId' | 'parecerRiscoId'>,
  d: VersoesDaDemanda,
): { texto: string; link: { rotulo: string; href: string } } | null {
  if (!p.desatualizado) return null;
  const esp = d.especificacoes[0]?.id;
  const rsk = d.pareceresRisco[0]?.id;
  const texto =
    esp && esp !== p.especificacaoId
      ? TEXTOS_DECISAO.desatualizadoEsp(esp)
      : rsk && rsk !== p.parecerRiscoId
        ? TEXTOS_DECISAO.desatualizadoRsk(rsk)
        : TEXTOS_DECISAO.desatualizadoEsp(esp ?? p.especificacaoId);
  return { texto, link: { rotulo: TEXTOS_DECISAO.criarPacoteNovo, href: `/demandas/${d.id}/pacotes-decisao/novo` } };
}

// --- revisão antes de decidir (C-14) ---

export type ItemDaRevisao = { termo: string; valor: string | string[]; rascunho?: boolean };

const textoOuNao = (v: string | null | undefined): string => (v && v.trim() !== '' ? v : TEXTOS_DECISAO.naoInformado);
const listaOuNenhum = (v: readonly string[] | null): string | string[] => (v && v.length > 0 ? [...v] : TEXTOS_DECISAO.nenhumItem);

const RISCOS = [
  ['tecnico', 'Risco técnico'],
  ['operacional', 'Risco operacional'],
  ['juridico', 'Risco jurídico'],
] as const;

// Da ESP e do RSK citados (e não dos mais novos): o que vai para o Pedido de Construção, os três níveis em texto e o
// nível de aprovação, com o rascunho de agente marcado em cada artefato.
export function itensDaRevisao(
  p: Pick<PacoteDecisaoVista, 'especificacaoId' | 'parecerRiscoId' | 'rascunhosCitados' | 'especificacaoCitada' | 'niveisRisco' | 'nivelAprovacaoRequerido'>,
): ItemDaRevisao[] {
  const t = TEXTOS_DECISAO;
  const e = p.especificacaoCitada;
  return [
    { termo: t.espCitada, valor: p.especificacaoId, rascunho: p.rascunhosCitados.includes(p.especificacaoId) },
    { termo: t.sistemaAlvo, valor: textoOuNao(e.sistemaAlvo) },
    { termo: t.repositorioDestino, valor: textoOuNao(e.repositorioDestino) },
    { termo: t.criterios, valor: listaOuNenhum(e.criteriosAceitePreliminares) },
    { termo: t.definicao, valor: listaOuNenhum(e.definicaoDePronto) },
    { termo: t.rskCitado, valor: p.parecerRiscoId, rascunho: p.rascunhosCitados.includes(p.parecerRiscoId) },
    { termo: t.niveisRisco, valor: RISCOS.map(([chave, titulo]) => t.riscoEmTexto(titulo, ROTULO_NIVEL[p.niveisRisco[chave]])) },
    { termo: t.nivelAprovacao, valor: t.nivelEmTexto(ROTULO_NIVEL_APROVACAO[p.nivelAprovacaoRequerido]) },
  ];
}

// --- opções e aprovações ---

export type SecaoDaOpcao = { titulo: string; itens: { termo: string; valor: string }[] };

export function secoesDasOpcoes(p: Pick<PacoteDecisaoVista, 'opcaoA' | 'opcaoB'>): SecaoDaOpcao[] {
  const t = TEXTOS_DECISAO;
  return LETRAS.map((l) => {
    const o = l === 'A' ? p.opcaoA : p.opcaoB;
    return {
      titulo: TEXTOS_DEC.opcao(l),
      itens: [
        { termo: t.descricao, valor: textoOuNao(o.descricao) },
        { termo: t.vantagens, valor: textoOuNao(o.vantagens) },
        { termo: t.desvantagens, valor: textoOuNao(o.desvantagens) },
        { termo: t.quandoEscolher, valor: textoOuNao(o.quandoEscolher) },
      ],
    };
  });
}

// 'AAAA-MM-DD' → 'DD/MM/AAAA', sem fuso (é data civil, a da assinatura).
function dataCivil(v: string | null): string {
  const m = v ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(v) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : NAO_INFORMADO_NOME;
}

function linhaDe(papel: PapelAprovacao, a: Aprovador | undefined): string {
  const t = TEXTOS_DECISAO;
  if (!a) return t.pendente(papel);
  const data = formatarDataHora(a.registradaEm);
  if (papel === 'cto') return t.ctoAprovou(a.nome, a.opcao, data);
  return t.admAprovou(a.nome, a.opcao, data, a.referenciaDocumento ?? NAO_INFORMADO_NOME, dataCivil(a.dataDocumento));
}

// Seção "Aprovações" (03, T11), só para o nível CTO e administradora.
export function linhasDeAprovacao(p: Pick<PacoteDecisaoVista, 'nivelAprovacaoRequerido' | 'aprovadores'>): string[] | null {
  if (p.nivelAprovacaoRequerido !== 'cto_e_administradora') return null;
  return (['cto', 'administradora'] as const).map((papel) => linhaDe(papel, p.aprovadores.find((a) => a.papel === papel)));
}

// --- chegada ---

export const AVISO_DECISAO = { pacoteCriado: AVISO_PACOTE.criado, decisaoRegistrada: 'decisao-registrada' } as const;

export const caminhoDepoisDeDecidir = (decId: string): string => `/pacotes-decisao/${decId}?aviso=${AVISO_DECISAO.decisaoRegistrada}`;

type Parametros = Readonly<Record<string, string | string[] | undefined>>;

// Quem registrou a segunda aprovação, a que fechou a decisão: a conta que registrou a decisão é a mesma (decidir.ts),
// então vale o nome dela quando só uma aprovação o tem; senão, a mais nova (a vista vem em ordem de registro).
function segundaAprovacao(aprovadores: readonly Aprovador[], decididaPor: string | null): Aprovador | undefined {
  const doNome = aprovadores.filter((a) => a.nome === decididaPor);
  return doNome.length === 1 ? doNome[0] : aprovadores[aprovadores.length - 1];
}

// O alerta de resultado (03, T09 e T11, Sucesso). Só os valores fixos de `?aviso=` escolhem o texto, e o texto sai do
// estado do pacote, nunca da URL: depois de decidir, o que o pacote tem gravado.
export function chegadaNaDecisao(params: Parametros, p: Pick<PacoteDecisaoVista, 'id' | 'statusDecisao' | 'decisao' | 'aprovadores' | 'nivelAprovacaoRequerido'>): string | null {
  const s = TEXTOS_DECISAO.sucesso;
  if (params.aviso === AVISO_DECISAO.pacoteCriado) return !p.decisao && p.aprovadores.length === 0 ? TEXTOS_DEC.criado(p.id) : null;
  if (params.aviso !== AVISO_DECISAO.decisaoRegistrada) return null;
  if (p.decisao) {
    if (p.statusDecisao === 'devolvida') return s.devolvida;
    if (p.statusDecisao === 'arquivada') return s.arquivada;
    if (p.statusDecisao !== 'aprovada') return null;
    if (p.nivelAprovacaoRequerido === 'cto') return p.decisao.opcaoEscolhida ? s.aprovada(p.decisao.opcaoEscolhida) : null;
    const quemFechou = segundaAprovacao(p.aprovadores, p.decisao.decididaPor);
    return quemFechou ? s.completa[quemFechou.papel] : null;
  }
  const [unica, ...outras] = p.aprovadores;
  return unica && outras.length === 0 ? s.parcial[unica.papel] : null;
}
