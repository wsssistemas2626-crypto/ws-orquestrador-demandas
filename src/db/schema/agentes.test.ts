// Integridade das tabelas de agentes e de uso de IA (T06), provada no Postgres real com o papel do app: o banco segura
// o interruptor, o teto, o preço, a execução única por entrada e o registro de uso só de inclusão (RF-17 a RF-19,
// C-26, C-34). Dados só fictícios.
import type { PoolClient } from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { AGENTES, MOEDAS, RESULTADOS_USO, ROTINAS, STATUS_AVISO_EMAIL, STATUS_EXECUCAO } from './index';

let b: BancoDeTeste;
const QUANDO = '2026-10-22T12:00:00Z';
const D1 = 'DEM-20261022-0701';
const PENDENTE = '0a1b2c3d-0000-4000-8000-000000000001';

type Campos = Record<string, string | number | boolean | null>;
const inserir = (tabela: string, campos: Campos, pool: 'app' | 'migrator' = 'app') => {
  const colunas = Object.keys(campos);
  return (pool === 'app' ? b.poolApp : b.poolMigrator).query(
    `insert into ${tabela} (${colunas.join(', ')}) values (${colunas.map((_, i) => `$${i + 1}`).join(', ')}) returning *`,
    Object.values(campos),
  );
};

const execucao = (campos: Campos = {}): Campos => ({
  agente: 'insumo_tecnico',
  chave_entrada: `demanda:${D1}`,
  demanda_id: D1,
  criada_em: QUANDO,
  atualizada_em: QUANDO,
  ...campos,
});

beforeAll(async () => {
  b = await novoBanco();
  await b.poolMigrator.query(
    `insert into demanda (id, titulo, tipo, solicitante_nome, autor_tipo, autor_id, criada_em, atualizada_em) values ($1, 'Demanda ficticia', 'melhoria', 'Pessoa Ficticia', 'pessoa', 'u-ficticio', $2, $2)`,
    [D1, QUANDO],
  );
});
afterAll(async () => {
  await b.fechar();
});

describe('configuracao_agente: o app liga, desliga e troca o modelo, mas não cria, renomeia nem apaga agente', () => {
  it('o app liga o risco com modelo e autor da alteração, e desliga de novo', async () => {
    await b.poolApp.query(
      `update configuracao_agente set ligado = true, modelo = 'modelo-ficticio', atualizado_em = $1, atualizado_por = 'u-ficticio' where agente = 'risco'`,
      [QUANDO],
    );
    const r = await b.poolApp.query(`select ligado, modelo, atualizado_por from configuracao_agente where agente = 'risco'`);
    expect(r.rows).toEqual([{ ligado: true, modelo: 'modelo-ficticio', atualizado_por: 'u-ficticio' }]);
    await b.poolApp.query(`update configuracao_agente set ligado = false where agente = 'risco'`);
  });

  it('agente ligado sem modelo é recusado (23514): o executor não chama provedor sem saber o preço', async () => {
    await expect(b.poolApp.query(`update configuracao_agente set ligado = true, modelo = null where agente = 'orquestrador'`)).rejects.toMatchObject({
      code: '23514',
      constraint: 'configuracao_agente_ligado_tem_modelo_check',
    });
  });

  it.each([
    ['incluir agente', `insert into configuracao_agente (agente, ligado) values ('risco', false)`],
    ['apagar agente', 'delete from configuracao_agente'],
    ['renomear agente', `update configuracao_agente set agente = 'risco' where agente = 'orquestrador'`],
    ['truncar', 'truncate configuracao_agente'],
  ])('%s é recusado com o papel do app (42501)', async (_caso, sql) => {
    await expect(b.poolApp.query(sql)).rejects.toMatchObject({ code: '42501' });
  });

  it('nem o migrator inclui agente fora dos quatro (23514)', async () => {
    await expect(inserir('configuracao_agente', { agente: 'agente_ficticio', ligado: false }, 'migrator')).rejects.toMatchObject({
      code: '23514',
      constraint: 'configuracao_agente_agente_check',
    });
  });
});

describe('configuracao_ia: uma linha só, teto não negativo, em USD (RF-18, P1-f)', () => {
  it('o app troca o teto e registra quem trocou', async () => {
    await b.poolApp.query(`update configuracao_ia set teto_mensal = '12.34', atualizado_em = $1, atualizado_por = 'u-ficticio' where id = 1`, [QUANDO]);
    const r = await b.poolApp.query('select teto_mensal, atualizado_por from configuracao_ia');
    expect(r.rows).toEqual([{ teto_mensal: '12.34', atualizado_por: 'u-ficticio' }]);
    await b.poolApp.query(`update configuracao_ia set teto_mensal = '0' where id = 1`);
  });

  it('teto negativo é recusado (23514)', async () => {
    await expect(b.poolApp.query(`update configuracao_ia set teto_mensal = '-0.01' where id = 1`)).rejects.toMatchObject({
      code: '23514',
      constraint: 'configuracao_ia_teto_mensal_check',
    });
  });

  it.each([
    ['trocar a moeda', `update configuracao_ia set moeda = 'USD'`],
    ['trocar o id', 'update configuracao_ia set id = 2'],
    ['incluir outra linha', `insert into configuracao_ia (id, teto_mensal) values (2, 0)`],
    ['apagar a linha', 'delete from configuracao_ia'],
  ])('%s é recusado com o papel do app (42501)', async (_caso, sql) => {
    await expect(b.poolApp.query(sql)).rejects.toMatchObject({ code: '42501' });
  });

  it.each([
    ['segunda linha', `insert into configuracao_ia (id, teto_mensal) values (2, 0)`, 'configuracao_ia_id_check'],
    ['moeda fora de USD', `update configuracao_ia set moeda = 'BRL'`, 'configuracao_ia_moeda_check'],
  ])('nem o migrator grava %s (23514)', async (_caso, sql, restricao) => {
    await expect(b.poolMigrator.query(sql)).rejects.toMatchObject({ code: '23514', constraint: restricao });
  });
});

describe('preco_modelo: vigências só de inclusão, uma por modelo e data (RF-17)', () => {
  const preco = (campos: Campos = {}): Campos => ({
    modelo: 'modelo-ficticio',
    preco_entrada_por_milhao: '3',
    preco_saida_por_milhao: '15',
    vigente_desde: '2026-10-01T00:00:00Z',
    ...campos,
  });

  it('o app inclui duas vigências, em USD por padrão, e a vigente na data é a mais nova até ela', async () => {
    const [p] = (await inserir('preco_modelo', preco())).rows;
    expect(p).toMatchObject({ moeda: 'USD', preco_entrada_por_milhao: '3.000000', preco_saida_por_milhao: '15.000000' });
    await inserir('preco_modelo', preco({ preco_entrada_por_milhao: '2.5', vigente_desde: '2026-11-01T00:00:00Z' }));
    const vigente = (em: string) =>
      b.poolApp.query(
        `select preco_entrada_por_milhao from preco_modelo where modelo = $1 and vigente_desde <= $2 order by vigente_desde desc limit 1`,
        ['modelo-ficticio', em],
      );
    expect((await vigente('2026-10-31T23:59:59Z')).rows).toEqual([{ preco_entrada_por_milhao: '3.000000' }]);
    expect((await vigente('2026-11-01T00:00:00Z')).rows).toEqual([{ preco_entrada_por_milhao: '2.500000' }]);
    expect((await vigente('2026-09-30T00:00:00Z')).rows).toEqual([]);
  });

  it('a mesma vigência do mesmo modelo não entra duas vezes (23505)', async () => {
    await inserir('preco_modelo', preco({ modelo: 'modelo-ficticio-2' }));
    await expect(inserir('preco_modelo', preco({ modelo: 'modelo-ficticio-2', preco_entrada_por_milhao: '4' }))).rejects.toMatchObject({
      code: '23505',
      constraint: 'preco_modelo_modelo_vigencia_unique',
    });
  });

  it.each([
    ['preço de entrada negativo', { preco_entrada_por_milhao: '-1' }, 'preco_modelo_preco_entrada_por_milhao_check'],
    ['preço de saída negativo', { preco_saida_por_milhao: '-1' }, 'preco_modelo_preco_saida_por_milhao_check'],
    ['moeda fora de USD', { moeda: 'BRL' }, 'preco_modelo_moeda_check'],
  ] as const)('%s é recusado (23514)', async (_caso, campos, restricao) => {
    await expect(inserir('preco_modelo', preco({ modelo: 'modelo-ficticio-3', ...campos }))).rejects.toMatchObject({
      code: '23514',
      constraint: restricao,
    });
  });

  it.each([
    ['alterar o preço', `update preco_modelo set preco_entrada_por_milhao = 0`],
    ['apagar a vigência', 'delete from preco_modelo'],
  ])('%s é recusado com o papel do app (42501)', async (_caso, sql) => {
    await expect(b.poolApp.query(sql)).rejects.toMatchObject({ code: '42501' });
  });
});

describe('execucao_agente: uma por agente e entrada, com a chave só de ids (ADR-07, C-22, CA-16.4)', () => {
  it('o app inclui a execução, que nasce pendente e sem tentativa', async () => {
    const [e] = (await inserir('execucao_agente', execucao())).rows;
    expect(e).toMatchObject({ status: 'pendente', tentativas: 0, proxima_tentativa_em: null, bloqueada_ate: null, artefato_id: null });
    expect(e.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('a mesma entrada do mesmo agente não entra duas vezes: 23505, e o "on conflict do nothing" de criarExecucao não insere', async () => {
    const campos = execucao({ chave_entrada: 'demanda:DEM-20261022-0705', demanda_id: null });
    await inserir('execucao_agente', campos);
    await expect(inserir('execucao_agente', campos)).rejects.toMatchObject({ code: '23505', constraint: 'execucao_agente_agente_chave_unique' });
    const r = await b.poolApp.query(
      `insert into execucao_agente (agente, chave_entrada, criada_em, atualizada_em) values ('insumo_tecnico', 'demanda:DEM-20261022-0705', $1, $1) on conflict (agente, chave_entrada) do nothing returning id`,
      [QUANDO],
    );
    expect(r.rows).toEqual([]);
    // Outro agente pode ter a mesma demanda em outra chave; a unicidade é do par.
    await inserir('execucao_agente', execucao({ agente: 'risco', chave_entrada: 'esp:ESP-DEM-20261022-0705-v1', demanda_id: null }));
  });

  it('as quatro chaves do plano entram, cada uma com o seu agente', async () => {
    const chaves: Campos[] = [
      { agente: 'orquestrador', chave_entrada: `entrada:${PENDENTE}`, demanda_id: null },
      { agente: 'risco', chave_entrada: `esp:ESP-${D1}-v1` },
      { agente: 'consolidacao', chave_entrada: `rsk:RSK-${D1}-v12` },
      { agente: 'insumo_tecnico', chave_entrada: 'demanda:DEM-20261022-0702', demanda_id: null },
    ];
    for (const campos of chaves) {
      await expect(inserir('execucao_agente', execucao(campos)), String(campos.chave_entrada)).resolves.toMatchObject({ rowCount: 1 });
    }
  });

  it.each([
    ['chave de outro agente', { agente: 'risco', chave_entrada: `demanda:${D1}` }],
    ['orquestrador com chave de demanda', { agente: 'orquestrador', chave_entrada: `demanda:${D1}` }],
    ['texto livre na chave', { agente: 'risco', chave_entrada: 'esp:SENTINELA-texto do cliente' }],
    ['id fora do formato', { agente: 'insumo_tecnico', chave_entrada: 'demanda:DEM-1' }],
    ['uuid fora do formato', { agente: 'orquestrador', chave_entrada: 'entrada:nao-e-uuid', demanda_id: null }],
    ['sufixo depois do id', { agente: 'consolidacao', chave_entrada: `rsk:RSK-${D1}-v1 extra` }],
  ] as const)('%s é recusada (23514)', async (_caso, campos) => {
    await expect(inserir('execucao_agente', execucao(campos))).rejects.toMatchObject({ code: '23514', constraint: 'execucao_agente_chave_entrada_check' });
  });

  it.each([
    ['agente fora da lista', { agente: 'agente_ficticio' }, 'execucao_agente_agente_check'],
    ['status fora da lista', { status: 'aprovada' }, 'execucao_agente_status_check'],
    ['tentativas negativas', { tentativas: -1 }, 'execucao_agente_tentativas_check'],
    ['concluída sem artefato', { status: 'concluida' }, 'execucao_agente_concluida_tem_artefato_check'],
    ['em andamento sem trava', { status: 'em_andamento' }, 'execucao_agente_em_andamento_tem_trava_check'],
  ] as const)('%s é recusada (23514)', async (_caso, campos, restricao) => {
    await expect(inserir('execucao_agente', execucao({ chave_entrada: 'demanda:DEM-20261022-0799', demanda_id: null, ...campos }))).rejects.toMatchObject({
      code: '23514',
      constraint: restricao,
    });
  });

  it('demanda que não existe é recusada (23503)', async () => {
    await expect(inserir('execucao_agente', execucao({ chave_entrada: 'demanda:DEM-20261022-0798', demanda_id: 'DEM-20261022-0798' }))).rejects.toMatchObject({
      code: '23503',
    });
  });

  it('a reivindicação da ADR-07 é um UPDATE condicional: a primeira leva, a segunda não acha nada', async () => {
    const [e] = (await inserir('execucao_agente', execucao({ chave_entrada: 'demanda:DEM-20261022-0703', demanda_id: null }))).rows;
    const reivindicar = () =>
      b.poolApp.query(
        `update execucao_agente set status = 'em_andamento', bloqueada_ate = $2::timestamptz + interval '150 seconds', tentativas = tentativas + 1, atualizada_em = $2 where id = $1 and (status = 'pendente' or (status = 'em_andamento' and bloqueada_ate < $2)) returning tentativas`,
        [e.id, QUANDO],
      );
    expect((await reivindicar()).rows).toEqual([{ tentativas: 1 }]);
    expect((await reivindicar()).rows).toEqual([]);
    await b.poolApp.query(`update execucao_agente set status = 'concluida', artefato_id = $2, bloqueada_ate = null, atualizada_em = $3 where id = $1`, [
      e.id,
      'ESP-DEM-20261022-0703-v1',
      QUANDO,
    ]);
    await b.poolApp.query(`update execucao_agente set status = 'pendente', proxima_tentativa_em = $2 where id = $1`, [e.id, QUANDO]);
  });

  it.each([
    ['agente', `update execucao_agente set agente = 'risco'`],
    ['chave_entrada', `update execucao_agente set chave_entrada = 'demanda:DEM-20261022-0704'`],
    ['demanda_id', 'update execucao_agente set demanda_id = null'],
    ['criada_em', 'update execucao_agente set criada_em = now()'],
  ])('mudar %s é recusado com o papel do app (42501)', async (_coluna, sql) => {
    await expect(b.poolApp.query(sql)).rejects.toMatchObject({ code: '42501' });
  });

  it('apagar execução é recusado com o papel do app (42501)', async () => {
    await expect(b.poolApp.query('delete from execucao_agente')).rejects.toMatchObject({ code: '42501' });
  });
});

describe('uso_ia: uma linha por chamada, só de inclusão, sem conteúdo (RF-17, CA-17.2, CA-17.3)', () => {
  let execucaoId: string;
  beforeAll(async () => {
    const [e] = (await inserir('execucao_agente', execucao({ agente: 'risco', chave_entrada: `esp:ESP-${D1}-v9` }))).rows;
    execucaoId = e.id;
  });
  const uso = (campos: Campos = {}): Campos => ({
    execucao_agente_id: execucaoId,
    agente: 'risco',
    demanda_id: D1,
    modelo: 'modelo-ficticio',
    tokens_entrada: 1000,
    tokens_saida: 200,
    custo: '0.006',
    resultado: 'sucesso',
    ocorrido_em: QUANDO,
    ...campos,
  });

  it('o app registra o uso, com o custo em 6 casas', async () => {
    const [u] = (await inserir('uso_ia', uso())).rows;
    expect(u).toMatchObject({ tokens_entrada: 1000, tokens_saida: 200, custo: '0.006000', resultado: 'sucesso' });
  });

  it('a chamada fora do schema e a com erro também são registradas, mesmo sem token (CA-17.2)', async () => {
    await inserir('uso_ia', uso({ resultado: 'fora_do_schema' }));
    await inserir('uso_ia', uso({ resultado: 'erro', tokens_entrada: 0, tokens_saida: 0, custo: '0' }));
  });

  it.each([
    ['resultado fora da lista', { resultado: 'aprovada' }, 'uso_ia_resultado_check'],
    ['agente fora da lista', { agente: 'agente_ficticio' }, 'uso_ia_agente_check'],
    ['tokens de entrada negativos', { tokens_entrada: -1 }, 'uso_ia_tokens_entrada_check'],
    ['tokens de saída negativos', { tokens_saida: -1 }, 'uso_ia_tokens_saida_check'],
    ['custo negativo', { custo: '-0.000001' }, 'uso_ia_custo_check'],
  ] as const)('%s é recusado (23514)', async (_caso, campos, restricao) => {
    await expect(inserir('uso_ia', uso(campos))).rejects.toMatchObject({ code: '23514', constraint: restricao });
  });

  it('uso sem execução existente é recusado (23503)', async () => {
    await expect(inserir('uso_ia', uso({ execucao_agente_id: '0a1b2c3d-0000-4000-8000-0000000000ff' }))).rejects.toMatchObject({ code: '23503' });
  });

  it.each([
    ['alterar os tokens', 'update uso_ia set tokens_entrada = 0'],
    ['apagar o uso', 'delete from uso_ia'],
    ['truncar', 'truncate uso_ia'],
  ])('%s é recusado com o papel do app (42501)', async (_caso, sql) => {
    await expect(b.poolApp.query(sql)).rejects.toMatchObject({ code: '42501' });
  });
});

describe('enumerações das tabelas de agentes e operação são as listas exportadas pelo esquema', () => {
  it.each([
    ['token_servico_agente_check', AGENTES],
    ['configuracao_agente_agente_check', AGENTES],
    ['configuracao_ia_moeda_check', MOEDAS],
    ['preco_modelo_moeda_check', MOEDAS],
    ['execucao_agente_agente_check', AGENTES],
    ['execucao_agente_status_check', STATUS_EXECUCAO],
    ['uso_ia_agente_check', AGENTES],
    ['uso_ia_resultado_check', RESULTADOS_USO],
    ['aviso_email_status_check', STATUS_AVISO_EMAIL],
    ['rotina_execucao_rotina_check', ROTINAS],
  ] as const)('%s', async (restricao, lista) => {
    const r = await b.poolMigrator.query(`select pg_get_constraintdef(oid) as def from pg_constraint where conname = $1`, [restricao]);
    expect(r.rows, restricao).toHaveLength(1);
    const valores = [...(r.rows[0].def as string).matchAll(/'([^']*)'::text/g)].map((m) => m[1]);
    expect(valores.sort()).toEqual([...lista].sort());
  });
});

// Plano de execução das consultas que o executor, o teto, o batimento e o painel fazem. Com a tabela pequena o
// planejador prefere a varredura; desligá-la mostra se existe índice que serve à forma da consulta.
describe('índices das consultas críticas de agentes e operação (EXPLAIN)', () => {
  const plano = async (consulta: string, valores: unknown[]) => {
    const c = await b.poolMigrator.connect();
    try {
      await c.query('begin');
      await c.query('set local enable_seqscan = off');
      const r = await c.query(`explain (format json) ${consulta}`, valores);
      return JSON.stringify(r.rows[0]['QUERY PLAN']);
    } finally {
      await c.query('rollback');
      c.release();
    }
  };

  it.each([
    [
      'gasto do mês (teto, CA-18.1)',
      'select coalesce(sum(custo), 0) from uso_ia where ocorrido_em >= $1 and ocorrido_em < $2',
      ['2026-10-01T03:00:00Z', '2026-11-01T03:00:00Z'],
      'uso_ia_ocorrido_idx',
    ],
    [
      'preço vigente do modelo',
      'select preco_entrada_por_milhao, preco_saida_por_milhao from preco_modelo where modelo = $1 and vigente_desde <= $2 order by vigente_desde desc limit 1',
      ['modelo-ficticio', QUANDO],
      'preco_modelo_modelo_vigencia_unique',
    ],
    ['execução por agente e entrada (criarExecucao)', 'select id from execucao_agente where agente = $1 and chave_entrada = $2', ['risco', `esp:ESP-${D1}-v1`], 'execucao_agente_agente_chave_unique'],
    [
      'varredura de pendentes vencidas (batimento)',
      `select id from execucao_agente where status = 'pendente' and proxima_tentativa_em < $1`,
      [QUANDO],
      'execucao_agente_status_proxima_idx',
    ],
    [
      'varredura de travas vencidas (batimento)',
      `select id from execucao_agente where status = 'em_andamento' and bloqueada_ate < $1`,
      [QUANDO],
      'execucao_agente_status_proxima_idx',
    ],
    [
      'agentes em andamento da demanda (T-03)',
      `select agente, status from execucao_agente where demanda_id = $1 and status in ('pendente', 'em_andamento')`,
      [D1],
      'execucao_agente_demanda_status_idx',
    ],
    ['batimentos recentes (situação do worker)', 'select count(*) from worker_batimento where visto_em >= $1', [QUANDO], 'worker_batimento_visto_idx'],
    ['último batimento', 'select max(visto_em) from worker_batimento', [], 'worker_batimento_visto_idx'],
  ])('%s sai por índice', async (_consulta, sql, valores, indice) => {
    const p = await plano(sql, valores);
    expect(p).toContain(`"Index Name":"${indice}"`);
    expect(p).not.toContain('"Node Type":"Seq Scan"');
  });
});

// Testes da etapa 06-T06-testes (qa-automacao). Os de cima conferem cada restrição; estes fecham o que eles não pegam:
// a lista de colunas por permissão (o filtro por nome de CA-17.3 deixa passar coluna de conteúdo com outro nome), as
// bordas da chave de entrada e a concorrência real entre dois workers (ADR-07), com duas conexões e a espera pela trava
// conferida no pg_locks, sem depender de tempo.
const colunasDe = async (tabela: string) =>
  (
    await b.poolMigrator.query(
      `select a.attname || ':' || format_type(a.atttypid, a.atttypmod) as coluna from pg_attribute a where a.attrelid = $1::regclass and a.attnum > 0 and not a.attisdropped`,
      [`public.${tabela}`],
    )
  ).rows
    .map((x) => x.coluna as string)
    .sort();

describe('colunas das tabelas de agentes por lista de permissão (CA-17.3, C-22, RF-18)', () => {
  const TSTZ = 'timestamp with time zone';
  it.each([
    [
      'uso_ia',
      [
        'agente:text',
        'custo:numeric(12,6)',
        'demanda_id:text',
        'execucao_agente_id:uuid',
        'id:uuid',
        'modelo:text',
        `ocorrido_em:${TSTZ}`,
        'resultado:text',
        'tokens_entrada:integer',
        'tokens_saida:integer',
      ],
    ],
    [
      'execucao_agente',
      [
        'agente:text',
        'artefato_id:text',
        `atualizada_em:${TSTZ}`,
        `bloqueada_ate:${TSTZ}`,
        'chave_entrada:text',
        `criada_em:${TSTZ}`,
        'demanda_id:text',
        'id:uuid',
        `proxima_tentativa_em:${TSTZ}`,
        'status:text',
        'tentativas:integer',
      ],
    ],
    ['configuracao_agente', ['agente:text', `atualizado_em:${TSTZ}`, 'atualizado_por:text', 'ligado:boolean', 'modelo:text']],
    ['configuracao_ia', [`atualizado_em:${TSTZ}`, 'atualizado_por:text', 'id:smallint', 'moeda:text', 'teto_mensal:numeric(12,2)']],
    [
      'preco_modelo',
      ['id:uuid', 'modelo:text', 'moeda:text', 'preco_entrada_por_milhao:numeric(12,6)', 'preco_saida_por_milhao:numeric(12,6)', `vigente_desde:${TSTZ}`],
    ],
  ])('%s tem exatamente as colunas e os tipos esperados (sem coluna de conteúdo; valores em numeric, sem ponto flutuante)', async (tabela, esperado) => {
    expect(await colunasDe(tabela)).toEqual([...esperado].sort());
  });
});

describe('execucao_agente: bordas da chave de entrada (C-22)', () => {
  it.each([
    ['quebra de linha depois do id', { chave_entrada: `demanda:${D1}\n` }],
    ['quebra de linha antes do id', { chave_entrada: `demanda:\n${D1}` }],
    ['chave vazia', { chave_entrada: '' }],
    ['só o prefixo', { chave_entrada: 'demanda:' }],
    ['versão com cinco dígitos', { agente: 'risco', chave_entrada: `esp:ESP-${D1}-v12345` }],
    ['prefixo em maiúsculas', { chave_entrada: `DEMANDA:${D1}` }],
    ['espaço antes do prefixo', { chave_entrada: ` demanda:${D1}` }],
  ] as const)('%s é recusada (23514)', async (_caso, campos) => {
    await expect(inserir('execucao_agente', execucao(campos))).rejects.toMatchObject({ code: '23514', constraint: 'execucao_agente_chave_entrada_check' });
  });

  it('a versão de quatro dígitos, o limite de G3.10, entra', async () => {
    await expect(inserir('execucao_agente', execucao({ agente: 'risco', chave_entrada: `esp:ESP-${D1}-v9999` }))).resolves.toMatchObject({ rowCount: 1 });
  });
});

describe('uso_ia: demanda opcional, mas sempre existente (RF-17)', () => {
  it('o uso do orquestrador, antes de a demanda existir, é registrado sem demanda', async () => {
    const [e] = (await inserir('execucao_agente', execucao({ agente: 'orquestrador', chave_entrada: 'entrada:0a1b2c3d-0000-4000-8000-000000000002', demanda_id: null }))).rows;
    const [u] = (
      await inserir('uso_ia', {
        execucao_agente_id: e.id,
        agente: 'orquestrador',
        demanda_id: null,
        modelo: 'modelo-ficticio',
        tokens_entrada: 10,
        tokens_saida: 5,
        custo: '0',
        resultado: 'sucesso',
        ocorrido_em: QUANDO,
      })
    ).rows;
    expect(u).toMatchObject({ agente: 'orquestrador', demanda_id: null });
  });

  it('uso com demanda que não existe é recusado (23503)', async () => {
    const [e] = (await inserir('execucao_agente', execucao({ agente: 'risco', chave_entrada: `esp:ESP-${D1}-v21` }))).rows;
    await expect(
      inserir('uso_ia', {
        execucao_agente_id: e.id,
        agente: 'risco',
        demanda_id: 'DEM-20261022-0797',
        modelo: 'modelo-ficticio',
        tokens_entrada: 1,
        tokens_saida: 1,
        custo: '0',
        resultado: 'sucesso',
        ocorrido_em: QUANDO,
      }),
    ).rejects.toMatchObject({ code: '23503' });
  });
});

describe('execucao_agente sob concorrência: dois workers, uma execução (ADR-07, CA-16.4)', () => {
  // A segunda conexão fica parada na trava da primeira; o teste só segue quando o pg_locks mostra a espera.
  const esperandoTrava = async (pid: number) =>
    (await b.poolMigrator.query('select count(*)::int as n from pg_locks where pid = $1 and not granted', [pid])).rows[0].n as number;
  const pidDe = async (c: PoolClient) => (await c.query('select pg_backend_pid() as pid')).rows[0].pid as number;
  const reivindicar = (c: PoolClient, id: string) =>
    c.query(
      `update execucao_agente set status = 'em_andamento', bloqueada_ate = $2::timestamptz + interval '150 seconds', tentativas = tentativas + 1, atualizada_em = $2 where id = $1 and (status = 'pendente' or (status = 'em_andamento' and bloqueada_ate < $2)) returning tentativas`,
      [id, QUANDO],
    );
  let primeiro: PoolClient;
  let segundo: PoolClient;
  beforeEach(async () => {
    primeiro = await b.poolApp.connect();
    segundo = await b.poolApp.connect();
  });
  afterEach(async () => {
    await primeiro.query('rollback');
    primeiro.release();
    segundo.release();
  });

  it('duas criações simultâneas da mesma execução: a segunda espera a primeira e não insere nada', async () => {
    const criar = (c: PoolClient) =>
      c.query(
        `insert into execucao_agente (agente, chave_entrada, criada_em, atualizada_em) values ('insumo_tecnico', 'demanda:DEM-20261022-0710', $1, $1) on conflict (agente, chave_entrada) do nothing returning id`,
        [QUANDO],
      );
    await primeiro.query('begin');
    expect((await criar(primeiro)).rows).toHaveLength(1);
    const pid = await pidDe(segundo);
    const daSegunda = criar(segundo);
    await expect.poll(() => esperandoTrava(pid), { timeout: 5_000 }).toBe(1);
    await primeiro.query('commit');
    expect((await daSegunda).rows).toEqual([]);
    const r = await b.poolApp.query(`select count(*)::int as n from execucao_agente where chave_entrada = 'demanda:DEM-20261022-0710'`);
    expect(r.rows[0].n).toBe(1);
  });

  it('duas reivindicações simultâneas: só a primeira leva, e a tentativa conta uma vez', async () => {
    const [e] = (await inserir('execucao_agente', execucao({ chave_entrada: 'demanda:DEM-20261022-0711', demanda_id: null }))).rows;
    await primeiro.query('begin');
    expect((await reivindicar(primeiro, e.id)).rows).toEqual([{ tentativas: 1 }]);
    const pid = await pidDe(segundo);
    const daSegunda = reivindicar(segundo, e.id);
    await expect.poll(() => esperandoTrava(pid), { timeout: 5_000 }).toBe(1);
    await primeiro.query('commit');
    expect((await daSegunda).rows).toEqual([]);
    const r = await b.poolApp.query('select status, tentativas from execucao_agente where id = $1', [e.id]);
    expect(r.rows).toEqual([{ status: 'em_andamento', tentativas: 1 }]);
  });

  it('se o primeiro desiste (rollback), o segundo, que esperava, leva a execução: nenhuma fica perdida', async () => {
    const [e] = (await inserir('execucao_agente', execucao({ chave_entrada: 'demanda:DEM-20261022-0712', demanda_id: null }))).rows;
    await primeiro.query('begin');
    expect((await reivindicar(primeiro, e.id)).rows).toEqual([{ tentativas: 1 }]);
    const pid = await pidDe(segundo);
    const daSegunda = reivindicar(segundo, e.id);
    await expect.poll(() => esperandoTrava(pid), { timeout: 5_000 }).toBe(1);
    await primeiro.query('rollback');
    expect((await daSegunda).rows).toEqual([{ tentativas: 1 }]);
  });
});
