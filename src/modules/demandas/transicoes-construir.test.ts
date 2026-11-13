// src/modules/demandas/transicoes-construir.test.ts — ADR-34, AN-04 e AN-11: só duas transições do /construir, pelo ator
// integração construir, com status_alterado com ator e prefixo; nunca entregue nem encerrada; MANUAIS intacta. Postgres
// real, relógio fixo, demanda gravada pelo migrator. Dados fictícios.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { atorDeIntegracao } from '../../../test/integracoes';
import { comTransacao } from '../../db/transacao';
import { relogioFixo } from '../../lib/relogio';
import type { Ator } from '../acesso/ator';
import { AUTOMATICAS_DO_CONSTRUIR, CONTRADIZ_STATUS_FINAL, mudarStatusPeloConstruir, transicoesManuaisDe, transicaoDoConstruir } from './transicoes';
import type { Status, Tipo } from './schemas';

const relogio = relogioFixo('2026-11-12T12:00:00Z');
let b: BancoDeTeste;
let n = 0;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

async function demandaEm(status: Status, tipo: Tipo = 'melhoria') {
  const id = `DEM-20261112-${String(++n).padStart(4, '0')}`;
  await b.poolMigrator.query(
    `insert into demanda (id, titulo, tipo, status, solicitante_nome, autor_tipo, autor_id, criada_em, atualizada_em) values ($1, 'Demanda ficticia', $2, $3, 'Pessoa Ficticia', 'pessoa', 'u-ficticio', '2026-11-12T10:00:00Z', '2026-11-12T10:00:00Z')`,
    [id, tipo, status],
  );
  return { id, status, tipo };
}
const mudar = (ator: Ator, d: { id: string; status: Status; tipo: Tipo }, sc: 'em_construcao' | 'construido' | 'cancelado') =>
  comTransacao(b.poolApp, (t) => mudarStatusPeloConstruir(t, { relogio }, ator, d, sc));
const linha = async (id: string) =>
  (await b.poolMigrator.query(`select status, atualizada_em from demanda where id = $1`, [id])).rows[0] as { status: string; atualizada_em: Date };
const eventos = async (id: string) =>
  (await b.poolMigrator.query(`select ator_tipo, ator_id, ator_token_prefixo, entidade, acao, antes, depois from evento where demanda_id = $1 order by id`, [id])).rows;

describe('tabelas do construir', () => {
  it('exatamente as duas automáticas, e a contradição com status final da spec 2.1', () => {
    expect(AUTOMATICAS_DO_CONSTRUIR).toEqual({ em_construcao: { de: 'aprovada', para: 'em_construcao' }, cancelado: { de: 'em_construcao', para: 'devolvida' } });
    expect(CONTRADIZ_STATUS_FINAL).toEqual({ entregue: ['em_construcao', 'cancelado'], encerrada: ['em_construcao', 'construido'] });
    expect(Object.isFrozen(AUTOMATICAS_DO_CONSTRUIR)).toBe(true);
  });
  it('transicaoDoConstruir: estudo não vai para construção; construido nunca muda', () => {
    expect(transicaoDoConstruir({ status: 'aprovada', tipo: 'melhoria' }, 'em_construcao')).toBe('em_construcao');
    expect(transicaoDoConstruir({ status: 'aprovada', tipo: 'estudo' }, 'em_construcao')).toBeNull();
    expect(transicaoDoConstruir({ status: 'em_construcao', tipo: 'melhoria' }, 'cancelado')).toBe('devolvida');
    expect(transicaoDoConstruir({ status: 'em_construcao', tipo: 'melhoria' }, 'construido')).toBeNull();
  });
  it('CA-05.11: MANUAIS não muda (as opções da devolvida continuam em_construcao e em_analise)', () => {
    expect(transicoesManuaisDe('devolvida')).toEqual(['em_construcao', 'em_analise']);
    expect(transicoesManuaisDe('em_construcao')).toEqual(['entregue', 'devolvida']);
  });
});

describe('mudarStatusPeloConstruir', () => {
  it('aprovada + em_construcao → em_construcao, atualizada_em do relógio e status_alterado do construir com prefixo', async () => {
    const d = await demandaEm('aprovada');
    expect(await mudar(atorDeIntegracao('construir'), d, 'em_construcao')).toBe('em_construcao');
    expect(await linha(d.id)).toEqual({ status: 'em_construcao', atualizada_em: relogio.agora() });
    expect(await eventos(d.id)).toEqual([
      { ator_tipo: 'integracao', ator_id: 'construir', ator_token_prefixo: 'ficticio', entidade: 'demanda', acao: 'status_alterado', antes: { status: 'aprovada' }, depois: { status: 'em_construcao' } },
    ]);
  });
  it('em_construcao + cancelado → devolvida', async () => {
    const d = await demandaEm('em_construcao');
    expect(await mudar(atorDeIntegracao('construir'), d, 'cancelado')).toBe('devolvida');
    expect((await linha(d.id)).status).toBe('devolvida');
  });
  it('sem regra (construido, estudo, outra origem): não toca a demanda nem grava evento', async () => {
    for (const [status, tipo, sc] of [['em_construcao', 'melhoria', 'construido'], ['aprovada', 'estudo', 'em_construcao'], ['devolvida', 'melhoria', 'em_construcao']] as const) {
      const d = await demandaEm(status, tipo);
      const antes = await linha(d.id);
      expect(await mudar(atorDeIntegracao('construir'), d, sc)).toBeNull();
      expect(await linha(d.id)).toEqual(antes);
      expect(await eventos(d.id)).toEqual([]);
    }
  });
  it.each<[string, Ator]>([
    ['awave', atorDeIntegracao('awave')],
    ['sistema', { tipo: 'sistema' }],
    ['pessoa', { tipo: 'pessoa', usuarioId: 'u-ficticio', nome: 'Pessoa Ficticia', papel: 'cto' }],
    ['agente', { tipo: 'agente', agente: 'orquestrador', prefixoToken: 'ficticio' }],
  ])('%s lança antes de tocar o banco', async (_n, ator) => {
    const d = await demandaEm('aprovada');
    await expect(mudar(ator, d, 'em_construcao')).rejects.toThrow();
    expect((await linha(d.id)).status).toBe('aprovada');
  });
});
