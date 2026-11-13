// T11 do DEC-DEM-20261111-0017-v1 (03, seções 4.1, 5.2, 5.3 e 8; RF-08, RF-09; AN-12; D-03): as regras puras do selo de
// fase da fila e da seção "Andamento da construção" do detalhe. Unitário, sem banco nem tela.
import { describe, expect, it } from 'vitest';
import type { StatusDemanda } from '../db/schema/demandas';
import type { AndamentoVista } from '../modules/andamento/schemas';
import { secaoDoAndamento, seloDeFase, TEXTOS_ANDAMENTO, type SecaoDoAndamento } from './dados-do-andamento';

const DEC = 'DEC-DEM-20991231-0001-v1';
const OUTRO_DEC = 'DEC-DEM-20991231-0001-v2';
const QUANDO = new Date('2026-11-12T17:32:00Z');

const andamento = (a: Partial<AndamentoVista> = {}): AndamentoVista => ({
  decId: DEC,
  fase: 'construindo',
  tarefasProntas: 9,
  tarefasTotal: 17,
  statusConstrucao: 'em_construcao',
  atualizadoEm: QUANDO,
  ...a,
});
const formatar = (dt: Date): string => `formatada ${dt.toISOString()}`;
const STATUS: readonly StatusDemanda[] = ['nova', 'em_analise', 'aguardando_informacao', 'pronta_para_decisao', 'aprovada', 'em_construcao', 'entregue', 'devolvida', 'encerrada'];

describe('TEXTOS_ANDAMENTO (03, seção 8, por inteiro)', () => {
  it('textos', () => {
    expect(TEXTOS_ANDAMENTO.secao).toBe('Andamento da construção');
    expect(TEXTOS_ANDAMENTO.termos).toEqual({ pedido: 'Pedido de Construção', fase: 'Fase', situacao: 'Situação', tarefas: 'Tarefas prontas' });
    expect(TEXTOS_ANDAMENTO.semPlano).toBe('Nenhuma tarefa contada. O plano de tarefas ainda não foi feito, ou este pedido não tem plano.');
    expect(TEXTOS_ANDAMENTO.cancelada).toBe('A construção deste pedido foi cancelada no /construir.');
    expect(TEXTOS_ANDAMENTO.substituido(DEC)).toBe(
      `Este andamento é do pedido de ${DEC}, cujo pacote foi substituído por um aprovado mais novo. O andamento do pedido novo aparece aqui quando o /construir começar.`,
    );
    expect(TEXTOS_ANDAMENTO.ultimaMudanca).toBe('Última mudança informada pelo /construir em ');
    expect(TEXTOS_ANDAMENTO.nota).toBe('Esta página não se atualiza sozinha. Recarregue para ver o andamento mais novo.');
    expect(TEXTOS_ANDAMENTO.erroNaFila).toBe('Não foi possível ler o andamento da construção. A fila aparece sem a fase das demandas em construção.');
    expect(TEXTOS_ANDAMENTO.seloConcluida).toBe('Construção concluída');
    expect(TEXTOS_ANDAMENTO.seloCancelada).toBe('Construção cancelada');
  });
});

describe('seloDeFase (03, 4.1)', () => {
  it.each([
    [andamento(), { visivel: 'Construindo · 9/17', leitor: 'Andamento: Construindo, 9 de 17 tarefas prontas.', cor: 'marinho' }],
    [
      andamento({ fase: 'revisando_e_entregando', tarefasProntas: 17, tarefasTotal: 17 }),
      { visivel: 'Revisando e entregando · 17/17', leitor: 'Andamento: Revisando e entregando, 17 de 17 tarefas prontas.', cor: 'marinho' },
    ],
    [andamento({ fase: 'planejando', tarefasProntas: 0, tarefasTotal: 1 }), { visivel: 'Planejando · 0/1', leitor: 'Andamento: Planejando, 0 de 1 tarefa pronta.', cor: 'marinho' }],
    [andamento({ fase: 'entendendo_o_pedido', tarefasProntas: 0, tarefasTotal: 0 }), { visivel: 'Entendendo o pedido', leitor: 'Andamento: Entendendo o pedido.', cor: 'marinho' }],
    [andamento({ fase: 'documentando', tarefasProntas: 12, tarefasTotal: 12, statusConstrucao: 'construido' }), { visivel: 'Construção concluída', leitor: 'Andamento: construção concluída.', cor: 'positivo' }],
    [andamento({ tarefasProntas: 0, tarefasTotal: 0, statusConstrucao: 'construido' }), { visivel: 'Construção concluída', leitor: 'Andamento: construção concluída.', cor: 'positivo' }],
    [andamento({ tarefasProntas: 3, tarefasTotal: 8, statusConstrucao: 'cancelado' }), { visivel: 'Construção cancelada', leitor: 'Andamento: construção cancelada.', cor: 'tinta-media' }],
  ])('em_construcao: %o', (a, selo) => {
    expect(seloDeFase('em_construcao', a)).toEqual(selo);
  });

  it('sem selo em todo status diferente de em_construcao, mesmo com andamento (CA-08.4)', () => {
    for (const s of STATUS.filter((x) => x !== 'em_construcao')) {
      expect(seloDeFase(s, andamento())).toBeNull();
      expect(seloDeFase(s, andamento({ statusConstrucao: 'construido' }))).toBeNull();
      expect(seloDeFase(s, andamento({ statusConstrucao: 'cancelado' }))).toBeNull();
    }
  });

  it('sem selo sem andamento', () => {
    for (const s of STATUS) expect(seloDeFase(s, null)).toBeNull();
  });

  it('sem selo com valor fora da lista, montado à mão (AN-12)', () => {
    const foraDaLista = (a: Record<string, unknown>) => andamento(a as Partial<AndamentoVista>);
    expect(seloDeFase('em_construcao', foraDaLista({ fase: '<img src=x onerror=alert(1)>' }))).toBeNull();
    expect(seloDeFase('em_construcao', foraDaLista({ fase: '__proto__' }))).toBeNull();
    expect(seloDeFase('em_construcao', foraDaLista({ fase: 'toString' }))).toBeNull();
    expect(seloDeFase('em_construcao', foraDaLista({ statusConstrucao: 'entregue' }))).toBeNull();
    expect(seloDeFase('em_construcao', foraDaLista({ statusConstrucao: 'constructor' }))).toBeNull();
    expect(seloDeFase('em_construcao', foraDaLista({ tarefasProntas: '9' }))).toBeNull();
    expect(seloDeFase('em_construcao', foraDaLista({ tarefasProntas: 1.5 }))).toBeNull();
    expect(seloDeFase('em_construcao', foraDaLista({ tarefasProntas: 18 }))).toBeNull();
    expect(seloDeFase('em_construcao', foraDaLista({ tarefasProntas: -1 }))).toBeNull();
    expect(seloDeFase('em_construcao', foraDaLista({ tarefasTotal: 1000, tarefasProntas: 9 }))).toBeNull();
  });
});

describe('secaoDoAndamento (03, 5.2 e 5.3)', () => {
  it('construindo 9/17 (CA-09.1)', () => {
    expect(secaoDoAndamento(andamento(), [], formatar)).toEqual<SecaoDoAndamento>({
      dec: { id: DEC, href: `/pacotes-decisao/${DEC}` },
      fase: 'Construindo',
      situacao: 'Em andamento',
      tarefas: { tipo: 'barra', texto: '9 de 17 tarefas', valor: 9, maximo: 17, valorTexto: '9 de 17 tarefas', recurso: '9 de 17' },
      alertas: [],
      ultimaMudanca: { data: formatar(QUANDO), iso: QUANDO.toISOString() },
      nota: 'Esta página não se atualiza sozinha. Recarregue para ver o andamento mais novo.',
    });
  });

  it('sem andamento: null (CA-09.4)', () => {
    expect(secaoDoAndamento(null, [], formatar)).toBeNull();
  });

  it('total 0: o texto da 03 e sem barra (CA-09.2)', () => {
    const s = secaoDoAndamento(andamento({ fase: 'entendendo_o_pedido', tarefasProntas: 0, tarefasTotal: 0 }), [], formatar);
    expect(s?.fase).toBe('Entendendo o pedido');
    expect(s?.tarefas).toEqual({ tipo: 'sem_plano', texto: 'Nenhuma tarefa contada. O plano de tarefas ainda não foi feito, ou este pedido não tem plano.' });
  });

  it('total 1: singular', () => {
    const s = secaoDoAndamento(andamento({ fase: 'planejando', tarefasProntas: 0, tarefasTotal: 1 }), [], formatar);
    expect(s?.tarefas).toEqual({ tipo: 'barra', texto: '0 de 1 tarefa', valor: 0, maximo: 1, valorTexto: '0 de 1 tarefa', recurso: '0 de 1' });
  });

  it('concluída: situação "Concluída", barra cheia, sem alerta', () => {
    const s = secaoDoAndamento(andamento({ fase: 'documentando', tarefasProntas: 12, tarefasTotal: 12, statusConstrucao: 'construido' }), [], formatar);
    expect(s?.situacao).toBe('Concluída');
    expect(s?.fase).toBe('Documentando');
    expect(s?.tarefas).toMatchObject({ tipo: 'barra', valor: 12, maximo: 12, texto: '12 de 12 tarefas' });
    expect(s?.alertas).toEqual([]);
  });

  it('cancelada: situação "Cancelada" e o alerta (CA-09.3)', () => {
    const s = secaoDoAndamento(andamento({ tarefasProntas: 3, tarefasTotal: 8, statusConstrucao: 'cancelado' }), [], formatar);
    expect(s?.situacao).toBe('Cancelada');
    expect(s?.alertas).toEqual(['A construção deste pedido foi cancelada no /construir.']);
  });

  it('pacote do decId substituído: o alerta com o id (5.2, item 3)', () => {
    const pacotes = [
      { id: OUTRO_DEC, substituido: false },
      { id: DEC, substituido: true },
    ];
    expect(secaoDoAndamento(andamento(), pacotes, formatar)?.alertas).toEqual([TEXTOS_ANDAMENTO.substituido(DEC)]);
  });

  it('pacote do decId não substituído, ou outro substituído: sem alerta', () => {
    expect(secaoDoAndamento(andamento(), [{ id: DEC, substituido: false }], formatar)?.alertas).toEqual([]);
    expect(secaoDoAndamento(andamento(), [{ id: OUTRO_DEC, substituido: true }], formatar)?.alertas).toEqual([]);
  });

  it('cancelada e substituído: os dois alertas, nessa ordem', () => {
    const s = secaoDoAndamento(andamento({ statusConstrucao: 'cancelado' }), [{ id: DEC, substituido: true }], formatar);
    expect(s?.alertas).toEqual([TEXTOS_ANDAMENTO.cancelada, TEXTOS_ANDAMENTO.substituido(DEC)]);
  });

  it('decId fora de RE_ID_DEC: "Não informado" (dec null), sem link e sem alerta com o id (CV-19)', () => {
    const fora = andamento({ decId: '<b>DEC</b>' });
    const s = secaoDoAndamento(fora, [{ id: '<b>DEC</b>', substituido: true }], formatar);
    expect(s?.dec).toBeNull();
    expect(s?.alertas).toEqual([]);
    expect(JSON.stringify(s)).not.toContain('<b>');
  });

  it('a linha da data: formatar injetado e o ISO de atualizadoEm', () => {
    const outra = new Date('2026-11-12T19:05:00Z');
    const s = secaoDoAndamento(andamento({ atualizadoEm: outra }), [], (dt) => (dt === outra ? '12/11/2026 às 16:05' : 'errada'));
    expect(s?.ultimaMudanca).toEqual({ data: '12/11/2026 às 16:05', iso: '2026-11-12T19:05:00.000Z' });
  });

  it('valor fora da lista, montado à mão: null, como sem andamento (AN-12; CA-04.6)', () => {
    const foraDaLista = (a: Record<string, unknown>) => andamento(a as Partial<AndamentoVista>);
    expect(secaoDoAndamento(foraDaLista({ fase: '__proto__' }), [], formatar)).toBeNull();
    expect(secaoDoAndamento(foraDaLista({ fase: '<img src=x>' }), [], formatar)).toBeNull();
    expect(secaoDoAndamento(foraDaLista({ statusConstrucao: 'entregue' }), [], formatar)).toBeNull();
    expect(secaoDoAndamento(foraDaLista({ tarefasProntas: 18 }), [], formatar)).toBeNull();
    expect(secaoDoAndamento(foraDaLista({ tarefasTotal: '17' }), [], formatar)).toBeNull();
    expect(secaoDoAndamento(foraDaLista({ atualizadoEm: new Date('x') }), [], formatar)).toBeNull();
    expect(secaoDoAndamento(foraDaLista({ atualizadoEm: '2026-11-12' }), [], formatar)).toBeNull();
  });
});
