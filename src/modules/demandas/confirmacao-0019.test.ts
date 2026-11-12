// DEC-DEM-20261112-0019-v1, 03-correcao. B-3: só o evento `demanda_confirmada` de uma pessoa confirma a demanda do Awave.
// M-1: o helper único da visibilidade para agente e sistema (exigirVisivelPara) e a mesma regra em SQL, para a listagem
// (condicaoVisivelAoAgente), conferidas uma contra a outra. Postgres real, papel do app; o evento de outro ator entra
// pelo migrator, porque nenhum caminho do app o grava. Relógio fixo, dados fictícios.
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { atorDeIntegracao, inserirDemandaDeIntegracao } from '../../../test/integracoes';
import { demanda } from '../../db/schema';
import type { Deps } from '../../lib/deps';
import { ErroDominio, MENSAGEM_NAO_ENCONTRADO } from '../../lib/erros';
import { relogioFixo } from '../../lib/relogio';
import type { Ator, AtorPessoa } from '../acesso/ator';
import { aguardaConfirmacao, condicaoVisivelAoAgente, exigirVisivelPara, jaConfirmada } from './confirmacao';
import { confirmarDemanda } from './confirmar';
import { criarDemandaSchema } from './schemas';
import { criarDemanda } from './servico';

const AGORA = '2026-11-12T12:00:00Z';
const cto: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-0019-confirmacao', nome: 'Pessoa Ficticia 0019', papel: 'cto' };
const agente: Ator = { tipo: 'agente', agente: 'risco', prefixoToken: 'ficticio' };
const sistema: Ator = { tipo: 'sistema' };

let b: BancoDeTeste;
let deps: Deps;
let numero = 9100;

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio: relogioFixo(AGORA) });
  await b.poolMigrator.query(`insert into "user" (id, name, email, papel) values ($1, 'Pessoa Ficticia 0019', 'confirmacao-0019@exemplo.test', 'cto')`, [
    cto.usuarioId,
  ]);
});
afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});

const novaDoAwave = async (): Promise<string> => {
  const id = `DEM-20261112-${++numero}`;
  await inserirDemandaDeIntegracao(b, { id, criadaEm: new Date(AGORA) });
  return id;
};

// Pelo migrator: o evento de confirmação com um ator que nenhum caminho do app usa para ele.
const confirmacaoDe = (id: string, atorTipo: 'sistema' | 'agente' | 'integracao') =>
  b.poolMigrator.query(
    `insert into evento (ocorrido_em, ator_tipo, ator_id, ator_token_prefixo, demanda_id, entidade, entidade_id, acao, depois)
     values ($1, $2, $3, $4, $5, 'demanda', $5, 'demanda_confirmada', '{"confirmada":true}'::jsonb)`,
    [
      AGORA,
      atorTipo,
      { sistema: 'sistema', agente: 'insumo_tecnico', integracao: 'awave' }[atorTipo],
      atorTipo === 'sistema' ? null : 'ficticio',
      id,
    ],
  );

const confirmacoesDePessoa = async (id: string) =>
  Number(
    (await b.poolMigrator.query(`select count(*) as n from evento where acao = 'demanda_confirmada' and entidade_id = $1 and ator_tipo = 'pessoa'`, [id])).rows[0]
      .n,
  );

async function erroDe(p: Promise<unknown>): Promise<unknown> {
  return p.then(
    () => undefined,
    (e: unknown) => e,
  );
}

describe('B-3: jaConfirmada só aceita a confirmação de pessoa', () => {
  it.each(['sistema', 'agente', 'integracao'] as const)('demanda_confirmada gravado por %s não confirma; a pessoa confirma e grava o próprio evento', async (atorTipo) => {
    const id = await novaDoAwave();
    await confirmacaoDe(id, atorTipo);
    expect(await jaConfirmada(deps.db, id)).toBe(false);
    expect(await aguardaConfirmacao(deps.db, id)).toBe(true);

    expect(await confirmarDemanda(deps, cto, id)).toEqual({ jaConfirmada: false });
    expect(await confirmacoesDePessoa(id)).toBe(1);
    expect(await jaConfirmada(deps.db, id)).toBe(true);
    expect(await aguardaConfirmacao(deps.db, id)).toBe(false);
  });

  it('regressão: a confirmação da pessoa continua valendo, e a segunda é idempotente', async () => {
    const id = await novaDoAwave();
    expect(await confirmarDemanda(deps, cto, id)).toEqual({ jaConfirmada: false });
    expect(await confirmarDemanda(deps, cto, id)).toEqual({ jaConfirmada: true });
    expect(await confirmacoesDePessoa(id)).toBe(1);
  });
});

describe('M-1: exigirVisivelPara (P3, P4)', () => {
  it('agente e sistema: a demanda do Awave não confirmada dá o mesmo nao_encontrado do id inexistente', async () => {
    const id = await novaDoAwave();
    for (const ator of [agente, sistema]) {
      const e = await erroDe(exigirVisivelPara(deps.db, ator, id));
      expect(e).toBeInstanceOf(ErroDominio);
      expect(e).toMatchObject({ codigo: 'nao_encontrado', mensagem: MENSAGEM_NAO_ENCONTRADO, extras: {} });
    }
  });

  it('agente e sistema: o evento de sistema não abre a demanda; a confirmação da pessoa abre', async () => {
    const id = await novaDoAwave();
    await confirmacaoDe(id, 'sistema');
    await expect(exigirVisivelPara(deps.db, agente, id)).rejects.toMatchObject({ codigo: 'nao_encontrado' });
    await confirmarDemanda(deps, cto, id);
    await expect(exigirVisivelPara(deps.db, agente, id)).resolves.toBeUndefined();
    await expect(exigirVisivelPara(deps.db, sistema, id)).resolves.toBeUndefined();
  });

  it('pessoa e integração não passam pela regra; id inexistente passa (quem chama dá o 404 de sempre)', async () => {
    const id = await novaDoAwave();
    await expect(exigirVisivelPara(deps.db, cto, id)).resolves.toBeUndefined();
    await expect(exigirVisivelPara(deps.db, atorDeIntegracao('awave'), id)).resolves.toBeUndefined();
    await expect(exigirVisivelPara(deps.db, agente, 'DEM-20261112-9999')).resolves.toBeUndefined();
  });

  it('demanda de pessoa: visível ao agente sem confirmação', async () => {
    const d = await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Demanda de pessoa (fictício)', tipo: 'melhoria', solicitanteNome: 'Pessoa Ficticia' }));
    await expect(exigirVisivelPara(deps.db, agente, d.id)).resolves.toBeUndefined();
  });

  it('tipo de ator desconhecido, montado à mão, lança', async () => {
    const id = await novaDoAwave();
    await expect(exigirVisivelPara(deps.db, { tipo: 'robo' } as unknown as Ator, id)).rejects.toThrow('ator desconhecido');
  });
});

describe('M-1: condicaoVisivelAoAgente é a mesma regra de aguardaConfirmacao', () => {
  const visivelPeloSql = async (id: string) =>
    (await deps.db.select({ id: demanda.id }).from(demanda).where(and(eq(demanda.id, id), condicaoVisivelAoAgente()))).length === 1;

  it('pessoa, Awave não confirmada, Awave confirmada por pessoa e Awave com evento de sistema', async () => {
    const pessoa = (await criarDemanda(deps, cto, criarDemandaSchema.parse({ titulo: 'Outra de pessoa (fictício)', tipo: 'bug', solicitanteNome: 'Pessoa Ficticia' }))).id;
    const naoConfirmada = await novaDoAwave();
    const confirmada = await novaDoAwave();
    await confirmarDemanda(deps, cto, confirmada);
    const deSistema = await novaDoAwave();
    await confirmacaoDe(deSistema, 'sistema');

    const casos = { pessoa, naoConfirmada, confirmada, deSistema };
    const pelaFuncao: Record<string, boolean> = {};
    const peloSql: Record<string, boolean> = {};
    for (const [nome, id] of Object.entries(casos)) {
      pelaFuncao[nome] = !(await aguardaConfirmacao(deps.db, id));
      peloSql[nome] = await visivelPeloSql(id);
    }
    expect(pelaFuncao).toEqual({ pessoa: true, naoConfirmada: false, confirmada: true, deSistema: false });
    expect(peloSql).toEqual(pelaFuncao);
  });
});
