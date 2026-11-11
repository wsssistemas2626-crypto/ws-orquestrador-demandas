// src/modules/acesso/tokens-integracao-corrompido.test.ts — IN-03 (T03): linha de token_servico que não casa com
// nenhuma lista é token inválido (401), nunca agente nem integração. Banco próprio deste arquivo: o migrator desliga os
// CHECK do dono, do agente e da integração para gravar o que o banco de verdade recusa. Tokens só gerados aqui, nunca
// em mensagem de expect.
import { createHash, randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { validarTokenServico } from './tokens-servico';

let b: BancoDeTeste;

beforeAll(async () => {
  b = await novoBanco();
  await b.poolMigrator.query('alter table token_servico drop constraint token_servico_dono_check');
  await b.poolMigrator.query('alter table token_servico drop constraint token_servico_agente_check');
  await b.poolMigrator.query('alter table token_servico drop constraint token_servico_integracao_check');
});
afterAll(async () => {
  await b.fechar();
});

async function gravar(agente: string | null, integracao: string | null): Promise<string> {
  const token = 'wsod_' + randomBytes(32).toString('base64url');
  await b.poolMigrator.query(
    `insert into token_servico (agente, integracao, hash, prefixo, criado_em) values ($1, $2, $3, $4, '2026-11-11T12:00:00Z')`,
    [agente, integracao, createHash('sha256').update(token).digest('hex'), token.slice(5, 13)],
  );
  return token;
}

describe('IN-03: só linha de uma das listas vira ator', () => {
  it.each([
    ['os dois donos nulos', null, null],
    ['agente fora da lista', 'admin', null],
    ['agente e integração preenchidos', 'risco', 'awave'],
    ['agente consolidacao e integração construir preenchidos', 'consolidacao', 'construir'],
    ['integração fora da lista', null, 'jarvis'],
    ['nome de agente no lugar de integração', null, 'risco'],
    ['nome de integração no lugar de agente', 'awave', null],
  ])('%s: null', async (_caso, agente, integracao) => {
    const token = await gravar(agente, integracao);
    expect(await validarTokenServico(b.db, token)).toBeNull();
  });
  it('controle: no mesmo banco, linha de agente e de integração da lista resolvem', async () => {
    expect(await validarTokenServico(b.db, await gravar('risco', null))).toMatchObject({ tipo: 'agente', agente: 'risco' });
    expect(await validarTokenServico(b.db, await gravar(null, 'awave'))).toMatchObject({ tipo: 'integracao', integracao: 'awave' });
  });
});
