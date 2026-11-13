// src/app/api/demandas/leitura-awave-andamento.test.ts — T09 do DEC-DEM-20261111-0017-v1 (RF-10, RF-11, AN-09,
// ADR-35, D-09, AN-06 c e D-06, CA-04.6 na leitura). O andamento chega ao Awave em quatro chaves (fase, tarefasProntas,
// tarefasTotal, atualizadoEm), montadas chave a chave, na mesma consulta da autoria; à pessoa, em seis; ao agente, em
// nenhuma. Rotas, tokens e Postgres reais (Testcontainers); a demanda do Awave nasce pelo POST dele, e a ESP, o RSK e o
// DEC dela são da pessoa, depois da confirmação; o andamento entra pela rota do /construir (ou pelo migrator, quando o
// caso pede uma linha que o app não grava). Tokens só gerados em tempo de teste e nunca em mensagem de expect.
// Relógio fixo, dados fictícios. Cada caso usa as próprias demandas: o arquivo não depende de ordem.
import { drizzle } from 'drizzle-orm/node-postgres';
import type pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import * as rotaDemanda from './[id]/route';
import * as rotaDemandas from './route';
import { criarPool, type Db } from '../../../db';
import * as schema from '../../../db/schema';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo } from '../../../lib/relogio';
import type { AtorPessoa } from '../../../modules/acesso/ator';
import { criarTokenServico } from '../../../modules/acesso/tokens-servico';
import type { CorpoAndamento } from '../../../modules/andamento/schemas';
import { confirmarDemanda } from '../../../modules/demandas/confirmar';
import { alterarDemandaSchema } from '../../../modules/demandas/schemas';
import { alterarDemanda } from '../../../modules/demandas/servico';
import { lerDemandaPara, obterDemanda, obterDemandaDaIntegracao, vistaDaDemandaPara, type DemandaVista } from '../../../modules/demandas/consultas';
import { criarEspecificacaoSchema } from '../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../modules/especificacoes/servico';
import { MENSAGEM_INDISPONIVEL } from '../../../modules/integracoes/tempo-limite';
import { criarParecerRiscoSchema } from '../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../modules/pareceres-risco/servico';
import { gerarPedido } from '../../../modules/pedido-construcao/gerar';
import { corpo, inserirAndamento } from '../../../../test/andamento';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { CORPO_DO_AWAVE, atorDeIntegracao, tokenDeIntegracao } from '../../../../test/integracoes';
import { CONFIRMADO, ESP_DO_PEDIDO, RSK_DO_PEDIDO, chamadasDoConstruir, preparadorDePedidos } from '../../../../test/pedidos-construcao';
import { chamarRota } from '../../../../test/requisicao';
import { criarPessoa } from '../../../../test/sessao';

const INEXISTENTE = 'DEM-20261113-9999';
const SETE = ['andamento', 'atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo'];
const QUATRO = ['atualizadoEm', 'fase', 'tarefasProntas', 'tarefasTotal'];
const SEIS_DA_PESSOA = ['atualizadoEm', 'decId', 'fase', 'statusConstrucao', 'tarefasProntas', 'tarefasTotal'];
// A vista mínima da 0.3.1 (vistaMinimaDaDemanda), sem `andamento` (CA-11.2).
const VISTA_MINIMA = [
  'agentesEmAndamento',
  'atualizadaEm',
  'contexto',
  'criadaEm',
  'descricaoProblema',
  'duvidasEntrada',
  'especificacoes',
  'id',
  'impactoPercebido',
  'justificativaUrgencia',
  'linhaServicoProvavel',
  'pacotesDecisao',
  'pareceresRisco',
  'rascunhoAgente',
  'responsavel',
  'solicitantePapel',
  'status',
  'tipo',
  'titulo',
  'urgencia',
].sort();
// O item de GET /api/demandas da 0.3.1 (a lista de demandas.test.ts), para pessoa e agente (CA-11.3).
const RESUMO = ['criadaEm', 'id', 'linhaServicoProvavel', 'origem', 'rascunhoAgente', 'status', 'tipo', 'titulo', 'urgencia'];
// As chaves que só o andamento tem: nenhuma pode aparecer onde o andamento não sai.
const CHAVES_DO_ANDAMENTO = ['"andamento"', '"fase"', '"tarefasProntas"', '"tarefasTotal"', '"statusConstrucao"', '"atualizadoEm"'];

const relogio = relogioFixo('2026-11-13T12:00:00Z');
const agoraIso = () => relogio.agora().toISOString();
const awave = atorDeIntegracao('awave');

let b: BancoDeTeste;
let deps: Deps;
let tokenAwave: string;
let tokenConstruir: string;
let tokenRisco: string;
let cookie: string;
let pessoa: AtorPessoa;

const construir = chamadasDoConstruir(() => tokenConstruir);
const preparador = preparadorDePedidos({
  deps: () => deps,
  rotulo: 'leitura-awave-andamento',
  entregar: () => Promise.reject(new Error('este teste não entrega pedido')),
});

type Credencial = { bearer: string } | { cookie: string };
type Obj = Record<string, unknown>;

const doAwave = (): Credencial => ({ bearer: tokenAwave });
const daPessoa = (): Credencial => ({ cookie });
const doAgente = (): Credencial => ({ bearer: tokenRisco });

const ler = (id: string, c: Credencial) => chamarRota(rotaDemanda.GET, { caminho: `/api/demandas/${id}`, params: { id }, ...c, semOrigin: 'bearer' in c });
const listar = (c: Credencial) => chamarRota(rotaDemandas.GET, { caminho: '/api/demandas?limit=100', ...c, semOrigin: 'bearer' in c });

// A resposta inteira, para comparar byte a byte: status, cabeçalhos (sem a data) e corpo.
async function foto(r: Response) {
  const cabecalhos = [...r.headers].filter(([k]) => k !== 'date');
  return { status: r.status, cabecalhos, corpo: await r.text() };
}

async function lerJson(id: string, c: Credencial): Promise<{ texto: string; corpo: Obj }> {
  const r = await ler(id, c);
  expect(r.status, id).toBe(200);
  const texto = await r.text();
  return { texto, corpo: JSON.parse(texto) as Obj };
}

// A demanda nasce pelo POST do Awave (o 201 dele vai junto).
async function criarDoAwave(): Promise<{ id: string; criado: Obj }> {
  const r = await chamarRota(rotaDemandas.POST, { metodo: 'POST', caminho: '/api/demandas', bearer: tokenAwave, corpo: CORPO_DO_AWAVE, semOrigin: true });
  expect(r.status).toBe(201);
  const criado = (await r.json()) as Obj;
  return { id: criado.id as string, criado };
}

// A demanda do Awave confirmada pela pessoa, com ESP, RSK e DEC dela, o DEC aprovado e o pedido gerado.
async function pedidoDoAwave(): Promise<{ id: string; decId: string }> {
  const { id } = await criarDoAwave();
  await confirmarDemanda(deps, pessoa, id);
  // O contexto do Awave cita o nome dele, e o pedido recusa nome na descrição (conferir.ts): a pessoa o reescreve.
  await alterarDemanda(deps, pessoa, id, alterarDemandaSchema.parse({ contexto: 'Importação diária do ERP (fictício)' }));
  const autora = preparador.novaAutora();
  await criarEspecificacao(deps, autora, id, criarEspecificacaoSchema.parse(ESP_DO_PEDIDO));
  await criarParecerRisco(deps, autora, id, criarParecerRiscoSchema.parse(RSK_DO_PEDIDO));
  const decId = await preparador.novoDec(autora, id);
  await preparador.aprovar(decId);
  await gerarPedido(deps, preparador.geradora, decId, CONFIRMADO);
  // A pessoa leva a demanda a aprovada (pronta_para_decisao → aprovada é manual): o primeiro envio a leva a em_construcao.
  await alterarDemanda(deps, pessoa, id, alterarDemandaSchema.parse({ status: 'aprovada' }));
  return { id, decId };
}

// O envio do /construir pela rota real, como o enviarAndamento manda.
async function enviar(decId: string, c: Partial<CorpoAndamento> = {}): Promise<void> {
  const r = await construir.andamento(decId, corpo(c));
  expect(r.status).toBe(204);
}

beforeAll(async () => {
  substituirDestinoDoLog({ write: () => undefined });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  tokenAwave = await tokenDeIntegracao(deps, 'awave');
  tokenConstruir = await tokenDeIntegracao(deps, 'construir');
  tokenRisco = (await comTransacao(deps.pool, (t) => criarTokenServico(t, 'risco', relogio))).token;
  const p = await criarPessoa(deps, { papel: 'cto' });
  cookie = p.cookie;
  pessoa = { tipo: 'pessoa', usuarioId: p.usuarioId, nome: 'Pessoa Ficticia', papel: 'cto' };
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});
// Cada caso numa janela de uma hora própria: o limite de 10 demandas por hora do Awave (C-36) não pesa de um caso no outro.
beforeEach(() => {
  relogio.avancar(2 * 3_600_000);
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('RF-10: o Awave lê o andamento da demanda que ele criou, em quatro chaves', () => {
  it('CA-10.1: construindo 9/17 → 200 com exatamente as sete chaves, e o andamento com exatamente quatro', async () => {
    const { id, decId } = await pedidoDoAwave();
    await enviar(decId);
    const { texto, corpo: v } = await lerJson(id, doAwave());
    expect(Object.keys(v).sort()).toEqual(SETE);
    expect(Object.keys(v.andamento as Obj).sort()).toEqual(QUATRO);
    expect(v.andamento).toEqual({ fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, atualizadoEm: agoraIso() });
    // aprovada → em_construcao pelo envio (RF-05); o status sai no topo, como na 0.3.1.
    expect(v.status).toBe('em_construcao');
    // Nem o DEC, nem a situação da construção, nem o prefixo do token.
    expect(texto).not.toContain(decId);
    expect(texto).not.toContain('statusConstrucao');
    expect(texto).not.toContain('ficticio');
    // G3.3: o prefixo não vai à mensagem do expect, nem se a asserção falhar.
    expect(texto.includes(tokenConstruir.slice('wsod_'.length, 'wsod_'.length + 8))).toBe(false);
  });

  it('CA-10.2: sem andamento, `andamento: null` (com e sem pedido gerado)', async () => {
    const semPedido = await criarDoAwave();
    const comPedido = await pedidoDoAwave();
    for (const id of [semPedido.id, comPedido.id]) {
      const { corpo: v } = await lerJson(id, doAwave());
      expect(Object.keys(v).sort(), id).toEqual(SETE);
      expect(v.andamento, id).toBeNull();
    }
  });

  it('CA-10.3: demanda de pessoa com andamento, lida pelo Awave, responde igual ao id inexistente (status, cabeçalhos e corpo)', async () => {
    const { demandaId, decId } = await preparador.prepararDec();
    await enviar(decId, { fase: 'testando', tarefasProntas: 16, tarefasTotal: 17 });
    // Controle: o andamento existe (a pessoa o lê).
    expect((await lerJson(demandaId, daPessoa())).corpo.andamento).toMatchObject({ decId, fase: 'testando' });
    const esperado = await foto(await ler(INEXISTENTE, doAwave()));
    expect(esperado.status).toBe(404);
    expect(JSON.parse(esperado.corpo)).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
    expect(await foto(await ler(demandaId, doAwave()))).toEqual(esperado);
  });

  it('CA-10.4: o 201 do POST do Awave tem as sete chaves, com `andamento: null`, e é igual ao GET seguinte', async () => {
    const { id, criado } = await criarDoAwave();
    expect(Object.keys(criado).sort()).toEqual(SETE);
    expect(criado.andamento).toBeNull();
    expect((await lerJson(id, doAwave())).corpo).toEqual(criado);
  });

  it('CA-10.5: levada a devolvida pelo `cancelado` do /construir → status devolvida, andamento sem statusConstrucao nem decId', async () => {
    const { id, decId } = await pedidoDoAwave();
    await enviar(decId);
    await enviar(decId, { fase: 'revisando_e_entregando', tarefasProntas: 12, tarefasTotal: 17, status: 'cancelado' });
    const { texto, corpo: v } = await lerJson(id, doAwave());
    expect(v.status).toBe('devolvida');
    expect(Object.keys(v.andamento as Obj).sort()).toEqual(QUATRO);
    expect(v.andamento).toEqual({ fase: 'revisando_e_entregando', tarefasProntas: 12, tarefasTotal: 17, atualizadoEm: agoraIso() });
    expect(texto).not.toContain('cancelado');
    expect(texto).not.toContain(decId);
  });
});

describe('RF-11: a pessoa lê seis campos; o agente, nenhum', () => {
  it('CA-11.1: a pessoa (cookie) lê a mesma demanda do Awave com o andamento em seis campos', async () => {
    const { id, decId } = await pedidoDoAwave();
    await enviar(decId);
    const { corpo: v } = await lerJson(id, daPessoa());
    expect(Object.keys(v.andamento as Obj).sort()).toEqual(SEIS_DA_PESSOA);
    expect(v.andamento).toEqual({ decId, fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, statusConstrucao: 'em_construcao', atualizadoEm: agoraIso() });
  });

  it('CA-11.2 e CA-11.3: o agente lê a vista mínima da 0.3.1, sem o andamento; os itens da listagem têm as chaves da 0.3.1', async () => {
    const { id, decId } = await pedidoDoAwave();
    await enviar(decId, { fase: 'testando', tarefasProntas: 987, tarefasTotal: 988 });
    // Controle: a pessoa vê os números.
    expect((await lerJson(id, daPessoa())).texto).toMatch(/\b987\b/);

    const { texto, corpo: v } = await lerJson(id, doAgente());
    expect(Object.keys(v).sort()).toEqual(VISTA_MINIMA);
    for (const k of CHAVES_DO_ANDAMENTO) expect(texto, k).not.toContain(k);
    expect(texto).not.toMatch(/\b98[78]\b/);

    for (const [nome, c] of [
      ['pessoa', daPessoa()],
      ['agente', doAgente()],
    ] as const) {
      const r = await listar(c);
      expect(r.status, nome).toBe(200);
      const lista = await r.text();
      const itens = (JSON.parse(lista) as { itens: Obj[] }).itens;
      expect(itens.map((i) => i.id), nome).toContain(id);
      for (const i of itens) expect(Object.keys(i).sort(), nome).toEqual(RESUMO);
      for (const k of CHAVES_DO_ANDAMENTO) expect(lista, `${nome} ${k}`).not.toContain(k);
      expect(lista, nome).not.toMatch(/\b98[78]\b/);
    }
  });
});

describe('AN-09 e ADR-35: lista de permissão e a mesma consulta da autoria', () => {
  it('vistaDaDemandaPara(awave, d) com o andamento de seis campos (e chave a mais) devolve o andamento em quatro', async () => {
    const { id, decId } = await pedidoDoAwave();
    await enviar(decId);
    const d = await obterDemanda(deps.db, id);
    expect(Object.keys(d.andamento ?? {}).sort()).toEqual(SEIS_DA_PESSOA);
    const comExtra = { ...d, andamento: { ...d.andamento, prefixo: 'ficticio' } } as DemandaVista;
    const v = vistaDaDemandaPara(awave, comExtra) as unknown as Obj;
    expect(Object.keys(v).sort()).toEqual(SETE);
    expect(v.andamento).toEqual({ fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, atualizadoEm: relogio.agora() });
  });

  it('D-09: uma consulta só, com o mesmo SQL para a própria, a de outro autor e a inexistente (sem oráculo)', async () => {
    const proprio = await pedidoDoAwave();
    await enviar(proprio.decId);
    const outro = await preparador.prepararDec();
    await enviar(outro.decId);
    const capturadas: Array<{ sql: string; params: unknown[] }> = [];
    const db: Db = drizzle(b.poolApp, { schema, casing: 'snake_case', logger: { logQuery: (sql, params) => void capturadas.push({ sql, params }) } });

    const v = await obterDemandaDaIntegracao(db, awave, proprio.id);
    expect(v.andamento).toMatchObject({ fase: 'construindo' });
    expect(capturadas).toHaveLength(1);
    const sqlDaPropria = capturadas[0]!.sql;
    expect(sqlDaPropria).toContain('ultimo_andamento');
    expect(sqlDaPropria).not.toContain(proprio.id);

    for (const id of [outro.demandaId, INEXISTENTE]) {
      capturadas.length = 0;
      await expect(obterDemandaDaIntegracao(db, awave, id), id).rejects.toMatchObject({ codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
      expect(capturadas, id).toHaveLength(1);
      expect(capturadas[0]!.sql, id).toBe(sqlDaPropria);
    }
  });
});

describe('CA-04.6 na leitura: linha fora do esquema vira "sem andamento", sem 500', () => {
  it('o último andamento fora do esquema (fase inventada; prontas > total) dá `andamento: null` na vista da pessoa e na do Awave', async () => {
    const doAwaveP = await pedidoDoAwave();
    const dePessoa = await preparador.prepararDec({ gerar: false });
    const gravadoEm = relogio.agora();
    // Controle: com uma linha válida, as duas vistas mostram o andamento.
    await inserirAndamento(b, { demandaId: doAwaveP.id, decId: doAwaveP.decId, fase: 'construindo', prontas: 3, total: 5, gravadoEm });
    await inserirAndamento(b, { demandaId: dePessoa.demandaId, decId: dePessoa.decId, fase: 'construindo', prontas: 3, total: 5, gravadoEm });
    expect((await lerJson(doAwaveP.id, doAwave())).corpo.andamento).toMatchObject({ tarefasProntas: 3 });
    expect((await lerJson(dePessoa.demandaId, daPessoa())).corpo.andamento).toMatchObject({ tarefasProntas: 3 });

    // Só neste banco de teste: sem os CHECK de fase e de tarefas, o migrator grava o que o app nunca gravaria. Nenhum outro
    // caso deste arquivo depende desses CHECK.
    await b.poolMigrator.query('alter table andamento_construcao drop constraint andamento_construcao_fase_check');
    await b.poolMigrator.query('alter table andamento_construcao drop constraint andamento_construcao_tarefas_check');
    await inserirAndamento(b, { demandaId: doAwaveP.id, decId: doAwaveP.decId, fase: 'fase_inventada', prontas: 3, total: 5, gravadoEm });
    await inserirAndamento(b, { demandaId: dePessoa.demandaId, decId: dePessoa.decId, fase: 'testando', prontas: 20, total: 17, gravadoEm });

    for (const [id, c] of [
      [doAwaveP.id, doAwave()],
      [doAwaveP.id, daPessoa()],
      [dePessoa.demandaId, daPessoa()],
    ] as const) {
      const { texto, corpo: v } = await lerJson(id, c);
      expect(v.andamento, id).toBeNull();
      expect(texto, id).not.toContain('fase_inventada');
    }
    expect(Object.keys((await lerJson(doAwaveP.id, doAwave())).corpo).sort()).toEqual(SETE);
  });
});

describe('AN-06 (c) e D-06: a leitura do Awave com o andamento roda dentro do prazo total de 8 s', () => {
  it('7 s gastos na espera pela conexão: 200 com o andamento', async () => {
    const { id, decId } = await pedidoDoAwave();
    await enviar(decId);
    const pool = criarPool(b.urlApp, { max: 1 });
    const segura = await pool.connect();
    try {
      // Relógio parado: nada de tempo corre entre as instruções, e o resultado não depende da velocidade da máquina.
      let agora = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => agora);
      const pendente = lerDemandaPara({ db: deps.db, pool }, awave, id);
      agora = 7_000;
      segura.release();
      const v = (await pendente) as unknown as Obj;
      expect(Object.keys(v).sort()).toEqual(SETE);
      expect(v.andamento).toEqual({ fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, atualizadoEm: relogio.agora() });
    } finally {
      await pool.end();
    }
  });

  // O relógio monotônico pula no fim da consulta que junta o andamento (a do alias `ultimo_andamento`), observada pelo
  // cliente do pg (o molde de registrar-qa.test.ts): 9 s passa do prazo, 7 s não. A leitura tem uma consulta só, então o
  // ponto não depende de quantas vezes o prazo lê o relógio.
  const juntaOAndamento = (args: unknown[]): boolean => {
    const q = args[0];
    const texto = typeof q === 'string' ? q : ((q ?? {}) as { text?: string }).text ?? '';
    return texto.includes('"ultimo_andamento"');
  };

  async function lerComSaltoNaConsulta(id: string, salto: number): Promise<{ resultado: unknown; disparou: number }> {
    let agora = 0;
    let disparou = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => agora);
    const pool = criarPool(b.urlApp, { max: 1 });
    const conectar = pool.connect.bind(pool) as unknown as () => Promise<pg.PoolClient>;
    (pool as unknown as { connect: () => Promise<pg.PoolClient> }).connect = async () => {
      const cliente = await conectar();
      const original = cliente.query.bind(cliente) as unknown as (...a: unknown[]) => Promise<unknown>;
      (cliente as unknown as { query: (...a: unknown[]) => Promise<unknown> }).query = (...a: unknown[]) => {
        const r = original(...a);
        if (!juntaOAndamento(a)) return r;
        return r.then((x) => {
          disparou++;
          agora = salto;
          return x;
        });
      };
      return cliente;
    };
    try {
      const resultado = await lerDemandaPara({ db: deps.db, pool }, awave, id).then(
        (v) => v,
        (x: unknown) => x,
      );
      return { resultado, disparou };
    } finally {
      await pool.end();
    }
  }

  it('o relógio passa de 8 s durante a consulta do andamento: 503 indisponivel, sem vista', async () => {
    const { id, decId } = await pedidoDoAwave();
    await enviar(decId);
    const { resultado, disparou } = await lerComSaltoNaConsulta(id, 9_000);
    expect(disparou).toBe(1);
    expect(resultado).toBeInstanceOf(ErroDominio);
    expect(resultado).toMatchObject({ codigo: 'indisponivel', mensagem: MENSAGEM_INDISPONIVEL });
  });

  it('controle: o mesmo salto, de 7 s, fica dentro do prazo e devolve o andamento', async () => {
    const { id, decId } = await pedidoDoAwave();
    await enviar(decId);
    const { resultado, disparou } = await lerComSaltoNaConsulta(id, 7_000);
    expect(disparou).toBe(1);
    expect((resultado as Obj).andamento).toEqual({ fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, atualizadoEm: relogio.agora() });
  });
});
