// src/db/schema/integracao.test.ts — RNF-06, IN-03, IN-05, IN-12, IN-17 e CA-11.2: as regras novas valem no banco.
// T01 do pedido DEC-DEM-20261111-0016-v1. Dados e prefixos só fictícios; nenhum token de verdade.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

const hash = (n: number) => n.toString(16).padStart(64, '0');
const token = (agente: string | null, integracao: string | null, n: number) =>
  b.poolApp.query(
    `insert into token_servico (agente, integracao, hash, prefixo, criado_em) values ($1, $2, $3, 'abcd1234', '2026-11-11T12:00:00Z')`,
    [agente, integracao, hash(n)],
  );
const viola = (constraint: string) => expect.objectContaining({ code: '23514', constraint });

describe('token_servico (ADR-21, IN-03)', () => {
  it('aceita token de integração com agente nulo, para awave e construir', async () => {
    await expect(token(null, 'awave', 1)).resolves.toBeDefined();
    await expect(token(null, 'construir', 2)).resolves.toBeDefined();
  });
  it('recusa os dois donos nulos e os dois preenchidos', async () => {
    await expect(token(null, null, 3)).rejects.toEqual(viola('token_servico_dono_check'));
    await expect(token('risco', 'awave', 4)).rejects.toEqual(viola('token_servico_dono_check'));
  });
  it('recusa integração fora da lista', async () => {
    await expect(token(null, 'jarvis', 5)).rejects.toEqual(viola('token_servico_integracao_check'));
  });
  it('IN-17: o papel do app não muda a integração de um token', async () => {
    await expect(b.poolApp.query(`update token_servico set integracao = 'awave' where hash = $1`, [hash(2)])).rejects.toEqual(
      expect.objectContaining({ code: '42501' }),
    );
  });
});

const ev = (atorTipo: string, atorId: string, prefixo: string | null) =>
  b.poolApp.query(
    `insert into evento (ocorrido_em, ator_tipo, ator_id, ator_token_prefixo, entidade, entidade_id, acao) values ('2026-11-11T12:00:00Z', $1, $2, $3, 'demanda', 'DEM-20261111-0001', 'demanda_criada')`,
    [atorTipo, atorId, prefixo],
  );

describe('evento (IN-12)', () => {
  it('aceita ator integracao da lista com prefixo', async () => {
    await expect(ev('integracao', 'awave', 'ficticio')).resolves.toBeDefined();
  });
  it('recusa integração sem prefixo ou fora da lista', async () => {
    await expect(ev('integracao', 'awave', null)).rejects.toEqual(viola('evento_ator_integracao_check'));
    await expect(ev('integracao', 'jarvis', 'ficticio')).rejects.toEqual(viola('evento_ator_integracao_check'));
  });
  it('ADR-27: o índice evento_acao_entidade_idx existe em (acao, entidade_id)', async () => {
    const { rows } = await b.poolMigrator.query(`select indexdef from pg_indexes where indexname = 'evento_acao_entidade_idx'`);
    expect(rows[0]?.indexdef).toMatch(/\(acao, entidade_id\)/);
  });
});

const dem = (id: string, autorTipo: string, autorId: string, rascunho: boolean) =>
  b.poolApp.query(
    `insert into demanda (id, titulo, tipo, solicitante_nome, autor_tipo, autor_id, rascunho_agente, criada_em, atualizada_em) values ($1, 'Título (fictício)', 'melhoria', 'Awave', $2, $3, $4, '2026-11-11T12:00:00Z', '2026-11-11T12:00:00Z')`,
    [id, autorTipo, autorId, rascunho],
  );

describe('demanda (IN-05, ADR-24)', () => {
  it('aceita autoria do awave como rascunho', async () => {
    await expect(dem('DEM-20261111-0001', 'integracao', 'awave', true)).resolves.toBeDefined();
  });
  it('recusa construir como autor e awave sem rascunho', async () => {
    await expect(dem('DEM-20261111-0002', 'integracao', 'construir', true)).rejects.toEqual(viola('demanda_autor_integracao_check'));
    await expect(dem('DEM-20261111-0003', 'integracao', 'awave', false)).rejects.toEqual(viola('demanda_autor_integracao_check'));
  });
  it('as versões continuam só com pessoa e agente', async () => {
    const { rows } = await b.poolMigrator.query(
      `select pg_get_constraintdef(oid) as d from pg_constraint where conname = 'especificacao_tecnica_autor_tipo_check'`,
    );
    expect(rows[0]?.d).toMatch(/pessoa/);
    expect(rows[0]?.d).not.toMatch(/integracao/);
  });
});

it('CA-11.2: configuracao_agente continua com as quatro linhas', async () => {
  const { rows } = await b.poolMigrator.query(`select agente from configuracao_agente order by agente`);
  expect(rows.map((r) => r.agente)).toEqual(['consolidacao', 'insumo_tecnico', 'orquestrador', 'risco']);
});
