// T02 do DEC-DEM-20261111-0016-v1 (03, 5.6; RF-15; CA-15.3): textos do ator de integração e dos eventos novos.
import { describe, expect, it } from 'vitest';
import { NOME_DA_INTEGRACAO } from '../modules/acesso/ator';
import type { EventoVisivel } from '../modules/historico/consultas';
import { NOME_INTEGRACAO, rotuloAtor, textoDoEvento } from './rotulos';

const ev = (acao: EventoVisivel['acao'], entidadeId: string, depois: Record<string, unknown> | null = null): EventoVisivel => ({
  id: 1,
  ocorridoEm: new Date('2026-11-11T12:00:00Z'),
  ator: { tipo: 'sistema' },
  entidade: 'x',
  entidadeId,
  acao,
  antes: null,
  depois,
});

describe('rótulos de integração', () => {
  it('D-14: NOME_INTEGRACAO é igual ao do servidor', () => expect(NOME_INTEGRACAO).toEqual(NOME_DA_INTEGRACAO));
  it('ator', () => {
    expect(rotuloAtor({ tipo: 'integracao', integracao: 'awave', prefixo: 'a1b2c3d4' })).toBe('Awave (prefixo a1b2c3d4)');
    expect(rotuloAtor({ tipo: 'integracao', integracao: 'construir', prefixo: 'a1b2c3d4' })).toBe('/construir (prefixo a1b2c3d4)');
    expect(rotuloAtor({ tipo: 'integracao', integracao: 'construir', prefixo: null })).toBe('/construir');
    expect(rotuloAtor({ tipo: 'integracao', integracao: null, prefixo: 'a1b2c3d4' })).toBe('Integração');
    expect(rotuloAtor({ tipo: 'integracao', integracao: null, prefixo: null })).toBe('Integração');
  });
  it('ator: prefixo fora do formato não aparece', () => {
    expect(rotuloAtor({ tipo: 'integracao', integracao: 'awave', prefixo: '<b>x</b>' })).toBe('Awave');
    expect(rotuloAtor({ tipo: 'integracao', integracao: 'awave', prefixo: 'a1b2c3d4e' })).toBe('Awave');
  });
  it('eventos novos (CA-15.3)', () => {
    const dec = 'DEC-DEM-20261111-0021-v1';
    expect(textoDoEvento(ev('demanda_confirmada', 'DEM-20261111-0021'))).toBe('Confirmou a demanda aberta pelo Awave');
    expect(textoDoEvento(ev('pedido_entregue', dec))).toBe(`Buscou o Pedido de Construção de ${dec}`);
    expect(textoDoEvento(ev('pedido_entregue', 'x'))).toBe('Buscou o Pedido de Construção de um pacote de decisão');
    expect(textoDoEvento(ev('pedido_recebido', dec))).toBe(`Confirmou o recebimento do Pedido de Construção de ${dec}`);
    expect(textoDoEvento(ev('pedido_recebido', 'x'))).toBe('Confirmou o recebimento do Pedido de Construção de um pacote de decisão');
    expect(textoDoEvento(ev('token_criado', 'a1b2c3d4', { integracao: 'awave', prefixo: 'a1b2c3d4' }))).toBe(
      'Criou um token de serviço para o Awave (prefixo a1b2c3d4)',
    );
    expect(textoDoEvento(ev('token_criado', 'a1b2c3d4', { integracao: 'construir', prefixo: 'a1b2c3d4' }))).toBe(
      'Criou um token de serviço para o /construir (prefixo a1b2c3d4)',
    );
    expect(textoDoEvento(ev('token_criado', 'x', { integracao: 'construir' }))).toBe('Criou um token de serviço para o /construir');
    expect(textoDoEvento(ev('token_criado', 'x', { agente: 'risco', prefixo: 'a1b2c3d4' }))).toBe('Criou um token de serviço');
    expect(textoDoEvento(ev('token_criado', 'x'))).toBe('Criou um token de serviço');
    expect(textoDoEvento(ev('token_revogado', 'x', { integracao: 'awave', prefixo: 'a1b2c3d4' }))).toBe(
      'Revogou o token de serviço do Awave (prefixo a1b2c3d4)',
    );
    expect(textoDoEvento(ev('token_revogado', 'x', { integracao: 'construir', prefixo: 'a1b2c3d4' }))).toBe(
      'Revogou o token de serviço do /construir (prefixo a1b2c3d4)',
    );
    expect(textoDoEvento(ev('token_revogado', 'x', { integracao: 'awave' }))).toBe('Revogou o token de serviço do Awave');
    expect(textoDoEvento(ev('token_revogado', 'x', { prefixo: 'a1b2c3d4' }))).toBe('Revogou o token de serviço de prefixo a1b2c3d4');
    expect(textoDoEvento(ev('token_revogado', 'x', {}))).toBe('Revogou um token de serviço');
  });
  it('integração fora da lista e prefixo fora do formato nos eventos de token: como se não houvesse', () => {
    expect(textoDoEvento(ev('token_criado', 'x', { integracao: 'jarvis', prefixo: 'a1b2c3d4' }))).toBe('Criou um token de serviço');
    expect(textoDoEvento(ev('token_criado', 'x', { integracao: 'awave', prefixo: 'curto' }))).toBe('Criou um token de serviço para o Awave');
    expect(textoDoEvento(ev('token_revogado', 'x', { integracao: 'toString', prefixo: '<script>' }))).toBe('Revogou um token de serviço');
    expect(textoDoEvento(ev('token_revogado', 'x', { prefixo: 'wsod_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' }))).toBe('Revogou um token de serviço');
  });
  it('nenhum texto novo mostra hash ou sha256', () => {
    const sha = 'f'.repeat(64);
    const dec = 'DEC-DEM-20261111-0021-v1';
    expect(textoDoEvento(ev('pedido_recebido', dec, { sha256: sha }))).not.toContain(sha);
    expect(textoDoEvento(ev('pedido_entregue', dec, { sha256: sha }))).not.toContain(sha);
    expect(textoDoEvento(ev('token_criado', 'x', { integracao: 'awave', prefixo: 'a1b2c3d4', hash: sha }))).not.toContain(sha);
  });
});
