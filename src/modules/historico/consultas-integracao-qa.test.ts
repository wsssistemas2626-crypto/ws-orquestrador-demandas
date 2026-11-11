// Escrito na 06-T02-testes (qa-automacao) do DEC-DEM-20261111-0016-v1. O que os testes do engenheiro deixam aberto na
// leitura do histórico (IN-02, IN-13, D-19):
//   - nome de agente gravado como integração, e nome de integração gravado como agente, não viram o outro tipo;
//   - integração da lista sem prefixo (linha que o CHECK do IN-12 recusaria) sai sem prefixo, sem lançar;
//   - prefixo gravado em evento de pessoa ou de sistema nunca sai (só a integração mostra prefixo);
//   - o ator de integração tem só as chaves tipo, integracao e prefixo;
//   - ida e volta por registrarEvento com o awave (o engenheiro fez com o construir).
// Banco real; as linhas fora das regras entram pelo migrator, com os CHECK retirados só neste banco de teste.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { relogioFixo } from '../../lib/relogio';
import type { AtorIntegracao } from '../acesso/ator';
import { listarHistorico } from './consultas';
import { registrarEvento } from './registrar';

const DEMANDA = 'DEM-20261111-0002';

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
     values ($1, $2, $3, $4, $5, 'demanda', $5, 'campo_alterado')`,
    [`2026-11-11T13:${String(minuto).padStart(2, '0')}:00Z`, atorTipo, atorId, prefixo, DEMANDA],
  );

describe('listarHistorico: cada tipo de ator pelo próprio ramo (IN-02)', () => {
  it('nome de agente gravado como integração não vira agente; nome de integração gravado como agente não vira integração', async () => {
    await inserir(1, 'integracao', 'risco', 'ficticio');
    await inserir(2, 'agente', 'awave', 'ficticio');
    const h = await listarHistorico(b.db, DEMANDA);
    expect(h.map((e) => e.ator)).toStrictEqual([{ tipo: 'sistema' }, { tipo: 'integracao', integracao: null, prefixo: null }]);
    expect(JSON.stringify(h)).not.toContain('ficticio');
  });

  it('integração da lista sem prefixo gravado sai com prefixo nulo', async () => {
    await inserir(1, 'integracao', 'awave', null);
    const [e] = await listarHistorico(b.db, DEMANDA);
    expect(e!.ator).toStrictEqual({ tipo: 'integracao', integracao: 'awave', prefixo: null });
  });

  it('prefixo gravado em evento de pessoa ou de sistema nunca sai', async () => {
    await inserir(1, 'pessoa', 'usuario-que-nao-existe', 'Ab3dE5gH');
    await inserir(2, 'sistema', 'sistema', 'Ab3dE5gH');
    const h = await listarHistorico(b.db, DEMANDA);
    expect(h.map((e) => e.ator)).toStrictEqual([{ tipo: 'sistema' }, { tipo: 'pessoa', nome: null, papel: null }]);
    expect(JSON.stringify(h)).not.toContain('Ab3dE5gH');
  });

  it('o ator de integração tem só tipo, integracao e prefixo', async () => {
    await inserir(1, 'integracao', 'construir', 'Zz9-_aB1');
    const [e] = await listarHistorico(b.db, DEMANDA);
    expect(Object.keys(e!.ator).sort()).toEqual(['integracao', 'prefixo', 'tipo']);
  });
});

describe('ida e volta por registrarEvento (IN-12, IN-13)', () => {
  it('awave gravado com o prefixo volta como a integração, com o mesmo prefixo, e a coluna tem o nome da lista', async () => {
    const awave: AtorIntegracao = { tipo: 'integracao', integracao: 'awave', prefixoToken: 'ficticio' };
    await registrarEvento(b.db, { ator: awave, demandaId: DEMANDA, entidade: 'demanda', entidadeId: DEMANDA, acao: 'demanda_criada' }, relogioFixo('2026-11-11T13:00:00Z'));
    const [e] = await listarHistorico(b.db, DEMANDA);
    expect(e!.ator).toStrictEqual({ tipo: 'integracao', integracao: 'awave', prefixo: 'ficticio' });
    const { rows } = await b.poolMigrator.query('select ator_tipo, ator_id, ator_token_prefixo from evento where demanda_id = $1', [DEMANDA]);
    expect(rows).toEqual([{ ator_tipo: 'integracao', ator_id: 'awave', ator_token_prefixo: 'ficticio' }]);
  });
});
