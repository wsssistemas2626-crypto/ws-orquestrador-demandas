// Cópia do validarPedido do /construir (ADR-05, C-29). A cópia é byte a byte do arquivo de origem; este teste pega
// qualquer edição local depois dela: o SHA-256 do arquivo tem de ser o registrado em ORIGEM.md.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('a cópia do validarPedido tem o SHA-256 registrado em ORIGEM.md', () => {
  const atual = createHash('sha256').update(readFileSync('src/vendor/construir/pedido.mjs')).digest('hex');
  const registrado = readFileSync('src/vendor/construir/ORIGEM.md', 'utf8').match(/SHA-256: `([0-9a-f]{64})`/)?.[1];
  expect(atual).toBe(registrado);
});
