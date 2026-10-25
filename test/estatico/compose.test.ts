// C-35, parte do desenvolvimento: o banco de dev só é publicado em 127.0.0.1.
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('docker-compose.dev.yml só publica porta em 127.0.0.1', () => {
  const texto = readFileSync('docker-compose.dev.yml', 'utf8');
  const portas = [...texto.matchAll(/^\s*-\s*["']?([^"'\s]+)["']?\s*$/gm)]
    .map((m) => m[1] ?? '')
    .filter((p) => /:\d+$/.test(p));
  expect(portas.length).toBeGreaterThan(0);
  for (const p of portas) expect(p.startsWith('127.0.0.1:')).toBe(true);
  expect(texto).toContain('127.0.0.1:5434:5432');
});
