// Escrito na 06-T36-testes (qa-automacao). Bordas do padrão de formulário (03, 2.5 e 2.8) que os testes do engenheiro
// não fecham:
//   - a memória de errosDoResultado (Minor 3) é por resultado E por rótulos: outro conjunto de rótulos não devolve o
//     cálculo velho;
//   - idDoCampo só gera id seguro (letras, números e hífen), seja qual for o caminho que a API devolve;
//   - 400 com lista de campos vazia vira alerta, e não um Resumo de erros vazio;
//   - os códigos que passam a mensagem da API adiante e os que nunca a mostram.
import { describe, expect, it } from 'vitest';
import type { ResultadoAcao } from '../lib/acao-painel';
import { MENSAGEM_ERRO_INTERNO } from '../lib/erros';
import { errosDoResultado, idDoCampo } from './formulario';

const invalido = (): Extract<ResultadoAcao<unknown>, { ok: false }> => ({
  ok: false,
  erro: 'entrada_invalida',
  mensagem: 'Corrija os campos abaixo para continuar.',
  campos: [{ campo: 'titulo', mensagem: 'Informe o título.' }],
});

describe('errosDoResultado: memória por resultado e por rótulos', () => {
  it('o mesmo resultado com outros rótulos é recalculado, e cada par volta ao seu objeto', () => {
    const r = invalido();
    const rotulosA = { titulo: 'Título (obrigatório)' };
    const rotulosB = { titulo: 'Título da demanda' };
    const comA = errosDoResultado(r, rotulosA);
    const comB = errosDoResultado(r, rotulosB);
    expect(comA.campos[0]?.rotulo).toBe('Título (obrigatório)');
    expect(comB.campos[0]?.rotulo).toBe('Título da demanda');
    expect(comB).not.toBe(comA);
    expect(errosDoResultado(r, rotulosA)).toBe(comA);
    expect(errosDoResultado(r, rotulosB)).toBe(comB);
    expect(errosDoResultado(r).campos[0]?.rotulo).toBeNull();
  });

  it('o sucesso não guarda nada e devolve sempre o resultado vazio', () => {
    const a = errosDoResultado({ ok: true, dados: 1 });
    const b = errosDoResultado({ ok: true, dados: 2 }, { titulo: 'Título' });
    expect(a).toEqual({ campos: [], porCampo: {}, alerta: null, detalhes: [] });
    expect(b).toEqual(a);
  });
});

describe('errosDoResultado: forma do erro', () => {
  it('400 com a lista de campos vazia vira alerta com a mensagem, sem Resumo de erros', () => {
    const r = errosDoResultado({ ok: false, erro: 'entrada_invalida', mensagem: 'Nada foi alterado.', campos: [] });
    expect(r.campos).toEqual([]);
    expect(r.porCampo).toEqual({});
    expect(r.alerta).toBe('Nada foi alterado.');
  });

  it('dois erros no mesmo campo: os dois no resumo e uma mensagem abaixo do campo', () => {
    const r = errosDoResultado({
      ok: false,
      erro: 'entrada_invalida',
      mensagem: 'x',
      campos: [
        { campo: 'titulo', mensagem: 'Informe o título.' },
        { campo: 'titulo', mensagem: 'Use até 10.000 caracteres.' },
      ],
    });
    expect(r.campos.map((c) => c.mensagem)).toEqual(['Informe o título.', 'Use até 10.000 caracteres.']);
    expect(Object.keys(r.porCampo)).toEqual(['titulo']);
    expect(['Informe o título.', 'Use até 10.000 caracteres.']).toContain(r.porCampo.titulo);
  });

  it('não encontrado, limite e capacidade passam a mensagem da API; erro interno e sem permissão nunca', () => {
    const passa = (erro: string) => errosDoResultado({ ok: false, erro, mensagem: `SENTINELA-${erro}` }).alerta;
    expect(passa('nao_encontrado')).toBe('SENTINELA-nao_encontrado');
    expect(passa('limite_excedido')).toBe('SENTINELA-limite_excedido');
    expect(passa('nao_processavel')).toBe('SENTINELA-nao_processavel');
    expect(passa('erro_interno')).toBe(MENSAGEM_ERRO_INTERNO);
    expect(passa('sem_permissao')).toBe('Sua conta não pode fazer esta ação. Se precisar, fale com o CTO.');
    // erro interno com campos (não acontece pela API) também não mostra nada do que veio.
    const r = errosDoResultado({ ok: false, erro: 'erro_interno', mensagem: 'SENTINELA', campos: [{ campo: 'titulo', mensagem: 'SENTINELA' }] });
    expect(JSON.stringify(r)).not.toContain('SENTINELA');
    expect(r.alerta).toBe(MENSAGEM_ERRO_INTERNO);
  });
});

describe('idDoCampo: id seguro para o link do Resumo de erros', () => {
  it.each([
    ['titulo', 'campo-titulo'],
    ['anexos.12.descricao', 'campo-anexos-12-descricao'],
    ['opcaoA.vantagens', 'campo-opcaoA-vantagens'],
    ['a"><script>alert(1)</script>', 'campo-a-script-alert-1-script-'],
    ['campo com espaço', 'campo-campo-com-espa-o'],
    ['', 'campo-'],
  ])('%j vira %j', (entrada, esperado) => {
    expect(idDoCampo(entrada)).toBe(esperado);
    expect(idDoCampo(entrada)).toMatch(/^campo-[A-Za-z0-9-]*$/);
  });
});
