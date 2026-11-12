// T07 do DEC-DEM-20261111-0016-v1 (RF-10 no servidor, CA-10.2 a CA-10.5, C-17): a origem da demanda vem da autoria
// gravada (autor_tipo e autor_id), nunca do solicitanteNome, que a pessoa edita. Leitura, listagem, contagem por status e
// filtro, pela função e pela rota, e o plano de execução do filtro do Awave com volume. Postgres real (Testcontainers),
// papel do app; cada bloco tem banco próprio e os dados entram no beforeAll, então a ordem dos testes não muda nada.
// Dados só fictícios; nenhum token é gerado (o ator do Awave é montado com o prefixo fictício `ficticio`).
import { drizzle } from 'drizzle-orm/node-postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { atorDeIntegracao } from '../../../test/integracoes';
import { chamarRota } from '../../../test/requisicao';
import { criarPessoa } from '../../../test/sessao';
import { GET as GET_LISTA } from '../../app/api/demandas/route';
import type { Db } from '../../db';
import * as schema from '../../db/schema';
import { definirDepsParaTeste, type Deps } from '../../lib/deps';
import { substituirDestinoDoLog } from '../../lib/log';
import type { AtorAgente, AtorPessoa } from '../acesso/ator';
import { condicaoDaOrigem, listarDemandas, listarDemandasPara, obterDemanda, origemDaAutoria, origemDoResponsavel, type Responsavel } from './consultas';
import { contarDemandasPorStatus } from './resumo-da-fila';
import { criarDemandaSchema, filtroDemandasSchema, ORIGENS_DA_DEMANDA, STATUS, type Status } from './schemas';
import { alterarDemanda, criarDemanda } from './servico';

const pessoa: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-origem-ficticia', nome: 'Pessoa Ficticia', papel: 'cto' };
const orquestrador: AtorAgente = { tipo: 'agente', agente: 'orquestrador', prefixoToken: null };
const risco: AtorAgente = { tipo: 'agente', agente: 'risco', prefixoToken: null };
const awave = atorDeIntegracao('awave');

const filtro = (q: Record<string, unknown> = {}) => filtroDemandasSchema.parse(q);
const entrada = (titulo: string) => criarDemandaSchema.parse({ titulo, tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia Solicitante' });
const zerado = (): Record<Status, number> => Object.fromEntries(STATUS.map((s) => [s, 0])) as Record<Status, number>;

// Banco e deps novos para o bloco que chama.
function blocoComDeps() {
  const e = { b: undefined as unknown as BancoDeTeste, deps: undefined as unknown as Deps };
  beforeAll(async () => {
    e.b = await novoBanco();
    e.deps = await criarDepsDeTeste(e.b);
  });
  afterAll(async () => {
    await e.deps.fila.parar();
    await e.b.fechar();
  });
  return e;
}

// Db sobre o pool do app que guarda as consultas que o Drizzle manda (como em resumo-da-fila.test.ts).
function dbQueConta(b: BancoDeTeste) {
  const consultas: Array<{ sql: string; params: unknown[] }> = [];
  const db: Db = drizzle(b.poolApp, { schema, casing: 'snake_case', logger: { logQuery: (sql, params) => consultas.push({ sql, params }) } });
  return { db, consultas };
}

describe('origemDaAutoria e origemDoResponsavel (lista fechada)', () => {
  it('as três origens, na ordem da 01', () => {
    expect(ORIGENS_DA_DEMANDA).toEqual(['pessoa', 'agente', 'awave']);
  });

  it('pessoa, agente e awave pela autoria; construir e autoria fora da lista lançam', () => {
    expect(origemDaAutoria('pessoa', 'u')).toBe('pessoa');
    expect(origemDaAutoria('agente', 'risco')).toBe('agente');
    expect(origemDaAutoria('integracao', 'awave')).toBe('awave');
    expect(() => origemDaAutoria('integracao', 'construir')).toThrow('autoria desconhecida');
    expect(() => origemDaAutoria('integracao', 'jarvis')).toThrow('autoria desconhecida');
    expect(() => origemDaAutoria('outro', 'x')).toThrow('autoria desconhecida');
    expect(() => origemDaAutoria('sistema', 'awave')).toThrow('autoria desconhecida');
  });

  it('pelo responsável da vista: o mesmo resultado; construir e tipo desconhecido lançam', () => {
    expect(origemDoResponsavel({ tipo: 'pessoa', nome: 'Pessoa Ficticia' })).toBe('pessoa');
    expect(origemDoResponsavel({ tipo: 'pessoa', nome: null })).toBe('pessoa');
    expect(origemDoResponsavel({ tipo: 'agente', agente: 'orquestrador' })).toBe('agente');
    expect(origemDoResponsavel({ tipo: 'integracao', integracao: 'awave' })).toBe('awave');
    expect(() => origemDoResponsavel({ tipo: 'integracao', integracao: 'construir' })).toThrow('autoria desconhecida');
    expect(() => origemDoResponsavel({ tipo: 'sistema' } as unknown as Responsavel)).toThrow();
  });
});

describe('C-17: filtroDemandasSchema com origem', () => {
  it('CA-10.5: as três origens passam; fora da lista, vazia, maiúscula ou repetida, não', () => {
    for (const origem of ORIGENS_DA_DEMANDA) expect(filtroDemandasSchema.parse({ origem })).toEqual({ origem, limit: 20, offset: 0 });
    for (const origem of ['outra', '', 'Awave', 'integracao', 'construir', ['awave', 'pessoa']])
      expect(filtroDemandasSchema.safeParse({ origem }).success, JSON.stringify(origem)).toBe(false);
  });

  it('sem origem, o filtro de hoje fica igual', () => {
    expect(filtroDemandasSchema.parse({})).toEqual({ limit: 20, offset: 0 });
  });
});

describe('RF-10: origem na listagem, na contagem, na leitura e no filtro (uma demanda de cada origem)', () => {
  const e = blocoComDeps();
  const ids = { pessoa: '', agente: '', awave: '' };

  beforeAll(async () => {
    ids.pessoa = (await criarDemanda(e.deps, pessoa, entrada('Demanda de pessoa (fictício)'))).id;
    ids.agente = (await criarDemanda(e.deps, orquestrador, entrada('Demanda do agente (fictício)'))).id;
    ids.awave = (await criarDemanda(e.deps, awave, entrada('Demanda do Awave (fictício)'))).id;
    // CA-10.4: a pessoa troca o solicitante da demanda do Awave; e põe "Awave" como solicitante da demanda de pessoa.
    await alterarDemanda(e.deps, pessoa, ids.awave, { solicitanteNome: 'Teste Ficticio' });
    await alterarDemanda(e.deps, pessoa, ids.pessoa, { solicitanteNome: 'Awave' });
  });

  it('controle: as três demandas existem com a autoria e o solicitante esperados', async () => {
    const { rows } = await e.b.poolMigrator.query<{ id: string; autor_tipo: string; autor_id: string; solicitante_nome: string }>(
      'select id, autor_tipo, autor_id, solicitante_nome from demanda order by id',
    );
    expect(rows).toEqual([
      { id: ids.pessoa, autor_tipo: 'pessoa', autor_id: pessoa.usuarioId, solicitante_nome: 'Awave' },
      { id: ids.agente, autor_tipo: 'agente', autor_id: 'orquestrador', solicitante_nome: 'Pessoa Ficticia Solicitante' },
      { id: ids.awave, autor_tipo: 'integracao', autor_id: 'awave', solicitante_nome: 'Teste Ficticio' },
    ]);
  });

  it('sem filtro: cada item tem a origem certa e a chave origem, sem autorId', async () => {
    const r = await listarDemandas(e.b.db, filtro());
    expect(r.total).toBe(3);
    expect(Object.fromEntries(r.itens.map((i) => [i.id, i.origem]))).toEqual({ [ids.pessoa]: 'pessoa', [ids.agente]: 'agente', [ids.awave]: 'awave' });
    for (const i of r.itens) {
      expect(Object.keys(i).sort()).toEqual(['criadaEm', 'id', 'linhaServicoProvavel', 'origem', 'rascunhoAgente', 'status', 'tipo', 'titulo', 'urgencia']);
      expect(JSON.stringify(i)).not.toContain(pessoa.usuarioId);
    }
  });

  it('CA-10.2 e CA-10.4: cada filtro traz só a sua, com total 1; o solicitante editado não muda a origem', async () => {
    for (const [origem, id] of [
      ['awave', ids.awave],
      ['pessoa', ids.pessoa],
      ['agente', ids.agente],
    ] as const) {
      const r = await listarDemandas(e.b.db, filtro({ origem }));
      expect(r, origem).toMatchObject({ total: 1, limit: 20, offset: 0 });
      expect(r.itens.map((i) => [i.id, i.origem]), origem).toEqual([[id, origem]]);
    }
  });

  it('CA-10.4 no detalhe: a origem lida do responsável da vista continua awave (e pessoa na de pessoa)', async () => {
    expect(origemDoResponsavel((await obterDemanda(e.b.db, ids.awave)).responsavel)).toBe('awave');
    expect(origemDoResponsavel((await obterDemanda(e.b.db, ids.pessoa)).responsavel)).toBe('pessoa');
    expect(origemDoResponsavel((await obterDemanda(e.b.db, ids.agente)).responsavel)).toBe('agente');
  });

  it('contarDemandasPorStatus com origem conta só a origem; sem origem, as três', async () => {
    expect(await contarDemandasPorStatus(e.b.db, { origem: 'awave' })).toEqual({ porStatus: { ...zerado(), nova: 1 }, todas: 1 });
    expect(await contarDemandasPorStatus(e.b.db, { origem: 'pessoa', tipo: 'melhoria' })).toEqual({ porStatus: { ...zerado(), nova: 1 }, todas: 1 });
    expect(await contarDemandasPorStatus(e.b.db, { origem: 'awave', tipo: 'bug' })).toEqual({ porStatus: zerado(), todas: 0 });
    expect(await contarDemandasPorStatus(e.b.db, {})).toEqual({ porStatus: { ...zerado(), nova: 3 }, todas: 3 });
  });

  it('C-17: a origem vai ao SQL como parâmetro, nunca no texto, na página, no total e na contagem', async () => {
    const { db, consultas } = dbQueConta(e.b);
    await listarDemandas(db, filtro({ origem: 'awave' }));
    await contarDemandasPorStatus(db, { origem: 'awave' });
    expect(consultas).toHaveLength(3);
    for (const c of consultas) {
      expect(c.sql).toMatch(/^select /);
      expect(c.sql).not.toContain('awave');
      expect(c.sql).not.toContain('integracao');
      expect(c.params).toEqual(expect.arrayContaining(['integracao', 'awave']));
    }
  });

  it('condicaoDaOrigem: pessoa e agente só pelo autor_tipo; awave pelo autor_tipo e pelo autor_id, tudo por parâmetro', () => {
    const sqlDe = (o: (typeof ORIGENS_DA_DEMANDA)[number]) => e.b.db.select({ id: schema.demanda.id }).from(schema.demanda).where(condicaoDaOrigem(o)).toSQL();
    expect(ORIGENS_DA_DEMANDA.map((o) => sqlDe(o).params)).toEqual([['pessoa'], ['agente'], ['integracao', 'awave']]);
    for (const o of ORIGENS_DA_DEMANDA) expect(sqlDe(o).sql, o).not.toMatch(/'|pessoa|agente|awave|integracao/);
  });

  it('listagem da API para agente: a origem sai igual, e o título continua minimizado como hoje', async () => {
    const r = await listarDemandasPara(e.b.db, filtro({ origem: 'awave' }), risco);
    expect(r.itens.map((i) => [i.id, i.origem])).toEqual([[ids.awave, 'awave']]);
    expect(r.total).toBe(1);
  });

  it('IN-02: o filtro de origem não abre a listagem para a integração', async () => {
    await expect(listarDemandasPara(e.b.db, filtro({ origem: 'awave' }), awave)).rejects.toMatchObject({ codigo: 'sem_permissao' });
  });

  describe('CA-10.5 pela rota GET /api/demandas, com sessão de pessoa', () => {
    let cookie = '';
    beforeAll(async () => {
      substituirDestinoDoLog({ write: () => undefined });
      definirDepsParaTeste(e.deps);
      cookie = (await criarPessoa(e.deps, { papel: 'cto' })).cookie;
    });
    afterAll(() => {
      definirDepsParaTeste(null);
      substituirDestinoDoLog(null);
    });
    const listar = (qs: string) => chamarRota(GET_LISTA, { caminho: `/api/demandas${qs}`, cookie });

    it('?origem=awave → 200 só com a do Awave, cada item com origem', async () => {
      const r = await listar('?origem=awave');
      expect(r.status).toBe(200);
      const corpo = (await r.json()) as { itens: Array<{ id: string; origem: string }>; total: number };
      expect(corpo.total).toBe(1);
      expect(corpo.itens.map((i) => [i.id, i.origem])).toEqual([[ids.awave, 'awave']]);
    });

    it('?origem=awave&status=nova vale os dois; ?origem=pessoa&tipo=bug não acha nada', async () => {
      expect(((await (await listar('?origem=awave&status=nova')).json()) as { total: number }).total).toBe(1);
      expect(((await (await listar('?origem=awave&status=em_analise')).json()) as { total: number }).total).toBe(0);
      expect(((await (await listar('?origem=pessoa&tipo=bug')).json()) as { total: number }).total).toBe(0);
    });

    it('?origem=outra, vazia e repetida → 400 com o campo origem, sem ecoar o valor', async () => {
      for (const qs of ['?origem=outra', '?origem=', '?origem=awave&origem=pessoa', '?origem=%3Cscript%3E']) {
        const r = await listar(qs);
        expect(r.status, qs).toBe(400);
        const texto = await r.text();
        const corpo = JSON.parse(texto) as { erro: string; campos: Array<{ campo: string }> };
        expect(corpo.erro, qs).toBe('entrada_invalida');
        expect(corpo.campos.map((c) => c.campo), qs).toEqual(['origem']);
        expect(texto, qs).not.toContain('outra');
        expect(texto, qs).not.toContain('script');
      }
    });
  });
});

describe('CA-10.3: origem e status juntos valem como E', () => {
  const e = blocoComDeps();
  const ids = { awaveNova: '', awaveEmAnalise: '', pessoaNova: '' };

  beforeAll(async () => {
    ids.awaveNova = (await criarDemanda(e.deps, awave, entrada('Awave nova (fictício)'))).id;
    ids.awaveEmAnalise = (await criarDemanda(e.deps, awave, entrada('Awave em análise (fictício)'))).id;
    ids.pessoaNova = (await criarDemanda(e.deps, pessoa, entrada('Pessoa nova (fictício)'))).id;
    await alterarDemanda(e.deps, pessoa, ids.awaveEmAnalise, { status: 'em_analise' });
  });

  it('awave + nova → só a nova do Awave; awave sozinho → as duas; nova sozinho → a do Awave e a da pessoa', async () => {
    const idsDe = async (q: Record<string, string>) => (await listarDemandas(e.b.db, filtro(q))).itens.map((i) => i.id).sort();
    expect(await idsDe({ origem: 'awave', status: 'nova' })).toEqual([ids.awaveNova]);
    expect(await idsDe({ origem: 'awave' })).toEqual([ids.awaveNova, ids.awaveEmAnalise].sort());
    expect(await idsDe({ status: 'nova' })).toEqual([ids.awaveNova, ids.pessoaNova].sort());
    expect(await idsDe({ origem: 'pessoa', status: 'em_analise' })).toEqual([]);
  });

  it('o total segue o filtro inteiro, e a contagem por status com origem ignora o status da URL', async () => {
    expect((await listarDemandas(e.b.db, filtro({ origem: 'awave', status: 'nova', limit: '1', offset: '0' }))).total).toBe(1);
    expect(await contarDemandasPorStatus(e.b.db, { origem: 'awave' })).toEqual({ porStatus: { ...zerado(), nova: 1, em_analise: 1 }, todas: 2 });
  });
});

// Plano de execução com volume, pelo planejador de verdade (sem desligar a varredura), como em resumo-da-fila.test.ts.
type NoDoPlano = { 'Node Type': string; 'Relation Name'?: string; 'Index Name'?: string; Plans?: NoDoPlano[] };
const nosDe = (no: NoDoPlano): NoDoPlano[] => [no, ...(no.Plans ?? []).flatMap(nosDe)];
const resumoDoPlano = (p: NoDoPlano): string =>
  nosDe(p)
    .map((n) => [n['Node Type'], n['Relation Name'], n['Index Name']].filter(Boolean).join(' '))
    .join(' > ');
const relatar = (linha: string) => process.stdout.write(`T07-0016 ${linha}\n`);

describe('plano de execução do filtro origem=awave com 5.000 demandas (EXPLAIN)', () => {
  let b: BancoDeTeste;
  beforeAll(async () => {
    b = await novoBanco();
    // 100 do Awave (1 em 50), 500 de agente (1 em 10) e 4.400 de pessoa, uma por hora; status e tipo variados.
    await b.poolMigrator.query(
      `insert into demanda (id, titulo, tipo, status, solicitante_nome, autor_tipo, autor_id, rascunho_agente, criada_em, atualizada_em)
       select 'DEM-' || to_char((timestamp '2026-01-01 12:00:00' + i * interval '1 hour'), 'YYYYMMDD') || '-' || lpad(i::text, 4, '0'),
              'Demanda ficticia ' || i,
              (array['bug', 'melhoria', 'novo_projeto', 'estudo', 'produto_proprio'])[1 + i % 5],
              (array['nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao', 'encerrada', 'aprovada', 'em_construcao', 'entregue', 'devolvida'])[1 + i % 9],
              case when i % 50 = 0 then 'Awave' else 'Pessoa Ficticia' end,
              case when i % 50 = 0 then 'integracao' when i % 10 = 5 then 'agente' else 'pessoa' end,
              case when i % 50 = 0 then 'awave' when i % 10 = 5 then 'orquestrador' else 'u-ficticio-desempenho' end,
              (i % 50 = 0 or i % 10 = 5),
              (timestamp '2026-01-01 12:00:00' + i * interval '1 hour') at time zone 'UTC',
              (timestamp '2026-01-01 12:00:00' + i * interval '1 hour') at time zone 'UTC'
       from generate_series(1, 5000) as i`,
    );
    await b.poolMigrator.query('vacuum analyze demanda');
  });
  afterAll(async () => {
    await b.fechar();
  });

  async function planoDe(c: { sql: string; params: unknown[] }): Promise<NoDoPlano> {
    const r = await b.poolApp.query<{ 'QUERY PLAN': Array<{ Plan: NoDoPlano }> }>(`explain (format json) ${c.sql}`, c.params);
    return r.rows[0]!['QUERY PLAN'][0]!.Plan;
  }

  it('controle da massa: 100 do Awave, 500 de agente e 4.400 de pessoa', async () => {
    const r = await listarDemandas(b.db, filtro({ origem: 'awave', limit: '100' }));
    expect(r.total).toBe(100);
    expect(r.itens.every((i) => i.origem === 'awave')).toBe(true);
    expect((await listarDemandas(b.db, filtro({ origem: 'agente', limit: '1' }))).total).toBe(500);
    expect((await listarDemandas(b.db, filtro({ origem: 'pessoa', limit: '1' }))).total).toBe(4400);
  });

  it('página, total e contagem por status com origem=awave: pelo índice demanda_autor_criada_idx, sem varrer demanda', async () => {
    const { db, consultas } = dbQueConta(b);
    const pagina = await listarDemandas(db, filtro({ origem: 'awave' }));
    await contarDemandasPorStatus(db, { origem: 'awave' });
    expect(pagina.itens).toHaveLength(20);
    expect(consultas).toHaveLength(3);
    for (const [nome, c] of [
      ['página', consultas[0]!],
      ['total', consultas[1]!],
      ['contagem por status', consultas[2]!],
    ] as const) {
      const plano = await planoDe(c);
      relatar(`EXPLAIN ${nome} (origem=awave): ${resumoDoPlano(plano)}`);
      const nos = nosDe(plano);
      expect(nos.filter((n) => n['Node Type'] === 'Seq Scan').map((n) => n['Relation Name']), nome).toEqual([]);
      expect(nos.some((n) => n['Index Name'] === 'demanda_autor_criada_idx'), nome).toBe(true);
    }
  });
});
