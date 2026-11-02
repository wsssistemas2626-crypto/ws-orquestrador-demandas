// Tabela evento (RF-21, parte da T04): o que o banco garante, provado com o papel do app. Dados só fictícios.
// Testes da etapa 06-T04-testes (qa-automacao).
import { asc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { evento, type AtorTipo } from './historico';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(async () => {
  await b.poolMigrator.query('truncate evento');
});

const OCORRIDO_EM = new Date('2026-10-22T12:00:00Z');
const base = { ocorridoEm: OCORRIDO_EM, atorTipo: 'pessoa' as AtorTipo, atorId: 'u-qa', entidade: 'demanda', entidadeId: 'DEM-20261022-0001', acao: 'criacao' };
const codigo = (e: unknown) => (e as { code?: string; cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code;
const falhaDe = (p: Promise<unknown>) => p.then(() => 'gravou', codigo);

describe('evento: só inclusão, com o ator identificado (RF-21)', () => {
  it.each(['pessoa', 'agente', 'sistema'] as const)('grava e lê de volta um evento de ator %s, com antes e depois em jsonb', async (atorTipo) => {
    const [gravado] = await b.db
      .insert(evento)
      .values({
        ...base,
        atorTipo,
        atorTokenPrefixo: atorTipo === 'agente' ? 'wsod_qa0' : null,
        demandaId: 'DEM-20261022-0001',
        antes: { status: 'nova' },
        depois: { status: 'em_analise', versao: 2, lista: ['a', 'b'] },
      })
      .returning();
    expect(gravado).toEqual({
      id: expect.any(Number),
      ocorridoEm: OCORRIDO_EM,
      atorTipo,
      atorId: 'u-qa',
      atorTokenPrefixo: atorTipo === 'agente' ? 'wsod_qa0' : null,
      demandaId: 'DEM-20261022-0001',
      entidade: 'demanda',
      entidadeId: 'DEM-20261022-0001',
      acao: 'criacao',
      antes: { status: 'nova' },
      depois: { status: 'em_analise', versao: 2, lista: ['a', 'b'] },
    });
  });

  it('evento de configuração fica sem demanda, sem prefixo de token e sem antes nem depois', async () => {
    const [gravado] = await b.db.insert(evento).values({ ...base, atorTipo: 'sistema', atorId: 'sistema', entidade: 'configuracao', entidadeId: 'teto', acao: 'suspensao_por_teto' }).returning();
    expect(gravado).toMatchObject({ demandaId: null, atorTokenPrefixo: null, antes: null, depois: null });
  });

  it('o id vem do banco, em ordem crescente de inclusão', async () => {
    const ids: number[] = [];
    for (let i = 0; i < 3; i++) {
      const [r] = await b.db.insert(evento).values(base).returning({ id: evento.id });
      ids.push(r!.id);
    }
    expect([...ids].sort((x, y) => x - y)).toEqual(ids);
    expect(new Set(ids).size).toBe(3);
  });

  it('o app não escolhe o id do evento (GENERATED ALWAYS: 428C9)', async () => {
    await expect(
      b.poolApp.query(`insert into evento (id, ocorrido_em, ator_tipo, ator_id, entidade, entidade_id, acao) values (999, $1, 'sistema', 'sistema', 't', 'x', 't')`, [OCORRIDO_EM]),
    ).rejects.toMatchObject({ code: '428C9' });
  });

  it('ocorrido_em não tem padrão no banco: sem a data do Relogio, a inclusão é recusada (23502, G3.4)', async () => {
    await expect(b.poolApp.query(`insert into evento (ator_tipo, ator_id, entidade, entidade_id, acao) values ('sistema', 'sistema', 't', 'x', 't')`)).rejects.toMatchObject({
      code: '23502',
    });
  });

  it.each(['ator_tipo', 'ator_id', 'entidade', 'entidade_id', 'acao'])('%s é obrigatório (23502)', async (coluna) => {
    const valores: Record<string, unknown> = { ocorrido_em: OCORRIDO_EM, ator_tipo: 'sistema', ator_id: 'sistema', entidade: 't', entidade_id: 'x', acao: 't', [coluna]: null };
    const colunas = Object.keys(valores);
    await expect(
      b.poolApp.query(`insert into evento (${colunas.join(', ')}) values (${colunas.map((_, i) => `$${i + 1}`).join(', ')})`, Object.values(valores)),
    ).rejects.toMatchObject({ code: '23502', column: coluna });
  });

  it.each(['Pessoa', 'humano', '', 'agente '])('ator_tipo fora de pessoa, agente e sistema (%j) é recusado (23514)', async (atorTipo) => {
    expect(await falhaDe(b.db.insert(evento).values({ ...base, atorTipo: atorTipo as AtorTipo }))).toBe('23514');
  });

  it('o histórico de uma demanda sai pelo índice (demanda_id, ocorrido_em), nessa ordem de colunas', async () => {
    const [idx] = (await b.poolMigrator.query(`select indexdef from pg_indexes where schemaname = 'public' and tablename = 'evento' and indexname = 'evento_demanda_ocorrido_idx'`)).rows;
    expect(idx?.indexdef).toMatch(/\(demanda_id, ocorrido_em\)$/);
  });

  it('a leitura do histórico de uma demanda traz só os eventos dela, em ordem de ocorrência', async () => {
    const em = (iso: string) => new Date(iso);
    await b.db.insert(evento).values([
      { ...base, demandaId: 'DEM-20261022-0002', ocorridoEm: em('2026-10-22T12:00:02Z'), acao: 'terceiro' },
      { ...base, demandaId: 'DEM-20261022-0002', ocorridoEm: em('2026-10-22T12:00:00Z'), acao: 'primeiro' },
      { ...base, demandaId: 'DEM-20261022-0003', ocorridoEm: em('2026-10-22T12:00:01Z'), acao: 'de-outra-demanda' },
      { ...base, demandaId: 'DEM-20261022-0002', ocorridoEm: em('2026-10-22T12:00:01Z'), acao: 'segundo' },
    ]);
    const r = await b.db.select({ acao: evento.acao }).from(evento).where(eq(evento.demandaId, 'DEM-20261022-0002')).orderBy(asc(evento.ocorridoEm));
    expect(r.map((x) => x.acao)).toEqual(['primeiro', 'segundo', 'terceiro']);
  });
});
