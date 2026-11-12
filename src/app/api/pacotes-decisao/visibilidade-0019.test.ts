// DEC-DEM-20261112-0019-v1, 04-correcao, A-1 (M-1 incompleto): a listagem GET /api/pacotes-decisao, pelo token de
// agente, não traz o DEC de uma demanda do Awave que aguarda a confirmação de uma pessoa, nem nos itens nem no `total`,
// com e sem `statusDecisao` e com `limit`/`offset` na borda. Sem oráculo: o `demandaId` escondido não aparece em lugar
// nenhum da resposta. Depois da confirmação por pessoa, o agente passa a ver o DEC. A pessoa vê sempre. Rotas, tokens e
// Postgres reais; tokens só gerados em tempo de teste e nunca em mensagem de expect. Dados fictícios.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as rotaDecDaDemanda from '../demandas/[id]/pacotes-decisao/route';
import * as rotaEspDaDemanda from '../demandas/[id]/especificacoes/route';
import * as rotaRskDaDemanda from '../demandas/[id]/pareceres-risco/route';
import * as rotaDemandas from '../demandas/route';
import * as rotaPacotes from './route';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo, type RelogioFixo } from '../../../lib/relogio';
import type { AtorPessoa } from '../../../modules/acesso/ator';
import { criarTokenServico } from '../../../modules/acesso/tokens-servico';
import { confirmarDemanda } from '../../../modules/demandas/confirmar';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { CORPO_DO_AWAVE, tokenDeIntegracao } from '../../../../test/integracoes';
import { DEC_DO_PEDIDO, ESP_DO_PEDIDO, RSK_DO_PEDIDO } from '../../../../test/pedidos-construcao';
import { chamarRota } from '../../../../test/requisicao';
import { criarPessoa } from '../../../../test/sessao';

const MINUTO = 60_000;

let b: BancoDeTeste;
let deps: Deps;
let relogio: RelogioFixo;
let awave: string;
let risco: string;
let cookie: string;
let pessoa: AtorPessoa;
// Da mais antiga para a mais nova: confirmada, não confirmada (a escondida), confirmada. A lista vem do DEC mais novo
// para o mais antigo, então a escondida fica no meio.
const dem = { antiga: '', escondida: '', nova: '' };
const dec = { antiga: '', escondida: '', nova: '' };

type Credencial = { bearer: string } | { cookie: string };

const criarDoAwave = async (): Promise<string> => {
  const r = await chamarRota(rotaDemandas.POST, { metodo: 'POST', caminho: '/api/demandas', bearer: awave, corpo: CORPO_DO_AWAVE, semOrigin: true });
  expect(r.status).toBe(201);
  return ((await r.json()) as { id: string }).id;
};

const postarComoPessoa = async (rota: typeof rotaEspDaDemanda.POST, sufixo: string, id: string, corpo: unknown): Promise<string> => {
  const r = await chamarRota(rota, { metodo: 'POST', caminho: `/api/demandas/${id}/${sufixo}`, params: { id }, corpo, cookie });
  expect(r.status).toBe(201);
  return ((await r.json()) as { id: string }).id;
};

// ESP, RSK e DEC gravados por pessoa (a pessoa grava antes da confirmação, B-7 do 0016).
const decDaPessoa = async (id: string): Promise<string> => {
  await postarComoPessoa(rotaEspDaDemanda.POST, 'especificacoes', id, ESP_DO_PEDIDO);
  await postarComoPessoa(rotaRskDaDemanda.POST, 'pareceres-risco', id, RSK_DO_PEDIDO);
  return postarComoPessoa(rotaDecDaDemanda.POST, 'pacotes-decisao', id, DEC_DO_PEDIDO);
};

async function pagina(query: string, c: Credencial) {
  const r = await chamarRota(rotaPacotes.GET, { caminho: `/api/pacotes-decisao${query ? `?${query}` : ''}`, ...c, semOrigin: 'bearer' in c });
  expect(r.status).toBe(200);
  const texto = await r.text();
  const corpo = JSON.parse(texto) as { itens: Array<{ id: string; demandaId: string }>; total: number };
  return { ids: corpo.itens.map((i) => i.id), total: corpo.total, texto };
}

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  relogio = relogioFixo('2026-11-12T12:00:00Z');
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  awave = await tokenDeIntegracao(deps, 'awave');
  risco = (await comTransacao(deps.pool, (t) => criarTokenServico(t, 'risco', relogio))).token;
  const p = await criarPessoa(deps, { papel: 'cto' });
  cookie = p.cookie;
  pessoa = { tipo: 'pessoa', usuarioId: p.usuarioId, nome: 'Pessoa Ficticia', papel: 'cto' };

  dem.antiga = await criarDoAwave();
  dem.escondida = await criarDoAwave();
  dem.nova = await criarDoAwave();
  dec.antiga = await decDaPessoa(dem.antiga);
  relogio.avancar(MINUTO);
  dec.escondida = await decDaPessoa(dem.escondida);
  relogio.avancar(MINUTO);
  dec.nova = await decDaPessoa(dem.nova);
  await confirmarDemanda(deps, pessoa, dem.antiga);
  await confirmarDemanda(deps, pessoa, dem.nova);
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('A-1: GET /api/pacotes-decisao para agente não traz o DEC da demanda que aguarda confirmação', () => {
  it('sem filtro e com statusDecisao=pendente: o DEC escondido não está nos itens, o total não o conta, e o demandaId não aparece', async () => {
    for (const query of ['', 'statusDecisao=pendente']) {
      const p = await pagina(query, { bearer: risco });
      expect(p.ids, query).toEqual([dec.nova, dec.antiga]);
      expect(p.total, query).toBe(2);
      // Sem oráculo: nem o id do DEC nem o da demanda escondida em lugar nenhum da resposta.
      expect(p.texto.includes(dem.escondida), query).toBe(false);
      expect(p.texto.includes(dec.escondida), query).toBe(false);
    }
  });

  it('limit e offset na borda: a página não tem buraco nem o DEC escondido', async () => {
    expect(await pagina('limit=1&offset=0', { bearer: risco })).toMatchObject({ ids: [dec.nova], total: 2 });
    expect(await pagina('limit=1&offset=1', { bearer: risco })).toMatchObject({ ids: [dec.antiga], total: 2 });
    expect(await pagina('limit=1&offset=2', { bearer: risco })).toMatchObject({ ids: [], total: 2 });
    expect(await pagina('statusDecisao=pendente&limit=1&offset=1', { bearer: risco })).toMatchObject({ ids: [dec.antiga], total: 2 });
  });

  it('outro status de decisão: o filtro e a regra se somam (nenhum aprovado, total 0)', async () => {
    expect(await pagina('statusDecisao=aprovada', { bearer: risco })).toMatchObject({ ids: [], total: 0 });
  });

  it('a pessoa vê os três DEC sempre, e o agente passa a ver o escondido depois da confirmação por pessoa', async () => {
    expect(await pagina('', { cookie })).toMatchObject({ ids: [dec.nova, dec.escondida, dec.antiga], total: 3 });
    expect(await pagina('statusDecisao=pendente', { cookie })).toMatchObject({ ids: [dec.nova, dec.escondida, dec.antiga], total: 3 });
    await confirmarDemanda(deps, pessoa, dem.escondida);
    expect(await pagina('', { bearer: risco })).toMatchObject({ ids: [dec.nova, dec.escondida, dec.antiga], total: 3 });
    expect(await pagina('limit=1&offset=1', { bearer: risco })).toMatchObject({ ids: [dec.escondida], total: 3 });
  });
});
