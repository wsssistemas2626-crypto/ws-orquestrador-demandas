// 06-T11-testes do DEC-DEM-20261111-0017-v1 (qa-automacao). O que os testes do engenheiro deixam aberto na frase do
// andamento_registrado (03, 5.7; RF-06; CA-06.5; AN-12):
//   - as 18 combinações de fase × situação, cada uma com o começo da frase e o rótulo certos;
//   - os limites: 999 de 999, 0 de 999, NaN, Infinity, -0, nulo, booleano, objeto Number, chave ausente;
//   - CA-06.5 de ponta a ponta no componente do histórico: a linha mostra a frase com o DEC, a fase e "x de y tarefas", o
//     ator "/construir (prefixo …)" e nada do token, do hash nem de chave extra gravada em `depois`; sem "Antes/Depois";
//   - a frase vem só de `depois`: o `antes` (o andamento anterior) não muda o texto.
// Unitário, sem banco; datas fixas.
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Historico } from '../app/(painel)/demandas/[id]/Historico';
import { valoresDoEvento } from '../app/(painel)/demandas/[id]/detalhe';
import { FASES_ANDAMENTO, STATUS_CONSTRUCAO } from '../db/schema/andamento';
import type { EventoVisivel } from '../modules/historico/consultas';
import { ROTULO_FASE, rotuloAtor, textoDoEvento } from './rotulos';

const DEC = 'DEC-DEM-20991231-0003-v1';
const PREFIXO = 'a1b2c3d4';
// Fictícios, só para provar que não aparecem: nenhum é token de verdade.
const TOKEN_FICTICIO = `${PREFIXO}SENTINELA-token-ficticio-0000000000`;
const HASH_FICTICIO = 'SENTINELA-hash-ficticio';

const ev = (depois: Record<string, unknown> | null, parcial: Partial<EventoVisivel> = {}): EventoVisivel => ({
  id: 7,
  ocorridoEm: new Date('2026-11-13T10:00:00Z'),
  ator: { tipo: 'integracao', integracao: 'construir', prefixo: PREFIXO },
  entidade: 'pacote_decisao',
  entidadeId: DEC,
  acao: 'andamento_registrado',
  antes: null,
  depois,
  ...parcial,
});
const d = (fase: unknown, p: unknown, t: unknown, s: unknown) => ({ fase, tarefasProntas: p, tarefasTotal: t, statusConstrucao: s });
const GENERICA = `Registrou o andamento de ${DEC}`;

const INICIO: Readonly<Record<(typeof STATUS_CONSTRUCAO)[number], string>> = {
  em_construcao: 'Registrou o andamento de',
  construido: 'Registrou o fim da construção de',
  cancelado: 'Registrou o cancelamento da construção de',
};

describe('as 18 combinações de fase × situação (03, 5.7)', () => {
  const combinacoes = FASES_ANDAMENTO.flatMap((f) => STATUS_CONSTRUCAO.map((s) => [f, s] as const));

  it('são 6 fases × 3 situações (falha se a importação quebrar)', () => {
    expect(combinacoes).toHaveLength(18);
  });

  it.each(combinacoes)('%s, %s', (fase, situacao) => {
    expect(textoDoEvento(ev(d(fase, 2, 5, situacao)))).toBe(`${INICIO[situacao]} ${DEC}: ${ROTULO_FASE[fase]}, 2 de 5 tarefas`);
    expect(textoDoEvento(ev(d(fase, 0, 0, situacao)))).toBe(`${INICIO[situacao]} ${DEC}: ${ROTULO_FASE[fase]}`);
  });
});

describe('limites dos números na frase', () => {
  it('999 de 999 e 0 de 999 são válidos', () => {
    expect(textoDoEvento(ev(d('testando', 999, 999, 'em_construcao')))).toBe(`Registrou o andamento de ${DEC}: Testando, 999 de 999 tarefas`);
    expect(textoDoEvento(ev(d('planejando', 0, 999, 'em_construcao')))).toBe(`Registrou o andamento de ${DEC}: Planejando, 0 de 999 tarefas`);
  });

  it('1 de 1: singular', () => {
    expect(textoDoEvento(ev(d('construindo', 1, 1, 'construido')))).toBe(`Registrou o fim da construção de ${DEC}: Construindo, 1 de 1 tarefa`);
  });

  it('prontas acima do total com total 0: frase genérica', () => {
    expect(textoDoEvento(ev(d('construindo', 1, 0, 'em_construcao')))).toBe(GENERICA);
  });

  it('-0 vale como 0, sem "-0" no texto', () => {
    expect(textoDoEvento(ev(d('construindo', -0, 3, 'em_construcao')))).toBe(`Registrou o andamento de ${DEC}: Construindo, 0 de 3 tarefas`);
  });

  it.each([
    ['NaN', d('construindo', Number.NaN, 17, 'em_construcao')],
    ['Infinity', d('construindo', 9, Number.POSITIVE_INFINITY, 'em_construcao')],
    ['nulo em prontas', d('construindo', null, 17, 'em_construcao')],
    ['booleano em total', d('construindo', 9, true, 'em_construcao')],
    ['objeto Number', d('construindo', Object(9), 17, 'em_construcao')],
    ['1000 em prontas e total', d('construindo', 1000, 1000, 'em_construcao')],
    ['texto com número', d('construindo', 9, '17', 'em_construcao')],
  ])('%s: frase genérica', (_nome, depois) => {
    expect(textoDoEvento(ev(depois))).toBe(GENERICA);
  });
});

describe('chave ausente ou fora da lista: frase genérica (AN-12)', () => {
  it.each([
    ['sem fase', { tarefasProntas: 9, tarefasTotal: 17, statusConstrucao: 'em_construcao' }],
    ['sem situação', { fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17 }],
    ['sem prontas', { fase: 'construindo', tarefasTotal: 17, statusConstrucao: 'em_construcao' }],
    ['sem total', { fase: 'construindo', tarefasProntas: 9, statusConstrucao: 'em_construcao' }],
    ['depois vazio', {}],
    ['fase pelo rótulo', d('Construindo', 9, 17, 'em_construcao')],
    ['fase herdada: hasOwnProperty', d('hasOwnProperty', 9, 17, 'em_construcao')],
    ['fase herdada: valueOf', d('valueOf', 9, 17, 'em_construcao')],
    ['fase como objeto String', d(Object('construindo'), 9, 17, 'em_construcao')],
    ['fase como lista', d(['construindo'], 9, 17, 'em_construcao')],
    ['situação pelo rótulo', d('construindo', 9, 17, 'Concluída')],
    ['situação herdada: __proto__', d('construindo', 9, 17, '__proto__')],
    ['situação herdada: hasOwnProperty', d('construindo', 9, 17, 'hasOwnProperty')],
    ['situação status da demanda', d('construindo', 9, 17, 'devolvida')],
  ])('%s', (_nome, depois) => {
    const t = textoDoEvento(ev(depois));
    expect(t).toBe(GENERICA);
    expect(t).not.toMatch(/undefined|null|NaN|\[object|function/);
  });
});

describe('a frase vem só de depois', () => {
  it('o antes (andamento anterior, válido ou com sentinela) não muda o texto', () => {
    const depois = d('testando', 10, 17, 'em_construcao');
    const esperado = `Registrou o andamento de ${DEC}: Testando, 10 de 17 tarefas`;
    expect(textoDoEvento(ev(depois, { antes: d('construindo', 9, 17, 'em_construcao') }))).toBe(esperado);
    expect(textoDoEvento(ev(depois, { antes: { fase: 'SENTINELA-antes', token: TOKEN_FICTICIO } }))).toBe(esperado);
  });

  it('chave extra em depois não aparece (token, hash, texto livre)', () => {
    const t = textoDoEvento(ev({ ...d('construindo', 9, 17, 'em_construcao'), token: TOKEN_FICTICIO, hash: HASH_FICTICIO, mensagem: 'SENTINELA-mensagem' }));
    expect(t).toBe(`Registrou o andamento de ${DEC}: Construindo, 9 de 17 tarefas`);
    expect(t).not.toContain('SENTINELA');
  });

  it('nenhum Antes/Depois para o andamento_registrado (C-30)', () => {
    expect(valoresDoEvento(ev(d('testando', 10, 17, 'em_construcao'), { antes: d('construindo', 9, 17, 'em_construcao') }))).toEqual({ antes: '', depois: '' });
  });
});

describe('CA-06.5 no histórico da demanda (componente Historico)', () => {
  const html = (eventos: EventoVisivel[]) => renderToStaticMarkup(h(Historico, { eventos, retencaoDias: 90 }));

  it('a linha mostra a frase em pt-BR com o DEC, a fase e "x de y tarefas", e o ator "/construir (prefixo …)"', () => {
    const saida = html([ev(d('construindo', 9, 17, 'em_construcao'))]);
    expect(saida).toContain(`Registrou o andamento de ${DEC}: Construindo, 9 de 17 tarefas`);
    expect(saida).toContain(`/construir (prefixo ${PREFIXO})`);
  });

  it('as três situações na mesma lista, cada uma com a sua frase', () => {
    const saida = html([
      ev(d('documentando', 12, 12, 'construido'), { id: 3 }),
      ev(d('construindo', 3, 8, 'cancelado'), { id: 2 }),
      ev(d('entendendo_o_pedido', 0, 0, 'em_construcao'), { id: 1 }),
    ]);
    expect(saida).toContain(`Registrou o fim da construção de ${DEC}: Documentando, 12 de 12 tarefas`);
    expect(saida).toContain(`Registrou o cancelamento da construção de ${DEC}: Construindo, 3 de 8 tarefas`);
    expect(saida).toContain(`Registrou o andamento de ${DEC}: Entendendo o pedido`);
  });

  it('sem token nem hash: nem em depois, nem em antes, nem no lugar do prefixo', () => {
    const saida = html([
      ev({ ...d('construindo', 9, 17, 'em_construcao'), token: TOKEN_FICTICIO, hash: HASH_FICTICIO }, { antes: { token: TOKEN_FICTICIO } }),
      // O token inteiro no lugar do prefixo (fora do formato de 8): só o nome da integração.
      ev(d('construindo', 9, 17, 'em_construcao'), { id: 8, ator: { tipo: 'integracao', integracao: 'construir', prefixo: TOKEN_FICTICIO } }),
    ]);
    expect(saida).not.toContain('SENTINELA');
    expect(saida).not.toContain(TOKEN_FICTICIO);
    expect(rotuloAtor({ tipo: 'integracao', integracao: 'construir', prefixo: TOKEN_FICTICIO })).toBe('/construir');
  });

  it('HTML gravado na fase não vira marcação: a linha cai na frase genérica', () => {
    const saida = html([ev(d('<img src=x onerror=alert(1)>', 1, 2, 'em_construcao'))]);
    expect(saida).not.toContain('<img');
    expect(saida).not.toContain('onerror');
    expect(saida).toContain(GENERICA);
  });
});
