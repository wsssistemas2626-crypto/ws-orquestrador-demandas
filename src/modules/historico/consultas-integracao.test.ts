// T02 do DEC-DEM-20261111-0016-v1 (IN-02, IN-13, D-19): o ato da integração aparece no histórico como ela, com o
// prefixo do token só se casar ^[A-Za-z0-9_-]{8}$; nunca como "Sistema" nem como agente. O agente continua sem prefixo.
// Banco real, papel do app na leitura; os eventos fora do formato entram pelo migrator, com o CHECK do IN-12 retirado só
// neste banco de teste, para provar a leitura de uma linha que o banco de verdade recusaria.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { relogioFixo } from '../../lib/relogio';
import type { AtorAgente, AtorIntegracao } from '../acesso/ator';
import { listarHistorico } from './consultas';
import { registrarEvento } from './registrar';

const DEMANDA = 'DEM-20261111-0001';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
  await b.poolMigrator.query('alter table evento drop constraint evento_ator_integracao_check');
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(async () => {
  await b.poolMigrator.query('truncate evento');
});

const inserir = (minuto: number, atorTipo: string, atorId: string, prefixo: string | null) =>
  b.poolMigrator.query(
    `insert into evento (ocorrido_em, ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, entidade_id, acao)
     values ($1, $2, $3, $4, $5, 'demanda', $5, 'demanda_criada')`,
    [`2026-11-11T12:${String(minuto).padStart(2, '0')}:00Z`, atorTipo, atorId, prefixo, DEMANDA],
  );

describe('listarHistorico com ator de integração', () => {
  it('awave com prefixo válido; construir com prefixo fora do formato; integração fora da lista; agente sem prefixo', async () => {
    await inserir(1, 'integracao', 'awave', 'ficticio');
    await inserir(2, 'integracao', 'construir', 'abc');
    await inserir(3, 'integracao', 'jarvis', 'ficticio');
    await inserir(4, 'agente', 'risco', 'Ab3dE5gH');
    const h = await listarHistorico(b.db, DEMANDA);
    expect(h.map((e) => e.ator)).toEqual([
      { tipo: 'agente', agente: 'risco' },
      { tipo: 'integracao', integracao: null, prefixo: null },
      { tipo: 'integracao', integracao: 'construir', prefixo: null },
      { tipo: 'integracao', integracao: 'awave', prefixo: 'ficticio' },
    ]);
  });

  it('integração fora da lista não mostra o prefixo, mesmo no formato', async () => {
    await inserir(1, 'integracao', 'jarvis', 'Ab3dE5gH');
    const h = await listarHistorico(b.db, DEMANDA);
    expect(h[0]!.ator).toEqual({ tipo: 'integracao', integracao: null, prefixo: null });
    expect(JSON.stringify(h)).not.toContain('Ab3dE5gH');
    expect(JSON.stringify(h)).not.toContain('jarvis');
  });

  it('prefixo com caractere fora do formato, ou longo demais, não sai', async () => {
    await inserir(1, 'integracao', 'awave', '<b>x</b>');
    await inserir(2, 'integracao', 'awave', 'wsod_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    const h = await listarHistorico(b.db, DEMANDA);
    expect(h.map((e) => e.ator)).toEqual([
      { tipo: 'integracao', integracao: 'awave', prefixo: null },
      { tipo: 'integracao', integracao: 'awave', prefixo: null },
    ]);
  });

  it('o evento gravado por registrarEvento com AtorIntegracao volta como a integração, com o prefixo', async () => {
    const construir: AtorIntegracao = { tipo: 'integracao', integracao: 'construir', prefixoToken: 'Zz9-_aB1' };
    await registrarEvento(b.db, { ator: construir, demandaId: DEMANDA, entidade: 'demanda', entidadeId: DEMANDA, acao: 'demanda_criada' }, relogioFixo('2026-11-11T12:00:00Z'));
    const [e] = await listarHistorico(b.db, DEMANDA);
    expect(e!.ator).toEqual({ tipo: 'integracao', integracao: 'construir', prefixo: 'Zz9-_aB1' });
  });

  it('C-09 continua: o agente com prefixo gravado sai sem ele', async () => {
    const agente: AtorAgente = { tipo: 'agente', agente: 'consolidacao', prefixoToken: 'Ab3dE5gH' };
    await registrarEvento(b.db, { ator: agente, demandaId: DEMANDA, entidade: 'demanda', entidadeId: DEMANDA, acao: 'falha_agente' }, relogioFixo('2026-11-11T12:00:00Z'));
    const h = await listarHistorico(b.db, DEMANDA);
    expect(h[0]!.ator).toEqual({ tipo: 'agente', agente: 'consolidacao' });
    expect(JSON.stringify(h)).not.toContain('Ab3dE5gH');
  });

  it('tipo de ator desconhecido continua como sistema', async () => {
    await b.poolMigrator.query('alter table evento drop constraint if exists evento_ator_tipo_check');
    await inserir(1, 'robo', 'x', 'ficticio');
    const [e] = await listarHistorico(b.db, DEMANDA);
    expect(e!.ator).toEqual({ tipo: 'sistema' });
  });
});
