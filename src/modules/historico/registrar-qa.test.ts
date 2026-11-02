// Testes da 06-T12-testes (qa-automacao): a lista de permissão de C-30 conferida contra as colunas reais da demanda,
// para que um campo novo ou um engano na lista não grave dado de terceiro no histórico. Dados só fictícios.
import { getTableColumns } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { contemSentinela, SENTINELAS } from '../../../test/sentinelas';
import { demanda } from '../../db/schema';
import { CAMPOS_TEXTO_LIVRE, mudancaDeCampo } from './registrar';

const ENUMERACOES = ['linhaServicoProvavel', 'solicitantePapel', 'status', 'tipo', 'urgencia'];

describe('C-30: lista de permissão contra as colunas da demanda', () => {
  it('das colunas de demanda, só as cinco enumerações guardam o valor; as outras (inclusive duvidasEntrada e autorId) gravam { alterado: true }', () => {
    const colunas = Object.keys(getTableColumns(demanda));
    const guardamValor = colunas.filter((c) => mudancaDeCampo(c, null, 'valor-ficticio').depois[c] === 'valor-ficticio');
    expect([...guardamValor].sort()).toEqual(ENUMERACOES);
    for (const c of colunas.filter((x) => !guardamValor.includes(x))) {
      expect(contemSentinela(JSON.stringify(mudancaDeCampo(c, SENTINELAS.email, SENTINELAS.texto))), c).toBe(false);
    }
  });

  it('todo campo de CAMPOS_TEXTO_LIVRE existe na demanda (a lista não aponta para nome errado)', () => {
    const colunas = new Set(Object.keys(getTableColumns(demanda)));
    for (const campo of CAMPOS_TEXTO_LIVRE) expect(colunas.has(campo), campo).toBe(true);
  });

  it('o { alterado: true } devolvido não é compartilhado: mudar um resultado não muda o da chamada seguinte', () => {
    const primeiro = mudancaDeCampo('titulo', 'a', 'b');
    (primeiro.depois.titulo as Record<string, unknown>).alterado = SENTINELAS.texto;
    expect(mudancaDeCampo('contexto', 'a', 'b')).toEqual({ antes: { contexto: { alterado: true } }, depois: { contexto: { alterado: true } } });
  });
});
