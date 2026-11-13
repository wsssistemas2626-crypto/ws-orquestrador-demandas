// src/modules/andamento/schemas-qa.test.ts — 06-T04-testes (qa-automacao) do DEC-DEM-20261111-0017-v1: bordas do
// corpo do andamento que o teste do plano não pega (AN-02, RF-02, CA-02.2, CA-02.6). As listas de fase e status são
// conferidas contra o literal da especificação, não contra a própria fonte (que tornaria o teste tautológico); valores
// parecidos com os da lista, números nas bordas, tipos que o JSON não produz, saída sem chave a mais e constantes
// congeladas. Unitário, sem banco nem relógio.
import { describe, expect, it } from 'vitest';
import { FASES_ANDAMENTO, MAXIMO_DE_TAREFAS, STATUS_CONSTRUCAO } from '../../db/schema/andamento';
import { CORPO_INVALIDO_ANDAMENTO, MENSAGENS_ANDAMENTO, RE_ID_DEC_ANDAMENTO, corpoAndamentoSchema } from './schemas';

// O literal da especificação (pedido.json, item 2), em ordem.
const FASES_DA_ESPECIFICACAO = ['entendendo_o_pedido', 'planejando', 'construindo', 'testando', 'revisando_e_entregando', 'documentando'];
const STATUS_DA_ESPECIFICACAO = ['em_construcao', 'construido', 'cancelado'];
const VALIDO = { fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, status: 'em_construcao' } as const;
const aceita = (v: unknown) => corpoAndamentoSchema.safeParse(v).success;

describe('listas da especificação (RF-02)', () => {
  it('a fonte das listas é exatamente o literal da especificação, e o máximo é 999', () => {
    expect([...FASES_ANDAMENTO]).toEqual(FASES_DA_ESPECIFICACAO);
    expect([...STATUS_CONSTRUCAO]).toEqual(STATUS_DA_ESPECIFICACAO);
    expect(MAXIMO_DE_TAREFAS).toBe(999);
  });
  it.each(FASES_DA_ESPECIFICACAO)('aceita a fase %s da especificação', (fase) => {
    expect(aceita({ ...VALIDO, fase })).toBe(true);
  });
  it.each(STATUS_DA_ESPECIFICACAO)('aceita o status %s da especificação', (status) => {
    expect(aceita({ ...VALIDO, status })).toBe(true);
  });
});

// Variações de cada valor da lista que um envio malfeito ou malicioso pode trazer. Nenhuma é aceita. A que não muda o
// valor (hífen num valor sem sublinhado) sai da lista.
const variacoes = (v: string): Array<readonly [string, string]> =>
  ([

  ['caixa alta', v.toUpperCase()],
  ['primeira maiúscula', v.charAt(0).toUpperCase() + v.slice(1)],
  ['espaço antes', ` ${v}`],
  ['espaço depois', `${v} `],
  ['quebra de linha no fim', `${v}\n`],
  ['NUL no fim', `${v}\u0000`],
  ['largura zero no fim', `${v}​`],
  ['BOM no início', `﻿${v}`],
  ['hífen no lugar do sublinhado', v.replaceAll('_', '-')],
  ['letra cirílica no lugar do o', v.replace('o', 'о')],
  ['prefixo de outro valor', `${v}x`],
  ] as const).filter(([, x]) => x !== v);

describe('recusa de valores parecidos com os da lista (AN-02)', () => {
  it.each(FASES_DA_ESPECIFICACAO.flatMap((f) => variacoes(f).map(([n, v]) => [`fase ${f}: ${n}`, v] as const)))('%s', (_n, fase) => {
    expect(aceita({ ...VALIDO, fase })).toBe(false);
  });
  it.each(STATUS_DA_ESPECIFICACAO.flatMap((s) => variacoes(s).map(([n, v]) => [`status ${s}: ${n}`, v] as const)))('%s', (_n, status) => {
    expect(aceita({ ...VALIDO, status })).toBe(false);
  });
  it.each([
    ['status na fase', { ...VALIDO, fase: 'em_construcao' }],
    ['fase no status', { ...VALIDO, status: 'construindo' }],
    ['status devolvida (da demanda)', { ...VALIDO, status: 'devolvida' }],
    ['status aprovada (da demanda)', { ...VALIDO, status: 'aprovada' }],
    ['fase como lista', { ...VALIDO, fase: ['construindo'] }],
    ['status como número', { ...VALIDO, status: 1 }],
    ['status nulo', { ...VALIDO, status: null }],
  ])('recusa: %s', (_n, v) => {
    expect(aceita(v)).toBe(false);
  });
});

describe('números nas bordas (RF-02, CA-02.6)', () => {
  it.each([
    [0, 0],
    [0, 1],
    [1, 1],
    [998, 999],
    [999, 999],
    [0, 999],
  ])('aceita prontas %i e total %i', (tarefasProntas, tarefasTotal) => {
    expect(aceita({ ...VALIDO, tarefasProntas, tarefasTotal })).toBe(true);
  });
  it.each([
    ['prontas um acima do total (1 de 0)', 1, 0],
    ['prontas um acima do total (999 de 998)', 999, 998],
    ['prontas 1000 e total 1000', 1000, 1000],
    ['total 1000 com prontas 0', 0, 1000],
    ['total negativo', 0, -1],
    ['prontas negativas com total 0', -1, 0],
    ['inteiro além do seguro', 0, Number.MAX_SAFE_INTEGER + 2],
    ['fração mínima', 0, Number.MIN_VALUE],
    ['0.1 + 0.2', 0, 0.1 + 0.2],
    ['999.5', 0, 999.5],
    ['NaN', 0, Number.NaN],
    ['Infinity', 0, Number.POSITIVE_INFINITY],
    ['-Infinity nas prontas', Number.NEGATIVE_INFINITY, 0],
  ])('recusa: %s', (_n, tarefasProntas, tarefasTotal) => {
    expect(aceita({ ...VALIDO, tarefasProntas, tarefasTotal })).toBe(false);
  });
  it.each([
    ['BigInt', 9n],
    ['Number embrulhado', Object(9) as unknown],
    ['Date', new Date(0)],
    ['texto com espaço', ' 9'],
    ['texto vazio', ''],
    ['lista com um número', [9]],
    ['objeto com valueOf', { valueOf: () => 9 }],
    ['undefined explícito', undefined],
  ])('recusa sem coerção: %s em tarefasProntas', (_n, tarefasProntas) => {
    expect(aceita({ ...VALIDO, tarefasProntas })).toBe(false);
  });
  it('do JSON, 1e1 e 9.0 são os números 10 e 9: aceitos como inteiros (o JSON.parse não distingue a escrita)', () => {
    const r = corpoAndamentoSchema.parse(JSON.parse('{"fase":"testando","tarefasProntas":9.0,"tarefasTotal":1e1,"status":"construido"}'));
    expect(r).toEqual({ fase: 'testando', tarefasProntas: 9, tarefasTotal: 10, status: 'construido' });
  });
});

describe('forma do objeto (AN-02)', () => {
  it.each([
    ['objeto vazio', {}],
    ['número no corpo', 9],
    ['booleano no corpo', true],
    ['undefined no corpo', undefined],
    ['chave a mais com valor nulo', { ...VALIDO, nota: null }],
    ['chave a mais com valor undefined', { ...VALIDO, nota: undefined }],
    ['chave em caixa trocada no lugar da certa', { Fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, status: 'em_construcao' }],
    ['chave com espaço', { 'fase ': 'construindo', tarefasProntas: 9, tarefasTotal: 17, status: 'em_construcao' }],
    ['chave toString a mais', { ...VALIDO, toString: 'x' }],
    ['chave do nome antigo statusConstrucao', { fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, statusConstrucao: 'em_construcao' }],
    ['as quatro chaves e o atualizadoEm', { ...VALIDO, atualizadoEm: '2026-11-12T00:00:00.000Z' }],
    ['o decId no corpo', { ...VALIDO, decId: 'DEC-DEM-20261112-0001-v1' }],
  ])('recusa: %s', (_n, v) => {
    expect(aceita(v)).toBe(false);
  });
  it('a saída tem só as quatro chaves, é outro objeto e a entrada não muda', () => {
    const entrada = { ...VALIDO };
    const r = corpoAndamentoSchema.parse(entrada);
    expect(Object.keys(r).sort()).toEqual(['fase', 'status', 'tarefasProntas', 'tarefasTotal']);
    expect(r).not.toBe(entrada);
    expect(entrada).toEqual(VALIDO);
  });
  it('sem padrão: nenhuma chave ausente é preenchida (cada uma ausente recusa, e o erro aponta só a ausente)', () => {
    for (const chave of Object.keys(VALIDO) as Array<keyof typeof VALIDO>) {
      const semUma: Record<string, unknown> = { ...VALIDO };
      delete semUma[chave];
      const r = corpoAndamentoSchema.safeParse(semUma);
      expect(r.success, chave).toBe(false);
      expect(r.error?.issues.map((i) => i.path.join('.')), chave).toEqual([chave]);
    }
  });
});

describe('constantes congeladas e regex do DEC', () => {
  it('MENSAGENS_ANDAMENTO e CORPO_INVALIDO_ANDAMENTO são congeladas: escrever lança e o valor fica', () => {
    expect(Object.isFrozen(MENSAGENS_ANDAMENTO)).toBe(true);
    expect(Object.isFrozen(CORPO_INVALIDO_ANDAMENTO)).toBe(true);
    const original = MENSAGENS_ANDAMENTO.corpoInvalido;
    expect(() => {
      (MENSAGENS_ANDAMENTO as { corpoInvalido: string }).corpoInvalido = 'outra';
    }).toThrow(TypeError);
    expect(() => {
      (CORPO_INVALIDO_ANDAMENTO as { codigo: string }).codigo = 'entrada_invalida';
    }).toThrow(TypeError);
    expect(MENSAGENS_ANDAMENTO.corpoInvalido).toBe(original);
    expect(CORPO_INVALIDO_ANDAMENTO.codigo).toBe('nao_processavel');
  });
  it('CORPO_INVALIDO_ANDAMENTO tem só codigo e mensagem (nada de extras que o mapearErro devolveria)', () => {
    expect(Object.keys(CORPO_INVALIDO_ANDAMENTO).sort()).toEqual(['codigo', 'mensagem']);
  });
  it('a mensagem do 422 é fixa: não tem marcador de valor recebido', () => {
    expect(MENSAGENS_ANDAMENTO.corpoInvalido).not.toMatch(/[{}$%]|undefined|null/);
  });
  it('a regex do DEC não tem flag (sem m, i, g nem y)', () => {
    expect(RE_ID_DEC_ANDAMENTO.flags).toBe('');
  });
  it.each(['DEC-DEM-20261111-0017-v1', 'DEC-DEM-20261111-0017-v9999', 'DEC-DEM-00000000-0000-v0'])('aceita o id %s', (id) => {
    expect(RE_ID_DEC_ANDAMENTO.test(id)).toBe(true);
  });
  it.each([
    'DEC-xyz',
    'DEC-DEM-20261111-0017-v10000',
    'DEC-DEM-20261111-0017-v',
    'DEC-DEM-20261111-0017',
    'dec-dem-20261111-0017-v1',
    'ESP-DEM-20261111-0017-v1',
    'DEC-DEM-2026111-0017-v1',
    ' DEC-DEM-20261111-0017-v1',
    'DEC-DEM-20261111-0017-v1\n',
    'DEC-DEM-20261111-0017-v1/../x',
    // Dígito 2 de largura total (U+FF12): o \d sem a flag u só casa ASCII.
    `DEC-DEM-${String.fromCodePoint(0xff12)}0261111-0017-v1`,
  ])('recusa o id %j', (id) => {
    expect(RE_ID_DEC_ANDAMENTO.test(id)).toBe(false);
  });
});
