// Sentry sem dado pessoal (C-21, D9). DSN ausente = desligado. Nunca envia o erro original: só a classe, o `code` e
// as linhas de pilha (arquivo, função, linha), sem a mensagem.
import * as Sentry from '@sentry/node';
import { reduzirErro } from './reduzir-erro';

type OpcoesSentry = { dsn?: string; transporte?: unknown };

export function iniciarSentry(op: OpcoesSentry): void {
  if (!op.dsn) return;
  Sentry.init({
    dsn: op.dsn,
    // Sem integrações padrão: nada de corpo, cabeçalho, usuário, console nem contexto do processo coletado sozinho.
    // A opção `sendDefaultPii` do plano não existe no tipo do @sentry/node 11.4.0; quem garante é o limparEvento.
    defaultIntegrations: false,
    transport: op.transporte as Sentry.NodeOptions['transport'],
    beforeSend: (evento) => limparEvento(evento),
    beforeSendTransaction: () => null,
    beforeBreadcrumb: () => null,
  });
}

// Só as linhas de quadro da pilha ("    at ..."): a mensagem, mesmo com várias linhas, fica de fora.
function quadrosDaPilha(e: unknown): string[] {
  if (!(e instanceof Error) || typeof e.stack !== 'string') return [];
  return e.stack.split('\n').filter((linha) => /^\s+at\s/.test(linha));
}

export function capturarErro(e: unknown, contexto?: { evento: string }): void {
  const { classe, code } = reduzirErro(e);
  const titulo = `${classe}${code ? ` ${code}` : ''}`;
  const enviado = new Error(titulo);
  enviado.stack = [`Error: ${titulo}`, ...quadrosDaPilha(e)].join('\n');
  Sentry.captureException(enviado, contexto ? { tags: { evento: contexto.evento } } : undefined);
}

// beforeSend: apaga tudo o que pode trazer corpo, cabeçalho, cookie, query, usuário ou contexto da resposta.
export function limparEvento<T extends object>(evento: T): T {
  const ev = evento as Record<string, unknown>;
  const request = ev.request as Record<string, unknown> | undefined;
  if (request && typeof request === 'object') {
    delete request.data;
    delete request.cookies;
    delete request.headers;
    delete request.query_string;
    delete request.env;
    if (typeof request.url === 'string') request.url = request.url.split(/[?#]/)[0];
  }
  delete ev.extra;
  delete ev.user;
  delete ev.breadcrumbs;
  const contexts = ev.contexts as Record<string, unknown> | undefined;
  if (contexts && typeof contexts === 'object') delete contexts.response;
  return evento;
}
