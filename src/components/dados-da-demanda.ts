// Regra do formulário de demanda do painel (03, T04 e T06), sem tela: os textos da 03, a validação no envio, a entrada
// que vai à Server Action, as mudanças da edição e os erros da API traduzidos campo a campo. Vai ao navegador: só tipos
// vêm dos módulos, e os limites são cópia dos do servidor (o teste confere que não se afastam). A validação daqui é só
// conveniência para a pessoa; quem decide é o servidor, com os mesmos schemas da API (ADR-09).
import type { ResultadoAcao } from '../lib/acao-painel';
import type { DemandaVista } from '../modules/demandas/consultas';
import { errosDoResultado, idDoCampo, type ErroDeCampo, type ErrosDoFormulario } from './formulario';

// RNF-04 e C-18, iguais a LIMITE_TEXTO_BRUTO, LIMITE_TEXTO, LIMITE_NOME, LIMITE_REFERENCIA_ORIGEM, LIMITE_REFERENCIA e
// LIMITE_ITENS do servidor.
export const LIMITE_TEXTO_PEDIDO = 100_000;
export const LIMITE_CAMPO = 10_000;
export const LIMITE_NOME_SOLICITANTE = 200;
export const LIMITE_REFERENCIA_DA_ORIGEM = 500;
export const LIMITE_REFERENCIA_DO_ANEXO = 2_048;
export const LIMITE_ANEXOS = 50;

const fmt = (n: number) => n.toLocaleString('pt-BR');

export const TEXTOS_DEMANDA = {
  tituloNova: 'Nova demanda',
  tituloEditar: 'Editar dados da demanda',
  desligado: 'Agente orquestrador desligado. Preencha os campos abaixo.',
  suspenso: 'Agentes suspensos pelo teto de gasto. Preencha os campos abaixo.',
  comoCriar: 'Como criar a demanda?',
  pedirAoAgente: 'Pedir ao agente orquestrador que proponha os campos',
  preencherEuMesmo: 'Preencher eu mesmo',
  avisoMinimizacao:
    'O agente recebe só o texto, sem o nome do solicitante, sem a origem e com e-mails, telefones, CPF e CNPJ trocados por marcadores. Você revisa a proposta antes de qualquer decisão.',
  dicaTexto:
    'Cole o e-mail, a mensagem ou o formulário como chegou. Este texto é dado pessoal de terceiro: fica guardado por 90 dias e depois é apagado.',
  dicaReferenciaOrigem: 'Um identificador da mensagem, sem endereço de e-mail.',
  dicaNome: 'Digite o nome. Ele não é enviado ao agente de IA.',
  dicaAnexos: 'Só a referência: o arquivo não é enviado ao sistema.',
  avisoEdicao:
    'As alterações ficam no histórico, com o valor de antes e o de depois. Os pacotes de decisão já criados guardam uma cópia dos dados e não mudam.',
  sairTitulo: 'Sair sem salvar?',
  sairTexto: 'O que você digitou nesta tela será perdido.',
  sairConfirmar: 'Sair sem salvar',
  sairCancelar: 'Continuar editando',
  erroTitulo: 'Informe o título.',
  erroNome: 'Informe o nome do solicitante.',
  erroTipo: 'Escolha o tipo.',
  erroTextoAgente: 'Cole o texto do pedido para enviar ao agente.',
  erroLimiteAnexos: 'Limite de 50 anexos atingido.',
  erroTextoLongo: (n: number) => `O texto tem ${fmt(n)} caracteres. O limite é ${fmt(LIMITE_TEXTO_PEDIDO)}.`,
  erroCampoLongo: (limite: number) => `Este campo aceita até ${fmt(limite)} caracteres.`,
  sucessoCriada: (id: string, status: string) => `Demanda ${id} criada com status ${status}.`,
  sucessoEnviada:
    'Texto enviado ao agente orquestrador. A demanda aparece na fila quando ele terminar; se ele falhar, você poderá preencher à mão.',
  sucessoAlteracoes: 'Alterações salvas. O histórico registra o antes e o depois.',
} as const;

// Valores fixos de `?aviso=` que levam o alerta de sucesso à tela de destino. Só o valor escolhe o texto; nada da URL
// vai para a tela.
export const AVISO_DEMANDA = { criada: 'demanda-criada', enviada: 'entrada-enviada', alteracoesSalvas: 'alteracoes-salvas' } as const;

// Mesma mensagem do refine de anexoSchema (schemas.ts) e do mapeador de erro (erros.ts).
const MENSAGEM_LINK = 'Use um link que comece com http:// ou https://.';
const MENSAGEM_OBRIGATORIO = 'Campo obrigatório.';

export type ModoEntrada = 'manual' | 'agente';
export type TipoAnexo = 'url' | 'arquivo';
// `chave` é só da tela (chave do React); não vai ao servidor.
export type AnexoNoFormulario = { chave: string; tipo: TipoAnexo; referencia: string; descricao: string };
// Campo vazio = '' (seleção "Não informado", grupo "Não informada"); o envio troca por ausente ou null.
export type ValoresDaDemanda = {
  solicitanteNome: string;
  solicitantePapel: string;
  titulo: string;
  tipo: string;
  linhaServicoProvavel: string;
  urgencia: string;
  justificativaUrgencia: string;
  contexto: string;
  descricaoProblema: string;
  impactoPercebido: string;
  anexos: AnexoNoFormulario[];
};
export type ValoresDoTexto = { texto: string; canal: string; referencia: string };

export const valoresVazios = (): ValoresDaDemanda => ({
  solicitanteNome: '',
  solicitantePapel: '',
  titulo: '',
  tipo: '',
  linhaServicoProvavel: '',
  urgencia: '',
  justificativaUrgencia: '',
  contexto: '',
  descricaoProblema: '',
  impactoPercebido: '',
  anexos: [],
});

export const textoVazio = (): ValoresDoTexto => ({ texto: '', canal: '', referencia: '' });

type CamposEditaveis = Pick<
  DemandaVista,
  | 'titulo'
  | 'tipo'
  | 'solicitanteNome'
  | 'solicitantePapel'
  | 'linhaServicoProvavel'
  | 'urgencia'
  | 'justificativaUrgencia'
  | 'contexto'
  | 'descricaoProblema'
  | 'impactoPercebido'
  | 'anexos'
>;

export function valoresDaDemanda(d: CamposEditaveis): ValoresDaDemanda {
  return {
    solicitanteNome: d.solicitanteNome,
    solicitantePapel: d.solicitantePapel ?? '',
    titulo: d.titulo,
    tipo: d.tipo,
    linhaServicoProvavel: d.linhaServicoProvavel ?? '',
    urgencia: d.urgencia ?? '',
    justificativaUrgencia: d.justificativaUrgencia ?? '',
    contexto: d.contexto ?? '',
    descricaoProblema: d.descricaoProblema ?? '',
    impactoPercebido: d.impactoPercebido ?? '',
    anexos: d.anexos.map((a, i) => ({ chave: `anexo-${i}`, tipo: a.tipo, referencia: a.referencia, descricao: a.descricao ?? '' })),
  };
}

// Rótulos do Resumo de erros (03, T04), sem o "(obrigatório)" do campo.
export const ROTULOS_DOS_CAMPOS: Readonly<Record<string, string>> = {
  texto: 'Texto do pedido',
  entradaPendenteId: 'Texto do pedido',
  'origem.canal': 'Canal de origem',
  'origem.referencia': 'Referência da origem',
  solicitanteNome: 'Nome do solicitante',
  solicitantePapel: 'Papel do solicitante',
  titulo: 'Título',
  tipo: 'Tipo',
  linhaServicoProvavel: 'Linha de serviço provável',
  urgencia: 'Urgência',
  justificativaUrgencia: 'Justificativa da urgência',
  contexto: 'Contexto',
  descricaoProblema: 'Descrição do problema',
  impactoPercebido: 'Impacto percebido',
  anexos: 'Anexos (referências)',
};

const ROTULO_DO_CAMPO_DO_ANEXO: Readonly<Record<string, string>> = { tipo: 'Tipo', referencia: 'Referência', descricao: 'Descrição' };

// O elemento que recebe o foco pelo link do resumo: o campo; no grupo de opções, a primeira opção; na lista de anexos,
// o botão "Adicionar anexo".
export const ID_ADICIONAR_ANEXO = 'adicionar-anexo';
const PRIMEIRA_OPCAO: Readonly<Record<string, string>> = { tipo: 'bug', urgencia: 'vazio' };

export function idDoAlvo(campo: string): string {
  if (campo in PRIMEIRA_OPCAO) return `${idDoCampo(campo)}-${PRIMEIRA_OPCAO[campo]}`;
  if (campo === 'anexos') return ID_ADICIONAR_ANEXO;
  if (campo === 'entradaPendenteId') return idDoCampo('texto');
  return idDoCampo(campo);
}

const RE_CAMPO_DO_ANEXO = /^anexos\.(\d+)\.(\w+)$/;

function rotuloDoErro(campo: string): string | null {
  const m = RE_CAMPO_DO_ANEXO.exec(campo);
  if (m) return `${ROTULO_DO_CAMPO_DO_ANEXO[m[2]!] ?? 'Campo'} do anexo ${Number(m[1]) + 1}`;
  return ROTULOS_DOS_CAMPOS[campo] ?? ROTULOS_DOS_CAMPOS[campo.split('.')[0] ?? ''] ?? null;
}

const erro = (campo: string, mensagem: string): ErroDeCampo => ({ campo, idCampo: idDoAlvo(campo), rotulo: rotuloDoErro(campo), mensagem });

const vazio = (v: string) => v.trim() === '';
const ehLink = (v: string) => URL.canParse(v) && ['http:', 'https:'].includes(new URL(v).protocol);
const anexoEmBranco = (a: AnexoNoFormulario) => vazio(a.referencia) && vazio(a.descricao);

const CAMPOS_LIVRES = ['justificativaUrgencia', 'contexto', 'descricaoProblema', 'impactoPercebido'] as const;

// Validação no envio, na ordem da tela (03, 2.5). O modo agente só pede o texto e o solicitante. Com a entrada
// pendente, o texto e a origem são os dela (o servidor ignora os do corpo) e não são conferidos aqui.
export function validarDemanda(
  v: ValoresDaDemanda,
  t: ValoresDoTexto,
  modo: ModoEntrada,
  op: { comEntradaPendente?: boolean; semTexto?: boolean } = {},
): ErroDeCampo[] {
  const erros: ErroDeCampo[] = [];
  if (!op.comEntradaPendente && !op.semTexto) {
    if (modo === 'agente' && vazio(t.texto)) erros.push(erro('texto', TEXTOS_DEMANDA.erroTextoAgente));
    else if (t.texto.length > LIMITE_TEXTO_PEDIDO) erros.push(erro('texto', TEXTOS_DEMANDA.erroTextoLongo(t.texto.length)));
    if (t.referencia.trim().length > LIMITE_REFERENCIA_DA_ORIGEM)
      erros.push(erro('origem.referencia', TEXTOS_DEMANDA.erroCampoLongo(LIMITE_REFERENCIA_DA_ORIGEM)));
  }
  if (vazio(v.solicitanteNome)) erros.push(erro('solicitanteNome', TEXTOS_DEMANDA.erroNome));
  else if (v.solicitanteNome.trim().length > LIMITE_NOME_SOLICITANTE)
    erros.push(erro('solicitanteNome', TEXTOS_DEMANDA.erroCampoLongo(LIMITE_NOME_SOLICITANTE)));
  if (modo === 'agente') return erros;

  if (vazio(v.titulo)) erros.push(erro('titulo', TEXTOS_DEMANDA.erroTitulo));
  else if (v.titulo.trim().length > LIMITE_CAMPO) erros.push(erro('titulo', TEXTOS_DEMANDA.erroCampoLongo(LIMITE_CAMPO)));
  if (v.tipo === '') erros.push(erro('tipo', TEXTOS_DEMANDA.erroTipo));
  for (const c of CAMPOS_LIVRES) if (v[c].trim().length > LIMITE_CAMPO) erros.push(erro(c, TEXTOS_DEMANDA.erroCampoLongo(LIMITE_CAMPO)));

  if (v.anexos.filter((a) => !anexoEmBranco(a)).length > LIMITE_ANEXOS) erros.push(erro('anexos', TEXTOS_DEMANDA.erroLimiteAnexos));
  v.anexos.forEach((a, i) => {
    if (anexoEmBranco(a)) return;
    const ref = a.referencia.trim();
    if (ref === '') erros.push(erro(`anexos.${i}.referencia`, MENSAGEM_OBRIGATORIO));
    else if (ref.length > LIMITE_REFERENCIA_DO_ANEXO)
      erros.push(erro(`anexos.${i}.referencia`, TEXTOS_DEMANDA.erroCampoLongo(LIMITE_REFERENCIA_DO_ANEXO)));
    else if (a.tipo === 'url' && !ehLink(ref)) erros.push(erro(`anexos.${i}.referencia`, MENSAGEM_LINK));
    if (a.descricao.trim().length > LIMITE_CAMPO) erros.push(erro(`anexos.${i}.descricao`, TEXTOS_DEMANDA.erroCampoLongo(LIMITE_CAMPO)));
  });
  return erros;
}

type AnexoEnviado = { tipo: TipoAnexo; referencia: string; descricao?: string };

// Sem chave com valor indefinido: o servidor compara os anexos em profundidade (T15), e a Server Action manteria a chave.
function anexosParaEnviar(anexos: AnexoNoFormulario[]): { anexos: AnexoEnviado[]; indices: number[] } {
  const saida: AnexoEnviado[] = [];
  const indices: number[] = [];
  anexos.forEach((a, i) => {
    if (anexoEmBranco(a)) return;
    const item: AnexoEnviado = { tipo: a.tipo, referencia: a.referencia.trim() };
    if (!vazio(a.descricao)) item.descricao = a.descricao.trim();
    saida.push(item);
    indices.push(i);
  });
  return { anexos: saida, indices };
}

function origemParaEnviar(t: ValoresDoTexto): { canal?: string; referencia?: string } | null {
  const o: { canal?: string; referencia?: string } = {};
  if (t.canal !== '') o.canal = t.canal;
  if (!vazio(t.referencia)) o.referencia = t.referencia.trim();
  return Object.keys(o).length > 0 ? o : null;
}

const SELECOES = ['solicitantePapel', 'linhaServicoProvavel', 'urgencia'] as const;

export type EntradaDoFormulario = Record<string, unknown> & { modo: ModoEntrada };

// A entrada do jeito que entradaSchema (T17) espera. Só o que foi preenchido vai; o texto vai como foi colado.
export function entradaDoFormulario(
  v: ValoresDaDemanda,
  t: ValoresDoTexto,
  modo: ModoEntrada,
  entradaPendenteId?: string,
): { entrada: EntradaDoFormulario; indicesAnexos: number[] } {
  const entrada: EntradaDoFormulario = { modo };
  if (entradaPendenteId === undefined) {
    if (!vazio(t.texto)) entrada.texto = t.texto;
    const origem = origemParaEnviar(t);
    if (origem) entrada.origem = origem;
  } else {
    entrada.entradaPendenteId = entradaPendenteId;
  }
  entrada.solicitanteNome = v.solicitanteNome.trim();
  if (v.solicitantePapel !== '') entrada.solicitantePapel = v.solicitantePapel;
  if (modo === 'agente') {
    // O modo agente não leva o texto vazio: o servidor recusa com a mensagem do campo.
    if (entrada.texto === undefined) entrada.texto = t.texto;
    return { entrada: { modo, texto: entrada.texto, solicitanteNome: entrada.solicitanteNome, ...pick(entrada, 'solicitantePapel', 'origem') }, indicesAnexos: [] };
  }
  entrada.titulo = v.titulo.trim();
  entrada.tipo = v.tipo;
  for (const c of SELECOES) if (c !== 'solicitantePapel' && v[c] !== '') entrada[c] = v[c];
  for (const c of CAMPOS_LIVRES) if (!vazio(v[c])) entrada[c] = v[c].trim();
  const { anexos, indices } = anexosParaEnviar(v.anexos);
  entrada.anexos = anexos;
  return { entrada, indicesAnexos: indices };
}

function pick(o: Record<string, unknown>, ...chaves: string[]): Record<string, unknown> {
  return Object.fromEntries(chaves.filter((c) => o[c] !== undefined).map((c) => [c, o[c]]));
}

const OBRIGATORIOS = ['titulo', 'solicitanteNome', 'tipo'] as const;

const comparavel = (anexos: AnexoNoFormulario[]) => JSON.stringify(anexosParaEnviar(anexos).anexos);

// T06: só o que mudou em relação ao que a tela abriu. Campo opcional esvaziado vai como null (limpa o campo); nada
// mudou = objeto vazio, e o servidor responde "Nada foi alterado.".
export function mudancasDaEdicao(inicial: ValoresDaDemanda, atual: ValoresDaDemanda): { mudancas: Record<string, unknown>; indicesAnexos: number[] } {
  const mudancas: Record<string, unknown> = {};
  for (const c of OBRIGATORIOS) if (atual[c].trim() !== inicial[c].trim()) mudancas[c] = atual[c].trim();
  for (const c of [...SELECOES, ...CAMPOS_LIVRES]) {
    const a = atual[c].trim();
    if (a !== inicial[c].trim()) mudancas[c] = a === '' ? null : a;
  }
  let indicesAnexos: number[] = [];
  if (comparavel(atual.anexos) !== comparavel(inicial.anexos)) {
    const { anexos, indices } = anexosParaEnviar(atual.anexos);
    mudancas.anexos = anexos;
    indicesAnexos = indices;
  }
  return { mudancas, indicesAnexos };
}

const visivel = (v: ValoresDaDemanda, t: ValoresDoTexto) => JSON.stringify({ ...v, anexos: v.anexos.map((a) => [a.tipo, a.referencia, a.descricao]), t });

// Há o que perder ao sair (03, 2.5)?
export function estaSujo(inicial: ValoresDaDemanda, textoInicial: ValoresDoTexto, atual: ValoresDaDemanda, textoAtual: ValoresDoTexto): boolean {
  return visivel(inicial, textoInicial) !== visivel(atual, textoAtual);
}

export function errosLocais(campos: ErroDeCampo[]): ErrosDoFormulario {
  return { campos, porCampo: Object.fromEntries(campos.map((c) => [c.campo, c.mensagem])), alerta: null, detalhes: [] };
}

type ContextoDoEnvio = { modo: ModoEntrada; tamanhoTexto: number; indicesAnexos: number[] };

// O campo como a tela o conhece: o índice do anexo enviado volta para a linha da tela.
function campoDaTela(campo: string, indices: number[]): string {
  const m = RE_CAMPO_DO_ANEXO.exec(campo);
  if (!m) return campo;
  const linha = indices[Number(m[1])];
  return linha === undefined ? campo : `anexos.${linha}.${m[2]}`;
}

// A mensagem da 03 para o que o servidor diz de forma genérica (mapeador de erro, erros.ts).
function mensagemDaTela(campo: string, mensagem: string, ctx: ContextoDoEnvio): string {
  if (campo === 'titulo' && mensagem === MENSAGEM_OBRIGATORIO) return TEXTOS_DEMANDA.erroTitulo;
  if (campo === 'solicitanteNome' && mensagem === MENSAGEM_OBRIGATORIO) return TEXTOS_DEMANDA.erroNome;
  if (campo === 'tipo') return TEXTOS_DEMANDA.erroTipo;
  if (campo === 'anexos') return TEXTOS_DEMANDA.erroLimiteAnexos;
  if (campo === 'texto') {
    if (ctx.tamanhoTexto > LIMITE_TEXTO_PEDIDO) return TEXTOS_DEMANDA.erroTextoLongo(ctx.tamanhoTexto);
    if (ctx.modo === 'agente' && mensagem === MENSAGEM_OBRIGATORIO) return TEXTOS_DEMANDA.erroTextoAgente;
  }
  return mensagem;
}

// Erros que a API devolve (400) no mesmo resumo, campo a campo (03, 2.5); o resto vira alerta com o texto da 2.8.
export function errosDaApi(r: Extract<ResultadoAcao<unknown>, { ok: false }>, ctx: ContextoDoEnvio): ErrosDoFormulario {
  const base = errosDoResultado(r, ROTULOS_DOS_CAMPOS);
  if (base.campos.length === 0) return base;
  return errosLocais(base.campos.map((c) => {
    const campo = campoDaTela(c.campo, ctx.indicesAnexos);
    return erro(campo, mensagemDaTela(campo, c.mensagem, ctx));
  }));
}
