// Regra do parecer de risco no painel (03, T08 e T10), sem tela: os textos da 03, os valores com que o formulário abre,
// a validação no envio, a entrada que vai à Server Action, os erros da API campo a campo, o alerta de chegada na T05 e
// as seções da leitura (T10). Vai ao navegador: só tipos vêm dos módulos, e os níveis, o limite e a regex do id são
// cópia dos do servidor (o teste confere que não se afastam). A validação daqui é só conveniência; quem decide é o
// servidor, com criarParecerRiscoSchema (T19, ADR-09).
import type { NivelRisco } from '../db/schema/versoes';
import type { ResultadoAcao } from '../lib/acao-painel';
import type { DemandaVista } from '../modules/demandas/consultas';
import type { ParecerRiscoVista } from '../modules/pareceres-risco/consultas';
import { errosDoResultado, idDoCampo, type ErroDeCampo, type ErrosDoFormulario } from './formulario';
import { idDoAlvoDaLista, idDoItem, itensDe, LIMITE_ITENS_LISTA, valoresDaLista, type ItemDaLista } from './lista-textos';
import { ROTULO_NIVEL } from './rotulos';

// RNF-04 (textoLivre de demandas/schemas.ts), NIVEIS_RISCO do esquema e RE_ID_VERSAO (versoes.ts), só do prefixo RSK.
export const LIMITE_CAMPO_RSK = 10_000;
export const NIVEIS_DO_PARECER = ['baixo', 'medio', 'alto'] as const satisfies readonly NivelRisco[];
export const RE_ID_RSK = /^RSK-DEM-\d{8}-\d{4}-v\d{1,4}$/;

const fmt = (n: number) => n.toLocaleString('pt-BR');

export const TEXTOS_RSK = {
  tituloNova: 'Novo parecer de risco',
  infoProxima: (novoId: string, espId: string) => `Este será o ${novoId}. A especificação mais nova desta demanda é a ${espId}.`,
  semEspecificacao: 'Esta demanda ainda não tem especificação técnica. Você pode gravar o parecer, mas o pacote de decisão vai exigir as duas.',
  infoRascunho: (versaoBase: number) => `Os campos vieram da v${versaoBase}, um rascunho do agente de risco. Revise antes de gravar.`,
  resumo: 'Resumo',
  comentario: 'Comentário',
  // O nome do risco entra na `legend`, para não haver três grupos chamados só "Nível" (03, T08, Acessibilidade).
  legendaNivel: (nome: string) => `Nível do ${nome} (obrigatório)`,
  recomendacoes: 'Recomendações de mitigação',
  preCondicoes: 'Pré-condições',
  dicaPreCondicoes: 'Um item por pré-condição. O que precisa estar resolvido antes de construir.',
  envolver: 'Quando envolver o jurídico ou a administradora',
  dicaEnvolver: 'Situações em que a decisão precisa passar pelo jurídico ou pela administradora.',
  gravar: (id: string) => `Gravar ${id}`,
  gravando: 'Gravando…',
  cancelar: 'Cancelar',
  erros: {
    nivel: (nome: string) => `Escolha o nível do ${nome}.`,
    campoLongo: (limite: number) => `Este campo aceita até ${fmt(limite)} caracteres.`,
    limiteItens: 'Limite de 50 itens atingido.',
  },
  sucesso: (id: string) => `${id} gravado.`,
  conflito: (versao: number) => `Outra versão foi gravada enquanto você editava. Sua versão foi gravada como v${versao}; confira as duas no detalhe.`,
  decDesatualizado: (id: string) => `O pacote ${id} ficou desatualizado. Crie um pacote novo para decidir.`,
  // T10
  tituloAba: 'Parecer de risco',
  tituloVer: (versao: number, titulo: string) => `Parecer de risco v${versao} — ${titulo}`,
  criadaEm: 'Criada em ',
  por: (autor: string) => ` por ${autor}`,
  naoMuda: 'Esta versão não muda. Para corrigir, crie uma nova versão a partir dela.',
  rascunhoVer: 'Rascunho do agente de risco. Leia com atenção: o conteúdo foi gerado por IA a partir do texto do pedido.',
  maisNova: 'Existe uma versão mais nova: ',
  nivel: 'Nível',
  nivelEmTexto: (titulo: string, rotulo: string) => `${titulo}: ${rotulo}`,
  naoInformado: 'Não informado.',
  nenhumItem: 'Nenhum item.',
  criarAPartir: 'Criar nova versão a partir desta',
  voltar: 'Voltar para a demanda',
  versaoNaoEncontrada: 'Versão não encontrada',
} as const;

// --- campos ---

// Os três riscos, na ordem da tela: o campo do nível, o do comentário, o título do grupo e o nome no meio da frase.
export const RISCOS = [
  { nivel: 'riscoTecnicoNivel', comentario: 'riscoTecnicoComentario', titulo: 'Risco técnico', nome: 'risco técnico' },
  { nivel: 'riscoOperacionalNivel', comentario: 'riscoOperacionalComentario', titulo: 'Risco operacional', nome: 'risco operacional' },
  { nivel: 'riscoJuridicoNivel', comentario: 'riscoJuridicoComentario', titulo: 'Risco jurídico', nome: 'risco jurídico' },
] as const;

export type CampoNivel = (typeof RISCOS)[number]['nivel'];
export type CampoComentario = (typeof RISCOS)[number]['comentario'];
export const CAMPOS_TEXTO_RSK = ['resumo', 'riscoTecnicoComentario', 'riscoOperacionalComentario', 'riscoJuridicoComentario', 'envolverJuridicoOuAdministradoraQuando'] as const;
export const CAMPOS_LISTA_RSK = ['recomendacoesMitigacao', 'preCondicoes'] as const;
export type CampoTextoRsk = (typeof CAMPOS_TEXTO_RSK)[number];
export type CampoListaRsk = (typeof CAMPOS_LISTA_RSK)[number];

// Campo vazio = ''; nível não marcado = ''.
export type ValoresDoParecer = Record<CampoTextoRsk, string> & Record<CampoListaRsk, ItemDaLista[]> & Record<CampoNivel, NivelRisco | ''>;

// Rótulos do Resumo de erros, sem "(obrigatório)": o do nível é a `legend` do grupo, e o do comentário leva o risco,
// porque os três campos se chamam "Comentário" na tela.
export const ROTULOS_RSK: Readonly<Record<string, string>> = {
  resumo: TEXTOS_RSK.resumo,
  ...Object.fromEntries(RISCOS.flatMap((r) => [
    [r.nivel, `Nível do ${r.nome}`],
    [r.comentario, `Comentário do ${r.nome}`],
  ])),
  recomendacoesMitigacao: TEXTOS_RSK.recomendacoes,
  preCondicoes: TEXTOS_RSK.preCondicoes,
  envolverJuridicoOuAdministradoraQuando: TEXTOS_RSK.envolver,
};

// --- valores iniciais ---

type Base = Pick<ParecerRiscoVista, CampoTextoRsk | CampoListaRsk | CampoNivel>;

// A versão nova começa com o RSK de partida (o mais novo, ou o escolhido na T10), ou em branco, sem nível marcado
// (03, T08, Vazio).
export function valoresDoParecer(base: Base | null): ValoresDoParecer {
  const textos = Object.fromEntries(CAMPOS_TEXTO_RSK.map((c) => [c, base?.[c] ?? ''])) as Record<CampoTextoRsk, string>;
  const listas = Object.fromEntries(CAMPOS_LISTA_RSK.map((c) => [c, itensDe(c, base?.[c])])) as Record<CampoListaRsk, ItemDaLista[]>;
  const niveis = Object.fromEntries(RISCOS.map((r) => [r.nivel, base?.[r.nivel] ?? ''])) as Record<CampoNivel, NivelRisco | ''>;
  return { ...textos, ...listas, ...niveis };
}

const visivel = (v: ValoresDoParecer) =>
  JSON.stringify(Object.fromEntries(Object.entries(v).map(([c, x]) => [c, Array.isArray(x) ? x.map((i: ItemDaLista) => i.valor) : x])));

// Há o que perder ao sair (03, 2.5)?
export const parecerSujo = (inicial: ValoresDoParecer, atual: ValoresDoParecer): boolean => visivel(inicial) !== visivel(atual);

// --- validação no envio ---

const RE_ITEM = /^(\w+)\.(\d+)$/;
const ehLista = (campo: string): campo is CampoListaRsk => (CAMPOS_LISTA_RSK as readonly string[]).includes(campo);
const ehNivel = (campo: string): campo is CampoNivel => RISCOS.some((r) => r.nivel === campo);

function rotuloDoErro(campo: string): string | null {
  const m = RE_ITEM.exec(campo);
  if (m && ROTULOS_RSK[m[1]!]) return `Item ${Number(m[2]) + 1} de ${ROTULOS_RSK[m[1]!]}`;
  return ROTULOS_RSK[campo] ?? null;
}

// O elemento que recebe o foco pelo link do resumo: no grupo de nível, a primeira opção; na lista, o primeiro item (ou
// o "Adicionar item"); senão, o campo.
function idDoAlvo(campo: string, v: ValoresDoParecer): string {
  const m = RE_ITEM.exec(campo);
  if (m) return idDoItem(m[1]!, Number(m[2]));
  if (ehNivel(campo)) return `${idDoCampo(campo)}-${NIVEIS_DO_PARECER[0]}`;
  if (ehLista(campo)) return idDoAlvoDaLista(campo, v[campo].length);
  return idDoCampo(campo);
}

const erro = (campo: string, mensagem: string, v: ValoresDoParecer): ErroDeCampo => ({ campo, idCampo: idDoAlvo(campo, v), rotulo: rotuloDoErro(campo), mensagem });

const vazio = (s: string) => s.trim() === '';
const longo = (s: string) => s.trim().length > LIMITE_CAMPO_RSK;
const MENSAGEM_LONGO = TEXTOS_RSK.erros.campoLongo(LIMITE_CAMPO_RSK);

const errosDoTexto = (campo: CampoTextoRsk, v: ValoresDoParecer): ErroDeCampo[] => (longo(v[campo]) ? [erro(campo, MENSAGEM_LONGO, v)] : []);

function errosDaLista(campo: CampoListaRsk, v: ValoresDoParecer): ErroDeCampo[] {
  const itens = v[campo];
  if (valoresDaLista(itens).valores.length > LIMITE_ITENS_LISTA) return [erro(campo, TEXTOS_RSK.erros.limiteItens, v)];
  return itens.flatMap((item, i) => (longo(item.valor) ? [erro(`${campo}.${i}`, MENSAGEM_LONGO, v)] : []));
}

// Validação no envio, na ordem da tela (03, 2.5 e T08): Resumo, os três riscos (nível e comentário), as duas listas e
// "Quando envolver…".
export function validarParecer(v: ValoresDoParecer): ErroDeCampo[] {
  const erros: ErroDeCampo[] = [...errosDoTexto('resumo', v)];
  for (const r of RISCOS) {
    if (v[r.nivel] === '') erros.push(erro(r.nivel, TEXTOS_RSK.erros.nivel(r.nome), v));
    erros.push(...errosDoTexto(r.comentario, v));
  }
  for (const c of CAMPOS_LISTA_RSK) erros.push(...errosDaLista(c, v));
  erros.push(...errosDoTexto('envolverJuridicoOuAdministradoraQuando', v));
  return erros;
}

// --- entrada da Server Action ---

export type EntradaDoParecer = Record<string, unknown>;
export type IndicesDasListasRsk = Partial<Record<CampoListaRsk, number[]>>;

// A entrada do jeito que criarParecerRiscoSchema espera, sem nenhum campo de autoria (C-11). Texto vazio e nível não
// marcado não vão (o servidor responde pelo campo); item vazio é descartado.
export function entradaDoParecer(v: ValoresDoParecer): { entrada: EntradaDoParecer; indices: IndicesDasListasRsk } {
  const entrada: EntradaDoParecer = {};
  if (!vazio(v.resumo)) entrada.resumo = v.resumo.trim();
  for (const r of RISCOS) {
    if (v[r.nivel] !== '') entrada[r.nivel] = v[r.nivel];
    if (!vazio(v[r.comentario])) entrada[r.comentario] = v[r.comentario].trim();
  }
  const indices: IndicesDasListasRsk = {};
  for (const c of CAMPOS_LISTA_RSK) {
    const { valores, indices: i } = valoresDaLista(v[c]);
    entrada[c] = valores;
    indices[c] = i;
  }
  if (!vazio(v.envolverJuridicoOuAdministradoraQuando)) entrada.envolverJuridicoOuAdministradoraQuando = v.envolverJuridicoOuAdministradoraQuando.trim();
  return { entrada, indices };
}

// --- erros da API ---

// A mensagem da 03 para o que o servidor diz de forma genérica (mapeador de erro, erros.ts): nível ausente ("Campo
// obrigatório.") ou fora da lista ("Valor inválido.") é sempre "Escolha o nível do …".
function mensagemDaTela(campo: string, mensagem: string): string {
  const r = RISCOS.find((x) => x.nivel === campo);
  return r ? TEXTOS_RSK.erros.nivel(r.nome) : mensagem;
}

// O campo como a tela o conhece: o índice do item enviado volta à linha da tela.
function campoDaTela(campo: string, indices: IndicesDasListasRsk): string {
  const m = RE_ITEM.exec(campo);
  if (!m || !ehLista(m[1]!)) return campo;
  const linha = indices[m[1] as CampoListaRsk]?.[Number(m[2])];
  return linha === undefined ? campo : `${m[1]}.${linha}`;
}

// Erros que a API devolve (400) no mesmo resumo, campo a campo (03, 2.5); o resto vira alerta com o texto da 2.8.
export function errosDaApiRsk(
  r: Extract<ResultadoAcao<unknown>, { ok: false }>,
  ctx: { indices: IndicesDasListasRsk; valores: ValoresDoParecer },
): ErrosDoFormulario {
  const base = errosDoResultado(r, ROTULOS_RSK);
  if (base.campos.length === 0) return base;
  const campos = base.campos.map((c) => {
    const campo = campoDaTela(c.campo, ctx.indices);
    return erro(campo, mensagemDaTela(campo, c.mensagem), ctx.valores);
  });
  return { campos, porCampo: Object.fromEntries(campos.map((c) => [c.campo, c.mensagem])), alerta: null, detalhes: [] };
}

// --- chegada na T05 ---

export type ResultadoGravacaoParecer = { id: string; demandaId: string; conflito: boolean; decDesatualizado: string | null };

// Valores fixos de `?aviso=`: só o valor escolhe o texto. A versão e o DEC da URL só valem se forem da demanda aberta.
export const AVISO_PARECER = { gravado: 'parecer-gravado', conflito: 'parecer-conflito' } as const;

export function caminhoDeChegadaDoParecer(r: ResultadoGravacaoParecer): string {
  const aviso = r.conflito ? AVISO_PARECER.conflito : AVISO_PARECER.gravado;
  return `/demandas/${r.demandaId}?aviso=${aviso}&versao=${r.id}${r.decDesatualizado ? `&dec=${r.decDesatualizado}` : ''}`;
}

type Parametros = Readonly<Record<string, string | string[] | undefined>>;

// O alerta de chegada da T08 na T05 (03, T08, Sucesso e Erro). Nada da URL vai para a tela: o id da versão precisa ser
// de um RSK desta demanda, e o do DEC, de um pacote dela pendente e desatualizado.
export function chegadaDoParecer(
  p: Parametros,
  d: Pick<DemandaVista, 'pareceresRisco' | 'pacotesDecisao'>,
): { tipo: 'sucesso' | 'erro'; texto: string } | null {
  if (p.aviso !== AVISO_PARECER.gravado && p.aviso !== AVISO_PARECER.conflito) return null;
  const versao = d.pareceresRisco.find((r) => r.id === p.versao);
  if (!versao) return null;
  const conflito = p.aviso === AVISO_PARECER.conflito;
  const partes = [conflito ? TEXTOS_RSK.conflito(versao.versao) : TEXTOS_RSK.sucesso(versao.id)];
  const dec = d.pacotesDecisao.find((x) => x.id === p.dec && x.statusDecisao === 'pendente' && x.desatualizado);
  if (dec) partes.push(TEXTOS_RSK.decDesatualizado(dec.id));
  return { tipo: conflito ? 'erro' : 'sucesso', texto: partes.join(' ') };
}

// --- leitura (T10) ---

export type ItemDoParecer = { termo: string; valor: string | string[] };
export type SecaoDoParecer = { titulo: string; itens: ItemDoParecer[] };

const texto = (v: string | null): string => (v && v.trim() !== '' ? v : TEXTOS_RSK.naoInformado);
const listaOuNenhum = (v: readonly string[]): string | string[] => (v.length > 0 ? [...v] : TEXTOS_RSK.nenhumItem);

// Os campos com os rótulos de T08, um grupo por `h2` (03, T10, Acessibilidade); o nível sempre em texto ("Risco técnico:
// Alto"), nunca só a cor.
export function secoesDoParecer(r: Omit<ParecerRiscoVista, 'autor' | 'criadaEm'>): SecaoDoParecer[] {
  const t = TEXTOS_RSK;
  return [
    { titulo: t.resumo, itens: [{ termo: t.resumo, valor: texto(r.resumo) }] },
    ...RISCOS.map((x) => ({
      titulo: x.titulo,
      itens: [
        { termo: t.nivel, valor: t.nivelEmTexto(x.titulo, ROTULO_NIVEL[r[x.nivel]]) },
        { termo: t.comentario, valor: texto(r[x.comentario]) },
      ],
    })),
    { titulo: t.recomendacoes, itens: [{ termo: t.recomendacoes, valor: listaOuNenhum(r.recomendacoesMitigacao) }] },
    { titulo: t.preCondicoes, itens: [{ termo: t.preCondicoes, valor: listaOuNenhum(r.preCondicoes) }] },
    { titulo: t.envolver, itens: [{ termo: t.envolver, valor: texto(r.envolverJuridicoOuAdministradoraQuando) }] },
  ];
}
