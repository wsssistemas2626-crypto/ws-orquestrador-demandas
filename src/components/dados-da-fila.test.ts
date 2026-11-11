// T08 do DEC-DEM-20261110-0015-v1: regras de exibição da T03 Fila (RF-05, RF-06, CV-07, CV-19).
import { describe, expect, it } from 'vitest';
import { hrefDaFila } from '../app/(painel)/demandas/fila';
import { filtroDemandasSchema } from '../modules/demandas/schemas';
import { contadoresDaFila, idadeDaDemanda, textoDasEtapas, TEXTOS_CONTADORES } from './dados-da-fila';

const f = (q: Record<string, string> = {}) => filtroDemandasSchema.parse(q);
const contagem = {
  porStatus: {
    nova: 3,
    em_analise: 5,
    aguardando_informacao: 2,
    pronta_para_decisao: 2,
    aprovada: 1,
    em_construcao: 4,
    entregue: 0,
    devolvida: 0,
    encerrada: 1,
  },
  todas: 18,
};

describe('contadoresDaFila (RF-05)', () => {
  it('CA-05.1: "Todas" e os nove status na ordem de ROTULO_STATUS; sem status na URL, só "Todas" pressionado', () => {
    const c = contadoresDaFila(contagem, f(), hrefDaFila);
    expect(c.map((x) => [x.rotulo, x.total, x.pressionado])).toEqual([
      ['Todas', 18, true],
      ['Nova', 3, false],
      ['Em análise', 5, false],
      ['Aguardando informação', 2, false],
      ['Pronta para decisão', 2, false],
      ['Aprovada', 1, false],
      ['Em construção', 4, false],
      ['Entregue', 0, false],
      ['Devolvida pela construção', 0, false],
      ['Encerrada', 1, false],
    ]);
  });
  it('CA-05.3: ativar "Em análise" com status=nova, tipo=bug e offset=20 leva a status=em_analise&tipo=bug, sem offset', () => {
    const c = contadoresDaFila(contagem, f({ status: 'nova', tipo: 'bug', offset: '20' }), hrefDaFila);
    expect(c.find((x) => x.status === 'em_analise')!.href).toBe('/demandas?status=em_analise&tipo=bug');
  });
  it('CA-05.5: o contador pressionado tira o status; "Todas" também', () => {
    const c = contadoresDaFila(contagem, f({ status: 'nova', tipo: 'bug' }), hrefDaFila);
    expect(c.find((x) => x.status === 'nova')).toMatchObject({ pressionado: true, href: '/demandas?tipo=bug', valor: '' });
    expect(c[0]).toMatchObject({ pressionado: false, href: '/demandas?tipo=bug', valor: '' });
  });
  it('contagem que falhou: total null em todos, e os href continuam (03, 4.6)', () => {
    const c = contadoresDaFila(null, f(), hrefDaFila);
    expect(c.every((x) => x.total === null)).toBe(true);
    expect(c[1]!.href).toBe('/demandas?status=nova');
  });
  it('CV-07 e CV-19: todo href começa por /demandas e todo valor é vazio ou do enum', () => {
    for (const x of contadoresDaFila(contagem, f({ tipo: 'bug' }), hrefDaFila)) {
      expect(x.href).toMatch(/^\/demandas(\?|$)/);
      expect(['', 'nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao', 'aprovada', 'em_construcao', 'entregue', 'devolvida', 'encerrada']).toContain(x.valor);
    }
  });
  it('cor: "Todas" sem cor; cada status com a cor do selo dele (COR_STATUS)', () => {
    const c = contadoresDaFila(contagem, f(), hrefDaFila);
    expect(c[0]!.cor).toBeNull();
    expect(c.find((x) => x.status === 'pronta_para_decisao')!.cor).toBe('petroleo');
  });
  it('texto oculto: " demandas" e " demanda" no singular', () => {
    expect(TEXTOS_CONTADORES.demandas(1)).toBe(' demanda');
    expect(TEXTOS_CONTADORES.demandas(3)).toBe(' demandas');
  });
});

describe('idadeDaDemanda (CA-06.2), em dias de calendário de São Paulo', () => {
  const agora = new Date('2026-11-10T15:00:00Z');
  it.each([
    ['2026-11-10T13:00:00Z', 'Hoje'],
    ['2026-11-09T13:00:00Z', '1 dia'],
    ['2026-11-07T13:00:00Z', '3 dias'],
    ['2026-11-10T02:30:00Z', '1 dia'], // 23h30 de 09/11 em São Paulo
  ])('%s → %s', (criada, texto) => expect(idadeDaDemanda(new Date(criada), agora).texto).toBe(texto));
  it('a data "dd/mm/aaaa" e o ISO para o <time>', () => {
    expect(idadeDaDemanda(new Date('2026-11-07T13:00:00Z'), agora)).toMatchObject({ data: '07/11/2026', iso: '2026-11-07T13:00:00.000Z' });
  });
});

describe('textoDasEtapas (RF-06)', () => {
  it('CA-06.1: "Etapas: ESP feita, RSK feita, DEC por fazer"', () => {
    expect(textoDasEtapas({ esp: true, rsk: true, dec: false })).toBe('Etapas: ESP feita, RSK feita, DEC por fazer');
  });
});
