// C-06, pelo módulo do bloqueio da verificação, contra o Postgres real (Testcontainers): os limites exatos da janela e
// do bloqueio, a separação por conta e a contagem sob concorrência (o `SELECT … FOR UPDATE`). A hora é sempre passada
// por quem chama; nenhum teste usa o relógio real.
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CONFIG_TESTE, criarContaDeTeste } from '../../../test/auth';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { bloqueioVerificacao } from '../../db/schema';
import { relogioFixo } from '../../lib/relogio';
import { criarAuth, type Auth } from './auth';
import {
  DURACAO_BLOQUEIO_MS,
  JANELA_FALHAS_MS,
  LIMITE_FALHAS,
  registrarFalhaDeVerificacao,
  verificacaoBloqueada,
  zerarFalhasDeVerificacao,
} from './bloqueio-verificacao';

const T0 = new Date('2026-10-22T12:00:00Z');
const MIN = 60_000;
const em = (ms: number) => new Date(T0.getTime() + ms);

let b: BancoDeTeste;
let auth: Auth;

beforeAll(async () => {
  b = await novoBanco();
  auth = criarAuth({ db: b.db, config: { ...CONFIG_TESTE, databaseUrl: b.urlApp }, relogio: relogioFixo(T0.toISOString()) });
});
afterAll(async () => {
  await b.fechar();
});

// Cada teste usa contas próprias: nenhum depende do que outro gravou.
const novaConta = async () => (await criarContaDeTeste(auth, { papel: 'cto' })).usuarioId;
const linhaDe = async (usuarioId: string) =>
  (await b.db.select().from(bloqueioVerificacao).where(eq(bloqueioVerificacao.usuarioId, usuarioId)))[0];
const falhar = (usuarioId: string, agora: Date) => registrarFalhaDeVerificacao(b.db, usuarioId, agora);

describe('bloqueio da verificação (C-06)', () => {
  it('os limites são os de C-06: 5 falhas, janela de 15 min e bloqueio de 15 min', () => {
    expect(LIMITE_FALHAS).toBe(5);
    expect(JANELA_FALHAS_MS).toBe(15 * MIN);
    expect(DURACAO_BLOQUEIO_MS).toBe(15 * MIN);
  });

  it('conta sem nenhuma falha não está bloqueada', async () => {
    const id = await novaConta();
    expect(await verificacaoBloqueada(b.db, id, T0)).toBe(false);
    expect(await linhaDe(id)).toBeUndefined();
  });

  it('4 falhas na janela não bloqueiam; a 5ª bloqueia por 15 min a partir dela e zera a contagem', async () => {
    const id = await novaConta();
    for (let i = 0; i < 4; i++) expect(await falhar(id, em(i * MIN))).toEqual({ bloqueou: false });
    expect(await linhaDe(id)).toMatchObject({ falhas: 4, janelaInicio: T0, bloqueadoAte: null });
    expect(await verificacaoBloqueada(b.db, id, em(3 * MIN))).toBe(false);

    expect(await falhar(id, em(4 * MIN))).toEqual({ bloqueou: true });
    expect(await linhaDe(id)).toMatchObject({ falhas: 0, janelaInicio: null, bloqueadoAte: em(19 * MIN) });
  });

  it('o bloqueio vale até 1 ms antes do fim e acaba no instante exato', async () => {
    const id = await novaConta();
    for (let i = 0; i < 5; i++) await falhar(id, T0);
    const fim = 15 * MIN;
    expect(await verificacaoBloqueada(b.db, id, T0)).toBe(true);
    expect(await verificacaoBloqueada(b.db, id, em(fim - 1))).toBe(true);
    expect(await verificacaoBloqueada(b.db, id, em(fim))).toBe(false);
  });

  it('a 5ª falha 1 ms antes de fechar a janela ainda bloqueia', async () => {
    const id = await novaConta();
    for (let i = 0; i < 4; i++) await falhar(id, T0);
    expect(await falhar(id, em(15 * MIN - 1))).toEqual({ bloqueou: true });
  });

  it('no instante exato em que a janela fecha, a contagem recomeça da 1ª falha', async () => {
    const id = await novaConta();
    for (let i = 0; i < 4; i++) await falhar(id, T0);
    expect(await falhar(id, em(15 * MIN))).toEqual({ bloqueou: false });
    expect(await linhaDe(id)).toMatchObject({ falhas: 1, janelaInicio: em(15 * MIN), bloqueadoAte: null });
  });

  it('depois do bloqueio, a falha seguinte abre janela nova e não bloqueia de novo', async () => {
    const id = await novaConta();
    for (let i = 0; i < 5; i++) await falhar(id, T0);
    expect(await falhar(id, em(15 * MIN))).toEqual({ bloqueou: false });
    expect(await linhaDe(id)).toMatchObject({ falhas: 1, janelaInicio: em(15 * MIN) });
    expect(await verificacaoBloqueada(b.db, id, em(15 * MIN))).toBe(false);
  });

  it('zerar apaga a contagem da janela, mas não encurta um bloqueio em curso', async () => {
    const comFalhas = await novaConta();
    for (let i = 0; i < 4; i++) await falhar(comFalhas, T0);
    await zerarFalhasDeVerificacao(b.db, comFalhas);
    expect(await linhaDe(comFalhas)).toMatchObject({ falhas: 0, janelaInicio: null, bloqueadoAte: null });
    for (let i = 0; i < 4; i++) expect(await falhar(comFalhas, em(MIN))).toEqual({ bloqueou: false });

    const bloqueada = await novaConta();
    for (let i = 0; i < 5; i++) await falhar(bloqueada, T0);
    await zerarFalhasDeVerificacao(b.db, bloqueada);
    expect(await verificacaoBloqueada(b.db, bloqueada, em(MIN))).toBe(true);
  });

  it('zerar uma conta sem falhas não cria linha', async () => {
    const id = await novaConta();
    await zerarFalhasDeVerificacao(b.db, id);
    expect(await linhaDe(id)).toBeUndefined();
  });

  it('o bloqueio é por conta: as falhas de uma não somam na outra', async () => {
    const a = await novaConta();
    const outra = await novaConta();
    for (let i = 0; i < 5; i++) await falhar(a, T0);
    expect(await falhar(outra, T0)).toEqual({ bloqueou: false });
    expect(await verificacaoBloqueada(b.db, a, T0)).toBe(true);
    expect(await verificacaoBloqueada(b.db, outra, T0)).toBe(false);
    expect(await linhaDe(outra)).toMatchObject({ falhas: 1 });
  });

  describe('sob concorrência (SELECT … FOR UPDATE)', () => {
    it('4 falhas ao mesmo tempo somam 4, sem perder nenhuma', async () => {
      const id = await novaConta();
      const r = await Promise.all(Array.from({ length: 4 }, () => falhar(id, T0)));
      expect(r.filter((x) => x.bloqueou)).toEqual([]);
      expect(await linhaDe(id)).toMatchObject({ falhas: 4, bloqueadoAte: null });
    });

    it('5 falhas ao mesmo tempo bloqueiam uma vez só', async () => {
      const id = await novaConta();
      const r = await Promise.all(Array.from({ length: 5 }, () => falhar(id, T0)));
      expect(r.filter((x) => x.bloqueou)).toHaveLength(1);
      expect(await verificacaoBloqueada(b.db, id, T0)).toBe(true);
      expect(await linhaDe(id)).toMatchObject({ falhas: 0, bloqueadoAte: em(15 * MIN) });
    });

    it('7 falhas ao mesmo tempo: um bloqueio, e as 2 que sobram abrem a janela seguinte', async () => {
      const id = await novaConta();
      const r = await Promise.all(Array.from({ length: 7 }, () => falhar(id, T0)));
      expect(r.filter((x) => x.bloqueou)).toHaveLength(1);
      expect(await linhaDe(id)).toMatchObject({ falhas: 2, janelaInicio: T0, bloqueadoAte: em(15 * MIN) });
    });
  });
});
