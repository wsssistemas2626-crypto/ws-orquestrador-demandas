// src/modules/andamento/schemas.test.ts — AN-02 e CA-02.2: o corpo do andamento é fechado em quatro chaves, enumerações
// e inteiros de 0 a 999, com prontas ≤ total. Sem coerção, sem passthrough, sem padrão. Unitário.
import { describe, expect, it } from 'vitest';
import { FASES_ANDAMENTO, STATUS_CONSTRUCAO } from '../../db/schema/andamento';
import { reIdVersao } from '../../lib/rota';
import { CORPO_INVALIDO_ANDAMENTO, MENSAGENS_ANDAMENTO, RE_ID_DEC_ANDAMENTO, corpoAndamentoSchema } from './schemas';

const VALIDO = { fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, status: 'em_construcao' };
const aceita = (v: unknown) => corpoAndamentoSchema.safeParse(v).success;
const doJson = (texto: string) => JSON.parse(texto) as unknown;

describe('corpoAndamentoSchema (AN-02)', () => {
  it('aceita o corpo do CA-02.1, 0/0 (CA-02.6), 999/999 e cada fase e status da lista', () => {
    expect(corpoAndamentoSchema.parse(VALIDO)).toEqual(VALIDO);
    expect(aceita({ ...VALIDO, tarefasProntas: 0, tarefasTotal: 0 })).toBe(true);
    expect(aceita({ ...VALIDO, tarefasProntas: 999, tarefasTotal: 999 })).toBe(true);
    for (const fase of FASES_ANDAMENTO) expect(aceita({ ...VALIDO, fase }), fase).toBe(true);
    for (const status of STATUS_CONSTRUCAO) expect(aceita({ ...VALIDO, status }), status).toBe(true);
  });
  it('-0 é aceito e vale 0', () => {
    const r = corpoAndamentoSchema.parse(doJson('{"fase":"planejando","tarefasProntas":-0,"tarefasTotal":0,"status":"em_construcao"}'));
    expect(r.tarefasProntas === 0).toBe(true);
  });
  it.each([
    ['chave a mais', { ...VALIDO, nota: 'x' }],
    ['sem fase', { tarefasProntas: 9, tarefasTotal: 17, status: 'em_construcao' }],
    ['sem tarefasProntas', { fase: 'construindo', tarefasTotal: 17, status: 'em_construcao' }],
    ['sem tarefasTotal', { fase: 'construindo', tarefasProntas: 9, status: 'em_construcao' }],
    ['sem status', { fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17 }],
    ['fase em caixa alta', { ...VALIDO, fase: 'Construindo' }],
    ['fase que é status', { ...VALIDO, fase: 'construido' }],
    ['fase vazia', { ...VALIDO, fase: '' }],
    ['status entregue', { ...VALIDO, status: 'entregue' }],
    ['status encerrada', { ...VALIDO, status: 'encerrada' }],
    ['prontas > total', { ...VALIDO, tarefasProntas: 10, tarefasTotal: 9 }],
    ['negativo', { ...VALIDO, tarefasProntas: -1 }],
    ['fração', { ...VALIDO, tarefasProntas: 1.5 }],
    ['número em texto', { ...VALIDO, tarefasProntas: '9' }],
    ['nulo', { ...VALIDO, tarefasProntas: null }],
    ['booleano', { ...VALIDO, tarefasTotal: true }],
    ['total 1000', { ...VALIDO, tarefasProntas: 0, tarefasTotal: 1000 }],
    ['objeto aninhado na fase', { ...VALIDO, fase: { valor: 'construindo' } }],
    ['lista', []],
    ['nulo no corpo', null],
    ['texto no corpo', 'texto'],
  ])('recusa: %s', (_n, v) => {
    expect(aceita(v)).toBe(false);
  });
  it.each([
    ['__proto__ como chave', '{"fase":"construindo","tarefasProntas":9,"tarefasTotal":17,"status":"em_construcao","__proto__":{"x":1}}'],
    ['constructor como chave', '{"fase":"construindo","tarefasProntas":9,"tarefasTotal":17,"status":"em_construcao","constructor":1}'],
    ['1e3 em prontas com total 1e2', '{"fase":"construindo","tarefasProntas":1e3,"tarefasTotal":1e2,"status":"em_construcao"}'],
    ['1e400 (Infinity)', '{"fase":"construindo","tarefasProntas":1,"tarefasTotal":1e400,"status":"em_construcao"}'],
  ])('recusa do JSON cru: %s', (_n, texto) => {
    expect(aceita(doJson(texto))).toBe(false);
  });
});

describe('mensagens e constantes (03, seção 7)', () => {
  it('as três mensagens por inteiro', () => {
    expect(MENSAGENS_ANDAMENTO).toEqual({
      corpoInvalido:
        'Andamento fora do formato. Envie só fase, tarefasProntas, tarefasTotal e status, com fase e status da lista e 0 ≤ tarefasProntas ≤ tarefasTotal ≤ 999.',
      decSubstituido: 'O pacote deste pedido foi substituído por um aprovado mais novo. O andamento não foi registrado: envie o do pedido novo.',
      statusFinal: 'A demanda deste pedido já está em um status final e não aceita este andamento. Nada foi registrado.',
    });
    expect(CORPO_INVALIDO_ANDAMENTO).toEqual({ codigo: 'nao_processavel', mensagem: MENSAGENS_ANDAMENTO.corpoInvalido });
  });
  it('o formato do DEC é o mesmo da regex de rota()', () => {
    expect(RE_ID_DEC_ANDAMENTO.source).toBe(reIdVersao('DEC').source);
  });
});
