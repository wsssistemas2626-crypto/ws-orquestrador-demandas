// Escrito na 06-T02-testes (qa-automacao) do DEC-DEM-20261111-0016-v1. O que os testes do engenheiro deixam aberto nos
// textos de integração (03, 5.6; RF-15; CA-15.3; D-14):
//   - nome de integração que é chave herdada de objeto (`toString`, `__proto__`, `constructor`) nunca vira nome;
//   - o prefixo aparece só com 8 caracteres do formato, inclusive `_` e `-`; tamanho, caractere ou tipo fora, some;
//   - os seis eventos do RF-15 com ator de integração: cada um com texto próprio, e nenhum mostra token, hash ou sha256,
//     nem no texto nem no rótulo do ator;
//   - "Criada por" do /construir e de tipo desconhecido; NOME_INTEGRACAO congelado, com as chaves de INTEGRACOES.
import { describe, expect, it } from 'vitest';
import { SENTINELAS } from '../../test/sentinelas';
import { rotuloResponsavel } from '../app/(painel)/demandas/[id]/detalhe';
import { INTEGRACOES } from '../modules/acesso/ator';
import type { Responsavel } from '../modules/demandas/consultas';
import type { EventoVisivel } from '../modules/historico/consultas';
import { NOME_INTEGRACAO, rotuloAtor, textoDoEvento } from './rotulos';

type AtorVisivel = EventoVisivel['ator'];

const ev = (acao: EventoVisivel['acao'], ator: AtorVisivel, entidadeId: string, depois: Record<string, unknown> | null): EventoVisivel => ({
  id: 1,
  ocorridoEm: new Date('2026-11-11T12:00:00Z'),
  ator,
  entidade: 'x',
  entidadeId,
  acao,
  antes: null,
  depois,
});

describe('rotuloAtor de integração: só a lista e só o prefixo no formato', () => {
  it('chave herdada de objeto no lugar da integração vira "Integração"', () => {
    for (const nome of ['toString', '__proto__', 'constructor', 'hasOwnProperty', 'valueOf'])
      expect(rotuloAtor({ tipo: 'integracao', integracao: nome, prefixo: 'a1b2c3d4' } as never), nome).toBe('Integração');
  });

  it('prefixo de 8 caracteres com _ e - aparece', () => {
    expect(rotuloAtor({ tipo: 'integracao', integracao: 'awave', prefixo: 'Zz9-_aB1' })).toBe('Awave (prefixo Zz9-_aB1)');
  });

  it('prefixo com tamanho, caractere ou tipo fora do formato some, e fica só o nome', () => {
    for (const prefixo of ['a1b2c3d', 'a1b2 c3d', 'ficticiõ', 'a1b2c3d4\n', '', SENTINELAS.token, 12345678, {}])
      expect(rotuloAtor({ tipo: 'integracao', integracao: 'construir', prefixo } as never), String(prefixo)).toBe('/construir');
  });
});

describe('CA-15.3: os seis eventos do RF-15 com ator de integração', () => {
  const dec = 'DEC-DEM-20261111-0021-v1';
  const demanda = 'DEM-20261111-0021';
  // O que nunca pode aparecer: um token no formato (sentinela fictícia), um hash e um sha256.
  const segredos = { token: SENTINELAS.token, hash: 'a'.repeat(64), sha256: 'b'.repeat(64) };
  const awave: AtorVisivel = { tipo: 'integracao', integracao: 'awave', prefixo: 'ficticio' };
  const construir: AtorVisivel = { tipo: 'integracao', integracao: 'construir', prefixo: 'ficticio' };
  const sistema: AtorVisivel = { tipo: 'sistema' };
  const eventos: Array<[string, EventoVisivel]> = [
    ['demanda_criada pelo Awave', ev('demanda_criada', awave, demanda, { ...segredos })],
    ['demanda_confirmada', ev('demanda_confirmada', { tipo: 'pessoa', nome: 'Pessoa Ficticia', papel: 'cto' }, demanda, { ...segredos })],
    ['pedido_entregue', ev('pedido_entregue', construir, dec, { ...segredos })],
    ['pedido_recebido', ev('pedido_recebido', construir, dec, { ...segredos })],
    ['token_criado de integração', ev('token_criado', sistema, 'ficticio', { integracao: 'awave', prefixo: 'ficticio', ...segredos })],
    ['token_revogado de integração', ev('token_revogado', sistema, 'ficticio', { integracao: 'construir', prefixo: 'ficticio', ...segredos })],
  ];

  it('cada um tem texto próprio, diferente dos outros cinco', () => {
    const textos = eventos.map(([, e]) => textoDoEvento(e));
    expect(new Set(textos).size).toBe(eventos.length);
    for (const t of textos) expect(t.trim().length).toBeGreaterThan(0);
  });

  it.each(eventos)('%s: nem o texto nem o ator mostram token, hash ou sha256', (_nome, e) => {
    const saida = `${rotuloAtor(e.ator)} ${textoDoEvento(e)}`;
    for (const s of Object.values(segredos)) expect(saida).not.toContain(s);
    expect(saida).not.toMatch(/wsod_/);
  });

  it('os eventos de token de integração citam a integração e o prefixo', () => {
    expect(textoDoEvento(eventos[4]![1])).toBe('Criou um token de serviço para o Awave (prefixo ficticio)');
    expect(textoDoEvento(eventos[5]![1])).toBe('Revogou o token de serviço do /construir (prefixo ficticio)');
  });
});

describe('"Criada por" e a cópia do nome da integração (D-14)', () => {
  it('rotuloResponsavel do /construir e de tipo desconhecido', () => {
    expect(rotuloResponsavel({ tipo: 'integracao', integracao: 'construir' })).toBe('/construir');
    expect(rotuloResponsavel({ tipo: 'robo' } as unknown as Responsavel)).toBe('Não informado');
  });

  it('NOME_INTEGRACAO é congelado e tem exatamente as chaves de INTEGRACOES', () => {
    expect(Object.isFrozen(NOME_INTEGRACAO)).toBe(true);
    expect(Object.keys(NOME_INTEGRACAO).sort()).toEqual([...INTEGRACOES].sort());
  });
});
