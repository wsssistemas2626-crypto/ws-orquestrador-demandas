// Teto de gasto mensal (RF-18, CA-18.2, RNF-07, P1-f, C-12). O gasto do mês é a soma de uso_ia.custo no mês civil de
// São Paulo, pelo relógio injetado (RNF-15); o teto nasce 0 e teto 0 é sempre suspenso. Postgres real (Testcontainers),
// com o papel do app. Cada cenário usa um mês próprio, para a soma de um não entrar na do outro. Dados só fictícios.
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { comTransacao } from '../../db/transacao';
import { deZod, ErroDominio } from '../../lib/erros';
import { relogioFixo } from '../../lib/relogio';
import type { AtorPessoa } from '../acesso/ator';
import { MENSAGENS_ACESSO } from '../acesso/mensagens';
import { definirTeto, definirTetoSchema, gastoDoMes, MENSAGENS_TETO, situacaoDoTeto } from './teto';

let b: BancoDeTeste;

const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-cto-teto', nome: 'Pessoa Ficticia', papel: 'cto' };
const ADM: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-adm-teto', nome: 'Pessoa Ficticia Adm', papel: 'administradora' };

// Uma execução do orquestrador por uso (a FK de uso_ia exige execução), sem demanda.
async function inserirUso(banco: BancoDeTeste, u: { custo: string; ocorridoEm: string }): Promise<void> {
  const e = await banco.poolMigrator.query<{ id: string }>(
    `insert into execucao_agente (agente, chave_entrada, criada_em, atualizada_em) values ('orquestrador', $1, $2, $2) returning id`,
    [`entrada:${randomUUID()}`, u.ocorridoEm],
  );
  await banco.poolMigrator.query(
    `insert into uso_ia (execucao_agente_id, agente, modelo, tokens_entrada, tokens_saida, custo, resultado, ocorrido_em) values ($1, 'orquestrador', 'modelo-ficticio', 1, 1, $2, 'sucesso', $3)`,
    [e.rows[0]!.id, u.custo, u.ocorridoEm],
  );
}

const depsCom = (iso: string) => ({ db: b.db, pool: b.poolApp, relogio: relogioFixo(iso) });
const tetoGravado = async () =>
  (await b.poolMigrator.query<{ teto_mensal: string; atualizado_por: string | null; atualizado_em: Date | null }>('select teto_mensal, atualizado_por, atualizado_em from configuracao_ia')).rows[0]!;
const eventosDoTeto = async () =>
  (
    await b.poolMigrator.query<{ ator_tipo: string; ator_id: string; demanda_id: string | null; entidade: string; entidade_id: string; antes: unknown; depois: unknown; ocorrido_em: Date }>(
      `select ator_tipo, ator_id, demanda_id, entidade, entidade_id, antes, depois, ocorrido_em from evento where acao = 'teto_alterado' order by id`,
    )
  ).rows;
const voltarTeto = (valor: string) => b.poolMigrator.query('update configuracao_ia set teto_mensal = $1 where id = 1', [valor]);

beforeAll(async () => {
  b = await novoBanco();
  await b.poolMigrator.query(`insert into "user" (id, name, email, papel) values ($1, 'Pessoa Ficticia', 'cto.teto@exemplo.test', 'cto')`, [CTO.usuarioId]);
});
afterAll(async () => {
  await b.fechar();
});

describe('gastoDoMes (RF-18)', () => {
  it('CA-18.2: no primeiro dia do mês seguinte, o gasto do mês é zero', async () => {
    await inserirUso(b, { custo: '10.000000', ocorridoEm: '2026-10-31T23:59:00-03:00' });
    expect(await gastoDoMes(b.db, relogioFixo('2026-10-31T23:59:30-03:00'))).toBe(10);
    expect(await gastoDoMes(b.db, relogioFixo('2026-11-01T00:00:00-03:00'))).toBe(0);
  });

  it('o mês começa à meia-noite de São Paulo, e não à meia-noite UTC', async () => {
    // 2027-01-01T02:30Z ainda é 31/12/2026 em São Paulo; 2027-01-01T03:00Z já é janeiro.
    await inserirUso(b, { custo: '1.500000', ocorridoEm: '2027-01-01T02:30:00Z' });
    await inserirUso(b, { custo: '0.250000', ocorridoEm: '2027-01-01T03:00:00Z' });
    expect(await gastoDoMes(b.db, relogioFixo('2026-12-31T20:00:00-03:00'))).toBe(1.5);
    expect(await gastoDoMes(b.db, relogioFixo('2027-01-01T00:00:01-03:00'))).toBe(0.25);
  });

  it('soma em 6 casas, sem perder milionésimo', async () => {
    for (const custo of ['0.000001', '0.000002', '1.100000', '2.200000']) await inserirUso(b, { custo, ocorridoEm: '2027-02-10T12:00:00-03:00' });
    expect(await gastoDoMes(b.db, relogioFixo('2027-02-28T12:00:00-03:00'))).toBe(3.300003);
  });

  it('mês sem nenhuma chamada tem gasto zero', async () => {
    expect(await gastoDoMes(b.db, relogioFixo('2027-03-15T12:00:00-03:00'))).toBe(0);
  });
});

describe('situacaoDoTeto (RF-18, RNF-07, P1-f)', () => {
  it('sistema novo: teto 0 em USD, suspenso, mês de referência e virada no fuso de São Paulo', async () => {
    const s = await situacaoDoTeto(b.db, relogioFixo('2027-03-15T12:00:00-03:00'));
    expect(s).toEqual({
      tetoMensal: 0,
      moeda: 'USD',
      gastoDoMes: 0,
      percentual: 0,
      suspenso: true,
      mesReferencia: '2027-03',
      viraEm: new Date('2027-04-01T03:00:00Z'),
    });
  });

  it('suspenso quando gasto ≥ teto; teto 0 é sempre suspenso', async () => {
    await inserirUso(b, { custo: '10.000000', ocorridoEm: '2027-04-05T12:00:00-03:00' });
    const relogio = relogioFixo('2027-04-20T12:00:00-03:00');
    try {
      await voltarTeto('10.00');
      expect(await situacaoDoTeto(b.db, relogio)).toMatchObject({ tetoMensal: 10, gastoDoMes: 10, percentual: 100, suspenso: true });
      await voltarTeto('10.01');
      expect(await situacaoDoTeto(b.db, relogio)).toMatchObject({ tetoMensal: 10.01, gastoDoMes: 10, suspenso: false });
      await voltarTeto('0');
      expect(await situacaoDoTeto(b.db, relogioFixo('2027-05-20T12:00:00-03:00'))).toMatchObject({ tetoMensal: 0, gastoDoMes: 0, percentual: 0, suspenso: true });
    } finally {
      await voltarTeto('0');
    }
  });

  it('percentual inteiro, sem arredondar para cima, e acima de 100 quando a última chamada passa do teto (RNF-07)', async () => {
    await inserirUso(b, { custo: '3.200000', ocorridoEm: '2027-06-05T12:00:00-03:00' });
    await inserirUso(b, { custo: '6.799999', ocorridoEm: '2027-06-06T12:00:00-03:00' });
    const relogio = relogioFixo('2027-06-20T12:00:00-03:00');
    try {
      await voltarTeto('10.00');
      expect(await situacaoDoTeto(b.db, relogio)).toMatchObject({ gastoDoMes: 9.999999, percentual: 99, suspenso: false });
      await inserirUso(b, { custo: '2.000001', ocorridoEm: '2027-06-07T12:00:00-03:00' });
      expect(await situacaoDoTeto(b.db, relogio)).toMatchObject({ gastoDoMes: 12, percentual: 120, suspenso: true });
    } finally {
      await voltarTeto('0');
    }
  });

  it('dezembro vira em 1º de janeiro do ano seguinte', async () => {
    expect(await situacaoDoTeto(b.db, relogioFixo('2027-12-31T23:59:59-03:00'))).toMatchObject({
      mesReferencia: '2027-12',
      viraEm: new Date('2028-01-01T03:00:00Z'),
    });
  });
});

describe('definirTetoSchema (RF-18, 03 T12)', () => {
  const mensagemDe = (tetoMensal: unknown) => {
    const r = definirTetoSchema.safeParse({ tetoMensal });
    if (r.success) return null;
    return deZod(r.error).extras.campos;
  };

  it.each(['10', '10,00', '10.00', '10,5', '0', '0,01', '1234567890,99', ' 10,00 '])('aceita %j (vírgula ou ponto)', (v) => {
    expect(definirTetoSchema.safeParse({ tetoMensal: v }).success).toBe(true);
  });

  it('teto negativo → 400 "O teto não pode ser negativo."; aceita vírgula ou ponto', () => {
    for (const v of ['-1', '-0,01', '-10.00', ' -5 ']) {
      expect(mensagemDe(v), v).toEqual([{ campo: 'tetoMensal', mensagem: 'O teto não pode ser negativo.' }]);
    }
    expect(MENSAGENS_TETO.negativo).toBe('O teto não pode ser negativo.');
  });

  it.each(['10,123', '1.000,00', 'abc', '', '1e3', '12345678901', '10,', ',5', '10 00', '+10', '-', '--1', 'SENTINELA-TEXTO-7f3a'])(
    'recusa %j com a mensagem de formato da 03',
    (v) => {
      expect(mensagemDe(v)).toEqual([{ campo: 'tetoMensal', mensagem: 'Informe o teto com até duas casas decimais, por exemplo 10,00.' }]);
    },
  );

  it('sem o campo, ou com número em vez de texto, recusa sem citar o valor', () => {
    expect(mensagemDe(undefined)).toEqual([{ campo: 'tetoMensal', mensagem: 'Campo obrigatório.' }]);
    expect(mensagemDe(10)).toEqual([{ campo: 'tetoMensal', mensagem: 'Valor inválido.' }]);
  });

  it('descarta chave desconhecida (C-11): atualizadoPor e moeda não chegam ao serviço', () => {
    const r = definirTetoSchema.parse({ tetoMensal: '10,00', atualizadoPor: 'u-outra', moeda: 'BRL' });
    expect(r).toEqual({ tetoMensal: '10,00' });
  });
});

describe('definirTeto (RF-18, C-12)', () => {
  it('o CTO define o teto com vírgula: grava em numeric, com quem e quando, e devolve a situação', async () => {
    const deps = depsCom('2027-07-10T09:00:00-03:00');
    try {
      const s = await definirTeto(deps, CTO, definirTetoSchema.parse({ tetoMensal: '12,34' }));
      expect(s).toMatchObject({ tetoMensal: 12.34, moeda: 'USD', gastoDoMes: 0, suspenso: false, mesReferencia: '2027-07' });
      expect(await tetoGravado()).toEqual({ teto_mensal: '12.34', atualizado_por: CTO.usuarioId, atualizado_em: new Date('2027-07-10T12:00:00Z') });
      const [ev] = (await eventosDoTeto()).slice(-1);
      expect(ev).toEqual({
        ator_tipo: 'pessoa',
        ator_id: CTO.usuarioId,
        demanda_id: null,
        entidade: 'configuracao_ia',
        entidade_id: '1',
        antes: { tetoMensal: 0 },
        depois: { tetoMensal: 12.34 },
        ocorrido_em: new Date('2027-07-10T12:00:00Z'),
      });
    } finally {
      await voltarTeto('0');
    }
  });

  it('o mesmo valor de novo não grava nem gera evento (idempotente)', async () => {
    const deps = depsCom('2027-07-11T09:00:00-03:00');
    try {
      await definirTeto(deps, CTO, definirTetoSchema.parse({ tetoMensal: '7.00' }));
      const antes = (await eventosDoTeto()).length;
      const gravado = await tetoGravado();
      deps.relogio.avancar(60_000);
      const s = await definirTeto(deps, CTO, definirTetoSchema.parse({ tetoMensal: '7' }));
      expect(s.tetoMensal).toBe(7);
      expect((await eventosDoTeto()).length).toBe(antes);
      expect(await tetoGravado()).toEqual(gravado);
    } finally {
      await voltarTeto('0');
    }
  });

  it('teto 0 volta a suspender os agentes', async () => {
    const deps = depsCom('2027-07-12T09:00:00-03:00');
    await definirTeto(deps, CTO, definirTetoSchema.parse({ tetoMensal: '5' }));
    const s = await definirTeto(deps, CTO, definirTetoSchema.parse({ tetoMensal: '0,00' }));
    expect(s).toMatchObject({ tetoMensal: 0, suspenso: true });
  });

  it('C-12: a administradora recebe 403 e nada muda', async () => {
    const antes = (await eventosDoTeto()).length;
    const gravado = await tetoGravado();
    const erro = await definirTeto(depsCom('2027-07-13T09:00:00-03:00'), ADM, definirTetoSchema.parse({ tetoMensal: '99' })).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroDominio);
    expect(erro).toMatchObject({ codigo: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao });
    expect(await tetoGravado()).toEqual(gravado);
    expect((await eventosDoTeto()).length).toBe(antes);
  });

  it('G3.8: na transação de quem chama, o rollback desfaz o teto e o evento', async () => {
    const antes = (await eventosDoTeto()).length;
    const gravado = await tetoGravado();
    await expect(
      comTransacao(b.poolApp, async (t) => {
        await definirTeto(depsCom('2027-07-14T09:00:00-03:00'), CTO, definirTetoSchema.parse({ tetoMensal: '42' }), t);
        throw new Error('desfazer');
      }),
    ).rejects.toThrow('desfazer');
    expect(await tetoGravado()).toEqual(gravado);
    expect((await eventosDoTeto()).length).toBe(antes);
  });
});
