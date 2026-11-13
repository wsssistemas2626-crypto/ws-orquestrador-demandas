// Adaptador único das rotas da API (G3.6). Toda route.ts, fora de auth e saúde, exporta `rota(...)`; o teste que
// percorre as rotas (T13) lê o `meta` de cada handler. Ordem, de propósito, da mais barata para a mais cara, e nada toca
// o banco antes de a entrada estar no formato:
//   1. parâmetros de caminho pela regex (C-17): fora do formato, 404 sem consulta;
//   2. CSRF (C-15): com cookie e método que muda estado, `Origin` igual à de BETTER_AUTH_URL (403) e corpo JSON (415);
//   3. resolverAtor (C-09) e autorizar (C-10, C-12);
//   4. query e corpo (lerCorpoJson, 512 KB, C-17) pelo Zod, sem chave desconhecida (C-11);
//   5. a função, e a resposta com no-store, nosniff, no-referrer e sem CORS (C-19).
// Erro só por mapearErro (C-20); 5xx vai ao Sentry reduzido. Sempre uma linha de log por requisição, só com os campos
// da lista (C-21): a rota é o padrão (`/api/demandas/[id]`), nunca o caminho com o id nem a query.
import { z, type ZodType } from 'zod';
import type { Ator } from '../modules/acesso/ator';
import { autorizar, type Acao } from '../modules/acesso/matriz';
import { MENSAGENS_ACESSO } from '../modules/acesso/mensagens';
import { resolverAtor } from '../modules/acesso/resolver-ator';
import { lerCorpoJson } from './corpo';
import { obterDeps, type Deps } from './deps';
import { deZod, ErroDominio, mapearErro, MENSAGEM_NAO_ENCONTRADO } from './erros';
import { log } from './log';
import { capturarErro } from './sentry';

export const RE_ID_DEMANDA = /^DEM-\d{8}-\d{4}$/;
export type PrefixoVersao = 'ESP' | 'RSK' | 'DEC';
const RE_ID_VERSAO: Record<PrefixoVersao, RegExp> = {
  ESP: /^ESP-DEM-\d{8}-\d{4}-v\d{1,4}$/,
  RSK: /^RSK-DEM-\d{8}-\d{4}-v\d{1,4}$/,
  DEC: /^DEC-DEM-\d{8}-\d{4}-v\d{1,4}$/,
};
export const reIdVersao = (prefixo: PrefixoVersao): RegExp => RE_ID_VERSAO[prefixo];

type NomeParamVersao = 'espId' | 'rskId' | 'decId';

export const paramId = {
  demanda: z.object({ id: z.string().regex(RE_ID_DEMANDA) }),
  versao: <N extends NomeParamVersao>(nome: N, prefixo: PrefixoVersao) =>
    z.object({ [nome]: z.string().regex(reIdVersao(prefixo)) } as Record<N, z.ZodString>),
};

export type RespostaRota = { status?: number; json?: unknown; texto?: string; cabecalhos?: Record<string, string> };
export type MetaRota = { acao: Acao; rota: string; exemplo: Record<string, string> };
export type HandlerRota = ((req: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>) & {
  meta: MetaRota;
};
export type OpRota<P, Q, C> = {
  acao: Acao;
  rota: string;
  params?: ZodType<P>;
  query?: ZodType<Q>;
  corpo?: ZodType<C>;
  exemplo?: Record<string, string>;
  // ADR-33 (0.4.0): com a opção, a falha do Zod **do corpo** vira este erro, sem `campos` (o caminho de uma chave a mais
  // seria eco). Sem ela, nada muda. Só a rota do andamento usa.
  corpoInvalido?: { codigo: 'nao_processavel'; mensagem: string };
};
export type ContextoRota<P, Q, C> = { ator: Ator; params: P; query: Q; corpo: C; req: Request; deps: Deps };

const METODOS_QUE_MUDAM = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

// Valem sobre qualquer cabeçalho que a função devolva: nenhuma rota abre cache nem CORS.
const CABECALHOS_SEGUROS: Record<string, string> = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
};

// Exemplo de parâmetros que passa na regex, para o teste que percorre as rotas (T13) chegar até a autorização.
const EXEMPLO_DO_PARAMETRO: Record<string, string> = {
  id: 'DEM-20261022-0001',
  espId: 'ESP-DEM-20261022-0001-v1',
  rskId: 'RSK-DEM-20261022-0001-v1',
  decId: 'DEC-DEM-20261022-0001-v1',
  agente: 'risco',
};

function exemploDaRota(padrao: string): Record<string, string> {
  const exemplo: Record<string, string> = {};
  for (const [, nome] of padrao.matchAll(/\[([A-Za-z]+)\]/g)) if (nome) exemplo[nome] = EXEMPLO_DO_PARAMETRO[nome] ?? 'x';
  return exemplo;
}

const naoEncontrado = () => new ErroDominio('nao_encontrado', MENSAGEM_NAO_ENCONTRADO);

function validar<T>(schema: ZodType<T>, valor: unknown): T {
  const r = schema.safeParse(valor);
  if (!r.success) throw deZod(r.error);
  return r.data;
}

function validarCorpo<C>(schema: ZodType<C>, valor: unknown, invalido: OpRota<unknown, unknown, C>['corpoInvalido']): C {
  if (!invalido) return validar(schema, valor);
  const r = schema.safeParse(valor);
  if (!r.success) throw new ErroDominio(invalido.codigo, invalido.mensagem);
  return r.data;
}

const ehJson = (req: Request) =>
  (req.headers.get('content-type') ?? '').split(';')[0]!.trim().toLowerCase() === 'application/json';

// C-15. Qualquer cookie conta: o navegador manda o cookie sozinho, e é aí que mora o CSRF. Só Bearer, sem cookie,
// não precisa de `Origin` (cliente de servidor), mas corpo declarado continua só em JSON.
function conferirCsrf(req: Request, origemPermitida: string, temCorpo: boolean): void {
  if (!METODOS_QUE_MUDAM.has(req.method.toUpperCase())) return;
  if (req.headers.has('cookie')) {
    if (req.headers.get('origin') !== origemPermitida) throw new ErroDominio('sem_permissao', MENSAGENS_ACESSO.sem_permissao);
    if (!ehJson(req)) throw new ErroDominio('tipo_nao_suportado', 'O conteúdo enviado precisa estar em JSON.');
    return;
  }
  if (temCorpo && !ehJson(req)) throw new ErroDominio('tipo_nao_suportado', 'O conteúdo enviado precisa estar em JSON.');
}

// Chave repetida na query vira lista; o schema decide se aceita.
function lerQuery(req: Request): Record<string, string | string[]> {
  const saida: Record<string, string | string[]> = {};
  for (const [k, v] of new URL(req.url).searchParams) {
    const atual = saida[k];
    saida[k] = atual === undefined ? v : Array.isArray(atual) ? [...atual, v] : [atual, v];
  }
  return saida;
}

function cabecalhosDaResposta(extras?: Record<string, string>): Headers {
  const h = new Headers();
  for (const [k, v] of Object.entries(extras ?? {})) if (!k.toLowerCase().startsWith('access-control-')) h.set(k, v);
  for (const [k, v] of Object.entries(CABECALHOS_SEGUROS)) h.set(k, v);
  return h;
}

function montarResposta(r: RespostaRota): Response {
  const h = cabecalhosDaResposta(r.cabecalhos);
  if (r.json !== undefined) {
    if (!h.has('content-type')) h.set('content-type', 'application/json; charset=utf-8');
    return new Response(JSON.stringify(r.json), { status: r.status ?? 200, headers: h });
  }
  if (r.texto !== undefined) {
    if (!h.has('content-type')) h.set('content-type', 'text/plain; charset=utf-8');
    return new Response(r.texto, { status: r.status ?? 200, headers: h });
  }
  return new Response(null, { status: r.status ?? 204, headers: h });
}

export function rota<P = undefined, Q = undefined, C = undefined>(
  op: OpRota<P, Q, C>,
  fn: (ctx: ContextoRota<P, Q, C>) => Promise<RespostaRota>,
): HandlerRota {
  const handler = async (req: Request, ctx: { params: Promise<Record<string, string>> }): Promise<Response> => {
    const inicio = performance.now();
    let atorTipo: Ator['tipo'] | 'anonimo' = 'anonimo';
    let codigoErro: string | undefined;
    let resposta: Response;
    try {
      let params = undefined as P;
      if (op.params) {
        const r = op.params.safeParse(await ctx.params);
        if (!r.success) throw naoEncontrado();
        params = r.data;
      }
      const deps = await obterDeps();
      conferirCsrf(req, deps.config.urlBase, op.corpo !== undefined);
      const ator = await resolverAtor(req, deps);
      atorTipo = ator.tipo;
      autorizar(ator, op.acao);
      const query = (op.query ? validar(op.query, lerQuery(req)) : undefined) as Q;
      const corpo = (op.corpo ? validarCorpo(op.corpo, await lerCorpoJson(req), op.corpoInvalido) : undefined) as C;
      resposta = montarResposta(await fn({ ator, params, query, corpo, req, deps }));
    } catch (e) {
      const { status, corpo } = mapearErro(e);
      codigoErro = corpo.erro;
      if (status >= 500) capturarErro(e, { evento: 'requisicao' });
      resposta = new Response(JSON.stringify(corpo), {
        status,
        headers: cabecalhosDaResposta({ 'content-type': 'application/json; charset=utf-8' }),
      });
    }
    const linha = {
      evento: 'requisicao',
      metodo: req.method,
      rota: op.rota,
      status: resposta.status,
      ms: Math.round(performance.now() - inicio),
      atorTipo,
      ...(codigoErro ? { codigoErro } : {}),
    };
    if (resposta.status >= 500) log.error(linha);
    else log.info(linha);
    return resposta;
  };
  return Object.assign(handler, { meta: { acao: op.acao, rota: op.rota, exemplo: op.exemplo ?? exemploDaRota(op.rota) } });
}
