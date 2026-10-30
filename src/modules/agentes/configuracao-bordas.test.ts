// Testes da etapa 06-T23-testes (qa-automacao): bordas do interruptor que os testes da construção não pegam. Desligar
// funciona sempre, inclusive com o modelo sem preço (é o freio de emergência); a troca de modelo de agente ligado com
// preço vigente; a falha de ligar que não mexe em nada; e a concorrência real entre duas mudanças do mesmo agente, com a
// espera pela trava conferida no banco, sem depender de tempo. Postgres real (Testcontainers), papel do app, relógio
// fixo (RNF-15). Dados só fictícios.
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { comTransacao } from '../../db/transacao';
import { ErroDominio } from '../../lib/erros';
import { relogioFixo, type RelogioFixo } from '../../lib/relogio';
import type { Agente, AtorPessoa } from '../acesso/ator';
import { alterarAgente, alterarAgenteSchema, listarConfiguracaoAgentes } from './configuracao';

let b: BancoDeTeste;
let relogio: RelogioFixo;

const CTO: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-cto-config-bordas', nome: 'Pessoa Ficticia', papel: 'cto' };
const AGORA = '2026-10-22T12:00:00Z';

const deps = () => ({ db: b.db, pool: b.poolApp, relogio });
const corpo = (c: unknown) => alterarAgenteSchema.parse(c);

const linhaDo = async (agente: Agente) =>
  (
    await b.poolMigrator.query<{ ligado: boolean; modelo: string | null; atualizado_em: Date | null; atualizado_por: string | null }>(
      'select ligado, modelo, atualizado_em, atualizado_por from configuracao_agente where agente = $1',
      [agente],
    )
  ).rows[0]!;
const todas = async () => (await b.poolMigrator.query('select agente, ligado, modelo, atualizado_em, atualizado_por from configuracao_agente order by agente')).rows;
const eventosDo = async (agente: Agente) =>
  (
    await b.poolMigrator.query<{ acao: string; antes: unknown; depois: unknown }>(
      `select acao, antes, depois from evento where entidade = 'configuracao_agente' and entidade_id = $1 order by id`,
      [agente],
    )
  ).rows;
const esperandoTrava = async () =>
  (await b.poolMigrator.query<{ n: number }>(`select count(*)::int as n from pg_stat_activity where datname = current_database() and wait_event_type = 'Lock'`))
    .rows[0]!.n;

beforeAll(async () => {
  b = await novoBanco();
  await b.poolMigrator.query(`insert into "user" (id, name, email, papel) values ($1, 'Pessoa Ficticia', 'cto.config.bordas@exemplo.test', 'cto')`, [CTO.usuarioId]);
  await b.poolMigrator.query(
    'insert into preco_modelo (modelo, preco_entrada_por_milhao, preco_saida_por_milhao, vigente_desde) values ($1, 3, 15, $2), ($3, 1, 5, $2)',
    ['modelo-ficticio', '2026-10-01T03:00:00Z', 'modelo-ficticio-2'],
  );
});
afterAll(async () => {
  await b.fechar();
});
beforeEach(async () => {
  relogio = relogioFixo(AGORA);
  await b.poolMigrator.query('update configuracao_agente set ligado = false, modelo = null, atualizado_em = null, atualizado_por = null');
  await b.poolMigrator.query(`delete from evento where entidade = 'configuracao_agente'`);
});

describe('desligar funciona sempre (RF-19)', () => {
  it('agente ligado com modelo que não tem preço vigente desliga, e o modelo fica', async () => {
    // Estado que o app não cria, mas o banco aceita (por exemplo, preço apagado à mão pelo migrator).
    await b.poolMigrator.query(`update configuracao_agente set ligado = true, modelo = 'modelo-sem-preco' where agente = 'risco'`);
    const c = await alterarAgente(deps(), CTO, 'risco', corpo({ ligado: false }));
    expect(c).toMatchObject({ agente: 'risco', ligado: false, modelo: 'modelo-sem-preco' });
    expect(await eventosDo('risco')).toEqual([
      { acao: 'agente_desligado', antes: { ligado: true, modelo: 'modelo-sem-preco' }, depois: { ligado: false, modelo: 'modelo-sem-preco' } },
    ]);
  });

  it('desligar trocando para um modelo sem preço também é aceito', async () => {
    await alterarAgente(deps(), CTO, 'orquestrador', corpo({ ligado: true, modelo: 'modelo-ficticio' }));
    const c = await alterarAgente(deps(), CTO, 'orquestrador', corpo({ ligado: false, modelo: 'modelo-sem-preco' }));
    expect(c).toMatchObject({ ligado: false, modelo: 'modelo-sem-preco' });
  });
});

describe('troca de modelo (RF-17, RF-19)', () => {
  it('agente ligado troca para outro modelo com preço vigente: continua ligado, com quem e quando, e o evento guarda os dois modelos', async () => {
    await alterarAgente(deps(), CTO, 'insumo_tecnico', corpo({ ligado: true, modelo: 'modelo-ficticio' }));
    relogio.avancar(60_000);
    const c = await alterarAgente(deps(), CTO, 'insumo_tecnico', corpo({ ligado: true, modelo: 'modelo-ficticio-2' }));
    expect(c).toEqual({
      agente: 'insumo_tecnico',
      ligado: true,
      modelo: 'modelo-ficticio-2',
      atualizadoEm: new Date('2026-10-22T12:01:00Z'),
      atualizadoPor: { nome: 'Pessoa Ficticia' },
    });
    expect((await eventosDo('insumo_tecnico')).at(-1)).toMatchObject({
      antes: { ligado: true, modelo: 'modelo-ficticio' },
      depois: { ligado: true, modelo: 'modelo-ficticio-2' },
    });
  });

  it('o modelo do corpo chega aparado ao banco e casa com o preço', async () => {
    const c = await alterarAgente(deps(), CTO, 'risco', corpo({ ligado: true, modelo: '  modelo-ficticio  ' }));
    expect(c).toMatchObject({ ligado: true, modelo: 'modelo-ficticio' });
    expect((await linhaDo('risco')).modelo).toBe('modelo-ficticio');
  });
});

describe('409 ao ligar não mexe em nada', () => {
  it('nenhum agente muda, nem a data, nem o autor, e nenhum evento é gravado', async () => {
    await alterarAgente(deps(), CTO, 'consolidacao', corpo({ ligado: true, modelo: 'modelo-ficticio' }));
    const antes = await todas();
    const eventosAntes = (await b.poolMigrator.query(`select count(*)::int as n from evento`)).rows[0];
    relogio.avancar(60_000);
    const e = await alterarAgente(deps(), CTO, 'risco', corpo({ ligado: true, modelo: 'modelo-sem-preco' })).catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErroDominio);
    expect(e).toMatchObject({ codigo: 'conflito' });
    expect(await todas()).toEqual(antes);
    expect((await b.poolMigrator.query(`select count(*)::int as n from evento`)).rows[0]).toEqual(eventosAntes);
  });
});

describe('alterarAgente sob concorrência (FOR UPDATE)', () => {
  // A primeira mudança grava numa transação que fica aberta; a segunda só segue quando o banco mostra que ela está
  // parada na trava da linha. Sem o FOR UPDATE, a segunda leria o estado velho antes de parar no UPDATE.
  async function emSequenciaForcada(primeiro: unknown, segundo: unknown, agente: Agente = 'risco') {
    let liberar!: () => void;
    const segurar = new Promise<void>((r) => {
      liberar = r;
    });
    let primeiraGravou = false;
    const primeira = comTransacao(b.poolApp, async (t) => {
      await alterarAgente(deps(), CTO, agente, corpo(primeiro), t);
      primeiraGravou = true;
      await segurar;
    });
    await expect.poll(() => primeiraGravou, { timeout: 5_000 }).toBe(true);
    const segunda = alterarAgente(deps(), CTO, agente, corpo(segundo));
    await expect.poll(esperandoTrava, { timeout: 5_000 }).toBe(1);
    liberar();
    await primeira;
    return segunda;
  }

  it('desligar enquanto o ligar não terminou: o "antes" do desligar é o estado ligado', async () => {
    const c = await emSequenciaForcada({ ligado: true, modelo: 'modelo-ficticio' }, { ligado: false });
    expect(c).toMatchObject({ ligado: false, modelo: 'modelo-ficticio' });
    expect(await eventosDo('risco')).toEqual([
      { acao: 'agente_ligado', antes: { ligado: false, modelo: null }, depois: { ligado: true, modelo: 'modelo-ficticio' } },
      { acao: 'agente_desligado', antes: { ligado: true, modelo: 'modelo-ficticio' }, depois: { ligado: false, modelo: 'modelo-ficticio' } },
    ]);
  });

  it('dois "ligar" iguais ao mesmo tempo: só o primeiro grava e gera evento', async () => {
    const c = await emSequenciaForcada({ ligado: true, modelo: 'modelo-ficticio' }, { ligado: true, modelo: 'modelo-ficticio' });
    expect(c).toMatchObject({ ligado: true, modelo: 'modelo-ficticio' });
    expect(await eventosDo('risco')).toHaveLength(1);
  });

  it('ligar sem modelo no corpo, esperando quem gravou o modelo: usa o modelo recém-gravado e liga', async () => {
    const c = await emSequenciaForcada({ ligado: false, modelo: 'modelo-ficticio' }, { ligado: true });
    expect(c).toMatchObject({ ligado: true, modelo: 'modelo-ficticio' });
    expect((await eventosDo('risco')).map((e) => e.acao)).toEqual(['agente_desligado', 'agente_ligado']);
  });

  it('a trava é por agente: mudar outro agente não espera', async () => {
    let liberar!: () => void;
    const segurar = new Promise<void>((r) => {
      liberar = r;
    });
    let primeiraGravou = false;
    const primeira = comTransacao(b.poolApp, async (t) => {
      await alterarAgente(deps(), CTO, 'risco', corpo({ ligado: true, modelo: 'modelo-ficticio' }), t);
      primeiraGravou = true;
      await segurar;
    });
    try {
      await expect.poll(() => primeiraGravou, { timeout: 5_000 }).toBe(true);
      // Termina com a primeira ainda aberta: não houve espera.
      expect(await alterarAgente(deps(), CTO, 'orquestrador', corpo({ ligado: true, modelo: 'modelo-ficticio' }))).toMatchObject({ ligado: true });
      expect(await esperandoTrava()).toBe(0);
    } finally {
      liberar();
      await primeira;
    }
    expect((await listarConfiguracaoAgentes(b.db)).filter((c) => c.ligado).map((c) => c.agente)).toEqual(['orquestrador', 'risco']);
  });
});
