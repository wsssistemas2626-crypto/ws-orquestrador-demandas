// A cópia do validarPedido (ADR-05) comparada com as enumerações do app: os tipos que o /construir constrói são os tipos
// de demanda menos o estudo, e a ESP (T18) usa os mesmos donos de repositório. Se a origem mudar uma dessas listas, este
// teste mostra o que o app precisa acompanhar. O nome do arquivo veio de uma conferência temporária da 06-T18-construcao
// (ver a entrega); o conteúdo é este.
import { describe, expect, it } from 'vitest';
import { TIPOS } from '../../modules/demandas/schemas';
import { DONOS_REPOSITORIO, TIPOS_CONSTRUIDOS, validarPedido } from './pedido.mjs';

describe('cópia do validarPedido × enumerações do app', () => {
  it('os tipos construídos são os tipos de demanda menos o estudo', () => {
    expect([...TIPOS_CONSTRUIDOS].sort()).toEqual(TIPOS.filter((t) => t !== 'estudo').sort());
  });

  it('os donos de repositório são as duas contas do padrão técnico', () => {
    expect([...DONOS_REPOSITORIO].sort()).toEqual(['fabianojp06', 'wsssistemas2626-crypto']);
  });

  it('validarPedido recusa valor que não é objeto e pedido do tipo estudo', () => {
    expect(validarPedido(null)).toEqual({ ok: false, erros: ['o pedido não é um objeto JSON'] });
    expect(validarPedido({ demanda: { tipo: 'estudo' } }).erros).toContain('pedido do tipo estudo não é construído');
  });
});
