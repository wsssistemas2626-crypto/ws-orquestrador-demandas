// Schema de entrada do parecer de risco (RF-09, CA-09.2, CA-09.3, C-11, T-05). Sem banco.
import { describe, expect, it } from 'vitest';
import { NIVEIS_RISCO } from '../../db/schema/versoes';
import { criarParecerRiscoSchema, NIVEIS } from './schemas';

const NIVEIS_OK = { riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'medio', riscoJuridicoNivel: 'alto' };

describe('criarParecerRiscoSchema', () => {
  it('CA-09.2: riscoTecnicoNivel "critico" → 400', () => {
    expect(criarParecerRiscoSchema.safeParse({ riscoTecnicoNivel: 'critico', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo' }).success).toBe(false);
  });

  it('CA-09.2: nível fora da lista recusado nos três riscos, inclusive com maiúscula ou acento', () => {
    for (const campo of ['riscoTecnicoNivel', 'riscoOperacionalNivel', 'riscoJuridicoNivel']) {
      for (const valor of ['critico', 'Alto', 'médio', '', 1, null]) {
        expect(criarParecerRiscoSchema.safeParse({ ...NIVEIS_OK, [campo]: valor }).success, `${campo} ${String(valor)}`).toBe(false);
      }
    }
  });

  it('CA-09.3: preCondicoes como texto corrido → 400', () => {
    expect(criarParecerRiscoSchema.safeParse({ riscoTecnicoNivel: 'baixo', riscoOperacionalNivel: 'baixo', riscoJuridicoNivel: 'baixo', preCondicoes: 'antes de tudo' }).success).toBe(false);
  });

  it('recomendacoesMitigacao como texto corrido → recusado', () => {
    expect(criarParecerRiscoSchema.safeParse({ ...NIVEIS_OK, recomendacoesMitigacao: 'mitigar tudo' }).success).toBe(false);
  });

  it('os três níveis são obrigatórios', () => {
    for (const campo of Object.keys(NIVEIS_OK)) {
      const semCampo: Record<string, unknown> = { ...NIVEIS_OK };
      delete semCampo[campo];
      expect(criarParecerRiscoSchema.safeParse(semCampo).success, campo).toBe(false);
    }
  });

  it('só os três níveis já bastam; listas nascem vazias', () => {
    expect(criarParecerRiscoSchema.parse(NIVEIS_OK)).toEqual({ ...NIVEIS_OK, recomendacoesMitigacao: [], preCondicoes: [] });
  });

  it('aceita baixo, medio e alto, nesta ordem, a mesma lista do banco', () => {
    expect([...NIVEIS]).toEqual(['baixo', 'medio', 'alto']);
    expect([...NIVEIS]).toEqual([...NIVEIS_RISCO]);
    for (const n of NIVEIS) {
      expect(criarParecerRiscoSchema.safeParse({ riscoTecnicoNivel: n, riscoOperacionalNivel: n, riscoJuridicoNivel: n }).success, n).toBe(true);
    }
  });

  it('item vazio na lista e mais de 50 itens → recusados', () => {
    expect(criarParecerRiscoSchema.safeParse({ ...NIVEIS_OK, preCondicoes: ['  '] }).success).toBe(false);
    expect(criarParecerRiscoSchema.safeParse({ ...NIVEIS_OK, recomendacoesMitigacao: Array.from({ length: 51 }, (_, i) => `i${i}`) }).success).toBe(false);
  });

  it('texto acima de 10.000 caracteres → recusado; espaços nas pontas são aparados', () => {
    expect(criarParecerRiscoSchema.safeParse({ ...NIVEIS_OK, resumo: 'x'.repeat(10_001) }).success).toBe(false);
    expect(criarParecerRiscoSchema.parse({ ...NIVEIS_OK, resumo: '  Resumo fictício  ', preCondicoes: ['  Item  '] })).toMatchObject({
      resumo: 'Resumo fictício',
      preCondicoes: ['Item'],
    });
  });

  it('C-11: autoria, id e versão do body descartados', () => {
    const r = criarParecerRiscoSchema.parse({
      ...NIVEIS_OK,
      rascunhoAgente: false,
      autorTipo: 'pessoa',
      autorId: 'u',
      responsavel: 'x',
      id: 'RSK-DEM-20261022-0001-v9',
      versao: 9,
      demandaId: 'DEM-20261022-0001',
      execucaoAgenteId: '00000000-0000-4000-8000-000000000019',
    });
    for (const k of ['rascunhoAgente', 'autorTipo', 'autorId', 'responsavel', 'id', 'versao', 'demandaId', 'execucaoAgenteId']) expect(r).not.toHaveProperty(k);
  });
});
