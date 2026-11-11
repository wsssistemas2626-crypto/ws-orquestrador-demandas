// T07 do DEC-DEM-20261110-0015-v1 (ADR-16, RNF-09, CV-06, CA-05.1, CA-05.4, CA-06.1): as duas leituras novas da fila
// contra o Postgres real, pelo papel do app (orquestrador_app, só SELECT nas tabelas lidas). Cada bloco tem banco
// próprio: a contagem é da tabela inteira, e as demandas de um bloco não podem entrar na conta de outro. Dados só
// fictícios; o título de toda demanda e os textos de ESP e DEC levam a SENTINELA, que nunca pode aparecer no retorno.
// Medir tempo exige o relógio do processo (performance.now()), não o Relogio dos Deps, como em test/desempenho.
import { drizzle } from 'drizzle-orm/node-postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDb, type Db } from '../../db';
import * as schema from '../../db/schema';
import { demanda, especificacaoTecnica, pacoteDecisao, parecerRisco } from '../../db/schema';
import { idVersao } from '../versoes';
import { listarDemandas } from './consultas';
import { contarDemandasPorStatus, etapasDasDemandas } from './resumo-da-fila';
import { filtroDemandasSchema, STATUS, type Status } from './schemas';

const AUTOR = { autorTipo: 'pessoa' as const, autorId: 'u-resumo-cto' };
const SENTINELA = 'SENTINELA-TITULO-RESUMO';
const filtro = (q: Record<string, string> = {}) => filtroDemandasSchema.parse(q);

// Banco novo para o bloco que chama, com o próprio contador de ids.
function bancoDoBloco() {
  const estado = { b: undefined as unknown as BancoDeTeste, n: 0 };
  beforeAll(async () => {
    estado.b = await novoBanco();
  });
  afterAll(async () => {
    await estado.b.fechar();
  });
  return estado;
}

type Estado = ReturnType<typeof bancoDoBloco>;

// Pelo migrator, como em consultas.test.ts. Id DEM-20261110-NNNN; a mais nova é a de menor n.
async function inserirDemanda(e: Estado, campos: Partial<typeof demanda.$inferInsert> = {}): Promise<string> {
  e.n += 1;
  const id = `DEM-20261110-${String(e.n).padStart(4, '0')}`;
  const criadaEm = new Date(Date.UTC(2026, 10, 10, 12) - e.n * 60_000);
  await criarDb(e.b.poolMigrator)
    .insert(demanda)
    .values({
      id,
      titulo: `${SENTINELA} ${e.n} (fictício)`,
      tipo: 'melhoria',
      solicitanteNome: 'Pessoa Ficticia Solicitante',
      ...AUTOR,
      criadaEm,
      atualizadaEm: criadaEm,
      ...campos,
    });
  return id;
}

// ESP v1..esp, RSK v1..rsk e DEC v1..dec (o DEC cita a ESP v1 e o RSK v1: dec > 0 pede esp e rsk > 0).
async function inserirVersoes(e: Estado, demandaId: string, q: { esp?: number; rsk?: number; dec?: number }): Promise<void> {
  const db = criarDb(e.b.poolMigrator);
  const criadaEm = new Date(Date.UTC(2026, 10, 10, 13));
  for (let v = 1; v <= (q.esp ?? 0); v++) {
    await db.insert(especificacaoTecnica).values({
      id: idVersao('ESP', demandaId, v),
      demandaId,
      versao: v,
      descricaoObjetiva: `${SENTINELA} ESP (fictício)`,
      escopoInclui: ['item fictício'],
      ...AUTOR,
      rascunhoAgente: false,
      criadaEm,
    });
  }
  for (let v = 1; v <= (q.rsk ?? 0); v++) {
    await db.insert(parecerRisco).values({
      id: idVersao('RSK', demandaId, v),
      demandaId,
      versao: v,
      riscoTecnicoNivel: 'baixo',
      riscoOperacionalNivel: 'baixo',
      riscoJuridicoNivel: 'baixo',
      ...AUTOR,
      rascunhoAgente: false,
      criadaEm,
    });
  }
  for (let v = 1; v <= (q.dec ?? 0); v++) {
    await db.insert(pacoteDecisao).values({
      id: idVersao('DEC', demandaId, v),
      demandaId,
      versao: v,
      especificacaoId: idVersao('ESP', demandaId, 1),
      especificacaoVersao: 1,
      parecerRiscoId: idVersao('RSK', demandaId, 1),
      parecerRiscoVersao: 1,
      demandaTipo: 'melhoria',
      demandaTitulo: `${SENTINELA} DEC (fictício)`,
      demandaDescricao: 'Descrição fictícia',
      resumoExecutivo: 'Resumo fictício',
      opcaoA: { descricao: 'Opção A fictícia' },
      opcaoB: { descricao: 'Opção B fictícia' },
      nivelAprovacaoRequerido: 'cto',
      ...AUTOR,
      rascunhoAgente: false,
      criadaEm,
    });
  }
}

// Db sobre o pool do app que conta e guarda as consultas que o Drizzle manda.
function dbQueConta(b: BancoDeTeste) {
  const consultas: Array<{ sql: string; params: unknown[] }> = [];
  const db: Db = drizzle(b.poolApp, { schema, casing: 'snake_case', logger: { logQuery: (sql, params) => consultas.push({ sql, params }) } });
  return { db, consultas };
}

const zerado = (): Record<Status, number> => Object.fromEntries(STATUS.map((s) => [s, 0])) as Record<Status, number>;

describe('contarDemandasPorStatus', () => {
  const e = bancoDoBloco();
  beforeAll(async () => {
    // nova: 2 melhoria (sob_medida) e 1 bug (sem linha); pronta_para_decisao: 1 bug (automacao_integracao) e 1 melhoria
    // (sob_medida). Nenhuma nos outros sete status.
    await inserirDemanda(e, { status: 'nova', tipo: 'melhoria', linhaServicoProvavel: 'sob_medida' });
    await inserirDemanda(e, { status: 'nova', tipo: 'melhoria', linhaServicoProvavel: 'sob_medida' });
    await inserirDemanda(e, { status: 'nova', tipo: 'bug' });
    await inserirDemanda(e, { status: 'pronta_para_decisao', tipo: 'bug', linhaServicoProvavel: 'automacao_integracao' });
    await inserirDemanda(e, { status: 'pronta_para_decisao', tipo: 'melhoria', linhaServicoProvavel: 'sob_medida' });
  });

  it('CA-05.1: 3 nova e 2 pronta_para_decisao; status sem demanda vale 0; todas é a soma', async () => {
    const r = await contarDemandasPorStatus(e.b.db, filtro());
    expect(r).toEqual({ porStatus: { ...zerado(), nova: 3, pronta_para_decisao: 2 }, todas: 5 });
  });

  it('CA-05.4: com tipo=bug, conta só bug; o filtro de status é ignorado', async () => {
    const r = await contarDemandasPorStatus(e.b.db, filtro({ tipo: 'bug', status: 'nova' }));
    expect(r).toEqual({ porStatus: { ...zerado(), nova: 1, pronta_para_decisao: 1 }, todas: 2 });
  });

  it('com linhaServicoProvavel, conta só a linha', async () => {
    const r = await contarDemandasPorStatus(e.b.db, filtro({ linhaServicoProvavel: 'sob_medida' }));
    expect(r).toEqual({ porStatus: { ...zerado(), nova: 2, pronta_para_decisao: 1 }, todas: 3 });
  });

  it('tipo e linha juntos valem como E; combinação sem demanda dá tudo 0', async () => {
    expect(await contarDemandasPorStatus(e.b.db, filtro({ tipo: 'bug', linhaServicoProvavel: 'automacao_integracao' }))).toEqual({
      porStatus: { ...zerado(), pronta_para_decisao: 1 },
      todas: 1,
    });
    expect(await contarDemandasPorStatus(e.b.db, filtro({ tipo: 'estudo' }))).toEqual({ porStatus: zerado(), todas: 0 });
  });

  it('CV-06: o retorno só tem porStatus (as nove chaves) e todas, em números; nenhum título', async () => {
    const r = await contarDemandasPorStatus(e.b.db, filtro());
    expect(Object.keys(r).sort()).toEqual(['porStatus', 'todas']);
    expect(Object.keys(r.porStatus).sort()).toEqual([...STATUS].sort());
    for (const v of [...Object.values(r.porStatus), r.todas]) expect(typeof v).toBe('number');
    expect(JSON.stringify(r)).not.toContain(SENTINELA);
  });

  it('CV-06: uma consulta só, com os filtros como parâmetros (nada do filtro no texto do SQL)', async () => {
    const { db, consultas } = dbQueConta(e.b);
    await contarDemandasPorStatus(db, filtro({ tipo: 'bug', linhaServicoProvavel: 'automacao_integracao' }));
    expect(consultas).toHaveLength(1);
    expect(consultas[0]!.sql).toMatch(/^select /);
    expect(consultas[0]!.sql).not.toContain('automacao_integracao');
    expect(consultas[0]!.params).toEqual(['bug', 'automacao_integracao']);
  });
});

describe('etapasDasDemandas', () => {
  const e = bancoDoBloco();
  let feitas: { espRsk: string; nada: string; tudo: string; soEsp: string };
  beforeAll(async () => {
    feitas = { espRsk: await inserirDemanda(e), nada: await inserirDemanda(e), tudo: await inserirDemanda(e), soEsp: await inserirDemanda(e) };
    await inserirVersoes(e, feitas.espRsk, { esp: 2, rsk: 1 });
    await inserirVersoes(e, feitas.tudo, { esp: 3, rsk: 2, dec: 2 });
    await inserirVersoes(e, feitas.soEsp, { esp: 1 });
  });

  it('CA-06.1: ESP e RSK sem DEC dá { esp: true, rsk: true, dec: false }; várias versões contam como feita', async () => {
    const r = await etapasDasDemandas(e.b.db, [feitas.espRsk, feitas.nada, feitas.tudo, feitas.soEsp]);
    expect(r.get(feitas.espRsk)).toEqual({ esp: true, rsk: true, dec: false });
    expect(r.get(feitas.nada)).toEqual({ esp: false, rsk: false, dec: false });
    expect(r.get(feitas.tudo)).toEqual({ esp: true, rsk: true, dec: true });
    expect(r.get(feitas.soEsp)).toEqual({ esp: true, rsk: false, dec: false });
    expect(r.size).toBe(4);
  });

  it('só as demandas pedidas entram no mapa; id que não existe fica fora', async () => {
    const r = await etapasDasDemandas(e.b.db, [feitas.tudo, 'DEM-20991231-9999']);
    expect([...r.keys()]).toEqual([feitas.tudo]);
  });

  it('lista vazia não consulta o banco e devolve mapa vazio', async () => {
    const { db, consultas } = dbQueConta(e.b);
    const r = await etapasDasDemandas(db, []);
    expect(r.size).toBe(0);
    expect(consultas).toEqual([]);
  });

  it('CV-06: os ids entram como parâmetros; texto de injeção não muda a consulta nem quebra', async () => {
    const { db, consultas } = dbQueConta(e.b);
    const injecao = `${feitas.tudo}' or '1'='1`;
    const r = await etapasDasDemandas(db, [injecao]);
    expect(r.size).toBe(0);
    expect(consultas).toHaveLength(1);
    expect(consultas[0]!.sql).toMatch(/^select /);
    expect(consultas[0]!.sql).not.toContain(feitas.tudo);
    expect(consultas[0]!.params).toEqual([injecao]);
  });

  it('CV-06: cada valor tem só as chaves esp, rsk e dec, booleanas; nenhum título', async () => {
    const r = await etapasDasDemandas(e.b.db, Object.values(feitas));
    expect(r.size).toBe(4);
    for (const [id, v] of r) {
      expect(Object.values(feitas)).toContain(id);
      expect(Object.keys(v).sort()).toEqual(['dec', 'esp', 'rsk']);
      for (const x of Object.values(v)) expect(typeof x).toBe('boolean');
    }
    expect(JSON.stringify([...r])).not.toContain(SENTINELA);
  });
});

describe('RNF-09: custo fixo da fila', () => {
  const e = bancoDoBloco();
  // Cumulativo: o caso de 100 acrescenta 80 às 20 do caso anterior. Uma em três tem ESP e RSK, uma em seis também DEC.
  async function popularAte(total: number): Promise<void> {
    while (e.n < total) {
      const id = await inserirDemanda(e);
      if (e.n % 3 === 0) await inserirVersoes(e, id, { esp: 2, rsk: 1, dec: e.n % 6 === 0 ? 1 : 0 });
    }
  }

  it.each([20, 100])('com %i demandas, a carga da página faz 4 consultas (2 de hoje + 2 novas)', async (total) => {
    await popularAte(total);
    const { db, consultas } = dbQueConta(e.b);
    // A página inteira de uma vez (limit = total): o número de consultas não cresce com o tamanho da página.
    const f = filtro({ limit: String(total) });
    const lista = await listarDemandas(db, f);
    const contagem = await contarDemandasPorStatus(db, f);
    const etapas = await etapasDasDemandas(
      db,
      lista.itens.map((i) => i.id),
    );
    expect(consultas).toHaveLength(4);
    expect(lista.itens).toHaveLength(total);
    expect(contagem.todas).toBe(total);
    expect(etapas.size).toBe(total);
  });
});

// Plano de execução com volume, pelo planejador de verdade (sem desligar a varredura), como em test/desempenho.
type NoDoPlano = { 'Node Type': string; 'Relation Name'?: string; 'Index Name'?: string; 'Subplan Name'?: string; Output?: string[]; Plans?: NoDoPlano[] };
const nosDe = (no: NoDoPlano): NoDoPlano[] => [no, ...(no.Plans ?? []).flatMap(nosDe)];
// Cada nó com o nome do SubPlan em que está: o do próprio nó ou o do ancestral mais próximo.
const nosComSubplano = (no: NoDoPlano, sub: string | null = null): Array<{ no: NoDoPlano; sub: string | null }> => {
  const atual = no['Subplan Name'] ?? sub;
  return [{ no, sub: atual }, ...(no.Plans ?? []).flatMap((f) => nosComSubplano(f, atual))];
};
// Seq Scan que não está num SubPlan com hash: varredura completa a cada linha de fora, ou da tabela da página. No
// Postgres 16 o nó se chama só "SubPlan N"; o hash aparece na expressão que o usa, "(hashed SubPlan N)", na saída do
// EXPLAIN (VERBOSE).
const comHash = (p: NoDoPlano, sub: string | null): boolean => sub !== null && new RegExp(`hashed ${sub}(?!\\d)`).test(JSON.stringify(p));
const varridasSemHash = (p: NoDoPlano): string[] =>
  nosComSubplano(p)
    .filter(({ no, sub }) => no['Node Type'] === 'Seq Scan' && !comHash(p, sub))
    .map(({ no, sub }) => `${sub ?? 'sem SubPlan'}: ${no['Relation Name']}`);
const resumoDoPlano = (p: NoDoPlano): string =>
  nosDe(p)
    .map((n) => [n['Subplan Name'] ? `[${n['Subplan Name']}]` : '', n['Node Type'], n['Relation Name'], n['Index Name']].filter(Boolean).join(' '))
    .join(' > ');
const relatar = (linha: string) => process.stdout.write(`T07 ${linha}\n`);
const TABELAS_DE_VERSOES = ['especificacao_tecnica', 'parecer_risco', 'pacote_decisao'];
const LIMITE_MS = 1_000;

describe('plano de execução das leituras novas com 5.000 demandas (EXPLAIN)', () => {
  const e = bancoDoBloco();
  beforeAll(async () => {
    // A mesma massa de test/desempenho/leitura.test.ts: ESP em 3/4, RSK em 1/3, DEC em 1/6, uma por hora.
    for (const comando of [
      `insert into demanda (id, titulo, tipo, status, solicitante_nome, linha_servico_provavel, urgencia, autor_tipo, autor_id, rascunho_agente, criada_em, atualizada_em)
       select 'DEM-' || to_char((timestamp '2026-01-01 12:00:00' + i * interval '1 hour'), 'YYYYMMDD') || '-' || lpad(i::text, 4, '0'),
              'Demanda ficticia ' || i,
              (array['bug', 'melhoria', 'novo_projeto', 'estudo', 'produto_proprio'])[1 + i % 5],
              (array['nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao', 'encerrada', 'aprovada', 'em_construcao', 'entregue', 'devolvida'])[1 + i % 9],
              'Pessoa Ficticia',
              (array['sob_medida', 'automacao_integracao', 'ia_controle_humano', 'diagnostico_sustentacao', 'indefinida', null])[1 + i % 6],
              (array['baixa', 'media', 'alta'])[1 + i % 3],
              'pessoa', 'u-ficticio-desempenho', false,
              (timestamp '2026-01-01 12:00:00' + i * interval '1 hour') at time zone 'UTC',
              (timestamp '2026-01-01 12:00:00' + i * interval '1 hour') at time zone 'UTC'
       from generate_series(1, 5000) as i`,
      `insert into especificacao_tecnica (id, demanda_id, versao, descricao_objetiva, escopo_inclui, autor_tipo, autor_id, rascunho_agente, criada_em)
       select 'ESP-' || d.id || '-v' || v, d.id, v, 'Descricao ficticia', '["item ficticio"]'::jsonb, 'pessoa', 'u-ficticio-desempenho', false, d.criada_em
       from demanda d cross join generate_series(1, 2) as v
       where (right(d.id, 4)::int % 2 = 0 and v = 1) or (right(d.id, 4)::int % 4 = 0 and v = 2)`,
      `insert into parecer_risco (id, demanda_id, versao, risco_tecnico_nivel, risco_operacional_nivel, risco_juridico_nivel, autor_tipo, autor_id, rascunho_agente, criada_em)
       select 'RSK-' || d.id || '-v1', d.id, 1, 'baixo', 'medio', 'alto', 'pessoa', 'u-ficticio-desempenho', false, d.criada_em
       from demanda d where right(d.id, 4)::int % 3 = 0`,
      `insert into pacote_decisao (id, demanda_id, versao, especificacao_id, especificacao_versao, parecer_risco_id, parecer_risco_versao, demanda_tipo,
         demanda_titulo, demanda_descricao, resumo_executivo, opcao_a, opcao_b, nivel_aprovacao_requerido, autor_tipo, autor_id, rascunho_agente, criada_em)
       select 'DEC-' || d.id || '-v1', d.id, 1, 'ESP-' || d.id || '-v1', 1, 'RSK-' || d.id || '-v1', 1, d.tipo,
              d.titulo, 'Contexto: ficticio', 'Resumo ficticio', '{"descricao":"Opcao A ficticia"}'::jsonb, '{"descricao":"Opcao B ficticia"}'::jsonb,
              'cto', 'pessoa', 'u-ficticio-desempenho', false, d.criada_em
       from demanda d where right(d.id, 4)::int % 6 = 0`,
      'analyze',
    ]) {
      await e.b.poolMigrator.query(comando);
    }
  });

  async function planoDe(c: { sql: string; params: unknown[] }): Promise<NoDoPlano> {
    const r = await e.b.poolApp.query<{ 'QUERY PLAN': Array<{ Plan: NoDoPlano }> }>(`explain (format json, verbose) ${c.sql}`, c.params);
    return r.rows[0]!['QUERY PLAN'][0]!.Plan;
  }

  // O planejador escolhe, por tabela de versões, entre buscar no índice único (demanda_id, versao) por demanda da página
  // e ler a tabela uma vez com hash ("hashed SubPlan"); as duas custam no máximo uma leitura da tabela por consulta. O que
  // não pode aparecer: junção (multiplica as versões), SubPlan sem hash com Seq Scan (uma varredura por demanda da
  // página) e varredura completa de demanda (a página entra pela chave primária).
  it.each([20, 100])('etapas da página de %i: demanda pela chave, cada tabela de versões lida uma vez, sem junção, menos de 1 s', async (limite) => {
    const lista = await listarDemandas(e.b.db, filtro({ limit: String(limite) }));
    const ids = lista.itens.map((i) => i.id);
    const { db, consultas } = dbQueConta(e.b);
    const inicio = performance.now();
    const r = await etapasDasDemandas(db, ids);
    const ms = performance.now() - inicio;
    expect(r.size).toBe(limite);
    expect(consultas).toHaveLength(1);
    const plano = await planoDe(consultas[0]!);
    relatar(`EXPLAIN etapas (${limite} ids, ${ms.toFixed(1)} ms): ${resumoDoPlano(plano)}`);
    relatar(`EXPLAIN etapas (${limite} ids), saída: ${(plano.Output ?? []).join(', ')}`);
    const nos = nosComSubplano(plano);
    const leituras = nos.flatMap(({ no }) => (no['Relation Name'] ? [no['Relation Name']] : [])).sort();
    expect(leituras).toEqual(['demanda', ...TABELAS_DE_VERSOES].sort());
    expect(nos.filter(({ no }) => no['Relation Name'] === 'demanda').map(({ no }) => no['Index Name'])).toEqual(['demanda_pkey']);
    expect(nos.filter(({ no }) => /Join|Nested Loop/.test(no['Node Type']))).toEqual([]);
    expect(varridasSemHash(plano)).toEqual([]);
    expect(ms).toBeLessThan(LIMITE_MS);
  });

  it('a regra do plano reprova Seq Scan fora de SubPlan com hash e aceita a busca no índice e o hashed SubPlan', () => {
    const pagina = (saida: string): NoDoPlano => ({ 'Node Type': 'Index Only Scan', 'Relation Name': 'demanda', 'Index Name': 'demanda_pkey', Output: ['demanda.id', saida] });
    const comSub = (saida: string, sub: NoDoPlano): NoDoPlano => ({ ...pagina(saida), Plans: [sub] });
    const varre = (nome: string): NoDoPlano => ({ 'Node Type': 'Seq Scan', 'Relation Name': 'parecer_risco', 'Subplan Name': nome });
    // SubPlan por linha com Seq Scan, e Seq Scan da própria tabela da página: reprovam.
    expect(varridasSemHash(comSub('(SubPlan 2)', varre('SubPlan 2')))).toEqual(['SubPlan 2: parecer_risco']);
    expect(varridasSemHash({ 'Node Type': 'Seq Scan', 'Relation Name': 'demanda' })).toEqual(['sem SubPlan: demanda']);
    // O hash de outro SubPlan (20, não 2) não serve de desculpa.
    expect(varridasSemHash(comSub('(hashed SubPlan 20)', varre('SubPlan 2')))).toEqual(['SubPlan 2: parecer_risco']);
    // Hashed SubPlan com Seq Scan e SubPlan por linha pelo índice: passam.
    expect(varridasSemHash(comSub('(hashed SubPlan 2)', varre('SubPlan 2')))).toEqual([]);
    const indice: NoDoPlano = { 'Node Type': 'Index Only Scan', 'Relation Name': 'parecer_risco', 'Index Name': 'parecer_risco_demanda_versao_unique', 'Subplan Name': 'SubPlan 1' };
    expect(varridasSemHash(comSub('(SubPlan 1)', indice))).toEqual([]);
  });

  it.each([
    ['sem filtro', {}],
    ['por tipo', { tipo: 'bug' }],
    ['por linha de serviço', { linhaServicoProvavel: 'sob_medida' }],
    ['tipo e linha juntos', { tipo: 'novo_projeto', linhaServicoProvavel: 'ia_controle_humano' }],
  ])('contagem por status %s: uma passada só em demanda, sem junção, menos de 1 s', async (caso, q) => {
    const { db, consultas } = dbQueConta(e.b);
    const inicio = performance.now();
    await contarDemandasPorStatus(db, filtro(q));
    const ms = performance.now() - inicio;
    expect(consultas).toHaveLength(1);
    const plano = await planoDe(consultas[0]!);
    relatar(`EXPLAIN contagem ${caso} (${ms.toFixed(1)} ms): ${resumoDoPlano(plano)}`);
    const relacoes = nosDe(plano).flatMap((n) => (n['Relation Name'] ? [n['Relation Name']] : []));
    expect(new Set(relacoes)).toEqual(new Set(['demanda']));
    expect(nosDe(plano).filter((n) => /Join|Nested Loop/.test(n['Node Type']))).toEqual([]);
    expect(ms).toBeLessThan(LIMITE_MS);
  });
});
