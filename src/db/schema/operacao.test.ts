// Integridade das tabelas de operação (T06): aviso por e-mail do DEC (RF-25), batimento do worker (RNF-05) e registro
// das rotinas (C-31), provada no Postgres real com o papel do app (C-34). Dados só fictícios.
import type { PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';

let b: BancoDeTeste;
const QUANDO = '2026-10-22T12:00:00Z';
const DEPOIS = '2026-10-22T12:01:00Z';
const D1 = 'DEM-20261022-0801';
// Um DEC por teste, para nenhum depender do que o outro gravou.
const DEC = (versao: number) => `DEC-${D1}-v${versao}`;

beforeAll(async () => {
  b = await novoBanco();
  const m = (s: string, p: unknown[] = []) => b.poolMigrator.query(s, p);
  await m(
    `insert into demanda (id, titulo, tipo, solicitante_nome, autor_tipo, autor_id, criada_em, atualizada_em) values ($1, 'Demanda ficticia', 'melhoria', 'Pessoa Ficticia', 'pessoa', 'u-ficticio', $2, $2)`,
    [D1, QUANDO],
  );
  await m(
    `insert into especificacao_tecnica (id, demanda_id, versao, descricao_objetiva, escopo_inclui, autor_tipo, autor_id, rascunho_agente, criada_em) values ($1, $2, 1, 'Descricao ficticia', '["item ficticio"]', 'pessoa', 'u-ficticio', false, $3)`,
    [`ESP-${D1}-v1`, D1, QUANDO],
  );
  await m(
    `insert into parecer_risco (id, demanda_id, versao, risco_tecnico_nivel, risco_operacional_nivel, risco_juridico_nivel, autor_tipo, autor_id, rascunho_agente, criada_em) values ($1, $2, 1, 'baixo', 'baixo', 'baixo', 'pessoa', 'u-ficticio', false, $3)`,
    [`RSK-${D1}-v1`, D1, QUANDO],
  );
  for (const versao of [1, 2, 3, 4]) {
    await m(
      `insert into pacote_decisao (id, demanda_id, versao, especificacao_id, especificacao_versao, parecer_risco_id, parecer_risco_versao, demanda_tipo, demanda_titulo, demanda_descricao, resumo_executivo, opcao_a, opcao_b, nivel_aprovacao_requerido, autor_tipo, autor_id, rascunho_agente, criada_em) values ($1, $2, $3, $4, 1, $5, 1, 'melhoria', 'Demanda ficticia', 'Descricao ficticia', 'Resumo ficticio', '{"descricao":"A ficticia"}', '{"descricao":"B ficticia"}', 'cto', 'pessoa', 'u-ficticio', false, $6)`,
      [`DEC-${D1}-v${versao}`, D1, versao, `ESP-${D1}-v1`, `RSK-${D1}-v1`, QUANDO],
    );
  }
});
afterAll(async () => {
  await b.fechar();
});

describe('aviso_email: um aviso por DEC, que o worker marca como enviado (RF-25, CA-25.2)', () => {
  const agendar = (dec: string) =>
    b.poolApp.query(
      `insert into aviso_email (pacote_decisao_id, atualizado_em) values ($1, $2) on conflict (pacote_decisao_id) do nothing returning status, tentativas`,
      [dec, QUANDO],
    );

  it('o app agenda o aviso, que nasce pendente e sem tentativa; agendar de novo não duplica', async () => {
    expect((await agendar(DEC(1))).rows).toEqual([{ status: 'pendente', tentativas: 0 }]);
    expect((await agendar(DEC(1))).rows).toEqual([]);
    const r = await b.poolApp.query('select count(*)::int as n from aviso_email where pacote_decisao_id = $1', [DEC(1)]);
    expect(r.rows[0].n).toBe(1);
  });

  it('o app marca a tentativa e depois o envio, com o id do provedor e a data', async () => {
    await agendar(DEC(2));
    await b.poolApp.query(`update aviso_email set tentativas = tentativas + 1, atualizado_em = $2 where pacote_decisao_id = $1`, [DEC(2), QUANDO]);
    await b.poolApp.query(
      `update aviso_email set status = 'enviado', id_provedor = 'id-ficticio', enviado_em = $2, atualizado_em = $2 where pacote_decisao_id = $1`,
      [DEC(2), DEPOIS],
    );
    const r = await b.poolApp.query('select status, tentativas, id_provedor from aviso_email where pacote_decisao_id = $1', [DEC(2)]);
    expect(r.rows).toEqual([{ status: 'enviado', tentativas: 1, id_provedor: 'id-ficticio' }]);
  });

  it.each([
    ['status fora da lista', `update aviso_email set status = 'lido' where pacote_decisao_id = $1`, 'aviso_email_status_check'],
    ['tentativas negativas', `update aviso_email set tentativas = -1 where pacote_decisao_id = $1`, 'aviso_email_tentativas_check'],
    ['enviado sem data do envio', `update aviso_email set status = 'enviado', enviado_em = null where pacote_decisao_id = $1`, 'aviso_email_enviado_tem_data_check'],
  ])('%s é recusado (23514)', async (_caso, sql, restricao) => {
    await agendar(DEC(3));
    await expect(b.poolApp.query(sql, [DEC(3)])).rejects.toMatchObject({ code: '23514', constraint: restricao });
  });

  it('o aviso sem provedor e o que falhou ficam sem data de envio', async () => {
    await agendar(DEC(4));
    for (const status of ['sem_provedor', 'falhou']) {
      await b.poolApp.query(`update aviso_email set status = $2, atualizado_em = $3 where pacote_decisao_id = $1`, [DEC(4), status, DEPOIS]);
    }
    const r = await b.poolApp.query('select status, enviado_em from aviso_email where pacote_decisao_id = $1', [DEC(4)]);
    expect(r.rows).toEqual([{ status: 'falhou', enviado_em: null }]);
  });

  it('aviso de DEC que não existe é recusado (23503)', async () => {
    await expect(agendar(DEC(9))).rejects.toMatchObject({ code: '23503' });
  });

  it.each([
    ['trocar o DEC do aviso', `update aviso_email set pacote_decisao_id = '${DEC(2)}' where pacote_decisao_id = '${DEC(1)}'`],
    ['apagar o aviso', 'delete from aviso_email'],
    ['truncar', 'truncate aviso_email'],
  ])('%s é recusado com o papel do app (42501)', async (_caso, sql) => {
    await expect(b.poolApp.query(sql)).rejects.toMatchObject({ code: '42501' });
  });
});

describe('worker_batimento: o worker grava e limpa o próprio batimento (RNF-05)', () => {
  const bater = (instancia: string, em: string) =>
    b.poolApp.query(
      `insert into worker_batimento (instancia, visto_em) values ($1, $2) on conflict (instancia) do update set visto_em = excluded.visto_em`,
      [instancia, em],
    );

  it('o app grava, atualiza e apaga o batimento da instância', async () => {
    await bater('instancia-ficticia-1', QUANDO);
    await bater('instancia-ficticia-1', DEPOIS);
    await bater('instancia-ficticia-2', DEPOIS);
    const r = await b.poolApp.query(`select count(*)::int as n, max(visto_em) = $1::timestamptz as ultimo from worker_batimento`, [DEPOIS]);
    expect(r.rows).toEqual([{ n: 2, ultimo: true }]);
    await b.poolApp.query(`delete from worker_batimento where instancia = 'instancia-ficticia-2'`);
  });

  it('batimento sem data é recusado (23502)', async () => {
    await expect(b.poolApp.query(`insert into worker_batimento (instancia) values ('instancia-ficticia-3')`)).rejects.toMatchObject({ code: '23502' });
  });
});

describe('rotina_execucao: a última execução de cada rotina, para o painel (C-31)', () => {
  const registrar = (rotina: string, em: string, quantidade: number) =>
    b.poolApp.query(
      `insert into rotina_execucao (rotina, ultima_execucao_em, quantidade) values ($1, $2, $3) on conflict (rotina) do update set ultima_execucao_em = excluded.ultima_execucao_em, quantidade = excluded.quantidade`,
      [rotina, em, quantidade],
    );

  it('o app registra e atualiza a última execução do expurgo', async () => {
    await registrar('retencao.expurgo', QUANDO, 3);
    await registrar('retencao.expurgo', DEPOIS, 0);
    const r = await b.poolApp.query(`select quantidade, ultima_execucao_em = $1::timestamptz as ultima from rotina_execucao`, [DEPOIS]);
    expect(r.rows).toEqual([{ quantidade: 0, ultima: true }]);
  });

  it.each([
    ['rotina fora da lista', 'rotina.ficticia', 0, 'rotina_execucao_rotina_check'],
    ['quantidade negativa', 'retencao.expurgo', -1, 'rotina_execucao_quantidade_check'],
  ] as const)('%s é recusada (23514)', async (_caso, rotina, quantidade, restricao) => {
    await expect(registrar(rotina, QUANDO, quantidade)).rejects.toMatchObject({ code: '23514', constraint: restricao });
  });

  it.each([
    ['renomear a rotina', `update rotina_execucao set rotina = 'retencao.expurgo'`],
    ['apagar o registro', 'delete from rotina_execucao'],
  ])('%s é recusado com o papel do app (42501)', async (_caso, sql) => {
    await expect(b.poolApp.query(sql)).rejects.toMatchObject({ code: '42501' });
  });
});

// Testes da etapa 06-T06-testes (qa-automacao): a lista de colunas por permissão (o aviso não guarda destinatário nem
// corpo, C-38) e o agendamento concorrente do aviso (CA-25.2), com duas conexões e a espera conferida no pg_locks.
describe('colunas das tabelas de operação por lista de permissão (C-38)', () => {
  const TSTZ = 'timestamp with time zone';
  it.each([
    ['aviso_email', [`atualizado_em:${TSTZ}`, `enviado_em:${TSTZ}`, 'id_provedor:text', 'pacote_decisao_id:text', 'status:text', 'tentativas:integer']],
    ['worker_batimento', ['instancia:text', `visto_em:${TSTZ}`]],
    ['rotina_execucao', ['quantidade:integer', 'rotina:text', `ultima_execucao_em:${TSTZ}`]],
  ])('%s tem exatamente as colunas e os tipos esperados', async (tabela, esperado) => {
    const r = await b.poolMigrator.query(
      `select a.attname || ':' || format_type(a.atttypid, a.atttypmod) as coluna from pg_attribute a where a.attrelid = $1::regclass and a.attnum > 0 and not a.attisdropped`,
      [`public.${tabela}`],
    );
    expect(r.rows.map((x) => x.coluna as string).sort()).toEqual([...esperado].sort());
  });
});

describe('aviso_email sob concorrência: dois agendamentos do mesmo DEC, um aviso (CA-25.2)', () => {
  beforeAll(async () => {
    await b.poolMigrator.query(
      `insert into pacote_decisao (id, demanda_id, versao, especificacao_id, especificacao_versao, parecer_risco_id, parecer_risco_versao, demanda_tipo, demanda_titulo, demanda_descricao, resumo_executivo, opcao_a, opcao_b, nivel_aprovacao_requerido, autor_tipo, autor_id, rascunho_agente, criada_em) values ($1, $2, 5, $3, 1, $4, 1, 'melhoria', 'Demanda ficticia', 'Descricao ficticia', 'Resumo ficticio', '{"descricao":"A ficticia"}', '{"descricao":"B ficticia"}', 'cto', 'pessoa', 'u-ficticio', false, $5)`,
      [DEC(5), D1, `ESP-${D1}-v1`, `RSK-${D1}-v1`, QUANDO],
    );
  });

  it('o segundo agendamento espera o primeiro e não insere nada', async () => {
    const primeiro = await b.poolApp.connect();
    const segundo = await b.poolApp.connect();
    const agendar = (c: PoolClient) =>
      c.query(`insert into aviso_email (pacote_decisao_id, atualizado_em) values ($1, $2) on conflict (pacote_decisao_id) do nothing returning status`, [DEC(5), QUANDO]);
    try {
      await primeiro.query('begin');
      expect((await agendar(primeiro)).rows).toEqual([{ status: 'pendente' }]);
      const pid = (await segundo.query('select pg_backend_pid() as pid')).rows[0].pid as number;
      const doSegundo = agendar(segundo);
      await expect
        .poll(async () => (await b.poolMigrator.query('select count(*)::int as n from pg_locks where pid = $1 and not granted', [pid])).rows[0].n, { timeout: 5_000 })
        .toBe(1);
      await primeiro.query('commit');
      expect((await doSegundo).rows).toEqual([]);
      const r = await b.poolApp.query('select count(*)::int as n from aviso_email where pacote_decisao_id = $1', [DEC(5)]);
      expect(r.rows[0].n).toBe(1);
    } finally {
      await primeiro.query('rollback');
      primeiro.release();
      segundo.release();
    }
  });
});
