// Bordas das rotas de demanda e de histórico (T16), da etapa 06-T16-testes: recusas que não podem gravar nem gastar
// número da sequência (C-36), criação simultânea, limite por hora pela rota, transições CA-07.2, CA-07.3 e CA-07.5 pela
// API, data e hora do evento (CA-06.4), ordem por data, isolamento do histórico e ids que não chegam ao banco (C-17).
// Banco, Better Auth e tokens reais (Testcontainers). O relógio é fixo e cada teste que depende dele define o instante
// e o devolve no fim (RNF-15): nenhum teste depende da ordem nem do relógio real.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { AGORA_TESTE, criarDepsDeTeste } from '../../../../test/deps';
import { chamarRota, type OpRequisicao } from '../../../../test/requisicao';
import { SENTINELAS, contemSentinela } from '../../../../test/sentinelas';
import { criarPessoa } from '../../../../test/sessao';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import { relogioFixo } from '../../../lib/relogio';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenServico, revogarTokenServico } from '../../../modules/acesso/tokens-servico';
import { MOTIVOS_TRANSICAO } from '../../../modules/demandas/transicoes';
import { MENSAGEM_LIMITE } from '../../../modules/limites';
import { GET as GET_HISTORICO } from './[id]/historico/route';
import { GET as GET_DEMANDA, PATCH } from './[id]/route';
import { GET as GET_LISTA, POST } from './route';

const relogio = relogioFixo(AGORA_TESTE);
let b: BancoDeTeste;
let deps: Deps;
// Uma pessoa por finalidade, para nenhum arquivo chegar perto das 30 criações por hora da mesma conta (M-03 da revisão).
let cookieCto: string;
let cookieAdm: string;
let cookieConcorrencia: string;
let cookieLimite: string;
let cookieOutra: string;
let cookieSequencia: string;
let tokenOrquestrador: string;
let tokenRevogado: string;
const linhasDeLog: string[] = [];

type Credencial = Pick<OpRequisicao, 'cookie' | 'bearer'>;
type Evento = { acao: string; ocorridoEm: string; entidadeId: string; ator: Record<string, unknown>; antes: unknown; depois: unknown };
const BASE = '/api/demandas';
const MINIMA = { titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' } as const;
// Bem formado (prefixo e 43 caracteres) e inexistente: passa na regex e só falha na busca pelo hash.
const TOKEN_INEXISTENTE = `wsod_${'A'.repeat(43)}`;

const cto = (): Credencial => ({ cookie: cookieCto });
const criar = (corpo: unknown, cred: Credencial = cto(), extra: OpRequisicao = {}) =>
  chamarRota(POST, { metodo: 'POST', caminho: BASE, corpo, ...cred, ...extra });
const listar = (qs = '', cred: Credencial = cto()) => chamarRota(GET_LISTA, { caminho: `${BASE}${qs}`, ...cred });
const obter = (id: string, cred: Credencial = cto()) =>
  chamarRota(GET_DEMANDA, { caminho: `${BASE}/${encodeURIComponent(id)}`, params: { id }, ...cred });
const alterar = (id: string, corpo: unknown, cred: Credencial = cto(), extra: OpRequisicao = {}) =>
  chamarRota(PATCH, { metodo: 'PATCH', caminho: `${BASE}/${encodeURIComponent(id)}`, params: { id }, corpo, ...cred, ...extra });
const historico = (id: string, cred: Credencial = cto()) =>
  chamarRota(GET_HISTORICO, { caminho: `${BASE}/${encodeURIComponent(id)}/historico`, params: { id }, ...cred });

async function criarOk(corpo: Record<string, unknown> = {}, cred: Credencial = cto()): Promise<{ id: string } & Record<string, unknown>> {
  const r = await criar({ ...MINIMA, ...corpo }, cred);
  expect(r.status).toBe(201);
  return (await r.json()) as { id: string } & Record<string, unknown>;
}

async function itensDoHistorico(id: string, cred: Credencial = cto()): Promise<Evento[]> {
  const r = await historico(id, cred);
  expect(r.status).toBe(200);
  return ((await r.json()) as { itens: Evento[] }).itens;
}

// O instante vale só dentro de `fn`; depois o relógio volta ao padrão, aconteça o que acontecer.
async function noInstante<T>(iso: string, fn: () => Promise<T>): Promise<T> {
  relogio.definir(iso);
  try {
    return await fn();
  } finally {
    relogio.definir(AGORA_TESTE);
  }
}

async function sequencia(): Promise<{ v: string; chamada: boolean }> {
  const r = await b.poolMigrator.query<{ v: string; chamada: boolean }>('select last_value::text as v, is_called as chamada from demanda_seq');
  return r.rows[0]!;
}
const proximoNumero = (s: { v: string; chamada: boolean }) => (s.chamada ? Number(s.v) + 1 : Number(s.v));

const contarDemandas = async () => Number((await b.poolMigrator.query<{ n: string }>('select count(*)::text as n from demanda')).rows[0]!.n);
const contarEventos = async () => Number((await b.poolMigrator.query<{ n: string }>('select count(*)::text as n from evento')).rows[0]!.n);

async function linhaDaDemanda(id: string) {
  const r = await b.poolMigrator.query<{ status: string; titulo: string; linha_servico_provavel: string | null; atualizada_em: Date }>(
    'select status, titulo, linha_servico_provavel, atualizada_em from demanda where id = $1',
    [id],
  );
  return r.rows[0]!;
}

const forcarStatus = (id: string, status: string) => b.poolMigrator.query('update demanda set status = $2 where id = $1', [id, status]);

beforeAll(async () => {
  substituirDestinoDoLog({
    write: (l) => {
      linhasDeLog.push(l);
    },
  });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio });
  definirDepsParaTeste(deps);
  cookieCto = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  cookieAdm = (await criarPessoa(deps, { papel: 'administradora' })).cookie;
  cookieConcorrencia = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  cookieLimite = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  cookieOutra = (await criarPessoa(deps, { papel: 'administradora' })).cookie;
  cookieSequencia = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  tokenOrquestrador = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'orquestrador', deps.relogio))).token;
  const revogar = await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'orquestrador', deps.relogio));
  expect(await comTransacao(b.poolApp, (t) => revogarTokenServico(t, revogar.prefixo, deps.relogio))).toBe(true);
  tokenRevogado = revogar.token;
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('POST /api/demandas: bordas', () => {
  it('CA-03.3: só o tipo "outro" → 400 só com tipo; só sem título → 400 só com titulo', async () => {
    const soTipo = await criar({ ...MINIMA, tipo: 'outro' });
    expect(soTipo.status).toBe(400);
    expect(((await soTipo.json()) as { campos: Array<{ campo: string }> }).campos.map((c) => c.campo)).toEqual(['tipo']);
    const semTitulo = await criar({ tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' });
    expect(semTitulo.status).toBe(400);
    const corpo = (await semTitulo.json()) as { campos: Array<{ campo: string; mensagem: string }> };
    expect(corpo.campos).toEqual([{ campo: 'titulo', mensagem: 'Campo obrigatório.' }]);
  });

  type CasoRecusa = { nome: string; status: number; erro: string; mensagem?: string; op: () => OpRequisicao };
  const RECUSAS: CasoRecusa[] = [
    { nome: 'CA-01.3: sem sessão nem token', status: 401, erro: 'nao_autenticado', mensagem: MENSAGENS_ACESSO.nao_autenticado, op: () => ({}) },
    { nome: 'CA-02.3: token revogado', status: 401, erro: 'nao_autenticado', mensagem: MENSAGENS_ACESSO.token_invalido, op: () => ({ bearer: tokenRevogado }) },
    { nome: 'CA-02.3: token bem formado que não existe', status: 401, erro: 'nao_autenticado', mensagem: MENSAGENS_ACESSO.token_invalido, op: () => ({ bearer: TOKEN_INEXISTENTE }) },
    { nome: 'cookie e Bearer juntos (ator ambíguo)', status: 400, erro: 'entrada_invalida', mensagem: MENSAGENS_ACESSO.ambiguo, op: () => ({ cookie: cookieCto, bearer: tokenOrquestrador }) },
    { nome: 'C-15: cookie sem Origin', status: 403, erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao, op: () => ({ cookie: cookieCto, semOrigin: true }) },
    { nome: 'C-15: cookie sem Content-Type', status: 415, erro: 'tipo_nao_suportado', op: () => ({ cookie: cookieCto, semContentType: true }) },
    { nome: 'C-15: cookie com Content-Type text/plain', status: 415, erro: 'tipo_nao_suportado', op: () => ({ cookie: cookieCto, cabecalhos: { 'content-type': 'text/plain' } }) },
    { nome: 'C-15: Bearer com corpo sem Content-Type', status: 415, erro: 'tipo_nao_suportado', op: () => ({ bearer: tokenOrquestrador, semContentType: true }) },
    { nome: 'C-17: corpo acima de 512 KB', status: 413, erro: 'corpo_grande', op: () => ({ cookie: cookieCto, corpo: JSON.stringify({ ...MINIMA, contexto: 'a'.repeat(600 * 1024) }) }) },
    { nome: 'corpo JSON null', status: 400, erro: 'entrada_invalida', op: () => ({ cookie: cookieCto, corpo: 'null' }) },
    { nome: 'corpo JSON que é lista', status: 400, erro: 'entrada_invalida', op: () => ({ cookie: cookieCto, corpo: JSON.stringify([MINIMA]) }) },
  ];

  it.each(RECUSAS)('C-36: $nome → $status, sem gravar demanda nem evento e sem gastar número da sequência', async ({ status, erro, mensagem, op }) => {
    const [n, eventos, seq] = [await contarDemandas(), await contarEventos(), await sequencia()];
    const { cookie, bearer, ...extra } = op();
    linhasDeLog.length = 0;
    const r = await criar(MINIMA, { cookie, bearer }, extra);
    expect(r.status).toBe(status);
    const corpo = (await r.json()) as { erro: string; mensagem: string };
    expect(corpo.erro).toBe(erro);
    if (mensagem) expect(corpo.mensagem).toBe(mensagem);
    // C-21: a linha de log da recusa tem o código, e não a credencial recebida.
    const log = linhasDeLog.join('\n');
    expect(log).toContain(`"codigoErro":"${erro}"`);
    if (bearer) expect(log).not.toContain(bearer.slice(5));
    if (cookie) {
      const sessao = /wsod\.session_token=([^;]+)/.exec(cookie)?.[1];
      expect(sessao).toBeTruthy();
      expect(log).not.toContain(sessao!);
    }
    expect(await contarDemandas()).toBe(n);
    expect(await contarEventos()).toBe(eventos);
    expect(await sequencia()).toEqual(seq);
    // A criação válida seguinte usa exatamente o número que estava livre.
    const d = await criarOk({}, { cookie: cookieSequencia });
    expect(d.id.endsWith(`-${String(proximoNumero(seq)).padStart(4, '0')}`)).toBe(true);
  });

  it('C-15: Content-Type JSON com parâmetro de charset é aceito', async () => {
    const r = await criar(MINIMA, cto(), { cabecalhos: { 'content-type': 'application/json; charset=utf-8' } });
    expect(r.status).toBe(201);
  });

  it('CA-01.2: sessão sem 2FA → 403 sem_2fa no POST e na fila, sem gravar', async () => {
    const p = await criarPessoa(deps, { papel: 'cto', com2fa: false });
    const { rows } = await b.poolMigrator.query<{ criada: Date }>(
      'select created_at as criada from session where user_id = $1 order by created_at desc limit 1',
      [p.usuarioId],
    );
    // A sessão sem 2FA vale 15 min contados do relógio injetado: o instante sai da própria sessão, não da hora real.
    await noInstante(new Date(new Date(rows[0]!.criada).getTime() + 60_000).toISOString(), async () => {
      const n = await contarDemandas();
      const r = await criar(MINIMA, { cookie: p.cookie });
      expect(r.status).toBe(403);
      expect(await r.json()).toEqual({ erro: 'sem_2fa', mensagem: MENSAGENS_ACESSO.sem_2fa });
      expect(await contarDemandas()).toBe(n);
      const fila = await listar('', { cookie: p.cookie });
      expect(fila.status).toBe(403);
      expect(await fila.json()).toEqual({ erro: 'sem_2fa', mensagem: MENSAGENS_ACESSO.sem_2fa });
    });
  });

  it('CA-04.1 pela rota: 23h30 de 22/10 em São Paulo (02h30 UTC de 23/10) gera id com 20261022', async () => {
    const d = await noInstante('2026-10-23T02:30:00Z', () => criarOk({ titulo: 'Fim do dia em São Paulo' }));
    expect(d.id).toMatch(/^DEM-20261022-\d{4}$/);
    expect(d.criadaEm).toBe('2026-10-23T02:30:00.000Z');
  });

  it('cinco POST simultâneos da mesma pessoa → cinco 201, ids distintos e consecutivos, um evento de criação cada', async () => {
    const seq = await sequencia();
    const respostas = await Promise.all(
      Array.from({ length: 5 }, (_, i) => criar({ ...MINIMA, titulo: `Simultânea ${i}` }, { cookie: cookieConcorrencia })),
    );
    expect(respostas.map((r) => r.status)).toEqual([201, 201, 201, 201, 201]);
    const ids = await Promise.all(respostas.map(async (r) => ((await r.json()) as { id: string }).id));
    expect(new Set(ids).size).toBe(5);
    const numeros = ids.map((id) => Number(id.slice(-4))).sort((x, y) => x - y);
    const primeiro = proximoNumero(seq);
    expect(numeros).toEqual([primeiro, primeiro + 1, primeiro + 2, primeiro + 3, primeiro + 4]);
    const ev = await b.poolMigrator.query<{ demanda_id: string; n: string }>(
      `select demanda_id, count(*)::text as n from evento where acao = 'demanda_criada' and demanda_id = any($1) group by demanda_id`,
      [ids],
    );
    expect(ev.rows).toHaveLength(5);
    expect(ev.rows.every((l) => l.n === '1')).toBe(true);
  });

  it(
    'C-36 pela rota: a 31ª demanda da mesma pessoa na hora → 429, sem gravar nem gastar número; outra pessoa passa; uma hora depois, passa',
    async () => {
      await noInstante('2026-10-27T12:00:00Z', async () => {
        for (let i = 0; i < 30; i++) {
          expect((await criar({ ...MINIMA, titulo: `Limite ${i}` }, { cookie: cookieLimite })).status, `criação ${i + 1}`).toBe(201);
        }
        const [n, seq] = [await contarDemandas(), await sequencia()];
        const r = await criar(MINIMA, { cookie: cookieLimite });
        expect(r.status).toBe(429);
        expect(await r.json()).toEqual({ erro: 'limite_excedido', mensagem: MENSAGEM_LIMITE.demanda });
        expect(await contarDemandas()).toBe(n);
        expect(await sequencia()).toEqual(seq);
        expect((await criar(MINIMA, { cookie: cookieOutra })).status).toBe(201);
        relogio.definir('2026-10-27T13:00:00.001Z');
        expect((await criar(MINIMA, { cookie: cookieLimite })).status).toBe(201);
      });
    },
    90_000,
  );
});

describe('GET /api/demandas: bordas', () => {
  it('CA-06.2 na borda: limit 1 e 100 passam; 0, 101, texto, fração e negativo dão 400 com o campo limit', async () => {
    for (const limit of ['1', '100']) {
      const r = await listar(`?limit=${limit}`);
      expect(r.status, limit).toBe(200);
      expect(((await r.json()) as { limit: number }).limit).toBe(Number(limit));
    }
    for (const limit of ['0', '101', 'abc', '1.5', '-1']) {
      const r = await listar(`?limit=${limit}`);
      expect(r.status, limit).toBe(400);
      expect(((await r.json()) as { campos: Array<{ campo: string }> }).campos.map((c) => c.campo), limit).toEqual(['limit']);
    }
  });

  it('RF-06: a fila ordena pela data de criação, não pelo id (a criada antes, com id maior, vem depois)', async () => {
    const filtro = { tipo: 'produto_proprio', linhaServicoProvavel: 'diagnostico_sustentacao' };
    const maisNova = await noInstante('2026-10-24T10:00:00Z', () => criarOk({ ...filtro, titulo: 'Criada às 10h' }));
    const maisAntiga = await noInstante('2026-10-24T09:00:00Z', () => criarOk({ ...filtro, titulo: 'Criada às 9h' }));
    expect(Number(maisAntiga.id.slice(-4))).toBeGreaterThan(Number(maisNova.id.slice(-4)));
    const r = await listar('?tipo=produto_proprio&linhaServicoProvavel=diagnostico_sustentacao');
    const corpo = (await r.json()) as { itens: Array<{ id: string }>; total: number };
    expect(corpo.total).toBe(2);
    expect(corpo.itens.map((i) => i.id)).toEqual([maisNova.id, maisAntiga.id]);
  });
});

describe('GET /api/demandas/:id: bordas', () => {
  it('C-17: ids quase no formato → 404 sem nenhuma consulta ao banco, nas três rotas', async () => {
    const consultas = vi.spyOn(b.poolApp, 'query');
    const conexoes = vi.spyOn(b.poolApp, 'connect');
    try {
      for (const id of ['dem-20261022-0001', 'DEM-20261022-0001\n', ' DEM-20261022-0001', 'DEM-20261022-00001', 'DEM-２０２６1022-0001', '']) {
        const r = await obter(id);
        expect(r.status, JSON.stringify(id)).toBe(404);
        expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
        expect((await alterar(id, { titulo: 'x' })).status, JSON.stringify(id)).toBe(404);
        expect((await historico(id)).status, JSON.stringify(id)).toBe(404);
      }
      expect(consultas).not.toHaveBeenCalled();
      expect(conexoes).not.toHaveBeenCalled();
    } finally {
      consultas.mockRestore();
      conexoes.mockRestore();
    }
  });

  it('RF-06: a demanda criada por agente aparece com responsável agente, sem o token nem o prefixo dele', async () => {
    const d = await criarOk({}, { bearer: tokenOrquestrador });
    const r = await obter(d.id);
    const texto = await r.text();
    expect(texto).not.toContain(tokenOrquestrador.slice(0, 13));
    expect(JSON.parse(texto)).toMatchObject({ id: d.id, rascunhoAgente: true, responsavel: { tipo: 'agente', agente: 'orquestrador' } });
  });
});

describe('PATCH /api/demandas/:id: bordas', () => {
  type CasoPatch = { nome: string; status: number; erro: string; op: () => OpRequisicao };
  const RECUSAS_PATCH: CasoPatch[] = [
    { nome: 'CA-01.3: sem sessão nem token', status: 401, erro: 'nao_autenticado', op: () => ({}) },
    { nome: 'C-15: cookie sem Content-Type', status: 415, erro: 'tipo_nao_suportado', op: () => ({ cookie: cookieCto, semContentType: true }) },
    { nome: 'C-15: cookie com Origin de outro site', status: 403, erro: 'sem_permissao', op: () => ({ cookie: cookieCto, cabecalhos: { origin: 'https://outro.test' } }) },
    { nome: 'cookie e Bearer juntos', status: 400, erro: 'entrada_invalida', op: () => ({ cookie: cookieCto, bearer: tokenOrquestrador }) },
    { nome: 'CA-02.3: token revogado', status: 401, erro: 'nao_autenticado', op: () => ({ bearer: tokenRevogado }) },
  ];

  it.each(RECUSAS_PATCH)('$nome → $status, e nem o status nem o título mudam, nem sai evento', async ({ status, erro, op }) => {
    const d = await criarOk();
    const [antes, eventos] = [await linhaDaDemanda(d.id), await contarEventos()];
    const { cookie, bearer, ...extra } = op();
    const r = await alterar(d.id, { status: 'em_analise', titulo: 'Título que não pode ficar' }, { cookie, bearer }, extra);
    expect(r.status).toBe(status);
    expect(((await r.json()) as { erro: string }).erro).toBe(erro);
    expect(await linhaDaDemanda(d.id)).toEqual(antes);
    expect(await contarEventos()).toBe(eventos);
  });

  it('CA-07.2 pela API: estudo em aprovada → em_construcao → 409 com o motivo, e o status não muda', async () => {
    const d = await criarOk({ tipo: 'estudo', titulo: 'Estudo de viabilidade' });
    await forcarStatus(d.id, 'aprovada');
    const r = await alterar(d.id, { status: 'em_construcao' });
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ erro: 'conflito', mensagem: MOTIVOS_TRANSICAO.estudo });
    expect((await linhaDaDemanda(d.id)).status).toBe('aprovada');
  });

  it('CA-07.2 (contraprova): demanda que não é estudo vai de aprovada para em_construcao', async () => {
    const d = await criarOk({ tipo: 'novo_projeto', titulo: 'Projeto aprovado' });
    await forcarStatus(d.id, 'aprovada');
    const r = await alterar(d.id, { status: 'em_construcao' });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ status: 'em_construcao' });
  });

  it('CA-07.3 pela API: em_construcao → entregue muda o status, e o histórico registra a pessoa, antes, depois e a hora', async () => {
    const d = await criarOk();
    await forcarStatus(d.id, 'em_construcao');
    const quando = '2026-10-25T18:45:00.000Z';
    const r = await noInstante(quando, () => alterar(d.id, { status: 'entregue' }));
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ id: d.id, status: 'entregue', atualizadaEm: quando });
    const [ultimo] = await itensDoHistorico(d.id);
    expect(ultimo).toMatchObject({
      acao: 'status_alterado',
      ocorridoEm: quando,
      ator: { tipo: 'pessoa', nome: expect.any(String), papel: 'cto' },
      antes: { status: 'em_construcao' },
      depois: { status: 'entregue' },
    });
  });

  it.each([
    { de: 'entregue', mensagem: 'Entregue é um status final. Não há próxima mudança.' },
    { de: 'encerrada', mensagem: 'Encerrada é um status final. Não há próxima mudança.' },
  ])('CA-07.5 pela API: de $de, nenhuma mudança de status passa (409), e os campos enviados junto não mudam', async ({ de, mensagem }) => {
    const d = await criarOk();
    await forcarStatus(d.id, de);
    const antes = await linhaDaDemanda(d.id);
    for (const para of ['em_analise', 'em_construcao', 'devolvida', 'nova']) {
      const r = await alterar(d.id, { status: para, titulo: 'Título que não pode ficar' });
      expect(r.status, para).toBe(409);
      expect(await r.json()).toEqual({ erro: 'conflito', mensagem });
    }
    expect(await linhaDaDemanda(d.id)).toEqual(antes);
  });

  it('CA-06.4: o evento traz a data e a hora do relógio da alteração', async () => {
    const d = await criarOk({ linhaServicoProvavel: 'sob_medida' });
    const quando = '2026-10-24T14:05:00.000Z';
    expect((await noInstante(quando, () => alterar(d.id, { linhaServicoProvavel: 'automacao_integracao' }))).status).toBe(200);
    const [ultimo] = await itensDoHistorico(d.id);
    expect(ultimo).toMatchObject({
      acao: 'campo_alterado',
      ocorridoEm: quando,
      antes: { linhaServicoProvavel: 'sob_medida' },
      depois: { linhaServicoProvavel: 'automacao_integracao' },
    });
  });

  it('RF-06: null limpa um campo opcional e vai ao histórico; null em campo obrigatório → 400 com o campo', async () => {
    const d = await criarOk({ linhaServicoProvavel: 'sob_medida' });
    const r = await alterar(d.id, { linhaServicoProvavel: null });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ linhaServicoProvavel: null });
    const [ultimo] = await itensDoHistorico(d.id);
    expect(ultimo).toMatchObject({ acao: 'campo_alterado', antes: { linhaServicoProvavel: 'sob_medida' }, depois: { linhaServicoProvavel: null } });
    for (const campo of ['titulo', 'tipo', 'solicitanteNome', 'anexos']) {
      const recusa = await alterar(d.id, { [campo]: null });
      expect(recusa.status, campo).toBe(400);
      expect(((await recusa.json()) as { campos: Array<{ campo: string }> }).campos.map((c) => c.campo), campo).toEqual([campo]);
    }
    expect(await linhaDaDemanda(d.id)).toMatchObject({ titulo: MINIMA.titulo });
  });

  it('RF-21: alteração pela administradora aparece no histórico com o papel administradora', async () => {
    const d = await criarOk();
    expect((await alterar(d.id, { urgencia: 'baixa' }, { cookie: cookieAdm })).status).toBe(200);
    const [ultimo] = await itensDoHistorico(d.id);
    expect(ultimo).toMatchObject({ acao: 'campo_alterado', ator: { tipo: 'pessoa', papel: 'administradora' } });
  });
});

describe('GET /api/demandas/:id/historico: bordas', () => {
  it('RF-21: o histórico de uma demanda não traz evento de outra nem o texto bruto dela', async () => {
    const a = await criarOk({ titulo: 'Demanda A' });
    const outra = await criarOk({ titulo: 'Demanda B' });
    expect((await alterar(outra.id, { status: 'em_analise' })).status).toBe(200);
    await b.poolMigrator.query(`insert into entrada_bruta (demanda_id, texto, origem, recebida_em) values ($1, $2, $3, now())`, [
      a.id,
      SENTINELAS.texto,
      JSON.stringify({ canal: 'email', referencia: SENTINELAS.email }),
    ]);
    const r = await historico(a.id);
    const texto = await r.text();
    expect(contemSentinela(texto)).toBe(false);
    expect(texto).not.toContain(outra.id);
    const { itens } = JSON.parse(texto) as { itens: Evento[] };
    expect(itens.map((i) => i.acao)).toEqual(['demanda_criada']);
    expect(itens.every((i) => i.entidadeId === a.id)).toBe(true);
  });

  it('RF-21: do mais novo para o mais antigo pela hora do evento', async () => {
    const d = await noInstante('2026-10-24T08:00:00Z', () => criarOk());
    expect((await noInstante('2026-10-24T08:10:00Z', () => alterar(d.id, { status: 'em_analise' }))).status).toBe(200);
    expect((await noInstante('2026-10-24T08:20:00Z', () => alterar(d.id, { urgencia: 'alta' }))).status).toBe(200);
    const itens = await itensDoHistorico(d.id);
    expect(itens.map((i) => [i.acao, i.ocorridoEm])).toEqual([
      ['campo_alterado', '2026-10-24T08:20:00.000Z'],
      ['status_alterado', '2026-10-24T08:10:00.000Z'],
      ['demanda_criada', '2026-10-24T08:00:00.000Z'],
    ]);
  });
});
