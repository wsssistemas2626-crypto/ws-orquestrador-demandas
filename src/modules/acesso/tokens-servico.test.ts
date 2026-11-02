// C-09, CA-02.3 e CA-02.5, contra o Postgres real (Testcontainers) e com o papel do app: o token sai uma vez, o banco
// guarda só o SHA-256, e o token revogado ou inventado não vira ator. A hora vem sempre do relógio fixo.
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { comTransacao } from '../../db/transacao';
import { relogioFixo } from '../../lib/relogio';
import { AGENTES } from './ator';
import { criarTokenServico, revogarTokenServico, validarTokenServico } from './tokens-servico';

let b: BancoDeTeste;
const relogio = relogioFixo('2026-10-22T12:00:00Z');

beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

const criar = (agente: (typeof AGENTES)[number] = 'risco') =>
  comTransacao(b.poolApp, (t) => criarTokenServico(t, agente, relogio));
const revogar = (prefixo: string, r = relogio) => comTransacao(b.poolApp, (t) => revogarTokenServico(t, prefixo, r));
const linhaDoPrefixo = async (prefixo: string) =>
  (await b.poolMigrator.query('select * from token_servico where prefixo = $1', [prefixo])).rows;

describe('criarTokenServico', () => {
  it('token tem 32 bytes aleatórios com prefixo wsod_, e o banco guarda só o SHA-256', async () => {
    const { token, prefixo } = await criar('risco');
    expect(token).toMatch(/^wsod_[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token.slice(5), 'base64url')).toHaveLength(32);
    expect(prefixo).toBe(token.slice(5, 13));
    const linhas = await linhaDoPrefixo(prefixo);
    expect(linhas).toHaveLength(1);
    expect(JSON.stringify(linhas)).not.toContain(token);
    expect(JSON.stringify(linhas)).not.toContain(token.slice(5));
    expect(linhas[0].hash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(linhas[0]).toMatchObject({ agente: 'risco', prefixo, revogado_em: null });
  });
  it('CA-02.5: em nenhuma coluna da tabela o token aparece em claro, em qualquer agente', async () => {
    const criados = await Promise.all(AGENTES.map((a) => criar(a)));
    const tudo = JSON.stringify((await b.poolMigrator.query('select * from token_servico')).rows);
    for (const { token } of criados) {
      expect(tudo).not.toContain(token);
      expect(tudo).not.toContain(token.slice(5));
    }
  });
  it('a data de criação vem do relógio', async () => {
    const r = relogioFixo('2026-10-23T08:30:00Z');
    const { prefixo } = await comTransacao(b.poolApp, (t) => criarTokenServico(t, 'consolidacao', r));
    expect((await linhaDoPrefixo(prefixo))[0].criado_em.toISOString()).toBe('2026-10-23T08:30:00.000Z');
  });
  it('dois tokens nunca são iguais', async () => {
    const lote = await Promise.all(Array.from({ length: 20 }, () => criar('orquestrador')));
    expect(new Set(lote.map((x) => x.token)).size).toBe(20);
  });
  it('dentro de uma transação desfeita, o token não fica gravado', async () => {
    let prefixo = '';
    await expect(
      comTransacao(b.poolApp, async (t) => {
        prefixo = (await criarTokenServico(t, 'risco', relogio)).prefixo;
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    expect(await linhaDoPrefixo(prefixo)).toEqual([]);
  });
});

describe('validarTokenServico', () => {
  it('token válido vira ator agente; revogado ou inventado, null', async () => {
    const { token, prefixo } = await criar('risco');
    expect(await validarTokenServico(b.db, token)).toEqual({ tipo: 'agente', agente: 'risco', prefixoToken: prefixo });
    expect(await revogar(prefixo)).toBe(true);
    expect(await validarTokenServico(b.db, token)).toBeNull();
    expect(await validarTokenServico(b.db, 'wsod_inventado')).toBeNull();
  });
  it('cada token vira o seu próprio agente', async () => {
    for (const a of AGENTES) {
      const { token, prefixo } = await criar(a);
      expect(await validarTokenServico(b.db, token)).toEqual({ tipo: 'agente', agente: a, prefixoToken: prefixo });
    }
  });
  it('CA-02.3: token no formato certo e nunca criado, null', async () => {
    expect(await validarTokenServico(b.db, `wsod_${'A'.repeat(43)}`)).toBeNull();
  });
  it('fora do formato: null, inclusive o hash guardado, o token sem prefixo e o token com espaço', async () => {
    const { token, prefixo } = await criar('insumo_tecnico');
    const hash = (await linhaDoPrefixo(prefixo))[0].hash as string;
    for (const errado of [
      hash,
      token.slice(5),
      `${token} `,
      ` ${token}`,
      token.toUpperCase(),
      `WSOD_${token.slice(5)}`,
      `${token}A`,
      token.slice(0, -1),
      '',
      `wsod_${'A'.repeat(42)}=`,
      `wsod_${'A'.repeat(10_000)}`,
    ])
      expect(await validarTokenServico(b.db, errado), errado.slice(0, 20)).toBeNull();
    expect(await validarTokenServico(b.db, token)).not.toBeNull();
  });
  it('valor que não é texto: null', async () => {
    for (const v of [null, undefined, 42, {}, ['wsod_x']]) expect(await validarTokenServico(b.db, v as never)).toBeNull();
  });
});

describe('revogarTokenServico', () => {
  it('grava a hora do relógio e não toca outro token', async () => {
    const um = await criar('risco');
    const outro = await criar('risco');
    expect(await revogar(um.prefixo, relogioFixo('2026-10-24T09:00:00Z'))).toBe(true);
    expect((await linhaDoPrefixo(um.prefixo))[0].revogado_em.toISOString()).toBe('2026-10-24T09:00:00.000Z');
    expect((await linhaDoPrefixo(outro.prefixo))[0].revogado_em).toBeNull();
    expect(await validarTokenServico(b.db, outro.token)).not.toBeNull();
  });
  it('revogar de novo devolve false e não muda a data', async () => {
    const { prefixo } = await criar('risco');
    expect(await revogar(prefixo, relogioFixo('2026-10-24T09:00:00Z'))).toBe(true);
    expect(await revogar(prefixo, relogioFixo('2026-10-25T09:00:00Z'))).toBe(false);
    expect((await linhaDoPrefixo(prefixo))[0].revogado_em.toISOString()).toBe('2026-10-24T09:00:00.000Z');
  });
  it('prefixo que não existe ou fora do formato devolve false', async () => {
    expect(await revogar('zzzzzzzz')).toBe(false);
    for (const errado of ['', 'curto', 'abc def1', "a' or '1", '%', 'a'.repeat(9)]) expect(await revogar(errado)).toBe(false);
  });
  it('dentro de uma transação desfeita, a revogação não vale', async () => {
    const { token, prefixo } = await criar('risco');
    await expect(
      comTransacao(b.poolApp, async (t) => {
        await revogarTokenServico(t, prefixo, relogio);
        throw new Error('desfaz');
      }),
    ).rejects.toThrow('desfaz');
    expect(await validarTokenServico(b.db, token)).not.toBeNull();
  });
});
