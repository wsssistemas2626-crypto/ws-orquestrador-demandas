// QA da T04 (IN-09, RF-08, CA-08.1 a CA-08.4): limite de 10 demandas por hora do awave, ao lado do C-36 de pessoa e
// agente. Postgres real, papel do app, relógio fixo. O awave é um ator só (autor_id 'awave'): cada teste que conta usa
// um dia próprio, para a conta de um não entrar na do outro e o arquivo não depender de ordem.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarDb } from '../db';
import { demanda } from '../db/schema';
import { comTransacao } from '../db/transacao';
import { ErroDominio, mapearErro, MENSAGEM_ERRO_INTERNO } from '../lib/erros';
import { relogioFixo, type Relogio } from '../lib/relogio';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { atorDeIntegracao, inserirDemandaDeIntegracao } from '../../test/integracoes';
import type { Ator, AtorAgente, AtorPessoa } from './acesso/ator';
import { conferirLimite, MENSAGEM_LIMITE, MENSAGEM_LIMITE_AWAVE } from './limites';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

const awave = atorDeIntegracao('awave');
const em = (iso: string): Relogio => relogioFixo(iso);
const conferir = (ator: Ator, relogio: Relogio) => comTransacao(b.poolApp, ({ tx }) => conferirLimite(tx, ator, 'demanda', relogio));
const erroDe = (p: Promise<unknown>) => p.then(() => 'passou' as const).catch((x: unknown) => x);

// Demanda de pessoa ou de agente, gravada pelo migrator, com id próprio do dia (faixa 0500 em diante, longe das do awave).
async function demandasDe(autor: { autorTipo: 'pessoa' | 'agente'; autorId: string }, dia: string, primeira: number, quantas: number, hora = '11:30:00') {
  const db = criarDb(b.poolMigrator);
  const aaaammdd = dia.replaceAll('-', '');
  const criadaEm = new Date(`${dia}T${hora}Z`);
  for (let n = primeira; n < primeira + quantas; n++)
    await db.insert(demanda).values({
      id: `DEM-${aaaammdd}-${String(n).padStart(4, '0')}`,
      titulo: 'Demanda (fictício)',
      tipo: 'melhoria',
      solicitanteNome: 'Pessoa Ficticia',
      ...autor,
      rascunhoAgente: autor.autorTipo === 'agente',
      criadaEm,
      atualizadaEm: criadaEm,
    });
}

async function demandasDoAwave(dia: string, primeira: number, quantas: number, hora = '11:30:00', status?: 'nova' | 'em_analise' | 'encerrada') {
  const aaaammdd = dia.replaceAll('-', '');
  for (let n = primeira; n < primeira + quantas; n++)
    await inserirDemandaDeIntegracao(b, { id: `DEM-${aaaammdd}-${String(n).padStart(4, '0')}`, criadaEm: new Date(`${dia}T${hora}Z`), status });
}

async function contarDoAwave(dia: string): Promise<number> {
  const r = await b.poolMigrator.query<{ n: number }>(
    "select count(*)::int as n from demanda where autor_tipo = 'integracao' and autor_id = 'awave' and id like $1",
    [`DEM-${dia.replaceAll('-', '')}-%`],
  );
  return r.rows[0]?.n ?? -1;
}

describe('CA-08.1: a 11ª do awave é 429 com a mensagem do Awave', () => {
  it('com 10 na janela, a recusa é ErroDominio limite_excedido; a resposta é 429 com a mensagem do 10, sem extras', async () => {
    await demandasDoAwave('2026-11-20', 1, 10);
    const e = await erroDe(conferir(awave, em('2026-11-20T12:00:00Z')));
    expect(e).toBeInstanceOf(ErroDominio);
    expect(mapearErro(e)).toEqual({ status: 429, corpo: { erro: 'limite_excedido', mensagem: MENSAGEM_LIMITE_AWAVE } });
    // RF-08: a mensagem diz o número 10 e não é a de pessoa e agente (30).
    expect(MENSAGEM_LIMITE_AWAVE).toMatch(/\b10\b/);
    expect(MENSAGEM_LIMITE_AWAVE).not.toBe(MENSAGEM_LIMITE.demanda);
    // A message do Error leva só o código: nem o nome da integração nem o prefixo vão para log ou pilha.
    expect((e as Error).message).toBe('limite_excedido');
  });

  it('a demanda do awave conta pela criação, qualquer que seja o status de hoje', async () => {
    await demandasDoAwave('2026-11-21', 1, 4, '11:30:00', 'encerrada');
    await demandasDoAwave('2026-11-21', 5, 3, '11:30:00', 'em_analise');
    await demandasDoAwave('2026-11-21', 8, 3, '11:30:00', 'nova');
    await expect(conferir(awave, em('2026-11-21T12:00:00Z'))).rejects.toMatchObject({ codigo: 'limite_excedido', mensagem: MENSAGEM_LIMITE_AWAVE });
  });
});

describe('CA-08.2: a janela é móvel, de 60 minutos pelo relógio injetado', () => {
  it('a primeira das 10 sai da janela exatamente uma hora depois: um instante antes ainda é 429, na hora certa passa', async () => {
    await demandasDoAwave('2026-11-22', 1, 1, '11:05:00');
    await demandasDoAwave('2026-11-22', 2, 9, '11:10:00');
    await expect(conferir(awave, em('2026-11-22T12:04:59.999Z'))).rejects.toMatchObject({ codigo: 'limite_excedido' });
    await expect(conferir(awave, em('2026-11-22T12:05:00Z'))).resolves.toBeUndefined();
    // Com a primeira fora, são 9: uma décima nova na janela volta a bloquear.
    await demandasDoAwave('2026-11-22', 11, 1, '12:04:00');
    await expect(conferir(awave, em('2026-11-22T12:05:00Z'))).rejects.toMatchObject({ codigo: 'limite_excedido' });
  });
});

describe('CA-08.3: o limite dos outros não muda', () => {
  it('com o awave no limite, pessoa passa até a 30ª e a 31ª é 429 com a mensagem do 30, não a do Awave', async () => {
    const dia = '2026-11-24';
    const p: AtorPessoa = { tipo: 'pessoa', usuarioId: 'u-qa-t04', nome: 'Pessoa Ficticia', papel: 'cto' };
    await demandasDoAwave(dia, 1, 10);
    await expect(conferir(awave, em(`${dia}T12:00:00Z`))).rejects.toMatchObject({ mensagem: MENSAGEM_LIMITE_AWAVE });
    await demandasDe({ autorTipo: 'pessoa', autorId: p.usuarioId }, dia, 500, 29);
    await expect(conferir(p, em(`${dia}T12:00:00Z`))).resolves.toBeUndefined();
    await demandasDe({ autorTipo: 'pessoa', autorId: p.usuarioId }, dia, 529, 1);
    await expect(conferir(p, em(`${dia}T12:00:00Z`))).rejects.toMatchObject({ codigo: 'limite_excedido', mensagem: MENSAGEM_LIMITE.demanda });
  });

  it('com o agente orquestrador no limite de 30, ele recebe a mensagem do 30, e o awave com 9 ainda passa', async () => {
    const dia = '2026-11-25';
    const orquestrador: AtorAgente = { tipo: 'agente', agente: 'orquestrador', prefixoToken: 'ficticio' };
    await demandasDe({ autorTipo: 'agente', autorId: 'orquestrador' }, dia, 500, 30);
    await demandasDoAwave(dia, 1, 9);
    await expect(conferir(orquestrador, em(`${dia}T12:00:00Z`))).rejects.toMatchObject({ codigo: 'limite_excedido', mensagem: MENSAGEM_LIMITE.demanda });
    await expect(conferir(awave, em(`${dia}T12:00:00Z`))).resolves.toBeUndefined();
  });

  it('a trava do awave não segura pessoa com id de conta "awave" nem o agente orquestrador', async () => {
    const segura = await b.poolMigrator.connect();
    try {
      await segura.query('select pg_advisory_lock(hashtextextended($1, 0))', ['limite:demanda:integracao:awave']);
      const pessoaAwave: AtorPessoa = { tipo: 'pessoa', usuarioId: 'awave', nome: 'Pessoa Ficticia', papel: 'cto' };
      const orquestrador: AtorAgente = { tipo: 'agente', agente: 'orquestrador', prefixoToken: null };
      for (const ator of [pessoaAwave, orquestrador]) {
        // Com 200 ms de lock_timeout: se a chave fosse a do awave, a conferência daria 55P03 em vez de passar.
        const r = await comTransacao(b.poolApp, async ({ tx, executor }) => {
          await executor.executeSql("set local lock_timeout = '200ms'");
          await conferirLimite(tx, ator, 'demanda', em('2026-11-26T12:00:00Z'));
          return 'passou';
        });
        expect(r, ator.tipo).toBe('passou');
      }
    } finally {
      await segura.query('select pg_advisory_unlock(hashtextextended($1, 0))', ['limite:demanda:integracao:awave']);
      segura.release();
    }
  });
});

describe('CA-08.4: 11 criações simultâneas do awave com a janela vazia', () => {
  it('exatamente 10 passam e gravam; 1 recebe limite_excedido com a mensagem do Awave', async () => {
    const dia = '2026-11-27';
    const relogio = em(`${dia}T12:00:00Z`);
    // Cada transação faz o que a criação fará (T06): confere o limite e grava, na mesma transação, antes do COMMIT.
    const criar = (n: number) =>
      comTransacao(b.poolApp, async ({ tx }) => {
        await conferirLimite(tx, awave, 'demanda', relogio);
        await tx.insert(demanda).values({
          id: `DEM-20261127-${String(n).padStart(4, '0')}`,
          titulo: 'Demanda do Awave (fictício)',
          tipo: 'melhoria',
          solicitanteNome: 'Awave',
          solicitantePapel: 'outro',
          autorTipo: 'integracao',
          autorId: 'awave',
          rascunhoAgente: true,
          criadaEm: relogio.agora(),
          atualizadaEm: relogio.agora(),
        });
      });
    const r = await Promise.allSettled(Array.from({ length: 11 }, (_, i) => criar(i + 1)));
    const recusas = r.flatMap((x) => (x.status === 'rejected' ? [x.reason as unknown] : []));
    expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(10);
    expect(recusas).toHaveLength(1);
    expect(recusas[0]).toBeInstanceOf(ErroDominio);
    expect(recusas[0]).toMatchObject({ codigo: 'limite_excedido', mensagem: MENSAGEM_LIMITE_AWAVE });
    expect(await contarDoAwave(dia)).toBe(10);
  });
});

describe('IN-09: integração sem limite definido falha fechada', () => {
  it('construir em conferirLimite de demanda e awave em artefato viram 500 genérico na resposta, nunca 429 nem passagem', async () => {
    const relogio = em('2026-11-28T12:00:00Z');
    const casos = [
      erroDe(conferir(atorDeIntegracao('construir'), relogio)),
      erroDe(comTransacao(b.poolApp, ({ tx }) => conferirLimite(tx, atorDeIntegracao('construir'), 'artefato', relogio))),
      erroDe(comTransacao(b.poolApp, ({ tx }) => conferirLimite(tx, awave, 'artefato', relogio))),
    ];
    for (const e of await Promise.all(casos)) {
      expect(e).not.toBe('passou');
      expect(e).not.toBeInstanceOf(ErroDominio);
      expect(mapearErro(e)).toEqual({ status: 500, corpo: { erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO } });
    }
  });
});
