// Versões gravadas não mudam (RF-11, CA-11.2) e o papel do app só faz o que a regra de C-34 permite, provado no
// Postgres real com o papel orquestrador_app. Dados só fictícios.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../test/banco';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
  const m = (s: string, p: unknown[] = []) => b.poolMigrator.query(s, p);
  await m(
    `insert into demanda (id, titulo, tipo, solicitante_nome, autor_tipo, autor_id, criada_em, atualizada_em) values ('DEM-20261022-0001', 'Demanda ficticia', 'melhoria', 'Pessoa Ficticia', 'pessoa', 'u1', now(), now())`,
  );
  await m(`insert into entrada_bruta (demanda_id, texto, recebida_em) values ('DEM-20261022-0001', 'texto ficticio', now())`);
  await m(
    `insert into especificacao_tecnica (id, demanda_id, versao, descricao_objetiva, escopo_inclui, escopo_exclui, duvidas_em_aberto, autor_tipo, autor_id, rascunho_agente, criada_em) values ('ESP-DEM-20261022-0001-v1', 'DEM-20261022-0001', 1, 'x', '[]', '[]', '[]', 'pessoa', 'u1', false, now())`,
  );
});
afterAll(async () => {
  await b.fechar();
});

describe('versões gravadas não mudam (RF-11)', () => {
  it.each([
    ['update especificacao_tecnica set descricao_objetiva = $1', ['outra']],
    ['delete from especificacao_tecnica', []],
    ['update parecer_risco set resumo = $1', ['outro']],
    ['update pacote_decisao set resumo_executivo = $1', ['outro']],
    ['update aprovacao set opcao = $1', ['B']],
    ['update decisao set status_decisao = $1', ['arquivada']],
    ['delete from demanda', []],
    ['update entrada_bruta set recebida_em = now()', []],
    ['truncate especificacao_tecnica', []],
  ])('%s é recusado com o papel do app', async (sql, p) => {
    await expect(b.poolApp.query(sql, p)).rejects.toMatchObject({ code: '42501' });
  });

  it('o expurgo consegue limpar texto e origem de entrada_bruta', async () => {
    await b.poolApp.query(`update entrada_bruta set texto = null, origem = null, expurgada_em = now() where demanda_id = 'DEM-20261022-0001'`);
    const r = await b.poolMigrator.query(`select texto, origem, expurgada_em is not null as expurgada from entrada_bruta where demanda_id = 'DEM-20261022-0001'`);
    expect(r.rows).toEqual([{ texto: null, origem: null, expurgada: true }]);
  });

  it('a sequência para em 9999', async () => {
    await b.poolMigrator.query(`select setval('demanda_seq', 9999)`);
    await expect(b.poolApp.query(`select nextval('demanda_seq')`)).rejects.toMatchObject({ code: '2200H' });
  });
});

// Etapa 06-T05-construcao: a demanda é mutável, mas id, autoria e data de criação não (C-11, C-34). O UPDATE do app é
// por coluna e deixa de fora essas quatro.
describe('demanda: o app altera os campos descritivos e o status, nunca id, autoria nem criação', () => {
  it('o app altera título, status, listas e atualizada_em', async () => {
    await b.poolApp.query(
      `update demanda set titulo = $1, status = 'em_analise', linha_servico_provavel = 'indefinida', duvidas_entrada = '["duvida ficticia"]', rascunho_agente = false, atualizada_em = now() where id = 'DEM-20261022-0001'`,
      ['Demanda ficticia alterada'],
    );
    const r = await b.poolApp.query(`select titulo, status, duvidas_entrada from demanda where id = 'DEM-20261022-0001'`);
    expect(r.rows).toEqual([{ titulo: 'Demanda ficticia alterada', status: 'em_analise', duvidas_entrada: ['duvida ficticia'] }]);
  });

  it.each([
    ['id', `update demanda set id = 'DEM-20261022-0002'`],
    ['autor_tipo', `update demanda set autor_tipo = 'agente'`],
    ['autor_id', `update demanda set autor_id = 'outra-pessoa'`],
    ['criada_em', 'update demanda set criada_em = now()'],
  ])('mudar %s é recusado com o papel do app (42501)', async (_coluna, sql) => {
    await expect(b.poolApp.query(sql)).rejects.toMatchObject({ code: '42501' });
  });

  it('a trava da demanda (select ... for update) funciona com o UPDATE por coluna', async () => {
    const c = await b.poolApp.connect();
    try {
      await c.query('begin');
      const r = await c.query(`select id from demanda where id = 'DEM-20261022-0001' for update`);
      expect(r.rows).toEqual([{ id: 'DEM-20261022-0001' }]);
    } finally {
      await c.query('rollback');
      c.release();
    }
  });
});
