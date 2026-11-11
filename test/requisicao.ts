// Monta requisições de teste para os handlers de `rota()` (T11) e para o teste que percorre todas as rotas (T13):
// origem do painel, `Content-Type` JSON e um IP fictício por requisição, com cookie de pessoa ou Bearer de agente ou de
// integração.
// O handler é chamado direto, como o Next chama, com os parâmetros de caminho numa Promise.
import { comTransacao } from '../src/db/transacao';
import type { Deps } from '../src/lib/deps';
import type { HandlerRota } from '../src/lib/rota';
import { AGENTES, INTEGRACOES, PAPEIS, atorDesconhecido, type Agente, type Integracao, type Papel } from '../src/modules/acesso/ator';
import { criarTokenServico } from '../src/modules/acesso/tokens-servico';
import { CONFIG_TESTE } from './auth';
import { tokenDeIntegracao } from './integracoes';
import { criarPessoa, novoIp } from './sessao';

export const URL_BASE = CONFIG_TESTE.urlBase;

export type OpRequisicao = {
  metodo?: string;
  caminho?: string;
  cookie?: string;
  bearer?: string;
  // Objeto vira JSON; texto vai como está (para corpo inválido ou enorme).
  corpo?: unknown;
  cabecalhos?: Record<string, string>;
  // Sem `Origin` e sem `Content-Type` (para os testes de C-15).
  semOrigin?: boolean;
  semContentType?: boolean;
};

export function requisicao(op: OpRequisicao = {}): Request {
  const metodo = op.metodo ?? 'GET';
  const cabecalhos: Record<string, string> = { ...novoIp() };
  if (!op.semOrigin) cabecalhos.origin = URL_BASE;
  if (op.corpo !== undefined && !op.semContentType) cabecalhos['content-type'] = 'application/json';
  if (op.cookie) cabecalhos.cookie = op.cookie;
  if (op.bearer) cabecalhos.authorization = `Bearer ${op.bearer}`;
  Object.assign(cabecalhos, op.cabecalhos);
  const corpo = op.corpo === undefined ? undefined : typeof op.corpo === 'string' ? op.corpo : JSON.stringify(op.corpo);
  return new Request(`${URL_BASE}${op.caminho ?? '/api/teste'}`, { method: metodo, headers: cabecalhos, body: corpo });
}

export function chamarRota(h: HandlerRota, op: OpRequisicao & { params?: Record<string, string> } = {}): Promise<Response> {
  return h(requisicao(op), { params: Promise.resolve(op.params ?? {}) });
}

// ---- Teste que percorre todas as rotas (T13) ----

export const METODOS = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] as const;
export type Metodo = (typeof METODOS)[number];
const MUDAM_ESTADO: ReadonlySet<string> = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

export type AtorDeTeste =
  | { tipo: 'agente'; agente: Agente }
  | { tipo: 'pessoa'; papel: Papel; sem2fa?: boolean }
  | { tipo: 'integracao'; integracao: Integracao };

// Credenciais reais no banco do teste: um token de serviço por agente, um por integração (0.3.0) e, por papel, uma
// sessão com 2FA e outra sem.
export type Credenciais = {
  tokens: Record<Agente, string>;
  tokensIntegracao: Record<Integracao, string>;
  cookies: Record<Papel, string>;
  cookiesSem2fa: Record<Papel, string>;
};

export async function prepararCredenciais(deps: Deps): Promise<Credenciais> {
  const tokens = {} as Record<Agente, string>;
  for (const agente of AGENTES) {
    tokens[agente] = (await comTransacao(deps.pool, (t) => criarTokenServico(t, agente, deps.relogio))).token;
  }
  const tokensIntegracao = {} as Record<Integracao, string>;
  for (const integracao of INTEGRACOES) tokensIntegracao[integracao] = await tokenDeIntegracao(deps, integracao);
  const cookies = {} as Record<Papel, string>;
  const cookiesSem2fa = {} as Record<Papel, string>;
  for (const papel of PAPEIS) {
    cookies[papel] = (await criarPessoa(deps, { papel })).cookie;
    cookiesSem2fa[papel] = (await criarPessoa(deps, { papel, com2fa: false })).cookie;
  }
  return { tokens, tokensIntegracao, cookies, cookiesSem2fa };
}

// Caminho do padrão do App Router a partir do arquivo: src/app/api/demandas/[id]/route.ts → /api/demandas/[id]. Grupo
// de rota, como `(interno)`, não entra na URL.
export function padraoDaRota(arquivo: string): string {
  const segmentos = arquivo
    .replace(/^src\/app/, '')
    .replace(/\/route\.ts$/, '')
    .split('/')
    .filter((s) => s !== '' && !/^\(.*\)$/.test(s));
  return `/${segmentos.join('/')}`;
}

const caminhoCom = (padrao: string, params: Record<string, string>) =>
  padrao.replace(/\[(?:\.\.\.)?([A-Za-z]+)\]/g, (_, nome: string) => encodeURIComponent(params[nome] ?? 'x'));

// Requisição montada como o painel ou o agente mandaria: parâmetros de `meta.exemplo` (passam na regex), corpo `{}` em
// JSON nos métodos que mudam estado e a origem certa. Como `autorizar` vem antes do Zod e do banco em `rota()`, o corpo
// vazio não muda o 403 de quem a matriz nega.
function chamarComParametros(h: HandlerRota, metodo: Metodo, params: Record<string, string>, op: OpRequisicao = {}): Promise<Response> {
  return chamarRota(h, {
    metodo,
    caminho: caminhoCom(h.meta.rota, params),
    params,
    corpo: MUDAM_ESTADO.has(metodo) ? {} : undefined,
    ...op,
  });
}

function credencialDo(ator: AtorDeTeste, cred: Credenciais): OpRequisicao {
  switch (ator.tipo) {
    case 'agente':
      return { bearer: cred.tokens[ator.agente] };
    case 'integracao':
      return { bearer: cred.tokensIntegracao[ator.integracao] };
    case 'pessoa':
      return { cookie: (ator.sem2fa ? cred.cookiesSem2fa : cred.cookies)[ator.papel] };
    default:
      return atorDesconhecido(ator);
  }
}

export function chamarComo(h: HandlerRota, metodo: Metodo, ator: AtorDeTeste, cred: Credenciais): Promise<Response> {
  return chamarComParametros(h, metodo, h.meta.exemplo, credencialDo(ator, cred));
}

export function chamarSemCredencial(h: HandlerRota, metodo: Metodo): Promise<Response> {
  return chamarComParametros(h, metodo, h.meta.exemplo);
}

// Todo parâmetro de caminho trocado por `x`, fora de qualquer regex de id, e sem credencial: `rota()` responde 404
// antes de autenticar (C-17). Uma rota dinâmica declarada sem `params` responderia 401.
export function chamarComParametroInvalido(h: HandlerRota, metodo: Metodo): Promise<Response> {
  const params = Object.fromEntries(Object.keys(h.meta.exemplo).map((k) => [k, 'x']));
  return chamarComParametros(h, metodo, params);
}
