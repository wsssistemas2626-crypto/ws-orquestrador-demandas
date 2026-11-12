// T15, etapa 06-T15-testes (qa-automacao): o que os testes da construção não cobriam no seed das integrações (IN-17,
// V-01, D-09, G3.10).
// (1) Pendência da 06-T15-revisao: o log do seed não leva título, decId, sha256, prefixo nem texto do Awave (G3.10).
// (2) Minor 3 da revisão: o `TOTAL_DEMANDAS_DO_SEED - 5` de scripts.test.ts só vale se as cinco das integrações forem as
//     últimas demandas criadas e os dois DECs delas vierem depois dos três de antes. Aqui isso fica conferido.
// (3) Minor 4 da revisão: as demandas dos dois pedidos têm o mesmo molde das demandas do e2e da 0.2.0.
// (4) V-01 sobre o banco semeado, pelas três rotas e com token real do /construir, como o buscar-pedidos.mjs faz: o
//     pedido a buscar é entregue (os bytes não mudam entre duas entregas), SHA errado dá 409, o certo tira da lista e a
//     segunda passada lista 0; o pedido já recebido é entregue com o mesmo hash que o seed gravou.
// (5) O Awave sobre o banco semeado, com token real (prefixo diferente do `ficticio`): lê as três dele em seis chaves e
//     não lê a demanda de pessoa; começa com 3 das 10 da hora (sete criações e a oitava dá 429), e as 3 do seed saem da
//     janela depois de uma hora (pendência da T20).
// (6) A confirmação sobre o banco semeado: a `awaveConfirmar` confirma, a `awaveEncerrada` recusa por status final e a
//     demanda de pessoa recusa por origem (pré-condição da T18).
// Cada describe tem o banco dele (Testcontainers) e relógio fixo; os testes que gravam são um `it` só por banco. O token
// só nasce em tempo de teste e nunca vai a mensagem de expect (G3.3). Só dado fictício.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as rotaDemanda from '../src/app/api/demandas/[id]/route';
import * as rotaDemandas from '../src/app/api/demandas/route';
import { definirDepsParaTeste, type Deps } from '../src/lib/deps';
import { ErroDominio } from '../src/lib/erros';
import { substituirDestinoDoLog } from '../src/lib/log';
import { relogioFixo } from '../src/lib/relogio';
import type { AtorPessoa } from '../src/modules/acesso/ator';
import { aguardaConfirmacao } from '../src/modules/demandas/confirmacao';
import { MENSAGENS_CONFIRMACAO, confirmarDemanda } from '../src/modules/demandas/confirmar';
import { MENSAGEM_LIMITE_AWAVE } from '../src/modules/limites';
import { entregarPedido } from '../src/modules/pedido-construcao/entregar';
import { shasEntregues } from '../src/modules/pedido-construcao/pendentes';
import { novoBanco, type BancoDeTeste } from '../test/banco';
import { criarDepsDeTeste } from '../test/deps';
import { CORPO_DO_AWAVE, atorDeIntegracao, tokenDeIntegracao } from '../test/integracoes';
import { chamadasDoConstruir, sha256DoTexto } from '../test/pedidos-construcao';
import { chamarRota } from '../test/requisicao';
import { CONTAS_FICTICIAS, TITULOS_DO_E2E, TOTAL_DEMANDAS_DO_SEED, seedFicticio } from './seed-ficticio';

const AGORA = '2026-11-12T15:00:00Z';
const MINUTO = 60_000;
const DO_AWAVE = [TITULOS_DO_E2E.awaveAguardando, TITULOS_DO_E2E.awaveConfirmar, TITULOS_DO_E2E.awaveEncerrada];
const DOS_PEDIDOS = [TITULOS_DO_E2E.pedidoParaBuscar, TITULOS_DO_E2E.pedidoRecebido];
const DA_T15: readonly string[] = [...DO_AWAVE, ...DOS_PEDIDOS];

type Linha = Record<string, unknown>;
const linhas = async (b: BancoDeTeste, sql: string, valores: unknown[] = []): Promise<Linha[]> => (await b.poolMigrator.query(sql, valores)).rows;
const contar = async (b: BancoDeTeste, sql: string, valores: unknown[] = []): Promise<number> => Number((await linhas(b, sql, valores))[0]!.n);

async function idDaDemanda(b: BancoDeTeste, titulo: string): Promise<string> {
  const r = await linhas(b, 'select id from demanda where titulo = $1', [titulo]);
  expect(r, titulo).toHaveLength(1);
  return r[0]!.id as string;
}

async function decDaDemanda(b: BancoDeTeste, titulo: string): Promise<string> {
  const r = await linhas(b, 'select p.id from pacote_decisao p join demanda d on d.id = p.demanda_id where d.titulo = $1', [titulo]);
  expect(r, titulo).toHaveLength(1);
  return r[0]!.id as string;
}

async function semear(relogio = relogioFixo(AGORA)): Promise<{ b: BancoDeTeste; deps: Deps }> {
  const b = await novoBanco();
  const deps = await criarDepsDeTeste(b, { relogio });
  expect(await seedFicticio(deps, { SEED_FICTICIO: '1' })).toBe('semeado');
  return { b, deps };
}

describe('seed das integrações: log, ordem de criação e molde (banco semeado, só leitura)', () => {
  let b: BancoDeTeste;
  let deps: Deps;
  const linhasDoLog: string[] = [];

  beforeAll(async () => {
    substituirDestinoDoLog({ write: (l) => void linhasDoLog.push(l) });
    ({ b, deps } = await semear());
  });
  afterAll(async () => {
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });

  it('G3.10: o log do seed não leva título, decId, sha256, prefixo, token nem texto do Awave; a linha do seed só tem a quantidade', async () => {
    const texto = linhasDoLog.join('');
    const decIds = await Promise.all(DOS_PEDIDOS.map((t) => decDaDemanda(b, t)));
    const [sha] = await shasEntregues(b.db, await decDaDemanda(b, TITULOS_DO_E2E.pedidoRecebido));
    expect(sha).toMatch(/^[0-9a-f]{64}$/);
    const proibidos: Array<[string, string]> = [
      ...DA_T15.map((t): [string, string] => [`título ${t}`, t]),
      ...decIds.map((id): [string, string] => [`decId ${id}`, id]),
      ['sha256 da entrega', sha!],
      // Como valor de campo: o nome do evento `seed_ficticio` e os e-mails `@ficticio.test` têm a palavra por outro motivo.
      ['prefixo fictício', '"ficticio"'],
      ['formato de token', 'wsod_'],
      ['solicitante Awave', 'Awave'],
      ['descrição do Awave', 'relatório semanal'],
      ['contexto do Awave', '/aprovacoes'],
    ];
    for (const [rotulo, valor] of proibidos) expect(texto.toLowerCase().includes(valor.toLowerCase()), rotulo).toBe(false);
    const doSeed = linhasDoLog
      .map((l) => JSON.parse(l) as Record<string, unknown>)
      .filter((l) => l.evento === 'seed_ficticio')
      .map((l) => Object.fromEntries(Object.entries(l).filter(([k]) => k !== 'level' && k !== 'time')));
    expect(doSeed).toEqual([{ evento: 'seed_ficticio', status: 'semeado', quantidade: TOTAL_DEMANDAS_DO_SEED }]);
  });

  it('Minor 3: as cinco das integrações são as últimas demandas criadas, e os dois DECs delas vêm depois dos três de antes', async () => {
    const ordem = (
      await linhas(
        b,
        `select d.titulo from evento e join demanda d on d.id = e.demanda_id
          where e.acao = 'demanda_criada' and e.entidade = 'demanda' order by e.id`,
      )
    ).map((l) => l.titulo as string);
    expect(ordem).toHaveLength(TOTAL_DEMANDAS_DO_SEED);
    // É o que dá sentido ao `TOTAL_DEMANDAS_DO_SEED - 5` de scripts.test.ts (terceiro aviso): o 5 é o tamanho deste bloco.
    expect(ordem.slice(-DA_T15.length)).toEqual(DA_T15);
    expect(ordem.slice(0, -DA_T15.length).filter((t) => DA_T15.includes(t))).toEqual([]);
    const decsNaOrdem = (
      await linhas(
        b,
        `select d.titulo from (select entidade_id, min(id) as primeiro from evento where entidade = 'pacote_decisao' group by entidade_id) e
           join pacote_decisao p on p.id = e.entidade_id join demanda d on d.id = p.demanda_id order by e.primeiro`,
      )
    ).map((l) => l.titulo as string);
    expect(decsNaOrdem).toEqual([
      'Pedidos do marketplace duplicados no ERP (fictício)',
      TITULOS_DO_E2E.etapasDupla,
      TITULOS_DO_E2E.decisaoRecomendaB,
      ...DOS_PEDIDOS,
    ]);
  });

  it('Minor 4: as demandas dos dois pedidos têm o molde das demandas do e2e da 0.2.0 (tipo, solicitante, papel, linha e autora)', async () => {
    const molde = async (titulo: string) => {
      const [l] = await linhas(
        b,
        `select d.tipo, d.solicitante_nome, d.solicitante_papel, d.linha_servico_provavel, d.urgencia, d.rascunho_agente,
                d.autor_tipo, u.email, length(trim(coalesce(d.contexto, ''))) > 0 as tem_contexto
           from demanda d left join "user" u on u.id = d.autor_id where d.titulo = $1`,
        [titulo],
      );
      return l;
    };
    const referencia = await molde(TITULOS_DO_E2E.etapasDupla);
    expect(referencia).toEqual({
      tipo: 'melhoria',
      solicitante_nome: 'Pessoa Ficticia Produto',
      solicitante_papel: 'produto',
      linha_servico_provavel: 'sob_medida',
      urgencia: null,
      rascunho_agente: false,
      autor_tipo: 'pessoa',
      email: CONTAS_FICTICIAS.sem2fa.email,
      tem_contexto: true,
    });
    for (const titulo of DOS_PEDIDOS) expect(await molde(titulo), titulo).toEqual(referencia);
  });

  it('a entrega do pedido já recebido devolve o mesmo hash que o seed gravou, sem gravar outro pedido_entregue', async () => {
    const decId = await decDaDemanda(b, TITULOS_DO_E2E.pedidoRecebido);
    const doSeed = await shasEntregues(b.db, decId);
    expect(doSeed).toHaveLength(1);
    const eventos = await contar(b, 'select count(*)::int as n from evento');
    const { json, sha256 } = await entregarPedido(deps, atorDeIntegracao('construir'), decId);
    expect(sha256).toBe(doSeed[0]);
    expect(sha256DoTexto(json)).toBe(doSeed[0]);
    expect(await contar(b, 'select count(*)::int as n from evento')).toBe(eventos);
  });
});

describe('V-01 sobre o banco semeado: as três rotas com o token do /construir', () => {
  let b: BancoDeTeste;
  let deps: Deps;
  let token = '';

  beforeAll(async () => {
    substituirDestinoDoLog({ write: () => undefined });
    ({ b, deps } = await semear());
    definirDepsParaTeste(deps);
    token = await tokenDeIntegracao(deps, 'construir');
  });
  afterAll(async () => {
    definirDepsParaTeste(null);
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });

  it('busca o pedido a buscar, confere o SHA, confirma o recebimento; a segunda passada lista 0; o já recebido mantém o hash do seed', async () => {
    const api = chamadasDoConstruir(() => token);
    const buscar = await decDaDemanda(b, TITULOS_DO_E2E.pedidoParaBuscar);
    const recebido = await decDaDemanda(b, TITULOS_DO_E2E.pedidoRecebido);
    const eventosDe = (decId: string, acao: string) =>
      contar(b, 'select count(*)::int as n from evento where entidade_id = $1 and acao = $2', [decId, acao]);

    const lista = await api.listar();
    expect(lista.status).toBe(200);
    expect(await lista.json()).toEqual({ itens: [{ decId: buscar }] });

    const primeira = await api.entregar(buscar);
    expect(primeira.status).toBe(200);
    const texto = await primeira.text();
    expect(JSON.parse(texto)).toMatchObject({ pedido: buscar, demanda: { titulo: TITULOS_DO_E2E.pedidoParaBuscar, tipo: 'melhoria' } });
    const segunda = await api.entregar(buscar);
    expect(segunda.status).toBe(200);
    expect((await segunda.text()) === texto, 'os bytes das duas entregas são iguais').toBe(true);
    expect(await eventosDe(buscar, 'pedido_entregue')).toBe(1);
    const sha = sha256DoTexto(texto);
    expect(await shasEntregues(b.db, buscar)).toEqual([sha]);

    const errado = sha256DoTexto(`${texto} `);
    const r409 = await api.receber(buscar, { sha256: errado });
    expect(r409.status).toBe(409);
    expect(await eventosDe(buscar, 'pedido_recebido')).toBe(0);
    expect(await (await api.listar()).json()).toEqual({ itens: [{ decId: buscar }] });

    const r204 = await api.receber(buscar, { sha256: sha });
    expect(r204.status).toBe(204);
    expect(await eventosDe(buscar, 'pedido_recebido')).toBe(1);
    expect(await (await api.listar()).json()).toEqual({ itens: [] });
    // Repetir não grava de novo (RF, item 13 da especificação).
    expect((await api.receber(buscar, { sha256: sha })).status).toBe(204);
    expect(await eventosDe(buscar, 'pedido_recebido')).toBe(1);

    // O já recebido no seed: a entrega devolve os bytes do hash gravado no seed e não grava outro pedido_entregue.
    const [doSeed] = await shasEntregues(b.db, recebido);
    const doRecebido = await api.entregar(recebido);
    expect(doRecebido.status).toBe(200);
    expect(sha256DoTexto(await doRecebido.text())).toBe(doSeed);
    expect(await eventosDe(recebido, 'pedido_entregue')).toBe(1);
    expect(await eventosDe(recebido, 'pedido_recebido')).toBe(1);
  });
});

describe('Awave sobre o banco semeado: leitura das próprias e o limite que começa em 3 de 10', () => {
  let b: BancoDeTeste;
  let deps: Deps;
  let token = '';
  const relogio = relogioFixo(AGORA);

  beforeAll(async () => {
    substituirDestinoDoLog({ write: () => undefined });
    ({ b, deps } = await semear(relogio));
    definirDepsParaTeste(deps);
    token = await tokenDeIntegracao(deps, 'awave');
  });
  afterAll(async () => {
    definirDepsParaTeste(null);
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });

  const ler = (id: string) => chamarRota(rotaDemanda.GET, { caminho: `/api/demandas/${id}`, params: { id }, bearer: token, semOrigin: true });
  const criar = () => chamarRota(rotaDemandas.POST, { metodo: 'POST', caminho: '/api/demandas', bearer: token, semOrigin: true, corpo: CORPO_DO_AWAVE });

  it('lê as três do seed em seis chaves e não a de pessoa; sete criações na hora, a oitava 429, e depois de uma hora volta a criar', async () => {
    // O token do teste tem outro prefixo: a leitura é pela autoria (integracao, awave), não pelo token que criou.
    // O título não é conferido aqui: a vista do Awave passa o título pela minimização do nome do solicitante, que é
    // "Awave", e os títulos do seed citam "Awave" (ver Pendências da 06-T15-testes).
    for (const titulo of DO_AWAVE) {
      const id = await idDaDemanda(b, titulo);
      const r = await ler(id);
      expect(r.status, titulo).toBe(200);
      const corpo = (await r.json()) as Record<string, unknown>;
      expect(Object.keys(corpo).sort(), titulo).toEqual(['atualizadaEm', 'criadaEm', 'id', 'status', 'tipo', 'titulo']);
      expect(corpo, titulo).toMatchObject({ id, tipo: 'melhoria', status: titulo === TITULOS_DO_E2E.awaveEncerrada ? 'encerrada' : 'nova' });
    }
    const daPessoa = await ler(await idDaDemanda(b, TITULOS_DO_E2E.pedidoParaBuscar));
    expect(daPessoa.status).toBe(404);

    // As 3 do seed entram na janela: 7 criações passam e a oitava recebe 429, sem gravar.
    relogio.definir(AGORA);
    relogio.avancar(30 * MINUTO);
    for (let i = 1; i <= 7; i++) expect((await criar()).status, `criação ${i}`).toBe(201);
    const antes = await contar(b, 'select count(*)::int as n from demanda');
    const r429 = await criar();
    expect(r429.status).toBe(429);
    expect(await r429.json()).toEqual({ erro: 'limite_excedido', mensagem: MENSAGEM_LIMITE_AWAVE });
    expect(await contar(b, 'select count(*)::int as n from demanda')).toBe(antes);
    expect(antes).toBe(TOTAL_DEMANDAS_DO_SEED + 7);

    // Uma hora e um minuto depois do seed, as 3 dele saíram da janela (ficam as 7 de agora): volta a criar.
    relogio.definir(AGORA);
    relogio.avancar(61 * MINUTO);
    expect((await criar()).status).toBe(201);
  });
});

describe('confirmação das demandas do Awave do seed (pré-condição da T18)', () => {
  let b: BancoDeTeste;
  let deps: Deps;

  beforeAll(async () => {
    substituirDestinoDoLog({ write: () => undefined });
    ({ b, deps } = await semear());
  });
  afterAll(async () => {
    substituirDestinoDoLog(null);
    await deps.fila.parar();
    await b.fechar();
  });

  it('a awaveConfirmar confirma; a awaveEncerrada recusa por status final; a de pessoa recusa por origem; a awaveAguardando segue aguardando', async () => {
    const [u] = await linhas(b, 'select id, name from "user" where email = $1', [CONTAS_FICTICIAS.cto.email]);
    const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: u!.id as string, nome: u!.name as string, papel: 'cto' };
    const conflito = (mensagem: string) => expect.objectContaining({ codigo: 'conflito', mensagem });

    const confirmar = await idDaDemanda(b, TITULOS_DO_E2E.awaveConfirmar);
    expect(await confirmarDemanda(deps, cto, confirmar)).toEqual({ jaConfirmada: false });
    expect(await aguardaConfirmacao(b.db, confirmar)).toBe(false);

    const eventos = await contar(b, 'select count(*)::int as n from evento');
    const encerrada = confirmarDemanda(deps, cto, await idDaDemanda(b, TITULOS_DO_E2E.awaveEncerrada));
    await expect(encerrada).rejects.toBeInstanceOf(ErroDominio);
    await expect(encerrada).rejects.toEqual(conflito(MENSAGENS_CONFIRMACAO.statusFinal));
    const daPessoa = confirmarDemanda(deps, cto, await idDaDemanda(b, TITULOS_DO_E2E.pedidoParaBuscar));
    await expect(daPessoa).rejects.toEqual(conflito(MENSAGENS_CONFIRMACAO.outraOrigem));
    expect(await contar(b, 'select count(*)::int as n from evento')).toBe(eventos);

    expect(await aguardaConfirmacao(b.db, await idDaDemanda(b, TITULOS_DO_E2E.awaveAguardando))).toBe(true);
    expect(await contar(b, "select count(*)::int as n from evento where acao = 'demanda_confirmada'")).toBe(1);
  });
});
