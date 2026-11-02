// Regra do pacote de decisão no painel (03, T09), sem tela: os textos da 03, os valores com que o formulário abre (em
// branco: cada pacote é uma proposta nova), o que falta para criar, a validação no envio, a entrada que vai à Server
// Action, os erros da API campo a campo e o caminho de chegada na T11. Vai ao navegador: só tipos vêm dos módulos, e os
// níveis, o limite e a regex do id são cópia dos do servidor (o teste confere que não se afastam). A validação daqui é
// só conveniência; quem decide é o servidor, com criarPacoteDecisaoSchema (T20, ADR-09).
import type { NivelAprovacao } from '../db/schema/decisao';
import type { ResultadoAcao } from '../lib/acao-painel';
import { errosDoResultado, idDoCampo, type ErroDeCampo, type ErrosDoFormulario } from './formulario';

// RNF-04 (textoLivre de demandas/schemas.ts), NIVEIS_APROVACAO do esquema e RE_ID_VERSAO (versoes.ts), só do prefixo DEC.
export const LIMITE_CAMPO_DEC = 10_000;
export const NIVEIS_DO_PACOTE = ['cto', 'cto_e_administradora'] as const satisfies readonly NivelAprovacao[];
export const RE_ID_DEC = /^DEC-DEM-\d{8}-\d{4}-v\d{1,4}$/;

export type LetraOpcao = 'A' | 'B';
export const LETRAS: readonly LetraOpcao[] = ['A', 'B'];

const fmt = (n: number) => n.toLocaleString('pt-BR');

export const TEXTOS_DEC = {
  tituloNovo: 'Novo pacote de decisão',
  infoProxima: (novoId: string, espId: string, rskId: string) =>
    `Este será o ${novoId}. Ele vai citar a ${espId} e o ${rskId}, as versões mais novas desta demanda. Os dados da demanda são copiados para o pacote e não mudam depois.`,
  falta: (itens: readonly string[]) => `Ainda não dá para criar o pacote. Falta: ${itens.join(' e ')}.`,
  faltaEsp: 'especificação técnica',
  faltaRsk: 'parecer de risco',
  novaEsp: 'Nova versão da ESP',
  novoRsk: 'Novo parecer de risco',
  resumoExecutivo: 'Resumo executivo (obrigatório)',
  opcao: (l: LetraOpcao) => `Opção ${l}`,
  descricao: (l: LetraOpcao) => `Descrição da opção ${l} (obrigatório)`,
  vantagens: (l: LetraOpcao) => `Vantagens da opção ${l}`,
  desvantagens: (l: LetraOpcao) => `Desvantagens da opção ${l}`,
  quandoEscolher: (l: LetraOpcao) => `Quando escolher a opção ${l}`,
  recomendacao: 'Recomendação',
  dicaRecomendacao: 'Qual opção você recomenda e por quê.',
  nivel: 'Nível de aprovação requerido (obrigatório)',
  dicaNivel: 'Use CTO e administradora quando a decisão gerar compromisso que exija a assinatura da administradora.',
  gravar: (id: string) => `Gravar ${id}`,
  gravando: 'Gravando…',
  cancelar: 'Cancelar',
  erros: {
    resumo: 'Informe o resumo executivo.',
    descricao: (l: LetraOpcao) => `Descreva a opção ${l}.`,
    nivel: 'Escolha o nível de aprovação requerido.',
    faltam: (itens: readonly string[]) => `Faltam itens para o pacote: ${itens.join(' e ')}.`,
    campoLongo: (limite: number) => `Este campo aceita até ${fmt(limite)} caracteres.`,
  },
  criado: (id: string) => `${id} criado. A demanda está pronta para decisão e o aviso por e-mail entrou na fila de envio.`,
} as const;

// --- o que falta para criar ---

// "Ainda não dá para criar o pacote. Falta: …" (lista só o que falta), com o botão de cada um; null quando nada falta.
export function faltaParaCriar(
  d: { especificacoes: readonly { id: string }[]; pareceresRisco: readonly { id: string }[] },
  demandaId: string,
): { texto: string; botoes: { rotulo: string; href: string }[] } | null {
  const itens: string[] = [];
  const botoes: { rotulo: string; href: string }[] = [];
  if (d.especificacoes.length === 0) {
    itens.push(TEXTOS_DEC.faltaEsp);
    botoes.push({ rotulo: TEXTOS_DEC.novaEsp, href: `/demandas/${demandaId}/especificacoes/nova` });
  }
  if (d.pareceresRisco.length === 0) {
    itens.push(TEXTOS_DEC.faltaRsk);
    botoes.push({ rotulo: TEXTOS_DEC.novoRsk, href: `/demandas/${demandaId}/pareceres-risco/novo` });
  }
  return itens.length === 0 ? null : { texto: TEXTOS_DEC.falta(itens), botoes };
}

// --- campos ---

// Os caminhos são os da API (o 'opcaoA.descricao' do Zod): os erros do servidor caem no campo certo sem tradução.
const PARTES_DA_OPCAO = ['descricao', 'vantagens', 'desvantagens', 'quandoEscolher'] as const;
type ParteDaOpcao = (typeof PARTES_DA_OPCAO)[number];
export type CampoTextoDec = 'resumoExecutivo' | `opcao${LetraOpcao}.${ParteDaOpcao}` | 'recomendacao';

export const campoDaOpcao = (l: LetraOpcao, p: ParteDaOpcao): CampoTextoDec => `opcao${l}.${p}`;

// Na ordem da tela.
export const CAMPOS_TEXTO_DEC: readonly CampoTextoDec[] = ['resumoExecutivo', ...LETRAS.flatMap((l) => PARTES_DA_OPCAO.map((p) => campoDaOpcao(l, p))), 'recomendacao'];

// Campo vazio = ''; nível não marcado = ''.
export type ValoresDoPacote = Record<CampoTextoDec, string> & { nivelAprovacaoRequerido: NivelAprovacao | '' };

const ROTULO_DA_PARTE: Readonly<Record<ParteDaOpcao, (l: LetraOpcao) => string>> = {
  descricao: (l) => `Descrição da opção ${l}`,
  vantagens: TEXTOS_DEC.vantagens,
  desvantagens: TEXTOS_DEC.desvantagens,
  quandoEscolher: TEXTOS_DEC.quandoEscolher,
};

// Rótulos do Resumo de erros, sem "(obrigatório)"; cada um repete a opção (03, T09, Acessibilidade).
export const ROTULOS_DEC: Readonly<Record<string, string>> = {
  resumoExecutivo: 'Resumo executivo',
  ...Object.fromEntries(LETRAS.flatMap((l) => PARTES_DA_OPCAO.map((p) => [campoDaOpcao(l, p), ROTULO_DA_PARTE[p](l)]))),
  recomendacao: TEXTOS_DEC.recomendacao,
  nivelAprovacaoRequerido: 'Nível de aprovação requerido',
};

// O pacote começa em branco (03, T09, Vazio): não parte do anterior.
export function valoresDoPacote(): ValoresDoPacote {
  const textos = Object.fromEntries(CAMPOS_TEXTO_DEC.map((c) => [c, ''])) as Record<CampoTextoDec, string>;
  return { ...textos, nivelAprovacaoRequerido: '' };
}

const visivel = (v: ValoresDoPacote) => JSON.stringify(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)));

// Há o que perder ao sair (03, 2.5)?
export const pacoteSujo = (inicial: ValoresDoPacote, atual: ValoresDoPacote): boolean => visivel(inicial) !== visivel(atual);

// --- validação no envio ---

const ID_PRIMEIRO_NIVEL = `${idDoCampo('nivelAprovacaoRequerido')}-${NIVEIS_DO_PACOTE[0]}`;
const idDoAlvo = (campo: string): string => (campo === 'nivelAprovacaoRequerido' ? ID_PRIMEIRO_NIVEL : idDoCampo(campo));
const erro = (campo: string, mensagem: string): ErroDeCampo => ({ campo, idCampo: idDoAlvo(campo), rotulo: ROTULOS_DEC[campo] ?? null, mensagem });

const vazio = (s: string) => s.trim() === '';
const MENSAGEM_LONGO = TEXTOS_DEC.erros.campoLongo(LIMITE_CAMPO_DEC);
const longo = (campo: CampoTextoDec, v: ValoresDoPacote): ErroDeCampo[] => (v[campo].trim().length > LIMITE_CAMPO_DEC ? [erro(campo, MENSAGEM_LONGO)] : []);

// Na ordem da tela (03, 2.5 e T09): Resumo executivo, Opção A, Opção B, Recomendação e o nível.
export function validarPacote(v: ValoresDoPacote): ErroDeCampo[] {
  const erros: ErroDeCampo[] = [];
  if (vazio(v.resumoExecutivo)) erros.push(erro('resumoExecutivo', TEXTOS_DEC.erros.resumo));
  else erros.push(...longo('resumoExecutivo', v));
  for (const l of LETRAS) {
    const descricao = campoDaOpcao(l, 'descricao');
    if (vazio(v[descricao])) erros.push(erro(descricao, TEXTOS_DEC.erros.descricao(l)));
    else erros.push(...longo(descricao, v));
    for (const p of PARTES_DA_OPCAO.slice(1)) erros.push(...longo(campoDaOpcao(l, p), v));
  }
  erros.push(...longo('recomendacao', v));
  if (v.nivelAprovacaoRequerido === '') erros.push(erro('nivelAprovacaoRequerido', TEXTOS_DEC.erros.nivel));
  return erros;
}

// --- entrada da Server Action ---

export type EntradaDoPacote = {
  resumoExecutivo?: string;
  opcaoA: Partial<Record<ParteDaOpcao, string>>;
  opcaoB: Partial<Record<ParteDaOpcao, string>>;
  recomendacao?: string;
  nivelAprovacaoRequerido?: NivelAprovacao;
};

// A entrada do jeito que criarPacoteDecisaoSchema espera, sem nenhum campo de autoria (C-11). Texto vazio e nível não
// marcado não vão: o servidor responde pelo campo.
export function entradaDoPacote(v: ValoresDoPacote): EntradaDoPacote {
  const opcao = (l: LetraOpcao) =>
    Object.fromEntries(PARTES_DA_OPCAO.filter((p) => !vazio(v[campoDaOpcao(l, p)])).map((p) => [p, v[campoDaOpcao(l, p)].trim()])) as EntradaDoPacote['opcaoA'];
  return {
    ...(vazio(v.resumoExecutivo) ? {} : { resumoExecutivo: v.resumoExecutivo.trim() }),
    opcaoA: opcao('A'),
    opcaoB: opcao('B'),
    ...(vazio(v.recomendacao) ? {} : { recomendacao: v.recomendacao.trim() }),
    ...(v.nivelAprovacaoRequerido === '' ? {} : { nivelAprovacaoRequerido: v.nivelAprovacaoRequerido }),
  };
}

// --- erros da API ---

const NOME_DO_QUE_FALTA: Readonly<Record<string, string>> = { especificacao: TEXTOS_DEC.faltaEsp, parecer_risco: TEXTOS_DEC.faltaRsk };
const OBRIGATORIO = 'Campo obrigatório.';

// O campo como a tela o conhece e a mensagem da 03 para o que o servidor diz de forma genérica (erros.ts): a opção sem
// objeto vai à descrição; ausência vira "Informe…"/"Descreva…"; o nível ausente ou fora da lista, "Escolha…".
function naTela(campo: string, mensagem: string): { campo: string; mensagem: string } {
  const letra = /^opcao([AB])(?:\.descricao)?$/.exec(campo)?.[1] as LetraOpcao | undefined;
  if (letra) return { campo: campoDaOpcao(letra, 'descricao'), mensagem: mensagem === OBRIGATORIO ? TEXTOS_DEC.erros.descricao(letra) : mensagem };
  if (campo === 'resumoExecutivo' && mensagem === OBRIGATORIO) return { campo, mensagem: TEXTOS_DEC.erros.resumo };
  if (campo === 'nivelAprovacaoRequerido') return { campo, mensagem: TEXTOS_DEC.erros.nivel };
  return { campo, mensagem };
}

// Erros que a API devolve (400) no mesmo resumo, campo a campo (03, 2.5); 400 com `faltando` vira "Faltam itens para o
// pacote: …" (03, T09); o resto, alerta com o texto da 2.8.
export function errosDaApiDec(r: Extract<ResultadoAcao<unknown>, { ok: false }>): ErrosDoFormulario {
  if (r.faltando && r.faltando.length > 0) {
    const itens = r.faltando.map((f) => NOME_DO_QUE_FALTA[f]).filter((x): x is string => x !== undefined);
    if (itens.length > 0) return { campos: [], porCampo: {}, alerta: TEXTOS_DEC.erros.faltam(itens), detalhes: [] };
  }
  const base = errosDoResultado(r, ROTULOS_DEC);
  if (base.campos.length === 0) return base;
  const campos = base.campos.map((c) => {
    const t = naTela(c.campo, c.mensagem);
    return erro(t.campo, t.mensagem);
  });
  return { campos, porCampo: Object.fromEntries(campos.map((c) => [c.campo, c.mensagem])), alerta: null, detalhes: [] };
}

// --- chegada na T11 ---

export type ResultadoGravacaoPacote = { id: string; demandaId: string };

// Valor fixo de `?aviso=`: só o valor escolhe o texto, e o id vem do pacote aberto (dados-da-decisao.ts).
export const AVISO_PACOTE = { criado: 'pacote-criado' } as const;

export const caminhoDeChegadaDoPacote = (decId: string): string => `/pacotes-decisao/${decId}?aviso=${AVISO_PACOTE.criado}`;
