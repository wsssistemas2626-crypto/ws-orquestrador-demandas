// QA da T07 do DEC-DEM-20261111-0016-v1 (06-T07-testes): o que o origem.test.ts não cobre do RF-10 no servidor.
// - RF-10: o filtro de origem se combina com a paginação (limit e offset) e com os filtros de tipo, status e linha;
// - CA-10.2: "pessoa" e "agente" juntam todos os autores do tipo (duas contas, dois agentes), e a soma das três origens
//   é o total sem filtro;
// - CA-10.5 pela rota com token de agente (Bearer, sem Origin): a origem sai igual, e o título continua minimizado pelo
//   solicitante atual (M-1 do 0008), com o filtro de origem aplicado;
// - IN-02 pela rota: o token das duas integrações recebe 403 na listagem, com ou sem o filtro de origem, e nada da fila
//   vaza no corpo;
// - C-17: mais formas de valor fora da lista (espaço, maiúscula, lista separada por vírgula).
// Postgres real (Testcontainers), papel do app. Os dados entram no beforeAll pelo migrator, com datas fixas: nenhum teste
// grava, então a ordem dos testes não muda nada, e o relógio real não é lido. Dados só fictícios; os tokens são gerados
// em tempo de teste e nunca aparecem em mensagem de expect.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { inserirDemandaDeIntegracao, tokenDeIntegracao } from '../../../test/integracoes';
import { chamarRota, type OpRequisicao } from '../../../test/requisicao';
import { criarPessoa } from '../../../test/sessao';
import { GET as GET_LISTA } from '../../app/api/demandas/route';
import { comTransacao } from '../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../lib/deps';
import { substituirDestinoDoLog } from '../../lib/log';
import { INTEGRACOES } from '../acesso/ator';
import { MENSAGENS_ACESSO } from '../acesso/mensagens';
import { criarTokenServico } from '../acesso/tokens-servico';
import { MARCADOR_NOME } from '../dados-pessoais/minimizar';
import { listarDemandas } from './consultas';
import { contarDemandasPorStatus } from './resumo-da-fila';
import { filtroDemandasSchema, STATUS, type Status } from './schemas';

const SOLICITANTE_EDITADO = 'Pessoa Ficticia Joana';
const TITULO_COM_NOME = `Pedido de ${SOLICITANTE_EDITADO} (fictício)`;

// Sete demandas: três do Awave, duas de pessoa (contas diferentes) e duas de agente (agentes diferentes), uma hora entre
// cada, com status, tipo e linha variados.
const ID = {
  agente1: 'DEM-20261101-0001',
  awave1: 'DEM-20261101-0002',
  pessoa1: 'DEM-20261101-0003',
  awave2: 'DEM-20261101-0004',
  pessoa2: 'DEM-20261101-0005',
  awave3: 'DEM-20261101-0006',
  agente2: 'DEM-20261101-0007',
} as const;
const hora = (h: number) => new Date(Date.UTC(2026, 10, 1, h, 0, 0));

const filtro = (q: Record<string, unknown> = {}) => filtroDemandasSchema.parse(q);
const zerado = (): Record<Status, number> => Object.fromEntries(STATUS.map((s) => [s, 0])) as Record<Status, number>;

let b: BancoDeTeste;
let deps: Deps;

async function inserirDePessoaOuAgente(d: {
  id: string;
  titulo: string;
  autorTipo: 'pessoa' | 'agente';
  autorId: string;
  criadaEm: Date;
  tipo?: string;
  status?: Status;
}): Promise<void> {
  await b.poolMigrator.query(
    `insert into demanda (id, titulo, tipo, status, solicitante_nome, autor_tipo, autor_id, rascunho_agente, criada_em, atualizada_em)
     values ($1, $2, $3, $4, 'Pessoa Ficticia', $5, $6, $7, $8, $8)`,
    [d.id, d.titulo, d.tipo ?? 'melhoria', d.status ?? 'nova', d.autorTipo, d.autorId, d.autorTipo === 'agente', d.criadaEm],
  );
}

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  await inserirDePessoaOuAgente({ id: ID.agente1, titulo: 'Demanda QA do agente 1 (fictício)', autorTipo: 'agente', autorId: 'orquestrador', criadaEm: hora(9) });
  await inserirDemandaDeIntegracao(b, { id: ID.awave1, titulo: 'Relatório semanal QA 1 (fictício)', criadaEm: hora(10) });
  await inserirDePessoaOuAgente({ id: ID.pessoa1, titulo: 'Demanda QA de pessoa 1 (fictício)', autorTipo: 'pessoa', autorId: 'u-qa-origem-1', criadaEm: hora(11) });
  await inserirDemandaDeIntegracao(b, { id: ID.awave2, titulo: 'Relatório semanal QA 2 (fictício)', criadaEm: hora(12), status: 'em_analise' });
  await inserirDePessoaOuAgente({ id: ID.pessoa2, titulo: 'Demanda QA de pessoa 2 (fictício)', autorTipo: 'pessoa', autorId: 'u-qa-origem-2', criadaEm: hora(13), tipo: 'bug' });
  await inserirDemandaDeIntegracao(b, { id: ID.awave3, titulo: TITULO_COM_NOME, criadaEm: hora(14) });
  await inserirDePessoaOuAgente({
    id: ID.agente2,
    titulo: 'Demanda QA do agente 2 (fictício)',
    autorTipo: 'agente',
    autorId: 'insumo_tecnico',
    criadaEm: hora(15),
    status: 'aguardando_informacao',
  });
  // A linha da demanda 1 do Awave (para o filtro combinado) e o solicitante da 3, editado por uma pessoa (CA-10.4).
  await b.poolMigrator.query(`update demanda set linha_servico_provavel = 'sob_medida' where id = $1`, [ID.awave1]);
  await b.poolMigrator.query(`update demanda set solicitante_nome = $2 where id = $1`, [ID.awave3, SOLICITANTE_EDITADO]);
});

afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});

const idsDe = async (q: Record<string, unknown>) => (await listarDemandas(b.db, filtro(q))).itens.map((i) => i.id);

describe('RF-10: a origem com a paginação e com os outros filtros', () => {
  it('controle da massa: sete demandas, com a autoria esperada', async () => {
    const { rows } = await b.poolMigrator.query<{ autor_tipo: string; autor_id: string; n: number }>(
      'select autor_tipo, autor_id, count(*)::int as n from demanda group by autor_tipo, autor_id order by autor_tipo, autor_id',
    );
    expect(rows).toEqual([
      { autor_tipo: 'agente', autor_id: 'insumo_tecnico', n: 1 },
      { autor_tipo: 'agente', autor_id: 'orquestrador', n: 1 },
      { autor_tipo: 'integracao', autor_id: 'awave', n: 3 },
      { autor_tipo: 'pessoa', autor_id: 'u-qa-origem-1', n: 1 },
      { autor_tipo: 'pessoa', autor_id: 'u-qa-origem-2', n: 1 },
    ]);
  });

  it('origem=awave página a página (limit 1): uma por vez, da mais nova para a mais velha, com o total da origem em todas', async () => {
    const paginas = [];
    for (const offset of ['0', '1', '2', '3']) {
      const r = await listarDemandas(b.db, filtro({ origem: 'awave', limit: '1', offset }));
      expect(r.total, `offset ${offset}`).toBe(3);
      paginas.push(r.itens.map((i) => [i.id, i.origem]));
    }
    expect(paginas).toEqual([[[ID.awave3, 'awave']], [[ID.awave2, 'awave']], [[ID.awave1, 'awave']], []]);
    expect(await idsDe({ origem: 'awave', limit: '2', offset: '1' })).toEqual([ID.awave2, ID.awave1]);
  });

  it('CA-10.2: pessoa junta as duas contas e agente junta os dois agentes; a soma das três origens é o total sem filtro', async () => {
    expect(await idsDe({ origem: 'pessoa' })).toEqual([ID.pessoa2, ID.pessoa1]);
    expect(await idsDe({ origem: 'agente' })).toEqual([ID.agente2, ID.agente1]);
    expect(await idsDe({ origem: 'awave' })).toEqual([ID.awave3, ID.awave2, ID.awave1]);
    const totais = await Promise.all(['pessoa', 'agente', 'awave'].map(async (origem) => (await listarDemandas(b.db, filtro({ origem }))).total));
    expect(totais).toEqual([2, 2, 3]);
    expect((await listarDemandas(b.db, filtro())).total).toBe(7);
  });

  it('a origem se combina como E com a linha, o tipo e o status', async () => {
    expect(await idsDe({ origem: 'awave', linhaServicoProvavel: 'sob_medida' })).toEqual([ID.awave1]);
    expect(await idsDe({ origem: 'agente', linhaServicoProvavel: 'sob_medida' })).toEqual([]);
    expect(await idsDe({ origem: 'pessoa', tipo: 'bug' })).toEqual([ID.pessoa2]);
    expect(await idsDe({ origem: 'awave', tipo: 'bug' })).toEqual([]);
    expect(await idsDe({ origem: 'agente', status: 'aguardando_informacao' })).toEqual([ID.agente2]);
    expect(await idsDe({ origem: 'awave', status: 'em_analise', tipo: 'melhoria' })).toEqual([ID.awave2]);
  });

  it('contarDemandasPorStatus: agente e pessoa pela origem, e a origem combinada com a linha', async () => {
    expect(await contarDemandasPorStatus(b.db, { origem: 'agente' })).toEqual({ porStatus: { ...zerado(), nova: 1, aguardando_informacao: 1 }, todas: 2 });
    expect(await contarDemandasPorStatus(b.db, { origem: 'pessoa' })).toEqual({ porStatus: { ...zerado(), nova: 2 }, todas: 2 });
    expect(await contarDemandasPorStatus(b.db, { origem: 'awave', linhaServicoProvavel: 'sob_medida' })).toEqual({ porStatus: { ...zerado(), nova: 1 }, todas: 1 });
    expect(await contarDemandasPorStatus(b.db, { origem: 'awave' })).toEqual({ porStatus: { ...zerado(), nova: 2, em_analise: 1 }, todas: 3 });
  });
});

describe('C-17: mais valores fora da lista', () => {
  it('espaço nas pontas, maiúscula, lista por vírgula e nome de integração não passam', () => {
    for (const origem of [' awave', 'awave ', 'AWAVE', 'Pessoa', 'pessoa,agente', 'agente_ia', 'integracao:awave', 'sistema'])
      expect(filtroDemandasSchema.safeParse({ origem }).success, JSON.stringify(origem)).toBe(false);
  });
});

describe('GET /api/demandas com origem, por ator', () => {
  let cookie = '';
  let tokenRisco = '';
  const tokensDeIntegracao: string[] = [];

  beforeAll(async () => {
    substituirDestinoDoLog({ write: () => undefined });
    definirDepsParaTeste(deps);
    cookie = (await criarPessoa(deps, { papel: 'cto' })).cookie;
    tokenRisco = (await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'risco', deps.relogio))).token;
    for (const integracao of INTEGRACOES) tokensDeIntegracao.push(await tokenDeIntegracao(deps, integracao));
  });
  afterAll(() => {
    definirDepsParaTeste(null);
    substituirDestinoDoLog(null);
  });

  const listar = (qs: string, cred: Pick<OpRequisicao, 'cookie' | 'bearer' | 'semOrigin'>) => chamarRota(GET_LISTA, { caminho: `/api/demandas${qs}`, ...cred });

  // Mudança aprovada (M-1 da 0019, substitui o CA-10.6 do 0016): o agente só vê a demanda do Awave depois da confirmação
  // de uma pessoa. Antes dela, nem nos itens nem no total; depois (o evento de pessoa entra pelo migrator, como a
  // confirmação gravaria), as asserções de hoje, sem mudança.
  it('agente (Bearer, sem Origin), ?origem=awave (mudança aprovada, M-1 da 0019): sem confirmação, nenhuma; confirmadas, 200 só com as do Awave, origem awave e o título minimizado pelo solicitante atual', async () => {
    const semConfirmacao = await listar('?origem=awave', { bearer: tokenRisco, semOrigin: true });
    expect(semConfirmacao.status).toBe(200);
    expect(await semConfirmacao.json()).toMatchObject({ itens: [], total: 0 });
    for (const id of [ID.awave1, ID.awave2, ID.awave3])
      await b.poolMigrator.query(
        `insert into evento (ocorrido_em, ator_tipo, ator_id, demanda_id, entidade, entidade_id, acao, depois)
         values ($1, 'pessoa', 'u-qa-origem-1', $2, 'demanda', $2, 'demanda_confirmada', '{"confirmada":true}'::jsonb)`,
        [hora(16), id],
      );
    const r = await listar('?origem=awave', { bearer: tokenRisco, semOrigin: true });
    expect(r.status).toBe(200);
    const texto = await r.text();
    const corpo = JSON.parse(texto) as { itens: Array<{ id: string; titulo: string; origem: string }>; total: number };
    expect(corpo.total).toBe(3);
    expect(corpo.itens.map((i) => [i.id, i.origem])).toEqual([
      [ID.awave3, 'awave'],
      [ID.awave2, 'awave'],
      [ID.awave1, 'awave'],
    ]);
    expect(corpo.itens[0]!.titulo).toBe(`Pedido de ${MARCADOR_NOME} (fictício)`);
    expect(texto).not.toContain('Joana');
    expect(texto).not.toContain(SOLICITANTE_EDITADO);
  });

  it('pessoa, ?origem=awave: o mesmo recorte, com o título original', async () => {
    const r = await listar('?origem=awave', { cookie });
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { itens: Array<{ id: string; titulo: string }>; total: number };
    expect(corpo.total).toBe(3);
    expect(corpo.itens.map((i) => [i.id, i.titulo])).toEqual([
      [ID.awave3, TITULO_COM_NOME],
      [ID.awave2, 'Relatório semanal QA 2 (fictício)'],
      [ID.awave1, 'Relatório semanal QA 1 (fictício)'],
    ]);
  });

  it('pessoa, ?origem=agente&limit=1&offset=1: a paginação vale com o filtro pela rota', async () => {
    const corpo = (await (await listar('?origem=agente&limit=1&offset=1', { cookie })).json()) as { itens: Array<{ id: string }>; total: number; limit: number; offset: number };
    expect(corpo).toMatchObject({ total: 2, limit: 1, offset: 1 });
    expect(corpo.itens.map((i) => i.id)).toEqual([ID.agente1]);
  });

  it('valor fora da lista dá 400 com o campo origem, para pessoa e para agente, sem ecoar o valor', async () => {
    for (const cred of [{ cookie }, { bearer: tokenRisco }]) {
      for (const qs of ['?origem=AWAVE', '?origem=pessoa%2Cagente', '?origem=%20awave']) {
        const r = await listar(qs, cred);
        expect(r.status, qs).toBe(400);
        const texto = await r.text();
        const corpo = JSON.parse(texto) as { erro: string; campos: Array<{ campo: string }> };
        expect(corpo.erro, qs).toBe('entrada_invalida');
        expect(corpo.campos.map((c) => c.campo), qs).toEqual(['origem']);
        expect(texto, qs).not.toContain('AWAVE');
        expect(texto, qs).not.toContain('pessoa,agente');
      }
    }
  });

  it('IN-02: as duas integrações recebem 403 na listagem, com e sem o filtro de origem, sem nada da fila no corpo', async () => {
    expect(tokensDeIntegracao).toHaveLength(INTEGRACOES.length);
    for (const [n, bearer] of tokensDeIntegracao.entries()) {
      for (const qs of ['', '?origem=awave', '?origem=pessoa', '?origem=agente']) {
        const rotulo = `${INTEGRACOES[n]} ${qs}`;
        const r = await listar(qs, { bearer, semOrigin: true });
        expect(r.status, rotulo).toBe(403);
        const texto = await r.text();
        expect(JSON.parse(texto), rotulo).toEqual({ erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
        for (const id of Object.values(ID)) expect(texto, rotulo).not.toContain(id);
        expect(texto, rotulo).not.toContain('fictício');
      }
    }
  });
});
