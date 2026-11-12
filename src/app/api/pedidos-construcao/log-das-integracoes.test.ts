// T13 (RNF-04, IN-14, IN-04, G3.10): a linha de log por requisição das rotas que as duas integrações chamam. O POST e o
// GET do Awave e as três rotas do /construir, nos caminhos de sucesso e de erro, deixam no log exatamente uma linha cada,
// com `atorTipo: 'integracao'`, só os campos da lista de rota() e nada que identifique o token, o pedido ou o texto: nem
// `wsod_`, nem o token, nem o prefixo, nem um SHA-256, nem o decId, nem o id da demanda, nem o título. Banco, rotas e
// tokens reais (Testcontainers); o token só nasce em tempo de teste e nunca vai a mensagem de expect (G3.3). Relógio
// fixo. Dados só fictícios. Teste de guarda: passa sem mudança de código enquanto rota() e os serviços não logarem
// nada além da linha da lista.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { CORPO_DO_AWAVE } from '../../../../test/integracoes';
import { chamadasDoConstruir, DEMANDA_DO_PEDIDO, preparadorDePedidos, sha256DoTexto } from '../../../../test/pedidos-construcao';
import { chamarRota } from '../../../../test/requisicao';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { substituirDestinoDoLog } from '../../../lib/log';
import { criarTokenDeIntegracao } from '../../../modules/acesso/tokens-servico';
import { MENSAGEM_INDISPONIVEL } from '../../../modules/integracoes/tempo-limite';
import * as rotaDemanda from '../demandas/[id]/route';
import * as rotaDemandas from '../demandas/route';

// As chaves que a linha de rota() pode ter: as do pino (`level`, `time`) e as da linha por requisição. Lista fechada:
// qualquer chave nova (o decId, o prefixo, a integração) falha o teste.
const CHAVES_DA_LINHA = ['level', 'time', 'evento', 'metodo', 'rota', 'status', 'ms', 'atorTipo', 'codigoErro'];
const TITULO_DO_AWAVE = 'Relatório do log das integrações (fictício)';

let b: BancoDeTeste;
let deps: Deps;
const tokens = { awave: { token: '', prefixo: '' }, construir: { token: '', prefixo: '' } };

const construir = chamadasDoConstruir(() => tokens.construir.token);
const pedidos = preparadorDePedidos({ deps: () => deps, rotulo: 'log', entregar: (decId) => construir.entregar(decId) });

const postAwave = (corpo: unknown) =>
  chamarRota(rotaDemandas.POST, { metodo: 'POST', caminho: '/api/demandas', bearer: tokens.awave.token, semOrigin: true, corpo, cabecalhos: { accept: 'application/json' } });
const getAwave = (id: string) =>
  chamarRota(rotaDemanda.GET, { caminho: `/api/demandas/${id}`, params: { id }, bearer: tokens.awave.token, semOrigin: true, cabecalhos: { accept: 'application/json' } });

// Captura as linhas do log só durante `corpo`.
async function linhasDe(corpo: () => Promise<void>): Promise<string[]> {
  const linhas: string[] = [];
  substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
  try {
    await corpo();
  } finally {
    substituirDestinoDoLog({ write: () => undefined });
  }
  return linhas;
}

type Linha = Record<string, unknown>;

// O que vale para toda linha das integrações; `proibidos` são os valores do caso (ids, títulos), conferidos por
// `includes`, para a mensagem de falha não levar o valor.
function conferirLinhas(linhas: string[], proibidos: Record<string, string>): Linha[] {
  const tudo = linhas.join('\n');
  expect(tudo.includes('wsod_'), 'wsod_ no log').toBe(false);
  for (const integracao of ['awave', 'construir'] as const) {
    expect(tudo.includes(tokens[integracao].token), `token ${integracao} no log`).toBe(false);
    expect(tudo.includes(tokens[integracao].prefixo), `prefixo ${integracao} no log`).toBe(false);
    expect(tudo.includes(tokens[integracao].token.slice('wsod_'.length + 8)), `texto do token ${integracao} depois do prefixo no log`).toBe(false);
  }
  expect(/[0-9a-f]{64}/.test(tudo), 'um SHA-256 no log').toBe(false);
  expect(/DEC-DEM-\d{8}-\d{4}-v\d+/.test(tudo), 'um decId no log').toBe(false);
  expect(/DEM-\d{8}-\d{4}/.test(tudo), 'um id de demanda no log').toBe(false);
  for (const [nome, valor] of Object.entries(proibidos)) expect(tudo.includes(valor), `${nome} no log`).toBe(false);
  const lidas = linhas.map((l) => JSON.parse(l) as Linha);
  for (const l of lidas) {
    for (const chave of Object.keys(l)) expect(CHAVES_DA_LINHA, `chave ${chave}`).toContain(chave);
    expect(l.evento).toBe('requisicao');
    expect(l.atorTipo).toBe('integracao');
  }
  return lidas;
}

const resumo = (l: Linha) => `${String(l.metodo)} ${String(l.rota)} ${String(l.status)}${l.codigoErro ? ` ${String(l.codigoErro)}` : ''}`;

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  tokens.awave = await comTransacao(deps.pool, (t) => criarTokenDeIntegracao(t, 'awave', deps.relogio));
  tokens.construir = await comTransacao(deps.pool, (t) => criarTokenDeIntegracao(t, 'construir', deps.relogio));
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('log das rotas das integrações (RNF-04, IN-14)', () => {
  it('Awave: 400, 201, GET da própria demanda e 429 deixam uma linha cada, só da lista, sem token, prefixo, id nem título', async () => {
    const corpo = { ...CORPO_DO_AWAVE, titulo: TITULO_DO_AWAVE };
    let id = '';
    const linhas = await linhasDe(async () => {
      expect((await postAwave({ ...corpo, titulo: '' })).status).toBe(400);
      const criada = await postAwave(corpo);
      expect(criada.status).toBe(201);
      id = ((await criada.json()) as { id: string }).id;
      expect((await getAwave(id)).status).toBe(200);
      // Até o limite de 10 por hora do Awave e o 11º recusado.
      for (let i = 1; i < 10; i++) expect((await postAwave(corpo)).status).toBe(201);
      expect((await postAwave(corpo)).status).toBe(429);
    });
    expect(id).toMatch(/^DEM-\d{8}-\d{4}$/);
    const lidas = conferirLinhas(linhas, { 'id da demanda': id, título: TITULO_DO_AWAVE, 'texto do contexto': CORPO_DO_AWAVE.contexto! });
    expect(lidas.map(resumo)).toEqual([
      'POST /api/demandas 400 entrada_invalida',
      'POST /api/demandas 201',
      'GET /api/demandas/[id] 200',
      ...Array.from({ length: 9 }, () => 'POST /api/demandas 201'),
      'POST /api/demandas 429 limite_excedido',
    ]);
  });

  it('/construir: pendentes, entrega, recebimento (409 e 204) e o 404 do inexistente deixam uma linha cada, só da lista, sem token, prefixo, hash, decId nem título', async () => {
    const { decId, demandaId, json } = await pedidos.prepararDec();
    let recebido = '';
    const linhas = await linhasDe(async () => {
      const lista = await construir.listar();
      expect(lista.status).toBe(200);
      expect(((await lista.json()) as { itens: Array<{ decId: string }> }).itens).toContainEqual({ decId });
      const entrega = await construir.entregar(decId);
      expect(entrega.status).toBe(200);
      recebido = await entrega.text();
      expect((await construir.receber(decId, { sha256: 'f'.repeat(64) })).status).toBe(409);
      expect((await construir.receber(decId, { sha256: sha256DoTexto(recebido) })).status).toBe(204);
      expect((await construir.entregar('DEC-DEM-20261022-9999-v1')).status).toBe(404);
    });
    expect(recebido).toBe(json);
    const lidas = conferirLinhas(linhas, { decId, 'id da demanda': demandaId, título: DEMANDA_DO_PEDIDO.titulo });
    expect(lidas.map(resumo)).toEqual([
      'GET /api/pedidos-construcao/pendentes 200',
      'POST /api/pedidos-construcao/[decId]/entrega 200',
      'POST /api/pedidos-construcao/[decId]/recebimento 409 conflito',
      'POST /api/pedidos-construcao/[decId]/recebimento 204',
      'POST /api/pedidos-construcao/[decId]/entrega 404 nao_encontrado',
    ]);
  });

  // IN-14: a lista de pendentes também roda sob o orçamento da integração (pendência da 06-T05-testes para a T13: as
  // outras rotas das integrações já têm o 503 provado nos próprios arquivos). Com a tabela evento travada por outra
  // conexão (o modelo de leitura-awave-qa.test.ts), o `lock_timeout` vira o 503 fixo do D-03, e a linha de erro do log
  // continua só com os campos da lista, sem o texto do Postgres.
  it('/construir: pendentes com a tabela evento travada → 503 com a mensagem fixa, e a linha de erro só da lista', async () => {
    const outra = await b.poolMigrator.connect();
    let corpo = '';
    let linhas: string[] = [];
    try {
      await outra.query('begin');
      await outra.query('lock table evento in access exclusive mode');
      linhas = await linhasDe(async () => {
        const r = await construir.listar();
        expect(r.status).toBe(503);
        corpo = await r.text();
      });
    } finally {
      await outra.query('rollback');
      outra.release();
    }
    expect(JSON.parse(corpo)).toEqual({ erro: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
    const lidas = conferirLinhas(linhas, {});
    expect(lidas.map(resumo)).toEqual(['GET /api/pedidos-construcao/pendentes 503 indisponivel']);
    expect(linhas.join('\n')).not.toMatch(/lock|timeout|55P03|57014|canceling|relation/i);
    expect((await construir.listar()).status).toBe(200);
  });
});
