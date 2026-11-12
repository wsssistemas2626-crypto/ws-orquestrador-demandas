// T12 (RF-14, RNF-08 parte 2, IN-11, IN-12, CA-14.1 a CA-14.5, D-04): o /construir confirma o recebimento do Pedido de
// Construção pelo SHA-256 dos bytes que recebeu. Banco, rotas e token `construir` reais (Testcontainers); o token só nasce
// em tempo de teste e nunca vai a mensagem de expect (G3.3). As requisições são as do buscar-pedidos.mjs (dfedf16): POST,
// Bearer, `accept` e `content-type: application/json`, corpo `{ "sha256": "<hex>" }` e sem `Origin`. Cada caso monta o
// próprio DEC, com uma autora própria (C-36), e olha só os próprios eventos: o arquivo não depende de ordem. Relógio
// fixo. Dados só fictícios.
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { atorDeIntegracao, tokenDeIntegracao } from '../../../../test/integracoes';
import { chamarRota } from '../../../../test/requisicao';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import type { AtorPessoa } from '../../../modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenDeIntegracao } from '../../../modules/acesso/tokens-servico';
import { alterarDemandaSchema, criarDemandaSchema } from '../../../modules/demandas/schemas';
import { alterarDemanda, criarDemanda } from '../../../modules/demandas/servico';
import { criarEspecificacaoSchema } from '../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../modules/especificacoes/servico';
import { MENSAGEM_INDISPONIVEL } from '../../../modules/integracoes/tempo-limite';
import { criarPacoteDecisao } from '../../../modules/pacotes-decisao/criar';
import { registrarDecisao } from '../../../modules/pacotes-decisao/decidir';
import { criarPacoteDecisaoSchema, registrarDecisaoSchema } from '../../../modules/pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../modules/pareceres-risco/servico';
import { gerarPedido } from '../../../modules/pedido-construcao/gerar';
import { MENSAGENS_RECEBIMENTO, receberPedido, recebimentoSchema } from '../../../modules/pedido-construcao/receber';
import * as rotaEntrega from './[decId]/entrega/route';
import * as rotaRecebimento from './[decId]/recebimento/route';
import * as rotaPendentes from './pendentes/route';

const CONFIRMADO = { confirmaSemDadoPessoal: true } as const;
const SEM_PERMISSAO = { erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao };
const NAO_ENCONTRADO = { erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO };
const ENTRADA_INVALIDA = 'Corrija os campos abaixo para continuar.';
const INEXISTENTE = 'DEC-DEM-20261022-9999-v1';
// 64 hexadecimais minúsculos que nenhum pedido deste arquivo tem.
const OUTRO_SHA = 'f'.repeat(64);

const ESP_COMPLETA = {
  descricaoObjetiva: 'Corrigir pedidos duplicados',
  escopoInclui: ['Importação de pedidos'],
  sistemaAlvo: 'sistema-ficticio',
  repositorioDestino: 'wsssistemas2626-crypto/sistema-ficticio',
  criteriosAceitePreliminares: ['Pedido importado uma vez só'],
  definicaoDePronto: ['pnpm test verde'],
};
const RSK_PADRAO = { riscoTecnicoNivel: 'medio', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' };

let b: BancoDeTeste;
let deps: Deps;
let tokenConstruir: string;
let prefixoConstruir: string;
let tokenAwave: string;
let autoras = 0;

const geradora: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-geradora-recebimento', nome: 'Pessoa Ficticia Geradora', papel: 'cto' };
const novaAutora = (): AtorPessoa => ({ tipo: 'pessoa', usuarioId: `u-autora-recebimento-${++autoras}`, nome: 'Pessoa Ficticia Autora', papel: 'cto' });

// Oráculo independente do servidor: o SHA-256 dos bytes UTF-8 que o /construir recebeu.
const sha = (texto: string) => createHash('sha256').update(texto, 'utf8').digest('hex');

// Como o buscar-pedidos.mjs chama.
const listar = () =>
  chamarRota(rotaPendentes.GET, { caminho: '/api/pedidos-construcao/pendentes', bearer: tokenConstruir, semOrigin: true, cabecalhos: { accept: 'application/json' } });
const entregar = (decId: string) =>
  chamarRota(rotaEntrega.POST, {
    metodo: 'POST',
    caminho: `/api/pedidos-construcao/${encodeURIComponent(decId)}/entrega`,
    params: { decId },
    bearer: tokenConstruir,
    semOrigin: true,
    cabecalhos: { accept: 'application/json' },
  });
const receber = (decId: string, corpo: unknown, bearer = tokenConstruir) =>
  chamarRota(rotaRecebimento.POST, {
    metodo: 'POST',
    caminho: `/api/pedidos-construcao/${encodeURIComponent(decId)}/recebimento`,
    params: { decId },
    bearer,
    semOrigin: true,
    corpo,
    cabecalhos: { accept: 'application/json' },
  });

type Preparo = { gerar?: boolean; entregar?: boolean };
type Cenario = { autora: AtorPessoa; demandaId: string; decId: string; recebido: string | null };

async function novoDec(autora: AtorPessoa, demandaId: string): Promise<string> {
  const dec = await criarPacoteDecisao(
    deps,
    autora,
    demandaId,
    criarPacoteDecisaoSchema.parse({
      resumoExecutivo: 'Corrigir a importação de pedidos',
      opcaoA: { descricao: 'Corrigir no importador' },
      opcaoB: { descricao: 'Refazer a integração' },
      nivelAprovacaoRequerido: 'cto',
    }),
  );
  return dec.id;
}
const aprovar = (decId: string) => registrarDecisao(deps, geradora, decId, registrarDecisaoSchema.parse({ statusDecisao: 'aprovada', opcaoEscolhida: 'A' }));

// DEC aprovado, por padrão com o pedido gerado por pessoa (gerarPedido) e entregue pela rota; `recebido` é o texto que
// o /construir recebeu na entrega.
async function prepararDec(op: Preparo = {}): Promise<Cenario> {
  const autora = novaAutora();
  const d = await criarDemanda(
    deps,
    autora,
    criarDemandaSchema.parse({
      titulo: 'Pedidos duplicados (fictício)',
      tipo: 'bug',
      solicitanteNome: 'Carlos Exemplar',
      contexto: 'Importação diária do ERP',
      descricaoProblema: 'Pedidos aparecem duas vezes',
    }),
  );
  await criarEspecificacao(deps, autora, d.id, criarEspecificacaoSchema.parse(ESP_COMPLETA));
  await criarParecerRisco(deps, autora, d.id, criarParecerRiscoSchema.parse(RSK_PADRAO));
  const decId = await novoDec(autora, d.id);
  await aprovar(decId);
  if (op.gerar !== false) await gerarPedido(deps, geradora, decId, CONFIRMADO);
  let recebido: string | null = null;
  if (op.gerar !== false && op.entregar !== false) {
    const r = await entregar(decId);
    expect(r.status).toBe(200);
    recebido = await r.text();
  }
  return { autora, demandaId: d.id, decId, recebido };
}

type LinhaEvento = {
  ator_tipo: string;
  ator_id: string;
  ator_token_prefixo: string | null;
  demanda_id: string | null;
  entidade: string;
  antes: unknown;
  depois: unknown;
};
const recebidosDo = async (decId: string) =>
  (
    await b.poolMigrator.query<LinhaEvento>(
      `select ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, antes, depois from evento
        where entidade_id = $1 and acao = 'pedido_recebido' order by id`,
      [decId],
    )
  ).rows;
const totalDeEventos = async () => Number((await b.poolMigrator.query<{ n: string }>(`select count(*)::text as n from evento`)).rows[0]!.n);

// Pelo migrator: um evento que nenhum caminho do app grava com aquele ator (prefixo fictício, G3.3).
async function inserirEvento(e: { acao: string; decId: string; demandaId: string; atorTipo: string; atorId: string; depois?: unknown }) {
  await b.poolMigrator.query(
    `insert into evento (ocorrido_em, ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, entidade_id, acao, depois)
     values ($1, $2, $3, 'ficticio', $4, 'pacote_decisao', $5, $6, $7::jsonb)`,
    [deps.relogio.agora().toISOString(), e.atorTipo, e.atorId, e.demandaId, e.decId, e.acao, e.depois === undefined ? null : JSON.stringify(e.depois)],
  );
}

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

describe('a rota e o contrato do recebimento', () => {
  it('recebimento só exporta POST, com a ação confirmar_recebimento_pedido e o padrão do arquivo', () => {
    const metodos = Object.keys(rotaRecebimento as Record<string, unknown>).filter((k) => /^[A-Z]+$/.test(k));
    expect(metodos).toEqual(['POST']);
    expect(rotaRecebimento.POST.meta).toMatchObject({ acao: 'confirmar_recebimento_pedido', rota: '/api/pedidos-construcao/[decId]/recebimento' });
  });

  it('as mensagens são as da 03, seção 8, por inteiro', () => {
    expect(MENSAGENS_RECEBIMENTO).toEqual({
      formato: 'Informe o sha256 com 64 caracteres hexadecimais minúsculos.',
      naoEntregue: 'Este pedido ainda não foi entregue ao /construir. Peça a entrega antes de confirmar o recebimento.',
      shaDiferente: 'O SHA-256 enviado não confere com o pedido entregue. Busque o pedido de novo.',
    });
  });

  it('recebimentoSchema aceita só { sha256 } com 64 hexadecimais minúsculos', () => {
    expect(recebimentoSchema.safeParse({ sha256: 'a'.repeat(64) }).success).toBe(true);
    for (const ruim of [{}, { sha256: 'abc' }, { sha256: 'A'.repeat(64) }, { sha256: 1 }, { sha256: 'a'.repeat(65) }, { sha256: `${'a'.repeat(64)}\n` }, { sha256: 'a'.repeat(64), outra: 'x' }, null, 'a'.repeat(64)]) {
      expect(recebimentoSchema.safeParse(ruim).success, JSON.stringify(ruim)).toBe(false);
    }
  });
});

describe('POST /api/pedidos-construcao/:decId/recebimento (RF-14)', () => {
  it('CA-14.1: o SHA-256 do corpo entregue → 204 sem corpo; pedido_recebido do construir com o prefixo e só o sha256; o DEC sai de pendentes', async () => {
    const { decId, demandaId, recebido } = await prepararDec();
    expect(await decIdsPendentes()).toContain(decId);
    const r = await receber(decId, { sha256: sha(recebido!) });
    expect(r.status).toBe(204);
    expect(await r.text()).toBe('');
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    expect(r.headers.get('access-control-allow-origin')).toBeNull();
    expect(await recebidosDo(decId)).toEqual([
      {
        ator_tipo: 'integracao',
        ator_id: 'construir',
        ator_token_prefixo: prefixoConstruir,
        demanda_id: demandaId,
        entidade: 'pacote_decisao',
        antes: null,
        depois: { sha256: sha(recebido!) },
      },
    ]);
    expect(await decIdsPendentes()).not.toContain(decId);
  });

  it('CA-14.2: 64 hexadecimais diferentes → 409 shaDiferente, sem evento, e o DEC continua pendente', async () => {
    const { decId } = await prepararDec();
    const antes = await totalDeEventos();
    const r = await receber(decId, { sha256: OUTRO_SHA });
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ erro: 'conflito', mensagem: MENSAGENS_RECEBIMENTO.shaDiferente });
    expect(await totalDeEventos()).toBe(antes);
    expect(await decIdsPendentes()).toContain(decId);
  });

  it('CA-14.3: repetir com o SHA certo → 204 e um só pedido_recebido; depois dele, um SHA errado continua 409', async () => {
    const { decId, recebido } = await prepararDec();
    expect((await receber(decId, { sha256: sha(recebido!) })).status).toBe(204);
    expect((await receber(decId, { sha256: sha(recebido!) })).status).toBe(204);
    expect(await recebidosDo(decId)).toHaveLength(1);
    const errado = await receber(decId, { sha256: OUTRO_SHA });
    expect(errado.status).toBe(409);
    expect(await errado.json()).toEqual({ erro: 'conflito', mensagem: MENSAGENS_RECEBIMENTO.shaDiferente });
    expect(await recebidosDo(decId)).toHaveLength(1);
  });

  it('CA-14.4: pedido gerado e ainda não entregue → 409 naoEntregue, sem evento', async () => {
    const { decId } = await prepararDec({ entregar: false });
    const antes = await totalDeEventos();
    const r = await receber(decId, { sha256: OUTRO_SHA });
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ erro: 'conflito', mensagem: MENSAGENS_RECEBIMENTO.naoEntregue });
    expect(await totalDeEventos()).toBe(antes);
    expect(await decIdsPendentes()).toContain(decId);
  });

  it('CA-14.5 e D-04: sha256 fora do formato ou ausente → 400 entrada_invalida com o texto da 03 em campos, antes de olhar o DEC (inexistente dá 400, não 404)', async () => {
    const existente = await prepararDec();
    const antes = await totalDeEventos();
    const esperado = { erro: 'entrada_invalida', mensagem: ENTRADA_INVALIDA, campos: [{ campo: 'sha256', mensagem: MENSAGENS_RECEBIMENTO.formato }] };
    for (const decId of [INEXISTENTE, existente.decId]) {
      for (const corpo of [{ sha256: 'abc' }, {}, { sha256: 'A'.repeat(64) }, { sha256: 1 }, { sha256: null }, { sha256: 'a'.repeat(65) }]) {
        const r = await receber(decId, corpo);
        expect(r.status, JSON.stringify(corpo)).toBe(400);
        expect(await r.json(), JSON.stringify(corpo)).toEqual(esperado);
      }
    }
    expect(await totalDeEventos()).toBe(antes);
  });

  it('CA-14.5: chave a mais, corpo que não é objeto ou que não é JSON → 400, sem evento, também com o SHA certo', async () => {
    const { decId, recebido } = await prepararDec();
    const antes = await totalDeEventos();
    for (const corpo of [{ sha256: sha(recebido!), decId }, [sha(recebido!)], 'null', '{"sha256":', sha(recebido!)]) {
      const r = await receber(decId, corpo);
      expect(r.status, typeof corpo === 'string' ? corpo.slice(0, 12) : 'objeto').toBe(400);
      expect(((await r.json()) as { erro: string }).erro).toBe('entrada_invalida');
    }
    expect(await totalDeEventos()).toBe(antes);
    expect(await recebidosDo(decId)).toHaveLength(0);
  });

  it('404: DEC inexistente, DEC sem pedido_gerado e DEC com pedido_gerado de agente dão o mesmo corpo, byte a byte; nenhum evento', async () => {
    const inexistente = await receber(INEXISTENTE, { sha256: OUTRO_SHA });
    expect(inexistente.status).toBe(404);
    const corpoInexistente = await inexistente.text();
    expect(JSON.parse(corpoInexistente)).toEqual(NAO_ENCONTRADO);

    const semGerar = await prepararDec({ gerar: false });
    const doAgente = await prepararDec({ gerar: false });
    await inserirEvento({ acao: 'pedido_gerado', decId: doAgente.decId, demandaId: doAgente.demandaId, atorTipo: 'agente', atorId: 'orquestrador' });
    // Mesmo com um pedido_entregue gravado: sem pedido_gerado de pessoa, o DEC não existe para o /construir (IN-10).
    await inserirEvento({ acao: 'pedido_entregue', decId: doAgente.decId, demandaId: doAgente.demandaId, atorTipo: 'integracao', atorId: 'construir', depois: { sha256: OUTRO_SHA } });
    const antes = await totalDeEventos();
    for (const decId of [semGerar.decId, doAgente.decId]) {
      const r = await receber(decId, { sha256: OUTRO_SHA });
      expect(r.status).toBe(404);
      expect(await r.text()).toBe(corpoInexistente);
    }
    expect(await totalDeEventos()).toBe(antes);
  });

  it('RF-14: DEC substituído depois da entrega → 204 com o SHA certo', async () => {
    const { autora, demandaId, decId, recebido } = await prepararDec();
    await aprovar(await novoDec(autora, demandaId));
    expect((await receber(decId, { sha256: sha(recebido!) })).status).toBe(204);
    expect(await recebidosDo(decId)).toHaveLength(1);
  });

  it('RF-14: DEC desatualizado (ESP mais nova) depois da entrega → 204 com o SHA certo', async () => {
    const { autora, demandaId, decId, recebido } = await prepararDec();
    await criarEspecificacao(deps, autora, demandaId, criarEspecificacaoSchema.parse({ ...ESP_COMPLETA, descricaoObjetiva: 'Corrigir de outro jeito' }));
    expect((await receber(decId, { sha256: sha(recebido!) })).status).toBe(204);
    expect(await recebidosDo(decId)).toHaveLength(1);
  });

  it('RF-14: demanda em status final depois da entrega → 204 com o SHA certo', async () => {
    const { autora, demandaId, decId, recebido } = await prepararDec();
    await alterarDemanda(deps, autora, demandaId, alterarDemandaSchema.parse({ status: 'encerrada' }));
    expect((await receber(decId, { sha256: sha(recebido!) })).status).toBe(204);
    expect(await recebidosDo(decId)).toHaveLength(1);
  });

  // A ordem das três depende do agendamento; o teste seguinte é o que prova a trava de forma determinística.
  it('IN-11: três recebimentos ao mesmo tempo com o SHA certo → 204 nos três e um só pedido_recebido', async () => {
    const { decId, recebido } = await prepararDec();
    const corpo = { sha256: sha(recebido!) };
    const respostas = await Promise.all([receber(decId, corpo), receber(decId, corpo), receber(decId, corpo)]);
    expect(respostas.map((r) => r.status)).toEqual([204, 204, 204]);
    expect(await recebidosDo(decId)).toHaveLength(1);
  });

  it('IN-11: com a trava do DEC presa por outra transação que grava o recebimento, o pedido espera, vê o evento ao soltar e não grava outro', async () => {
    const { decId, demandaId, recebido } = await prepararDec();
    const sha256 = sha(recebido!);
    const outra = await b.poolMigrator.connect();
    let resposta: Promise<Response> | undefined;
    try {
      await outra.query('begin');
      await outra.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [`pedido:${decId}`]);
      await outra.query(
        `insert into evento (ocorrido_em, ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, entidade_id, acao, depois)
         values ($1, 'integracao', 'construir', 'ficticio', $2, 'pacote_decisao', $3, 'pedido_recebido', $4::jsonb)`,
        [deps.relogio.agora().toISOString(), demandaId, decId, JSON.stringify({ sha256 })],
      );
      resposta = receber(decId, { sha256 });
      // Espera o pedido chegar à fila da trava (sem ela, nunca chega e o laço sai pelo limite de tentativas).
      for (let i = 0; i < 50; i++) {
        const { rows } = await b.poolMigrator.query<{ n: number }>(
          `select count(*)::int as n from pg_locks
            where locktype = 'advisory' and not granted and database = (select oid from pg_database where datname = current_database())`,
        );
        if (rows[0]!.n > 0) break;
        await new Promise((r) => setTimeout(r, 20));
      }
      await outra.query('commit');
    } catch (e) {
      await outra.query('rollback');
      throw e;
    } finally {
      outra.release();
    }
    expect((await resposta!).status).toBe(204);
    expect(await recebidosDo(decId)).toHaveLength(1);
  });

  it('IN-12: o hash gravado é o da entrega que bateu; um hash entregue antes, também do servidor, vale e é o que se grava', async () => {
    const { decId, demandaId, recebido } = await prepararDec();
    const anterior = '0'.repeat(63) + '1';
    await inserirEvento({ acao: 'pedido_entregue', decId, demandaId, atorTipo: 'integracao', atorId: 'construir', depois: { sha256: anterior } });
    expect((await receber(decId, { sha256: anterior })).status).toBe(204);
    expect((await recebidosDo(decId)).map((e) => e.depois)).toEqual([{ sha256: anterior }]);
    expect(sha(recebido!)).not.toBe(anterior);
  });

  it('IN-14: a rota abre a transação com o orçamento padrão; com a trava do DEC presa por outra conexão, 503 com a mensagem fixa, sem evento', async () => {
    const { decId, recebido } = await prepararDec();
    const antes = await totalDeEventos();
    const outra = await b.poolMigrator.connect();
    try {
      await outra.query('begin');
      await outra.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [`pedido:${decId}`]);
      const r = await receber(decId, { sha256: sha(recebido!) });
      expect(r.status).toBe(503);
      expect(await r.json()).toEqual({ erro: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
    } finally {
      await outra.query('rollback');
      outra.release();
    }
    expect(await totalDeEventos()).toBe(antes);
    expect((await receber(decId, { sha256: sha(recebido!) })).status).toBe(204);
  });

  it('G3.10: a linha de log do recebimento não leva decId, hash, token nem prefixo', async () => {
    const { decId, recebido } = await prepararDec();
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    try {
      expect((await receber(decId, { sha256: sha(recebido!) })).status).toBe(204);
      expect((await receber(decId, { sha256: OUTRO_SHA })).status).toBe(409);
    } finally {
      substituirDestinoDoLog({ write: () => undefined });
    }
    expect(linhas).toHaveLength(2);
    const tudo = linhas.join('\n');
    for (const proibido of [decId, sha(recebido!), OUTRO_SHA, prefixoConstruir]) expect(tudo.includes(proibido)).toBe(false);
    expect(tudo.includes(tokenConstruir)).toBe(false);
    for (const l of linhas) {
      expect(JSON.parse(l) as { rota: string; atorTipo: string }).toMatchObject({ rota: '/api/pedidos-construcao/[decId]/recebimento', atorTipo: 'integracao' });
    }
  });
});

describe('só o /construir (CA-03.3)', () => {
  it('receberPedido com o awave lança sem_permissao, sem tocar o banco', async () => {
    const { decId, recebido } = await prepararDec();
    const antes = await totalDeEventos();
    expect((await erroDe(receberPedido(deps, atorDeIntegracao('awave'), decId, sha(recebido!)))).codigo).toBe('sem_permissao');
    expect(await totalDeEventos()).toBe(antes);
  });

  it('a rota responde 403 ao token do awave, sem gravar', async () => {
    const { decId, recebido } = await prepararDec();
    const antes = await totalDeEventos();
    const r = await receber(decId, { sha256: sha(recebido!) }, tokenAwave);
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual(SEM_PERMISSAO);
    expect(await totalDeEventos()).toBe(antes);
  });
});
