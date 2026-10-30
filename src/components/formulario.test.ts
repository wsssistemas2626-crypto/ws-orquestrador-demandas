// T36: padrão de formulário (03, 2.5 e 2.8). O resultado de uma Server Action (`ResultadoAcao`, de acaoDoPainel) vira o
// resumo de erros campo a campo, ou um alerta com o texto da 2.8.
import { describe, expect, it } from 'vitest';
import { MENSAGEM_ERRO_INTERNO } from '../lib/erros';
import { errosDoResultado, idDoCampo, PREFIXO_CONFLITO, TITULO_RESUMO_ERROS } from './formulario';

describe('formulario', () => {
  it('textos fixos da 03 (2.5 e 2.8)', () => {
    expect(TITULO_RESUMO_ERROS).toBe('Corrija os campos abaixo para continuar.');
    expect(PREFIXO_CONFLITO).toBe('Não foi possível concluir: ');
  });

  it('id de campo estável, inclusive para item de lista', () => {
    expect(idDoCampo('titulo')).toBe('campo-titulo');
    expect(idDoCampo('anexos.0.referencia')).toBe('campo-anexos-0-referencia');
    expect(idDoCampo('*')).toBe('campo-x');
  });

  it('sucesso não tem erro nem alerta', () => {
    expect(errosDoResultado({ ok: true, dados: { id: 'DEM-20261022-0001' } })).toEqual({ campos: [], porCampo: {}, alerta: null, detalhes: [] });
  });

  it('400 com campos vira o resumo, campo a campo, com o rótulo da tela', () => {
    const r = errosDoResultado(
      {
        ok: false,
        erro: 'entrada_invalida',
        mensagem: 'Corrija os campos abaixo para continuar.',
        campos: [
          { campo: 'titulo', mensagem: 'Informe o título.' },
          { campo: 'anexos.1.referencia', mensagem: 'Use um link que comece com http:// ou https://.' },
          { campo: 'desconhecido', mensagem: 'Valor inválido.' },
        ],
      },
      { titulo: 'Título (obrigatório)', anexos: 'Anexos (referências)' },
    );
    expect(r.alerta).toBeNull();
    expect(r.campos).toEqual([
      { campo: 'titulo', idCampo: 'campo-titulo', rotulo: 'Título (obrigatório)', mensagem: 'Informe o título.' },
      {
        campo: 'anexos.1.referencia',
        idCampo: 'campo-anexos-1-referencia',
        rotulo: 'Anexos (referências)',
        mensagem: 'Use um link que comece com http:// ou https://.',
      },
      { campo: 'desconhecido', idCampo: 'campo-desconhecido', rotulo: null, mensagem: 'Valor inválido.' },
    ]);
    expect(r.porCampo).toEqual({
      titulo: 'Informe o título.',
      'anexos.1.referencia': 'Use um link que comece com http:// ou https://.',
      desconhecido: 'Valor inválido.',
    });
  });

  it('400 sem campos vira alerta com a mensagem da API ("Nada foi alterado.")', () => {
    expect(errosDoResultado({ ok: false, erro: 'entrada_invalida', mensagem: 'Nada foi alterado.' }).alerta).toBe('Nada foi alterado.');
  });

  it('409 de conflito leva o prefixo da 2.8; a capacidade de ids esgotada não', () => {
    expect(errosDoResultado({ ok: false, erro: 'conflito', mensagem: 'este pacote já tem decisão registrada.' }).alerta).toBe(
      'Não foi possível concluir: este pacote já tem decisão registrada.',
    );
    const capacidade = 'Não é possível criar a demanda: o limite de 9.999 ids foi atingido. Avise o time técnico.';
    expect(errosDoResultado({ ok: false, erro: 'capacidade_de_ids_esgotada', mensagem: capacidade }).alerta).toBe(capacidade);
  });

  it('erro interno e sem permissão mostram o texto da 2.8, nunca detalhe', () => {
    expect(errosDoResultado({ ok: false, erro: 'erro_interno', mensagem: MENSAGEM_ERRO_INTERNO }).alerta).toBe(
      'Não foi possível concluir agora. Nada foi alterado. Tente de novo em instantes.',
    );
    expect(errosDoResultado({ ok: false, erro: 'sem_permissao', mensagem: 'qualquer coisa' }).alerta).toBe(
      'Sua conta não pode fazer esta ação. Se precisar, fale com o CTO.',
    );
    expect(errosDoResultado({ ok: false, erro: 'erro_interno', mensagem: 'SENTINELA-detalhe-interno' }).alerta).toBe(MENSAGEM_ERRO_INTERNO);
  });

  it('422 com a lista de erros da validação devolve os detalhes', () => {
    const r = errosDoResultado({
      ok: false,
      erro: 'nao_processavel',
      mensagem: 'O pedido não passou na validação do /construir. Nada foi entregue.',
      erros: ['especificacao.conteudo: e-mail'],
    });
    expect(r.alerta).toBe('O pedido não passou na validação do /construir. Nada foi entregue.');
    expect(r.detalhes).toEqual(['especificacao.conteudo: e-mail']);
  });
});
