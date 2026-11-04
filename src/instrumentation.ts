// Boot do app (Next chama `register` uma vez, antes de atender). Confere a configuração (C-31, C-33): com segredo curto,
// URL inválida ou retenção fora de 1..365, o app não sobe, e o erro cita só o nome da variável. Depois liga o Sentry,
// que fica desligado sem DSN. Só no runtime Node: o Sentry e o pg não rodam no edge.
// M-05 (c): por último, console.error e console.warn passam a escrever só pelo log (console-saneado.ts). Fica depois da
// configuração para o erro de boot, que já cita só o nome da variável (C-31), seguir legível.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { lerConfigApp } = await import('./lib/env');
  const { iniciarSentry } = await import('./lib/sentry');
  const { instalarConsoleSaneado } = await import('./lib/console-saneado');
  lerConfigApp();
  iniciarSentry({ dsn: process.env.SENTRY_DSN || undefined });
  instalarConsoleSaneado();
}

// M-05 (C-21): erro não tratado de página, layout, metadados ou Server Component. O Next chama este gancho com o erro
// que ele mesmo vai registrar; aqui ele vai ao log por lista de permissão e ao Sentry pelo mesmo saneamento das rotas.
// - `rota` é o modelo da rota (`/demandas/[id]`), nunca o caminho da requisição, que traz id e query;
// - `erroId` é o `digest` do Next, o mesmo que a tela 2.8 (error.tsx) recebe; fora do formato, não entra;
// - nada de cabeçalho, cookie, caminho, mensagem, pilha, `cause` ou `params`.
// redirect() e notFound() chegam como erro de controle do Next e não são falha: ficam de fora.
type RequisicaoDoNext = { method?: unknown };
type ContextoDoNext = { routePath?: unknown };

const FORMATO_METODO = /^[A-Z]{1,10}$/;
// Modelo de rota do App Router: segmentos com letra, número, hífen, sublinhado, colchetes, ponto, parênteses e @.
const FORMATO_ROTA = /^\/[A-Za-z0-9_\-[\].()@/]{0,200}$/;
const CONTROLE_DO_NEXT = /^(NEXT_REDIRECT|NEXT_HTTP_ERROR_FALLBACK|NEXT_NOT_FOUND|DYNAMIC_SERVER_USAGE|BAILOUT_TO_CLIENT_SIDE_RENDERING)/;

const texto = (v: unknown, formato: RegExp): string | undefined => (typeof v === 'string' && formato.test(v) ? v : undefined);

// B-3 da revisão do 0011: o `digest` é lido por lerDigest, que não lança com getter nem com Proxy; o erro reduzido, por
// reduzirErro, que também não lança. Assim a linha do log e o envio ao Sentry sempre acontecem.
export async function onRequestError(err: unknown, request: RequisicaoDoNext, context: ContextoDoNext): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { lerDigest, reduzirErro } = await import('./lib/reduzir-erro');
  const digest = lerDigest(err);
  if (typeof digest === 'string' && CONTROLE_DO_NEXT.test(digest)) return;
  const { log, FORMATO_ERRO_ID } = await import('./lib/log');
  const { capturarErro } = await import('./lib/sentry');
  const metodo = texto(request?.method, FORMATO_METODO);
  const rota = texto(context?.routePath, FORMATO_ROTA);
  const erroId = texto(digest, FORMATO_ERRO_ID);
  log.error({
    evento: 'erro_requisicao',
    ...(metodo ? { metodo } : {}),
    ...(rota ? { rota } : {}),
    codigoErro: 'erro_interno',
    ...(erroId ? { erroId } : {}),
    // B-1 (0008): o erro já reduzido; valor que não é Error não atravessa o log como objeto.
    erro: reduzirErro(err),
  });
  capturarErro(err, { evento: 'erro_requisicao' });
}
