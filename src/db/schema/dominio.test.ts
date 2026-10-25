// Integridade das tabelas de demanda, versões e decisão (T05), provada no Postgres real: a regra vive no banco e a
// aplicação só reforça. Inclusões feitas com o papel do app, que também prova o INSERT da regra de C-34. Dados só
// fictícios.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import {
  aprovacao,
  AUTORES_ARTEFATO,
  LINHAS_SERVICO,
  NIVEIS_APROVACAO,
  NIVEIS_RISCO,
  OPCOES_DECISAO,
  PAPEIS_APROVACAO,
  PAPEIS_SOLICITANTE,
  STATUS_DECISAO,
  STATUS_DEMANDA,
  STATUS_ENTRADA_PENDENTE,
  TIPOS_DEMANDA,
  URGENCIAS,
} from './index';

let b: BancoDeTeste;
const QUANDO = '2026-10-22T12:00:00Z';
const D1 = 'DEM-20261022-0101';
const D2 = 'DEM-20261022-0102';

// Valores jsonb vão como texto JSON: o driver transforma lista de JS em array do Postgres, não em jsonb.
type Campos = Record<string, string | number | boolean | null>;
const inserir = (tabela: string, campos: Campos) => {
  const colunas = Object.keys(campos);
  return b.poolApp.query(
    `insert into ${tabela} (${colunas.join(', ')}) values (${colunas.map((_, i) => `$${i + 1}`).join(', ')})`,
    Object.values(campos),
  );
};
const sem = (campos: Campos, ...fora: string[]) => Object.fromEntries(Object.entries(campos).filter(([k]) => !fora.includes(k)));

const demandaBase = (id: string): Campos => ({
  id,
  titulo: 'Demanda ficticia',
  tipo: 'melhoria',
  solicitante_nome: 'Pessoa Ficticia',
  autor_tipo: 'pessoa',
  autor_id: 'u-ficticio',
  criada_em: QUANDO,
  atualizada_em: QUANDO,
});
const espBase = (demandaId: string, versao: number): Campos => ({
  id: `ESP-${demandaId}-v${versao}`,
  demanda_id: demandaId,
  versao,
  descricao_objetiva: 'Descricao ficticia',
  escopo_inclui: '["item ficticio"]',
  autor_tipo: 'pessoa',
  autor_id: 'u-ficticio',
  rascunho_agente: false,
  criada_em: QUANDO,
});
const rskBase = (demandaId: string, versao: number): Campos => ({
  id: `RSK-${demandaId}-v${versao}`,
  demanda_id: demandaId,
  versao,
  risco_tecnico_nivel: 'baixo',
  risco_operacional_nivel: 'medio',
  risco_juridico_nivel: 'alto',
  autor_tipo: 'agente',
  autor_id: 'risco',
  rascunho_agente: true,
  criada_em: QUANDO,
});
const decBase = (versao: number): Campos => ({
  id: `DEC-${D1}-v${versao}`,
  demanda_id: D1,
  versao,
  especificacao_id: `ESP-${D1}-v1`,
  especificacao_versao: 1,
  parecer_risco_id: `RSK-${D1}-v1`,
  parecer_risco_versao: 1,
  demanda_tipo: 'melhoria',
  demanda_titulo: 'Demanda ficticia',
  demanda_descricao: 'Contexto: ficticio',
  resumo_executivo: 'Resumo ficticio',
  opcao_a: '{"descricao":"Opcao A ficticia"}',
  opcao_b: '{"descricao":"Opcao B ficticia"}',
  nivel_aprovacao_requerido: 'cto_e_administradora',
  autor_tipo: 'pessoa',
  autor_id: 'u-ficticio',
  rascunho_agente: false,
  criada_em: QUANDO,
});
const aprovacaoBase = (papel: string): Campos => ({
  pacote_decisao_id: `DEC-${D1}-v1`,
  papel_aprovacao: papel,
  nome_aprovador: 'Pessoa Ficticia',
  registrada_por: 'u-ficticio',
  opcao: 'A',
  registrada_em: QUANDO,
});

beforeAll(async () => {
  b = await novoBanco();
  await inserir('demanda', demandaBase(D1));
  await inserir('demanda', demandaBase(D2));
  await inserir('especificacao_tecnica', espBase(D1, 1));
  await inserir('especificacao_tecnica', espBase(D2, 1));
  await inserir('parecer_risco', rskBase(D1, 1));
});
afterAll(async () => {
  await b.fechar();
});

describe('demanda', () => {
  it('nasce com status nova, anexos e dúvidas vazios e sem rascunho de agente', async () => {
    const r = await b.poolApp.query(`select status, anexos, duvidas_entrada, rascunho_agente from demanda where id = $1`, [D1]);
    expect(r.rows).toEqual([{ status: 'nova', anexos: [], duvidas_entrada: [], rascunho_agente: false }]);
  });

  it.each(['DEM-2026102-0001', 'dem-20261022-0001', 'DEM-20261022-00001', 'DEM-20261022-001a', ''])(
    'id fora do formato DEM-AAAAMMDD-NNNN (%j) é recusado (23514)',
    async (id) => {
      await expect(inserir('demanda', demandaBase(id))).rejects.toMatchObject({ code: '23514', constraint: 'demanda_id_check' });
    },
  );

  it.each([
    ['tipo', 'outro'],
    ['status', 'cancelada'],
    ['solicitante_papel', 'diretoria'],
    ['linha_servico_provavel', 'consultoria'],
    ['urgencia', 'critica'],
    ['autor_tipo', 'sistema'],
  ])('%s fora da lista (%j) é recusado (23514)', async (coluna, valor) => {
    await expect(inserir('demanda', { ...demandaBase('DEM-20261022-0199'), [coluna]: valor })).rejects.toMatchObject({
      code: '23514',
      constraint: `demanda_${coluna}_check`,
    });
  });

  it.each([
    ['anexos', '{"tipo":"url"}'],
    ['duvidas_entrada', '"texto corrido"'],
  ])('%s precisa ser lista jsonb (23514)', async (coluna, valor) => {
    await expect(inserir('demanda', { ...demandaBase('DEM-20261022-0198'), [coluna]: valor })).rejects.toMatchObject({
      code: '23514',
      constraint: `demanda_${coluna}_check`,
    });
  });

  it.each(['titulo', 'tipo', 'solicitante_nome', 'autor_tipo', 'autor_id', 'criada_em', 'atualizada_em'])(
    '%s é obrigatório, sem padrão no banco (23502; datas vêm do Relogio, G3.4)',
    async (coluna) => {
      await expect(inserir('demanda', sem(demandaBase('DEM-20261022-0197'), coluna))).rejects.toMatchObject({ code: '23502' });
    },
  );

  it('solicitante_papel, linha_servico_provavel e urgencia aceitam nulo', async () => {
    await inserir('demanda', { ...demandaBase('DEM-20261022-0196'), solicitante_papel: null, linha_servico_provavel: null, urgencia: null });
  });
});

describe('entrada_bruta e entrada_pendente', () => {
  it('entrada só de demanda existente (23503) e uma por demanda (23505)', async () => {
    await expect(inserir('entrada_bruta', { demanda_id: 'DEM-20261022-9999', texto: 'texto ficticio', recebida_em: QUANDO })).rejects.toMatchObject({
      code: '23503',
    });
    await inserir('entrada_bruta', { demanda_id: D2, texto: 'texto ficticio', origem: '{"canal":"email"}', recebida_em: QUANDO });
    await expect(inserir('entrada_bruta', { demanda_id: D2, texto: 'outro texto ficticio', recebida_em: QUANDO })).rejects.toMatchObject({
      code: '23505',
    });
  });

  it.each([
    ['sem texto e sem expurgo', { texto: null }],
    ['expurgada com o texto guardado', { texto: 'texto ficticio', expurgada_em: QUANDO }],
    ['expurgada com a origem guardada', { texto: null, origem: '{"canal":"email"}', expurgada_em: QUANDO }],
  ])('%s é recusada (23514)', async (_caso, campos) => {
    await expect(inserir('entrada_bruta', { demanda_id: D1, recebida_em: QUANDO, ...campos })).rejects.toMatchObject({
      code: '23514',
      constraint: 'entrada_bruta_expurgo_check',
    });
  });

  it('origem precisa ser objeto jsonb (23514)', async () => {
    await expect(inserir('entrada_bruta', { demanda_id: D1, texto: 'texto ficticio', origem: '["email"]', recebida_em: QUANDO })).rejects.toMatchObject({
      code: '23514',
      constraint: 'entrada_bruta_origem_check',
    });
  });

  it('entrada_pendente: o app inclui (nasce aguardando), marca falha e apaga', async () => {
    const r = await b.poolApp.query(
      `insert into entrada_pendente (texto, solicitante_nome, registrada_por, recebida_em) values ('texto ficticio', 'Pessoa Ficticia', 'u-ficticio', $1) returning id, status`,
      [QUANDO],
    );
    expect(r.rows[0].status).toBe('aguardando');
    const id = r.rows[0].id as string;
    await b.poolApp.query(`update entrada_pendente set status = 'falhou' where id = $1`, [id]);
    await b.poolApp.query(`delete from entrada_pendente where id = $1`, [id]);
    expect((await b.poolApp.query(`select 1 from entrada_pendente where id = $1`, [id])).rows).toEqual([]);
  });

  it.each([
    ['status', 'processando'],
    ['solicitante_papel', 'diretoria'],
  ])('entrada_pendente: %s fora da lista (%j) é recusado (23514)', async (coluna, valor) => {
    await expect(
      inserir('entrada_pendente', { texto: 'texto ficticio', solicitante_nome: 'Pessoa Ficticia', registrada_por: 'u-ficticio', recebida_em: QUANDO, [coluna]: valor }),
    ).rejects.toMatchObject({ code: '23514', constraint: `entrada_pendente_${coluna}_check` });
  });
});

describe('especificacao_tecnica e parecer_risco', () => {
  it('id incoerente com a demanda ou a versão é recusado (23514)', async () => {
    await expect(inserir('especificacao_tecnica', { ...espBase(D1, 2), id: `ESP-${D1}-v3` })).rejects.toMatchObject({
      code: '23514',
      constraint: 'especificacao_tecnica_id_check',
    });
    await expect(inserir('especificacao_tecnica', { ...espBase(D1, 2), id: `ESP-${D2}-v2` })).rejects.toMatchObject({
      code: '23514',
      constraint: 'especificacao_tecnica_id_check',
    });
    await expect(inserir('parecer_risco', { ...rskBase(D1, 2), id: `ESP-${D1}-v2` })).rejects.toMatchObject({
      code: '23514',
      constraint: 'parecer_risco_id_check',
    });
  });

  it.each([0, 10_000])('versão %i fora de 1..9999 é recusada (23514)', async (versao) => {
    await expect(inserir('especificacao_tecnica', espBase(D1, versao))).rejects.toMatchObject({
      code: '23514',
      constraint: 'especificacao_tecnica_versao_check',
    });
  });

  it('a mesma versão da mesma demanda não entra duas vezes (23505)', async () => {
    await expect(inserir('especificacao_tecnica', espBase(D1, 1))).rejects.toMatchObject({ code: '23505' });
    await expect(inserir('parecer_risco', rskBase(D1, 1))).rejects.toMatchObject({ code: '23505' });
  });

  it('versão só de demanda existente (23503)', async () => {
    await expect(inserir('especificacao_tecnica', espBase('DEM-20261022-9999', 1))).rejects.toMatchObject({ code: '23503' });
  });

  it.each(['escopo_inclui', 'escopo_exclui', 'duvidas_em_aberto', 'criterios_aceite_preliminares', 'definicao_de_pronto'])(
    'ESP: %s como texto corrido é recusado (23514, CA-08.5 no banco)',
    async (coluna) => {
      await expect(inserir('especificacao_tecnica', { ...espBase(D1, 2), [coluna]: '"tudo"' })).rejects.toMatchObject({
        code: '23514',
        constraint: `especificacao_tecnica_${coluna}_check`,
      });
    },
  );

  it.each(['recomendacoes_mitigacao', 'pre_condicoes'])('RSK: %s como texto corrido é recusado (23514, CA-09.3 no banco)', async (coluna) => {
    await expect(inserir('parecer_risco', { ...rskBase(D1, 2), [coluna]: '"antes de tudo"' })).rejects.toMatchObject({
      code: '23514',
      constraint: `parecer_risco_${coluna}_check`,
    });
  });

  it('ESP: listas de escopo e de dúvidas nascem vazias; as de construção ficam nulas (tipo estudo)', async () => {
    const r = await b.poolApp.query(
      `select escopo_exclui, duvidas_em_aberto, criterios_aceite_preliminares, definicao_de_pronto, sistema_alvo from especificacao_tecnica where id = $1`,
      [`ESP-${D1}-v1`],
    );
    expect(r.rows).toEqual([{ escopo_exclui: [], duvidas_em_aberto: [], criterios_aceite_preliminares: null, definicao_de_pronto: null, sistema_alvo: null }]);
  });

  it.each([
    ['agente sem rascunho', { autor_tipo: 'agente', autor_id: 'insumo_tecnico', rascunho_agente: false }],
    ['pessoa com rascunho', { autor_tipo: 'pessoa', autor_id: 'u-ficticio', rascunho_agente: true }],
  ])('rascunho_agente acompanha o autor: %s é recusado (23514, C-11 no banco)', async (_caso, autoria) => {
    await expect(inserir('especificacao_tecnica', { ...espBase(D1, 2), ...autoria })).rejects.toMatchObject({
      code: '23514',
      constraint: 'especificacao_tecnica_rascunho_agente_check',
    });
  });

  it('rascunho_agente é obrigatório no artefato (23502): quem grava diz se é rascunho', async () => {
    await expect(inserir('especificacao_tecnica', sem(espBase(D1, 2), 'rascunho_agente'))).rejects.toMatchObject({ code: '23502' });
  });

  it.each(['risco_tecnico_nivel', 'risco_operacional_nivel', 'risco_juridico_nivel'])('RSK: %s "critico" é recusado (23514, CA-09.2 no banco)', async (coluna) => {
    await expect(inserir('parecer_risco', { ...rskBase(D1, 2), [coluna]: 'critico' })).rejects.toMatchObject({
      code: '23514',
      constraint: `parecer_risco_${coluna}_check`,
    });
  });

  it.each(['risco_tecnico_nivel', 'risco_operacional_nivel', 'risco_juridico_nivel'])('RSK: %s é obrigatório (23502)', async (coluna) => {
    await expect(inserir('parecer_risco', sem(rskBase(D1, 2), coluna))).rejects.toMatchObject({ code: '23502' });
  });
});

describe('pacote_decisao, aprovacao e decisao', () => {
  beforeAll(async () => {
    await inserir('pacote_decisao', decBase(1));
  });

  it('o DEC não cita ESP nem RSK de outra demanda, nem com versão diferente do id (23514)', async () => {
    await expect(inserir('pacote_decisao', { ...decBase(2), especificacao_id: `ESP-${D2}-v1` })).rejects.toMatchObject({
      code: '23514',
      constraint: 'pacote_decisao_especificacao_check',
    });
    await expect(inserir('pacote_decisao', { ...decBase(2), especificacao_versao: 2 })).rejects.toMatchObject({
      code: '23514',
      constraint: 'pacote_decisao_especificacao_check',
    });
    await expect(inserir('pacote_decisao', { ...decBase(2), parecer_risco_versao: 3 })).rejects.toMatchObject({
      code: '23514',
      constraint: 'pacote_decisao_parecer_risco_check',
    });
  });

  it('o DEC só cita ESP e RSK que existem (23503)', async () => {
    await expect(inserir('pacote_decisao', { ...decBase(2), especificacao_id: `ESP-${D1}-v9`, especificacao_versao: 9 })).rejects.toMatchObject({
      code: '23503',
    });
    await expect(inserir('pacote_decisao', { ...decBase(2), parecer_risco_id: `RSK-${D1}-v9`, parecer_risco_versao: 9 })).rejects.toMatchObject({
      code: '23503',
    });
  });

  it.each([
    ['nivel_aprovacao_requerido', 'diretoria', 'pacote_decisao_nivel_aprovacao_requerido_check'],
    ['demanda_tipo', 'outro', 'pacote_decisao_demanda_tipo_check'],
    ['opcao_a', '["descricao"]', 'pacote_decisao_opcao_a_check'],
    ['opcao_b', '"texto corrido"', 'pacote_decisao_opcao_b_check'],
    ['id', `DEC-${D1}-v3`, 'pacote_decisao_id_check'],
  ])('DEC: %s com %j é recusado (23514)', async (coluna, valor, restricao) => {
    await expect(inserir('pacote_decisao', { ...decBase(2), [coluna]: valor })).rejects.toMatchObject({ code: '23514', constraint: restricao });
  });

  it.each(['especificacao_id', 'parecer_risco_id', 'resumo_executivo', 'opcao_a', 'opcao_b', 'nivel_aprovacao_requerido', 'demanda_titulo'])(
    'DEC: %s é obrigatório (23502)',
    async (coluna) => {
      await expect(inserir('pacote_decisao', sem(decBase(2), coluna))).rejects.toMatchObject({ code: '23502' });
    },
  );

  it('aprovação: opção fora de A e B, e papel fora da lista, são recusados (23514)', async () => {
    await expect(inserir('aprovacao', { ...aprovacaoBase('cto'), opcao: 'C' })).rejects.toMatchObject({ code: '23514', constraint: 'aprovacao_opcao_check' });
    await expect(inserir('aprovacao', aprovacaoBase('diretoria'))).rejects.toMatchObject({ code: '23514', constraint: 'aprovacao_papel_aprovacao_check' });
  });

  it('aprovação da administradora exige referência e data do documento (23514, CA-14.3 no banco)', async () => {
    await expect(inserir('aprovacao', aprovacaoBase('administradora'))).rejects.toMatchObject({
      code: '23514',
      constraint: 'aprovacao_documento_administradora_check',
    });
    await expect(inserir('aprovacao', { ...aprovacaoBase('administradora'), referencia_documento: 'DOC-FICTICIO-1' })).rejects.toMatchObject({
      code: '23514',
      constraint: 'aprovacao_documento_administradora_check',
    });
    await inserir('aprovacao', { ...aprovacaoBase('administradora'), referencia_documento: 'DOC-FICTICIO-1', data_documento: '2026-10-21' });
    // Pelo Drizzle (mode 'string'), a data do documento sai como 'AAAA-MM-DD', sem fuso: é a data civil do documento.
    const r = await b.db
      .select({ dataDocumento: aprovacao.dataDocumento, revisouRascunhos: aprovacao.revisouRascunhos })
      .from(aprovacao)
      .where(eq(aprovacao.papelAprovacao, 'administradora'));
    expect(r).toEqual([{ dataDocumento: '2026-10-21', revisouRascunhos: false }]);
  });

  it('uma aprovação por papel em cada DEC (23505), e só de DEC existente (23503)', async () => {
    await inserir('aprovacao', aprovacaoBase('cto'));
    await expect(inserir('aprovacao', { ...aprovacaoBase('cto'), opcao: 'B' })).rejects.toMatchObject({ code: '23505', constraint: 'aprovacao_pacote_papel_unique' });
    await expect(inserir('aprovacao', { ...aprovacaoBase('cto'), pacote_decisao_id: `DEC-${D2}-v1` })).rejects.toMatchObject({ code: '23503' });
  });

  it.each([
    ['aprovada sem opção', { status_decisao: 'aprovada' }, 'decisao_aprovada_tem_opcao_check'],
    ['devolvida com opção', { status_decisao: 'devolvida', opcao_escolhida: 'A' }, 'decisao_opcao_so_na_aprovada_check'],
    ['opção C', { status_decisao: 'aprovada', opcao_escolhida: 'C' }, 'decisao_opcao_escolhida_check'],
    ['status pendente (derivado, nunca gravado)', { status_decisao: 'pendente' }, 'decisao_status_decisao_check'],
  ])('decisão %s é recusada (23514)', async (_caso, campos, restricao) => {
    await expect(inserir('decisao', { pacote_decisao_id: `DEC-${D1}-v1`, decidida_por: 'u-ficticio', decidida_em: QUANDO, ...campos })).rejects.toMatchObject({
      code: '23514',
      constraint: restricao,
    });
  });

  it('uma decisão só por DEC (23505, CA-11.3 no banco)', async () => {
    await inserir('decisao', { pacote_decisao_id: `DEC-${D1}-v1`, status_decisao: 'aprovada', opcao_escolhida: 'A', decidida_por: 'u-ficticio', decidida_em: QUANDO });
    await expect(
      inserir('decisao', { pacote_decisao_id: `DEC-${D1}-v1`, status_decisao: 'arquivada', decidida_por: 'u-ficticio', decidida_em: QUANDO }),
    ).rejects.toMatchObject({ code: '23505' });
  });
});

describe('enumerações do banco são as listas exportadas pelo esquema', () => {
  it.each([
    ['demanda_tipo_check', TIPOS_DEMANDA],
    ['demanda_status_check', STATUS_DEMANDA],
    ['demanda_solicitante_papel_check', PAPEIS_SOLICITANTE],
    ['demanda_linha_servico_provavel_check', LINHAS_SERVICO],
    ['demanda_urgencia_check', URGENCIAS],
    ['demanda_autor_tipo_check', AUTORES_ARTEFATO],
    ['entrada_pendente_status_check', STATUS_ENTRADA_PENDENTE],
    ['entrada_pendente_solicitante_papel_check', PAPEIS_SOLICITANTE],
    ['especificacao_tecnica_autor_tipo_check', AUTORES_ARTEFATO],
    ['parecer_risco_risco_tecnico_nivel_check', NIVEIS_RISCO],
    ['parecer_risco_risco_operacional_nivel_check', NIVEIS_RISCO],
    ['parecer_risco_risco_juridico_nivel_check', NIVEIS_RISCO],
    ['parecer_risco_autor_tipo_check', AUTORES_ARTEFATO],
    ['pacote_decisao_demanda_tipo_check', TIPOS_DEMANDA],
    ['pacote_decisao_nivel_aprovacao_requerido_check', NIVEIS_APROVACAO],
    ['pacote_decisao_autor_tipo_check', AUTORES_ARTEFATO],
    ['aprovacao_papel_aprovacao_check', PAPEIS_APROVACAO],
    ['aprovacao_opcao_check', OPCOES_DECISAO],
    ['decisao_status_decisao_check', STATUS_DECISAO],
    ['decisao_opcao_escolhida_check', OPCOES_DECISAO],
  ] as const)('%s', async (restricao, lista) => {
    const r = await b.poolMigrator.query(`select pg_get_constraintdef(oid) as def from pg_constraint where conname = $1`, [restricao]);
    expect(r.rows, restricao).toHaveLength(1);
    const valores = [...(r.rows[0].def as string).matchAll(/'([^']*)'::text/g)].map((m) => m[1]);
    expect(valores.sort()).toEqual([...lista].sort());
  });
});

// Plano de execução das consultas que as tarefas seguintes fazem a cada tela e a cada gravação. Com a tabela pequena
// o planejador prefere a varredura; desligá-la mostra se existe índice que serve à forma da consulta. O plano com
// volume (5.000 demandas) é a T35.
describe('índices das consultas críticas (EXPLAIN)', () => {
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
    ['fila sem filtro, da mais nova para a mais antiga', 'select id from demanda order by criada_em desc limit 20', [], 'demanda_criada_idx'],
    ['fila por status', 'select id from demanda where status = $1 order by criada_em desc limit 20', ['nova'], 'demanda_status_criada_idx'],
    ['fila por tipo', 'select id from demanda where tipo = $1 order by criada_em desc limit 20', ['bug'], 'demanda_tipo_criada_idx'],
    [
      'fila por linha de serviço',
      'select id from demanda where linha_servico_provavel = $1 order by criada_em desc limit 20',
      ['indefinida'],
      'demanda_linha_criada_idx',
    ],
    [
      'limite por ator na hora (C-36)',
      'select count(*) from demanda where autor_tipo = $1 and autor_id = $2 and criada_em >= $3',
      ['pessoa', 'u-ficticio', QUANDO],
      'demanda_autor_criada_idx',
    ],
    ['maior versão da ESP da demanda', 'select coalesce(max(versao), 0) from especificacao_tecnica where demanda_id = $1', [D1], 'especificacao_tecnica_demanda_versao_unique'],
    ['maior versão do RSK da demanda', 'select coalesce(max(versao), 0) from parecer_risco where demanda_id = $1', [D1], 'parecer_risco_demanda_versao_unique'],
    ['maior versão do DEC da demanda', 'select coalesce(max(versao), 0) from pacote_decisao where demanda_id = $1', [D1], 'pacote_decisao_demanda_versao_unique'],
    ['aprovações do DEC', 'select papel_aprovacao, opcao from aprovacao where pacote_decisao_id = $1', [`DEC-${D1}-v1`], 'aprovacao_pacote_papel_unique'],
    [
      'texto bruto vencido (expurgo)',
      'select demanda_id from entrada_bruta where expurgada_em is null and recebida_em < $1',
      [QUANDO],
      'entrada_bruta_a_expurgar_idx',
    ],
    ['entrada pendente vencida (expurgo)', 'select id from entrada_pendente where recebida_em < $1', [QUANDO], 'entrada_pendente_recebida_idx'],
  ])('%s sai por índice', async (_consulta, sql, valores, indice) => {
    const p = await plano(sql, valores);
    expect(p).toContain(`"Index Name":"${indice}"`);
    expect(p).not.toContain('"Node Type":"Seq Scan"');
  });
});
