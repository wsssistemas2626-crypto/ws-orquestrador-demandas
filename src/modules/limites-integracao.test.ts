// IN-09 (T04): integração sempre conta; sem limite definido, lança. Postgres real, papel do app, relógio fixo.
// O awave tem 10 demandas por hora (D2, ADR-24); pessoa e agente seguem com 30 e 60 (C-36, limites.test.ts).
// O awave é um ator só (autor_id 'awave'): cada teste que conta usa um dia próprio, para a conta de um não entrar na do
// outro e o arquivo não depender de ordem.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { criarDb } from '../db';
import { demanda } from '../db/schema';
import { comTransacao } from '../db/transacao';
import { ErroDominio } from '../lib/erros';
import { reduzirErro } from '../lib/reduzir-erro';
import { relogioFixo, type Relogio } from '../lib/relogio';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { atorDeIntegracao, inserirDemandaDeIntegracao } from '../../test/integracoes';
import type { Ator, Integracao } from './acesso/ator';
import { conferirLimite, limiteDe, LIMITE_POR_HORA, MENSAGEM_LIMITE, MENSAGEM_LIMITE_AWAVE } from './limites';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

const meioDia = (dia: string): Relogio => relogioFixo(`${dia}T12:00:00Z`);
const conferir = (ator: Ator, tipo: 'demanda' | 'artefato', relogio: Relogio = meioDia('2026-11-11')) =>
  comTransacao(b.poolApp, ({ tx }) => conferirLimite(tx, ator, tipo, relogio));

// `quantas` demandas do awave criadas às 11:30 do dia (dentro da janela do meio-dia), com ids próprios do dia.
async function demandasDoAwave(dia: string, primeira: number, quantas: number): Promise<void> {
  const aaaammdd = dia.replaceAll('-', '');
  for (let n = primeira; n < primeira + quantas; n++)
    await inserirDemandaDeIntegracao(b, { id: `DEM-${aaaammdd}-${String(n).padStart(4, '0')}`, criadaEm: new Date(`${dia}T11:30:00Z`) });
}

const pessoa = { tipo: 'pessoa', usuarioId: 'u1', nome: 'Pessoa Ficticia', papel: 'cto' } as const;

describe('IN-09', () => {
  it('awave: 10 demandas na janela; a mensagem cita o 10 e o Awave', () => {
    expect(limiteDe(atorDeIntegracao('awave'), 'demanda')).toEqual({ maximo: 10, mensagem: MENSAGEM_LIMITE_AWAVE });
    expect(MENSAGEM_LIMITE_AWAVE).toBe('Limite de 10 demandas por hora do Awave atingido. Tente de novo mais tarde.');
  });

  it('pessoa e agente seguem com 30 e 60', () => {
    expect(limiteDe(pessoa, 'demanda')).toEqual({ maximo: LIMITE_POR_HORA.demanda, mensagem: MENSAGEM_LIMITE.demanda });
    expect(limiteDe(pessoa, 'artefato')).toEqual({ maximo: LIMITE_POR_HORA.artefato, mensagem: MENSAGEM_LIMITE.artefato });
    const agente = { tipo: 'agente', agente: 'orquestrador', prefixoToken: 'ficticio' } as const;
    expect(limiteDe(agente, 'demanda')).toEqual({ maximo: 30, mensagem: MENSAGEM_LIMITE.demanda });
    expect(limiteDe(agente, 'artefato')).toEqual({ maximo: 60, mensagem: MENSAGEM_LIMITE.artefato });
  });

  it('o sistema não tem limite (não cria demanda nem artefato)', () => {
    expect(limiteDe({ tipo: 'sistema' }, 'demanda')).toBeNull();
    expect(limiteDe({ tipo: 'sistema' }, 'artefato')).toBeNull();
  });

  it('integração sem limite definido lança (nunca "sem limite"); só o sistema sai sem contar', async () => {
    expect(() => limiteDe(atorDeIntegracao('construir'), 'demanda')).toThrow(/sem limite/);
    expect(() => limiteDe(atorDeIntegracao('construir'), 'artefato')).toThrow(/sem limite/);
    expect(() => limiteDe(atorDeIntegracao('awave'), 'artefato')).toThrow(/sem limite/);
    await expect(conferir(atorDeIntegracao('construir'), 'demanda')).rejects.toThrow(/sem limite/);
    await expect(conferir(atorDeIntegracao('awave'), 'artefato')).rejects.toThrow(/sem limite/);
    await expect(conferir({ tipo: 'sistema' }, 'demanda')).resolves.toBeUndefined();
  });

  it('a recusa por falta de limite não é ErroDominio: vira 500 genérico, nunca 429 nem passagem', () => {
    let e: unknown;
    try {
      limiteDe(atorDeIntegracao('construir'), 'demanda');
    } catch (x) {
      e = x;
    }
    expect(e).toBeInstanceOf(Error);
    expect((e as Error).message).toMatch(/sem limite/);
    expect(e).not.toBeInstanceOf(ErroDominio);
  });

  it('integração fora da lista ou chave herdada de objeto também lança, e nunca herda limite', () => {
    for (const i of ['jarvis', 'toString', '__proto__', 'constructor', 'hasOwnProperty', 'Awave', ''])
      expect(() => limiteDe({ tipo: 'integracao', integracao: i as Integracao, prefixoToken: 'ficticio' }, 'demanda'), i).toThrow(/sem limite/);
  });

  it('tipo de ator desconhecido, montado à mão, lança (falha fechada)', () => {
    expect(() => limiteDe({ tipo: 'robo' } as unknown as Ator, 'demanda')).toThrow(/ator desconhecido/);
  });

  it('o limite devolvido para a integração é congelado', () => {
    const l = limiteDe(atorDeIntegracao('awave'), 'demanda');
    expect(Object.isFrozen(l)).toBe(true);
  });

  it('a 11ª do awave na janela é 429 com a mensagem do Awave; fora da janela não conta', async () => {
    await demandasDoAwave('2026-11-11', 1, 9);
    await inserirDemandaDeIntegracao(b, { id: 'DEM-20261111-0011', criadaEm: new Date('2026-11-11T10:59:00Z') });
    // 9 na janela e 1 fora dela: a 10ª passa.
    await expect(conferir(atorDeIntegracao('awave'), 'demanda')).resolves.toBeUndefined();
    await demandasDoAwave('2026-11-11', 10, 1);
    const e = await conferir(atorDeIntegracao('awave'), 'demanda').catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ErroDominio);
    expect(e).toEqual(expect.objectContaining({ codigo: 'limite_excedido', mensagem: MENSAGEM_LIMITE_AWAVE }));
    // Uma hora depois da última, a janela esvazia.
    await expect(conferir(atorDeIntegracao('awave'), 'demanda', relogioFixo('2026-11-11T12:30:00Z'))).resolves.toBeUndefined();
  });

  it('o prefixo do token não muda a conta: o awave é contado pela integração', async () => {
    await demandasDoAwave('2026-11-13', 1, 10);
    for (const prefixo of ['ficticio', 'Ab3dE5gH'])
      await expect(conferir(atorDeIntegracao('awave', prefixo), 'demanda', meioDia('2026-11-13')), prefixo).rejects.toMatchObject({
        codigo: 'limite_excedido',
        mensagem: MENSAGEM_LIMITE_AWAVE,
      });
  });

  it('o limite dos outros não muda, e o que eles criam não entra na conta do awave', async () => {
    const db = criarDb(b.poolMigrator);
    const em = new Date('2026-11-14T11:40:00Z');
    const comum = { titulo: 'Demanda (fictício)', tipo: 'melhoria' as const, solicitanteNome: 'Pessoa Ficticia', criadaEm: em, atualizadaEm: em };
    for (let n = 0; n < 10; n++) {
      // Pessoa cujo id de conta é "awave": a autoria é (pessoa, awave), nunca (integracao, awave).
      await db.insert(demanda).values({ ...comum, id: `DEM-20261114-${String(100 + n).padStart(4, '0')}`, autorTipo: 'pessoa', autorId: 'awave' });
      await db.insert(demanda).values({ ...comum, id: `DEM-20261114-${String(200 + n).padStart(4, '0')}`, autorTipo: 'agente', autorId: 'orquestrador', rascunhoAgente: true });
    }
    await demandasDoAwave('2026-11-14', 1, 9);
    const dia = meioDia('2026-11-14');
    await expect(conferir({ ...pessoa, usuarioId: 'awave' }, 'demanda', dia)).resolves.toBeUndefined();
    await expect(conferir({ tipo: 'agente', agente: 'orquestrador', prefixoToken: null }, 'demanda', dia)).resolves.toBeUndefined();
    await expect(conferir(atorDeIntegracao('awave'), 'demanda', dia)).resolves.toBeUndefined();
  });

  it('a trava do awave é a de hoje, por tipo e autoria: limite:demanda:integracao:awave', async () => {
    const segura = await b.poolMigrator.connect();
    try {
      await segura.query('select pg_advisory_lock(hashtextextended($1, 0))', ['limite:demanda:integracao:awave']);
      const r = await comTransacao(b.poolApp, async ({ tx, executor }) => {
        await executor.executeSql("set local lock_timeout = '200ms'");
        await conferirLimite(tx, atorDeIntegracao('awave'), 'demanda', meioDia('2026-11-15'));
        return 'passou';
      }).catch((x: unknown) => x);
      // Esperou a trava segura pela outra conexão até o lock_timeout (55P03), em vez de contar e passar.
      expect(r).not.toBe('passou');
      expect(reduzirErro(r).code).toBe('55P03');
    } finally {
      await segura.query('select pg_advisory_unlock(hashtextextended($1, 0))', ['limite:demanda:integracao:awave']);
      segura.release();
    }
  });
});
