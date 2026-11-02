// T10, tokens de serviço nos pontos que o roteiro do engenheiro não cobre, contra o Postgres real (Testcontainers) e
// com o papel do app: revogações ao mesmo tempo (só uma vale), revogação que não toca outra coluna, troca de token do
// mesmo agente, prefixo repetido (parecer 3 do 06-T10-tech-lead.md: os dois saem), agente fora do CHECK e a recusa
// sem consulta ao banco do que está fora do formato (C-09, C-17). A hora vem sempre de relógio fixo.
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import type { Db } from '../../db';
import { comTransacao, type Transacao } from '../../db/transacao';
import { relogioFixo } from '../../lib/relogio';
import type { Agente } from './ator';
import { criarTokenServico, revogarTokenServico, validarTokenServico } from './tokens-servico';

let b: BancoDeTeste;
const relogio = relogioFixo('2026-10-22T12:00:00Z');

beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

const criar = (agente: Agente = 'risco') => comTransacao(b.poolApp, (t) => criarTokenServico(t, agente, relogio));
const revogar = (prefixo: string, r = relogio) => comTransacao(b.poolApp, (t) => revogarTokenServico(t, prefixo, r));
const linhaDoPrefixo = async (prefixo: string) =>
  (await b.poolMigrator.query('select * from token_servico where prefixo = $1 order by criado_em, hash', [prefixo])).rows;

// Banco que falha em qualquer uso: prova que a função recusou antes de montar a consulta.
const CONSULTOU = 'SENTINELA-consultou-o-banco';
const bancoQueFalha = new Proxy(
  {},
  {
    get() {
      throw new Error(CONSULTOU);
    },
  },
) as Db;
const transacaoQueFalha: Transacao = {
  tx: bancoQueFalha,
  executor: {
    executeSql: () => {
      throw new Error(CONSULTOU);
    },
  },
};

describe('revogarTokenServico sob concorrência', () => {
  it('cinco revogações do mesmo prefixo ao mesmo tempo: só uma devolve true, e a data é a dela', async () => {
    const { token, prefixo } = await criar('risco');
    const relogios = [21, 22, 23, 24, 25].map((dia) => relogioFixo(`2026-10-${dia}T09:00:00Z`));
    const resultados = await Promise.all(relogios.map((r) => revogar(prefixo, r)));
    expect(resultados.filter(Boolean)).toHaveLength(1);
    const vencedor = relogios[resultados.indexOf(true)]!;
    const [linha] = await linhaDoPrefixo(prefixo);
    expect(linha.revogado_em.toISOString()).toBe(vencedor.agora().toISOString());
    expect(await validarTokenServico(b.db, token)).toBeNull();
  });
});

describe('revogarTokenServico grava só revogado_em', () => {
  it('agente, hash, prefixo, id e criado_em ficam como estavam', async () => {
    const { prefixo } = await criar('consolidacao');
    const [antes] = await linhaDoPrefixo(prefixo);
    expect(await revogar(prefixo, relogioFixo('2026-10-24T10:00:00Z'))).toBe(true);
    const [depois] = await linhaDoPrefixo(prefixo);
    expect({ ...depois, revogado_em: null }).toEqual({ ...antes, revogado_em: null });
    expect(antes.revogado_em).toBeNull();
    expect(depois.revogado_em.toISOString()).toBe('2026-10-24T10:00:00.000Z');
  });
});

describe('troca do token de um agente', () => {
  it('revogar o antigo e criar um novo: o antigo dá null, o novo vira o mesmo agente com outro prefixo', async () => {
    const antigo = await criar('insumo_tecnico');
    expect(await revogar(antigo.prefixo)).toBe(true);
    const novo = await criar('insumo_tecnico');
    expect(novo.token).not.toBe(antigo.token);
    expect(await validarTokenServico(b.db, antigo.token)).toBeNull();
    expect(await validarTokenServico(b.db, novo.token)).toEqual({
      tipo: 'agente',
      agente: 'insumo_tecnico',
      prefixoToken: novo.prefixo,
    });
  });
  it('dois tokens ativos do mesmo agente valem cada um, e revogar um não derruba o outro', async () => {
    const um = await criar('orquestrador');
    const dois = await criar('orquestrador');
    expect(await revogar(um.prefixo)).toBe(true);
    expect(await validarTokenServico(b.db, um.token)).toBeNull();
    expect(await validarTokenServico(b.db, dois.token)).toMatchObject({ agente: 'orquestrador', prefixoToken: dois.prefixo });
  });
});

describe('prefixo repetido (parecer 3 da revisão)', () => {
  it('a revogação por prefixo tira todos os tokens ativos com esse prefixo, e só eles', async () => {
    const real = await criar('risco');
    // Segunda linha com o mesmo prefixo e outro agente, posta pelo migrator: simula a colisão de 48 bits.
    const hashFicticio = createHash('sha256').update('SENTINELA-token-colidido').digest('hex');
    await b.poolMigrator.query(
      'insert into token_servico (agente, hash, prefixo, criado_em) values ($1, $2, $3, $4)',
      ['insumo_tecnico', hashFicticio, real.prefixo, relogio.agora()],
    );
    const outro = await criar('risco');
    expect(await revogar(real.prefixo, relogioFixo('2026-10-26T08:00:00Z'))).toBe(true);
    const linhas = await linhaDoPrefixo(real.prefixo);
    expect(linhas).toHaveLength(2);
    for (const l of linhas) expect(l.revogado_em.toISOString(), l.agente).toBe('2026-10-26T08:00:00.000Z');
    expect(await validarTokenServico(b.db, real.token)).toBeNull();
    expect(await validarTokenServico(b.db, outro.token)).not.toBeNull();
  });
});

describe('agente fora da lista', () => {
  it('o CHECK do banco recusa, e nada fica gravado', async () => {
    const antes = Number((await b.poolMigrator.query('select count(*) from token_servico')).rows[0].count);
    await expect(
      comTransacao(b.poolApp, (t) => criarTokenServico(t, 'admin' as Agente, relogio)),
    ).rejects.toBeDefined();
    const depois = Number((await b.poolMigrator.query('select count(*) from token_servico')).rows[0].count);
    expect(depois).toBe(antes);
    expect((await b.poolMigrator.query(`select 1 from token_servico where agente = 'admin'`)).rows).toEqual([]);
  });
});

describe('fora do formato, nem consulta o banco (C-17)', () => {
  it('validarTokenServico devolve null sem tocar o banco', async () => {
    for (const errado of [
      '',
      'wsod_',
      'wsod_inventado',
      `wsod_${'A'.repeat(42)}`,
      `wsod_${'A'.repeat(44)}`,
      `wsod_${'A'.repeat(42)}+`,
      `wsod_${'A'.repeat(42)}/`,
      `wsod_${'A'.repeat(42)}'`,
      `wsod_${'A'.repeat(42)}\n`,
      `wsod_${'A'.repeat(42)}é`,
      `xwsod_${'A'.repeat(43)}`,
      `wsod_${'A'.repeat(43)}\u0000`,
      `wsod_${'A'.repeat(100_000)}`,
    ])
      expect(await validarTokenServico(bancoQueFalha, errado), JSON.stringify(errado.slice(0, 50))).toBeNull();
  });
  it('controle: no formato certo, a função consulta o banco', async () => {
    await expect(validarTokenServico(bancoQueFalha, `wsod_${'A'.repeat(43)}`)).rejects.toThrow(CONSULTOU);
  });
  it('revogarTokenServico devolve false sem tocar o banco', async () => {
    for (const errado of ['', 'abcdefg', 'abcdefghi', "abc'def1", 'abc def1', 'abcdefg%', 'abcdefg\n', 'abcdefgé', null, 42])
      expect(await revogarTokenServico(transacaoQueFalha, errado as string, relogio), String(errado)).toBe(false);
  });
  it('controle: com prefixo no formato certo, a revogação consulta o banco', async () => {
    await expect(revogarTokenServico(transacaoQueFalha, 'abcd_-12', relogio)).rejects.toThrow(CONSULTOU);
  });
});
