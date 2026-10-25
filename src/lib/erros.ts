// Mapeador único de erro (C-20). Regra de negócio lança só ErroDominio; qualquer outra coisa (Postgres, Drizzle,
// ZodError cru, valor solto) vira 500 genérico. A resposta nunca leva mensagem do Postgres, do Drizzle (que traz os
// parâmetros da consulta) nem o `input` de issue do Zod.
import type { z } from 'zod';

export const STATUS_DO_CODIGO = {
  entrada_invalida: 400,
  nao_autenticado: 401,
  sem_permissao: 403,
  sem_2fa: 403,
  nao_encontrado: 404,
  metodo_nao_permitido: 405,
  conflito: 409,
  corpo_grande: 413,
  tipo_nao_suportado: 415,
  nao_processavel: 422,
  limite_excedido: 429,
  capacidade_de_ids_esgotada: 409,
  indisponivel: 503,
} as const satisfies Record<string, number>;

export type CodigoErro = keyof typeof STATUS_DO_CODIGO;
export type CampoInvalido = { campo: string; mensagem: string };
export type ExtrasErro = { campos?: CampoInvalido[]; faltando?: string[]; erros?: string[] };
export type CorpoErro = { erro: CodigoErro | 'erro_interno'; mensagem: string } & ExtrasErro;

export class ErroDominio extends Error {
  // `message` do Error fica só com o código: o que vai ao log e ao Sentry passa por reduzirErro, mas assim nem a
  // pilha leva a mensagem pt-BR, que pode citar dado da demanda.
  constructor(
    readonly codigo: CodigoErro,
    readonly mensagem: string,
    readonly extras: ExtrasErro = {},
  ) {
    super(codigo);
    this.name = 'ErroDominio';
  }
}

export const MENSAGEM_ERRO_INTERNO = 'Não foi possível concluir agora. Nada foi alterado. Tente de novo em instantes.';

type IssueZod = z.core.$ZodIssue;

// Mensagem padrão do Zod em inglês, que não é nossa: vira "Valor inválido.".
const MENSAGEM_CUSTOM_PADRAO = 'Invalid input';
// Pedaço de caminho que vem da estrutura do schema (chave de objeto, índice de lista). Chave de registro vinda do
// cliente (e-mail, texto livre) não passa: vira '*'.
const SEGMENTO_SEGURO = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;

function campoDoCaminho(caminho: readonly PropertyKey[]): string {
  return caminho
    .map((s) => (typeof s === 'number' ? String(s) : typeof s === 'string' && SEGMENTO_SEGURO.test(s) ? s : '*'))
    .join('.');
}

// O Zod 4 só mantém `input` na issue com `reportInput`; sem ele, a ausência aparece na mensagem padrão
// ("received undefined"). A mensagem é lida só para isso e nunca é devolvida.
function campoAusente(i: IssueZod): boolean {
  if ('input' in i) return i.input === undefined;
  return /received undefined$/.test(i.message);
}

function mensagemDoIssue(i: IssueZod): string {
  if (i.code === 'too_small' && i.origin === 'string' && Number(i.minimum) <= 1) return 'Campo obrigatório.';
  if (i.code === 'too_small' && i.origin === 'array') return 'Informe ao menos um item.';
  if (i.code === 'too_big' && i.origin === 'string')
    return `Este campo aceita até ${Number(i.maximum).toLocaleString('pt-BR')} caracteres.`;
  if (i.code === 'too_big' && i.origin === 'array') return `Limite de ${Number(i.maximum)} itens atingido.`;
  if (i.code === 'too_big' || i.code === 'too_small') return 'Valor fora do limite.';
  if (i.code === 'invalid_type' && campoAusente(i)) return 'Campo obrigatório.';
  // Mensagem custom é escrita por nós, em pt-BR e sem valor recebido (refine, superRefine).
  if (i.code === 'custom' && i.message && i.message !== MENSAGEM_CUSTOM_PADRAO) return i.message;
  return 'Valor inválido.';
}

export function deZod(e: z.ZodError): ErroDominio {
  return new ErroDominio('entrada_invalida', 'Corrija os campos abaixo para continuar.', {
    campos: e.issues.map((i) => ({ campo: campoDoCaminho(i.path), mensagem: mensagemDoIssue(i) })),
  });
}

export function mapearErro(e: unknown): { status: number; corpo: CorpoErro } {
  if (e instanceof ErroDominio) {
    const corpo: CorpoErro = { erro: e.codigo, mensagem: e.mensagem };
    // Só os três extras da interface; qualquer outra chave que chegue por engano fica de fora.
    if (e.extras.campos) corpo.campos = e.extras.campos;
    if (e.extras.faltando) corpo.faltando = e.extras.faltando;
    if (e.extras.erros) corpo.erros = e.extras.erros;
    return { status: STATUS_DO_CODIGO[e.codigo], corpo };
  }
  return { status: 500, corpo: { erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO } };
}
