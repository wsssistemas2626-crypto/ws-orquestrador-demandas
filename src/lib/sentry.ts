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

// Só os quadros da pilha ("    at ..."), nunca a mensagem. O V8 começa o `stack` com o texto de
// `Error.prototype.toString` (nome e mensagem, que pode ter várias linhas, inclusive linhas que começam por "    at ").
// O cabeçalho sai pelo conteúdo conhecido, não pelo formato da linha. Se o `stack` não começar por ele (nome ou
// mensagem trocados depois do primeiro acesso ao `stack`), não sai quadro nenhum: só o título.
function quadrosDaPilha(e: unknown): string[] {
  try {
    if (!(e instanceof Error) || typeof e.stack !== 'string') return [];
    const cabecalho = `${Error.prototype.toString.call(e)}\n`;
    if (!e.stack.startsWith(cabecalho)) return [];
    return e.stack
      .slice(cabecalho.length)
      .split('\n')
      .filter((linha) => /^\s+at\s/.test(linha));
  } catch {
    return [];
  }
}

// B-a do 0008: o mesmo objeto de erro vai ao Sentry uma vez só. No Next 16.4.1, o erro que escapa de um route handler
// chega sem `digest` ao console.error e ao onRequestError, o mesmo objeto nos dois (ver console-saneado.ts). A marca é
// por objeto, e não por mensagem: dois erros distintos com a mesma mensagem vão os dois. Valor que não é objeto não é
// marcado e vai toda vez. WeakSet: a marca some com o erro, sem segurar memória.
// B-4 do 0010: a marca só é posta depois de `captureException` voltar. Se o envio lança, o objeto fica sem marca, e a
// próxima chamada com ele tenta de novo. Desde o B-3 da revisão do 0011, `reduzirErro` não lança (getter que lança e
// Proxy saem { classe: 'Error' } ou 'desconhecido'); só o envio pode lançar.
const jaEnviados = new WeakSet<object>();

export function capturarErro(e: unknown, contexto?: { evento: string }): void {
  const marcavel = e !== null && (typeof e === 'object' || typeof e === 'function');
  if (marcavel && jaEnviados.has(e)) return;
  const { classe, code } = reduzirErro(e);
  const titulo = `${classe}${code ? ` ${code}` : ''}`;
  const enviado = new Error(titulo);
  enviado.stack = [`Error: ${titulo}`, ...quadrosDaPilha(e)].join('\n');
  Sentry.captureException(enviado, contexto ? { tags: { evento: contexto.evento } } : undefined);
  if (marcavel) jaEnviados.add(e);
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
