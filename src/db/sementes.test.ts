// Sementes da migration custom rls_privilegios_agentes (T06): os quatro agentes nascem desligados (CA-19.1) e o teto
// nasce zero, em USD (RF-18, P1-f). E o registro de uso não guarda conteúdo (CA-17.3). Dados só fictícios.
import { afterAll, beforeAll, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../test/banco';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

it('os quatro agentes nascem desligados (CA-19.1)', async () => {
  const r = await b.poolApp.query('select agente, ligado from configuracao_agente order by agente');
  expect(r.rows).toEqual([
    { agente: 'consolidacao', ligado: false },
    { agente: 'insumo_tecnico', ligado: false },
    { agente: 'orquestrador', ligado: false },
    { agente: 'risco', ligado: false },
  ]);
});

it('teto nasce zero, em USD (RF-18, P1-f)', async () => {
  const r = await b.poolApp.query('select teto_mensal, moeda from configuracao_ia');
  expect(r.rows).toEqual([{ teto_mensal: '0.00', moeda: 'USD' }]);
});

it('uso_ia não tem coluna de conteúdo (CA-17.3)', async () => {
  const r = await b.poolMigrator.query(`select column_name from information_schema.columns where table_name = 'uso_ia'`);
  const nomes = r.rows.map((x) => x.column_name as string);
  expect(nomes.length).toBeGreaterThan(0);
  expect(nomes.filter((n) => /prompt|resposta|conteudo|texto|mensagem/.test(n))).toEqual([]);
});

it('uso_ia é só de inclusão', async () => {
  await expect(b.poolApp.query('update uso_ia set custo = 0')).rejects.toMatchObject({ code: '42501' });
});

// Etapa 06-T06-construcao: o resto do estado inicial, que a tela T12 e o executor da T27 leem.
it('os agentes nascem sem modelo e sem autor de alteração', async () => {
  const r = await b.poolApp.query('select agente, modelo, atualizado_em, atualizado_por from configuracao_agente order by agente');
  expect(r.rows.map((x) => [x.modelo, x.atualizado_em, x.atualizado_por])).toEqual(Array.from({ length: 4 }, () => [null, null, null]));
});

it('configuracao_ia tem uma linha só, a de id 1, sem autor de alteração', async () => {
  const r = await b.poolApp.query('select id, atualizado_em, atualizado_por from configuracao_ia');
  expect(r.rows).toEqual([{ id: 1, atualizado_em: null, atualizado_por: null }]);
});

it('as tabelas de operação nascem vazias: nenhum preço, execução, uso, aviso, batimento ou rotina', async () => {
  for (const tabela of ['preco_modelo', 'execucao_agente', 'uso_ia', 'aviso_email', 'worker_batimento', 'rotina_execucao']) {
    const r = await b.poolApp.query(`select count(*)::int as n from ${tabela}`);
    expect(r.rows[0].n, tabela).toBe(0);
  }
});

// Etapa 06-T06-testes (qa-automacao): a semente explícita podia esconder um padrão errado na tabela. Aqui a linha é
// refeita só com a chave, numa transação desfeita no fim, e o que vale é o padrão do banco: agente desligado e teto zero
// em USD também para qualquer semente ou restauração futura que não informe o valor (CA-19.1, RF-18, P1-f).
const refazerSoComAChave = async (apagar: string, inserir: string, ler: string) => {
  const c = await b.poolMigrator.connect();
  try {
    await c.query('begin');
    await c.query(apagar);
    await c.query(inserir);
    return (await c.query(ler)).rows;
  } finally {
    await c.query('rollback');
    c.release();
  }
};

it('pelo padrão da tabela, agente incluído sem dizer se está ligado nasce desligado e sem modelo', async () => {
  const linhas = await refazerSoComAChave(
    `delete from configuracao_agente where agente = 'risco'`,
    `insert into configuracao_agente (agente) values ('risco')`,
    `select ligado, modelo from configuracao_agente where agente = 'risco'`,
  );
  expect(linhas).toEqual([{ ligado: false, modelo: null }]);
});

it('pelo padrão da tabela, a linha do teto incluída só com o id nasce com teto zero em USD', async () => {
  const linhas = await refazerSoComAChave('delete from configuracao_ia', 'insert into configuracao_ia (id) values (1)', 'select teto_mensal, moeda from configuracao_ia');
  expect(linhas).toEqual([{ teto_mensal: '0.00', moeda: 'USD' }]);
});

it('a transação desfeita deixou as sementes como estavam', async () => {
  const agentes = await b.poolApp.query(`select count(*)::int as n from configuracao_agente where not ligado`);
  const teto = await b.poolApp.query('select teto_mensal from configuracao_ia');
  expect(agentes.rows[0].n).toBe(4);
  expect(teto.rows).toEqual([{ teto_mensal: '0.00' }]);
});
