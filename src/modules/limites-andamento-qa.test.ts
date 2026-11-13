// QA da T03 (06-T03-testes, AN-07, AN-08 c, RF-12, CA-12.1 a CA-12.6): bordas do limite de gravações de andamento que o
// teste do plano não cobre. Os atores recusados são conferidos pela mensagem e sem tocar a transação nem o relógio
// (Minor 1 da 06-T03-revisao); a trava é conferida por lock_timeout curto e por pg_try_advisory_xact_lock, nunca por
// tempo medido (Minor 2). Postgres real, papel do app, relógio fixo por teste; cada teste do banco limpa a tabela antes,
// e nenhum depende de outro. Dados fictícios.
import { count, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { novoBanco, type BancoDeTeste } from '../../test/banco';
import { criarDepsDeTeste } from '../../test/deps';
import { atorDeIntegracao } from '../../test/integracoes';
import { preparadorDePedidos } from '../../test/pedidos-construcao';
import type { Db } from '../db';
import { andamentoConstrucao } from '../db/schema';
import { comTransacao } from '../db/transacao';
import type { Deps } from '../lib/deps';
import { ErroDominio, mapearErro, MENSAGEM_ERRO_INTERNO } from '../lib/erros';
import { reduzirErro } from '../lib/reduzir-erro';
import { relogioFixo, type Relogio } from '../lib/relogio';
import { AGENTES, type Ator, type AtorPessoa } from './acesso/ator';
import {
  conferirLimiteDeAndamento,
  LIMITE_ANDAMENTO,
  limiteDe,
  MENSAGEM_LIMITE,
  MENSAGEM_LIMITE_AWAVE,
  TRAVA_DO_LIMITE_DE_ANDAMENTO,
} from './limites';

const MENSAGEM_SO_CONSTRUIR = 'limite: só o /construir registra andamento';
const construir = atorDeIntegracao('construir');

// Transação e relógio que não podem ser tocados: qualquer leitura de propriedade fica registrada e lança.
function intocaveis() {
  const toques: string[] = [];
  const tx = new Proxy(
    {},
    {
      get(_alvo, prop) {
        toques.push(`tx.${String(prop)}`);
        throw new Error('a transação foi tocada');
      },
    },
  ) as unknown as Db;
  const relogio: Relogio = {
    agora: () => {
      toques.push('relogio.agora');
      throw new Error('o relógio foi lido');
    },
  };
  return { tx, relogio, toques };
}

const erroDe = (p: Promise<unknown>) => p.then(() => 'passou' as const).catch((x: unknown) => x);

const integracao = (valor: unknown) => ({ tipo: 'integracao', integracao: valor, prefixoToken: 'ficticio' }) as unknown as Ator;
const pessoa = (papel: 'cto' | 'administradora', usuarioId = 'u-ficticio-qa'): AtorPessoa => ({ tipo: 'pessoa', usuarioId, nome: 'Pessoa Ficticia', papel });

const RECUSADOS: [string, Ator][] = [
  ['integração awave', atorDeIntegracao('awave')],
  ['integração "Construir"', integracao('Construir')],
  ['integração "CONSTRUIR"', integracao('CONSTRUIR')],
  ['integração " construir"', integracao(' construir')],
  ['integração "construir "', integracao('construir ')],
  ['integração com quebra de linha', integracao('construir\n')],
  ['integração com espaço de largura zero', integracao('construir​')],
  ['integração com BOM', integracao('﻿construir')],
  ['integração em largura total', integracao('ｃｏｎｓｔｒｕｉｒ')],
  ['integração jarvis', integracao('jarvis')],
  ['integração vazia', integracao('')],
  ['integração __proto__', integracao('__proto__')],
  ['integração toString', integracao('toString')],
  ['integração String embrulhada', integracao(new String('construir'))],
  ['integração em lista', integracao(['construir'])],
  ['pessoa cto', pessoa('cto')],
  ['pessoa administradora', pessoa('administradora')],
  ['pessoa com id de conta "construir"', pessoa('cto', 'construir')],
  ...AGENTES.flatMap((agente): [string, Ator][] => [
    [`agente ${agente} com token`, { tipo: 'agente', agente, prefixoToken: 'ficticio' }],
    [`agente ${agente} do worker`, { tipo: 'agente', agente, prefixoToken: null }],
  ]),
  ['sistema', { tipo: 'sistema' }],
];

describe('AN-07 e AN-08 (c): todo ator que não é o construir lança antes de tocar a transação e o relógio', () => {
  it.each(RECUSADOS)('%s: Error com a mensagem própria, 500 genérico na resposta, sem trava, consulta nem relógio', async (_n, ator) => {
    const { tx, relogio, toques } = intocaveis();
    const e = await erroDe(conferirLimiteDeAndamento(tx, ator, 'DEC-DEM-20261112-0001-v1', relogio));
    expect(e).toBeInstanceOf(Error);
    expect(e).not.toBeInstanceOf(ErroDominio);
    expect((e as Error).message).toBe(MENSAGEM_SO_CONSTRUIR);
    // Nunca vira 429 nem passagem: a resposta é o 500 genérico, sem texto interno.
    expect(mapearErro(e)).toEqual({ status: 500, corpo: { erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO } });
    expect(toques).toEqual([]);
  });

  it.each<[string, unknown]>([
    ['tipo desconhecido', { tipo: 'robo' }],
    ['tipo com caixa trocada', { tipo: 'Integracao', integracao: 'construir', prefixoToken: 'ficticio' }],
    ['sem tipo', { integracao: 'construir', prefixoToken: 'ficticio' }],
  ])('%s: falha fechada em "ator desconhecido", sem tocar a transação', async (_n, ator) => {
    const { tx, relogio, toques } = intocaveis();
    const e = await erroDe(conferirLimiteDeAndamento(tx, ator as Ator, 'DEC-DEM-20261112-0001-v1', relogio));
    expect((e as Error).message).toBe('ator desconhecido');
    expect(toques).toEqual([]);
  });
});

describe('AN-07: as constantes não mudam em execução, e o limite novo não mexe nos antigos (CA-12.6)', () => {
  it('LIMITE_ANDAMENTO e as duas entradas são congeladas: escrever lança TypeError e os números ficam', () => {
    expect([LIMITE_ANDAMENTO, LIMITE_ANDAMENTO.porDec, LIMITE_ANDAMENTO.total].every((o) => Object.isFrozen(o))).toBe(true);
    expect(() => {
      (LIMITE_ANDAMENTO.porDec as { maximo: number }).maximo = 1_000_000;
    }).toThrow(TypeError);
    expect(() => {
      (LIMITE_ANDAMENTO as unknown as { total: unknown }).total = { maximo: 1_000_000, mensagem: '' };
    }).toThrow(TypeError);
    expect([LIMITE_ANDAMENTO.porDec.maximo, LIMITE_ANDAMENTO.total.maximo]).toEqual([60, 600]);
  });

  it('CA-12.6: Awave 10, pessoa e agente 30 e 60, com as mesmas mensagens; o construir continua sem limite de demanda e artefato', () => {
    const agente: Ator = { tipo: 'agente', agente: 'orquestrador', prefixoToken: 'ficticio' };
    expect(limiteDe(atorDeIntegracao('awave'), 'demanda')).toEqual({ maximo: 10, mensagem: MENSAGEM_LIMITE_AWAVE });
    for (const ator of [pessoa('cto'), agente]) {
      expect(limiteDe(ator, 'demanda')).toEqual({ maximo: 30, mensagem: MENSAGEM_LIMITE.demanda });
      expect(limiteDe(ator, 'artefato')).toEqual({ maximo: 60, mensagem: MENSAGEM_LIMITE.artefato });
    }
    expect(MENSAGEM_LIMITE_AWAVE).toBe('Limite de 10 demandas por hora do Awave atingido. Tente de novo mais tarde.');
    expect(() => limiteDe(construir, 'demanda')).toThrow('limite: integração sem limite definido para este tipo');
    expect(() => limiteDe(construir, 'artefato')).toThrow('limite: integração sem limite definido para este tipo');
    // As duas mensagens novas são próprias: nenhuma repete a de outro limite.
    const antigas = [MENSAGEM_LIMITE.demanda, MENSAGEM_LIMITE.artefato, MENSAGEM_LIMITE_AWAVE];
    expect(antigas).not.toContain(LIMITE_ANDAMENTO.porDec.mensagem);
    expect(antigas).not.toContain(LIMITE_ANDAMENTO.total.mensagem);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// Banco real.

let b: BancoDeTeste;
let deps: Deps;
const p = preparadorDePedidos({ deps: () => deps, rotulo: 'limite-andamento-qa', entregar: async () => new Response(null, { status: 500 }) });
type Chave = 'x' | 'y' | 'z';
const dec: Record<Chave, { demandaId: string; decId: string }> = {} as never;

beforeAll(async () => {
  b = await novoBanco();
  deps = await criarDepsDeTeste(b, { relogio: relogioFixo('2026-11-12T09:00:00Z') });
  for (const k of ['x', 'y', 'z'] as const) dec[k] = await p.prepararDec({});
});
afterAll(async () => {
  await deps.fila.parar();
  await b.fechar();
});

const limpar = () => b.poolMigrator.query('delete from andamento_construcao');

// `n` linhas do DEC com `gravado_em` exato, pelo migrator (o app não escolhe a data).
async function linhasEm(k: Chave, n: number, iso: string) {
  await b.poolMigrator.query(
    `insert into andamento_construcao (demanda_id, dec_id, fase, tarefas_prontas, tarefas_total, status_construcao, ator_token_prefixo, gravado_em)
     select $1, $2, 'construindo', 0, 1, 'em_construcao', 'ficticio', $3 from generate_series(1, $4)`,
    [dec[k].demandaId, dec[k].decId, iso, n],
  );
}

async function contar(k?: Chave): Promise<number> {
  const [l] = await b.db
    .select({ n: count() })
    .from(andamentoConstrucao)
    .where(k ? eq(andamentoConstrucao.decId, dec[k].decId) : undefined);
  return l?.n ?? -1;
}

const conferir = (k: Chave, relogio: Relogio, ator: Ator = construir) =>
  comTransacao(deps.pool, ({ tx }) => conferirLimiteDeAndamento(tx, ator, dec[k].decId, relogio));

// O que o serviço fará (T07): confere e grava na mesma transação.
const gravar = (k: Chave, relogio: Relogio) =>
  comTransacao(deps.pool, async ({ tx }) => {
    await conferirLimiteDeAndamento(tx, construir, dec[k].decId, relogio);
    await tx.insert(andamentoConstrucao).values({
      demandaId: dec[k].demandaId,
      decId: dec[k].decId,
      fase: 'testando',
      tarefasProntas: 0,
      tarefasTotal: 1,
      statusConstrucao: 'em_construcao',
      atorTokenPrefixo: 'ficticio',
      gravadoEm: relogio.agora(),
    });
  }).then(
    () => 'gravou' as const,
    (e: unknown) => e,
  );

// Uma instrução só, fora de transação: a trava, se obtida, é solta no fim da própria instrução.
async function travaLivre(): Promise<boolean> {
  const r = await b.poolMigrator.query<{ ok: boolean }>('select pg_try_advisory_xact_lock(hashtextextended($1, 0)) as ok', [TRAVA_DO_LIMITE_DE_ANDAMENTO]);
  return r.rows[0]!.ok;
}

// Segura a trava do limite (ou outra chave) numa conexão do migrator enquanto `fn` roda.
async function comTravaSegura<T>(chave: string, fn: () => Promise<T>): Promise<T> {
  const segura = await b.poolMigrator.connect();
  try {
    await segura.query('select pg_advisory_lock(hashtextextended($1, 0))', [chave]);
    return await fn();
  } finally {
    await segura.query('select pg_advisory_unlock(hashtextextended($1, 0))', [chave]);
    segura.release();
  }
}

// Confere com lock_timeout de 200 ms: quem esperar pela trava cai em 55P03 em vez de ficar preso.
const conferirComEsperaCurta = (k: Chave, relogio: Relogio, ator: Ator = construir) =>
  erroDe(
    comTransacao(deps.pool, async ({ tx, executor }) => {
      await executor.executeSql("set local lock_timeout = '200ms'");
      await conferirLimiteDeAndamento(tx, ator, dec[k].decId, relogio);
    }),
  );

describe('RF-12 e CA-12.1: a janela de 60 min é estrita e anda com o relógio injetado', () => {
  it('60 linhas exatamente 60 min antes não contam; 1 ms depois contam (429 por DEC); o relógio avança 1 ms e passa', async () => {
    await limpar();
    const r = relogioFixo('2026-11-12T12:00:00Z');
    await linhasEm('x', 60, '2026-11-12T11:00:00.000Z');
    await expect(conferir('x', r)).resolves.toBeUndefined();
    await limpar();
    await linhasEm('x', 60, '2026-11-12T11:00:00.001Z');
    await expect(conferir('x', r)).rejects.toMatchObject({ codigo: 'limite_excedido', mensagem: LIMITE_ANDAMENTO.porDec.mensagem });
    r.avancar(1);
    await expect(conferir('x', r)).resolves.toBeUndefined();
  });

  it('CA-12.1: com 60 na janela, a 61ª gravação é 429 sem extras, a message não leva o DEC, e nada é gravado', async () => {
    await limpar();
    const r = relogioFixo('2026-11-12T12:00:00Z');
    await linhasEm('x', 60, '2026-11-12T11:30:00Z');
    const e = await gravar('x', r);
    expect(e).toBeInstanceOf(ErroDominio);
    expect(mapearErro(e)).toEqual({ status: 429, corpo: { erro: 'limite_excedido', mensagem: LIMITE_ANDAMENTO.porDec.mensagem } });
    expect((e as Error).message).toBe('limite_excedido');
    expect((e as Error).stack ?? '').not.toContain(dec.x.decId);
    expect(await contar('x')).toBe(60);
    expect(await contar()).toBe(60);
  });
});

describe('RF-12 e CA-12.3: por DEC antes do total', () => {
  it('60 no DEC x e 540 no z: x recebe a mensagem por DEC; y recebe a do total; com 59 em x e 541 em z, x recebe a do total', async () => {
    await limpar();
    const r = relogioFixo('2026-11-12T12:00:00Z');
    await linhasEm('x', 60, '2026-11-12T11:30:00Z');
    await linhasEm('z', 540, '2026-11-12T11:30:00Z');
    await expect(conferir('x', r)).rejects.toMatchObject({ codigo: 'limite_excedido', mensagem: LIMITE_ANDAMENTO.porDec.mensagem });
    await expect(conferir('y', r)).rejects.toMatchObject({ codigo: 'limite_excedido', mensagem: LIMITE_ANDAMENTO.total.mensagem });
    await limpar();
    await linhasEm('x', 59, '2026-11-12T11:30:00Z');
    await linhasEm('z', 541, '2026-11-12T11:30:00Z');
    await expect(conferir('x', r)).rejects.toMatchObject({ codigo: 'limite_excedido', mensagem: LIMITE_ANDAMENTO.total.mensagem });
  });

  it('as linhas fora da janela não entram no total: 600 de 61 min atrás no z e 599 na janela passam', async () => {
    await limpar();
    const r = relogioFixo('2026-11-12T12:00:00Z');
    await linhasEm('z', 600, '2026-11-12T10:59:00Z');
    await linhasEm('z', 599, '2026-11-12T11:30:00Z');
    await expect(conferir('x', r)).resolves.toBeUndefined();
  });

  it('conferir não grava: a tabela fica igual depois de passar e de recusar', async () => {
    await limpar();
    const r = relogioFixo('2026-11-12T12:00:00Z');
    await linhasEm('x', 59, '2026-11-12T11:30:00Z');
    await expect(conferir('x', r)).resolves.toBeUndefined();
    expect(await contar()).toBe(59);
    await linhasEm('x', 1, '2026-11-12T11:30:00Z');
    await expect(conferir('x', r)).rejects.toMatchObject({ codigo: 'limite_excedido' });
    expect(await contar()).toBe(60);
  });
});

describe('CA-12.4 e RNF-02: o ritmo do /construir nunca chega ao limite', () => {
  it('90 gravações de um DEC, uma a cada 2 min por 3 h: todas gravam, e a janela da última tem 30', async () => {
    await limpar();
    const r = relogioFixo('2026-11-12T12:00:00Z');
    const resultados: unknown[] = [];
    for (let i = 0; i < 90; i++) {
      if (i > 0) r.avancar(120_000);
      resultados.push(await gravar('x', r));
    }
    expect(resultados.filter((x) => x !== 'gravou')).toEqual([]);
    expect(await contar('x')).toBe(90);
    // A última gravou às 14:58; a janela dela é (13:58, 14:58]: as de 14:00 a 14:58, de 2 em 2 min, são 30.
    expect(r.agora().toISOString()).toBe('2026-11-12T14:58:00.000Z');
    const naJanela = await b.poolMigrator.query<{ n: number }>(
      'select count(*)::int as n from andamento_construcao where dec_id = $1 and gravado_em > $2',
      [dec.x.decId, '2026-11-12T13:58:00Z'],
    );
    expect(naJanela.rows[0]!.n).toBe(30);
  });
});

describe('CA-12.5 e AN-07: concorrência no mesmo DEC, com conexões diferentes', () => {
  it('59 no DEC e duas gravações simultâneas: uma grava, a outra é 429 por DEC; o DEC fica com 60', async () => {
    await limpar();
    const r = relogioFixo('2026-11-12T12:00:00Z');
    await linhasEm('x', 59, '2026-11-12T11:30:00Z');
    const rs = await Promise.all([gravar('x', r), gravar('x', r)]);
    expect(rs.filter((x) => x === 'gravou')).toHaveLength(1);
    expect(rs.filter((x) => x !== 'gravou')).toEqual([expect.objectContaining({ codigo: 'limite_excedido', mensagem: LIMITE_ANDAMENTO.porDec.mensagem })]);
    expect(await contar('x')).toBe(60);
  });

  it('55 no DEC e dez gravações simultâneas: exatamente 5 gravam e 5 recebem 429; o DEC fica com 60, nunca 61', async () => {
    await limpar();
    const r = relogioFixo('2026-11-12T12:00:00Z');
    await linhasEm('x', 55, '2026-11-12T11:30:00Z');
    const rs = await Promise.all(Array.from({ length: 10 }, () => gravar('x', r)));
    expect(rs.filter((x) => x === 'gravou')).toHaveLength(5);
    const recusas = rs.filter((x) => x !== 'gravou');
    expect(recusas).toHaveLength(5);
    for (const e of recusas) expect(e).toMatchObject({ codigo: 'limite_excedido', mensagem: LIMITE_ANDAMENTO.porDec.mensagem });
    expect(await contar('x')).toBe(60);
  });
});

describe('AN-08 e ADR-31: a trava é a literal, tomada só pelo construir e segurada só até o fim da transação', () => {
  it('com a trava segurada por outra conexão, o construir espera por ela (55P03 com lock_timeout curto), em qualquer DEC', async () => {
    await limpar();
    const r = relogioFixo('2026-11-12T12:00:00Z');
    const erros = await comTravaSegura(TRAVA_DO_LIMITE_DE_ANDAMENTO, async () => [await conferirComEsperaCurta('x', r), await conferirComEsperaCurta('y', r)]);
    for (const e of erros) {
      expect(e).not.toBe('passou');
      expect(e).not.toBeInstanceOf(ErroDominio);
      expect(reduzirErro(e).code).toBe('55P03');
    }
    // Solta a trava, o mesmo envio passa.
    await expect(conferirComEsperaCurta('x', r)).resolves.toBe('passou');
  });

  it.each<[string, Ator]>([
    ['awave', atorDeIntegracao('awave')],
    ['pessoa', pessoa('cto')],
    ['agente', { tipo: 'agente', agente: 'risco', prefixoToken: 'ficticio' }],
    ['sistema', { tipo: 'sistema' }],
  ])('AN-08 (c): com a trava segurada, %s recebe a própria recusa, não o 55P03 de quem esperou', async (_n, ator) => {
    const r = relogioFixo('2026-11-12T12:00:00Z');
    const e = await comTravaSegura(TRAVA_DO_LIMITE_DE_ANDAMENTO, () => conferirComEsperaCurta('x', r, ator));
    expect(reduzirErro(e).code).toBeUndefined();
    expect((e as Error).message).toBe(MENSAGEM_SO_CONSTRUIR);
  });

  it('a chave não depende do DEC: uma trava com o id do DEC na chave não segura o construir', async () => {
    await limpar();
    const r = relogioFixo('2026-11-12T12:00:00Z');
    for (const chave of [`limite:andamento:${dec.x.decId}`, `${TRAVA_DO_LIMITE_DE_ANDAMENTO}:${dec.x.decId}`, 'limite:andamento:integracao:awave'])
      expect(await comTravaSegura(chave, () => conferirComEsperaCurta('x', r)), chave).toBe('passou');
  });

  it('a trava fica com a transação do construir até o COMMIT ou o ROLLBACK, e é solta nos dois', async () => {
    await limpar();
    const r = relogioFixo('2026-11-12T12:00:00Z');
    const dentro = await comTransacao(deps.pool, async ({ tx }) => {
      await conferirLimiteDeAndamento(tx, construir, dec.x.decId, r);
      return travaLivre();
    });
    expect(dentro).toBe(false);
    expect(await travaLivre()).toBe(true);
    await linhasEm('x', 60, '2026-11-12T11:30:00Z');
    const e = await gravar('x', r);
    expect(e).toMatchObject({ codigo: 'limite_excedido' });
    expect(await travaLivre()).toBe(true);
  });
});
