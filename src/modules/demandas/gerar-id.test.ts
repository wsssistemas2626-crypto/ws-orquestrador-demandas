// Id da demanda (RF-04, CA-04.1, CA-04.2, CA-04.4, RNF-09) contra o Postgres real, pelo papel do app. A sequência é
// preparada pelo migrator (setval é dele); o relógio é sempre o fixo. Dados só fictícios.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDb } from '../../db';
import { demanda } from '../../db/schema';
import { comTransacao } from '../../db/transacao';
import { ErroDominio, MENSAGEM_ERRO_INTERNO, mapearErro } from '../../lib/erros';
import { reduzirErro } from '../../lib/reduzir-erro';
import { relogioFixo } from '../../lib/relogio';
import { RE_ID_DEMANDA as RE_ID_DEMANDA_DA_ROTA } from '../../lib/rota';
import { LIMITE_AVISO_CAPACIDADE, proximoIdDemanda, RE_ID_DEMANDA, totalDeDemandas } from './gerar-id';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

const gerar = (iso: string) => comTransacao(b.poolApp, ({ tx }) => proximoIdDemanda(tx, relogioFixo(iso)));
const definirSequencia = (n: number) => b.poolMigrator.query('select setval($1, $2)', ['demanda_seq', n]);

function linhaDemanda(id: string) {
  const agora = new Date('2026-10-22T12:00:00Z');
  return {
    id,
    titulo: 'Demanda ficticia',
    tipo: 'melhoria' as const,
    solicitanteNome: 'Pessoa Ficticia',
    autorTipo: 'pessoa' as const,
    autorId: 'u-ficticio',
    criadaEm: agora,
    atualizadaEm: agora,
  };
}

describe('id da demanda', () => {
  it('CA-04.1: data de São Paulo e sequência 41 → DEM-20261022-0042', async () => {
    await definirSequencia(41);
    // 23:30 em São Paulo já é dia 23 em UTC: vale a data civil de São Paulo.
    expect(await gerar('2026-10-22T23:30:00-03:00')).toBe('DEM-20261022-0042');
  });

  it('CA-04.1: logo depois da meia-noite em São Paulo, a data já é a do dia novo', async () => {
    await definirSequencia(1);
    expect(await gerar('2026-10-23T03:05:00Z')).toBe('DEM-20261023-0002');
  });

  it('CA-04.2: a sequência é global, não reinicia no dia seguinte', async () => {
    await definirSequencia(7);
    expect(await gerar('2026-10-23T09:00:00-03:00')).toBe('DEM-20261023-0008');
    expect(await gerar('2026-10-24T09:00:00-03:00')).toBe('DEM-20261024-0009');
  });

  it('a sequência tem sempre 4 dígitos, com zeros à esquerda', async () => {
    await definirSequencia(1);
    expect(await gerar('2026-10-22T10:00:00-03:00')).toBe('DEM-20261022-0002');
    await definirSequencia(9998);
    expect(await gerar('2026-10-22T10:00:00-03:00')).toBe('DEM-20261022-9999');
  });

  it('o id gerado passa na regex do id da demanda', async () => {
    await definirSequencia(123);
    expect(await gerar('2026-10-22T10:00:00-03:00')).toMatch(RE_ID_DEMANDA);
  });

  it('CA-04.4: com a sequência em 9999, erro claro e nada gravado', async () => {
    await definirSequencia(9999);
    const tentativa = comTransacao(b.poolApp, async ({ tx }) => {
      const id = await proximoIdDemanda(tx, relogioFixo('2026-10-23T09:00:00-03:00'));
      await tx.insert(demanda).values(linhaDemanda(id));
      return id;
    });
    await expect(tentativa).rejects.toBeInstanceOf(ErroDominio);
    await expect(tentativa).rejects.toMatchObject({
      codigo: 'capacidade_de_ids_esgotada',
      mensagem: 'Não é possível criar a demanda: o limite de 9.999 ids foi atingido. Avise o time técnico.',
    });
    expect(await totalDeDemandas(b.db)).toBe(0);
  });

  it('CA-04.4: o erro de capacidade vira 409 sem detalhe do Postgres', async () => {
    await definirSequencia(9999);
    const erro = await gerar('2026-10-23T09:00:00-03:00').catch((e: unknown) => e);
    const { status, corpo } = mapearErro(erro);
    expect(status).toBe(409);
    expect(corpo).toEqual({
      erro: 'capacidade_de_ids_esgotada',
      mensagem: 'Não é possível criar a demanda: o limite de 9.999 ids foi atingido. Avise o time técnico.',
    });
    expect(JSON.stringify(corpo)).not.toMatch(/nextval|demanda_seq|maximum/i);
  });

  it('erro do banco que não é o de capacidade não vira capacidade_de_ids_esgotada', async () => {
    await definirSequencia(10);
    const erro = await comTransacao(b.poolApp, async ({ tx }) => {
      await tx.execute('select 1/0');
      return proximoIdDemanda(tx, relogioFixo('2026-10-22T10:00:00-03:00'));
    }).catch((e: unknown) => e);
    expect(erro).not.toBeInstanceOf(ErroDominio);
    expect(mapearErro(erro).status).toBe(500);
  });

  it('dentro de uma transação já abortada, o erro original segue e não vira capacidade', async () => {
    await definirSequencia(10);
    const erro = await comTransacao(b.poolApp, async ({ tx }) => {
      await tx.execute('select 1/0').catch(() => undefined);
      return proximoIdDemanda(tx, relogioFixo('2026-10-22T10:00:00-03:00'));
    }).catch((e: unknown) => e);
    expect(erro).not.toBeInstanceOf(ErroDominio);
  });
});

describe('regex do id da demanda', () => {
  it.each(['DEM-20261022-0001', 'DEM-20261231-9999'])('aceita %s', (id) => {
    expect(RE_ID_DEMANDA.test(id)).toBe(true);
  });

  it.each(['DEM-2026102-0001', 'DEM-20261022-001', 'DEM-20261022-00001', 'dem-20261022-0001', ' DEM-20261022-0001', 'DEM-20261022-0001 ', 'ESP-DEM-20261022-0001-v1', ''])(
    'recusa %j',
    (id) => {
      expect(RE_ID_DEMANDA.test(id)).toBe(false);
    },
  );

  it('é a mesma regex que rota() usa no parâmetro de caminho (G3.10)', () => {
    expect(RE_ID_DEMANDA.source).toBe(RE_ID_DEMANDA_DA_ROTA.source);
    expect(RE_ID_DEMANDA.flags).toBe(RE_ID_DEMANDA_DA_ROTA.flags);
  });
});

// Bordas acrescentadas na 06-T14-testes (qa-automacao). Cada teste prepara a própria sequência; nenhum depende de outro.
describe('id da demanda: bordas', () => {
  const definirProximo = (n: number) => b.poolMigrator.query('select setval($1, $2, false)', ['demanda_seq', n]);

  it.each([
    [1, 'DEM-20261022-0001'],
    [9, 'DEM-20261022-0009'],
    [99, 'DEM-20261022-0099'],
    [999, 'DEM-20261022-0999'],
    [1000, 'DEM-20261022-1000'],
  ])('o número %i sai com 4 dígitos: %s', async (proximo, esperado) => {
    await definirProximo(proximo);
    expect(await gerar('2026-10-22T10:00:00-03:00')).toBe(esperado);
  });

  it('CA-04.2, como escrito: com a sequência em 7, a demanda de 22/10 e a seguinte, de 23/10, são -0007 e -0008', async () => {
    await definirProximo(7);
    expect(await gerar('2026-10-22T15:00:00-03:00')).toBe('DEM-20261022-0007');
    expect(await gerar('2026-10-23T09:00:00-03:00')).toBe('DEM-20261023-0008');
  });

  it('a data vem do relógio injetado, não da data do servidor', async () => {
    await definirProximo(5);
    expect(await gerar('2031-02-28T12:00:00-03:00')).toBe('DEM-20310228-0005');
  });

  it('virada do ano: 02:59 UTC de 01/01 ainda é 31/12 em São Paulo; 03:00 UTC já é 01/01', async () => {
    await definirProximo(30);
    expect(await gerar('2027-01-01T02:59:59Z')).toBe('DEM-20261231-0030');
    expect(await gerar('2027-01-01T03:00:00Z')).toBe('DEM-20270101-0031');
  });

  it('C-36: o número gasto numa transação desfeita não volta, e a demanda seguinte não o repete', async () => {
    await definirProximo(21);
    let desfeito = '';
    await comTransacao(b.poolApp, async ({ tx }) => {
      desfeito = await proximoIdDemanda(tx, relogioFixo('2026-10-22T10:00:00-03:00'));
      throw new Error('desfazer');
    }).catch(() => undefined);
    expect(desfeito).toBe('DEM-20261022-0021');
    expect(await gerar('2026-10-22T10:00:00-03:00')).toBe('DEM-20261022-0022');
  });

  it('CA-04.4: esgotada, a sequência continua esgotada (não volta para 0001)', async () => {
    await definirSequencia(9999);
    const motivo = { codigo: 'capacidade_de_ids_esgotada' };
    await expect(gerar('2026-10-23T09:00:00-03:00')).rejects.toMatchObject(motivo);
    await expect(gerar('2026-10-24T09:00:00-03:00')).rejects.toMatchObject(motivo);
  });

  it('CA-04.4: o banco não aceita id fora do formato, como o de 5 dígitos (CHECK do id, 23514)', async () => {
    const id = 'DEM-20261023-10000';
    const erro = await b.db
      .insert(demanda)
      .values(linhaDemanda(id))
      .catch((e: unknown) => e);
    expect(reduzirErro(erro).code).toBe('23514');
    expect(await b.db.select({ id: demanda.id }).from(demanda).where(eq(demanda.id, id))).toEqual([]);
  });

  it('transação já abortada: sobe o 25P02 do Postgres, que vira 500 genérico, sem detalhe', async () => {
    await definirSequencia(10);
    const erro = await comTransacao(b.poolApp, async ({ tx }) => {
      await tx.execute('select 1/0').catch(() => undefined);
      return proximoIdDemanda(tx, relogioFixo('2026-10-22T10:00:00-03:00'));
    }).catch((e: unknown) => e);
    expect(reduzirErro(erro).code).toBe('25P02');
    expect(mapearErro(erro)).toEqual({ status: 500, corpo: { erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO } });
  });
});

describe('capacidade de ids', () => {
  it('RNF-09: o aviso de capacidade é a partir de 9.000 demandas', () => {
    expect(LIMITE_AVISO_CAPACIDADE).toBe(9000);
  });

  it('totalDeDemandas conta as demandas gravadas, como número', async () => {
    const migrator = criarDb(b.poolMigrator);
    await migrator.delete(demanda);
    expect(await totalDeDemandas(b.db)).toBe(0);
    await migrator.insert(demanda).values([linhaDemanda('DEM-20261022-0101'), linhaDemanda('DEM-20261022-0102')]);
    const total = await totalDeDemandas(b.db);
    expect(total).toBe(2);
    expect(typeof total).toBe('number');
    await migrator.delete(demanda);
  });
});
