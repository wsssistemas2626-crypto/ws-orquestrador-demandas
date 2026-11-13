// 06-T11-testes do DEC-DEM-20261111-0017-v1 (qa-automacao). O que os testes do engenheiro deixam aberto em
// dados-do-andamento.ts:
//   - CA-08.4 pela lista do esquema (STATUS_DEMANDA), não por uma lista escrita à mão (M2 da revisão): status novo entra
//     sozinho no laço;
//   - as seis fases da lista (FASES_ANDAMENTO), cada uma com o rótulo da 03 no selo e na seção;
//   - os limites: 999 de 999 (máximo do esquema), 0 de 17 (barra vazia), NaN, Infinity, -0, chave herdada do protótipo
//     além de __proto__ e toString, rótulo no lugar da chave, espaço em volta;
//   - o valor fora da lista também em "concluída" e "cancelada", que não mostram a fase (a conferência vem antes do
//     switch), e a data inválida no selo;
//   - pureza: não muda a entrada (congelada), não chama `formatar` quando devolve null, e cada chamada devolve lista nova.
// Unitário, sem banco nem tela; as datas são fixas.
import { describe, expect, it, vi } from 'vitest';
import { FASES_ANDAMENTO } from '../db/schema/andamento';
import { STATUS_DEMANDA } from '../db/schema/demandas';
import type { AndamentoVista } from '../modules/andamento/schemas';
import { secaoDoAndamento, seloDeFase, TEXTOS_ANDAMENTO } from './dados-do-andamento';
import { ROTULO_FASE } from './rotulos';

const DEC = 'DEC-DEM-20991231-0002-v3';
const QUANDO = new Date('2026-11-13T10:00:00Z');

const andamento = (a: Partial<AndamentoVista> = {}): AndamentoVista => ({
  decId: DEC,
  fase: 'construindo',
  tarefasProntas: 9,
  tarefasTotal: 17,
  statusConstrucao: 'em_construcao',
  atualizadoEm: QUANDO,
  ...a,
});
// Valor fora do tipo, como chegaria de uma leitura nova que esquecesse lerAndamento.
const montadoAMao = (a: Record<string, unknown>): AndamentoVista => andamento(a as Partial<AndamentoVista>);
const formatar = (dt: Date): string => `formatada ${dt.toISOString()}`;

describe('CA-08.4 pela lista do esquema (M2 da revisão)', () => {
  it('a lista do esquema tem em_construcao e outros status (falha se a importação quebrar)', () => {
    expect(STATUS_DEMANDA).toContain('em_construcao');
    expect(STATUS_DEMANDA.length).toBeGreaterThan(1);
  });

  it.each(STATUS_DEMANDA.filter((s) => s !== 'em_construcao'))('%s: sem selo, com andamento em qualquer situação', (status) => {
    for (const statusConstrucao of ['em_construcao', 'construido', 'cancelado'] as const) {
      expect(seloDeFase(status, andamento({ statusConstrucao }))).toBeNull();
      expect(seloDeFase(status, andamento({ statusConstrucao, tarefasProntas: 0, tarefasTotal: 0 }))).toBeNull();
    }
  });

  it('só em_construcao tem selo, com o mesmo andamento', () => {
    const comSelo = STATUS_DEMANDA.filter((s) => seloDeFase(s, andamento()) !== null);
    expect(comSelo).toEqual(['em_construcao']);
  });

  it('em_construcao sem andamento: sem selo (CA-08.4, primeira metade)', () => {
    expect(seloDeFase('em_construcao', null)).toBeNull();
  });
});

describe('as seis fases da lista, cada uma com o rótulo da 03', () => {
  it('a lista tem seis fases (falha se a importação quebrar)', () => {
    expect(FASES_ANDAMENTO).toHaveLength(6);
  });

  it.each(FASES_ANDAMENTO.map((f) => [f, ROTULO_FASE[f]] as const))('%s → %s no selo e na seção', (fase, rotulo) => {
    expect(seloDeFase('em_construcao', andamento({ fase, tarefasProntas: 1, tarefasTotal: 2 }))).toEqual({
      visivel: `${rotulo} · 1/2`,
      leitor: `Andamento: ${rotulo}, 1 de 2 tarefas prontas.`,
      cor: 'marinho',
    });
    expect(seloDeFase('em_construcao', andamento({ fase, tarefasProntas: 0, tarefasTotal: 0 }))).toEqual({
      visivel: rotulo,
      leitor: `Andamento: ${rotulo}.`,
      cor: 'marinho',
    });
    const s = secaoDoAndamento(andamento({ fase }), [], formatar);
    expect(s?.fase).toBe(rotulo);
    expect(JSON.stringify(s)).not.toContain(`"${fase}"`);
  });
});

describe('limites dos números', () => {
  it('999 de 999 (o máximo do esquema) ainda é válido', () => {
    expect(seloDeFase('em_construcao', andamento({ tarefasProntas: 999, tarefasTotal: 999 }))).toEqual({
      visivel: 'Construindo · 999/999',
      leitor: 'Andamento: Construindo, 999 de 999 tarefas prontas.',
      cor: 'marinho',
    });
    expect(secaoDoAndamento(andamento({ tarefasProntas: 999, tarefasTotal: 999 }), [], formatar)?.tarefas).toEqual({
      tipo: 'barra',
      texto: '999 de 999 tarefas',
      valor: 999,
      maximo: 999,
      valorTexto: '999 de 999 tarefas',
      recurso: '999 de 999',
    });
  });

  it('0 de 17: barra com valor 0, não "sem plano"', () => {
    expect(secaoDoAndamento(andamento({ tarefasProntas: 0, tarefasTotal: 17 }), [], formatar)?.tarefas).toEqual({
      tipo: 'barra',
      texto: '0 de 17 tarefas',
      valor: 0,
      maximo: 17,
      valorTexto: '0 de 17 tarefas',
      recurso: '0 de 17',
    });
    expect(seloDeFase('em_construcao', andamento({ tarefasProntas: 0, tarefasTotal: 17 }))?.visivel).toBe('Construindo · 0/17');
  });

  it('prontas igual a total é válido; uma acima, não', () => {
    expect(seloDeFase('em_construcao', andamento({ tarefasProntas: 17, tarefasTotal: 17 }))?.visivel).toBe('Construindo · 17/17');
    expect(seloDeFase('em_construcao', andamento({ tarefasProntas: 1, tarefasTotal: 0 }))).toBeNull();
    expect(secaoDoAndamento(andamento({ tarefasProntas: 1, tarefasTotal: 0 }), [], formatar)).toBeNull();
  });

  it.each([
    ['NaN em prontas', { tarefasProntas: Number.NaN }],
    ['NaN em total', { tarefasTotal: Number.NaN }],
    ['Infinity em total', { tarefasTotal: Number.POSITIVE_INFINITY }],
    ['-Infinity em prontas', { tarefasProntas: Number.NEGATIVE_INFINITY }],
    ['1000 em prontas e total', { tarefasProntas: 1000, tarefasTotal: 1000 }],
    ['nulo em total', { tarefasTotal: null }],
    ['booleano em prontas', { tarefasProntas: true }],
    ['bigint em total', { tarefasTotal: BigInt(17) }],
    ['texto vazio em prontas', { tarefasProntas: '' }],
  ] as const)('%s: sem selo e sem seção', (_nome, fora) => {
    expect(seloDeFase('em_construcao', montadoAMao(fora))).toBeNull();
    expect(secaoDoAndamento(montadoAMao(fora), [], formatar)).toBeNull();
  });

  it('-0 vale como 0: o texto nunca mostra "-0"', () => {
    const s = secaoDoAndamento(andamento({ tarefasProntas: -0, tarefasTotal: 5 }), [], formatar);
    expect(s?.tarefas).toMatchObject({ tipo: 'barra', texto: '0 de 5 tarefas', recurso: '0 de 5' });
    const selo = seloDeFase('em_construcao', andamento({ tarefasProntas: -0, tarefasTotal: 5 }));
    expect(selo?.visivel).toBe('Construindo · 0/5');
    // Só os textos de tarefas: o id do DEC tem "-0002" por formato.
    const textos = [s?.tarefas.texto, s?.tarefas.tipo === 'barra' ? s.tarefas.valorTexto : '', s?.tarefas.tipo === 'barra' ? s.tarefas.recurso : '', selo?.visivel, selo?.leitor];
    for (const t of textos) expect(t).not.toContain('-0');
  });
});

describe('valor fora da lista (AN-12): sem selo e sem seção', () => {
  it.each([
    ['fase herdada: hasOwnProperty', { fase: 'hasOwnProperty' }],
    ['fase herdada: valueOf', { fase: 'valueOf' }],
    ['fase herdada: constructor', { fase: 'constructor' }],
    ['fase herdada: __defineGetter__', { fase: '__defineGetter__' }],
    ['fase pelo rótulo, não pela chave', { fase: 'Construindo' }],
    ['fase com espaço em volta', { fase: ' construindo' }],
    ['fase em maiúsculas', { fase: 'CONSTRUINDO' }],
    ['fase vazia', { fase: '' }],
    ['fase como objeto String', { fase: Object('construindo') }],
    ['fase ausente', { fase: undefined }],
    ['situação herdada: __proto__', { statusConstrucao: '__proto__' }],
    ['situação herdada: toString', { statusConstrucao: 'toString' }],
    ['situação pelo rótulo', { statusConstrucao: 'Concluída' }],
    ['situação com espaço', { statusConstrucao: 'construido ' }],
    ['situação nula', { statusConstrucao: null }],
    ['data como número', { atualizadoEm: QUANDO.getTime() }],
    ['data nula', { atualizadoEm: null }],
  ] as const)('%s', (_nome, fora) => {
    expect(seloDeFase('em_construcao', montadoAMao(fora))).toBeNull();
    expect(secaoDoAndamento(montadoAMao(fora), [], formatar)).toBeNull();
  });

  it('concluída e cancelada não mostram a fase, mas a fase fora da lista ainda tira o selo e a seção', () => {
    for (const statusConstrucao of ['construido', 'cancelado']) {
      for (const fase of ['<img src=x onerror=alert(1)>', '__proto__', 'toString']) {
        expect(seloDeFase('em_construcao', montadoAMao({ statusConstrucao, fase }))).toBeNull();
        expect(secaoDoAndamento(montadoAMao({ statusConstrucao, fase }), [], formatar)).toBeNull();
      }
      expect(seloDeFase('em_construcao', montadoAMao({ statusConstrucao, tarefasProntas: 18, tarefasTotal: 17 }))).toBeNull();
    }
  });

  it('data inválida também tira o selo (não só a seção)', () => {
    expect(seloDeFase('em_construcao', andamento({ atualizadoEm: new Date('data-que-nao-existe') }))).toBeNull();
    expect(seloDeFase('em_construcao', montadoAMao({ atualizadoEm: '2026-11-13T10:00:00Z' }))).toBeNull();
  });
});

describe('o DEC na seção: link e alerta só com o formato de RE_ID_DEC (CV-19)', () => {
  it('DEC válido sem pacote na lista: link, sem alerta', () => {
    const s = secaoDoAndamento(andamento(), [], formatar);
    expect(s?.dec).toEqual({ id: DEC, href: `/pacotes-decisao/${DEC}` });
    expect(s?.alertas).toEqual([]);
  });

  it.each([
    ['DEC com sufixo de caminho', `${DEC}/../../api/tokens`],
    ['DEC com quebra de linha no fim', `${DEC}\n`],
    ['DEC com prefixo', `x${DEC}`],
    ['DEC em minúsculas', DEC.toLowerCase()],
    ['DEC com aspas', `${DEC}"`],
    ['DEC vazio', ''],
    ['DEC de cinco dígitos na versão', 'DEC-DEM-20991231-0002-v12345'],
  ])('%s: dec null, sem link e sem alerta com o id', (_nome, decId) => {
    const s = secaoDoAndamento(andamento({ decId }), [{ id: decId, substituido: true }], formatar);
    expect(s).not.toBeNull();
    expect(s?.dec).toBeNull();
    expect(s?.alertas).toEqual([]);
    expect(JSON.stringify(s)).not.toContain('pacotes-decisao');
  });

  it('o mesmo id duas vezes na lista de pacotes: um alerta só', () => {
    const s = secaoDoAndamento(
      andamento(),
      [
        { id: DEC, substituido: true },
        { id: DEC, substituido: true },
      ],
      formatar,
    );
    expect(s?.alertas).toEqual([TEXTOS_ANDAMENTO.substituido(DEC)]);
  });

  it('o alerta de substituído compara o id inteiro, não o começo', () => {
    const parecido = 'DEC-DEM-20991231-0002-v30';
    expect(secaoDoAndamento(andamento(), [{ id: parecido, substituido: true }], formatar)?.alertas).toEqual([]);
  });
});

describe('pureza', () => {
  it('não muda a entrada (andamento e pacotes congelados)', () => {
    const a = Object.freeze(andamento({ statusConstrucao: 'cancelado' }));
    const pacotes = Object.freeze([Object.freeze({ id: DEC, substituido: true })]);
    expect(() => secaoDoAndamento(a, pacotes, formatar)).not.toThrow();
    expect(() => seloDeFase('em_construcao', a)).not.toThrow();
    expect(a).toEqual(andamento({ statusConstrucao: 'cancelado' }));
    expect(pacotes).toEqual([{ id: DEC, substituido: true }]);
  });

  it('não chama formatar quando devolve null; chama uma vez, com a data do andamento, quando devolve a seção', () => {
    const f = vi.fn(formatar);
    expect(secaoDoAndamento(null, [], f)).toBeNull();
    expect(secaoDoAndamento(montadoAMao({ fase: '__proto__' }), [], f)).toBeNull();
    expect(f).not.toHaveBeenCalled();
    secaoDoAndamento(andamento(), [], f);
    expect(f).toHaveBeenCalledTimes(1);
    expect(f).toHaveBeenCalledWith(QUANDO);
  });

  it('cada chamada devolve uma lista de alertas nova', () => {
    const a = andamento({ statusConstrucao: 'cancelado' });
    const primeira = secaoDoAndamento(a, [], formatar);
    primeira?.alertas.push('mexido');
    expect(secaoDoAndamento(a, [], formatar)?.alertas).toEqual([TEXTOS_ANDAMENTO.cancelada]);
  });

  it('a mesma entrada dá a mesma saída', () => {
    const a = andamento({ fase: 'testando', tarefasProntas: 4, tarefasTotal: 9 });
    expect(secaoDoAndamento(a, [], formatar)).toEqual(secaoDoAndamento(a, [], formatar));
    expect(seloDeFase('em_construcao', a)).toEqual(seloDeFase('em_construcao', a));
  });
});
