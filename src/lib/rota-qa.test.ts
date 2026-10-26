// Testes da etapa 06-T11-testes (qa-automacao): bordas de rota() que a construção não cobriu. CSRF em todo método que
// muda estado e nas origens parecidas com a do painel (C-15); a ordem das conferências, que a T13 usa para chegar ao
// 403 com corpo vazio (C-17, C-10); o limite de 512 KB exato; cabeçalhos da função em qualquer caixa (C-19); erro que
// não é Error e o Sentry só no 5xx (C-20); e a linha de log sem token, cookie, IP nem user-agent (C-21, RNF-10).
// Banco, Better Auth e tokens reais (Testcontainers); só o Sentry é trocado por um espião.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { criarDepsDeTeste } from '../../test/deps';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { chamarRota, URL_BASE } from '../../test/requisicao';
import { SENTINELAS, contemSentinela } from '../../test/sentinelas';
import { criarPessoa } from '../../test/sessao';
import { comTransacao } from '../db/transacao';
import { criarTokenServico } from '../modules/acesso/tokens-servico';
import { definirDepsParaTeste, type Deps } from './deps';
import { MENSAGEM_ERRO_INTERNO } from './erros';
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
let cookieSem2fa: string;
let tokenRisco: string;
let chamou = 0;
const linhas: string[] = [];

const ID = 'DEM-20261022-0001';
const ORIGEM_ESTRANHA = 'https://atacante.test';

// Ação só de pessoa, com corpo pequeno: o schema recusa o que passa de 10 caracteres.
const h = rota(
  { acao: 'alterar_demanda', rota: '/api/qa/[id]', params: paramId.demanda, corpo: z.object({ titulo: z.string().min(1).max(10) }) },
  async () => {
    chamou++;
    return { json: { ok: true } };
  },
);
// Ação que o agente `risco` pode fazer (criar_parecer_risco), para o caminho do Bearer.
const hAgente = rota(
  { acao: 'criar_parecer_risco', rota: '/api/qa/[id]/risco', params: paramId.demanda, corpo: z.object({ resumo: z.string() }) },
  async () => {
    chamou++;
    return { status: 201, json: { ok: true } };
  },
);
const hQuery = rota({ acao: 'listar_demandas', rota: '/api/qa', query: z.object({ status: z.string().optional() }) }, async (ctx) => {
  chamou++;
  return { json: ctx.query };
});

const comCorpo = (op: Parameters<typeof chamarRota>[1] = {}) =>
  chamarRota(h, { metodo: 'PATCH', caminho: `/api/qa/${ID}`, cookie, corpo: { titulo: 'x' }, params: { id: ID }, ...op });

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  cookie = (await criarPessoa(deps, { papel: 'cto' })).cookie;
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
  definirDepsParaTeste(deps);
  chamou = 0;
  linhas.length = 0;
  capturados.erros.length = 0;
});

const ultimaLinha = () => JSON.parse(linhas.at(-1)!) as Record<string, unknown>;

describe('rota() QA: C-15, CSRF em todo método que muda estado', () => {
  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('%s com cookie e Origin de outro site → 403, sem chamar a função', async (metodo) => {
    const r = await comCorpo({ metodo, cabecalhos: { origin: ORIGEM_ESTRANHA } });
    expect(r.status).toBe(403);
    expect(await r.json()).toMatchObject({ erro: 'sem_permissao' });
    expect(chamou).toBe(0);
  });
  it.each(['POST', 'PUT', 'DELETE'])('%s com cookie e sem Origin → 403', async (metodo) => {
    expect((await comCorpo({ metodo, semOrigin: true })).status).toBe(403);
    expect(chamou).toBe(0);
  });
  it('método em minúsculas ("patch", que o fetch não normaliza) também passa pela conferência', async () => {
    const req = new Request(`${URL_BASE}/api/qa/${ID}`, {
      method: 'patch',
      headers: { cookie, origin: ORIGEM_ESTRANHA, 'content-type': 'application/json' },
      body: '{"titulo":"x"}',
    });
    expect(req.method).toBe('patch');
    expect((await h(req, { params: Promise.resolve({ id: ID }) })).status).toBe(403);
    expect(chamou).toBe(0);
  });
  it.each([
    'http://127.0.0.1:3102',
    'https://127.0.0.1:3101',
    'http://localhost:3101',
    'http://127.0.0.1:3101.atacante.test',
    'http://127.0.0.1',
  ])('origem parecida com a do painel não passa: %s → 403', async (origin) => {
    expect((await comCorpo({ cabecalhos: { origin } })).status).toBe(403);
    expect(chamou).toBe(0);
  });
  it('qualquer cookie conta, não só o de sessão: cookie de preferência com Origin estranha → 403', async () => {
    expect((await comCorpo({ cookie: 'preferencia=escura', cabecalhos: { origin: ORIGEM_ESTRANHA } })).status).toBe(403);
  });
  it('agente só com Bearer, sem cookie e sem Origin, cria pelo POST JSON (cliente de servidor)', async () => {
    const r = await chamarRota(hAgente, {
      metodo: 'POST',
      caminho: `/api/qa/${ID}/risco`,
      bearer: tokenRisco,
      semOrigin: true,
      corpo: { resumo: 'Resumo ficticio' },
      params: { id: ID },
    });
    expect(r.status).toBe(201);
    expect(chamou).toBe(1);
  });
  it('agente só com Bearer e corpo que não é JSON → 415, sem chamar a função', async () => {
    const r = await chamarRota(hAgente, {
      metodo: 'POST',
      bearer: tokenRisco,
      semOrigin: true,
      corpo: 'resumo=x',
      cabecalhos: { 'content-type': 'application/x-www-form-urlencoded' },
      params: { id: ID },
    });
    expect(r.status).toBe(415);
    expect(chamou).toBe(0);
  });
  it('Content-Type "application/json-patch+json" não é JSON simples → 415', async () => {
    expect((await comCorpo({ cabecalhos: { 'content-type': 'application/json-patch+json' } })).status).toBe(415);
  });
});

describe('rota() QA: ordem das conferências', () => {
  it('id fora do formato → 404 sem tocar nos Deps (nem banco, nem sessão, nem configuração)', async () => {
    let acessos = 0;
    definirDepsParaTeste(
      new Proxy({} as Deps, {
        get() {
          acessos++;
          throw new Error('os Deps não deviam ser tocados');
        },
      }),
    );
    const r = await comCorpo({ params: { id: 'DEM-2026-1' }, cabecalhos: { origin: ORIGEM_ESTRANHA } });
    expect(r.status).toBe(404);
    expect(acessos).toBe(0);
    expect(chamou).toBe(0);
  });
  it('sem credencial e corpo de 600 KB → 401: o corpo não é lido antes da autenticação', async () => {
    const r = await comCorpo({ cookie: undefined, corpo: JSON.stringify({ titulo: 'a'.repeat(600 * 1024) }) });
    expect(r.status).toBe(401);
  });
  it('agente proibido com corpo fora do schema → 403, não 400 (a T13 conta com isso)', async () => {
    const r = await comCorpo({ cookie: undefined, bearer: tokenRisco, corpo: {} });
    expect(r.status).toBe(403);
    expect(await r.json()).toMatchObject({ erro: 'sem_permissao' });
  });
  it('pessoa sem 2FA com JSON quebrado → 403 sem_2fa, não 400', async () => {
    const r = await comCorpo({ cookie: cookieSem2fa, corpo: '{"titulo":' });
    expect(r.status).toBe(403);
    expect(await r.json()).toMatchObject({ erro: 'sem_2fa' });
  });
});

describe('rota() QA: C-17, limite de 512 KB exato', () => {
  // '{"titulo":"' + n letras + '"}' tem n + 13 bytes.
  const corpoDe = (bytes: number) => `{"titulo":"${'a'.repeat(bytes - 13)}"}`;
  it('corpo de exatamente 512 KB é lido (o schema recusa: 400, não 413)', async () => {
    const corpo = corpoDe(512 * 1024);
    expect(Buffer.byteLength(corpo)).toBe(524_288);
    const r = await comCorpo({ corpo });
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({ erro: 'entrada_invalida' });
  });
  it('um byte acima de 512 KB → 413 com a mensagem do limite', async () => {
    const r = await comCorpo({ corpo: corpoDe(512 * 1024 + 1) });
    expect(r.status).toBe(413);
    expect(await r.json()).toEqual({ erro: 'corpo_grande', mensagem: 'O conteúdo enviado passa do limite de 512 KB.' });
    expect(chamou).toBe(0);
  });
  it('chave repetida na query vira lista e o schema de texto recusa (sem poluição de parâmetro)', async () => {
    const r = await chamarRota(hQuery, { cookie, caminho: '/api/qa?status=triagem&status=aprovada' });
    expect(r.status).toBe(400);
    expect(chamou).toBe(0);
    const ok = await chamarRota(hQuery, { cookie, caminho: '/api/qa?status=triagem&outra=1' });
    expect(await ok.json()).toEqual({ status: 'triagem' });
  });
});

describe('rota() QA: C-19, cabeçalhos da função em qualquer caixa', () => {
  it('Cache-Control, Referrer-Policy e X-Content-Type-Options da função não trocam os seguros; CORS em qualquer caixa sai', async () => {
    const hCab = rota({ acao: 'ler_demanda', rota: '/api/qa/cabecalhos' }, async () => ({
      json: { ok: true },
      cabecalhos: {
        'Cache-Control': 'public, max-age=3600',
        'Referrer-Policy': 'unsafe-url',
        'X-Content-Type-Options': 'sniff',
        'Access-Control-Allow-Origin': '*',
        'ACCESS-CONTROL-ALLOW-CREDENTIALS': 'true',
        'X-Qa': 'mantido',
      },
    }));
    const r = await chamarRota(hCab, { cookie });
    expect(r.status).toBe(200);
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('referrer-policy')).toBe('no-referrer');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('x-qa')).toBe('mantido');
    for (const [k] of r.headers) expect(k.startsWith('access-control-'), k).toBe(false);
  });
  it('o 403 de CSRF e o 413 também saem com no-store, nosniff e no-referrer', async () => {
    for (const r of [
      await comCorpo({ cabecalhos: { origin: ORIGEM_ESTRANHA } }),
      await comCorpo({ corpo: `{"titulo":"${'a'.repeat(600 * 1024)}"}` }),
    ]) {
      expect(r.headers.get('cache-control')).toBe('no-store');
      expect(r.headers.get('x-content-type-options')).toBe('nosniff');
      expect(r.headers.get('referrer-policy')).toBe('no-referrer');
      expect(r.headers.get('content-type')).toMatch(/^application\/json/);
    }
  });
});

describe('rota() QA: C-20, erro', () => {
  it('valor lançado que não é Error (texto com sentinela) → 500 genérico, sem a sentinela na resposta nem no log', async () => {
    const hTexto = rota({ acao: 'ler_demanda', rota: '/api/qa/texto' }, async () => {
      throw SENTINELAS.texto;
    });
    const r = await chamarRota(hTexto, { cookie });
    expect(r.status).toBe(500);
    const texto = await r.text();
    expect(JSON.parse(texto)).toEqual({ erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO });
    expect(contemSentinela(texto)).toBe(false);
    expect(contemSentinela(linhas.join('\n'))).toBe(false);
    expect(capturados.erros).toHaveLength(1);
  });
  it('nenhum 4xx vai ao Sentry (400, 401, 403, 404, 413, 415)', async () => {
    const status = [
      (await comCorpo({ corpo: { titulo: 'texto longo demais' } })).status,
      (await comCorpo({ cookie: undefined })).status,
      (await comCorpo({ cabecalhos: { origin: ORIGEM_ESTRANHA } })).status,
      (await comCorpo({ params: { id: 'x' } })).status,
      (await comCorpo({ corpo: `{"titulo":"${'a'.repeat(600 * 1024)}"}` })).status,
      (await comCorpo({ cabecalhos: { 'content-type': 'text/plain' } })).status,
    ];
    expect(status).toEqual([400, 401, 403, 404, 413, 415]);
    expect(capturados.erros).toHaveLength(0);
  });
  it('a linha do 5xx sai como error (50) e a do 4xx como info (30)', async () => {
    const hFalha = rota({ acao: 'ler_demanda', rota: '/api/qa/falha' }, async () => {
      throw new Error('falha qualquer');
    });
    await chamarRota(hFalha, { cookie });
    expect(ultimaLinha()).toMatchObject({ level: 50, status: 500, codigoErro: 'erro_interno', atorTipo: 'pessoa' });
    await comCorpo({ cookie: undefined });
    expect(ultimaLinha()).toMatchObject({ level: 30, status: 401 });
  });
});

describe('rota() QA: C-21 e RNF-10, a linha de requisição não leva credencial nem dado do cliente', () => {
  it('token de agente inválido (sentinela) → 401, e o token não vai ao log', async () => {
    const r = await chamarRota(hQuery, { bearer: SENTINELAS.token, semOrigin: true, caminho: '/api/qa' });
    expect(r.status).toBe(401);
    expect(linhas.join('\n')).not.toContain(SENTINELAS.token);
    expect(ultimaLinha()).toMatchObject({ atorTipo: 'anonimo', codigoErro: 'nao_autenticado' });
  });
  it('o valor do cookie de sessão, o IP e o user-agent não vão ao log', async () => {
    const valorCookie = cookie.split(';').map((p) => p.trim().split('=').slice(1).join('=')).filter((v) => v.length > 8);
    expect(valorCookie.length).toBeGreaterThan(0);
    await comCorpo({ cabecalhos: { 'x-real-ip': '203.0.113.77', 'user-agent': SENTINELAS.texto } });
    expect(linhas).toHaveLength(1);
    const texto = linhas.join('\n');
    for (const v of valorCookie) expect(texto).not.toContain(v);
    expect(texto).not.toContain('203.0.113.77');
    expect(contemSentinela(texto)).toBe(false);
  });
  it('o 403 de CSRF registra a linha como anonimo, com o código, e sem a origem recebida', async () => {
    await comCorpo({ cabecalhos: { origin: ORIGEM_ESTRANHA } });
    expect(ultimaLinha()).toMatchObject({ evento: 'requisicao', status: 403, atorTipo: 'anonimo', codigoErro: 'sem_permissao' });
    expect(linhas.join('\n')).not.toContain('atacante.test');
  });
});
