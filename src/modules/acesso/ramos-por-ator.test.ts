// IN-02 (T02 do DEC-DEM-20261111-0016-v1): o tipo novo de ator, `integracao`, nunca cai no ramo do agente. Toda vista
// e toda autoria que hoje decidem "pessoa ou o resto" passam a ter o ramo próprio da integração, que lança
// `sem_permissao` até a tarefa que abre cada caminho (D-01).
import { describe, expect, it } from 'vitest';
import type { DemandaVista } from '../demandas/consultas';
import { listarDemandasPara, responsavelDe, responsavelMinimo, vistaDaDemandaPara } from '../demandas/consultas';
import { autoriaDo } from '../demandas/servico';
import { vistaDaEspecificacaoPara } from '../especificacoes/consultas';
import { colunasDoAtorParaTeste } from '../historico/registrar';
import { vistaDoPacotePara } from '../pacotes-decisao/consultas';
import { vistaDoParecerPara } from '../pareceres-risco/consultas';
import { NOME_DA_INTEGRACAO, atorDesconhecido, ehIntegracao, type Ator, type AtorIntegracao } from './ator';
import { autorizar } from './matriz';

const awave: AtorIntegracao = { tipo: 'integracao', integracao: 'awave', prefixoToken: 'ficticio' };
const construir: AtorIntegracao = { tipo: 'integracao', integracao: 'construir', prefixoToken: 'ficticio' };
const SEM_PERMISSAO = expect.objectContaining({ codigo: 'sem_permissao' });
const demanda = { id: 'DEM-20261111-0001', titulo: 'T (fictício)', solicitanteNome: 'Awave' } as DemandaVista;

describe('IN-02', () => {
  it('integração passa pelo ramo próprio de permitido, e não pelo do agente', () => {
    // Ações que ficam negadas ao awave também depois da T03 (nenhum teste desta tarefa muda lá).
    for (const acao of ['ler_historico', 'ler_especificacao', 'listar_demandas', 'registrar_decisao'] as const)
      expect(() => autorizar(awave, acao), acao).toThrow(SEM_PERMISSAO);
  });
  // A T03 abriu os pares do RF-03: destas quatro, só criar_demanda e ler_demanda, e só para o awave.
  it('T03: das quatro, o awave passa só em criar_demanda e ler_demanda, e o construir em nenhuma', () => {
    for (const acao of ['criar_demanda', 'ler_demanda', 'ler_pacote_decisao', 'gerar_pedido_construcao'] as const) {
      if (acao === 'criar_demanda' || acao === 'ler_demanda') expect(() => autorizar(awave, acao), acao).not.toThrow();
      else expect(() => autorizar(awave, acao), acao).toThrow(SEM_PERMISSAO);
      expect(() => autorizar(construir, acao), acao).toThrow(SEM_PERMISSAO);
    }
  });
  it('integração fora da lista, montada à mão, é negada sem lançar outro erro', () => {
    const jarvis = { tipo: 'integracao', integracao: 'jarvis', prefixoToken: 'ficticio' } as unknown as Ator;
    expect(() => autorizar(jarvis, 'criar_demanda')).toThrow(SEM_PERMISSAO);
  });
  it('tipo de ator desconhecido, montado à mão, é negado', () => {
    const outro = { tipo: 'robo' } as unknown as Ator;
    expect(() => autorizar(outro, 'ler_demanda')).toThrow(SEM_PERMISSAO);
  });
  it('vistas de ESP, RSK e DEC lançam para integração, nunca devolvem a de agente', () => {
    expect(() => vistaDaEspecificacaoPara(awave, {} as never, [])).toThrow(SEM_PERMISSAO);
    expect(() => vistaDoParecerPara(awave, {} as never, [])).toThrow(SEM_PERMISSAO);
    expect(() => vistaDoPacotePara(awave, {} as never, [])).toThrow(SEM_PERMISSAO);
  });
  it('D-01: a vista da demanda para integração lança até a T06', () => {
    expect(() => vistaDaDemandaPara(awave, demanda)).toThrow(SEM_PERMISSAO);
    expect(() => vistaDaDemandaPara(construir, demanda)).toThrow(SEM_PERMISSAO);
  });
  it('a listagem lança para integração', async () => {
    await expect(listarDemandasPara({} as never, { limit: 20, offset: 0 }, awave)).rejects.toEqual(SEM_PERMISSAO);
  });
  it('a autoria das versões recusa integração e sistema', () => {
    expect(() => autoriaDo(awave)).toThrow(SEM_PERMISSAO);
    expect(() => autoriaDo({ tipo: 'sistema' })).toThrow(SEM_PERMISSAO);
  });
  it('responsável e responsável mínimo de integração', () => {
    expect(responsavelDe('integracao', 'awave', null)).toEqual({ tipo: 'integracao', integracao: 'awave' });
    expect(() => responsavelDe('integracao', 'jarvis', null)).toThrow('autoria desconhecida');
    expect(() => responsavelDe('integracao', 'risco', null)).toThrow('autoria desconhecida');
    expect(() => responsavelDe('agente', 'awave', null)).toThrow('autoria desconhecida');
    expect(responsavelMinimo({ tipo: 'integracao', integracao: 'awave' })).toEqual({ tipo: 'integracao', integracao: 'awave' });
  });
  it('colunas do evento de integração: nome e prefixo', () => {
    expect(colunasDoAtorParaTeste(awave)).toEqual({ atorTipo: 'integracao', atorId: 'awave', atorTokenPrefixo: 'ficticio' });
    expect(colunasDoAtorParaTeste(construir)).toEqual({ atorTipo: 'integracao', atorId: 'construir', atorTokenPrefixo: 'ficticio' });
  });
  it('colunas do evento de ator desconhecido: lança, nada é gravado como outro ator', () => {
    expect(() => colunasDoAtorParaTeste({ tipo: 'robo' } as unknown as Ator)).toThrow('ator desconhecido');
  });
  it('NOME_DA_INTEGRACAO', () => {
    expect(NOME_DA_INTEGRACAO).toEqual({ awave: 'Awave', construir: '/construir' });
    expect(Object.isFrozen(NOME_DA_INTEGRACAO)).toBe(true);
  });
  it('ehIntegracao: só a lista', () => {
    expect(ehIntegracao('awave')).toBe(true);
    expect(ehIntegracao('construir')).toBe(true);
    for (const v of ['jarvis', 'risco', 'Awave', '', null, undefined, 1, 'toString', '__proto__']) expect(ehIntegracao(v), String(v)).toBe(false);
  });
  it('atorDesconhecido lança', () => {
    expect(() => atorDesconhecido({ tipo: 'robo' } as never)).toThrow('ator desconhecido');
  });
});
