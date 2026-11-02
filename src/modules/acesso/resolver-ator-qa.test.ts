// T10, `resolverAtor` nos pontos que o roteiro do engenheiro não cobre (C-09): a recusa sem consultar banco nem Better
// Auth quando a credencial é ambígua, ausente ou fora do formato; a query nunca lida, nem com cookie de sessão; o
// cookie de sessão achado pelo nome exato em qualquer posição do cabeçalho; `Authorization` repetido; os quatro
// agentes; as mensagens exatas dos 401 (a sem credencial igual à de `exigirPessoa`, parecer 1 do 06-T10-tech-lead.md);
// e nada de token ou prefixo no log. Better Auth e banco reais (Testcontainers); só o `Date` é falso, preso ao relógio
// injetado.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { criarDepsDeTeste } from '../../../test/deps';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarPessoa } from '../../../test/sessao';
import { comTransacao } from '../../db/transacao';
import type { Db } from '../../db';
import type { Deps } from '../../lib/deps';
import { mapearErro } from '../../lib/erros';
import { substituirDestinoDoLog } from '../../lib/log';
import { relogioFixo } from '../../lib/relogio';
import { AGENTES, type Agente } from './ator';
import type { Auth } from './auth';
import { exigirPessoa } from './exigir-pessoa';
import { resolverAtor } from './resolver-ator';
import { criarTokenServico, revogarTokenServico } from './tokens-servico';

const INICIO = '2026-10-22T12:00:00Z';
const URL_BASE = 'http://127.0.0.1:3101';
const relogio = relogioFixo(INICIO);
const MENSAGEM_SEM_CREDENCIAL = 'Sua sessão terminou. Entre de novo para continuar.';
const MENSAGEM_TOKEN = 'Token de serviço inválido ou revogado.';

let b: BancoDeTeste;
let deps: Deps;
const tokens = {} as Record<Agente, { token: string; prefixo: string }>;
let cookieCto: string;
let usuarioCto: string;

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  for (const a of AGENTES) tokens[a] = await comTransacao(b.poolApp, (t) => criarTokenServico(t, a, relogio));
  // A sessão nasce no instante do relógio injetado, o mesmo em que cada teste roda.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(relogio.agora());
  try {
    const p = await criarPessoa(deps, { papel: 'cto' });
    cookieCto = p.cookie;
    usuarioCto = p.usuarioId;
  } finally {
    vi.useRealTimers();
  }
});
afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  relogio.definir(INICIO);
  vi.setSystemTime(relogio.agora());
});
afterEach(() => {
  vi.useRealTimers();
  substituirDestinoDoLog(null);
});

const req = (cabecalhos: HeadersInit = {}, caminho = '/api/demandas') => new Request(`${URL_BASE}${caminho}`, { headers: cabecalhos });
const falha = async (r: Request, d: Pick<Deps, 'db' | 'auth' | 'relogio'> = deps) => {
  try {
    await resolverAtor(r, d);
  } catch (e) {
    return mapearErro(e);
  }
  throw new Error('resolverAtor devia ter recusado');
};

// Dependências que falham em qualquer uso: o erro vira 500 no mapeador, e não 400 ou 401.
const USOU = 'SENTINELA-usou-dependencia';
const queFalha = <T>() =>
  new Proxy(
    {},
    {
      get() {
        throw new Error(USOU);
      },
    },
  ) as T;
const depsQueFalham = () => ({ db: queFalha<Db>(), auth: queFalha<Auth>(), relogio });

describe('recusa sem consultar banco nem Better Auth', () => {
  it('sem credencial, só com a query, só com cookie que não é sessão: 401 sem tocar nada', async () => {
    const t = tokens.risco.token;
    for (const r of [
      req(),
      req({}, `/api/demandas?token=${t}`),
      req({}, `/api/demandas?authorization=Bearer%20${t}`),
      req({ cookie: `token=${t}` }),
      req({ cookie: `wsod.session_data=x; wsod.two_factor=y` }),
    ])
      expect(await falha(r, depsQueFalham()), r.url).toEqual({
        status: 401,
        corpo: { erro: 'nao_autenticado', mensagem: MENSAGEM_SEM_CREDENCIAL },
      });
  });
  it('cookie de sessão e Authorization juntos: 400 antes de olhar o token ou a sessão', async () => {
    for (const authorization of [`Bearer ${tokens.risco.token}`, 'Bearer lixo', 'Basic eDp5', ''])
      expect(
        await falha(req({ cookie: 'wsod.session_token=x', authorization }), depsQueFalham()),
        authorization,
      ).toEqual({ status: 400, corpo: { erro: 'entrada_invalida', mensagem: 'Use só uma forma de autenticação.' } });
  });
  it('Authorization fora de Bearer ou com token fora do formato: 401 sem consultar o banco', async () => {
    for (const authorization of [
      'Basic eDp5',
      'Token wsod_x',
      `Bearer\t${tokens.risco.token}`,
      `Bearer  ${tokens.risco.token}`,
      `Bearer ${tokens.risco.token.slice(5)}`,
      'Bearer wsod_inventado',
      `Bearer wsod_${'A'.repeat(10_000)}`,
    ])
      expect(await falha(req({ authorization }), depsQueFalham()), authorization.slice(0, 30)).toEqual({
        status: 401,
        corpo: { erro: 'nao_autenticado', mensagem: MENSAGEM_TOKEN },
      });
  });
  it('controle: Bearer no formato certo consulta o banco, e cookie de sessão sozinho chama o Better Auth', async () => {
    await expect(resolverAtor(req({ authorization: `Bearer wsod_${'A'.repeat(43)}` }), depsQueFalham())).rejects.toThrow(USOU);
    await expect(resolverAtor(req({ cookie: 'wsod.session_token=x' }), depsQueFalham())).rejects.toThrow(USOU);
  });
});

describe('a query nunca autentica', () => {
  it('cookie de pessoa com token e authorization na query continua pessoa, sem 400', async () => {
    const t = tokens.risco.token;
    expect(await resolverAtor(req({ cookie: cookieCto }, `/api/demandas?authorization=Bearer%20${t}&token=${t}`), deps)).toEqual({
      tipo: 'pessoa',
      usuarioId: usuarioCto,
      nome: 'Pessoa Ficticia',
      papel: 'cto',
    });
  });
});

describe('cookie de sessão pelo nome exato', () => {
  it('em qualquer posição e com espaços, junto com Bearer: 400', async () => {
    for (const cookie of [
      `outro=1; wsod.session_token=x`,
      `outro=1;wsod.session_token=x;mais=2`,
      `outro=1;    wsod.session_token=x`,
      `wsod.session_token=`,
      `wsod.session_token`,
      `outro=1; __Secure-wsod.session_token=x`,
    ])
      expect(await falha(req({ cookie, authorization: `Bearer ${tokens.risco.token}` })), cookie).toMatchObject({
        status: 400,
        corpo: { erro: 'entrada_invalida' },
      });
  });
  it('nome parecido não é sessão: com Bearer válido, continua agente', async () => {
    for (const cookie of [
      'xwsod.session_token=1',
      'wsod.session_token_x=1',
      'WSOD.session_token=1',
      'wsod.Session_Token=1',
      '__Host-wsod.session_token=1',
      'wsod.session_data=1',
      'outro=wsod.session_token',
    ])
      expect(await resolverAtor(req({ cookie, authorization: `Bearer ${tokens.risco.token}` }), deps), cookie).toEqual({
        tipo: 'agente',
        agente: 'risco',
        prefixoToken: tokens.risco.prefixo,
      });
  });
});

describe('Authorization repetido', () => {
  it('dois cabeçalhos Bearer viram um valor só, que não autentica: 401', async () => {
    const h = new Headers();
    h.append('authorization', `Bearer ${tokens.risco.token}`);
    h.append('authorization', `Bearer ${tokens.risco.token}`);
    expect(await falha(req(h))).toEqual({ status: 401, corpo: { erro: 'nao_autenticado', mensagem: MENSAGEM_TOKEN } });
  });
});

describe('os quatro agentes', () => {
  it('cada token vira o seu agente, com o seu prefixo', async () => {
    for (const a of AGENTES)
      expect(await resolverAtor(req({ authorization: `Bearer ${tokens[a].token}` }), deps), a).toEqual({
        tipo: 'agente',
        agente: a,
        prefixoToken: tokens[a].prefixo,
      });
  });
});

describe('mensagens dos 401', () => {
  it('sem credencial: a mesma resposta de exigirPessoa sem sessão', async () => {
    let deExigir: unknown;
    try {
      await exigirPessoa(deps, new Headers());
    } catch (e) {
      deExigir = mapearErro(e);
    }
    const semCredencial = await falha(req());
    expect(semCredencial).toEqual(deExigir);
    expect(semCredencial).toEqual({ status: 401, corpo: { erro: 'nao_autenticado', mensagem: MENSAGEM_SEM_CREDENCIAL } });
  });
  it('token revogado, inventado e de outro esquema: a mesma resposta, só com código e mensagem', async () => {
    const t = await comTransacao(b.poolApp, (tx) => criarTokenServico(tx, 'risco', relogio));
    await comTransacao(b.poolApp, (tx) => revogarTokenServico(tx, t.prefixo, relogio));
    const respostas = await Promise.all(
      [`Bearer ${t.token}`, `Bearer wsod_${'C'.repeat(43)}`, `Basic ${t.token}`, t.token].map((authorization) =>
        falha(req({ authorization })),
      ),
    );
    for (const r of respostas) expect(r).toEqual({ status: 401, corpo: { erro: 'nao_autenticado', mensagem: MENSAGEM_TOKEN } });
  });
});

describe('log', () => {
  it('nenhum caminho do resolverAtor escreve token ou prefixo no log', async () => {
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    const t = await comTransacao(b.poolApp, (tx) => criarTokenServico(tx, 'consolidacao', relogio));
    await resolverAtor(req({ authorization: `Bearer ${t.token}` }), deps);
    await falha(req({ authorization: `Bearer ${t.token}`, cookie: cookieCto }));
    await falha(req({ cookie: `wsod.session_token=${t.token}` }));
    await falha(req({}, `/api/demandas?token=${t.token}`));
    await comTransacao(b.poolApp, (tx) => revogarTokenServico(tx, t.prefixo, relogio));
    await falha(req({ authorization: `Bearer ${t.token}` }));
    const saida = linhas.join('');
    expect(saida).not.toContain(t.token);
    expect(saida).not.toContain(t.token.slice(5));
    expect(saida).not.toContain(t.prefixo);
  });
});
