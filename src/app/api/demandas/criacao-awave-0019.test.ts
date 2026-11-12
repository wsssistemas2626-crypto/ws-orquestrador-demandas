// DEC-DEM-20261112-0019-v1, 03-correcao, M-2 e M-3 pela rota: o 201 do POST do Awave sai de dentro da transação orçada
// (obterDemandaDaIntegracao com a transação), e qualquer estouro nela, inclusive o prazo total, vira o 503 fixo sem
// gravar nada; a pessoa com a mesma carga não recebe 503. A leitura da vista e o limite são embrulhados (vi.mock
// parcial) só para provocar a falha no ponto certo; o resto é rota, token e Postgres reais. Dados fictícios.
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const ganchos = vi.hoisted(() => ({ depoisDoLimite: null as null | (() => void) }));

vi.mock('../../../modules/demandas/consultas', async (importOriginal) => {
  const m = await importOriginal<typeof import('../../../modules/demandas/consultas')>();
  return { ...m, obterDemandaDaIntegracao: vi.fn(m.obterDemandaDaIntegracao) };
});
vi.mock('../../../modules/limites', async (importOriginal) => {
  const m = await importOriginal<typeof import('../../../modules/limites')>();
  return {
    ...m,
    conferirLimite: async (...a: Parameters<typeof m.conferirLimite>) => {
      await m.conferirLimite(...a);
      ganchos.depoisDoLimite?.();
    },
  };
});

import * as rotaDemandas from './route';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo } from '../../../lib/relogio';
import { obterDemandaDaIntegracao } from '../../../modules/demandas/consultas';
import { MENSAGEM_INDISPONIVEL } from '../../../modules/integracoes/tempo-limite';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { CORPO_DO_AWAVE, tokenDeIntegracao } from '../../../../test/integracoes';
import { chamarRota } from '../../../../test/requisicao';
import { criarPessoa } from '../../../../test/sessao';

const MINUTO = 60_000;
const relogio = relogioFixo('2026-11-12T12:00:00Z');
let b: BancoDeTeste;
let deps: Deps;
let token: string;
let cookie: string;

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  token = await tokenDeIntegracao(deps, 'awave');
  cookie = (await criarPessoa(deps, { papel: 'cto' })).cookie;
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});
afterEach(() => {
  ganchos.depoisDoLimite = null;
  vi.mocked(obterDemandaDaIntegracao).mockClear();
  vi.restoreAllMocks();
  // Uma janela do limite do Awave (10 por hora) por teste.
  relogio.avancar(61 * MINUTO);
});

const porToken = () => chamarRota(rotaDemandas.POST, { metodo: 'POST', caminho: '/api/demandas', bearer: token, corpo: CORPO_DO_AWAVE, semOrigin: true });
const porSessao = () =>
  chamarRota(rotaDemandas.POST, { metodo: 'POST', caminho: '/api/demandas', cookie, corpo: { titulo: 'Demanda de pessoa (fictício)', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' } });

const contar = async (consulta: string) => Number((await b.poolMigrator.query(consulta)).rows[0].n);
async function foto() {
  return {
    seq: (await b.poolMigrator.query('select last_value, is_called from demanda_seq')).rows[0],
    doAwave: await contar(`select count(*) as n from demanda where autor_tipo = 'integracao' and autor_id = 'awave'`),
    criadas: await contar(`select count(*) as n from evento where acao = 'demanda_criada'`),
  };
}

// O relógio monotônico da transação, adiantado só quando o gancho manda.
function relogioMonotonico() {
  const real = performance.now.bind(performance);
  let salto = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => real() + salto);
  return { adiantar: (ms: number) => void (salto += ms) };
}

describe('M-2: o 201 do Awave sai da transação orçada', () => {
  it('sucesso: exatamente as 6 chaves (IN-08), lidas uma vez pela vista da integração, dentro da transação', async () => {
    const r = await porToken();
    expect(r.status).toBe(201);
    const corpo = (await r.json()) as Record<string, unknown>;
    expect(Object.keys(corpo).sort()).toEqual(['atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo']);
    expect(corpo).toMatchObject({ titulo: CORPO_DO_AWAVE.titulo, tipo: 'melhoria', status: 'nova' });
    expect(vi.mocked(obterDemandaDaIntegracao)).toHaveBeenCalledTimes(1);
  });

  it('a leitura da vista estoura o tempo (57014): 503 fixo, e nenhuma demanda nem demanda_criada gravada', async () => {
    const antes = await foto();
    vi.mocked(obterDemandaDaIntegracao).mockImplementationOnce(() => Promise.reject(Object.assign(new Error('cancelado (fictício)'), { code: '57014' })));
    const r = await porToken();
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ erro: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
    const depois = await foto();
    expect(depois.doAwave).toBe(antes.doAwave);
    expect(depois.criadas).toBe(antes.criadas);
  });
});

describe('M-3: o prazo total da transação pela rota', () => {
  it('Awave: o prazo de 8 s esgota no meio da criação (depois do limite) → 503 fixo, e nada gravado, nem o id', async () => {
    const antes = await foto();
    const m = relogioMonotonico();
    ganchos.depoisDoLimite = () => m.adiantar(8_001);
    const r = await porToken();
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ erro: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
    expect(await foto()).toEqual(antes);
  });

  it('pessoa com a mesma carga: 201, sem prazo total', async () => {
    const m = relogioMonotonico();
    ganchos.depoisDoLimite = () => m.adiantar(60_000);
    expect((await porSessao()).status).toBe(201);
  });
});
