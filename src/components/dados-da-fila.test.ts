// T08 do DEC-DEM-20261110-0015-v1: regras de exibição da T03 Fila (RF-05, RF-06, CV-07, CV-19).
import { describe, expect, it } from 'vitest';
import { hrefDaFila, lerFiltroDaFila } from '../app/(painel)/demandas/fila';
import { filtroDemandasSchema, STATUS, type FiltroDemandas, type Status } from '../modules/demandas/schemas';
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

// 06-T08-testes (qa-automacao): bordas da regra, CA-05.7 na regra e CV-07 com valor injetado na URL. Datas fixas, sem
// relógio real; cada teste monta o próprio filtro, sem depender de ordem.

describe('contadoresDaFila: bordas (06-T08-testes)', () => {
  it('cobre exatamente os nove status do enum; sem status na URL, cada um leva ao próprio status e tem o próprio valor', () => {
    const porStatus = contadoresDaFila(contagem, f(), hrefDaFila).slice(1);
    expect(porStatus.map((x) => x.status).sort()).toEqual([...STATUS].sort());
    for (const x of porStatus) {
      expect(x).toMatchObject({ pressionado: false, valor: x.status, href: `/demandas?status=${x.status}` });
    }
  });

  it('com cada status na URL, só o contador dele fica pressionado, com valor vazio e href sem status', () => {
    for (const s of STATUS) {
      const c = contadoresDaFila(contagem, f({ status: s }), hrefDaFila);
      expect(c.filter((x) => x.pressionado).map((x) => x.status)).toEqual([s]);
      expect(c.find((x) => x.status === s)).toMatchObject({ valor: '', href: '/demandas' });
      expect(c[0]).toMatchObject({ pressionado: false, valor: '', href: '/demandas' });
    }
  });

  it('CA-05.3: todo contador mantém tipo e linhaServicoProvavel e nenhum leva offset', () => {
    const c = contadoresDaFila(contagem, f({ status: 'nova', tipo: 'bug', linhaServicoProvavel: 'sob_medida', offset: '40' }), hrefDaFila);
    expect(c[0]!.href).toBe('/demandas?tipo=bug&linhaServicoProvavel=sob_medida');
    expect(c.find((x) => x.status === 'aprovada')!.href).toBe('/demandas?status=aprovada&tipo=bug&linhaServicoProvavel=sob_medida');
    for (const x of c) {
      expect(x.href).toContain('tipo=bug');
      expect(x.href).toContain('linhaServicoProvavel=sob_medida');
      expect(x.href).not.toContain('offset');
    }
  });

  it('volta à página 1: a função de endereço recebe offset 0 em todos os dez contadores', () => {
    const offsets: number[] = [];
    const espiao = (_g: FiltroDemandas, o: number) => {
      offsets.push(o);
      return '/demandas';
    };
    contadoresDaFila(contagem, f({ status: 'nova', offset: '60' }), espiao);
    expect(offsets).toEqual(Array.from({ length: 10 }, () => 0));
  });

  it('não altera o filtro recebido', () => {
    const filtro = f({ status: 'nova', tipo: 'bug' });
    const antes = { ...filtro };
    contadoresDaFila(contagem, Object.freeze(filtro), hrefDaFila);
    expect(filtro).toEqual(antes);
  });

  it('total 0 é número, não null: só a contagem que falhou fica sem número', () => {
    const zeros = { porStatus: Object.fromEntries(STATUS.map((s) => [s, 0])) as Record<Status, number>, todas: 0 };
    expect(contadoresDaFila(zeros, f(), hrefDaFila).map((x) => x.total)).toEqual(Array.from({ length: 10 }, () => 0));
  });

  it('contagem que falhou não muda pressionado, href, valor nem cor (03, 4.6)', () => {
    const filtro = f({ status: 'em_analise', tipo: 'bug' });
    const semTotal = (c: ReturnType<typeof contadoresDaFila>) => c.map((x) => [x.status, x.pressionado, x.href, x.valor, x.cor]);
    expect(semTotal(contadoresDaFila(null, filtro, hrefDaFila))).toEqual(semTotal(contadoresDaFila(contagem, filtro, hrefDaFila)));
  });
});

describe('CA-05.7 e CV-07 na regra: filtro inválido da URL (06-T08-testes)', () => {
  const pressionados = (c: ReturnType<typeof contadoresDaFila>) => c.filter((x) => x.pressionado).map((x) => x.rotulo);

  it('CA-05.7: ?status=xyz é inválido, cai no filtro padrão e só "Todas" fica pressionado', () => {
    const { filtro, invalido } = lerFiltroDaFila({ status: 'xyz' });
    expect(invalido).toBe(true);
    const c = contadoresDaFila(contagem, filtro, hrefDaFila);
    expect(pressionados(c)).toEqual(['Todas']);
    expect(c[0]!.href).toBe('/demandas');
  });

  it('CV-07: status injetado com tipo=bug não aparece em nenhum href nem valor', () => {
    const { filtro, invalido } = lerFiltroDaFila({ status: '<script>window.__xss=1</script>', tipo: 'bug' });
    expect(invalido).toBe(true);
    const c = contadoresDaFila(contagem, filtro, hrefDaFila);
    expect(pressionados(c)).toEqual(['Todas']);
    for (const x of c) {
      expect(x.href).toMatch(/^\/demandas(\?|$)/);
      expect(x.href).not.toMatch(/script|xss|%3C|</i);
      expect(['', ...STATUS]).toContain(x.valor);
    }
  });

  it('CV-07: status repetido na URL (chega como lista) é inválido e nenhum dos valores fica pressionado', () => {
    const { filtro, invalido } = lerFiltroDaFila({ status: ['nova', 'aprovada'] });
    expect(invalido).toBe(true);
    expect(pressionados(contadoresDaFila(contagem, filtro, hrefDaFila))).toEqual(['Todas']);
  });

  it('status vazio (opção "Todos" do formulário sem script) não é inválido e deixa "Todas" pressionado', () => {
    const { filtro, invalido } = lerFiltroDaFila({ status: '', tipo: 'bug' });
    expect(invalido).toBe(false);
    const c = contadoresDaFila(contagem, filtro, hrefDaFila);
    expect(pressionados(c)).toEqual(['Todas']);
    expect(c[0]!.href).toBe('/demandas?tipo=bug');
  });
});

describe('idadeDaDemanda: bordas (06-T08-testes)', () => {
  const agora = new Date('2026-11-10T15:00:00Z');

  it('criada depois do agora (relógio adiantado ou dado errado) mostra "Hoje", nunca dias negativos', () => {
    expect(idadeDaDemanda(new Date('2026-11-12T15:00:00Z'), agora).texto).toBe('Hoje');
  });

  it.each([
    ['2026-11-11T02:30:00Z', '2026-11-10T13:00:00Z', 'Hoje'], // agora 23h30 de 10/11 em São Paulo
    ['2026-11-11T03:00:00Z', '2026-11-10T13:00:00Z', '1 dia'], // agora 00h00 de 11/11 em São Paulo
    ['2026-11-10T15:00:00Z', '2026-11-08T15:00:00Z', '2 dias'],
    ['2026-11-10T15:00:00Z', '2026-10-01T15:00:00Z', '40 dias'], // virada de mês
    ['2026-01-01T15:00:00Z', '2025-12-31T15:00:00Z', '1 dia'], // virada de ano
  ])('agora %s, criada %s → %s', (a, criada, texto) => {
    expect(idadeDaDemanda(new Date(criada), new Date(a)).texto).toBe(texto);
  });

  it('a data "criada em" é a do calendário de São Paulo, não a do UTC', () => {
    expect(idadeDaDemanda(new Date('2026-11-10T02:30:00Z'), agora)).toEqual({
      texto: '1 dia',
      data: '09/11/2026',
      iso: '2026-11-10T02:30:00.000Z',
    });
  });

  it('não altera as datas recebidas', () => {
    const criada = new Date('2026-11-07T13:00:00Z');
    const a = new Date('2026-11-10T15:00:00Z');
    idadeDaDemanda(criada, a);
    expect([criada.toISOString(), a.toISOString()]).toEqual(['2026-11-07T13:00:00.000Z', '2026-11-10T15:00:00.000Z']);
  });
});

describe('textoDasEtapas: as oito combinações (06-T08-testes)', () => {
  it.each([
    [false, false, false, 'Etapas: ESP por fazer, RSK por fazer, DEC por fazer'],
    [true, false, false, 'Etapas: ESP feita, RSK por fazer, DEC por fazer'],
    [false, true, false, 'Etapas: ESP por fazer, RSK feita, DEC por fazer'],
    [false, false, true, 'Etapas: ESP por fazer, RSK por fazer, DEC feita'],
    [true, true, false, 'Etapas: ESP feita, RSK feita, DEC por fazer'],
    [true, false, true, 'Etapas: ESP feita, RSK por fazer, DEC feita'],
    [false, true, true, 'Etapas: ESP por fazer, RSK feita, DEC feita'],
    [true, true, true, 'Etapas: ESP feita, RSK feita, DEC feita'],
  ])('esp=%s, rsk=%s, dec=%s → %s', (esp, rsk, dec, texto) => {
    expect(textoDasEtapas({ esp, rsk, dec })).toBe(texto);
  });
});
