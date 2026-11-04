// rota(): o adaptador de toda rota da API (C-15, C-17, C-19, C-20, C-21). Better Auth, tokens e banco reais
// (Testcontainers); só o Sentry é trocado por um espião, para conferir que só o 5xx vai para ele.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { criarDepsDeTeste } from '../../test/deps';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { chamarRota, requisicao } from '../../test/requisicao';
import { SENTINELAS, contemSentinela } from '../../test/sentinelas';
import { criarPessoa } from '../../test/sessao';
import { comTransacao } from '../db/transacao';
import { criarTokenServico } from '../modules/acesso/tokens-servico';
import { definirDepsParaTeste, type Deps } from './deps';
import { ErroDominio, MENSAGEM_ERRO_INTERNO } from './erros';
import { substituirDestinoDoLog } from './log';
import { paramId, rota } from './rota';

const capturados = vi.hoisted(() => ({ erros: [] as unknown[] }));
vi.mock('./sentry', () => ({
  capturarErro: (e: unknown) => {
    capturados.erros.push(e);
  },
}));

let b: BancoDeTeste;
let deps: Deps;
let cookie: string;
let cookieAdm: string;
let cookieSem2fa: string;
let tokenRisco: string;
let chamou = 0;
let recebido: unknown;
const linhas: string[] = [];

const h = rota(
  {
    acao: 'alterar_demanda',
    rota: '/api/teste/[id]',
    params: paramId.demanda,
    corpo: z.object({ titulo: z.string().min(1).max(10) }),
  },
  async (ctx) => {
    chamou++;
    recebido = ctx;
    return { json: { ok: true, titulo: ctx.corpo.titulo } };
  },
);
const hLeitura = rota(
  { acao: 'ler_demanda', rota: '/api/teste/[id]', params: paramId.demanda, query: z.object({ pagina: z.coerce.number().int().min(1).optional() }) },
  async (ctx) => {
    chamou++;
    return { json: { pagina: ctx.query.pagina ?? 1, id: ctx.params.id } };
  },
);
const hPedido = rota({ acao: 'gerar_pedido_construcao', rota: '/api/teste/[decId]/pedido', params: paramId.versao('decId', 'DEC') }, async () => ({
  status: 201,
  texto: '{"pedido":true}',
  cabecalhos: {
    'content-type': 'application/json; charset=utf-8',
    'content-disposition': 'attachment; filename="pedido.json"',
    'cache-control': 'public, max-age=3600',
    'access-control-allow-origin': '*',
  },
}));
const hFalha = (erro: unknown) =>
  rota({ acao: 'ler_demanda', rota: '/api/teste/falha' }, async () => {
    throw erro;
  });

const ID = 'DEM-20261022-0001';
const patch = (op: Parameters<typeof chamarRota>[1] = {}) =>
  chamarRota(h, { metodo: 'PATCH', caminho: `/api/teste/${ID}`, cookie, corpo: { titulo: 'x' }, params: { id: ID }, ...op });

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  cookie = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  cookieAdm = (await criarPessoa(deps, { papel: 'administradora' })).cookie;
  cookieSem2fa = (await criarPessoa(deps, { papel: 'cto', com2fa: false })).cookie;
  tokenRisco = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'risco', deps.relogio))).token;
  substituirDestinoDoLog({
    write: (l) => {
      linhas.push(l);
    },
  });
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});
beforeEach(() => {
  chamou = 0;
  recebido = undefined;
  linhas.length = 0;
  capturados.erros.length = 0;
});

const ultimaLinha = () => JSON.parse(linhas.at(-1)!) as Record<string, unknown>;

describe('rota(): C-15, CSRF', () => {
  it('Origin de outro site → 403, sem chamar a função', async () => {
    const r = await patch({ cabecalhos: { origin: 'https://atacante.test' } });
    expect(r.status).toBe(403);
    expect(await r.json()).toMatchObject({ erro: 'sem_permissao' });
    expect(chamou).toBe(0);
  });
  it('sem Origin, com cookie → 403', async () => {
    expect((await patch({ semOrigin: true })).status).toBe(403);
    expect(chamou).toBe(0);
  });
  it('Origin "null" → 403', async () => {
    expect((await patch({ cabecalhos: { origin: 'null' } })).status).toBe(403);
  });
  it('Content-Type que não é JSON → 415', async () => {
    const r = await patch({ cabecalhos: { 'content-type': 'text/plain' } });
    expect(r.status).toBe(415);
    expect(await r.json()).toMatchObject({ erro: 'tipo_nao_suportado' });
    expect(chamou).toBe(0);
  });
  it('sem Content-Type → 415', async () => {
    expect((await patch({ semContentType: true })).status).toBe(415);
  });
  it('application/json com charset passa', async () => {
    expect((await patch({ cabecalhos: { 'content-type': 'application/json; charset=utf-8' } })).status).toBe(200);
  });
  it('só Bearer, sem cookie e sem Origin, não precisa de Origin', async () => {
    const r = await chamarRota(hLeitura, { metodo: 'GET', caminho: `/api/teste/${ID}`, bearer: tokenRisco, semOrigin: true, params: { id: ID } });
    expect(r.status).toBe(200);
  });
  it('GET com cookie e sem Origin passa (não muda estado)', async () => {
    const r = await chamarRota(hLeitura, { metodo: 'GET', caminho: `/api/teste/${ID}`, cookie, semOrigin: true, params: { id: ID } });
    expect(r.status).toBe(200);
  });
  it('a conferência de origem vem antes da autenticação: cookie inválido com origem estranha → 403', async () => {
    expect((await patch({ cookie: 'wsod.session_token=inventado', cabecalhos: { origin: 'https://atacante.test' } })).status).toBe(403);
  });
});

describe('rota(): C-17, entrada', () => {
  it('corpo de 600 KB → 413, sem chamar a função', async () => {
    const r = await patch({ corpo: JSON.stringify({ titulo: 'a'.repeat(600 * 1024) }) });
    expect(r.status).toBe(413);
    expect(chamou).toBe(0);
  });
  it('id fora do formato → 404, sem chamar a função nem autenticar', async () => {
    const r = await patch({ params: { id: "1' or '1'='1" }, cookie: undefined });
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({
      erro: 'nao_encontrado',
      mensagem: 'Confira o endereço ou o id. A demanda, a versão ou o pacote podem não existir.',
    });
    expect(chamou).toBe(0);
  });
  it('id de versão pela regex do prefixo: ESP no lugar de DEC → 404', async () => {
    const r = await chamarRota(hPedido, { metodo: 'POST', cookie, corpo: {}, params: { decId: 'ESP-DEM-20261022-0001-v1' } });
    expect(r.status).toBe(404);
  });
  it('corpo fora do schema → 400 com campos em pt-BR, sem o valor recebido', async () => {
    const r = await patch({ corpo: { titulo: SENTINELAS.texto } });
    expect(r.status).toBe(400);
    const corpo = await r.json();
    expect(corpo).toEqual({
      erro: 'entrada_invalida',
      mensagem: 'Corrija os campos abaixo para continuar.',
      campos: [{ campo: 'titulo', mensagem: 'Este campo aceita até 10 caracteres.' }],
    });
    expect(chamou).toBe(0);
  });
  it('JSON quebrado → 400', async () => {
    expect((await patch({ corpo: '{"titulo":' })).status).toBe(400);
  });
  it('chave desconhecida no corpo é descartada (C-11)', async () => {
    await patch({ corpo: { titulo: 'x', autorTipo: 'pessoa', rascunhoAgente: false } });
    expect((recebido as { corpo: unknown }).corpo).toEqual({ titulo: 'x' });
  });
  it('query validada pelo schema: inválida → 400; válida chega convertida', async () => {
    const base = { metodo: 'GET', cookie, params: { id: ID } };
    expect((await chamarRota(hLeitura, { ...base, caminho: `/api/teste/${ID}?pagina=0` })).status).toBe(400);
    const r = await chamarRota(hLeitura, { ...base, caminho: `/api/teste/${ID}?pagina=3` });
    expect(await r.json()).toEqual({ pagina: 3, id: ID });
  });
  it('a função recebe o ator, os parâmetros validados e os deps', async () => {
    await patch({});
    expect(recebido).toMatchObject({ ator: { tipo: 'pessoa', papel: 'cto' }, params: { id: ID }, corpo: { titulo: 'x' }, deps });
  });
});

describe('rota(): autenticação e autorização', () => {
  it('sem credencial → 401', async () => {
    const r = await patch({ cookie: undefined });
    expect(r.status).toBe(401);
    expect(await r.json()).toMatchObject({ erro: 'nao_autenticado' });
  });
  it('pessoa sem 2FA → 403 sem_2fa', async () => {
    const r = await patch({ cookie: cookieSem2fa });
    expect(r.status).toBe(403);
    expect(await r.json()).toMatchObject({ erro: 'sem_2fa' });
    expect(chamou).toBe(0);
  });
  it('agente em ação sem agente na matriz → 403, sem chamar a função', async () => {
    const r = await patch({ cookie: undefined, bearer: tokenRisco });
    expect(r.status).toBe(403);
    expect(await r.json()).toMatchObject({ erro: 'sem_permissao' });
    expect(chamou).toBe(0);
  });
  it('administradora em ação só de cto → 403', async () => {
    const hTeto = rota({ acao: 'alterar_teto', rota: '/api/teste/teto' }, async () => ({ status: 204 }));
    expect((await chamarRota(hTeto, { metodo: 'PUT', cookie: cookieAdm, corpo: {} })).status).toBe(403);
    expect((await chamarRota(hTeto, { metodo: 'PUT', cookie, corpo: {} })).status).toBe(204);
  });
  it('cookie e Bearer juntos → 400', async () => {
    expect((await patch({ bearer: tokenRisco })).status).toBe(400);
  });
});

describe('rota(): C-19, cabeçalhos', () => {
  const conferir = (r: Response) => {
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('referrer-policy')).toBe('no-referrer');
    for (const [k] of r.headers) expect(k.startsWith('access-control-'), k).toBe(false);
  };
  it('resposta de sucesso com no-store, nosniff, no-referrer e sem CORS', async () => {
    const r = await patch({});
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toMatch(/^application\/json/);
    conferir(r);
  });
  it('resposta de erro com os mesmos cabeçalhos', async () => {
    conferir(await patch({ cookie: undefined }));
    conferir(await patch({ params: { id: 'x' } }));
  });
  it('status, texto e cabeçalhos da função valem, mas não trocam no-store nem abrem CORS', async () => {
    const r = await chamarRota(hPedido, { metodo: 'POST', cookie, corpo: {}, params: { decId: 'DEC-DEM-20261022-0001-v1' } });
    expect(r.status).toBe(201);
    expect(r.headers.get('content-disposition')).toBe('attachment; filename="pedido.json"');
    expect(r.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(await r.text()).toBe('{"pedido":true}');
    conferir(r);
  });
  it('sem json nem texto → 204 sem corpo', async () => {
    const h204 = rota({ acao: 'ler_demanda', rota: '/api/teste/vazio' }, async () => ({}));
    const r = await chamarRota(h204, { cookie });
    expect(r.status).toBe(204);
    expect(await r.text()).toBe('');
  });
});

describe('rota(): C-20, erro', () => {
  it('ErroDominio vira o status do código, com a mensagem', async () => {
    const r = await chamarRota(hFalha(new ErroDominio('conflito', 'A demanda mudou.')), { cookie });
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ erro: 'conflito', mensagem: 'A demanda mudou.' });
    expect(capturados.erros).toHaveLength(0);
  });
  it('erro do banco → 500 genérico, sem a mensagem do Postgres, e vai ao Sentry', async () => {
    const hBanco = rota({ acao: 'ler_demanda', rota: '/api/teste/banco' }, async ({ deps: d }) => {
      await d.pool.query('select * from tabela_inexistente where x = $1', [SENTINELAS.texto]);
      return {};
    });
    const r = await chamarRota(hBanco, { cookie });
    expect(r.status).toBe(500);
    const texto = await r.text();
    expect(JSON.parse(texto)).toEqual({ erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO });
    expect(texto).not.toContain('tabela_inexistente');
    expect(capturados.erros).toHaveLength(1);
    expect(contemSentinela(linhas.join('\n'))).toBe(false);
  });

  // B-3 da revisão do 0011 (DEC-DEM-20261104-0012-v1): o erro com getter que lança, ou o Proxy de getPrototypeOf que
  // lança (que passa por mapearErro), não escapa do handler: 500 genérico com os cabeçalhos da rota, a linha da
  // requisição no log e o erro no Sentry. Erros e armadilhas fictícios.
  const lanca = () => {
    throw new Error('getter fictício');
  };
  it.each([
    ['Error com getter de name que lança', () => Object.defineProperty(new Error('falha fictícia'), 'name', { get: lanca })],
    ['Proxy com getPrototypeOf que lança', () => new Proxy(new Error('falha fictícia'), { getPrototypeOf: lanca })],
  ])('B-3 do 0011: %s → 500, linha da requisição e Sentry', async (_nome, criar) => {
    const erro = criar();
    const r = await chamarRota(hFalha(erro), { cookie });
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO });
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('referrer-policy')).toBe('no-referrer');
    expect(ultimaLinha()).toMatchObject({ evento: 'requisicao', status: 500, codigoErro: 'erro_interno' });
    expect(capturados.erros).toHaveLength(1);
    expect(capturados.erros[0] === erro).toBe(true);
  });
});

describe('rota(): C-21, linha de requisição', () => {
  it('uma linha só com os campos da lista', async () => {
    await patch({});
    expect(linhas).toHaveLength(1);
    const ultima = ultimaLinha();
    expect(Object.keys(ultima).filter((k) => !['level', 'time', 'msg'].includes(k)).sort()).toEqual([
      'atorTipo',
      'evento',
      'metodo',
      'ms',
      'rota',
      'status',
    ]);
    expect(ultima).toMatchObject({ evento: 'requisicao', metodo: 'PATCH', rota: '/api/teste/[id]', status: 200, atorTipo: 'pessoa' });
    expect(typeof ultima.ms).toBe('number');
  });
  it('erro leva o código; sem ator resolvido, atorTipo anonimo', async () => {
    await patch({ cookie: undefined });
    expect(ultimaLinha()).toMatchObject({ evento: 'requisicao', status: 401, codigoErro: 'nao_autenticado', atorTipo: 'anonimo' });
  });
  it('agente aparece como atorTipo agente, e a linha não tem o token', async () => {
    await chamarRota(hLeitura, { bearer: tokenRisco, semOrigin: true, caminho: `/api/teste/${ID}`, params: { id: ID } });
    expect(ultimaLinha()).toMatchObject({ atorTipo: 'agente', status: 200 });
    expect(linhas.join('\n')).not.toContain(tokenRisco);
  });
  it('a rota do log é o padrão, nunca o caminho com id nem a query', async () => {
    await chamarRota(hLeitura, { cookie, caminho: `/api/teste/${ID}?email=${SENTINELAS.email}`, params: { id: ID } });
    const texto = linhas.join('\n');
    expect(texto).not.toContain(ID);
    expect(contemSentinela(texto)).toBe(false);
  });
  it('corpo com sentinelas que falha na validação não deixa rastro no log', async () => {
    await patch({ corpo: { titulo: SENTINELAS.nome, email: SENTINELAS.email } });
    expect(contemSentinela(linhas.join('\n'))).toBe(false);
  });
});

describe('rota(): meta para o teste da matriz (T13)', () => {
  it('guarda a ação, a rota e um exemplo de parâmetros que passa na regex', () => {
    expect(h.meta).toEqual({ acao: 'alterar_demanda', rota: '/api/teste/[id]', exemplo: { id: 'DEM-20261022-0001' } });
    expect(hPedido.meta.exemplo).toEqual({ decId: 'DEC-DEM-20261022-0001-v1' });
  });
  it('exemplo explícito vale', () => {
    const hx = rota({ acao: 'alterar_agente', rota: '/api/agentes/[agente]', exemplo: { agente: 'risco' } }, async () => ({}));
    expect(hx.meta.exemplo).toEqual({ agente: 'risco' });
  });
  it('a requisição do ajudante tem origem e IP fictício', () => {
    const r = requisicao({ metodo: 'POST', corpo: {} });
    expect(r.headers.get('origin')).toBe('http://127.0.0.1:3101');
    expect(r.headers.get('x-real-ip')).toMatch(/^(192\.0\.2|203\.0\.113)\./);
  });
});
