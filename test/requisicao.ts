// Monta requisições de teste para os handlers de `rota()` (T11) e para o teste que percorre todas as rotas (T13):
// origem do painel, `Content-Type` JSON e um IP fictício por requisição, com cookie de pessoa ou Bearer de agente.
// O handler é chamado direto, como o Next chama, com os parâmetros de caminho numa Promise.
import type { HandlerRota } from '../src/lib/rota';
import { CONFIG_TESTE } from './auth';
import { novoIp } from './sessao';

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
