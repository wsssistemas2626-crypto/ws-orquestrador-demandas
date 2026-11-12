// DEC-DEM-20261112-0019-v1, 04-correcao, M-c: a regra em SQL (condicaoVisivelAoAgente, usada pela listagem de demandas,
// pela de DEC e pelo batimento) e a regra em TS (aguardaConfirmacao, usada por exigirVisivelPara, pelo gatilho e pelo
// worker) falham fechado do mesmo jeito para `autor_tipo` fora da lista: a demanda aguarda, mesmo com a confirmação de
// uma pessoa. O CHECK do banco não deixa gravar autoria desconhecida; este arquivo tem banco próprio, e o teste tira o
// CHECK dele (pelo migrator, dono do esquema) para simular a linha que uma migration futura poderia trazer. Dados
// fictícios.
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { demanda, execucaoAgente } from '../../db/schema';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import type { Ator } from '../acesso/ator';
import { aguardaConfirmacao, condicaoVisivelAoAgente, exigirVisivelPara, semEsperaDeConfirmacao } from './confirmacao';

const AGORA = '2026-11-12T12:00:00Z';
const DESCONHECIDA = 'DEM-20261112-9301';
const DESCONHECIDA_CONFIRMADA = 'DEM-20261112-9302';
const agente: Ator = { tipo: 'agente', agente: 'risco', prefixoToken: 'ficticio' };

let b: BancoDeTeste;

async function inserirComAutoria(id: string, autorTipo: string): Promise<void> {
  await b.poolMigrator.query(
    `insert into demanda (id, titulo, tipo, solicitante_nome, autor_tipo, autor_id, criada_em, atualizada_em)
     values ($1, 'Demanda de autoria desconhecida (fictício)', 'melhoria', 'Pessoa Ficticia', $2, 'ficticio', $3, $3)`,
    [id, autorTipo, AGORA],
  );
}

const confirmacaoDePessoa = (id: string) =>
  b.poolMigrator.query(
    `insert into evento (ocorrido_em, ator_tipo, ator_id, demanda_id, entidade, entidade_id, acao, depois)
     values ($1, 'pessoa', 'u-ficticio-0019', $2, 'demanda', $2, 'demanda_confirmada', '{"confirmada":true}'::jsonb)`,
    [AGORA, id],
  );

beforeAll(async () => {
  b = await novoBanco();
  await b.poolMigrator.query('alter table demanda drop constraint demanda_autor_tipo_check');
  await inserirComAutoria(DESCONHECIDA, 'robo');
  await inserirComAutoria(DESCONHECIDA_CONFIRMADA, 'robo');
  await confirmacaoDePessoa(DESCONHECIDA_CONFIRMADA);
});
afterAll(async () => {
  await b.fechar();
});

const visivelPeloSql = async (id: string) =>
  (await b.db.select({ id: demanda.id }).from(demanda).where(and(eq(demanda.id, id), condicaoVisivelAoAgente()))).length === 1;

describe('M-c: autoria fora da lista, nas duas regras', () => {
  it.each([
    ['sem confirmação', DESCONHECIDA],
    ['com a confirmação de uma pessoa', DESCONHECIDA_CONFIRMADA],
  ])('%s: aguarda pela regra TS e não é visível pela regra SQL', async (_rotulo, id) => {
    expect(await aguardaConfirmacao(b.db, id)).toBe(true);
    expect(await visivelPeloSql(id)).toBe(false);
  });

  it('exigirVisivelPara dá ao agente o 404 do inexistente nos dois casos', async () => {
    for (const id of [DESCONHECIDA, DESCONHECIDA_CONFIRMADA]) {
      const e = await exigirVisivelPara(b.db, agente, id).then(
        () => undefined,
        (x: unknown) => x,
      );
      expect(e).toBeInstanceOf(ErroDominio);
      expect(e).toMatchObject({ codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO });
    }
  });

  it('o batimento trata a execução dessa demanda como em espera (a mesma regra)', async () => {
    const id = await b.poolMigrator.query<{ id: string }>(
      `insert into execucao_agente (agente, chave_entrada, demanda_id, status, tentativas, criada_em, atualizada_em)
       values ('insumo_tecnico', $1, $2, 'pendente', 0, $3, $3) returning id`,
      [`demanda:${DESCONHECIDA_CONFIRMADA}`, DESCONHECIDA_CONFIRMADA, AGORA],
    );
    const livres = await b.db
      .select({ id: execucaoAgente.id })
      .from(execucaoAgente)
      .where(and(eq(execucaoAgente.id, id.rows[0]!.id), semEsperaDeConfirmacao(execucaoAgente.demandaId)));
    expect(livres).toEqual([]);
  });
});
