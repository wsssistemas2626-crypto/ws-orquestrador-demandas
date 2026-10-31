// Regra da especificação técnica no painel (03, T07 e T10), sem tela: os textos da 03, os valores com que o formulário
// abre, a validação no envio, a entrada que vai à Server Action, os erros da API campo a campo, o alerta de chegada na
// T05 e as seções da leitura (T10). Vai ao navegador: só tipos vêm dos módulos, e os limites e as mensagens de
// construção são cópia dos do servidor (o teste confere que não se afastam). A validação daqui é só conveniência; quem
// decide é o servidor, com criarEspecificacaoSchema e validarCamposDeConstrucao (T18, ADR-09).
import type { ResultadoAcao } from '../lib/acao-painel';
import type { DemandaVista } from '../modules/demandas/consultas';
import type { Tipo } from '../modules/demandas/schemas';
import type { EspecificacaoVista } from '../modules/especificacoes/consultas';
import { DONOS_REPOSITORIO, TIPOS_CONSTRUIDOS } from '../vendor/construir/pedido.mjs';
import { errosDoResultado, idDoCampo, type ErroDeCampo, type ErrosDoFormulario } from './formulario';
import { idDoAlvoDaLista, idDoItem, itensDe, LIMITE_ITENS_LISTA, valoresDaLista, type ItemDaLista } from './lista-textos';

// RNF-04 e o `max(100)` do sistema alvo em criarEspecificacaoSchema.
export const LIMITE_CAMPO_ESP = 10_000;
export const LIMITE_SISTEMA_ALVO = 100;
const RE_SISTEMA_ALVO = /^[a-z0-9][a-z0-9-]*$/;
// O mesmo formato de RE_ID_VERSAO (versoes.ts), só do prefixo ESP.
export const RE_ID_ESP = /^ESP-DEM-\d{8}-\d{4}-v\d{1,4}$/;

// "Conta do repositório" (03, T07): as contas do validarPedido do /construir, com a da empresa primeiro (padrão técnico,
// seção 10).
export const CONTA_PADRAO = 'wsssistemas2626-crypto';
export const CONTAS_REPOSITORIO: readonly string[] = [CONTA_PADRAO, ...DONOS_REPOSITORIO.filter((c) => c !== CONTA_PADRAO)];

// O texto "Repositório destino: …" tem este id e é ligado ao campo do sistema alvo por aria-describedby (03, T07).
export const ID_REPOSITORIO_DESTINO = 'repositorio-destino';

const fmt = (n: number) => n.toLocaleString('pt-BR');

export const TEXTOS_ESP = {
  tituloNova: 'Nova versão da especificação técnica',
  infoProxima: (novoId: string, versaoBase: number) => `Esta será a ${novoId}. A v${versaoBase} continua guardada e não muda.`,
  infoPrimeira: 'Esta será a primeira especificação técnica desta demanda, a v1.',
  infoRascunho: (versaoBase: number) => `Os campos vieram da v${versaoBase}, um rascunho do agente de insumo técnico. Revise antes de gravar.`,
  secoes: {
    problema: 'Problema',
    escopo: 'Escopo',
    sistemas: 'Sistemas envolvidos',
    dados: 'Dados',
    restricoes: 'Restrições técnicas',
    duvidas: 'Dúvidas em aberto',
    construcao: 'Construção',
  },
  construcaoObrigatoria: 'Construção (obrigatório, exceto para Estudo)',
  construcaoEstudo: 'Construção (opcional: demanda do tipo Estudo não gera Pedido de Construção)',
  dicaEscopo: 'Um item por linha de escopo.',
  dicaDuvidas:
    'Com qualquer dúvida aqui, a demanda vai para Aguardando informação e o agente de risco não roda. Nenhuma mensagem é enviada ao solicitante.',
  dicaSistemaAlvo: 'Só letras minúsculas, números e hífen. Exemplo: ws-orquestrador-demandas.',
  dicaAoMenosUm: 'Ao menos um item.',
  repositorioDestino: (repositorio: string) => `Repositório destino: ${repositorio}`,
  gravar: (id: string) => `Gravar ${id}`,
  gravando: 'Gravando…',
  cancelar: 'Cancelar',
  dialogoTitulo: 'Gravar com dúvidas em aberto?',
  dialogoTexto: 'A demanda vai para Aguardando informação. Nenhuma mensagem é enviada ao solicitante.',
  dialogoConfirmar: 'Gravar mesmo assim',
  dialogoVoltar: 'Voltar',
  erros: {
    descricaoObjetiva: 'Informe a descrição objetiva.',
    sistemaAlvo: 'Informe o sistema alvo.',
    sistemaAlvoFormato: 'Sistema alvo aceita só letras minúsculas, números e hífen.',
    criterios: 'Informe ao menos um critério de aceite preliminar.',
    definicao: 'Informe ao menos um item da definição de pronto.',
    repositorioSemSistema: 'O repositório destino precisa terminar com o sistema alvo.',
    campoLongo: (limite: number) => `Este campo aceita até ${fmt(limite)} caracteres.`,
    limiteItens: 'Limite de 50 itens atingido.',
  },
  sucesso: (id: string) => `${id} gravada.`,
  conflito: (versao: number) => `Outra versão foi gravada enquanto você editava. Sua versão foi gravada como v${versao}; confira as duas no detalhe.`,
  foiParaAguardando: 'A demanda foi para Aguardando informação.',
  decDesatualizado: (id: string) => `O pacote ${id} ficou desatualizado. Crie um pacote novo para decidir.`,
  // T10
  tituloAba: 'Especificação técnica',
  tituloVer: (versao: number, titulo: string) => `Especificação técnica v${versao} — ${titulo}`,
  criadaEm: 'Criada em ',
  por: (autor: string) => ` por ${autor}`,
  naoMuda: 'Esta versão não muda. Para corrigir, crie uma nova versão a partir dela.',
  rascunhoVer: 'Rascunho do agente de insumo técnico. Leia com atenção: o conteúdo foi gerado por IA a partir do texto do pedido.',
  maisNova: 'Existe uma versão mais nova: ',
  naoInformado: 'Não informado.',
  nenhumItem: 'Nenhum item.',
  criarAPartir: 'Criar nova versão a partir desta',
  voltar: 'Voltar para a demanda',
  versaoNaoEncontrada: 'Versão não encontrada',
} as const;

// --- campos ---

export const CAMPOS_TEXTO_ESP = [
  'descricaoObjetiva',
  'situacaoAtual',
  'situacaoDesejada',
  'sistemasErp',
  'sistemasEcommerceMarketplace',
  'sistemasApisTerceiros',
  'sistemasServicosInternos',
  'dadosEntidades',
  'dadosCamposCriticos',
  'restricoesTecnicas',
] as const;
export const CAMPOS_LISTA_ESP = ['escopoInclui', 'escopoExclui', 'duvidasEmAberto', 'criteriosAceitePreliminares', 'definicaoDePronto'] as const;
export type CampoTextoEsp = (typeof CAMPOS_TEXTO_ESP)[number];
export type CampoListaEsp = (typeof CAMPOS_LISTA_ESP)[number];

// Campo vazio = ''. `contaRepositorio` é só da tela: vai ao servidor dentro de `repositorioDestino`.
export type ValoresDaEspecificacao = Record<CampoTextoEsp, string> &
  Record<CampoListaEsp, ItemDaLista[]> & { sistemaAlvo: string; contaRepositorio: string };

// Rótulos dos campos (03, T07), sem "(obrigatório)": o Resumo de erros e a leitura (T10) usam os mesmos.
export const ROTULOS_ESP: Readonly<Record<string, string>> = {
  descricaoObjetiva: 'Descrição objetiva',
  situacaoAtual: 'Situação atual',
  situacaoDesejada: 'Situação desejada',
  escopoInclui: 'Escopo inclui',
  escopoExclui: 'Escopo exclui',
  sistemasErp: 'ERP',
  sistemasEcommerceMarketplace: 'E-commerce e marketplace',
  sistemasApisTerceiros: 'APIs de terceiros',
  sistemasServicosInternos: 'Serviços internos da WS',
  dadosEntidades: 'Entidades',
  dadosCamposCriticos: 'Campos críticos',
  restricoesTecnicas: 'Restrições técnicas',
  duvidasEmAberto: 'Dúvidas em aberto',
  sistemaAlvo: 'Sistema alvo',
  contaRepositorio: 'Conta do repositório',
  repositorioDestino: 'Repositório destino',
  criteriosAceitePreliminares: 'Critérios de aceite preliminares',
  definicaoDePronto: 'Definição de pronto',
};

export const ehConstruido = (tipo: Tipo): boolean => TIPOS_CONSTRUIDOS.includes(tipo);

const obrigatorio = (rotulo: string, sim: boolean) => (sim ? `${rotulo} (obrigatório)` : rotulo);

// Fora do Estudo, os campos da Construção são obrigatórios (CA-08.2); no Estudo, opcionais (CA-08.4), sem "(obrigatório)"
// e sem a dica de ao menos um item.
export function rotulosDaConstrucao(tipo: Tipo): {
  legenda: string;
  sistemaAlvo: string;
  conta: string;
  criterios: string;
  definicao: string;
  dicaLista: string | undefined;
} {
  const sim = ehConstruido(tipo);
  return {
    legenda: sim ? TEXTOS_ESP.construcaoObrigatoria : TEXTOS_ESP.construcaoEstudo,
    sistemaAlvo: obrigatorio(ROTULOS_ESP.sistemaAlvo!, sim),
    conta: obrigatorio(ROTULOS_ESP.contaRepositorio!, sim),
    criterios: obrigatorio(ROTULOS_ESP.criteriosAceitePreliminares!, sim),
    definicao: obrigatorio(ROTULOS_ESP.definicaoDePronto!, sim),
    dicaLista: sim ? TEXTOS_ESP.dicaAoMenosUm : undefined,
  };
}

// --- valores iniciais ---

type Base = Pick<EspecificacaoVista, CampoTextoEsp | CampoListaEsp | 'sistemaAlvo' | 'repositorioDestino'>;

function contaDe(repositorio: string | null): string {
  const conta = repositorio?.split('/')[0];
  return conta && CONTAS_REPOSITORIO.includes(conta) ? conta : CONTA_PADRAO;
}

// A versão nova começa com a ESP de partida (a mais nova, ou a escolhida na T10), ou em branco (03, T07).
export function valoresDaEspecificacao(base: Base | null): ValoresDaEspecificacao {
  const textos = Object.fromEntries(CAMPOS_TEXTO_ESP.map((c) => [c, base?.[c] ?? ''])) as Record<CampoTextoEsp, string>;
  const listas = Object.fromEntries(CAMPOS_LISTA_ESP.map((c) => [c, itensDe(c, base?.[c])])) as Record<CampoListaEsp, ItemDaLista[]>;
  return { ...textos, ...listas, sistemaAlvo: base?.sistemaAlvo ?? '', contaRepositorio: contaDe(base?.repositorioDestino ?? null) };
}

// "Repositório destino: <conta>/<sistema alvo>", atualizado ao digitar.
export const repositorioDe = (v: Pick<ValoresDaEspecificacao, 'contaRepositorio' | 'sistemaAlvo'>): string => `${v.contaRepositorio}/${v.sistemaAlvo.trim()}`;

export const temDuvidas = (v: Pick<ValoresDaEspecificacao, 'duvidasEmAberto'>): boolean => valoresDaLista(v.duvidasEmAberto).valores.length > 0;

const visivel = (v: ValoresDaEspecificacao) =>
  JSON.stringify(Object.fromEntries(Object.entries(v).map(([c, x]) => [c, Array.isArray(x) ? x.map((i: ItemDaLista) => i.valor) : x])));

// Há o que perder ao sair (03, 2.5)?
export const especificacaoSuja = (inicial: ValoresDaEspecificacao, atual: ValoresDaEspecificacao): boolean => visivel(inicial) !== visivel(atual);

// --- validação no envio ---

const RE_ITEM = /^(\w+)\.(\d+)$/;

function rotuloDoErro(campo: string): string | null {
  const m = RE_ITEM.exec(campo);
  if (m && ROTULOS_ESP[m[1]!]) return `Item ${Number(m[2]) + 1} de ${ROTULOS_ESP[m[1]!]}`;
  return ROTULOS_ESP[campo] ?? null;
}

const ehLista = (campo: string): campo is CampoListaEsp => (CAMPOS_LISTA_ESP as readonly string[]).includes(campo);

// O elemento que recebe o foco pelo link do resumo: o campo; na lista, o primeiro item (ou o "Adicionar item").
function idDoAlvo(campo: string, v: ValoresDaEspecificacao): string {
  const m = RE_ITEM.exec(campo);
  if (m) return idDoItem(m[1]!, Number(m[2]));
  if (ehLista(campo)) return idDoAlvoDaLista(campo, v[campo].length);
  return idDoCampo(campo);
}

const erro = (campo: string, mensagem: string, v: ValoresDaEspecificacao): ErroDeCampo => ({ campo, idCampo: idDoAlvo(campo, v), rotulo: rotuloDoErro(campo), mensagem });

const vazio = (s: string) => s.trim() === '';
const longo = (s: string) => s.trim().length > LIMITE_CAMPO_ESP;

function errosDaLista(campo: CampoListaEsp, v: ValoresDaEspecificacao): ErroDeCampo[] {
  const itens = v[campo];
  if (valoresDaLista(itens).valores.length > LIMITE_ITENS_LISTA) return [erro(campo, TEXTOS_ESP.erros.limiteItens, v)];
  return itens.flatMap((item, i) => (longo(item.valor) ? [erro(`${campo}.${i}`, TEXTOS_ESP.erros.campoLongo(LIMITE_CAMPO_ESP), v)] : []));
}

const errosDoTexto = (campo: CampoTextoEsp, v: ValoresDaEspecificacao): ErroDeCampo[] =>
  longo(v[campo]) ? [erro(campo, TEXTOS_ESP.erros.campoLongo(LIMITE_CAMPO_ESP), v)] : [];

// Validação no envio, na ordem da tela (03, 2.5 e T07): Problema, Escopo, Sistemas, Dados, Restrições, Dúvidas,
// Construção. A da Construção é a de validarCamposDeConstrucao (T18), mais o formato do sistema alvo do schema.
export function validarEspecificacao(v: ValoresDaEspecificacao, tipo: Tipo): ErroDeCampo[] {
  const erros: ErroDeCampo[] = [];
  if (vazio(v.descricaoObjetiva)) erros.push(erro('descricaoObjetiva', TEXTOS_ESP.erros.descricaoObjetiva, v));
  else erros.push(...errosDoTexto('descricaoObjetiva', v));
  for (const c of ['situacaoAtual', 'situacaoDesejada'] as const) erros.push(...errosDoTexto(c, v));
  for (const c of ['escopoInclui', 'escopoExclui'] as const) erros.push(...errosDaLista(c, v));
  for (const c of ['sistemasErp', 'sistemasEcommerceMarketplace', 'sistemasApisTerceiros', 'sistemasServicosInternos', 'dadosEntidades', 'dadosCamposCriticos', 'restricoesTecnicas'] as const)
    erros.push(...errosDoTexto(c, v));
  erros.push(...errosDaLista('duvidasEmAberto', v));

  const construido = ehConstruido(tipo);
  const sistema = v.sistemaAlvo.trim();
  if (sistema === '') {
    if (construido) erros.push(erro('sistemaAlvo', TEXTOS_ESP.erros.sistemaAlvo, v));
  } else if (sistema.length > LIMITE_SISTEMA_ALVO) erros.push(erro('sistemaAlvo', TEXTOS_ESP.erros.campoLongo(LIMITE_SISTEMA_ALVO), v));
  else if (!RE_SISTEMA_ALVO.test(sistema)) erros.push(erro('sistemaAlvo', TEXTOS_ESP.erros.sistemaAlvoFormato, v));
  for (const [c, mensagem] of [
    ['criteriosAceitePreliminares', TEXTOS_ESP.erros.criterios],
    ['definicaoDePronto', TEXTOS_ESP.erros.definicao],
  ] as const) {
    const daLista = errosDaLista(c, v);
    if (daLista.length > 0) erros.push(...daLista);
    else if (construido && valoresDaLista(v[c]).valores.length === 0) erros.push(erro(c, mensagem, v));
  }
  return erros;
}

// --- entrada da Server Action ---

export type EntradaDaEspecificacao = Record<string, unknown>;
export type IndicesDasListas = Partial<Record<CampoListaEsp, number[]>>;

// A entrada do jeito que criarEspecificacaoSchema espera, sem nenhum campo de autoria (C-11). Texto opcional vazio não
// vai; item vazio é descartado. O repositório destino é "<conta>/<sistema alvo>": num tipo construído vai sempre (sem
// sistema alvo, o servidor responde só pelo sistema alvo); no Estudo, só com sistema alvo.
export function entradaDaEspecificacao(v: ValoresDaEspecificacao, tipo: Tipo): { entrada: EntradaDaEspecificacao; indices: IndicesDasListas } {
  const entrada: EntradaDaEspecificacao = { descricaoObjetiva: v.descricaoObjetiva.trim() };
  for (const c of CAMPOS_TEXTO_ESP) if (c !== 'descricaoObjetiva' && !vazio(v[c])) entrada[c] = v[c].trim();
  const indices: IndicesDasListas = {};
  for (const c of CAMPOS_LISTA_ESP) {
    const { valores, indices: i } = valoresDaLista(v[c]);
    indices[c] = i;
    // As três primeiras vão sempre (o schema exige `escopoInclui`); critérios e definição, só com item.
    if (c === 'escopoInclui' || c === 'escopoExclui' || c === 'duvidasEmAberto' || valores.length > 0) entrada[c] = valores;
  }
  const sistema = v.sistemaAlvo.trim();
  if (sistema !== '') entrada.sistemaAlvo = sistema;
  if (ehConstruido(tipo) || sistema !== '') entrada.repositorioDestino = repositorioDe(v);
  return { entrada, indices };
}

// --- erros da API ---

// A mensagem da 03 para o que o servidor diz de forma genérica (mapeador de erro, erros.ts).
function mensagemDaTela(campo: string, mensagem: string): string {
  if (campo === 'descricaoObjetiva' && mensagem === 'Campo obrigatório.') return TEXTOS_ESP.erros.descricaoObjetiva;
  if (campo === 'sistemaAlvo' && mensagem === 'Valor inválido.') return TEXTOS_ESP.erros.sistemaAlvoFormato;
  return mensagem;
}

// O campo como a tela o conhece: o índice do item enviado volta à linha da tela.
function campoDaTela(campo: string, indices: IndicesDasListas): string {
  const m = RE_ITEM.exec(campo);
  if (!m || !ehLista(m[1]!)) return campo;
  const linha = indices[m[1] as CampoListaEsp]?.[Number(m[2])];
  return linha === undefined ? campo : `${m[1]}.${linha}`;
}

// Erros que a API devolve (400) no mesmo resumo, campo a campo (03, 2.5); o resto vira alerta com o texto da 2.8. O erro
// do repositório destino aparece na conta do repositório (a tela não tem campo de repositório); sem sistema alvo, ele
// repete o do sistema alvo e sai.
export function errosDaApiEsp(
  r: Extract<ResultadoAcao<unknown>, { ok: false }>,
  ctx: { indices: IndicesDasListas; valores: ValoresDaEspecificacao },
): ErrosDoFormulario {
  const base = errosDoResultado(r, ROTULOS_ESP);
  if (base.campos.length === 0) return base;
  const temSistema = base.campos.some((c) => c.campo === 'sistemaAlvo');
  const campos = base.campos.flatMap((c): ErroDeCampo[] => {
    if (c.campo === 'repositorioDestino') {
      if (temSistema) return [];
      return [{ campo: 'contaRepositorio', idCampo: idDoCampo('contaRepositorio'), rotulo: ROTULOS_ESP.repositorioDestino!, mensagem: c.mensagem }];
    }
    const campo = campoDaTela(c.campo, ctx.indices);
    return [erro(campo, mensagemDaTela(campo, c.mensagem), ctx.valores)];
  });
  return { campos, porCampo: Object.fromEntries(campos.map((c) => [c.campo, c.mensagem])), alerta: null, detalhes: [] };
}

// --- chegada na T05 ---

export type ResultadoGravacao = { id: string; demandaId: string; conflito: boolean; decDesatualizado: string | null };

// Valores fixos de `?aviso=`: só o valor escolhe o texto. A versão e o DEC da URL só valem se forem da demanda aberta.
export const AVISO_ESPECIFICACAO = { gravada: 'especificacao-gravada', conflito: 'especificacao-conflito' } as const;

export function caminhoDeChegada(r: ResultadoGravacao): string {
  const aviso = r.conflito ? AVISO_ESPECIFICACAO.conflito : AVISO_ESPECIFICACAO.gravada;
  return `/demandas/${r.demandaId}?aviso=${aviso}&versao=${r.id}${r.decDesatualizado ? `&dec=${r.decDesatualizado}` : ''}`;
}

type Parametros = Readonly<Record<string, string | string[] | undefined>>;

// O alerta de chegada da T07 na T05 (03, T07, Sucesso e Erro). Nada da URL vai para a tela: o id da versão precisa ser
// de uma ESP desta demanda, e o do DEC, de um pacote dela pendente e desatualizado. "Foi para Aguardando informação" só
// quando a ESP gravada é a mais nova, tem dúvida e a demanda está nesse status.
export function chegadaDaEspecificacao(
  p: Parametros,
  d: Pick<DemandaVista, 'status' | 'especificacoes' | 'pacotesDecisao'>,
  espMaisNova: { id: string; duvidasEmAberto: readonly string[] } | null,
): { tipo: 'sucesso' | 'erro'; texto: string } | null {
  if (p.aviso !== AVISO_ESPECIFICACAO.gravada && p.aviso !== AVISO_ESPECIFICACAO.conflito) return null;
  const versao = d.especificacoes.find((e) => e.id === p.versao);
  if (!versao) return null;
  const conflito = p.aviso === AVISO_ESPECIFICACAO.conflito;
  const partes = [conflito ? TEXTOS_ESP.conflito(versao.versao) : TEXTOS_ESP.sucesso(versao.id)];
  if (espMaisNova?.id === versao.id && espMaisNova.duvidasEmAberto.length > 0 && d.status === 'aguardando_informacao') partes.push(TEXTOS_ESP.foiParaAguardando);
  const dec = d.pacotesDecisao.find((x) => x.id === p.dec && x.statusDecisao === 'pendente' && x.desatualizado);
  if (dec) partes.push(TEXTOS_ESP.decDesatualizado(dec.id));
  return { tipo: conflito ? 'erro' : 'sucesso', texto: partes.join(' ') };
}

// --- leitura (T10) ---

export type ItemDaVista = { termo: string; valor: string | string[] };
export type SecaoDaVista = { titulo: string; itens: ItemDaVista[] };

const texto = (v: string | null): string => (v && v.trim() !== '' ? v : TEXTOS_ESP.naoInformado);
const listaOuNenhum = (v: readonly string[] | null): string | string[] => (v && v.length > 0 ? [...v] : TEXTOS_ESP.nenhumItem);

// Os campos com os rótulos de T07, um grupo por `h2` (03, T10, Acessibilidade).
export function secoesDaVista(e: Omit<EspecificacaoVista, 'autor' | 'criadaEm'>): SecaoDaVista[] {
  const t = TEXTOS_ESP.secoes;
  const r = ROTULOS_ESP;
  const item = (campo: CampoTextoEsp | 'sistemaAlvo' | 'repositorioDestino'): ItemDaVista => ({ termo: r[campo]!, valor: texto(e[campo]) });
  const itemDeLista = (campo: CampoListaEsp): ItemDaVista => ({ termo: r[campo]!, valor: listaOuNenhum(e[campo]) });
  return [
    { titulo: t.problema, itens: [item('descricaoObjetiva'), item('situacaoAtual'), item('situacaoDesejada')] },
    { titulo: t.escopo, itens: [itemDeLista('escopoInclui'), itemDeLista('escopoExclui')] },
    { titulo: t.sistemas, itens: [item('sistemasErp'), item('sistemasEcommerceMarketplace'), item('sistemasApisTerceiros'), item('sistemasServicosInternos')] },
    { titulo: t.dados, itens: [item('dadosEntidades'), item('dadosCamposCriticos')] },
    { titulo: t.restricoes, itens: [item('restricoesTecnicas')] },
    { titulo: t.duvidas, itens: [itemDeLista('duvidasEmAberto')] },
    {
      titulo: t.construcao,
      itens: [item('sistemaAlvo'), item('repositorioDestino'), itemDeLista('criteriosAceitePreliminares'), itemDeLista('definicaoDePronto')],
    },
  ];
}
