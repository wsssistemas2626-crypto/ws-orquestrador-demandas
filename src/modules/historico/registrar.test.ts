// Histórico de eventos sem dado de terceiro (C-30, RF-21, CA-06.4). Dados só fictícios.
import { describe, expect, it } from 'vitest';
import { SENTINELAS } from '../../../test/sentinelas';
import { CAMPOS_TEXTO_LIVRE, mudancaDeCampo } from './registrar';

const TEXTO_LIVRE = ['titulo', 'solicitanteNome', 'anexos', 'contexto', 'descricaoProblema', 'impactoPercebido', 'justificativaUrgencia'];

describe('C-30: histórico sem dado de terceiro', () => {
  it.each(TEXTO_LIVRE)('%s grava só { alterado: true }', (campo) => {
    const r = mudancaDeCampo(campo, 'antigo', SENTINELAS.nome);
    expect(r).toEqual({ antes: { [campo]: { alterado: true } }, depois: { [campo]: { alterado: true } } });
  });

  it('nenhum valor de texto livre chega ao que é gravado', () => {
    for (const campo of TEXTO_LIVRE) {
      const gravado = JSON.stringify(mudancaDeCampo(campo, SENTINELAS.email, [SENTINELAS.texto, SENTINELAS.telefone]));
      expect(gravado).not.toContain('SENTINELA');
      expect(gravado).not.toContain(SENTINELAS.email);
      expect(gravado).not.toContain(SENTINELAS.telefone);
    }
  });

  it('CAMPOS_TEXTO_LIVRE lista os sete campos de texto livre', () => {
    expect([...CAMPOS_TEXTO_LIVRE].sort()).toEqual([...TEXTO_LIVRE].sort());
  });

  it('CA-06.4: enumeração guarda antes e depois', () => {
    expect(mudancaDeCampo('linhaServicoProvavel', 'indefinida', 'automacao_integracao')).toEqual({
      antes: { linhaServicoProvavel: 'indefinida' },
      depois: { linhaServicoProvavel: 'automacao_integracao' },
    });
  });

  it.each([
    ['tipo', 'bug', 'melhoria'],
    ['status', 'nova', 'em_analise'],
    ['solicitantePapel', 'operacoes', 'produto'],
    ['urgencia', 'baixa', 'alta'],
  ])('%s, da lista de permissão, guarda o valor', (campo, antes, depois) => {
    expect(mudancaDeCampo(campo, antes, depois)).toEqual({ antes: { [campo]: antes }, depois: { [campo]: depois } });
  });

  it('valor nulo de um campo da lista de permissão fica nulo', () => {
    expect(mudancaDeCampo('urgencia', null, 'alta')).toEqual({ antes: { urgencia: null }, depois: { urgencia: 'alta' } });
  });

  it('campo desconhecido é tratado como texto livre (lista de permissão, não de negação)', () => {
    expect(mudancaDeCampo('campoNovo', 'a', 'b').depois).toEqual({ campoNovo: { alterado: true } });
  });

  it('o nome do campo é conferido exatamente: variação de caixa ou de espaço é texto livre', () => {
    expect(mudancaDeCampo('Status', SENTINELAS.texto, 'b').antes).toEqual({ Status: { alterado: true } });
    expect(mudancaDeCampo('status ', SENTINELAS.texto, 'b').antes).toEqual({ 'status ': { alterado: true } });
  });

  it('campo da lista de permissão com valor que não é texto vira { alterado: true }', () => {
    const r = mudancaDeCampo('status', { texto: SENTINELAS.texto }, ['x']);
    expect(r).toEqual({ antes: { status: { alterado: true } }, depois: { status: { alterado: true } } });
  });
});
