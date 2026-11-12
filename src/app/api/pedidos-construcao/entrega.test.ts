// T11 (RF-12 rota, RF-13, RF-09 entrega, RNF-08 parte 1, IN-10, IN-12, IN-14, CA-09.3, CA-12.6, CA-13.1 a CA-13.6, P-02):
// o /construir lista os pedidos pendentes e recebe os mesmos bytes da geração. Banco, rotas e token `construir` reais
// (Testcontainers); o token só nasce em tempo de teste e nunca vai a mensagem de expect (G3.3). As requisições são as do
// buscar-pedidos.mjs (dfedf16): Bearer, `accept: application/json`, sem `Origin` e, na entrega, POST sem corpo e sem
// `content-type`. Cada caso monta o próprio DEC, com uma autora própria (C-36), e olha só os próprios eventos: o arquivo
// não depende de ordem. Relógio fixo. Dados só fictícios.
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { atorDeIntegracao, tokenDeIntegracao } from '../../../../test/integracoes';
import {
  chamadasDoConstruir,
  ESP_DO_PEDIDO as ESP_COMPLETA,
  inserirEventoDoPedido,
  preparadorDePedidos,
  sha256DoTexto as sha,
  totalDeEventos as totalDeEventosDo,
  type LinhaEvento,
} from '../../../../test/pedidos-construcao';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import { validarPedido } from '../../../vendor/construir/pedido.mjs';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenDeIntegracao } from '../../../modules/acesso/tokens-servico';
import { alterarDemandaSchema } from '../../../modules/demandas/schemas';
import { alterarDemanda } from '../../../modules/demandas/servico';
import { criarEspecificacaoSchema } from '../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../modules/especificacoes/servico';
import { MENSAGEM_INDISPONIVEL } from '../../../modules/integracoes/tempo-limite';
import { entregarPedido, pendentesPara, RE_SHA256, sha256DoPedido } from '../../../modules/pedido-construcao/entregar';
import { MENSAGENS_PEDIDO } from '../../../modules/pedido-construcao/gerar';
import { RE_SHA256 as RE_SHA256_DAS_LEITURAS } from '../../../modules/pedido-construcao/pendentes';
import * as rotaEntrega from './[decId]/entrega/route';
import * as rotaPendentes from './pendentes/route';

const SEM_PERMISSAO = { erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao };
const NAO_ENCONTRADO = { erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO };
const INEXISTENTE = 'DEC-DEM-20261022-9999-v1';

let b: BancoDeTeste;
let deps: Deps;
let tokenConstruir: string;
let prefixoConstruir: string;
let tokenAwave: string;

// O preparo, as chamadas como o buscar-pedidos.mjs faz e o oráculo do SHA-256 vêm de test/pedidos-construcao.ts (T13,
// Minor 1 da 06-T12-revisao).
const construir = chamadasDoConstruir(() => tokenConstruir);
const listar = (bearer = tokenConstruir) => construir.listar({ bearer });
const entregar = (decId: string, bearer = tokenConstruir) => construir.entregar(decId, { bearer });

// DEC aprovado e, por padrão, com o pedido gerado por pessoa pelo caminho real (gerarPedido).
const { novoDec, aprovar, prepararDec } = preparadorDePedidos({ deps: () => deps, rotulo: 'entrega', entregar: (decId) => entregar(decId) });

const entreguesDo = async (decId: string) =>
  (
    await b.poolMigrator.query<LinhaEvento>(
      `select ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, antes, depois from evento
        where entidade_id = $1 and acao = 'pedido_entregue' order by id`,
      [decId],
    )
  ).rows;
const totalDeEventos = () => totalDeEventosDo(b);

// Pelo migrator: um evento que nenhum caminho do app grava com aquele ator (prefixo fictício, G3.3).
const inserirEvento = (e: { acao: string; decId: string; demandaId: string; atorTipo: string; atorId: string; depois?: unknown }) =>
  inserirEventoDoPedido(b, deps, e);

const decIdsPendentes = async (): Promise<string[]> => {
  const r = await listar();
  expect(r.status).toBe(200);
  return ((await r.json()) as { itens: Array<{ decId: string }> }).itens.map((i) => i.decId);
};

async function erroDe(p: Promise<unknown>): Promise<ErroDominio> {
  const e = await p.then(
    () => undefined,
    (x: unknown) => x,
  );
  expect(e).toBeInstanceOf(ErroDominio);
  return e as ErroDominio;
}

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  const construir = await comTransacao(deps.pool, (t) => criarTokenDeIntegracao(t, 'construir', deps.relogio));
  tokenConstruir = construir.token;
  prefixoConstruir = construir.prefixo;
  tokenAwave = await tokenDeIntegracao(deps, 'awave');
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('as duas rotas do /construir', () => {
  it('pendentes só exporta GET (listar_pedidos_pendentes); entrega só exporta POST (entregar_pedido)', () => {
    const metodos = (m: Record<string, unknown>) => Object.keys(m).filter((k) => /^[A-Z]+$/.test(k));
    expect(metodos(rotaPendentes as Record<string, unknown>)).toEqual(['GET']);
    expect(metodos(rotaEntrega as Record<string, unknown>)).toEqual(['POST']);
    expect(rotaPendentes.GET.meta).toMatchObject({ acao: 'listar_pedidos_pendentes', rota: '/api/pedidos-construcao/pendentes' });
    expect(rotaEntrega.POST.meta).toMatchObject({ acao: 'entregar_pedido', rota: '/api/pedidos-construcao/[decId]/entrega' });
  });

  it('RE_SHA256 tem uma fonte só: entregar.ts reexporta a de pendentes.ts (Minor 1 da 06-T10-revisao)', () => {
    expect(RE_SHA256).toBe(RE_SHA256_DAS_LEITURAS);
    expect(RE_SHA256.test('a'.repeat(64))).toBe(true);
    expect(RE_SHA256.test('A'.repeat(64))).toBe(false);
  });

  it('sha256DoPedido é o SHA-256 em hexadecimal minúsculo dos bytes UTF-8 do texto', () => {
    expect(sha256DoPedido('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    // Vetor fixo do FIPS 180-2 e um oráculo dos bytes UTF-8 escritos à mão (61 c3 a7 c3 a3 6f), que não passa pela
    // codificação de texto da função testada (Minor 1 da 06-T11-revisao).
    expect(sha256DoPedido('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    const bytesUtf8 = createHash('sha256').update(Buffer.from([0x61, 0xc3, 0xa7, 0xc3, 0xa3, 0x6f])).digest('hex');
    expect(sha256DoPedido('ação')).toBe(bytesUtf8);
    expect(sha256DoPedido('ação')).not.toBe(createHash('sha256').update('ação', 'latin1').digest('hex'));
    expect(RE_SHA256.test(sha256DoPedido('{"pedido":"x"}'))).toBe(true);
  });
});

describe('GET /api/pedidos-construcao/pendentes (RF-12, CA-12.6)', () => {
  it('200 com { itens: [{ decId }] }: só a chave itens, cada item só com decId, e a leitura não grava evento', async () => {
    const { decId } = await prepararDec();
    const antes = await totalDeEventos();
    const r = await listar();
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    const corpo = (await r.json()) as { itens: Array<Record<string, unknown>> };
    expect(Object.keys(corpo)).toEqual(['itens']);
    expect(corpo.itens).toContainEqual({ decId });
    for (const item of corpo.itens) expect(Object.keys(item)).toEqual(['decId']);
    expect(await totalDeEventos()).toBe(antes);
  });

  it('o DEC aprovado sem pedido_gerado não aparece; o gerado por agente (IN-10) também não', async () => {
    const semGerar = await prepararDec({ gerar: false });
    const doAgente = await prepararDec({ gerar: false });
    await inserirEvento({ acao: 'pedido_gerado', decId: doAgente.decId, demandaId: doAgente.demandaId, atorTipo: 'agente', atorId: 'orquestrador' });
    const ids = await decIdsPendentes();
    expect(ids).not.toContain(semGerar.decId);
    expect(ids).not.toContain(doAgente.decId);
  });

  it('a entrega não tira o DEC da lista (P-02): só o recebimento tira, e esse é da T12', async () => {
    const { decId } = await prepararDec();
    expect((await entregar(decId)).status).toBe(200);
    expect(await decIdsPendentes()).toContain(decId);
  });
});

describe('POST /api/pedidos-construcao/:decId/entrega (RF-13)', () => {
  it('CA-09.3 e CA-13.1: 200 sem corpo e sem Origin, com os cabeçalhos de JSON, e o SHA-256 do corpo é o da geração', async () => {
    const { decId, json } = await prepararDec();
    const r = await entregar(decId);
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toBe('application/json; charset=utf-8');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('access-control-allow-origin')).toBeNull();
    expect(r.headers.get('content-disposition')).toBeNull();
    const texto = await r.text();
    expect(texto).toBe(json);
    expect(sha(texto)).toBe(sha(json!));
  });

  it('CA-13.6: o validarPedido do /construir aceita o corpo, e `pedido` é o decId', async () => {
    const { decId } = await prepararDec();
    const p = JSON.parse(await (await entregar(decId)).text()) as { pedido: string };
    expect(validarPedido(p)).toEqual({ ok: true, erros: [] });
    expect(p.pedido).toBe(decId);
  });

  it('CA-13.5 e IN-12: um pedido_entregue do construir, com o prefixo, a demanda e só o sha256; entregar de novo dá os mesmos bytes e não grava outro (P-02)', async () => {
    const { decId, demandaId } = await prepararDec();
    const primeiro = await (await entregar(decId)).text();
    expect(await entreguesDo(decId)).toEqual([
      {
        ator_tipo: 'integracao',
        ator_id: 'construir',
        ator_token_prefixo: prefixoConstruir,
        demanda_id: demandaId,
        entidade: 'pacote_decisao',
        antes: null,
        depois: { sha256: sha(primeiro) },
      },
    ]);
    const segundo = await (await entregar(decId)).text();
    expect(segundo).toBe(primeiro);
    expect(await entreguesDo(decId)).toHaveLength(1);
  });

  it('P-02: um pedido_entregue por hash; um hash diferente já gravado não impede gravar o do pedido de agora, uma vez', async () => {
    const { decId, demandaId, json } = await prepararDec();
    await inserirEvento({ acao: 'pedido_entregue', decId, demandaId, atorTipo: 'integracao', atorId: 'construir', depois: { sha256: '0'.repeat(64) } });
    expect((await entregar(decId)).status).toBe(200);
    expect((await entregar(decId)).status).toBe(200);
    expect((await entreguesDo(decId)).map((e) => e.depois)).toEqual([{ sha256: '0'.repeat(64) }, { sha256: sha(json!) }]);
  });

  it('P-02 sob concorrência: três entregas ao mesmo tempo dão os mesmos bytes e um só pedido_entregue (a trava da demanda)', async () => {
    const { decId, json } = await prepararDec();
    const respostas = await Promise.all([entregar(decId), entregar(decId), entregar(decId)]);
    expect(respostas.map((r) => r.status)).toEqual([200, 200, 200]);
    expect(new Set(await Promise.all(respostas.map((r) => r.text())))).toEqual(new Set([json]));
    expect(await entreguesDo(decId)).toHaveLength(1);
  });

  it('CA-13.2: sem pedido_gerado → 404 com o corpo, byte a byte, de um DEC que não existe; idem com pedido_gerado de agente (IN-10); nenhum evento', async () => {
    const inexistente = await entregar(INEXISTENTE);
    expect(inexistente.status).toBe(404);
    const corpoInexistente = await inexistente.text();
    expect(JSON.parse(corpoInexistente)).toEqual(NAO_ENCONTRADO);

    const semGerar = await prepararDec({ gerar: false });
    const doAgente = await prepararDec({ gerar: false });
    await inserirEvento({ acao: 'pedido_gerado', decId: doAgente.decId, demandaId: doAgente.demandaId, atorTipo: 'agente', atorId: 'orquestrador' });
    const antes = await totalDeEventos();
    for (const decId of [semGerar.decId, doAgente.decId]) {
      const r = await entregar(decId);
      expect(r.status).toBe(404);
      expect(await r.text()).toBe(corpoInexistente);
    }
    expect(await totalDeEventos()).toBe(antes);
  });

  it('CA-13.3: substituído depois da geração → 409 substituido(v2), sem evento', async () => {
    const { autora, demandaId, decId } = await prepararDec();
    const v2 = await novoDec(autora, demandaId);
    await aprovar(v2);
    const antes = await totalDeEventos();
    const r = await entregar(decId);
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ erro: 'conflito', mensagem: MENSAGENS_PEDIDO.substituido(v2) });
    expect(await totalDeEventos()).toBe(antes);
  });

  it('CA-13.3: desatualizado (ESP mais nova) depois da geração → 409 desatualizado, sem evento', async () => {
    const { autora, demandaId, decId } = await prepararDec();
    await criarEspecificacao(deps, autora, demandaId, criarEspecificacaoSchema.parse({ ...ESP_COMPLETA, descricaoObjetiva: 'Corrigir de outro jeito' }));
    const antes = await totalDeEventos();
    const r = await entregar(decId);
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ erro: 'conflito', mensagem: MENSAGENS_PEDIDO.desatualizado });
    expect(await totalDeEventos()).toBe(antes);
  });

  it('CA-13.3: demanda em status final depois da geração → 409 demandaFinal, sem evento', async () => {
    const { autora, demandaId, decId } = await prepararDec();
    await alterarDemanda(deps, autora, demandaId, alterarDemandaSchema.parse({ status: 'encerrada' }));
    const antes = await totalDeEventos();
    const r = await entregar(decId);
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ erro: 'conflito', mensagem: MENSAGENS_PEDIDO.demandaFinal });
    expect(await totalDeEventos()).toBe(antes);
  });

  it('CA-13.4: o solicitante renomeado para um nome que está no título copiado no DEC → 422 sem o valor, sem evento; o DEC continua pendente (P-02)', async () => {
    const { autora, demandaId, decId } = await prepararDec({ demanda: { titulo: 'Pedido da Joana Ficticia' } });
    await alterarDemanda(deps, autora, demandaId, alterarDemandaSchema.parse({ solicitanteNome: 'Joana Ficticia' }));
    const antes = await totalDeEventos();
    const r = await entregar(decId);
    expect(r.status).toBe(422);
    const texto = await r.text();
    expect(JSON.parse(texto)).toEqual({ erro: 'nao_processavel', mensagem: MENSAGENS_PEDIDO.naoPassou, erros: ['demanda.titulo: nome'] });
    expect(texto).not.toMatch(/joana|ficticia/i);
    expect(await totalDeEventos()).toBe(antes);
    expect(await decIdsPendentes()).toContain(decId);
  });

  it('IN-14: a rota abre a transação com o orçamento da entrega; a demanda travada por outra conexão dá 503 com a mensagem fixa, sem evento', async () => {
    const { demandaId, decId } = await prepararDec();
    const antes = await totalDeEventos();
    const outra = await b.poolMigrator.connect();
    try {
      await outra.query('begin');
      await outra.query('select 1 from demanda where id = $1 for update', [demandaId]);
      const r = await entregar(decId);
      expect(r.status).toBe(503);
      expect(await r.json()).toEqual({ erro: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
    } finally {
      await outra.query('rollback');
      outra.release();
    }
    expect(await totalDeEventos()).toBe(antes);
    expect((await entregar(decId)).status).toBe(200);
  });

  it('G3.10: a linha de log da entrega e da lista não leva decId, hash, token nem prefixo', async () => {
    const { decId, json } = await prepararDec();
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    try {
      expect((await entregar(decId)).status).toBe(200);
      expect((await listar()).status).toBe(200);
    } finally {
      substituirDestinoDoLog({ write: () => undefined });
    }
    expect(linhas).toHaveLength(2);
    const tudo = linhas.join('\n');
    for (const proibido of [decId, sha(json!), prefixoConstruir]) expect(tudo.includes(proibido)).toBe(false);
    expect(tudo.includes(tokenConstruir)).toBe(false);
    expect(linhas.map((l) => (JSON.parse(l) as { rota: string; atorTipo: string }).rota)).toEqual([
      '/api/pedidos-construcao/[decId]/entrega',
      '/api/pedidos-construcao/pendentes',
    ]);
    for (const l of linhas) expect((JSON.parse(l) as { atorTipo: string }).atorTipo).toBe('integracao');
  });
});

describe('só o /construir (CA-03.3)', () => {
  it('pendentesPara e entregarPedido com o awave lançam sem_permissao, sem tocar o banco', async () => {
    const { decId } = await prepararDec();
    const antes = await totalDeEventos();
    expect((await erroDe(pendentesPara(deps, atorDeIntegracao('awave')))).codigo).toBe('sem_permissao');
    expect((await erroDe(entregarPedido(deps, atorDeIntegracao('awave'), decId))).codigo).toBe('sem_permissao');
    expect(await totalDeEventos()).toBe(antes);
  });

  it('as duas rotas respondem 403 ao token do awave, sem gravar', async () => {
    const { decId } = await prepararDec();
    const antes = await totalDeEventos();
    for (const r of [await listar(tokenAwave), await entregar(decId, tokenAwave)]) {
      expect(r.status).toBe(403);
      expect(await r.json()).toEqual(SEM_PERMISSAO);
    }
    expect(await totalDeEventos()).toBe(antes);
  });
});
