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

// Acrescentados na 06-T01-testes (qa-automacao).
it('docker-compose.dev.yml usa postgres:16-alpine e não abre a rede do host', () => {
  const texto = readFileSync('docker-compose.dev.yml', 'utf8');
  expect(texto).toMatch(/^\s*image:\s*postgres:16-alpine\s*$/m);
  expect(texto).not.toMatch(/network_mode:\s*["']?host/);
  expect(texto).not.toMatch(/0\.0\.0\.0/);
});

it('docker-compose.dev.yml não lê .env nem variável de ambiente do host', () => {
  const texto = readFileSync('docker-compose.dev.yml', 'utf8');
  expect(texto).not.toMatch(/env_file/);
  expect(texto).not.toMatch(/\$\{/);
});
