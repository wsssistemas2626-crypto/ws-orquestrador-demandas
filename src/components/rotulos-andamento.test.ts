// T11 do DEC-DEM-20261111-0017-v1 (03, seções 5.7 e 8; RF-06; CA-06.5; AN-12): rótulos das fases e da situação da
// construção e a frase do evento andamento_registrado no histórico. Nada gravado de fora da lista chega à tela.
import { describe, expect, it } from 'vitest';
import { FASES_ANDAMENTO, MAXIMO_DE_TAREFAS, STATUS_CONSTRUCAO } from '../db/schema/andamento';
import type { EventoVisivel } from '../modules/historico/consultas';
import { MAXIMO_DE_TAREFAS_NA_TELA, ROTULO_FASE, ROTULO_SITUACAO_CONSTRUCAO, tarefasEmTexto, textoDoEvento } from './rotulos';

const DEC = 'DEC-DEM-20991231-0001-v1';
const ev = (depois: Record<string, unknown> | null, entidadeId = DEC): EventoVisivel => ({
  id: 1,
  ocorridoEm: new Date('2026-11-12T14:32:00Z'),
  ator: { tipo: 'integracao', integracao: 'construir', prefixo: 'a1b2c3d4' },
  entidade: 'pacote_decisao',
  entidadeId,
  acao: 'andamento_registrado',
  antes: null,
  depois,
});
const d = (fase: string, p: unknown, t: unknown, s: string) => ({ fase, tarefasProntas: p, tarefasTotal: t, statusConstrucao: s });

it('rótulos da 03, seção 8', () => {
  expect(ROTULO_FASE).toEqual({
    entendendo_o_pedido: 'Entendendo o pedido',
    planejando: 'Planejando',
    construindo: 'Construindo',
    testando: 'Testando',
    revisando_e_entregando: 'Revisando e entregando',
    documentando: 'Documentando',
  });
  expect(ROTULO_SITUACAO_CONSTRUCAO).toEqual({ em_construcao: 'Em andamento', construido: 'Concluída', cancelado: 'Cancelada' });
  expect(Object.isFrozen(ROTULO_FASE)).toBe(true);
  expect(Object.isFrozen(ROTULO_SITUACAO_CONSTRUCAO)).toBe(true);
});

it('as cópias da tela não se afastam das listas e do máximo do esquema', () => {
  expect(Object.keys(ROTULO_FASE)).toEqual([...FASES_ANDAMENTO]);
  expect(Object.keys(ROTULO_SITUACAO_CONSTRUCAO)).toEqual([...STATUS_CONSTRUCAO]);
  expect(MAXIMO_DE_TAREFAS_NA_TELA).toBe(MAXIMO_DE_TAREFAS);
});

it('tarefasEmTexto: plural e singular de total 1 (03, seção 8)', () => {
  expect(tarefasEmTexto(9, 17)).toBe('9 de 17 tarefas');
  expect(tarefasEmTexto(0, 1)).toBe('0 de 1 tarefa');
  expect(tarefasEmTexto(1, 1)).toBe('1 de 1 tarefa');
  expect(tarefasEmTexto(0, 0)).toBe('0 de 0 tarefas');
});

describe('textoDoEvento(andamento_registrado), 03 5.7', () => {
  it.each([
    [d('construindo', 9, 17, 'em_construcao'), `Registrou o andamento de ${DEC}: Construindo, 9 de 17 tarefas`],
    [d('documentando', 12, 12, 'construido'), `Registrou o fim da construção de ${DEC}: Documentando, 12 de 12 tarefas`],
    [d('construindo', 3, 8, 'cancelado'), `Registrou o cancelamento da construção de ${DEC}: Construindo, 3 de 8 tarefas`],
    [d('entendendo_o_pedido', 0, 0, 'em_construcao'), `Registrou o andamento de ${DEC}: Entendendo o pedido`],
    [d('documentando', 0, 0, 'construido'), `Registrou o fim da construção de ${DEC}: Documentando`],
    [d('planejando', 0, 1, 'em_construcao'), `Registrou o andamento de ${DEC}: Planejando, 0 de 1 tarefa`],
    [d('<img src=x onerror=alert(1)>', 1, 2, 'em_construcao'), `Registrou o andamento de ${DEC}`],
    [d('construindo', '9', 17, 'em_construcao'), `Registrou o andamento de ${DEC}`],
    [d('construindo', 1.5, 17, 'em_construcao'), `Registrou o andamento de ${DEC}`],
    [d('construindo', 18, 17, 'em_construcao'), `Registrou o andamento de ${DEC}`],
    [d('construindo', -1, 17, 'em_construcao'), `Registrou o andamento de ${DEC}`],
    [d('construindo', 9, 1000, 'em_construcao'), `Registrou o andamento de ${DEC}`],
    [d('construindo', 9, 17, 'entregue'), `Registrou o andamento de ${DEC}`],
    [d('__proto__', 9, 17, 'em_construcao'), `Registrou o andamento de ${DEC}`],
    [d('toString', 9, 17, 'em_construcao'), `Registrou o andamento de ${DEC}`],
    [d('construindo', 9, 17, 'constructor'), `Registrou o andamento de ${DEC}`],
    [null, `Registrou o andamento de ${DEC}`],
  ])('%o', (depois, texto) => {
    expect(textoDoEvento(ev(depois))).toBe(texto);
  });
  it('DEC fora do formato: "um pacote de decisão"', () => {
    expect(textoDoEvento(ev(d('construindo', 9, 17, 'em_construcao'), 'DEC-x'))).toBe('Registrou o andamento de um pacote de decisão: Construindo, 9 de 17 tarefas');
    expect(textoDoEvento(ev(null, '<b>x</b>'))).toBe('Registrou o andamento de um pacote de decisão');
  });
});
