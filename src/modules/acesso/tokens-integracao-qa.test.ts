// Escrito na 06-T03-testes (qa-automacao), ao lado de tokens-integracao.test.ts, sem mudar nada nele. Cobre o que o
// roteiro do engenheiro não cobre no token de integração (IN-03, RF-01, CA-01.1, CA-01.2):
//   - parecer 5 da 06-T03-revisao: integração fora da lista é recusada pelo CHECK certo (23514,
//     token_servico_integracao_check), e não por uma falha qualquer;
//   - variações do token (espaço, caixa, um caractere a menos ou trocado, só o prefixo, o hash) não resolvem ator;
//   - revogação: a do construir não derruba o awave nem os agentes, a de agente não derruba as integrações, e revogar
//     de novo não acha nada;
//   - CA-01.1 e CA-01.2 pelo caminho da requisição: `resolverAtor` com Bearer e sem Origin devolve a integração com o
//     prefixo; o 401 do token revogado é o mesmo do inexistente e do fora do formato; cookie de sessão junto é 400;
//   - por `rota()`, com Bearer e sem Origin (cliente de servidor): a ação permitida chega à função com o ator de
//     integração; a negada responde 403 com a mensagem de sem permissão e não roda a função (CA-03.1 a CA-03.3 no nível
//     da ação); o token revogado responde 401 sem rodar a função; a linha de log leva só `atorTipo`, sem token nem
//     prefixo.
// Postgres real (Testcontainers), papel do app. Tokens só gerados aqui, nunca em mensagem de expect; a hora vem do
// relógio fixo das deps de teste.
import { createHash } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { novoBanco, type BancoDeTeste } from '../../../test/banco';
import { criarDepsDeTeste } from '../../../test/deps';
import { chamarRota } from '../../../test/requisicao';
import { comTransacao } from '../../db/transacao';
import { definirDepsParaTeste, type Deps } from '../../lib/deps';
import { mapearErro } from '../../lib/erros';
import { substituirDestinoDoLog } from '../../lib/log';
import { rota } from '../../lib/rota';
import { AGENTES, type Agente, type Ator, type Integracao } from './ator';
import { MENSAGENS_ACESSO } from './mensagens';
import type { Acao } from './matriz';
import { resolverAtor } from './resolver-ator';
import { criarTokenDeIntegracao, criarTokenServico, revogarTokenServico, validarTokenServico } from './tokens-servico';

let b: BancoDeTeste;
let deps: Deps;

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b);
  definirDepsParaTeste(deps);
});
afterAll(async () => {
  definirDepsParaTeste(null);
  substituirDestinoDoLog(null);
  await deps.fila.parar();
  await b.fechar();
});
// A linha de log por requisição de rota() fica com o teste, e não no terminal; o teste do log troca o destino.
beforeEach(() => {
  substituirDestinoDoLog({ write: () => undefined });
});

const deIntegracao = (i: Integracao) => comTransacao(b.poolApp, (t) => criarTokenDeIntegracao(t, i, deps.relogio));
const deAgente = (a: Agente) => comTransacao(b.poolApp, (t) => criarTokenServico(t, a, deps.relogio));
const revogar = (prefixo: string) => comTransacao(b.poolApp, (t) => revogarTokenServico(t, prefixo, deps.relogio));
const contarTokens = async () => Number((await b.poolMigrator.query('select count(*) from token_servico')).rows[0].count);

// O erro do Postgres pode vir embrulhado pelo Drizzle (`cause`). Só `code` e `constraint` saem para o expect: a linha
// que o Postgres põe no `detail` (hash e prefixo) nunca vai para a mensagem de falha.
function erroDoPostgres(e: unknown): { code: unknown; constraint: unknown } {
  let atual: unknown = e;
  for (let i = 0; i < 4 && atual !== null && typeof atual === 'object'; i++) {
    const o = atual as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (typeof o.code === 'string') return { code: o.code, constraint: o.constraint };
    atual = o.cause;
  }
  return { code: undefined, constraint: undefined };
}

describe('parecer 5 da 06-T03-revisao: integração fora da lista recusada pelo CHECK certo', () => {
  it.each(['jarvis', 'Awave', '', 'risco'])('integração %j: 23514 em token_servico_integracao_check, nada gravado', async (valor) => {
    const antes = await contarTokens();
    let erro: unknown;
    try {
      await comTransacao(b.poolApp, (t) => criarTokenDeIntegracao(t, valor as Integracao, deps.relogio));
    } catch (e) {
      erro = e;
    }
    expect(erro, 'devia ter recusado').toBeDefined();
    expect(erroDoPostgres(erro)).toEqual({ code: '23514', constraint: 'token_servico_integracao_check' });
    expect(await contarTokens()).toBe(antes);
  });
});

describe('IN-03: variações de um token de integração ativo não resolvem ator', () => {
  it('espaço, caixa, caractere a menos ou trocado, só o prefixo e o hash: null; o token certo resolve', async () => {
    const { token, prefixo } = await deIntegracao('awave');
    const ultimo = token.at(-1)!;
    const variantes: Array<[string, string]> = [
      ['espaço no fim', `${token} `],
      ['espaço no começo', ` ${token}`],
      ['um caractere a menos', token.slice(0, -1)],
      ['último caractere trocado', token.slice(0, -1) + (ultimo === 'A' ? 'B' : 'A')],
      ['prefixo fixo em maiúsculas', `WSOD_${token.slice(5)}`],
      ['só o prefixo', prefixo],
      ['wsod_ e o prefixo', `wsod_${prefixo}`],
      ['o hash do token', createHash('sha256').update(token).digest('hex')],
      ['o token duas vezes', token + token],
    ];
    if (token.toUpperCase() !== token) variantes.push(['tudo em maiúsculas', token.toUpperCase()]);
    for (const [nome, v] of variantes) expect(await validarTokenServico(b.db, v), nome).toBeNull();
    expect(await validarTokenServico(b.db, token)).toStrictEqual({ tipo: 'integracao', integracao: 'awave', prefixoToken: prefixo });
  });
});

describe('IN-03 e CA-01.4 no nível do token: revogação de um não afeta os outros', () => {
  it('revogar o construir deixa o awave e os quatro agentes valendo; revogar de novo não acha nada', async () => {
    const construir = await deIntegracao('construir');
    const awave = await deIntegracao('awave');
    const agentes = await Promise.all(AGENTES.map((a) => deAgente(a)));
    expect(await revogar(construir.prefixo)).toBe(true);
    expect(await validarTokenServico(b.db, construir.token)).toBeNull();
    expect(await validarTokenServico(b.db, awave.token)).toStrictEqual({ tipo: 'integracao', integracao: 'awave', prefixoToken: awave.prefixo });
    for (const [i, a] of AGENTES.entries())
      expect(await validarTokenServico(b.db, agentes[i]!.token), a).toStrictEqual({ tipo: 'agente', agente: a, prefixoToken: agentes[i]!.prefixo });
    expect(await revogar(construir.prefixo)).toBe(false);
    expect(await validarTokenServico(b.db, construir.token)).toBeNull();
  });
  it('revogar o token de um agente deixa os das duas integrações valendo', async () => {
    const awave = await deIntegracao('awave');
    const construir = await deIntegracao('construir');
    const risco = await deAgente('risco');
    expect(await revogar(risco.prefixo)).toBe(true);
    expect(await validarTokenServico(b.db, risco.token)).toBeNull();
    expect(await validarTokenServico(b.db, awave.token)).toMatchObject({ tipo: 'integracao', integracao: 'awave' });
    expect(await validarTokenServico(b.db, construir.token)).toMatchObject({ tipo: 'integracao', integracao: 'construir' });
  });
  it('a revogação grava a hora do relógio injetado só na linha do prefixo', async () => {
    const alvo = await deIntegracao('awave');
    const outro = await deIntegracao('awave');
    expect(await revogar(alvo.prefixo)).toBe(true);
    const { rows } = await b.poolMigrator.query('select prefixo, revogado_em from token_servico where prefixo = any($1)', [[alvo.prefixo, outro.prefixo]]);
    const porPrefixo = new Map(rows.map((r: { prefixo: string; revogado_em: Date | null }) => [r.prefixo, r.revogado_em]));
    expect(porPrefixo.get(alvo.prefixo)?.toISOString()).toBe(deps.relogio.agora().toISOString());
    expect(porPrefixo.get(outro.prefixo)).toBeNull();
  });
});

const URL_BASE = 'http://127.0.0.1:3101';
const pedido = (cabecalhos: Record<string, string>) => new Request(`${URL_BASE}/api/demandas`, { headers: cabecalhos });
async function corpoDoErro(r: Request): Promise<unknown> {
  try {
    await resolverAtor(r, deps);
  } catch (e) {
    return mapearErro(e);
  }
  return 'resolverAtor não recusou';
}

describe('CA-01.1 e CA-01.2 por resolverAtor: Bearer sem Origin e sem cookie', () => {
  it.each(['awave', 'construir'] as const)('token %s ativo resolve como integração com o prefixo, nunca agente', async (i) => {
    const { token, prefixo } = await deIntegracao(i);
    const ator = await resolverAtor(pedido({ authorization: `Bearer ${token}` }), deps);
    expect(ator).toStrictEqual({ tipo: 'integracao', integracao: i, prefixoToken: prefixo });
  });
  it('RF-01: o 401 do token de integração revogado é igual ao do inexistente e ao do fora do formato', async () => {
    const { token, prefixo } = await deIntegracao('awave');
    expect(await revogar(prefixo)).toBe(true);
    const esperado = { status: 401, corpo: { erro: 'nao_autenticado', mensagem: MENSAGENS_ACESSO.token_invalido } };
    expect(await corpoDoErro(pedido({ authorization: `Bearer ${token}` })), 'revogado').toEqual(esperado);
    expect(await corpoDoErro(pedido({ authorization: `Bearer wsod_${'C'.repeat(43)}` })), 'inexistente').toEqual(esperado);
    expect(await corpoDoErro(pedido({ authorization: 'Bearer wsod_curto' })), 'fora do formato').toEqual(esperado);
  });
  it('RF-01: cookie de sessão junto com o Bearer da integração continua 400', async () => {
    const { token } = await deIntegracao('construir');
    expect(await corpoDoErro(pedido({ authorization: `Bearer ${token}`, cookie: 'wsod.session_token=ficticio' }))).toEqual({
      status: 400,
      corpo: { erro: 'entrada_invalida', mensagem: MENSAGENS_ACESSO.ambiguo },
    });
  });
});

// Handler sintético de rota() que conta as chamadas e guarda o ator que chegou à função.
function handlerQueRegistra(acao: Acao, metodo: 'GET' | 'POST') {
  const registro: { chamadas: number; ator: Ator | null } = { chamadas: 0, ator: null };
  const h = rota({ acao, rota: '/api/verificador-integracao-qa', ...(metodo === 'POST' ? { corpo: z.object({}) } : {}) }, async ({ ator }) => {
    registro.chamadas++;
    registro.ator = ator;
    return metodo === 'POST' ? { status: 201, json: { ok: true } } : { json: { ok: true } };
  });
  return { h, registro };
}
const chamar = (h: ReturnType<typeof handlerQueRegistra>['h'], metodo: 'GET' | 'POST', bearer: string) =>
  chamarRota(h, { metodo, caminho: '/api/verificador-integracao-qa', bearer, semOrigin: true, ...(metodo === 'POST' ? { corpo: {} } : {}) });
const SEM_PERMISSAO = { erro: 'sem_permissao', mensagem: MENSAGENS_ACESSO.sem_permissao };

describe('por rota(), com Bearer e sem Origin (cliente de servidor)', () => {
  const CASOS: ReadonlyArray<{ integracao: Integracao; acao: Acao; metodo: 'GET' | 'POST' }> = [
    { integracao: 'awave', acao: 'criar_demanda', metodo: 'POST' },
    { integracao: 'awave', acao: 'ler_demanda', metodo: 'GET' },
    { integracao: 'construir', acao: 'listar_pedidos_pendentes', metodo: 'GET' },
    { integracao: 'construir', acao: 'entregar_pedido', metodo: 'POST' },
    { integracao: 'construir', acao: 'confirmar_recebimento_pedido', metodo: 'POST' },
  ];

  it.each(CASOS)('CA-01.1/CA-01.2: $integracao em $acao ($metodo) chega à função como integração, com o prefixo', async ({ integracao, acao, metodo }) => {
    const { token, prefixo } = await deIntegracao(integracao);
    const { h, registro } = handlerQueRegistra(acao, metodo);
    const r = await chamar(h, metodo, token);
    expect(r.status).toBe(metodo === 'POST' ? 201 : 200);
    expect(registro.chamadas).toBe(1);
    expect(registro.ator).toStrictEqual({ tipo: 'integracao', integracao, prefixoToken: prefixo });
  });

  it('CA-03.1 e CA-03.2: a integração na ação da outra responde 403 com a mensagem de sem permissão, sem rodar a função', async () => {
    const awave = await deIntegracao('awave');
    const construir = await deIntegracao('construir');
    for (const { integracao, acao, metodo } of CASOS) {
      const outra = integracao === 'awave' ? construir.token : awave.token;
      const { h, registro } = handlerQueRegistra(acao, metodo);
      const r = await chamar(h, metodo, outra);
      expect(r.status, `${acao} pela outra integração`).toBe(403);
      expect(await r.json(), acao).toEqual(SEM_PERMISSAO);
      expect(registro.chamadas, acao).toBe(0);
    }
  });

  it('CA-03.3: o token de cada agente nas três ações do /construir responde 403, sem rodar a função', async () => {
    const tokens = await Promise.all(AGENTES.map((a) => deAgente(a)));
    for (const { acao, metodo } of CASOS.filter((c) => c.integracao === 'construir'))
      for (const [i, a] of AGENTES.entries()) {
        const { h, registro } = handlerQueRegistra(acao, metodo);
        const r = await chamar(h, metodo, tokens[i]!.token);
        expect(r.status, `${a} em ${acao}`).toBe(403);
        expect(await r.json(), `${a} em ${acao}`).toEqual(SEM_PERMISSAO);
        expect(registro.chamadas, `${a} em ${acao}`).toBe(0);
      }
  });

  it('CA-01.3 no nível da ação: token do awave revogado responde 401 com a mensagem de token inválido, sem rodar a função', async () => {
    const { token, prefixo } = await deIntegracao('awave');
    expect(await revogar(prefixo)).toBe(true);
    const { h, registro } = handlerQueRegistra('criar_demanda', 'POST');
    const r = await chamar(h, 'POST', token);
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ erro: 'nao_autenticado', mensagem: MENSAGENS_ACESSO.token_invalido });
    expect(registro.chamadas).toBe(0);
  });

  it('a linha de log por requisição leva atorTipo integracao, sem o token, sem o prefixo e sem o nome da integração', async () => {
    const linhas: string[] = [];
    substituirDestinoDoLog({ write: (l) => void linhas.push(l) });
    const awave = await deIntegracao('awave');
    const construir = await deIntegracao('construir');
    await chamar(handlerQueRegistra('criar_demanda', 'POST').h, 'POST', awave.token);
    await chamar(handlerQueRegistra('listar_demandas', 'GET').h, 'GET', awave.token);
    await chamar(handlerQueRegistra('listar_pedidos_pendentes', 'GET').h, 'GET', construir.token);
    expect(linhas).toHaveLength(3);
    const objetos = linhas.map((l) => JSON.parse(l) as Record<string, unknown>);
    expect(objetos.map((o) => [o.atorTipo, o.status])).toEqual([
      ['integracao', 201],
      ['integracao', 403],
      ['integracao', 200],
    ]);
    const tudo = linhas.join('\n');
    for (const [nome, proibido] of [
      ['wsod_', 'wsod_'],
      ['parte secreta do awave', awave.token.slice(5)],
      ['parte secreta do construir', construir.token.slice(5)],
      ['prefixo do awave', awave.prefixo],
      ['prefixo do construir', construir.prefixo],
      ['nome awave', 'awave'],
      ['nome construir', 'construir'],
    ] as const)
      expect(tudo.includes(proibido), nome).toBe(false);
  });
});
