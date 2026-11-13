// Escrito na 06-T05-testes (qa-automacao) do DEC-DEM-20261111-0017-v1. O que o teste do plano (regras.test.ts) deixa
// aberto nas regras puras do andamento (AN-04, AN-11, AN-12, RF-04, RF-05, RF-06):
//   - CA-04.4: números que diminuem (replanejamento) gravam sem marco;
//   - o instante gravado não entra no "mesmo estado" (senão o reenvio do CA-04.2 nunca seria idempotente);
//   - "mesmo estado" e "marco" nunca valem juntos, em todas as combinações;
//   - CA-06.6 com a contagem exata (7) e com cada envio repetido;
//   - decidirPorStatus nunca devolve o próprio status como destino e concorda com transicaoDoConstruir (D-08);
//   - transicaoDoConstruir com chave herdada do protótipo (Object.hasOwn) e construido em toda origem;
//   - as tabelas congeladas por dentro;
//   - lerAndamento com entrada que não é objeto, número negativo, fração, NaN, Infinity, data inválida, chave faltando e
//     valor parecido com o da lista; a vista nunca leva a demandaId da linha;
//   - paraIntegracao e marcoDoEvento sem decId nem chave a mais, e com os valores copiados.
// Unitário, sem banco e sem relógio real (as datas são fixas). Dados fictícios.
import { describe, expect, it } from 'vitest';
import { FASES_ANDAMENTO, STATUS_CONSTRUCAO, type FaseAndamento, type StatusConstrucao } from '../../db/schema/andamento';
import type { Status, Tipo } from '../demandas/schemas';
import { AUTOMATICAS_DO_CONSTRUIR, CONTRADIZ_STATUS_FINAL, transicaoDoConstruir } from '../demandas/transicoes';
import { decidirPorStatus, lerAndamento, marcoDoEvento, mesmoEstado, mudancaDeMarco, type EstadoDoAndamento } from './regras';
import { paraIntegracao, type AndamentoVista } from './schemas';

const DEC1 = 'DEC-DEM-20261112-0005-v1';
const DEC2 = 'DEC-DEM-20261112-0005-v2';
const T = new Date('2026-11-12T12:00:00Z');
const T_MAIS_2 = new Date('2026-11-12T12:02:00Z');
const E: EstadoDoAndamento = { decId: DEC1, fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, statusConstrucao: 'em_construcao' };
const LINHA = { demandaId: 'DEM-20261112-0005', decId: DEC1, fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, statusConstrucao: 'em_construcao', gravadoEm: T };

const STATUS: readonly Status[] = ['nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao', 'aprovada', 'em_construcao', 'devolvida', 'entregue', 'encerrada'];
const TIPOS = ['melhoria', 'estudo'] as const satisfies readonly Tipo[];

describe('mesmoEstado e mudancaDeMarco: bordas do RF-04 e do RF-06', () => {
  it('CA-04.4: construindo 9/17 → construindo 3/19 grava (não é o mesmo estado) e não é marco', () => {
    const novo = { ...E, tarefasProntas: 3, tarefasTotal: 19 };
    expect(mesmoEstado(E, novo)).toBe(false);
    expect(mudancaDeMarco(E, novo)).toBe(false);
  });

  it('CA-04.2: o andamento gravado (com atualizadoEm) e o reenvio igual são o mesmo estado, qualquer que seja o instante', () => {
    const gravado: AndamentoVista = { ...E, atualizadoEm: T };
    expect(mesmoEstado(gravado, { ...E })).toBe(true);
    expect(mesmoEstado(gravado, { ...E, atualizadoEm: T_MAIS_2 } as EstadoDoAndamento)).toBe(true);
    expect(mudancaDeMarco(gravado, { ...E })).toBe(false);
  });

  it('o primeiro envio de um DEC novo sobre o andamento de outro DEC, com os outros quatro campos iguais, grava e é marco', () => {
    expect(mesmoEstado(E, { ...E, decId: DEC2 })).toBe(false);
    expect(mudancaDeMarco(E, { ...E, decId: DEC2 })).toBe(true);
  });

  it('em todas as combinações de fase × status × números, "mesmo estado" e "marco" nunca valem juntos', () => {
    const estados: EstadoDoAndamento[] = [];
    for (const decId of [DEC1, DEC2])
      for (const fase of FASES_ANDAMENTO)
        for (const statusConstrucao of STATUS_CONSTRUCAO)
          for (const [tarefasProntas, tarefasTotal] of [[0, 0], [9, 17], [3, 19]] as const) estados.push({ decId, fase, tarefasProntas, tarefasTotal, statusConstrucao });
    let mesmos = 0;
    for (const g of estados)
      for (const n of estados) {
        const igual = mesmoEstado(g, n);
        if (igual) mesmos++;
        expect(igual && mudancaDeMarco(g, n), `${JSON.stringify(g)} → ${JSON.stringify(n)}`).toBe(false);
        // Só os números diferem: grava sem marco (A2).
        const soNumeros = g.decId === n.decId && g.fase === n.fase && g.statusConstrucao === n.statusConstrucao;
        expect(mudancaDeMarco(g, n)).toBe(!soNumeros);
      }
    // Cada estado só é o mesmo de si próprio.
    expect(mesmos).toBe(estados.length);
  });

  it('sem andamento gravado, todo envio grava e é marco (CA-06.1)', () => {
    for (const fase of FASES_ANDAMENTO)
      for (const statusConstrucao of STATUS_CONSTRUCAO) {
        const n = { ...E, fase, statusConstrucao };
        expect(mesmoEstado(null, n)).toBe(false);
        expect(mudancaDeMarco(null, n)).toBe(true);
      }
  });

  it('CA-06.6: o ciclo de 20 tarefas dá exatamente 7 marcos e 27 gravações; com cada envio repetido, os mesmos números', () => {
    const seq: EstadoDoAndamento[] = [];
    const s = (fase: FaseAndamento, p: number, sc: StatusConstrucao = 'em_construcao') =>
      seq.push({ decId: DEC1, fase, tarefasProntas: p, tarefasTotal: 20, statusConstrucao: sc });
    s('entendendo_o_pedido', 0);
    s('planejando', 0);
    for (let p = 0; p <= 20; p++) s('construindo', p);
    s('testando', 20);
    s('revisando_e_entregando', 20);
    s('documentando', 20);
    s('documentando', 20, 'construido');
    const contar = (envios: readonly EstadoDoAndamento[]) => {
      let marcos = 0;
      let gravacoes = 0;
      let gravado: EstadoDoAndamento | null = null;
      for (const e of envios) {
        if (mesmoEstado(gravado, e)) continue;
        gravacoes++;
        if (mudancaDeMarco(gravado, e)) marcos++;
        gravado = e;
      }
      return { marcos, gravacoes };
    };
    expect(contar(seq)).toEqual({ marcos: 7, gravacoes: 27 });
    // O /construir reenvia o mesmo estado a cada 2 minutos: repetir cada envio não cria marco nem gravação.
    expect(contar(seq.flatMap((e) => [e, { ...e }, { ...e }]))).toEqual({ marcos: 7, gravacoes: 27 });
  });
});

describe('marcoDoEvento (AN-11, CA-06.4): só as quatro chaves, com os valores do estado', () => {
  it('copia fase, números e statusConstrucao; nunca decId, atualizadoEm nem chave a mais', () => {
    const entrada = { ...E, atualizadoEm: T, demandaId: 'DEM-20261112-0005', extra: '<b>x</b>' } as unknown as EstadoDoAndamento;
    const m = marcoDoEvento(entrada);
    expect(m).toStrictEqual({ fase: 'construindo', tarefasProntas: 9, tarefasTotal: 17, statusConstrucao: 'em_construcao' });
    expect(JSON.stringify(m)).not.toContain(DEC1);
    expect(m).not.toBe(entrada);
  });

  it('para cada fase e status, só enumeração da lista e inteiro (C-30)', () => {
    for (const fase of FASES_ANDAMENTO)
      for (const statusConstrucao of STATUS_CONSTRUCAO) {
        const m = marcoDoEvento({ ...E, fase, statusConstrucao, tarefasProntas: 0, tarefasTotal: 999 });
        expect(FASES_ANDAMENTO).toContain(m.fase);
        expect(STATUS_CONSTRUCAO).toContain(m.statusConstrucao);
        expect(Number.isInteger(m.tarefasProntas) && Number.isInteger(m.tarefasTotal)).toBe(true);
      }
  });
});

describe('decidirPorStatus e transicaoDoConstruir: a mesma fonte (D-08) e nada de destino final', () => {
  for (const tipo of TIPOS)
    for (const status of STATUS)
      for (const sc of STATUS_CONSTRUCAO)
        it(`${tipo} ${status} + ${sc}: o destino é o de transicaoDoConstruir, diferente do atual, nunca entregue nem encerrada`, () => {
          const d = decidirPorStatus({ status, tipo }, sc);
          const final = status === 'entregue' || status === 'encerrada';
          if (d.tipo === 'recusa') {
            expect(final).toBe(true);
            expect(CONTRADIZ_STATUS_FINAL[status as 'entregue' | 'encerrada']).toContain(sc);
            return;
          }
          expect(d.para).not.toBe(status);
          expect(d.para === 'entregue' || d.para === 'encerrada').toBe(false);
          if (final) expect(d.para).toBeNull();
          else expect(d.para).toBe(transicaoDoConstruir({ status, tipo }, sc));
        });

  it('decidirPorStatus devolve um objeto novo a cada chamada (quem chama não altera a decisão de outro)', () => {
    const a = decidirPorStatus({ status: 'aprovada', tipo: 'melhoria' }, 'em_construcao');
    const b = decidirPorStatus({ status: 'aprovada', tipo: 'melhoria' }, 'em_construcao');
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
  });

  it('construido nunca muda o status, em nenhuma origem e em nenhum tipo (RF-05)', () => {
    for (const tipo of TIPOS) for (const status of STATUS) expect(transicaoDoConstruir({ status, tipo }, 'construido'), `${tipo} ${status}`).toBeNull();
  });

  it('chave herdada do protótipo não vira regra (Object.hasOwn)', () => {
    for (const chave of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf'])
      for (const status of STATUS) expect(transicaoDoConstruir({ status, tipo: 'melhoria' }, chave as StatusConstrucao), `${chave} ${status}`).toBeNull();
  });

  it('as tabelas são congeladas por dentro e não aceitam mudança em execução', () => {
    expect(Object.isFrozen(AUTOMATICAS_DO_CONSTRUIR.em_construcao)).toBe(true);
    expect(Object.isFrozen(AUTOMATICAS_DO_CONSTRUIR.cancelado)).toBe(true);
    expect(Object.isFrozen(CONTRADIZ_STATUS_FINAL)).toBe(true);
    expect(Object.isFrozen(CONTRADIZ_STATUS_FINAL.entregue)).toBe(true);
    expect(Object.isFrozen(CONTRADIZ_STATUS_FINAL.encerrada)).toBe(true);
    const automaticas = AUTOMATICAS_DO_CONSTRUIR as unknown as Record<string, unknown>;
    const regra = AUTOMATICAS_DO_CONSTRUIR.cancelado as unknown as Record<string, unknown>;
    const finais = CONTRADIZ_STATUS_FINAL.entregue as unknown as unknown[];
    expect(() => {
      automaticas.construido = { de: 'em_construcao', para: 'entregue' };
    }).toThrow(TypeError);
    expect(() => {
      regra.para = 'encerrada';
    }).toThrow(TypeError);
    expect(() => {
      finais.push('construido');
    }).toThrow(TypeError);
    expect(transicaoDoConstruir({ status: 'em_construcao', tipo: 'melhoria' }, 'construido')).toBeNull();
    expect(transicaoDoConstruir({ status: 'em_construcao', tipo: 'melhoria' }, 'cancelado')).toBe('devolvida');
  });
});

describe('lerAndamento (AN-12, CA-04.6): mais linhas fora do esquema, sem lançar', () => {
  it('a vista tem exatamente seis chaves e não leva a demandaId nem chave a mais da linha', () => {
    const v = lerAndamento({ ...LINHA, extra: 'x', ator_token_prefixo: 'ficticio' });
    expect(v).not.toBeNull();
    expect(Object.keys(v!).sort()).toEqual(['atualizadoEm', 'decId', 'fase', 'statusConstrucao', 'tarefasProntas', 'tarefasTotal']);
    expect(v!.atualizadoEm.getTime()).toBe(T.getTime());
  });

  it('as bordas que valem: 0 de 0 e 999 de 999', () => {
    expect(lerAndamento({ ...LINHA, tarefasProntas: 0, tarefasTotal: 0 })).toMatchObject({ tarefasProntas: 0, tarefasTotal: 0 });
    expect(lerAndamento({ ...LINHA, tarefasProntas: 999, tarefasTotal: 999 })).toMatchObject({ tarefasProntas: 999, tarefasTotal: 999 });
  });

  it.each<[string, unknown]>([
    ['undefined', undefined],
    ['texto', 'construindo'],
    ['número', 9],
    ['booleano', true],
    ['lista', [LINHA]],
    ['objeto vazio', {}],
    ['sem gravadoEm', { ...LINHA, gravadoEm: undefined }],
    ['sem fase', { ...LINHA, fase: undefined }],
    ['atualizadoEm no lugar de gravadoEm', { ...LINHA, gravadoEm: undefined, atualizadoEm: T }],
    ['prontas negativo', { ...LINHA, tarefasProntas: -1 }],
    ['total negativo', { ...LINHA, tarefasProntas: 0, tarefasTotal: -1 }],
    ['prontas fração', { ...LINHA, tarefasProntas: 9.5 }],
    ['prontas NaN', { ...LINHA, tarefasProntas: Number.NaN }],
    ['total Infinity', { ...LINHA, tarefasTotal: Number.POSITIVE_INFINITY }],
    ['total como bigint', { ...LINHA, tarefasTotal: 17n }],
    ['data inválida', { ...LINHA, gravadoEm: new Date('não é data') }],
    ['data em número', { ...LINHA, gravadoEm: T.getTime() }],
    ['fase em maiúscula', { ...LINHA, fase: 'Construindo' }],
    ['fase com espaço', { ...LINHA, fase: 'construindo ' }],
    ['status da demanda no lugar do da construção', { ...LINHA, statusConstrucao: 'devolvida' }],
    ['status com quebra de linha', { ...LINHA, statusConstrucao: 'em_construcao\n' }],
    ['DEC com espaço no fim', { ...LINHA, decId: `${DEC1} ` }],
    ['DEC de demanda', { ...LINHA, decId: 'DEM-20261112-0005' }],
  ])('%s → null, sem lançar', (_n, linha) => {
    expect(() => lerAndamento(linha)).not.toThrow();
    expect(lerAndamento(linha)).toBeNull();
  });
});

describe('paraIntegracao (IN-08, AN-09): o Awave vê só quatro chaves', () => {
  it('sem decId, statusConstrucao nem chave a mais, e com os valores da vista', () => {
    for (const statusConstrucao of STATUS_CONSTRUCAO) {
      const vista = { ...lerAndamento({ ...LINHA, statusConstrucao, fase: 'testando' })!, prefixo: 'ficticio' } as AndamentoVista;
      const v = paraIntegracao(vista);
      expect(Object.keys(v!).sort()).toEqual(['atualizadoEm', 'fase', 'tarefasProntas', 'tarefasTotal']);
      expect(v).toStrictEqual({ fase: 'testando', tarefasProntas: 9, tarefasTotal: 17, atualizadoEm: T });
      const json = JSON.stringify(v);
      expect(json).not.toContain(DEC1);
      expect(json).not.toContain(statusConstrucao);
      expect(json).not.toContain('ficticio');
    }
  });
});
