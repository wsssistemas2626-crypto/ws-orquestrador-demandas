// Testes da etapa 06-T23-testes (qa-automacao): bordas do teto de gasto que os testes da construção não pegam. A
// fronteira exata do mês, o fim da suspensão (RF-18: "acaba quando o teto sobe acima do gasto ou o mês vira"), o
// percentual coerente com a suspensão em valores sem representação binária exata e a concorrência real entre duas
// alterações do teto, com a espera pela trava conferida no banco, sem depender de tempo. Postgres real
// (Testcontainers), papel do app, relógio fixo (RNF-15). Cada cenário usa um mês próprio. Dados só fictícios.
import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { comTransacao } from '../../db/transacao';
import { relogioFixo } from '../../lib/relogio';
import type { AtorPessoa } from '../acesso/ator';
import { definirTeto, definirTetoSchema, gastoDoMes, situacaoDoTeto, type SituacaoTeto } from './teto';

let b: BancoDeTeste;

const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-cto-teto-bordas', nome: 'Pessoa Ficticia', papel: 'cto' };

async function inserirUso(custo: string, ocorridoEm: string): Promise<void> {
  const e = await b.poolMigrator.query<{ id: string }>(
    `insert into execucao_agente (agente, chave_entrada, criada_em, atualizada_em) values ('orquestrador', $1, $2, $2) returning id`,
    [`entrada:${randomUUID()}`, ocorridoEm],
  );
  await b.poolMigrator.query(
    `insert into uso_ia (execucao_agente_id, agente, modelo, tokens_entrada, tokens_saida, custo, resultado, ocorrido_em) values ($1, 'orquestrador', 'modelo-ficticio', 1, 1, $2, 'sucesso', $3)`,
    [e.rows[0]!.id, custo, ocorridoEm],
  );
}

const depsCom = (iso: string) => ({ db: b.db, pool: b.poolApp, relogio: relogioFixo(iso) });
const teto = (v: string) => definirTetoSchema.parse({ tetoMensal: v });
const voltarTeto = (valor: string) => b.poolMigrator.query('update configuracao_ia set teto_mensal = $1 where id = 1', [valor]);
const tetoGravado = async () => (await b.poolMigrator.query<{ teto_mensal: string }>('select teto_mensal from configuracao_ia')).rows[0]!.teto_mensal;
const eventosDoTeto = async () =>
  (await b.poolMigrator.query<{ antes: unknown; depois: unknown }>(`select antes, depois from evento where acao = 'teto_alterado' order by id`)).rows;

// Conexões do banco deste arquivo paradas esperando uma trava (linha travada por outra transação).
const esperandoTrava = async () =>
  (await b.poolMigrator.query<{ n: number }>(`select count(*)::int as n from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'`))
    .rows[0]!.n;

beforeAll(async () => {
  b = await novoBanco();
  await b.poolMigrator.query(`insert into "user" (id, name, email, papel) values ($1, 'Pessoa Ficticia', 'cto.teto.bordas@exemplo.test', 'cto')`, [CTO.usuarioId]);
});
afterAll(async () => {
  await b.fechar();
});
afterEach(async () => {
  await voltarTeto('0');
  await b.poolMigrator.query(`delete from evento where acao = 'teto_alterado'`);
});

describe('gastoDoMes: fronteira exata do mês civil de São Paulo (CA-18.2)', () => {
  it('a chamada à meia-noite em ponto do dia 1º conta no mês novo e não no anterior', async () => {
    await inserirUso('2.000000', '2028-03-01T00:00:00.000-03:00');
    await inserirUso('0.500000', '2028-02-29T23:59:59.999-03:00');
    expect(await gastoDoMes(b.db, relogioFixo('2028-02-29T23:59:59.999-03:00'))).toBe(0.5);
    expect(await gastoDoMes(b.db, relogioFixo('2028-03-01T00:00:00.000-03:00'))).toBe(2);
    expect(await gastoDoMes(b.db, relogioFixo('2028-03-31T23:59:59.999-03:00'))).toBe(2);
  });

  it('chamada gravada com data no mês seguinte não entra no gasto do mês corrente', async () => {
    await inserirUso('7.000000', '2028-05-01T00:00:00-03:00');
    expect(await gastoDoMes(b.db, relogioFixo('2028-04-15T12:00:00-03:00'))).toBe(0);
  });
});

describe('fim da suspensão (RF-18)', () => {
  it('teto atingido suspende; subir o teto acima do gasto tira a suspensão na hora', async () => {
    await inserirUso('10.000000', '2028-06-05T12:00:00-03:00');
    const deps = depsCom('2028-06-10T09:00:00-03:00');
    expect(await definirTeto(deps, CTO, teto('10,00'))).toMatchObject({ gastoDoMes: 10, percentual: 100, suspenso: true });
    expect(await definirTeto(deps, CTO, teto('10,01'))).toMatchObject({ tetoMensal: 10.01, gastoDoMes: 10, percentual: 99, suspenso: false });
    // Baixar o teto para menos que o gasto volta a suspender.
    expect(await definirTeto(deps, CTO, teto('9,99'))).toMatchObject({ tetoMensal: 9.99, percentual: 100, suspenso: true });
  });

  it('com o mesmo teto, a suspensão acaba quando o mês vira', async () => {
    await voltarTeto('5.00');
    await inserirUso('6.000000', '2028-07-20T12:00:00-03:00');
    expect(await situacaoDoTeto(b.db, relogioFixo('2028-07-31T23:59:59-03:00'))).toMatchObject({ gastoDoMes: 6, percentual: 120, suspenso: true, mesReferencia: '2028-07' });
    expect(await situacaoDoTeto(b.db, relogioFixo('2028-08-01T00:00:00-03:00'))).toEqual({
      tetoMensal: 5,
      moeda: 'USD',
      gastoDoMes: 0,
      percentual: 0,
      suspenso: false,
      mesReferencia: '2028-08',
      viraEm: new Date('2028-09-01T03:00:00Z'),
    });
  });

  it('a situação devolvida pela alteração já soma o gasto do mês', async () => {
    await inserirUso('1.234567', '2028-09-02T12:00:00-03:00');
    const s = await definirTeto(depsCom('2028-09-03T12:00:00-03:00'), CTO, teto('2'));
    expect(s).toEqual({
      tetoMensal: 2,
      moeda: 'USD',
      gastoDoMes: 1.234567,
      percentual: 61,
      suspenso: false,
      mesReferencia: '2028-09',
      viraEm: new Date('2028-10-01T03:00:00Z'),
    });
  });
});

describe('percentual coerente com a suspensão, em valores sem representação binária exata (RNF-07)', () => {
  // Gasto igual ao teto: 100 e suspenso. Um milionésimo abaixo: 99 e não suspenso. Nunca "100 %" com os agentes rodando
  // nem "99 %" com eles suspensos.
  const TETOS = ['0.01', '0.07', '0.10', '0.29', '0.30', '1.15', '10.01', '33.33', '99.99', '1234.56'];
  const menosUmMilionesimo = (v: string) => (Math.round(Number(v) * 1_000_000) - 1).toString().padStart(7, '0').replace(/(\d{6})$/, '.$1');

  it.each(TETOS.map((t, i) => [t, i] as const))('teto %s', async (valorTeto, i) => {
    await voltarTeto(valorTeto);
    const ano = 2030 + i;
    await inserirUso(valorTeto, `${ano}-01-10T12:00:00-03:00`);
    await inserirUso(menosUmMilionesimo(valorTeto), `${ano}-02-10T12:00:00-03:00`);
    const igual: SituacaoTeto = await situacaoDoTeto(b.db, relogioFixo(`${ano}-01-20T12:00:00-03:00`));
    const abaixo: SituacaoTeto = await situacaoDoTeto(b.db, relogioFixo(`${ano}-02-20T12:00:00-03:00`));
    expect({ percentual: igual.percentual, suspenso: igual.suspenso }, 'gasto = teto').toEqual({ percentual: 100, suspenso: true });
    expect({ percentual: abaixo.percentual, suspenso: abaixo.suspenso }, 'gasto = teto - 0,000001').toEqual({ percentual: 99, suspenso: false });
  });

  it('o ajudante do caso gera o milionésimo abaixo certo', () => {
    expect(['0.01', '0.29', '1234.56'].map(menosUmMilionesimo)).toEqual(['0.009999', '0.289999', '1234.559999']);
  });
});

describe('definirTeto sob concorrência (FOR UPDATE)', () => {
  it('a segunda alteração espera a primeira e o "antes" do evento dela é o valor que a primeira gravou', async () => {
    const deps = depsCom('2028-11-10T09:00:00-03:00');
    let liberar!: () => void;
    const segurar = new Promise<void>((r) => {
      liberar = r;
    });
    let primeiraGravou = false;
    const primeira = comTransacao(b.poolApp, async (t) => {
      const s = await definirTeto(deps, CTO, teto('5'), t);
      primeiraGravou = true;
      await segurar;
      return s;
    });
    await expect.poll(() => primeiraGravou, { timeout: 5_000 }).toBe(true);

    const segunda = definirTeto(deps, CTO, teto('6,50'));
    await expect.poll(esperandoTrava, { timeout: 5_000 }).toBe(1);
    liberar();
    await primeira;
    expect(await segunda).toMatchObject({ tetoMensal: 6.5 });

    expect(await eventosDoTeto()).toEqual([
      { antes: { tetoMensal: 0 }, depois: { tetoMensal: 5 } },
      { antes: { tetoMensal: 5 }, depois: { tetoMensal: 6.5 } },
    ]);
    expect(await tetoGravado()).toBe('6.50');
  });

  it('duas alterações para o mesmo valor ao mesmo tempo: só a primeira grava e gera evento', async () => {
    const deps = depsCom('2028-11-11T09:00:00-03:00');
    let liberar!: () => void;
    const segurar = new Promise<void>((r) => {
      liberar = r;
    });
    let primeiraGravou = false;
    const primeira = comTransacao(b.poolApp, async (t) => {
      await definirTeto(deps, CTO, teto('8'), t);
      primeiraGravou = true;
      await segurar;
    });
    await expect.poll(() => primeiraGravou, { timeout: 5_000 }).toBe(true);

    const segunda = definirTeto(deps, CTO, teto('8,00'));
    await expect.poll(esperandoTrava, { timeout: 5_000 }).toBe(1);
    liberar();
    await primeira;
    expect(await segunda).toMatchObject({ tetoMensal: 8 });
    expect(await eventosDoTeto()).toEqual([{ antes: { tetoMensal: 0 }, depois: { tetoMensal: 8 } }]);
  });
});

describe('definirTeto: limites do numeric(12, 2)', () => {
  it('o maior teto do formato grava sem perder centavo', async () => {
    const s = await definirTeto(depsCom('2028-12-01T09:00:00-03:00'), CTO, teto('9999999999,99'));
    expect(s.tetoMensal).toBe(9_999_999_999.99);
    expect(await tetoGravado()).toBe('9999999999.99');
    expect(await eventosDoTeto()).toEqual([{ antes: { tetoMensal: 0 }, depois: { tetoMensal: 9_999_999_999.99 } }]);
  });

  it('zeros à esquerda e uma casa só gravam o mesmo número', async () => {
    const deps = depsCom('2028-12-02T09:00:00-03:00');
    await definirTeto(deps, CTO, teto('0010,5'));
    expect(await tetoGravado()).toBe('10.50');
    await definirTeto(deps, CTO, teto('10.50'));
    expect(await eventosDoTeto()).toEqual([{ antes: { tetoMensal: 0 }, depois: { tetoMensal: 10.5 } }]);
  });
});
