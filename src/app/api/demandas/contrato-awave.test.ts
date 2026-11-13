// RNF-08 e IN-15 (T06): a requisição exata da tool do Awave (awave-agents 0ab8ced) não quebra. Bearer, JSON, accept
// JSON, sem Origin e sem cookie; sucesso só 201 com id DEM; erros no formato { erro, mensagem }, nunca 3xx. Banco, rota
// e token reais; o token só nasce em tempo de teste e nunca vai a mensagem de expect.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as rotaDemanda from './[id]/route';
import * as rotaDemandas from './route';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { CORPO_DO_AWAVE, tokenDeIntegracao } from '../../../../test/integracoes';
import { URL_BASE } from '../../../../test/requisicao';

let b: BancoDeTeste;
let deps: Deps;
let token: string;

// Como a tool manda: Bearer, JSON, accept JSON, sem Origin e sem cookie.
function doAwave(op: { base?: string; cookie?: string; bearer?: string; corpo?: string } = {}): Request {
  const h: Record<string, string> = { authorization: `Bearer ${op.bearer ?? token}`, 'content-type': 'application/json', accept: 'application/json' };
  if (op.cookie) h.cookie = op.cookie;
  return new Request(`${op.base ?? URL_BASE}/api/demandas`, { method: 'POST', headers: h, body: op.corpo ?? JSON.stringify(CORPO_DO_AWAVE) });
}
const enviar = (req: Request) => rotaDemandas.POST(req, { params: Promise.resolve({}) });

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  token = await tokenDeIntegracao(deps, 'awave');
});
afterAll(async () => {
  definirDepsParaTeste(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('contrato do Awave', () => {
  it('CA-04.1, CA-09.1 e CA-07.4: 201 sem Origin, id DEM, status nova, as seis chaves', async () => {
    const r = await enviar(doAwave());
    expect(r.status).toBe(201);
    expect(r.headers.get('content-type')).toBe('application/json; charset=utf-8');
    const corpo = (await r.json()) as Record<string, unknown>;
    expect(corpo.id).toMatch(/^DEM-\d{8}-\d{4}$/);
    expect(corpo.status).toBe('nova');
    expect(Object.keys(corpo).sort()).toEqual(['andamento', 'atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo']);
    expect(corpo).toMatchObject({ titulo: CORPO_DO_AWAVE.titulo, tipo: 'melhoria' });
  });

  it('CA-07.4: as chaves e os valores do 201 são os mesmos do GET por id do Awave', async () => {
    const criado = (await (await enviar(doAwave())).json()) as { id: string };
    const lido = await rotaDemanda.GET(
      new Request(`${URL_BASE}/api/demandas/${criado.id}`, { headers: { authorization: `Bearer ${token}`, accept: 'application/json' } }),
      { params: Promise.resolve({ id: criado.id }) },
    );
    expect(lido.status).toBe(200);
    expect(await lido.json()).toEqual(criado);
  });

  it('CA-09.2: o mesmo pelo endereço interno http://orquestrador_app', async () => {
    const r = await enviar(doAwave({ base: 'http://orquestrador_app' }));
    expect(r.status).toBe(201);
    expect(((await r.json()) as { id: string }).id).toMatch(/^DEM-\d{8}-\d{4}$/);
  });

  it('CA-09.4: com um cookie qualquer e sem Origin, continua 403 (C-15)', async () => {
    const r = await enviar(doAwave({ cookie: 'qualquer=1' }));
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
  });

  it('CA-01.3: token que não existe → 401 com a mensagem de hoje', async () => {
    const r = await enviar(doAwave({ bearer: `wsod_${'A'.repeat(43)}` }));
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ erro: 'nao_autenticado', mensagem: MENSAGENS_ACESSO.token_invalido });
  });

  it('erros no formato { erro, mensagem }, nunca 3xx', async () => {
    const r = await enviar(doAwave({ corpo: '{"tipo":"outro"}' }));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual(expect.objectContaining({ erro: 'entrada_invalida', mensagem: expect.any(String) }));
    expect(r.headers.get('location')).toBeNull();
  });
});
