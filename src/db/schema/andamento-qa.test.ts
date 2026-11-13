// src/db/schema/andamento-qa.test.ts — testes da etapa 06-T01-testes (qa-automacao) do pedido DEC-DEM-20261111-0017-v1.
// AN-10 pede "INSERT pelo papel do app com cada CHECK violado é recusado": o andamento.test.ts confere o CHECK do dec_id
// só pelo texto (parecer Minor 1 da 06-T01-tech-lead.md). Aqui a recusa é exercida, com as bordas dos padrões (fim de
// linha, caixa, tamanho, acento), o NOT NULL que o CHECK sozinho não cobre (CHECK com nulo passa), a identidade que o
// app não escolhe (o último andamento é o de maior id) e as FKs sem cascata pela recusa do DELETE. Postgres real;
// dados fictícios; prefixo fictício.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { FASES_ANDAMENTO, STATUS_CONSTRUCAO } from './andamento';

let b: BancoDeTeste;
const DEM = 'DEM-20261113-0801';
const DEC = `DEC-${DEM}-v1`;
// Demanda sem filhos: só a linha de andamento a referencia, para provar que a FK da demanda recusa o DELETE.
const DEM_SO_ANDAMENTO = 'DEM-20261113-0802';
const QUANDO = '2026-11-13T12:00:00Z';
const m = (s: string, p: unknown[] = []) => b.poolMigrator.query(s, p);

beforeAll(async () => {
  b = await novoBanco();
  for (const id of [DEM, DEM_SO_ANDAMENTO]) {
    await m(
      `insert into demanda (id, titulo, tipo, solicitante_nome, autor_tipo, autor_id, criada_em, atualizada_em) values ($1, 'Demanda ficticia', 'melhoria', 'Pessoa Ficticia', 'pessoa', 'u-ficticio', $2, $2)`,
      [id, QUANDO],
    );
  }
  await m(
    `insert into especificacao_tecnica (id, demanda_id, versao, descricao_objetiva, escopo_inclui, escopo_exclui, duvidas_em_aberto, autor_tipo, autor_id, rascunho_agente, criada_em) values ($1, $2, 1, 'x', '[]', '[]', '[]', 'pessoa', 'u-ficticio', false, $3)`,
    [`ESP-${DEM}-v1`, DEM, QUANDO],
  );
  await m(
    `insert into parecer_risco (id, demanda_id, versao, resumo, risco_tecnico_nivel, risco_operacional_nivel, risco_juridico_nivel, autor_tipo, autor_id, rascunho_agente, criada_em) values ($1, $2, 1, 'Resumo ficticio', 'baixo', 'baixo', 'baixo', 'pessoa', 'u-ficticio', false, $3)`,
    [`RSK-${DEM}-v1`, DEM, QUANDO],
  );
  await m(
    `insert into pacote_decisao (id, demanda_id, versao, especificacao_id, especificacao_versao, parecer_risco_id, parecer_risco_versao, demanda_tipo, demanda_titulo, demanda_descricao, resumo_executivo, opcao_a, opcao_b, nivel_aprovacao_requerido, autor_tipo, autor_id, rascunho_agente, criada_em)
     values ($1, $2, 1, $3, 1, $4, 1, 'melhoria', 'Demanda ficticia', 'Contexto: ficticio', 'Resumo ficticio', '{"descricao":"A"}', '{"descricao":"B"}', 'cto', 'pessoa', 'u-ficticio', false, $5)`,
    [DEC, DEM, `ESP-${DEM}-v1`, `RSK-${DEM}-v1`, QUANDO],
  );
});
afterAll(async () => {
  await b.fechar();
});

type Linha = { demanda: unknown; dec: unknown; fase: unknown; prontas: unknown; total: unknown; status: unknown; prefixo: unknown; gravado: unknown };
const VALIDA: Linha = { demanda: DEM, dec: DEC, fase: 'construindo', prontas: 9, total: 17, status: 'em_construcao', prefixo: 'ficticio', gravado: QUANDO };
const inserir = (l: Partial<Linha> = {}) => {
  const x = { ...VALIDA, ...l };
  return b.poolApp.query<{ id: string }>(
    `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em) values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [x.demanda, x.dec, x.fase, x.prontas, x.total, x.status, x.prefixo, x.gravado],
  );
};
const viola = (constraint: string) => expect.objectContaining({ code: '23514', constraint });

describe('andamento_construcao: o CHECK do dec_id recusa de fato (AN-10, parecer Minor 1 da 06-T01-tech-lead.md)', () => {
  // O CHECK roda antes da FK (que é gatilho depois da linha): a recusa vem com 23514 e o nome do CHECK, não 23503.
  it.each([
    ['curto', 'DEC-x'],
    ['vazio', ''],
    ['caixa baixa no prefixo', `dec-${DEM}-v1`],
    ['V maiúsculo na versão', `DEC-${DEM}-V1`],
    ['versão com 5 dígitos', `DEC-${DEM}-v12345`],
    ['versão sem dígito', `DEC-${DEM}-v`],
    ['data com 7 dígitos', 'DEC-DEM-2026111-0801-v1'],
    ['sequência com 5 dígitos', 'DEC-DEM-20261113-08010-v1'],
    ['espaço antes', ` ${DEC}`],
    ['espaço depois', `${DEC} `],
    ['quebra de linha no fim', `${DEC}\n`],
    ['quebra de linha no meio', `DEC-DEM-20261113-0801-v1\nDEC-DEM-20261113-0801-v1`],
    ['dígito de largura total', 'DEC-DEM-2026111３-0801-v1'],
    ['ESP no lugar de DEC', `ESP-${DEM}-v1`],
  ])('dec_id %s é recusado com 23514 (%j)', async (_nome, dec) => {
    await expect(inserir({ dec })).rejects.toEqual(viola('andamento_construcao_dec_id_check'));
  });
  it('dec_id no formato e sem pacote de decisão passa pelo CHECK e para na FK (23503)', async () => {
    await expect(inserir({ dec: 'DEC-DEM-20261113-0801-v9999' })).rejects.toEqual(
      expect.objectContaining({ code: '23503', constraint: 'andamento_construcao_dec_id_pacote_decisao_id_fk' }),
    );
  });
});

describe('andamento_construcao: bordas dos outros CHECKs (AN-10)', () => {
  it.each(FASES_ANDAMENTO.map((f) => [f]))('a fase %s é aceita', async (fase) => {
    await expect(inserir({ fase })).resolves.toMatchObject({ rowCount: 1 });
  });
  it.each(STATUS_CONSTRUCAO.map((s) => [s]))('o status %s é aceito', async (status) => {
    await expect(inserir({ status })).resolves.toMatchObject({ rowCount: 1 });
  });
  it.each([
    [{ fase: 'construindo ' }, 'andamento_construcao_fase_check'],
    [{ fase: 'CONSTRUINDO' }, 'andamento_construcao_fase_check'],
    [{ fase: 'entregue' }, 'andamento_construcao_fase_check'],
    [{ status: 'EM_CONSTRUCAO' }, 'andamento_construcao_status_construcao_check'],
    [{ status: 'em_construcao\n' }, 'andamento_construcao_status_construcao_check'],
    [{ status: 'encerrada' }, 'andamento_construcao_status_construcao_check'],
    [{ prontas: 0, total: -1 }, 'andamento_construcao_tarefas_check'],
    [{ prontas: -1, total: -1 }, 'andamento_construcao_tarefas_check'],
    [{ prontas: 1000, total: 999 }, 'andamento_construcao_tarefas_check'],
    [{ prontas: 1000, total: 1000 }, 'andamento_construcao_tarefas_check'],
    [{ prefixo: 'ficticio1' }, 'andamento_construcao_ator_token_prefixo_check'],
    [{ prefixo: 'fictici' }, 'andamento_construcao_ator_token_prefixo_check'],
    [{ prefixo: '' }, 'andamento_construcao_ator_token_prefixo_check'],
    [{ prefixo: 'ficticio\n' }, 'andamento_construcao_ator_token_prefixo_check'],
    [{ prefixo: 'fict cio' }, 'andamento_construcao_ator_token_prefixo_check'],
    [{ prefixo: 'fictício' }, 'andamento_construcao_ator_token_prefixo_check'],
    [{ prefixo: 'fict.cio' }, 'andamento_construcao_ator_token_prefixo_check'],
  ] as const)('CHECK recusa %j', async (l, nome) => {
    await expect(inserir(l as Partial<Linha>)).rejects.toEqual(viola(nome));
  });
  it('o prefixo aceita os oito caracteres da lista, com _ e -', async () => {
    await expect(inserir({ prefixo: 'aZ09_-xY' })).resolves.toMatchObject({ rowCount: 1 });
  });
  it('número não inteiro de tarefas é recusado pelo tipo (22P02), sem gravar', async () => {
    await expect(inserir({ prontas: '9.5' })).rejects.toMatchObject({ code: '22P02' });
  });
});

describe('andamento_construcao: NOT NULL onde o CHECK deixaria passar (AN-10)', () => {
  // CHECK com valor nulo dá "desconhecido" e não recusa: quem segura o nulo é o NOT NULL de cada coluna.
  it.each([
    ['demanda', 'demanda_id'],
    ['dec', 'dec_id'],
    ['fase', 'fase'],
    ['prontas', 'tarefas_prontas'],
    ['total', 'tarefas_total'],
    ['status', 'status_construcao'],
    ['prefixo', 'ator_token_prefixo'],
    ['gravado', 'gravado_em'],
  ] as const)('%s nulo é recusado com 23502 na coluna %s', async (campo, coluna) => {
    await expect(inserir({ [campo]: null } as Partial<Linha>)).rejects.toEqual(expect.objectContaining({ code: '23502', column: coluna }));
  });
  it('gravado_em não tem padrão no banco: o INSERT sem ele é recusado (o momento vem do Relogio, G3.4)', async () => {
    await expect(
      b.poolApp.query(
        `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo) values ($1, $2, 'construindo', 9, 17, 'em_construcao', 'ficticio')`,
        [DEM, DEC],
      ),
    ).rejects.toEqual(expect.objectContaining({ code: '23502', column: 'gravado_em' }));
  });
});

describe('andamento_construcao: identidade e leitura pelo app (AN-10)', () => {
  it('o app não escolhe o id (GENERATED ALWAYS, 428C9): o último andamento não se forja pelo id', async () => {
    await expect(
      b.poolApp.query(
        `insert into andamento_construcao (id, demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em) values (999999, $1, $2, 'construindo', 9, 17, 'em_construcao', 'ficticio', $3)`,
        [DEM, DEC, QUANDO],
      ),
    ).rejects.toMatchObject({ code: '428C9' });
  });
  it('com o mesmo gravado_em, a linha incluída depois tem id maior', async () => {
    const primeira = Number((await inserir({ prontas: 1 })).rows[0]!.id);
    const segunda = Number((await inserir({ prontas: 2 })).rows[0]!.id);
    expect(segunda).toBeGreaterThan(primeira);
  });
  it('o app lê o que incluiu (SELECT dado de fato, não só listado)', async () => {
    const id = (await inserir({ fase: 'testando', prontas: 4, total: 5, status: 'construido' })).rows[0]!.id;
    const { rows } = await b.poolApp.query(
      `select demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo from andamento_construcao where id = $1`,
      [id],
    );
    expect(rows).toEqual([
      { demanda_id: DEM, dec_id: DEC, fase: 'testando', tarefas_prontas: 4, tarefas_total: 5, status_construcao: 'construido', ator_token_prefixo: 'ficticio' },
    ]);
  });
});

describe('andamento_construcao: FKs sem cascata, pela recusa do DELETE (AN-10)', () => {
  // Pelo migrator (dono do esquema): nem ele apaga a demanda ou o pacote que tem andamento; a linha não some em cascata.
  it('apagar a demanda que tem andamento é recusado (23503) e a linha fica', async () => {
    const id = (await inserir({ demanda: DEM_SO_ANDAMENTO })).rows[0]!.id;
    await expect(m(`delete from demanda where id = $1`, [DEM_SO_ANDAMENTO])).rejects.toEqual(
      expect.objectContaining({ code: '23503', constraint: 'andamento_construcao_demanda_id_demanda_id_fk' }),
    );
    expect((await m(`select id from andamento_construcao where id = $1`, [id])).rows).toHaveLength(1);
  });
  it('apagar o pacote de decisão que tem andamento é recusado (23503) e a linha fica', async () => {
    const id = (await inserir()).rows[0]!.id;
    await expect(m(`delete from pacote_decisao where id = $1`, [DEC])).rejects.toEqual(
      expect.objectContaining({ code: '23503', constraint: 'andamento_construcao_dec_id_pacote_decisao_id_fk' }),
    );
    expect((await m(`select id from andamento_construcao where id = $1`, [id])).rows).toHaveLength(1);
  });
});
