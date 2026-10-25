// Versões gravadas não mudam (RF-11, CA-11.2) e o papel do app só faz o que a regra de C-34 permite, provado no
// Postgres real com o papel orquestrador_app. Dados só fictícios.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { demanda, especificacaoTecnica } from './schema';
import { comTransacao } from './transacao';

// O Drizzle pode embrulhar o erro do pg; o código do Postgres fica no próprio erro ou na causa.
const codigoPg = (e: unknown): unknown => {
  const x = e as { code?: unknown; cause?: { code?: unknown } } | null;
  return x?.code ?? x?.cause?.code;
};

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
      `update demanda set titulo = $1, status = 'em_analise', linha_servico_provavel = 'indefinida', duvidas_entrada = '["duvida ficticia"]', atualizada_em = now() where id = 'DEM-20261022-0001'`,
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
    // Parecer 1 da 06-T05-tech-lead.md, na T06: o selo de rascunho é autoria (C-11), e nenhum fluxo do app o muda.
    ['rascunho_agente', 'update demanda set rascunho_agente = false'],
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

// Etapa 06-T05-testes (qa-automacao). Os casos acima provam a recusa com as tabelas de versão vazias, onde o banco
// recusa antes de procurar linha. Aqui cada tabela tem a sua linha gravada (cadeia completa: demanda, texto, ESP, RSK,
// DEC, aprovação e decisão), e o teste confere que a recusa vale para aquela linha e que o conteúdo ficou igual, byte
// a byte. Dados e datas fictícios e fixos.
describe('versões gravadas não mudam, com a linha existente: o conteúdo fica igual (RF-11, CA-11.2, CA-11.3)', () => {
  const DEM = 'DEM-20261022-0501';
  const ESP = `ESP-${DEM}-v1`;
  const RSK = `RSK-${DEM}-v1`;
  const DEC = `DEC-${DEM}-v1`;
  const QUANDO = '2026-10-22T12:00:00Z';
  const chaves: Record<string, [string, string]> = {
    especificacao_tecnica: ['id', ESP],
    parecer_risco: ['id', RSK],
    pacote_decisao: ['id', DEC],
    aprovacao: ['pacote_decisao_id', DEC],
    decisao: ['pacote_decisao_id', DEC],
    entrada_bruta: ['demanda_id', DEM],
    demanda: ['id', DEM],
  };
  const chave = (tabela: string): [string, string] => {
    const c = chaves[tabela];
    if (!c) throw new Error(`tabela sem chave no teste: ${tabela}`);
    return c;
  };
  const retrato = async (tabela: string) => {
    const [coluna, valor] = chave(tabela);
    const r = await b.poolMigrator.query(`select row_to_json(t)::text as linha from ${tabela} t where ${coluna} = $1`, [valor]);
    expect(r.rows, tabela).toHaveLength(1);
    return r.rows[0].linha as string;
  };

  beforeAll(async () => {
    const m = (s: string, p: unknown[] = []) => b.poolMigrator.query(s, p);
    await m(
      `insert into demanda (id, titulo, tipo, solicitante_nome, autor_tipo, autor_id, criada_em, atualizada_em) values ($1, 'Demanda ficticia', 'novo_projeto', 'Pessoa Ficticia', 'pessoa', 'u-ficticio', $2, $2)`,
      [DEM, QUANDO],
    );
    await m(`insert into entrada_bruta (demanda_id, texto, origem, recebida_em) values ($1, 'texto ficticio', '{"canal":"email"}', $2)`, [DEM, QUANDO]);
    await m(
      `insert into especificacao_tecnica (id, demanda_id, versao, descricao_objetiva, escopo_inclui, sistema_alvo, repositorio_destino, criterios_aceite_preliminares, definicao_de_pronto, autor_tipo, autor_id, rascunho_agente, criada_em)
       values ($1, $2, 1, 'Descricao ficticia', '["item ficticio"]', 'sistema-ficticio', 'wsssistemas2626-crypto/sistema-ficticio', '["criterio ficticio"]', '["pronto ficticio"]', 'pessoa', 'u-ficticio', false, $3)`,
      [ESP, DEM, QUANDO],
    );
    await m(
      `insert into parecer_risco (id, demanda_id, versao, resumo, risco_tecnico_nivel, risco_operacional_nivel, risco_juridico_nivel, autor_tipo, autor_id, rascunho_agente, criada_em)
       values ($1, $2, 1, 'Resumo ficticio', 'baixo', 'medio', 'alto', 'agente', 'risco', true, $3)`,
      [RSK, DEM, QUANDO],
    );
    await m(
      `insert into pacote_decisao (id, demanda_id, versao, especificacao_id, especificacao_versao, parecer_risco_id, parecer_risco_versao, demanda_tipo, demanda_titulo, demanda_descricao, resumo_executivo, opcao_a, opcao_b, nivel_aprovacao_requerido, autor_tipo, autor_id, rascunho_agente, criada_em)
       values ($1, $2, 1, $3, 1, $4, 1, 'novo_projeto', 'Demanda ficticia', 'Contexto: ficticio', 'Resumo ficticio', '{"descricao":"Opcao A ficticia"}', '{"descricao":"Opcao B ficticia"}', 'cto', 'pessoa', 'u-ficticio', false, $5)`,
      [DEC, DEM, ESP, RSK, QUANDO],
    );
    await m(
      `insert into aprovacao (pacote_decisao_id, papel_aprovacao, nome_aprovador, registrada_por, opcao, registrada_em) values ($1, 'cto', 'Pessoa Ficticia', 'u-ficticio', 'A', $2)`,
      [DEC, QUANDO],
    );
    await m(
      `insert into decisao (pacote_decisao_id, status_decisao, opcao_escolhida, decidida_por, decidida_em) values ($1, 'aprovada', 'A', 'u-ficticio', $2)`,
      [DEC, QUANDO],
    );
  });

  it.each([
    ['especificacao_tecnica', `update especificacao_tecnica set descricao_objetiva = 'outra' where id = $1`],
    ['especificacao_tecnica', `update especificacao_tecnica set sistema_alvo = 'outro-sistema', repositorio_destino = 'fabianojp06/outro-sistema' where id = $1`],
    ['especificacao_tecnica', `update especificacao_tecnica set autor_tipo = 'agente', rascunho_agente = true where id = $1`],
    ['especificacao_tecnica', 'delete from especificacao_tecnica where id = $1'],
    ['parecer_risco', `update parecer_risco set risco_juridico_nivel = 'baixo' where id = $1`],
    ['parecer_risco', 'delete from parecer_risco where id = $1'],
    ['pacote_decisao', `update pacote_decisao set nivel_aprovacao_requerido = 'cto_e_administradora' where id = $1`],
    ['pacote_decisao', `update pacote_decisao set especificacao_versao = 2 where id = $1`],
    ['pacote_decisao', 'delete from pacote_decisao where id = $1'],
    ['aprovacao', `update aprovacao set opcao = 'B' where pacote_decisao_id = $1`],
    ['aprovacao', 'delete from aprovacao where pacote_decisao_id = $1'],
    ['decisao', `update decisao set status_decisao = 'arquivada', opcao_escolhida = null where pacote_decisao_id = $1`],
    ['decisao', 'delete from decisao where pacote_decisao_id = $1'],
    ['entrada_bruta', 'delete from entrada_bruta where demanda_id = $1'],
    ['entrada_bruta', `update entrada_bruta set demanda_id = 'DEM-20261022-0001' where demanda_id = $1`],
    ['demanda', 'delete from demanda where id = $1'],
  ])('%s: "%s" é recusado (42501) e a linha fica igual', async (tabela, sql) => {
    const antes = await retrato(tabela);
    const valor = chave(tabela)[1];
    await expect(b.poolApp.query(sql, [valor])).rejects.toMatchObject({ code: '42501' });
    expect(await retrato(tabela)).toBe(antes);
  });

  it('pelo Drizzle, o caminho das tarefas seguintes, o UPDATE e o DELETE da ESP também são recusados', async () => {
    const antes = await retrato('especificacao_tecnica');
    await expect(b.db.update(especificacaoTecnica).set({ descricaoObjetiva: 'outra' }).where(eq(especificacaoTecnica.id, ESP))).rejects.toSatisfy(
      (e: unknown) => codigoPg(e) === '42501',
    );
    await expect(b.db.delete(especificacaoTecnica).where(eq(especificacaoTecnica.id, ESP))).rejects.toSatisfy((e: unknown) => codigoPg(e) === '42501');
    expect(await retrato('especificacao_tecnica')).toBe(antes);
  });

  it('dentro de comTransacao, o UPDATE do DEC é recusado e desfaz o que a transação gravou antes', async () => {
    const antesDec = await retrato('pacote_decisao');
    const antesDemanda = await retrato('demanda');
    const erro = await comTransacao(b.poolApp, async ({ tx, executor }) => {
      await tx.update(demanda).set({ titulo: 'Titulo que nao fica' }).where(eq(demanda.id, DEM));
      await executor.executeSql(`update pacote_decisao set resumo_executivo = 'outro' where id = $1`, [DEC]);
    }).then(
      () => null,
      (e: unknown) => e,
    );
    expect(codigoPg(erro)).toBe('42501');
    expect(await retrato('pacote_decisao')).toBe(antesDec);
    expect(await retrato('demanda')).toBe(antesDemanda);
  });

  it('o expurgo pela metade é recusado (23514): texto sem a data, ou a data com o texto guardado', async () => {
    const antes = await retrato('entrada_bruta');
    await expect(b.poolApp.query(`update entrada_bruta set texto = null where demanda_id = $1`, [DEM])).rejects.toMatchObject({
      code: '23514',
      constraint: 'entrada_bruta_expurgo_check',
    });
    await expect(b.poolApp.query(`update entrada_bruta set expurgada_em = $2 where demanda_id = $1`, [DEM, QUANDO])).rejects.toMatchObject({
      code: '23514',
      constraint: 'entrada_bruta_expurgo_check',
    });
    expect(await retrato('entrada_bruta')).toBe(antes);
  });

  it('nem o migrator apaga em silêncio: demanda com versões não sai (FK sem cascata, 23503)', async () => {
    await expect(b.poolMigrator.query('delete from demanda where id = $1', [DEM])).rejects.toMatchObject({ code: '23503' });
    await expect(b.poolMigrator.query('delete from especificacao_tecnica where id = $1', [ESP])).rejects.toMatchObject({ code: '23503' });
    await expect(b.poolMigrator.query('delete from pacote_decisao where id = $1', [DEC])).rejects.toMatchObject({ code: '23503' });
    expect(await retrato('demanda')).toContain(DEM);
  });

  it('a trava da demanda segura a segunda transação: o segundo "for update nowait" recebe 55P03', async () => {
    const c1 = await b.poolApp.connect();
    const c2 = await b.poolApp.connect();
    try {
      await c1.query('begin');
      await c1.query('select id from demanda where id = $1 for update', [DEM]);
      await c2.query('begin');
      await expect(c2.query('select id from demanda where id = $1 for update nowait', [DEM])).rejects.toMatchObject({ code: '55P03' });
    } finally {
      await c2.query('rollback');
      await c1.query('rollback');
      c2.release();
      c1.release();
    }
  });
});
