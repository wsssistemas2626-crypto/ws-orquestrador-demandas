// Testes da etapa 06-T01-testes (qa-automacao) do pedido DEC-DEM-20261111-0016-v1. RNF-06 e IN-17 com dado que já
// existe: um banco no estado da 0.2.0 (migrations 0000 a 0006), com linhas fictícias como as de produção, recebe a 0007
// por cima. Prova que a migration aplica, que toda linha de hoje passa nos CHECK novos (sem NOT VALID), que nenhuma
// linha muda e que o esquema final é o mesmo do banco migrado pelo migrator do Drizzle. O ensaio de rollback com o
// docker-compose.hml.yml continua com a 09-entrega.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../banco';

const raiz = fileURLToPath(new URL('../../', import.meta.url));
const diario = JSON.parse(readFileSync(`${raiz}drizzle/meta/_journal.json`, 'utf8')) as { entries: { idx: number; tag: string }[] };
const comandos = (tag: string) =>
  readFileSync(`${raiz}drizzle/${tag}.sql`, 'utf8')
    .split('--> statement-breakpoint')
    .map((s) => s.trim())
    .filter(Boolean);

type Consulta = (texto: string, valores?: unknown[]) => Promise<pg.QueryResult>;

// Como o migrator do Drizzle: cada lote de migrations numa transação só.
async function aplicar(q: Consulta, tags: string[]) {
  await q('begin');
  try {
    for (const tag of tags) for (const sql of comandos(tag)) await q(sql);
    await q('commit');
  } catch (e) {
    await q('rollback');
    throw e;
  }
}

const QUANDO = '2026-11-10T12:00:00Z';
const NOVAS = ['token_servico_integracao_check', 'token_servico_dono_check', 'evento_ator_integracao_check', 'demanda_autor_integracao_check'];
const RECRIADAS = ['evento_ator_tipo_check', 'demanda_autor_tipo_check'];

// Fotografia de cada tabela tocada, ordenada por chave estável. Do token_servico sai a coluna nova, para comparar com
// a foto de antes da 0007.
const FOTOS = {
  token_servico: `select coalesce(jsonb_agg(to_jsonb(t) - 'integracao' order by t.hash), '[]'::jsonb) as f from token_servico t`,
  evento: `select coalesce(jsonb_agg(to_jsonb(t) order by t.id), '[]'::jsonb) as f from evento t`,
  demanda: `select coalesce(jsonb_agg(to_jsonb(t) order by t.id), '[]'::jsonb) as f from demanda t`,
  configuracao_agente: `select coalesce(jsonb_agg(to_jsonb(t) order by t.agente), '[]'::jsonb) as f from configuracao_agente t`,
} as const;
type Fotos = Record<keyof typeof FOTOS, unknown[]>;
const fotografar = async (q: Consulta) => {
  const f = {} as Fotos;
  for (const [tabela, consulta] of Object.entries(FOTOS)) f[tabela as keyof Fotos] = (await q(consulta)).rows[0].f;
  return f;
};

// Restrições, índices e colunas das três tabelas, para comparar o resultado com o do migrator.
const esquema = async (q: Consulta) => {
  const restricoes = await q(
    `select conrelid::regclass::text as tabela, conname, pg_get_constraintdef(oid) as def, convalidated from pg_constraint where conrelid::regclass::text in ('token_servico', 'evento', 'demanda') order by 1, 2`,
  );
  const indices = await q(
    `select tablename, indexname, indexdef from pg_indexes where schemaname = 'public' and tablename in ('token_servico', 'evento', 'demanda') order by 1, 2`,
  );
  const colunas = await q(
    `select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name in ('token_servico', 'evento', 'demanda') order by 1, 2`,
  );
  return { restricoes: restricoes.rows, indices: indices.rows, colunas: colunas.rows };
};

let urlAdmin: string;
let nome: string;
let banco: pg.Client;
let q: Consulta;
let antes: Fotos;
let depois: Fotos;

const comoAdmin = async (texto: string) => {
  const c = new pg.Client({ connectionString: urlAdmin });
  await c.connect();
  try {
    await c.query(texto);
  } finally {
    await c.end();
  }
};

beforeAll(async () => {
  urlAdmin = inject('pgAdmin');
  nome = `t_m7_${randomUUID().replaceAll('-', '')}`;
  await comoAdmin(`create database ${nome} template template0`);
  banco = new pg.Client({ connectionString: urlAdmin.replace(/\/postgres$/, `/${nome}`) });
  await banco.connect();
  q = (texto, valores) => banco.query(texto, valores);
  // O registro do Drizzle existe antes das migrations (a 0001 dá SELECT nele ao papel do app).
  await q('create schema drizzle');
  await q('create table drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)');

  const ate0006 = diario.entries.filter((e) => e.idx <= 6).map((e) => e.tag);
  expect(ate0006).toHaveLength(7);
  await aplicar(q, ate0006);

  // Linhas fictícias no formato da 0.2.0: tokens de agente (um revogado), eventos dos três tipos de ator e demandas de
  // pessoa e de agente.
  await q(
    `insert into token_servico (agente, hash, prefixo, criado_em, revogado_em) values ('risco', $1, 'abcd1234', $3, null), ('orquestrador', $2, 'efgh5678', $3, $3)`,
    ['a'.repeat(64), 'b'.repeat(64), QUANDO],
  );
  await q(
    `insert into evento (ocorrido_em, ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, entidade_id, acao, depois) values
      ($1, 'pessoa', 'u-ficticio', null, 'DEM-20261110-0001', 'demanda', 'DEM-20261110-0001', 'demanda_criada', '{"status":"nova","tipo":"melhoria"}'),
      ($1, 'agente', 'orquestrador', 'efgh5678', 'DEM-20261110-0002', 'demanda', 'DEM-20261110-0002', 'demanda_criada', '{"status":"nova","tipo":"bug"}'),
      ($1, 'sistema', 'sistema', null, null, 'token_servico', 'abcd1234', 'token_criado', '{"agente":"risco","prefixo":"abcd1234"}')`,
    [QUANDO],
  );
  await q(
    `insert into demanda (id, titulo, tipo, solicitante_nome, autor_tipo, autor_id, rascunho_agente, criada_em, atualizada_em) values
      ('DEM-20261110-0001', 'Demanda (fictício)', 'melhoria', 'Pessoa Ficticia', 'pessoa', 'u-ficticio', false, $1, $1),
      ('DEM-20261110-0002', 'Rascunho (fictício)', 'bug', 'Pessoa Ficticia Dois', 'agente', 'orquestrador', true, $1, $1)`,
    [QUANDO],
  );
  antes = await fotografar(q);

  const a0007 = diario.entries.filter((e) => e.idx === 7).map((e) => e.tag);
  expect(a0007).toHaveLength(1);
  await aplicar(q, a0007);
  depois = await fotografar(q);
});

afterAll(async () => {
  // O cliente fecha antes do drop: nenhuma conexão viva é derrubada.
  await banco?.end();
  if (nome) await comoAdmin(`drop database if exists ${nome}`);
});

describe('a 0007 sobre um banco da 0.2.0 com dados (RNF-06, IN-17)', () => {
  it('a foto de antes tem as linhas fictícias (o teste não compara vazio com vazio)', () => {
    expect(antes.token_servico).toHaveLength(2);
    expect(antes.evento).toHaveLength(3);
    expect(antes.demanda).toHaveLength(2);
    expect(antes.configuracao_agente).toHaveLength(4);
  });

  it('nenhuma linha que existia muda: tokens, eventos, demandas e configuração dos agentes (CA-11.2)', () => {
    expect(depois).toEqual(antes);
  });

  it('os tokens de hoje ficam com integracao nula e o agente preenchido', async () => {
    const { rows } = await q(`select agente, integracao from token_servico order by hash`);
    expect(rows).toEqual([
      { agente: 'risco', integracao: null },
      { agente: 'orquestrador', integracao: null },
    ]);
  });

  it('os CHECK novos e os recriados valem para as linhas de hoje (validados, sem NOT VALID)', async () => {
    const todas = [...NOVAS, ...RECRIADAS];
    const { rows } = await q(`select conname, convalidated from pg_constraint where conname = any($1::text[]) order by conname`, [todas]);
    expect(rows).toEqual([...todas].sort().map((conname) => ({ conname, convalidated: true })));
  });

  it('agente fica anulável e integracao entra anulável, sem padrão (a migration não preenche dado)', async () => {
    const { rows } = await q(
      `select column_name, is_nullable, column_default from information_schema.columns where table_name = 'token_servico' and column_name in ('agente', 'integracao') order by 1`,
    );
    expect(rows).toEqual([
      { column_name: 'agente', is_nullable: 'YES', column_default: null },
      { column_name: 'integracao', is_nullable: 'YES', column_default: null },
    ]);
  });

  it('nenhum privilégio novo: o UPDATE do app em token_servico continua só em revogado_em', async () => {
    const { rows } = await q(
      `select column_name from information_schema.column_privileges where grantee = 'orquestrador_app' and table_name = 'token_servico' and privilege_type = 'UPDATE' order by 1`,
    );
    expect(rows).toEqual([{ column_name: 'revogado_em' }]);
  });

  describe('o resultado é o mesmo do migrator do Drizzle', () => {
    let modelo: BancoDeTeste;
    beforeAll(async () => {
      modelo = await novoBanco();
    });
    afterAll(async () => {
      await modelo.fechar();
    });

    it('restrições, índices e colunas de token_servico, evento e demanda iguais aos do banco de teste padrão', async () => {
      const aqui = await esquema(q);
      expect(aqui.restricoes.length).toBeGreaterThan(0);
      expect(aqui).toEqual(await esquema((texto, valores) => modelo.poolMigrator.query(texto, valores)));
    });
  });
});
