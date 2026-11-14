// src/db/schema/caminhos-da-criacao.test.ts — SB-07 (d) e SB-10: a coluna nova existe, é anulável e sem padrão, não
// muda as linhas existentes, e o papel do app só inclui (sem UPDATE). Postgres real; dados fictícios. T03 do pedido
// DEC-DEM-20261111-0018-v1.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';

let b: BancoDeTeste;
const DEM = 'DEM-20261114-0801';
const ESP = `ESP-${DEM}-v1`;
const RSK = `RSK-${DEM}-v1`;
const DEC = `DEC-${DEM}-v1`;
const QUANDO = '2026-11-14T12:00:00Z';
const m = (s: string, p: unknown[] = []) => b.poolMigrator.query(s, p);

// O mesmo INSERT do DEC de src/db/schema/andamento.test.ts, sem a coluna nova, como o DEC anterior à 0.4.1.
const COLUNAS_DO_DEC =
  'id, demanda_id, versao, especificacao_id, especificacao_versao, parecer_risco_id, parecer_risco_versao, demanda_tipo, demanda_titulo, demanda_descricao, resumo_executivo, opcao_a, opcao_b, nivel_aprovacao_requerido, autor_tipo, autor_id, rascunho_agente, criada_em';
const VALORES_DO_DEC = `$1, $2, $3, $4, 1, $5, 1, 'melhoria', 'Demanda ficticia', 'Contexto: ficticio', 'Resumo ficticio', '{"descricao":"A"}', '{"descricao":"B"}', 'cto', 'pessoa', 'u-ficticio', false, $6`;

beforeAll(async () => {
  b = await novoBanco();
  await m(
    `insert into demanda (id, titulo, tipo, solicitante_nome, autor_tipo, autor_id, criada_em, atualizada_em) values ($1, 'Demanda ficticia', 'melhoria', 'Pessoa Ficticia', 'pessoa', 'u-ficticio', $2, $2)`,
    [DEM, QUANDO],
  );
  await m(
    `insert into especificacao_tecnica (id, demanda_id, versao, descricao_objetiva, escopo_inclui, escopo_exclui, duvidas_em_aberto, autor_tipo, autor_id, rascunho_agente, criada_em) values ($1, $2, 1, 'x', '[]', '[]', '[]', 'pessoa', 'u-ficticio', false, $3)`,
    [ESP, DEM, QUANDO],
  );
  await m(
    `insert into parecer_risco (id, demanda_id, versao, resumo, risco_tecnico_nivel, risco_operacional_nivel, risco_juridico_nivel, autor_tipo, autor_id, rascunho_agente, criada_em) values ($1, $2, 1, 'Resumo ficticio', 'baixo', 'baixo', 'baixo', 'pessoa', 'u-ficticio', false, $3)`,
    [RSK, DEM, QUANDO],
  );
  await m(`insert into pacote_decisao (${COLUNAS_DO_DEC}) values (${VALORES_DO_DEC})`, [DEC, DEM, 1, ESP, RSK, QUANDO]);
});
afterAll(async () => {
  await b.fechar();
});

const caminhosDe = async (id: string) =>
  (await m(`select caminhos_com_nome_na_criacao as c from pacote_decisao where id = $1`, [id])).rows.map((r) => r.c as unknown);
const retrato = async () =>
  (await m(`select coalesce(jsonb_agg(to_jsonb(t) order by t.id), '[]'::jsonb)::text as f from pacote_decisao t`)).rows[0]!.f as string;

describe('pacote_decisao.caminhos_com_nome_na_criacao: a forma no banco (SB-10, ADR-37)', () => {
  it('a coluna é text[], anulável e sem padrão', async () => {
    const { rows } = await m(
      `select data_type, udt_name, is_nullable, column_default from information_schema.columns where table_schema = 'public' and table_name = 'pacote_decisao' and column_name = 'caminhos_com_nome_na_criacao'`,
    );
    expect(rows).toEqual([{ data_type: 'ARRAY', udt_name: '_text', is_nullable: 'YES', column_default: null }]);
  });

  it('o DEC inserido sem a coluna fica com null (o DEC anterior à 0.4.1)', async () => {
    expect(await caminhosDe(DEC)).toEqual([null]);
  });

  it('pacote_decisao tem 21 colunas: as 20 de 41108ee e a nova', async () => {
    const { rows } = await m(
      `select count(*)::int as n from information_schema.columns where table_schema = 'public' and table_name = 'pacote_decisao'`,
    );
    expect(rows).toEqual([{ n: 21 }]);
  });
});

describe('pacote_decisao.caminhos_com_nome_na_criacao: o app só inclui (SB-07 d, C-34)', () => {
  it('o papel do app inclui um DEC com a coluna preenchida e outro com a lista vazia', async () => {
    const inserir = (versao: number, caminhos: string[]) =>
      b.poolApp.query(`insert into pacote_decisao (${COLUNAS_DO_DEC}, caminhos_com_nome_na_criacao) values (${VALORES_DO_DEC}, $7)`, [
        `DEC-${DEM}-v${versao}`,
        DEM,
        versao,
        ESP,
        RSK,
        QUANDO,
        caminhos,
      ]);
    await expect(inserir(2, ['demanda.titulo'])).resolves.toBeDefined();
    await expect(inserir(3, [])).resolves.toBeDefined();
    expect(await caminhosDe(`DEC-${DEM}-v2`)).toEqual([['demanda.titulo']]);
    expect(await caminhosDe(`DEC-${DEM}-v3`)).toEqual([[]]);
  });

  it.each<[string, unknown[]]>([
    ['update pacote_decisao set caminhos_com_nome_na_criacao = $1', ['{}']],
    ['update pacote_decisao set caminhos_com_nome_na_criacao = $1 where caminhos_com_nome_na_criacao is null', [['demanda.titulo']]],
    ['update pacote_decisao set caminhos_com_nome_na_criacao = null', []],
  ])('"%s" pelo papel do app é recusado (42501), e a tabela fica igual', async (sql, p) => {
    const antes = await retrato();
    await expect(b.poolApp.query(sql, p)).rejects.toMatchObject({ code: '42501' });
    expect(await retrato()).toBe(antes);
  });
});
