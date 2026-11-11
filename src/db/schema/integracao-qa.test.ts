// Testes da etapa 06-T01-testes (qa-automacao) do pedido DEC-DEM-20261111-0016-v1. Completam integracao.test.ts:
// os literais dos CHECK novos amarrados a INTEGRACOES (Minor 2 da revisão), as linhas de hoje intactas diante das regras
// novas (RNF-06) e o token de integração que nunca resolve como agente (Minor 1). Dados, prefixos e tokens só
// fictícios; o token é gerado em tempo de teste e não aparece em mensagem de expect.
import { createHash, randomBytes } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { validarTokenServico } from '../../modules/acesso/tokens-servico';
import { AGENTES, AUTORES_DEMANDA, INTEGRACOES } from './index';

let b: BancoDeTeste;
beforeAll(async () => {
  b = await novoBanco();
});
afterAll(async () => {
  await b.fechar();
});

const QUANDO = '2026-11-11T12:00:00Z';
const viola = (constraint: string) => expect.objectContaining({ code: '23514', constraint });
const valoresDoCheck = async (restricao: string) => {
  const r = await b.poolMigrator.query(`select pg_get_constraintdef(oid) as def from pg_constraint where conname = $1`, [restricao]);
  expect(r.rows, restricao).toHaveLength(1);
  return [...(r.rows[0].def as string).matchAll(/'([^']*)'::text/g)].map((m) => m[1]).sort();
};

// Cada chamada usa um hash próprio, para os testes não dependerem de ordem.
let sequencia = 1000;
const hashFicticio = () => (sequencia++).toString(16).padStart(64, '0');
const token = (agente: string | null, integracao: string | null, hash = hashFicticio(), prefixo = 'abcd1234') =>
  b.poolApp.query(
    `insert into token_servico (agente, integracao, hash, prefixo, criado_em) values ($1, $2, $3, $4, $5)`,
    [agente, integracao, hash, prefixo, QUANDO],
  );
let idEvento = 0;
const ev = (atorTipo: string, atorId: string, prefixo: string | null) =>
  b.poolApp.query(
    `insert into evento (ocorrido_em, ator_tipo, ator_id, ator_token_prefixo, entidade, entidade_id, acao) values ($1, $2, $3, $4, 'demanda', $5, 'demanda_criada') returning id`,
    [QUANDO, atorTipo, atorId, prefixo, `DEM-20261111-${String(++idEvento).padStart(4, '0')}`],
  );
let idDemanda = 100;
const dem = (autorTipo: string, autorId: string, rascunho: boolean) =>
  b.poolApp.query(
    `insert into demanda (id, titulo, tipo, solicitante_nome, autor_tipo, autor_id, rascunho_agente, criada_em, atualizada_em) values ($1, 'Título (fictício)', 'melhoria', 'Pessoa Ficticia', $2, $3, $4, $5, $5) returning id`,
    [`DEM-20261111-${String(++idDemanda).padStart(4, '0')}`, autorTipo, autorId, rascunho, QUANDO],
  );

describe('evento: CHECK de integração amarrado a INTEGRACOES (IN-12)', () => {
  it('o CHECK cita exatamente as integrações de INTEGRACOES', async () => {
    const valores = await valoresDoCheck('evento_ator_integracao_check');
    expect(valores.filter((v) => v !== 'integracao')).toEqual([...INTEGRACOES].sort());
  });
  it('evento_ator_tipo_check tem os quatro tipos de ator', async () => {
    expect(await valoresDoCheck('evento_ator_tipo_check')).toEqual(['agente', 'integracao', 'pessoa', 'sistema']);
  });
  it.each(INTEGRACOES)('aceita evento da integração %s com prefixo', async (integracao) => {
    const { rows } = await ev('integracao', integracao, 'ficticio');
    const lido = await b.poolMigrator.query(`select ator_tipo, ator_id, ator_token_prefixo from evento where id = $1`, [rows[0].id]);
    expect(lido.rows).toEqual([{ ator_tipo: 'integracao', ator_id: integracao, ator_token_prefixo: 'ficticio' }]);
  });
  it.each(INTEGRACOES)('recusa evento da integração %s sem prefixo', async (integracao) => {
    await expect(ev('integracao', integracao, null)).rejects.toEqual(viola('evento_ator_integracao_check'));
  });
  it('recusa nome de agente como ator de integração', async () => {
    await expect(ev('integracao', 'risco', 'ficticio')).rejects.toEqual(viola('evento_ator_integracao_check'));
  });
  it('pessoa, agente e sistema continuam sem prefixo obrigatório (a regra nova só vale para integração)', async () => {
    await expect(ev('pessoa', 'u-ficticio', null)).resolves.toBeDefined();
    await expect(ev('agente', 'risco', null)).resolves.toBeDefined();
    await expect(ev('sistema', 'sistema', null)).resolves.toBeDefined();
  });
  it('tipo de ator fora da lista continua recusado', async () => {
    await expect(ev('robo', 'awave', 'ficticio')).rejects.toEqual(viola('evento_ator_tipo_check'));
  });
  it('o app continua sem alterar evento (C-34)', async () => {
    const { rows } = await ev('integracao', 'awave', 'ficticio');
    await expect(b.poolApp.query(`update evento set ator_token_prefixo = null where id = $1`, [rows[0].id])).rejects.toEqual(
      expect.objectContaining({ code: '42501' }),
    );
  });
});

describe('demanda: autoria de integração (IN-05, ADR-24)', () => {
  it('o CHECK de autoria por integração só cita awave, e awave está em INTEGRACOES', async () => {
    const valores = await valoresDoCheck('demanda_autor_integracao_check');
    expect(valores.filter((v) => v !== 'integracao')).toEqual(['awave']);
    expect(INTEGRACOES).toContain('awave');
  });
  it('AUTORES_DEMANDA tem integracao e o CHECK da demanda é essa lista', async () => {
    expect(AUTORES_DEMANDA).toContain('integracao');
    expect(await valoresDoCheck('demanda_autor_tipo_check')).toEqual([...AUTORES_DEMANDA].sort());
  });
  it.each(INTEGRACOES.filter((i) => i !== 'awave'))('integração %s não é autora de demanda, nem como rascunho', async (integracao) => {
    await expect(dem('integracao', integracao, true)).rejects.toEqual(viola('demanda_autor_integracao_check'));
  });
  it('integração fora da lista não é autora de demanda', async () => {
    await expect(dem('integracao', 'jarvis', true)).rejects.toEqual(viola('demanda_autor_integracao_check'));
  });
  it('autoria de pessoa e de agente segue aceita, com e sem rascunho (regressão)', async () => {
    await expect(dem('pessoa', 'u-ficticio', false)).resolves.toBeDefined();
    await expect(dem('agente', 'orquestrador', true)).resolves.toBeDefined();
    await expect(dem('agente', 'orquestrador', false)).resolves.toBeDefined();
  });
  it('sistema continua fora da autoria de demanda', async () => {
    await expect(dem('sistema', 'sistema', true)).rejects.toEqual(viola('demanda_autor_tipo_check'));
  });
  it('o app não troca a autoria nem o rascunho de uma demanda (C-11, privilégios sem diff)', async () => {
    const { rows } = await dem('pessoa', 'u-ficticio', false);
    const id = rows[0].id as string;
    for (const set of [`autor_tipo = 'integracao'`, `autor_id = 'awave'`, `rascunho_agente = true`])
      await expect(b.poolApp.query(`update demanda set ${set} where id = $1`, [id]), set).rejects.toEqual(expect.objectContaining({ code: '42501' }));
  });
});

describe('token_servico: as linhas de hoje e o dono único (ADR-21, IN-03)', () => {
  it('token de agente sem integração segue aceito, para cada agente', async () => {
    for (const agente of AGENTES) await expect(token(agente, null), agente).resolves.toBeDefined();
  });
  it('agente fora da lista continua recusado pelo CHECK de agente', async () => {
    await expect(token('jarvis', null)).rejects.toEqual(viola('token_servico_agente_check'));
  });
  it('o CHECK de agente não mudou: é a lista AGENTES', async () => {
    expect(await valoresDoCheck('token_servico_agente_check')).toEqual([...AGENTES].sort());
  });
  it('nome de integração no lugar de agente é recusado', async () => {
    await expect(token('awave', null)).rejects.toEqual(viola('token_servico_agente_check'));
  });
  it('nome de agente no lugar de integração é recusado', async () => {
    await expect(token(null, 'risco')).rejects.toEqual(viola('token_servico_integracao_check'));
  });
  it('o hash continua único entre token de agente e de integração (23505)', async () => {
    const hash = hashFicticio();
    await token('risco', null, hash);
    await expect(token(null, 'awave', hash)).rejects.toEqual(expect.objectContaining({ code: '23505' }));
  });
  it('o app não muda o dono de um token: nem agente nem integração (IN-17)', async () => {
    const hash = hashFicticio();
    await token(null, 'construir', hash);
    for (const set of [`agente = 'risco'`, `integracao = null`, `integracao = 'awave'`])
      await expect(b.poolApp.query(`update token_servico set ${set} where hash = $1`, [hash]), set).rejects.toEqual(
        expect.objectContaining({ code: '42501' }),
      );
  });
});

describe('validarTokenServico diante da linha de integração (Minor 1 da revisão)', () => {
  const gravar = async (agente: string | null, integracao: string | null) => {
    const valor = 'wsod_' + randomBytes(32).toString('base64url');
    const prefixo = valor.slice(5, 13);
    await token(agente, integracao, createHash('sha256').update(valor).digest('hex'), prefixo);
    return { valor, prefixo };
  };

  it.each(INTEGRACOES)('token da integração %s nunca resolve como agente', async (integracao) => {
    const { valor } = await gravar(null, integracao);
    const ator = await validarTokenServico(b.db, valor);
    // Hoje (T01) é null; da T03 em diante é o ator de integração. Em nenhum dos dois casos é agente.
    expect(ator?.tipo ?? null).not.toBe('agente');
    expect(JSON.stringify(ator ?? null)).not.toContain('"agente"');
  });
  it('token de agente gravado do mesmo jeito segue resolvendo como o agente, com o prefixo (regressão)', async () => {
    const { valor, prefixo } = await gravar('risco', null);
    expect(await validarTokenServico(b.db, valor)).toEqual({ tipo: 'agente', agente: 'risco', prefixoToken: prefixo });
  });
});
