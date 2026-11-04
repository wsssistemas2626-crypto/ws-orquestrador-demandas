// Rotas de demanda e de histórico (T16): RF-03, RF-06, RF-07 e RF-21 pela API, sobre o serviço da T15. Banco, Better
// Auth e tokens reais (Testcontainers); o relógio é fixo (RNF-15). Os handlers são chamados como o Next chama, pelo
// ajudante de test/requisicao.ts. O teste que percorre todas as rotas (test/matriz-rotas.test.ts) cobre a matriz
// inteira destas rotas; aqui ficam os comportamentos de cada uma.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../../test/banco';
import { criarDepsDeTeste } from '../../../../test/deps';
import { chamarRota, type OpRequisicao } from '../../../../test/requisicao';
import { SENTINELAS, contemSentinela } from '../../../../test/sentinelas';
import { criarPessoa } from '../../../../test/sessao';
import { comTransacao } from '../../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../../lib/deps';
import { MENSAGEM_NAO_ENCONTRADO } from '../../../lib/erros';
import { substituirDestinoDoLog } from '../../../lib/log';
import type { AtorPessoa } from '../../../modules/acesso/ator';
import { MENSAGENS_ACESSO } from '../../../modules/acesso/mensagens';
import { criarTokenServico } from '../../../modules/acesso/tokens-servico';
import { obterDemanda, vistaDaDemandaPara } from '../../../modules/demandas/consultas';
import { criarEspecificacaoSchema } from '../../../modules/especificacoes/schemas';
import { criarEspecificacao } from '../../../modules/especificacoes/servico';
import { criarPacoteDecisao } from '../../../modules/pacotes-decisao/criar';
import { criarPacoteDecisaoSchema } from '../../../modules/pacotes-decisao/schemas';
import { criarParecerRiscoSchema } from '../../../modules/pareceres-risco/schemas';
import { criarParecerRisco } from '../../../modules/pareceres-risco/servico';
import { GET as GET_HISTORICO } from './[id]/historico/route';
import { GET as GET_DEMANDA, PATCH } from './[id]/route';
import { GET as GET_LISTA, POST } from './route';

let b: BancoDeTeste;
let deps: Deps;
let cookieCto: string;
let cookieAdm: string;
let tokenOrquestrador: string;
let tokenRisco: string;
const linhasDeLog: string[] = [];

type Credencial = Pick<OpRequisicao, 'cookie' | 'bearer'>;
const BASE = '/api/demandas';
const RE_ID = /^DEM-\d{8}-\d{4}$/;
const MINIMA = { titulo: 'Pedidos duplicados', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' } as const;

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

async function sequencia(): Promise<{ v: string; chamada: boolean }> {
  const r = await b.poolMigrator.query<{ v: string; chamada: boolean }>('select last_value::text as v, is_called as chamada from demanda_seq');
  return r.rows[0]!;
}

async function linhaDaDemanda(id: string) {
  const r = await b.poolMigrator.query<{ status: string; linha_servico_provavel: string | null; autor_tipo: string; autor_id: string; rascunho_agente: boolean }>(
    'select status, linha_servico_provavel, autor_tipo, autor_id, rascunho_agente from demanda where id = $1',
    [id],
  );
  return r.rows[0];
}

const contarDemandas = async () => Number((await b.poolMigrator.query<{ n: string }>('select count(*)::text as n from demanda')).rows[0]!.n);

beforeAll(async () => {
  substituirDestinoDoLog({
    write: (l) => {
      linhasDeLog.push(l);
    },
  });
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
  cookieCto = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  cookieAdm = (await criarPessoa(deps, { papel: 'administradora' })).cookie;
  tokenOrquestrador = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'orquestrador', deps.relogio))).token;
  tokenRisco = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'risco', deps.relogio))).token;
});

afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});

describe('POST /api/demandas', () => {
  it('CA-03.1: título, solicitante e tipo → 201, id no formato, status nova, autoria da pessoa e linha no banco', async () => {
    const r = await criar(MINIMA);
    expect(r.status).toBe(201);
    expect(r.headers.get('cache-control')).toBe('no-store');
    const d = await r.json();
    expect(d.id).toMatch(RE_ID);
    expect(d.status).toBe('nova');
    expect(d.titulo).toBe(MINIMA.titulo);
    expect(d.rascunhoAgente).toBe(false);
    expect(d.responsavel).toEqual({ tipo: 'pessoa', nome: expect.any(String) });
    expect(d.anexos).toEqual([]);
    expect(d.especificacoes).toEqual([]);
    expect(d.pareceresRisco).toEqual([]);
    expect(d.pacotesDecisao).toEqual([]);
    expect(Object.keys(d)).not.toContain('autorId');
    expect(Object.keys(d)).not.toContain('texto');
    expect(Object.keys(d)).not.toContain('origem');
    expect(await linhaDaDemanda(d.id)).toMatchObject({ status: 'nova', autor_tipo: 'pessoa', rascunho_agente: false });
  });

  it('CA-03.3: tipo "outro" e sem título → 400 com a lista de campos, sem pilha, SQL nem nome de tabela', async () => {
    const r = await criar({ tipo: 'outro', solicitanteNome: 'Pessoa Ficticia' });
    expect(r.status).toBe(400);
    const corpo = await r.text();
    const json = JSON.parse(corpo) as { erro: string; campos: Array<{ campo: string }> };
    expect(json.erro).toBe('entrada_invalida');
    expect(json.campos.map((c) => c.campo).sort()).toEqual(['tipo', 'titulo']);
    expect(corpo).not.toMatch(/at \w+ \(|select |insert |demanda_seq|"demanda"/i);
    expect(corpo).not.toContain('outro');
  });

  it('C-36: 400 de validação não avança a sequência; a criação válida seguinte usa o próximo número', async () => {
    const antes = await sequencia();
    const r = await criar({ tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' });
    expect(r.status).toBe(400);
    expect(await sequencia()).toEqual(antes);
    const d = await criarOk();
    const esperado = antes.chamada ? Number(antes.v) + 1 : Number(antes.v);
    expect(d.id.endsWith(`-${String(esperado).padStart(4, '0')}`)).toBe(true);
  });

  it('C-11: autoria, status, id e rascunho vindos do corpo são descartados', async () => {
    const d = await criarOk({ id: 'DEM-20200101-0001', status: 'aprovada', autorTipo: 'agente', autorId: 'orquestrador', rascunhoAgente: true, responsavel: 'x' });
    expect(d.id).not.toBe('DEM-20200101-0001');
    expect(d.status).toBe('nova');
    expect(d.rascunhoAgente).toBe(false);
    expect(d.responsavel).toMatchObject({ tipo: 'pessoa' });
    expect(await linhaDaDemanda(d.id)).toMatchObject({ autor_tipo: 'pessoa', rascunho_agente: false });
  });

  it('token do orquestrador cria rascunho de agente, mesmo com rascunhoAgente:false no corpo', async () => {
    const d = await criarOk({ rascunhoAgente: false }, { bearer: tokenOrquestrador });
    expect(d.rascunhoAgente).toBe(true);
    expect(d.responsavel).toEqual({ tipo: 'agente', agente: 'orquestrador' });
    expect(await linhaDaDemanda(d.id)).toMatchObject({ autor_tipo: 'agente', autor_id: 'orquestrador', rascunho_agente: true });
  });

  it('token de outro agente → 403 e nada gravado, nem a sequência', async () => {
    const [n, seq] = [await contarDemandas(), await sequencia()];
    const r = await criar(MINIMA, { bearer: tokenRisco });
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    expect(await contarDemandas()).toBe(n);
    expect(await sequencia()).toEqual(seq);
  });

  it('CA-01.3: sem sessão nem token → 401 e nada gravado', async () => {
    const n = await contarDemandas();
    const r = await criar(MINIMA, {});
    expect(r.status).toBe(401);
    expect(await r.json()).toMatchObject({ erro: 'nao_autenticado' });
    expect(await contarDemandas()).toBe(n);
  });

  it('corpo que não é JSON válido → 400, sem detalhe do parser', async () => {
    const r = await criar('{"titulo": ', cto());
    expect(r.status).toBe(400);
    const corpo = await r.text();
    expect(corpo).not.toMatch(/SyntaxError|JSON\.parse|position/i);
  });

  it('C-15: com cookie e Origin de outro site → 403 e nada gravado', async () => {
    const n = await contarDemandas();
    const r = await criar(MINIMA, cto(), { cabecalhos: { origin: 'https://outro.test' } });
    expect(r.status).toBe(403);
    expect(await contarDemandas()).toBe(n);
  });
});

describe('GET /api/demandas', () => {
  it('CA-06.1: filtro por tipo devolve só as do tipo, com o total, da mais nova para a mais antiga', async () => {
    // O relógio é fixo: as duas têm a mesma data, e a ordem desempata pelo id.
    const a = await criarOk({ tipo: 'produto_proprio', titulo: 'Produto A' });
    const c =await criarOk({ tipo: 'produto_proprio', titulo: 'Produto B' });
    await criarOk({ tipo: 'estudo', titulo: 'Estudo fora do filtro' });
    const r = await listar('?tipo=produto_proprio');
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { itens: Array<{ id: string; tipo: string }>; total: number; limit: number; offset: number };
    expect(corpo.total).toBe(2);
    expect(corpo.limit).toBe(20);
    expect(corpo.offset).toBe(0);
    expect(corpo.itens.map((i) => i.id)).toEqual([c.id, a.id]);
    expect(corpo.itens.every((i) => i.tipo === 'produto_proprio')).toBe(true);
  });

  it('filtros combinados, limit e offset', async () => {
    await criarOk({ tipo: 'novo_projeto', linhaServicoProvavel: 'ia_controle_humano', titulo: 'IA 1' });
    const segunda = await criarOk({ tipo: 'novo_projeto', linhaServicoProvavel: 'ia_controle_humano', titulo: 'IA 2' });
    await criarOk({ tipo: 'novo_projeto', linhaServicoProvavel: 'sob_medida', titulo: 'Sob medida' });
    const r = await listar('?tipo=novo_projeto&linhaServicoProvavel=ia_controle_humano&status=nova&limit=1&offset=0');
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { itens: Array<{ id: string }>; total: number; limit: number; offset: number };
    expect(corpo).toMatchObject({ total: 2, limit: 1, offset: 0 });
    expect(corpo.itens.map((i) => i.id)).toEqual([segunda.id]);
    const r2 = await listar('?tipo=novo_projeto&linhaServicoProvavel=ia_controle_humano&limit=1&offset=5');
    expect(await r2.json()).toMatchObject({ itens: [], total: 2, offset: 5 });
  });

  it('o item da fila não traz solicitante, texto livre, anexos nem autor', async () => {
    await criarOk({ tipo: 'melhoria', solicitanteNome: SENTINELAS.nome, contexto: SENTINELAS.texto });
    const r = await listar('?tipo=melhoria');
    const texto = await r.text();
    expect(contemSentinela(texto)).toBe(false);
    const { itens } = JSON.parse(texto) as { itens: Array<Record<string, unknown>> };
    expect(itens.length).toBeGreaterThan(0);
    for (const i of itens) {
      expect(Object.keys(i).sort()).toEqual(['criadaEm', 'id', 'linhaServicoProvavel', 'rascunhoAgente', 'status', 'tipo', 'titulo', 'urgencia']);
    }
  });

  it('CA-06.2: limit=500 → 400 com o campo limit', async () => {
    const r = await listar('?limit=500');
    expect(r.status).toBe(400);
    expect(((await r.json()) as { campos: Array<{ campo: string }> }).campos.map((c) => c.campo)).toEqual(['limit']);
  });

  it('status, tipo e linha fora da lista, e chave repetida → 400', async () => {
    for (const qs of ['?status=arquivada', '?tipo=outro', '?linhaServicoProvavel=x', '?tipo=bug&tipo=melhoria', '?offset=-1']) {
      expect((await listar(qs)).status, qs).toBe(400);
    }
  });

  it('a fila é leitura para os agentes (matriz): token de agente → 200', async () => {
    expect((await listar('', { bearer: tokenRisco })).status).toBe(200);
    expect((await listar('', { cookie: cookieAdm })).status).toBe(200);
  });

  it('CA-01.3: sem sessão nem token → 401', async () => {
    expect((await listar('', {})).status).toBe(401);
  });
});

describe('GET /api/demandas/:id', () => {
  it('200 com a vista da demanda, sem texto bruto nem origem', async () => {
    const d = await criarOk({ urgencia: 'alta', justificativaUrgencia: 'Prazo do cliente', anexos: [{ tipo: 'url', referencia: 'https://exemplo.test/a' }] });
    await b.poolMigrator.query(`insert into entrada_bruta (demanda_id, texto, origem, recebida_em) values ($1, $2, $3, now())`, [
      d.id,
      SENTINELAS.texto,
      JSON.stringify({ canal: 'email', referencia: SENTINELAS.email }),
    ]);
    const r = await obter(d.id);
    expect(r.status).toBe(200);
    const texto = await r.text();
    expect(contemSentinela(texto)).toBe(false);
    const vista = JSON.parse(texto) as Record<string, unknown>;
    expect(vista).toMatchObject({ id: d.id, status: 'nova', urgencia: 'alta', anexos: [{ tipo: 'url', referencia: 'https://exemplo.test/a' }] });
    expect(Object.keys(vista)).not.toContain('texto');
    expect(Object.keys(vista)).not.toContain('origem');
  });

  it('agente lê a demanda (matriz): token de agente → 200', async () => {
    const d = await criarOk();
    expect((await obter(d.id, { bearer: tokenRisco })).status).toBe(200);
  });

  it('CA-06.3: GET /api/demandas/DEM-20261022-9999 → 404 com a mensagem da 03', async () => {
    const r = await obter('DEM-20261022-9999');
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it('id fora do formato → 404 sem nenhuma consulta ao banco, com ou sem credencial', async () => {
    const consultas = vi.spyOn(b.poolApp, 'query');
    const conexoes = vi.spyOn(b.poolApp, 'connect');
    try {
      for (const id of ['DEM-2026-1', "DEM-20261022-0001' or 1=1", 'ESP-DEM-20261022-0001-v1', 'x']) {
        for (const cred of [cto(), {}]) {
          const r = await obter(id, cred);
          expect(r.status, id).toBe(404);
          expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
        }
        expect((await alterar(id, { titulo: 'x' })).status, id).toBe(404);
        expect((await historico(id)).status, id).toBe(404);
      }
      expect(consultas).not.toHaveBeenCalled();
      expect(conexoes).not.toHaveBeenCalled();
    } finally {
      consultas.mockRestore();
      conexoes.mockRestore();
    }
  });

  it('CA-01.3: sem sessão nem token → 401', async () => {
    expect((await obter('DEM-20261022-0001', {})).status).toBe(401);
  });
});

// M-06 (DEC-DEM-20261103-0007-v1, C-10, RF-20): só a pessoa vê a vista inteira. Para qualquer outro ator, a leitura de
// demanda não traz solicitanteNome, anexos nem o nome da conta autora (na demanda e nas versões).
describe('M-06: minimização da leitura de demanda para quem não é pessoa', () => {
  const ANEXO = { tipo: 'url', referencia: 'https://exemplo.test/anexo-ficticio-0007' } as const;

  async function demandaComVersoesDePessoa(): Promise<{ id: string; nomeConta: string; decId: string }> {
    const p = await criarPessoa(deps, { papel: 'cto' });
    const nomeConta = (await b.poolMigrator.query<{ name: string }>('select name from "user" where id = $1', [p.usuarioId])).rows[0]!.name;
    const pessoa: AtorPessoa = { tipo: 'pessoa', usuarioId: p.usuarioId, nome: nomeConta, papel: 'cto' };
    const d = await criarOk({ solicitanteNome: SENTINELAS.nome, anexos: [ANEXO] }, { cookie: p.cookie });
    await criarEspecificacao(
      deps,
      pessoa,
      d.id,
      criarEspecificacaoSchema.parse({
        descricaoObjetiva: 'Corrigir pedidos duplicados',
        escopoInclui: ['Importação'],
        sistemaAlvo: 'meu-sistema',
        repositorioDestino: 'wsssistemas2626-crypto/meu-sistema',
        criteriosAceitePreliminares: ['Critério fictício'],
        definicaoDePronto: ['pnpm test verde'],
      }),
    );
    await criarParecerRisco(deps, pessoa, d.id, criarParecerRiscoSchema.parse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }));
    const dec = await criarPacoteDecisao(
      deps,
      pessoa,
      d.id,
      criarPacoteDecisaoSchema.parse({ resumoExecutivo: 'Resumo fictício', opcaoA: { descricao: 'A' }, opcaoB: { descricao: 'B' }, nivelAprovacaoRequerido: 'cto' }),
    );
    return { id: d.id, nomeConta, decId: dec.id };
  }

  const versoes = (v: Record<string, unknown>) =>
    [...(v.especificacoes as Array<Record<string, unknown>>), ...(v.pareceresRisco as Array<Record<string, unknown>>), ...(v.pacotesDecisao as Array<Record<string, unknown>>)];

  it('GET /api/demandas/:id com token de agente: sem solicitanteNome e anexos, responsavel { tipo: pessoa } e nenhum autor.nome', async () => {
    const { id, nomeConta, decId } = await demandaComVersoesDePessoa();
    for (const bearer of [tokenRisco, tokenOrquestrador]) {
      const r = await obter(id, { bearer });
      expect(r.status).toBe(200);
      const texto = await r.text();
      const v = JSON.parse(texto) as Record<string, unknown>;
      expect(Object.keys(v)).not.toContain('solicitanteNome');
      expect(Object.keys(v)).not.toContain('anexos');
      expect(v.responsavel).toEqual({ tipo: 'pessoa' });
      const vs = versoes(v);
      expect(vs).toHaveLength(3);
      for (const x of vs) expect(x.autor).toEqual({ tipo: 'pessoa' });
      expect((v.pacotesDecisao as Array<Record<string, unknown>>)[0]).toMatchObject({ id: decId, statusDecisao: 'pendente', desatualizado: false });
      expect(texto).not.toContain(nomeConta);
      expect(texto).not.toContain(ANEXO.referencia);
      expect(contemSentinela(texto)).toBe(false);
      // O que o agente precisa continua lá.
      expect(v).toMatchObject({ id, titulo: MINIMA.titulo, tipo: 'bug', status: 'pronta_para_decisao' });
    }
  });

  it('GET /api/demandas/:id com pessoa: tudo como antes, com nomes e anexos', async () => {
    const { id, nomeConta } = await demandaComVersoesDePessoa();
    const v = (await (await obter(id, { cookie: cookieAdm })).json()) as Record<string, unknown>;
    expect(v).toMatchObject({ solicitanteNome: SENTINELAS.nome, anexos: [ANEXO], responsavel: { tipo: 'pessoa', nome: nomeConta } });
    for (const x of versoes(v)) expect(x.autor).toEqual({ tipo: 'pessoa', nome: nomeConta });
  });

  it('POST /api/demandas do orquestrador: a resposta segue o mesmo contrato do agente', async () => {
    const r = await criar({ ...MINIMA, solicitanteNome: SENTINELAS.nome, anexos: [ANEXO] }, { bearer: tokenOrquestrador });
    expect(r.status).toBe(201);
    const texto = await r.text();
    const v = JSON.parse(texto) as Record<string, unknown>;
    expect(Object.keys(v)).not.toContain('solicitanteNome');
    expect(Object.keys(v)).not.toContain('anexos');
    expect(v.responsavel).toEqual({ tipo: 'agente', agente: 'orquestrador' });
    expect(contemSentinela(texto)).toBe(false);
    // A pessoa lê a mesma demanda inteira.
    expect(await (await obter(v.id as string)).json()).toMatchObject({ solicitanteNome: SENTINELAS.nome, anexos: [ANEXO] });
  });

  it('demanda de autor agente: o responsavel segue { tipo: agente, agente } também para o agente', async () => {
    const d = await criarOk({}, { bearer: tokenOrquestrador });
    expect((await (await obter(d.id, { bearer: tokenRisco })).json()).responsavel).toEqual({ tipo: 'agente', agente: 'orquestrador' });
  });

  it('a listagem, nos dois atores, só tem as chaves da fila', async () => {
    await demandaComVersoesDePessoa();
    for (const cred of [{ bearer: tokenRisco }, { cookie: cookieCto }]) {
      const texto = await (await listar('?tipo=bug', cred)).text();
      expect(contemSentinela(texto)).toBe(false);
      const { itens } = JSON.parse(texto) as { itens: Array<Record<string, unknown>> };
      expect(itens.length).toBeGreaterThan(0);
      for (const i of itens) expect(Object.keys(i).sort()).toEqual(['criadaEm', 'id', 'linhaServicoProvavel', 'rascunhoAgente', 'status', 'tipo', 'titulo', 'urgencia']);
    }
  });

  it('vistaDaDemandaPara: lista de permissão, só pessoa vê tudo (o ator sistema também recebe a vista mínima)', async () => {
    const { id } = await demandaComVersoesDePessoa();
    const vista = await obterDemanda(deps.db, id);
    const pessoa: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-x', nome: 'Pessoa Ficticia', papel: 'cto' };
    expect(vistaDaDemandaPara(pessoa, vista)).toBe(vista);
    const sistema = vistaDaDemandaPara({ tipo: 'sistema' }, vista) as Record<string, unknown>;
    expect(Object.keys(sistema)).not.toContain('solicitanteNome');
    expect(Object.keys(sistema)).not.toContain('anexos');
    expect(sistema.responsavel).toEqual({ tipo: 'pessoa' });
    // Campo novo da vista não vaza por omissão: a vista mínima só tem as chaves da lista.
    const comExtra = vistaDaDemandaPara({ tipo: 'sistema' }, { ...vista, campoNovo: SENTINELAS.texto } as typeof vista) as Record<string, unknown>;
    expect(Object.keys(comExtra)).not.toContain('campoNovo');
  });
});

// M-1 (DEC-DEM-20261103-0008-v1, RF-20): para quem não é pessoa, o texto livre da demanda sai pelo mesmo `minimizar` da
// entrada do agente, com o nome do solicitante da própria demanda; a pessoa lê o original. Dados fictícios da 01.
describe('M-1: texto livre da demanda minimizado para quem não é pessoa', () => {
  const NOME = 'Maria Ficticia Teste';
  const T = 'Falar com Maria Ficticia Teste, maria.teste@exemplo.invalid, CPF 123.456.789-09, tel (11) 90000-0000';
  const T_MIN = 'Falar com [nome removido], [e-mail removido], CPF [CPF removido], tel [telefone removido]';
  const VALORES = ['Maria Ficticia Teste', 'maria.teste@exemplo.invalid', '123.456.789-09', '(11) 90000-0000'];
  const CAMPOS = ['titulo', 'justificativaUrgencia', 'contexto', 'descricaoProblema', 'impactoPercebido'] as const;
  const corpoT = { titulo: T, tipo: 'bug', solicitanteNome: NOME, urgencia: 'alta', justificativaUrgencia: T, contexto: T, descricaoProblema: T, impactoPercebido: T };

  // Conta própria do bloco: as criações daqui não gastam o limite de requisições da conta do resto do arquivo.
  let cookieM1 = '';
  const p = (): Credencial => ({ cookie: cookieM1 });
  beforeAll(async () => {
    cookieM1 = (await criarPessoa(deps, { papel: 'cto' })).cookie;
  });

  const semValores = (texto: string) => {
    for (const v of VALORES) expect(texto).not.toContain(v);
  };

  async function demandaComT(): Promise<string> {
    const d = await criarOk(corpoT, p());
    await b.poolMigrator.query('update demanda set duvidas_entrada = $2::jsonb where id = $1', [d.id, JSON.stringify([T, 'Dúvida sem dado'])]);
    return d.id;
  }

  it('GET /api/demandas/:id com token de agente: os seis campos minimizados; nada dos quatro valores no corpo', async () => {
    const id = await demandaComT();
    for (const bearer of [tokenRisco, tokenOrquestrador]) {
      const texto = await (await obter(id, { bearer })).text();
      semValores(texto);
      const v = JSON.parse(texto) as Record<string, unknown>;
      for (const c of CAMPOS) expect(v[c], c).toBe(T_MIN);
      expect(v.duvidasEntrada).toEqual([T_MIN, 'Dúvida sem dado']);
    }
  });

  it('GET /api/demandas/:id com a pessoa: o texto original, sem marcador', async () => {
    const id = await demandaComT();
    const v = (await (await obter(id, p())).json()) as Record<string, unknown>;
    for (const c of CAMPOS) expect(v[c], c).toBe(T);
    expect(v.duvidasEntrada).toEqual([T, 'Dúvida sem dado']);
    expect(JSON.stringify(v)).not.toContain('removido]');
  });

  it('POST /api/demandas: o 201 do orquestrador sai minimizado; o da pessoa, original', async () => {
    const r = await criar(corpoT, { bearer: tokenOrquestrador });
    expect(r.status).toBe(201);
    const texto = await r.text();
    semValores(texto);
    const v = JSON.parse(texto) as Record<string, unknown>;
    for (const c of CAMPOS) expect(v[c], c).toBe(T_MIN);
    const daPessoa = await criarOk(corpoT, p());
    for (const c of CAMPOS) expect(daPessoa[c], c).toBe(T);
  });

  it('campo nulo segue null para o agente, sem sumir a chave', async () => {
    const d = await criarOk({ solicitanteNome: NOME }, p());
    const v = (await (await obter(d.id, { bearer: tokenRisco })).json()) as Record<string, unknown>;
    for (const c of ['justificativaUrgencia', 'contexto', 'descricaoProblema', 'impactoPercebido']) expect(v[c], c).toBeNull();
    expect(v.duvidasEntrada).toEqual([]);
  });

  it('GET /api/demandas: título minimizado só para o agente, com o nome do próprio solicitante; sem solicitanteNome nos dois', async () => {
    const a = await criarOk({ tipo: 'estudo', titulo: 'Pedido de Ana Exemplo Lima, falar com Bruno Exemplo Rocha', solicitanteNome: 'Ana Exemplo Lima' }, p());
    const c = await criarOk({ tipo: 'estudo', titulo: 'Pedido de Ana Exemplo Lima, falar com Bruno Exemplo Rocha', solicitanteNome: 'Bruno Exemplo Rocha' }, p());
    const t = await criarOk({ tipo: 'estudo', titulo: T, solicitanteNome: NOME }, p());
    const titulos = async (cred: Credencial) => {
      const texto = await (await listar('?tipo=estudo&limit=100', cred)).text();
      const { itens } = JSON.parse(texto) as { itens: Array<Record<string, unknown>> };
      for (const i of itens) expect(Object.keys(i)).not.toContain('solicitanteNome');
      return { texto, porId: new Map(itens.map((i) => [i.id as string, i.titulo])) };
    };
    const agente = await titulos({ bearer: tokenRisco });
    semValores(agente.texto);
    // M-1 do 0009 (DEC-DEM-20261104-0011-v1): a parte em comum ("Exemplo") também sai do nome do outro.
    expect(agente.porId.get(a.id)).toBe('Pedido de [nome removido], falar com Bruno [nome removido] Rocha');
    expect(agente.porId.get(c.id)).toBe('Pedido de Ana [nome removido] Lima, falar com [nome removido]');
    expect(agente.porId.get(t.id)).toBe(T_MIN);
    const pessoa = await titulos(p());
    expect(pessoa.porId.get(a.id)).toBe('Pedido de Ana Exemplo Lima, falar com Bruno Exemplo Rocha');
    expect(pessoa.porId.get(t.id)).toBe(T);
  });

  it('vistaDaDemandaPara: o ator sistema recebe o texto minimizado; a pessoa, a mesma vista', async () => {
    const id = await demandaComT();
    const vista = await obterDemanda(deps.db, id);
    const sistema = vistaDaDemandaPara({ tipo: 'sistema' }, vista) as Record<string, unknown>;
    for (const c of CAMPOS) expect(sistema[c], c).toBe(T_MIN);
    semValores(JSON.stringify(sistema));
    const pessoa: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-x', nome: 'Pessoa Ficticia', papel: 'cto' };
    expect(vistaDaDemandaPara(pessoa, vista)).toBe(vista);
  });

  // 04-regressao (qa-automacao): a listagem do agente só difere da da pessoa no título; nenhuma chave some ou sobra.
  it('04-regressao: na listagem, o item do agente tem as mesmas chaves e valores do da pessoa, menos o título', async () => {
    await criarOk({ tipo: 'estudo', titulo: T, solicitanteNome: NOME }, p());
    type Pagina = { itens: Array<Record<string, unknown>>; total: number; limit: number; offset: number };
    const pagina = async (cred: Credencial) => (await (await listar('?tipo=estudo&limit=100', cred)).json()) as Pagina;
    const daPessoa = await pagina(p());
    const doAgente = await pagina({ bearer: tokenRisco });
    expect({ ...doAgente, itens: null }).toEqual({ ...daPessoa, itens: null });
    const porId = new Map(daPessoa.itens.map((i) => [i.id, i]));
    let comparados = 0;
    for (const item of doAgente.itens) {
      const original = porId.get(item.id);
      if (!original) continue;
      comparados += 1;
      expect(Object.keys(item).sort()).toEqual(Object.keys(original).sort());
      expect({ ...item, titulo: '' }).toEqual({ ...original, titulo: '' });
      semValores(String(item.titulo));
    }
    expect(comparados).toBeGreaterThan(0);
  });

  // M-1 do 0009 (DEC-DEM-20261104-0011-v1, D-1): o primeiro nome sozinho, com inicial maiúscula, também sai como marcador
  // para o agente, no GET da demanda e na listagem; a pessoa lê o original. Nome fictício.
  it('M-1 do 0009: "a Joana pediu" sai com o marcador para o agente, e original para a pessoa', async () => {
    const titulo = 'Relatório da Joana';
    const contexto = 'A Joana pediu o relatório mensal.';
    const d = await criarOk({ tipo: 'estudo', titulo, contexto, solicitanteNome: 'Joana Ficticia' }, p());
    const doAgente = (await (await obter(d.id, { bearer: tokenRisco })).json()) as Record<string, unknown>;
    expect(doAgente.titulo).toBe('Relatório da [nome removido]');
    expect(doAgente.contexto).toBe('A [nome removido] pediu o relatório mensal.');
    const lista = (await (await listar('?tipo=estudo&limit=100', { bearer: tokenRisco })).json()) as { itens: Array<Record<string, unknown>> };
    expect(lista.itens.find((i) => i.id === d.id)?.titulo).toBe('Relatório da [nome removido]');
    expect(JSON.stringify(doAgente)).not.toContain('Joana');
    const daPessoa = (await (await obter(d.id, p())).json()) as Record<string, unknown>;
    expect(daPessoa.titulo).toBe(titulo);
    expect(daPessoa.contexto).toBe(contexto);
    const listaPessoa = (await (await listar('?tipo=estudo&limit=100', p())).json()) as { itens: Array<Record<string, unknown>> };
    expect(listaPessoa.itens.find((i) => i.id === d.id)?.titulo).toBe(titulo);
  });

  // 04-regressao do 0011 (qa-automacao), M-1 do 0009: a palavra comum em minúscula igual a uma parte do nome ("30 dias",
  // "suco de lima") e a partícula ("dos") ficam no texto do agente; as partes com inicial maiúscula saem; a pessoa lê o
  // original. Nos seis campos de texto do GET, no título da listagem e no 201 do POST do orquestrador. Nome fictício.
  describe('M-1 do 0009 (04-regressao do 0011): palavra comum em minúscula e partícula ficam', () => {
    const NOME_P = 'Bruno dos Santos Dias Lima';
    const TEXTO_P = 'Prazo de 30 dias para o Bruno; suco de lima e os dados dos clientes; Lima, Dias e Santos assinaram.';
    const MIN_P = 'Prazo de 30 dias para o [nome removido]; suco de lima e os dados dos clientes; [nome removido], [nome removido] e [nome removido] assinaram.';
    const PARTES = ['Bruno', 'Santos', 'Dias', 'Lima'];
    const corpoP = { titulo: TEXTO_P, tipo: 'estudo', solicitanteNome: NOME_P, urgencia: 'alta', justificativaUrgencia: TEXTO_P, contexto: TEXTO_P, descricaoProblema: TEXTO_P, impactoPercebido: TEXTO_P };

    const semPartes = (texto: string) => {
      for (const parte of PARTES) expect(texto, parte).not.toContain(parte);
      expect(texto).toContain('Prazo de 30 dias para o [nome removido]; suco de lima e os dados dos clientes');
    };

    it('GET da demanda e listagem: o agente recebe as partes trocadas e as palavras comuns; a pessoa, o original', async () => {
      const d = await criarOk(corpoP, p());
      await b.poolMigrator.query('update demanda set duvidas_entrada = $2::jsonb where id = $1', [d.id, JSON.stringify([TEXTO_P])]);
      for (const bearer of [tokenRisco, tokenOrquestrador]) {
        const texto = await (await obter(d.id, { bearer })).text();
        semPartes(texto);
        const v = JSON.parse(texto) as Record<string, unknown>;
        for (const c of CAMPOS) expect(v[c], c).toBe(MIN_P);
        expect(v.duvidasEntrada).toEqual([MIN_P]);
      }
      const lista = (await (await listar('?tipo=estudo&limit=100', { bearer: tokenRisco })).json()) as { itens: Array<Record<string, unknown>> };
      expect(lista.itens.find((i) => i.id === d.id)?.titulo).toBe(MIN_P);

      const daPessoa = (await (await obter(d.id, p())).json()) as Record<string, unknown>;
      for (const c of CAMPOS) expect(daPessoa[c], c).toBe(TEXTO_P);
      expect(daPessoa.duvidasEntrada).toEqual([TEXTO_P]);
      expect(daPessoa.solicitanteNome).toBe(NOME_P);
      const listaPessoa = (await (await listar('?tipo=estudo&limit=100', p())).json()) as { itens: Array<Record<string, unknown>> };
      expect(listaPessoa.itens.find((i) => i.id === d.id)?.titulo).toBe(TEXTO_P);
    });

    it('POST /api/demandas pelo orquestrador: o 201 sai com as partes trocadas e as palavras comuns; o banco guarda o original', async () => {
      const r = await criar(corpoP, { bearer: tokenOrquestrador });
      expect(r.status).toBe(201);
      const texto = await r.text();
      semPartes(texto);
      const v = JSON.parse(texto) as { id: string } & Record<string, unknown>;
      for (const c of CAMPOS) expect(v[c], c).toBe(MIN_P);
      const linha = await b.poolMigrator.query<{ titulo: string; contexto: string; solicitante_nome: string }>(
        'select titulo, contexto, solicitante_nome from demanda where id = $1',
        [v.id],
      );
      expect(linha.rows).toEqual([{ titulo: TEXTO_P, contexto: TEXTO_P, solicitante_nome: NOME_P }]);
    });
  });
});

describe('PATCH /api/demandas/:id', () => {
  it('CA-06.4: muda a linha de serviço, devolve a vista e grava o evento com antes, depois e a pessoa', async () => {
    const d = await criarOk();
    const r = await alterar(d.id, { linhaServicoProvavel: 'automacao_integracao' });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ id: d.id, linhaServicoProvavel: 'automacao_integracao' });
    expect(await linhaDaDemanda(d.id)).toMatchObject({ linha_servico_provavel: 'automacao_integracao' });
    const { itens } = (await (await historico(d.id)).json()) as { itens: Array<Record<string, unknown>> };
    expect(itens[0]).toMatchObject({
      acao: 'campo_alterado',
      ator: { tipo: 'pessoa', papel: 'cto' },
      antes: { linhaServicoProvavel: null },
      depois: { linhaServicoProvavel: 'automacao_integracao' },
    });
  });

  it('RF-07: transição permitida muda o status e grava status_alterado', async () => {
    const d = await criarOk();
    const r = await alterar(d.id, { status: 'em_analise' });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ status: 'em_analise' });
    const { itens } = (await (await historico(d.id)).json()) as { itens: Array<Record<string, unknown>> };
    expect(itens[0]).toMatchObject({ acao: 'status_alterado', antes: { status: 'nova' }, depois: { status: 'em_analise' } });
  });

  it('RF-07: transição fora da tabela → 409 com o motivo, e nada muda', async () => {
    const d = await criarOk();
    const r = await alterar(d.id, { status: 'entregue', titulo: 'Título que não pode ficar' });
    expect(r.status).toBe(409);
    expect(await r.json()).toMatchObject({ erro: 'conflito', mensagem: expect.any(String) });
    expect(await linhaDaDemanda(d.id)).toMatchObject({ status: 'nova' });
    expect(await (await obter(d.id)).json()).toMatchObject({ titulo: MINIMA.titulo });
  });

  it('CA-07.1 pela API: pronta_para_decisao → aprovada sem DEC aprovado → 409 com o motivo da 03', async () => {
    const d = await criarOk();
    await b.poolMigrator.query(`update demanda set status = 'pronta_para_decisao' where id = $1`, [d.id]);
    const r = await alterar(d.id, { status: 'aprovada' });
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ erro: 'conflito', mensagem: 'a demanda não tem pacote de decisão aprovado e atualizado.' });
    expect(await linhaDaDemanda(d.id)).toMatchObject({ status: 'pronta_para_decisao' });
  });

  it('corpo sem mudança, ou só com campos de autoria (C-11) → 400 "Nada foi alterado."', async () => {
    const d = await criarOk();
    for (const corpo of [{}, { titulo: MINIMA.titulo }, { autorTipo: 'agente', rascunhoAgente: true, responsavel: 'x' }]) {
      const r = await alterar(d.id, corpo);
      expect(r.status, JSON.stringify(corpo)).toBe(400);
      expect(await r.json()).toEqual({ erro: 'entrada_invalida', mensagem: 'Nada foi alterado.' });
    }
    expect(await linhaDaDemanda(d.id)).toMatchObject({ autor_tipo: 'pessoa', rascunho_agente: false });
  });

  it('campo inválido → 400 com o campo, sem o valor recebido', async () => {
    const d = await criarOk();
    const r = await alterar(d.id, { tipo: 'outro', titulo: '' });
    expect(r.status).toBe(400);
    const corpo = (await r.json()) as { campos: Array<{ campo: string }> };
    expect(corpo.campos.map((c) => c.campo).sort()).toEqual(['tipo', 'titulo']);
    expect(JSON.stringify(corpo)).not.toContain('outro');
  });

  it('id que não existe → 404', async () => {
    const r = await alterar('DEM-20261022-9999', { titulo: 'Novo título' });
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it('CA-07.4: token de agente em PATCH → 403 e nada muda (também no teste da matriz)', async () => {
    const d = await criarOk();
    for (const bearer of [tokenOrquestrador, tokenRisco]) {
      const r = await alterar(d.id, { status: 'em_analise' }, { bearer });
      expect(r.status).toBe(403);
      expect(await r.json()).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    }
    expect(await linhaDaDemanda(d.id)).toMatchObject({ status: 'nova' });
  });

  it('a administradora também altera (matriz: qualquer pessoa)', async () => {
    const d = await criarOk();
    expect((await alterar(d.id, { urgencia: 'media' }, { cookie: cookieAdm })).status).toBe(200);
  });

  it('C-15: com cookie e sem Origin → 403 e nada muda', async () => {
    const d = await criarOk();
    const r = await alterar(d.id, { status: 'em_analise' }, cto(), { semOrigin: true });
    expect(r.status).toBe(403);
    expect(await linhaDaDemanda(d.id)).toMatchObject({ status: 'nova' });
  });
});

describe('GET /api/demandas/:id/historico', () => {
  it('CA-02.4: demanda criada com o token do orquestrador aparece no histórico com ator agente orquestrador', async () => {
    const d = await criarOk({}, { bearer: tokenOrquestrador });
    const r = await historico(d.id);
    expect(r.status).toBe(200);
    const texto = await r.text();
    expect(texto).not.toContain(tokenOrquestrador);
    expect(texto).not.toContain(tokenOrquestrador.slice(0, 12));
    const { itens } = JSON.parse(texto) as { itens: Array<Record<string, unknown>> };
    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({
      acao: 'demanda_criada',
      entidade: 'demanda',
      entidadeId: d.id,
      ator: { tipo: 'agente', agente: 'orquestrador' },
      depois: { status: 'nova', tipo: 'bug' },
    });
  });

  it('RF-21: a pessoa aparece pelo nome e pelo papel, nunca pelo id da conta; do mais novo para o mais antigo', async () => {
    const d = await criarOk();
    expect((await alterar(d.id, { status: 'em_analise' })).status).toBe(200);
    const autorId = (await linhaDaDemanda(d.id))!.autor_id;
    const r = await historico(d.id);
    const texto = await r.text();
    expect(texto).not.toContain(autorId);
    const { itens } = JSON.parse(texto) as { itens: Array<{ acao: string; ator: Record<string, unknown> }> };
    expect(itens.map((i) => i.acao)).toEqual(['status_alterado', 'demanda_criada']);
    for (const i of itens) expect(i.ator).toEqual({ tipo: 'pessoa', nome: expect.any(String), papel: 'cto' });
  });

  it('C-30 pela API: PATCH de solicitanteNome e contexto com sentinela; o histórico não traz o sentinela', async () => {
    const d = await criarOk();
    const r = await alterar(d.id, { solicitanteNome: SENTINELAS.nome, contexto: SENTINELAS.texto, impactoPercebido: SENTINELAS.email });
    expect(r.status).toBe(200);
    const h = await historico(d.id);
    expect(h.status).toBe(200);
    const texto = await h.text();
    expect(contemSentinela(texto)).toBe(false);
    const { itens } = JSON.parse(texto) as { itens: Array<{ acao: string; antes: unknown; depois: unknown }> };
    const campos = itens.filter((i) => i.acao === 'campo_alterado');
    expect(campos).toHaveLength(3);
    expect(campos.map((i) => i.depois)).toEqual(
      expect.arrayContaining([{ solicitanteNome: { alterado: true } }, { contexto: { alterado: true } }, { impactoPercebido: { alterado: true } }]),
    );
  });

  it('histórico só para pessoa (matriz): token de agente → 403', async () => {
    const d = await criarOk();
    for (const bearer of [tokenOrquestrador, tokenRisco]) {
      expect((await historico(d.id, { bearer })).status).toBe(403);
    }
    expect((await historico(d.id, { cookie: cookieAdm })).status).toBe(200);
  });

  it('demanda que não existe → 404, e não lista vazia', async () => {
    const r = await historico('DEM-20261022-9999');
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ erro: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
  });

  it('CA-01.3: sem sessão nem token → 401', async () => {
    expect((await historico('DEM-20261022-0001', {})).status).toBe(401);
  });
});

describe('log das rotas de demanda (C-21)', () => {
  it('uma linha por requisição, com o padrão da rota; sem id de demanda, query, sentinela nem token', async () => {
    linhasDeLog.length = 0;
    const d = await criarOk({ solicitanteNome: SENTINELAS.nome, contexto: SENTINELAS.texto });
    await obter(d.id);
    await alterar(d.id, { descricaoProblema: SENTINELAS.texto });
    await historico(d.id);
    await listar('?tipo=bug&limit=5');
    await criar({ ...MINIMA, rascunhoAgente: false }, { bearer: tokenOrquestrador });
    const linhas = linhasDeLog.map((l) => JSON.parse(l) as Record<string, unknown>).filter((l) => l.evento === 'requisicao');
    expect(linhas.map((l) => `${String(l.metodo)} ${String(l.rota)} ${String(l.status)}`)).toEqual([
      'POST /api/demandas 201',
      'GET /api/demandas/[id] 200',
      'PATCH /api/demandas/[id] 200',
      'GET /api/demandas/[id]/historico 200',
      'GET /api/demandas 200',
      'POST /api/demandas 201',
    ]);
    const tudo = linhasDeLog.join('\n');
    expect(tudo).not.toContain(d.id);
    expect(tudo).not.toMatch(/DEM-\d{8}-\d{4}/);
    expect(tudo).not.toContain('limit=5');
    expect(tudo).not.toContain(tokenOrquestrador);
    expect(contemSentinela(tudo)).toBe(false);
  });
});
