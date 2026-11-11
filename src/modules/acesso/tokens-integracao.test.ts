// src/modules/acesso/tokens-integracao.test.ts — IN-03, CA-01.1 e CA-01.2 (T03), contra o Postgres real
// (Testcontainers) e com o papel do app. O token de integração sai uma vez, o banco guarda só o SHA-256, e ele resolve
// como integração, nunca como agente. Tokens só gerados aqui, nunca em mensagem de expect. A hora vem do relógio fixo.
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { RE_PREFIXO as RE_PREFIXO_DA_TELA } from '../../components/rotulos';
import { comTransacao } from '../../db/transacao';
import { relogioFixo } from '../../lib/relogio';
import { RE_PREFIXO as RE_PREFIXO_DO_HISTORICO } from '../historico/consultas';
import { AGENTES, INTEGRACOES, type Integracao } from './ator';
import { RE_PREFIXO, criarTokenDeIntegracao, criarTokenServico, revogarTokenServico, validarTokenServico } from './tokens-servico';

let b: BancoDeTeste;
const relogio = relogioFixo('2026-11-11T12:00:00Z');
// Conferido por `.test`, e não por `toMatch`: a falha não imprime o token.
const RE_FORMATO = /^wsod_[A-Za-z0-9_-]{43}$/;

beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

const criar = (integracao: Integracao) => comTransacao(b.poolApp, (t) => criarTokenDeIntegracao(t, integracao, relogio));
const revogar = (prefixo: string) => comTransacao(b.poolApp, (t) => revogarTokenServico(t, prefixo, relogio));
const linhaDoPrefixo = async (prefixo: string) =>
  (await b.poolMigrator.query('select * from token_servico where prefixo = $1', [prefixo])).rows;

describe('criarTokenDeIntegracao (D-02)', () => {
  it.each(INTEGRACOES)('%s: token com prefixo wsod_ e 32 bytes, e o banco guarda só o SHA-256', async (integracao) => {
    const { token, prefixo } = await criar(integracao);
    expect(RE_FORMATO.test(token)).toBe(true);
    expect(Buffer.from(token.slice(5), 'base64url')).toHaveLength(32);
    expect(prefixo === token.slice(5, 13)).toBe(true);
    const linhas = await linhaDoPrefixo(prefixo);
    expect(linhas).toHaveLength(1);
    const tudo = JSON.stringify(linhas);
    expect(tudo.includes(token)).toBe(false);
    expect(tudo.includes(token.slice(5))).toBe(false);
    expect(linhas[0].hash === createHash('sha256').update(token).digest('hex')).toBe(true);
    expect(linhas[0]).toMatchObject({ agente: null, integracao, prefixo, revogado_em: null });
    expect(linhas[0].criado_em.toISOString()).toBe('2026-11-11T12:00:00.000Z');
  });
  it('dois tokens da mesma integração nunca são iguais', async () => {
    const lote = await Promise.all(Array.from({ length: 10 }, () => criar('awave')));
    expect(new Set(lote.map((x) => x.token)).size).toBe(10);
  });
  it('dentro de uma transação desfeita, o token não fica gravado', async () => {
    let prefixo = '';
    await expect(
      comTransacao(b.poolApp, async (t) => {
        prefixo = (await criarTokenDeIntegracao(t, 'construir', relogio)).prefixo;
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    expect(await linhaDoPrefixo(prefixo)).toEqual([]);
  });
  it('integração fora da lista: o CHECK recusa e nada fica gravado', async () => {
    const antes = Number((await b.poolMigrator.query('select count(*) from token_servico')).rows[0].count);
    await expect(comTransacao(b.poolApp, (t) => criarTokenDeIntegracao(t, 'jarvis' as Integracao, relogio))).rejects.toBeDefined();
    expect(Number((await b.poolMigrator.query('select count(*) from token_servico')).rows[0].count)).toBe(antes);
  });
});

describe('validarTokenServico (IN-03, CA-01.1)', () => {
  it.each(INTEGRACOES)('token da integração %s resolve como integração, com o prefixo', async (integracao) => {
    const { token, prefixo } = await criar(integracao);
    expect(await validarTokenServico(b.db, token)).toStrictEqual({ tipo: 'integracao', integracao, prefixoToken: prefixo });
  });
  it('token de agente continua AtorAgente, para cada agente', async () => {
    for (const agente of AGENTES) {
      const { token, prefixo } = await comTransacao(b.poolApp, (t) => criarTokenServico(t, agente, relogio));
      expect(await validarTokenServico(b.db, token)).toStrictEqual({ tipo: 'agente', agente, prefixoToken: prefixo });
    }
  });
  it('CA-01.2: token de integração revogado vira null, e os outros tokens continuam valendo', async () => {
    const awave = await criar('awave');
    const outroAwave = await criar('awave');
    const construir = await criar('construir');
    const agente = await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'risco', relogio));
    expect(await revogar(awave.prefixo)).toBe(true);
    expect(await validarTokenServico(b.db, awave.token)).toBeNull();
    expect(await validarTokenServico(b.db, outroAwave.token)).toMatchObject({ tipo: 'integracao', integracao: 'awave' });
    expect(await validarTokenServico(b.db, construir.token)).toMatchObject({ tipo: 'integracao', integracao: 'construir' });
    expect(await validarTokenServico(b.db, agente.token)).toMatchObject({ tipo: 'agente', agente: 'risco' });
  });
  it('token no formato e nunca emitido: null', async () => {
    expect(await validarTokenServico(b.db, `wsod_${'B'.repeat(43)}`)).toBeNull();
  });
});

// Minor 3 da 06-T02-revisao: as cópias do formato do prefixo (tela e histórico, D-14) são a mesma regex do token.
describe('formato do prefixo do token: uma regra só', () => {
  it('a tela e o histórico usam a mesma regex de tokens-servico.ts', () => {
    for (const copia of [RE_PREFIXO_DA_TELA, RE_PREFIXO_DO_HISTORICO]) {
      expect(copia.source).toBe(RE_PREFIXO.source);
      expect(copia.flags).toBe(RE_PREFIXO.flags);
    }
  });
  it.each(INTEGRACOES)('o prefixo emitido para %s casa a regex', async (integracao) => {
    const { prefixo } = await criar(integracao);
    expect(RE_PREFIXO.test(prefixo)).toBe(true);
  });
});
